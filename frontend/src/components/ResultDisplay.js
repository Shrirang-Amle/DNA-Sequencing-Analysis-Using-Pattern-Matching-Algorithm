function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildSummary(result, mode, pattern, dna, dataset) {
  const resultEntries = Object.entries(result.results || {});
  const timeEntries = Object.entries(result.time || {});
  const fastest = [...timeEntries].sort((a, b) => a[1] - b[1])[0];
  const totalMatches = resultEntries.reduce((sum, [, value]) => {
    if (Array.isArray(value)) {
      return sum + value.length;
    }
    return sum + (value?.count || 0);
  }, 0);

  return {
    totalMatches,
    fastestAlgorithm: fastest ? fastest[0].toUpperCase() : "N/A",
    fastestTime: fastest ? fastest[1] : 0,
    source: mode === "manual" ? `${(dna || "").length.toLocaleString()} bases` : dataset?.name || "Dataset mode",
    pattern
  };
}

export default function ResultDisplay({ result, mode, pattern, dna, dataset }) {
  if (!result || !result.results) {
    return null;
  }

  const summary = buildSummary(result, mode, pattern, dna, dataset);
  const entries = [
    ["naive", "Naive"],
    ["kmp", "KMP"],
    ["rabin", "Rabin-Karp"],
    ["hamming", "Hamming"]
  ];

  const exportReport = () => {
    downloadFile(
      `dna-analysis-${summary.pattern || "report"}.json`,
      JSON.stringify({ summary, result }, null, 2),
      "application/json"
    );
  };

  const copySummary = async () => {
    const text = `Pattern: ${summary.pattern}\nSource: ${summary.source}\nTotal matches: ${summary.totalMatches}\nFastest algorithm: ${summary.fastestAlgorithm} (${summary.fastestTime} us)`;
    await navigator.clipboard.writeText(text);
    alert("Analysis summary copied to clipboard.");
  };

  return (
    <section>
      <div className="section-heading result-header">
        <div>
          <h2>Match Results</h2>
          <p>
            {result.mode === "dataset"
              ? `Dataset mode returns sampled/full-scan summaries depending on the algorithm. Current scan: ${(result.scanMode || "full").toUpperCase()}.`
              : "Readable output for each algorithm without exposing raw JSON."}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-button" onClick={copySummary}>
            Copy Summary
          </button>
          <button type="button" className="secondary-button" onClick={exportReport}>
            Export Report
          </button>
        </div>
      </div>

      <div className="summary-grid">
        <article className="summary-card">
          <span className="stat-label">Pattern</span>
          <strong>{summary.pattern || "N/A"}</strong>
        </article>
        <article className="summary-card">
          <span className="stat-label">Source</span>
          <strong>{summary.source}</strong>
        </article>
        <article className="summary-card">
          <span className="stat-label">Total Matches</span>
          <strong>{summary.totalMatches.toLocaleString()}</strong>
        </article>
        <article className="summary-card">
          <span className="stat-label">Fastest Algorithm</span>
          <strong>{summary.fastestAlgorithm}</strong>
        </article>
      </div>

      <div className="result-grid">
        {entries.map(([key, label]) => {
          const value = result.results[key];
          const matches = Array.isArray(value) ? value : value?.samplePositions || [];
          const scope = !Array.isArray(value) && value?.scope
            ? value.scope === "full_genome"
              ? ` (${value.scopeBases.toLocaleString()} bases, full genome)`
              : ` (${value.scopeBases.toLocaleString()} bases, sample)`
            : "";

          return (
            <article key={key} className="result-card">
              <h3>{label}</h3>
              <p className="result-line">
                {label} {"\u2192"} {matches.length > 0 ? matches.join(", ") : "No match found"}
              </p>
              <p className="result-line">Runtime: {(result.time?.[key] || 0).toLocaleString()} us</p>
              {scope && <p className="result-line">Scope{scope}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
