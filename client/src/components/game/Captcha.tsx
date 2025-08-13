import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface CaptchaProps {
  onPass: () => void;
}

export function Captcha({ onPass }: CaptchaProps) {
  const [a, b] = useMemo(() => {
    const x = Math.floor(Math.random() * 5) + 3;
    const y = Math.floor(Math.random() * 5) + 2;
    return [x, y];
  }, []);
  
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = () => {
    if (Number(value) === a + b) {
      onPass();
    } else {
      setError('Try again');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  
  return (
    <div className="glass-card p-3">
      <div className="text-sm opacity-70 mb-1">Prove you're human</div>
      <div className="flex items-center gap-2">
        <div className="font-display text-lg">{a} + {b} =</div>
        <Input
          className="w-24 rounded-xl"
          variant="bordered"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button 
          className="rounded-xl" 
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </div>
      {error && (
        <div className="text-error text-xs mt-1">{error}</div>
      )}
    </div>
  );
}
