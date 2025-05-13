import pandas as pd

# ✅ Use default comma separator (no delimiter argument needed!)
df = pd.read_csv("questions.csv")

# ✅ Check the actual column names for debugging
print("DEBUG: Columns found in CSV file:", df.columns.tolist())

# ✅ Ensure columns exist
required_columns = {"id", "reading_text", "question", "model_answers"}
if not required_columns.issubset(df.columns):
    raise KeyError("❌ Error: The CSV file is missing one or more required columns!")

# ✅ Strip extra quotation marks (just in case)
df["reading_text"] = df["reading_text"].astype(str).str.strip('"')
df["question"] = df["question"].astype(str).str.strip('"')

# ✅ Convert model_answers column to a list
df["model_answers"] = df["model_answers"].fillna("").apply(
    lambda x: x.split("; ") if isinstance(x, str) else [])

# ✅ Export to JSON
df.to_json("questions.json", orient="records", indent=2)

print("✅ questions.json generated successfully!")


