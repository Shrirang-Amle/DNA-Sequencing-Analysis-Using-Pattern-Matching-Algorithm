package com.example.dna.service;

import com.example.dna.algorithms.*;
import com.example.dna.utils.Performance;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.io.BufferedReader;
import java.io.IOException;
import java.net.URISyntaxException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;

@Service
public class DNAService {

    private static final int DEFAULT_CHUNK_SIZE = 250_000;
    private static final int DEFAULT_BENCHMARK_SAMPLE_BASES = 1_000_000;
    private static final int DEFAULT_QUICK_SCAN_BASES = 5_000_000;
    private static final int MAX_STORED_MATCHES = 100;
    private static final int MAX_PREVIEW_SNIPPETS = 5;
    private static final int PREVIEW_CONTEXT = 24;

    private final String configuredDatasetPath;
    private final int configuredChunkSize;
    private final int benchmarkSampleBases;
    private final int quickScanBases;
    private volatile Path cachedDatasetPath;

    public DNAService(
        @Value("${dna.dataset.path:}") String configuredDatasetPath,
        @Value("${dna.chunk.size:" + DEFAULT_CHUNK_SIZE + "}") int configuredChunkSize,
        @Value("${dna.benchmark.sample.bases:" + DEFAULT_BENCHMARK_SAMPLE_BASES + "}") int benchmarkSampleBases,
        @Value("${dna.quick.scan.bases:" + DEFAULT_QUICK_SCAN_BASES + "}") int quickScanBases
    ) {
        this.configuredDatasetPath = configuredDatasetPath == null ? "" : configuredDatasetPath.trim();
        this.configuredChunkSize = Math.max(configuredChunkSize, DEFAULT_CHUNK_SIZE);
        this.benchmarkSampleBases = Math.max(benchmarkSampleBases, 10_000);
        this.quickScanBases = Math.max(quickScanBases, 100_000);
    }

    public Map<String, Object> getDatasetInfo() {
        Path datasetPath = resolveDatasetPath();
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("name", datasetPath.getFileName().toString());
        info.put("path", datasetPath.toAbsolutePath().toString());
        info.put("fileSizeBytes", fileSize(datasetPath));
        info.put("fileSizeHuman", humanReadableSize(fileSize(datasetPath)));
        info.put("chunkSize", configuredChunkSize);
        info.put("benchmarkSampleBases", benchmarkSampleBases);
        info.put("quickScanBases", quickScanBases);
        return info;
    }

    public Map<String, Object> analyze(String dnaInput, String patternInput, String modeInput, String scanModeInput) {
        String mode = modeInput == null ? "manual" : modeInput.trim().toLowerCase(Locale.ROOT);
        if ("dataset".equals(mode)) {
            return analyzeDataset(patternInput, scanModeInput);
        }
        return analyzeManual(dnaInput, patternInput);
    }

    private Map<String, Object> analyzeManual(String dnaInput, String patternInput) {
        String dna = normalizeSequence(dnaInput);
        String pattern = normalizeSequence(patternInput);
        if (dna.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "DNA is required.");
        }
        if (pattern.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pattern is required.");
        }

        Map<String, Object> results = new LinkedHashMap<>();
        Map<String, Long> time = new LinkedHashMap<>();

        AtomicReference<List<Integer>> naiveMatches = new AtomicReference<>(List.of());
        AtomicReference<List<Integer>> kmpMatches = new AtomicReference<>(List.of());
        AtomicReference<List<Integer>> rabinMatches = new AtomicReference<>(List.of());
        AtomicReference<List<Integer>> hammingMatches = new AtomicReference<>(List.of());

        time.put("naive", Performance.measure(() -> naiveMatches.set(Naive.search(dna, pattern))));
        time.put("kmp", Performance.measure(() -> kmpMatches.set(KMP.search(dna, pattern))));
        time.put("rabin", Performance.measure(() -> rabinMatches.set(RabinKarp.search(dna, pattern))));
        time.put("hamming", Performance.measure(() -> hammingMatches.set(ApproxMatch.hamming(dna, pattern))));

