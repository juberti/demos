const APP_PREFIX = "realtime/basic/";
const $ = document.querySelector.bind(document);
const apiKeyEl = $("#openai-api-key");
const modelEl = $("#model");
const instructionsEl = $("#instructions");
const outputEl = $("#output");
const startMicrophoneEl = $("#start-microphone");
const stopEl = $("#stop");
const statusEl = $("#status");
const prefs = [apiKeyEl, modelEl, instructionsEl];

let session = null;
let startTime = null;

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
  outputEl.value = "";
  statusEl.textContent = "";
  prefs.forEach(p => p.disabled = started);
  startMicrophoneEl.disabled = started;
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

async function start(stream) {
  updateState(true);
  session = new Session(apiKeyEl.value);
  session.onconnectionstatechange = state => statusEl.textContent = state;
  session.onopen = e => handleOpen();
  session.onmessage = e => handleMessage(e);
  session.onerror = e => handleError(e);
  const sessionConfig = {
    model: modelEl.value,
    instructions: instructionsEl.value || undefined,
    modalities: ["text"],
  }
  await session.start(stream, sessionConfig);
}

function stop() {
  updateState(false);
  session.stop();
  session = null;
}

function handleOpen() {
  const message = { type: "response.create" };
  session.sendMessage(message);
}

function handleMessage(message) {
  console.log(message);
  if (message.type === "input_audio_buffer.speech_stopped") {
    startTime = performance.now();
  } else if (message.type === "response.created") {
    outputEl.value = "";  
  } else if (message.type === "response.text.delta") {
    if (startTime) {
      const duration = performance.now() - startTime;
      statusEl.textContent = `${duration.toFixed(0)}ms`;
      startTime = null;
    }
    outputEl.value += message.delta;
  }
}

function handleError(e) {
  console.error(e);
  stop();
} 

initState();
