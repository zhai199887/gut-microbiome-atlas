/**
 * StudiesPage.tsx — Studies/Publications Browser
 * 研究项目浏览器：展示所有 BioProject 及其疾病、样本数
 * Inspired by ResMicroDb Publications page
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";
import { cachedFetch } from "@/util/apiCache";
import css from "./StudiesPage.module.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface ProjectInfo {
  project_id: string;
  sample_count: number;
  diseases: string[];
  has_control: boolean;
}

const StudiesPage = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"samples" | "diseases">("samples");

  useEffect(() => {
    setLoading(true);
    cachedFetch<{ projects: ProjectInfo[] }>(`${API_BASE}/api/project-list`)
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        p.project_id.toLowerCase().includes(q) ||
        p.diseases.some((d) => d.toLowerCase().includes(q))
      );
    })
    .sort((a, b) =>
      sortBy === "samples"
        ? b.sample_count - a.sample_count
        : b.diseases.length - a.diseases.length
    );

  return (
    <div className={css.page}>
      <Link to="/" className={css.back}>{t("phenotype.back")}</Link>
      <h1 className={css.title}>{t("studies.title")}</h1>
      <p className={css.subtitle}>{t("studies.subtitle")}</p>

      {/* Controls */}
      <div className={css.controls}>
        <input
          className={css.searchInput}
          type="text"
          placeholder={t("studies.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={css.sortSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "samples" | "diseases")}
        >
          <option value="samples">{t("studies.sortSamples")}</option>
          <option value="diseases">{t("studies.sortDiseases")}</option>
        </select>
        <span className={css.count}>
          {filtered.length} / {projects.length} {t("studies.projects")}
        </span>
      </div>

      {loading && <div className={css.loading}>{t("search.searching")}</div>}

      {/* Project table */}
      {!loading && (
        <div className={css.tableWrap}>
          <table className={css.table}>
            <thead>
              <tr>
                <th>{t("studies.projectId")}</th>
                <th>{t("studies.samples")}</th>
                <th>{t("studies.control")}</th>
                <th>{t("studies.diseases")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.project_id}>
                  <td>
                    <a
                      href={`https://www.ncbi.nlm.nih.gov/bioproject/${p.project_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css.projLink}
                    >
                      {p.project_id}
                    </a>
                  </td>
                  <td>{p.sample_count.toLocaleString("en")}</td>
                  <td>{p.has_control ? "Yes" : "—"}</td>
                  <td className={css.diseaseTags}>
                    {p.diseases.slice(0, 5).map((d) => (
                      <span key={d} className={css.tag}>{d}</span>
                    ))}
                    {p.diseases.length > 5 && (
                      <span className={css.tagMore}>+{p.diseases.length - 5}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudiesPage;
