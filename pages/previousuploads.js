"use client";
import { useState, useEffect } from "react";

/* ---------- Previous Uploads Card ---------- */
const PreviousUploadCard = ({ upload, activities }) => (
  <div className="p-6 bg-gray-100 shadow-lg rounded-2xl mb-6 hover:shadow-2xl transition-all duration-300">
    <div className="flex justify-between items-center mb-3">
      <h2 className="text-xl font-bold text-gray-900">{upload.unit_standard_title}</h2>
      <span className="text-sm text-gray-500">
        Week: {upload.week_start_date} - {upload.week_end_date}
      </span>
    </div>

    <p className="text-gray-700 mb-3">Facilitator ID: {upload.facilitation_id}</p>

    {/* Render each activity */}
    {activities.map((act) => {
      const key = act.keyMap || act.key;
      if (!upload[key]) return null;

      return (
        <p key={key} className="mb-2 text-gray-800">
          <span className="font-semibold">{act.label}:</span>{" "}
          {upload[key].includes("http") ? (
            <a
              href={upload[key]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View
            </a>
          ) : (
            upload[key]
          )}
        </p>
      );
    })}
  </div>
);

/* ---------- Dummy Previous Uploads ---------- */
const dummyUploads = [
  {
    id: "1",
    unit_standard_title: "Introduction to Networks",
    week_start_date: "2025-08-01",
    week_end_date: "2025-08-07",
    facilitation_id: "12345",
    unit_title: "Intro to Networking",
    intro: "Network basics overview.",
    learner_guide: "http://example.com/learner_guide_1.pdf",
    workbook: "http://example.com/workbook_1.pdf",
    knowledge: "",
    summative: "",
    practical: "",
    attendance: "Attendance marked",
    schedule_teams: "Teams session scheduled",
    report: "Attendance report generated",
    invoice: "Invoice generated",
    send_to_assessor: "Sent to assessor",
  },
  {
    id: "2",
    unit_standard_title: "Computer Hardware",
    week_start_date: "2025-08-08",
    week_end_date: "2025-08-14",
    facilitation_id: "12345",
    unit_title: "Computer Hardware",
    intro: "Hardware components explained.",
    learner_guide: "",
    workbook: "http://example.com/workbook_2.pdf",
    knowledge: "http://example.com/knowledge_2.pdf",
    summative: "",
    practical: "",
    attendance: "Attendance marked",
    schedule_teams: "Teams session scheduled",
    report: "Progress report generated",
    invoice: "Invoice generated",
    send_to_assessor: "Sent to assessor",
  },
];

/* ---------- Activities List (for labels and keys) ---------- */
const activities = [
  { key: "unit_title", label: "Upload / Edit Unit Standard Title" },
  { key: "intro", label: "Facilitator Intro" },
  { key: "learner_guide", label: "Learner Guide Upload / Text" },
  { key: "workbook", label: "Learner Workbook PDF" },
  { key: "knowledge", label: "Knowledge Module Upload" },
  { key: "summative", label: "Summative Assessment Upload" },
  { key: "practical", label: "Practical Evidence Upload" },
  { key: "attendance", label: "Mark Attendance" },
  { key: "schedule_teams", label: "Schedule MS Teams Session" },
  { key: "report", label: "Generate Monthly Report" },
  { key: "invoice", label: "Generate Monthly Invoice" },
  { key: "send_to_assessor", label: "Send to Assessor / Generate Certificates" },
];

/* ---------- Main Page ---------- */
export default function PreviousUploadsPage() {
  const [uploads, setUploads] = useState(dummyUploads);
  const [filteredUploads, setFilteredUploads] = useState(dummyUploads);
  const [selectedWeek, setSelectedWeek] = useState("");

  /* Filter by week */
  useEffect(() => {
    if (!selectedWeek) setFilteredUploads(uploads);
    else setFilteredUploads(uploads.filter((u) => u.week_start_date === selectedWeek));
  }, [selectedWeek, uploads]);

  return (
    <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-900">Previous Uploads</h1>

      {/* Week Filter */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 items-center">
        <label className="text-gray-800 font-semibold">Filter by Week:</label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="border p-3 rounded-xl bg-white text-gray-900 shadow-md"
        >
          <option value="">All Weeks</option>
          {uploads.map((u) => (
            <option key={u.id} value={u.week_start_date}>
              {u.week_start_date} to {u.week_end_date}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Cards */}
      {filteredUploads.length === 0 ? (
        <p className="text-gray-700 text-lg">No uploads found for this week.</p>
      ) : (
        filteredUploads.map((upload) => (
          <PreviousUploadCard key={upload.id} upload={upload} activities={activities} />
        ))
      )}
    </div>
  );
}
