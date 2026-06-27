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

// ── Zoom lightbox ─────────────────────────────────────────────────────────────
function openZoom(src) {
  let ov = document.getElementById('zoom-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'zoom-overlay';
    ov.innerHTML = '<span id="zoom-close">[סגור]</span><img id="zoom-img" alt="">';
    ov.addEventListener('click', e => { if (e.target !== document.getElementById('zoom-close')) closeZoom(); });
    document.getElementById('zoom-close', ov);
    document.body.appendChild(ov);
  }
  document.getElementById('zoom-img').src = src;
  ov.classList.add('open');
  document.addEventListener('keydown', _onZoomKey);
}

function closeZoom() {
  const ov = document.getElementById('zoom-overlay');
  if (ov) ov.classList.remove('open');
  document.removeEventListener('keydown', _onZoomKey);
}

function _onZoomKey(e) { if (e.key === 'Escape') closeZoom(); }

// ── Masonry layout ────────────────────────────────────────────────────────────
let _masonryResizeTimer;

function layoutArtifactsGrid() {
  const grid = document.querySelector('.artifacts-grid');
  if (!grid) return;
  grid.querySelectorAll('.artifact-card').forEach(card => {
    card.style.gridRowEnd = '';
  });
  grid.querySelectorAll('.artifact-card').forEach(card => {
    card.style.gridRowEnd = `span ${card.offsetHeight}`;
  });
}

function setupMasonryGrid() {
  const grid = document.querySelector('.artifacts-grid');
  if (!grid) return;
  layoutArtifactsGrid();
  grid.querySelectorAll('img').forEach(img => {
    if (!img.complete) {
      img.addEventListener('load', layoutArtifactsGrid, { once: true });
    }
  });
  setupCardFadeIn();
}

function setupCardFadeIn() {
  const grid = document.querySelector('.artifacts-grid');
  if (!grid) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('card-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.04 });
  grid.querySelectorAll('.artifact-card').forEach(card => observer.observe(card));
}

window.addEventListener('resize', () => {
  clearTimeout(_masonryResizeTimer);
  _masonryResizeTimer = setTimeout(layoutArtifactsGrid, 120);
});

let _navLineScrollHandler = null;

function _updateNavLine(route) {
  const archiveLine = document.getElementById('archive-header-line');
  if (archiveLine) archiveLine.classList.remove('visible');
  const artifactLine = document.getElementById('artifact-sub-line');
  if (artifactLine) artifactLine.classList.remove('visible');

  const line = document.getElementById('global-nav-line');
  if (!line) return;
  if (_navLineScrollHandler) {
    window.removeEventListener('scroll', _navLineScrollHandler);
    _navLineScrollHandler = null;
  }
  if (route.view !== 'home') {
    line.style.transform = 'scaleX(1)';
    return;
  }
  line.style.transform = 'scaleX(0)';
  _navLineScrollHandler = () => {
    const hero = document.getElementById('home-hero');
    if (!hero) { line.style.transform = 'scaleX(1)'; return; }
    const progress = Math.max(0, Math.min(1, window.scrollY / hero.offsetHeight));
    line.style.transform = `scaleX(${progress})`;
  };
  window.addEventListener('scroll', _navLineScrollHandler, { passive: true });
}

function render() {
  const route = getRoute();

  _updateNavLine(route);

  document.querySelectorAll('.filter-pills-shell').forEach(s => {
    s.style.transition = 'none';
    s.style.transform = 'scaleY(0)';
    s.style.clipPath = '';
  });

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(l => {
    l.classList.toggle('active', l.dataset.route === route.view);
  });

  const nav = document.getElementById('nav');
  nav.style.background = '#000';

  document.body.style.overflow = route.view === 'archive' ? 'hidden' : '';

  switch (route.view) {
    case 'home':     renderHome();              break;
    case 'archive':  renderArchive();           break;
    case 'about':    renderAbout();             break;
    case 'category': renderCategory(route.id); break;
    case 'artifact': renderArtifact(route.id); break;
  }

  window.scrollTo(0, 0);
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
    return `<video class="${flipClass.trim()}" src="${media.src}" muted loop playsinline preload="metadata"></video>`;
  }
  return `<img class="${flipClass.trim()}" src="${media.src}" alt="" loading="lazy">`;
}

function buildCardMediaEl(media) {
  if (!media || !media.src) {
    return `<div class="artifact-card-media-placeholder"></div>`;
  }
  const flipClass = media.flip ? ' flip-h' : '';
  if (media.type === 'video') {
    return `<video class="${flipClass.trim()}" src="${media.src}" muted loop playsinline preload="metadata"></video>`;
  }
  return `<img class="${flipClass.trim()}" src="${media.src}" alt="" loading="lazy">`;
}

function buildSortToggle(currentOrder) {
  const next = currentOrder === 'asc' ? 'desc' : 'asc';
  const arrow = currentOrder === 'asc' ? '←' : '→';
  return `
    <div class="sort-toggle" id="category-sort-toggle">
      <button class="sort-btn active" onclick="setSortOrder('${next}')">עתיק ${arrow} חדש</button>
    </div>`;
}

let _currentSortOrder = 'asc';
let _currentCategoryId = null;
let _activeFilters = { use: null, material: null };
let _pendingFilters = null;
let _homeIntroTyped = false;
let _archiveMode = 'images';
let _archiveSorted = [];

window.navigateToCategory = function(catId) {
  _pendingFilters = { use: null, material: null };
  navigate('#category/' + catId);
};

window.navigateWithFilter = function(catId, filterType, filterValue) {
  _pendingFilters = { use: null, material: null, [filterType]: filterValue };
  navigate('#category/' + catId);
};

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
  const display = pushLast(
    filtered.length <= 6
      ? [...filtered].sort((a, b) => artifactMaxDimension(b) - artifactMaxDimension(a))
      : filtered,
    'eg-40'
  );

  const sortWrapper = document.getElementById('category-sort-toggle-wrapper');
  if (sortWrapper) sortWrapper.innerHTML = buildSortToggle(_currentSortOrder);

  const filterBarEl = document.getElementById('category-filter-bar');
  if (filterBarEl) filterBarEl.outerHTML = buildFilterBar(allArtifacts);

  ['material', 'use'].forEach(key => {
    if (_filterGroupOpen[key]) {
      const g = document.querySelector(`.filter-group[data-key="${key}"]`);
      if (g) positionFilterShell(g, key);
    }
  });

  const gridEl = document.getElementById('category-grid-container');
  if (gridEl) {
    const emptyMsg = _activeFilters.use || _activeFilters.material
      ? `<div class="empty-state">אין פריטים התואמים את הסינון <button class="filter-clear-btn" onclick="setFilter('use',null);setFilter('material',null)">נקה סינון</button></div>`
      : `<div class="empty-state">אין פריטים בקטגוריה זו</div>`;
    gridEl.innerHTML = filtered.length === 0
      ? emptyMsg
      : `<div class="artifacts-grid">${display.map(a => buildArtifactCard(a, false)).join('')}</div>`;
    requestAnimationFrame(setupMasonryGrid);
  }
}

