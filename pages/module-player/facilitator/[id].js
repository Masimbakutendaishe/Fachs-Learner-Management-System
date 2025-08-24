"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";


/* ---------- Helper Components ---------- */
const UnitWeekIntro = ({ unitWeek, onCheckSubmissions, onCheckPreviousUploads, onDateChange }) => (
  <div className="p-6 bg-gray-900/80 shadow-lg rounded-lg mb-6 text-white">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-red-200">
          {unitWeek?.unit_standard_title || "No Unit Title"}
        </h1>

        <div className="flex gap-4 mt-2 items-center">
          <label className="text-gray-200 text-sm">
            Start:
            <input
              type="date"
              value={unitWeek.week_start_date || ""}
              onChange={(e) => onDateChange("week_start_date", e.target.value)}
              className="ml-2 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white"
            />
          </label>
          <label className="text-gray-200 text-sm">
            End:
            <input
              type="date"
              value={unitWeek.week_end_date || ""}
              onChange={(e) => onDateChange("week_end_date", e.target.value)}
              className="ml-2 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white"
            />
          </label>
        </div>

        <p className="text-gray-400 mt-2">
          Facilitator ID: <span className="font-bold">{unitWeek?.facilitation_id}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onCheckSubmissions}
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
        >
          Check Learner Submissions
        </button>
        <button
          onClick={onCheckPreviousUploads}
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
        >
          Check Previous Uploads
        </button>
        <button
          onClick={onCheckPreviousUploads}
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
        >
          Schedule MS Teams Session
        </button>
      </div>
    </div>
  </div>
);

/* ---------- Helper: Save to Supabase ---------- */
const saveUnitWeekField = async (id, field, value) => {
  try {
    const { data, error } = await supabase
      .from("unit_weeks2")
      .update({ [field]: value })
      .eq("id", id);

    if (error) throw error;
    alert(`${field} saved successfully!`);
    console.log(`${field} saved`, data);
  } catch (err) {
    console.error(err);
    alert(`Error saving ${field}: ${err.message}`);
  }
};

/* ---------- Resource / Upload Card ---------- */
const ResourceCard = ({ unitWeekId, label, url, value, onChange, instructions, allowTextAndFile = false, field }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleSave = () => {
    if (file) {
      // In practice, upload to Supabase Storage here, then save URL to table
      saveUnitWeekField(unitWeekId, field, file.name);
    } else {
      saveUnitWeekField(unitWeekId, field, value);
    }
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg mb-4 text-gray-900">
      <h2 className="text-lg font-bold mb-2">{label}</h2>
      {instructions && <p className="text-gray-900 text-sm mb-2">{instructions}</p>}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mb-2 inline-block">
          View existing
        </a>
      )}

      {allowTextAndFile && (
        <>
          <textarea
            className="w-full border p-2 rounded bg-white text-gray-900 mb-2 placeholder-gray-500"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter text here..."
          />
          <input type="file" onChange={handleFileChange} className="mb-2" />
        </>
      )}

      <button
        onClick={handleSave}
        className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Save
      </button>
    </div>
  );
};

