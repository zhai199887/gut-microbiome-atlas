import { useMemo } from "react";

import { useI18n } from "@/i18n";

import classes from "../ComparePage.module.css";
import type { DiffResult } from "./types";

const colorForValue = (value: number) => {
  const clamped = Math.max(-2, Math.min(2, value));
  if (clamped >= 0) return `rgba(34, 197, 94, ${0.18 + clamped / 2 * 0.62})`;
  return `rgba(59, 130, 246, ${0.18 + Math.abs(clamped) / 2 * 0.62})`;
};

const zScore = (values: number[]) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1);
  const std = Math.sqrt(variance) || 1;
  return values.map((value) => (value - mean) / std);
};

const DiffHeatmap = ({ result }: { result: DiffResult }) => {
  const { locale } = useI18n();
  const top = result.diff_taxa.slice(0, 20);

  const matrix = useMemo(() => {
    const meanA = zScore(top.map((row) => row.mean_a));
    const meanB = zScore(top.map((row) => row.mean_b));
    const effect = zScore(top.map((row) => row.log2fc));
    return top.map((row, index) => ({
      taxon: row.taxon,
      phylum: row.phylum,
      values: [meanA[index], meanB[index], effect[index]],
    }));
  }, [top]);

  const columns = [
    locale === "zh" ? "A 组丰度" : "Mean A",
    locale === "zh" ? "B 组丰度" : "Mean B",
    "log2FC",
  ];

  return (
    <svg viewBox={`0 0 860 ${140 + matrix.length * 28}`} className={`compare-chart ${classes.chart}`}>
      <text x={430} y={22} textAnchor="middle" fill="currentColor" fontSize="14">
        {locale === "zh" ? "差异热图" : "Differential Heatmap"}
      </text>
      <text x={430} y={42} textAnchor="middle" fill="var(--light-gray)" fontSize="11">
        {locale === "zh" ? "对 Top 20 差异分类单元做列内标准化" : "Column-wise standardized values for the top 20 differential taxa"}
      </text>

      <text x={220} y={76} textAnchor="end" fill="var(--light-gray)" fontSize="10">
        {locale === "zh" ? "分类群" : "Taxon"}
      </text>
      {columns.map((column, index) => (
        <text key={column} x={310 + index * 130} y={76} textAnchor="middle" fill="var(--light-gray)" fontSize="10">
          {column}
        </text>
      ))}

      {matrix.map((row, rowIndex) => (
        <g key={row.taxon}>
          <text x={220} y={104 + rowIndex * 28} textAnchor="end" fill="currentColor" fontSize="10">
            {row.taxon.length > 22 ? `${row.taxon.slice(0, 20)}...` : row.taxon}
          </text>
          <text x={220} y={116 + rowIndex * 28} textAnchor="end" fill="var(--light-gray)" fontSize="8">
            {row.phylum}
          </text>
          {row.values.map((value, colIndex) => (
            <g key={`${row.taxon}-${colIndex}`}>
              <rect
                x={250 + colIndex * 130}
                y={88 + rowIndex * 28}
                width={120}
                height={22}
                rx={6}
                fill={colorForValue(value)}
              />
              <text
                x={310 + colIndex * 130}
                y={103 + rowIndex * 28}
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
              >
                {value.toFixed(1)}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
};

export default DiffHeatmap;
