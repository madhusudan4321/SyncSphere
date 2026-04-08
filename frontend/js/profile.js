async function loadProfile(username, isOwn) {
  if (isOwn) checkFollowRequests();
    const pv = document.getElementById('profile-view');
    pv.innerHTML = '<div class="loader">Loading...</div>';
    try {
      const { user, posts } = await api.get(`/users/${username}`);
      const isFollowing = user.followers.some(f => f._id === window.APP.user._id);
      const blockedList = await api.get('/users/blocked/list').catch(() => []);
      const iBlockedThem = blockedList.some(u => u._id === user._id);
      const hasPendingRequest = user.followRequests && user.followRequests.some(f => f._id === window.APP.user._id || f === window.APP.user._id);
      pv.innerHTML = `
      ${!isOwn ? `<div class="back-link" onclick="loadProfile('${window.APP.user.username}',true)">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15,18 9,12 15,6"/></svg> Back
      </div>` : ''}
      ${isOwn ? `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 0">
          <p style="font-size:16px;font-weight:700">${user.username}</p>
          <svg onclick="openProfileMenu()" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="cursor:pointer">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </div>
      ` : ''}
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
            ${iBlockedThem ? `
          <button onclick="unblockUser('${user._id}','${user.username}')" style="background:#ed4956;color:#fff;border-color:#ed4956;flex:1;padding:7px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none">
            Unblock
          </button>
          ` : `
          <button id="follow-btn" class="${isFollowing ? '' : (hasPendingRequest ? '' : 'btn-follow')}"
            onclick="toggleFollow('${user._id}','${user.username}')"
            style="${hasPendingRequest ? 'background:var(--surface2);color:var(--text)' : ''}">
            ${isFollowing ? 'Following' : (hasPendingRequest ? 'Requested' : 'Follow')}
          </button>
          <button onclick="openChatFromProfile('${user._id}','${user.username}')">Message</button>
            `}
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

  // ─── UNBLOCK FROM PROFILE PAGE ───────────────────────────
async function unblockUser(userId, username) {
  const confirm = window.confirm(`Unblock @${username}?`);
  if (!confirm) return;
  try {
    await api.post(`/users/${userId}/unblock`);
    showToast(`@${username} has been unblocked`);
    loadProfile(username, false);
  } catch (err) { showToast(err.message); }
}

// ─── BLOCKED USERS LIST ───────────────────────────────────
async function showBlockedUsers() {
  try {
    const blocked = await api.get('/users/blocked/list');
    const existing = document.getElementById('blocked-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'blocked-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:var(--surface);border-radius:16px;width:100%;max-width:380px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <h3 style="font-size:16px;font-weight:700">Blocked Users</h3>
          <button onclick="document.getElementById('blocked-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text);line-height:1">×</button>
        </div>
        <div style="overflow-y:auto;flex:1;padding:8px 0">
          ${blocked.length === 0 ? `
            <p style="text-align:center;color:var(--muted);padding:40px;font-size:14px">No blocked users</p>
          ` : blocked.map(u => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
              <div style="width:44px;height:44px;border-radius:50%;background:var(--grad);padding:2px;flex-shrink:0">
                <div style="width:100%;height:100%;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;border:2px solid #fff">
                  ${getInitials(u.name || u.username)}
                </div>
              </div>
              <div style="flex:1">
                <p style="font-size:14px;font-weight:600">${u.username}</p>
                <p style="font-size:12px;color:var(--muted)">${u.name || ''}</p>
              </div>
              <button onclick="unblockFromList('${u._id}','${u.username}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;color:var(--text)">
                Unblock
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  } catch (err) { showToast(err.message); }
}

async function unblockFromList(userId, username) {
  try {
    await api.post(`/users/${userId}/unblock`);
    showToast(`@${username} unblocked`);
    showBlockedUsers();
  } catch (err) { showToast(err.message); }
}

// ─── PROFILE HAMBURGER MENU ───────────────────────────────
function openProfileMenu() {
  const existing = document.getElementById('profile-menu');
  if (existing) { existing.remove(); return; }

  const menu = document.createElement('div');
  menu.id = 'profile-menu';
  menu.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);
    z-index:300;display:flex;align-items:flex-end;justify-content:center
  `;
  menu.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom);overflow:hidden">
      <div style="padding:16px;text-align:center;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 12px"></div>
        <p style="font-size:16px;font-weight:700">Settings & Options</p>
      </div>
      <div>
        <!-- Edit Profile -->
        <div onclick="closeProfileMenuAnd(openEdit)" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#e8f4fd;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="20" height="20" fill="none" stroke="#0095f6" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div>
            <p style="font-size:15px;font-weight:600">Edit Profile</p>
            <p style="font-size:12px;color:var(--muted)">Update your name, bio and website</p>
          </div>
          <svg style="margin-left:auto" width="16" height="16" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
        </div>

        <!-- Privacy Toggle -->
        <div onclick="closeProfileMenuAnd(togglePrivacy)" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#f0fdf4;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="20" height="20" fill="none" stroke="#22c55e" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div style="flex:1">
            <p style="font-size:15px;font-weight:600">Account Privacy</p>
            <p style="font-size:12px;color:var(--muted)" id="privacy-menu-status">Loading...</p>
          </div>
          <svg style="margin-left:auto" width="16" height="16" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
        </div>

        <!-- Blocked Users -->
        <div onclick="closeProfileMenuAnd(showBlockedUsers)" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#fdecea;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="20" height="20" fill="none" stroke="#ed4956" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div>
            <p style="font-size:15px;font-weight:600">Blocked Users</p>
            <p style="font-size:12px;color:var(--muted)">Manage users you have blocked</p>
          </div>
          <svg style="margin-left:auto" width="16" height="16" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
        </div>

        <!-- Logout -->
        <div onclick="closeProfileMenuAnd(authLogout)" style="display:flex;align-items:center;gap:16px;padding:16px 24px;cursor:pointer;border-bottom:1px solid var(--border);transition:.1s" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <div style="width:40px;height:40px;border-radius:50%;background:#fff8e1;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <svg width="20" height="20" fill="none" stroke="#f09433" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
          <div>
            <p style="font-size:15px;font-weight:600;color:#f09433">Logout</p>
            <p style="font-size:12px;color:var(--muted)">Sign out of your account</p>
          </div>
          <svg style="margin-left:auto" width="16" height="16" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
        </div>

        <!-- Cancel -->
        <div onclick="document.getElementById('profile-menu').remove()" style="display:flex;align-items:center;justify-content:center;padding:16px 24px;cursor:pointer" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
          <p style="font-size:15px;font-weight:600;color:var(--muted)">Cancel</p>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const privacyStatus = document.getElementById('privacy-menu-status');
    if (privacyStatus) {
      const u = window.APP.user;
      privacyStatus.textContent = u.isPrivate ? '🔒 Currently Private — tap to make Public' : '🌐 Currently Public — tap to make Private';
    }
  }, 50);

  menu.addEventListener('click', e => { if (e.target === menu) menu.remove(); });
  document.body.appendChild(menu);
}

function closeProfileMenuAnd(fn) {
  const menu = document.getElementById('profile-menu');
  if (menu) menu.remove();
  setTimeout(() => fn(), 150);
}