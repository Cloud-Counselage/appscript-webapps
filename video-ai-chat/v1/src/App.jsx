import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VideoPlayer from './components/VideoPlayer';
import Chat from './components/Chat';

export default function App() {
  const [dark, setDark] = useState(() => {
    return localStorage.theme === 'dark' ||
      (!('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.theme = dark ? 'dark' : 'light';
  }, [dark]);

  return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <Navbar dark={dark} toggleDark={() => setDark(!dark)} />
      <main className="max-w-5xl mx-auto p-4 space-y-8">
        <VideoPlayer onTranscriptReady={setTranscript} />
        <Chat transcript={transcript} />
      </main>
    </div>
  );
}
