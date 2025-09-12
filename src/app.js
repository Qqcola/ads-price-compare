// Init Materialize components
document.addEventListener('DOMContentLoaded', () => {
  const sidenavs = document.querySelectorAll('.sidenav');
  M.Sidenav.init(sidenavs, {});
  document.getElementById('year').textContent = new Date().getFullYear();
});

// ------- Simple state
const state = {
  query: '',
  results: [],
  tips: [
    { title: 'Compare per-unit price', text: 'Normalise by mg/ml/capsule to compare fairly.' },
    { title: 'Watch sizes', text: 'Retailers vary pack sizes—bigger isn’t always cheaper.' },
    { title: 'Check expiry windows', text: 'Short-dated stock can be discounted heavily.' },
  ]
};

// ------- DOM refs
const $search = document.getElementById('search-input');
const $grid = document.getElementById('results-grid');
const $loading = document.getElementById('results-loading');
const $empty = document.getElementById('results-empty');
const $tips = document.getElementById('tips-list');
const $chatInput = document.getElementById('chat-input');
const $chatSend = document.getElementById('chat-send');
const $chatLog = document.getElementById('chat-log');

// ------- Helpers
const debounce = (fn, ms = 350) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

function showLoading(show) {
  $loading.style.display = show ? 'block' : 'none';
}

function renderTips(items) {
  $tips.innerHTML = items.map(t => `
    <li class="collection-item">
      <span class="title" style="font-weight:600">${t.title}</span>
      <p class="grey-text">${t.text}</p>
    </li>
  `).join('');
}

function renderResults(items) {
  $grid.innerHTML = items.map(card).join('');
  $empty.style.display = items.length ? 'none' : 'block';
}

// Card template (designer can restyle via CSS)
function card(p) {
  // p = { name, brand, size, price, retailer, url }
  return `
    <div class="col s12 m6 l4">
      <div class="card hoverable">
        <div class="card-content">
          <span class="card-title black-text">${escapeHtml(p.name || 'Unknown')}</span>
          <p class="grey-text">${escapeHtml(p.brand || '')} ${escapeHtml(p.size || '')}</p>
          <p class="grey-text text-darken-2" style="margin-top:.5rem;">
            <i class="material-icons tiny">store</i>
            ${escapeHtml(p.retailer || 'Retailer')}
          </p>
        </div>
        <div class="card-action">
          <span class="price-tag">$${Number(p.price ?? 0).toFixed(2)}</span>
          ${p.url ? `<a href="${p.url}" class="right" target="_blank" rel="noopener">View</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Basic escaping
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ------- Data fetch (wire to your API later)
async function searchProducts(q) {
  // TODO: replace mock with real API:
  // const res = await fetch(`/api/products?query=${encodeURIComponent(q)}`);
  // const data = await res.json();
  // return Array.isArray(data) ? data : [];

  // Mock data for now so the UI works:
  const mock = [
    { name: 'Vitamin D 1000 IU', brand: 'Blackmores', size: '200 caps', price: 12.99, retailer: 'Chemist Warehouse', url: '#' },
    { name: 'Vitamin C 500 mg', brand: 'Swisse', size: '150 tabs', price: 10.49, retailer: 'iHerb', url: '#' },
    { name: 'Fish Oil 1000 mg', brand: 'Nature’s Own', size: '400 caps', price: 16.25, retailer: 'Amazon AU', url: '#' },
  ];
  return mock.filter(p => JSON.stringify(p).toLowerCase().includes(q.toLowerCase()));
}

// ------- Events
const onSearch = debounce(async (e) => {
  state.query = e.target.value.trim();
  showLoading(true);
  try {
    state.results = state.query ? await searchProducts(state.query) : [];
    renderResults(state.results);
  } catch (err) {
    console.error('[ADS] search error', err);
    renderResults([]);
  } finally {
    showLoading(false);
  }
}, 300);

$search.addEventListener('input', onSearch);

// Tips render initial
renderTips(state.tips);

// Simple chat mock (wire to /api/chat later)
$chatSend.addEventListener('click', () => {
  const msg = $chatInput.value.trim();
  if (!msg) return;
  appendMsg('You', msg);
  $chatInput.value = '';
  setTimeout(() => {
    appendMsg('ADS', `You asked about: "${msg}". (Chatbot coming soon)`);
  }, 300);
});

$chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $chatSend.click();
});

function appendMsg(author, text) {
  const el = document.createElement('div');
  el.className = `chat-msg ${author === 'You' ? 'right' : 'left'}`;
  el.innerHTML = `
    <span class="chat-author">${author}</span>
    <span class="chat-text">${escapeHtml(text)}</span>
  `;
  $chatLog.appendChild(el);
  $chatLog.scrollTop = $chatLog.scrollHeight;
}
