import type { User } from "@nexora/shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { login } from "./api";
import { tr } from "./i18n";

type Persona = "ece" | "mert";

type Session = {
  user: User | null;
  signIn: (persona: Persona) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<Session | null>(null);

/**
 * ponytail: the demo session lives in React state only. There is no logout
 * endpoint, so "Çıkış" clears client state and a reload asks for the demo login
 * again. Upgrade path: read `GET /users/me` on mount once sessions outlive demos.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value = useMemo<Session>(
    () => ({
      user,
      signIn: async (persona) => setUser(await login(persona)),
      signOut: () => setUser(null),
    }),
    [user],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}

/*
 * Shared class tokens. Calendly's kit is three shapes: a navy filled button, a
 * white outlined one, and a white card on a hairline with a generous radius.
 * Every screen composes these instead of restating the utilities.
 */
export const btnPrimary =
  "inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-60";
export const btnSecondary =
  "inline-block rounded-lg border border-line bg-surface px-5 py-2.5 font-medium text-text transition-colors hover:border-text";
export const cardClass = "rounded-2xl border border-line bg-surface p-6";

/* Nav and footer links are unstyled until hover — underline on hover, ring on focus. */
const navLink = "text-muted transition-colors hover:text-text hover:underline hover:underline-offset-4";
const wordmark = "font-display text-xl font-semibold tracking-tight";

/** The reference keeps content on a 1352px measure inside full-bleed sections. */
export const container = "mx-auto w-full max-w-[84rem] px-4 sm:px-6";

/** The real mark, generated from brand/nexora-logo.jpg by scripts/build-brand-assets.py. */
function Mark() {
  return <img src="/favicon.png" alt="" aria-hidden="true" className="size-6 shrink-0 rounded-md" />;
}

/** Navy strip above the nav. The reference leads with one; ours carries the KVKK line. */
function AnnouncementBar() {
  const { t } = useTranslation();
  return (
    <div className="bg-accent text-bg">
      <p className={`${container} flex flex-wrap items-center justify-center gap-3 py-2 text-sm`}>
        {t("landing.trust")}
        <Link to="/privacy" className="rounded-full bg-bg/10 px-3 py-1 font-medium hover:bg-bg/20">
          {t("nav.privacy")} <span aria-hidden="true">→</span>
        </Link>
      </p>
    </div>
  );
}

function Header() {
  const { t } = useTranslation();
  return (
    <header className="border-b border-line">
      {/* The logo ramp as a hairline: the one place the brand gradient appears
          on a light page, and it carries no text. */}
      <div aria-hidden="true" className="h-[3px]" style={{ background: "var(--brand-ramp)" }} />
      {/*
        The bar wrapped lopsidedly on a phone: the grow spacer ate the first
        row, so two links sat beside the wordmark and the rest dropped left.
        Giving the brand the full first row below `sm` puts the links on one
        even row of their own; the desktop bar is unchanged.
      */}
      <nav aria-label="Ana menü" className={`${container} flex flex-wrap items-center gap-x-5 gap-y-3 py-4 sm:gap-6`}>
        <Link to="/" className={`${wordmark} flex w-full items-center gap-2 sm:w-auto`}>
          <Mark />
          {t("brand")}
        </Link>
        <span className="hidden grow sm:block" />
        <Link to="/how-it-works" className={navLink}>
          {t("nav.howItWorks")}
        </Link>
        <Link to="/privacy" className={navLink}>
          {t("nav.privacy")}
        </Link>
        <Link to="/faq" className={navLink}>
          {t("nav.faq")}
        </Link>
        <Link to="/app/parent" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
          {t("nav.login")}
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mx-2 mt-12 mb-2 rounded-3xl bg-accent px-6 py-12 text-bg sm:mx-4 sm:mt-20 sm:px-12 sm:py-16">
      {/* The reference closes on one oversized statement at weight 500, then the links. */}
      <div className="mx-auto max-w-[78rem]">
        <p className={`${wordmark} flex items-center gap-2`}>
          <Mark />
          {t("brand")}
        </p>
        <p className="mt-6 max-w-2xl text-balance font-display text-3xl font-medium tracking-[-0.033em] sm:text-5xl">
          {t("landing.sub")}
        </p>
        <nav
          aria-label={t("footer.title")}
          className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-bg/15 pt-6 text-sm"
        >
          {tr.footer.links.map((link) => (
            <Link key={link.label} to={link.to} className="hover:underline hover:underline-offset-4">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-sm text-bg/70">{t("footer.note")}</p>
      </div>
    </footer>
  );
}

/**
 * Inner-page header: the same inset beige band the reference uses on its
 * sub-pages — eyebrow, one large tight heading, small sub copy, all centred.
 */
export function PageHeader({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <section className="mx-2 mt-2 rounded-3xl bg-band px-4 py-16 text-center sm:mx-4 sm:py-20">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="mx-auto mt-4 max-w-3xl text-4xl leading-[1.05] tracking-[-0.04em] sm:text-6xl">{title}</h1>
      {sub ? <p className="mx-auto mt-5 max-w-md text-muted">{sub}</p> : null}
    </section>
  );
}

/** Sections are full-bleed; each page wraps its own content in `container`. */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}

export function AppShell({
  role,
  title,
  children,
}: {
  role: "parent" | "teacher";
  title: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <div className={`${container} flex flex-col gap-10 py-8 sm:flex-row`}>
      {/* A column of five stacked links ate the top of every phone screen. */}
      <nav
        aria-label="Panel menüsü"
        className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 sm:w-56 sm:flex-col sm:items-start sm:gap-3"
      >
        <Link to="/" className={`${wordmark} flex items-center gap-2`}>
          <Mark />
          {t("brand")}
        </Link>
        <p className="rounded-full border border-line bg-band px-3 py-1 text-sm font-medium">
          {role === "parent" ? t("panel.roles.parent") : t("panel.roles.teacher")}
        </p>
        <Link to={role === "parent" ? "/app/parent" : "/app/teacher"} className={navLink}>
          {t("panel.nav.report")}
        </Link>
        <Link to="/privacy" className={navLink}>
          {t("panel.nav.privacy")}
        </Link>
        <button
          type="button"
          className={navLink}
          onClick={() => {
            signOut();
            void navigate({ to: "/" });
          }}
        >
          {t("panel.nav.logout")}
        </button>
      </nav>
      <main id="main" className="grow">
        <h1 className="text-4xl">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function DemoLogin({ defaultPersona }: { defaultPersona: Persona }) {
  const { t } = useTranslation();
  const { signIn } = useSession();
  const [persona, setPersona] = useState<Persona>(defaultPersona);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // The demo login only works with JS, so the submit stays disabled until
  // hydration: a pre-hydration click would submit the form and reload the page.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl">{t("login.title")}</h1>
      <p className="mt-3 text-muted">{t("login.body")}</p>
      <form
        className={`${cardClass} mt-6 flex flex-col gap-4`}
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setFailed(false);
          signIn(persona)
            .catch(() => setFailed(true))
            .finally(() => setPending(false));
        }}
      >
        <label htmlFor="persona" className="font-medium">
          {t("login.selectLabel")}
        </label>
        <select
          id="persona"
          className="rounded-lg border border-line bg-surface px-3 py-2.5"
          value={persona}
          onChange={(event) => setPersona(event.target.value as Persona)}
        >
          {tr.login.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !hydrated}
          className={btnPrimary}
        >
          {pending ? t("login.pending") : t("login.submit")}
        </button>
      </form>
      {/* --danger now clears AA on --surface, but the border keeps the state non-colour-only. */}
      {failed ? (
        <p role="alert" className="mt-4 border-l-4 border-danger pl-3 text-danger">
          {t("login.error")}
        </p>
      ) : null}
    </main>
  );
}
