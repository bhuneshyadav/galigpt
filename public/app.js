
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

const $ = id => document.getElementById(id);
const chat = $("chat");
const micBtn = $("micBtn");
const interruptBtn = $("interruptBtn");
const muteBtn = $("muteBtn");
const sendBtn = $("sendBtn");
const textInput = $("textInput");
const statusEl = $("status");
const liveText = $("liveText");
const orb = $("orb");
const aiBadge = $("aiBadge");
const autoListen = $("autoListen");
const shortReplies = $("shortReplies");
const personality = $("personality");
const languageMode = $("languageMode");
const speechLang = $("speechLang");
const roastLevel = $("roastLevel");
const customBank = $("customBank");
const loadDefaultsBtn = $("loadDefaultsBtn");
const saveBankBtn = $("saveBankBtn");
const clearBtn = $("clearBtn");
const exportBtn = $("exportBtn");
const themeBtn = $("themeBtn");
const turnCount = $("turnCount");

const sessionId = localStorage.getItem("galigpt_session") ||
  (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
localStorage.setItem("galigpt_session", sessionId);

let recognition = null;
let isListening = false;
let isSpeaking = false;
let voiceEnabled = true;
let manualStop = false;
let turns = 0;
let transcriptLog = [];

const DEFAULT_BANKS = {
  light: [
    "Oye hero",
    "Abe gadhe",
    "Oye nautanki",
    "Abe baklol",
    "Oye nalayak"
  ],
  medium: [
    "Abe saale",
    "Oye chutiye",
    "Abe kamine",
    "Oye bhosdike",
    "Abe ullu ke patthe"
  ],
  hard: [
    "Abe behenchod",
    "Oye madarchod",
    "Abe bhosdike",
    "Oye gaandu",
    "Abe chutiye saale",
    "Oye lodu"
  ],
  nuclear: [
    "Abe madarchod",
    "Oye behenchod",
    "Abe bhosdike chutiye",
    "Oye gaandu saale",
    "Abe lodu ke bacche",
    "Oye chutiye ke champion"
  ]
};

function currentDefaultText(){
  return DEFAULT_BANKS[roastLevel.value].join(", ");
}

function loadSavedBank(){
  const saved = localStorage.getItem("galigpt_custom_bank");
  customBank.value = saved || currentDefaultText();
}

function bankArray(){
  const raw = customBank.value.trim();
  const arr = raw.split(/,|\n/).map(x => x.trim()).filter(Boolean);
  return arr.length ? arr : DEFAULT_BANKS[roastLevel.value];
}

function roastPrefix(language = "hindi"){
  if(language === "english"){
    const englishPrefixes = {
      light: ["Hey goofball", "You little rascal", "Alright, troublemaker"],
      medium: ["You cheeky menace", "You absolute goof", "Listen up, rascal"],
      hard: ["You ridiculous menace", "You chaotic gremlin", "You certified troublemaker"],
      nuclear: ["You spectacular disaster", "You unstoppable menace", "You world-class rascal"]
    };
    const options = englishPrefixes[roastLevel.value] || englishPrefixes.medium;
    return options[Math.floor(Math.random() * options.length)];
  }

  if(language === "hindi"){
    const hindiPrefixes = {
      light: ["अरे हीरो", "ओए नटखट", "अरे भोलूराम"],
      medium: ["अरे नालायक", "ओए गधे", "अरे कमबख्त"],
      hard: ["अरे बदमाश", "ओए ढक्कन", "अरे शैतान"],
      nuclear: ["अरे महाबदमाश", "ओए शरारती प्राणी", "अरे आफ़त के परकाले"]
    };
    const options = hindiPrefixes[roastLevel.value] || hindiPrefixes.medium;
    return options[Math.floor(Math.random() * options.length)];
  }

  const arr = bankArray();
  return arr[Math.floor(Math.random() * arr.length)] || "Oye";
}

function setState(state, text, subtext){
  orb.className = "orb" + (state ? " " + state : "");
  statusEl.textContent = text || "Ready";
  if(subtext !== undefined) liveText.textContent = subtext;
}

function addBubble(text, role){
  const node = document.createElement("div");
  node.className = `bubble ${role}`;
  const speaker = document.createElement("span");
  speaker.className = "speaker";
  speaker.textContent = role === "user" ? "YOU" : "GALIGPT";
  const body = document.createElement("div");
  body.textContent = text;
  node.append(speaker, body);
  chat.appendChild(node);
  chat.scrollTop = chat.scrollHeight;

  transcriptLog.push({
    time: new Date().toISOString(),
    role,
    text
  });
  if(role === "user"){
    turns += 1;
    turnCount.textContent = `${turns} turn${turns === 1 ? "" : "s"}`;
  }
}

function stripLeadingRoast(text){
  // Keep AI answer intact. The guaranteed app prefix is added separately.
  return (text || "").trim();
}

async function askAI(message){
  setState("", "Thinking…", "AI jawab bana raha hai.");
  try{
    const res = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        message,
        sessionId,
        personality: personality.value,
        languageMode: languageMode.value,
        roastLevel: roastLevel.value,
        shortReplies: shortReplies.checked
      })
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Request failed");

    const reply = stripLeadingRoast(data.text);
    const replyLanguage = data.language || languageMode.value;
    const answer = `${roastPrefix(replyLanguage)}, ${reply}`;
    addBubble(answer, "bot");
    speak(answer, replyLanguage);
  }catch(err){
    const answer = `${roastPrefix()}, AI backend me error aa gaya: ${err.message}`;
    addBubble(answer, "bot");
    speak(answer);
  }
}

