let uploadFile = null;
const EMOJIS = ['🌅','🌊','🏔️','🌸','🎨','🍣','🏙️','🌿','🎭','🔥','🌈','🎵'];
const postDataMap = {};
let feedPage = 1, feedLoading = false, feedHasMore = true;

const FEED_CACHE_KEY     = 'ss_feed_cache';
const FEED_CACHE_TS_KEY  = 'ss_feed_cache_ts';  // timestamp of when cache was written
const FEED_CACHE_TTL_MS  = 5 * 60 * 1000;       // 5 minutes — after this, skip cache and load fresh

// Helper: surgically remove a ghost post from DOM + localStorage
function _removeStalePost(postId) {
  delete postDataMap[postId];
  const likeEl = document.getElementById('likes-' + postId);
  likeEl?.closest('.post-card')?.remove();
  try {
    const cached = JSON.parse(localStorage.getItem(FEED_CACHE_KEY) || '[]');
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cached.filter(p => p._id !== postId)));
  } catch(e) { localStorage.removeItem(FEED_CACHE_KEY); }
}

function buildSkeletonCards(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="post-card" style="pointer-events:none">
      <div class="post-header">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--surface2);animation:ss-pulse 1.4s ease-in-out infinite"></div>
        <div style="width:110px;height:12px;border-radius:6px;background:var(--surface2);animation:ss-pulse 1.4s ease-in-out infinite;margin-left:2px"></div>
      </div>
      <div style="width:100%;aspect-ratio:1;background:var(--surface2);animation:ss-pulse 1.4s ease-in-out infinite"></div>
      <div style="padding:10px 14px;display:flex;flex-direction:column;gap:8px">
        <div style="width:80px;height:11px;border-radius:6px;background:var(--surface2);animation:ss-pulse 1.4s ease-in-out infinite"></div>
        <div style="width:60%;height:11px;border-radius:6px;background:var(--surface2);animation:ss-pulse 1.4s ease-in-out infinite"></div>
      </div>
    </div>`).join('');
}

async function loadFeed(reset = true) {
  const fp = document.getElementById('feed-posts');
  if (reset) {
    feedPage = 1; feedHasMore = true; feedLoading = false;

    // ── Show cached posts immediately (stale-while-revalidate) ──
    // Skip cache if it's older than TTL — go straight to fresh load
    const cacheTs = parseInt(localStorage.getItem(FEED_CACHE_TS_KEY) || '0');
    const cacheAge = Date.now() - cacheTs;
    const cached = cacheAge < FEED_CACHE_TTL_MS ? localStorage.getItem(FEED_CACHE_KEY) : null;
    if (cached) {
      try {
        const cachedPosts = JSON.parse(cached);
        if (cachedPosts.length > 0) {
          fp.innerHTML = '';
          cachedPosts.forEach(p => { postDataMap[p._id] = p; fp.appendChild(buildPostCard(p)); });
          loadStories();
          // Silently fetch fresh data in background without spinner
          _refreshFeedSilently();
          return;
        }
      } catch(e) { /* corrupt cache, fall through to normal load */ }
    }

    // No cache — show skeleton while loading
    fp.innerHTML = buildSkeletonCards(4);
    loadStories();
  }
  if (!feedHasMore || feedLoading) return;
  feedLoading = true;
  try {
    const result = await api.get(`/posts/feed?page=${feedPage}&limit=10`);
    const posts   = Array.isArray(result.posts) ? result.posts : [];
    const hasMore = result.hasMore || false;
    if (reset) fp.innerHTML = '';
    if (feedPage === 1 && posts.length === 0) {
      fp.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;font-size:14px">No posts yet. Follow users or share a photo!</p>';
      localStorage.removeItem(FEED_CACHE_KEY);
      feedLoading = false; return;
    }
    if (feedPage === 1) {
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(posts.slice(0, 10)));
      localStorage.setItem(FEED_CACHE_TS_KEY, String(Date.now()));
    }
    posts.forEach(p => { postDataMap[p._id] = p; fp.appendChild(buildPostCard(p)); });
    feedPage++; feedHasMore = hasMore;
    setupFeedSentinel();
  } catch (err) {
    if (reset) fp.innerHTML = `<p style="text-align:center;color:#ed4956;padding:30px;font-size:14px">${sanitize(err.message)}</p>`;
  }
  feedLoading = false;
}

async function _refreshFeedSilently() {
  try {
    const result = await api.get('/posts/feed?page=1&limit=10');
    const posts = Array.isArray(result.posts) ? result.posts : [];
    if (posts.length === 0) return;

    // Update cache with fresh data + timestamp
    localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(posts));
    localStorage.setItem(FEED_CACHE_TS_KEY, String(Date.now()));

    // Build a Set of valid post IDs from server
    const freshIds = new Set(posts.map(p => p._id));

    // Always remove ghost cards from the DOM, even if user is on another tab
    // This ensures deleted posts are gone when user returns to home
    Object.keys(postDataMap).forEach(id => {
      if (!freshIds.has(id)) {
        // This post no longer exists on server — remove it silently
        _removeStalePost(id);
      }
    });

    // If user is on home tab, do a full clean re-render
    const homeTab = document.getElementById('tab-home');
    if (!homeTab || !homeTab.classList.contains('active')) return;
    const fp = document.getElementById('feed-posts');
    fp.innerHTML = '';
    feedPage = 1; feedHasMore = result.hasMore || false; feedLoading = false;
    posts.forEach(p => { postDataMap[p._id] = p; fp.appendChild(buildPostCard(p)); });
    feedPage = 2;
    setupFeedSentinel();
  } catch(e) { /* silent fail — user already sees cached data */ }
}

function setupFeedSentinel() {
  document.getElementById('feed-sentinel')?.remove();
  if (!feedHasMore) return;
  const fp = document.getElementById('feed-posts');
  const sentinel = document.createElement('div');
  sentinel.id = 'feed-sentinel';
  sentinel.innerHTML = '<div class="loader" style="padding:20px"><div class="spinner"></div></div>';
  fp.appendChild(sentinel);
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting && !feedLoading && feedHasMore) { obs.disconnect(); loadFeed(false); }
  }, { threshold: 0.1 }).observe(sentinel);
}

// renderStories() is handled by stories.js — loadStories() fetches real data from API

function getImageUrl(image) {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `https://syncsphere-api.onrender.com${image}`;
}

