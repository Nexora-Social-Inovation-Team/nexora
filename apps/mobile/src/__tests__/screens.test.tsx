import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { AccountStatus, User } from "@nexora/shared";

import { setSession } from "@/api";
import Coach from "@/app/coach";
import Done from "@/app/done";
import Onboarding from "@/app/index";
import ScoreScreen from "@/app/score";
import Waiting from "@/app/waiting";
import { colors, s } from "@/ui";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest factories cannot use imports
  const React = require("react") as typeof import("react");
  return {
    // delegate: the factory is hoisted above the jest.fn() consts
    router: {
      replace: (...args: unknown[]) => mockReplace(...args),
      push: (...args: unknown[]) => mockPush(...args),
    },
    useFocusEffect: (callback: () => void) => {
      React.useEffect(callback, [callback]);
    },
    useLocalSearchParams: () => ({ share: "Deniz bu hafta kısa bir bilim görevi seçti." }),
  };
});

jest.mock(
  "react-native-safe-area-context",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest factories cannot use imports
  () => (require("react-native-safe-area-context/jest/mock") as { default: object }).default,
);

const REASONS = [
  "Eğlence kategorisi sürenin çoğunu kaplıyor.",
  "Bilim, sanat, spor veya kültür kategorilerinde görünür bir payın var.",
  "Birden fazla değerli kategoride zaman geçirmişsin.",
];

const DISTRIBUTION = {
  science: 40,
  arts: 15,
  sports: 20,
  culture: 10,
  entrepreneurship: 0,
  national_memory: 5,
  entertainment: 120,
  harmful: 0,
};

const youth = (status: AccountStatus): User => ({
  id: "usr_deniz",
  role: "youth",
  status,
  displayName: "Deniz",
  linkedYouthId: null,
});

const res = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

const fail = (status: number, code: string, message: string) =>
  res(status, { error: { code, message } });

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  setSession({ token: "tok", user: youth("active"), persona: "deniz_balanced" });
});

const urlsCalled = () => fetchMock.mock.calls.map(([url]) => String(url));

describe("screen 2 — veli onayı bekleniyor", () => {
  it("renders while pending and never asks for a score", async () => {
    setSession({ token: "tok", user: youth("pending_parent_consent") });
    fetchMock.mockImplementation(() => res(200, { user: youth("pending_parent_consent") }));

    await render(<Waiting />);

    expect(screen.getByText("Veli onayı bekleniyor")).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(urlsCalled().some((url) => url.includes("/users/me"))).toBe(true);
    expect(urlsCalled().some((url) => url.includes("/score"))).toBe(false);
    expect(urlsCalled().some((url) => url.includes("/coach"))).toBe(false);
  });

  it("routes to the score screen once the parent approves", async () => {
    setSession({ token: "tok", user: youth("pending_parent_consent") });
    fetchMock.mockImplementation(() => res(200, { user: youth("active") }));

    await render(<Waiting />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/score"));
  });
});

describe("screen 3 — bu haftaki dengen", () => {
  const ready = () =>
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/score/current")
        ? res(200, {
            youthId: "usr_deniz",
            value: 80,
            reasons: REASONS,
            computedAt: "2026-09-15T10:05:00.000Z",
            period: "2026-09-08/2026-09-15",
          })
        : res(200, {
            youthId: "usr_deniz",
            period: "2026-09-08/2026-09-15",
            score: { value: 80, reasons: REASONS },
            distribution: DISTRIBUTION,
            trend: [],
            task: null,
            share_text: null,
            empty: false,
          }),
    );

  it("renders exactly three reasons, the value and Turkish category minutes", async () => {
    ready();

    await render(<ScoreScreen />);

    expect(await screen.findAllByTestId("reason")).toHaveLength(3);
    expect(screen.getByText("80")).toBeTruthy();
    expect(screen.getByText("Eğlence")).toBeTruthy();
    expect(screen.getByText("120 dk")).toBeTruthy();
    expect(screen.getByText("Ham bağlantı, mesaj veya arama kaydı toplanmaz.")).toBeTruthy();
  });

  it("lists only the categories the week used, busiest first", async () => {
    ready();

    await render(<ScoreScreen />);

    // DISTRIBUTION leaves entrepreneurship and harmful at 0: eight rows of which
    // two read "0 dk" is noise, so they collapse into one counted line.
    const rows = (await screen.findAllByLabelText(/ dakika$/)).map(
      (node) => node.props.accessibilityLabel as string,
    );
    expect(rows).toEqual([
      "Eğlence: 120 dakika",
      "Bilim: 40 dakika",
      "Spor: 20 dakika",
      "Sanat: 15 dakika",
      "Kültür: 10 dakika",
      "Millî hafıza: 5 dakika",
    ]);
    expect(screen.queryByText("Girişimcilik")).toBeNull();
    expect(screen.getByText("2 kategoride bu hafta süre yok.")).toBeTruthy();
  });

  it("says the task is done on the main screen once it is completed", async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/score/current")
        ? res(200, {
            youthId: "usr_deniz",
            value: 80,
            reasons: REASONS,
            computedAt: "2026-09-15T10:05:00.000Z",
            period: "2026-09-08/2026-09-15",
          })
        : res(200, {
            youthId: "usr_deniz",
            period: "2026-09-08/2026-09-15",
            score: { value: 80, reasons: REASONS },
            distribution: DISTRIBUTION,
            trend: [],
            task: { id: "task_abc", title: "15 dakikalık bilim molası", status: "completed" },
            share_text: null,
            empty: false,
          }),
    );

    await render(<ScoreScreen />);

    expect(await screen.findByText("✦ Bu haftaki görevini tamamladın")).toBeTruthy();
    expect(screen.getByText("15 dakikalık bilim molası")).toBeTruthy();
  });

  it("stays quiet while the task is still open", async () => {
    ready();

    await render(<ScoreScreen />);

    await screen.findAllByTestId("reason");
    expect(screen.queryByText("✦ Bu haftaki görevini tamamladın")).toBeNull();
  });

  it("renders the empty state on no_data", async () => {
    fetchMock.mockImplementation(() => fail(404, "no_data", "Henüz kategori özeti yok."));

    await render(<ScoreScreen />);

    expect(
      await screen.findByText(
        "Henüz kategori özeti yok. Eklenti özet gönderince veya demo verisi yüklenince skorun burada olur.",
      ),
    ).toBeTruthy();
  });

  it("renders the error state with a retry that reloads", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));

    await render(<ScoreScreen />);

    expect(await screen.findByText("Bağlantı kurulamadı. Tekrar dene.")).toBeTruthy();
    ready();
    await fireEvent.press(screen.getByText("Tekrar dene"));
    expect(await screen.findAllByTestId("reason")).toHaveLength(3);
  });

  it("sends a pending youth back to the waiting screen on consent_missing", async () => {
    fetchMock.mockImplementation(() =>
      fail(403, "consent_missing", "Veli onayı olmadan bu işlem yapılamaz."),
    );

    await render(<ScoreScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/waiting"));
  });
});

