import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

// デバッグ情報を出力
console.log("Vite設定を読み込み中...");
console.log("Node.js バージョン:", process.version);
console.log("環境変数:", {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL ? "設定済み" : "未設定"
});

export default defineConfig({
  // 詳細なログ出力を有効化
  logLevel: "info",
  
  // プラグイン設定
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      // マニフェスト解決の問題を修正するための設定
      manifest: true,
      serverModuleFormat: "esm",
      ssr: true, // SSRを明示的に有効化
    }),
    tsconfigPaths(),
  ],
  
  // 依存関係の最適化
  optimizeDeps: {
    include: ["react", "react-dom", "@remix-run/react"],
    exclude: [],
  },
  
  // ビルド設定の最適化
  build: {
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // 特定の警告を無視
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
          return;
        }
        // "remix:manifest"の警告を無視
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.message.includes('remix:manifest')) {
          return;
        }
        warn(warning);
      },
    },
  },
  
  // 開発サーバーの設定
  server: {
    host: true,
    port: 3000,
    hmr: false,  // HMRを無効化
  },
  
  // 解決設定
  resolve: {
    // remix関連の仮想モジュールをサポートする設定
    conditions: ["development", "browser"],
    alias: {
      // "remix:manifest"の解決問題を回避するためのダミーエイリアス
      "remix:manifest": "/@id/__virtual:remix/manifest",
    },
  },
  
  // その他の詳細設定
  define: {
    // vite固有の環境変数のポリフィル
    'import.meta.hot': 'import.meta.hot',
    'import.meta.env': 'import.meta.env',
  },

  // コンソール警告を非表示
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent',
      'unsupported-dynamic-import': 'silent',
    }
  },
});

// 設定読み込み完了のログ
console.log("Vite設定の読み込みが完了しました");
