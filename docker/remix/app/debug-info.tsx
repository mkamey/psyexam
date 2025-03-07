import { useEffect } from "react";

export function DebugInfo() {
  useEffect(() => {
    console.log("環境変数:");
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`REMIX_DEV_SERVER_WS_PORT: ${process.env.REMIX_DEV_SERVER_WS_PORT}`);
    console.log(`PORT: ${process.env.PORT}`);
    console.log(`COOKIE_DOMAIN: ${process.env.COOKIE_DOMAIN}`);
    console.log(`現在のURL: ${window.location.href}`);
    console.log(`ホスト: ${window.location.host}`);
    console.log(`オリジン: ${window.location.origin}`);
  }, []);

  return null;
}
