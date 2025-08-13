import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { ThemeToggle, Button, Input } from '../components/ui';
import { Captcha } from '../components/game';
import { useAutoJoin } from '../hooks';
import { socket } from '../lib/socket';
import type { UserRole } from '../types';

interface RoomGatePageProps {
  role: UserRole;
}

export function RoomGatePage({ role }: RoomGatePageProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  
  const [roomInput, setRoomInput] = useState<string>(() => 
    (params.get('room') || localStorage.getItem('roomCode') || '').toUpperCase()
  );
  const [busy, setBusy] = useState<boolean>(false);
  
  // Captcha state for hosts
  const [captchaA, captchaB] = React.useMemo(() => {
    const x = Math.floor(Math.random() * 5) + 3;
    const y = Math.floor(Math.random() * 5) + 2;
    return [x, y];
  }, []);
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  
  // Refs for focus management
  const roomInputRef = useRef<HTMLInputElement | null>(null);
  const captchaInputRef = useRef<HTMLInputElement | null>(null);
  const autoJoinAttemptedRef = useRef(false);
  
  // Store actions
  const setRole = useGameStore(state => state.setRole);
  const joinRoom = useGameStore(state => state.joinRoom);
  const createRoom = useGameStore(state => state.createRoom);
  const roomCode = useGameStore(state => state.roomCode);
  
  // Set role when component mounts
  useEffect(() => {
    if (role) {
      setRole(role);
    }
  }, [role, setRole]);
  
  // Navigate to appropriate page when room is joined
  useEffect(() => {
    if (roomCode) {
      if (role === 'host') {
        navigate('/game');
      } else {
        navigate('/play');
      }
    }
  }, [roomCode, role, navigate]);
  
  // Clear room input if player was removed from room
  useEffect(() => {
    if (role === 'player' && !roomCode) {
      setRoomInput('');
    }
  }, [role, roomCode]);
  
  // Auto-join for players with room code in URL
  useEffect(() => {
    const code = (params.get('room') || '').toUpperCase().trim();
    
    if (role === 'player' && code && !roomCode && !autoJoinAttemptedRef.current) {
      const attemptAutoJoin = async () => {
        autoJoinAttemptedRef.current = true;
        setBusy(true);
        
        try {
          const result = await joinRoom(code, { method: 'manual' });
          if (!result.ok) {
            alert('Room not found');
          }
        } finally {
          setBusy(false);
        }
        
        // Clean the URL parameter after attempting
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('room');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
        } catch {}
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
  }, [params, role, roomCode, joinRoom]);
  
  const handleSubmit = async () => {
    const code = roomInput.trim().toUpperCase();
    if (!code || code.length < 3) return;
    
    // Validate captcha for hosts
    if (role === 'host') {
      const isCaptchaValid = Number(captchaValue) === (captchaA + captchaB);
      if (!isCaptchaValid) {
        setCaptchaError('Try again');
        return;
      }
      setCaptchaError('');
    }
    
    setBusy(true);
    
    try {
      if (role === 'host') {
        const result = await createRoom(code);
        if (!result.ok) {
          if (result.error === 'exists') {
            // If room exists, join it as host
            const joinResult = await joinRoom(code);
            if (!joinResult.ok) {
              alert('Could not join existing room');
            }
          } else {
            alert('Error creating room');
          }
        }
      } else {
        const result = await joinRoom(code);
        if (!result.ok) {
          alert('Room not found');
        }
      }
    } finally {
      setBusy(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      // Handle tab navigation for hosts with captcha
      if (role === 'host' && !e.shiftKey) {
        e.preventDefault();
        captchaInputRef.current?.focus();
        return;
      }
    }
    
    if (e.key === 'Enter') {
      const code = roomInput.trim();
      if (role === 'host') {
        if (!code) return;
        if (!captchaValue.trim()) {
          e.preventDefault();
          captchaInputRef.current?.focus();
          return;
        }
      }
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handleCaptchaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      // Cycle focus back to room input on tab from captcha
      if (!e.shiftKey) {
        e.preventDefault();
        roomInputRef.current?.focus();
        return;
      }
    }
    
    if (e.key === 'Enter') {
      if (!roomInput.trim()) {
        e.preventDefault();
        roomInputRef.current?.focus();
        return;
      }
      e.preventDefault();
      handleSubmit();
    }
  };

  const requiresCaptcha = role === 'host';

  return (
    <div className="min-h-[calc(100vh-0px)] fun-bg px-4 py-4">
      <div className="max-w-lg mx-auto space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold tracking-tight font-display">
            <span className="text-primary">Fluty</span>{' '}
            <span className="text-secondary">Things</span> 🎲
          </h1>
          <ThemeToggle />
        </div>
        
        <div className="glass-card p-3">
          <div className="text-sm uppercase tracking-[0.2em] opacity-70">
            {role === 'host' ? 'Create or Resume a Room' : 'Join a Room'}
          </div>
          
          {requiresCaptcha ? (
            <div className="mt-1">
              <Input
                ref={roomInputRef}
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Enter room code (up to 8 characters)"
                className="rounded-2xl h-12 min-h-12"
                containerClassName="w-full min-w-0"
                maxLength={8}
                onKeyDown={handleKeyDown}
              />
              <div className="mt-2 grid grid-cols-[auto,1fr,1fr] items-stretch gap-2">
                <div className="font-display text-base self-center whitespace-nowrap">{captchaA} + {captchaB} =</div>
                <Input
                  ref={captchaInputRef}
                  className="rounded-xl h-12 min-h-12 text-left"
                  containerClassName="w-full min-w-0"
                  value={captchaValue}
                  onChange={e => setCaptchaValue(e.target.value)}
                  onKeyDown={handleCaptchaKeyDown}
                />
                <Button
                  variant="accent"
                  className="rounded-2xl w-full h-12 min-h-12"
                  disabled={busy}
                  onClick={handleSubmit}
                >
                  GO!
                </Button>
              </div>
              {captchaError && (
                <div className="text-error text-xs mt-1">{captchaError}</div>
              )}
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2 overflow-x-hidden">
              <Input
                ref={roomInputRef}
                value={roomInput}
                onChange={e => setRoomInput(e.target.value.toUpperCase())}
                placeholder={'Enter room code'}
                className="rounded-2xl h-12 min-h-12"
                containerClassName="flex-1 min-w-0"
                maxLength={8}
                onKeyDown={handleKeyDown}
              />
              <Button
                variant="accent"
                className="rounded-2xl shrink-0 h-12 min-h-12"
                disabled={busy}
                onClick={handleSubmit}
              >
                Join
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
