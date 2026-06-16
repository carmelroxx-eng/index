// ── Router ──────────────────────────────────────────────────────────────────
const app = document.getElementById('app');

function navigate(hash) {
  window.location.hash = hash;
}

function getRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '') || '';
  if (!hash || hash === '/') return { view: 'home' };
  if (hash === 'archive')   return { view: 'archive' };
  if (hash === 'about')     return { view: 'about' };

  const catMatch = hash.match(/^category\/(.+)$/);
  if (catMatch) return { view: 'category', id: catMatch[1] };

  const artMatch = hash.match(/^artifact\/(.+)$/);
  if (artMatch) return { view: 'artifact', id: artMatch[1] };

  return { view: 'home' };
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

function render() {
  const route = getRoute();
  window.scrollTo(0, 0);

  const navLogo   = document.getElementById('nav-logo');
  const navLinks  = document.querySelectorAll('.nav-link');

  navLinks.forEach(l => {
    l.classList.toggle('active', l.dataset.route === route.view);
  });

  // hide nav gradient on hero
  const nav = document.getElementById('nav');
  nav.style.background = route.view === 'home'
    ? 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)'
    : 'rgba(0,0,0,0.95)';

  switch (route.view) {
    case 'home':     renderHome();              break;
    case 'archive':  renderArchive();           break;
    case 'about':    renderAbout();             break;
    case 'category': renderCategory(route.id); break;
    case 'artifact': renderArtifact(route.id); break;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function sortArtifacts(list, order) {
  return [...list].sort((a, b) =>
    order === 'asc' ? a.ageNum - b.ageNum : b.ageNum - a.ageNum
  );
}

function artifactCount(categoryId) {
  return ARTIFACTS.filter(a => a.categoryId === categoryId).length;
}

function pluralItems(n) {
  return n === 1 ? `פריט אחד` : `${n} פריטים`;
}

function buildMediaEl(media, autoplay = false) {
  if (!media || !media.src) {
    return `<div class="artifact-media-placeholder">[ מדיה תתווסף בקרוב ]</div>`;
  }
  const flipClass = media.flip ? ' flip-h' : '';
  if (media.type === 'video') {
    return `<video class="${flipClass.trim()}"
      src="${media.src}"
      ${media.poster ? `poster="${media.poster}"` : ''}
      ${autoplay ? 'autoplay muted loop playsinline' : 'controls'}
      preload="metadata"
    ></video>`;
  }
  return `<img class="${flipClass.trim()}" src="${media.src}" alt="" loading="lazy">`;
}

function buildSlideMediaEl(media) {
  if (!media || !media.src) return `<div class="archive-slide-placeholder"></div>`;
  const flipClass = media.flip ? ' flip-h' : '';
  if (media.type === 'video') {
    return `<video class="${flipClass.trim()}" src="${media.src}" autoplay muted loop playsinline preload="auto"></video>`;
  }
  return `<img class="${flipClass.trim()}" src="${media.src}" alt="" loading="lazy">`;
}

function buildCardMediaEl(media) {
  if (!media || !media.src) {
    return `<div class="artifact-card-media-placeholder"></div>`;
  }
  const flipClass = media.flip ? ' flip-h' : '';
  if (media.type === 'video') {
    return `<video class="${flipClass.trim()}" src="${media.src}" muted loop playsinline preload="auto"
      onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video>`;
  }
  return `<img class="${flipClass.trim()}" src="${media.src}" alt="" loading="lazy">`;
}

function buildSortToggle(currentOrder) {
  return `
    <div class="sort-toggle" id="category-sort-toggle">
      <button class="sort-btn ${currentOrder === 'asc' ? 'active' : ''}"
        onclick="setSortOrder('asc')">עתיק ← חדש</button>
      <div class="sort-divider"></div>
      <button class="sort-btn ${currentOrder === 'desc' ? 'active' : ''}"
        onclick="setSortOrder('desc')">חדש ← עתיק</button>
    </div>`;
}

let _currentSortOrder = 'asc';
let _currentCategoryId = null;
let _activeFilters = { use: null, material: null };

window.setSortOrder = function(order) {
  _currentSortOrder = order;
  if (_currentCategoryId) _updateCategoryFilters();
  else renderArchive();
};

window.setFilter = function(type, value) {
  _activeFilters[type] = value;
  if (_currentCategoryId) _updateCategoryFilters();
};

function _updateCategoryFilters() {
  const allArtifacts = sortArtifacts(
    ARTIFACTS.filter(a => a.categoryId === _currentCategoryId),
    _currentSortOrder
  );
  const filtered = applyFilters(allArtifacts);

  const sortEl = document.getElementById('category-sort-toggle');
  if (sortEl) sortEl.outerHTML = buildSortToggle(_currentSortOrder);

  const filterBarEl = document.getElementById('category-filter-bar');
  if (filterBarEl) filterBarEl.outerHTML = buildFilterBar(allArtifacts);

  const gridEl = document.getElementById('category-grid-container');
  if (gridEl) {
    const emptyMsg = _activeFilters.use || _activeFilters.material
      ? `<div class="empty-state">אין פריטים התואמים את הסינון <button class="filter-clear-btn" onclick="setFilter('use',null);setFilter('material',null)">נקה סינון</button></div>`
      : `<div class="empty-state">אין פריטים בקטגוריה זו</div>`;
    gridEl.innerHTML = filtered.length === 0
      ? emptyMsg
      : `<div class="artifacts-grid">${filtered.map(a => buildArtifactCard(a, false)).join('')}</div>`;
  }
}

function applyFilters(artifacts) {
  return artifacts.filter(a => {
    const useOk = !_activeFilters.use || a.use === _activeFilters.use;
    const matOk = !_activeFilters.material || (a.materials && a.materials.includes(_activeFilters.material));
    return useOk && matOk;
  });
}

function buildFilterBar(artifacts) {
  const uses      = [...new Set(artifacts.map(a => a.use).filter(Boolean))];
  const materials = [...new Set(artifacts.flatMap(a => a.materials || []).filter(Boolean))].sort();
  if (!uses.length && !materials.length) return '';

  const useGroup = uses.length ? `
    <div class="filter-group">
      <span class="filter-group-label">שימוש</span>
      <div class="filter-pills">
        <button class="filter-pill ${!_activeFilters.use ? 'active' : ''}" onclick="setFilter('use', null)">הכל</button>
        ${uses.map(u => {
          const opt   = USE_OPTIONS.find(o => o.key === u);
          const label = opt ? opt.label : u;
          return `<button class="filter-pill ${_activeFilters.use === u ? 'active' : ''}" onclick="setFilter('use', '${u}')">${label}</button>`;
        }).join('')}
      </div>
    </div>` : '';

  const matGroup = materials.length ? `
    <div class="filter-group">
      <span class="filter-group-label">חומר</span>
      <div class="filter-pills">
        <button class="filter-pill ${!_activeFilters.material ? 'active' : ''}" onclick="setFilter('material', null)">הכל</button>
        ${materials.map(m => `<button class="filter-pill ${_activeFilters.material === m ? 'active' : ''}" onclick="setFilter('material', '${m}')">${m}</button>`).join('')}
      </div>
    </div>` : '';

  return `<div class="filter-bar" id="category-filter-bar">${useGroup}${matGroup}</div>`;
}

// ── Home ─────────────────────────────────────────────────────────────────────
function renderHome() {
  _currentCategoryId = null;
  app.innerHTML = `
    <section class="home-hero" onclick="document.querySelector('.categories-carousel-section').scrollIntoView({behavior:'smooth'})">
      <video class="hero-video" autoplay muted loop playsinline
        src="media/artifacts/כד מעוטר בוהק מתכתי.mp4"
        onerror="this.style.display='none'"></video>
      <div class="hero-overlay"></div>
      <h1 class="hero-title">האדם היוצר</h1>
      <p class="hero-subtitle">אוסף הארכאולוגיה — מוזיאון ישראל</p>
      <div class="hero-scroll-hint">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M4 11l6 6 6-6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </section>

    ${HOME_INTRO ? `
    <section class="home-intro-section">
      <p class="home-intro-text">${HOME_INTRO}</p>
    </section>` : ''}

    <section class="categories-carousel-section">
      <div class="categories-carousel" id="categories-carousel">
        ${CATEGORIES.map(cat => {
          const flipClass = cat.flip ? ' flip-h' : '';
          const videoEl = cat.video
            ? `<video class="${flipClass.trim()}" src="${cat.video}" muted loop playsinline preload="auto"
                onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video>`
            : `<div style="width:100%;height:100%;background:#050505;"></div>`;
          return `
          <div class="category-carousel-card" onclick="navigate('#category/${cat.id}')">
            <div class="category-carousel-media">${videoEl}</div>
            <span class="category-carousel-label">[${cat.name}]</span>
          </div>`;
        }).join('')}
      </div>
    </section>`;

  requestAnimationFrame(() => {
    const carousel = document.getElementById('categories-carousel');
    if (carousel) setupCarouselDrag(carousel);
  });
}

function setupCarouselDrag(el) {
  let isDown = false, startX, scrollLeft;
  el.addEventListener('mousedown', e => {
    isDown = true;
    el.classList.add('dragging');
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });
  window.addEventListener('mouseup', () => {
    isDown = false;
    el.classList.remove('dragging');
  });
  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.5;
  });
}

