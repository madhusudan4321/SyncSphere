// ─── AUTO REFRESH ON LOGIN ────────────────────────────────
function autoRefreshOnLogin() {
    loadFeed();
    loadThreads();
    checkFollowRequests();
  }
  
  // ─── PULL TO REFRESH ─────────────────────────────────────
  let ptrStartY      = 0;
  let ptrCurrentY    = 0;
  let ptrRefreshing  = false;
  let ptrActive      = false;
  const PTR_THRESHOLD = 80;
  
  function getCurrentTabRefresh() {
    const active = document.querySelector('.tab-panel.active');
    if (!active) return null;
    const id = active.id;
    if (id === 'tab-home')    return () => loadFeed();
    if (id === 'tab-search')  return () => resetSearch();
    if (id === 'tab-chat')    return () => loadThreads();
    if (id === 'tab-profile') return () => loadProfile(window.APP.user.username, true);
    return null;
  }
  
  function showPTRIndicator() {
    document.getElementById('ptr-indicator').classList.add('visible');
  }
  function hidePTRIndicator() {
    document.getElementById('ptr-indicator').classList.remove('visible');
  }
  
  document.addEventListener('touchstart', (e) => {
    if (ptrRefreshing) return;
    const activePanel = document.querySelector('.tab-panel.active');
    if (!activePanel) return;
    if (activePanel.scrollTop > 0) return;
    ptrStartY  = e.touches[0].clientY;
    ptrActive  = true;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    if (!ptrActive || ptrRefreshing) return;
    ptrCurrentY = e.touches[0].clientY;
    const distance = ptrCurrentY - ptrStartY;
    if (distance > 40) {
      showPTRIndicator();
    }
  }, { passive: true });
  
  document.addEventListener('touchend', async () => {
    if (!ptrActive || ptrRefreshing) return;
    ptrActive = false;
    const distance = ptrCurrentY - ptrStartY;
    if (distance >= PTR_THRESHOLD) {
      ptrRefreshing = true;
      showPTRIndicator();
      const refresh = getCurrentTabRefresh();
      if (refresh) await refresh();
      setTimeout(() => {
        hidePTRIndicator();
        ptrRefreshing = false;
        ptrCurrentY   = 0;
        ptrStartY     = 0;
      }, 600);
    } else {
      hidePTRIndicator();
      ptrCurrentY = 0;
      ptrStartY   = 0;
    }
  });
  
  // ─── MOUSE PULL TO REFRESH (Desktop) ─────────────────────
  let mouseStartY   = 0;
  let mouseActive   = false;
  
  document.addEventListener('mousedown', (e) => {
    const activePanel = document.querySelector('.tab-panel.active');
    if (!activePanel || activePanel.scrollTop > 0) return;
    mouseStartY  = e.clientY;
    mouseActive  = true;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!mouseActive || ptrRefreshing) return;
    const distance = e.clientY - mouseStartY;
    if (distance > 60) showPTRIndicator();
  });
  
  document.addEventListener('mouseup', async (e) => {
    if (!mouseActive || ptrRefreshing) return;
    mouseActive = false;
    const distance = e.clientY - mouseStartY;
    if (distance >= PTR_THRESHOLD) {
      ptrRefreshing = true;
      showPTRIndicator();
      const refresh = getCurrentTabRefresh();
      if (refresh) await refresh();
      setTimeout(() => {
        hidePTRIndicator();
        ptrRefreshing = false;
      }, 600);
    } else {
      hidePTRIndicator();
    }
  });
  
  // ─── AUTO REFRESH EVERY 60 SECONDS ───────────────────────
  setInterval(() => {
    const active = document.querySelector('.tab-panel.active');
    if (!active) return;
    const refresh = getCurrentTabRefresh();
    if (refresh) refresh();
  }, 60000);