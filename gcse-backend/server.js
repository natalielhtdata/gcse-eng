const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { OpenAI } = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Setup OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Load questions.json
const questionsFilePath = "questions.json";
let questions = [];

try {
  if (fs.existsSync(questionsFilePath)) {
    const fileData = fs.readFileSync(questionsFilePath, "utf8").trim();
    if (fileData) {
      questions = JSON.parse(fileData);
      console.log(`✅ Loaded ${questions.length} questions.`);
    } else {
      console.error("❌ 'questions.json' is empty!");
    }
  } else {
    console.error("❌ 'questions.json' file not found!");
  }
} catch (error) {
  console.error("❌ Error loading 'questions.json':", error);
}

// ✅ API: GET questions
app.get("/questions", (req, res) => {
  if (questions.length === 0) {
    return res.status(404).json({ error: "No questions available!" });
  }
  res.json(questions);
});

// ✅ API: POST evaluate
app.post("/evaluate", async (req, res) => {
  const { questionId, userAnswer } = req.body;
  const question = questions.find(q => q.id === questionId);
  const modelAnswer = question?.model_answers?.[0];

  if (!question || !userAnswer || !modelAnswer) {
    return res.status(400).json({ error: "Missing question, answer, or model answer." });
  }

const prompt = `
You are a GCSE English teacher marking a student's response to a language analysis question.

You must provide the following:

---

## ✅ Overall Feedback 

Write 3 bullet points that gives clear, honest feedback.

Focus on:
- Whether the student applied the **PETER structure** properly (Point, Evidence, Technique, Effect, Relate)
- Whether they used and analysed relevant **language features**:
  - Techniques: personification, metaphor, simile, alliteration, repetition, tone, contrast, antithesis
  - Word types: strong adjectives, vivid verbs, modal verbs, pronouns, colour language
  - Patterns: clusters of words, lists, imagery
  - Sentence form: short/long, simple/complex, exclamatory, imperative, interrogative, delayed subject
- Quietly compare the quality to the **model answer** — suggest what could be added or improved (e.g. more zoom-in, deeper effect, clearer structure), but do NOT say “in the model” or “the model does this.”

---

## ✍️ Rewrite Suggestions (only for weak lines)

ONLY rewrite lines that are vague, lack technique, or have shallow analysis.

For each one, use this structure:

✍️ Student Line:  
[the student's original line]

🧠 Tip:  
Explain what’s missing using clear teaching language — mention if there's no technique, effect, quote, or if it doesn’t follow PETER properly.

✨ Rewrite:  
Rephrase the line to match the **tip**, and make it more like the **model answer** in structure, depth, and analysis — but still sound like a student, not an academic.

Do not polish for the sake of it. The goal is to model better technique usage, zoom-in, and reader response analysis.

---

## 📘 Model Answer

${modelAnswer}

---

💬 You are a real teacher coaching a student up to Grade 8–9. Don’t flatter or lecture. Be specific, constructive, and focused on technique and structure.
`;


  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
    });

    const feedback = completion.choices?.[0]?.message?.content || "No feedback generated.";
    res.json({ feedback });
  } catch (error) {
    console.error("❌ OpenAI error:", error.message);
    res.status(500).json({ error: "AI feedback failed." });
  }
});

// ✅ Serve React frontend (must come AFTER API routes)
const buildPath = path.join(__dirname, "build");
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
} else {
  console.warn("⚠️ React build folder not found. Make sure to build it.");
}

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
