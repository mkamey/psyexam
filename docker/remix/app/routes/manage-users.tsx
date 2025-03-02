import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, Link, useActionData } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { getUser, requireAdmin } from "../../utils/session.server";
import bcrypt from "bcryptjs";

type ActionData = {
  error?: string;
  success?: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 管理者のみアクセス可能
  await requireAdmin(request);
  const currentUser = await getUser(request);
  
  // すべてのユーザーを取得
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
      isApproved: true,
      createdAt: true
    }
  });
  
  return json({ users, currentUser });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // 管理者のみアクセス可能
  await requireAdmin(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add") {
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const fullName = formData.get("fullName") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
   
    if (!username || !password || !email || !fullName) {
      return json<ActionData>({ error: "すべての必須フィールドを入力してください。" }, { status: 400 });
    }

    // パスワードの最小長チェック
    if (password.length < 8) {
      return json<ActionData>({ error: "パスワードは8文字以上である必要があります。" }, { status: 400 });
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await prisma.user.create({
        data: { 
          username,
          email,
          fullName,
          password: hashedPassword,
          role: role || "doctor", // デフォルトはdoctor
          isApproved: true // 管理者が作成したユーザーは自動承認
        }
      });
      return json<ActionData>({ success: "ユーザーが正常に作成されました" });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return json<ActionData>({ error: "このユーザー名またはメールアドレスは既に使用されています。" }, { status: 400 });
      }
      return json<ActionData>({ error: "ユーザーの作成に失敗しました。" }, { status: 500 });
    }
  } else if (intent === "delete") {
    const userId = Number(formData.get("userId"));
    if (!isNaN(userId)) {
      try {
        await prisma.user.delete({ where: { id: userId } });
        return json<ActionData>({ success: "ユーザーが正常に削除されました" });
      } catch (error) {
        return json<ActionData>({ error: "ユーザーの削除に失敗しました。" }, { status: 500 });
      }
    }
  } else if (intent === "approve") {
    const userId = Number(formData.get("userId"));
    if (!isNaN(userId)) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isApproved: true }
        });
        return json<ActionData>({ success: "ユーザーが承認されました" });
      } catch (error) {
        return json<ActionData>({ error: "ユーザー承認に失敗しました。" }, { status: 500 });
      }
    }
  } else if (intent === "unapprove") {
    const userId = Number(formData.get("userId"));
    if (!isNaN(userId)) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isApproved: false }
        });
        return json<ActionData>({ success: "ユーザーの承認が取り消されました" });
      } catch (error) {
        return json<ActionData>({ error: "ユーザー承認取消に失敗しました。" }, { status: 500 });
      }
    }
  }

  return redirect("/manage-users");
};

export default function ManageUsers() {
  const { users, currentUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">ユーザー管理</h1>
      
      {actionData?.error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{actionData.error}</p>
        </div>
      )}
      
      {actionData?.success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
          <p className="text-green-700">{actionData.success}</p>
        </div>
      )}
      
      {/* ユーザー追加フォーム */}
      <div className="mb-8 border p-6 rounded-lg bg-gray-50">
        <h2 className="text-xl font-bold mb-4">新規ユーザー作成</h2>
        <Form method="post" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-700 mb-1">ユーザー名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="username"
              className="w-full border rounded p-2"
              required
              minLength={3}
              maxLength={50}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
            <input
              type="email"
              name="email"
              className="w-full border rounded p-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">氏名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="fullName"
              className="w-full border rounded p-2"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">パスワード <span className="text-red-500">*</span></label>
            <input
              type="password"
              name="password"
              className="w-full border rounded p-2"
              required
              minLength={8}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-1">役割 <span className="text-red-500">*</span></label>
            <select name="role" className="w-full border rounded p-2">
              <option value="doctor">医師</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <button
              type="submit"
              name="intent"
              value="add"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded"
            >
              ユーザーを追加
            </button>
          </div>
        </Form>
      </div>

      {/* ユーザー一覧 */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">ユーザー一覧</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">ユーザー名</th>
                <th className="py-2 px-4 border-b text-left">メール</th>
                <th className="py-2 px-4 border-b text-left">氏名</th>
                <th className="py-2 px-4 border-b text-left">役割</th>
                <th className="py-2 px-4 border-b text-left">承認状態</th>
                <th className="py-2 px-4 border-b text-left">作成日</th>
                <th className="py-2 px-4 border-b text-left">アクション</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{user.username}</td>
                  <td className="py-2 px-4 border-b">{user.email}</td>
                  <td className="py-2 px-4 border-b">{user.fullName}</td>
                  <td className="py-2 px-4 border-b">
                    <span className={`px-2 py-1 rounded text-xs ${user.role.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b">
                    <span className={`px-2 py-1 rounded text-xs ${user.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {user.isApproved ? '承認済み' : '承認待ち'}
                    </span>
                  </td>
                  <td className="py-2 px-4 border-b text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <div className="flex space-x-2">
                      {/* 自分自身は削除できない */}
                      {currentUser?.id !== user.id && (
                        <Form method="post" className="inline">
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            name="intent"
                            value="delete"
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                            onClick={e => {
                              if (!confirm("このユーザーを削除してもよろしいですか?")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            削除
                          </button>
                        </Form>
                      )}
                      
                      {/* 承認ボタン */}
                      {!user.isApproved && (
                        <Form method="post" className="inline">
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            name="intent"
                            value="approve"
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            承認
                          </button>
                        </Form>
                      )}
                      
                      {/* 承認取消ボタン */}
                      {user.isApproved && currentUser?.id !== user.id && (
                        <Form method="post" className="inline">
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            name="intent"
                            value="unapprove"
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                          >
                            承認取消
                          </button>
                        </Form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Link
        to="/index_doctor"
        className="block text-center text-blue-500 hover:text-blue-600 mt-6"
      >
        戻る
      </Link>
    </div>
  );
}