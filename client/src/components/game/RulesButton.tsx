import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { RulesModal } from './RulesModal';

export function RulesButton() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <Button 
        variant="accent" 
        size="xs" 
        className="rounded-full min-h-0 h-7"
        title="Rules"
        onClick={() => setIsOpen(true)}
      >
        RULES
      </Button>
      {isOpen && <RulesModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
