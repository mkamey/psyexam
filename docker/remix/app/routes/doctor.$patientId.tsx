import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { requireApprovedUser } from "../../utils/session.server";
import React, { useState } from "react";
import axios from "axios";

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
  const resultId = formData.get("resultId") ? Number(formData.get("resultId")) : null;

  if (!patientId || (!examId && actionType !== "analyze")) {
    return json({ error: "Invalid data" }, { status: 400 });
  }

  if (actionType === "delete") {
    await prisma.stackedExam.deleteMany({
      where: { patientId, examId },
    });
    return redirect(`/doctor/${patientId}`);
  } else if (actionType === "add") {
    const exists = await prisma.stackedExam.findFirst({
      where: { patientId, examId },
    });

    if (!exists) {
      await prisma.stackedExam.create({
        data: { patientId, examId },
      });
    }
    return redirect(`/doctor/${patientId}`);
  } else if (actionType === "analyze" && resultId) {
    // 解析処理は別途クライアントサイドで行う
    return json({ status: "ok", resultId });
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

// 解析結果の型定義
type AnalysisResult = {
  id: number;
  total_score: number;
  severity: string;
  interpretation: string;
  details: {
    item_scores: { [key: string]: number };
    domain_analysis: {
      [key: string]: {
        items: string[];
        score: number;
        max_score: number;
        severity: string;
      }
    }
  }
};

export default function DoctorPatientPage() {
  const { results, patientId, stackedExams, availableExams } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [localStackedExams, setLocalStackedExams] = useState<StackedExam[]>(stackedExams);
  const [localAvailableExams, setLocalAvailableExams] = useState<Exam[]>(availableExams);
  const [analyzing, setAnalyzing] = useState<{ [key: number]: boolean }>({});
  const [analysisResults, setAnalysisResults] = useState<{ [key: number]: AnalysisResult | null }>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // FastAPIのURLを環境変数から取得（ブラウザからのアクセス用）
  const FASTAPI_URL = "http://localhost:8110";

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
  
  // 検査解析処理
  const analyzeResult = async (resultId: number) => {
    try {
      // 解析中のフラグを設定
      setAnalyzing(prev => ({ ...prev, [resultId]: true }));
      setAnalysisError(null);
      
      // FastAPIサーバーに解析リクエストを送信
      const response = await axios.post(`${FASTAPI_URL}/api/analyze/${resultId}`);
      
      if (response.data) {
        // 解析結果を保存
        setAnalysisResults(prev => ({
          ...prev,
          [resultId]: response.data
        }));
      }
    } catch (error) {
      console.error('解析エラー:', error);
      setAnalysisError('解析処理中にエラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      // 解析中フラグを解除
      setAnalyzing(prev => ({ ...prev, [resultId]: false }));
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">検査結果</h1>
      
      {/* エラーメッセージ表示 */}
      {analysisError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{analysisError}</span>
        </div>
      )}
      
      {results.length > 0 ? (
        <table className="w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-blue-500 dark:bg-blue-700 text-white">
              <th className="p-2">検査名</th>
              <th className="p-2">スコア</th>
              <th className="p-2">日付</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <React.Fragment key={`result-group-${result.id}`}>
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2 text-gray-900 dark:text-gray-100">{result.exam.examname}</td>
                  <td className="p-2 text-gray-900 dark:text-gray-100">
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const itemKey = `item${i}` as keyof typeof result;
                        const value = result[itemKey] !== null ? String(result[itemKey]) : "N/A";
                        return (
                          <span key={`item-${result.id}-${i}`}>
                            {value}{i < 9 ? ", " : ""}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-2 text-gray-900 dark:text-gray-100">{new Date(result.createdAt).toLocaleDateString()}</td>
                  <td className="p-2">
                    <button
                      onClick={() => analyzeResult(result.id)}
                      disabled={analyzing[result.id]}
                      className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded disabled:bg-gray-400"
                    >
                      {analyzing[result.id] ? "解析中..." : "解析"}
                    </button>
                  </td>
                </tr>
                
                {/* 解析結果の表示 */}
                {analysisResults[result.id] && (
                  <tr key={`analysis-${result.id}`} className="bg-gray-100 dark:bg-gray-900">
                    <td colSpan={4} className="p-4">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-inner">
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">解析結果</h3>
                        <div className="mb-2">
                          <span className="font-semibold">総合スコア: </span>
                          <span>{analysisResults[result.id]!.total_score}</span>
                        </div>
                        <div className="mb-2">
                          <span className="font-semibold">重症度: </span>
                          <span>{analysisResults[result.id]!.severity}</span>
                        </div>
                        <div className="mb-4">
                          <span className="font-semibold">解釈: </span>
                          <p className="mt-1">{analysisResults[result.id]!.interpretation}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">領域別分析:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(analysisResults[result.id]!.details.domain_analysis).map(([domain, data]) => (
                              <div key={domain} className="border rounded p-3 dark:border-gray-700">
                                <h5 className="font-semibold">{domain}</h5>
                                <div>スコア: {data.score}/{data.max_score}</div>
                                <div>重症度: {data.severity}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
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
