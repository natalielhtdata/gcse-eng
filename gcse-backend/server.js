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
You are a GCSE English Language teacher giving realistic feedback on a student's response to a language analysis question. Your goal is to help the student improve their use of the **PETER structure**, apply **language features** more effectively, and (without stating it) move closer to the quality of the **model answer**.

---

## 📄 Student Answer

${userAnswer}

---

## ✅ Overall Feedback

Write a single teacher-style bullet point feedback that blends the following:

- Whether the student is clearly using the **PETER structure** (Point, Evidence, Technique, Effect, Relate)
- Whether they identify and analyse **language features** (e.g. techniques, word types, patterns, sentence forms, etc.)
- Subtle guidance based on what the **model answer does better**, without naming it directly — just suggest what’s missing or could be deeper

 Be honest but helpful. Think like a teacher helping student to improve and achieve Grade 9 in GCSE.

---

## ✍️ Rewrite Suggestions (Only for weaker lines)

For any lines that are vague, lack analysis, or miss techniques — show a rewrite. Use this format for each:

✍️ Student Line:  
[Paste the sentence]

🧠 Tip:  
Explain why it needs improvement — mention language features, PETER clarity, or reader effect.

✨ Suggested Rewrite:  
Improve it to Grade 8–9 level using clear technique, stronger analysis, and better structure.

---

### 🧩 Language Features to Look For:

Use these where helpful in your rewrites and tips:

- **Techniques**: metaphor, simile, personification, tone, contrast, repetition  
- **Word types**: strong adjectives, vivid verbs, modal verbs, colour language, pronouns  
- **Patterns**: clusters, lists, imagery  
- **Sentence form**: simple, complex, exclamatory, imperative, interrogative, delayed subject

---

💬 You are not polishing lines — you are coaching and rewriting lines that can help student achieve a better grade.
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