function handleUserText(text){
  const value = (text || "").trim();
  if(!value) return;
  interrupt(false);
  addBubble(value, "user");
  liveText.textContent = value;
  askAI(value);
}

function chooseVoice(language){
  const voices = speechSynthesis.getVoices();
  const langWanted = language === "hindi" || language === "hinglish" ? "hi" : "en";
  return voices.find(v => v.lang?.toLowerCase().startsWith(langWanted)) ||
         voices.find(v => /india/i.test(v.name)) ||
         voices[0];
}

function speak(text, language = "hindi"){
  if(!voiceEnabled || !("speechSynthesis" in window)){
    setState("", "Ready", "Voice off hai. Mic dabao aur next baat bol.");
    if(autoListen.checked && !manualStop) setTimeout(startListening, 350);
    return;
  }

  try{ recognition?.stop(); }catch{}
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = language === "hindi" || language === "hinglish" ? "hi-IN" : "en-IN";
  u.rate = 1.02;
  u.pitch = 0.93;
  const v = chooseVoice(language);
  if(v) u.voice = v;

  u.onstart = () => {
    isSpeaking = true;
    setState("speaking", "Speaking…", "Beech me rokna ho to Interrupt dabao.");
  };
  u.onend = () => {
    isSpeaking = false;
    setState("", "Ready", "Bol, sun raha hoon.");
    if(autoListen.checked && !manualStop) setTimeout(startListening, 420);
  };
  u.onerror = () => {
    isSpeaking = false;
    setState("", "Ready", "Voice synth unavailable; text reply ready hai.");
  };

  speechSynthesis.speak(u);
}

