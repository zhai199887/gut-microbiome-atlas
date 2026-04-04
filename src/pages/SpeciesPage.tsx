/**
 * SpeciesPage.tsx — Species Detail Page
 * 物种详情页：通过后端 API 获取属的疾病/国家/年龄/性别分布
 * 从搜索结果或疾病浏览页跳转过来
 */
import { useEffect, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { Link, useParams } from "react-router-dom";
import * as d3 from "d3";
import { useI18n } from "@/i18n";
import { cachedFetch } from "@/util/apiCache";
import "@/components/tooltip";
import classes from "./SpeciesPage.module.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface ProfileEntry {
  name: string;
  mean_abundance: number;
  prevalence: number;
  sample_count: number;
}

interface SpeciesProfile {
  genus: string;
  total_samples: number;
  present_samples: number;
  prevalence: number;
  mean_abundance: number;
  by_disease: ProfileEntry[];
  by_country: ProfileEntry[];
  by_age_group: ProfileEntry[];
  by_sex: ProfileEntry[];
}

const SpeciesPage = () => {
  const { t } = useI18n();
  const { taxon } = useParams<{ taxon: string }>();
  const decodedTaxon = decodeURIComponent(taxon ?? "");
  const [profile, setProfile] = useState<SpeciesProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!decodedTaxon) return;
    setLoading(true);
    setError(null);
    cachedFetch<SpeciesProfile>(`${API_BASE}/api/species-profile?genus=${encodeURIComponent(decodedTaxon)}`)
      .then((data) => setProfile(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [decodedTaxon]);

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Link to="/" className={classes.back}>{t("phenotype.back")}</Link>
        <h1><i>{decodedTaxon}</i></h1>
        {error === "not_found" && (
          <p className={classes.notFound}>{t("search.notFound")}</p>
        )}
      </div>

      {loading && (
        <div className={classes.loading}>{t("search.searching")}</div>
      )}

      {profile && <ProfileDetail profile={profile} />}
    </div>
  );
};

export default SpeciesPage;

// ── Profile detail view / 详情视图 ─────────────────────────────────────────

