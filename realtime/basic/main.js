const APP_PREFIX = "realtime/basic/";
const $ = document.querySelector.bind(document);
const apiKeyEl = $("#openai-api-key");
const modelEl = $("#model");
const voiceEl = $("#voice");
const instructionsEl = $("#instructions");
const startMicrophoneEl = $("#start-microphone");
const stopEl = $("#stop");
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
  modelEl.disabled = started;
  instructionsEl.disabled = started;
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
  session.onerror = e => handleError(e);
  await session.start(stream, modelEl.value, instructionsEl.value);
}

function stop() {
  updateState(false);
  session.stop();
}

function handleError(e) {
  console.error(e);
  stop();
} 

initState();
