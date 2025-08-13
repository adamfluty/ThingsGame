import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useClientId(): string {
  return useMemo(() => {
    const existing = localStorage.getItem('clientId');
    if (existing) return existing;
    
    const id = uuidv4();
    localStorage.setItem('clientId', id);
    return id;
  }, []);
}
