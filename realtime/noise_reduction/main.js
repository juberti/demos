const APP_PREFIX = "realtime/noise_reduction/";
const $ = document.querySelector.bind(document);
const apiKeyEl = $("#openai-api-key");
const nrEl = $("#noise-reduction");
const startMicrophoneEl = $("#start-microphone");
const stopEl = $("#stop");
const statusEl = $("#status");
const prefs = [apiKeyEl, nrEl];

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
  nrEl.addEventListener("change", () => {
    const message = { type: "session.update", session: { input_audio_noise_reduction: nrEl.value ? { type: nrEl.value } : null } };
    if (session) {
      session.sendMessage(message);
    }
  });
}

function updateState(started) {
  statusEl.textContent = "";
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
  session.onmessage = parsed => handleMessage(parsed);
  session.onerror = e => handleError(e);
  
  const sessionConfig = {
    model: "gpt-4o-realtime",
    instructions: "Always generate an empty response and return control back to the user immediately.",
    input_audio_noise_reduction: nrEl.value ? { type: nrEl.value } : undefined
  }
  await session.start(stream, sessionConfig);
}

function stop() {
  updateState(false);
  session.stop();
  session = null;
}

function handleMessage(parsed) {
  console.log(parsed);
  switch (parsed.type) {
    case "input_audio_buffer.committed":
      const message = { type: "conversation.item.retrieve", item_id: parsed.item_id };
      session.sendMessage(message);
      break;
    case "conversation.item.retrieved":
      playAudio(parsed.item.content[0].audio);
      break;
  }
}

function handleError(e) {
  console.error(e);
  stop();
}

function playAudio(base64Pcm) {
  const pcmBinary = atob(base64Pcm);
  const pcmByteLength = pcmBinary.length;
  const headerBuffer = new ArrayBuffer(44);
  const view = new DataView(headerBuffer);
  const writeString = (view, offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmByteLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);  
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, 24000, true);      // 24kHz
  view.setUint32(28, 24000 * 2, true);  
  view.setUint16(32, 2, true);          
  view.setUint16(34, 16, true);         // 16-bit
  writeString(view, 36, "data");
  view.setUint32(40, pcmByteLength, true);
  
  const headerBytes = new Uint8Array(headerBuffer);
  const headerBinary = Array.from(headerBytes).map(byte => String.fromCharCode(byte)).join('');
  const combinedBinary = headerBinary + pcmBinary;
  const uri = "data:audio/wav;base64," + btoa(combinedBinary);
  const audio = new Audio(uri);
  audio.play();
}

initState();
