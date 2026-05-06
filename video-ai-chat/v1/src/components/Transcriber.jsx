export default function Transcriber({ videoUrl, setTranscript }) {
  useEffect(() => {
    if (videoUrl) {
      // Fake transcript for demo
      setTranscript("This is a fake transcript. Replace with Whisper WASM.")
    }
  }, [videoUrl])

  return null
}
