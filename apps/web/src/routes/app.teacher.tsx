import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ClassReportPanel } from "../report";
import { AppShell, DemoLogin, useSession } from "../ui";

export const Route = createFileRoute("/app/teacher")({ component: TeacherPanel });

function TeacherPanel() {
  const { t } = useTranslation();
  const { user } = useSession();

  if (!user) return <DemoLogin defaultPersona="mert" />;
  // The route follows the session, not the other way round: signing in as Ece here lands on her panel.
  if (user.role === "parent") return <Navigate to="/app/parent" />;

  // A teacher sees the class week, never the approve button: consent is the parent's call.
  return (
    <AppShell title={t("panel.teacherTitle")}>
      <ClassReportPanel />
    </AppShell>
  );
}
