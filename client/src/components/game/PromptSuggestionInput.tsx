import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useClientId } from '../../hooks';
import { Input, Button } from '../ui';

export function PromptSuggestionInput() {
  const clientId = useClientId();
  const submitPromptSuggestion = useGameStore(state => state.submitPromptSuggestion);
  
  const [suggestion, setSuggestion] = useState('');
  const [phase, setPhase] = useState<'idle' | 'flash' | 'fade'>('idle');
  const timers = useRef<number[]>([]);
  
  const isSuggesting = phase !== 'idle';

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(timer => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  const handleSubmit = () => {
    const text = suggestion.trim();
    if (!text || isSuggesting) return;

    submitPromptSuggestion({ clientId, text });
    
    setPhase('flash');
    setSuggestion('Thanks!');
    
    const timer1 = window.setTimeout(() => {
      setPhase('fade');
    }, 1200);
    
    const timer2 = window.setTimeout(() => {
      setSuggestion('');
      setPhase('idle');
    }, 1200);
    
    timers.current.push(timer1, timer2);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isSuggesting) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="rounded-t-2xl rounded-b-none bg-base-200/95 backdrop-blur border border-base-300 shadow-2xl p-2">
          <div className="flex items-center gap-2 whitespace-nowrap flex-nowrap overflow-x-auto">
            <Input
              value={suggestion}
              onChange={e => setSuggestion(e.target.value)}
              placeholder="Suggest a prompt…"
              className={`rounded-2xl h-12 min-h-12 text-base ${
                phase === 'flash' ? '!bg-secondary !text-secondary-content font-semibold' : ''
              }`}
              inputSize="lg"
              containerClassName="flex-1 min-w-0"
              readOnly={isSuggesting}
              onKeyDown={handleKeyDown}
            />
            <Button
              variant="secondary"
              className={`rounded-2xl shrink-0 transition-opacity duration-500 h-12 min-h-12 ${
                phase === 'fade' ? 'opacity-0' : 'opacity-100'
              }`}
              size="lg"
              disabled={suggestion.trim().length === 0 || isSuggesting}
              onClick={handleSubmit}
            >
              💡
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
