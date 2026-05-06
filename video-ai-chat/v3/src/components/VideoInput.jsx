import { useState } from 'react';

export default function VideoInput() {
  const [videoUrl, setVideoUrl] = useState('');

  return (
    <div className="mb-6">
      <input
        className="p-2 w-full bg-zinc-800 text-white rounded border border-zinc-700"
        placeholder="Enter YouTube video URL"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
      {videoUrl && (
        <iframe
          className="mt-4 w-full aspect-video rounded"
          src={`https://www.youtube.com/embed/${getYouTubeID(videoUrl)}`}
          frameBorder="0"
          allowFullScreen
        />
      )}
    </div>
  );
}

function getYouTubeID(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : '';
}
