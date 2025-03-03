import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { createUserSession, getUserId, login } from "../../utils/session.server";

// デバッグ用のログ関数
const logDebug = (message: string, data?: any) => {
  console.log(`[Login Debug] ${message}`, data || '');
};

export const meta: MetaFunction = () => {
  return [
    { title: "ログイン | 心理検査システム" },
    { name: "description", content: "心理検査システムへのログインページです" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  logDebug('Loader function called');
  
  // すでにログインしている場合はリダイレクト
  const userId = await getUserId(request);
  logDebug(`Current userId: ${userId}`);
  
  if (userId) {
    logDebug(`User already logged in, redirecting to /index_doctor`);
    return redirect("/index_doctor");
  }
  
  logDebug('No user logged in, rendering login page');
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  logDebug("ログイン処理開始");
  
  try {
    const formData = await request.formData();
    const username = formData.get("username");
    const password = formData.get("password");
    
    logDebug(`ログイン試行: ${username}`);

    // 入力検証
    if (typeof username !== "string" || username.length === 0) {
      logDebug("ユーザー名が空です");
      return json({ errors: { username: "ユーザー名は必須です", password: null } }, { status: 400 });
    }

    if (typeof password !== "string" || password.length === 0) {
      logDebug("パスワードが空です");
      return json({ errors: { username: null, password: "パスワードは必須です" } }, { status: 400 });
    }

    // ユーザー認証
    logDebug("ユーザー認証を試みます");
    const user = await login({ username, password });

    if (!user) {
      logDebug("認証失敗: ユーザーが見つからないか、パスワードが一致しません");
      return json(
        { errors: { username: "ユーザー名またはパスワードが正しくありません", password: null } },
        { status: 400 }
      );
    }

    logDebug(`認証成功: ${user.username}, ID: ${user.id}, 承認状態: ${user.isApproved}`);

    // 承認待ちの場合は専用ページへリダイレクト
    if (!user.isApproved) {
      logDebug("未承認ユーザー: 承認待ちページへリダイレクト");
      return createUserSession(user.id, "/waiting-approval");
    }

    // セッション作成とリダイレクト
    logDebug("承認済みユーザー: ダッシュボードへリダイレクト");
    
    try {
      const result = await createUserSession(user.id, "/index_doctor");
      logDebug("セッション作成成功", result);
      return result;
    } catch (sessionError) {
      logDebug("セッション作成エラー", sessionError);
      throw sessionError;
    }
  } catch (error) {
    logDebug("ログイン処理エラー:", error);
    return json({ errors: { username: "ログイン処理中にエラーが発生しました", password: null } }, { status: 500 });
  }
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  // フォームの初期値を明示的に設定
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // デバッグログ
  console.log("Login component rendering, actionData:", actionData);

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 dark:bg-gray-900 py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* ダークモードとライトモードでロゴを切り替え */}
        <img
          className="mx-auto h-16 w-auto hidden dark:block"
          src="/logo-dark.png"
          alt="心理検査システム"
        />
        <img
          className="mx-auto h-16 w-auto block dark:hidden"
          src="/logo-light.png"
          alt="心理検査システム"
        />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          心理検査システムへのログイン
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 px-4 py-8 shadow sm:rounded-lg sm:px-10 transition-colors duration-300">
          <Form method="post" className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                ユーザー名
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm"
                />
              </div>
              {actionData?.errors?.username && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{actionData.errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-blue-500 dark:focus:ring-blue-400 sm:text-sm"
                />
              </div>
              {actionData?.errors?.password && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{actionData.errors.password}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 dark:bg-blue-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 transition-colors duration-300"
              >
                {isSubmitting ? "ログイン中..." : "ログイン"}
              </button>
            </div>
          </Form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">または</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-4 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-300"
              >
                新規アカウント登録
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}