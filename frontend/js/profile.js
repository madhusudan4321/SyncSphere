async function loadProfile(username, isOwn) {
  if (isOwn) checkFollowRequests();
    const pv = document.getElementById('profile-view');
    pv.innerHTML = '<div class="loader">Loading...</div>';
    try {
      const { user, posts } = await api.get(`/users/${username}`);
      const isFollowing = user.followers.some(f => f._id === window.APP.user._id);
      const hasPendingRequest = user.followRequests && user.followRequests.some(f => f._id === window.APP.user._id || f === window.APP.user._id);
      pv.innerHTML = `
        ${!isOwn ? `<div class="back-link" onclick="loadProfile('${window.APP.user.username}',true)">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg> Back
        </div>` : ''}
        <div class="profile-container">
          <div class="profile-header">
            <div class="profile-top">
              <div class="profile-pic"><div class="pp-inner">${getInitials(user.name || user.username)}</div></div>
              <div class="profile-stats">
                <div class="stat-item"><div class="s-num">${posts.length}</div><div class="s-label">Posts</div></div>
                <div class="stat-item"><div class="s-num">${user.followers.length}</div><div class="s-label">Followers</div></div>
                <div class="stat-item"><div class="s-num">${user.following.length}</div><div class="s-label">Following</div></div>
              </div>
            </div>
            <div>
              <div class="p-name">${user.name || user.username}</div>
              ${user.bio     ? `<div class="p-bio">${user.bio}</div>`        : ''}
              ${user.website ? `<div class="p-web">${user.website}</div>`    : ''}
            </div>
            <div class="profile-btns">
            ${isOwn ? `
              <button onclick="openEdit()">Edit Profile</button>
              <button onclick="togglePrivacy()" id="privacy-btn" style="background:${user.isPrivate ? '#262626' : 'var(--surface2)'};color:${user.isPrivate ? '#fff' : 'var(--text)'}">
                ${user.isPrivate ? '🔒 Private' : '🌐 Public'}
              </button>
            ` : `
              <button id="follow-btn" class="${isFollowing ? '' : (hasPendingRequest ? '' : 'btn-follow')}"
                onclick="toggleFollow('${user._id}','${user.username}')"
                style="${hasPendingRequest ? 'background:var(--surface2);color:var(--text)' : ''}">
                ${isFollowing ? 'Following' : (hasPendingRequest ? 'Requested' : 'Follow')}
              </button>
              <button onclick="openChatFromProfile('${user._id}','${user.username}')">Message</button>
            `}
            </div>
          </div>
          <div class="profile-tabs"><div class="pt active">Posts</div></div>
          <div class="profile-grid">
            ${!isOwn && user.isPrivate && !isFollowing ? `
              <div class="empty-posts" style="grid-column:1/-1;padding:40px;text-align:center">
                <p style="font-size:32px;margin-bottom:12px">🔒</p>
                <p style="font-size:15px;font-weight:600;margin-bottom:6px">This account is private</p>
                <p style="font-size:13px;color:var(--muted)">Follow this account to see their photos</p>
              </div>
            ` : ''}
            ${(isOwn || !user.isPrivate || isFollowing) && posts.length === 0 ? '<div class="empty-posts">No posts yet.</div>' : ''}
            ${(isOwn || !user.isPrivate || isFollowing) ? posts.map(p => `
              <div class="profile-grid-item">
                ${p.image ? `<img src="https://syncsphere-api.onrender.com${p.image}" alt="">` : `<div class="emoji-post">${p.emoji || '📷'}</div>`}
              </div>
            `).join('') : ''}
          </div>
        </div>
      `;
    } catch (err) { pv.innerHTML = `<p style="text-align:center;color:#ed4956;padding:30px">${err.message}</p>`; }
  }
  
  async function toggleFollow(userId, username) {
    try {
      const { status, followersCount } = await api.post(`/users/${userId}/follow`);
      const btn = document.getElementById('follow-btn');
      if (btn) {
        if (status === 'following') {
          btn.textContent = 'Following';
          btn.className = '';
          showToast(`Following @${username}`);
        } else if (status === 'unfollowed') {
          btn.textContent = 'Follow';
          btn.className = 'btn-follow';
          showToast(`Unfollowed @${username}`);
        } else if (status === 'request_sent') {
          btn.textContent = 'Requested';
          btn.className = '';
          btn.style.background = 'var(--surface2)';
          btn.style.color = 'var(--text)';
          showToast(`Follow request sent to @${username}`);
        } else if (status === 'request_cancelled') {
          btn.textContent = 'Follow';
          btn.className = 'btn-follow';
          showToast(`Follow request cancelled`);
        }
      }
      loadProfile(username, false);
    } catch (err) { showToast(err.message); }
  }
  
  function viewProfile(username) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-profile').classList.add('active');
    document.getElementById('nav-profile').classList.add('active');
    loadProfile(username, username === window.APP.user.username);
  }
  
  function openChatFromProfile(userId, username) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-chat').classList.add('active');
    document.getElementById('nav-chat').classList.add('active');
    setTimeout(() => openChatWindow(userId, username), 50);
  }
  
  function openEdit() {
    const u = window.APP.user;
    document.getElementById('edit-name').value    = u.name    || '';
    document.getElementById('edit-uname').value   = u.username || '';
    document.getElementById('edit-bio').value     = u.bio     || '';
    document.getElementById('edit-website').value = u.website || '';
    document.getElementById('edit-modal').classList.add('open');
  }
  function closeEdit() { document.getElementById('edit-modal').classList.remove('open'); }
  
  async function saveProfile() {
    const name    = document.getElementById('edit-name').value.trim();
    const bio     = document.getElementById('edit-bio').value.trim();
    const website = document.getElementById('edit-website').value.trim();
    try {
      const updated = await api.put('/users/profile/update', { name, bio, website });
      window.APP.user = { ...window.APP.user, name: updated.name, bio: updated.bio, website: updated.website };
      localStorage.setItem('pic_user', JSON.stringify(window.APP.user));
      closeEdit();
      loadProfile(window.APP.user.username, true);
      showToast('Profile updated!');
    } catch (err) { showToast(err.message); }
  }

  async function togglePrivacy() {
    try {
      const { isPrivate } = await api.put('/users/privacy/toggle');
      window.APP.user.isPrivate = isPrivate;
      localStorage.setItem('pic_user', JSON.stringify(window.APP.user));
      showToast(isPrivate ? '🔒 Account set to Private' : '🌐 Account set to Public');
      loadProfile(window.APP.user.username, true);
    } catch (err) { showToast(err.message); }
  }

  async function showFollowRequests() {
    const list = document.getElementById('follow-requests-list');
    const bar  = document.getElementById('follow-requests-bar');
    if (list.style.display === 'block') {
      list.style.display = 'none';
      return;
    }
    try {
      const requests = await api.get('/users/follow-requests/list');
      if (requests.length === 0) { list.style.display = 'none'; bar.style.display = 'none'; return; }
      list.style.display = 'block';
      list.innerHTML = requests.map(r => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
          <div class="u-av"><div class="u-av-inner">${getInitials(r.name || r.username)}</div></div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600">${r.username}</p>
            <p style="font-size:12px;color:var(--muted)">${r.name || ''}</p>
          </div>
          <button onclick="handleFollowRequest('${r._id}','accept')" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;margin-right:6px">Accept</button>
          <button onclick="handleFollowRequest('${r._id}','decline')" style="background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer">Decline</button>
        </div>
      `).join('');
    } catch (err) { showToast(err.message); }
  }
  
  async function handleFollowRequest(userId, action) {
    try {
      await api.put(`/users/follow-requests/${userId}/${action}`);
      showToast(action === 'accept' ? 'Follow request accepted!' : 'Follow request declined');
      checkFollowRequests();
      showFollowRequests();
    } catch (err) { showToast(err.message); }
  }
  
  async function checkFollowRequests() {
    try {
      const requests = await api.get('/users/follow-requests/list');
      const bar   = document.getElementById('follow-requests-bar');
      const count = document.getElementById('follow-req-count');
      if (requests.length > 0) {
        bar.style.display = 'block';
        count.textContent = requests.length;
      } else {
        bar.style.display = 'none';
        document.getElementById('follow-requests-list').style.display = 'none';
      }
    } catch (err) {}
  }

  document.getElementById('edit-modal').addEventListener('click', function(e) { if (e.target === this) closeEdit(); });
  