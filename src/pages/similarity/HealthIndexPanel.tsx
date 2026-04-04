/**
 * HealthIndexPanel.tsx
 * 肠道微生物组健康指数 (GMHI) — 群体分布概览 + 用户计算
 */
import { useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { useI18n } from "@/i18n";
import { cachedFetch } from "@/util/apiCache";
import { exportTable } from "@/util/export";
import classes from "./HealthIndexPanel.module.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/* ── Types ── */
interface HistBin { bin_start: number; bin_end: number; nc_count: number; disease_count: number }
interface PopStats { n: number; mean: number; median: number; std: number; p25: number; p75: number }
interface GenusEntry { genus: string; log2fc: number; p_value: number; mean_nc: number; mean_disease: number }
interface PopulationData {
  histogram: HistBin[];
  nc_stats: PopStats;
  disease_stats: PopStats;
}
interface ReferenceData {
  health_genera: GenusEntry[];
  disease_genera: GenusEntry[];
  n_nc_samples: number;
  n_disease_samples: number;
  population: PopulationData;
}

interface HealthResult {
  score: number;
  raw_score: number;
  category: string;
  health_genera_matched: number;
  disease_genera_matched: number;
  health_genera_sum: number;
  disease_genera_sum: number;
  health_genera_detail: { genus: string; abundance: number }[];
  disease_genera_detail: { genus: string; abundance: number }[];
  per_genus_deviation: {
    genus: string;
    user_abundance: number;
    nc_mean: number;
    nc_median: number;
    status: string;
  }[];
  reference: {
    n_nc_samples: number;
    n_disease_samples: number;
    health_genera_total: number;
    disease_genera_total: number;
  };
}

function parseAbundanceText(text: string): Record<string, number> {
  const result: Record<string, number> = {};
  const lines = text.trim().split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("genus") || lower.startsWith("taxon") || lower.startsWith("name")) continue;
    const parts = trimmed.split(/[,\t]+/);
    if (parts.length >= 2) {
      const genus = parts[0].trim();
      const value = parseFloat(parts[1].trim());
      if (genus && !isNaN(value)) {
        result[genus] = value;
      }
    }
  }
  return result;
}

/* ── Population Distribution Histogram (D3) ── */
const PopHistogram = ({ data }: { data: HistBin[] }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 36, left: 44 };
    const w = 560, h = 220;
    const iw = w - margin.left - margin.right;
    const ih = h - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${w} ${h}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(data, d => Math.max(d.nc_count, d.disease_count)) ?? 1;
    const x = d3.scaleBand().domain(data.map(d => String(d.bin_start))).range([0, iw]).padding(0.15);
    const y = d3.scaleLinear().domain([0, maxVal * 1.1]).range([ih, 0]);

    // Axes
    g.append("g").attr("transform", `translate(0,${ih})`)
      .call(d3.axisBottom(x).tickValues(data.filter((_, i) => i % 2 === 0).map(d => String(d.bin_start))))
      .selectAll("text").attr("fill", "#999").style("font-size", "10px");
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text").attr("fill", "#999").style("font-size", "10px");

    // Axis labels
    g.append("text").attr("x", iw / 2).attr("y", ih + 32)
      .attr("text-anchor", "middle").attr("fill", "#888").style("font-size", "11px")
      .text("GMHI Score");
    g.append("text").attr("x", -ih / 2).attr("y", -34)
      .attr("transform", "rotate(-90)").attr("text-anchor", "middle")
      .attr("fill", "#888").style("font-size", "11px").text("Count");

    const bw = x.bandwidth() / 2;

    // NC bars
    g.selectAll(".nc-bar").data(data).join("rect")
      .attr("x", d => x(String(d.bin_start))!)
      .attr("y", d => y(d.nc_count))
      .attr("width", bw)
      .attr("height", d => ih - y(d.nc_count))
      .attr("fill", "#44cc88").attr("opacity", 0.8);

    // Disease bars
    g.selectAll(".dis-bar").data(data).join("rect")
      .attr("x", d => x(String(d.bin_start))! + bw)
      .attr("y", d => y(d.disease_count))
      .attr("width", bw)
      .attr("height", d => ih - y(d.disease_count))
      .attr("fill", "#ff6666").attr("opacity", 0.8);

    // Legend
    const lg = svg.append("g").attr("transform", `translate(${w - 180}, 8)`);
    lg.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#44cc88").attr("rx", 2);
    lg.append("text").attr("x", 16).attr("y", 10).attr("fill", "#ccc").style("font-size", "11px").text("NC");
    lg.append("rect").attr("x", 50).attr("width", 12).attr("height", 12).attr("fill", "#ff6666").attr("rx", 2);
    lg.append("text").attr("x", 66).attr("y", 10).attr("fill", "#ccc").style("font-size", "11px").text("Disease");
  }, [data]);

  return <svg ref={ref} style={{ width: "100%", maxWidth: 560, height: "auto" }} role="img" aria-label="Population GMHI distribution histogram" />;
};

