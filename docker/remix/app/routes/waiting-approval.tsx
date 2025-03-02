import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { getUser, logout } from "../../utils/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUser(request);
  if (!user) {
    // ログインしていない場合はログインページへ
    throw await logout(request);
  }
  
  // すでに承認されている場合はメインページへ
  if (user.isApproved) {
    return json({ user, redirectTo: "/index_doctor" });
  }
  
  return json({ user, redirectTo: null });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  // ログアウトアクションのみ処理
  return logout(request);
};

export default function WaitingApproval() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          className="mx-auto h-16 w-auto"
          src="/logo-dark.png"
          alt="心理検査システム"
        />
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          アカウント承認待ち
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              こんにちは {user.username} さん
            </h3>
            
            <p className="mt-2 text-sm text-gray-500">
              あなたのアカウントは現在、管理者による承認待ち状態です。承認されると、システムの全機能にアクセスできるようになります。承認まではしばらく時間がかかる場合がありますので、しばらくお待ちください。
            </p>
            
            <p className="mt-4 text-sm text-gray-500">
              ご不明な点がございましたら、システム管理者にお問い合わせください。
            </p>
            
            <div className="mt-6">
              <Form method="post">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  ログアウト
                </button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}