import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { PublicPage } from "../ui";

export const Route = createFileRoute("/how-it-works")({ component: HowItWorks });

function HowItWorks() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      <h1 className="text-4xl">{t("how.title")}</h1>
      <p className="mt-4 text-muted">{t("how.sub")}</p>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {tr.how.steps.map((step) => (
          <li key={step.title} className="rounded-lg bg-surface p-5">
            <h2 className="text-xl">{step.title}</h2>
            <p className="mt-2 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <figure className="mt-10">
        <div
          aria-hidden="true"
          className="flex h-56 items-center justify-center rounded-lg border border-dashed border-muted"
        >
          <span className="text-muted">{t("how.frame")}</span>
        </div>
        <figcaption className="mt-2 text-muted">{t("how.frame")}</figcaption>
      </figure>
    </PublicPage>
  );
}
