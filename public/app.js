// app.js
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 1.5MB per photo — keeps total request under Vercel's 4.5MB body limit

const form = document.getElementById('intakeForm');
const alertBox = document.getElementById('formAlert');
const submitBtn = document.getElementById('submitBtn');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  alertBox.hidden = false;
}

function hideAlert() {
  alertBox.hidden = true;
}

// Live preview + size validation for each photo input
['image1', 'image2'].forEach((fieldId) => {
  const input = document.getElementById(fieldId);
  const preview = document.getElementById(`preview${fieldId.slice(-1)}`);
  const img = preview.querySelector('img');

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) {
      preview.hidden = true;
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showAlert(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — please choose a photo under 1.5MB.`,
        'error'
      );
      input.value = '';
      preview.hidden = true;
      return;
    }

    hideAlert();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      preview.hidden = false;
    };
    reader.readAsDataURL(file);
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const image1 = document.getElementById('image1').files[0];
  const image2 = document.getElementById('image2').files[0];

  if (image1 && image1.size > MAX_FILE_SIZE) {
    showAlert('Photo 1 is too large. Please choose a file under 1.5MB.', 'error');
    return;
  }
  if (image2 && image2.size > MAX_FILE_SIZE) {
    showAlert('Photo 2 is too large. Please choose a file under 1.5MB.', 'error');
    return;
  }

  const formData = new FormData(form);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      showAlert('Application submitted successfully. Thank you.', 'success');
      form.reset();
      document.getElementById('preview1').hidden = true;
      document.getElementById('preview2').hidden = true;
    } else {
      const data = await res.json().catch(() => ({}));
      showAlert(data.error || 'Something went wrong. Please try again.', 'error');
    }
  } catch (err) {
    console.error(err);
    showAlert('Network error. Please check your connection and try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
  }
});
