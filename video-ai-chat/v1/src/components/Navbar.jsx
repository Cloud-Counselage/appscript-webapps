export default function Navbar({ dark, toggleDark }) {
  return (
    <nav className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800">
      <div className="text-xl font-bold">Video AI Chat</div>
      <button
        className="p-2 rounded bg-gray-300 dark:bg-gray-700"
        onClick={toggleDark}
      >
        {dark ? '☀️ Light' : '🌙 Dark'}
      </button>
    </nav>
  );
}
