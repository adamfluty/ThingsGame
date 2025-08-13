import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

export type Player = { id: string; name: string; nameLocked: boolean; score: number; active: boolean; turn: number; answer?: string; answerActive?: boolean };
export type SuggestionVote = { playerId: string; emoji: 'laugh' | 'love' | 'hundred' };
export type PromptSuggestion = { id: string; text: string; authorId: string; authorName: string; votes: SuggestionVote[] };
export type AnswerVotesEntry = { answer: string; votes: SuggestionVote[] };
export type GameState = { roomId?: string; players: Player[]; answers: Player[]; showAnswers: boolean; lockAnswers: boolean; currentTurnPlayerId: string | null; totals: { totalPlayers: number; totalAnswers: number }; playOrder: string[]; prompt: string; suggestions: PromptSuggestion[]; answerVotes: AnswerVotesEntry[] };

// --- Multi-room support ---
type RoomState = {
  id: string;
  code: string;
  players: Map<string, Player>;
  lockAnswers: boolean;
  showAnswers: boolean;
  playOrder: string[];
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  nextRoundStartPlayerId: string | null;
  prompt: string;
  suggestions: PromptSuggestion[];
  answerVotes: AnswerVotesEntry[];
  lastLockAt: number; // used for inactivity auto-delete
};

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(code: string): RoomState {
  const roomCode = code.trim().toUpperCase();
  let room = rooms.get(roomCode);
  if (!room) {
    room = {
      id: (crypto as any).randomUUID ? (crypto as any).randomUUID() : crypto.randomBytes(16).toString('hex'),
      code: roomCode,
      players: new Map<string, Player>(),
      lockAnswers: false,
      showAnswers: false,
      playOrder: [],
      currentTurnIndex: -1,
      currentTurnPlayerId: null,
      nextRoundStartPlayerId: null,
      prompt: '',
      suggestions: [],
      answerVotes: [],
      lastLockAt: Date.now(),
    };
    rooms.set(roomCode, room);
  }
  return room;
}

function rGetPlayersArray(room: RoomState): Player[] { return Array.from(room.players.values()); }
function rGetAnswersArray(room: RoomState): Player[] { return rGetPlayersArray(room).filter(p => p.name && p.answer && p.answer.trim().length > 0); }
function rEnsurePlayer(room: RoomState, id: string): Player { let p = room.players.get(id); if (!p) { p = { id, name: '', nameLocked: false, score: 0, active: true, turn: 0, answer: undefined, answerActive: true }; room.players.set(id, p); } if (p.answerActive === undefined) p.answerActive = true; if (p.nameLocked === undefined) p.nameLocked = !!p.name; return p; }
function rRemovePlayerById(room: RoomState, id: string): void { room.players.delete(id); }
function rRecalcPlayOrder(room: RoomState): void { const arr = rGetPlayersArray(room).filter(p => p.name); arr.sort((a, b) => a.turn - b.turn || a.name.localeCompare(b.name)); room.playOrder = arr.map(p => p.id); }
function rAdvanceTurn(room: RoomState): void {
  if (room.playOrder.length === 0) { room.currentTurnIndex = -1; room.currentTurnPlayerId = null; return; }
  const anyEligible = room.playOrder.some(id => {
    const p = room.players.get(id);
    return !!(p && p.active && p.answer && p.answer.trim().length > 0 && p.answerActive !== false);
  });
  if (!anyEligible) { return; }
  let nextIndex = room.currentTurnIndex;
  for (let i = 0; i < room.playOrder.length; i++) {
    nextIndex = (nextIndex + 1) % room.playOrder.length;
    const candidate = room.players.get(room.playOrder[nextIndex]);
    if (candidate && candidate.active && candidate.answer && candidate.answer.trim().length > 0 && candidate.answerActive !== false) {
      room.currentTurnIndex = nextIndex;
      room.currentTurnPlayerId = candidate.id;
      return;
    }
  }
}
function rRandomizePlayOrder(room: RoomState): void { const arr = rGetPlayersArray(room).filter(p => p.name); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } arr.forEach((p, idx) => (p.turn = idx + 1)); room.playOrder = arr.map(p => p.id); room.currentTurnIndex = -1; rAdvanceTurn(room); }
function rTotals(room: RoomState) { const pl = rGetPlayersArray(room).filter(p => p.name); const ans = pl.filter(p => p.answer && p.answer.trim().length > 0); return { totalPlayers: pl.length, totalAnswers: ans.length }; }
function emitRoomState(io: Server, room: RoomState) {
  const state: GameState = {
    roomId: room.id,
    players: rGetPlayersArray(room),
    answers: rGetAnswersArray(room).sort((a,b)=> (a.answer! < b.answer! ? -1 : 1)),
    showAnswers: room.showAnswers,
    lockAnswers: room.lockAnswers,
    currentTurnPlayerId: room.currentTurnPlayerId,
    totals: rTotals(room),
    playOrder: room.playOrder.slice(),
    prompt: room.prompt,
    suggestions: room.suggestions.slice(),
    answerVotes: room.answerVotes.map(av => ({ answer: av.answer, votes: av.votes.slice() })),
  };
  io.to(room.code).emit('state', state);
}

