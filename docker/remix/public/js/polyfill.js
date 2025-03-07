// メディアデバイスAPI用のポリフィル
(function() {
  if (typeof window !== 'undefined') {
    // navigator.mediaDevicesのポリフィル
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {};
    }

    // getUserMediaのポリフィル
    if (!navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia = function() {
        console.log("getUserMedia polyfill applied");
        return Promise.reject(new Error("getUserMedia is not supported"));
      };
    }
    
    // 拡張機能用のグローバルエラーハンドラー
    window.addEventListener('error', function(event) {
      // ブラウザ拡張関連のエラーを抑制
      if (event.filename && event.filename.startsWith('chrome-extension://')) {
        event.preventDefault();
        console.log('Chrome extension error suppressed:', event.message);
        return true;
      }
    }, true);
    
    console.log("Media device polyfills loaded successfully");
  }
})();
