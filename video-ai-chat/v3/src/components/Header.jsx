export default function Header() {
  return (
    <header className="bg-zinc-800 text-white p-4 flex items-center justify-between shadow">
      <img src="/public/logo.png" alt="Logo" className="w-10 h-10" />
      <h1 className="text-xl font-bold">🎥 AI Video Q&A Assistant</h1>
    </header>
  );
}
