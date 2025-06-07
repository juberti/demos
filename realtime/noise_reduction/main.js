class NoiseReductionApp extends App {
  constructor() {
    const $ = document.querySelector.bind(document);
    const apiKeyEl = document.querySelector("#openai-api-key");
    const nrEl = document.querySelector("#noise-reduction");
    const startBtn = document.querySelector("#start-microphone");
    const stopBtn = document.querySelector("#stop");
    const statusEl = document.querySelector("#status");
    const prefs = [apiKeyEl, nrEl];
    super("realtime/noise_reduction/", prefs, { startBtn, stopBtn, statusEl });
    this.nrEl = nrEl;
    this.nrEl.addEventListener("change", () => {
      const message = { type: "session.update", session: { input_audio_noise_reduction: this.nrEl.value ? { type: this.nrEl.value } : null } };
      if (this.session) {
        this.sendMessage(message);
      }
    });
    this.initState();
  }

  buildSessionConfig() {
    return {
      model: "gpt-4o-mini-realtime-preview",
      instructions: "Always generate an empty response and return control back to the user immediately.",
      input_audio_noise_reduction: this.nrEl.value ? { type: this.nrEl.value } : undefined,
    };
  }

  onMessage(parsed) {
    console.log(parsed);
    switch (parsed.type) {
      case "input_audio_buffer.committed":
        this.sendMessage({ type: "conversation.item.retrieve", item_id: parsed.item_id });
        break;
      case "conversation.item.retrieved":
        this.playAudio(parsed.item.content[0].audio);
        break;
    }
  }

  playAudio(base64Pcm) {
    const pcmBinary = atob(base64Pcm);
    const pcmByteLength = pcmBinary.length;
    const headerBuffer = new ArrayBuffer(44);
    const view = new DataView(headerBuffer);
    const writeString = (view, offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + pcmByteLength, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 24000, true);
    view.setUint32(28, 24000 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, pcmByteLength, true);

    const headerBytes = new Uint8Array(headerBuffer);
    const headerBinary = Array.from(headerBytes).map(byte => String.fromCharCode(byte)).join('');
    const combinedBinary = headerBinary + pcmBinary;
    const uri = "data:audio/wav;base64," + btoa(combinedBinary);
    const audio = new Audio(uri);
    audio.play();
  }
}

const app = new NoiseReductionApp();
window.startMicrophone = () => app.startMicrophone();
window.stop = () => app.stop();