function buildPostCard(p) {
  postDataMap[p._id] = p;
  const liked = p.likes.includes(window.APP.user._id);
  const card  = document.createElement('div');
  card.className = 'post-card';
  const imgSrc      = getImageUrl(p.image);
  const safeU       = sanitize(p.user.username);
  const safeN       = sanitize(p.user.name || p.user.username);
  const safeCaption = sanitize(p.caption);
  const safeTags    = (p.tags||[]).map(t=>`<span onclick="viewProfile('${sanitize(t.username)}')" style="color:var(--accent);cursor:pointer;font-weight:600">@${sanitize(t.username)}</span>`).join(' ');
  const commentCount = p.commentCount || 0;
  card.innerHTML = `
    <div class="post-header">
      <div class="post-avatar" onclick="viewProfile('${safeU}')">${avatarInner(p.user, 12)}</div>
      <div class="post-user" onclick="viewProfile('${safeU}')">${safeU}</div>
      <svg onclick="openPostMenu('${p._id}')" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="cursor:pointer;color:var(--muted);flex-shrink:0;padding:4px;box-sizing:content-box"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
    </div>
    <div class="post-image">${imgSrc?`<img src="${imgSrc}" alt="">` : `<span>${p.emoji||'📷'}</span>`}</div>
    <div class="post-actions">
      <span class="${liked?'liked':''}" onclick="toggleLike('${p._id}',this)">
        <svg width="24" height="24" fill="${liked?'#ed4956':'none'}" stroke="${liked?'#ed4956':'currentColor'}" stroke-width="1.5" viewBox="0 0 24 24" style="cursor:pointer"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </span>
      <span onclick="openComments('${p._id}')" style="cursor:pointer;display:flex;align-items:center;gap:4px">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        ${commentCount > 0 ? `<span id="cc-${p._id}" style="font-size:13px;font-weight:600">${commentCount}</span>` : `<span id="cc-${p._id}" style="font-size:13px;font-weight:600"></span>`}
      </span>
      <svg onclick="sharePost('${safeU}')" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="cursor:pointer"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
      <svg class="save" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
    </div>
    <div class="post-likes" id="likes-${p._id}">${p.likes.length} like${p.likes.length!==1?'s':''}</div>
    ${safeCaption?`<div class="post-caption"><strong>${safeU}</strong> ${safeCaption}</div>`:''}
    ${safeTags?`<div class="post-caption" style="padding-top:0">${safeTags}</div>`:''}
    <div class="post-time">${timeAgo(p.createdAt)}</div>`;
  return card;
}

