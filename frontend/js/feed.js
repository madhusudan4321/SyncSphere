let uploadFile = null;
const EMOJIS = ['🌅','🌊','🏔️','🌸','🎨','🍣','🏙️','🌿','🎭','🔥','🌈','🎵'];

// Store post data by ID to safely access in menu callbacks
const postDataMap = {};

async function loadFeed() {
  const fp = document.getElementById('feed-posts');
  fp.innerHTML = '<div class="loader"><div class="spinner"></div><p style="margin-top:12px;color:var(--muted);font-size:13px">Loading feed...</p></div>';
  try {
    const posts = await api.get('/posts/feed');
    renderStories();
    fp.innerHTML = '';
    if (posts.length === 0) {
      fp.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;font-size:14px">No posts yet. Follow users or share a photo!</p>';
      return;
    }
    posts.forEach(p => fp.appendChild(buildPostCard(p)));
  } catch (err) {
    fp.innerHTML = `<p style="text-align:center;color:#ed4956;padding:30px;font-size:14px">${err.message}</p>`;
  }
}

function renderStories() {
  const sr = document.getElementById('stories-row');
  sr.innerHTML = `<div class="story-item">
    <div class="story-ring" style="background:var(--surface2);border:2px dashed var(--border)">
      <div class="story-inner">+</div></div>
    <span class="story-name">Your story</span>
  </div>`;
}

// Handle both old disk-storage URLs (/uploads/...) and new Cloudinary URLs (https://...)
function getImageUrl(image) {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  return `https://syncsphere-api.onrender.com${image}`;
}

function buildPostCard(p) {
  // Store for menu callbacks
  postDataMap[p._id] = p;

  const liked      = p.likes.includes(window.APP.user._id);
  const isOwnPost  = p.user._id === window.APP.user._id;
  const card       = document.createElement('div');
  card.className   = 'post-card';
  const imgSrc     = getImageUrl(p.image);
  const safeUsername = sanitize(p.user.username);
  const safeName     = sanitize(p.user.name || p.user.username);
  const safeCaption  = sanitize(p.caption);
  const safeTags     = (p.tags || []).map(t => `<span onclick="viewProfile('${sanitize(t.username)}')" style="color:var(--accent);cursor:pointer;font-weight:600">@${sanitize(t.username)}</span>`).join(' ');

  card.innerHTML = `
    <div class="post-header">
      <div class="post-avatar" onclick="viewProfile('${safeUsername}')"><div class="av-inner">${getInitials(safeName)}</div></div>
      <div class="post-user" onclick="viewProfile('${safeUsername}')">${safeUsername}</div>
      <svg onclick="openPostMenu('${p._id}')" width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="cursor:pointer;color:var(--muted);flex-shrink:0;padding:4px;box-sizing:content-box">
        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
      </svg>
    </div>
    <div class="post-image">${imgSrc ? `<img src="${imgSrc}" alt="">` : `<span>${p.emoji || '📷'}</span>`}</div>
    <div class="post-actions">
      <span class="${liked ? 'liked' : ''}" onclick="toggleLike('${p._id}', this)">
        <svg width="24" height="24" fill="${liked ? '#ed4956' : 'none'}" stroke="${liked ? '#ed4956' : 'currentColor'}" stroke-width="1.5" viewBox="0 0 24 24" style="cursor:pointer">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </span>
      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="cursor:pointer"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <svg onclick="sharePost('${safeUsername}')" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="cursor:pointer">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
      </svg>
      <svg class="save" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
    </div>
    <div class="post-likes" id="likes-${p._id}">${p.likes.length} like${p.likes.length !== 1 ? 's' : ''}</div>
    ${safeCaption ? `<div class="post-caption"><strong>${safeUsername}</strong> ${safeCaption}</div>` : ''}
    ${safeTags ? `<div class="post-caption" style="padding-top:0">${safeTags}</div>` : ''}
    <div class="post-time">${timeAgo(p.createdAt)}</div>
  `;
  return card;
}

