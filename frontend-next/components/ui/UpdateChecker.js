'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import api from '@/lib/api';

export default function UpdateChecker() {
  const [update, setUpdate] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return; // skip in the browser
    (async () => {
      try {
        const info = await App.getInfo();            // info.build = installed versionCode
        const latest = await api.get('/app/version'); // adjust if your api base differs
        if (latest.versionCode > Number(info.build)) setUpdate(latest);
      } catch {}
    })();
  }, []);

  if (!update) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Update available</h3>
        <p style={{ margin: '0 0 4px', fontSize: 14, color: '#737373' }}>Version {update.versionName}</p>
        {update.releaseNotes && (
          <p style={{ margin: '8px 0 16px', fontSize: 14 }}>{update.releaseNotes}</p>
        )}
        <button
          onClick={() => Browser.open({ url: update.apkUrl })}
          style={{ width: '100%', padding: '12px 0', border: 'none', borderRadius: 8,
                   background: '#0095f6', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          Update Now
        </button>
        {!update.mandatory && (
          <button
            onClick={() => setUpdate(null)}
            style={{ width: '100%', padding: '12px 0', marginTop: 8, border: 'none',
                     background: 'none', color: '#737373', fontSize: 14, cursor: 'pointer' }}
          >
            Later
          </button>
        )}
      </div>
    </div>
  );
}