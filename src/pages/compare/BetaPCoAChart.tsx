import { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";

import * as d3 from "d3";

import { useI18n } from "@/i18n";

import classes from "../ComparePage.module.css";
import type { BetaMetric, BetaPoint, DiffResult } from "./types";

function ellipsePath(points: BetaPoint[], xScale: d3.ScaleLinear<number, number>, yScale: d3.ScaleLinear<number, number>) {
  if (points.length < 3) return "";

  const meanX = d3.mean(points, (point) => point.x) ?? 0;
  const meanY = d3.mean(points, (point) => point.y) ?? 0;
  const xs = points.map((point) => point.x - meanX);
  const ys = points.map((point) => point.y - meanY);
  const covXX = d3.mean(xs.map((value) => value * value)) ?? 0;
  const covYY = d3.mean(ys.map((value) => value * value)) ?? 0;
  const covXY = d3.mean(xs.map((value, index) => value * ys[index]!)) ?? 0;

  const trace = covXX + covYY;
  const determinant = covXX * covYY - covXY * covXY;
  const gap = Math.sqrt(Math.max(0, trace * trace / 4 - determinant));
  const lambda1 = trace / 2 + gap;
  const lambda2 = trace / 2 - gap;
  const angle = Math.atan2(lambda1 - covXX, covXY || 1e-9);
  const scale = 2.4477;
  const radiusX = Math.sqrt(Math.max(lambda1, 1e-9)) * scale;
  const radiusY = Math.sqrt(Math.max(lambda2, 1e-9)) * scale;

  const centerX = xScale(meanX);
  const centerY = yScale(meanY);
  const scaledRadiusX = Math.abs(xScale(meanX + radiusX) - centerX);
  const scaledRadiusY = Math.abs(yScale(meanY + radiusY) - centerY);
  const angleDegrees = angle * 180 / Math.PI;

  return `M ${centerX - scaledRadiusX} ${centerY} a ${scaledRadiusX} ${scaledRadiusY} ${angleDegrees} 1 0 ${scaledRadiusX * 2} 0 a ${scaledRadiusX} ${scaledRadiusY} ${angleDegrees} 1 0 ${-scaledRadiusX * 2} 0`;
}

const BetaPCoAChart = ({ result }: { result: DiffResult }) => {
  const { locale } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const [metric, setMetric] = useState<BetaMetric>("braycurtis");

  useEffect(() => {
    if (result.beta_diversity.default_metric === "aitchison") {
      setMetric("aitchison");
    }
  }, [result.beta_diversity.default_metric]);

  const current = useMemo(
    () => result.beta_diversity.metrics[metric] ?? result.beta_diversity.metrics[result.beta_diversity.default_metric],
    [metric, result.beta_diversity.default_metric, result.beta_diversity.metrics],
  );

  useEffect(() => {
    if (!svgRef.current || !current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const coords = current.pcoa_coords;
    if (!coords.length) {
      svg.attr("viewBox", "0 0 680 120");
      svg.append("text")
        .attr("x", 20)
        .attr("y", 60)
        .attr("fill", "currentColor")
        .attr("font-size", 14)
        .text(locale === "zh" ? "暂无 Beta 多样性坐标" : "No beta-diversity coordinates available");
      return;
    }

    const width = 760;
    const height = 460;
    const margin = { top: 44, right: 160, bottom: 64, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const groupA = coords.filter((point) => point.group === "A");
    const groupB = coords.filter((point) => point.group === "B");
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xDomain = d3.extent(coords, (point) => point.x) as [number, number];
    const yDomain = d3.extent(coords, (point) => point.y) as [number, number];
    const x = d3.scaleLinear().domain(xDomain).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomain).nice().range([innerHeight, 0]);

    g.append("path")
      .attr("d", ellipsePath(groupA, x, y))
      .attr("fill", "rgba(34, 197, 94, 0.10)")
      .attr("stroke", "var(--secondary)")
      .attr("stroke-width", 1.2);

    g.append("path")
      .attr("d", ellipsePath(groupB, x, y))
      .attr("fill", "rgba(59, 130, 246, 0.10)")
      .attr("stroke", "var(--primary)")
      .attr("stroke-width", 1.2);

    g.selectAll("circle")
      .data(coords)
      .join("circle")
      .attr("cx", (point) => x(point.x))
      .attr("cy", (point) => y(point.y))
      .attr("r", 4.6)
      .attr("fill", (point) => point.group === "A" ? "var(--secondary)" : "var(--primary)")
      .attr("opacity", 0.85)
      .attr("role", "graphics-symbol")
      .attr("data-tooltip", (point) => renderToString(
        <div className="tooltip-table">
          <span>{locale === "zh" ? "分组" : "Group"}</span>
          <span>{point.group === "A" ? result.summary.group_a_name : result.summary.group_b_name}</span>
          <span>PCo1</span><span>{point.x.toFixed(4)}</span>
          <span>PCo2</span><span>{point.y.toFixed(4)}</span>
        </div>,
      ));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6))
      .attr("font-size", 11);

    g.append("g").call(d3.axisLeft(y).ticks(6)).attr("font-size", 11);

    svg.append("text")
      .attr("x", margin.left + innerWidth / 2)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text(`PCo1 (${current.metric}) ${current.variance_explained[0] ?? 0}%`);

    svg.append("text")
      .attr("transform", `translate(16,${height / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", 12)
      .text(`PCo2 (${current.metric}) ${current.variance_explained[1] ?? 0}%`);

    svg.append("text")
      .attr("x", margin.left + innerWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--light-gray)")
      .attr("font-size", 12)
      .text(locale === "zh" ? "95% 置信椭圆展示组内离散度" : "95% confidence ellipses show within-group dispersion");

    [
      { color: "var(--secondary)", label: result.summary.group_a_name, n: groupA.length },
      { color: "var(--primary)", label: result.summary.group_b_name, n: groupB.length },
    ].forEach((item, index) => {
      const legendX = width - margin.right + 12;
      const legendY = margin.top + 16 + index * 22;
      svg.append("circle")
        .attr("cx", legendX)
        .attr("cy", legendY)
        .attr("r", 5)
        .attr("fill", item.color);
      const displayLabel = item.label.length > 14 ? `${item.label.slice(0, 13)}...` : item.label;
      svg.append("text")
        .attr("x", legendX + 14)
        .attr("y", legendY + 4)
        .attr("fill", "var(--light-gray)")
        .attr("font-size", 10)
        .text(`${displayLabel} (n=${item.n})`);
    });

    // PERMANOVA stats box — mirrors the paper figure
    const perm = result.permanova;
    if (perm) {
      const bx = margin.left + innerWidth - 192;
      const by = margin.top + 10;
      const bw = 190;
      const bh = 70;
      svg.append("rect")
        .attr("x", bx).attr("y", by)
        .attr("width", bw).attr("height", bh)
        .attr("rx", 5)
        .attr("fill", "var(--card-bg, #fff)")
        .attr("stroke", "var(--border, #ccc)")
        .attr("stroke-width", 1)
        .attr("opacity", 0.9);
      const permLines = [
        { text: "PERMANOVA", bold: true },
        { text: `R² = ${perm.r_squared.toFixed(4)},  F = ${perm.f_statistic.toFixed(2)}`, bold: false },
        { text: `p = ${perm.p_value} (${perm.permutations} perm.)`, bold: false },
      ];
      permLines.forEach((line, i) => {
        svg.append("text")
          .attr("x", bx + 10).attr("y", by + 18 + i * 18)
          .attr("fill", "currentColor")
          .attr("font-size", i === 0 ? 11 : 10)
          .attr("font-weight", line.bold ? 700 : 400)
          .text(line.text);
      });
    }

    svg.attr("viewBox", `0 0 ${width} ${height}`);
  }, [current, locale, result.summary.group_a_name, result.summary.group_b_name, result.permanova]);

  if (!current) {
    return null;
  }

  return (
    <div className={classes.betaWrap}>
      <div className={classes.metricTabs}>
        {(["braycurtis", "aitchison"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={classes.metricTab}
            data-active={metric === item}
            onClick={() => setMetric(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <svg ref={svgRef} className={`compare-chart ${classes.chart}`} />
    </div>
  );
};

export default BetaPCoAChart;
