import { Link } from "@remix-run/react";
import { Form } from "@remix-run/react";
import { logout } from "../../utils/session.server";
import { ActionFunctionArgs } from "@remix-run/node";

export const action = async ({ request }: ActionFunctionArgs) => {
  // ログアウトアクションのみ処理
  return logout(request);
};

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          className="mx-auto h-16 w-auto"
          src="/logo-dark.png"
          alt="心理検査システム"
        />
        <h2 className="mt-6 text-center text-2xl font-bold text-red-600">
          アクセス権限がありません
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              このページを表示する権限がありません
            </h3>
            
            <p className="mt-2 text-sm text-gray-500">
              このページにアクセスするには、管理者権限が必要です。権限の付与については、システム管理者にお問い合わせください。
            </p>
            
            <div className="mt-6 flex flex-col space-y-3">
              <Link
                to="/index_doctor"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                トップページに戻る
              </Link>
              
              <Form method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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