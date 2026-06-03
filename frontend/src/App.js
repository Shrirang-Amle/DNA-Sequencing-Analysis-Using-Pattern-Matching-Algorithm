import React, { useEffect, useMemo, useState } from "react";
import InputForm from "./components/InputForm";
import ResultDisplay from "./components/ResultDisplay";
import PerformanceChart from "./charts/PerformanceChart";
import DNAViewer from "./components/DNAViewer";
import { analyzeDNA, getDatasetInfo } from "./services/api";
import "./App.css";

const HISTORY_STORAGE_KEY = "dna-analysis-history";
const HISTORY_LIMIT = 6;

function buildHistoryEntry({ result, mode, pattern, dna, dataset }) {
  const safeTime = result?.time || {};
  const timeEntries = Object.entries(safeTime).filter(([, value]) => Number(value) >= 0);
  const fastest = timeEntries.sort((a, b) => a[1] - b[1])[0];

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    mode,
    pattern,
    dnaLength: mode === "manual" ? (dna || "").length : null,
    datasetName: dataset?.name || "Local dataset",
    fastestAlgorithm: fastest ? fastest[0].toUpperCase() : "N/A",
    fastestTime: fastest ? fastest[1] : 0
  };
}

function App() {
  const [mode, setMode] = useState("manual");
  const [scanMode, setScanMode] = useState("full");
  const [dna, setDna] = useState("");
  const [pattern, setPattern] = useState("");
  const [result, setResult] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [datasetError, setDatasetError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isActive = true;

    const loadDatasetInfo = async () => {
      try {
        const response = await getDatasetInfo();
        if (isActive) {
          setDataset(response);
          setDatasetError("");
        }
      } catch (error) {
        if (isActive) {
          setDataset(null);
          setDatasetError(
            error?.response?.data?.message ||
              "Unable to locate the dataset in the Dataset folder."
          );
        }
      }
    };

    loadDatasetInfo();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const handleAnalyze = async () => {
    const normalizedDna = (dna || "").trim().toUpperCase();
    const normalizedPattern = (pattern || "").trim().toUpperCase();

    if (!normalizedPattern) {
      alert("Enter pattern!");
      return;
    }

    if (mode === "manual" && !normalizedDna) {
      alert("DNA not loaded!");
      return;
    }

    if (mode === "dataset" && !dataset) {
      alert("Dataset not available!");
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await analyzeDNA({
        dna: mode === "manual" ? normalizedDna : "",
        pattern: normalizedPattern,
        mode,
        scanMode
      });
      setResult(response);
      setHistory((current) => [
        buildHistoryEntry({
          result: response,
          mode,
          pattern: normalizedPattern,
          dna: normalizedDna,
          dataset
        }),
        ...current
      ].slice(0, HISTORY_LIMIT));
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Unable to analyze DNA. Please check the backend connection."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const latestInsight = useMemo(() => {
    if (!result?.time) {
      return null;
    }

    const entries = Object.entries(result.time);
    if (!entries.length) {
      return null;
    }

    const [fastestAlgorithm, fastestValue] = [...entries].sort((a, b) => a[1] - b[1])[0];
    return {
      fastestAlgorithm: fastestAlgorithm.toUpperCase(),
      fastestValue
    };
  }, [result]);

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="app-shell">
      <div className="app-container">
        <header className="hero-card">
          <div>
            <p className="eyebrow">DNA Pattern Matching</p>
            <h1 className="page-title">DNA Analysis Dashboard</h1>
            <p className="page-subtitle">
              Choose a small-file manual workflow for browser input or switch to
              dataset mode for very large genome files stored on disk.
            </p>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <span className="metric-label">Mode</span>
              <span className="metric-value">{mode === "manual" ? "Manual" : "Dataset"}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Recent Runs</span>
              <span className="metric-value">{history.length}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Fastest Latest</span>
              <span className="metric-value">
                {latestInsight ? `${latestInsight.fastestAlgorithm}` : "N/A"}
              </span>
            </div>
          </div>
        </header>

        <div className="card">
          <InputForm
            mode={mode}
            setMode={setMode}
            scanMode={scanMode}
            setScanMode={setScanMode}
            dna={dna}
            pattern={pattern}
            setDna={setDna}
            setPattern={setPattern}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            dataset={dataset}
            datasetError={datasetError}
          />
        </div>

        <div className="card">
          <div className="section-heading history-header">
            <div>
              <h2>Analysis History</h2>
              <p>Recent runs are saved locally so you can compare experiments quickly.</p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={clearHistory}
              disabled={!history.length}
            >
              Clear History
            </button>
          </div>

          {history.length ? (
            <div className="history-grid">
              {history.map((entry) => (
                <article key={entry.id} className="history-card">
                  <p className="history-title">{entry.pattern}</p>
                  <p className="history-line">Mode: {entry.mode === "manual" ? "Manual" : "Dataset"}</p>
                  {entry.dnaLength ? (
                    <p className="history-line">DNA length: {entry.dnaLength.toLocaleString()}</p>
                  ) : (
                    <p className="history-line">Dataset: {entry.datasetName}</p>
                  )}
                  <p className="history-line">
                    Fastest: {entry.fastestAlgorithm} ({entry.fastestTime.toLocaleString()} us)
                  </p>
                  <p className="history-line">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No analysis history yet. Run your first experiment to track it here.</p>
          )}
        </div>

        {result && (
          <>
            <div className="card">
              <ResultDisplay
                result={result}
                mode={mode}
                pattern={pattern}
                dna={dna}
                dataset={dataset}
              />
            </div>

            <div className="card">
              <PerformanceChart time={result.time} />
            </div>

            <div className="card">
              <DNAViewer
                mode={mode}
                dna={dna}
                matches={result?.results?.kmp || []}
                pattern={pattern}
                previews={result?.previews || []}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
