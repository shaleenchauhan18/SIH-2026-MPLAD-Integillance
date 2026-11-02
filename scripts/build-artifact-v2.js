const fs = require("fs");
const path = require("path");
const A = path.join(__dirname, "..", "artifact");

const head = fs.readFileSync(path.join(A, "app-v2-head.html"), "utf8");
const body = fs.readFileSync(path.join(A, "app-v2-body.html"), "utf8");
const data = fs.readFileSync(path.join(A, "combined-data.json"), "utf8");
const safe = data.replace(/<\//g, "<\\/");

const out = head + "\n" + body.replace("__DATA__", safe);
const outPath = path.join(A, "mplad-intelligence.html");
fs.writeFileSync(outPath, out);
console.log("Wrote", outPath, (out.length / 1024).toFixed(0), "KB");
