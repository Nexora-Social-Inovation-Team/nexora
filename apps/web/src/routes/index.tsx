import { Link, createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { ReportPreview } from "../preview";
import { PublicPage, btnPrimary, btnSecondary, cardClass, container } from "../ui";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      {/*
       * The reference hero: one beige panel inset from the viewport edges, a very
       * large tight heading on a narrow measure, small sub copy, two buttons, and
       * the product shot on a blue panel underneath.
       */}
      <section className="mx-2 mt-2 rounded-3xl bg-band px-4 pt-16 pb-12 text-center sm:mx-4 sm:px-8 sm:pt-24 sm:pb-16">
        {/* 60px is the measured heading size; text-balance keeps it two even lines. */}
        <h1 className="mx-auto max-w-4xl text-balance text-4xl leading-[1.05] tracking-[-0.04em] sm:text-6xl">
          {t("landing.title")}
        </h1>
        <p className="mx-auto mt-6 max-w-md text-pretty text-muted">{t("landing.sub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/how-it-works" className={btnPrimary}>
            {t("landing.cta")}
          </Link>
          <Link to="/app/parent" className={btnSecondary}>
            {t("landing.ctaSecondary")}
          </Link>
        </div>
        <figure className="mt-14">
          <ReportPreview />
          <figcaption className="mt-4 text-sm text-muted">{t("how.frame")}</figcaption>
        </figure>
      </section>

      <section className={`${container} py-20 sm:py-28`}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t("landing.cardsEyebrow")}</p>
          <h2 className="mt-4 text-4xl sm:text-5xl">{t("landing.cardsTitle")}</h2>
          <Link to="/how-it-works" className={`${btnPrimary} mt-8`}>
            {t("landing.cta")}
          </Link>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-3">
          {tr.landing.cards.map((card) => (
            <li key={card.title} className={`${cardClass} sm:p-8`}>
              <h3 className="text-2xl">{card.title}</h3>
              <p className="mt-3 text-sm text-muted">{card.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </PublicPage>
  );
}
