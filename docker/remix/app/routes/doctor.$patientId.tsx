import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { requireApprovedUser } from "../../utils/session.server";
import { useState } from "react";

// Loader: データ取得
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);
  
  const patientId = Number(params.patientId);
  
  if (isNaN(patientId)) {
    throw new Response("Invalid patient ID", { status: 400 });
  }

  const results = await prisma.result.findMany({
    where: { patientId },
    include: { exam: true },
  });

  const stackedExams = await prisma.stackedExam.findMany({
    where: { patientId },
    include: { exam: true },
  });

  const allExams = await prisma.exam.findMany();
  const availableExams = allExams.filter(
    (exam) => !stackedExams.some((se) => se.examId === exam.id)
  );

  return json({ results, patientId, stackedExams, availableExams });
};

// Action: 削除・追加処理
export const action = async ({ request }: ActionFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);
  
  const formData = await request.formData();
  const patientId = Number(formData.get("patientId"));
  const examId = Number(formData.get("examId"));
  const actionType = formData.get("actionType");

  if (!patientId || !examId) {
    return json({ error: "Invalid data" }, { status: 400 });
  }

  if (actionType === "delete") {
    await prisma.stackedExam.deleteMany({
      where: { patientId, examId },
    });
  } else if (actionType === "add") {
    const exists = await prisma.stackedExam.findFirst({
      where: { patientId, examId },
    });

    if (!exists) {
      await prisma.stackedExam.create({
        data: { patientId, examId },
      });
    }
  }

  return redirect(`/doctor/${patientId}`);
};

type Exam = {
  id: number;
  examname: string;
  cutoff: number;
};

type StackedExam = {
  id: number;
  patientId: number;
  examId: number;
  exam: Exam;
};

type Result = {
  id: number;
  patientId: number;
  examId: number;
  exam: Exam;
  createdAt: Date;
  [key: `item${number}`]: number | null; // item0, item1, ... などの動的なプロパティ
};

export default function DoctorPatientPage() {
  const { results, patientId, stackedExams, availableExams } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [localStackedExams, setLocalStackedExams] = useState<StackedExam[]>(stackedExams);
  const [localAvailableExams, setLocalAvailableExams] = useState<Exam[]>(availableExams);

  // 検査削除処理
  const deleteStackedExam = (examId: number) => {
    fetcher.submit(
      { patientId: patientId.toString(), examId: examId.toString(), actionType: "delete" },
      { method: "POST" }
    );
    setLocalStackedExams((prev) => prev.filter((exam) => exam.examId !== examId));
    const examToAdd = stackedExams.find((se) => se.examId === examId)?.exam;
    if (examToAdd) {
      setLocalAvailableExams((prev) => [...prev, examToAdd]);
    }
  };

  // 検査追加処理
  const addStackedExam = (examId: number) => {
    fetcher.submit(
      { patientId: patientId.toString(), examId: examId.toString(), actionType: "add" },
      { method: "POST" }
    );
    const examToAdd = localAvailableExams.find((e) => e.id === examId);
    if (examToAdd) {
      setLocalStackedExams((prev) => [...prev, { id: 0, patientId, examId, exam: examToAdd }]);
      setLocalAvailableExams((prev) => prev.filter((exam) => exam.id !== examId));
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">検査結果</h1>
      {results.length > 0 ? (
        <table className="w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-blue-500 dark:bg-blue-700 text-white">
              <th className="p-2">検査名</th>
              <th className="p-2">スコア</th>
              <th className="p-2">日付</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-2 text-gray-900 dark:text-gray-100">{result.exam.examname}</td>
                <td className="p-2 text-gray-900 dark:text-gray-100">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const itemKey = `item${i}` as keyof typeof result;
                    return result[itemKey] !== null ? result[itemKey] : "N/A";
                  }).join(", ")}
                </td>
                <td className="p-2 text-gray-900 dark:text-gray-100">{new Date(result.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">データがありません</p>
      )}

      {/* 予定されている検査一覧 */}
      <section className="mb-8 mt-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">予定されている検査</h2>
        {localStackedExams.length > 0 ? (
          <table className="w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-red-500 dark:bg-red-700 text-white">
                <th className="p-2">検査名</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {localStackedExams.map((exam) => (
                <tr key={exam.examId} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2 text-gray-900 dark:text-gray-100">{exam.exam.examname}</td>
                  <td className="p-2">
                    <button
                      onClick={() => deleteStackedExam(exam.examId)}
                      className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 rounded"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">予定されている検査がありません</p>
        )}
      </section>

      {/* 検査追加 */}
      <section>
        <h2 className="text-xl font-semibold mb-2">追加できる検査</h2>
        {localAvailableExams.length > 0 ? (
          <table className="w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-green-500 dark:bg-green-700 text-white">
                <th className="p-2">検査名</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {localAvailableExams.map((exam) => (
                <tr key={exam.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2 text-gray-900 dark:text-gray-100">{exam.examname}</td>
                  <td className="p-2">
                    <button
                      onClick={() => addStackedExam(exam.id)}
                      className="bg-green-500 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded"
                    >
                      追加
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">追加できる検査はありません</p>
        )}
      </section>
      
      <div className="mt-8">
        <a 
          href="/index_doctor" 
          className="inline-block bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded"
        >
          戻る
        </a>
      </div>
    </div>
  );
}
