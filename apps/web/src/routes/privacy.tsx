import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { tr } from "../i18n";
import { PublicPage } from "../ui";

export const Route = createFileRoute("/privacy")({ component: Privacy });

const cell = "border-b border-bg px-3 py-2 text-left align-top";

function Privacy() {
  const { t } = useTranslation();
  return (
    <PublicPage>
      <h1 className="text-4xl">{t("privacy.title")}</h1>
      <p className="mt-4 text-muted">{t("privacy.sub")}</p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse bg-surface">
          <caption className="p-3 text-left">{t("privacy.tableCaption")}</caption>
          <thead>
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
        <section key={section.title} className="mt-8 max-w-2xl">
          <h2 className="text-2xl">{section.title}</h2>
          <p className="mt-2 text-muted">{section.body}</p>
        </section>
      ))}
    </PublicPage>
  );
}