// --- Legacy single-room globals kept for back-compat but unused with multi-room ---
const players = new Map<string, Player>();
let lockAnswers = false;
let showAnswers = false;
let playOrder: string[] = [];
let currentTurnIndex = -1;
let currentTurnPlayerId: string | null = null;
// Remember who should start the next round
let nextRoundStartPlayerId: string | null = null;
let prompt = '';
let suggestions: PromptSuggestion[] = [];
let answerVotes: AnswerVotesEntry[] = [];

function getPlayersArray(): Player[] { return Array.from(players.values()); }
function getAnswersArray(): Player[] { return getPlayersArray().filter(p => p.name && p.answer && p.answer.trim().length > 0); }
function ensurePlayer(id: string): Player { let p = players.get(id); if (!p) { p = { id, name: '', nameLocked: false, score: 0, active: true, turn: 0, answer: undefined, answerActive: true }; players.set(id, p); } if (p.answerActive === undefined) p.answerActive = true; if (p.nameLocked === undefined) p.nameLocked = !!p.name; return p; }
function removePlayerById(id: string): void { players.delete(id); }
function recalcPlayOrder(): void { const arr = getPlayersArray().filter(p => p.name); arr.sort((a, b) => a.turn - b.turn || a.name.localeCompare(b.name)); playOrder = arr.map(p => p.id); }
function advanceTurn(): void {
  if (playOrder.length === 0) { currentTurnIndex = -1; currentTurnPlayerId = null; return; }
  // Only consider players who are active, have an answer, and the answer is still in play
  const anyEligible = playOrder.some(id => {
    const p = players.get(id);
    return !!(p && p.active && p.answer && p.answer.trim().length > 0 && p.answerActive !== false);
  });
  if (!anyEligible) { return; }
  let nextIndex = currentTurnIndex;
  for (let i = 0; i < playOrder.length; i++) {
    nextIndex = (nextIndex + 1) % playOrder.length;
    const candidate = players.get(playOrder[nextIndex]);
    if (
      candidate &&
      candidate.active &&
      candidate.answer &&
      candidate.answer.trim().length > 0 &&
      candidate.answerActive !== false
    ) {
      currentTurnIndex = nextIndex;
      currentTurnPlayerId = candidate.id;
      return;
    }
  }
}
function randomizePlayOrder(): void { const arr = getPlayersArray().filter(p => p.name); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } arr.forEach((p, idx) => (p.turn = idx + 1)); playOrder = arr.map(p => p.id); currentTurnIndex = -1; advanceTurn(); }
function totals() { const pl = getPlayersArray().filter(p => p.name); const ans = pl.filter(p => p.answer && p.answer.trim().length > 0); return { totalPlayers: pl.length, totalAnswers: ans.length }; }
function emitState(io: Server) { const state: GameState = { players: getPlayersArray(), answers: getAnswersArray().sort((a,b)=> (a.answer! < b.answer! ? -1 : 1)), showAnswers, lockAnswers, currentTurnPlayerId, totals: totals(), playOrder: playOrder.slice(), prompt, suggestions: suggestions.slice(), answerVotes: answerVotes.map(av => ({ answer: av.answer, votes: av.votes.slice() })) }; io.emit('state', state); }

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

