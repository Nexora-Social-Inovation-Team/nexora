import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "../i18n";
import appCss from "../styles.css?url";
import { SessionProvider } from "../ui";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NEXORA — Ölç → Anla → Koçla → Üret" },
      { name: "description", content: "13–18 yaş için yerli sosyal yapay zekâ. Ham URL yok." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Generated from brand/nexora-logo.jpg — see scripts/build-brand-assets.py.
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      // Geist is the measured face; the token stack falls back to system-ui offline.
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@400..700&display=swap" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const { t } = useTranslation();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );

  return (
    <html lang="tr">
      <head>
        <HeadContent />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded-lg focus:border focus:border-line focus:bg-surface focus:p-2">
          {t("skipToContent")}
        </a>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <Outlet />
          </SessionProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
