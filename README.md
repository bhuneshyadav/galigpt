# GaliGPT Next Level

GaliGPT Next Level is a local, browser-based voice AI assistant designed for casual Hindi/Hinglish/English conversation with playful, consensual profanity and roast-style replies. It runs fully on your machine with a local Ollama backend and does not require a cloud API key.

## Features

- Local AI backend using Ollama
- Voice input with browser speech recognition
- Browser text-to-speech output
- Auto-listen after each reply
- Interrupt / barge-in support
- Multiple personalities
- Automatic language detection and script handling
- Manual language modes: Hindi, English, Hinglish, Auto
- Roast intensity levels: Light, Medium, Hard, Nuclear
- Custom profanity bank saved in the browser
- Guaranteed client-side profanity prefix on every reply
- Per-session chat memory
- Chat export support

## Tech Stack

- Node.js
- Express
- Ollama
- Vanilla JavaScript frontend

## Requirements

- Node.js 18+ recommended
- Ollama installed and running locally
- A downloaded model such as `gemma3:4b`

## Quick Start on Windows

### 1. Install Node.js
Download and install a current LTS version from:

https://nodejs.org/

### 2. Install Ollama
Install Ollama from:

https://ollama.com/download

Then open a terminal and pull a model:

```bash
ollama pull gemma3:4b
```

### 3. Install dependencies
From the project folder:

```bash
npm install
```

### 4. Start the app
You can either run the batch file:

```bash
START_GaliGPT.bat
```

Or start it manually:

```bash
npm start
```

### 5. Open in the browser
Visit:

```text
http://localhost:3000
```

Allow microphone access in Chrome or Edge when prompted.

## Environment Variables

A sample configuration is included in `.env.example`.

```env
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:4b
PORT=3000
```

If you want to keep a local `.env` file, copy the example and edit it as needed.

## Project Structure

```text
GaliGPT_Next_Level/
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── .env.example
├── .gitignore
├── EDIT_API_KEY.bat
├── README.md
├── START_GaliGPT.bat
├── package.json
├── server.js
└── package-lock.json
```

## How it works

- The frontend sends chat input to the local Express server.
- The server calls the configured Ollama model using `/api/chat`.
- The app automatically tries to keep replies aligned to the chosen language mode.
- The browser adds a roast/profanity prefix before speaking or displaying the final answer.
- Each browser session keeps its own conversation memory.

## Safety and Usage Notes

This project intentionally includes playful, consensual roast-style language and profanity in a controlled local setting. It avoids protected-group slurs and hateful content. The app is intended for personal or demo use and should be used responsibly.

## Troubleshooting

### Ollama errors
- Make sure Ollama is running
- Check whether the model is downloaded:

```bash
ollama list
```

- Verify your `.env` values for `OLLAMA_HOST` and `OLLAMA_MODEL`

### Microphone not working
- Use Chrome or Edge
- Allow microphone access for `localhost`
- Confirm your browser has permission to use the microphone

### Voice output not playing
- Check browser tab audio
- Make sure the system audio is not muted
- Verify the browser supports speech synthesis

### `npm` not recognized
- Install Node.js and reopen the terminal

## License

This project is provided for local personal use. Add your preferred license if you plan to distribute or publish it publicly.
