"use client";
import { useState } from "react";

export default function StudentSubmissionsPage() {
  // Dummy data
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      learnerName: "John Doe",
      learnerEmail: "john@example.com",
      learnerID: "L001",
      submissionTitle: "Knowledge Module 1",
      submissionDate: "2025-09-10",
      fileUrl: "#",
      grade: null,
      feedback: "",
      status: "Pending",
    },
    {
      id: 2,
      learnerName: "Jane Smith",
      learnerEmail: "jane@example.com",
      learnerID: "L002",
      submissionTitle: "Practical Evidence Q1",
      submissionDate: "2025-09-11",
      fileUrl: "#",
      grade: null,
      feedback: "",
      status: "Pending",
    },
  ]);

  const handleFeedbackChange = (id, value) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, feedback: value } : s))
    );
  };

  const handleGradeChange = (id, value) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, grade: value } : s))
    );
  };

  const handleMarkReviewed = (id) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Reviewed" } : s))
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white drop-shadow-lg">
        Learner Submissions
      </h1>
      <p className="text-gray-200 font-medium">
        Review learner submissions, provide feedback, and assign grades.
      </p>

      <div className="space-y-6">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className="bg-gray-900/60 p-6 rounded-2xl shadow-lg border border-gray-700 hover:scale-[1.02] transition transform"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{sub.learnerName}</h2>
                <p className="text-gray-300 text-sm">
                  {sub.learnerEmail} | ID: {sub.learnerID}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Submitted on: {new Date(sub.submissionDate).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-semibold text-sm ${
                  sub.status === "Pending"
                    ? "bg-yellow-500 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {sub.status}
              </span>
            </div>

            {/* Submission Link */}
            <a
              href={sub.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 mb-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            >
              View Submission
            </a>

            {/* Feedback & Grading */}
            <div className="flex flex-col md:flex-row md:items-center md:gap-4">
              <textarea
                placeholder="Enter feedback here..."
                value={sub.feedback}
                onChange={(e) => handleFeedbackChange(sub.id, e.target.value)}
                className="flex-1 p-3 rounded border border-gray-600 bg-gray-800 text-white resize-none mb-2 md:mb-0"
                rows={3}
              />

              <input
                type="number"
                placeholder="Grade"
                value={sub.grade || ""}
                onChange={(e) => handleGradeChange(sub.id, e.target.value)}
                className={`w-24 p-2 rounded border ${
                  sub.grade >= 50
                    ? "border-green-400 bg-gray-800 text-white"
                    : "border-red-400 bg-gray-800 text-white"
                }`}
              />

              <button
                onClick={() => handleMarkReviewed(sub.id)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Mark Reviewed
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