// ── POST THREE-DOTS MENU ──────────────────────────────────────
function openPostMenu(postId) {
  const existing = document.getElementById('post-menu');
  if (existing) { existing.remove(); return; }

  const p = postDataMap[postId];
  if (!p) return;
  const isOwnPost   = p.user._id === window.APP.user._id;
  const safeUsername = sanitize(p.user.username);

  const menu = document.createElement('div');
  menu.id = 'post-menu';
  menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:flex-end;justify-content:center';

  const menuItem = (icon, color, label, sub, onclick) => `
    <div onclick="${onclick}" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
      <div style="width:40px;height:40px;border-radius:50%;background:${color}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px">${icon}</div>
      <div><p style="font-size:15px;font-weight:600">${label}</p><p style="font-size:12px;color:var(--muted)">${sub}</p></div>
      <svg style="margin-left:auto" width="16" height="16" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
    </div>`;

  const ownItems = isOwnPost ? `
    ${menuItem('✏️','#0095f6','Edit Caption','Change your post caption',`closePostMenuAnd(()=>openEditCaption('${postId}'))`)}
    ${menuItem('👥','#22c55e','Tag People','Tag friends in this post',`closePostMenuAnd(()=>openTagPeople('${postId}'))`)}
    ${menuItem('🗑️','#ed4956','Delete Post','This cannot be undone',`closePostMenuAnd(()=>deletePost('${postId}'))`)}
  ` : '';

  menu.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom);overflow:hidden">
      <div style="padding:16px;text-align:center;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 12px"></div>
        <p style="font-size:14px;font-weight:700">@${safeUsername}'s post</p>
      </div>
      ${ownItems}
      ${menuItem('📤','#8b5cf6','Share Post','Share with others',`closePostMenuAnd(()=>sharePost('${safeUsername}'))`)}
      <div onclick="document.getElementById('post-menu').remove()" style="display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
        <p style="font-size:15px;font-weight:600;color:var(--muted)">Cancel</p>
      </div>
    </div>
  `;

  menu.addEventListener('click', e => { if (e.target === menu) menu.remove(); });
  document.body.appendChild(menu);
}

function closePostMenuAnd(fn) {
  const menu = document.getElementById('post-menu');
  if (menu) menu.remove();
  setTimeout(() => fn(), 150);
}

// ── DELETE POST ───────────────────────────────────────────────
async function deletePost(postId) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  try {
    await api.del(`/posts/${postId}`);
    showToast('Post deleted');
    delete postDataMap[postId];
    loadFeed();
  } catch (err) { showToast(err.message); }
}

// ── EDIT CAPTION ──────────────────────────────────────────────
function openEditCaption(postId) {
  const p = postDataMap[postId];
  const existing = document.getElementById('edit-caption-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'edit-caption-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:16px;width:100%;max-width:420px;overflow:hidden">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <h3 style="font-size:16px;font-weight:700">Edit Caption</h3>
        <button onclick="document.getElementById('edit-caption-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text);line-height:1">×</button>
      </div>
      <div style="padding:16px">
        <textarea id="edit-caption-input" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;resize:none;height:100px;outline:none;font-family:var(--font);color:var(--text);background:var(--bg);line-height:1.5">${p ? p.caption || '' : ''}</textarea>
        <button onclick="saveEditCaption('${postId}')" style="width:100%;margin-top:12px;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Save Changes</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('edit-caption-input')?.focus(), 100);
}

async function saveEditCaption(postId) {
  const input = document.getElementById('edit-caption-input');
  if (!input) return;
  const caption = input.value.trim();
  const btn = input.nextElementSibling;
  btn.textContent = 'Saving...'; btn.disabled = true;
  try {
    await api.put(`/posts/${postId}`, { caption });
    document.getElementById('edit-caption-modal')?.remove();
    showToast('Caption updated!');
    loadFeed();
  } catch (err) {
    showToast(err.message);
    btn.textContent = 'Save Changes'; btn.disabled = false;
  }
}

// ── TAG PEOPLE ────────────────────────────────────────────────
let tagSelected = {}; // userId → username

function openTagPeople(postId) {
  const p = postDataMap[postId];
  tagSelected = {};
  // Pre-select existing tags
  if (p && p.tags) p.tags.forEach(t => { tagSelected[t._id] = t.username; });

  const existing = document.getElementById('tag-people-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'tag-people-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:16px;width:100%;max-width:420px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <h3 style="font-size:16px;font-weight:700">Tag People</h3>
        <button onclick="document.getElementById('tag-people-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text);line-height:1">×</button>
      </div>
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);flex-shrink:0">
        <input id="tag-search-input" type="text" placeholder="Search users to tag..." oninput="searchTagUsers(this.value)" style="width:100%;border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:14px;outline:none;background:var(--surface2);color:var(--text)">
      </div>
      <div id="tag-selected-row" style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:6px;min-height:36px;flex-shrink:0"></div>
      <div id="tag-search-results" style="overflow-y:auto;flex:1;padding:8px 0"></div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0">
        <button onclick="saveTagPeople('${postId}')" style="width:100%;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Save Tags</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  renderTagSelected();
  setTimeout(() => document.getElementById('tag-search-input')?.focus(), 100);
}

function renderTagSelected() {
  const row = document.getElementById('tag-selected-row');
  if (!row) return;
  const entries = Object.entries(tagSelected);
  row.innerHTML = entries.length === 0
    ? '<span style="font-size:12px;color:var(--muted)">No one tagged yet</span>'
    : entries.map(([id, uname]) => `
        <span style="background:var(--accent);color:#fff;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px">
          @${sanitize(uname)}
          <span onclick="removeTag('${id}')" style="cursor:pointer;font-size:14px;line-height:1">×</span>
        </span>`).join('');
}

function removeTag(userId) {
  delete tagSelected[userId];
  renderTagSelected();
  // Refresh results to uncheck
  const q = document.getElementById('tag-search-input')?.value;
  if (q) searchTagUsers(q);
}

let tagSearchTimer = null;
function searchTagUsers(q) {
  clearTimeout(tagSearchTimer);
  const res = document.getElementById('tag-search-results');
  if (!q.trim()) { res.innerHTML = ''; return; }
  tagSearchTimer = setTimeout(async () => {
    try {
      const users = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      res.innerHTML = users.map(u => {
        const isTagged  = !!tagSelected[u._id];
        const safeUname = sanitize(u.username);
        const safeName  = sanitize(u.name || '');
        return `
          <div onclick="toggleTagUser('${u._id}','${safeUname}')" style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;transition:.1s;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
            <div class="u-av"><div class="u-av-inner">${getInitials(safeName || safeUname)}</div></div>
            <div style="flex:1"><p style="font-size:14px;font-weight:600">${safeUname}</p><p style="font-size:12px;color:var(--muted)">${safeName}</p></div>
            <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${isTagged ? 'var(--accent)' : 'var(--border)'};background:${isTagged ? 'var(--accent)' : 'transparent'};display:flex;align-items:center;justify-content:center">
              ${isTagged ? '<svg width="12" height="12" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
            </div>
          </div>`;
      }).join('');
    } catch (err) {}
  }, 300);
}

function toggleTagUser(userId, username) {
  if (tagSelected[userId]) delete tagSelected[userId];
  else tagSelected[userId] = username;
  renderTagSelected();
  // Re-render checkboxes
  const q = document.getElementById('tag-search-input')?.value;
  if (q) searchTagUsers(q);
}

async function saveTagPeople(postId) {
  const tagIds = Object.keys(tagSelected);
  const btn = document.querySelector('#tag-people-modal button:last-child');
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }
  try {
    await api.put(`/posts/${postId}`, { tags: tagIds });
    document.getElementById('tag-people-modal')?.remove();
    showToast('Tags saved!');
    loadFeed();
  } catch (err) {
    showToast(err.message);
    if (btn) { btn.textContent = 'Save Tags'; btn.disabled = false; }
  }
}

// ── SHARE POST ────────────────────────────────────────────────
async function sharePost(username) {
  const url  = 'https://syncsphere-frontend.onrender.com';
  const text = `Check out @${username}'s post on SyncSphere!`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'SyncSphere', text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      showToast('📋 Link copied to clipboard!');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      await navigator.clipboard.writeText(url).catch(() => {});
      showToast('📋 Link copied!');
    }
  }
}

