const APP_PREFIX = "realtime/basic/";
const $ = document.querySelector.bind(document);
const apiKeyEl = $("#openai-api-key");
const modelEl = $("#model");
const voiceEl = $("#voice");
const instructionsEl = $("#instructions");
const startMicrophoneEl = $("#start-microphone");
const stopEl = $("#stop");
const statusEl = $("#status");
const prefs = [apiKeyEl, modelEl, voiceEl, instructionsEl];

let session = null;

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
  statusEl.textContent = "";
  prefs.forEach(p => p.disabled = started);
  startMicrophoneEl.disabled = started;
  stopEl.disabled = !started;
}

async function startMicrophone() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  start(stream);
}

async function start(stream) {
  updateState(true);
  session = new Session(apiKeyEl.value);
  session.onconnectionstatechange = state => statusEl.textContent = state;
  session.ontrack = e => handleTrack(e);
  session.onopen = e => handleOpen();
  session.onmessage = e => handleMessage(e);
  session.onerror = e => handleError(e);
  const sessionConfig = {
    model: modelEl.value,
    voice: voiceEl.value,
    instructions: instructionsEl.value || undefined
  }
  await session.start(stream, sessionConfig);
}

function stop() {
  updateState(false);
  session.stop();
  session = null;
}

function handleTrack(e) {
  const audio = new Audio();
  audio.srcObject = e.streams[0];
  audio.play();  
}

function handleOpen() {
  const message = { type: "response.create" };
  session.sendMessage(message);
}

function handleMessage(message) {
  console.log("message", message);
}

function handleError(e) {
  console.error(e);
  stop();
} 

initState();
