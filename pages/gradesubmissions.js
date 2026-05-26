"use client";
import { useState } from "react";

/* ---------- Dummy Learner Data ---------- */
const dummySubmissions = [
  {
    id: 1,
    name: "Thabo Mokoena",
    submissions: [
      {
        unit: "Technical Support Level 1",
        type: "Learner Workbook",
        submissionDate: "2025-09-01",
        status: "Submitted",
        fileName: "Workbook_TS1_Thabo.pdf",
        questions: [
          { q: "Question 1: Define a computer system", marks: null },
          { q: "Question 2: Explain hardware vs software", marks: null },
        ],
      },
      {
        unit: "Technical Support Level 1",
        type: "Summative Assessment",
        submissionDate: "2025-09-02",
        status: "Submitted",
        fileName: "Summative_TS1_Thabo.pdf",
        questions: [
          { q: "Q1: Define computer architecture", marks: null },
          { q: "Q2: Explain storage devices", marks: null },
          { q: "Q3: Describe networking basics", marks: null },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Lerato Khumalo",
    submissions: [
      {
        unit: "Technical Support Level 2",
        type: "Practical Evidence",
        submissionDate: "2025-09-03",
        status: "Submitted",
        fileName: "Practical_TS2_Lerato.pdf",
        questions: [
          { q: "Practical 1: Install OS", marks: null },
          { q: "Practical 2: Configure network", marks: null },
          { q: "Practical 3: Backup data", marks: null },
        ],
      },
      {
        unit: "Technical Support Level 2",
        type: "Summative Assessment",
        submissionDate: "2025-09-04",
        status: "Not Submitted",
        questions: [],
      },
    ],
  },
  {
    id: 3,
    name: "Sipho Dlamini",
    submissions: [
      {
        unit: "Technical Support Level 1",
        type: "Learner Workbook",
        submissionDate: "2025-09-01",
        status: "Submitted",
        fileName: "Workbook_TS1_Sipho.pdf",
        questions: [
          { q: "Q1: Identify computer parts", marks: null },
          { q: "Q2: Explain OS functions", marks: null },
        ],
      },
    ],
  },
];

/* ---------- Grade Learner Submissions Page ---------- */
export default function GradeSubmissionsPage() {
  const [learners, setLearners] = useState(dummySubmissions);

  const handleMark = (learnerId, submissionIndex, questionIndex, mark) => {
    setLearners((prev) =>
      prev.map((l) => {
        if (l.id === learnerId) {
          const newSubs = [...l.submissions];
          newSubs[submissionIndex].questions[questionIndex].marks = mark;
          return { ...l, submissions: newSubs };
        }
        return l;
      })
    );
  };

  const handleSave = () => {
    alert("Grades saved (dummy)!");
    console.log("Saved grades:", learners);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Grade Learner Submissions
      </h1>

      {learners.map((learner) => (
        <div
          key={learner.id}
          className="mb-6 bg-white shadow rounded-lg p-4"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-3">{learner.name}</h2>
          {learner.submissions.map((sub, sIndex) => (
            <div
              key={sIndex}
              className="mb-4 p-4 border border-gray-300 rounded-lg bg-gray-50"
            >
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-gray-800">
                  {sub.unit} — {sub.type}
                </p>
                <span className="text-gray-500">{sub.submissionDate}</span>
              </div>
              <p className="text-gray-700 mb-1">Status: {sub.status}</p>
              {sub.fileName && sub.status === "Submitted" && (
                <p className="text-gray-600 mb-2">
                  File:{" "}
                  <a
                    href="#"
                    className="text-blue-600 hover:underline"
                  >
                    {sub.fileName}
                  </a>
                </p>
              )}

              {sub.questions.length > 0 ? (
                <table className="w-full border border-gray-300 rounded-lg overflow-hidden mb-2">
                  <thead className="bg-gray-900 text-white">
                    <tr>
                      <th className="px-4 py-2 text-left">Question</th>
                      <th className="px-4 py-2 text-left">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {sub.questions.map((q, qIndex) => (
                      <tr
                        key={qIndex}
                        className="border-b border-gray-200 hover:bg-gray-100"
                      >
                        <td className="px-4 py-2 text-gray-900">{q.q}</td>
                        <td className="px-4 py-2">
                          {sub.status === "Submitted" ? (
                            <input
                              type="number"
                              placeholder="Enter marks"
                              className="w-24 p-1 border rounded text-gray-900"
                              value={q.marks || ""}
                              onChange={(e) =>
                                handleMark(learner.id, sIndex, qIndex, e.target.value)
                              }
                            />
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No questions submitted.</p>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="mt-6">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Save All Grades
        </button>
      </div>
    </div>
  );
}