describe("screen 4 — koç ve mikro-görev", () => {
  beforeEach(() => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes("/tasks/")
        ? res(200, {
            id: "task_abc",
            status: "completed",
            completedAt: "2026-09-15T11:00:00.000Z",
            badge: "degerli_adim",
          })
        : res(200, {
            tips: ["Tip bir.", "Tip iki.", "Tip üç."],
            task: {
              title: "15 dakikalık bilim molası",
              steps: ["İlgini çeken bir konu seç.", "15 dakika bak.", "Bir cümle yaz."],
              eta_minutes: 15,
            },
            share_text: "Deniz bu hafta kısa bir bilim görevi seçti.",
            source: "fallback",
            task_id: "task_abc",
          }),
    );
  });

  it("completes the task with POST /tasks/:id/complete", async () => {
    await render(<Coach />);

    await fireEvent.press(await screen.findByText("Görevi tamamladım"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tasks/task_abc/complete"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/done",
      params: { share: "Deniz bu hafta kısa bir bilim görevi seçti." },
    });
  });

  it("shows three tips and the task eta", async () => {
    await render(<Coach />);

    expect(await screen.findAllByTestId("tip")).toHaveLength(3);
    expect(screen.getByText("Tahmini süre: 15 dk")).toBeTruthy();
  });
});

describe("screen 5 — görev tamamlandı", () => {
  it("shows the badge and the summary the parent will see", async () => {
    await render(<Done />);

    expect(screen.getByLabelText("Rozet kazandın: Değerli adım")).toBeTruthy();
    expect(screen.getByText("Velinle paylaşılacak özet")).toBeTruthy();
    expect(screen.getByText("Deniz bu hafta kısa bir bilim görevi seçti.")).toBeTruthy();
    expect(screen.getByLabelText("Panele yansısın")).toBeTruthy();
  });
});

describe("demo persona switch", () => {
  const openMenu = () => fireEvent(screen.getByLabelText("NEXORA"), "longPress");

  it("offers the three personas and the __DEV__ approve shortcut", async () => {
    await render(<Onboarding />);
    await openMenu();

    expect(screen.getByText("Dengeli")).toBeTruthy();
    expect(screen.getByText("Riskli")).toBeTruthy();
    expect(screen.getByText("Üretken")).toBeTruthy();
    expect(screen.getByText("Veli onayını simüle et")).toBeTruthy();
  });

  it("hides the approve shortcut outside __DEV__", async () => {
    const dev = __DEV__;
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    try {
      await render(<Onboarding />);
      await openMenu();

      expect(screen.getByText("Dengeli")).toBeTruthy();
      expect(screen.queryByText("Veli onayını simüle et")).toBeNull();
    } finally {
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
    }
  });
});

describe("a11y — WCAG 2.1 AA contrast (docs/DESIGN.md item 6)", () => {
  const luminance = (hex: string) =>
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      .reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i]! * c, 0);

  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
    return (hi + 0.05) / (lo + 0.05);
  };

  it("keeps every text colour at 4.5:1 on both the screen and card backgrounds", () => {
    for (const style of [s.title, s.body, s.muted, s.error, s.wordmark, s.btnTextGhost]) {
      for (const bg of [colors.bg, colors.surface]) {
        expect(ratio(String(style.color), bg)).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(ratio(String(s.btnTextPrimary.color), colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("still signals the error state without relying on colour alone", () => {
    expect(s.error.borderLeftColor).toBe(colors.danger);
  });
});
