import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { PublicPage } from "../ui";

export const Route = createFileRoute("/faq")({ component: Faq });

function Faq() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      <h1 className="text-4xl">{t("faq.title")}</h1>
      <dl className="mt-8 max-w-2xl space-y-6">
        {tr.faq.items.map((item) => (
          <div key={item.q} className="rounded-lg bg-surface p-5">
            <dt className="text-lg">{item.q}</dt>
            <dd className="mt-2 text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
    </PublicPage>
  );
}
