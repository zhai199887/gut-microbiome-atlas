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
    fetch(`${API_BASE}/api/species-profile?genus=${encodeURIComponent(decodedTaxon)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "not_found" : "server_error");
        return r.json();
      })
      .then((data: SpeciesProfile) => setProfile(data))
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
          <svg ref={diseaseRef} className={classes.chart} />
        </div>
      )}

      {profile.by_country.length > 0 && (
        <div className={classes.chartCard}>
          <h3>{t("search.byCountry")}</h3>
          <svg ref={countryRef} className={classes.chart} />
        </div>
      )}

      {profile.by_age_group.length > 0 && (
        <div className={classes.chartCard}>
          <h3>{t("search.byAgeGroup")}</h3>
          <svg ref={ageRef} className={classes.chart} />
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
