import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { requireApprovedUser } from "../../utils/session.server";
import { useState, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);

  const examSets = await prisma.examSet.findMany({
    include: {
      examSetItems: {
        include: {
          exam: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  const allExams = await prisma.exam.findMany({
    orderBy: {
      examname: 'asc'
    }
  });

  return json({ examSets, allExams });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // 承認済みユーザーのみアクセス可能
  await requireApprovedUser(request);

  const formData = await request.formData();
  const actionType = formData.get("actionType");

  // 検査セットの作成
  if (actionType === "create") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) {
      return json({ error: "検査セット名を入力してください" }, { status: 400 });
    }

    await prisma.examSet.create({
      data: { 
        name,
        description: description || undefined
      },
    });
  }

  // 検査セットの削除
  if (actionType === "delete") {
    const examSetId = Number(formData.get("examSetId"));

    if (isNaN(examSetId)) {
      return json({ error: "無効な検査セットIDです" }, { status: 400 });
    }

    await prisma.examSet.delete({
      where: { id: examSetId },
    });
  }

  // 検査セットに検査を追加
  if (actionType === "addExam") {
    const examSetId = Number(formData.get("examSetId"));
    const examId = Number(formData.get("examId"));

    if (isNaN(examSetId) || isNaN(examId)) {
      return json({ error: "無効なIDです" }, { status: 400 });
    }

    // 既に存在するかチェック
    const existingItem = await prisma.examSetItem.findFirst({
      where: {
        examSetId,
        examId
      }
    });

    if (!existingItem) {
      await prisma.examSetItem.create({
        data: {
          examSetId,
          examId
        }
      });
    }
  }

  // 検査セットから検査を削除
  if (actionType === "removeExam") {
    const examSetItemId = Number(formData.get("examSetItemId"));

    if (isNaN(examSetItemId)) {
      return json({ error: "無効な検査セット項目IDです" }, { status: 400 });
    }

    await prisma.examSetItem.delete({
      where: { id: examSetItemId }
    });
  }

  return null;
};

export default function EditExamSetsPage() {
  const { examSets, allExams } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedSetId, setExpandedSetId] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  // 検査セットの作成
  const createExamSet = () => {
    if (!name) {
      alert("検査セット名を入力してください");
      return;
    }

    fetcher.submit(
      { actionType: "create", name, description },
      { method: "POST" }
    );

    setName("");
    setDescription("");
  };

  // 検査セットの削除
  const deleteExamSet = (examSetId: number) => {
    if (confirm("この検査セットを削除してもよろしいですか？所属する検査項目も削除されます。")) {
      fetcher.submit(
        { actionType: "delete", examSetId: examSetId.toString() },
        { method: "POST" }
      );
    }
  };

  // 検査セットに検査を追加
  const addExamToSet = (examSetId: number) => {
    if (!selectedExamId) {
      alert("検査を選択してください");
      return;
    }

    fetcher.submit(
      { 
        actionType: "addExam", 
        examSetId: examSetId.toString(), 
        examId: selectedExamId.toString() 
      },
      { method: "POST" }
    );

    setSelectedExamId(null);
  };

  // 検査セットから検査を削除
  const removeExamFromSet = (examSetItemId: number) => {
    if (confirm("この検査を検査セットから削除してもよろしいですか？")) {
      fetcher.submit(
        { actionType: "removeExam", examSetItemId: examSetItemId.toString() },
        { method: "POST" }
      );
    }
  };

  // 検査セットの展開/折りたたみを切り替え
  const toggleExpand = (examSetId: number) => {
    if (expandedSetId === examSetId) {
      setExpandedSetId(null);
    } else {
      setExpandedSetId(examSetId);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">心理検査セット管理</h1>

      {/* 検査セット作成フォーム */}
      <div className="mb-8 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">新しい検査セットを作成</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              検査セット名
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 抑うつ経過"
              className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              説明（任意）
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このセットの説明や用途を入力してください"
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
            />
          </div>
          <button
            onClick={createExamSet}
            className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors duration-300"
          >
            検査セットを作成
          </button>
        </div>
      </div>

      {/* 検査セット一覧 */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">検査セット一覧</h2>
        {examSets.length > 0 ? (
          <div className="space-y-4">
            {examSets.map((examSet) => (
              <div key={examSet.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                {/* 検査セットヘッダー */}
                <div 
                  className="bg-gray-100 dark:bg-gray-750 p-4 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleExpand(examSet.id)}
                >
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{examSet.name}</h3>
                    {examSet.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{examSet.description}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      検査数: {examSet.examSetItems.length}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className="bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-1 rounded transition-colors duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteExamSet(examSet.id);
                      }}
                    >
                      削除
                    </button>
                    <svg 
                      className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedSetId === examSet.id ? 'transform rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* 検査セット詳細（展開時のみ表示） */}
                {expandedSetId === examSet.id && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {/* 含まれる検査一覧 */}
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">含まれる検査</h4>
                    {examSet.examSetItems.length > 0 ? (
                      <ul className="mb-4 space-y-1">
                        {examSet.examSetItems.map((item) => (
                          <li key={item.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-gray-800 dark:text-gray-200">{item.exam.examname}</span>
                            <button
                              onClick={() => removeExamFromSet(item.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              削除
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 mb-4">検査が追加されていません</p>
                    )}

                    {/* 検査追加フォーム */}
                    <div className="mt-4 flex items-end space-x-2">
                      <div className="flex-grow">
                        <label htmlFor={`exam-select-${examSet.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          検査を追加
                        </label>
                        <select
                          id={`exam-select-${examSet.id}`}
                          className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                          value={selectedExamId || ""}
                          onChange={(e) => setSelectedExamId(Number(e.target.value) || null)}
                        >
                          <option value="">-- 検査を選択 --</option>
                          {allExams
                            .filter(exam => !examSet.examSetItems.some(item => item.examId === exam.id))
                            .map(exam => (
                              <option key={exam.id} value={exam.id}>
                                {exam.examname}
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        onClick={() => addExamToSet(examSet.id)}
                        className="bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded transition-colors duration-300"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">検査セットがありません。新しい検査セットを作成してください。</p>
        )}
      </div>

      <Link 
        to="/index_doctor"
        className="block text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-8 transition-colors duration-300"
      >
        戻る
      </Link>
    </div>
  );
}