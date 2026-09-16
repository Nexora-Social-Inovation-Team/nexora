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

const linkClass = "underline underline-offset-4 hover:text-accent";

function Header() {
  const { t } = useTranslation();
  return (
    <header className="border-b border-surface">
      <nav aria-label="Ana menü" className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-4">
        <Link to="/" className="font-display text-xl tracking-wide">
          {t("brand")}
        </Link>
        <span className="grow" />
        <Link to="/how-it-works" className={linkClass}>
          {t("nav.howItWorks")}
        </Link>
        <Link to="/privacy" className={linkClass}>
          {t("nav.privacy")}
        </Link>
        <Link to="/faq" className={linkClass}>
          {t("nav.faq")}
        </Link>
        <Link to="/app/parent" className={linkClass}>
          {t("nav.login")}
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-surface">
      <nav aria-label={t("footer.title")} className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-6">
        {tr.footer.links.map((link) => (
          <Link key={link.label} to={link.to} className={linkClass}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mx-auto max-w-5xl px-4 pb-8 text-muted">{t("footer.note")}</p>
    </footer>
  );
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-5xl px-4 py-10">
        {children}
      </main>
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
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:flex-row">
      <nav aria-label="Panel menüsü" className="flex shrink-0 flex-col gap-3 sm:w-48">
        <Link to="/" className="font-display text-xl tracking-wide">
          {t("brand")}
        </Link>
        <p className="w-fit rounded-full border border-accent px-3 py-1 text-accent">
          {role === "parent" ? t("panel.roles.parent") : t("panel.roles.teacher")}
        </p>
        <Link to={role === "parent" ? "/app/parent" : "/app/teacher"} className={linkClass}>
          {t("panel.nav.report")}
        </Link>
        <Link to="/privacy" className={linkClass}>
          {t("panel.nav.privacy")}
        </Link>
        <button
          type="button"
          className="w-fit underline underline-offset-4 hover:text-accent"
          onClick={() => {
            signOut();
            void navigate({ to: "/" });
          }}
        >
          {t("panel.nav.logout")}
        </button>
      </nav>
      <main id="main" className="grow">
        <h1 className="text-3xl">{title}</h1>
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
      <h1 className="text-3xl">{t("login.title")}</h1>
      <p className="mt-2 text-muted">{t("login.body")}</p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setFailed(false);
          signIn(persona)
            .catch(() => setFailed(true))
            .finally(() => setPending(false));
        }}
      >
        <label htmlFor="persona">{t("login.selectLabel")}</label>
        <select
          id="persona"
          className="rounded border border-muted bg-surface px-3 py-2"
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
          className="rounded bg-accent px-4 py-2 font-semibold text-bg disabled:opacity-70"
        >
          {pending ? t("login.pending") : t("login.submit")}
        </button>
      </form>
      {failed ? (
        <p role="alert" className="mt-4 text-danger">
          {t("login.error")}
        </p>
      ) : null}
    </main>
  );
}
