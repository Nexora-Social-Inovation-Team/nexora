import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { PublicPage } from "../ui";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      <h1 className="text-4xl sm:text-5xl">{t("landing.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg">{t("landing.sub")}</p>
      <p className="mt-4 rounded border border-accent px-4 py-2 text-accent sm:inline-block">{t("landing.trust")}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link to="/how-it-works" className="rounded bg-accent px-4 py-2 font-semibold text-bg">
          {t("landing.cta")}
        </Link>
        <Link to="/app/parent" className="rounded border border-muted px-4 py-2">
          {t("landing.ctaSecondary")}
        </Link>
      </div>

      <h2 className="mt-14 text-2xl">{t("landing.cardsTitle")}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {tr.landing.cards.map((card) => (
          <li key={card.title} className="rounded-lg bg-surface p-5">
            <h3 className="text-xl">{card.title}</h3>
            <p className="mt-2 text-muted">{card.body}</p>
          </li>
        ))}
      </ul>
    </PublicPage>
  );
}
