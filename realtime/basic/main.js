class BasicApp extends App {
  constructor() {
    const $ = document.querySelector.bind(document);
    const apiKeyEl = $("#openai-api-key");
    const modelEl = $("#model");
    const voiceEl = $("#voice");
    const instructionsEl = $("#instructions");
    const startBtn = $("#start-microphone");
    const stopBtn = $("#stop");
    const statusEl = $("#status");
    const prefs = [apiKeyEl, modelEl, voiceEl, instructionsEl];
    super("realtime/basic/", prefs, { startBtn, stopBtn, statusEl });
    this.modelEl = modelEl;
    this.voiceEl = voiceEl;
    this.instructionsEl = instructionsEl;
    this.initState();
  }

  buildSessionConfig() {
    return {
      model: this.modelEl.value,
      voice: this.voiceEl.value,
      instructions: this.instructionsEl.value || undefined,
    };
  }

  onTrack(e) {
    const audio = new Audio();
    audio.srcObject = e.streams[0];
    audio.play();
  }

  onOpen() {
    this.sendMessage({ type: "response.create" });
  }

  onMessage(message) {
    console.log("message", message);
  }
}

const app = new BasicApp();
window.startMicrophone = () => app.startMicrophone();
window.stop = () => app.stop();
