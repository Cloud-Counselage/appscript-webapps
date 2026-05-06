import { useState, useRef } from 'react';

export default function VideoPlayer({ setTranscript }) {
  const [loading, setLoading] = useState(false);
  const videoRef = useRef();

  // Convert video/audio to Blob for Whisper
  const handleTranscribe = async () => {
    const video = videoRef.current;
    if (!video || !video.src) return alert('Upload or load a video first.');

    try {
      setLoading(true);
      setTranscript('Transcribing...');

      // Fetch video blob
      const response = await fetch(video.src);
      const blob = await response.blob();

      // Load Whisper
      const whisper = await window.whisper.create({
        model: 'base.en', // You can use 'tiny.en' for faster
        whisper_cpp_url: 'https://cdn.jsdelivr.net/gh/ggerganov/whisper.cpp',
      });

      const result = await whisper.transcribe(blob);
      setTranscript(result.text || 'Transcription failed.');
      setLoading(false);
    } catch (error) {
      setTranscript('Error transcribing.');
      console.error(error);
      setLoading(false);
    }
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    videoRef.current.src = url;
  };

  return (
    <div className="mb-6">
      <input type="file" accept="video/*,audio/*" onChange={handleUpload} />
      <video ref={videoRef} controls className="mt-4 w-full max-w-2xl rounded-lg shadow" />
      <button
        onClick={handleTranscribe}
        disabled={loading}
        className="mt-4 bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Transcribing...' : 'Transcribe with Whisper'}
      </button>
    </div>
  );
}
