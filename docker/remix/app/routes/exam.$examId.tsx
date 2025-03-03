import { json, type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../../utils/db.server";
import { useState } from "react";

type ExamOption = {
  value: number;
  label: string;
};

type ExamQuestion = {
  text: string;
};

type ExamData = {
  title: string;
  instruction: string;
  questions: ExamQuestion[];
  options: ExamOption[];
};

interface ResultCreateInput {
  patient: { connect: { id: number } };
  exam: { connect: { id: number } };
  [key: `item${number}`]: number | null;
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const examId = Number(params.examId);
  const url = new URL(request.url);
  const patientId = Number(url.searchParams.get("patientId"));

  if (isNaN(examId) || isNaN(patientId)) {
    throw new Response("Invalid Exam or Patient ID", { status: 400 });
  }
  const exam = await prisma.exam.findUnique({where: { id : examId }});
  if (!exam) {
    throw new Response("Exam not found", { status: 404 });
  }
  const filePath = path.join(process.cwd(), "exams", `${exam.examname}.json`);
  let examData: ExamData;
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    examData = JSON.parse(fileContent);
  } catch (error) {
    throw new Response("Exam configuration not found", { status: 404 });
  }

  return json({ examData, examId, patientId });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const patientId = Number(formData.get("patientId"));
  const examId = Number(formData.get("examId"));

  if (isNaN(patientId) || isNaN(examId)) {
    return json({ error: "Invalid input" }, { status: 400 });
  }

  const exam = await prisma.exam.findUnique({where: { id : examId }});
  if (!exam) {
    throw new Response("Exam not found", { status: 404 });
  }
  const filePath = path.join(process.cwd(), "exams", `${exam.examname}.json`);
  let examData: ExamData;
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    examData = JSON.parse(fileContent);
  } catch (error) {
    throw new Response("Exam configuration not found", { status: 404 });
  }

  const totalQuestions = examData.questions.length;
  const resultData: ResultCreateInput = {
    patient: { connect: { id: patientId } },
    exam: { connect: { id: examId } }
  };

  let allAnswered = true;
  for (let i = 0; i < 10; i++) {
    const value = formData.get(`item${i}`);
    if (i < totalQuestions) {
      resultData[`item${i}`] = value !== null ? Number(value) : null;
      if (value === null) {
        allAnswered = false;
      }
    } else {
      resultData[`item${i}`] = null;
    }
  }

  if (!allAnswered) {
    return json({ error: "Please answer all required questions." }, { status: 400 });
  }  

  await prisma.result.create({ data: resultData });
  await prisma.stackedExam.deleteMany({
    where: {
      patientId: patientId,
      examId: examId,
    },
  });
  return redirect(`/patient/${patientId}?success=true`);
};

export default function ExamForm() {
  const { examData, examId, patientId } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const isSubmitting = navigation.state === "submitting";

  const handleSelect = (questionIndex: number, value: number) => {
    setAnswers(prev => ({ ...prev, [`item${questionIndex}`]: value }));
  };

  const isFormComplete = examData.questions.every((_: ExamQuestion, index: number) => answers[`item${index}`] !== undefined);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{examData.title}</h1>
      <p className="mb-4 text-gray-700 dark:text-gray-300">{examData.instruction}</p>
      <Form method="post" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md">
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="examId" value={examId} />
        {examData.questions.map((question: ExamQuestion, index: number) => (
          <div key={index} className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-1">{question.text}</label>
            <div className="flex space-x-2">
              {examData.options.map((option: ExamOption) => (
                <button
                  key={option.value}
                  type="button"
                  className={`p-2 border rounded-md w-full text-center ${
                    answers[`item${index}`] === option.value 
                    ? 'bg-blue-500 dark:bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                  onClick={() => handleSelect(index, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <input type="hidden" name={`item${index}`} value={answers[`item${index}`] ?? ""} />
          </div>
        ))}
        <button
          type="submit"
          className="w-full bg-green-500 dark:bg-green-600 text-white p-2 rounded-md mt-4 hover:bg-green-600 dark:hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600"
          disabled={!isFormComplete || isSubmitting}
        >
          {isSubmitting ? "送信中..." : "提出する"}
        </button>
      </Form>
    </div>
  );
}