function setupRecognition(){
  if(!SR){
    micBtn.disabled = true;
    setState("", "Mic speech unsupported", "Chrome/Edge desktop use karo, ya type karke chat karo.");
    return;
  }

  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    setState("listening", "Listening…", "Bol…");
    micBtn.textContent = "🎙 Listening…";
  };

  recognition.onresult = e => {
    let interim = "";
    let finalText = "";
    for(let i = e.resultIndex; i < e.results.length; i++){
      const t = e.results[i][0].transcript;
      if(e.results[i].isFinal) finalText += t;
      else interim += t;
    }
    liveText.textContent = finalText || interim || "Bol…";
    if(finalText.trim()){
      handleUserText(finalText);
    }
  };

  recognition.onerror = e => {
    isListening = false;
    if(e.error === "not-allowed"){
      setState("", "Mic permission blocked", "Browser settings me microphone allow karo.");
    }else if(e.error !== "aborted" && e.error !== "no-speech"){
      setState("", "Mic error", e.error);
    }else{
      setState("", "Ready", "Bol, sun raha hoon.");
    }
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.textContent = "🎙 Start Talking";
    if(!isSpeaking && statusEl.textContent === "Listening…"){
      setState("", "Ready", "Bol, sun raha hoon.");
    }
  };
}

function startListening(){
  manualStop = false;
  if(isSpeaking) interrupt(false);
  if(!recognition) setupRecognition();
  if(!recognition || isListening) return;
  recognition.lang = speechLang.value;
  try{ recognition.start(); }catch{}
}

function interrupt(showStatus=true){
  manualStop = true;
  try{ recognition?.stop(); }catch{}
  try{ speechSynthesis.cancel(); }catch{}
  isListening = false;
  isSpeaking = false;
  if(showStatus) setState("", "Interrupted", "Ab tu bol.");
}

micBtn.addEventListener("click", startListening);
interruptBtn.addEventListener("click", () => {
  interrupt();
  setTimeout(startListening, 120);
});

muteBtn.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  muteBtn.textContent = voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off";
  if(!voiceEnabled) speechSynthesis.cancel();
});

sendBtn.addEventListener("click", () => {
  const v = textInput.value;
  textInput.value = "";
  handleUserText(v);
});
textInput.addEventListener("keydown", e => {
  if(e.key === "Enter"){
    const v = textInput.value;
    textInput.value = "";
    handleUserText(v);
  }
});

roastLevel.addEventListener("change", () => {
  if(!localStorage.getItem("galigpt_custom_bank")){
    customBank.value = currentDefaultText();
  }
});

loadDefaultsBtn.addEventListener("click", () => {
  customBank.value = currentDefaultText();
  localStorage.removeItem("galigpt_custom_bank");
});

saveBankBtn.addEventListener("click", () => {
  localStorage.setItem("galigpt_custom_bank", customBank.value.trim());
  saveBankBtn.textContent = "Saved ✓";
  setTimeout(() => saveBankBtn.textContent = "Save custom bank", 1000);
});

clearBtn.addEventListener("click", async () => {
  interrupt(false);
  try{
    await fetch("/api/reset", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({sessionId})
    });
  }catch{}
  transcriptLog = [];
  turns = 0;
  turnCount.textContent = "0 turns";
  chat.innerHTML = "";
  addBubble(`${roastPrefix()}, memory reset. Ab nayi bakchodi start kar.`, "bot");
});

exportBtn.addEventListener("click", () => {
  const lines = transcriptLog.map(x => `[${x.time}] ${x.role.toUpperCase()}: ${x.text}`);
  const blob = new Blob([lines.join("\n\n")], {type:"text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `galigpt-chat-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
});

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("galigpt_theme", document.body.classList.contains("light") ? "light" : "dark");
});

speechLang.addEventListener("change", () => {
  if(recognition) recognition.lang = speechLang.value;
});

async function health(){
  try{
    const res = await fetch("/api/health");
    const data = await res.json();
    aiBadge.className = `ai-badge ${data.aiConfigured ? "ready" : "demo"}`;
    aiBadge.textContent = data.aiConfigured
      ? `Ollama Ready • ${data.model}`
      : data.ollamaAvailable
        ? `Run: ollama pull ${data.model}`
        : "Ollama Offline • start Ollama";
  }catch{
    aiBadge.className = "ai-badge demo";
    aiBadge.textContent = "Backend offline";
  }
}

if(localStorage.getItem("galigpt_theme") === "light"){
  document.body.classList.add("light");
}
loadSavedBank();
setupRecognition();
health();
