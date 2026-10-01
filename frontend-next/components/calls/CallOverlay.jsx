'use client';

import { useEffect, useRef } from 'react';
import { useCall } from '@/lib/call-context';
import Avatar from '@/components/ui/Avatar';

function formatDuration(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallOverlay() {
  const {
    callState,
    activeCall,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoMuted,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMuteAudio,
    toggleMuteVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'idle' || !activeCall) return null;

  const partner = activeCall.partner || {};
  const isVideo = activeCall.callType === 'video';

  // 1. Incoming Call Dialog / Modal
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
        <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
          <div className="relative mb-4">
            <div className="absolute -inset-3 bg-accent/20 rounded-full animate-ping opacity-75" />
            <Avatar user={partner} size={88} fontSize={28} className="relative z-10 shadow-lg" />
          </div>

          <h3 className="text-xl font-bold mb-1">{partner.username || 'Unknown User'}</h3>
          <p className="text-sm text-accent font-medium mb-8 flex items-center gap-1.5">
            {isVideo ? (
              <>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
                Incoming Video Call...
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                Incoming Voice Call...
              </>
            )}
          </p>

          <div className="flex items-center gap-8 w-full justify-center">
            {/* Decline Button */}
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-danger text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
              title="Decline"
            >
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
            </button>

            {/* Accept Button */}
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform animate-bounce"
              title="Accept"
            >
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Calling / Connected Screen
  return (
    <div className="fixed inset-0 z-[1000] bg-gray-950 flex flex-col justify-between overflow-hidden">
      {/* Background / Remote Video Container */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {isVideo && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar user={partner} size={110} fontSize={36} className="shadow-2xl border-4 border-surface" />
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{partner.username || 'User'}</h2>
              <p className="text-sm text-gray-400">
                {callState === 'calling'
                  ? 'Calling...'
                  : isVideo
                  ? 'Video Call'
                  : `Voice Call • ${formatDuration(callDuration)}`}
              </p>
            </div>
          </div>
        )}

        {/* Local PIP Video (for Video Calls) */}
        {isVideo && (
          <div className="absolute top-5 right-5 w-32 h-44 bg-gray-900 border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : ''}`}
            />
            {isVideoMuted && (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-xs">
                Camera Off
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Bar */}
      <div className="relative z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <Avatar user={partner} size={36} fontSize={14} />
          <div>
            <p className="text-white text-sm font-semibold">{partner.username}</p>
            <p className="text-white/60 text-xs">
              {callState === 'calling' ? 'Calling...' : formatDuration(callDuration)}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="relative z-10 p-6 flex items-center justify-center gap-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        {/* Mute Mic */}
        <button
          onClick={toggleMuteAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
            isAudioMuted ? 'bg-danger text-white' : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isAudioMuted ? (
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.27-1.48.42-2.31.42-3.32 0-6-2.68-6-6H4c0 3.87 2.8 7.09 6.5 7.78V21h3v-2.22c.87-.16 1.7-.46 2.45-.88l2.78 2.78 1.27-1.27L4.27 3z" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>

        {/* Mute Video (if video call) */}
        {isVideo && (
          <button
            onClick={toggleMuteVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              isVideoMuted ? 'bg-danger text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoMuted ? (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l12.11 12.11.07-.06V16.5l4 4v-14zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18l2.18 2.18 1.27-1.27L3.27 2z" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            )}
          </button>
        )}

        {/* End Call Button */}
        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-danger text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-transform"
          title="End Call"
        >
          <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
