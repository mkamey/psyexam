import { json, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, Link } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import bcrypt from "bcryptjs";

export const loader = async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true
    }
  });
  return json({ users });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add") {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
   
    if (!username || !password) {
      return json({ error: "ユーザー名とパスワードは必須です。" }, { status: 400 });
    }

    // パスワードの最小長チェック
    if (password.length < 8) {
      return json({ error: "パスワードは8文字以上である必要があります。" }, { status: 400 });
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await prisma.user.create({
        data: { 
          username,
          password: hashedPassword,
          role: role || "doctor" // デフォルトはdoctor
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return json({ error: "このユーザー名は既に使用されています。" }, { status: 400 });
      }
      return json({ error: "ユーザーの作成に失敗しました。" }, { status: 500 });
    }
  } else if (intent === "delete") {
    const userId = Number(formData.get("userId"));
    if (!isNaN(userId)) {
      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch (error) {
        return json({ error: "ユーザーの削除に失敗しました。" }, { status: 500 });
      }
    }
  }

  return redirect("/manage-users");
};

export default function ManageUsers() {
  const { users } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">ユーザー管理</h1>
      
      {/* ユーザー追加フォーム */}
      <Form method="post" className="mb-6 space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">ユーザー名</label>
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
          <label className="block text-gray-700 mb-1">パスワード</label>
          <input
            type="password"
            name="password"
            className="w-full border rounded p-2"
            required
            minLength={8}
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-1">役割</label>
          <select name="role" className="w-full border rounded p-2">
            <option value="doctor">医師</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        
        <button
          type="submit"
          name="intent"
          value="add"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold p-2 rounded"
        >
          ユーザーを追加
        </button>
      </Form>

      {/* ユーザー一覧 */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">ユーザー一覧</h2>
        <div className="space-y-2">
          {users.map(user => (
            <div
              key={user.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded"
            >
              <div>
                <span className="font-medium">{user.username}</span>
                <span className="ml-2 text-sm text-gray-600">({user.role})</span>
                <span className="block text-xs text-gray-500">
                  作成日: {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <Form method="post" className="ml-4">
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  name="intent"
                  value="delete"
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  onClick={e => {
                    if (!confirm("このユーザーを削除してもよろしいですか？")) {
                      e.preventDefault();
                    }
                  }}
                >
                  削除
                </button>
              </Form>
            </div>
          ))}
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