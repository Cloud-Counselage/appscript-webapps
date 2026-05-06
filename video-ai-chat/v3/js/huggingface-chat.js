async function fetchHuggingFaceAnswer(context, question) {
  const HF_TOKEN = import.meta.env.VITE_HUGGINGFACE_TOKEN;

  const res = await fetch("https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: {
        past_user_inputs: [],
        text: `${context}\n\nQuestion: ${question}`,
      }
    }),
  });

  const data = await res.json();
  return data?.generated_text || "Sorry, I couldn't answer that.";
}
