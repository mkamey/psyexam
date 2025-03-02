import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form, Link } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { requireApprovedUser } from "../../utils/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);
  
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" }
  });
  return json({ patients });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add") {
    const id = Number(formData.get("id"));
    const sex = Number(formData.get("sex"));
    const birthdate = formData.get("birthdate") as string;
    const initial = formData.get("initial") as string;
  
    if (isNaN(id) || !birthdate || !initial) {
      return json({ error: "すべての項目を正しく入力してください。" }, { status: 400 });
    }
    try {
        await prisma.patient.create({
            data: { id, initial, birthdate: new Date(birthdate), sex }
          });
      } catch (error) {
        return json({ error: "このIDは既に使用されています。" }, { status: 400 });
      }
  } else if (intent === "delete") {
    const patientId = Number(formData.get("patientId"));
    if (!isNaN(patientId)) {
      await prisma.patient.delete({ where: { id: patientId } });
    }
  }

  return redirect("/edit_patients");
};

export default function ManagePatients() {
  const { patients } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">患者管理</h1>
      <Form method="post" className="mb-4">
      <div className="mb-2">
          <label className="block text-gray-700">患者ID</label>
          <input type="number" name="id" className="w-full border p-2 rounded" required />
        </div>
        <div className="mb-2">
          <label className="block text-gray-700">イニシャル</label>
          <input type="text" name="initial" className="w-full border p-2 rounded" required />
        </div>
        <div className="mb-2">
          <label className="block text-gray-700">生年月日</label>
          <input type="date" name="birthdate" className="w-full border p-2 rounded" required />
        </div>
        <div className="mb-2">
          <label className="block text-gray-700">性別</label>
          <select name="sex" className="w-full border p-2 rounded">
            <option value="1">男性</option>
            <option value="2">女性</option>
            <option value="3">その他</option>
          </select>
        </div>
        <button type="submit" name="intent" value="add" className="w-full bg-blue-500 text-white p-2 rounded mt-2">追加</button>
      </Form>
      <h2 className="text-xl font-bold mb-2">患者一覧</h2>
      <ul>
        {patients.map(patient => (
          <li key={patient.id} className="flex justify-between items-center p-2 border-b">
            <span>{patient.initial} ({patient.birthdate.split("T")[0]})</span>
            <Form method="post">
              <input type="hidden" name="patientId" value={patient.id} />
              <button type="submit" name="intent" value="delete" className="bg-red-500 text-white px-3 py-1 rounded">削除</button>
            </Form>
          </li>
        ))}
      </ul>
      <Link to="/index_doctor" className="block text-center text-blue-500 mt-4">戻る</Link>
    </div>
  );
}
