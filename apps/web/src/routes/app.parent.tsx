import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WeeklyReportPanel } from "../report";
import { AppShell, DemoLogin, useSession } from "../ui";

export const Route = createFileRoute("/app/parent")({ component: ParentPanel });

function ParentPanel() {
  const { t } = useTranslation();
  const { user } = useSession();

  if (!user) return <DemoLogin defaultPersona="ece" />;
  if (user.role === "teacher") return <Navigate to="/app/teacher" />;

  return (
    <AppShell title={t("panel.parentTitle")}>
      <WeeklyReportPanel />
    </AppShell>
  );
}