const ProfileDetail = ({ profile }: { profile: SpeciesProfile }) => {
  const { t } = useI18n();
  const diseaseRef = useRef<SVGSVGElement>(null);
  const countryRef = useRef<SVGSVGElement>(null);
  const ageRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!diseaseRef.current || profile.by_disease.length === 0) return;
    drawBarChart(diseaseRef.current, profile.by_disease.slice(0, 20), "#ff6b6b");
  }, [profile]);

  useEffect(() => {
    if (!countryRef.current || profile.by_country.length === 0) return;
    drawBarChart(countryRef.current, profile.by_country.slice(0, 20), "#4ecdc4");
  }, [profile]);

  useEffect(() => {
    if (!ageRef.current || profile.by_age_group.length === 0) return;
    drawBarChart(ageRef.current, profile.by_age_group, "var(--primary)");
  }, [profile]);

  return (
    <div className={classes.content}>
      {/* Stats row */}
      <div className={classes.chartCard}>
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <StatItem value={profile.total_samples.toLocaleString("en")} label={t("search.totalSamples")} />
          <StatItem value={profile.present_samples.toLocaleString("en")} label={t("search.presentIn")} />
          <StatItem value={`${(profile.prevalence * 100).toFixed(1)}%`} label={t("search.prevalence")} />
          <StatItem value={`${(profile.mean_abundance * 100).toFixed(4)}%`} label={t("search.meanAbundance")} />
        </div>
      </div>

      {profile.by_disease.length > 0 && (
        <div className={classes.chartCard}>
          <h3>{t("search.byDisease")}</h3>
          <svg ref={diseaseRef} className={classes.chart} role="img" aria-label="Disease abundance chart" />
        </div>
      )}

      {profile.by_country.length > 0 && (
        <div className={classes.chartCard}>
          <h3>{t("search.byCountry")}</h3>
          <svg ref={countryRef} className={classes.chart} role="img" aria-label="Country abundance chart" />
        </div>
      )}

      {profile.by_age_group.length > 0 && (
        <div className={classes.chartCard}>
          <h3>{t("search.byAgeGroup")}</h3>
          <svg ref={ageRef} className={classes.chart} role="img" aria-label="Age group abundance chart" />
        </div>
      )}

      {profile.by_sex.length > 0 && (
        <div className={classes.chartCard}>
          <h3>{t("search.bySex")}</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--light-gray)", borderBottom: "1px solid var(--gray)" }}>
                  {t("filter.sex")}
                </th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--light-gray)", borderBottom: "1px solid var(--gray)" }}>
                  {t("search.meanAbundance")}
                </th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--light-gray)", borderBottom: "1px solid var(--gray)" }}>
                  {t("search.prevalence")}
                </th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--light-gray)", borderBottom: "1px solid var(--gray)" }}>n</th>
              </tr>
            </thead>
            <tbody>
              {profile.by_sex.map((s) => (
                <tr key={s.name}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{s.name}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{(s.mean_abundance * 100).toFixed(4)}%</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{(s.prevalence * 100).toFixed(1)}%</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{s.sample_count.toLocaleString("en")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Biomarker Profile — cross-disease differential view */}
      <BiomarkerProfile genus={profile.genus} />

      {/* Co-occurring microbes — auto-detected partners */}
      <CooccurrencePartners genus={profile.genus} />

      {/* Metabolism tags */}
      <MetabolismTags genus={profile.genus} />
    </div>
  );
};

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div style={{ display: "flex", flexDirection: "column", minWidth: 120 }}>
    <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>{value}</span>
    <span style={{ fontSize: "0.75rem", color: "var(--light-gray)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
  </div>
);

// ── Metabolism tags / 代谢功能标签 ──────────────────────────────────────────

const MetabolismTags = ({ genus }: { genus: string }) => {
  const [categories, setCategories] = useState<{ id: string; name_en: string; icon: string }[]>([]);

  useEffect(() => {
    fetch("/data/metabolism_mapping.json")
      .then((r) => r.json())
      .then((data: { categories: { id: string; name_en: string; icon: string; taxa: string[] }[] }) => {
        const matches = data.categories.filter((c) =>
          c.taxa.some((t) => t.toLowerCase().includes(genus.toLowerCase()) ||
            genus.toLowerCase().includes(t.toLowerCase()))
        );
        setCategories(matches);
      })
      .catch(() => {});
  }, [genus]);

  if (categories.length === 0) return null;

  return (
    <div className={classes.chartCard}>
      <h3>Metabolic Functions</h3>
      <div className={classes.tagList}>
        {categories.map((c) => (
          <Link key={c.id} to="/metabolism" className={classes.metaTag}>
            {c.icon} {c.name_en}
          </Link>
        ))}
      </div>
    </div>
  );
};

// ── Co-occurrence Partners / 共现微生物 ──────────────────────────────────────

interface CooccurrencePartner {
  genus: string;
  r: number;
  p_value: number;
  type: "positive" | "negative";
}

const CooccurrencePartners = ({ genus }: { genus: string }) => {
  const { t } = useI18n();
  const [partners, setPartners] = useState<CooccurrencePartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    cachedFetch<{ genus: string; partners: CooccurrencePartner[] }>(
      `${API_BASE}/api/species-cooccurrence?genus=${encodeURIComponent(genus)}&top_k=10`
    )
      .then((d) => setPartners(d.partners ?? []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, [genus]);

  if (loading || partners.length === 0) return null;

  return (
    <div className={classes.chartCard}>
      <h3>{t("species.cooccurrence.title")}</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--light-gray)", borderBottom: "1px solid var(--gray)" }}>
              {t("species.cooccurrence.genus")}
            </th>
            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--light-gray)", borderBottom: "1px solid var(--gray)" }}>
              Spearman r
            </th>
            <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--light-gray)", borderBottom: "1px solid var(--gray)" }}>
              {t("species.cooccurrence.type")}
            </th>
          </tr>
        </thead>
        <tbody>
          {partners.map((p) => (
            <tr key={p.genus}>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <Link to={`/species/${encodeURIComponent(p.genus)}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
                  <i>{p.genus}</i>
                </Link>
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: p.type === "positive" ? "#22c55e" : "#ef4444" }}>
                {p.r > 0 ? "+" : ""}{p.r.toFixed(3)}
              </td>
              <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: p.type === "positive" ? "#22c55e" : "#ef4444" }}>
                {p.type === "positive" ? t("species.cooccurrence.positive") : t("species.cooccurrence.negative")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Biomarker Profile / 跨疾病标志物画像 ──────────────────────────────────────

interface BiomarkerEntry {
  disease: string;
  n_samples: number;
  mean_disease: number;
  mean_control: number;
  log2fc: number;
  p_value: number;
  adjusted_p: number;
  direction: "enriched" | "depleted";
  significant: boolean;
}

interface BiomarkerProfileData {
  genus: string;
  n_diseases_tested: number;
  n_enriched: number;
  n_depleted: number;
  profiles: BiomarkerEntry[];
}

const BiomarkerProfile = ({ genus }: { genus: string }) => {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<BiomarkerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    cachedFetch<BiomarkerProfileData>(`${API_BASE}/api/biomarker-profile?genus=${encodeURIComponent(genus)}`)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [genus]);

  // D3 diverging bar chart
  useEffect(() => {
    if (!svgRef.current || !data || data.profiles.length === 0) return;

    const significant = data.profiles.filter((p) => p.significant);
    const display = showAll ? data.profiles.slice(0, 60) : significant.slice(0, 40);
    if (display.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 80, bottom: 30, left: 160 };
    const barH = 18;
    const W = 700;
    const H = Math.max(200, display.length * (barH + 4) + margin.top + margin.bottom);
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;

    const maxAbs = d3.max(display, (d) => Math.abs(d.log2fc)) ?? 1;
    const xScale = d3.scaleLinear().domain([-maxAbs, maxAbs]).range([0, iW]);
    const yScale = d3.scaleBand()
      .domain(display.map((d) => d.disease))
      .range([0, iH])
      .padding(0.15);

    // Zero line
    g.append("line")
      .attr("x1", xScale(0)).attr("x2", xScale(0))
      .attr("y1", 0).attr("y2", iH)
      .attr("stroke", "rgba(255,255,255,0.2)").attr("stroke-width", 1);

    // Bars
    g.selectAll(".bm-bar")
      .data(display)
      .join("rect")
      .attr("x", (d) => (d.log2fc >= 0 ? xScale(0) : xScale(d.log2fc)))
      .attr("y", (d) => yScale(d.disease) ?? 0)
      .attr("width", (d) => Math.abs(xScale(d.log2fc) - xScale(0)))
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => (d.log2fc >= 0 ? "#ef4444" : "#3b82f6"))
      .attr("opacity", (d) => (d.significant ? 0.85 : 0.3))
      .attr("rx", 2)
      .attr("data-tooltip", (d) =>
        renderToString(
          <div className="tooltip-table">
            <span>{t("species.biomarker.disease")}</span><span>{d.disease}</span>
            <span>log2FC</span><span>{d.log2fc.toFixed(3)}</span>
            <span>FDR</span><span>{d.adjusted_p < 0.001 ? d.adjusted_p.toExponential(2) : d.adjusted_p.toFixed(4)}</span>
            <span>n</span><span>{d.n_samples.toLocaleString("en")}</span>
          </div>
        )
      );

    // Value labels
    g.selectAll(".bm-val")
      .data(display)
      .join("text")
      .attr("x", (d) => (d.log2fc >= 0 ? xScale(d.log2fc) + 3 : xScale(d.log2fc) - 3))
      .attr("y", (d) => (yScale(d.disease) ?? 0) + yScale.bandwidth() / 2 + 1)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", (d) => (d.log2fc >= 0 ? "start" : "end"))
      .attr("font-size", 8)
      .attr("fill", "currentColor")
      .attr("opacity", 0.7)
      .text((d) => d.log2fc.toFixed(2));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat((d) => (d.length > 22 ? d.slice(0, 20) + "…" : d)))
      .attr("font-size", 9);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr("font-size", 9);

    // X label
    g.append("text")
      .attr("x", iW / 2).attr("y", iH + 26)
      .attr("text-anchor", "middle")
      .attr("font-size", 10).attr("fill", "var(--light-gray)")
      .text("log₂ Fold Change (vs Healthy)");

  }, [data, showAll, t]);

  if (loading) return null;
  if (!data || data.profiles.length === 0) return null;

  return (
    <div className={classes.chartCard}>
      <h3>{t("species.biomarker.title")}</h3>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: 12, fontSize: "0.82rem" }}>
        <span style={{ color: "#ef4444" }}>▲ {t("species.biomarker.enriched")}: {data.n_enriched}</span>
        <span style={{ color: "#3b82f6" }}>▼ {t("species.biomarker.depleted")}: {data.n_depleted}</span>
        <span style={{ color: "var(--light-gray)" }}>{t("species.biomarker.tested")}: {data.n_diseases_tested}</span>
        <label style={{ marginLeft: "auto", cursor: "pointer", color: "var(--light-gray)" }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          {t("species.biomarker.showAll")}
        </label>
      </div>
      <svg ref={svgRef} className={classes.chart} />
    </div>
  );
};

// ── D3 horizontal bar chart / D3 水平柱状图 ─────────────────────────────────

function drawBarChart(svgEl: SVGSVGElement, data: ProfileEntry[], color: string) {
  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();

  const margin = { top: 10, right: 60, bottom: 30, left: 130 };
  const W = 640, H = Math.max(200, data.length * 22 + margin.top + margin.bottom);
  svg.attr("viewBox", `0 0 ${W} ${H}`);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.mean_abundance) ?? 0.001])
    .range([0, iW]);
  const yScale = d3.scaleBand()
    .domain(data.map((d) => d.name))
    .range([0, iH])
    .padding(0.2);

  const rootStyles = getComputedStyle(document.documentElement);
  const resolvedColor = color.startsWith("var(")
    ? rootStyles.getPropertyValue(color.slice(4, -1)).trim() || "#e23fff"
    : color;

  g.selectAll(".bar")
    .data(data)
    .join("rect")
    .attr("x", 0)
    .attr("y", (d) => yScale(d.name) ?? 0)
    .attr("width", (d) => xScale(d.mean_abundance))
    .attr("height", yScale.bandwidth())
    .attr("fill", resolvedColor)
    .attr("opacity", 0.8)
    .attr("rx", 2)
    .attr("data-tooltip", (d) =>
      renderToString(
        <div className="tooltip-table">
          <span>Name</span><span>{d.name}</span>
          <span>Abundance</span><span>{(d.mean_abundance * 100).toFixed(4)}%</span>
          <span>Prevalence</span><span>{(d.prevalence * 100).toFixed(1)}%</span>
          <span>Samples</span><span>{d.sample_count.toLocaleString("en")}</span>
        </div>
      )
    );

  g.selectAll(".val-label")
    .data(data)
    .join("text")
    .attr("x", (d) => xScale(d.mean_abundance) + 4)
    .attr("y", (d) => (yScale(d.name) ?? 0) + yScale.bandwidth() / 2 + 1)
    .attr("dominant-baseline", "middle")
    .attr("font-size", 9)
    .attr("fill", "currentColor")
    .text((d) => `${(d.mean_abundance * 100).toFixed(3)}%`);

  g.append("g")
    .call(d3.axisLeft(yScale).tickFormat((d) => d.length > 16 ? d.slice(0, 14) + "…" : d))
    .attr("font-size", 10);

  g.append("g")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(4).tickFormat((d) => `${(Number(d) * 100).toFixed(2)}%`))
    .attr("font-size", 9);
}
