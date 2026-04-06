import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Logo from "@/assets/logo.svg?react";
import LangSwitch from "@/components/LangSwitch";
import { useI18n } from "@/i18n";

import HeaderBg from "./HeaderBg";
import classes from "./Header.module.css";

const Header = () => {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinks = useMemo(
    () => [
      { to: "/", label: t("nav.home") },
      { to: "/phenotype", label: t("nav.explorer") },
      { to: "/disease", label: t("nav.disease") },
      { to: "/search", label: t("nav.search") },
      { to: "/studies", label: t("nav.studies") },
      { to: "/compare", label: t("nav.compare") },
      { to: "/network", label: t("nav.network") },
      { to: "/metabolism", label: t("nav.metabolism") },
      { to: "/lifecycle", label: t("nav.lifecycle") },
      { to: "/similarity", label: t("nav.similarity") },
      { to: "/download", label: t("nav.download") },
      { to: "/api-docs", label: t("nav.apiDocs") },
      { to: "/about", label: t("nav.cite") },
    ],
    [t],
  );

  const quickLinks = useMemo(
    () => navLinks.filter((item) => ["/phenotype", "/compare", "/search", "/studies"].includes(item.to)),
    [navLinks],
  );

  const groupedLinks = useMemo(
    () => [
      {
        title: t("header.group.explore"),
        description: t("header.group.explore.desc"),
        links: navLinks.filter((item) => ["/", "/phenotype", "/disease", "/search", "/studies"].includes(item.to)),
      },
      {
        title: t("header.group.analysis"),
        description: t("header.group.analysis.desc"),
        links: navLinks.filter((item) => ["/compare", "/network", "/metabolism", "/lifecycle", "/similarity"].includes(item.to)),
      },
      {
        title: t("header.group.resources"),
        description: t("header.group.resources.desc"),
        links: navLinks.filter((item) => ["/download", "/api-docs", "/about"].includes(item.to)),
      },
    ],
    [navLinks, t],
  );

  return (
    <header className={classes.header}>
      <HeaderBg />

      <div className={classes.heroShell}>
        <section className={classes.heroCopy}>
          <span className={classes.kicker}>{t("header.kicker")}</span>

          <div className={classes.title}>
            <Logo className={classes.logo} />
            <div className={classes.divider} />
            <div className={classes.brandCopy}>
              <h1 className={classes.h1}>{t("header.title")}</h1>
              <p className={classes.subtitle}>{t("header.subtitle")}</p>
            </div>
          </div>

          <div className={classes.quickLinks}>
            {quickLinks.map(({ to, label }) => (
              <Link key={to} to={to} className={classes.quickLink}>
                {label}
              </Link>
            ))}
          </div>
        </section>

        <aside className={classes.navPanel}>
          <div className={classes.panelHeader}>
            <div>
              <span className={classes.panelEyebrow}>{t("header.quickAccess")}</span>
              <h2 className={classes.panelTitle}>{t("header.panelTitle")}</h2>
            </div>
            <LangSwitch />
          </div>

          <div className={classes.groupGrid}>
            {groupedLinks.map((group) => (
              <section key={group.title} className={classes.groupCard}>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
                <div className={classes.groupLinks}>
                  {group.links.map(({ to, label }) => (
                    <Link key={to} to={to} className={classes.groupLink}>
                      {label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>
      </div>

      <button
        className={classes.hamburger}
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={t("header.toggleNav")}
        aria-expanded={menuOpen}
      >
        <span className={`${classes.hamburgerLine} ${menuOpen ? classes.hamburgerOpen : ""}`} />
        <span className={`${classes.hamburgerLine} ${menuOpen ? classes.hamburgerOpen : ""}`} />
        <span className={`${classes.hamburgerLine} ${menuOpen ? classes.hamburgerOpen : ""}`} />
      </button>

      <nav className={`${classes.buttons} ${menuOpen ? classes.buttonsOpen : ""}`}>
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={classes.navLink}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
        <LangSwitch />
      </nav>
    </header>
  );
};

export default Header;
