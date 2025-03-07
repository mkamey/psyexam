// グローバルエラーハンドラー
(function() {
  if (typeof window === 'undefined') return;

  console.log("エラーハンドラー初期化中...");
  
  // Chrome拡張のエラーを抑制
  window.addEventListener('error', function(event) {
    if (event.filename && (
      event.filename.includes('chrome-extension://') || 
      event.message.includes('chrome-extension://')
    )) {
      console.log('ブラウザ拡張機能エラーを抑制しました:', event.message);
      event.stopPropagation();
      event.preventDefault();
      return true;
    }
  }, true);

  // content-main.jsのエラーを対処するためのパッチ
  try {
    // getUserMediaへの安全なアクセスを確保
    if (typeof navigator !== 'undefined') {
      if (!navigator.mediaDevices) {
        navigator.mediaDevices = {};
      }
      
      // getUserMediaが未定義の場合はダミー関数を提供
      if (!navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = function() {
          console.log("getUserMedia パッチ適用済み");
          return Promise.reject(new Error("getUserMedia is not supported"));
        };
      }
    }
  } catch (e) {
    console.error("mediaDevicesパッチ適用中にエラー:", e);
  }
  
  console.log("エラーハンドラー初期化完了");
})();
