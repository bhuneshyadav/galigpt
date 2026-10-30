# GaliGPT Next Level — Voice AI v2

A local web app for verbal AI conversation with configurable, consensual Hindi/Hinglish profanity at the start of every reply.

## What changed from v1

- Local AI backend using Ollama; no API key or cloud account is required.
- Conversation memory for the current server session.
- Voice recognition + browser text-to-speech.
- Auto-listen after each answer.
- Interrupt / barge-in button.
- Multiple personalities.
- Automatic language and script matching: Roman Hindi gets Roman Hindi/Hinglish, Devanagari Hindi gets Devanagari, and English gets English.
- Optional manual Hindi / English / Hinglish response modes.
- Light / Medium / Hard / Nuclear profanity modes.
- Custom profanity bank saved locally in the browser.
- Guaranteed client-side profanity prefix on every reply.
- Chat export.

## Setup on Windows

### 1. Install Node.js
Install a current Node.js LTS release if Node is not already installed.

### 2. Install Ollama and download a model
Install Ollama for Windows from [ollama.com/download](https://ollama.com/download), then open a terminal and run:

ollama pull gemma3:4b

The model download is several gigabytes. Ollama normally starts its local service automatically.

Optional `.env` settings:

OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
PORT=3000

### 3. Run
Double-click `START_GaliGPT.bat`

or open Command Prompt in this folder and run:

npm install
npm start

### 4. Open
Go to:
http://localhost:3000

Allow microphone access in Chrome or Edge.

## Ollama not ready?
The app shows whether Ollama is offline or the configured model still needs downloading. Start Ollama, then run `ollama pull gemma3:4b` if needed.

## Profanity design
The included bank contains ordinary Hindi/Hinglish profanity and consensual roasting. Protected-group slurs and hateful terms are intentionally not included.

## Troubleshooting
- Mic not working: use Chrome/Edge and allow microphone permission for localhost.
- Voice not speaking: check system/browser speech voices and unmute the tab.
- `npm` not recognized: install Node.js and reopen Command Prompt.
- AI error: verify Ollama is running, the model is downloaded (`ollama list`), and `OLLAMA_HOST` / `OLLAMA_MODEL` in `.env` are correct.
