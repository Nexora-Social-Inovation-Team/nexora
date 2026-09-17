import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { PageHeader, PublicPage, container } from "../ui";

export const Route = createFileRoute("/privacy")({ component: Privacy });

const cell = "border-b border-line px-4 py-3 text-left align-top text-sm";

function Privacy() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      <PageHeader eyebrow={t("brand")} title={t("privacy.title")} sub={t("privacy.sub")} />

      <section className={`${container} py-16 sm:py-24`}>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          {/* Last row keeps no bottom rule so it does not cut the rounded corner. */}
          <table className="w-full border-collapse [&_tr:last-child_*]:border-b-0">
            <caption className="px-4 pt-4 text-left font-medium">{t("privacy.tableCaption")}</caption>
            <thead className="bg-band">
              <tr>
                <th scope="col" className={cell}>
                  {t("privacy.columns.data")}
                </th>
                <th scope="col" className={cell}>
                  {t("privacy.columns.state")}
                </th>
                <th scope="col" className={cell}>
                  {t("privacy.columns.example")}
                </th>
                <th scope="col" className={cell}>
                  {t("privacy.columns.who")}
                </th>
              </tr>
            </thead>
            <tbody>
              {tr.privacy.collected.map((row) => (
                <tr key={row.data}>
                  <th scope="row" className={`${cell} font-normal`}>
                    {row.data}
                  </th>
                  <td className={cell}>{t("privacy.collectedLabel")}</td>
                  <td className={cell}>{row.example}</td>
                  <td className={cell}>{row.who}</td>
                </tr>
              ))}
              {tr.privacy.never.map((item) => (
                <tr key={item}>
                  <th scope="row" className={`${cell} font-normal`}>
                    {item}
                  </th>
                  <td className={cell}>{t("privacy.neverLabel")}</td>
                  <td className={cell}>{t("privacy.dash")}</td>
                  <td className={cell}>{t("privacy.nobody")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tr.privacy.sections.map((section) => (
          <section key={section.title} className="mt-12 max-w-2xl">
            <h2 className="text-3xl">{section.title}</h2>
            <p className="mt-3 text-sm text-muted">{section.body}</p>
          </section>
        ))}
      </section>
    </PublicPage>
  );
}
