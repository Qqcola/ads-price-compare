
(function () {
  const $ = (id) => document.getElementById(id);

  const title    = $('welcomeTitle');
  const hudName  = $('hudName');
  const hudEmail = $('hudEmail');
  const hudJti   = $('hudJti');

  const navWelcome = $('navWelcome');

  const cookiesCard   = $('cookiesCard');
  const cookiesToggle = $('cookiesToggle');

  function toggleCookies() {
    const open = cookiesCard.classList.toggle('open');
    cookiesCard.setAttribute('aria-hidden', String(!open));
    cookiesToggle.setAttribute('aria-expanded', String(open));
  }
  cookiesToggle.addEventListener('click', toggleCookies);

  document.addEventListener('click', (e) => {
    if (!cookiesCard.classList.contains('open')) return;
    const clickInsideCard  = cookiesCard.contains(e.target);
    const clickOnToggleBtn = cookiesToggle.contains(e.target);
    if (!clickInsideCard && !clickOnToggleBtn) {
      cookiesCard.classList.remove('open');
      cookiesCard.setAttribute('aria-hidden', 'true');
      cookiesToggle.setAttribute('aria-expanded', 'false');
    }
  });

  (async function init() {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok && data.user) {
        const { fullName, email, jti } = data.user;
        const first = (fullName || 'User').split(' ')[0];

        if (title) title.textContent = `Welcome, ${fullName || 'User'}`;
        if (navWelcome) navWelcome.textContent = `Welcome, ${first}`; 

        if (hudName)  hudName.textContent  = fullName || '—';
        if (hudEmail) hudEmail.textContent = email || '—';
        if (hudJti)   hudJti.textContent   = jti || '—';
      } else {
        if (title) title.textContent = 'Welcome';
        if (navWelcome) navWelcome.textContent = 'Welcome, —';        
        if (hudName)  hudName.textContent  = '—';
        if (hudEmail) hudEmail.textContent = '—';
        if (hudJti)   hudJti.textContent   = '—';
      }
    } catch {
      if (title) title.textContent = 'Welcome';
      if (navWelcome) navWelcome.textContent = 'Welcome, —';  
      if (hudName)  hudName.textContent  = '—';
      if (hudEmail) hudEmail.textContent = '—';
      if (hudJti)   hudJti.textContent   = '—';
    }

    if (hudJti && hudJti.textContent === '—') {
      try {
        const s = await fetch('/api/session', { credentials: 'include' }).then(r => r.json());
        if (s && s.ok && s.jti) hudJti.textContent = s.jti;
      } catch {}
    }
  })();
})();

