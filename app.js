/* =====================================================
   QuestLog – app.js
   Aangedreven door de RAWG Video Games Database API
   
   ⚠️  VUL HIERONDER JE API SLEUTEL IN:
   Gratis key ophalen op https://rawg.io/apidocs
   ===================================================== */

const RAWG_KEY = '7bd3a73e110f4cc8887fe5c804dc40bf';
const RAWG_BASE = 'https://api.rawg.io/api';

// Store naam → URL mapping
const STORE_URLS = {
  'steam':              'https://store.steampowered.com',
  'playstation-store':  'https://store.playstation.com',
  'xbox-store':         'https://www.xbox.com/nl-BE/games/store',
  'xbox360':            'https://www.xbox.com/nl-BE/games/store',
  'apple-appstore':     'https://apps.apple.com',
  'google-play':        'https://play.google.com/store/games',
  'nintendo':           'https://www.nintendo.com/nl-NL/store',
  'gog':                'https://www.gog.com',
  'epic-games':         'https://store.epicgames.com',
  'itch-io':            'https://itch.io',
};

const STORE_NAMES = {
  'steam':              'Steam',
  'playstation-store':  'PlayStation Store',
  'xbox-store':         'Xbox Store',
  'xbox360':            'Xbox Store',
  'apple-appstore':     'Apple App Store',
  'google-play':        'Google Play',
  'nintendo':           'Nintendo eShop',
  'gog':                'GOG.com',
  'epic-games':         'Epic Games Store',
  'itch-io':            'itch.io',
};

// DOM refs
const inp     = document.getElementById('searchInput');
const btn     = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const result  = document.getElementById('result');

inp.addEventListener('keydown', e => { if (e.key === 'Enter') zoekGame(); });

function zoekDirect(naam) {
  inp.value = naam;
  zoekGame();
}

// ── Hoofd zoekfunctie ─────────────────────────────────
async function zoekGame() {
  const naam = inp.value.trim();
  if (!naam) return;

  btn.disabled = true;
  loading.style.display = 'flex';
  result.style.display  = 'none';
  result.innerHTML      = '';

  try {
    // 1. Zoek game op naam
    const zoekResp = await fetch(
      `${RAWG_BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(naam)}&page_size=1&search_exact=false`
    );
    if (!zoekResp.ok) throw new Error(`API fout: ${zoekResp.status}`);
    const zoekData = await zoekResp.json();

    if (!zoekData.results || zoekData.results.length === 0) {
      toonNietGevonden(naam);
      return;
    }

    const game = zoekData.results[0];

    // 2. Haal detail info op (voor beschrijving, stores, etc.)
    const [detailResp, screenshotResp] = await Promise.all([
      fetch(`${RAWG_BASE}/games/${game.id}?key=${RAWG_KEY}`),
      fetch(`${RAWG_BASE}/games/${game.id}/screenshots?key=${RAWG_KEY}&page_size=5`)
    ]);

    const detail      = detailResp.ok      ? await detailResp.json()      : {};
    const screenshots = screenshotResp.ok  ? await screenshotResp.json()  : { results: [] };

    toonResultaat(game, detail, screenshots.results || []);

  } catch (err) {
    console.error(err);
    result.style.display = 'block';
    result.innerHTML = `<div class="not-found">
      Er ging iets mis. Controleer je API sleutel in <code>app.js</code> en probeer opnieuw.<br>
      <small style="opacity:.5;font-size:12px">${err.message}</small>
    </div>`;
  }

  loading.style.display = 'none';
  btn.disabled = false;
}

