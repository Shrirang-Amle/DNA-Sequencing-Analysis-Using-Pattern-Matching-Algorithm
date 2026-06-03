import React from "react";

export default function DNAViewer({ mode, dna, matches, pattern, previews }) {
  if (mode === "dataset") {
    if (!previews || previews.length === 0) {
      return (
        <section>
          <div className="section-heading">
            <h2>DNA Visualization</h2>
            <p>No preview snippets were captured for the current dataset pattern.</p>
          </div>
        </section>
      );
    }

    return (
      <section>
        <div className="section-heading">
          <h2>DNA Visualization</h2>
          <p>Preview snippets from dataset-backed KMP matches.</p>
        </div>

        <div className="preview-list">
          {previews.map((preview) => (
            <article key={`${preview.algorithm}-${preview.position}`} className="preview-card">
              <p className="preview-meta">
                {preview.algorithm.toUpperCase()} at position {preview.position.toLocaleString()}
              </p>
              <p className="dna-box">
                {preview.before}
                <span className="highlight">{preview.match}</span>
                {preview.after}
              </p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const sourceDna = dna || "";
  const safePattern = pattern || "";
  const safeMatches = Array.isArray(matches) ? matches : [];

  if (!sourceDna || !safePattern) {
    return (
      <section>
        <div className="section-heading">
          <h2>DNA Visualization</h2>
          <p>Run an analysis to view highlighted matches.</p>
        </div>
      </section>
    );
  }

  const sortedMatches = [...new Set(safeMatches)]
    .filter((index) => Number.isInteger(index) && index >= 0)
    .sort((a, b) => a - b);

  const content = [];
  let lastIndex = 0;

  sortedMatches.forEach((matchIndex) => {
    if (matchIndex < lastIndex || matchIndex + safePattern.length > sourceDna.length) {
      return;
    }

    if (matchIndex > lastIndex) {
      content.push(sourceDna.slice(lastIndex, matchIndex));
    }

    content.push(
      <span key={`match-${matchIndex}`} className="highlight">
        {sourceDna.slice(matchIndex, matchIndex + safePattern.length)}
      </span>
    );

    lastIndex = matchIndex + safePattern.length;
  });

  if (lastIndex < sourceDna.length) {
    content.push(sourceDna.slice(lastIndex));
  }

  return (
    <section>
      <div className="section-heading">
        <h2>DNA Visualization</h2>
        <p>KMP matches are highlighted inside the DNA sequence below.</p>
      </div>

      <div className="dna-box">{content}</div>
    </section>
  );
}
