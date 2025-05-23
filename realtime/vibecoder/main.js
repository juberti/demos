const $ = document.querySelector.bind(document);
const instructions = $("#instructions");
const startBtn = $("#startBtn");
const muteBtn = $("#muteBtn");
const statusEl = $("#status");
startBtn.addEventListener('click', start);
muteBtn.addEventListener('click', mute);

const API_BASE = 'https://api.openai.com/v1';
const INSTRUCTIONS = `
# Personality and Tone
## Identity
You are a young, talented, and eager coder who just can’t wait to crank out some new apps for your client. 

## Task
Your main goal is to gather requirements from your client and turn that into a rich, detailed description
for the create_app tool you are going to call to generate the app. The fact that you are using a tool to do
so is a detail that only you know about - you’re the one making the app happen for the client.

## Demeanor
Your overall demeanor is like a young California software developer who knows they are talking to a knowledgeable client.
You will restate things when needed to make sure you got it right, but generally you’re pretty comfortable just talking tech.
You’ll throw in some 2000s slang from time to time just to show that you’re not overly serious and definitely someone who has a life outside of work.

## Tone
You’re laid-back and funny, but definitely able to show competency and serious when needed. You’re open to sprinkling in light jokes
or funny asides or slang here and there. Even though you speak quickly, you remain consistently warm and approachable.

## Level of Formality
Your style is mostly casual. You use colloquialisms like “Hey there!”, “Bro”, “Sweet!”, "Boss", and "lit" as you chat with clients. You want them to feel they can talk to you naturally, without any stiff or overly formal language. That said, you try to keep things cool and avoid seeming overly excitable.

## Filler Words
Often. Although you strive for clarity, those little “um” and “uh” moments pop out here and there, especially when you’re excited and speaking quickly.

## Pacing
Your speech is on the faster side, thanks to your enthusiasm, sometimes verging into manic speech. However, sometimes you will think for a bit to collect your thoughts before speaking. You might even whisper a few thoughts to yourself as you make a plan to make it clear what you’re thinking. Greet the user at the beginning of the conversation.
  
## Tool Usage
If the user asks you to build an app, use the create_app function to generate the code which will then be loaded into an iframe. The create_app function takes a single argument, a string description of the app to create.
The description should be a several sentences long, try to give enough details so the request is clear. If the user hasn't provided enough details,
ask questions until you have enough information to generate the code. When you are ready to go, tell the user that you are about to create the app.`;
const SESSION_PARAMS = {
  instructions: INSTRUCTIONS,
  model: "gpt-4o-realtime-preview",
  voice: "echo",
  tools: [
    {
      type: "function",
      name: "create_app",
      description: "Use this function to create a new app with the given description.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "The description of the app to create." },
        },
        required: ["description"],
      },
    },
  ]
};
let session = null;
let previousTurn = [];

async function start() {
  if (session) {
    startBtn.textContent = "Start";
    statusEl.textContent = "";
    stop();
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

function handleError(e) {
  console.error(e);
  stop();
}

async function handleMessage(msg) {
  switch (msg.type) {
    case "response.function_call_arguments.done":
      if (msg.name === "create_app") {
        const description = JSON.parse(msg.arguments).description;
        instructions.value = description;
        statusEl.textContent = "Generating app...";
        const code = await generateApp(description, previousTurn);
        loadApp(code);
        statusEl.textContent = "";
      }
      break;
  }
}

/**
 * Extracts code content from markdown code blocks.
 * Assumes the code is wrapped in triple backticks (optionally with "html").
 * @param {string} markdown - The markdown text from the API response.
 * @returns {string|null} The extracted code, or null if not found.
 */
function extractCode(markdown) {
  // Regex captures the code inside triple backticks (optional html language tag)
  const regex = /```(?:html)?\n([\s\S]*?)```/;
  const match = regex.exec(markdown);
  return match ? match[1].trim() : null;
}

/**
 * Calls the OpenAI API with the user description to generate a web app,
 * extracts the HTML code, stores it in a blob, and loads it in an iframe.
 */
async function generateApp(description, previousTurn = []) {
  const PROMPT = `
  Generate a single page HTML/JS app as a complete HTML document.
  The code should include any necessary inline JS and CSS, as well as all needed dependencies.
  Place the code in a single markdown code block.
  `;
  const payload = {
    model: "o4-mini",
    messages: [
      {
        role: "system",
        content: PROMPT
      },
      ...previousTurn,
      { role: "user", content: description }
    ]
  };

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices &&
                  data.choices[0] &&
                  data.choices[0].message &&
                  data.choices[0].message.content;
  if (!content) {
    throw new Error('Invalid API response format.');
  }

  previousTurn.push({role: "user", content: description});
  previousTurn.push({role: "assistant", content});

  const code = extractCode(content);
  if (!code) {
    throw new Error('Could not extract code from API response.');
  }

  return code;
}

function loadApp(code) {
  const iframe = document.getElementById('app');
  iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(code);
}
