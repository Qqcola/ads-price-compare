document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');
  const msgDiv = document.getElementById('signup-msg');
  const submitBtn = document.getElementById('signupSubmit');

  const showMsg = (text, ok = false) => {
    msgDiv.innerHTML = text
      ? `<div class="card-panel ${ok ? 'green' : 'red'} lighten-2 white-text" style="margin:8px 0;">${text}</div>`
      : '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMsg('');
    submitBtn.disabled = true;

    const body = {
      firstName: form.firstName.value.trim(),
      lastName:  form.lastName.value.trim(),
      email:     form.email.value.trim().toLowerCase(),
      password:  form.password.value
    };

    try {
      const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin'
      });

      if (res.redirected) {
        // success path (controller redirects to /login.html)
        window.location.href = res.url;
        return;
      }

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        res.ok ? showMsg(data.msg || 'Registered.', true) : showMsg(data.msg || 'Signup failed.');
      } else {
        const text = await res.text();
        showMsg(text || 'Signup failed.');
      }
    } catch (err) {
      showMsg('An error occurred. Please try again.');
    } finally {
      submitBtn.disabled = false;
    }
  });
});