// ── Category ──────────────────────────────────────────────────────────────────
function renderCategory(id) {
  if (id !== _currentCategoryId) _activeFilters = { use: null, material: null };
  _currentCategoryId = id;
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) { renderHome(); return; }

  const allArtifacts = sortArtifacts(
    ARTIFACTS.filter(a => a.categoryId === id),
    _currentSortOrder
  );
  const filtered = applyFilters(allArtifacts);

  const thumbEl = cat.video
    ? `<video class="category-page-thumb${cat.flip ? ' flip-h' : ''}" src="${cat.video}" autoplay muted loop playsinline preload="metadata"></video>`
    : '';

  const emptyMsg = _activeFilters.use || _activeFilters.material
    ? `<div class="empty-state">אין פריטים התואמים את הסינון <button class="filter-clear-btn" onclick="setFilter('use',null);setFilter('material',null)">נקה סינון</button></div>`
    : `<div class="empty-state">אין פריטים בקטגוריה זו</div>`;

  app.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div class="page-header-title-group">
          ${thumbEl}
          <div>
            <h2 class="page-title">${cat.name}</h2>
            <p class="page-title-sub">${pluralItems(allArtifacts.length)}</p>
          </div>
        </div>
        ${buildSortToggle(_currentSortOrder)}
      </div>
      ${cat.intro ? `<p class="category-intro-text">${cat.intro}</p>` : ''}
      ${buildFilterBar(allArtifacts)}
      <div id="category-grid-container">
        ${filtered.length === 0
          ? emptyMsg
          : `<div class="artifacts-grid">${filtered.map(a => buildArtifactCard(a, false)).join('')}</div>`
        }
      </div>
    </div>`;
}

// ── Archive ───────────────────────────────────────────────────────────────────
function renderArchive() {
  _currentCategoryId = null;
  const allArtifacts = sortArtifacts(ARTIFACTS, _currentSortOrder);

  const sections = CATEGORIES.slice().reverse().map(cat => ({
    cat,
    artifacts: allArtifacts.filter(a => a.categoryId === cat.id),
  })).filter(s => s.artifacts.length > 0);

  app.innerHTML = `
    <div class="archive-redesign" id="archive-redesign">

      <div class="archive-artifacts-col" id="archive-artifacts-col">
        ${sections.map(({ cat, artifacts }) => `
          <div class="archive-cat-block" id="arcblock-${cat.id}" data-cat-id="${cat.id}">
            <div class="archive-cat-divider">
              <span class="archive-cat-divider-name">${cat.name}</span>
              ${cat.intro ? `<p class="archive-cat-divider-intro">${cat.intro}</p>` : ''}
            </div>
            ${artifacts.map(a => `
              <div class="archive-artifact-slide" data-cat-id="${cat.id}" data-artifact-id="${a.id}"
                onclick="navigate('#artifact/${a.id}')">
                <div class="archive-slide-media">${buildSlideMediaEl(a.media)}</div>
                <div class="archive-slide-info">
                  <span class="archive-slide-name">${a.name}</span>
                  <span class="archive-slide-age">${a.age || ''}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>

      <div class="archive-timeline-col" id="archive-timeline-col">
        ${sections.map(({ cat }) => `
          <div class="timeline-era-item" data-cat-id="${cat.id}"
            onclick="scrollArchiveToCat('${cat.id}')">
            <span class="timeline-era-name">${cat.name}</span>
            <span class="timeline-era-period">${cat.period}</span>
          </div>
        `).join('')}
      </div>

    </div>`;

  requestAnimationFrame(() => setupArchiveObserverNew(sections.map(s => s.cat.id)));
}

window.scrollToArchiveCategory = function(catId) { scrollArchiveToCat(catId); };

window.scrollArchiveToCat = function(catId) {
  const col = document.getElementById('archive-artifacts-col');
  const block = document.getElementById('arcblock-' + catId);
  if (col && block) col.scrollTo({ top: block.offsetTop, behavior: 'smooth' });
  setActiveTimelineEra(catId);
};

function setActiveTimelineEra(catId) {
  document.querySelectorAll('.timeline-era-item').forEach(item => {
    item.classList.toggle('active', item.dataset.catId === catId);
  });
  const timelineCol = document.getElementById('archive-timeline-col');
  const active = timelineCol && timelineCol.querySelector(`.timeline-era-item[data-cat-id="${catId}"]`);
  if (active && timelineCol) {
    const offset = active.offsetTop - timelineCol.clientHeight / 2 + active.clientHeight / 2;
    timelineCol.scrollTo({ top: offset, behavior: 'smooth' });
  }
}

function setupArchiveObserverNew(catIds) {
  const col = document.getElementById('archive-artifacts-col');
  if (!col) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveTimelineEra(entry.target.dataset.catId);
    });
  }, {
    root: col,
    rootMargin: '-10% 0px -80% 0px',
    threshold: 0,
  });

  catIds.forEach(id => {
    const el = document.getElementById('arcblock-' + id);
    if (el) observer.observe(el);
  });
}

function buildArtifactCard(artifact, showCategory) {
  const cat = CATEGORIES.find(c => c.id === artifact.categoryId);
  return `
    <div class="artifact-card" id="arc-${artifact.id}" data-artifact-id="${artifact.id}" data-category-id="${artifact.categoryId}" onclick="navigate('#artifact/${artifact.id}')">
      <div class="artifact-card-media">${buildCardMediaEl(artifact.media)}</div>
      <div class="artifact-card-info">
        <div class="artifact-card-name">${artifact.name}</div>
        <div class="artifact-card-age">${artifact.age}</div>
        ${showCategory && cat ? `<div class="artifact-card-category">${cat.name}</div>` : ''}
      </div>
    </div>`;
}

// ── Artifact ──────────────────────────────────────────────────────────────────
function renderArtifact(id) {
  const artifact = ARTIFACTS.find(a => a.id === id);
  if (!artifact) { renderHome(); return; }

  const cat = CATEGORIES.find(c => c.id === artifact.categoryId);
  const siblings = sortArtifacts(
    ARTIFACTS.filter(a => a.categoryId === artifact.categoryId),
    _currentSortOrder
  );
  const idx  = siblings.findIndex(a => a.id === id);
  const prev = siblings[idx - 1] || null;
  const next = siblings[idx + 1] || null;

  const mediaHTML = buildMediaEl(artifact.media, true);
  const useOption = USE_OPTIONS.find(o => o.key === artifact.use);
  const useLabel  = useOption ? useOption.label : artifact.use || '';

  const placeholderDesc = `בסתת היא אלת החתול של מצרים הקדומה- מגוננת, אם ואלת פריון, שפולחנה התפשט ברחבי מצרים מהאלף השלישי לפני הספירה ועד לתקופה הרומית. היא מוצגת לעיתים כאישה בעלת ראש חתולה, ולעיתים כחתולה בלבד, והחתול הביתי נחשב לגלגולה הארצי — חיה קדושה שאם אדם הורג או פוגע בה, אפילו בשוגג, נענש בחומרה.

ארון הקבורה הקטן הזה נועד להכיל גופת חתול שנחנט במיוחד לצורכי פולחן- מנהג נפוץ במצרים של המאה הרביעית עד הראשונה לפני הספירה. מומיות החתולים הוגשו כנדבות במקדשי בסתת, ביאופוליס מאג׳נה ובמקומות פולחן אחרים, ומאות אלפי ארונות כאלה נמצאו בחפירות ארכיאולוגיות. הארון עצמו, בצורתו ובעיטוריו, הפך את החתול למנחה ראויה לאלה.

הברונזה כחומר גלם אינה מקרית: היא נפוצה במצרים המאוחרת דווקא לפריטי פולחן הקשורים לבסתת- עמידה, יוקרתית, ומסוגלת לשמור על צורתה לאורך זמן. בניגוד לפיאנס או לחרס שנועדו לשימוש חד-פעמי, ארון ברונזה מעיד על כוונה לקבורה של ממש- מחווה שתישמר.`;

  const descText = artifact.description || placeholderDesc;
  const descParagraphs = descText.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');

  app.innerHTML = `
    <div class="artifact-v2">
      <div class="artifact-v2-spacer"></div>
      <div class="artifact-v2-video-panel">
        <div class="artifact-v2-video-wrap" id="artifact-v2-video-wrap">
          ${mediaHTML}
        </div>
        <div class="artifact-v2-nav">
          <div class="artifact-v2-nav-btn is-prev ${prev ? '' : 'disabled'}"
            ${prev ? `onclick="navigate('#artifact/${prev.id}')"` : ''}>
            <span class="artifact-v2-nav-arrow">←</span>
            <span class="artifact-v2-nav-name">${prev ? prev.name : ''}</span>
          </div>
          <div class="artifact-v2-nav-btn is-next ${next ? '' : 'disabled'}"
            ${next ? `onclick="navigate('#artifact/${next.id}')"` : ''}>
            <span class="artifact-v2-nav-name">${next ? next.name : ''}</span>
            <span class="artifact-v2-nav-arrow">→</span>
          </div>
        </div>
      </div>
      <div class="artifact-v2-info-panel">
        <div class="artifact-v2-breadcrumb">
          ${cat ? `<span class="artifact-v2-breadcrumb-link" onclick="navigate('#category/${cat.id}')">${cat.name}</span>` : ''}
          ${useLabel ? `<span class="artifact-v2-breadcrumb-sep">›</span><span>${useLabel}</span>` : ''}
          ${artifact.material ? `<span class="artifact-v2-breadcrumb-sep">›</span><span>${artifact.material}</span>` : ''}
        </div>
        <h1 class="artifact-v2-title">${artifact.name}</h1>
        <div class="artifact-v2-meta-table">
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">תקופה</span>
            <span class="artifact-v2-meta-value">${artifact.age || '—'}</span>
          </div>
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">מיקום</span>
            <span class="artifact-v2-meta-value">${artifact.location || '—'}</span>
          </div>
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">חומרים</span>
            <span class="artifact-v2-meta-value">${artifact.material || '—'}</span>
          </div>
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">גודל</span>
            <span class="artifact-v2-meta-value">${artifact.size || '—'}</span>
          </div>
        </div>
        <div class="artifact-v2-description">${descParagraphs}</div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    attachLoupeTo('#artifact-v2-video-wrap');
    const vid = document.querySelector('#artifact-v2-video-wrap video');
    if (vid) vid.play().catch(() => {});
  });
}

