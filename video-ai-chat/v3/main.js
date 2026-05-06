let transcript = ""

function loadVideo() {
  const url = document.getElementById("videoInput").value;
  const videoId = url.split("v=")[1]?.split("&")[0];
  if (videoId) {
    document.getElementById("videoPlayer").src = `https://www.youtube.com/embed/${videoId}`;
    transcript = "Loading transcript..."
    document.getElementById("chatLog").innerHTML = "Transcribing video...";
    // Simulate loading
    setTimeout(() => {
      transcript = "This is a sample transcript of the video content.";
      document.getElementById("chatLog").innerHTML = "Video loaded. Ask your question below.";
    }, 3000);
  } else {
    alert("Invalid YouTube link.");
  }
}

async function askQuestion() {
  const question = document.getElementById("questionInput").value;
  const chatLog = document.getElementById("chatLog");

  chatLog.innerHTML += `<p class="text-blue-400">You: ${question}</p>`;

  const response = await fetchHuggingFaceAnswer(transcript, question);

  chatLog.innerHTML += `<p class="text-green-400">AI: ${response}</p>`;
  document.getElementById("questionInput").value = "";
}