// ── Post three-dots menu ──────────────────────────────────────
function openPostMenu(postId) {
  const existing = document.getElementById('post-menu');
  if (existing) { existing.remove(); return; }
  const p = postDataMap[postId]; if (!p) return;
  const isOwn = p.user._id === window.APP.user._id;
  const safeU = sanitize(p.user.username);
  const svgIcon = (paths, color) =>
    `<div style="width:40px;height:40px;border-radius:50%;background:${color}15;display:flex;align-items:center;justify-content:center">
      <svg width="18" height="18" fill="none" stroke="${color}" stroke-width="2" viewBox="0 0 24 24">${paths}</svg>
    </div>`;
  const item = (svgPaths, color, label, sub, fn) =>
    `<div onclick="${fn}" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
      ${svgIcon(svgPaths, color)}
      <div><p style="font-size:15px;font-weight:600">${label}</p><p style="font-size:12px;color:var(--muted)">${sub}</p></div>
    </div>`;
  const menu = document.createElement('div');
  menu.id = 'post-menu';
  menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:flex-end;justify-content:center';
  menu.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:20px 20px 0 0;overflow:hidden;padding-bottom:env(safe-area-inset-bottom)">
      <div style="padding:16px;text-align:center;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 12px"></div>
        <p style="font-size:14px;font-weight:700">@${safeU}'s post</p>
      </div>
      ${isOwn ? item('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>','#0095f6','Edit Caption','Change your post caption',`closePostMenuAnd(()=>openEditCaption('${postId}'))`) : ''}
      ${isOwn ? item('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>','#22c55e','Tag People','Tag friends in this post',`closePostMenuAnd(()=>openTagPeople('${postId}'))`) : ''}
      ${isOwn ? item('<polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>','#ed4956','Delete Post','This cannot be undone',`closePostMenuAnd(()=>deletePost('${postId}'))`) : ''}
      ${item('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>','#8b5cf6','Share Post','Share with others',`closePostMenuAnd(()=>sharePost('${safeU}'))`)}
      <div onclick="document.getElementById('post-menu').remove()" style="display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'"><p style="font-size:15px;font-weight:600;color:var(--muted)">Cancel</p></div>
    </div>`;
  menu.addEventListener('click', e => { if (e.target === menu) menu.remove(); });
  document.body.appendChild(menu);
}

function closePostMenuAnd(fn) {
  document.getElementById('post-menu')?.remove();
  setTimeout(() => fn(), 150);
}

async function deletePost(postId) {
  showDeletePostModal(postId);
}

function showDeletePostModal(postId) {
  document.getElementById('delete-post-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'delete-post-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:400;display:flex;align-items:flex-end;justify-content:center;animation:fadeInOverlay .2s ease';
  modal.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:24px 24px 0 0;overflow:hidden;padding-bottom:env(safe-area-inset-bottom);animation:slideUpSheet .25s cubic-bezier(.32,1,.26,1)">
      <div style="padding:8px 0 4px;display:flex;justify-content:center">
        <div style="width:36px;height:4px;background:var(--border);border-radius:4px"></div>
      </div>
      <div style="padding:20px 24px 8px;text-align:center">
        <div style="width:56px;height:56px;border-radius:50%;background:#ed495615;border:2px solid #ed495630;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
          <svg width="24" height="24" fill="none" stroke="#ed4956" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </div>
        <h3 style="font-size:18px;font-weight:700;margin-bottom:8px">Delete Post?</h3>
        <p style="font-size:13px;color:var(--muted);line-height:1.5">This will permanently remove your post and all its comments. This action cannot be undone.</p>
      </div>
      <div style="padding:16px 24px 20px;display:flex;flex-direction:column;gap:10px">
        <button id="confirm-delete-post-btn" onclick="_execDeletePost('${postId}')" style="width:100%;padding:14px;background:linear-gradient(135deg,#ff6b6b,#ed4956);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 15px #ed495640;transition:transform .1s,box-shadow .1s" onmousedown="this.style.transform='scale(.98)'" onmouseup="this.style.transform='scale(1)'">
          Delete Post
        </button>
        <button onclick="document.getElementById('delete-post-modal').remove()" style="width:100%;padding:13px;background:var(--surface2);color:var(--text);border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;transition:.15s" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='var(--surface2)'">
          Cancel
        </button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function _execDeletePost(postId) {
  const btn = document.getElementById('confirm-delete-post-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }
  try {
    await api.del(`/posts/${postId}`);
    document.getElementById('delete-post-modal')?.remove();
    showToast('Post deleted');
    // Surgically remove the card from DOM instead of full reload
    delete postDataMap[postId];
    // Invalidate localStorage cache (filter out deleted post)
    try {
      const cached = JSON.parse(localStorage.getItem(FEED_CACHE_KEY) || '[]');
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cached.filter(p => p._id !== postId)));
    } catch(e) { localStorage.removeItem(FEED_CACHE_KEY); }
    // Find and remove the post card from the live DOM
    const fp = document.getElementById('feed-posts');
    if (fp) {
      // Find any post card that contains a like element with this postId
      const likeEl = document.getElementById('likes-' + postId);
      const card = likeEl?.closest('.post-card');
      if (card) card.remove();
      else loadFeed(); // fallback: reload if card ref not found
    }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Delete Post'; }
    showToast(err.message);
  }
}

function openEditCaption(postId) {
  const p = postDataMap[postId];
  document.getElementById('edit-caption-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'edit-caption-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `<div style="background:var(--surface);border-radius:16px;width:100%;max-width:420px;overflow:hidden">
    <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between"><h3 style="font-size:16px;font-weight:700">Edit Caption</h3><button onclick="document.getElementById('edit-caption-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text)">×</button></div>
    <div style="padding:16px"><textarea id="edit-caption-input" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;resize:none;height:100px;outline:none;font-family:var(--font);color:var(--text);background:var(--bg)">${p?p.caption||'':''}</textarea>
    <button onclick="saveEditCaption('${postId}')" style="width:100%;margin-top:12px;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Save Changes</button></div></div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('edit-caption-input')?.focus(), 100);
}

async function saveEditCaption(postId) {
  const caption = document.getElementById('edit-caption-input')?.value.trim();
  try {
    await api.put(`/posts/${postId}`, { caption });
    document.getElementById('edit-caption-modal')?.remove();
    showToast('Caption updated!'); loadFeed();
  } catch (err) { showToast(err.message); }
}

let tagSelected = {};
function openTagPeople(postId) {
  const p = postDataMap[postId]; tagSelected = {};
  if (p?.tags) p.tags.forEach(t => { tagSelected[t._id] = t.username; });
  document.getElementById('tag-people-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'tag-people-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `<div style="background:var(--surface);border-radius:16px;width:100%;max-width:420px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
    <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0"><h3 style="font-size:16px;font-weight:700">Tag People</h3><button onclick="document.getElementById('tag-people-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text)">×</button></div>
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);flex-shrink:0"><input id="tag-search-input" type="text" placeholder="Search users..." oninput="searchTagUsers(this.value)" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:14px;outline:none;background:var(--surface2);color:var(--text)"></div>
    <div id="tag-selected-row" style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:6px;min-height:36px;flex-shrink:0"></div>
    <div id="tag-search-results" style="overflow-y:auto;flex:1"></div>
    <div style="padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0"><button onclick="saveTagPeople('${postId}')" style="width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Save Tags</button></div>
  </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  renderTagSelected();
}

function renderTagSelected() {
  const row = document.getElementById('tag-selected-row'); if (!row) return;
  const entries = Object.entries(tagSelected);
  row.innerHTML = entries.length === 0 ? '<span style="font-size:12px;color:var(--muted)">No one tagged yet</span>'
    : entries.map(([id,u]) => `<span style="background:var(--accent);color:#fff;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px">@${sanitize(u)}<span onclick="removeTag('${id}')" style="cursor:pointer">×</span></span>`).join('');
}

function removeTag(id) { delete tagSelected[id]; renderTagSelected(); }

let tagTimer = null;
function searchTagUsers(q) {
  clearTimeout(tagTimer);
  const res = document.getElementById('tag-search-results');
  if (!q.trim()) { res.innerHTML = ''; return; }
  tagTimer = setTimeout(async () => {
    const users = await api.get(`/users/search?q=${encodeURIComponent(q)}`).catch(() => []);
    res.innerHTML = users.map(u => {
      const su = sanitize(u.username), sn = sanitize(u.name||'');
      const checked = !!tagSelected[u._id];
      return `<div onclick="toggleTagUser('${u._id}','${su}')" style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
        <div class="u-av"><div class="u-av-inner">${getInitials(sn||su)}</div></div>
        <div style="flex:1"><p style="font-size:14px;font-weight:600">${su}</p><p style="font-size:12px;color:var(--muted)">${sn}</p></div>
        <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${checked?'var(--accent)':'var(--border)'};background:${checked?'var(--accent)':'transparent'};display:flex;align-items:center;justify-content:center">${checked?'<svg width="12" height="12" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>':''}</div>
      </div>`;
    }).join('');
  }, 300);
}

function toggleTagUser(id, u) {
  if (tagSelected[id]) delete tagSelected[id]; else tagSelected[id] = u;
  renderTagSelected(); searchTagUsers(document.getElementById('tag-search-input')?.value||'');
}

async function saveTagPeople(postId) {
  try {
    await api.put(`/posts/${postId}`, { tags: Object.keys(tagSelected) });
    document.getElementById('tag-people-modal')?.remove();
    showToast('Tags saved!'); loadFeed();
  } catch (err) { showToast(err.message); }
}

async function sharePost(username) {
  const url = 'https://syncsphere-frontend.onrender.com';
  try {
    if (navigator.share) await navigator.share({ title:'SyncSphere', text:`Check out @${username} on SyncSphere!`, url });
    else { await navigator.clipboard.writeText(`${url}`); showToast('Link copied!'); }
  } catch (err) { if (err.name !== 'AbortError') showToast('Link copied!'); }
}

async function toggleLike(postId, el) {
  try {
    const { liked, likesCount } = await api.post(`/posts/${postId}/like`);
    el.classList.toggle('liked', liked);
    const svg = el.querySelector('svg');
    svg.setAttribute('fill', liked ? '#ed4956' : 'none');
    svg.setAttribute('stroke', liked ? '#ed4956' : 'currentColor');
    document.getElementById('likes-' + postId).textContent = likesCount + ' like' + (likesCount !== 1 ? 's' : '');
  } catch (err) {
    if (err.message === 'Post not found') {
      // Ghost post — remove it from DOM and cache silently
      _removeStalePost(postId);
      showToast('This post is no longer available');
    } else {
      showToast(err.message);
    }
  }
}

function openUpload() { document.getElementById('upload-modal').classList.add('open'); }
function closeUpload() {
  document.getElementById('upload-modal').classList.remove('open');
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-drop').style.display = 'block';
  document.getElementById('upload-caption').value = '';
  uploadFile = null;
}
function previewImage(input) {
  uploadFile = input.files[0]; if (!uploadFile) return;
  const reader = new FileReader();
  reader.onload = e => { const p = document.getElementById('upload-preview'); p.src = e.target.result; p.style.display = 'block'; document.getElementById('upload-drop').style.display = 'none'; };
  reader.readAsDataURL(uploadFile);
}
async function submitPost() {
  const caption = document.getElementById('upload-caption').value.trim();
  const form = new FormData();
  if (uploadFile) form.append('image', uploadFile);
  form.append('caption', caption);
  form.append('emoji', EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  try { await api.upload('/posts', form); closeUpload(); loadFeed(); showToast('Post shared!'); }
  catch (err) { showToast(err.message); }
}

document.getElementById('upload-modal').addEventListener('click', function(e) { if (e.target === this) closeUpload(); });