function applyFilters(artifacts) {
  return artifacts.filter(a => {
    const useOk = !_activeFilters.use || a.use === _activeFilters.use;
    const matOk = !_activeFilters.material || (a.materials && a.materials.includes(_activeFilters.material));
    return useOk && matOk;
  });
}

const _filterGroupOpen = { use: false, material: false };

const _pillsWidthCache = {};

function _computeGlobalMaterialWidth() {
  if (_pillsWidthCache.materialGlobalWidth) return;
  const probe = document.createElement('button');
  probe.className = 'filter-pill';
  probe.style.cssText = 'position:fixed;visibility:hidden;white-space:nowrap;';
  document.body.appendChild(probe);
  const allMaterials = [...new Set(ARTIFACTS.flatMap(a => a.materials || []))];
  let maxW = 0;
  allMaterials.forEach(m => { probe.textContent = m; maxW = Math.max(maxW, probe.offsetWidth); });
  document.body.removeChild(probe);
  _pillsWidthCache.materialGlobalWidth = maxW;
}

// ── Collage canvas ────────────────────────────────────────────────────────────
const _COLLAGE_KEY = 'hf_collage';
function _getCollage() {
  try { return JSON.parse(localStorage.getItem(_COLLAGE_KEY)) || []; } catch { return []; }
}
function _setCollage(items) { localStorage.setItem(_COLLAGE_KEY, JSON.stringify(items)); }

function _renderCollageItem(canvas, item) {
  const artifact = ARTIFACTS.find(a => a.id === item.id);
  if (!artifact) return;
  const media = artifact.media;
  const mediaHTML = !media ? '' : media.type === 'video'
    ? `<video src="${media.src}" muted loop playsinline preload="metadata"></video>`
    : `<img src="${media.src}" alt="${artifact.name}">`;

  const el = document.createElement('div');
  el.className = 'collage-item';
  el.dataset.id = item.id;
  el.style.cssText = `left:${item.x}px;top:${item.y}px;width:${item.w}px;`;
  el.innerHTML = `${mediaHTML}<div class="collage-item-overlay"><button class="collage-item-remove" onclick="removeCollageItem('${item.id}')">[הסר]</button></div>`;
  el.querySelector('img,video') && (el.querySelector('img,video').draggable = false);
  canvas.appendChild(el);
  const vid = el.querySelector('video');
  if (vid) vid.play().catch(() => {});
  _makeCollageItemDraggable(el, canvas, item.id);
}