// ── Resultaat renderen ────────────────────────────────
function toonResultaat(game, detail, screenshots) {

  // Platforms
  const platforms = (game.platforms || [])
    .map(p => p.platform.name)
    .filter(Boolean);

  // Genres
  const genres = (game.genres || []).map(g => g.name).join(', ');

  // Developers
  const devs = (detail.developers || []).map(d => d.name).join(', ');

  // Rating (RAWG rating is 0-5)
  const rating    = game.rating ? game.rating.toFixed(1) : null;
  const ratingPct = game.rating ? Math.round((game.rating / 5) * 100) : 0;

  // ESRB / leeftijd
  const esrb = game.esrb_rating ? game.esrb_rating.name : null;

  // Stores
  const stores = (detail.stores || []).map(s => {
    const slug = s.store.slug;
    return {
      naam: STORE_NAMES[slug] || s.store.name,
      url:  s.url || STORE_URLS[slug] || '#'
    };
  });

  // Cover afbeelding
  const coverImg = game.background_image;

  // Beschrijving (plain text uit HTML)
  const beschrijving = detail.description_raw
    ? detail.description_raw.slice(0, 280).trim() + (detail.description_raw.length > 280 ? '…' : '')
    : 'Geen beschrijving beschikbaar.';

  // Multiplayer badge (via tags)
  const tags   = (detail.tags || []).map(t => t.name.toLowerCase());
  const isMulti = tags.some(t => ['multiplayer','co-op','online co-op','online multiplayer'].includes(t));
  const isSolo  = tags.some(t => ['singleplayer','single-player'].includes(t));
  const mpLabel = isMulti && isSolo ? 'Multiplayer + Solo'
                : isMulti ? 'Multiplayer'
                : isSolo  ? 'Solo'
                : 'Onbekend';
  const mpKleur = isMulti ? 'green' : isSolo ? 'blue' : 'purple';

  // Gratis tag
  const isGratis = tags.includes('free to play') || tags.includes('free-to-play');
  const prijsLabel = isGratis ? 'Gratis' : 'Betaald';
  const prijsKleur = isGratis ? 'accent' : 'amber';

  // Screenshots HTML
  const screenshotsHtml = screenshots.length
    ? `<div class="section">
        <div class="section-title">Screenshots</div>
        <div class="screenshots">
          ${screenshots.map(s => `
            <div class="screenshot">
              <img src="${s.image}" alt="screenshot" loading="lazy" />
            </div>`).join('')}
        </div>
      </div>
      <div class="divider"></div>`
    : '';

  // Stores HTML
  const storesHtml = stores.length
    ? stores.map(s => `
        <a class="store-row" href="${s.url}" target="_blank" rel="noopener">
          <span class="store-name">${s.naam}</span>
          <span class="store-arrow">→</span>
        </a>`).join('')
    : '<p class="desc-text">Geen store links beschikbaar.</p>';

  // Platforms HTML
  const platformsHtml = platforms.length
    ? platforms.map(p => `<span class="platform-tag">${p}</span>`).join('')
    : '<span class="desc-text">Onbekend</span>';

  result.style.display = 'block';
  result.innerHTML = `
    <div class="result-card">

      <div class="game-banner">
        ${coverImg ? `<div class="game-banner-bg" style="background-image:url('${coverImg}')"></div>` : ''}
        <div class="game-banner-content">
          <div class="game-cover">
            ${coverImg
              ? `<img src="${coverImg}" alt="${game.name}" />`
              : '🎮'}
          </div>
          <div class="game-info-main">
            <div class="game-title">${game.name}</div>
            <div class="game-sub">${[genres, devs, game.released ? game.released.slice(0,4) : ''].filter(Boolean).join(' · ')}</div>
            <div class="badges">
              <span class="badge badge-${mpKleur}">${mpLabel}</span>
              <span class="badge badge-${prijsKleur}">${prijsLabel}</span>
              ${esrb ? `<span class="badge badge-blue">${esrb}</span>` : ''}
              ${rating ? `<span class="badge badge-purple">⭐ ${rating}/5</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="card-body">

        <div class="section">
          <div class="section-title">Over de game</div>
          <p class="desc-text">${beschrijving}</p>
        </div>

        <div class="divider"></div>

        ${rating ? `
        <div class="section">
          <div class="section-title">Beoordeling</div>
          <div class="rating-wrap">
            <div class="rating-bar">
              <div class="rating-fill" style="width:${ratingPct}%"></div>
            </div>
            <span class="rating-num">${rating} / 5</span>
          </div>
        </div>
        <div class="divider"></div>` : ''}

        <div class="section">
          <div class="section-title">Beschikbaar op</div>
          <div class="platforms-list">${platformsHtml}</div>
        </div>

        <div class="divider"></div>

        ${screenshotsHtml}

        <div class="section">
          <div class="section-title">Kopen / Downloaden</div>
          <div class="stores-grid">${storesHtml}</div>
        </div>

        <div class="divider"></div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Multiplayer</div>
            <div class="stat-value">${mpLabel}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Prijs</div>
            <div class="stat-value">${prijsLabel}</div>
          </div>
          ${esrb ? `<div class="stat-card">
            <div class="stat-label">Leeftijd</div>
            <div class="stat-value">${esrb}</div>
          </div>` : ''}
          <div class="stat-card">
            <div class="stat-label">Uitgebracht</div>
            <div class="stat-value">${game.released ? game.released.slice(0,4) : '—'}</div>
          </div>
          ${game.playtime ? `<div class="stat-card">
            <div class="stat-label">Gem. speeltijd</div>
            <div class="stat-value">${game.playtime}u</div>
          </div>` : ''}
          ${detail.metacritic ? `<div class="stat-card">
            <div class="stat-label">Metacritic</div>
            <div class="stat-value">${detail.metacritic}/100</div>
          </div>` : ''}
        </div>

      </div>
    </div>
  `;

  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toonNietGevonden(naam) {
  loading.style.display = 'none';
  result.style.display = 'block';
  result.innerHTML = `<div class="not-found">
    Geen game gevonden voor "<strong>${naam}</strong>".<br>
    Probeer een andere spelling of een Engelse naam.
  </div>`;
  btn.disabled = false;
}

// ── Service Worker ────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ── PWA Install ───────────────────────────────────────
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
      if (outcome === 'accepted') document.getElementById('install-wrap').style.display = 'none';
      deferredPrompt = null;
    });
  }
});

window.addEventListener('appinstalled', () => {
  document.getElementById('install-wrap').style.display = 'none';
});
