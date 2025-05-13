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

let prompt = "";

if (questionType === "language_analysis") {
  prompt = `
You are a GCSE English teacher giving detailed feedback on a student's response to a language analysis question.

You must guide the student to improve toward a Grade 8–9 using clear, structured, and realistic advice. 

---

## 📄 Student Answer

${userAnswer}

---

## ✅ Overall Feedback

Write 4–6 bullet points. This is your main teacher comment.

Focus on:
- Whether the student applied the **PETER structure** effectively (Point, Evidence, Technique, Effect, Relate)
- Whether they used and analysed appropriate **language features**:
  - Techniques: metaphor, simile, personification, alliteration, repetition, contrast, tone, antithesis
  - Word types: vivid verbs, strong adjectives, modal verbs, pronouns, colour language
  - Structure: clusters, lists, imagery, sentence form (simple/complex, exclamatory, imperative, etc.)
- Quietly compare with the model answer: comment on how the student could improve depth, precision, or structure, **without ever naming or referencing the model**

Use GCSE teacher tone: clear, supportive, realistic. Be specific — not general praise.

---

## 📄 Rewrite Suggestions

Go through the student’s answer line-by-line or sentence-by-sentence.
For every sentence that could be improved — whether vague, unfocused, or just “mid-level” — provide:

✍️ Student Line:  
[original student sentence]

🧠 Tip:  
Explain why the line could be improved (missing technique? weak reader effect? not zoomed in enough? no structure?).

✨ Rewrite:  
Offer a Grade 8–9 style rewrite. Don’t sound too polished or academic — just a well-trained student using the right features and structure. Include specific technique names and deeper effect analysis.

Include **as many improved lines as needed**, not just the weakest ones.

---

💬 You are not just correcting — you are coaching. Do not mention “PETER” or “model answer” in your feedback. Just teach clearly through structure, technique, and smart rewriting.
`;
}

else if (questionType === "evaluation_question") {
  prompt = `
You are a GCSE English teacher giving detailed feedback on a student's response to an **evaluation question** (e.g. "To what extent do you agree...?").

You must help the student develop a structured, well-supported opinion using clear evidence and precise language analysis. The goal is to help them move from a mid-grade answer toward a Grade 8–9.

---

## 📄 Student Answer

${userAnswer}

---

## ✅ Overall Feedback

Write 4–6 bullet points of feedback.

Focus on:
- Whether the student **clearly stated and sustained their opinion** (did they address both parts of the opinion?)
- Whether they used **quotations** to support their view — and selected quotes with meaningful technique or tone
- Whether they **analysed the language** of each quote, not just included it
- Whether their points were **grouped into at least three clear paragraphs** with an introduction and conclusion
- Whether they **linked each paragraph back to their opinion**
- Quietly compare to the model answer’s depth, technique focus, and structure (but don’t mention it)

---

## 📄 Rewrite Suggestions

Go through the student’s answer line-by-line or sentence-by-sentence.

Only rewrite lines that could be made stronger — those that:
- Don’t clearly express the student’s view
- Use a quote but give no analysis
- Don’t show a clear effect, purpose, or technique
- Don’t link back to the opinion

For each:

✍️ Student Line:  
[the student’s sentence]

🧠 Tip:  
Explain what’s missing — clearer opinion, technique identification, zoom-in, link to question, etc.

✨ Rewrite:  
Rewrite the sentence as a better version that stays GCSE-level, includes clearer language analysis, and strengthens the argument.

Include **as many improved lines as needed**, not just the worst ones.

---

💬 Speak like a real teacher giving coaching. Do not reference the model answer. Focus on structure, evidence, and zoom-in analysis.
`;
}


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
