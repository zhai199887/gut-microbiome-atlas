/**
 * GroupFilterPanel – filter controls for one sample group
 * 组筛选面板 – 一个样本组的筛选控件
 */
import type { GroupFilter, FilterOptions } from "./types";
import { useI18n } from "@/i18n";
import { countryName } from "@/util/countries";
import classes from "../ComparePage.module.css";

const GroupFilterPanel = ({
  label,
  color,
  value,
  onChange,
  options,
}: {
  label: string;
  color: string;
  value: GroupFilter;
  onChange: (f: GroupFilter) => void;
  options: FilterOptions | null;
}) => {
  const { t } = useI18n();
  const set = (key: keyof GroupFilter) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className={classes.groupPanel}>
      <h3 className={classes.groupLabel} style={{ borderColor: color, color }}>
        {label}
      </h3>
      <div className={classes.fieldRow}>
        <label>{t("compare.country")}</label>
        <select value={value.country} onChange={set("country")} className={classes.select}>
          <option value="">{t("compare.any")}</option>
          {options?.countries.map((c) => (
            <option key={c} value={c}>{countryName(c)} ({c})</option>
          ))}
        </select>
      </div>
      <div className={classes.fieldRow}>
        <label>{t("compare.disease")}</label>
        <select value={value.disease} onChange={set("disease")} className={classes.select}>
          <option value="">{t("compare.any")}</option>
          {options?.diseases.slice(0, 200).map((d) => (
            <option key={d} value={d}>{d.length > 40 ? d.slice(0, 38) + "…" : d}</option>
          ))}
        </select>
      </div>
      <div className={classes.fieldRow}>
        <label>{t("compare.ageGroup")}</label>
        <select value={value.age_group} onChange={set("age_group")} className={classes.select}>
          <option value="">{t("compare.any")}</option>
          {options?.age_groups.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <div className={classes.fieldRow}>
        <label>{t("compare.sex")}</label>
        <select value={value.sex} onChange={set("sex")} className={classes.select}>
          <option value="">{t("compare.any")}</option>
          {options?.sexes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default GroupFilterPanel;
