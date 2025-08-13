import { create } from 'zustand';
import { socket } from '../lib/socket';
import type {
  GameState,
  UserRole,
  Theme,
  JoinAttempt,
  ApiResponse,
  SubmitAnswerPayload,
  SubmitPromptSuggestionPayload,
  VoteSuggestionPayload,
  RemoveSuggestionPayload,
  VoteAnswerPayload,
  PlayerUpdate,
  ScoreDeltaPayload,
  ToggleActivePayload,
  AdminEditPlayersPayload,
  AdminRemovePlayerPayload,
  SetPromptPayload
} from '../types';

interface GameStore extends GameState {
  // UI State
  theme: Theme;
  roomCode: string | null;
  role: UserRole;
  lastJoinAttempt: JoinAttempt | null;
  
  // Session flags to distinguish admin removals from fresh reloads
  _wasPresentThisSocket?: boolean;
  _lastPresenceAt?: number;
  _pendingRemovalTimer?: number | null;

  // Actions - Theme
  setTheme: (theme: Theme) => void;
  
  // Actions - Connection
  connect: () => void;
  setRole: (role: UserRole) => void;
  
  // Actions - Room Management
  createRoom: (code: string) => Promise<ApiResponse>;
  joinRoom: (code: string, opts?: { method?: 'manual' | 'auto' }) => Promise<ApiResponse>;
  deleteRoom: () => Promise<ApiResponse>;
  leaveRoomLocal: () => void;
  
