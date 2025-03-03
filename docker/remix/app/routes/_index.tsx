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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-6 transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">IDを入力してください</h1>
      <Form method="post" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">
          ID:
          <input
            type="number"
            name="patientId"
            required
            className="mt-1 p-2 w-full border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </label>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded-md mt-4 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          ひらく
        </button>
      </Form>
    </div>
  );
}
