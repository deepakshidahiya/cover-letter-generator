const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFParse } = require("pdf-parse");

try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch (err) {
  if (err.code !== "ENOENT") {
    throw err;
  }
}

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_TEXT_LENGTH = 6000;
const RESUME_TTL_MS = 60 * 60 * 1000;

const resumeStore = new Map();

function getResumeText(resumeId) {
  if (!resumeId) {
    return null;
  }

  const entry = resumeStore.get(resumeId);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.createdAt > RESUME_TTL_MS) {
    resumeStore.delete(resumeId);
    return null;
  }

  return entry.text;
}

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
};

function serveStaticFile(req, res) {
  const requestedPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(ROOT_DIR, path.normalize(requestedPath));

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function readRequestBodyBuffer(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let tooLarge = false;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (maxBytes && totalBytes > maxBytes) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        reject(new Error("Payload too large"));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

async function handleParseResume(req, res) {
  let buffer;
  try {
    buffer = await readRequestBodyBuffer(req, MAX_RESUME_SIZE_BYTES);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "File is missing or too large." }));
    return;
  }

  if (!buffer || buffer.length === 0) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "No file was uploaded." }));
    return;
  }

  if (buffer.slice(0, 5).toString("utf8") !== "%PDF-") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Uploaded file is not a valid PDF." }));
    return;
  }

  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const extractedText = result.text.trim();
    if (!extractedText) {
      throw new Error("No extractable text found in PDF.");
    }

    const resumeId = crypto.randomUUID();
    resumeStore.set(resumeId, {
      text: extractedText.slice(0, MAX_RESUME_TEXT_LENGTH),
      createdAt: Date.now(),
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, resumeId }));
  } catch (err) {
    console.error("Resume parsing failed:", err.message);
    res.writeHead(422, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unable to process this resume. Please try a different PDF." }));
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}

function buildCoverLetterPrompt({ candidateName, jobRole, targetCompany, keySkills, resumeText }) {
  const resumeBlock = resumeText
    ? `\n\nCandidate Resume (supporting context only; do not copy it verbatim, and never mention this resume or how it was processed):\n${resumeText}`
    : "";

  return `You are writing a real job application cover letter. Write only the cover letter text with no extra output.

Candidate Name: ${candidateName}
Job Role: ${jobRole}
Target Company: ${targetCompany}
Key Skills: ${keySkills}${resumeBlock}

Requirements:
- Write a professional cover letter suitable for a real job application.
- Tailor the letter to the job role and target company above.
- Naturally weave in the candidate's key skills; do not just list them.
- Use the candidate's name correctly.
- Keep the letter concise and focused: a professional opening, 2-3 clear body paragraphs, and a professional closing.
- Avoid unnecessary repetition and avoid exaggerated or generic claims.
- Only use the information provided above. Do not invent qualifications, experience, achievements, or technologies that were not given.
- Do not claim or imply the candidate has previously worked at ${targetCompany}.
- Do not mention that this letter was generated by AI or any language model.

Output rules:
- Return only the cover letter text itself.
- Do not include a heading such as "Cover Letter".
- Do not include an introduction such as "Here is your cover letter".
- Do not include any explanation, note, analysis, or commentary before or after the letter.
- Do not wrap the response in Markdown code fences or return JSON.`;
}

async function handleGenerateCoverLetter(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Server is not configured correctly." }));
    return;
  }

  let formData;
  try {
    formData = JSON.parse(await readRequestBody(req));
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body." }));
    return;
  }

  const { candidateName, jobRole, targetCompany, keySkills, resumeId } = formData || {};
  if (!candidateName || !jobRole || !targetCompany || !keySkills) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "All fields are required." }));
    return;
  }

  const resumeText = getResumeText(resumeId);

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildCoverLetterPrompt({ candidateName, jobRole, targetCompany, keySkills, resumeText }) }],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini request failed with status ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const coverLetter = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!coverLetter) {
      throw new Error("Gemini response did not include cover letter text.");
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ coverLetter: coverLetter.trim() }));
  } catch (err) {
    console.error("Gemini request failed:", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to generate cover letter. Please try again." }));
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/generate-cover-letter") {
    handleGenerateCoverLetter(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/parse-resume") {
    handleParseResume(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStaticFile(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
