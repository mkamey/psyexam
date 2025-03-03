import { createContext, useContext, useEffect, useState } from "react";

// ダークモードコンテキストの型定義
type DarkModeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
};

// デフォルト値を持つコンテキストを作成
const DarkModeContext = createContext<DarkModeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
});

// コンテキストを使用するためのカスタムフック
export const useDarkMode = () => useContext(DarkModeContext);

// コンテキストプロバイダーコンポーネント
export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  // クライアントサイドのみで実行されるようにする
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);

  // マウント時にローカルストレージとシステム設定を確認
  useEffect(() => {
    console.log('DarkModeProvider useEffect が実行されました');
    const savedMode = localStorage.getItem('darkMode');
    
    if (savedMode !== null) {
      console.log(`ローカルストレージから読み込みました: ${savedMode}`);
      setIsDarkMode(savedMode === 'true');
    } else {
      // システム設定を確認
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log(`システム設定を確認: ${prefersDark ? 'ダーク' : 'ライト'}モード`);
      setIsDarkMode(prefersDark);
    }
  }, []);

  // isDarkModeが変更されたらHTMLにclassを適用
  useEffect(() => {
    if (isDarkMode === null) return;

    console.log(`ダークモード状態変更: ${isDarkMode ? 'ダーク' : 'ライト'}モード`);
    
    // HTMLのdark classを管理
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // ローカルストレージに保存
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  // ダークモード切り替え関数
  const toggleDarkMode = () => {
    console.log('toggleDarkMode が呼び出されました');
    setIsDarkMode(prev => !prev);
  };

  // 特定のモードに設定する関数
  const setDarkMode = (isDark: boolean) => {
    console.log(`setDarkMode(${isDark}) が呼び出されました`);
    setIsDarkMode(isDark);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode: Boolean(isDarkMode), toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}