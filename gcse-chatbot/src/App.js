import React, { useState, useEffect } from "react";

function App() {
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetch("/questions")
      .then(res => res.json())
      .then(data => setQuestions(data))
      .catch(err => console.error("Error loading questions", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selectedQuestion) return;

    setSubmitted(true);
    setFeedback("Generating feedback...");

    try {
      const res = await fetch("/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          userAnswer: input,
        }),
      });

      const data = await res.json();
      setFeedback(data.feedback || "⚠️ Could not generate feedback.");
    } catch (err) {
      console.error("Submission error:", err);
      setFeedback("❌ Could not connect to server.");
    }
  };

  const formatFeedback = (text) => {
    let formatted = text;

    // Icons
    formatted = formatted.replace(/(✍️|❌|✅|⭐)/g, "<strong>$1</strong>");

    // Headings (standardized size and spacing)
    formatted = formatted.replace(/^## 📄 Line-by-Line Feedback/gm, "<h2 style='font-size: 1.5rem; margin-bottom: 0.5rem;'>📄 Line-by-Line Feedback</h2>");
    formatted = formatted.replace(/^## 🧠 Summary of What You're Missing \(Table\)/gm, "<h2 style='font-size: 1.5rem; margin-bottom: 0.5rem;'>🧠 Summary of What You're Missing</h2>");
    formatted = formatted.replace(/^## ✅ Overall Strengths/gm, "<h2 style='font-size: 1.5rem; margin-bottom: 0.5rem;'>✅ Overall Strengths</h2>");
    formatted = formatted.replace(/^## ❌ Overall Weaknesses/gm, "<h2 style='font-size: 1.5rem; margin-bottom: 0.5rem;'>❌ Overall Weaknesses</h2>");
    formatted = formatted.replace(/^## 📘 Model Answer for Reflection/gm, "<h2 style='font-size: 1.5rem; margin-bottom: 0.5rem;'>📘 Model Answer for Reflection</h2>");

    // Table rendering (4-column PETER table)
    const tableRegex = /\|(.+?)\|/g;
    let rows = [...text.matchAll(tableRegex)].map(row =>
      row[0].split("|").filter(Boolean).map(cell =>
        `<td style="border: 1px solid #ccc; padding: 8px;">${cell.trim()}</td>`
      )
    );
    if (rows.length >= 5 && rows[0].length === 4) {
      const htmlRows = rows.map(r => `<tr>${r.join("")}</tr>`).join("");
      const tableHTML = `<table style="border-collapse: collapse; margin: 1rem 0; font-family: Georgia; font-size: 14px;">${htmlRows}</table>`;
      formatted = formatted.replace(/\|(.+?)\|/g, ""); // remove original markdown
      formatted += "<br>" + tableHTML;
    }

    // Clean spacing
    formatted = formatted.replace(/\n{2,}/g, "<br><br>");
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h2>GCSE English Feedback Assistant</h2>

      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div>
          <label><strong>Select a question:</strong></label>
          <select
            onChange={(e) => {
              setSelectedQuestion(JSON.parse(e.target.value));
              setInput("");
              setSubmitted(false);
              setFeedback("");
            }}
            defaultValue=""
            style={{ marginLeft: "1rem", padding: "0.5rem" }}
          >
            <option value="" disabled>Select a question...</option>
            {questions.map(q => (
              <option key={q.id} value={JSON.stringify(q)}>{q.question}</option>
            ))}
          </select>
        </div>
      )}

      {selectedQuestion && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Reading Text:</h3>
          <p>{selectedQuestion.reading_text}</p>

          <h3>Question:</h3>
          <p>{selectedQuestion.question}</p>

          <h3>Your Answer:</h3>
          <textarea
            rows="6"
            cols="80"
            placeholder="Type your answer here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ padding: "0.5rem", fontSize: "1rem", width: "100%" }}
          />

          <br /><br />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
          >
            Submit Answer
          </button>

          {submitted && (
            <div style={{ marginTop: "2rem" }}>
              <h3>AI Feedback:</h3>
              <div
                style={{
                  backgroundColor: "#f9f9f9",
                  padding: "1rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  whiteSpace: "pre-wrap",
                  fontFamily: "Georgia, serif",
                  lineHeight: "1.6",
                }}
                dangerouslySetInnerHTML={{ __html: formatFeedback(feedback) }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

