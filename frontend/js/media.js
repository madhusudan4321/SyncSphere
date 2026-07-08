// ── media.js — Media Sharing Engine ──────────────────────────────────────────

const MEDIA_API = 'https://syncsphere-api.onrender.com/api/media';

const ACCEPT_TYPES = [
  'image/*','video/*','audio/*',
  '.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx',
  '.zip','.rar','.7z','.txt','.csv','.md'
].join(',');

const FILE_ICONS = {
  image:'🖼️', video:'🎬', audio:'🎵',
  document:'📄', archive:'🗜️', text:'📝', other:'📎'
};

const FILE_COLORS = {
  image:'#0095f6', video:'#9b59b6', audio:'#e74c3c',
  document:'#e67e22', archive:'#2ecc71', text:'#3498db', other:'#95a5a6'
};

// Active XHR map for cancel support
const _uploads = new Map();

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}

function getFileCategory(mimeType, name) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/'))  return 'text';
  if (/pdf|word|powerpoint|excel|spreadsheet|presentation/.test(mimeType)) return 'document';
  if (/zip|rar|7z|tar|gzip/.test(mimeType)) return 'archive';
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','bmp','svg'].includes(ext)) return 'image';
  if (['mp4','webm','mov','avi','mkv'].includes(ext)) return 'video';
  if (['mp3','ogg','wav','aac','flac'].includes(ext)) return 'audio';
  if (['pdf','doc','docx','ppt','pptx','xls','xlsx'].includes(ext)) return 'document';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
  if (['txt','csv','md'].includes(ext)) return 'text';
  return 'other';
}

// ── Upload Manager ────────────────────────────────────────────────────────────

const UploadManager = {
  init() {
    // Hidden file input
    let inp = document.getElementById('media-file-input');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'media-file-input';
      inp.multiple = true; inp.accept = ACCEPT_TYPES;
      inp.style.display = 'none';
      document.body.appendChild(inp);
    }
    inp.onchange = (e) => this.handleFiles(Array.from(e.target.files));

    // Drag & drop on chat messages area
    const msgArea = document.getElementById('chat-messages');
    if (msgArea) {
      msgArea.addEventListener('dragover', e => { e.preventDefault(); msgArea.classList.add('drag-over'); });
      msgArea.addEventListener('dragleave', () => msgArea.classList.remove('drag-over'));
      msgArea.addEventListener('drop', e => {
        e.preventDefault(); msgArea.classList.remove('drag-over');
        this.handleFiles(Array.from(e.dataTransfer.files));
      });
    }
  },

  open() { document.getElementById('media-file-input')?.click(); },

  handleFiles(files) {
    if (!files.length) return;
    if (!chatPartnerId) { showToast('Open a chat first'); return; }
    files.forEach(f => this.uploadFile(f));
  },

  uploadFile(file) {
    const MAX = file.type.startsWith('image/') ? 20*1024*1024 : 100*1024*1024;
    if (file.size > MAX) {
      showToast(`${file.name} is too large (max ${fmtSize(MAX)})`);
      return;
    }

    const uid    = 'up_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    const cat    = getFileCategory(file.type, file.name);
    const token  = localStorage.getItem('pic_token');

    // Append a progress bubble into the chat
    const bubble = _buildUploadBubble(uid, file.name, file.size, cat);
    const msgs   = document.getElementById('chat-messages');
    if (msgs) { msgs.appendChild(bubble); msgs.scrollTop = msgs.scrollHeight; }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('receiverId', chatPartnerId);

    const xhr = new XMLHttpRequest();
    _uploads.set(uid, xhr);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded/e.total)*100);
      const bar = document.getElementById(`up-bar-${uid}`);
      const pctEl = document.getElementById(`up-pct-${uid}`);
      if (bar)   bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
    };

    xhr.onload = async () => {
      _uploads.delete(uid);
      bubble.remove();
      if (xhr.status === 201) {
        const { message } = JSON.parse(xhr.responseText);
        // Append message into chat UI
        if (typeof appendMessage === 'function') appendMessage(message, true);
        // Notify receiver via socket
        if (typeof socket !== 'undefined' && socket?.connected) {
          socket.emit('media:message', { to: chatPartnerId, message });
        }
      } else {
        let msg = 'Upload failed';
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch {}
        showToast(msg);
      }
    };

    xhr.onerror = () => {
      _uploads.delete(uid);
      const retryBtn = document.getElementById(`up-retry-${uid}`);
      const statusEl = document.getElementById(`up-status-${uid}`);
      if (statusEl) statusEl.textContent = 'Failed';
      if (retryBtn) { retryBtn.style.display = 'inline-flex'; retryBtn.onclick = () => { bubble.remove(); this.uploadFile(file); }; }
    };

    xhr.open('POST', MEDIA_API + '/upload');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.send(fd);
  },

  cancel(uid) {
    const xhr = _uploads.get(uid);
    if (xhr) { xhr.abort(); _uploads.delete(uid); }
    document.getElementById('upload-bubble-' + uid)?.remove();
  },
};

