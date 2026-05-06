import Header from './components/Header';
import VideoInput from './components/VideoInput';
import Chat from './components/Chat';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="text-center text-white p-4">
  <h1 className="text-3xl font-bold">🎥 AI Video Q&A Assistant</h1>
  <p>Paste a YouTube video link and ask questions from it.</p>
</div>
      <Header />
      <main className="p-4">
        <VideoInput />
        <Chat />
      </main>
    </div>
  );
}
