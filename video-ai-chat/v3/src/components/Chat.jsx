import { useState } from 'react';

export default function Chat() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');

  const askAI = async () => {
    setResponse('Thinking...');
    const result = await fetch('https://api-inference.huggingface.co/models/google/flan-t5-large', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_HUGGINGFACE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: question })
    });

    const data = await result.json();
    setResponse(data[0]?.generated_text || 'No response');
  };

  return (
    <div className="mt-6">
      <input
        className="p-2 w-full bg-zinc-800 text-white rounded border border-zinc-700"
        placeholder="Ask a question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button onClick={askAI} className="mt-2 px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-700">
        Ask
      </button>
      {response && (
        <p className="mt-4 bg-zinc-800 p-3 rounded border border-zinc-700">{response}</p>
      )}
    </div>
  );
}
