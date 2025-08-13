import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useClientId } from './useClientId';
import type { Player } from '../types';

export function useCurrentPlayer(): Player | undefined {
  const players = useGameStore(state => state.players);
  const clientId = useClientId();
  
  return useMemo(() => 
    players.find(player => player.id === clientId), 
    [players, clientId]
  );
}
