import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../lib/supabase";
import AIHelpPanel from "../../components/AIHelpPanel";
import TeamsJoinButton from "../../components/TeamsJoinButton";

export default function ModulePlayer() {
  const router = useRouter();
  const { id } = router.query; // programme_id
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assessmentFile, setAssessmentFile] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) fetchModule();
  }, [id]);

  const fetchModule = async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("programme_id", id)
      .single();
    if (error) console.error(error);
    else setModule(data);
    setLoading(false);
  };

  const handleUpload = async (type) => {
    if ((type === "assessment" && !assessmentFile) || (type === "evidence" && !evidenceFile)) return;

    setUploading(true);
    const user = supabase.auth.user();
    const file = type === "assessment" ? assessmentFile : evidenceFile;
    const fileName = `${user.id}_${type}_${file.name}`;
    const { data, error } = await supabase.storage
      .from(type === "assessment" ? "assessments" : "evidence")
      .upload(fileName, file);

    if (error) console.error(error);
    else {
      // Insert record in table
      await supabase.from(type === "assessment" ? "assessments" : "evidence").insert({
        user_id: user.id,
        module_id: module.id,
        file_url: data.path,
      });
      alert(`${type} uploaded successfully!`);
      if (type === "assessment") setAssessmentFile(null);
      else setEvidenceFile(null);
    }
    setUploading(false);
  };

  if (loading) return <div className="p-6">Loading Module...</div>;
  if (!module) return <div className="p-6">Module not found</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">{module.title}</h1>
      <p className="text-gray-700">{module.description}</p>

      {/* Learner Guide */}
      <section className="p-4 bg-gray-100 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-2">Learner Guide</h2>
        <p>{module.guide_text || "Guide content goes here..."}</p>
      </section>

      {/* Assessment Upload */}
      <section className="p-4 bg-gray-100 rounded-xl shadow space-y-2">
        <h2 className="text-xl font-semibold">Assessment Submission</h2>
        <input type="file" onChange={(e) => setAssessmentFile(e.target.files[0])} />
        <button
          onClick={() => handleUpload("assessment")}
          className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Assessment"}
        </button>
      </section>

      {/* Practical Evidence Upload */}
      <section className="p-4 bg-gray-100 rounded-xl shadow space-y-2">
        <h2 className="text-xl font-semibold">Practical Evidence</h2>
        <input type="file" onChange={(e) => setEvidenceFile(e.target.files[0])} />
        <button
          onClick={() => handleUpload("evidence")}
          className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Practical Evidence"}
        </button>
      </section>

      {/* AI Help Panel */}
      <AIHelpPanel moduleId={module.id} />

      {/* Teams Join */}
      <TeamsJoinButton moduleId={module.id} />
    </div>
  );
}