function isSocketAuthed(_socket: any): boolean { return true; }

// Auth endpoint
app.post('/api/login', (_req, res) => { return res.json({ ok: true }); });

io.on('connection', (socket) => {
  // annotate
  socket.data.roomCode = undefined as undefined | string;
  socket.data.role = undefined as undefined | 'host' | 'player';

  // room lifecycle
  socket.on('createRoom', ({ roomCode, role }: { roomCode: string; role?: 'host'|'player' }, ack?: (res: { ok: boolean; error?: string })=>void) => {
    const code = String(roomCode || '').trim().toUpperCase();
    if (!code) { ack?.({ ok:false, error:'invalid' }); return; }
    if (rooms.has(code)) { ack?.({ ok:false, error:'exists' }); return; }
    const room = getOrCreateRoom(code);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = role || 'host';
    emitRoomState(io, room);
    ack?.({ ok:true });
  });
  socket.on('joinRoom', (
    { roomCode, role, lastRoomId, method }: { roomCode: string; role?: 'host'|'player'; lastRoomId?: string; method?: 'manual'|'auto'|'host' },
    ack?: (res: { ok: boolean; error?: string })=>void
  ) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!code || !room) { ack?.({ ok:false, error:'not_found' }); return; }
    // Guard against unintended auto-rejoins when a room code is reused
    const r = role || 'player';
    const m: 'manual'|'auto'|'host' = method || 'auto';
    // For players: if this is not an explicit manual join, require that the
    // client proves knowledge of the current instance via lastRoomId match.
    if (r === 'player' && m !== 'manual') {
      if (!lastRoomId || lastRoomId !== room.id) {
        ack?.({ ok:false, error:'room_reused' });
        return;
      }
    }
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = r;
    // Proactively emit up-to-date state so new joiners always get the latest prompt and data
    emitRoomState(io, room);
    ack?.({ ok:true });
  });
  socket.on('deleteRoom', (_payload: {}, ack?: (res: { ok: boolean; error?: string })=>void) => {
    const code: string | undefined = socket.data.roomCode;
    if (!code) { ack?.({ ok:false, error:'no_room' }); return; }
    const room = rooms.get(code);
    if (!room) { ack?.({ ok:false, error:'not_found' }); return; }
    if (socket.data.role !== 'host') { ack?.({ ok:false, error:'forbidden' }); return; }
    io.to(code).emit('roomDeleted', { roomCode: code });
    rooms.delete(code);
    for (const s of io.sockets.sockets.values()) {
      if ((s as any).rooms && (s as any).rooms.has(code)) {
        s.leave(code);
        if (s.data && s.data.roomCode === code) s.data.roomCode = undefined;
      }
    }
    ack?.({ ok:true });
  });

  socket.on('submitAnswer', ({ clientId, name, answer }: { clientId: string; name?: string; answer?: string }) => {
    const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return;
    const p = rEnsurePlayer(room, clientId);
    if (typeof name === 'string' && name.length > 0) {
      if (!p.nameLocked) {
        const firstNaming = !p.name;
        if (p.name !== name) {
          p.name = name;
          p.nameLocked = true;
          if (firstNaming) { p.turn = Math.max(0, ...rGetPlayersArray(room).map(pp => pp.turn)) + 1; rRecalcPlayOrder(room); }
        }
      }
    }
    if (typeof answer === 'string') { if (!room.lockAnswers) { p.answer = answer; p.answerActive = true; } }
    emitRoomState(io, room);
  });

  socket.on('clearAnswers', () => {
    if (!isSocketAuthed(socket)) return; const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return;
    try {
      // Do not award points here; client triggers awards at specific animation phases via scoreDelta
      room.answerVotes = [];
    } catch {}
    room.nextRoundStartPlayerId = room.currentTurnPlayerId;
    rGetPlayersArray(room).forEach(p => { p.active = true; p.answer = undefined; p.answerActive = true; });
    room.lockAnswers = false; room.showAnswers = false; room.prompt = ''; room.currentTurnIndex = -1; room.currentTurnPlayerId = null;
    emitRoomState(io, room);
  });

  socket.on('submitPromptSuggestion', ({ clientId, text }: { clientId: string; text: string }) => {
    const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return;
    const value = String(text || '').trim(); if (!value) return;
    const p = rEnsurePlayer(room, clientId);
    const id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : crypto.randomBytes(16).toString('hex');
    room.suggestions.push({ id, text: value, authorId: p.id, authorName: p.name || 'Anonymous', votes: [] });
    emitRoomState(io, room);
  });

  socket.on('voteSuggestion', ({ clientId, suggestionId, emoji }: { clientId: string; suggestionId: string; emoji: 'laugh'|'love'|'hundred' }) => {
    const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return;
    const s = room.suggestions.find(ss => ss.id === suggestionId); if (!s) return;
    const existing = s.votes.findIndex(v => v.playerId === clientId);
    if (existing >= 0) { if (s.votes[existing].emoji === emoji) { s.votes.splice(existing, 1); } else { s.votes[existing].emoji = emoji; } } else { s.votes.push({ playerId: clientId, emoji }); }
    emitRoomState(io, room);
  });

  socket.on('removeSuggestion', ({ suggestionId }: { suggestionId: string }) => {
    const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return;
    const idx = room.suggestions.findIndex(s => s.id === suggestionId);
    if (idx >= 0) { room.suggestions.splice(idx, 1); emitRoomState(io, room); }
  });

  socket.on('voteAnswer', ({ clientId, answer, emoji }: { clientId: string; answer: string; emoji: 'laugh'|'love'|'hundred' }) => {
    const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return;
    if (!room.lockAnswers) { return; }
    const ans = String(answer || ''); if (!ans) return;
    let entry = room.answerVotes.find(av => av.answer === ans); if (!entry) { entry = { answer: ans, votes: [] }; room.answerVotes.push(entry); }
    const existing = entry.votes.findIndex(v => v.playerId === clientId);
    // Determine duplicate weight: if multiple answers share identical text, voting consumes 2 votes
    const dupCountMap = (() => {
      const m = new Map<string, number>();
      rGetAnswersArray(room).forEach(p => { const a = (p.answer || '').trim(); if (!a) return; m.set(a, (m.get(a) || 0) + 1); });
      return m;
    })();
    const weightFor = (text: string) => (dupCountMap.get(text) || 0) >= 2 ? 2 : 1;
    const currentUsed = room.answerVotes.reduce((acc, av) => acc + (av.votes.some(v => v.playerId === clientId) ? weightFor(av.answer) : 0), 0);
    if (existing >= 0) {
      // Toggle/remove or change reaction without affecting used total accounting aside from presence
      if (entry.votes[existing].emoji === emoji) { entry.votes.splice(existing, 1); } else { entry.votes[existing].emoji = emoji; }
    } else {
      const addWeight = weightFor(ans);
      if (currentUsed + addWeight > 2) { emitRoomState(io, room); return; }
      entry.votes.push({ playerId: clientId, emoji });
    }
    emitRoomState(io, room);
  });

  socket.on('toggleLock', () => {
    if (!isSocketAuthed(socket)) return; const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return;
    room.lockAnswers = !room.lockAnswers; room.showAnswers = room.lockAnswers;
    if (room.lockAnswers) {
      if (room.nextRoundStartPlayerId) { const idx = room.playOrder.indexOf(room.nextRoundStartPlayerId); room.currentTurnIndex = idx >= 0 ? (idx - 1 + room.playOrder.length) % Math.max(room.playOrder.length, 1) : -1; } else { room.currentTurnIndex = -1; }
      room.currentTurnPlayerId = null; rAdvanceTurn(room); room.nextRoundStartPlayerId = null; room.lastLockAt = Date.now();
    } else { room.currentTurnIndex = -1; room.currentTurnPlayerId = null; }
    emitRoomState(io, room);
  });

  socket.on('nextTurn', () => { if (!isSocketAuthed(socket)) return; const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; if (!room.lockAnswers) return; rAdvanceTurn(room); emitRoomState(io, room); });
  socket.on('scoreDelta', ({ playerId, delta }: { playerId: string; delta: number }) => { const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; const p = room.players.get(playerId); if (p) { p.score += Number(delta) || 0; emitRoomState(io, room); } });
  socket.on('togglePlayerActive', ({ playerId }: { playerId: string }) => { const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; const p = room.players.get(playerId); if (!p) return; const wasActive = p.active; p.active = !p.active; const becameInactive = wasActive && !p.active; if (becameInactive && room.currentTurnPlayerId) { const cur = room.players.get(room.currentTurnPlayerId); if (cur) cur.score += 1; } emitRoomState(io, room); });
  socket.on('toggleAnswerActive', ({ answerText }: { answerText: string }) => { const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; const p = rGetPlayersArray(room).find(pp => (pp.answer || '') === answerText); if (!p) return; const wasActive = p.answerActive !== false; p.answerActive = !wasActive; const becameInactive = wasActive && !p.answerActive; if (becameInactive && room.currentTurnPlayerId) { const cur = room.players.get(room.currentTurnPlayerId); if (cur) cur.score += 1; } emitRoomState(io, room); });

  socket.on('adminEditPlayers', ({ updates }: { updates: Array<{ id: string; name?: string; turn?: number }> }) => { if (!isSocketAuthed(socket)) return; const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; (updates || []).forEach(u => { const p = room.players.get(u.id); if (p) { if (typeof u.name === 'string') { p.name = u.name; } if (typeof u.turn === 'number') { p.turn = Number(u.turn) || 0; } } }); rRecalcPlayOrder(room); emitRoomState(io, room); });
  socket.on('randomizePlayOrder', () => { if (!isSocketAuthed(socket)) return; const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; rRandomizePlayOrder(room); emitRoomState(io, room); });
  socket.on('setPrompt', ({ value }: { value: string }) => { if (!isSocketAuthed(socket)) return; const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; room.prompt = String(value || ''); emitRoomState(io, room); });
  socket.on('adminRemovePlayer', ({ playerId }: { playerId: string }) => { if (!isSocketAuthed(socket)) return; const code: string | undefined = socket.data.roomCode; if (!code) return; const room = rooms.get(code); if (!room) return; const wasCurrent = room.currentTurnPlayerId === playerId; rRemovePlayerById(room, playerId); rRecalcPlayOrder(room); if (wasCurrent) { room.currentTurnIndex = -1; room.currentTurnPlayerId = null; rAdvanceTurn(room); } emitRoomState(io, room); });
});

// Serve client if it exists when launched via root start script (ESM-safe __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(path.join(__dirname, '../../client/dist'));
app.use(express.static(clientDist));
app.get('*', (_req, res) => { res.sendFile(path.join(clientDist, 'index.html')); });

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, '0.0.0.0', () => { console.log(`ThingsGame server listening on :${PORT}`); });

// --- Auto-delete inactive rooms (no activity for 1h after last lock) ---
const ONE_HOUR = 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastLockAt >= ONE_HOUR) {
      // notify clients and remove room
      io.to(code).emit('roomDeleted', { roomCode: code });
      rooms.delete(code);
      for (const s of io.sockets.sockets.values()) {
        if ((s as any).rooms && (s as any).rooms.has(code)) {
          s.leave(code);
          if (s.data && s.data.roomCode === code) s.data.roomCode = undefined;
        }
      }
    }
  }
}, 60 * 1000);

