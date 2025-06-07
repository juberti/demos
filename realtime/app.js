class App {
  constructor(prefix, prefs = [], controls = {}, sessionType = "standard") {
    this.prefix = prefix;
    this.prefs = prefs;
    this.controls = controls;
    this.sessionType = sessionType;
    this.session = null;
  }

  initState() {
    this.prefs.forEach(p => {
      const fqid = p.id !== "openai-api-key" ? this.prefix + p.id : p.id;
      const v = localStorage.getItem(fqid);
      if (v) {
        p.value = v;
      }
      p.addEventListener("change", () => {
        localStorage.setItem(fqid, p.value);
      });
    });
    this.updateState(false);
  }

  updateState(started) {
    if (this.controls.statusEl) {
      this.controls.statusEl.textContent = "";
    }
    this.prefs.forEach(p => (p.disabled = started));
    if (this.controls.startBtn) this.controls.startBtn.disabled = started;
    if (this.controls.stopBtn) this.controls.stopBtn.disabled = !started;
  }

  getApiKey() {
    const el = document.getElementById("openai-api-key");
    return el ? el.value : null;
  }

  async startMicrophone() {
    if (!this.getApiKey()) {
      window.alert(
        "Please enter your OpenAI API Key. You can obtain one from https://platform.openai.com/settings/organization/api-keys"
      );
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await this.start(stream);
  }

  async start(stream) {
    this.updateState(true);
    this.session = new Session(this.getApiKey());
    this.session.onconnectionstatechange = state => this.onConnectionStateChange(state);
    this.session.ontrack = e => this.onTrack(e);
    this.session.onopen = () => this.onOpen();
    this.session.onmessage = msg => this.onMessage(msg);
    this.session.onerror = e => this.onError(e);
    const config = this.buildSessionConfig();
    if (this.sessionType === "transcription") {
      await this.session.startTranscription(stream, config);
    } else {
      await this.session.start(stream, config);
    }
  }

  stop() {
    this.updateState(false);
    if (this.session) {
      this.session.stop();
      this.session = null;
    }
  }

  sendMessage(msg) {
    this.session?.sendMessage(msg);
  }

  mute(muted) {
    this.session?.mute(muted);
  }

  // Hooks for subclasses
  buildSessionConfig() { return {}; }
  onTrack(_e) {}
  onOpen() {}
  onMessage(_msg) {}
  onError(e) { console.error(e); this.stop(); }
  onConnectionStateChange(state) {
    if (this.controls.statusEl) this.controls.statusEl.textContent = state;
  }
}

