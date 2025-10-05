(function () {
  const $ = (id) => document.getElementById(id);

  const title    = $('welcomeTitle');
  const hudName  = $('hudName');
  const hudEmail = $('hudEmail');
  const hudJti   = $('hudJti');
  const navWelcome = $('navWelcome');

  const cookiesCard   = $('cookiesCard');
  const cookiesToggle = $('cookiesToggle');
  const hasCookiesUI  = !!(cookiesCard && cookiesToggle);

  function toggleCookies() {
    if (!hasCookiesUI) return;
    const open = cookiesCard.classList.toggle('open');
    cookiesCard.setAttribute('aria-hidden', String(!open));
    cookiesToggle.setAttribute('aria-expanded', String(open));
  }

  if (hasCookiesUI) {
    cookiesToggle.addEventListener('click', toggleCookies);

    document.addEventListener('click', (e) => {
      if (!cookiesCard) return;
      if (!cookiesCard.classList.contains('open')) return;
      const clickInside  = cookiesCard.contains(e.target);
      const clickOnBtn   = cookiesToggle.contains(e.target);
      if (!clickInside && !clickOnBtn) {
        cookiesCard.classList.remove('open');
        cookiesCard.setAttribute('aria-hidden', 'true');
        cookiesToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  (async function init() {
    try {
      const res  = await fetch('/api/me', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      console.log(data.user);

      if (res.ok && data.ok && data.user) {
        const { fullName, email, jti } = data.user;
        const first = (fullName || 'User').split(' ')[0];
        if (title)      title.textContent      = `Welcome, ${fullName || 'User'}`;
        if (navWelcome) navWelcome.textContent = `Welcome, ${first}`;
        if (hudName)    hudName.textContent    = fullName || '—';
        if (hudEmail)   hudEmail.textContent   = email || '—';
        if (hudJti)     hudJti.textContent     = jti || '—';
      } else {
        if (title)      title.textContent      = 'Welcome';
        if (navWelcome) navWelcome.textContent = 'Welcome, —';
        if (hudName)    hudName.textContent    = '—';
        if (hudEmail)   hudEmail.textContent   = '—';
        if (hudJti)     hudJti.textContent     = '—';
      }
    } catch {
      if (title)      title.textContent      = 'Welcome';
      if (navWelcome) navWelcome.textContent = 'Welcome, —';
      if (hudName)    hudName.textContent    = '—';
      if (hudEmail)   hudEmail.textContent   = '—';
      if (hudJti)     hudJti.textContent     = '—';
    }

    // Decode refresh cookie only if the JTI cell exists
    if (hudJti && hudJti.textContent === '—') {
      try {
        const s = await fetch('/api/session', { credentials: 'include' }).then(r => r.json());
        if (s && s.ok && s.jti) hudJti.textContent = s.jti;
      } catch {}
    }
  })();
})();
