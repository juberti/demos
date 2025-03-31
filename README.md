# OpenAI Realtime API Demos

This repository contains a set of demos demonstrating OpenAI’s Realtime API features, including speech recognition, noise reduction, and interactive voice responses. The demos are structured within the "realtime" directory and can be run in your browser after providing a valid OpenAI API key.

## Features

1. Realtime Voice Agent (basic):
   - Allows you to have a voice conversation with an AI agent.
   - Prompts you to enter an OpenAI API key, select a voice model, and provide optional instructions.

2. Realtime Transcription (transcribe):
   - Streams live audio input from your microphone (or a file) and transcribes it in realtime.

3. Realtime Loopback (noise_reduction):
   - Demonstrates how local audio and the effects of noise reduction can be monitored.

## Getting Started

1. Clone or download this repository.
2. Open the file "realtime/index.html" in your browser, which serves as a hub for all demos.
3. Pick a demo from the links provided.
4. Enter a valid OpenAI API key (you can obtain one from the OpenAI dashboard). It will be stored in browser local storage.
5. Adjust any settings or instructions, then start the microphone to see the realtime features in action.

## Implementation Details

- Each demo is contained in its own folder, with an HTML file, a corresponding JavaScript file, and CSS styles shared from "main.css".
- The primary logic for the basic voice agent is in "realtime/basic/main.js".
- The "Session" logic (located in "session.js") handles the realtime WebRTC connection, sending audio to OpenAI, and receiving text and audio responses.

## Contributing

Feel free to open a pull request or file an issue if you find a bug or have suggestions for improvements.

## Disclaimer

These demos are intended for educational purposes to showcase the Realtime API capabilities.

