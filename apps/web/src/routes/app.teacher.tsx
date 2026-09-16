import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { WeeklyReportPanel } from "../report";
import { AppShell, DemoLogin, useSession } from "../ui";

export const Route = createFileRoute("/app/teacher")({ component: TeacherPanel });

function TeacherPanel() {
  const { t } = useTranslation();
  const { user } = useSession();

  if (!user) return <DemoLogin defaultPersona="mert" />;

  // A teacher only ever sees the waiting text: approving consent is the parent's call.
  return (
    <AppShell role="teacher" title={t("panel.teacherTitle")}>
      <WeeklyReportPanel canApprove={false} />
    </AppShell>
  );
}
