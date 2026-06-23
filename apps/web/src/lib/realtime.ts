import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';

const SOCKET_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    socket = io(`${SOCKET_BASE_URL}/realtime`, { auth: { token: accessToken } });

    socket.on('count:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['layout-live'] });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [accessToken, queryClient]);
}
