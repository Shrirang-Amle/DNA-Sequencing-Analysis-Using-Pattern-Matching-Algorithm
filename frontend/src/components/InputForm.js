import React, { useEffect, useMemo, useState } from "react";

const MAX_DNA_LENGTH = 50000;
const SAMPLE_PATTERNS = ["ATCG", "GATTACA", "TTAGGG", "AACCTG"];

function calculateGcContent(sequence) {
  if (!sequence) {
    return 0;
  }

  const gcCount = (sequence.match(/[GC]/g) || []).length;
  return (gcCount / sequence.length) * 100;
}

function reverseComplement(sequence) {
  const pairs = { A: "T", T: "A", C: "G", G: "C" };
  return sequence
    .split("")
    .reverse()
    .map((char) => pairs[char] || char)
    .join("");
}

export default function InputForm({
  mode,
  setMode,
  scanMode,
  setScanMode,
  dna,
  pattern,
  setDna,
  setPattern,
  onAnalyze,
  isAnalyzing,
  dataset,
  datasetError
}) {
  const [localDna, setLocalDna] = useState(dna || "");
  const [localPattern, setLocalPattern] = useState(pattern || "");
  const [fileName, setFileName] = useState("");
  const [isFileLoading, setIsFileLoading] = useState(false);

  useEffect(() => {
    setLocalDna(dna || "");
  }, [dna]);

  useEffect(() => {
    setLocalPattern(pattern || "");
  }, [pattern]);

  const dnaStats = useMemo(() => {
    const safeDna = (localDna || "").trim();
    return {
      length: safeDna.length,
      gcContent: calculateGcContent(safeDna),
      uniqueBases: [...new Set(safeDna.split(""))]
        .filter(Boolean)
        .join(", ") || "N/A"
    };
  }, [localDna]);

  const resetFileState = () => {
    setFileName("");
    setIsFileLoading(false);
  };

  const handleRemoveFile = () => {
    resetFileState();
    setLocalDna("");
    setDna("");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setIsFileLoading(true);

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result || "";
      const cleanedDna = String(content)
        .split(/\r?\n/)
        .filter((line) => !line.startsWith(">"))
        .join("")
        .replace(/\s+/g, "")
        .toUpperCase()
        .slice(0, MAX_DNA_LENGTH);

      setLocalDna(cleanedDna);
      setDna(cleanedDna);
      setIsFileLoading(false);
    };

    reader.onerror = () => {
      resetFileState();
      alert("Unable to read the uploaded file.");
    };

    reader.readAsText(file);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const normalizedPattern = (localPattern || "").toUpperCase();
    setPattern(normalizedPattern);

    if (mode === "manual") {
      if (isFileLoading) {
        alert("File is still loading...");
        return;
      }

      if (!(localDna || "").trim()) {
        alert("DNA not loaded!");
        return;
      }
    }

    if (!normalizedPattern.trim()) {
      alert("Enter pattern!");
      return;
    }

    onAnalyze();
  };

  const isAnalyzeDisabled =
    isAnalyzing ||
    isFileLoading ||
    !(localPattern || "").trim() ||
    (mode === "manual" && !(localDna || "").trim()) ||
    (mode === "dataset" && !dataset);

  return (
    <form className="analysis-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <h2>Choose Input Mode</h2>
        <p>
          Use manual mode for pasted DNA or small files. Use dataset mode when
          the genome file is too large for the browser.
        </p>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          className={`mode-button ${mode === "manual" ? "mode-button-active" : ""}`}
          onClick={() => setMode("manual")}
        >
          Small File / Manual Mode
        </button>
        <button
          type="button"
          className={`mode-button ${mode === "dataset" ? "mode-button-active" : ""}`}
          onClick={() => setMode("dataset")}
        >
          Large Dataset Mode
        </button>
      </div>

      {mode === "manual" ? (
        <>
          <label htmlFor="dna-file">Upload DNA file</label>
          <input
            id="dna-file"
            className="file-input"
            type="file"
            accept=".fna,.txt"
            onChange={handleFileUpload}
          />

          {fileName && (
            <div className="file-banner">
              <span className="file-name">Uploaded: {fileName}</span>
              <button
                type="button"
                className="secondary-button"
                onClick={handleRemoveFile}
              >
                Remove File
              </button>
            </div>
          )}

          <label htmlFor="dna-input">DNA sequence</label>
          <textarea
            id="dna-input"
            placeholder="Paste DNA sequence here"
            value={localDna}
            disabled={Boolean(fileName)}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              setLocalDna(value);
              setDna(value);
            }}
          />

          <div className="helper-row">
            <span>
              {fileName
                ? "Textarea disabled while file is attached."
                : "Manual input enabled."}
            </span>
            <span>
              {isFileLoading
                ? "Loading..."
                : `${(localDna || "").length} / ${MAX_DNA_LENGTH} chars`}
            </span>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">DNA Length</span>
              <strong>{dnaStats.length.toLocaleString()}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">GC Content</span>
              <strong>{dnaStats.gcContent.toFixed(2)}%</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Bases Seen</span>
              <strong>{dnaStats.uniqueBases}</strong>
            </article>
          </div>
        </>
      ) : (
        <div className="dataset-panel">
          <h3>Dataset Source</h3>
          {dataset ? (
            <>
              <p><strong>File:</strong> {dataset.name}</p>
              <p><strong>Path:</strong> {dataset.path}</p>
              <p><strong>Size:</strong> {dataset.fileSizeHuman}</p>
              {dataset.chunkSize && <p><strong>Chunk size:</strong> {dataset.chunkSize.toLocaleString()} bases</p>}
              {dataset.quickScanBases && (
                <p><strong>Quick scan size:</strong> {dataset.quickScanBases.toLocaleString()} bases</p>
              )}
            </>
          ) : (
            <p>{datasetError || "Dataset not available."}</p>
          )}

          <div className="scan-mode-panel">
            <label htmlFor="scan-mode-select">Scan depth</label>
            <select
              id="scan-mode-select"
              value={scanMode}
              onChange={(event) => setScanMode(event.target.value)}
            >
              <option value="quick">Quick Scan</option>
              <option value="full">Full Scan</option>
            </select>
            <p className="scan-mode-note">
              Quick Scan searches only the first {dataset?.quickScanBases?.toLocaleString() || "5,000,000"} bases.
              Full Scan searches the entire dataset.
            </p>
          </div>
        </div>
      )}

      <label htmlFor="pattern-input">Pattern</label>
      <input
        id="pattern-input"
        type="text"
        placeholder="Enter DNA pattern"
        value={localPattern}
        onChange={(event) => {
          const value = event.target.value.toUpperCase();
          setLocalPattern(value);
          setPattern(value);
        }}
      />

      <div className="quick-actions">
        {SAMPLE_PATTERNS.map((sample) => (
          <button
            key={sample}
            type="button"
            className="chip-button"
            onClick={() => {
              setLocalPattern(sample);
              setPattern(sample);
            }}
          >
            {sample}
          </button>
        ))}
        <button
          type="button"
          className="chip-button"
          onClick={() => {
            const updated = reverseComplement((localPattern || "").toUpperCase());
            setLocalPattern(updated);
            setPattern(updated);
          }}
        >
          Reverse Complement
        </button>
        <button
          type="button"
          className="chip-button"
          onClick={() => {
            setLocalPattern("");
            setPattern("");
            if (mode === "manual") {
              setLocalDna("");
              setDna("");
              resetFileState();
            }
          }}
        >
          Clear Inputs
        </button>
      </div>

      <button type="submit" disabled={isAnalyzeDisabled}>
        {isFileLoading ? "Loading..." : isAnalyzing ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}
