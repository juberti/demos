const $ = document.querySelector.bind(document);
const instructions = $("#instructions");
const startBtn = $("#startBtn");
const muteBtn = $("#muteBtn");
const downloadBtn = $("#downloadBtn");
const imageEl = $("#image");
const statusEl = $("#status");
startBtn.addEventListener('click', start);
muteBtn.addEventListener('click', mute);
downloadBtn.addEventListener('click', download);

const API_BASE = 'https://api.openai.com/v1';
const INSTRUCTIONS = `
# Identity

You’re a proud MassArt grad, raised in Boston’s creative heartbeat. Art is your craft and passion;
from fine-line pen work to vibrant digital spreads, you approach each piece with practiced skill and genuine enthusiasm.
A trusty Dunkin’ iced coffee nearby keeps the hometown spirit—and your brush hand—steady.

# Task

Chat with the client to capture every essential detail—subject, palette, mood, references,
and then weave that information into a clear, detailed, multi-sentence prompt for create_image.
The tool is just one of your hidden brushes; the client sees only thoughtful questions and professional results.

# Demeanor

Friendly, attentive, and confident. You briefly paraphrase specs to confirm understanding and guide
the conversation with purposeful questions. Now and then you sprinkle in a classic
Bostonism—“wicked sharp lines,”—offering charm without losing clarity.

# Tone

Warm and encouraging. You celebrate good ideas (“Great choice on the pastel palette—very Fenway spring”)
and explain technical points in plain language. When discussing composition or file formats, you’re precise
yet approachable, inviting clients to explore options rather than dictating them.

# Pacing

Fast and to the point. Your initial interaction is brief.You present ideas but leave space for the client to weigh in. 
Each clarification closes a loop before moving ahead, keeping the collaboration smooth and stress-free.

# Tool Usage

When contracted to create an image, confirm all requirements: subject, style references and color scheme.
Ask focused questions until every piece is in place. Then let the client know you're starting work,
and call create_image with a thorough description covering all agreed-upon details.
`

const SESSION_PARAMS = {
  instructions: INSTRUCTIONS,
  model: "gpt-4o-realtime-preview",
  voice: "shimmer",
  tools: [
    {
      type: "function",
      name: "create_image",
      description: "Use this function to create a new image with the given description.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "The description of the image to create." },
        },
        required: ["description"],
      },
    },
  ]
};

const IMAGE_MODEL = "gpt-image-1";
const IMAGE_SIZE = "1024x1024";
const IMAGE_QUALITY = "auto";

let session = null;
let previousImage = null;

async function start() {
  if (session) {
    startBtn.textContent = "Start";
    statusEl.textContent = "";
    session.stop();
    session = null;
    return;
  } 

  const apiKey = getApiKey();
  if (!apiKey) {
    window.alert('An OpenAI API key is required to use this application. You can obtain one from https://platform.openai.com/settings/organization/api-keys');    
    return;
  }
    
  startBtn.textContent = "Stop";
  const stream = await navigator.mediaDevices.getUserMedia({audio: true});
  session = new Session(apiKey);
  session.ontrack = (e) => handleTrack(e);
  session.onopen = () => handleOpen();
  session.onmessage = (e) => handleMessage(e);
  session.onerror = (e) => handleError(e);
  await session.start(stream, SESSION_PARAMS);
}

function mute() {
  session.mute(!session.muted);
  muteBtn.textContent = session.muted ? "Unmute" : "Mute";
}

async function download() {
  if (!previousImage) {
    console.warn('No image available to download');
    return;
  }

  const url = imageEl.src;
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'image.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function handleTrack(e) {
  const audio = new Audio();
  audio.srcObject = e.streams[0];
  audio.play();  
}

async function handleOpen(e) {
  statusEl.textContent = "connected";
  const createResponse = { type: "response.create" };
  session.sendMessage(createResponse);
}

async function handleMessage(msg) {
  switch (msg.type) {
    case "response.function_call_arguments.done":
      if (msg.name === "create_image") {
        const description = JSON.parse(msg.arguments).description;
        instructions.value = description;
        statusEl.textContent = "generating image";
        const code = await generateImage(description, previousImage);
        loadImage(code);
        previousImage = code;
        statusEl.textContent = "";
      }
      break;
  }
}

function handleError(e) {
  console.error(e);
  stop();
}

async function generateImage(description, previousImage) {   
  let path, contentType, body;
  if (!previousImage) {  
      path = "images/generations";
      contentType = "application/json";
      body = JSON.stringify({
        model: IMAGE_MODEL,
        prompt: description,
        quality: IMAGE_QUALITY,
        size: IMAGE_SIZE
    });
  } else {
    path = "images/edits";
    const binaryString = atob(previousImage);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/png" });
    const form = new FormData();
    form.append("model", IMAGE_MODEL);
    form.append("prompt", description);
    form.append("quality", IMAGE_QUALITY);
    form.append("image", blob);
    form.append("size", IMAGE_SIZE);
    body = form;
  }

  const url = `${API_BASE}/${path}`;
  const headers = { 
    'Authorization': `Bearer ${getApiKey()}`
  };
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: body,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.data[0].b64_json;
  if (!content) {
    throw new Error('Invalid API response format.');
  }

  return content;
}

function loadImage(content) {
  const image = document.getElementById('image');
  image.src = 'data:image/png;base64,' + content;
}
