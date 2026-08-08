const coverLetterForm = document.getElementById("cover-letter-form");
let capturedFormData = null;

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

coverLetterForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  capturedFormData = captureFormData();
});
