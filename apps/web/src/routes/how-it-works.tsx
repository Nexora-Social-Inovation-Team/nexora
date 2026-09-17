import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { ReportPreview } from "../preview";
import { PageHeader, PublicPage, cardClass, container } from "../ui";

export const Route = createFileRoute("/how-it-works")({ component: HowItWorks });

function HowItWorks() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      <PageHeader eyebrow={t("brand")} title={t("how.title")} sub={t("how.sub")} />
      <section className={`${container} py-16 sm:py-24`}>
        <ol className="grid gap-4 sm:grid-cols-2">
          {tr.how.steps.map((step) => (
            <li key={step.title} className={cardClass}>
              <h2 className="text-2xl">{step.title}</h2>
              <p className="mt-3 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <figure className="mt-12">
          <ReportPreview />
          <figcaption className="mt-4 text-center text-sm text-muted">{t("how.frame")}</figcaption>
        </figure>
      </section>
    </PublicPage>
  );
}
