import React, { useState } from "react";

export default function Chat({ videoURL }) {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);

  const askAI = async () => {
    const fakeAnswer = `🤖 Answer for: "${question}" (transcript analysis coming soon)`;
    setChat([...chat, { q: question, a: fakeAnswer }]);
    setQuestion("");
  };

  return (
    <div className="w-full max-w-2xl mt-4">
      <div className="flex gap-2">
        <input
          className="flex-grow p-2 text-black rounded"
          placeholder="Ask a question about the video..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          onClick={askAI}
          className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
        >
          Ask
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {chat.map((c, i) => (
          <div key={i} className="bg-gray-800 p-3 rounded">
            <p className="font-semibold">❓ {c.q}</p>
            <p className="text-green-400">💬 {c.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
