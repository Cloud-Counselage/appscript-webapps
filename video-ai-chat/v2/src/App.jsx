import React, { useState } from "react";
import Chat from "./components/Chat";

export default function App() {
  const [videoURL, setVideoURL] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-black text-white p-4 text-center text-2xl font-bold">
        🎥 Video AI Chat
      </header>
      <main className="flex flex-col items-center gap-4 p-6 flex-grow">
        <input
          className="w-full max-w-xl p-2 text-black rounded"
          placeholder="Paste YouTube video URL..."
          value={videoURL}
          onChange={(e) => setVideoURL(e.target.value)}
        />
        {videoURL && (
          <>
            <video
              src={videoURL}
              controls
              className="max-w-3xl w-full rounded shadow"
            />
            <Chat videoURL={videoURL} />
          </>
        )}
      </main>
    </div>
  );
}
