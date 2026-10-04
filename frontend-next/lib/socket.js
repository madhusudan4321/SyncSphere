'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth-context';
import { SOCKET_URL } from './utils';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?._id) return;

    const token = localStorage.getItem('pic_token');
    if (!token) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    s.on('connect', () => {
      s.emit('user:online', user._id);
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current = s;
    setSocket(s);

    // Heartbeat ping every 9 minutes
    const pingInterval = setInterval(() => {
      if (s.connected) s.emit('ping');
    }, 9 * 60 * 1000);

    return () => {
      clearInterval(pingInterval);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
