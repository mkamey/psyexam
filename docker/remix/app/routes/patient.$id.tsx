import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { prisma } from "../../utils/db.server";
import { useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const patientId = Number(params.id);

  if (isNaN(patientId)) {
    throw new Response("Invalid Patient ID", { status: 400 });
  }

  const stackedExams = await prisma.stackedExam.findMany({
    where: { patientId },
    include: { exam: true },
  });

  return json({ stackedExams, patientId });
};

export default function PatientExams() {
  const { stackedExams, patientId } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowMessage(true);

      // 3秒後にメッセージを非表示にする
      setTimeout(() => {
        setShowMessage(false);
        setSearchParams({}, { replace: true }); // URL から success を削除
      }, 3000);
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      {showMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-green-500 text-white p-2 rounded-md shadow-md">
          提出が完了しました！
        </div>
      )}
      <h1 className="text-2xl font-bold mb-4">Patient Exam Results</h1>
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        {stackedExams.length > 0 ? (
          <ul className="space-y-2">
            {stackedExams.map((exam) => (
              <li key={exam.id} className="p-3 border rounded-md bg-gray-50 flex justify-between items-center">
                <span>{exam.exam.examname}</span>
                <Link
                  to={`/exam/${exam.exam.id}?patientId=${patientId}`}
                  className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                >
                  実施する
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No exams found for this patient.</p>
        )}
      </div>
    </div>
  );
}
