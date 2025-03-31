const APP_PREFIX = "realtime/transcribe/";
const $ = document.querySelector.bind(document);
const apiKeyEl = $("#openai-api-key");
const modelEl = $("#model");
const promptEl = $("#prompt");
const transcriptEl = $("#transcript");
const startMicrophoneEl = $("#start-microphone");
const startFileEl = $("#start-file");
const stopEl = $("#stop");
const audioInputEl = $("#audio-file");
const prefs = [apiKeyEl, modelEl, promptEl];

let session = null;
let sessionConfig = null;
let vadTime = 0;

function initState() {
  prefs.forEach(p => {
    const fqid = p.id != "openai-api-key" ? APP_PREFIX + p.id : p.id;
    p.value = localStorage.getItem(fqid);
    p.addEventListener("change", () => {
      localStorage.setItem(fqid, p.value);
    });
  });
  updateState(false);
}

function updateState(started) {
  promptEl.disabled = started;
  startMicrophoneEl.disabled = started;
  startFileEl.disabled = started;
  stopEl.disabled = !started;
}

async function startMicrophone() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  start(stream);
}

async function startFile() {
  audioInputEl.currentTime = 0;
  audioInputEl.onended = () => {
    stop();
  };
  const stream = audioInputEl.captureStream();
  await start(stream);
  await audioInputEl.play();
}

async function start(stream) {
  updateState(true);
  transcriptEl.value = "";
  session = new Session(apiKeyEl.value);
  session.ontranscript = t => handleTranscript(t);
  session.onerror = e => handleError(e);
  session.onmessage = parsed => handleMessage(parsed);
  const sessionConfig = {
    prompt: promptEl.value || undefined,
    input_audio_transcription: {
      model: modelEl.value,
    }
  }
  await session.startTranscription(stream, sessionConfig);
}

function stop() {
  updateState(false);
  audioInputEl.pause();
  session.stop();
}

function handleMessage(parsed) {
  console.log(parsed);
  let transcript = null;
  switch (parsed.type) {
    case "transcription_session.created":
      sessionConfig = parsed.session;
      console.log("session created: " + sessionConfig.id);
      break;
    case "input_audio_buffer.speech_started":
      transcript = {
        transcript: "...",
        partial: true,          
      }
      handleTranscript(transcript);
      break;
    case "input_audio_buffer.speech_stopped":
      transcript = {
        transcript: "***",
        partial: true,          
      }
      handleTranscript(transcript);
      vadTime = performance.now() - sessionConfig.turn_detection.silence_duration_ms;
      break;
    //case "conversation.item.input_audio_transcription.delta":
    //  transcriptEl.value += parsed.delta;
    //  break;
    case "conversation.item.input_audio_transcription.completed":
      const elapsed = performance.now() - vadTime;
      transcript = {
        transcript: parsed.transcript,
        partial: false,
        latencyMs: elapsed.toFixed(0)
      }
      handleTranscript(transcript);
      break;
  }
}

function handleTranscript(transcript) {
  const lastNewline = transcriptEl.value.lastIndexOf("\n");
  transcriptEl.value = transcriptEl.value.substring(0, lastNewline + 1);
  transcriptEl.value += transcript.transcript;
  if (!transcript.partial) {
    transcriptEl.value += ` [${transcript.latencyMs}ms]\r\n`;
  }
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function handleError(e) {
  console.error(e);
  stop();
} 

initState();