function _makeCollageItemDraggable(el, canvas, id) {
  el.addEventListener('mousedown', e => {
    if (e.target.closest('.collage-item-remove')) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startL = parseInt(el.style.left), startT = parseInt(el.style.top);
    el.classList.add('is-dragging');
    const onMove = e => {
      el.style.left = (startL + e.clientX - startX) + 'px';
      el.style.top  = (startT + e.clientY - startY) + 'px';
    };
    const onUp = () => {
      el.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const col = _getCollage();
      const it = col.find(i => i.id === id);
      if (it) { it.x = parseInt(el.style.left); it.y = parseInt(el.style.top); _setCollage(col); }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

window.removeSavedArtifact = function(id) {
  _setSaved(_getSaved().filter(s => s !== id));
  _setCollage(_getCollage().filter(i => i.id !== id));
  const palItem = document.querySelector(`.collage-palette-item[data-id="${id}"]`);
  if (palItem) palItem.remove();
  const canvasItem = document.querySelector(`.collage-item[data-id="${id}"]`);
  if (canvasItem) canvasItem.remove();
};

window.removeCollageItem = function(id) {
  _setCollage(_getCollage().filter(i => i.id !== id));
  const el = document.querySelector(`.collage-item[data-id="${id}"]`);
  if (el) el.remove();
  const hint = document.getElementById('collage-hint');
  if (hint && !document.querySelector('.collage-item')) hint.style.display = '';
};

function _setupCollageCanvas() {
  const canvas = document.getElementById('collage-canvas');
  if (!canvas) return;
  _getCollage().forEach(item => _renderCollageItem(canvas, item));
  if (_getCollage().length) {
    const hint = document.getElementById('collage-hint');
    if (hint) hint.style.display = 'none';
  }

  const _ghostImg = new Image();
  _ghostImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  document.querySelectorAll('.collage-palette-item').forEach(item => {
    const vid = item.querySelector('video');
    if (vid) vid.play().catch(() => {});
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', item.dataset.id);
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setDragImage(_ghostImg, 0, 0);
      canvas.classList.add('is-dragging-over');
    });
    item.addEventListener('dragend', () => {
      canvas.classList.remove('is-dragging-over');
    });
  });

  canvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  canvas.addEventListener('drop', e => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const col = _getCollage();
    if (col.find(i => i.id === id)) return;
    const rect = canvas.getBoundingClientRect();
    const w = 220;
    const item = { id, x: e.clientX - rect.left - w / 2, y: e.clientY - rect.top - 110, w };
    col.push(item);
    _setCollage(col);
    _renderCollageItem(canvas, item);
    const hint = document.getElementById('collage-hint');
    if (hint) hint.style.display = 'none';
  });
}

// ── Saved collection (localStorage) ──────────────────────────────────────────
const _SAVED_KEY = 'hf_saved';
function _getSaved() {
  try { return JSON.parse(localStorage.getItem(_SAVED_KEY)) || []; } catch { return []; }
}
function _setSaved(ids) { localStorage.setItem(_SAVED_KEY, JSON.stringify(ids)); }

window.toggleArtifactSave = function(id) {
  const saved = _getSaved();
  const idx = saved.indexOf(id);
  const nowSaved = idx === -1;
  if (nowSaved) saved.push(id); else saved.splice(idx, 1);
  _setSaved(saved);
  const btn = document.getElementById('artifact-save-btn');
  if (btn) btn.classList.toggle('is-saved', nowSaved);
};

window.removeFromCollection = function(id) {
  const saved = _getSaved().filter(s => s !== id);
  _setSaved(saved);
  const card = document.querySelector(`.collection-card[data-id="${id}"]`);
  if (card) card.remove();
  const grid = document.querySelector('.collection-grid');
  if (grid && !grid.children.length) renderAbout();
};

window.toggleCategoryIntro = function() {
  const topbar = document.getElementById('category-topbar');
  if (topbar) topbar.classList.toggle('intro-open');
};

window.toggleFilterGroup = function(toggleBtn, key) {
  const groupEl = toggleBtn.closest('.filter-group');
  const isOpen = groupEl.classList.contains('is-open');
  document.querySelectorAll('.filter-group.is-open').forEach(g => {
    if (g !== groupEl) {
      g.classList.remove('is-open');
      _filterGroupOpen[g.dataset.key] = false;
    }
  });
  if (!isOpen) {
    positionFilterShell(groupEl, key);
    groupEl.classList.add('is-open');
    _filterGroupOpen[key] = true;
  } else {
    groupEl.classList.remove('is-open');
    _filterGroupOpen[key] = false;
  }
};

window.positionFilterShell = function(groupEl, key) {
  const shell = groupEl.querySelector('.filter-pills-shell');
  const topbar = document.querySelector('.category-topbar');
  if (!shell || !topbar) return;
  const topbarBottom = topbar.getBoundingClientRect().bottom;
  const groupLeft = groupEl.getBoundingClientRect().left;
  shell.style.position = 'fixed';
  shell.style.top = topbarBottom + 'px';
  shell.style.right = '';
  if (key === 'material') {
    _computeGlobalMaterialWidth();
    shell.style.left = '40px';
    shell.style.width = _pillsWidthCache.materialGlobalWidth + 'px';
    _pillsWidthCache.material = _pillsWidthCache.materialGlobalWidth;
  } else {
    shell.style.left = (groupLeft + 10) + 'px';
    shell.style.width = (_pillsWidthCache.material || '') && (_pillsWidthCache.material + 'px');
  }
};

document.addEventListener('click', function(e) {
  if (e.target.closest('#category-filter-bar')) return;
  document.querySelectorAll('.filter-group.is-open').forEach(g => {
    g.classList.remove('is-open');
    _filterGroupOpen[g.dataset.key] = false;
  });
});

function buildFilterBar(artifacts) {
  const useOrder  = USE_OPTIONS.map(o => o.key);
  const uses      = [...new Set(artifacts.map(a => a.use).filter(Boolean))]
    .sort((a, b) => useOrder.indexOf(a) - useOrder.indexOf(b));
  const matArtifacts = _activeFilters.use ? artifacts.filter(a => a.use === _activeFilters.use) : artifacts;
  const matCount  = {};
  matArtifacts.forEach(a => (a.materials || []).forEach(m => { matCount[m] = (matCount[m] || 0) + 1; }));
  const materials = [...new Set(matArtifacts.flatMap(a => a.materials || []).filter(Boolean))]
    .sort((a, b) => matCount[b] - matCount[a]);
  if (!uses.length && !materials.length) return '';

  const useOpen = _filterGroupOpen.use;
  const matOpen = _filterGroupOpen.material;

  const activeUseLabel = _activeFilters.use
    ? (USE_OPTIONS.find(o => o.key === _activeFilters.use)?.label || _activeFilters.use)
    : null;

  const useGroup = uses.length ? `
    <div class="filter-group${_filterGroupOpen.use ? ' is-open' : ''}" data-key="use" style="width:200px;min-width:200px;max-width:200px;">
      <button class="filter-group-toggle" onclick="toggleFilterGroup(this,'use')" type="button">
        <span class="filter-group-label">שימוש</span>
        <span class="filter-group-arrow">›</span>
        ${activeUseLabel ? `<span class="filter-group-selected">${activeUseLabel}</span>` : ''}
      </button>
      <div class="filter-pills-shell">
        <div class="filter-pills">
          <button class="filter-pill ${!_activeFilters.use ? 'active' : ''}" style="--pill-delay:0.04s" onclick="setFilter('use', null)">הכל</button>
          ${uses.map((u, i) => {
            const opt   = USE_OPTIONS.find(o => o.key === u);
            const label = opt ? opt.label : u;
            return `<button class="filter-pill ${_activeFilters.use === u ? 'active' : ''}" style="--pill-delay:${((i + 2) * 0.04).toFixed(2)}s" onclick="setFilter('use', '${u}')">${label}</button>`;
          }).join('')}
        </div>
      </div>
    </div>` : '';

  const matGroup = materials.length ? `
    <div class="filter-group${_filterGroupOpen.material ? ' is-open' : ''}" data-key="material" style="width:160px;min-width:160px;max-width:160px;margin-left:10px;">
      <button class="filter-group-toggle" onclick="toggleFilterGroup(this,'material')" type="button">
        <span class="filter-group-label">חומר</span>
        <span class="filter-group-arrow">›</span>
        ${_activeFilters.material ? `<span class="filter-group-selected">${_activeFilters.material}</span>` : ''}
      </button>
      <div class="filter-pills-shell">
        <div class="filter-pills">
          <button class="filter-pill ${!_activeFilters.material ? 'active' : ''}" style="--pill-delay:0.04s" onclick="setFilter('material', null)">הכל</button>
          ${materials.map((m, i) => `<button class="filter-pill ${_activeFilters.material === m ? 'active' : ''}" style="--pill-delay:${((i + 2) * 0.04).toFixed(2)}s" onclick="setFilter('material', '${m}')">${m}</button>`).join('')}
        </div>
      </div>
    </div>` : '';

  return `<div class="filter-bar" id="category-filter-bar">${matGroup}${useGroup}</div>`;
}

// ── Typing effect ─────────────────────────────────────────────────────────────
function typeText(el, text, onDone) {
  let i = 0;
  el.textContent = '';
  el.classList.add('typing');

  function charDelay(idx) {
    const ch   = text[idx];
    const prev = text[idx - 1] || '';
    const next = text[idx + 1] || '';
    if (ch === '.' || ch === '!' || ch === '?') return 600;
    if (ch === ',') {
      if (/\d/.test(prev) && /\d/.test(next)) return 40;
      return 280;
    }
    if (ch === ':' || ch === ';') return 240;
    return 40;
  }

  function tick() {
    if (i < text.length) {
      el.textContent += text[i];
      const delay = charDelay(i);
      i++;
      setTimeout(tick, delay);
    } else {
      el.classList.remove('typing');
      if (onDone) onDone();
    }
  }
  tick();
}

// ── Home ─────────────────────────────────────────────────────────────────────
function renderHome() {
  _currentCategoryId = null;
  app.innerHTML = `
    <section class="home-hero" id="home-hero">
      <video class="hero-video" autoplay muted loop playsinline
        src="media/artifacts/כד מעוטר בוהק מתכתי.mp4"
        onerror="this.style.display='none'"></video>
      <div class="hero-overlay"></div>
      <h1 class="hero-title">האדם היוצר</h1>
      <p class="hero-subtitle">אוסף הארכאולוגיה - מוזיאון ישראל</p>
      <div class="hero-scroll-hint">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M4 11l6 6 6-6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </section>

    <section class="categories-carousel-section">
      <div class="categories-carousel" id="categories-carousel">
        ${CATEGORIES.map(cat => {
          const flipClass = cat.flip ? ' flip-h' : '';
          const videoEl = cat.video
            ? `<video class="${flipClass.trim()}" src="${cat.video}" muted loop playsinline preload="auto"
                onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video>`
            : `<div style="width:100%;height:100%;background:#050505;"></div>`;
          return `
          <div class="category-carousel-card" data-cat-id="${cat.id}" onclick="navigate('#category/${cat.id}')">
            <div class="category-carousel-media">${videoEl}</div>
            <span class="category-carousel-label">[${cat.name}]</span>
          </div>`;
        }).join('')}
      </div>
    </section>`;

  requestAnimationFrame(() => {
    const carousel = document.getElementById('categories-carousel');
    if (carousel) {
      setupCarouselDrag(carousel);
      carousel.scrollLeft = 80;
    }

    const hero = document.getElementById('home-hero');
    const categoriesSection = document.querySelector('.categories-carousel-section');

    if (hero && categoriesSection) {
      hero.addEventListener('click', () => {
        categoriesSection.scrollIntoView({ behavior: 'smooth' });
      });
    }
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
  if (_pendingFilters) {
    _activeFilters = { use: null, material: null, ..._pendingFilters };
    _pendingFilters = null;
  }
  const cat = CATEGORIES.find(c => c.id === id);
  if (!cat) { renderHome(); return; }

  const allArtifacts = sortArtifacts(
    ARTIFACTS.filter(a => a.categoryId === id),
    _currentSortOrder
  );
  const filtered = applyFilters(allArtifacts);
  const display = pushLast(
    filtered.length <= 6
      ? [...filtered].sort((a, b) => artifactMaxDimension(b) - artifactMaxDimension(a))
      : filtered,
    'eg-40'
  );

  const thumbEl = cat.video
    ? `<video class="category-page-thumb${cat.flip ? ' flip-h' : ''}" src="${cat.video}" muted loop playsinline preload="metadata"></video>`
    : '';

  const emptyMsg = _activeFilters.use || _activeFilters.material
    ? `<div class="empty-state">אין פריטים התואמים את הסינון <button class="filter-clear-btn" onclick="setFilter('use',null);setFilter('material',null)">נקה סינון</button></div>`
    : `<div class="empty-state">אין פריטים בקטגוריה זו</div>`;

  app.innerHTML = `
    <div class="category-layout">
      <div class="category-topbar" id="category-topbar">
        <div class="category-topbar-row">
          <div class="category-topbar-identity" onclick="toggleCategoryIntro()">
            <h2 class="category-topbar-title">[${cat.name}]</h2>
            <span class="category-topbar-count">${pluralItems(allArtifacts.length)}</span>
          </div>
        </div>
        <div class="category-intro-panel" id="category-intro-panel">
          <div class="category-intro-panel-inner">
            <p class="category-intro-text">קטגוריית <strong>מצרים העתיקה</strong> במוזיאון ישראל מביאה את הסיפור של אחת התרבויות המרתקות בהיסטוריה, דרך מה שהם השאירו מאחור. הסיפור הזה כמעט תמיד נע סביב ציר אחד מרכזי: הניסיון לנצח את הזמן, לחבר בין החיים הצרים פה בארץ לבין חיי הנצח של האלים ושל העולם הבא.</p>
            <p class="category-intro-text">כדי שהחיבור הזה יעבוד, המצרים לא הסתפקו רק במילים או בתפילות – הם היו צריכים חפצים וחומרים מוחשיים. כאן באוסף אפשר לראות איך תפיסת העולם הזו התעוררה לחיים בטקסים היומיומיים ובפולחני הקבורה שלהם. הבחירה בכל חומר וחומר הייתה קריטית ומכוונת: אבנים ומתכות מסוימות נבחרו לא בגלל המראה שלהן, אלא בגלל המשמעות המאגית שלהן והיכולת שלהן לשמור על הגוף והנפש.</p>
            <p class="category-intro-text">הסיור בקטגוריה הזו הוא הזדמנות לראות איך תרבות שלמה תרגמה רעיונות רוחניים מופשטים לחומר מוחשי, ואיך כל פריט – מקמיע קטן ועד עיטורי קבורה מאסיביים – נוצר כדי לשרת תפקיד מדויק במערכת האמונות המצרית.</p>
          </div>
        </div>
      </div>
      <div class="category-sort-row">
        ${buildFilterBar(allArtifacts)}
        <div id="category-sort-toggle-wrapper">${buildSortToggle(_currentSortOrder)}</div>
      </div>
      <div class="category-grid-area" id="category-grid-container">
        ${filtered.length === 0
          ? emptyMsg
          : `<div class="artifacts-grid">${display.map(a => buildArtifactCard(a, false)).join('')}</div>`
        }
      </div>
    </div>`;
  requestAnimationFrame(setupMasonryGrid);
}

// ── Archive ───────────────────────────────────────────────────────────────────
function _buildArchiveSlideHTML(a) {
  return `<div class="archive-artifact-slide" data-artifact-id="${a.id}" data-cat-id="${a.categoryId}"
    onclick="navigate('#artifact/${a.id}')">
    <div class="archive-slide-media">${buildSlideMediaEl(a.media)}</div>
  </div>`;
}

function _buildArchiveImagesHTML() {
  const groups = [];
  const ageMap = new Map();
  for (const a of _archiveSorted) {
    if (!ageMap.has(a.ageNum)) { const g = []; ageMap.set(a.ageNum, g); groups.push(g); }
    ageMap.get(a.ageNum).push(a);
  }
  return groups.map(group => {
    if (group.length === 1) return _buildArchiveSlideHTML(group[0]);
    const rows = [];
    for (let i = 0; i < group.length; i += 3) rows.push(group.slice(i, i + 3));
    return rows.map(row => `<div class="archive-era-row">${row.map(_buildArchiveSlideHTML).join('')}</div>`).join('');
  }).join('');
}

function _buildArchiveTextHTML() {
  return `<div class="archive-text-list">
    <div class="archive-text-header">
      <span class="atl-year">תקופה</span>
      <span class="atl-name">שם</span>
      <span class="atl-location">מיקום</span>
      <span class="atl-material">חומר</span>
    </div>
    ${_archiveSorted.map(a => `
      <div class="archive-text-row" data-artifact-id="${a.id}" onclick="navigate('#artifact/${a.id}')">
        <span class="atl-year">${a.age || '-'}</span>
        <span class="atl-name">${a.name}</span>
        <span class="atl-location">${a.location || '-'}</span>
        <span class="atl-material">${(a.materials && a.materials.length ? a.materials : [a.material]).filter(Boolean).join(', ') || '-'}</span>
      </div>`).join('')}
  </div>`;
}

window.toggleArchiveMode = function(mode) {
  if (_archiveMode === mode) return;
  _archiveMode = mode;
  document.querySelectorAll('.avt-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  const body = document.getElementById('archive-artifacts-body');
  if (!body) return;
  body.innerHTML = mode === 'images' ? _buildArchiveImagesHTML() : _buildArchiveTextHTML();
  if (mode === 'images') {
    const acf = document.getElementById('archive-cursor-follower');
    if (acf) acf.classList.remove('acf-visible');
    requestAnimationFrame(() => setupArchiveObserver(_archiveSorted.map(a => a.id)));
  } else {
    requestAnimationFrame(() => { setupArchiveTextObserver(); setupArchiveCursorFollower(); });
  }
};

function renderArchive() {
  _currentCategoryId = null;
  _archiveMode = 'text';
  _archiveSorted = ARTIFACTS.slice().sort((a, b) => b.ageNum - a.ageNum);

  const timelineYears = [1900,1800,1700,1600,1500,1400,1300,1200,1100,1000,
    900,800,700,600,500,400,300,200,100,0,
    -100,-200,-300,-400,-500,-600,
    -1000,-2000,-3000,-5000,-10000,-30000,-100000,-200000
  ].map(y => {
    const abs = Math.abs(y);
    const str = abs >= 10000 ? abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(abs);
    const label = y < 0 ? `-${str}` : String(y);
    return `<div class="timeline-year-item" data-year="${y}" onclick="scrollArchiveToYear(${y})"><span class="timeline-year-label">${label}</span></div>`;
  }).join('');

  app.innerHTML = `
    <div class="archive-redesign" id="archive-redesign">

      <div class="archive-artifacts-col" id="archive-artifacts-col">
        <div id="archive-artifacts-body">
          ${_buildArchiveTextHTML()}
        </div>
      </div>

      <div class="archive-timeline-col" id="archive-timeline-col">
        ${timelineYears}
      </div>

    </div>`;

  requestAnimationFrame(() => {
    setupArchiveTextObserver();
    setupArchiveCursorFollower();

    const header = document.querySelector('.archive-text-header');
    const archiveLine = document.getElementById('archive-header-line');
    if (header && archiveLine) {
      const bottom = header.getBoundingClientRect().bottom;
      archiveLine.style.top = bottom + 'px';
      archiveLine.classList.add('visible');
      const timelineCol = document.getElementById('archive-timeline-col');
      if (timelineCol) {
        const headerH = bottom - 64;
        timelineCol.style.paddingTop = headerH + 'px';
        const clip = `linear-gradient(to bottom, transparent ${headerH}px, black ${headerH}px)`;
        timelineCol.style.maskImage = clip;
        timelineCol.style.webkitMaskImage = clip;
      }
    }
  });
}

window.scrollToArchiveCategory = function(catId) { scrollArchiveToCat(catId); };

function scrollColToSlide(col, slide) {
  if (!col || !slide) return;
  const top = slide.getBoundingClientRect().top - col.getBoundingClientRect().top + col.scrollTop;
  col.scrollTo({ top, behavior: 'smooth' });
}

window.scrollArchiveToCat = function(catId) {
  const col = document.getElementById('archive-artifacts-col');
  const slide = col && col.querySelector(`.archive-artifact-slide[data-cat-id="${catId}"]`);
  scrollColToSlide(col, slide);
};

window.scrollArchiveToYear = function(year) {
  const candidates = ARTIFACTS.filter(a => a.ageNum !== 0);
  if (!candidates.length) return;
  const nearest = candidates.reduce((best, a) =>
    Math.abs(a.ageNum - year) < Math.abs(best.ageNum - year) ? a : best
  );
  const col = document.getElementById('archive-artifacts-col');
  const selector = _archiveMode === 'text'
    ? `.archive-text-row[data-artifact-id="${nearest.id}"]`
    : `.archive-artifact-slide[data-artifact-id="${nearest.id}"]`;
  const el = col && col.querySelector(selector);
  scrollColToSlide(col, el);
  setActiveTimelineYear(year);
};

const TIMELINE_YEARS = [
  1900,1800,1700,1600,1500,1400,1300,1200,1100,1000,
  900,800,700,600,500,400,300,200,100,0,
  -100,-200,-300,-400,-500,-600,
  -1000,-2000,-3000,-5000,-10000,-30000,-100000,-200000
];

function setActiveTimelineYear(ageNum) {
  const nearest = TIMELINE_YEARS.reduce((best, y) =>
    Math.abs(y - ageNum) < Math.abs(best - ageNum) ? y : best
  );
  const timelineCol = document.getElementById('archive-timeline-col');
  if (!timelineCol) return;
  timelineCol.querySelectorAll('.timeline-year-item').forEach(el => {
    el.classList.toggle('active', +el.dataset.year === nearest);
  });
  const active = timelineCol.querySelector(`.timeline-year-item[data-year="${nearest}"]`);
  if (active) {
    const top = active.getBoundingClientRect().top - timelineCol.getBoundingClientRect().top + timelineCol.scrollTop - timelineCol.clientHeight / 2 + active.clientHeight / 2;
    timelineCol.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}

function setupArchiveCursorFollower() {
  let el = document.getElementById('archive-cursor-follower');
  if (!el) {
    el = document.createElement('div');
    el.id = 'archive-cursor-follower';
    el.innerHTML = '<img alt="">';
    document.body.appendChild(el);
  }
  const body = document.getElementById('archive-artifacts-body');
  const col  = document.getElementById('archive-artifacts-col');
  if (!body || !col) return;

  let lastId = null;
  let lastSrc = null;
  let lastX = 0, lastY = 0;
  let curX = 0, curY = 0;
  let insideBody = false;

  function spawnGhost(src, x, y) {
    const ghost = document.createElement('div');
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:997;width:160px;height:160px;transform:translate(-50%,-50%);left:${x}px;top:${y}px;opacity:1;transition:opacity 0.2s ease 0.08s;`;
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
    ghost.appendChild(img);
    document.body.appendChild(ghost);
    requestAnimationFrame(() => {
      ghost.style.opacity = '0';
      ghost.addEventListener('transitionend', () => ghost.remove(), { once: true });
    });
  }

  function updateFollower(x, y) {
    const hit = document.elementFromPoint(x, y);
    const row = hit && hit.closest('.archive-text-row');
    if (!row) { el.classList.remove('acf-visible'); return; }
    const artifact = ARTIFACTS.find(a => a.id === row.dataset.artifactId);
    if (!artifact || !artifact.media || artifact.media.type !== 'image') {
      el.classList.remove('acf-visible'); return;
    }
    if (lastId !== artifact.id) {
      if (lastSrc) spawnGhost(lastSrc, lastX, lastY);
      el.querySelector('img').src = artifact.media.src;
      lastSrc = artifact.media.src;
      lastId = artifact.id;
    }
    lastX = x; lastY = y;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.classList.add('acf-visible');
  }

  body.addEventListener('mouseenter', () => { insideBody = true; });

  body.addEventListener('mousemove', e => {
    curX = e.clientX; curY = e.clientY;
    updateFollower(curX, curY);
  });

  body.addEventListener('mouseleave', () => {
    insideBody = false;
    el.classList.remove('acf-visible');
    lastId = null;
    lastSrc = null;
  });

  body.addEventListener('click', () => {
    el.classList.remove('acf-visible');
    lastId = null;
    lastSrc = null;
  });

  col.addEventListener('scroll', () => {
    if (!insideBody) return;
    updateFollower(curX, curY);
  }, { passive: true });
}

function setupArchiveTextObserver() {
  const col = document.getElementById('archive-artifacts-col');
  if (!col) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const artifact = ARTIFACTS.find(a => a.id === entry.target.dataset.artifactId);
      if (artifact && artifact.ageNum !== 0) setActiveTimelineYear(artifact.ageNum);
    });
  }, { root: col, rootMargin: '-10% 0px -80% 0px', threshold: 0 });
  col.querySelectorAll('.archive-text-row[data-artifact-id]').forEach(el => observer.observe(el));
  const oldest = ARTIFACTS.filter(a => a.ageNum !== 0).reduce((min, a) => a.ageNum < min.ageNum ? a : min);
  col.addEventListener('scroll', () => {
    if (col.scrollTop + col.clientHeight >= col.scrollHeight - 20) setActiveTimelineYear(oldest.ageNum);
  }, { passive: true });
}

function setupArchiveObserver(artifactIds) {
  const col = document.getElementById('archive-artifacts-col');
  if (!col) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const artifact = ARTIFACTS.find(a => a.id === entry.target.dataset.artifactId);
      if (artifact && artifact.ageNum !== 0) setActiveTimelineYear(artifact.ageNum);
    });
  }, {
    root: col,
    rootMargin: '-10% 0px -80% 0px',
    threshold: 0,
  });
  artifactIds.forEach(id => {
    const el = col.querySelector(`.archive-artifact-slide[data-artifact-id="${id}"]`);
    if (el) observer.observe(el);
  });

  const oldest = ARTIFACTS.filter(a => a.ageNum !== 0).reduce((min, a) => a.ageNum < min.ageNum ? a : min);
  col.addEventListener('scroll', () => {
    if (col.scrollTop + col.clientHeight >= col.scrollHeight - 20) {
      setActiveTimelineYear(oldest.ageNum);
    }
  }, { passive: true });
}

function pushLast(arr, id) {
  const i = arr.findIndex(a => a.id === id);
  if (i === -1) return arr;
  const copy = [...arr];
  copy.push(copy.splice(i, 1)[0]);
  return copy;
}

function artifactMaxDimension(a) {
  if (!a.size) return 0;
  const nums = (a.size.match(/[\d.]+/g) || []).map(Number).filter(n => n > 0);
  return nums.length ? Math.max(...nums) : 0;
}

function artifactSizeClass(a) {
  if (a.cardSize) return a.cardSize;
  if (!a.size) return 'size-sm';
  const nums = (a.size.match(/[\d.]+/g) || []).map(Number).filter(n => n > 0);
  if (!nums.length) return 'size-sm';
  const max = Math.max(...nums);
  if (max <= 13) return 'size-sm';
  if (max <= 36) return 'size-md';
  return 'size-lg';
}

function buildArtifactCard(artifact, showCategory) {
  const cat = CATEGORIES.find(c => c.id === artifact.categoryId);
  const szClass = artifactSizeClass(artifact);
  return `
    <div class="artifact-card ${szClass}" id="arc-${artifact.id}" data-artifact-id="${artifact.id}" data-category-id="${artifact.categoryId}" onclick="navigate('#artifact/${artifact.id}')">
      <div class="artifact-card-media">
        ${buildCardMediaEl(artifact.media)}
        <div class="artifact-card-info">
          <div class="artifact-card-name">${artifact.name}</div>
          ${artifact.age ? `<div class="artifact-card-age">${artifact.age}</div>` : ''}
          ${showCategory && cat ? `<div class="artifact-card-category">${cat.name}</div>` : ''}
        </div>
      </div>
    </div>`;
}

// ── Artifact ──────────────────────────────────────────────────────────────────
function renderArtifact(id) {
  const artifact = ARTIFACTS.find(a => a.id === id);
  if (!artifact) { renderHome(); return; }

  const cat = CATEGORIES.find(c => c.id === artifact.categoryId);
  const siblings = sortArtifacts(
    ARTIFACTS.filter(a => {
      if (a.categoryId !== artifact.categoryId) return false;
      if (_activeFilters.use && a.use !== _activeFilters.use) return false;
      if (_activeFilters.material && !(a.materials && a.materials.includes(_activeFilters.material))) return false;
      return true;
    }),
    _currentSortOrder
  );
  const idx  = siblings.findIndex(a => a.id === id);
  const prev = siblings[idx - 1] || null;
  const next = siblings[idx + 1] || null;

  const mediaHTML = buildMediaEl(artifact.media, true);
  const useOption = USE_OPTIONS.find(o => o.key === artifact.use);
  const useLabel  = useOption ? useOption.label : artifact.use || '';

  const placeholderDesc = `בסתת היא אלת החתול של מצרים הקדומה- מגוננת, אם ואלת פריון, שפולחנה התפשט ברחבי מצרים מהאלף השלישי לפני הספירה ועד לתקופה הרומית. היא מוצגת לעיתים כאישה בעלת ראש חתולה, ולעיתים כחתולה בלבד, והחתול הביתי נחשב לגלגולה הארצי - חיה קדושה שאם אדם הורג או פוגע בה, אפילו בשוגג, נענש בחומרה.

ארון הקבורה הקטן הזה נועד להכיל גופת חתול שנחנט במיוחד לצורכי פולחן- מנהג נפוץ במצרים של המאה הרביעית עד הראשונה לפני הספירה. מומיות החתולים הוגשו כנדבות במקדשי בסתת, ביאופוליס מאג׳נה ובמקומות פולחן אחרים, ומאות אלפי ארונות כאלה נמצאו בחפירות ארכיאולוגיות. הארון עצמו, בצורתו ובעיטוריו, הפך את החתול למנחה ראויה לאלה.

הברונזה כחומר גלם אינה מקרית: היא נפוצה במצרים המאוחרת דווקא לפריטי פולחן הקשורים לבסתת- עמידה, יוקרתית, ומסוגלת לשמור על צורתה לאורך זמן. בניגוד לפיאנס או לחרס שנועדו לשימוש חד-פעמי, ארון ברונזה מעיד על כוונה לקבורה של ממש- מחווה שתישמר.`;

  const descText = artifact.description || placeholderDesc;
  const descParagraphs = descText.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
  const placeholderNote = `טקס חניטה וקבורה של חתול במצרים העתיקה\n\nבמצרים העתיקה נחשב החתול לבעל חיים קדוש, ומותו עורר אבל במשפחה. הכוהנים ניקו את גוף החתול והשרו אותו במלח מיוחד לייבוש, ולאחר מכן עטפו אותו ברצועות פשתן בקפידה, לעיתים עם מסכה המזכירה את פניו. הגופה החנוטה הונחה בארון קטן בצורת חתול, לעיתים בצירוף קורבנות מאכל כמו חלב או עכברים חנוטים. לבסוף נקבר החתול בבית קברות מיוחד לבעלי חיים, במעמד שביטא את הקדושה שיוחסה לו.`;
  const noteText = artifact.note || placeholderNote;
  const noteParagraphs = noteText.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');

  app.innerHTML = `
    <div class="artifact-v2">
      <div class="artifact-v2-desc-panel">
        ${artifact.glyph ? `<div class="artifact-v2-glyph">${artifact.glyph}</div>` : ''}
        <div class="artifact-v2-description">${noteParagraphs}</div>
      </div>
      <div class="artifact-v2-video-panel">
        <div class="artifact-v2-video-wrap" id="artifact-v2-video-wrap">
          ${mediaHTML}
        </div>
        <div class="artifact-v2-nav">
          <div class="artifact-v2-nav-btn is-next ${next ? '' : 'disabled'}"
            ${next ? `onclick="navigate('#artifact/${next.id}')"` : ''}>
            <span class="artifact-v2-nav-arrow">[הפריט הבא]</span>
          </div>
          <div class="artifact-v2-nav-btn is-prev ${prev ? '' : 'disabled'}"
            ${prev ? `onclick="navigate('#artifact/${prev.id}')"` : ''}>
            <span class="artifact-v2-nav-arrow">[הפריט הקודם]</span>
          </div>
        </div>
      </div>
      <div class="artifact-v2-info-panel">
        <button class="artifact-save-btn${_getSaved().includes(artifact.id) ? ' is-saved' : ''}" id="artifact-save-btn" onclick="toggleArtifactSave('${artifact.id}')" title="שמור פריט">
          <svg class="artifact-save-icon" width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H13V17L7 12.5L1 17V1Z" stroke="#fff" stroke-width="0.8"/>
          </svg>
        </button>
        <div class="artifact-v2-breadcrumb">
          ${cat ? `<span class="artifact-v2-breadcrumb-link" onclick="navigateToCategory('${cat.id}')">${cat.name}</span>` : ''}
          ${useLabel && cat ? `<span class="artifact-v2-breadcrumb-sep">›</span><span class="artifact-v2-breadcrumb-link" onclick="navigateWithFilter('${cat.id}','use','${artifact.use}')">${useLabel}</span>` : ''}
          ${artifact.material && cat ? `<span class="artifact-v2-breadcrumb-sep">›</span><span class="artifact-v2-breadcrumb-link" onclick="navigateWithFilter('${cat.id}','material','${artifact.material}')">${artifact.material}</span>` : ''}
        </div>
        <h1 class="artifact-v2-title">${artifact.name}</h1>
        <div class="artifact-v2-meta-table">
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">תקופה</span>
            <span class="artifact-v2-meta-value">${artifact.age || '-'}</span>
          </div>
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">מיקום</span>
            <span class="artifact-v2-meta-value">${artifact.location || '-'}</span>
          </div>
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">חומרים</span>
            <span class="artifact-v2-meta-value">${artifact.material || '-'}</span>
          </div>
          <div class="artifact-v2-meta-row">
            <span class="artifact-v2-meta-label">גודל</span>
            <span class="artifact-v2-meta-value">${artifact.size || '-'}</span>
          </div>
        </div>
        <div class="artifact-v2-description">${descParagraphs}</div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    attachLoupeTo('#artifact-v2-video-wrap');
    attachScrubTo('#artifact-v2-video-wrap');
    const vid = document.querySelector('#artifact-v2-video-wrap video');
    if (vid) vid.play().catch(() => {});
    const artifactLine = document.getElementById('artifact-sub-line');
    if (artifactLine) artifactLine.classList.add('visible');
  });
}

// ── Artifact scrub (drag to rotate) ──────────────────────────────────────────
function attachScrubTo(selector) {
  const wrap = document.querySelector(selector);
  if (!wrap) return;
  const vid = wrap.querySelector('video');
  if (!vid) return;

  let mouseDown = false;
  let scrubActive = false;
  let suppressClick = false;
  let startX = null;
  let lastX = null;
  let pendingDx = 0;
  let rafId = null;

  function applySeek() {
    rafId = null;
    if (!pendingDx || !vid.duration) return;
    const rect = wrap.getBoundingClientRect();
    let t = vid.currentTime + pendingDx * (vid.duration / rect.width);
    pendingDx = 0;
    if (t < 0) t += vid.duration;
    if (t >= vid.duration) t -= vid.duration;
    vid.currentTime = t;
  }

  wrap.addEventListener('mousedown', e => {
    mouseDown = true;
    scrubActive = false;
    suppressClick = false;
    startX = lastX = e.clientX;
    pendingDx = 0;
  });

  window.addEventListener('mousemove', e => {
    if (!mouseDown) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    if (!scrubActive) {
      if (Math.abs(e.clientX - startX) < 4) return;
      scrubActive = true;
      suppressClick = true;
      vid.pause();
      wrap.style.cursor = 'ew-resize';
    }
    pendingDx += dx;
    if (!rafId) rafId = requestAnimationFrame(applySeek);
  });

  window.addEventListener('mouseup', () => {
    if (scrubActive) {
      wrap.style.cursor = '';
      vid.play().catch(() => {});
    }
    mouseDown = false;
    scrubActive = false;
    lastX = null;
    pendingDx = 0;
  });

  // suppress the click that fires after a drag so pause/play doesn't toggle
  wrap.addEventListener('click', e => {
    if (suppressClick) { suppressClick = false; e.stopImmediatePropagation(); }
  }, true);
}

// ── Loupe (magnifier) ─────────────────────────────────────────────────────────
const LOUPE_SIZE = 190;
const LOUPE_ZOOM = 2.8;

let _loupeEl = null;
let _loupeCanvas = null;
let _loupeCtx = null;
let _loupeVideo = null;
let _loupeImage = null;
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
  const source = _loupeVideo || _loupeImage;
  if (!source) return;

  const isVideo = source.tagName === 'VIDEO';
  if (isVideo && source.readyState < 2) return;
  if (!isVideo && !source.complete) return;

  const nw = isVideo ? source.videoWidth  : source.naturalWidth;
  const nh = isVideo ? source.videoHeight : source.naturalHeight;
  if (!nw || !nh) return;

  const rect = source.getBoundingClientRect();
  const aspect = nw / nh;
  const elAspect = rect.width / rect.height;

  let cw, ch, cx, cy;
  if (aspect > elAspect) {
    cw = rect.width;  ch = rect.width / aspect;
    cx = 0;           cy = (rect.height - ch) / 2;
  } else {
    ch = rect.height; cw = rect.height * aspect;
    cx = (rect.width - cw) / 2; cy = 0;
  }

  const relX = _loupeMouseX - rect.left - cx;
  const relY = _loupeMouseY - rect.top  - cy;

  const srcW = (LOUPE_SIZE / LOUPE_ZOOM) * (nw / cw);
  const srcH = (LOUPE_SIZE / LOUPE_ZOOM) * (nh / ch);
  let srcX = relX * (nw / cw) - srcW / 2;
  let srcY = relY * (nh / ch) - srcH / 2;
  srcX = Math.max(0, Math.min(nw - srcW, srcX));
  srcY = Math.max(0, Math.min(nh - srcH, srcY));

  const ctx = _loupeCtx;
  ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
  ctx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
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
    const img = fresh.querySelector('img');
    if (!vid && !img) return;
    _loupeVideo = vid || null;
    _loupeImage = img && !vid ? img : null;
    _loupeEl.style.display = 'block';
    if (!_loupeFrame) _loupeFrame = requestAnimationFrame(loupeTick);
  });

  fresh.addEventListener('mousemove', e => {
    _loupeMouseX = e.clientX;
    _loupeMouseY = e.clientY;
  });

  fresh.addEventListener('mouseleave', () => {
    _loupeVideo = null;
    _loupeImage = null;
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
  const saved = _getSaved();
  const savedArtifacts = saved.map(id => ARTIFACTS.find(a => a.id === id)).filter(Boolean);

  const collectionHTML = savedArtifacts.length === 0 ? `
    <div class="collection-empty">
      <p class="collection-empty-text">עדיין לא שמרת פריטים. לחץ על סמל הסימניה בדף הפריט כדי להוסיף לאוסף.</p>
    </div>` : `
    <div class="collection-grid">
      ${savedArtifacts.map(a => {
        const media = a.media;
        const thumb = media
          ? (media.type === 'video'
              ? `<video src="${media.src}" muted playsinline preload="metadata" class="collection-thumb"></video>`
              : `<img src="${media.src}" alt="${a.name}" class="collection-thumb">`)
          : `<div class="collection-thumb collection-thumb-empty"></div>`;
        return `
          <div class="collection-card" data-id="${a.id}" onclick="navigate('#artifact/${a.id}')">
            <div class="collection-card-media">${thumb}</div>
            <div class="collection-card-info">
              <span class="collection-card-name">${a.name}</span>
              <button class="collection-card-remove" onclick="event.stopPropagation();removeFromCollection('${a.id}')" title="הסר מהאוסף">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="#fff" stroke-width="0.8"/></svg>
              </button>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  app.innerHTML = `
    <div class="about-page">
      <div class="about-statement">
        <p class="about-statement-text">האדם היוצר הוא מיזם אינטראקטיבי מטעם מוזיאון ישראל, שנועד להנגיש את אוסף הארכיאולוגיה המלא של המוזיאון לקהל הרחב. במרכז המיזם עומד עקרון היצירה כגורם מאחד אוניברסלי של האנושות כולה. האוסף סוקר יצירה אנושית בין תרבויות שונות ומגוונות לאורך מעל 300,000 שנה, ומעניק הזדמנות ייחודית להתעמק ולגלות כיצד מלאכה אנושית מייצגת ומאחדת אותנו כחברה אנושית.</p>
        <p class="about-statement-text about-statement-cta">האדם מעולם לא הפסיק ליצור, רוצה להמשיך את דרכו?</p>
      </div>
      <div class="collage-section">
        <div class="about-collection-header">
          <span class="about-collection-title">האוסף שלי</span>
          <span class="about-collection-count">${savedArtifacts.length ? `${savedArtifacts.length} פריטים` : ''}</span>
        </div>
        <div class="collage-workspace">
          <div class="collage-canvas" id="collage-canvas">
            <span class="collage-hint" id="collage-hint">גרור יצירות לפה</span>
          </div>
          <div class="collage-collection-panel" id="collage-palette">
            ${savedArtifacts.length === 0
              ? `<p class="collection-empty-text">עדיין לא שמרת פריטים.</p>`
              : savedArtifacts.map(a => {
                  const media = a.media;
                  const thumb = !media ? '' : media.type === 'video'
                    ? `<video src="${media.src}" muted playsinline preload="metadata" class="collage-palette-thumb" draggable="false"></video>`
                    : `<img src="${media.src}" alt="${a.name}" class="collage-palette-thumb" draggable="false">`;
                  return `<div class="collage-palette-item" data-id="${a.id}" draggable="true">
                    ${thumb}
                    <div class="collage-palette-overlay">
                      <button class="collage-palette-remove" onclick="removeSavedArtifact('${a.id}')">[הסר]</button>
                    </div>
                  </div>`;
                }).join('')}
          </div>
        </div>
      </div>
    </div>`;

  requestAnimationFrame(_setupCollageCanvas);
}
