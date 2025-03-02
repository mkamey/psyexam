import { json, type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { prisma } from "../../utils/db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const patientId = Number(formData.get("patientId"));

  if (isNaN(patientId)) {
    return json({ error: "Invalid Patient ID" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    return { error: "該当する患者IDが見つかりません" };
  }
  return redirect(`/patient/${patientId}`);
};

export default function Index() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">IDを入力してください</h1>
      <Form method="post" className="bg-white p-6 rounded-lg shadow-md">
        <label className="block text-gray-700 mb-2">
          ID:
          <input type="number" name="patientId" required className="mt-1 p-2 w-full border rounded-md" />
        </label>
        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded-md mt-4 hover:bg-blue-600">
          ひらく
        </button>
      </Form>
    </div>
  );
}
