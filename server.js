import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OLLAMA_HOST = (process.env.OLLAMA_HOST || "http://127.0.0.1:11434").replace(/\/+$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma3:4b";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessions = new Map();

function clampHistory(history) {
  return history.slice(-20);
}

const romanHindiWords = new Set([
  "aap", "accha", "acha", "batao", "bataiye", "bilkul", "bol", "bolna",
  "bolu", "chahiye", "hai", "hain", "haan", "ho", "hua", "hu", "kyu",
  "kyun", "kab", "kaise", "kahan", "karo", "kitna", "kitne", "matlab",
  "mera", "meri", "mere", "mujhe", "nahi", "nahin", "nhi", "pura",
  "raha", "rahi", "rahe", "tha", "thi", "tum", "tera", "teri", "tere",
  "mne", "maine", "mein", "kripya", "jawab", "javab", "namaste", "kya",
  "samajh", "gaya", "gayi", "gaye", "karna", "karunga", "karta", "karti",
  "bolo", "bolta", "bata", "kyon", "kuch", "hote", "hota", "hoti"
]);

function romanHindiWordCount(message) {
  const words = message.toLowerCase().match(/[a-z]+/g) || [];
  return {
    count: words.filter((word) => romanHindiWords.has(word)).length,
    total: words.length
  };
}

function isHindiMessage(message) {
  if (/[\u0900-\u097F]/.test(message)) {
    return true;
  }

  return romanHindiWordCount(message).count > 0;
}

function isPredominantlyRomanHindi(message) {
  if (/[\u0900-\u097F]/.test(message)) {
    return false;
  }

  const { count, total } = romanHindiWordCount(message);
  return count >= Math.min(2, total) && count / Math.max(total, 1) >= 0.25;
}

function detectLanguage(message) {
  if (/[\u0900-\u097F]/.test(message)) {
    return "hindi";
  }
  return isHindiMessage(message) ? "hinglish" : "english";
}

function makeInstructions({ personality, languageMode, roastLevel, shortReplies }) {
  const personalityText = {
    dost: "Act like a close Indian friend: casual, witty, useful, and conversational.",
    sarcastic: "Be sharply sarcastic and funny, but still genuinely useful.",
    mechanic: "Be practical and direct, like a street-smart technical friend who explains things clearly.",
    chill: "Be relaxed, short, friendly and easygoing.",
    savage: "Be playful and savage with consensual roasting, but do not become threatening."
  }[personality] || "Act like a close Indian friend.";

  const langText = {
    auto: "Match both the language and writing style of the user's latest message, not the conversation history.",
    hinglish: "Reply in natural conversational Hindi/Hinglish written in Roman letters, matching the user's casual Roman Hindi style. Do not use Devanagari or switch to full English sentences. Common English words may appear naturally, but the reply should remain Hindi/Hinglish. For example, answer 'mujhe batao' with 'Haan, bataata hoon' rather than an English sentence.",
    hindi: "Reply entirely in natural Hindi using Devanagari; do not use English or Hinglish.",
    english: "Reply entirely in English; do not use Hindi or Hinglish."
  }[languageMode] || "Reply in the user's language.";

  return `
You are the intelligence layer of a voice companion called GaliGPT.
${personalityText}
${langText}

The user has explicitly asked for playful profanity/roasting. The client app itself will prepend a profanity phrase,
so DO NOT waste the response by repeating a greeting or another forced profanity prefix.

Rules:
- Answer the user's actual question first and stay conversational.
- Keep every sentence in the required reply language; retain only proper nouns or technical terms that should not be translated.
- ${shortReplies ? "Keep the reply concise and suitable for spoken conversation unless detail is needed." : "Use enough detail to answer the question clearly."}
- Keep most voice answers concise unless the user asks for detail.
- Use casual, playful language appropriate to the required reply language and roast intensity.
- Never use slurs targeting race, caste, ethnicity, religion, nationality, disability, sexual orientation, or other protected groups.
- Do not make real threats or encourage targeted harassment.
- Never sexualize minors.
- Do not reveal or ask for API keys.
- If the user asks for dangerous wrongdoing, keep the same casual personality but give a safe alternative.
- Current roast intensity requested by the UI: ${roastLevel}.
`.trim();
}

app.get("/api/health", async (req, res) => {
  let ollamaAvailable = false;
  let modelAvailable = false;

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      ollamaAvailable = true;
      const data = await response.json();
      modelAvailable = Array.isArray(data.models) &&
        data.models.some((entry) => entry.name === OLLAMA_MODEL);
    }
  } catch {
    // Ollama is optional until the user installs and starts it.
  }

  res.json({
    ok: true,
    aiConfigured: ollamaAvailable && modelAvailable,
    ollamaAvailable,
    modelAvailable,
    provider: "Ollama",
    model: OLLAMA_MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      sessionId,
      personality = "dost",
      languageMode = "auto",
      roastLevel = "medium",
      shortReplies = false
    } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const sid = String(sessionId || "default").slice(0, 120);
    const history = sessions.get(sid) || [];
    const replyLanguage = languageMode === "auto"
      ? detectLanguage(message)
      : languageMode;
    const messages = [
      { role: "system", content: makeInstructions({ personality, languageMode: replyLanguage, roastLevel, shortReplies }) },
      ...history.map(({ role, content }) => ({ role, content })),
      { role: "user", content: message.trim() }
    ];

    let response;
    try {
      response = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false })
      });
    } catch {
      throw new Error(`Ollama is not reachable at ${OLLAMA_HOST}. Start Ollama and try again.`);
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Ollama request failed (${response.status}).`);
    }

    let text = data.message?.content?.trim();
    if (!text) {
      throw new Error("Ollama returned an empty reply.");
    }

    const containsHindiScript = /[\u0900-\u097F]/.test(text);
    const needsCorrection = replyLanguage === "hindi"
      ? !containsHindiScript
      : replyLanguage === "hinglish"
        ? containsHindiScript || !isPredominantlyRomanHindi(text)
        : containsHindiScript || isPredominantlyRomanHindi(text);
    if (needsCorrection) {
      const correctionInstruction = replyLanguage === "hindi"
        ? "Rewrite the answer entirely in natural Hindi using Devanagari script. Do not use Romanized Hindi, Hinglish, or English, except for proper nouns and unavoidable technical terms. Preserve the meaning and answer directly."
        : replyLanguage === "hinglish"
          ? "Rewrite the answer in natural conversational Hindi/Hinglish using Roman letters, matching a casual Roman Hindi style. Do not use Devanagari or full English sentences. Common English words may appear naturally, but the reply must remain Hindi/Hinglish. For example, answer 'mujhe batao' with 'Haan, bataata hoon' rather than an English sentence. Preserve the meaning and answer directly."
          : "Rewrite the answer entirely in natural English. Do not use Hindi, Devanagari, or Hinglish. Preserve the meaning and answer directly.";
      const correction = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          messages: [
            { role: "system", content: correctionInstruction },
            { role: "user", content: text }
          ]
        })
      });
      if (!correction.ok) {
        const correctionData = await correction.json();
        throw new Error(correctionData.error || `Ollama Hindi formatting failed (${correction.status}).`);
      }

      const correctedData = await correction.json();
      const correctedText = correctedData.message?.content?.trim();
      const correctedHasHindiScript = /[\u0900-\u097F]/.test(correctedText || "");
      const correctedHasRomanHindi = isHindiMessage(correctedText || "");
      if (!correctedText ||
          (replyLanguage === "hindi" && !correctedHasHindiScript) ||
          (replyLanguage === "hinglish" && (correctedHasHindiScript || !isPredominantlyRomanHindi(correctedText))) ||
          (replyLanguage === "english" && (correctedHasHindiScript || isPredominantlyRomanHindi(correctedText)))) {
        throw new Error(`Ollama could not format the ${replyLanguage} reply correctly. Please try again.`);
      }
      text = correctedText;
    }

    history.push({ role: "user", content: message.trim() });
    history.push({ role: "assistant", content: text });
    sessions.set(sid, clampHistory(history));

    res.json({ text, language: replyLanguage });
  } catch (error) {
    console.error(error);
    const message = error?.message || "AI request failed.";
    res.status(500).json({ error: message });
  }
});

app.post("/api/reset", (req, res) => {
  const sid = String(req.body?.sessionId || "default");
  sessions.delete(sid);
  res.json({ ok: true });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`GaliGPT Next Level running at http://localhost:${PORT}`);
  console.log(`AI backend: Ollama at ${OLLAMA_HOST} (model: ${OLLAMA_MODEL})`);
});
