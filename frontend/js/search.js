let searchTimer = null;

function resetSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-placeholder"><p>Search for users by username</p></div>';
}

function searchUsers(q) {
  clearTimeout(searchTimer);
  if (!q.trim()) { resetSearch(); return; }
  searchTimer = setTimeout(async () => {
    try {
      const users = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      const res = document.getElementById('search-results');
      if (users.length === 0) { res.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px;font-size:14px">No users found</p>'; return; }
      res.innerHTML = users.map(u => `
        <div class="user-result" onclick="viewProfile('${u.username}')">
          <div class="u-av"><div class="u-av-inner">${getInitials(u.name || u.username)}</div></div>
          <div class="u-info">
            <p>${u.username}</p>
            <p>${u.name || ''}${u.bio ? ' · ' + u.bio.slice(0, 28) : ''}</p>
          </div>
        </div>
      `).join('');
    } catch (err) { showToast(err.message); }
  }, 300);
}