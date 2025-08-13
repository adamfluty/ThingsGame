import { io } from 'socket.io-client';
// Vite's import.meta.env types may not be available at type-check time; use string indexer
const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
export const socket = io(backendUrl, { transports: ['websocket'] });


