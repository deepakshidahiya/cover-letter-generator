const coverLetterForm = document.getElementById("cover-letter-form");
const outputSection = document.getElementById("cover-letter-output");
const generatedLetterEl = document.getElementById("generated-letter");
const copyButton = document.getElementById("copy-button");
const generateButton = document.getElementById("generate-button");
const resumeInput = document.getElementById("resume-upload");
const resumeErrorEl = document.getElementById("resume-upload-error");
const resumeStatusEl = document.getElementById("resume-upload-status");
let capturedFormData = null;
let generatedCoverLetter = null;
let copyFeedbackTimeoutId = null;
let isGenerating = false;
let uploadedResumeId = null;

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

const fields = [
  { id: "candidate-name", label: "Candidate Name" },
  { id: "job-role", label: "Job Role" },
  { id: "target-company", label: "Target Company" },
  { id: "key-skills", label: "Key Skills" },
];

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (message) {
    input.setAttribute("aria-invalid", "true");
    errorEl.textContent = message;
  } else {
    input.removeAttribute("aria-invalid");
    errorEl.textContent = "";
  }
}

function validateForm() {
  let isValid = true;
  let firstInvalidField = null;

  fields.forEach(({ id, label }) => {
    const input = document.getElementById(id);
    const value = input.value.trim();

    if (!value) {
      setFieldError(id, `${label} is required.`);
      isValid = false;
      if (!firstInvalidField) {
        firstInvalidField = input;
      }
    } else {
      setFieldError(id, "");
    }
  });

  if (firstInvalidField) {
    firstInvalidField.focus();
  }

  return isValid;
}

function captureFormData() {
  return {
    candidateName: document.getElementById("candidate-name").value.trim(),
    jobRole: document.getElementById("job-role").value.trim(),
    targetCompany: document.getElementById("target-company").value.trim(),
    keySkills: document.getElementById("key-skills").value.trim(),
  };
}

function showCopyFeedback(message) {
  copyButton.textContent = message;
  clearTimeout(copyFeedbackTimeoutId);
  copyFeedbackTimeoutId = setTimeout(() => {
    copyButton.textContent = "Copy to Clipboard";
  }, 2000);
}

resumeInput.addEventListener("change", async () => {
  resumeErrorEl.textContent = "";
  resumeStatusEl.textContent = "";

  const file = resumeInput.files[0];

  if (!file) {
    resumeErrorEl.textContent = "Please select a resume file.";
    return;
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    resumeErrorEl.textContent = "Please upload a PDF file.";
    resumeInput.value = "";
    return;
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    resumeErrorEl.textContent = "File is too large. Please upload a PDF under 5MB.";
    resumeInput.value = "";
    return;
  }

  resumeInput.disabled = true;

  try {
    const response = await fetch("/api/parse-resume", {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to process resume.");
    }

    uploadedResumeId = data.resumeId;
    resumeStatusEl.textContent = `Resume uploaded successfully: ${file.name}`;
  } catch {
    resumeErrorEl.textContent = "Unable to process this resume. Please try a different PDF.";
    resumeInput.value = "";
  } finally {
    resumeInput.disabled = false;
  }
});

coverLetterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateForm() || isGenerating) {
    return;
  }

  capturedFormData = captureFormData();

  isGenerating = true;
  generateButton.disabled = true;
  generateButton.textContent = "Generating...";

  try {
    const response = await fetch("/api/generate-cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...capturedFormData, resumeId: uploadedResumeId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate cover letter.");
    }

    generatedCoverLetter = data.coverLetter;
    generatedLetterEl.textContent = generatedCoverLetter;
    copyButton.hidden = false;
    copyButton.textContent = "Copy to Clipboard";
  } catch {
    generatedLetterEl.textContent = "Unable to generate your cover letter right now. Please try again.";
    copyButton.hidden = true;
  } finally {
    isGenerating = false;
    generateButton.disabled = false;
    generateButton.textContent = "Generate Cover Letter";
  }

  outputSection.hidden = false;
});

copyButton.addEventListener("click", () => {
  navigator.clipboard
    .writeText(generatedCoverLetter)
    .then(() => showCopyFeedback("Copied!"))
    .catch(() => showCopyFeedback("Unable to copy. Please copy the text manually."));
});
