"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "../lib/supabase/client";

export default function QaChat({ programmeId, institutionId, currentUserId, title }) {
  const supabase = createClient();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`qa_messages_${programmeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "qa_messages", filter: `programme_id=eq.${programmeId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [programmeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("qa_messages")
      .select("*, profiles ( first_name, surname, role )")
      .eq("programme_id", programmeId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    const { error } = await supabase.from("qa_messages").insert({
      programme_id: programmeId,
      institution_id: institutionId,
      sender_id: currentUserId,
      body: text,
    });
    if (error) alert("Could not send: " + error.message);
  };

  if (loading) return <p className="text-sm font-mono text-[var(--text-muted)]">Loading...</p>;

  return (
    <div className="paper p-4 flex flex-col">
      <h2 className="font-display text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>{title || "Quality Assurance Chat"}</h2>
      <div className="h-72 overflow-y-auto rounded-xl p-3 mb-3 flex flex-col gap-2" style={{ background: "var(--paper-muted)" }}>
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400 m-auto">No messages yet, start the conversation.</p>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            const name = m.profiles ? `${m.profiles.first_name || ""} ${m.profiles.surname || ""}`.trim() : "Unknown";
            return (
              <div key={m.id} className={`max-w-[80%] ${isMe ? "self-end" : "self-start"}`}>
                {!isMe && <p className="text-xs text-gray-400 mb-0.5 capitalize">{name} - {m.profiles?.role}</p>}
                <div
                  className="p-2.5 rounded-xl text-sm"
                  style={isMe ? { background: "var(--brand-color)", color: "white" } : { background: "var(--paper)", color: "var(--text)", border: "1px solid var(--border-soft)" }}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Message..." className="flex-1 px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--border-soft)" }}
        />
        <button onClick={sendMessage} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--brand-color)" }}>Send</button>
      </div>
    </div>
  );
}
