import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export const useSocket = (isAuthenticated) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
    });

    const socket = socketRef.current;

    socket.on('leave:newRequest', ({ leave }) => {
      toast(`New leave request from ${leave.employee?.name}`, { icon: '📋' });
    });

    socket.on('leave:approved', () => {
      toast.success('Your leave has been approved!');
    });

    socket.on('leave:rejected', ({ comments }) => {
      toast.error(`Leave rejected: ${comments}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  return socketRef;
};
