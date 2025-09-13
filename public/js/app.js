(function () {
  console.log('[ADS] client app.js loaded');

  document.addEventListener('DOMContentLoaded', () => {
    try { if (window.M && M.Sidenav) M.Sidenav.init(document.querySelectorAll('.sidenav')); } catch {}
    const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

    renderTips(state.tips);
    renderTrendingPlaceholders(4);
    renderSkeletons(6);
  });

  const state = {
    query: '',
    results: [],
    tips: [
      { title: 'Compare per-unit price', text: 'Normalise by mg/ml/capsule to compare fairly.' },
      { title: 'Watch sizes', text: 'Pack sizes differ—bigger isn’t always cheaper.' },
      { title: 'Expiry windows', text: 'Short-dated stock can be heavily discounted.' },
    ]
  };

  // Elements
  const $search = document.getElementById('search-input');
  const $grid   = document.getElementById('results-grid');
  const $empty  = document.getElementById('results-empty');
  const $tips   = document.getElementById('tips-list');
  const $trend  = document.getElementById('trending-grid');
  const $chatInput = document.getElementById('chat-input');
  const $chatSend  = document.getElementById('chat-send');
  const $chatLog   = document.getElementById('chat-log');

  // Placeholder SVG
  const IMG_PLACEHOLDER =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
        <rect width="100%" height="100%" fill="#f7f9fb"/>
        <g fill="#e7edf2"><rect x="0" y="0" width="600" height="220"/></g>
        <g fill="#6b7280" font-family="Arial,Helvetica" font-size="18">
          <text x="50%" y="250" text-anchor="middle">Image coming soon</text>
        </g>
      </svg>`
    );

  // ---------- Renderers ----------
  function renderTips(items){
    if (!$tips) return;
    $tips.innerHTML = items.map(t =>
      `<li class="collection-item">
         <span class="title" style="font-weight:700">${escapeHtml(t.title)}</span>
         <p class="ads-muted" style="margin:.25rem 0 0">${escapeHtml(t.text)}</p>
       </li>`).join('');
  }

  function renderSkeletons(n = 6){
    if (!$grid) return;
    $grid.innerHTML = Array.from({length: n}).map(() => `
      <div class="col s12 m6 l4">
        <div class="card skeleton-card">
          <div class="skeleton skeleton-image"></div>
          <div class="card-content">
            <div class="skeleton skeleton-line" style="width:80%"></div>
            <div class="skeleton skeleton-line" style="width:60%"></div>
            <div class="skeleton skeleton-price"></div>
            <div style="margin-top:.5rem">
              <span class="skeleton skeleton-chip"></span>
              <span class="skeleton skeleton-chip"></span>
            </div>
          </div>
          <div class="card-action">
            <div class="skeleton" style="width:92px; height:30px; border-radius:999px;"></div>
            <div class="skeleton" style="width:60px; height:18px; border-radius:6px;"></div>
          </div>
        </div>
      </div>
    `).join('');
    if ($empty) $empty.style.display = 'none';
  }

  function renderTrendingPlaceholders(n=4){
    if (!$trend) return;
    $trend.innerHTML = Array.from({length:n}).map(()=> `
      <div class="col s12 m6 l3">
        <div class="card skeleton-card">
          <div class="skeleton skeleton-image" style="height:120px"></div>
          <div class="card-content">
            <div class="skeleton skeleton-line" style="width:70%"></div>
            <div class="skeleton skeleton-line" style="width:40%"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderResults(items){
    if (!$grid) return;
    if (!items.length) {
      $grid.innerHTML = '';
      if ($empty) $empty.style.display = 'block';
      return;
    }
    if ($empty) $empty.style.display = 'none';
    $grid.innerHTML = items.map(p => `
      <div class="col s12 m6 l4">
        <div class="card hoverable">
          <div class="card-image" style="padding:12px; text-align:center;">
            <img src="${escapeAttr(p.image || IMG_PLACEHOLDER)}" alt="${escapeAttr(p.name||'Product')}"
                 onerror="this.src='${IMG_PLACEHOLDER}'" style="max-height:180px; object-fit:contain;">
          </div>
          <div class="card-content">
            <span class="card-title" style="font-size:1.2rem">${escapeHtml(p.name || 'Unnamed product')}</span>
            <p class="ads-muted">${escapeHtml(p.subtitle || '')}</p>
            <p class="ads-muted" style="margin-top:.4rem">
              <i class="material-icons tiny" style="vertical-align:-2px; color:#6b7280">store</i>
              ${escapeHtml(p.retailer || 'Retailer')}
            </p>
          </div>
          <div class="card-action">
            <strong class="price-tag">$${Number(p.price ?? 0).toFixed(2)}</strong>
            ${p.url ? `<a href="${escapeAttr(p.url)}" class="ads-link" target="_blank" rel="noopener">View</a>` : '<span class="ads-muted">Details</span>'}
          </div>
        </div>
      </div>
    `).join('');
  }

  // ---------- Search (mock) ----------
  const debounce = (fn, ms=350)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms);} };
  const MOCK_PRODUCTS = [
    { name:'Vitamin D 1000 IU', subtitle:'200 capsules', price:12.99, retailer:'Chemist Warehouse' },
    { name:'Vitamin C 500 mg',  subtitle:'150 tablets',  price:10.49, retailer:'iHerb' },
    { name:'Fish Oil 1000 mg',  subtitle:'400 capsules', price:16.25, retailer:'Amazon AU' },
    { name:'Calcium + Vit D',   subtitle:'300 tablets',  price:14.20, retailer:'Woolworths' },
    { name:'Magnesium+ 150 mg', subtitle:'120 tablets',  price: 8.80, retailer:'Coles' }
  ];

  async function searchProducts(q){
    await wait(600);
    const query = (q||'').trim().toLowerCase();
    if (!query) return [];
    return MOCK_PRODUCTS.filter(p => JSON.stringify(p).toLowerCase().includes(query));
  }

  const onSearch = debounce(async e=>{
    state.query = e.target.value;
    renderSkeletons(6);
    try {
      const results = await searchProducts(state.query);
      state.results = results;
      renderResults(results);
    } catch (err) {
      console.error('[ADS] search error', err);
      state.results = [];
      renderResults([]);
    }
  }, 250);

  if ($search) $search.addEventListener('input', onSearch);

  // ---------- Chat mock ----------
  if ($chatSend) {
    $chatSend.addEventListener('click', ()=>{
      const msg = ($chatInput?.value || '').trim();
      if(!msg) return;
      appendMsg('You', msg); if ($chatInput) $chatInput.value='';
      setTimeout(()=>appendMsg('ADS', `You asked: "${msg}". (Chatbot coming soon)`), 320);
    });
  }
  if ($chatInput) $chatInput.addEventListener('keydown', e=>{ if(e.key==='Enter') $chatSend?.click(); });

  function appendMsg(author, text){
    if (!$chatLog) return;
    const el = document.createElement('div');
    el.className = `chat-msg ${author==='You'?'right':'left'}`;
    el.innerHTML = `<span class="ads-muted" style="font-size:.8rem">${author}</span>
                    <span>${escapeHtml(text)}</span>`;
    $chatLog.appendChild(el); $chatLog.scrollTop = $chatLog.scrollHeight;
  }

  // ---------- Utils ----------
  function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
  const wait = ms => new Promise(r=>setTimeout(r,ms));
})();
