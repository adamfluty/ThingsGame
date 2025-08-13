import { useState, useRef, useCallback, useEffect } from 'react';

export function useConfirmAction(timeout: number = 2000) {
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());
  
  const beginConfirm = useCallback((id: string) => {
    setConfirmingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    
    const timer = window.setTimeout(() => {
      setConfirmingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timers.current.delete(id);
    }, timeout);
    
    const oldTimer = timers.current.get(id);
    if (oldTimer) {
      window.clearTimeout(oldTimer);
    }
    timers.current.set(id, timer);
  }, [timeout]);
  
  const executeAction = useCallback((id: string, action: () => void) => {
    action();
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
    }
    timers.current.delete(id);
    setConfirmingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  
  const isConfirming = useCallback((id: string) => 
    confirmingIds.has(id), 
    [confirmingIds]
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(timer => window.clearTimeout(timer));
      timers.current.clear();
    };
  }, []);
  
  return {
    isConfirming,
    beginConfirm,
    executeAction
  };
}
