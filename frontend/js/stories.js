// ─── STORIES MODULE ───────────────────────────────────────────
// Handles: upload, feed display, full-screen viewer, like, reply, delete

let _storyFeed   = [];   // grouped story feed [{user, stories:[]}]
let _viewerGroup = 0;    // current group index in viewer
let _viewerIdx   = 0;    // current story index within group
let _viewerTimer = null; // auto-advance timer
const STORY_DURATION = 6000; // ms per story slide

// ─── UPLOAD ──────────────────────────────────────────────────
function openStoryUpload() {
  document.getElementById('story-upload-input').click();
}

document.getElementById('story-upload-input').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;
  this.value = '';

  // Validate type
  if (!file.type.startsWith('image/')) {
    showToast('Only image stories are supported right now');
    return;
  }

  showToast('📤 Uploading story...');
  const form = new FormData();
  form.append('media', file);

  try {
    const story = await api.request('POST', '/stories', form, true);
    showToast('✅ Story posted!');
    await loadStories(); // refresh story bar
  } catch (err) {
    showToast('❌ ' + err.message);
  }
});

// ─── LOAD STORIES (story bar) ────────────────────────────────
async function loadStories() {
  const sr = document.getElementById('stories-row');
  try {
    const groups = await api.get('/stories/feed');
    _storyFeed = groups;
    renderStoryBar(groups);
  } catch (err) {
    renderStoryBar([]);
  }
}

function renderStoryBar(groups) {
  const sr = document.getElementById('stories-row');
  const myId = window.APP.user._id;

  // Own story bubble — always first
  const myGroup = groups.find(g => g.user._id === myId || g.user._id.toString() === myId);
  const hasMyStory = myGroup && myGroup.stories.length > 0;

  let html = `
    <div class="story-item" onclick="openStoryUpload()" id="story-add-btn" title="Add story">
      <div class="story-ring" style="background:${hasMyStory ? 'var(--grad)' : 'var(--surface2)'};${hasMyStory ? '' : 'border:2px dashed var(--border)'}">
        <div class="story-inner" style="background:var(--surface);position:relative;overflow:hidden">
          ${hasMyStory
            ? avatarInner(window.APP.user, 18)
            : `<span style="font-size:22px;font-weight:300;color:var(--muted)">+</span>`}
        </div>
      </div>
      <span class="story-name" style="font-size:11px;color:var(--muted)">${hasMyStory ? 'Your story' : 'Add story'}</span>
    </div>`;

  // Others' story bubbles
  groups.forEach((group, gIdx) => {
    if (group.user._id === myId || group.user._id.toString() === myId) return;
    const allViewed = group.stories.every(s => s.viewed);
    const su = sanitize(group.user.username);
    html += `
      <div class="story-item" onclick="openStoryViewer(${gIdx})">
        <div class="story-ring" style="${allViewed ? 'background:var(--border)' : ''}">
          <div class="story-inner">${avatarInner(group.user, 18)}</div>
        </div>
        <span class="story-name">${su}</span>
      </div>`;
  });

  sr.innerHTML = html;
}

// ─── STORY VIEWER ────────────────────────────────────────────
function openStoryViewer(groupIdx) {
  _viewerGroup = groupIdx;
  _viewerIdx   = 0;
  _renderViewer();
}

