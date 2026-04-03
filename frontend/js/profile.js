async function loadProfile(username, isOwn) {
    const pv = document.getElementById('profile-view');
    pv.innerHTML = '<div class="loader">Loading...</div>';
    try {
      const { user, posts } = await api.get(`/users/${username}`);
      const isFollowing = user.followers.some(f => f._id === window.APP.user._id);
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
                <button onclick="showToast('Link copied!')">Share</button>
              ` : `
                <button id="follow-btn" class="${isFollowing ? '' : 'btn-follow'}" onclick="toggleFollow('${user._id}','${user.username}')">
                  ${isFollowing ? 'Following' : 'Follow'}
                </button>
                <button onclick="openChatFromProfile('${user._id}','${user.username}')">Message</button>
              `}
            </div>
          </div>
          <div class="profile-tabs"><div class="pt active">Posts</div></div>
          <div class="profile-grid">
            ${posts.length === 0 ? '<div class="empty-posts">No posts yet.</div>' : ''}
            ${posts.map(p => `
              <div class="profile-grid-item">
                ${p.image ? `<img src="http://localhost:5000${p.image}" alt="">` : `<div class="emoji-post">${p.emoji || '📷'}</div>`}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) { pv.innerHTML = `<p style="text-align:center;color:#ed4956;padding:30px">${err.message}</p>`; }
  }
  
  async function toggleFollow(userId, username) {
    try {
      const { following, followersCount } = await api.post(`/users/${userId}/follow`);
      const btn = document.getElementById('follow-btn');
      if (btn) {
        btn.textContent = following ? 'Following' : 'Follow';
        btn.className   = following ? '' : 'btn-follow';
      }
      showToast(following ? `Following @${username}` : `Unfollowed @${username}`);
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
  
  document.getElementById('edit-modal').addEventListener('click', function(e) { if (e.target === this) closeEdit(); });