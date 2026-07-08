// ── Call.js — WebRTC Voice/Video Calling Engine ──────────────
// Requires: socket (from chat.js), api (from api.js)

// ── STUN configuration ────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

// ── Call state ────────────────────────────────────────────────
const CallState = {
  callId:        null,
  partnerId:     null,
  partnerName:   null,
  callType:      null,   // 'voice' | 'video'
  role:          null,   // 'caller' | 'receiver'
  status:        'idle', // idle | ringing | active | ended
  startTime:     null,
  timerInterval: null,
  incomingTimeout: null,
};

// ── WebRTC manager ────────────────────────────────────────────
const WebRTCManager = {
  pc:            null,
  localStream:   null,
  remoteStream:  null,
  isMuted:       false,
  isCamOff:      false,
  pendingCandidates: [],

  async initPC() {
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate && CallState.partnerId && socket?.connected) {
        socket.emit('call:iceCandidate', {
          callId: CallState.callId,
          to: CallState.partnerId,
          candidate,
        });
      }
    };

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      const remoteVideo = document.getElementById('call-remote-video');
      if (remoteVideo) remoteVideo.srcObject = this.remoteStream;
    };

    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === 'connected') CallUI.setStatus('Connected');
      if (s === 'disconnected' || s === 'failed') CallManager.endCall('connection_lost');
    };

    // Flush queued ICE candidates
    this.pendingCandidates.forEach(c => this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
    this.pendingCandidates = [];
  },

  async getMedia(callType) {
    const constraints = callType === 'video'
      ? { audio: true, video: { facingMode: 'user', width: 640, height: 480 } }
      : { audio: true, video: false };
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    const localVideo = document.getElementById('call-local-video');
    if (localVideo) localVideo.srcObject = this.localStream;
    return this.localStream;
  },

  addTracks() {
    this.localStream?.getTracks().forEach(track => this.pc.addTrack(track, this.localStream));
  },

  toggleMute() {
    if (!this.localStream) return;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return;
    this.isMuted = !this.isMuted;
    audioTrack.enabled = !this.isMuted;
    CallUI.updateControls();
  },

  toggleCamera() {
    if (!this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    this.isCamOff = !this.isCamOff;
    videoTrack.enabled = !this.isCamOff;
    CallUI.updateControls();
  },

  async switchCamera() {
    if (!this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;
    const constraints = videoTrack.getConstraints();
    const facing = constraints.facingMode === 'environment' ? 'user' : 'environment';
    const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false }).catch(() => null);
    if (!newStream) return;
    const [newTrack] = newStream.getVideoTracks();
    const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) sender.replaceTrack(newTrack);
    this.localStream.getVideoTracks().forEach(t => t.stop());
    const local = document.getElementById('call-local-video');
    if (local) local.srcObject = newStream;
    this.localStream = newStream;
  },

  cleanup() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isCamOff = false;
    this.pendingCandidates = [];
  },
};

