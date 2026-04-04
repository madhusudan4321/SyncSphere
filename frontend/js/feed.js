let uploadFile = null;
const EMOJIS = ['🌅','🌊','🏔️','🌸','🎨','🍣','🏙️','🌿','🎭','🔥','🌈','🎵'];

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

function buildPostCard(p) {
  const liked = p.likes.includes(window.APP.user._id);
  const card = document.createElement('div');
  card.className = 'post-card';
  const imgSrc = p.image ? `https://syncsphere-api.onrender.com${p.image}` : null;
  card.innerHTML = `
    <div class="post-header">
      <div class="post-avatar" onclick="viewProfile('${p.user.username}')"><div class="av-inner">${getInitials(p.user.name || p.user.username)}</div></div>
      <div class="post-user" onclick="viewProfile('${p.user.username}')">${p.user.username}</div>
    </div>
    <div class="post-image">${imgSrc ? `<img src="${imgSrc}" alt="">` : `<span>${p.emoji || '📷'}</span>`}</div>
    <div class="post-actions">
      <span class="${liked ? 'liked' : ''}" onclick="toggleLike('${p._id}', this)">
        <svg width="24" height="24" fill="${liked ? '#ed4956' : 'none'}" stroke="${liked ? '#ed4956' : 'currentColor'}" stroke-width="1.5" viewBox="0 0 24 24" style="cursor:pointer">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </span>
      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <svg class="save" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-left:auto"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
    </div>
    <div class="post-likes" id="likes-${p._id}">${p.likes.length} like${p.likes.length !== 1 ? 's' : ''}</div>
    ${p.caption ? `<div class="post-caption"><strong>${p.user.username}</strong>${p.caption}</div>` : ''}
    <div class="post-time">${timeAgo(p.createdAt)}</div>
  `;
  return card;
}

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