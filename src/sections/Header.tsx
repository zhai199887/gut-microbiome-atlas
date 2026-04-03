import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Logo from "@/assets/logo.svg?react";
import LangSwitch from "@/components/LangSwitch";
import { useI18n } from "@/i18n";
import HeaderBg from "@/sections/HeaderBg.tsx";
import classes from "./Header.module.css";

/** Dropdown menu component / 下拉菜单组件 */
const Dropdown = ({
  label,
  items,
}: {
  label: string;
  items: { to: string; label: string }[];
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={classes.dropdown} ref={ref}>
      <button
        className={classes.navLink}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label} ▾
      </button>
      {open && (
        <div className={classes.dropdownMenu}>
          {items.map(({ to, label: lbl }) => (
            <Link
              key={to}
              to={to}
              className={classes.dropdownItem}
              onClick={() => setOpen(false)}
            >
              {lbl}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Header = () => {
  const { t } = useI18n();

  /* Top-level nav links / 一级导航 */
  const NAV_LINKS = [
    { to: "/",           label: t("nav.home") },
    { to: "/phenotype",  label: t("nav.explorer") },
    { to: "/disease",    label: t("nav.disease") },
  ] as const;

  /* Analysis dropdown / 分析下拉 */
  const ANALYSIS = [
    { to: "/compare",    label: t("nav.compare") },
    { to: "/biomarker",  label: t("nav.biomarker") },
    { to: "/lollipop",   label: t("nav.lollipop") },
  ];

  /* Visualization dropdown / 可视化下拉 */
  const VIS = [
    { to: "/chord",         label: t("nav.chord") },
    { to: "/cooccurrence",  label: t("nav.cooccurrence") },
    { to: "/network",       label: t("nav.network") },
    { to: "/lifecycle",     label: t("nav.lifecycle") },
  ];

  /* Tools dropdown / 工具下拉 */
  const TOOLS = [
    { to: "/similarity",  label: t("nav.similarity") },
    { to: "/metabolism",   label: t("nav.metabolism") },
    { to: "/download",     label: t("nav.download") },
  ];

  return (
    <header className={classes.header}>
      <HeaderBg />

      <div className={classes.title}>
        <Logo className={classes.logo} />
        <div className={classes.divider} />
        <h1 className={classes.h1}>{t("header.title")}</h1>
      </div>

      <p className={classes.subtitle}>{t("header.subtitle")}</p>

      <nav className={classes.buttons}>
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} to={to} className={classes.navLink}>
            {label}
          </Link>
        ))}
        <Dropdown label={t("nav.analysis")} items={ANALYSIS} />
        <Dropdown label={t("nav.visualization")} items={VIS} />
        <Dropdown label={t("nav.tools")} items={TOOLS} />
        <LangSwitch />
      </nav>
    </header>
  );
};

export default Header;
