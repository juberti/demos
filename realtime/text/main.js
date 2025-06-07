class TextApp extends App {
  constructor() {
    const $ = document.querySelector.bind(document);
    const apiKeyEl = $("#openai-api-key");
    const modelEl = $("#model");
    const instructionsEl = $("#instructions");
    const outputEl = $("#output");
    const startBtn = $("#start-microphone");
    const stopBtn = $("#stop");
    const statusEl = $("#status");
    const prefs = [apiKeyEl, modelEl, instructionsEl];
    super("realtime/basic/", prefs, { startBtn, stopBtn, statusEl });
    this.modelEl = modelEl;
    this.instructionsEl = instructionsEl;
    this.outputEl = outputEl;
    this.startTime = null;
    this.initState();
  }

  updateState(started) {
    super.updateState(started);
    if (!started) this.outputEl.value = "";
  }

  buildSessionConfig() {
    return {
      model: this.modelEl.value,
      instructions: this.instructionsEl.value || undefined,
      modalities: ["text"],
    };
  }

  onOpen() {
    this.sendMessage({ type: "response.create" });
  }

  onMessage(message) {
    console.log(message);
    if (message.type === "input_audio_buffer.speech_stopped") {
      this.startTime = performance.now();
    } else if (message.type === "response.created") {
      this.outputEl.value = "";
    } else if (message.type === "response.text.delta") {
      if (this.startTime) {
        const duration = performance.now() - this.startTime;
        this.controls.statusEl.textContent = `${duration.toFixed(0)}ms`;
        this.startTime = null;
      }
      this.outputEl.value += message.delta;
    }
  }
}

const app = new TextApp();
window.startMicrophone = () => app.startMicrophone();
window.stop = () => app.stop();
