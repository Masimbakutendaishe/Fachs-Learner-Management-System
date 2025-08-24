import { useState, useEffect } from "react";
import supabase from "../lib/supabase";

export default function AIHelpPanel({ moduleId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input) return;

    // Fetch from mock kb_documents table
    const { data } = await supabase
      .from("kb_documents")
      .select("content")
      .ilike("content", `%${input}%`)
      .limit(1);

    const answer = data?.[0]?.content || "No relevant info found.";

    setMessages([...messages, { role: "user", text: input }, { role: "ai", text: answer }]);
    setInput("");
  };

  return (
    <section className="p-4 bg-yellow-50 rounded-xl shadow space-y-2">
      <h2 className="text-xl font-semibold mb-2">Fachs AI Help</h2>
      <div className="h-40 overflow-y-auto border p-2 rounded bg-white">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className={`inline-block px-3 py-1 rounded ${m.role === "user" ? "bg-blue-200" : "bg-gray-200"}`}>
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-2"
          placeholder="Ask a question..."
        />
        <button onClick={handleSend} className="bg-red-700 text-white px-4 rounded hover:bg-red-800">
          Send
        </button>
      </div>
    </section>
  );
}
