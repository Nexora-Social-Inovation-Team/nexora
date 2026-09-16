import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WeeklyReportPanel } from "../report";
import { AppShell, DemoLogin, useSession } from "../ui";

export const Route = createFileRoute("/app/parent")({ component: ParentPanel });

function ParentPanel() {
  const { t } = useTranslation();
  const { user } = useSession();

  if (!user) return <DemoLogin defaultPersona="ece" />;

  return (
    <AppShell role="parent" title={t("panel.parentTitle")}>
      <WeeklyReportPanel canApprove={user.role === "parent" || user.role === "admin"} />
    </AppShell>
  );
}
