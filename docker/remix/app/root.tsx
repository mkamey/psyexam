import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { useEffect } from "react";
import { DarkModeToggle } from "./components/DarkModeToggle";
import { useDarkMode } from "./context/DarkModeContext";

import "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

// クライアント側でのみ実行されるコンポーネント
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient ? <>{children}</> : null;
}

// ダークモードトグルを含むヘッダーコンポーネント
function Header() {
  const location = useLocation();
  
  // ログインページではヘッダーを表示しない
  if (location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/waiting-approval") {
    return null;
  }
  
  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-md py-2 px-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <img
            className="h-10 w-auto hidden dark:block"
            src="/logo-dark.png"
            alt="ロゴ (ダークモード)"
          />
          <img
            className="h-10 w-auto block dark:hidden"
            src="/logo-light.png"
            alt="ロゴ (ライトモード)"
          />
        </div>
        <ClientOnly>
          <DarkModeToggle className="ml-4" />
        </ClientOnly>
      </div>
    </header>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Header />
        <div className="min-h-screen">
          {children}
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// ClientOnlyコンポーネントで使用するuseStateをimport
import { useState } from "react";
