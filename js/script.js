const coverLetterForm = document.getElementById("cover-letter-form");
const outputSection = document.getElementById("cover-letter-output");
const generatedLetterEl = document.getElementById("generated-letter");
const copyButton = document.getElementById("copy-button");
let capturedFormData = null;
let generatedCoverLetter = null;
let copyFeedbackTimeoutId = null;

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

function generateCoverLetter(formData) {
  const { candidateName, jobRole, targetCompany, keySkills } = formData;

  return `Dear Hiring Manager,

I am writing to express my interest in the ${jobRole} position at ${targetCompany}. My name is ${candidateName}, and I believe my background makes me a strong candidate for this role.

Throughout my experience, I have developed strong skills in ${keySkills}. I am confident these skills would allow me to contribute effectively to your team at ${targetCompany}.

I would welcome the opportunity to discuss how my background aligns with the needs of your team. Thank you for considering my application.

Sincerely,
${candidateName}`;
}

function showCopyFeedback(message) {
  copyButton.textContent = message;
  clearTimeout(copyFeedbackTimeoutId);
  copyFeedbackTimeoutId = setTimeout(() => {
    copyButton.textContent = "Copy to Clipboard";
  }, 2000);
}

coverLetterForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  capturedFormData = captureFormData();
  generatedCoverLetter = generateCoverLetter(capturedFormData);

  generatedLetterEl.textContent = generatedCoverLetter;
  copyButton.textContent = "Copy to Clipboard";
  outputSection.hidden = false;
});

copyButton.addEventListener("click", () => {
  navigator.clipboard
    .writeText(generatedCoverLetter)
    .then(() => showCopyFeedback("Copied!"))
    .catch(() => showCopyFeedback("Unable to copy. Please copy the text manually."));
});