/* ---------- Upload Menu ---------- */
const UploadMenu = ({ unitWeekId, label, field }) => {
  const [mode, setMode] = useState(null);
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState({ text: "", marks: "" });

  const handleAddQuestion = () => {
    if (!currentQ.text || !currentQ.marks) return;
    setQuestions((prev) => [...prev, currentQ]);
    setCurrentQ({ text: "", marks: "" });
  };

  const handleDeleteQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveFile = () => {
    if (file) {
      saveUnitWeekField(unitWeekId, field, file.name);
    }
  };

  const handleSaveQuestions = () => {
    saveUnitWeekField(unitWeekId, field, JSON.stringify(questions));
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg mb-4 text-gray-900">
      <h2 className="text-xl font-bold mb-4">{label}</h2>

      {!mode && (
        <div className="flex gap-4">
          <button onClick={() => setMode("upload")} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Upload File
          </button>
          <button onClick={() => setMode("manual")} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Enter Questions Manually
          </button>
        </div>
      )}

      {mode === "upload" && (
        <div className="mt-4">
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="mb-2" />
          {file && <p className="text-green-700 text-gray-900">Selected: {file.name}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveFile} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit</button>
            <button onClick={() => setMode(null)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Back</button>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={currentQ.text}
              onChange={(e) => setCurrentQ((q) => ({ ...q, text: e.target.value }))}
              placeholder="Enter question..."
              className="w-full border p-2 rounded bg-white text-gray-900 placeholder-gray-500"
            />
            <input
              type="number"
              value={currentQ.marks}
              onChange={(e) => setCurrentQ((q) => ({ ...q, marks: e.target.value }))}
              placeholder="Marks"
              className="w-32 border p-2 rounded bg-white text-gray-900 placeholder-gray-500"
            />
            <button onClick={handleAddQuestion} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Question</button>
          </div>

          {questions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Questions Added:</h3>
              <ul className="space-y-2">
                {questions.map((q, i) => (
                  <li key={i} className="flex justify-between items-center border-b pb-1 text-gray-900">
                    <span>{i + 1}. {q.text} — <span className="font-bold">{q.marks} marks</span></span>
                    <button onClick={() => handleDeleteQuestion(i)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </li>
                ))}
              </ul>
              <button onClick={handleSaveQuestions} className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Save Questions</button>
            </div>
          )}

          <button onClick={() => setMode(null)} className="mt-4 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Back</button>
        </div>
      )}
    </div>
  );
};

/* ---------- Facilitator Menus (Attendance / Reports / Teams) ---------- */
const AttendanceMenu = ({ unitWeekId }) => (
  <div className="p-6 bg-white shadow-lg rounded-lg mb-4 text-gray-900">
    <h2 className="text-xl font-bold mb-4">Mark Attendance</h2>
    <p className="text-gray-900 mb-2">Select learners who attended:</p>
    <ul className="space-y-2">
      {["Learner A", "Learner B", "Learner C"].map((l, i) => (
        <li key={i}>
          <label className="flex items-center gap-2 text-gray-900">
            <input type="checkbox" className="rounded" />
            {l}
          </label>
        </li>
      ))}
    </ul>
    <button
      className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      onClick={() => alert("Attendance marked and saved!")}
    >
      Submit Attendance
    </button>
  </div>
);


const MonthlyReportMenu = () => (
  <div className="p-6 bg-white shadow-lg rounded-lg mb-4 text-gray-900">
    <h2 className="text-xl font-bold mb-4">Generate Monthly Report</h2>
    <p className="text-gray-900 mb-2">Select report type:</p>
    <select className="border p-2 rounded w-full mb-2 bg-white text-gray-900">
      <option>Attendance Report</option>
      <option>Assessment Report</option>
      <option>Progress Summary</option>
    </select>
    <button
      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      onClick={() => alert("Monthly report generated (dummy)!")}
    >
      Generate Report
    </button>
  </div>
);

const InvoiceMenu = () => (
  <div className="p-6 bg-white shadow-lg rounded-lg mb-4 text-gray-900">
    <h2 className="text-xl font-bold mb-4">Generate Monthly Invoice</h2>
    <p className="text-gray-900 mb-2">Select learners to invoice:</p>
    <select multiple className="border p-2 rounded w-full mb-2 bg-white text-gray-900">
      <option>Learner A</option>
      <option>Learner B</option>
      <option>Learner C</option>
    </select>
    <button
      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      onClick={() => alert("Invoices generated (dummy)!")}
    >
      Generate Invoice
    </button>
  </div>
);

const SendToAssessorMenu = () => (
  <div className="p-6 bg-white shadow-lg rounded-lg mb-4 text-gray-900">
    <h2 className="text-xl font-bold mb-4">Send to Assessor</h2>
    <p className="text-gray-900 mb-2">Select POE Documents to send to the Assessor:</p>
    <select multiple className="border p-2 rounded w-full mb-2 bg-white text-gray-900">
      <option>Knowledge Module</option>
      <option>Summative Assessment</option>
      <option>Practical Evidence</option>
    </select>
    <button
      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      onClick={() => alert("Sent to assessor (dummy)!")}
    >
      Send
    </button>
  </div>
);

const ScheduleTeamsMenu = ({ unitWeekId }) => {
  const [teamsLink, setTeamsLink] = useState("");
  const handleSave = () => saveUnitWeekField(unitWeekId, "teams_session_link", teamsLink);

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg mb-4 text-gray-900">
      <h2 className="text-xl font-bold mb-4">Schedule MS Teams Session</h2>
      <label className="block mb-2 text-gray-900">
        Date & Time:
        <input type="datetime-local" className="border p-2 rounded w-full mt-1 bg-white text-gray-900" />
      </label>
      <label className="block mb-2 text-gray-900">
        Topic:
        <input type="text" value={teamsLink} onChange={(e) => setTeamsLink(e.target.value)} className="border p-2 rounded w-full mt-1 bg-white text-gray-900 placeholder-gray-500" />
      </label>
      <button onClick={handleSave} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Schedule
      </button>
    </div>
  );
};

