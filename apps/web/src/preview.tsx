import { CATEGORY_LABELS_TR, type CategoryId } from "@nexora/shared";
import { useTranslation } from "react-i18next";

/**
 * The "örnek haftalık rapor" frame docs/DESIGN.md asks for, built as markup
 * rather than a screenshot so it stays in the tokens. The reference site puts a
 * white product card on a blue panel inside the beige hero band; this is ours.
 *
 * Numbers are the `deniz_balanced` seed from docs/DESIGN.md so the frame never
 * disagrees with the demo. Decorative: aria-hidden, and every caller captions it.
 */
const ROWS: { id: CategoryId; minutes: number }[] = [
  { id: "entertainment", minutes: 120 },
  { id: "science", minutes: 40 },
  { id: "sports", minutes: 20 },
  { id: "arts", minutes: 15 },
];

export function ReportPreview() {
  const { t } = useTranslation();
  return (
    <div
      aria-hidden="true"
      className="rounded-3xl bg-gradient-to-br from-tint via-[#cfe0fb] to-[#a9c9f7] p-4 sm:p-10"
    >
      <div className="mx-auto grid max-w-3xl gap-6 rounded-2xl border border-line bg-surface p-6 text-left sm:grid-cols-2 sm:p-8">
        <div>
          <p className="w-fit rounded-full bg-tint px-3 py-1 text-xs font-semibold">{t("brand")}</p>
          <p className="mt-4 text-sm font-medium">{t("panel.scoreTitle")}</p>
          <p className="font-display text-6xl font-semibold tabular-nums tracking-tight">80</p>
          <p className="text-sm text-muted">{t("panel.scoreOutOf")}</p>
          {/* Reason lines are abstracted: real reasons come from the API, not marketing. */}
          <div className="mt-5 space-y-2">
            <div className="h-2 w-full rounded-full bg-band" />
            <div className="h-2 w-4/5 rounded-full bg-band" />
            <div className="h-2 w-2/3 rounded-full bg-band" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">{t("panel.distributionTitle")}</p>
          <ul className="mt-4 space-y-3">
            {ROWS.map(({ id, minutes }) => (
              <li key={id} className="text-sm">
                <span className="flex justify-between gap-2">
                  <span>{CATEGORY_LABELS_TR[id]}</span>
                  <span className="tabular-nums text-muted">{`${minutes} ${t("panel.minutes")}`}</span>
                </span>
                <span className="mt-1 flex h-2 rounded-full bg-band">
                  <span className="rounded-full bg-link" style={{ width: `${(minutes / 120) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
