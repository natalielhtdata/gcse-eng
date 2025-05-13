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
You are a GCSE English Language teacher giving supportive, structured feedback.

Use the **PETER structure** (Point, Evidence, Technique, Effect, Relate) as your framework. The goal is to help the student move toward Grade 8–9.

---

## 📄 Student Answer

${userAnswer}

---

## ✅ Overall Feedback

Start with a general comment on the student’s work:
- What they do well (e.g. quote selection, technique naming, structure)
- What needs improving (e.g. vague commentary, missing effects, weak technique use)

---

## 🔍 Lines That Need Improvement

ONLY highlight lines that are unclear, weak, or lacking technique.

For each one:

---

✍️ Student Line:  
[Paste the original line]

❌ What’s missing:  
Name what’s unclear, vague or not using **language feature**. Use PETER language.

🧠 Tip:  
Reference the model answer or relevant **language feature** if it helps (e.g. simile, modal verb, sentence form)

✨ Improved Version:  
Rewrite the sentence using stronger analysis, technique naming, and effect on reader.

---

### 🧩 Language Features to Look For:

Use these when relevant in rewrites or comments:

- **Techniques**: personification, metaphor, simile, alliteration, onomatopoeia, repetition, tone, contrast, antithesis  
- **Word types**: strong adjectives, vivid verbs, modal verbs, pronouns, colour language  
- **Patterns**: clusters of words, lists, imagery  
- **Sentence form**: short/long, simple/complex, exclamatory, imperative, interrogative, fragment, delayed subject position

---

## 📘 Model Answer 

${modelAnswer}

---

💬 Write with reference to the model answer. Show how to improve to Grade 9 in GCSE.
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
