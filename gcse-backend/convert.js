const fs = require("fs");
const csv = require("csv-parser");

const results = [];

fs.createReadStream("questions.csv")
  .pipe(csv())
  .on("data", (row) => {
    row.id = parseInt(row.id, 10);

    try {
      row.model_answers = JSON.parse(row.model_answers);
    } catch {
      row.model_answers = [row.model_answers];
    }

    results.push(row);
  })
  .on("end", () => {
    fs.writeFileSync("questions.json", JSON.stringify(results, null, 2));
    console.log("✅ questions.json has been updated from questions.csv!");
  });

