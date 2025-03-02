import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
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
    }),
    tsconfigPaths(),
  ],
  // ビルド設定の最適化
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // 特定の警告を無視
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
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
  },
});
