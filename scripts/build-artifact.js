const fs = require("fs");
const path = require("path");

const templatePath = path.join(__dirname, "..", "artifact", "app-template.html");
const dataPath = path.join(__dirname, "..", "data", "artifact-data.json");
const outPath = path.join(__dirname, "..", "artifact", "mplad-intelligence.html");

const template = fs.readFileSync(templatePath, "utf8");
const rawData = fs.readFileSync(dataPath, "utf8");
// Guard against premature </script> termination in the HTML tokenizer.
// This is safe inside JSON string values ("\/" unescapes back to "/").
const safeData = rawData.replace(/<\//g, "<\\/");

const out = template.replace("__DATA__", safeData);
fs.writeFileSync(outPath, out);
console.log("Wrote", outPath, (out.length / 1024).toFixed(0), "KB");
