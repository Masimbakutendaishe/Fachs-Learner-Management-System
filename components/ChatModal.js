// components/ChatModal.js
import { useState } from "react";
import { X } from "lucide-react";

export default function ChatModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input) return;
    const question = input;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      {
        role: "ai",
        content: `Hi! I'm your Fachs AI Facilitator. You asked: "${question}". Here's a sample answer from our knowledge base.`,
      },
    ]);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" />

      <div
        className="fixed bottom-4 right-4 w-[92%] max-w-sm max-h-[80vh] rounded-2xl shadow-2xl z-40 p-4 flex flex-col animate-fade-up"
        style={{ background: "var(--paper)", border: "1px solid var(--border-soft)" }}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--seal-gold)" }} />
            <h3 className="font-display font-semibold text-sm" style={{ color: "var(--text)" }}>
              Fachs AI Facilitator
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div
          className="flex-1 h-60 overflow-y-auto p-3 rounded-xl mb-3 flex flex-col gap-2"
          style={{ background: "var(--paper-muted)" }}
        >
          {messages.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] m-auto text-center px-4">
              Ask a question about your qualification, deadlines, or the platform.
            </p>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl text-sm max-w-[85%] ${msg.role === "user" ? "self-end text-white" : "self-start"}`}
              style={
                msg.role === "user"
                  ? { background: "var(--brand-color)" }
                  : { background: "var(--paper)", color: "var(--text)", border: "1px solid var(--border-soft)" }
              }
            >
              {msg.content}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me a question..."
            className="flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--border-soft)", color: "var(--text)" }}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:brightness-110"
            style={{ background: "var(--brand-color)" }}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}