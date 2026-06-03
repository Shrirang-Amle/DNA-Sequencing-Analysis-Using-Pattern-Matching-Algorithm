import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Title, Tooltip);

export default function PerformanceChart({ time }) {
  if (!time) {
    return null;
  }

  const labels = ["Naive", "KMP", "Rabin-Karp", "Hamming"];
  const rawValues = [
    Number(time.naive) || 0,
    Number(time.kmp) || 0,
    Number(time.rabin) || 0,
    Number(time.hamming) || 0
  ];

  const maxValue = Math.max(...rawValues, 1);

  const data = {
    labels,
    datasets: [
      {
        label: "Execution Time (microseconds)",
        data: rawValues,
        backgroundColor: ["#ef4444", "#0f766e", "#eab308", "#f97316"],
        borderRadius: 12,
        maxBarThickness: 56,
        minBarLength: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label(context) {
            return `${context.dataset.label}: ${context.raw.toLocaleString()} us`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: maxValue * 1.15,
        ticks: {
          callback(value) {
            return `${Number(value).toLocaleString()} us`;
          }
        }
      }
    }
  };

  return (
    <section>
      <div className="section-heading">
        <h2>Performance Graph</h2>
        <p>Execution time comparison across all DNA matching algorithms.</p>
      </div>

      <div className="chart-wrapper">
        <Bar data={data} options={options} />
      </div>
    </section>
  );
}
