import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import { useI18n } from "@/i18n";
import { cachedFetch } from "@/util/apiCache";
import { exportPNG, exportSVG } from "@/util/chartExport";
import { exportTable } from "@/util/export";
import { diseaseDisplayNameI18n } from "@/util/diseaseNames";

import classes from "./CrossStudyPanel.module.css";
import type { CrossStudyMarker, CrossStudyResult, ProjectInfo, TaxonomyLevel } from "./types";
import { API_BASE } from "./types";

type CrossStudyView = "forest" | "heatmap" | "consistency" | "bubble" | "table";

function calcConsistency(marker: CrossStudyMarker): number {
  const entries = Object.values(marker.per_project);
  if (!entries.length) return 0;
  const positive = entries.filter((entry) => entry.log2fc > 0).length;
  const negative = entries.length - positive;
  return Math.round(Math.max(positive, negative) / entries.length * 100);
}

function directionColor(direction: CrossStudyMarker["direction"]): string {
  if (direction === "disease") return "#22c55e";
  if (direction === "control") return "#3b82f6";
  return "#94a3b8";
}

const CrossStudyPanel = ({ taxonomyLevel }: { taxonomyLevel: TaxonomyLevel }) => {
  const { t, locale } = useI18n();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [diseases, setDiseases] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [disease, setDisease] = useState("");
  const [method, setMethod] = useState<"wilcoxon" | "t-test">("wilcoxon");
  const [view, setView] = useState<CrossStudyView>("forest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CrossStudyResult | null>(null);

  const forestRef = useRef<SVGSVGElement>(null);
  const heatmapRef = useRef<SVGSVGElement>(null);
  const consistencyRef = useRef<SVGSVGElement>(null);
  const bubbleRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all([
      cachedFetch<{ projects: ProjectInfo[] }>(`${API_BASE}/api/project-list`),
      cachedFetch<{ diseases: string[] }>(`${API_BASE}/api/filter-options`),
    ]).then(([projectPayload, filterPayload]) => {
      setProjects(projectPayload.projects ?? []);
      setDiseases((filterPayload.diseases ?? []).filter((item) => item.toUpperCase() !== "NC"));
    }).catch(() => {});
  }, []);

  const filteredProjects = useMemo(() => {
    if (!disease) return projects.filter((project) => project.has_control);
    return projects.filter(
      (project) => project.has_control && project.diseases.some((item) => item.toLowerCase() === disease.toLowerCase()),
    );
  }, [disease, projects]);

  const projectSizeMap = useMemo(() => {
    const map = new Map<string, number>();
    result?.project_summaries.forEach((summary) => {
      map.set(summary.project_id, summary.n_disease + summary.n_control);
    });
    return map;
  }, [result?.project_summaries]);

  const toggleProject = (projectId: string) => {
    setSelectedProjects((previous) => (
      previous.includes(projectId)
        ? previous.filter((item) => item !== projectId)
        : [...previous, projectId]
    ));
  };

  const runAnalysis = async () => {
    if (!disease) {
      setError(t("crossStudy.needDisease"));
      return;
    }
    if (selectedProjects.length < 2) {
      setError(t("crossStudy.needProjects"));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`${API_BASE}/api/cross-study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_ids: selectedProjects,
          disease,
          method,
          taxonomy_level: taxonomyLevel,
          p_threshold: 0.05,
          min_studies: 2,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail ?? "Cross-study analysis failed");
      }

      setResult(await response.json());
      setView("forest");
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : String(unknownError));
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result) return;
    exportTable(
      result.consensus_markers.map((marker) => ({
        Taxon: marker.taxon,
        Meta_log2FC: marker.meta_log2fc,
        Meta_SE: marker.meta_se,
        Meta_P: marker.meta_p,
        CI_Low: marker.ci_low,
        CI_High: marker.ci_high,
        Direction: marker.direction,
        N_Studies: marker.n_studies,
        N_Significant: marker.n_significant,
        I2: marker.I2,
        Consistency: calcConsistency(marker),
      })),
      `cross_study_${taxonomyLevel}_${Date.now()}`,
    );
  };

  const exportCurrentSvg = (kind: "svg" | "png") => {
    if (view === "table") return;
    const currentSvg =
      view === "forest" ? forestRef.current :
      view === "heatmap" ? heatmapRef.current :
      view === "consistency" ? consistencyRef.current :
      bubbleRef.current;

    if (!currentSvg) return;
    if (kind === "svg") {
      exportSVG(currentSvg, `cross_study_${view}_${Date.now()}`);
    } else {
      exportPNG(currentSvg, `cross_study_${view}_${Date.now()}`);
    }
  };

  const markers = result?.consensus_markers.slice(0, 20) ?? [];

  return (
    <div className={classes.panel}>
      <h2 className={classes.title}>{t("crossStudy.title")}</h2>
      <p className={classes.subtitle}>
        {locale === "zh"
          ? `按 ${taxonomyLevel} 层级做跨研究元分析，查看一致性和异质性。`
          : `Cross-study meta-analysis at the ${taxonomyLevel} level with consistency and heterogeneity views.`}
      </p>

      <div className={classes.controlRow}>
        <label>{t("crossStudy.selectDisease")}</label>
        <input
          list="cross-study-disease-list"
          className={classes.select}
          value={disease}
          onChange={(event) => {
            setDisease(event.target.value);
            setSelectedProjects([]);
          }}
          placeholder={t("crossStudy.pickDisease")}
        />
        <datalist id="cross-study-disease-list">
          {diseases.map((item) => (
            <option key={item} value={item} label={diseaseDisplayNameI18n(item, locale)} />
          ))}
        </datalist>
      </div>

      {disease ? (
        <div className={classes.projectSection}>
          <label>{t("crossStudy.selectProjects")} ({selectedProjects.length} {t("crossStudy.selected")})</label>
          <div className={classes.projectGrid}>
            {filteredProjects.slice(0, 60).map((project) => (
              <button
                key={project.project_id}
                type="button"
                className={classes.projectChip}
                data-active={selectedProjects.includes(project.project_id)}
                onClick={() => toggleProject(project.project_id)}
              >
                <span className={classes.chipId}>{project.project_id}</span>
                <span className={classes.chipCount}>n={project.sample_count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={classes.controlRow}>
        <label>{t("crossStudy.method")}</label>
        <div className={classes.btnGroup}>
          {(["wilcoxon", "t-test"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={classes.methodBtn}
              data-active={method === item}
              onClick={() => setMethod(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button className={classes.runBtn} type="button" onClick={runAnalysis} disabled={loading}>
          {loading ? t("crossStudy.running") : t("crossStudy.run")}
        </button>
      </div>

      {error ? <div className={classes.error}>{error}</div> : null}

      {result ? (
        <div className={classes.results}>
          <div className={classes.summaryRow}>
            <span>{t("crossStudy.nProjects")}: <b>{result.n_projects}</b></span>
            <span>{t("crossStudy.disease")}: <b>{diseaseDisplayNameI18n(result.disease, locale)}</b></span>
            <span>{locale === "zh" ? "层级" : "Level"}: <b>{result.taxonomy_level}</b></span>
            <span>{t("crossStudy.consensus")}: <b>{result.total_significant}</b></span>
          </div>

          <div className={classes.projectStatus}>
            {result.project_summaries.map((summary) => (
              <span key={summary.project_id} className={classes.projBadge} data-error={Boolean(summary.error)}>
                {summary.project_id}: {summary.error ?? `D=${summary.n_disease} C=${summary.n_control}`}
              </span>
            ))}
          </div>

          <div className={classes.viewTabs}>
            {(["forest", "heatmap", "consistency", "bubble", "table"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={classes.viewTab}
                data-active={view === item}
                onClick={() => setView(item)}
              >
                {{
                  forest: locale === "zh" ? "森林图" : "Forest",
                  heatmap: locale === "zh" ? "热图" : "Heatmap",
                  consistency: locale === "zh" ? "一致性" : "Consistency",
                  bubble: "Bubble",
                  table: locale === "zh" ? "表格" : "Table",
                }[item]}
              </button>
            ))}
          </div>

          {view === "forest" ? <ForestView svgRef={forestRef} markers={markers} locale={locale} /> : null}
          {view === "heatmap" ? <HeatmapView svgRef={heatmapRef} markers={markers} projectIds={result.project_summaries.filter((item) => !item.error).map((item) => item.project_id)} /> : null}
          {view === "consistency" ? <ConsistencyView svgRef={consistencyRef} markers={markers} locale={locale} /> : null}
          {view === "bubble" ? <BubbleView svgRef={bubbleRef} markers={markers} projectSizeMap={projectSizeMap} locale={locale} /> : null}
          {view === "table" ? (
            <div className={classes.tableWrap}>
              <table className={classes.table}>
                <thead>
                  <tr>
                    <th>{t("crossStudy.col.taxon")}</th>
                    <th>log2FC</th>
                    <th>95% CI</th>
                    <th>p</th>
                    <th>I2</th>
                    <th>{t("crossStudy.col.direction")}</th>
                    <th>{t("crossStudy.col.nStudies")}</th>
                  </tr>
                </thead>
                <tbody>
                  {markers.map((marker) => (
                    <tr key={marker.taxon}>
                      <td>{marker.taxon}</td>
                      <td>{marker.meta_log2fc.toFixed(3)}</td>
                      <td>[{marker.ci_low.toFixed(2)}, {marker.ci_high.toFixed(2)}]</td>
                      <td>{marker.meta_p < 0.001 ? "<0.001" : marker.meta_p.toFixed(4)}</td>
                      <td>{marker.I2.toFixed(1)}%</td>
                      <td>{marker.direction}</td>
                      <td>{marker.n_significant}/{marker.n_studies}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className={classes.exportRow}>
            <button className={classes.exportBtn} type="button" onClick={exportCsv}>{t("export.csv")}</button>
            <button className={classes.exportBtn} type="button" onClick={() => exportCurrentSvg("svg")}>{t("export.svg")}</button>
            <button className={classes.exportBtn} type="button" onClick={() => exportCurrentSvg("png")}>{t("export.png")}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ForestView = ({
  svgRef,
  markers,
  locale,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  markers: CrossStudyMarker[];
  locale: string;
}) => {
  const width = 820;
  const rowHeight = 28;
  const height = Math.max(200, 70 + markers.length * rowHeight);
  const min = Math.min(...markers.map((marker) => marker.ci_low), -2);
  const max = Math.max(...markers.map((marker) => marker.ci_high), 2);
  const scale = (value: number) => 240 + (value - min) / Math.max(max - min, 1e-6) * 420;

  return (
    <svg ref={svgRef} className="compare-chart" viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 820 }}>
      <line x1={scale(0)} x2={scale(0)} y1={44} y2={height - 30} stroke="#6b7280" strokeDasharray="4 4" />
      {markers.map((marker, index) => {
        const y = 60 + index * rowHeight;
        return (
          <g key={marker.taxon}>
            <text x={180} y={y + 4} textAnchor="end" fill="currentColor" fontSize="11">
              {marker.taxon.length > 24 ? `${marker.taxon.slice(0, 22)}...` : marker.taxon}
            </text>
            <line x1={scale(marker.ci_low)} x2={scale(marker.ci_high)} y1={y} y2={y} stroke={directionColor(marker.direction)} strokeWidth="2" />
            <circle cx={scale(marker.meta_log2fc)} cy={y} r={4 + marker.n_significant} fill={directionColor(marker.direction)} />
            <text x={700} y={y + 4} fill="#94a3b8" fontSize="10">
              {marker.meta_p < 0.001 ? "<0.001" : marker.meta_p.toFixed(3)} / I2 {marker.I2.toFixed(0)}%
            </text>
          </g>
        );
      })}
      <text x={width / 2} y={20} textAnchor="middle" fill="currentColor" fontSize="13">
        {locale === "zh" ? "Forest Plot" : "Forest Plot"}
      </text>
    </svg>
  );
};

const HeatmapView = ({
  svgRef,
  markers,
  projectIds,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  markers: CrossStudyMarker[];
  projectIds: string[];
}) => {
  const width = 860;
  const cellWidth = 62;
  const cellHeight = 24;
  const height = 120 + markers.length * cellHeight;
  const color = (value: number) => value >= 0 ? `rgba(34, 197, 94, ${0.15 + Math.abs(value) / 2})` : `rgba(59, 130, 246, ${0.15 + Math.abs(value) / 2})`;

  return (
    <svg ref={svgRef} className="compare-chart" viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 860 }}>
      {projectIds.map((projectId, col) => (
        <text
          key={projectId}
          x={250 + col * cellWidth + cellWidth / 2}
          y={72}
          transform={`rotate(-40, ${250 + col * cellWidth + cellWidth / 2}, 72)`}
          fill="#94a3b8"
          fontSize="9"
          textAnchor="end"
        >
          {projectId.slice(0, 12)}
        </text>
      ))}
      {markers.map((marker, row) => (
        <g key={marker.taxon}>
          <text x={220} y={100 + row * cellHeight + 15} textAnchor="end" fill="currentColor" fontSize="10">
            {marker.taxon.length > 18 ? `${marker.taxon.slice(0, 16)}...` : marker.taxon}
          </text>
          {projectIds.map((projectId, col) => {
            const value = marker.per_project[projectId]?.log2fc ?? 0;
            return (
              <rect
                key={`${marker.taxon}-${projectId}`}
                x={250 + col * cellWidth}
                y={84 + row * cellHeight}
                width={cellWidth - 4}
                height={cellHeight - 4}
                rx={4}
                fill={marker.per_project[projectId] ? color(value) : "rgba(148, 163, 184, 0.12)"}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
};

const ConsistencyView = ({
  svgRef,
  markers,
  locale,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  markers: CrossStudyMarker[];
  locale: string;
}) => {
  const width = 760;
  const height = 120 + markers.length * 26;
  return (
    <svg ref={svgRef} className="compare-chart" viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 760 }}>
      <text x={width / 2} y={24} textAnchor="middle" fill="currentColor" fontSize="13">
        {locale === "zh" ? "跨研究一致性" : "Cross-study consistency"}
      </text>
      {markers.map((marker, index) => {
        const score = calcConsistency(marker);
        const widthPx = score / 100 * 420;
        const y = 50 + index * 26;
        return (
          <g key={marker.taxon}>
            <text x={180} y={y + 11} textAnchor="end" fill="currentColor" fontSize="10">
              {marker.taxon.length > 18 ? `${marker.taxon.slice(0, 16)}...` : marker.taxon}
            </text>
            <rect x={200} y={y} width={widthPx} height={18} rx={5} fill={directionColor(marker.direction)} opacity="0.85" />
            <text x={630} y={y + 12} fill="#94a3b8" fontSize="10">
              {score}% / I2 {marker.I2.toFixed(0)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const BubbleView = ({
  svgRef,
  markers,
  projectSizeMap,
  locale,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  markers: CrossStudyMarker[];
  projectSizeMap: Map<string, number>;
  locale: string;
}) => {
  const width = 860;
  const height = 150 + markers.length * 24;
  const min = Math.min(...markers.map((marker) => marker.meta_log2fc), -2);
  const max = Math.max(...markers.map((marker) => marker.meta_log2fc), 2);
  const scale = (value: number) => 260 + (value - min) / Math.max(max - min, 1e-6) * 480;

  return (
    <svg ref={svgRef} className="compare-chart" viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 860 }}>
      <text x={width / 2} y={24} textAnchor="middle" fill="currentColor" fontSize="13">
        {locale === "zh" ? "Bubble view" : "Bubble view"}
      </text>
      <line x1={scale(0)} x2={scale(0)} y1={40} y2={height - 30} stroke="#64748b" strokeDasharray="4 4" />
      {markers.map((marker, index) => {
        const y = 56 + index * 24;
        const sampleSize = Object.keys(marker.per_project).reduce((sum, projectId) => sum + (projectSizeMap.get(projectId) ?? 0), 0);
        const radius = Math.max(5, Math.min(18, Math.sqrt(sampleSize) / 4));
        return (
          <g key={marker.taxon}>
            <text x={220} y={y + 4} textAnchor="end" fill="currentColor" fontSize="10">
              {marker.taxon.length > 18 ? `${marker.taxon.slice(0, 16)}...` : marker.taxon}
            </text>
            <circle
              cx={scale(marker.meta_log2fc)}
              cy={y}
              r={radius}
              fill={directionColor(marker.direction)}
              opacity={marker.meta_p < 0.05 ? 0.9 : 0.45}
            />
            <text x={750} y={y + 4} fill="#94a3b8" fontSize="10">
              n={sampleSize}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default CrossStudyPanel;