/* ── Main Component ── */
const HealthIndexPanel = () => {
  const { t } = useI18n();

  // Population reference data
  const [refData, setRefData] = useState<ReferenceData | null>(null);
  const [refLoading, setRefLoading] = useState(true);

  // User calculation state
  const [pasteText, setPasteText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<HealthResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gaugeRef = useRef<SVGSVGElement>(null);

  // Load population reference data on mount
  useEffect(() => {
    cachedFetch<ReferenceData>(`${API_BASE}/api/health-index/reference`)
      .then(setRefData)
      .catch(() => setRefData(null))
      .finally(() => setRefLoading(false));
  }, []);

  const readFile = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(f);
    });

  const calculate = async () => {
    setError("");
    setResult(null);

    let abundances: Record<string, number> = {};
    try {
      if (file) {
        const text = await readFile(file);
        abundances = parseAbundanceText(text);
      } else if (pasteText.trim()) {
        abundances = parseAbundanceText(pasteText);
      }
    } catch {
      setError("Failed to parse input");
      return;
    }

    if (Object.keys(abundances).length === 0) {
      setError("No valid genus-abundance pairs found");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/health-index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abundances }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${resp.status}`);
      }
      setResult(await resp.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  };

  // Gauge chart for user result
  useEffect(() => {
    if (!result || !gaugeRef.current) return;
    const svg = d3.select(gaugeRef.current);
    svg.selectAll("*").remove();

    const w = 280, h = 180;
    svg.attr("viewBox", `0 0 ${w} ${h}`);
    const cx = w / 2, cy = 150;
    const r = 110;
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const scoreAngle = startAngle + (result.score / 100) * (endAngle - startAngle);

    const bgArc = d3.arc<unknown>()
      .innerRadius(r - 18).outerRadius(r)
      .startAngle(startAngle).endAngle(endAngle);
    svg.append("path")
      .attr("d", bgArc({} as never) ?? "")
      .attr("transform", `translate(${cx},${cy})`)
      .attr("fill", "#2a2a3a");

    const segments = [
      { end: 0.33, color: "#ff4444" },
      { end: 0.66, color: "#ffaa00" },
      { end: 1.0, color: "#44cc88" },
    ];
    let prevEnd = startAngle;
    for (const seg of segments) {
      const segEnd = startAngle + seg.end * (endAngle - startAngle);
      const clampedEnd = Math.min(segEnd, scoreAngle);
      if (clampedEnd <= prevEnd) break;
      const segArc = d3.arc<unknown>()
        .innerRadius(r - 18).outerRadius(r)
        .startAngle(prevEnd).endAngle(clampedEnd);
      svg.append("path")
        .attr("d", segArc({} as never) ?? "")
        .attr("transform", `translate(${cx},${cy})`)
        .attr("fill", seg.color).attr("opacity", 0.9);
      prevEnd = clampedEnd;
    }

    const needleLen = r - 25;
    const nx = cx + needleLen * Math.cos(scoreAngle - Math.PI / 2);
    const ny = cy + needleLen * Math.sin(scoreAngle - Math.PI / 2);
    svg.append("line")
      .attr("x1", cx).attr("y1", cy)
      .attr("x2", nx).attr("y2", ny)
      .attr("stroke", "#fff").attr("stroke-width", 2);
    svg.append("circle")
      .attr("cx", cx).attr("cy", cy).attr("r", 5).attr("fill", "#fff");

    svg.append("text")
      .attr("x", cx).attr("y", cy - 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff").attr("font-size", 32).attr("font-weight", 700)
      .text(result.score.toFixed(0));

    const catColor = result.category === "good" ? "#44cc88" : result.category === "moderate" ? "#ffaa00" : "#ff4444";
    svg.append("text")
      .attr("x", cx).attr("y", cy - 5)
      .attr("text-anchor", "middle")
      .attr("fill", catColor).attr("font-size", 13)
      .text(t(`healthIndex.category.${result.category}` as const));
  }, [result, t]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) setFile(f);
  };

  const exportDeviations = () => {
    if (!result) return;
    exportTable(
      result.per_genus_deviation.map(g => ({
        Genus: g.genus,
        User_Abundance: g.user_abundance,
        NC_Mean: g.nc_mean,
        NC_Median: g.nc_median,
        Status: g.status,
      })),
      `health_index_deviation_${Date.now()}`,
    );
  };

  const hasInput = !!file || pasteText.trim().length > 0;
  const pop = refData?.population;

  return (
    <div className={classes.panel}>
      <h2 className={classes.title}>{t("healthIndex.title")}</h2>
      <p className={classes.subtitle}>{t("healthIndex.subtitle")}</p>

      {/* ── Section 1: Population Overview (always shown) ── */}
      {refLoading && (
        <div className={classes.popLoading}>
          <div className="loading-spinner" style={{ width: 24, height: 24 }} />
          <span>Loading population data...</span>
        </div>
      )}

      {!refLoading && refData && pop && (
        <div className={classes.popSection}>
          <h3 className={classes.popTitle}>{t("healthIndex.popTitle")}</h3>
          <p className={classes.popSubtitle}>{t("healthIndex.popSubtitle")}</p>

          {/* Stats cards */}
          <div className={classes.statsGrid}>
            <div className={classes.statCard} data-accent="green">
              <div className={classes.statCardVal}>{refData.n_nc_samples.toLocaleString()}</div>
              <div className={classes.statCardLbl}>{t("healthIndex.ncSamples")}</div>
              <div className={classes.statCardSub}>
                {t("healthIndex.meanScore")}: <strong>{pop.nc_stats.mean}</strong> &middot; {t("healthIndex.medianScore")}: <strong>{pop.nc_stats.median}</strong>
              </div>
              <div className={classes.statCardSub}>
                {t("healthIndex.scoreRange")}: {pop.nc_stats.p25} — {pop.nc_stats.p75}
              </div>
            </div>
            <div className={classes.statCard} data-accent="red">
              <div className={classes.statCardVal}>{refData.n_disease_samples.toLocaleString()}</div>
              <div className={classes.statCardLbl}>{t("healthIndex.diseaseSamples")}</div>
              <div className={classes.statCardSub}>
                {t("healthIndex.meanScore")}: <strong>{pop.disease_stats.mean}</strong> &middot; {t("healthIndex.medianScore")}: <strong>{pop.disease_stats.median}</strong>
              </div>
              <div className={classes.statCardSub}>
                {t("healthIndex.scoreRange")}: {pop.disease_stats.p25} — {pop.disease_stats.p75}
              </div>
            </div>
          </div>

          {/* Histogram */}
          <PopHistogram data={pop.histogram} />

          {/* Top genera tables side by side */}
          <div className={classes.generaRow}>
            <div className={classes.generaCol}>
              <h4 className={classes.generaTitle} style={{ color: "#44cc88" }}>
                {t("healthIndex.topHealthGenera")}
              </h4>
              <div className={classes.tableWrap} style={{ maxHeight: 260 }}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>{t("healthIndex.col.genus")}</th>
                      <th>{t("healthIndex.log2fc")}</th>
                      <th>{t("healthIndex.meanNC")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refData.health_genera.map(g => (
                      <tr key={g.genus}>
                        <td><em>{g.genus}</em></td>
                        <td style={{ color: "#44cc88" }}>{g.log2fc.toFixed(2)}</td>
                        <td>{g.mean_nc.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={classes.generaCol}>
              <h4 className={classes.generaTitle} style={{ color: "#ff6666" }}>
                {t("healthIndex.topDiseaseGenera")}
              </h4>
              <div className={classes.tableWrap} style={{ maxHeight: 260 }}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>{t("healthIndex.col.genus")}</th>
                      <th>{t("healthIndex.log2fc")}</th>
                      <th>{t("healthIndex.meanDis")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refData.disease_genera.map(g => (
                      <tr key={g.genus}>
                        <td><em>{g.genus}</em></td>
                        <td style={{ color: "#ff6666" }}>{g.log2fc.toFixed(2)}</td>
                        <td>{g.mean_disease.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 2: User upload & calculation ── */}
      <div className={classes.uploadSection}>
        <h3 className={classes.uploadTitle}>{t("healthIndex.tryYourOwn")}</h3>
      </div>

      <div className={classes.inputRow}>
        <div
          className={`${classes.dropZone} ${file ? classes.dropZoneActive : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
          <p>{file ? file.name : "CSV / TSV"}</p>
          <p style={{ fontSize: "0.75rem", color: "#888" }}>genus_name, abundance</p>
        </div>
        <textarea
          className={classes.textarea}
          placeholder={"Bacteroides,0.25\nFaecalibacterium,0.18\nPrevotella,0.12"}
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
        />
        <button className={classes.calcBtn} onClick={calculate} disabled={!hasInput || loading}>
          {loading ? t("healthIndex.calculating") : t("healthIndex.calculate")}
        </button>
      </div>

      {error && <div className={classes.error}>{error}</div>}

      {/* User result */}
      {result && (
        <div className={classes.results}>
          <div className={classes.gaugeRow}>
            <svg ref={gaugeRef} className={classes.gauge} />
            <div className={classes.statsCol}>
              <div className={classes.statItem}>
                <span className={classes.statVal}>{result.health_genera_matched}</span>
                <span className={classes.statLbl}>{t("healthIndex.healthGenera")}</span>
              </div>
              <div className={classes.statItem}>
                <span className={classes.statVal}>{result.disease_genera_matched}</span>
                <span className={classes.statLbl}>{t("healthIndex.diseaseGenera")}</span>
              </div>
              <div className={classes.statItem}>
                <span className={classes.statVal}>{result.reference.n_nc_samples.toLocaleString()}</span>
                <span className={classes.statLbl}>NC samples (ref)</span>
              </div>
            </div>
          </div>

          {/* Deviation table */}
          <div className={classes.deviationSection}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3>{t("healthIndex.deviation")}</h3>
              <button className={classes.exportBtn} onClick={exportDeviations}>{t("export.csv")}</button>
            </div>
            <div className={classes.tableWrap}>
              <table className={classes.table}>
                <thead>
                  <tr>
                    <th>{t("healthIndex.col.genus")}</th>
                    <th>{t("healthIndex.col.yours")}</th>
                    <th>{t("healthIndex.col.ncMean")}</th>
                    <th>{t("healthIndex.col.ncMedian")}</th>
                    <th>{t("healthIndex.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.per_genus_deviation.map(g => (
                    <tr key={g.genus}>
                      <td>{g.genus}</td>
                      <td>{g.user_abundance.toFixed(4)}</td>
                      <td>{g.nc_mean.toFixed(4)}</td>
                      <td>{g.nc_median.toFixed(4)}</td>
                      <td>
                        <span className={classes.statusBadge} data-status={g.status}>
                          {g.status === "high" ? "↑" : g.status === "low" ? "↓" : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthIndexPanel;
