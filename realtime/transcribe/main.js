class TranscribeApp extends App {
  constructor() {
    const $ = document.querySelector.bind(document);
    const apiKeyEl = $("#openai-api-key");
    const modelEl = $("#model");
    const promptEl = $("#prompt");
    const turnDetectionEl = $("#turn-detection");
    const transcriptEl = $("#transcript");
    const startBtn = $("#start-microphone");
    const startFileBtn = $("#start-file");
    const stopBtn = $("#stop");
    const audioInputEl = $("#audio-file");
    const statusEl = $("#status");
    const prefs = [apiKeyEl, modelEl, promptEl, turnDetectionEl];
    super("realtime/transcribe/", prefs, { startBtn, stopBtn, statusEl }, "transcription");
    this.modelEl = modelEl;
    this.promptEl = promptEl;
    this.turnDetectionEl = turnDetectionEl;
    this.transcriptEl = transcriptEl;
    this.audioInputEl = audioInputEl;
    this.startFileBtn = startFileBtn;
    this.sessionConfig = null;
    this.vadTime = 0;
    this.initState();
  }

  updateState(started) {
    super.updateState(started);
    this.startFileBtn.disabled = started;
    if (!started) this.transcriptEl.value = "";
  }

  buildSessionConfig() {
    return {
      input_audio_transcription: {
        model: this.modelEl.value,
        prompt: this.promptEl.value || undefined,
      },
      turn_detection: {
        type: this.turnDetectionEl.value,
      },
    };
  }

  async start(stream) {
    this.transcriptEl.value = "";
    await super.start(stream);
  }

  async startFile() {
    if (!this.apiKey) {
      window.alert("Please enter your OpenAI API Key. You can obtain one from https://platform.openai.com/settings/organization/api-keys");
      return;
    }
    this.audioInputEl.currentTime = 0;
    this.audioInputEl.onended = () => {
      setTimeout(() => this.stop(), 3000);
    };
    if (this.audioInputEl.readyState !== HTMLMediaElement.HAVE_METADATA) {
      await new Promise(resolve => {
        this.audioInputEl.onloadedmetadata = resolve;
      });
    }
    const stream = this.audioInputEl.captureStream();
    await this.start(stream);
    await this.audioInputEl.play();
  }

  selectFile() {
    document.querySelector('#audio-file-picker').click();
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.audioInputEl.src = URL.createObjectURL(file);
    }
    this.startFile();
  }

  onMessage(parsed) {
    console.log(parsed);
    let transcript = null;
    switch (parsed.type) {
      case "transcription_session.created":
        this.sessionConfig = parsed.session;
        console.log("session created: " + this.sessionConfig.id);
        break;
      case "input_audio_buffer.speech_started":
        transcript = { transcript: "...", partial: true };
        this.handleTranscript(transcript);
        break;
      case "input_audio_buffer.speech_stopped":
        transcript = { transcript: "***", partial: true };
        this.handleTranscript(transcript);
        this.vadTime = performance.now() - this.sessionConfig.turn_detection.silence_duration_ms;
        break;
      case "conversation.item.input_audio_transcription.completed":
        const elapsed = performance.now() - this.vadTime;
        transcript = { transcript: parsed.transcript, partial: false, latencyMs: elapsed.toFixed(0) };
        this.handleTranscript(transcript);
        break;
    }
  }

  handleTranscript(transcript) {
    const lastNewline = this.transcriptEl.value.lastIndexOf("\n");
    this.transcriptEl.value = this.transcriptEl.value.substring(0, lastNewline + 1);
    this.transcriptEl.value += transcript.transcript;
    if (!transcript.partial) {
      this.transcriptEl.value += '\r\n';
    }
    this.transcriptEl.scrollTop = this.transcriptEl.scrollHeight;
  }
}

const app = new TranscribeApp();
window.startMicrophone = () => app.startMicrophone();
window.startFile = () => app.startFile();
window.selectFile = () => app.selectFile();
window.handleFileSelect = e => app.handleFileSelect(e);
window.stop = () => app.stop();