/* ---------- Facilitator Module Player ---------- */
export default function FacilitatorModulePlayerPage() {
  const [unitWeek, setUnitWeek] = useState({
    id: "e0b24fb5-443a-4dd4-b55e-ca913df45b23",
    unit_standard_title: "Dummy Unit Standard",
    week_start_date: "2025-09-01",
    week_end_date: "2025-09-07",
    facilitation_id: "12345",
    facilitator_intro: "Welcome to this week's facilitation. Fill in the resources below.",
  });

  const [currentActivity, setCurrentActivity] = useState(null);
  const [unitTitleText, setUnitTitleText] = useState(unitWeek.unit_standard_title);
  const [facilitatorIntro, setFacilitatorIntro] = useState(unitWeek.facilitator_intro);
  const [learnerGuideText, setLearnerGuideText] = useState("This is dummy learner guide text.");

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
    { key: "send_to_assessor", label: "Send to Assessor" },
  ];

  const handleDateChange = (field, value) => {
    setUnitWeek((prev) => ({ ...prev, [field]: value }));
    saveUnitWeekField(unitWeek.id, field, value);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-72 bg-gray-800 text-white border-r p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Facilitator Controls</h2>
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.key}>
              <button
                onClick={() => setCurrentActivity(a.key)}
                className={`w-full text-left px-3 py-2 rounded transition-colors duration-200 ${
                  currentActivity === a.key ? "bg-red-800 text-white font-semibold" : "bg-gray-700 text-gray-200 hover:bg-red-900 hover:text-white"
                }`}
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto h-full">
        <UnitWeekIntro
          unitWeek={{ ...unitWeek, unit_standard_title: unitTitleText }}
          onCheckSubmissions={() => alert("Check Student Submissions (dummy)!")}
          onCheckPreviousUploads={() => alert("Check Previous Uploads (dummy)!")}
          onDateChange={handleDateChange}
        />

        {currentActivity === "unit_title" && (
          <ResourceCard
            unitWeekId={unitWeek.id}
            label="Unit Standard Title"
            value={unitTitleText}
            onChange={setUnitTitleText}
            instructions="Edit the title for this week's unit standard."
            allowTextAndFile
            field="unit_standard_title"
          />
        )}

        {currentActivity === "intro" && (
          <ResourceCard
            unitWeekId={unitWeek.id}
            label="Facilitator Introduction"
            value={facilitatorIntro}
            onChange={setFacilitatorIntro}
            instructions="Provide an introduction or notes for learners for this week."
            allowTextAndFile
            field="facilitator_intro"
          />
        )}

        {currentActivity === "learner_guide" && (
          <ResourceCard
            unitWeekId={unitWeek.id}
            label="Learner Guide (Text & PDF)"
            value={learnerGuideText}
            onChange={setLearnerGuideText}
            instructions="Upload the learner guide PDF or enter text directly."
            allowTextAndFile
            field="learner_guide_url"
          />
        )}

        {["workbook", "knowledge", "summative", "practical"].includes(currentActivity) && (
          <UploadMenu
            unitWeekId={unitWeek.id}
            label={
              currentActivity === "workbook"
                ? "Learner Workbook"
                : currentActivity === "knowledge"
                ? "Knowledge Module"
                : currentActivity === "summative"
                ? "Summative Assessment"
                : "Practical Evidence"
            }
            field={
              currentActivity === "workbook"
                ? "learner_workbook_url"
                : currentActivity === "knowledge"
                ? "knowledge_module_url"
                : currentActivity === "summative"
                ? "summative_assessment_url"
                : "practical_evidence_url"
            }
          />
        )}

        {currentActivity === "attendance" && <AttendanceMenu unitWeekId={unitWeek.id} />}
        {currentActivity === "schedule_teams" && <ScheduleTeamsMenu unitWeekId={unitWeek.id} />}
        {currentActivity === "invoice" && <InvoiceMenu />}
        {currentActivity === "send_to_assessor" && <SendToAssessorMenu />}
        {currentActivity === "report" && <MonthlyReportMenu />}
      </main>
    </div>
  );
}
