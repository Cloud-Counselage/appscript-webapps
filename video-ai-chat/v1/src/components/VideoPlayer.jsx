export default function VideoPlayer({ onTranscriptReady }) {
  const [videoSrc, setVideoSrc] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [isYouTube, setIsYouTube] = useState(false);

  const handleLink = () => {
    setIsYouTube(linkInput.includes('youtube.com') || linkInput.includes('youtu.be'));
    setVideoSrc(linkInput);
    simulateTranscript(linkInput);
  };

  const simulateTranscript = (source) => {
    const fakeTranscript = `Transcript from ${source}... (simulated)`;
    onTranscriptReady(fakeTranscript);
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">Load a Video</h2>
      <div className="flex flex-col gap-2 md:flex-row md:gap-4">
        <input
          type="text"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          placeholder="Paste video link (YouTube or mp4)..."
          className="flex-1 bg-white dark:bg-gray-700 p-2 rounded"
        />
        <button
          onClick={handleLink}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Load
        </button>
      </div>

      {videoSrc && (
        <div className="mt-4 rounded overflow-hidden">
          {isYouTube ? (
            <iframe
              width="100%"
              height="360"
              src={videoSrc.replace("watch?v=", "embed/")}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <video controls className="w-full h-64 bg-black rounded" src={videoSrc} />
          )}
        </div>
      )}
    </div>
  );
}