// ── LIKE ──────────────────────────────────────────────────────
async function toggleLike(postId, el) {
  try {
    const { liked, likesCount } = await api.post(`/posts/${postId}/like`);
    el.classList.toggle('liked', liked);
    const svg = el.querySelector('svg');
    svg.setAttribute('fill', liked ? '#ed4956' : 'none');
    svg.setAttribute('stroke', liked ? '#ed4956' : 'currentColor');
    document.getElementById('likes-' + postId).textContent = likesCount + ' like' + (likesCount !== 1 ? 's' : '');
  } catch (err) { showToast(err.message); }
}

// ── UPLOAD ────────────────────────────────────────────────────
function openUpload() { document.getElementById('upload-modal').classList.add('open'); }
function closeUpload() {
  document.getElementById('upload-modal').classList.remove('open');
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-drop').style.display = 'block';
  document.getElementById('upload-caption').value = '';
  uploadFile = null;
}
function previewImage(input) {
  uploadFile = input.files[0];
  if (!uploadFile) return;
  const reader = new FileReader();
  reader.onload = e => {
    const prev = document.getElementById('upload-preview');
    prev.src = e.target.result;
    prev.style.display = 'block';
    document.getElementById('upload-drop').style.display = 'none';
  };
  reader.readAsDataURL(uploadFile);
}
async function submitPost() {
  const caption = document.getElementById('upload-caption').value.trim();
  const form = new FormData();
  if (uploadFile) form.append('image', uploadFile);
  form.append('caption', caption);
  form.append('emoji', EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
  try {
    await api.upload('/posts', form);
    closeUpload();
    loadFeed();
    showToast('Post shared!');
  } catch (err) { showToast(err.message); }
}

document.getElementById('upload-modal').addEventListener('click', function(e) { if (e.target === this) closeUpload(); });