  // Actions - Game Actions
  submitAnswer: (payload: SubmitAnswerPayload) => void;
  submitPromptSuggestion: (payload: SubmitPromptSuggestionPayload) => void;
  voteSuggestion: (payload: VoteSuggestionPayload) => void;
  removeSuggestion: (payload: RemoveSuggestionPayload) => void;
  voteAnswer: (payload: VoteAnswerPayload) => void;
  clearAnswers: () => void;
  toggleLock: () => void;
  nextTurn: () => void;
  scoreDelta: (playerId: string, delta: number) => void;
  togglePlayerActive: (playerId: string) => void;
  toggleAnswerActive: (answerText: string) => void;
  adminEditPlayers: (updates: PlayerUpdate[]) => void;
  adminRemovePlayer: (playerId: string) => void;
  randomizePlayOrder: () => void;
  setPrompt: (value: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial Game State
  players: [],
  answers: [],
  showAnswers: false,
  lockAnswers: false,
  currentTurnPlayerId: null,
  totals: { totalPlayers: 0, totalAnswers: 0 },
  playOrder: [],
  prompt: '',
  suggestions: [],
  answerVotes: [],
  
  // Initial UI State
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  roomCode: (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('roomCode') : null) || 
           localStorage.getItem('roomCode') || null,
  role: null,
  lastJoinAttempt: null,

  // Theme Actions
  setTheme: (theme: Theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  // Role Actions
  setRole: (role: UserRole) => {
    set({ role });
  },

  // Connection Actions
  connect: () => {
    socket.off('state');
    socket.off('roomDeleted');
    
    socket.on('state', (gameState: GameState) => {
      // Always trust server prompt; do not read from localStorage here
      set(gameState);
      
      try {
        const myId = localStorage.getItem('clientId');
        const isPresent = !!(myId && gameState.players.some(p => p.id === myId));
        const now = Date.now();
        const wasPresentThisSocket = get()._wasPresentThisSocket || false;
        
        if (isPresent) {
          // Cancel any pending removal since we see ourselves present
          const timer = get()._pendingRemovalTimer;
          if (timer) {
            try { clearTimeout(timer); } catch {}
          }
          set({ 
            _pendingRemovalTimer: null, 
            _wasPresentThisSocket: true, 
            _lastPresenceAt: now 
          });
          sessionStorage.setItem('wasPresent', '1');
        } else if (myId) {
          // Only consider absence as removal if we were previously present during this socket's lifetime
          if (wasPresentThisSocket && !get()._pendingRemovalTimer) {
            // Immediate, atomic clear for players so UI updates all at once
            localStorage.removeItem('name');
            localStorage.removeItem('nameLocked');
            try { sessionStorage.removeItem('wasPresent'); } catch {}
            
            const roleNow = get().role;
            
            // Mark this code as blocked from auto-join until a manual join happens
            try {
              const currentCode = get().roomCode;
              if (currentCode) {
                const blockKey = 'blockedRoomCodes';
                const existing: string[] = JSON.parse(localStorage.getItem(blockKey) || '[]');
                if (!existing.includes(currentCode)) {
                  existing.push(currentCode);
                  localStorage.setItem(blockKey, JSON.stringify(existing));
                }
              }
            } catch {}
            
            if (roleNow === 'player') {
              try { sessionStorage.removeItem('roomCode'); } catch {}
              set({ roomCode: null });
            }
            
            // Clear any pending timer just in case
            const timer = get()._pendingRemovalTimer;
            if (timer) {
              try { clearTimeout(timer); } catch {}
            }
            set({ _pendingRemovalTimer: null });
          }
        }
        
        // Verify room identity for players
        const code = get().roomCode;
        if (code && gameState.roomId) {
          const role = get().role;
          const roomIdMapKey = 'roomIdByCode';
          const roomIdMap: Record<string, string> = JSON.parse(
            localStorage.getItem(roomIdMapKey) || '{}'
          );
          const savedRoomId = roomIdMap[code];
          
          if (savedRoomId && savedRoomId !== gameState.roomId) {
            const joinAttempt = get().lastJoinAttempt;
            const wasManual = !!(joinAttempt && 
              joinAttempt.code === code && 
              joinAttempt.method === 'manual' && 
              (Date.now() - joinAttempt.at) < 10000);
              
            if (role === 'player') {
              if (wasManual) {
                // Allow manual join to new instance; update mapping to new id
                roomIdMap[code] = gameState.roomId;
                localStorage.setItem(roomIdMapKey, JSON.stringify(roomIdMap));
                
                // Manual join is authoritative; unblock this code for future auto-joins
                try {
                  const blockKey = 'blockedRoomCodes';
                  const existing: string[] = JSON.parse(localStorage.getItem(blockKey) || '[]');
                  const index = existing.indexOf(code);
                  if (index >= 0) {
                    existing.splice(index, 1);
                    localStorage.setItem(blockKey, JSON.stringify(existing));
                  }
                } catch {}
              } else {
                // Block auto rejoin; clear local room
                try { sessionStorage.removeItem('roomCode'); } catch {}
                set({ roomCode: null });
                
                // Also mark this code as blocked for auto-join until a manual join happens
                try {
                  const blockKey = 'blockedRoomCodes';
                  const existing: string[] = JSON.parse(localStorage.getItem(blockKey) || '[]');
                  if (!existing.includes(code)) {
                    existing.push(code);
                    localStorage.setItem(blockKey, JSON.stringify(existing));
                  }
                } catch {}
              }
            }
          } else if (!savedRoomId) {
            roomIdMap[code] = gameState.roomId;
            localStorage.setItem(roomIdMapKey, JSON.stringify(roomIdMap));
          }
          
          // When we successfully join or see valid state for this code, sync prompt cache for host only
          if (role === 'host') {
            try { 
              localStorage.setItem('prompt', gameState.prompt || ''); 
            } catch {}
          }
          
          // Additionally, if the last join was manual for this code, clear any stale block entries
          const lastJoin = get().lastJoinAttempt;
          if (lastJoin && lastJoin.code === code && lastJoin.method === 'manual' && role === 'player') {
            try {
              const blockKey = 'blockedRoomCodes';
              const existing: string[] = JSON.parse(localStorage.getItem(blockKey) || '[]');
              const index = existing.indexOf(code);
              if (index >= 0) {
                existing.splice(index, 1);
                localStorage.setItem(blockKey, JSON.stringify(existing));
              }
            } catch {}
          }
        }
      } catch {}
    });
    
    socket.on('roomDeleted', ({ roomCode }: { roomCode: string }) => {
      const current = get().roomCode;
      if (current && current === roomCode) {
        // Clear room lock for all roles
        localStorage.removeItem('roomCode');
        try { sessionStorage.removeItem('roomCode'); } catch {}
        try {
          const blockKey = 'blockedRoomCodes';
          const existing = JSON.parse(localStorage.getItem(blockKey) || '[]');
          if (!existing.includes(roomCode)) {
            existing.push(roomCode);
            localStorage.setItem(blockKey, JSON.stringify(existing));
          }
        } catch {}
        try { sessionStorage.removeItem('wasPresent'); } catch {}
        
        const timer = get()._pendingRemovalTimer;
        if (timer) {
          try { clearTimeout(timer); } catch {}
        }
        set({ _pendingRemovalTimer: null, roomCode: null });
      }
    });
    
    // Auto-rejoin per tab without global role persistence
    const roomCode = get().roomCode;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    
    if (roomCode) {
      const inferredRole: 'host' | 'player' = (path === '/game' || path === '/host') ? 'host' : 'player';
      
      // If we very recently performed a manual join to this room, skip auto-join
      const lastJoin = get().lastJoinAttempt;
      const skipAuto = !!(lastJoin && 
        lastJoin.code === roomCode && 
        lastJoin.method === 'manual' && 
        (Date.now() - lastJoin.at) < 10000);
        
      // Also skip auto-join for players if this code was explicitly blocked
      let isBlocked = false;
      try {
        const blockKey = 'blockedRoomCodes';
        const blockedCodes: string[] = JSON.parse(localStorage.getItem(blockKey) || '[]');
        isBlocked = inferredRole === 'player' && blockedCodes.includes(roomCode);
      } catch {}
      
      if (!skipAuto && !isBlocked) {
        set({ 
          role: inferredRole, 
          lastJoinAttempt: { 
            code: roomCode, 
            method: inferredRole === 'host' ? 'host' : 'auto', 
            at: Date.now() 
          } 
        });
        
        // Include lastRoomId so server can allow safe auto-join for players
        let lastRoomId: string | undefined = undefined;
        try {
          const roomIdMapKey = 'roomIdByCode';
          const roomIdMap: Record<string, string> = JSON.parse(
            localStorage.getItem(roomIdMapKey) || '{}'
          );
          lastRoomId = roomIdMap[roomCode];
        } catch {}
        
        socket.emit('joinRoom', { 
          roomCode, 
          role: inferredRole, 
          lastRoomId, 
          method: inferredRole === 'host' ? 'host' : 'auto' 
        }, (res: { ok: boolean }) => {
          if (!res?.ok) {
            if (inferredRole === 'host') {
              localStorage.removeItem('roomCode');
            } else {
              try { sessionStorage.removeItem('roomCode'); } catch {}
            }
            set({ roomCode: null });
          } else {
            // Successful auto-join. For players, only keep the session copy
            if (inferredRole === 'player') {
              try { sessionStorage.setItem('roomCode', roomCode); } catch {}
            }
          }
        });
      } else if (isBlocked && inferredRole === 'player') {
        // Ensure we do not auto-join; clear session room code
        try { sessionStorage.removeItem('roomCode'); } catch {}
        set({ roomCode: null });
      }
    }
  },

  // Room Management Actions
  createRoom: (code: string) => new Promise((resolve) => {
    const role = 'host' as const;
    set({ role });
    
    socket.emit('createRoom', { roomCode: code, role }, (res: { ok: boolean; error?: string }) => {
      if (res?.ok) {
        localStorage.setItem('roomCode', code.toUpperCase());
        set({ roomCode: code.toUpperCase() });
      }
      resolve(res || { ok: false, error: 'unknown' });
    });
  }),

  joinRoom: (code: string, opts) => new Promise((resolve) => {
    const desiredRole = (opts as any)?.as as ('host' | 'player' | undefined);
    const role = desiredRole || get().role || 'player';
    set({ role });
    
    const method = opts?.method || 'manual';
    set({ 
      lastJoinAttempt: { 
        code: code.toUpperCase(), 
        method, 
        at: Date.now() 
      } 
    });
    
    // Include last known roomId mapping for this code
    let lastRoomId: string | undefined = undefined;
    try {
      const roomIdMapKey = 'roomIdByCode';
      const roomIdMap: Record<string, string> = JSON.parse(
        localStorage.getItem(roomIdMapKey) || '{}'
      );
      lastRoomId = roomIdMap[code.toUpperCase()];
    } catch {}
    
    socket.emit('joinRoom', { 
      roomCode: code, 
      role, 
      lastRoomId, 
      method: method === 'manual' ? 'manual' : (role === 'host' ? 'host' : 'auto') 
    }, (res: { ok: boolean; error?: string }) => {
      if (res?.ok) {
        const normalizedCode = code.toUpperCase();
        if (role === 'host') {
          localStorage.setItem('roomCode', normalizedCode);
        } else {
          try { sessionStorage.setItem('roomCode', normalizedCode); } catch {}
          
          // On a successful manual player join, unblock this code for future auto-joins
          if (method === 'manual') {
            try {
              const blockKey = 'blockedRoomCodes';
              const existing: string[] = JSON.parse(localStorage.getItem(blockKey) || '[]');
              const index = existing.indexOf(normalizedCode);
              if (index >= 0) {
                existing.splice(index, 1);
                localStorage.setItem(blockKey, JSON.stringify(existing));
              }
            } catch {}
          }
        }
        set({ roomCode: normalizedCode });
      }
      resolve(res || { ok: false, error: 'unknown' });
    });
  }),

  deleteRoom: () => new Promise((resolve) => {
    socket.emit('deleteRoom', {}, (res: { ok: boolean; error?: string }) => {
      if (res?.ok) {
        localStorage.removeItem('roomCode');
        try { sessionStorage.removeItem('roomCode'); } catch {}
        set({ roomCode: null });
        resolve(res);
      } else {
        resolve(res || { ok: false, error: 'unknown' });
      }
    });
  }),

  leaveRoomLocal: () => {
    localStorage.removeItem('roomCode');
    try { sessionStorage.removeItem('roomCode'); } catch {}
    try { localStorage.removeItem('wasPresent'); } catch {}
    set({ roomCode: null });
  },

  // Game Actions
  submitAnswer: (payload: SubmitAnswerPayload) => socket.emit('submitAnswer', payload),
  submitPromptSuggestion: (payload: SubmitPromptSuggestionPayload) => socket.emit('submitPromptSuggestion', payload),
  voteSuggestion: (payload: VoteSuggestionPayload) => socket.emit('voteSuggestion', payload),
  removeSuggestion: (payload: RemoveSuggestionPayload) => socket.emit('removeSuggestion', payload),
  voteAnswer: (payload: VoteAnswerPayload) => socket.emit('voteAnswer', payload),
  clearAnswers: () => socket.emit('clearAnswers'),
  toggleLock: () => socket.emit('toggleLock'),
  nextTurn: () => socket.emit('nextTurn'),
  scoreDelta: (playerId: string, delta: number) => socket.emit('scoreDelta', { playerId, delta }),
  togglePlayerActive: (playerId: string) => socket.emit('togglePlayerActive', { playerId }),
  toggleAnswerActive: (answerText: string) => socket.emit('toggleAnswerActive', { answerText }),
  adminEditPlayers: (updates: PlayerUpdate[]) => socket.emit('adminEditPlayers', { updates }),
  adminRemovePlayer: (playerId: string) => socket.emit('adminRemovePlayer', { playerId }),
  randomizePlayOrder: () => socket.emit('randomizePlayOrder'),
  setPrompt: (value: string) => {
    set({ prompt: value });
    socket.emit('setPrompt', { value });
  },
}));
