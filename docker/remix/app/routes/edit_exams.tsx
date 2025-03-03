import { json, unstable_parseMultipartFormData, type ActionFunctionArgs, type LoaderFunctionArgs, type UploadHandler } from "@remix-run/node";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { requireApprovedUser } from "../../utils/session.server";
import { useState, useRef } from "react";
import * as path from "path";
import * as fs from "fs/promises";
// JSONファイルアップロード用のハンドラー
const uploadHandler: UploadHandler = async ({ name, contentType, data, filename }) => {
  if (name !== "examFile") {
    return undefined;
  }

  if (!filename || !filename.endsWith('.json')) {
    throw new Error('JSONファイルのみアップロード可能です');
  }

  // ストリームからファイルの内容を読み取る
  const chunks = [];
  for await (const chunk of data) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  try {
    // JSONの構文を検証
    JSON.parse(buffer.toString());
  } catch (e) {
    throw new Error('無効なJSONファイルです');
  }

  // File オブジェクトを作成
  return new File([buffer], filename);
};

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
  
  // ファイルアップロードの処理
  if (request.method === "POST" && new URL(request.url).searchParams.get("action") === "upload") {
    try {
      const formData = await unstable_parseMultipartFormData(request, uploadHandler);
      const uploadedFile = formData.get("examFile") as File;
      
      if (!uploadedFile) {
        return json({ error: "ファイルがアップロードされていません" }, { status: 400 });
      }

      try {
        // examsディレクトリにファイルを保存
        const examsDir = "/usr/server/exams";
        console.log("保存先ディレクトリ:", examsDir);
        
        await fs.mkdir(examsDir, { recursive: true });
        
        const fileContent = await uploadedFile.arrayBuffer();
        const savePath = path.join(examsDir, uploadedFile.name);
        console.log("ファイル保存パス:", savePath);
        
        await fs.writeFile(
          savePath,
          Buffer.from(fileContent)
        );
        
        console.log("ファイル保存完了:", uploadedFile.name);
        return json({ success: true });
      } catch (error) {
        console.error("ファイル保存エラー:", error);
        throw error;
      }
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "アップロードに失敗しました" }, { status: 400 });
    }
  }

  // 通常のフォーム処理
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
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルアップロード処理
  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const file = formData.get("examFile") as File;

    if (!file) {
      setUploadStatus("ファイルを選択してください");
      return;
    }

    if (!file.name.endsWith('.json')) {
      setUploadStatus("JSONファイルのみアップロード可能です");
      return;
    }

    try {
      setUploadStatus("アップロード中...");
      setUploadStatus("アップロード中...");
      
      await fetcher.submit(formData, {
        method: "POST",
        action: "?action=upload",
        encType: "multipart/form-data"
      });

      setUploadStatus("アップロード成功");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      setUploadStatus("アップロードに失敗しました");
    }
  };

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
    <div className="p-6 max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg transition-colors duration-300">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">検査管理</h1>

      {/* JSONファイルアップロードフォーム */}
      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">JSONファイルアップロード</h2>
        <form onSubmit={handleFileUpload} encType="multipart/form-data" className="space-y-4">
          <div className="flex flex-col space-y-2">
            <input
              type="file"
              name="examFile"
              accept=".json"
              ref={fileInputRef}
              className="text-sm text-gray-900 dark:text-gray-300"
            />
            <button
              type="submit"
              className="w-full sm:w-auto bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-2 rounded transition-colors duration-300"
            >
              アップロード
            </button>
          </div>
          {uploadStatus && (
            <p className={`mt-2 text-sm ${
              uploadStatus.includes('成功')
                ? 'text-green-600 dark:text-green-400'
                : uploadStatus.includes('エラー') || uploadStatus.includes('失敗')
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {uploadStatus}
            </p>
          )}
        </form>
      </div>

      {/* 追加フォーム */}
      <div className="mb-6 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:space-x-2">
        <input
          type="text"
          value={examName}
          onChange={(e) => setExamName(e.target.value)}
          placeholder="検査名"
          className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
        />
        <input
          type="number"
          value={cutoff}
          onChange={(e) => setCutoff(e.target.value)}
          placeholder="カットオフ値"
          className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
        />
        <button
          onClick={addExam}
          className="w-full sm:w-auto bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors duration-300"
        >
          追加
        </button>
      </div>

      {/* 検査一覧 */}
      <ul className="space-y-2">
        {exams.map((exam) => (
          <li
            key={exam.id}
            className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-900 dark:text-white"
          >
            <span>{exam.examname} (カットオフ: {exam.cutoff})</span>
            <button
              onClick={() => deleteExam(exam.id)}
              className="bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-1 rounded transition-colors duration-300"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <Link to="/index_doctor" className="block text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-4 transition-colors duration-300">戻る</Link>
    </div>
  );
}