function _buildUploadBubble(uid, name, size, cat) {
  const div = document.createElement('div');
  div.id = 'upload-bubble-' + uid;
  div.className = 'msg-row mine';
  div.innerHTML = `
    <div class="msg-bubble-wrap">
      <div class="media-upload-bubble">
        <div class="media-upload-icon" style="color:${FILE_COLORS[cat]}">${FILE_ICONS[cat]}</div>
        <div class="media-upload-info">
          <div class="media-upload-name">${sanitize(name)}</div>
          <div class="media-upload-size">${fmtSize(size)}</div>
          <div class="media-upload-bar-wrap">
            <div class="media-upload-bar" id="up-bar-${uid}"></div>
          </div>
          <div class="media-upload-footer">
            <span id="up-status-${uid}" style="color:var(--muted);font-size:11px">Uploading...</span>
            <span id="up-pct-${uid}" style="font-size:11px;color:var(--muted)">0%</span>
            <button id="up-retry-${uid}" class="media-retry-btn" style="display:none">↺ Retry</button>
            <button onclick="UploadManager.cancel('${uid}')" class="media-cancel-btn">✕</button>
          </div>
        </div>
      </div>
    </div>`;
  return div;
}

// ── Media Message Renderer ────────────────────────────────────────────────────

function renderMediaBubble(media) {
  if (!media) return `<div class="media-bubble-generic"><span>${FILE_ICONS.other}</span><span>File</span></div>`;
  const { fileType, originalFileName, fileSize, storageUrl, thumbnailUrl, _id } = media;
  const name = sanitize(originalFileName || 'File');
  const size = fmtSize(fileSize || 0);

  if (fileType === 'image') {
    const thumb = thumbnailUrl || storageUrl;
    return `<div class="media-bubble-image" onclick="MediaViewer.openImage('${_id}','${storageUrl}','${name}')">
      <img src="${thumb}" alt="${name}" class="media-thumb" loading="lazy">
      <div class="media-overlay"><span class="media-dl-btn" onclick="event.stopPropagation();downloadMedia('${_id}','${name}')">⬇</span></div>
    </div>`;
  }

  if (fileType === 'video') {
    const thumb = thumbnailUrl;
    return `<div class="media-bubble-video" onclick="MediaViewer.openVideo('${_id}','${storageUrl}','${name}')">
      ${thumb ? `<img src="${thumb}" class="media-thumb" loading="lazy">` : `<div class="media-video-placeholder">🎬</div>`}
      <div class="media-play-btn">▶</div>
      <div class="media-overlay"><span class="media-dl-btn" onclick="event.stopPropagation();downloadMedia('${_id}','${name}')">⬇</span></div>
    </div>`;
  }

  if (fileType === 'audio') {
    return `<div class="media-bubble-audio">
      <div class="media-audio-icon">🎵</div>
      <div class="media-audio-info">
        <div class="media-file-name">${name}</div>
        <audio controls style="width:180px;height:32px;margin-top:6px"><source src="${storageUrl}"></audio>
      </div>
      <button class="media-dl-icon-btn" onclick="downloadMedia('${_id}','${name}')" title="Download">⬇</button>
    </div>`;
  }

  // Document / archive / text / other
  const color = FILE_COLORS[fileType] || '#95a5a6';
  const icon  = FILE_ICONS[fileType]  || FILE_ICONS.other;
  return `<div class="media-bubble-file">
    <div class="media-file-icon" style="background:${color}20;color:${color}">${icon}</div>
    <div class="media-file-info">
      <div class="media-file-name">${name}</div>
      <div class="media-file-size">${size}</div>
    </div>
    <button class="media-dl-icon-btn" onclick="downloadMedia('${_id}','${name}')" title="Download">⬇</button>
  </div>`;
}

// ── Media Viewer (Lightbox) ───────────────────────────────────────────────────

