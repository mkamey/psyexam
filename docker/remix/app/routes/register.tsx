import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { createUserSession, getUserId } from "../../utils/session.server";
import { prisma } from "../../utils/db.server";
import bcrypt from "bcryptjs";

type ActionData = {
  errors?: {
    username?: string | null;
    email?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
    fullName?: string | null;
    userType?: string | null;
    _form?: string | null;
  };
  values?: {
    username?: string | null;
    email?: string | null;
    fullName?: string | null;
    userType?: string | null;
  };
};

export const meta: MetaFunction = () => {
  return [
    { title: "新規ユーザー登録 | 心理検査システム" },
    { name: "description", content: "心理検査システムの新規ユーザー登録ページです" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // すでにログインしている場合はリダイレクト
  const userId = await getUserId(request);
  if (userId) return redirect("/index_doctor");
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const username = formData.get("username");
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const fullName = formData.get("fullName");
  const userType = formData.get("userType");

  const errors: Record<string, string | null> = {};

  // バリデーション
  if (typeof username !== "string" || username.length < 3) {
    errors.username = "ユーザー名は3文字以上で入力してください";
  }

  if (typeof email !== "string" || !email.includes("@")) {
    errors.email = "有効なメールアドレスを入力してください";
  }

  if (typeof password !== "string" || password.length < 8) {
    errors.password = "パスワードは8文字以上で入力してください";
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "パスワードが一致しません";
  }

  if (typeof fullName !== "string" || fullName.length === 0) {
    errors.fullName = "氏名を入力してください";
  }

  if (typeof userType !== "string" || (userType !== "doctor" && userType !== "admin")) {
    errors.userType = "有効なユーザータイプを選択してください";
  }

  // エラーがある場合は再描画
  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ 
      errors, 
      values: { 
        username: username?.toString() || null,
        email: email?.toString() || null,
        fullName: fullName?.toString() || null,
        userType: userType?.toString() || null
      } 
    }, { status: 400 });
  }

  try {
    // ユーザー名とメールアドレスが既に使われていないかチェック
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username as string },
          { email: email as string }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return json<ActionData>({ 
          errors: { username: "このユーザー名は既に使用されています" },
          values: { 
            username: username?.toString() || null,
            email: email?.toString() || null,
            fullName: fullName?.toString() || null,
            userType: userType?.toString() || null
          } 
        }, { status: 400 });
      }
      if (existingUser.email === email) {
        return json<ActionData>({ 
          errors: { email: "このメールアドレスは既に使用されています" },
          values: { 
            username: username?.toString() || null,
            email: email?.toString() || null,
            fullName: fullName?.toString() || null,
            userType: userType?.toString() || null
          } 
        }, { status: 400 });
      }
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password as string, 10);

    // ユーザー作成
    const newUser = await prisma.user.create({
      data: {
        username: username as string,
        email: email as string,
        password: hashedPassword,
        fullName: fullName as string,
        role: userType as string,
        isApproved: false // デフォルトは承認待ち状態
      }
    });

    // セッション作成と承認待ちページへリダイレクト
    return createUserSession(newUser.id, "/waiting-approval");
    
  } catch (error) {
    console.error("ユーザー登録エラー:", error);
    return json<ActionData>({ 
      errors: { _form: "ユーザー登録に失敗しました。後でもう一度お試しください。" } 
    }, { status: 500 });
  }
};

export default function Register() {
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img className="mx-auto h-16 w-auto" src="/logo-dark.png" alt="心理検査システム" />
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          新規ユーザー登録
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Form method="post" className="space-y-6">
            {actionData?.errors?._form && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{actionData.errors._form}</div>
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                ユーザー名 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  defaultValue={actionData?.values?.username || ""}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              {actionData?.errors?.username && (
                <p className="mt-2 text-sm text-red-600">{actionData.errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  defaultValue={actionData?.values?.email || ""}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              {actionData?.errors?.email && (
                <p className="mt-2 text-sm text-red-600">{actionData.errors.email}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                氏名 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  defaultValue={actionData?.values?.fullName || ""}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              {actionData?.errors?.fullName && (
                <p className="mt-2 text-sm text-red-600">{actionData.errors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              {actionData?.errors?.password && (
                <p className="mt-2 text-sm text-red-600">{actionData.errors.password}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード(確認) <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              {actionData?.errors?.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">{actionData.errors.confirmPassword}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                ユーザータイプ <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <select
                  id="userType"
                  name="userType"
                  required
                  defaultValue={actionData?.values?.userType || "doctor"}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="doctor">医師</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
              {actionData?.errors?.userType && (
                <p className="mt-2 text-sm text-red-600">{actionData.errors.userType}</p>
              )}
            </div>
            
            <div>
              <p className="text-xs text-gray-500">
                <span className="text-red-500">*</span> 必須項目
              </p>
              <p className="mt-1 text-xs text-gray-500">
                ※ 登録後は管理者の承認が必要です。承認されるまでは一部機能にアクセスできません。
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? "登録中..." : "登録する"}
              </button>
            </div>
          </Form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">すでにアカウントをお持ちの方</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="flex w-full justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                ログインページへ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}