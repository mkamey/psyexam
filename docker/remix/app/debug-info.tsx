import { useEffect } from "react";

export function DebugInfo() {
  useEffect(() => {
    try {
      // ブラウザ環境でのみ実行
      if (typeof window === 'undefined') return;
      
      console.group('環境診断情報');
      console.log(`ブラウザ: ${navigator.userAgent}`);
      console.log(`現在のURL: ${window.location.href}`);
      console.log(`ホスト: ${window.location.host}`);
      
      // navigator.mediaDevicesの状態をチェック
      console.log(`navigator.mediaDevices: ${navigator.mediaDevices ? '存在します' : '存在しません'}`);
      if (navigator.mediaDevices) {
        console.log(`- getUserMedia: ${typeof navigator.mediaDevices.getUserMedia === 'function' ? '関数として利用可能' : '利用不可'}`);
      }
      
      // エラーが発生した場合のために、グローバルエラーハンドラーを登録
      window.onerror = function(message, source, lineno, colno, error) {
        console.error(`[グローバルエラー] ${message} (${source}:${lineno}:${colno})`, error);
        return false; // デフォルトのエラーハンドリングを行う
      };
      
      console.groupEnd();
    } catch (error) {
      console.error('DebugInfoコンポーネントでエラーが発生しました:', error);
    }
  }, []);

  return null;
}
