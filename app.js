/* ===================================================
   GameInfo – app.js
   Aangedreven door de Anthropic API (claude-sonnet-4)
   =================================================== */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// ── DOM refs ──────────────────────────────────────────
const inp     = document.getElementById('searchInput');
const btn     = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const result  = document.getElementById('result');

inp.addEventListener('keydown', e => { if (e.key === 'Enter') zoekGame(); });

// ── Zoek helpers ──────────────────────────────────────
function zoekDirect(naam) {
  inp.value = naam;
  zoekGame();
}

async function zoekGame() {
  const naam = inp.value.trim();
  if (!naam) return;

  btn.disabled = true;
  loading.style.display = 'flex';
  result.style.display  = 'none';
  result.innerHTML      = '';

  try {
    const resp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: `Je bent een game-informatie assistent. Geef ALTIJD een geldig JSON object terug, NIETS anders. Geen uitleg, geen markdown backticks, puur JSON.

Formaat:
{
  "gevonden": true,
  "naam": "exacte game naam",
  "emoji": "één passende emoji",
  "genre": "genre(s) bijv. Battle Royale, RPG, FPS",
  "beschrijving": "2 duidelijke zinnen over de game in het Nederlands",
  "platforms": ["PC", "PS5", "Xbox Series X", "Nintendo Switch", "iOS", "Android"],
  "multiplayer": "Online multiplayer" of "Lokale co-op" of "Solo" of "Online + Lokaal" etc,
  "gratis": true of false,
  "prijs": "Gratis" of "±€X" of "€X/maand (abonnement)",
  "leeftijd": "PEGI 3" of "PEGI 7" of "PEGI 12" of "PEGI 16" of "PEGI 18",
  "developer": "naam van de studio",
  "uitgegeven": "jaar",
  "downloads": [
    { "naam": "Steam", "url": "https://store.steampowered.com/app/..." },
    { "naam": "Epic Games Store", "url": "https://store.epicgames.com/..." },
    { "naam": "PlayStation Store", "url": "https://store.playstation.com/..." },
    { "naam": "Xbox Store", "url": "https://www.xbox.com/..." },
    { "naam": "Nintendo eShop", "url": "https://www.nintendo.com/..." }
  ]
}

Geef alleen de platforms en download-links mee die echt van toepassing zijn.
Als de game niet bestaat of echt onbekend is: { "gevonden": false, "naam": "..." }`,
        messages: [{ role: 'user', content: `Geef info over de game: "${naam}"` }]
      })
    });

    if (!resp.ok) throw new Error(`API fout: ${resp.status}`);

    const data = await resp.json();
    const text = (data.content || []).map(b => b.text || '').join('');

    let info;
    try {
      info = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      info = { gevonden: false, naam };
    }

    toonResultaat(info);

  } catch (err) {
    console.error(err);
    result.style.display = 'block';
    result.innerHTML = `<div class="not-found">Er ging iets mis. Controleer je internetverbinding en probeer opnieuw.<br><small style="opacity:.5">${err.message}</small></div>`;
  }

  loading.style.display = 'none';
  btn.disabled = false;
}

// ── Resultaat renderen ────────────────────────────────
function toonResultaat(info) {
  result.style.display = 'block';

  if (!info.gevonden) {
    result.innerHTML = `<div class="not-found">Geen info gevonden voor "<strong>${info.naam || 'onbekend'}</strong>".<br>Controleer de spelling of probeer een andere naam.</div>`;
    return;
  }

  // Multiplayer badge kleur
  const mpKleur = (info.multiplayer || '').toLowerCase().includes('online') ? 'green'
    : (info.multiplayer || '').toLowerCase().includes('solo') ? 'blue'
    : 'purple';

  // Prijs badge kleur
  const prijsKleur = info.gratis ? 'green' : 'amber';

  // Platforms
  const platformsHtml = (info.platforms || [])
    .map(p => `<span class="platform-tag">${p}</span>`)
    .join('') || '<span style="color:var(--text3);font-size:13px">Onbekend</span>';

  // Download links
  const linksHtml = (info.downloads || []).length
    ? (info.downloads || []).map(d => `
        <div class="link-row">
          <span class="link-name">${d.naam}</span>
          <a class="link-btn" href="${d.url}" target="_blank" rel="noopener">Bezoeken →</a>
        </div>`).join('')
    : '<p class="desc-text">Geen directe links beschikbaar.</p>';

  result.innerHTML = `
    <div class="result-card">

      <div class="game-header">
        <div class="game-icon">${info.emoji || '🎮'}</div>
        <div style="min-width:0">
          <div class="game-title">${info.naam}</div>
          <div class="game-meta">${[info.genre, info.developer, info.uitgegeven].filter(Boolean).join(' · ')}</div>
          <div class="badges">
            <span class="badge badge-${mpKleur}">${info.multiplayer || 'Onbekend'}</span>
            <span class="badge badge-${prijsKleur}">${info.prijs || (info.gratis ? 'Gratis' : 'Betaald')}</span>
            ${info.leeftijd ? `<span class="badge badge-blue">${info.leeftijd}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="section-title">Over de game</div>
      <p class="desc-text">${info.beschrijving || ''}</p>

      <div class="divider"></div>

      <div class="section-title">Beschikbaar op</div>
      <div class="platforms-list">${platformsHtml}</div>

      <div class="divider"></div>

      <div class="section-title">Downloaden / Kopen</div>
      <div class="links-list">${linksHtml}</div>

      <div class="divider"></div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Multiplayer</div>
          <div class="info-value">${info.multiplayer || '—'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Prijs</div>
          <div class="info-value">${info.prijs || '—'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">PEGI leeftijd</div>
          <div class="info-value">${info.leeftijd || '—'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Uitgegeven</div>
          <div class="info-value">${info.uitgegeven || '—'}</div>
        </div>
      </div>

    </div>
  `;

  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Service Worker registreren ────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW geregistreerd:', reg.scope))
      .catch(err => console.warn('SW fout:', err));
  });
}

// ── PWA Install prompt ────────────────────────────────
let deferredPrompt;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-wrap').style.display = 'inline';
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        document.getElementById('install-wrap').style.display = 'none';
      }
      deferredPrompt = null;
    });
  }
});

window.addEventListener('appinstalled', () => {
  document.getElementById('install-wrap').style.display = 'none';
});
