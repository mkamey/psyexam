import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { requireApprovedUser } from "../../utils/session.server";
import React, { useState, useEffect } from "react";
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

  // 検査セットを取得
  const examSets = await prisma.examSet.findMany({
    include: {
      examSetItems: {
        include: {
          exam: true
        }
      }
    }
  });

  return json({ results, patientId, stackedExams, availableExams, examSets });
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
  const examSetId = formData.get("examSetId") ? Number(formData.get("examSetId")) : null;

  if (!patientId || ((!examId && actionType !== "analyze" && actionType !== "addFromExamSet"))) {
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
  } else if (actionType === "addFromExamSet" && examSetId) {
    // 検査セットから複数の検査を一括追加
    const examSetItems = await prisma.examSetItem.findMany({
      where: { examSetId },
      include: { exam: true }
    });

    // 患者の既存の検査を取得
    const existingExams = await prisma.stackedExam.findMany({
      where: { patientId },
      select: { examId: true }
    });
    
    const existingExamIds = existingExams.map(item => item.examId);
    
    // 重複しない検査を追加
    for (const item of examSetItems) {
      if (!existingExamIds.includes(item.examId)) {
        await prisma.stackedExam.create({
          data: {
            patientId,
            examId: item.examId
          }
        });
      }
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
  createdAt: string | Date;
  [key: `item${number}`]: number | null; // item0, item1, ... などの動的なプロパティ
};

// 解析結果の型定義
type AnalysisResult = {
  id: number;
  total_score: number;
  severity: string;
  interpretation: string;
  result_id: number;
  exam_id: number;
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

// ドーナツグラフコンポーネント
const DonutChart = ({ score, maxScore, severity }: { score: number, maxScore: number, severity: string }) => {

  // 円の中心点と半径を設定
  const centerX = 70;
  const centerY = 70;
  const radius = 60;
  const strokeWidth = 12;
  
  // スコアの割合を計算
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // 重症度によって色を変更
  const getColor = () => {
    switch(severity.toLowerCase()) {
      case 'severe':
      case '重度':
        return '#ef4444'; // red-500
      case 'moderate':
      case '中等度':
        return '#f97316'; // orange-500
      case 'mild':
      case '軽度':
        return '#facc15'; // yellow-400
      case 'normal':
      case '正常':
      default:
        return '#10b981'; // emerald-500
    }
  };
  
  return (
    <svg width="100%" height="100%" viewBox="0 0 140 140">
      {/* 背景の円 */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="transparent"
        stroke="#e5e7eb" // gray-200
        strokeWidth={strokeWidth}
      />
      
      {/* スコアを表す円弧 */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="transparent"
        stroke={getColor()}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${centerX} ${centerY})`}
      />
      
      {/* 中央のテキスト */}
      <text
        x={centerX}
        y={centerY - 10}
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="#1f2937" // gray-800
        className="dark:fill-white"
      >
        {Math.round(percentage)}%
      </text>
      <text
        x={centerX}
        y={centerY + 10}
        textAnchor="middle"
        fontSize="12"
        fill="#6b7280" // gray-500
        className="dark:fill-gray-300"
      >
        {score}/{maxScore}
      </text>
    </svg>
  );
};

// 時系列グラフコンポーネント
const TimeSeriesChart = ({ 
  data, 
  examName,
  cutoff
}: { 
  data: { date: string; totalScore: number }[], 
  examName: string,
  cutoff: number
}) => {
  // グラフのサイズと余白を設定
  const width = 800;
  const height = 250;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  
  // データポイントの最大値を取得
  const maxScore = Math.max(...data.map(d => d.totalScore), cutoff);
  
  // スケールを設定
  const xScale = data.map((_, i) => i * ((width - padding.left - padding.right) / (data.length - 1)));
  const yScale = (score: number) => {
    return height - padding.bottom - ((score / (maxScore * 1.1)) * (height - padding.top - padding.bottom));
  };
  
  // データポイントを設定
  const points = data.map((d, i) => ({
    x: padding.left + xScale[i],
    y: yScale(d.totalScore),
    score: d.totalScore,
    date: d.date
  }));
  
  // 折れ線のパスを生成
  const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  
  // カットオフライン(基準値)のY座標
  const cutoffY = yScale(cutoff);
  
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {/* タイトル */}
      <text x={width / 2} y={padding.top} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1f2937" className="dark:fill-white">
        {examName}の時系列データ
      </text>
      
      {/* X軸 */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#9ca3af" // gray-400
        strokeWidth="1"
      />
      
      {/* Y軸 */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#9ca3af" // gray-400
        strokeWidth="1"
      />
      
      {/* X軸ラベル */}
      {points.map((point, i) => (
        <g key={`x-label-${i}`}>
          <line
            x1={point.x}
            y1={height - padding.bottom}
            x2={point.x}
            y2={height - padding.bottom + 5}
            stroke="#9ca3af" // gray-400
            strokeWidth="1"
          />
          <text
            x={point.x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280" // gray-500
            className="dark:fill-gray-300"
          >
            {point.date}
          </text>
        </g>
      ))}
      
      {/* Y軸ラベル (5分割) */}
      {Array.from({ length: 6 }).map((_, i) => {
        const yValue = Math.round((maxScore * 1.1) * (i / 5));
        const y = yScale(yValue);
        return (
          <g key={`y-label-${i}`}>
            <line
              x1={padding.left - 5}
              y1={y}
              x2={padding.left}
              y2={y}
              stroke="#9ca3af" // gray-400
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#6b7280" // gray-500
              className="dark:fill-gray-300"
            >
              {yValue}
            </text>
          </g>
        );
      })}
      
      {/* カットオフライン */}
      <line
        x1={padding.left}
        y1={cutoffY}
        x2={width - padding.right}
        y2={cutoffY}
        stroke="#ef4444" // red-500
        strokeWidth="1"
        strokeDasharray="4,4"
      />
      <text
        x={width - padding.right + 5}
        y={cutoffY + 4}
        textAnchor="start"
        fontSize="10"
        fill="#ef4444" // red-500
      >
        カットオフ: {cutoff}
      </text>
      
      {/* データの折れ線 */}
      <path
        d={linePath}
        fill="none"
        stroke="#3b82f6" // blue-500
        strokeWidth="2"
      />
      
      {/* データポイント */}
      {points.map((point, i) => (
        <g key={`point-${i}`}>
          <circle
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3b82f6" // blue-500
          />
          <text
            x={point.x}
            y={point.y - 10}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#1f2937" // gray-800
            className="dark:fill-white"
          >
            {point.score}
          </text>
        </g>
      ))}
    </svg>
  );
};

export default function DoctorPatientPage() {
  const { results, patientId, stackedExams, availableExams, examSets } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [localStackedExams, setLocalStackedExams] = useState<StackedExam[]>(stackedExams);
  const [localAvailableExams, setLocalAvailableExams] = useState<Exam[]>(availableExams);
  const [analyzing, setAnalyzing] = useState<{ [key: number]: boolean }>({});
  const [analysisResults, setAnalysisResults] = useState<{ [key: number]: AnalysisResult | null }>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [examResultsMap, setExamResultsMap] = useState<{ [examId: number]: Result[] }>({});
  const [timeSeriesData, setTimeSeriesData] = useState<{ [examId: number]: { date: string; totalScore: number }[] }>({});
  const [selectedExamSetId, setSelectedExamSetId] = useState<number | null>(null);
  
  // FastAPIのURLを環境変数から取得(ブラウザからのアクセス用)
  const FASTAPI_URL = "http://localhost:8110";

  // 検査IDごとに結果をグループ化する
  useEffect(() => {
    const examResults: { [examId: number]: Result[] } = {};
    results.forEach(result => {
      if (!examResults[result.examId]) {
        examResults[result.examId] = [];
      }
      examResults[result.examId].push(result);
    });
    
    // 各検査の時系列データを構築
    const timeSeriesMap: { [examId: number]: { date: string; totalScore: number }[] } = {};
    
    // 検査IDごとに時系列データを構築
    Object.entries(examResults).forEach(([examId, resultList]) => {
      // 結果が1件でも時系列データを準備するように修正(以前は2件以上のみ)
      if (resultList.length > 0) {
        console.log(`検査ID ${examId} の結果数: ${resultList.length}`);
        const sortedResults = [...resultList].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // 時系列データの準備
        timeSeriesMap[Number(examId)] = sortedResults.map(result => {
          // 各resultからtotal_scoreを計算 (item0 ~ item9の合計)
          let totalScore = 0;
          for (let i = 0; i < 10; i++) {
            const itemValue = result[`item${i}` as keyof typeof result];
            if (itemValue !== null) {
              totalScore += Number(itemValue);
            }
          }
          
          console.log(`日付: ${new Date(result.createdAt).toLocaleDateString()}, スコア: ${totalScore}`);
          return {
            date: new Date(result.createdAt).toLocaleDateString(),
            totalScore: totalScore
          };
        });
      }
    });
    
    setExamResultsMap(examResults);
    setTimeSeriesData(timeSeriesMap);
  }, [results]);
  
  // 追加の解析結果をロードする
  useEffect(() => {
    const loadAnalysisResults = async () => {
      for (const result of results) {
        try {
          const response = await axios.get(`${FASTAPI_URL}/api/analysis/result/${result.id}`);
          if (response.data) {
            setAnalysisResults(prev => ({
              ...prev,
              [result.id]: response.data
            }));
          }
        } catch (error) {
          // 解析結果がない場合は無視
          console.log(`Result ${result.id} has no analysis yet`);
        }
      }
    };
    
    loadAnalysisResults();
  }, [results]);

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
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                          <div className="flex-1">
                            <div className="mb-2">
                              <span className="font-semibold">総合スコア: </span>
                              <span>{analysisResults[result.id]!.total_score}</span>
                            </div>
                            <div className="mb-2">
                              <span className="font-semibold">重症度: </span>
                              <span>{analysisResults[result.id]!.severity}</span>
                            </div>
                          </div>
                        
                          {/* ドーナツグラフ表示 - サイズ拡大 */}
                          <div className="w-48 h-48 relative flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
                            <div className="absolute top-2 left-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                              総合スコア
                            </div>
                            <DonutChart
                              score={analysisResults[result.id]!.total_score}
                              maxScore={Object.values(analysisResults[result.id]!.details.domain_analysis).reduce(
                                (sum, domain) => sum + domain.max_score, 0
                              )}
                              severity={analysisResults[result.id]!.severity}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <span className="font-semibold">解釈: </span>
                          <p className="mt-1">{analysisResults[result.id]!.interpretation}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">領域別分析:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(analysisResults[result.id]!.details.domain_analysis).map(([domain, data]) => (
                              <div key={domain} className="border rounded p-3 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                                <h5 className="font-semibold text-gray-900 dark:text-white">{domain}</h5>
                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">スコア: {data.score}/{data.max_score}</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                      data.severity.toLowerCase().includes('重度') || data.severity.toLowerCase().includes('severe')
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        : data.severity.toLowerCase().includes('中等度') || data.severity.toLowerCase().includes('moderate')
                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                        : data.severity.toLowerCase().includes('軽度') || data.severity.toLowerCase().includes('mild')
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                      {data.severity}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                    <div
                                      className={`h-2.5 rounded-full ${
                                        data.severity.toLowerCase().includes('重度') || data.severity.toLowerCase().includes('severe')
                                          ? 'bg-red-500'
                                          : data.severity.toLowerCase().includes('中等度') || data.severity.toLowerCase().includes('moderate')
                                          ? 'bg-orange-500'
                                          : data.severity.toLowerCase().includes('軽度') || data.severity.toLowerCase().includes('mild')
                                          ? 'bg-yellow-400'
                                          : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${(data.score / data.max_score) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* 時系列データがある場合は時系列グラフを表示 - 修正：1件のみでも表示 */}
                      {timeSeriesData[result.examId] && timeSeriesData[result.examId].length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">時系列データ:</h4>
                          <div className="h-64 w-full">
                            <TimeSeriesChart 
                              data={timeSeriesData[result.examId]} 
                              examName={result.exam.examname}
                              cutoff={result.exam.cutoff}
                            />
                          </div>
                        </div>
                      )}
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

      {/* 検査セットから追加 */}
      <section className="mb-8 mt-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">検査セットから追加</h2>
        {examSets && examSets.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="mb-4">
              <label htmlFor="examSetSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                検査セットを選択
              </label>
              <div className="flex gap-4 items-end">
                <select
                  id="examSetSelect"
                  value={selectedExamSetId || ""}
                  onChange={(e) => setSelectedExamSetId(e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex-grow focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                >
                  <option value="">-- 検査セットを選択 --</option>
                  {examSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name} ({set.examSetItems.length}件の検査)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedExamSetId) {
                      fetcher.submit(
                        {
                          patientId: patientId.toString(),
                          examSetId: selectedExamSetId.toString(),
                          actionType: "addFromExamSet"
                        },
                        { method: "POST" }
                      );
                      // 選択をリセット
                      setSelectedExamSetId(null);
                    } else {
                      alert("検査セットを選択してください");
                    }
                  }}
                  disabled={!selectedExamSetId}
                  className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors duration-300"
                >
                  検査セットを追加
                </button>
              </div>
            </div>
            
            {selectedExamSetId && (
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2 text-gray-800 dark:text-gray-200">
                  含まれる検査:
                </h3>
                <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                  {examSets.find(set => set.id === selectedExamSetId)?.examSetItems.map(item => (
                    <li key={item.id}>{item.exam.examname}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ※ 検査セットを編集するには <a href="/edit_exam_sets" className="text-blue-600 dark:text-blue-400 hover:underline">こちら</a>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-gray-500 dark:text-gray-400">検査セットがありません</p>
            <a href="/edit_exam_sets" className="text-blue-600 dark:text-blue-400 hover:underline">
              検査セット管理ページで検査セットを作成する
            </a>
          </div>
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