const MediaViewer = {
  _images: [], _idx: 0, _zoom: 1,

  openImage(mediaId, url, name) {
    this._zoom = 1;
    const overlay = document.getElementById('media-viewer-overlay');
    const img = document.getElementById('mv-image');
    const vid = document.getElementById('mv-video');
    const dlBtn = document.getElementById('mv-dl-btn');

    document.getElementById('mv-title').textContent = name;
    img.src = url; img.style.transform = 'scale(1)';
    img.style.display = 'block'; vid.style.display = 'none';
    dlBtn.onclick = () => downloadMedia(mediaId, name);
    overlay.classList.add('open');
    document.getElementById('mv-nav-prev').style.display = 'none';
    document.getElementById('mv-nav-next').style.display = 'none';
  },

  openImages(images, startIdx = 0) {
    this._images = images; this._idx = startIdx;
    const cur = images[startIdx];
    this.openImage(cur.mediaId, cur.url, cur.name);
    document.getElementById('mv-nav-prev').style.display = images.length > 1 ? 'flex' : 'none';
    document.getElementById('mv-nav-next').style.display = images.length > 1 ? 'flex' : 'none';
  },

  openVideo(mediaId, url, name) {
    const overlay = document.getElementById('media-viewer-overlay');
    const img = document.getElementById('mv-image');
    const vid = document.getElementById('mv-video');
    const dlBtn = document.getElementById('mv-dl-btn');
    document.getElementById('mv-title').textContent = name;
    vid.src = url;
    img.style.display = 'none'; vid.style.display = 'block';
    dlBtn.onclick = () => downloadMedia(mediaId, name);
    overlay.classList.add('open');
    document.getElementById('mv-nav-prev').style.display = 'none';
    document.getElementById('mv-nav-next').style.display = 'none';
  },

  close() {
    const overlay = document.getElementById('media-viewer-overlay');
    overlay?.classList.remove('open');
    const vid = document.getElementById('mv-video');
    if (vid) { vid.pause(); vid.src = ''; }
    this._zoom = 1;
    const img = document.getElementById('mv-image');
    if (img) img.style.transform = 'scale(1)';
  },

  zoom(dir) {
    this._zoom = Math.min(4, Math.max(0.5, this._zoom + dir * 0.25));
    const img = document.getElementById('mv-image');
    if (img) img.style.transform = `scale(${this._zoom})`;
  },

  prev() {
    if (!this._images.length) return;
    this._idx = (this._idx - 1 + this._images.length) % this._images.length;
    const cur = this._images[this._idx];
    this.openImage(cur.mediaId, cur.url, cur.name);
    document.getElementById('mv-nav-prev').style.display = 'flex';
    document.getElementById('mv-nav-next').style.display = 'flex';
  },

  next() {
    if (!this._images.length) return;
    this._idx = (this._idx + 1) % this._images.length;
    const cur = this._images[this._idx];
    this.openImage(cur.mediaId, cur.url, cur.name);
    document.getElementById('mv-nav-prev').style.display = 'flex';
    document.getElementById('mv-nav-next').style.display = 'flex';
  },
};

// ── Download ──────────────────────────────────────────────────────────────────

async function downloadMedia(mediaId, filename) {
  showToast('Preparing download...');
  try {
    const token = localStorage.getItem('pic_token');
    const res   = await fetch(`${MEDIA_API}/download/${mediaId}`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  } catch (err) { showToast('Download failed: ' + err.message); }
}

// ── Shared Media Panel ────────────────────────────────────────────────────────

async function openSharedMedia(partnerIdArg, partnerNameArg) {
  const pid  = partnerIdArg  || chatPartnerId;
  const name = partnerNameArg || chatPartnerName || 'Chat';
  if (!pid) return;

  const me     = window.APP?.user?._id;
  const chatId = [me, pid].sort().join('_');

  document.getElementById('shared-media-panel')?.remove();
  const panel = document.createElement('div');
  panel.id = 'shared-media-panel';
  panel.className = 'shared-media-panel';
  panel.innerHTML = `
    <div class="smp-header">
      <button class="back-btn" onclick="document.getElementById('shared-media-panel').remove()">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg>
      </button>
      <h2 class="smp-title">Shared Media</h2>
    </div>
    <div class="smp-toolbar">
      <input id="smp-search" class="smp-search" placeholder="Search files..." oninput="smpSearch(this.value,'${chatId}')">
      <select id="smp-filter" class="smp-filter" onchange="smpLoad('${chatId}')">
        <option value="all">All</option>
        <option value="image">Images</option>
        <option value="video">Videos</option>
        <option value="audio">Audio</option>
        <option value="document">Documents</option>
        <option value="archive">Archives</option>
        <option value="text">Text</option>
      </select>
      <select id="smp-sort" class="smp-filter" onchange="smpLoad('${chatId}')">
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
      </select>
    </div>
    <div id="smp-body" class="smp-body"><div class="loader"><div class="spinner"></div></div></div>
    <div id="smp-pagination" class="smp-pagination"></div>`;
  const mount = document.getElementById('media-mount') || document.body;
  mount.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('open'));
  await smpLoad(chatId);
}