// ── Loupe (magnifier) ─────────────────────────────────────────────────────────
const LOUPE_SIZE = 190;
const LOUPE_ZOOM = 2.8;

let _loupeEl = null;
let _loupeCanvas = null;
let _loupeCtx = null;
let _loupeVideo = null;
let _loupeMouseX = 0;
let _loupeMouseY = 0;
let _loupeFrame = null;

function ensureLoupe() {
  if (_loupeEl) return;
  _loupeEl = document.createElement('div');
  _loupeEl.className = 'video-loupe';
  _loupeCanvas = document.createElement('canvas');
  _loupeCanvas.width = LOUPE_SIZE;
  _loupeCanvas.height = LOUPE_SIZE;
  _loupeCtx = _loupeCanvas.getContext('2d');
  _loupeEl.appendChild(_loupeCanvas);
  document.body.appendChild(_loupeEl);
}

function positionLoupe(x, y) {
  _loupeEl.style.left = (x - LOUPE_SIZE / 2) + 'px';
  _loupeEl.style.top  = (y - LOUPE_SIZE / 2) + 'px';
}

function drawLoupeFrame() {
  if (!_loupeVideo || _loupeVideo.readyState < 2) return;

  const vw = _loupeVideo.videoWidth;
  const vh = _loupeVideo.videoHeight;
  if (!vw || !vh) return;

  const rect = _loupeVideo.getBoundingClientRect();
  const aspect = vw / vh;
  const elAspect = rect.width / rect.height;

  // Content area within the element (object-fit: contain)
  let cw, ch, cx, cy;
  if (aspect > elAspect) {
    cw = rect.width;  ch = rect.width / aspect;
    cx = 0;           cy = (rect.height - ch) / 2;
  } else {
    ch = rect.height; cw = rect.height * aspect;
    cx = (rect.width - cw) / 2; cy = 0;
  }

  // Cursor relative to content area
  const relX = _loupeMouseX - rect.left - cx;
  const relY = _loupeMouseY - rect.top  - cy;

  // Source crop in video pixels
  const srcW = (LOUPE_SIZE / LOUPE_ZOOM) * (vw / cw);
  const srcH = (LOUPE_SIZE / LOUPE_ZOOM) * (vh / ch);
  let srcX = relX * (vw / cw) - srcW / 2;
  let srcY = relY * (vh / ch) - srcH / 2;
  srcX = Math.max(0, Math.min(vw - srcW, srcX));
  srcY = Math.max(0, Math.min(vh - srcH, srcY));

  const ctx = _loupeCtx;
  ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

  if (_loupeVideo.classList.contains('flip-h')) {
    ctx.save();
    ctx.translate(LOUPE_SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(_loupeVideo, vw - srcX - srcW, srcY, srcW, srcH, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
    ctx.restore();
  } else {
    ctx.drawImage(_loupeVideo, srcX, srcY, srcW, srcH, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
  }
}

function loupeTick() {
  drawLoupeFrame();
  positionLoupe(_loupeMouseX, _loupeMouseY);
  _loupeFrame = requestAnimationFrame(loupeTick);
}

function attachLoupeTo(selector) {
  ensureLoupe();
  const container = document.querySelector(selector);
  if (!container) return;

  // Remove any previously attached listeners by cloning (simple reset)
  const fresh = container.cloneNode(true);
  container.parentNode.replaceChild(fresh, container);

  fresh.addEventListener('mouseenter', () => {
    const vid = fresh.querySelector('video');
    if (!vid) return;
    _loupeVideo = vid;
    _loupeEl.style.display = 'block';
    if (!_loupeFrame) _loupeFrame = requestAnimationFrame(loupeTick);
  });

  fresh.addEventListener('mousemove', e => {
    _loupeMouseX = e.clientX;
    _loupeMouseY = e.clientY;
  });

  fresh.addEventListener('mouseleave', () => {
    _loupeVideo = null;
    _loupeEl.style.display = 'none';
    if (_loupeFrame) { cancelAnimationFrame(_loupeFrame); _loupeFrame = null; }
  });

  fresh.addEventListener('click', () => {
    const vid = fresh.querySelector('video');
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {});
      fresh.classList.remove('is-paused');
    } else {
      vid.pause();
      fresh.classList.add('is-paused');
    }
  });
}

// ── About ─────────────────────────────────────────────────────────────────────
function renderAbout() {
  _currentCategoryId = null;
  app.innerHTML = `
    <div class="about-page">
      <h1 class="about-title">האדם היוצר</h1>
      <div class="about-body">
        <p>
          פרויקט "הומו פאבר" הוא ארכיון דיגיטלי של אוסף הארכאולוגיה של מוזיאון ישראל.
          הפרויקט שואף להנגיש את הממצאים הארכאולוגיים לקהל הרחב באמצעות סימולציות תלת-ממדיות
          ותצוגה מקוונת, תוך שמירה על רוח המחקר והשימור.
        </p>
        <p>
          ניתן לעדכן טקסט זה בקובץ <span style="color:#555">js/app.js</span> בפונקציה <span style="color:#555">renderAbout()</span>.
        </p>
      </div>
    </div>`;
}
