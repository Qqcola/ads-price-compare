document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('loginError');

  // Show/Hide the password
  const pwd = document.getElementById('password');
  const toggle = document.getElementById('togglePassword');
  if (pwd && toggle) {
    toggle.addEventListener('click', () => {
      const isPwd = pwd.type === 'password';
      pwd.type = isPwd ? 'text' : 'password';
      toggle.querySelector('.material-icons').textContent = isPwd ? 'visibility_off' : 'visibility';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.classList.remove('show');
    msg.hidden = true;

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.redirected) {
        // server sent us to /home.html
        window.location.href = res.url;
        return;
      }

      const text = await res.text();

      // Map status codes to friendly messages
      let friendly = text || 'Login failed.';
      if (res.status === 404) friendly = 'User not found.';
      else if (res.status === 401) friendly = 'Wrong password.';

      msg.textContent = friendly;
      msg.hidden = false;
      msg.classList.add('show');
    } catch (_err) {
      msg.textContent = 'Login failed.';
      msg.hidden = false;
      msg.classList.add('show');
    }
  });
});
