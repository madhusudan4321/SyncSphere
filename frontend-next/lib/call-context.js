'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSocket } from '@/lib/socket';
import { useToast } from '@/components/ui/Toast';

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function CallProvider({ children }) {
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'incoming' | 'connected' | 'ended'
  const [activeCall, setActiveCall] = useState(null); // { callId, partner, callType, isCaller }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef(null);
  const timerRef = useRef(null);
  const ringtoneRef = useRef(null);

  const { user } = useAuth();
  const socket = useSocket();
  const { showToast } = useToast();

  // Helper to cleanup peer connection and streams
  const cleanupCall = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setCallState('idle');
    setActiveCall(null);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    setCallDuration(0);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  }, [localStream]);

  // Create RTCPeerConnection
  const createPeerConnection = useCallback((callId, partnerId) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:iceCandidate', {
          callId,
          to: partnerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupCall();
      }
    };

    return pc;
  }, [socket, cleanupCall]);

  // Handle incoming socket events for calls
  useEffect(() => {
    if (!socket || !user) return;

    const onIncoming = ({ callId, from, callType }) => {
      if (callState !== 'idle') {
        socket.emit('call:busy', { callId, to: from });
        return;
      }
      setActiveCall({
        callId,
        partner: { _id: from, username: from.username || 'User' },
        callType,
        isCaller: false,
      });
      setCallState('incoming');

      // Send ringing back
      socket.emit('call:ringing', { callId, to: from });
    };

    const onRinging = () => {
      if (callState === 'calling') {
        showToast('Ringing...');
      }
    };

    const onAccepted = async ({ callId }) => {
      setCallState('connected');
      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);

      // Caller creates SDP offer
      if (activeCall?.isCaller && pcRef.current) {
        try {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socket.emit('call:offer', { callId, to: activeCall.partner._id, offer });
        } catch (err) {
          console.error('Offer creation error:', err);
        }
      }
    };

    const onRejected = () => {
      showToast('Call declined');
      cleanupCall();
    };

    const onMissed = () => {
      showToast('Call missed');
      cleanupCall();
    };

    const onBusy = () => {
      showToast('User is busy on another call');
      cleanupCall();
    };

    const onOffer = async ({ callId, offer, from }) => {
      if (!pcRef.current) {
        const pc = createPeerConnection(callId, from);
        if (localStream) {
          localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }
      }
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socket.emit('call:answer', { callId, to: from, answer });
      } catch (err) {
        console.error('Answer creation error:', err);
      }
    };

    const onAnswer = async ({ answer }) => {
      if (pcRef.current && pcRef.current.signalingState !== 'stable') {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Set remote description error:', err);
        }
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Add ICE candidate error:', err);
        }
      }
    };

    const onEnded = () => {
      showToast('Call ended');
      cleanupCall();
    };

    const onError = ({ message }) => {
      showToast(message || 'Call error');
      cleanupCall();
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:ringing', onRinging);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:missed', onMissed);
    socket.on('call:busy', onBusy);
    socket.on('call:offer', onOffer);
    socket.on('call:answer', onAnswer);
    socket.on('call:iceCandidate', onIceCandidate);
    socket.on('call:ended', onEnded);
    socket.on('call:error', onError);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:ringing', onRinging);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:missed', onMissed);
      socket.off('call:busy', onBusy);
      socket.off('call:offer', onOffer);
      socket.off('call:answer', onAnswer);
      socket.off('call:iceCandidate', onIceCandidate);
      socket.off('call:ended', onEnded);
      socket.off('call:error', onError);
    };
  }, [socket, user, callState, activeCall, localStream, createPeerConnection, cleanupCall, showToast]);

  // Initiate call
  const startCall = async (partner, callType = 'video') => {
    if (!partner?._id) return;
    if (callState !== 'idle') {
      showToast('Already in a call');
      return;
    }

    const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    try {
      // Get media stream
      const constraints = {
        audio: true,
        video: callType === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      setActiveCall({
        callId,
        partner,
        callType,
        isCaller: true,
      });
      setCallState('calling');

      const pc = createPeerConnection(callId, partner._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      socket.emit('call:start', {
        callId,
        to: partner._id,
        callType,
      });
    } catch (err) {
      showToast('Failed to access camera/microphone');
      cleanupCall();
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!activeCall || callState !== 'incoming') return;

    try {
      const constraints = {
        audio: true,
        video: activeCall.callType === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = createPeerConnection(activeCall.callId, activeCall.partner._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      socket.emit('call:accepted', {
        callId: activeCall.callId,
        to: activeCall.partner._id,
      });

      setCallState('connected');
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      showToast('Failed to access media devices');
      rejectCall();
    }
  };

  // Reject incoming call
  const rejectCall = () => {
    if (activeCall && socket) {
      socket.emit('call:rejected', {
        callId: activeCall.callId,
        to: activeCall.partner._id,
      });
    }
    cleanupCall();
  };

  // End active call
  const endCall = () => {
    if (activeCall && socket) {
      socket.emit('call:ended', {
        callId: activeCall.callId,
        to: activeCall.partner._id,
      });
    }
    cleanupCall();
  };

  // Toggle Mute Audio
  const toggleMuteAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Mute Video
  const toggleMuteVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        activeCall,
        localStream,
        remoteStream,
        isAudioMuted,
        isVideoMuted,
        callDuration,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMuteAudio,
        toggleMuteVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
