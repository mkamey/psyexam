import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
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

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await prisma.user.create({
        data: { 
          username,
          password: hashedPassword,
          role
        }
      });
    } catch (error) {
      return json({ error: "このユーザー名は既に使用されています。" }, { status: 400 });
    }
  } else if (intent === "delete") {
    const userId = Number(formData.get("userId"));
    if (!isNaN(userId)) {
      await prisma.user.delete({ where: { id: userId } });
    }
  }

  return redirect("/manage-users");
};

export default function ManageUsers() {
  const { users } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">ユーザー管理</h1>
      <Form method="post" className="mb-4">
        <div className="mb-2">
          <label className="block text-gray-700">ユーザー名</label>
          <input type="text" name="username" className="w-full border p-2 rounded" required />
        </div>
        <div className="mb-2">
          <label className="block text-gray-700">パスワード</label>
          <input type="password" name="password" className="w-full border p-2 rounded" required />
        </div>
        <div className="mb-2">
          <label className="block text-gray-700">役割</label>
          <select name="role" className="w-full border p-2 rounded">
            <option value="doctor">医師</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        <button type="submit" name="intent" value="add" className="w-full bg-blue-500 text-white p-2 rounded mt-2">追加</button>
      </Form>
      <h2 className="text-xl font-bold mb-2">ユーザー一覧</h2>
      <ul>
        {users.map(user => (
          <li key={user.id} className="flex justify-between items-center p-2 border-b">
            <span>{user.username} ({user.role})</span>
            <Form method="post">
              <input type="hidden" name="userId" value={user.id} />
              <button type="submit" name="intent" value="delete" className="bg-red-500 text-white px-3 py-1 rounded">削除</button>
            </Form>
          </li>
        ))}
      </ul>
      <Link to="/index_doctor" className="block text-center text-blue-500 mt-4">戻る</Link>
    </div>
  );
}