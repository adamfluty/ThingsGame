import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { socket } from '../lib/socket';

export function useAutoJoin() {
  const [params] = useSearchParams();
  const roomCode = useGameStore(state => state.roomCode);
  const joinRoom = useGameStore(state => state.joinRoom);
  const autoJoinAttemptedRef = useRef(false);

  useEffect(() => {
    const code = (params.get('room') || '').toUpperCase().trim();
    
    if (code && !roomCode && !autoJoinAttemptedRef.current) {
      const attemptAutoJoin = async () => {
        autoJoinAttemptedRef.current = true;
        
        try {
          const result = await joinRoom(code, { method: 'manual' });
          if (!result.ok) {
            alert('Room not found');
          }
        } catch (error) {
          console.error('Auto-join failed:', error);
        }
        
        // Clean the URL parameter after attempting
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
        } catch (error) {
          console.error('Failed to clean URL:', error);
        }
      };

      if ((socket as any).connected) {
        attemptAutoJoin();
      } else {
        const onConnect = () => {
          (socket as any).off('connect', onConnect);
          attemptAutoJoin();
        };
        (socket as any).on('connect', onConnect);
      }
    }
  }, [params, roomCode, joinRoom]);
}