// ── CallManager ───────────────────────────────────────────────
const CallManager = {

  // ── Start an outgoing call ────────────────────────────────
  async startCall(userId, username, callType) {
    if (CallState.status !== 'idle') { showToast('Already in a call'); return; }
    if (!socket?.connected) { showToast('Not connected'); return; }

    const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    CallState.callId      = callId;
    CallState.partnerId   = userId;
    CallState.partnerName = username;
    CallState.callType    = callType;
    CallState.role        = 'caller';
    CallState.status      = 'ringing';

    CallUI.showOutgoing(username, callType);

    socket.emit('call:start', { callId, to: userId, callType });

    // 30s auto-cancel if no answer
    CallState.incomingTimeout = setTimeout(() => {
      if (CallState.status === 'ringing') CallManager.cancelCall();
    }, 30000);
  },

  // ── Handle incoming call ──────────────────────────────────
  handleIncoming({ callId, from, callType, fromName }) {
    if (CallState.status !== 'idle') {
      socket.emit('call:busy', { callId, to: from });
      return;
    }
    CallState.callId      = callId;
    CallState.partnerId   = from;
    CallState.partnerName = fromName || from;
    CallState.callType    = callType;
    CallState.role        = 'receiver';
    CallState.status      = 'ringing';

    socket.emit('call:ringing', { callId, to: from });
    CallUI.showIncoming(CallState.partnerName, callType);

    // Auto-miss after 30s
    CallState.incomingTimeout = setTimeout(() => {
      if (CallState.status === 'ringing') CallUI.hideIncoming();
    }, 30000);
  },

  // ── Accept call (receiver) ────────────────────────────────
  async acceptCall() {
    clearTimeout(CallState.incomingTimeout);
    CallUI.hideIncoming();
    // Show a connecting state while we acquire media
    CallUI.showConnecting(CallState.partnerName, CallState.callType);
    CallState.status = 'active';

    try {
      await WebRTCManager.getMedia(CallState.callType);
      await WebRTCManager.initPC();
      WebRTCManager.addTracks();
      // Media ready → switch to full active UI
      CallUI.showActive(CallState.partnerName, CallState.callType);
      socket.emit('call:accepted', { callId: CallState.callId, to: CallState.partnerId });
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow access and try again.'
        : 'Could not access microphone/camera: ' + err.message;
      showToast(msg);
      this.endCall('media_error');
    }
  },

  // ── Caller: received acceptance → send offer ─────────────
  async onCallAccepted() {
    clearTimeout(CallState.incomingTimeout);
    CallUI.setStatus('Connecting...');
    CallState.status = 'active';

    try {
      await WebRTCManager.getMedia(CallState.callType);
      await WebRTCManager.initPC();
      WebRTCManager.addTracks();
      // Media ready → switch outgoing overlay to full active UI
      CallUI.showActive(CallState.partnerName, CallState.callType);
      CallState.startTime = Date.now();
      CallUI.startTimer();
      const offer = await WebRTCManager.pc.createOffer();
      await WebRTCManager.pc.setLocalDescription(offer);
      socket.emit('call:offer', { callId: CallState.callId, to: CallState.partnerId, offer });
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow access and try again.'
        : 'Could not access microphone/camera: ' + err.message;
      showToast(msg);
      this.endCall('media_error');
    }
  },

  // ── Receiver: got offer → send answer ────────────────────
  async onOffer(offer) {
    if (!WebRTCManager.pc) await WebRTCManager.initPC();
    await WebRTCManager.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await WebRTCManager.pc.createAnswer();
    await WebRTCManager.pc.setLocalDescription(answer);
    socket.emit('call:answer', { callId: CallState.callId, to: CallState.partnerId, answer });
    CallState.startTime = Date.now();
    CallUI.startTimer();
  },

  // ── Caller: got answer → finalize connection ─────────────
  async onAnswer(answer) {
    await WebRTCManager.pc?.setRemoteDescription(new RTCSessionDescription(answer));
  },

  // ── ICE candidate ─────────────────────────────────────────
  async onIceCandidate(candidate) {
    if (WebRTCManager.pc?.remoteDescription) {
      await WebRTCManager.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      WebRTCManager.pendingCandidates.push(candidate);
    }
  },

  // ── Reject call (receiver) ────────────────────────────────
  rejectCall() {
    clearTimeout(CallState.incomingTimeout);
    CallUI.hideIncoming();
    if (socket?.connected) {
      socket.emit('call:rejected', { callId: CallState.callId, to: CallState.partnerId });
    }
    this._reset();
  },

  // ── Cancel outgoing call ──────────────────────────────────
  cancelCall() {
    clearTimeout(CallState.incomingTimeout);
    if (socket?.connected) {
      socket.emit('call:ended', { callId: CallState.callId, to: CallState.partnerId });
    }
    CallUI.hideOutgoing();
    this._reset();
  },

  // ── End active call ───────────────────────────────────────
  endCall(reason) {
    if (socket?.connected && CallState.partnerId && reason !== 'remote_ended') {
      socket.emit('call:ended', { callId: CallState.callId, to: CallState.partnerId });
    }
    CallUI.hideActive(reason);
    this._reset();
  },

  _reset() {
    clearInterval(CallState.timerInterval);
    clearTimeout(CallState.incomingTimeout);
    WebRTCManager.cleanup();
    CallState.callId        = null;
    CallState.partnerId     = null;
    CallState.partnerName   = null;
    CallState.callType      = null;
    CallState.role          = null;
    CallState.status        = 'idle';
    CallState.startTime     = null;
    CallState.timerInterval = null;
    CallState.incomingTimeout = null;
  },
};

