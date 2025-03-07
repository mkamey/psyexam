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
  toggleDarkMode: () => console.log('Default toggleDarkMode called'),
  setDarkMode: () => console.log('Default setDarkMode called'),
});

// コンテキストが存在するかどうかをチェックする関数
export function assertDarkModeContext() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}

// コンテキストを使用するためのカスタムフック
export const useDarkMode = () => {
  try {
    const context = useContext(DarkModeContext);
    console.log('DarkModeContext accessed:', context ? 'available' : 'null');
    return context;
  } catch (error) {
    console.error('Error in useDarkMode hook:', error);
    // エラーが発生した場合はデフォルトのコンテキスト値を返す
    return {
      isDarkMode: false,
      toggleDarkMode: () => console.log('Fallback toggleDarkMode called'),
      setDarkMode: () => console.log('Fallback setDarkMode called')
    };
  }
};

// サーバーサイドレンダリングかどうかを判定するヘルパー関数
const isServer = typeof window === 'undefined';

// コンテキストプロバイダーコンポーネント
export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  console.log(`DarkModeProvider レンダリング - サーバーサイド？ ${isServer ? 'はい' : 'いいえ'}`);
  
  // クライアントサイドのみで実行されるようにする - 初期値をfalseに設定
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  // ローカルストレージからのロードが完了したかどうかを追跡
  const [isLoaded, setIsLoaded] = useState<boolean>(isServer ? true : false); // サーバーサイドでは常にロード完了とする

  // マウント時にローカルストレージとシステム設定を確認
  useEffect(() => {
    // サーバーサイドでは何もしない
    if (isServer) return;
    
    console.log('DarkModeProvider useEffect が実行されました');
    // ローカルストレージから値を読み込む前に初期化済みフラグをfalseに設定
    if (isLoaded) return;

    try {
      const savedMode = localStorage.getItem('darkMode');
      
      if (savedMode !== null) {
        console.log(`ローカルストレージから読み込みました: ${savedMode}`);
        // 厳密に比較して変換
        setIsDarkMode(savedMode === 'true');
      } else {
        // システム設定を確認
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        console.log(`システム設定を確認: ${prefersDark ? 'ダーク' : 'ライト'}モード`);
        setIsDarkMode(prefersDark);
      }
    } catch (error) {
      console.error('ダークモード設定の読み込み中にエラーが発生しました:', error);
    } finally {
      // 読み込み完了フラグを設定
      setIsLoaded(true);
    }
  }, [isLoaded]);

  // isDarkModeが変更されたらHTMLにclassを適用
  useEffect(() => {
    // サーバーサイドでは何もしない
    if (isServer) return;
    
    // isLoadedがfalseの場合は、初期ロード中なのでスキップ
    if (!isLoaded) return;

    console.log(`ダークモード状態変更: ${isDarkMode ? 'ダーク' : 'ライト'}モード`);
    console.log(`現在のHTML class: ${document.documentElement.className}`);
    
    // HTMLのdark classを管理 - 一度全てのクラスをリセットして強制的に再適用
    if (isDarkMode) {
      // クラスが既に付いていてもいったん削除して再追加する
      document.documentElement.classList.remove('dark');
      setTimeout(() => {
        document.documentElement.classList.add('dark');
        console.log('DARKクラスを追加しました');
      }, 50);
    } else {
      // ライトモードの場合はdarkクラスを確実に削除
      document.documentElement.classList.remove('dark');
      console.log('DARKクラスを削除しました');
    }
    
    try {
      // ローカルストレージに保存
      localStorage.setItem('darkMode', String(isDarkMode));
      console.log(`ローカルストレージに保存: ${isDarkMode}`);
    } catch (error) {
      console.error('ダークモード設定の保存中にエラーが発生しました:', error);
    }
  }, [isDarkMode, isLoaded]);

  // ダークモード切り替え関数
  const toggleDarkMode = () => {
    console.log('toggleDarkMode が呼び出されました');
    console.log(`現在のモード: ${isDarkMode ? 'ダーク' : 'ライト'}`);
    setIsDarkMode(prev => {
      const newValue = !prev;
      console.log(`新しいモード設定: ${newValue ? 'ダーク' : 'ライト'}`);
      return newValue;
    });
  };

  // 特定のモードに設定する関数
  const setDarkMode = (isDark: boolean) => {
    console.log(`setDarkMode(${isDark}) が呼び出されました`);
    setIsDarkMode(Boolean(isDark)); // 明示的にBooleanに変換
  };

  // isDarkModeがnever nullになることを保証
  const darkModeValue = Boolean(isDarkMode);
  
  console.log(`Provider render: isDarkMode = ${darkModeValue}`);

  return (
    <DarkModeContext.Provider value={{ isDarkMode: darkModeValue, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}