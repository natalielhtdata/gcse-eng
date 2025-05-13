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
You are a GCSE English Language teacher giving feedback on a student's answer to a language analysis question.

Your feedback should be clear and designed to help a student push toward a Grade 8–9.

Use the **PETER structure** as your framework:
- **Point**
- **Evidence**
- **Technique**
- **Effect**
- **Relate to question/purpose**

---

## 📄 Student Answer

${userAnswer}

---

## ✅ Overall Feedback (3 Parts)

Comment on these three areas:

1. **PETER Structure**:  
Is the student using PETER clearly and effectively? Are any parts missing or shallow?

2. **Language Features**:  
Have they correctly identified and discussed any of the following?
- **Techniques**: metaphor, simile, tone, contrast, repetition, etc.
- **Word types**: strong adjectives, vivid verbs, modal verbs, pronouns, etc.
- **Patterns**: imagery, lists, clusters, structure
- **Sentence form**: complex, short, interrogative, delayed subject, etc.

3. **(Quietly) Compare to Model Answer**:  
Without mentioning the model answer directly, suggest what they could do better, inspired by the model’s strengths (e.g. stronger effect analysis, clearer technique naming, tighter structure).

Keep the tone kind but firm. Give 2–3 bullet points for each category.

---

## ✍️ Lines That Could Be Improved

ONLY show lines that need help. For each:

✍️ Student Line:  
[Paste the original]

❌ What’s missing:  
Use PETER language. Explain technique, effect, or clarity issues.

✨ Suggested Rewrite:  
Improve the sentence clearly, using stronger technique analysis or structure.

🧠 Tip:  
Optionally name relevant language feature used in the rewrite.
---

💬 Be warm, structured, realistic, and helpful. Don’t rewrite everything — only what needs work.
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