// ── Socket listeners (wired after socket connects) ────────────
function wireCallSocketListeners() {
  if (!socket) return;

  socket.on('call:incoming', async ({ callId, from, callType }) => {
    // Resolve caller name: first check thread list, then API
    let fromName = null;
    const threadEl = document.querySelector(`.chat-thread[data-user-id="${from}"]`);
    if (threadEl) fromName = threadEl.querySelector('.t-name')?.textContent || null;
    if (!fromName) {
      // Fallback: fetch from API (fast since it hits cache)
      try {
        const data = await api.get(`/users/by-id/${from}`).catch(() => null);
        if (data?.username) fromName = data.username;
      } catch (_) {}
    }
    fromName = fromName || 'Unknown';
    CallManager.handleIncoming({ callId, from, callType, fromName });
  });

  socket.on('call:ringing', ({ callId }) => {
    if (CallState.callId === callId) CallUI.setStatus('Ringing...');
  });

  socket.on('call:accepted', ({ callId }) => {
    if (CallState.callId === callId && CallState.role === 'caller') {
      // Don't show active yet — onCallAccepted will show it after media is ready
      CallManager.onCallAccepted();
    }
  });

  socket.on('call:rejected', ({ callId }) => {
    if (CallState.callId !== callId) return;
    showToast('Call declined');
    CallUI.hideOutgoing();
    CallManager._reset();
  });

  socket.on('call:busy', ({ callId }) => {
    if (CallState.callId !== callId) return;
    showToast('User is busy');
    CallUI.hideOutgoing();
    CallManager._reset();
  });

  socket.on('call:missed', ({ callId }) => {
    showToast('Missed call');
    CallUI.hideIncoming();
    CallManager._reset();
  });

  socket.on('call:offer', async ({ callId, offer }) => {
    if (CallState.callId === callId) await CallManager.onOffer(offer);
  });

  socket.on('call:answer', async ({ callId, answer }) => {
    if (CallState.callId === callId) await CallManager.onAnswer(answer);
  });

  socket.on('call:iceCandidate', async ({ callId, candidate }) => {
    if (CallState.callId === callId) await CallManager.onIceCandidate(candidate);
  });

  socket.on('call:ended', ({ callId, reason }) => {
    if (CallState.callId !== callId) return;
    showToast(reason === 'disconnected' ? 'Call ended — partner disconnected' : 'Call ended');
    if (CallState.status === 'ringing') CallUI.hideIncoming();
    else CallUI.hideActive('remote_ended');
    CallManager._reset();
  });

  socket.on('call:error', ({ message }) => {
    showToast(message || 'Call error');
    CallUI.hideOutgoing();
    CallManager._reset();
  });

  socket.on('call:historyUpdated', () => {
    // Refresh call history if it's open
    if (document.getElementById('call-history-modal')) loadCallHistory();
  });
}

