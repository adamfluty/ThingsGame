import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useConfirmAction } from '../../hooks';
import { Button, Badge } from '../ui';
import type { Player } from '../../types';

interface PlayerListProps {
  sortMode: 'score' | 'play';
  onSortModeChange: (mode: 'score' | 'play') => void;
  endRoundPhase: string;
  playerAwardMap: Map<string, number>;
  playerColorMap: Map<string, 'gold' | 'green'>;
  voterAwardSet: Set<string>;
}

export function PlayerList({
  sortMode,
  onSortModeChange,
  endRoundPhase,
  playerAwardMap,
  playerColorMap,
  voterAwardSet
}: PlayerListProps) {
  const gameState = useGameStore();
  const scoreDelta = useGameStore(state => state.scoreDelta);
  const adminEditPlayers = useGameStore(state => state.adminEditPlayers);
  const adminRemovePlayer = useGameStore(state => state.adminRemovePlayer);
  const randomizePlayOrder = useGameStore(state => state.randomizePlayOrder);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reorderIds, setReorderIds] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  
  const { isConfirming, beginConfirm, executeAction } = useConfirmAction();

  // Sorted players
  const players = useMemo(() => {
    const playerArray = [...gameState.players];
    if (sortMode === 'score') {
      return playerArray.sort((a, b) => 
        b.score - a.score || Number(b.active) - Number(a.active)
      );
    }
    const orderMap = new Map(gameState.playOrder.map((id, idx) => [id, idx]));
    return playerArray.sort((a, b) => 
      (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity)
    );
  }, [gameState.players, gameState.playOrder, sortMode]);

  // Local reorder state for drag-and-drop
  React.useEffect(() => {
    if (sortMode === 'play' && !gameState.lockAnswers) {
      setReorderIds(gameState.playOrder.slice());
    } else {
      setReorderIds([]);
    }
  }, [gameState.playOrder, sortMode, gameState.lockAnswers]);

  const displayedPlayers = useMemo(() => {
    if (sortMode === 'play' && reorderIds.length > 0) {
      const playerMap = new Map(gameState.players.map(p => [p.id, p]));
      return reorderIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];
    }
    return players;
  }, [players, reorderIds, sortMode, gameState.players]);

  // Drag and drop handlers
  const canDrag = sortMode === 'play' && !gameState.lockAnswers;
  
  const handleDragStart = (id: string) => setDragId(id);
  
  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (canDrag) e.preventDefault();
  };
  
  const handleDropOn = (targetId: string) => {
    if (!canDrag || !dragId || dragId === targetId) return;
    
    const order = reorderIds.length ? reorderIds.slice() : players.map(p => p.id);
    const fromIndex = order.indexOf(dragId);
    const toIndex = order.indexOf(targetId);
    
    if (fromIndex < 0 || toIndex < 0) {
      setDragId(null);
      return;
    }
    
    order.splice(toIndex, 0, ...order.splice(fromIndex, 1));
    setReorderIds(order);
    
    const updates = order.map((id, idx) => ({ id, turn: idx + 1 }));
    adminEditPlayers(updates);
    setDragId(null);
  };

  const handleNameEdit = (playerId: string, newName: string) => {
    adminEditPlayers([{ id: playerId, name: newName }]);
    setEditingId(null);
  };

  const handleRemovePlayer = (playerId: string) => {
    executeAction(playerId, () => {
      adminRemovePlayer(playerId);
    });
  };

  return (
    <div className="rounded-2xl bg-base-200/80 backdrop-blur border border-base-300 p-2 shadow-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm uppercase tracking-[0.2em] opacity-70">Players</div>
        <div className="flex items-center gap-2">
          <Button 
            size="xs" 
            variant="primary"
            className="rounded-full shadow px-1.5 py-0 min-h-0 h-5 text-xs leading-none"
            onClick={() => onSortModeChange(sortMode === 'score' ? 'play' : 'score')}
          >
            Sort: {sortMode === 'score' ? 'Score' : 'Play'}
          </Button>
          <Button 
            size="xs" 
            variant="accent"
            className="rounded-full shadow px-1.5 py-0 min-h-0 h-5 text-xs leading-none"
            onClick={randomizePlayOrder}
          >
            Shuffle
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 max-h-[65vh] overflow-auto pr-1">
        {displayedPlayers.map((player, index) => {
          const suppressTurn = endRoundPhase !== 'idle';
          const turnClass = (!suppressTurn && gameState.currentTurnPlayerId === player.id) 
            ? 'border-success ring-2 ring-success/40' 
            : 'border-base-300';
          
          const award = playerAwardMap.get(player.id);
          const color = playerColorMap.get(player.id);
          const isVoter = voterAwardSet.has(player.id) && endRoundPhase === 'voters';
          
          // Award highlighting
          let highlightClass = '';
          if (color === 'gold') highlightClass = `${turnClass} bg-yellow-300 text-black`;
          else if (color === 'green') highlightClass = `${turnClass} bg-green-300 text-black`;
          else if (award === 2) highlightClass = `${turnClass} bg-yellow-300 text-black`;
          else if (award === 1) highlightClass = `${turnClass} bg-green-300 text-black`;
          else if (isVoter) highlightClass = `${turnClass} bg-accent text-accent-content`;
          else highlightClass = turnClass;

          const hasActiveAnswer = !!(player.answer && (player as any).answerActive !== false);
          const statusButtonVariant = isConfirming(player.id) 
            ? 'error' 
            : (hasActiveAnswer ? 'success' : 'ghost');
          const statusSymbol = isConfirming(player.id) 
            ? '✗' 
            : (hasActiveAnswer ? '✓' : '✗');

          return (
            <div
              key={player.id}
              className={`rounded-xl border py-1 px-2 flex items-center gap-2 ${highlightClass}`}
              draggable={canDrag}
              onDragStart={() => handleDragStart(player.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOn(player.id)}
            >
              <Button
                variant={statusButtonVariant}
                size="sm"
                shape="circle"
                title={isConfirming(player.id) 
                  ? 'Click to remove player' 
                  : (hasActiveAnswer ? 'Answer received' : 'No answer')
                }
                onClick={() => 
                  isConfirming(player.id) 
                    ? handleRemovePlayer(player.id) 
                    : beginConfirm(player.id)
                }
              >
                {statusSymbol}
              </Button>
              
              <div className="flex-1 min-w-0">
                {editingId === player.id ? (
                  <input
                    className={`input input-bordered input-xs w-full ${
                      !player.answer ? 'text-error' : ''
                    }`}
                    defaultValue={player.name}
                    autoFocus
                    onBlur={e => handleNameEdit(player.id, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                  />
                ) : (
                  <div
                    className={`font-display text-lg ${
                      voterAwardSet.has(player.id) && endRoundPhase === 'voters' 
                        ? 'text-accent' 
                        : ''
                    }`}
                    title="Double-click to edit"
                    onDoubleClick={() => setEditingId(player.id)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{player.name || '(unnamed)'}</span>
                      <span className="text-base opacity-70 whitespace-nowrap leading-tight">
                        🎯 {(sortMode === 'play' && reorderIds.length > 0) ? (index + 1) : player.turn}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 min-h-[2rem]">
                <Button 
                  variant="ghost" 
                  size="xs" 
                  className="rounded-full text-error h-6 min-h-0"
                  onClick={() => scoreDelta(player.id, -1)}
                >
                  -
                </Button>
                <span className="w-8 text-center font-bold leading-none">
                  {player.score}
                </span>
                <Button 
                  variant="ghost" 
                  size="xs" 
                  className="rounded-full text-success h-6 min-h-0"
                  onClick={() => scoreDelta(player.id, +1)}
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
