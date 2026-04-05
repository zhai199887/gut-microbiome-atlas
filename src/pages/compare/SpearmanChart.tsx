import { useI18n } from "@/i18n";

import classes from "../ComparePage.module.css";
import type { SpearmanResult } from "./types";

const correlationColor = (value: number) => {
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) return `rgba(34, 197, 94, ${0.15 + clamped * 0.75})`;
  return `rgba(239, 68, 68, ${0.15 + Math.abs(clamped) * 0.75})`;
};

const SpearmanChart = ({ result }: { result: SpearmanResult | null }) => {
  const { locale } = useI18n();

  if (!result || !result.taxa.length) {
    return (
      <div className={classes.emptyPanel}>
        {locale === "zh" ? "暂无可用的 Spearman 相关性结果" : "No Spearman correlation result available"}
      </div>
    );
  }

  const edges = result.edges.slice(0, 8);
  const cellSize = 34;
  const width = 920;
  const height = 220 + result.taxa.length * cellSize;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`compare-chart ${classes.chart}`}>
      <text x={width / 2} y={22} textAnchor="middle" fill="currentColor" fontSize="14">
        {locale === "zh" ? "Spearman 相关结构" : "Spearman Correlation Structure"}
      </text>
      <text x={width / 2} y={42} textAnchor="middle" fill="var(--light-gray)" fontSize="11">
        {locale === "zh"
          ? `基于 ${result.summary.sample_count} 个匹配样本计算`
          : `Computed from ${result.summary.sample_count} matched samples`}
      </text>

      {result.taxa.map((taxon, index) => (
        <text
          key={`head-${taxon.taxon}`}
          x={250 + index * cellSize + cellSize / 2}
          y={78}
          transform={`rotate(-45, ${250 + index * cellSize + cellSize / 2}, 78)`}
          fill="var(--light-gray)"
          fontSize="9"
          textAnchor="end"
        >
          {taxon.taxon.slice(0, 10)}
        </text>
      ))}

      {result.matrix.map((row, rowIndex) => (
        <g key={result.taxa[rowIndex]?.taxon ?? rowIndex}>
          <text x={230} y={106 + rowIndex * cellSize + 6} textAnchor="end" fill="currentColor" fontSize="10">
            {result.taxa[rowIndex]?.taxon.slice(0, 18)}
          </text>
          {row.map((value, colIndex) => (
            <g key={`${rowIndex}-${colIndex}`}>
              <rect
                x={250 + colIndex * cellSize}
                y={92 + rowIndex * cellSize}
                width={cellSize - 2}
                height={cellSize - 2}
                rx={5}
                fill={correlationColor(value)}
              />
              <text
                x={250 + colIndex * cellSize + (cellSize - 2) / 2}
                y={92 + rowIndex * cellSize + 20}
                textAnchor="middle"
                fill="currentColor"
                fontSize="9"
              >
                {value.toFixed(1)}
              </text>
            </g>
          ))}
        </g>
      ))}

      <text x={30} y={120} fill="currentColor" fontSize="12">
        {locale === "zh" ? "最强相关边" : "Strongest edges"}
      </text>
      {edges.map((edge, index) => (
        <g key={`${edge.source}-${edge.target}`}>
          <circle cx={36} cy={144 + index * 18} r={4} fill={edge.type === "positive" ? "#22c55e" : "#ef4444"} />
          <text x={48} y={148 + index * 18} fill="var(--light-gray)" fontSize="10">
            {edge.source} {edge.type === "positive" ? "+" : "-"} {edge.target} (r={edge.r.toFixed(2)})
          </text>
        </g>
      ))}
    </svg>
  );
};

export default SpearmanChart;