// ── CallUI ────────────────────────────────────────────────────
const CallUI = {

  showOutgoing(name, callType) {
    const el = document.getElementById('call-outgoing-overlay');
    if (!el) return;
    document.getElementById('call-out-name').textContent = name;
    document.getElementById('call-out-type').textContent = callType === 'video' ? 'Video Call' : 'Voice Call';
    el.classList.add('open');
  },

  hideOutgoing() {
    document.getElementById('call-outgoing-overlay')?.classList.remove('open');
  },

  showIncoming(name, callType) {
    const el = document.getElementById('call-incoming-overlay');
    if (!el) return;
    document.getElementById('call-in-name').textContent = name;
    document.getElementById('call-in-type').textContent = callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call';
    document.getElementById('call-in-av').textContent = getInitials(name);
    el.classList.add('open');
  },

  hideIncoming() {
    document.getElementById('call-incoming-overlay')?.classList.remove('open');
  },

  // Lightweight connecting screen shown while media permission prompt is active
  showConnecting(name, callType) {
    this.hideIncoming();
    this.hideOutgoing();
    const el = document.getElementById('call-connecting-overlay');
    if (!el) return;
    document.getElementById('call-conn-name').textContent = name;
    document.getElementById('call-conn-type').textContent = callType === 'video' ? 'Video Call' : 'Voice Call';
    document.getElementById('call-conn-av').textContent   = getInitials(name);
    el.classList.add('open');
  },

  hideConnecting() {
    document.getElementById('call-connecting-overlay')?.classList.remove('open');
  },

  showActive(name, callType) {
    this.hideOutgoing();
    this.hideIncoming();
    this.hideConnecting();
    const el = document.getElementById('call-active-overlay');
    if (!el) return;
    document.getElementById('call-active-name').textContent = name;
    document.getElementById('call-active-type').textContent = callType === 'video' ? 'Video Call' : 'Voice Call';
    document.getElementById('call-active-av').textContent = getInitials(name);

    const isVideo = callType === 'video';
    document.getElementById('call-video-area').style.display = isVideo ? 'block' : 'none';
    document.getElementById('call-cam-btn').style.display    = isVideo ? 'flex' : 'none';
    document.getElementById('call-flip-btn').style.display   = isVideo ? 'flex' : 'none';

    el.classList.add('open');
    this.updateControls();
  },

  hideActive(reason) {
    clearInterval(CallState.timerInterval);
    document.getElementById('call-active-overlay')?.classList.remove('open');
    document.getElementById('call-connecting-overlay')?.classList.remove('open');
    const timerEl = document.getElementById('call-timer');
    if (timerEl) timerEl.textContent = '00:00';
  },

  setStatus(text) {
    const el = document.getElementById('call-out-status');
    if (el) el.textContent = text;
    const s2 = document.getElementById('call-active-status');
    if (s2) s2.textContent = text;
  },

  startTimer() {
    this.setStatus('Connected');
    clearInterval(CallState.timerInterval);
    const timerEl = document.getElementById('call-timer');
    if (!timerEl) return;
    CallState.timerInterval = setInterval(() => {
      if (!CallState.startTime) return;
      const s = Math.floor((Date.now() - CallState.startTime) / 1000);
      const m = Math.floor(s / 60);
      timerEl.textContent = `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
    }, 1000);
  },

  updateControls() {
    const muteBtn = document.getElementById('call-mute-btn');
    const camBtn  = document.getElementById('call-cam-btn');
    if (muteBtn) {
      muteBtn.classList.toggle('active', WebRTCManager.isMuted);
      muteBtn.title = WebRTCManager.isMuted ? 'Unmute' : 'Mute';
      muteBtn.innerHTML = WebRTCManager.isMuted
        ? `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/></svg>`
        : `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>`;
    }
    if (camBtn) {
      camBtn.classList.toggle('active', WebRTCManager.isCamOff);
      camBtn.innerHTML = WebRTCManager.isCamOff
        ? `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34m-7.72-2.06A4 4 0 1112 8"/></svg>`
        : `<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
    }
  },
};

// ── Call History ──────────────────────────────────────────────
async function openCallHistory() {
  const existing = document.getElementById('call-history-modal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'call-history-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:400;display:flex;align-items:flex-end;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:80vh;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)">
      <div style="padding:8px 0 4px;display:flex;justify-content:center"><div style="width:36px;height:4px;background:var(--border);border-radius:4px"></div></div>
      <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <h3 style="font-size:17px;font-weight:700">Call History</h3>
        <button onclick="document.getElementById('call-history-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text)">×</button>
      </div>
      <div id="call-history-list" style="overflow-y:auto;flex:1;padding:8px 0">
        <div class="loader"><div class="spinner"></div></div>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  loadCallHistory();
}

async function loadCallHistory() {
  const list = document.getElementById('call-history-list');
  if (!list) return;
  try {
    const calls = await api.get('/calls');
    if (!calls.length) {
      list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;font-size:14px">No call history yet</p>';
      return;
    }
    list.innerHTML = calls.map(c => {
      const me = window.APP.user._id;
      const isCaller = (c.callerId?._id || c.callerId) === me;
      const partner  = isCaller ? c.receiverId : c.callerId;
      const name     = partner?.username || partner?.name || 'Unknown';

      const iconColor = c.status === 'answered' ? '#22c55e'
                      : c.status === 'missed'   ? '#ed4956'
                      : '#8e8e8e';

      const arrowSvg = isCaller
        ? `<svg width="14" height="14" fill="none" stroke="${iconColor}" stroke-width="2.5" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7,7 17,7 17,17"/></svg>`
        : `<svg width="14" height="14" fill="none" stroke="${iconColor}" stroke-width="2.5" viewBox="0 0 24 24"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17,17 7,17 7,7"/></svg>`;

      const typeSvg = c.callType === 'video'
        ? `<svg width="15" height="15" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`
        : `<svg width="15" height="15" fill="none" stroke="var(--muted)" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 4.18 2 2 0 015.07 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006.99 7l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`;

      const dur = c.status === 'answered' && c.duration
        ? `${Math.floor(c.duration/60)}m ${c.duration%60}s`
        : c.status;

      const canCall = c.status === 'answered' || c.status === 'missed' || c.status === 'rejected';

      return `<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)">
        <div style="width:46px;height:46px;border-radius:50%;background:var(--grad);padding:2px;flex-shrink:0">
          <div style="width:100%;height:100%;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;border:2px solid #fff">${getInitials(name)}</div>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            ${arrowSvg}
            <span style="font-size:14px;font-weight:600">${sanitize(name)}</span>
            ${typeSvg}
          </div>
          <div style="font-size:12px;color:var(--muted)">${dur} · ${timeAgo(c.createdAt)}</div>
        </div>
        ${canCall ? `<div style="display:flex;gap:8px">
          <button onclick="CallManager.startCall('${partner?._id || partner}','${sanitize(name)}','voice');document.getElementById('call-history-modal')?.remove()" 
            style="background:var(--surface2);border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 4.18 2 2 0 015.07 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006.99 7l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          </button>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<p style="color:#ed4956;text-align:center;padding:20px">${err.message}</p>`;
  }
}

// ── Wire socket listeners once socket is available ────────────
// Called from connectSocket() in chat.js after socket is created
function initCallListeners() {
  wireCallSocketListeners();
}
