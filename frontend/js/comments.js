// ── Comments modal ────────────────────────────────────────────
async function openComments(postId) {
  document.getElementById('comments-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'comments-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:flex-end;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:20px 20px 0 0;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="width:40px;height:4px;background:var(--border);border-radius:4px;"></div>
        <h3 style="font-size:16px;font-weight:700">Comments</h3>
        <button onclick="document.getElementById('comments-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text);line-height:1">×</button>
      </div>
      <div id="comments-list" style="overflow-y:auto;flex:1;padding:8px 0">
        <div class="loader"><div class="spinner"></div></div>
      </div>
      <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;background:var(--surface)">
        <input id="comment-input" type="text" placeholder="Add a comment..." maxlength="500"
          style="flex:1;border:1px solid var(--border);border-radius:22px;padding:9px 16px;font-size:14px;outline:none;background:var(--surface2);color:var(--text)"
          onkeydown="if(event.key==='Enter')submitComment('${postId}')">
        <button onclick="submitComment('${postId}')" style="background:var(--accent);border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
          <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  await fetchComments(postId);
  setTimeout(() => document.getElementById('comment-input')?.focus(), 100);
}

async function fetchComments(postId) {
  const list = document.getElementById('comments-list'); if (!list) return;
  try {
    const comments = await api.get(`/posts/${postId}/comments`);
    if (comments.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;font-size:14px">No comments yet.<br>Be the first to comment!</p>';
      return;
    }
    list.innerHTML = comments.map(c => {
      const safeU    = sanitize(c.user.username);
      const safeText = sanitize(c.text);
      const isOwn    = c.user._id === window.APP.user._id;
      return `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border)">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--grad);padding:2px;flex-shrink:0;cursor:pointer" onclick="viewProfile('${safeU}')">
            <div style="width:100%;height:100%;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:1.5px solid #fff">${getInitials(c.user.name||c.user.username)}</div>
          </div>
          <div style="flex:1;min-width:0">
            <span style="font-weight:700;font-size:13px;cursor:pointer" onclick="viewProfile('${safeU}')">${safeU}</span>
            <span style="font-size:13px;margin-left:6px">${safeText}</span>
            <div style="font-size:11px;color:var(--muted);margin-top:3px">${timeAgo(c.createdAt)}</div>
          </div>
          ${isOwn ? `<button onclick="deleteComment('${postId}','${c._id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1;flex-shrink:0">×</button>` : ''}
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<p style="text-align:center;color:#ed4956;padding:20px">${sanitize(err.message)}</p>`;
  }
}

async function submitComment(postId) {
  const input = document.getElementById('comment-input'); if (!input) return;
  const text  = input.value.trim(); if (!text) return;
  input.value = ''; input.disabled = true;
  try {
    await api.post(`/posts/${postId}/comments`, { text });
    await fetchComments(postId);
    // Update comment count on the post card
    const cc = document.getElementById('cc-' + postId);
    if (cc) cc.textContent = (parseInt(cc.textContent)||0) + 1;
  } catch (err) { showToast(err.message); input.value = text; }
  finally { input.disabled = false; input.focus(); }
}

async function deleteComment(postId, commentId) {
  try {
    await api.del(`/posts/${postId}/comments/${commentId}`);
    await fetchComments(postId);
    const cc = document.getElementById('cc-' + postId);
    if (cc) { const n = (parseInt(cc.textContent)||1) - 1; cc.textContent = n > 0 ? n : ''; }
  } catch (err) { showToast(err.message); }
}
