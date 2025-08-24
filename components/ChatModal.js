// components/ChatModal.js
import { useState } from "react";
import { X } from "lucide-react";

export default function ChatModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input) return;
    // Append learner message
    setMessages([...messages, { role: "user", content: input }]);
    // Simulate AI response (replace with real RAG logic later)
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "ai",
        content: `Hi! I’m your Fachs AI Facilitator. You asked: "${input}". Here’s a sample answer from our knowledge base.`,
      },
    ]);
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-30"
      />

      {/* Modal */}
      <div className="fixed bottom-4 right-4 w-full max-w-sm bg-gradient-to-br from-navy-800 to-red-800 rounded-2xl shadow-2xl z-40 p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-bold">Fachs AI Facilitator</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 h-60 overflow-y-auto bg-white bg-opacity-10 p-2 rounded-md mb-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 p-2 rounded-lg ${
                msg.role === "user" ? "bg-blue-600 text-white self-end" : "bg-gray-200 text-gray-900 self-start"
              }`}
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
            className="flex-1 px-3 py-2 rounded-xl border border-white border-opacity-30 backdrop-blur-md text-white bg-white bg-opacity-20 placeholder-white focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-green-600 rounded-xl text-white hover:bg-green-700"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