window._smpPage = 1;

async function smpLoad(chatId, page) {
  page = page || 1;
  window._smpPage = page;
  const fileType = document.getElementById('smp-filter')?.value || 'all';
  const sort     = document.getElementById('smp-sort')?.value   || 'newest';
  const q        = document.getElementById('smp-search')?.value || '';
  const body     = document.getElementById('smp-body');
  if (!body) return;
  if (page === 1) body.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
  try {
    const token  = localStorage.getItem('pic_token');
    const url    = `${MEDIA_API}/chat/${chatId}?fileType=${fileType}&sort=${sort}&page=${page}&q=${encodeURIComponent(q)}`;
    const res    = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const data   = await res.json();
    if (!data.items?.length) {
      body.innerHTML = `<div class="smp-empty"><p>No files shared yet</p></div>`;
      document.getElementById('smp-pagination').innerHTML = '';
      return;
    }

    // Group by fileType
    const groups = {};
    data.items.forEach(m => {
      if (!groups[m.fileType]) groups[m.fileType] = [];
      groups[m.fileType].push(m);
    });

    body.innerHTML = Object.entries(groups).map(([type, items]) => `
      <div class="smp-section">
        <h3 class="smp-section-title">${FILE_ICONS[type]} ${type.charAt(0).toUpperCase()+type.slice(1)}s</h3>
        <div class="smp-grid ${type === 'image' || type === 'video' ? 'smp-grid-media' : 'smp-grid-files'}">
          ${items.map(m => smpCard(m)).join('')}
        </div>
      </div>`).join('');

    // Pagination
    const pg = document.getElementById('smp-pagination');
    if (data.pages > 1) {
      pg.innerHTML = `
        <button class="smp-page-btn" ${page <= 1 ? 'disabled' : ''} onclick="smpLoad('${chatId}',${page-1})">← Prev</button>
        <span style="font-size:13px;color:var(--muted)">${page} / ${data.pages}</span>
        <button class="smp-page-btn" ${page >= data.pages ? 'disabled' : ''} onclick="smpLoad('${chatId}',${page+1})">Next →</button>`;
    } else { pg.innerHTML = ''; }
  } catch (err) {
    body.innerHTML = `<p style="color:#ed4956;text-align:center;padding:24px">${err.message}</p>`;
  }
}

let _smpSearchTimer;
function smpSearch(q, chatId) {
  clearTimeout(_smpSearchTimer);
  _smpSearchTimer = setTimeout(() => smpLoad(chatId), 400);
}

function smpCard(m) {
  const name    = sanitize(m.originalFileName || 'File');
  const size    = fmtSize(m.fileSize || 0);
  const sender  = sanitize(m.senderId?.username || 'Unknown');
  const date    = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '';
  const color   = FILE_COLORS[m.fileType] || '#95a5a6';
  const icon    = FILE_ICONS[m.fileType]  || FILE_ICONS.other;

  if (m.fileType === 'image') {
    return `<div class="smp-media-card" onclick="MediaViewer.openImage('${m._id}','${m.storageUrl}','${name}')">
      <img src="${m.thumbnailUrl || m.storageUrl}" class="smp-media-thumb" loading="lazy" alt="${name}">
      <div class="smp-media-overlay">
        <button class="smp-dl-btn" onclick="event.stopPropagation();downloadMedia('${m._id}','${name}')">⬇</button>
      </div>
    </div>`;
  }
  if (m.fileType === 'video') {
    return `<div class="smp-media-card" onclick="MediaViewer.openVideo('${m._id}','${m.storageUrl}','${name}')">
      ${m.thumbnailUrl ? `<img src="${m.thumbnailUrl}" class="smp-media-thumb" loading="lazy">` : `<div class="smp-video-ph">🎬</div>`}
      <div class="smp-play-icon">▶</div>
      <div class="smp-media-overlay"><button class="smp-dl-btn" onclick="event.stopPropagation();downloadMedia('${m._id}','${name}')">⬇</button></div>
    </div>`;
  }
  return `<div class="smp-file-card">
    <div class="smp-file-icon" style="background:${color}15;color:${color}">${icon}</div>
    <div class="smp-file-info">
      <div class="smp-file-name">${name}</div>
      <div class="smp-file-meta">${size} · ${sender} · ${date}</div>
    </div>
    <button class="smp-dl-btn flat" onclick="downloadMedia('${m._id}','${name}')">⬇</button>
  </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Called from chat.js openChatWindow
function initMediaManager() {
  UploadManager.init();
}
