/* global chrome, document */
import {
  LABELS_TR,
  accrualStateTr,
  activeTab,
  categoryOfTab,
  clearActivity,
  loadState,
  minutesLabelTr,
  saveState,
  sendNow,
  syncLabel,
  update,
} from "./core.js";

const $ = (id) => document.getElementById(id);

function setStatus(text, state) {
  $("status").textContent = text;
  $("status").dataset.state = state;
}

/** Paints what syncLabel() decided; the dot beside it is aria-hidden. */
function setSync(state) {
  const { state: kind, text } = syncLabel(state);
  $("last").dataset.state = kind;
  $("last-text").textContent = text;
}

/** One-shot confirmation on the dot; the class has to leave again to re-fire. */
function flashSync() {
  const row = $("last");
  row.classList.remove("flash");
  void row.offsetWidth; // restart the animation
  row.classList.add("flash");
}

/**
 * The same two facts `settle()` reads, so the popup reports the gate the worker
 * actually applies. The tab object stays a local: only a category and a boolean
 * leave this function, never the url (docs/PRIVACY.md).
 */
async function tabContext() {
  try {
    const tab = await activeTab();
    return { audible: tab?.audible === true, category: categoryOfTab(tab) };
  } catch {
    return { audible: false, category: null };
  }
}

function render(state, context = { audible: false, category: null }) {
  const entries = Object.entries(state.seconds).filter(([, seconds]) => seconds > 0);
  const total = entries.reduce((sum, [, seconds]) => sum + seconds, 0);
  $("total").textContent = total > 0 && total < 30 ? "<1" : Math.round(total / 60).toLocaleString("tr-TR");
  const accrual = accrualStateTr(state, context);
  $("activity").textContent = accrual.pill;
  $("activity").dataset.paused = String(accrual.state !== "counting");
  const list = $("minutes");
  list.replaceChildren(
    ...entries.map(([category, seconds]) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = LABELS_TR[category] ?? category;
      const value = document.createElement("strong");
      value.textContent = minutesLabelTr(seconds);
      const heading = document.createElement("div");
      heading.className = "category-label";
      heading.append(label, value);
      const track = document.createElement("span");
      track.className = "bar-track";
      track.setAttribute("aria-hidden", "true");
      const bar = document.createElement("span");
      bar.className = "bar-fill";
      bar.style.width = `${(seconds / total) * 100}%`;
      track.append(bar);
      li.append(heading, track);
      return li;
    }),
  );
  list.hidden = entries.length === 0;
  $("pause").textContent = state.paused ? "Devam et" : "Duraklat";
  $("pause").setAttribute("aria-pressed", String(state.paused));

  setSync(state);

  /*
   * Why it is or is not counting beats a period start nobody asked about: a
   * browser sitting in the background stops accrual, and saying "Sayım sürüyor"
   * through that is what makes the counter look broken.
   *
   * With nothing collected yet, only a gate that actually blocks accrual gets
   * to speak. An unmapped page is not a fault — "gezindikçe burada birikir"
   * tells a first-time user more than naming the tab they happen to be on.
   */
  const blocked = accrual.state !== "counting" && accrual.state !== "offtopic";
  if (entries.length === 0 && !blocked) {
    setStatus("Henüz kategori dakikası yok. Tarayıcıda gezindikçe burada birikir.", "empty");
  } else {
    setStatus(accrual.text, accrual.state === "counting" ? "ready" : "empty");
  }
}

async function main() {
  const paint = async (state) => render(state ?? (await loadState()), await tabContext());
  await paint();

  // An open popup follows the service worker live.
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "local") void paint();
  });

  $("send").addEventListener("click", async () => {
    $("send").disabled = true;
    $("last").dataset.state = "sending";
    $("last-text").textContent = "Gönderiliyor";
    try {
      const next = await sendNow();
      await paint(next);
      if (!next.sendBlocked) flashSync();
    } catch {
      setStatus("Özet gönderilemedi. Yeniden dene.", "error");
    } finally {
      $("send").disabled = false;
    }
  });
  $("pause").addEventListener("click", async () => {
    const current = await loadState();
    await paint(await update({ paused: !current.paused })); // settles first, then stops accruing
  });
  $("clear").addEventListener("click", async () => {
    const cleared = clearActivity(await loadState());
    await saveState(cleared);
    await paint(cleared);
  });
}

main().catch(() => setStatus("Eklenti verisi okunamadı. Tarayıcıyı yeniden başlat.", "error"));
