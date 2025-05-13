const fs = require("fs");
const csv = require("csv-parser");

const results = [];

fs.createReadStream("questions.csv")
  .pipe(csv())
  .on("data", (data) => {
    data.id = parseInt(data.id, 10);

    try {
      data.model_answers = JSON.parse(data.model_answers);
    } catch {
      data.model_answers = [data.model_answers];
    }

    results.push(data);
  })
  .on("end", () => {
    fs.writeFileSync("questions.json", JSON.stringify(results, null, 2));
    console.log("✅ Updated questions.json from questions.csv");
  });
