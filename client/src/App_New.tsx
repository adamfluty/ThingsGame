import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useGameStore } from './stores/gameStore';
import { HomePage, RoomGatePage, PlayerGamePage, HostGamePage } from './pages';

function ProtectedHostGame() {
  const roomCode = useGameStore(state => state.roomCode);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!roomCode) {
      navigate('/host');
    }
  }, [roomCode, navigate]);
  
  if (!roomCode) return null;
  
  return <HostGamePage />;
}

export default function App() {
  const connect = useGameStore(state => state.connect);
  
  // Connect to socket on app start
  useEffect(() => {
    connect();
  }, [connect]);
  
  // Clear session storage when on home page
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/') {
      try {
        sessionStorage.removeItem('roomCode');
      } catch {}
    }
  }, []);
  
  // Global keyboard shortcut for advancing turns (Space key)
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (document.activeElement as HTMLElement)?.tagName !== 'INPUT') {
        useGameStore.getState().nextTurn();
      }
    };
    
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-base-100 text-base-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<PlayerGamePage />} />
          <Route path="/game" element={<ProtectedHostGame />} />
          <Route path="/host" element={<RoomGatePage role="host" />} />
          <Route path="/join" element={<RoomGatePage role="player" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
