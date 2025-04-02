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
const statusEl = $("#status");
const prefs = [apiKeyEl, modelEl, promptEl];

let session = null;
let sessionConfig = null;
let vadTime = 0;

function initState() {
  prefs.forEach(p => {
    const fqid = p.id != "openai-api-key" ? APP_PREFIX + p.id : p.id;
    const v = localStorage.getItem(fqid);
    if (v) {
      p.value = v;
    }
    p.addEventListener("change", () => {
      localStorage.setItem(fqid, p.value);
    });
  });
  updateState(false);
}

function updateState(started) {
  statusEl.textContent = "";
  promptEl.disabled = started;
  startMicrophoneEl.disabled = started;
  startFileEl.disabled = started;
  stopEl.disabled = !started;
}

async function startMicrophone() {
  if (!apiKeyEl.value) {
    window.alert("Please enter your OpenAI API Key. You can obtain one from https://platform.openai.com/settings/organization/api-keys");
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  start(stream);
}

function selectFile() {
  $('#audio-file-picker').click(); 
}

function handleFileSelect(e) {
  console.log(e);
  const file = e.target.files[0];
  if (file) {
    console.log(file);
    audioInputEl.src = URL.createObjectURL(file);    
  }
  startFile();
}

async function startFile() {
  if (!apiKeyEl.value) {
    window.alert("Please enter your OpenAI API Key. You can obtain one from https://platform.openai.com/settings/organization/api-keys");
    return;
  }
  audioInputEl.currentTime = 0;
  audioInputEl.onended = () => {
    // When the input file ends, give the transcription time to complete.
    setTimeout(() => stop() , 3000);
  };
  // Can't play until we have metadata.
  if (audioInputEl.readyState !== HTMLMediaElement.HAVE_METADATA) {
    await new Promise(resolve => {
      audioInputEl.onloadedmetadata = resolve;
    });
  }
  const stream = audioInputEl.captureStream();
  await start(stream);
  await audioInputEl.play();
}

async function start(stream) {
  updateState(true);
  transcriptEl.value = "";
  session = new Session(apiKeyEl.value);
  session.onconnectionstatechange = state => statusEl.textContent = state;
  session.onmessage = parsed => handleMessage(parsed);
  session.onerror = e => handleError(e);  
  const sessionConfig = {    
    input_audio_transcription: {
      model: modelEl.value,
      prompt: promptEl.value || undefined,
    }
  }
  await session.startTranscription(stream, sessionConfig);
}

function stop() {
  updateState(false);
  audioInputEl.pause();
  session?.stop();
  session = null;
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
    transcriptEl.value += '\r\n';
  }
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function handleError(e) {
  console.error(e);
  stop();
} 

initState();
