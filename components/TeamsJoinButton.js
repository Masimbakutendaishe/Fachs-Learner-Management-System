import {supabase} from "../lib/supabase";

export default function TeamsJoinButton({ moduleId }) {
  const handleJoin = async () => {
    const user = supabase.auth.user();
    // Insert attendance record
    await supabase.from("sessions").insert({
      user_id: user.id,
      module_id: moduleId,
      joined_at: new Date(),
    });
    // Open demo Teams link
    window.open("https://teams.microsoft.com/l/meetup-join/demo-link", "_blank");
  };

  return (
    <div className="p-4 bg-purple-50 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">Join Teams Session</h2>
      <button
        onClick={handleJoin}
        className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800"
      >
        Join Demo Session
      </button>
    </div>
  );
}