        results.put("naive", naiveMatches.get());
        results.put("kmp", kmpMatches.get());
        results.put("rabin", rabinMatches.get());
        results.put("hamming", hammingMatches.get());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mode", "manual");
        response.put("pattern", pattern);
        response.put("results", results);
        response.put("time", time);
        return response;
    }

    private Map<String, Object> analyzeDataset(String patternInput, String scanModeInput) {
        String pattern = normalizeSequence(patternInput);
        if (pattern.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pattern is required.");
        }
        String scanMode = normalizeScanMode(scanModeInput);
        long scanLimitBases = "quick".equals(scanMode) ? quickScanBases : Long.MAX_VALUE;

        Path datasetPath = resolveDatasetPath();
        int chunkSize = Math.max(configuredChunkSize, pattern.length() * 4);
        int overlap = Math.max(pattern.length() - 1, 0);

        Map<String, SearchAccumulator> accumulators = new LinkedHashMap<>();
        accumulators.put("naive", new SearchAccumulator("Naive", "sample_prefix"));
        accumulators.put("kmp", new SearchAccumulator("KMP", "full_genome"));
        accumulators.put("rabin", new SearchAccumulator("Rabin-Karp", "full_genome"));
        accumulators.put("hamming", new SearchAccumulator("Approx. Hamming", "sample_prefix"));

        List<Map<String, Object>> previewSnippets = new ArrayList<>();
        StringBuilder buffer = new StringBuilder(chunkSize + overlap + 1024);
        StringBuilder benchmarkSample = new StringBuilder(Math.min(benchmarkSampleBases, chunkSize));
        long processedBases = 0L;

        try (BufferedReader reader = Files.newBufferedReader(datasetPath)) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith(">")) {
                    continue;
                }

                String normalizedLine = normalizeSequence(line);
                if (normalizedLine.isEmpty()) {
                    continue;
                }

                if (processedBases + buffer.length() >= scanLimitBases) {
                    int remaining = (int) Math.max(0, scanLimitBases - processedBases - buffer.length());
                    if (remaining > 0) {
                        normalizedLine = normalizedLine.substring(0, Math.min(remaining, normalizedLine.length()));
                    } else {
                        break;
                    }
                }

                appendToBenchmarkSample(benchmarkSample, normalizedLine);
                buffer.append(normalizedLine);

                while (buffer.length() >= chunkSize + overlap) {
                    String window = buffer.substring(0, chunkSize + overlap);
                    processExactWindow(window, processedBases, chunkSize, pattern, accumulators, previewSnippets);
                    buffer.delete(0, chunkSize);
                    processedBases += chunkSize;
                }

                if (processedBases + buffer.length() >= scanLimitBases) {
                    break;
                }
            }

            if (buffer.length() > 0) {
                processExactWindow(buffer.toString(), processedBases, buffer.length(), pattern, accumulators, previewSnippets);
                processedBases += buffer.length();
            }
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read dataset: " + datasetPath, exception);
        }

        accumulators.get("kmp").scopeBases = processedBases;
        accumulators.get("rabin").scopeBases = processedBases;
        runBenchmarkAlgorithms(benchmarkSample.toString(), pattern, accumulators);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("pattern", pattern);
        response.put("dataset", getDatasetInfo());
        response.put("mode", "dataset");
        response.put("analysisMode", "fast_full_scan");
        response.put("scanMode", scanMode);
        response.put("scanLimitBases", "quick".equals(scanMode) ? quickScanBases : processedBases);
        response.put("benchmarkSampleBases", benchmarkSample.length());
        response.put("totalBasesScanned", processedBases);
        response.put("results", buildResultMap(accumulators));
        response.put("time", buildTimeMap(accumulators));
        response.put("previews", previewSnippets);
        return response;
    }

    private String normalizeScanMode(String scanModeInput) {
        String scanMode = scanModeInput == null ? "full" : scanModeInput.trim().toLowerCase(Locale.ROOT);
        return "quick".equals(scanMode) ? "quick" : "full";
    }

    private void appendToBenchmarkSample(StringBuilder benchmarkSample, String normalizedLine) {
        if (benchmarkSample.length() >= benchmarkSampleBases) {
            return;
        }

        int remaining = benchmarkSampleBases - benchmarkSample.length();
        benchmarkSample.append(normalizedLine, 0, Math.min(remaining, normalizedLine.length()));
    }

    private void processExactWindow(
        String window,
        long globalOffset,
        int commitLength,
        String pattern,
        Map<String, SearchAccumulator> accumulators,
        List<Map<String, Object>> previewSnippets
    ) {
        if (window.length() < pattern.length()) {
            return;
        }

        runAlgorithm("kmp", window, pattern, globalOffset, commitLength, accumulators.get("kmp"), previewSnippets, true, KMP::search);
        runAlgorithm("rabin", window, pattern, globalOffset, commitLength, accumulators.get("rabin"), previewSnippets, false, RabinKarp::search);
    }

    private void runBenchmarkAlgorithms(
        String sample,
        String pattern,
        Map<String, SearchAccumulator> accumulators
    ) {
        if (sample.length() < pattern.length()) {
            accumulators.get("naive").scopeBases = sample.length();
            accumulators.get("hamming").scopeBases = sample.length();
            return;
        }

        runAlgorithm("naive", sample, pattern, 0L, sample.length(), accumulators.get("naive"), List.of(), false, Naive::search);
        runAlgorithm("hamming", sample, pattern, 0L, sample.length(), accumulators.get("hamming"), List.of(), false, ApproxMatch::hamming);
        accumulators.get("naive").scopeBases = sample.length();
        accumulators.get("hamming").scopeBases = sample.length();
    }

    private void runAlgorithm(
        String algorithmKey,
        String window,
        String pattern,
        long globalOffset,
        int commitLength,
        SearchAccumulator accumulator,
        List<Map<String, Object>> previewSnippets,
        boolean collectPreview,
        BiFunction<String, String, List<Integer>> algorithm
    ) {
        AtomicReference<List<Integer>> localMatches = new AtomicReference<>(List.of());
        long elapsedMicros = Performance.measure(() -> localMatches.set(algorithm.apply(window, pattern)));
        accumulator.timeMicros += elapsedMicros;

        for (int localIndex : localMatches.get()) {
            if (localIndex >= commitLength) {
                continue;
            }

            long absoluteIndex = globalOffset + localIndex;
            accumulator.count++;
            if (accumulator.samplePositions.size() < MAX_STORED_MATCHES) {
                accumulator.samplePositions.add(absoluteIndex);
            }

            if (collectPreview && previewSnippets.size() < MAX_PREVIEW_SNIPPETS) {
                previewSnippets.add(buildPreview(window, localIndex, pattern.length(), absoluteIndex, algorithmKey));
            }
        }
    }

    private Map<String, Object> buildPreview(String window, int index, int patternLength, long absoluteIndex, String algorithmKey) {
        int beforeStart = Math.max(0, index - PREVIEW_CONTEXT);
        int afterEnd = Math.min(window.length(), index + patternLength + PREVIEW_CONTEXT);

        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("algorithm", algorithmKey);
        preview.put("position", absoluteIndex);
        preview.put("before", window.substring(beforeStart, index));
        preview.put("match", window.substring(index, index + patternLength));
        preview.put("after", window.substring(index + patternLength, afterEnd));
        return preview;
    }

    private Map<String, Object> buildResultMap(Map<String, SearchAccumulator> accumulators) {
        Map<String, Object> results = new LinkedHashMap<>();
        for (Map.Entry<String, SearchAccumulator> entry : accumulators.entrySet()) {
            SearchAccumulator accumulator = entry.getValue();
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("label", accumulator.label);
            details.put("count", accumulator.count);
            details.put("samplePositions", accumulator.samplePositions);
            details.put("truncated", accumulator.count > accumulator.samplePositions.size());
            details.put("scope", accumulator.scope);
            details.put("scopeBases", accumulator.scopeBases);
            results.put(entry.getKey(), details);
        }
        return results;
    }

    private Map<String, Long> buildTimeMap(Map<String, SearchAccumulator> accumulators) {
        Map<String, Long> time = new LinkedHashMap<>();
        for (Map.Entry<String, SearchAccumulator> entry : accumulators.entrySet()) {
            time.put(entry.getKey(), entry.getValue().timeMicros);
        }
        return time;
    }

    private String normalizeSequence(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    private long fileSize(Path path) {
        try {
            return Files.size(path);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read dataset metadata for " + path, exception);
        }
    }

    private String humanReadableSize(long bytes) {
        double size = bytes;
        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return new DecimalFormat("0.0").format(size) + " " + units[unitIndex];
    }

    private Path resolveDatasetPath() {
        Path resolved = cachedDatasetPath;
        if (resolved != null) {
            return resolved;
        }

        List<Path> candidates = new ArrayList<>();
        if (!configuredDatasetPath.isEmpty()) {
            Path configured = Paths.get(configuredDatasetPath).normalize();
            if (configured.isAbsolute()) {
                candidates.add(configured);
            } else {
                for (Path baseDirectory : getSearchRoots()) {
                    candidates.add(baseDirectory.resolve(configured).normalize());
                }
            }
        }

        for (Path baseDirectory : getSearchRoots()) {
            addDatasetDirectoryCandidates(baseDirectory.resolve("Dataset"), candidates);
        }

        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                cachedDatasetPath = candidate.toAbsolutePath().normalize();
                return cachedDatasetPath;
            }
        }

        throw new IllegalStateException("No .fna dataset file was found in the Dataset folder.");
    }

    private List<Path> getSearchRoots() {
        List<Path> roots = new ArrayList<>();

        addRootWithParents(Paths.get("").toAbsolutePath().normalize(), roots);

        try {
            Path codeSource = Paths.get(
                DNAService.class.getProtectionDomain().getCodeSource().getLocation().toURI()
            ).toAbsolutePath().normalize();

            if (Files.isRegularFile(codeSource)) {
                codeSource = codeSource.getParent();
            }

            addRootWithParents(codeSource, roots);
        } catch (URISyntaxException exception) {
            throw new IllegalStateException("Unable to resolve application location.", exception);
        }

        return roots;
    }

    private void addRootWithParents(Path start, List<Path> roots) {
        Path current = start;
        for (int depth = 0; depth < 8 && current != null; depth++) {
            if (!roots.contains(current)) {
                roots.add(current);
            }
            current = current.getParent();
        }
    }

    private void addDatasetDirectoryCandidates(Path datasetDirectory, List<Path> candidates) {
        if (!Files.isDirectory(datasetDirectory)) {
            return;
        }

        try (Stream<Path> datasetFiles = Files.list(datasetDirectory)) {
            datasetFiles
                .filter(Files::isRegularFile)
                .filter(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".fna"))
                .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                .forEach(candidates::add);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to inspect dataset directory: " + datasetDirectory, exception);
        }
    }

    private static class SearchAccumulator {
        private final String label;
        private final String scope;
        private final List<Long> samplePositions = new ArrayList<>();
        private long scopeBases;
        private long count;
        private long timeMicros;

        private SearchAccumulator(String label, String scope) {
            this.label = label;
            this.scope = scope;
        }
    }
}
