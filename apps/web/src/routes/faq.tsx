import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { PageHeader, PublicPage, cardClass, container } from "../ui";

export const Route = createFileRoute("/faq")({ component: Faq });

function Faq() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      <PageHeader eyebrow={t("brand")} title={t("faq.title")} />
      <section className={`${container} py-16 sm:py-24`}>
        <dl className="mx-auto max-w-3xl space-y-4">
          {tr.faq.items.map((item) => (
            <div key={item.q} className={cardClass}>
              <dt className="text-xl font-semibold tracking-tight">{item.q}</dt>
              <dd className="mt-3 text-sm text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PublicPage>
  );
}