function _renderViewer() {
  document.getElementById('story-viewer')?.remove();
  clearTimeout(_viewerTimer);

  const group = _storyFeed[_viewerGroup];
  if (!group) return;
  const story = group.stories[_viewerIdx];
  if (!story) return;

  // Mark as viewed silently
  api.request('PUT', `/stories/${story._id}/view`, null).catch(() => {});

  const myId  = window.APP.user._id;
  const isOwn = group.user._id === myId || group.user._id.toString() === myId;
  const liked = story.liked;
  const su    = sanitize(group.user.username);
  const totalStories = group.stories.length;

  // Progress bars
  const bars = Array.from({ length: totalStories }, (_, i) => `
    <div class="sv-bar-bg">
      <div class="sv-bar-fill" id="sv-bar-${i}" style="width:${i < _viewerIdx ? '100%' : '0%'}"></div>
    </div>`).join('');

  const viewer = document.createElement('div');
  viewer.id = 'story-viewer';
  viewer.style.cssText = `
    position:fixed;inset:0;z-index:800;background:#000;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    touch-action:none;
  `;

  viewer.innerHTML = `
    <!-- Progress bars -->
    <div class="sv-bars">${bars}</div>

    <!-- Header -->
    <div class="sv-header">
      <div style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer" onclick="closeStoryViewer();viewProfile('${su}')">
        <div class="post-avatar" style="width:36px;height:36px">${avatarInner(group.user, 14)}</div>
        <div>
          <p style="color:#fff;font-size:14px;font-weight:700">${su}</p>
          <p style="color:rgba(255,255,255,.6);font-size:11px">${_timeLeft(story.expiresAt)}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <!-- Pause/Play -->
        <button id="sv-pause-btn" onclick="_toggleStoryPause()" style="background:none;border:none;cursor:pointer;color:#fff;padding:4px;display:flex">
          <svg id="sv-pause-icon" width="18" height="18" fill="#fff" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        <!-- Three dots (own story: delete) -->
        ${isOwn ? `
        <button onclick="_storyMenu('${story._id}')" style="background:none;border:none;cursor:pointer;color:#fff;padding:4px;display:flex">
          <svg width="20" height="20" fill="#fff" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>
          </svg>
        </button>` : ''}
        <button onclick="closeStoryViewer()" style="background:rgba(255,255,255,.15);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;line-height:1">×</button>
      </div>
    </div>

    <!-- Media -->
    <div class="sv-media" id="sv-media">
      <img src="${story.media}" alt="" style="width:100%;height:100%;object-fit:contain;display:block;user-select:none;-webkit-user-drag:none" draggable="false">
    </div>

    <!-- Tap zones: prev / next -->
    <div style="position:absolute;inset:0;display:flex;top:80px;bottom:90px">
      <div style="flex:1;cursor:pointer" onclick="_prevStory()"></div>
      <div style="flex:1;cursor:pointer" onclick="_nextStory()"></div>
    </div>

    <!-- Footer: like + reply -->
    <div class="sv-footer">
      <div class="sv-reply-wrap">
        <input id="sv-reply-input" type="text" placeholder="Reply to story…" maxlength="200"
          style="flex:1;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.3);border-radius:24px;padding:9px 16px;color:#fff;font-size:14px;outline:none"
          onfocus="_pauseStoryTimer()" onblur="_resumeStoryTimer()"
          onkeydown="if(event.key==='Enter')_submitStoryReply('${story._id}')">
        <button onclick="_submitStoryReply('${story._id}')" style="background:none;border:none;cursor:pointer;padding:6px;display:flex;align-items:center">
          <svg width="22" height="22" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>
      </div>
      <button id="sv-like-btn" onclick="_toggleStoryLike('${story._id}', this)" style="background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:5px;color:#fff;flex-shrink:0">
        <svg id="sv-like-icon" width="26" height="26" fill="${liked ? '#ed4956' : 'none'}" stroke="${liked ? '#ed4956' : '#fff'}" stroke-width="1.8" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(viewer);

  // Swipe support
  _initStorySwipe(viewer);

  // Start progress bar animation for current story
  _startStoryTimer();
}

let _storyPaused = false;
let _barStart    = null;
let _barRAF      = null;
let _barElapsed  = 0;

function _startStoryTimer(resume = false) {
  const bar = document.getElementById(`sv-bar-${_viewerIdx}`);
  if (!bar) return;
  _storyPaused = false;
  _barStart = performance.now() - (resume ? _barElapsed : 0);
  if (!resume) _barElapsed = 0;

  function tick(now) {
    if (_storyPaused) return;
    _barElapsed = now - _barStart;
    const pct = Math.min(100, (_barElapsed / STORY_DURATION) * 100);
    bar.style.width = pct + '%';
    if (pct < 100) {
      _barRAF = requestAnimationFrame(tick);
    } else {
      _nextStory();
    }
  }
  _barRAF = requestAnimationFrame(tick);
}

function _pauseStoryTimer() {
  _storyPaused = true;
  cancelAnimationFrame(_barRAF);
  const pauseIcon = document.getElementById('sv-pause-icon');
  if (pauseIcon) pauseIcon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
}

function _resumeStoryTimer() {
  if (!_storyPaused) return;
  _storyPaused = false;
  const pauseIcon = document.getElementById('sv-pause-icon');
  if (pauseIcon) pauseIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  _startStoryTimer(true);
}

function _toggleStoryPause() {
  if (_storyPaused) _resumeStoryTimer(); else _pauseStoryTimer();
}

function _nextStory() {
  cancelAnimationFrame(_barRAF);
  const group = _storyFeed[_viewerGroup];
  if (!group) return closeStoryViewer();
  if (_viewerIdx + 1 < group.stories.length) {
    _viewerIdx++;
    _renderViewer();
  } else if (_viewerGroup + 1 < _storyFeed.length) {
    // Skip own group if next group is own
    _viewerGroup++;
    _viewerIdx = 0;
    _renderViewer();
  } else {
    closeStoryViewer();
  }
}

function _prevStory() {
  cancelAnimationFrame(_barRAF);
  if (_viewerIdx > 0) {
    _viewerIdx--;
    _renderViewer();
  } else if (_viewerGroup > 0) {
    _viewerGroup--;
    _viewerIdx = _storyFeed[_viewerGroup].stories.length - 1;
    _renderViewer();
  }
}

function closeStoryViewer() {
  cancelAnimationFrame(_barRAF);
  clearTimeout(_viewerTimer);
  document.getElementById('story-viewer')?.remove();
}

// ─── SWIPE GESTURES ──────────────────────────────────────────
function _initStorySwipe(el) {
  let startX = 0, startY = 0;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) _nextStory(); else _prevStory();
    } else if (dy > 80) {
      closeStoryViewer();
    }
  }, { passive: true });
}

// ─── LIKE ─────────────────────────────────────────────────────
async function _toggleStoryLike(storyId, btn) {
  try {
    const { liked } = await api.request('PUT', `/stories/${storyId}/like`, null);
    const icon = document.getElementById('sv-like-icon');
    if (icon) {
      icon.setAttribute('fill',   liked ? '#ed4956' : 'none');
      icon.setAttribute('stroke', liked ? '#ed4956' : '#fff');
    }
    // Animate heart
    if (liked) {
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => btn.style.transform = 'scale(1)', 200);
    }
  } catch (err) { showToast(err.message); }
}

// ─── REPLY ───────────────────────────────────────────────────
async function _submitStoryReply(storyId) {
  const input = document.getElementById('sv-reply-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.disabled = true;
  try {
    await api.post(`/stories/${storyId}/reply`, { text });
    showToast('💬 Reply sent!');
    _resumeStoryTimer();
  } catch (err) {
    showToast(err.message);
    input.value = text;
  } finally {
    input.disabled = false;
  }
}

// ─── DELETE (3-dot menu) ──────────────────────────────────────
function _storyMenu(storyId) {
  _pauseStoryTimer();
  const existing = document.getElementById('story-menu');
  if (existing) { existing.remove(); _resumeStoryTimer(); return; }

  const menu = document.createElement('div');
  menu.id = 'story-menu';
  menu.style.cssText = `
    position:fixed;bottom:0;left:50%;transform:translateX(-50%);
    width:100%;max-width:480px;background:rgba(30,30,30,.97);
    border-radius:20px 20px 0 0;z-index:900;padding-bottom:env(safe-area-inset-bottom);
  `;
  menu.innerHTML = `
    <div style="padding:14px 0 4px;text-align:center">
      <div style="width:40px;height:4px;background:#555;border-radius:4px;margin:0 auto 12px"></div>
    </div>
    <div onclick="_confirmDeleteStory('${storyId}')"
      style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid #333"
      onmouseover="this.style.background='#2a1a1a'" onmouseout="this.style.background='transparent'">
      <div style="width:40px;height:40px;border-radius:50%;background:#ed495620;display:flex;align-items:center;justify-content:center;font-size:20px">🗑️</div>
      <div>
        <p style="color:#ed4956;font-size:15px;font-weight:700">Delete Story</p>
        <p style="color:#888;font-size:12px">This cannot be undone</p>
      </div>
    </div>
    <div onclick="document.getElementById('story-menu').remove();_resumeStoryTimer()"
      style="display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer"
      onmouseover="this.style.background='#1e1e1e'" onmouseout="this.style.background='transparent'">
      <p style="color:#aaa;font-size:15px;font-weight:600">Cancel</p>
    </div>
  `;
  document.body.appendChild(menu);
}

async function _confirmDeleteStory(storyId) {
  document.getElementById('story-menu')?.remove();
  try {
    await api.request('DELETE', `/stories/${storyId}`, null);
    showToast('Story deleted');
    closeStoryViewer();
    loadStories();
  } catch (err) { showToast(err.message); _resumeStoryTimer(); }
}

// ─── HELPER: time left label ──────────────────────────────────
function _timeLeft(expiresAt) {
  const ms = new Date(expiresAt) - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h left`;
  return `${m}m left`;
}

// ─── KEYBOARD ESC to close viewer ────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeStoryViewer();
  if (e.key === 'ArrowRight' && document.getElementById('story-viewer')) _nextStory();
  if (e.key === 'ArrowLeft'  && document.getElementById('story-viewer')) _prevStory();
});
