class Session {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.useSessionToken = true;
    this.ms = null;
    this.pc = null;        
    this.dc = null;
    this.muted = false;
  }

  async start(stream, sessionConfig) {  
    await this.startInternal(stream, sessionConfig, "/v1/realtime/sessions");
  }

  async startTranscription(stream, sessionConfig) {
    await this.startInternal(stream, sessionConfig, "/v1/realtime/transcription_sessions");
  }

  stop() {  
    this.dc.close();
    this.dc = null;
    this.pc.close();
    this.pc = null;
    this.ms.getTracks().forEach(t => t.stop());
    this.ms = null;
    this.muted = false;
  }

  mute(muted) {
    this.muted = muted;
    this.pc.getSenders().forEach(sender => sender.track.enabled = !muted);
  }

  async startInternal(stream, sessionConfig, tokenEnpoint) {
    if (!this.apiKey) {
      window.alert("Please enter your OpenAI API Key. You can obtain one from https://platform.openai.com/settings/organization/api-keys");
      throw("No API key provided");
    }
    this.ms = stream;  
    this.pc = new RTCPeerConnection();
    this.pc.ontrack = (e) => this.ontrack?.(e);
    this.pc.addTrack(stream.getTracks()[0]);
    this.pc.onconnectionstatechange = () => this.onconnectionstatechange?.(this.pc.connectionState);
    this.dc = this.pc.createDataChannel("");  
    this.dc.onopen = (e) => this.onopen?.();
    this.dc.onmessage = (e) => this.onmessage?.(JSON.parse(e.data));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    try {
      const answer = await this.signal(offer, sessionConfig, tokenEnpoint);    
      await this.pc.setRemoteDescription(answer);
    } catch (e) {
      this.onerror?.(e);
    }
  }
  
  async signal(offer, sessionConfig, tokenEnpoint) {
    const urlRoot = "https://api.openai.com";
    const realtimeUrl = `${urlRoot}/v1/realtime`;
    let sdpResponse;
    if (this.useSessionToken) {
      const sessionUrl = `${urlRoot}${tokenEnpoint}`;
      const sessionResponse = await fetch(sessionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "openai-beta": "realtime-v1",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(sessionConfig),
      });
      if (!sessionResponse.ok) {
        throw new Error("Failed to request session token");
      }
      const sessionData = await sessionResponse.json();
      const clientSecret = sessionData.client_secret.value;
      sdpResponse = await fetch(`${realtimeUrl}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${clientSecret}`,        
          "Content-Type": "application/sdp"
        },
      });
      if (!sdpResponse.ok) {
        throw new Error("Failed to signal");
      }
    } else {    
      const formData = new FormData();
      formData.append("session", JSON.stringify(sessionConfig));    
      formData.append("sdp", offer.sdp);
      sdpResponse = await fetch(`${realtimeUrl}`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!sdpResponse.ok) {
        throw new Error("Failed to signal");
      }
    }
    return { type: "answer", sdp: await sdpResponse.text() };
  }

  sendMessage(message) {
    this.dc.send(JSON.stringify(message));
  }
}
  