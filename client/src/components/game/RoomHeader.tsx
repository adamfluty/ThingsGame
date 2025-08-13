import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui';
import { QRModal } from './QRModal';

interface RoomHeaderProps {
  showDeleteButton?: boolean;
  showEditButton?: boolean;
}

export function RoomHeader({ showDeleteButton = true, showEditButton = false }: RoomHeaderProps) {
  const navigate = useNavigate();
  const roomCode = useGameStore(state => state.roomCode);
  const deleteRoom = useGameStore(state => state.deleteRoom);
  const joinRoom = useGameStore(state => state.joinRoom);
  
  const [showQR, setShowQR] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  if (!roomCode) return null;

  const handleDeleteRoom = async () => {
    if (!confirm('Delete room?')) return;
    
    const result = await deleteRoom();
    if ((result as any)?.ok) {
      navigate('/host', { replace: true });
    }
  };

  const handleJoinNewRoom = async () => {
    setBusy(true);
    try {
      const result = await joinRoom(draft.trim().toUpperCase());
      if (!(result as any)?.ok) {
        alert('Room not found');
      } else {
        setEditing(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await handleJoinNewRoom();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center text-center">
        <div className="text-xs uppercase tracking-[0.2em] opacity-70 leading-tight">
          Room
        </div>
        <div className="mt-1 inline-flex items-center room-banner font-display text-base leading-none px-2">
          <span className="mr-1">{roomCode}</span>
          
          {showDeleteButton && (
            <button
              className="p-0 m-0 ml-0.5 text-base-content/70 hover:text-error/80 active:text-error bg-transparent border-0 focus:outline-none transition-colors"
              title="Delete room"
              onClick={handleDeleteRoom}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {showEditButton && !editing && (
            <button
              className="p-0 m-0 ml-0.5 text-base-content/70 hover:text-primary bg-transparent border-0 focus:outline-none transition-colors"
              title="Change room"
              onClick={() => { setDraft(''); setEditing(true); }}
            >
              ✏️
            </button>
          )}
        </div>
      </div>
      
      <Button 
        variant="secondary" 
        size="xs" 
        shape="circle"
        className="self-center"
        title="Show QR / Share"
        onClick={() => setShowQR(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 7.5L12 3m0 0l4.5 4.5M12 3v12" />
        </svg>
      </Button>
      
      {editing && (
        <div className="flex items-center gap-2">
          <input
            className="input input-bordered input-sm rounded-xl w-24"
            value={draft}
            onChange={e => setDraft(e.target.value.toUpperCase())}
            placeholder="New code"
            maxLength={8}
            onKeyDown={handleKeyDown}
          />
          <Button variant="accent" size="sm" disabled={busy} onClick={handleJoinNewRoom}>
            Go
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      )}
      
      {showQR && <QRModal roomCode={roomCode} onClose={() => setShowQR(false)} />}
    </div>
  );
}
