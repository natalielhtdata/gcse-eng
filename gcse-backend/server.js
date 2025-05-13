const fs = require("fs");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { OpenAI } = require("openai");

// ✅ Initialize Express app
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

// ✅ GET: Fetch all questions
app.get("/questions", (req, res) => {
  if (questions.length === 0) {
    return res.status(404).json({ error: "No questions available!" });
  }
  res.json(questions);
});

// ✅ POST: Evaluate student answer
app.post("/evaluate", async (req, res) => {
  const { questionId, userAnswer } = req.body;
  const question = questions.find(q => q.id === questionId);
  const modelAnswer = question?.model_answers?.[0];

  if (!question || !userAnswer || !modelAnswer) {
    return res.status(400).json({ error: "Missing question, answer, or model answer." });
  }

  const prompt = `
You are a GCSE English Language teacher. Your goal is to provide **teaching-style feedback**, one point or sentence at a time, using the PETER structure (Point, Evidence, Technique, Effect, Relate).

Be critical, clear, and constructive — this is for a student who wants to improve to achieve Grade 8–9 in GCSE.

---

## 📄 Student Answer

${userAnswer}

---

## 🧠 Give Feedback Point-by-Point

For each sentence or idea in the student's answer, use this structure:

---

### ✍️ Student Line:  
(Paste their sentence here)

### 🔎 PETER Element:  
Identify which PETER element this sentence represents.

### ❌ What’s Missing or Weak:  
Point out vague ideas, missing techniques, lack of reader effect, etc. Be specific — name what’s not done or not done well.

### 🧠 Try This:  
Give a direct improvement tip: e.g., “You’ve used a good quote, but now zoom in on one word and explore its meaning.”  
Use these when relevant:

**Language Features to Look For:**
- **Techniques**: personification, metaphor, simile, alliteration, onomatopoeia, repetition, tone, contrast, antithesis
- **Word types**: strong adjectives, vivid verbs, modal verbs, pronouns, colour language
- **Patterns**: clusters of words, lists, imagery
- **Sentence form**: short/long, simple/complex, exclamatory, imperative, interrogative, fragment, delayed subject position

### ✨ Improved Version:  
Rewrite the sentence as a model Grade 8–9 response — focus on better technique use, effect, and structure.

---

Repeat this format for every sentence or idea in the student answer.

---

## ✅ Overall Summary

### Strengths:
- List 2–3 specific things the student did well (e.g. quote use, basic technique identification)

### Improvements:
- List 2–3 specific things to improve (e.g. vague effects, missing sentence form, unclear technique naming)

---

## 📘 Model Answer (for student reflection)

${modelAnswer}

---

💬 Always use simple, supportive teacher language — don't just polish, teach. Focus on reasoning, effect, technique, and how to earn marks.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
    });

    const feedback = completion.choices?.[0]?.message?.content || "No feedback generated.";
    res.json({ feedback });
  } catch (error) {
    console.error("❌ OpenAI error:", error.message);
    res.status(500).json({ error: "AI feedback failed." });
  }
});

// ✅ Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
