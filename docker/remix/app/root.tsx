import { DebugInfo } from "./debug-info";
import { useState, useEffect } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  Link
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { DarkModeToggle } from "./components/DarkModeToggle";
import { useDarkMode, DarkModeProvider } from "./context/DarkModeContext";

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
  
  // パスに基づいてリンク先を決定
  // /doctorまたは/index_doctorで始まるパスは管理画面と判断
  const isDoctor = location.pathname.startsWith('/doctor') || location.pathname.startsWith('/index_doctor');
  const linkDestination = isDoctor ? "/index_doctor" : "/";
  
  console.log(`現在のパス: ${location.pathname}, リンク先: ${linkDestination}`);
  
  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-md py-2 px-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to={linkDestination} className="cursor-pointer">
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
          </Link>
        </div>
        <ClientOnly>
          <DarkModeToggle className="ml-4" />
        </ClientOnly>
      </div>
    </header>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  // 安全なコンテキストアクセスのためのエラーハンドリング
  try {
    const { isDarkMode } = useDarkMode();

    useEffect(() => {
      if (typeof document !== 'undefined') {
        console.log('AppLayout: Setting dark mode class to', isDarkMode);
        document.documentElement.classList.toggle('dark', isDarkMode);
      }
    }, [isDarkMode]);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <DebugInfo />
        {children}
      </div>
    );
  } catch (error) {
    console.error('Error in AppLayout:', error);
    // エラー発生時は基本レイアウトを返す
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        {children}
      </div>
    );
  }
}

export default function App() {
  return (
    <html lang="ja" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script src="/js/error-handler.js"></script>
        <script src="/js/polyfill.js"></script>
      </head>
      <body className="h-full">
        {/* グローバルメディアデバイスポリフィル */}
        <script dangerouslySetInnerHTML={{ __html: `
          // メディアデバイスAPI用のポリフィル
          if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
            navigator.mediaDevices = {};
          }
          if (typeof navigator !== 'undefined' && navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia = function() {
              console.log("getUserMedia インラインpolyfill適用済み");
              return Promise.reject(new Error("getUserMedia is not supported"));
            };
          }
          console.log("インラインpolyfillロード完了");
        ` }} />
        <DarkModeProvider>
          <AppLayout>
            <Outlet />
          </AppLayout>
        </DarkModeProvider>
        <ScrollRestoration />
        // root.tsxの<Scripts />の前に追加
{/* getUserMediaのPolyfill */}
<script dangerouslySetInnerHTML={{ __html: `
  // メディアデバイスへのアクセス関数のpolyfill
  if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function() {
      console.warn("getUserMedia is not supported in this browser, using polyfill");
      return Promise.reject(new Error("getUserMedia is not supported"));
    };
  }
` }} />
<Scripts />
        <Scripts />
        {/* ダークモード初期化のデバッグ出力 */}
        <script dangerouslySetInnerHTML={{ __html: `console.log("Remixアプリがロードされました");` }} />
      </body>
    </html>
  );
}
