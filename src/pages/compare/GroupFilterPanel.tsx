import type { ChangeEvent } from "react";

import { useI18n } from "@/i18n";
import { AGE_GROUP_ZH, SEX_ZH, countryName } from "@/util/countries";
import { diseaseDisplayNameI18n } from "@/util/diseaseNames";

import classes from "../ComparePage.module.css";
import type { FilterOptions, GroupFilter, GroupSampleCount } from "./types";

interface Props {
  label: string;
  color: string;
  value: GroupFilter;
  onChange: (filter: GroupFilter) => void;
  options: FilterOptions | null;
  sampleCount: GroupSampleCount | null;
}

const GroupFilterPanel = ({
  label,
  color,
  value,
  onChange,
  options,
  sampleCount,
}: Props) => {
  const { t, locale } = useI18n();

  const setSelect = (key: keyof GroupFilter) => (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange({ ...value, [key]: event.target.value });
  };

  const ageName = (name: string) => (
    locale === "zh" ? (AGE_GROUP_ZH[name] ?? name.replace(/_/g, " ")) : name.replace(/_/g, " ")
  );
  const sexName = (name: string) => (locale === "zh" ? (SEX_ZH[name] ?? name) : name);

  return (
    <div className={classes.groupPanel}>
      <div className={classes.groupHeader}>
        <h3 className={classes.groupLabel} style={{ borderColor: color, color }}>
          {label}
        </h3>
        <div className={classes.countBadge}>
          {sampleCount ? `n=${sampleCount.abundance_n}` : "n=..."}
        </div>
      </div>

      <div className={classes.fieldRow}>
        <label>{t("compare.country")}</label>
        <select value={value.country} onChange={setSelect("country")} className={classes.select}>
          <option value="">{t("compare.any")}</option>
          {options?.countries.map((country) => (
            <option key={country} value={country}>
              {countryName(country, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className={classes.fieldRow}>
        <label>{t("compare.disease")}</label>
        <input
          list={`disease-list-${label}`}
          value={value.disease}
          onChange={setSelect("disease")}
          className={classes.select}
          placeholder={t("filter.searchDisease")}
        />
        <datalist id={`disease-list-${label}`}>
          {options?.diseases.map((disease) => (
            <option
              key={disease}
              value={disease}
              label={diseaseDisplayNameI18n(disease, locale)}
            />
          ))}
        </datalist>
      </div>

      <div className={classes.fieldRow}>
        <label>{t("compare.ageGroup")}</label>
        <select value={value.age_group} onChange={setSelect("age_group")} className={classes.select}>
          <option value="">{t("compare.any")}</option>
          {options?.age_groups.map((age) => (
            <option key={age} value={age}>
              {ageName(age)}
            </option>
          ))}
        </select>
      </div>

      <div className={classes.fieldRow}>
        <label>{t("compare.sex")}</label>
        <select value={value.sex} onChange={setSelect("sex")} className={classes.select}>
          <option value="">{t("compare.any")}</option>
          {options?.sexes.map((sex) => (
            <option key={sex} value={sex}>
              {sexName(sex)}
            </option>
          ))}
        </select>
      </div>

      <div className={classes.groupMeta}>
        {sampleCount ? `${sampleCount.metadata_n} metadata / ${sampleCount.abundance_n} abundance` : t("compare.previewing")}
      </div>
    </div>
  );
};

export default GroupFilterPanel;
