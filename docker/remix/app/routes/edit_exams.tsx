import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { requireApprovedUser } from "../../utils/session.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);
  
  const exams = await prisma.exam.findMany();
  return json({ exams });
};

// `action`: Exam の追加・削除を処理
export const action = async ({ request }: ActionFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);
  
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "add") {
    const examName = formData.get("examName") as string;
    const cutoff = Number(formData.get("cutoff"));

    if (!examName || isNaN(cutoff)) {
      return json({ error: "検査名とカットオフ値を正しく入力してください" }, { status: 400 });
    }

    await prisma.exam.create({
      data: { examname: examName, cutoff },
    });
  }

  if (actionType === "delete") {
    const examId = Number(formData.get("examId"));

    if (isNaN(examId)) {
      return json({ error: "無効な検査IDです" }, { status: 400 });
    }

    await prisma.exam.delete({
      where: { id: examId },
    });
  }

  return null;
};

// フロント側
export default function ExamPage() {
  const { exams } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [examName, setExamName] = useState("");
  const [cutoff, setCutoff] = useState("");

  // Exam 追加処理
  const addExam = () => {
    if (!examName || !cutoff) {
      alert("検査名とカットオフ値を入力してください");
      return;
    }
    
    fetcher.submit(
      { actionType: "add", examName, cutoff },
      { method: "POST" }
    );
    setExamName("");
    setCutoff("");
  };

  // Exam 削除処理
  const deleteExam = (examId: number) => {
    if (confirm("この検査を削除してもよろしいですか？")) {
      fetcher.submit(
        { actionType: "delete", examId: examId.toString() },
        { method: "POST" }
      );
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">検査管理</h1>

      {/* 追加フォーム */}
      <div className="mb-6">
        <input
          type="text"
          value={examName}
          onChange={(e) => setExamName(e.target.value)}
          placeholder="検査名"
          className="border p-2 mr-2 rounded"
        />
        <input
          type="number"
          value={cutoff}
          onChange={(e) => setCutoff(e.target.value)}
          placeholder="カットオフ値"
          className="border p-2 mr-2 rounded"
        />
        <button
          onClick={addExam}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          追加
        </button>
      </div>

      {/* 検査一覧 */}
      <ul className="space-y-2">
        {exams.map((exam) => (
          <li
            key={exam.id}
            className="flex justify-between border-b pb-2"
          >
            <span>{exam.examname} (カットオフ: {exam.cutoff})</span>
            <button
              onClick={() => deleteExam(exam.id)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <Link to="/index_doctor" className="block text-center text-blue-500 hover:text-blue-600 mt-4">戻る</Link>
    </div>
  );
}
