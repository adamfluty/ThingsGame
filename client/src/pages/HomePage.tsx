import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle, Button } from '../components/ui';
import { RulesModal } from '../components/game';

export function HomePage() {
  const navigate = useNavigate();
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="min-h-[calc(100vh-0px)] fun-bg px-4 py-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <Button 
              variant="accent" 
              className="rounded-xl"
              size="xs"
              onClick={() => setShowRules(true)}
            >
              How to Play
            </Button>
            <ThemeToggle />
          </div>
        </div>
        
        <div className="grid grid-cols-[auto_auto_1fr] grid-rows-2 items-start gap-x-2 sm:gap-x-3">
          <div className="col-start-1 row-start-1 justify-self-start">
            <div className="text-6xl sm:text-7xl font-extrabold font-display leading-none">
              <span className="text-primary">Fluty</span>
            </div>
          </div>
          <div className="col-start-2 row-span-2 self-center justify-self-start">
            <div className="text-7xl sm:text-8xl leading-none">🎲</div>
          </div>
          <div className="col-start-1 row-start-2 mt-[-0.25rem] justify-self-start">
            <div className="text-6xl sm:text-7xl font-extrabold font-display leading-none">
              <span className="text-secondary">Things</span>
            </div>
          </div>
          {/* col 3 intentionally left empty to stretch space */}
        </div>
        
        <div className="text-center text-base sm:text-md font-display text-base-content/90 leading-relaxed">
        <span className="font-bold">A <span className="font-extrabold text-accent">Who said that?!</span> party game</span>
          <br />
          🧠 Outsmart your friends 
          <br />
          💪 Flex your reads 
          <br />
          🍬 Gobble up bonus points
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button 
            variant="primary" 
            className="rounded-2xl text-lg font-display"
            onClick={() => navigate('/join')}
          >
            Join a Room 📱
          </Button>
          <Button 
            variant="secondary" 
            className="rounded-2xl text-lg font-display"
            onClick={() => navigate('/host')}
          >
            Host a Room 🖥
          </Button>
        </div>
        <div className="text-xs text-base-content/70">
          * Host screen intended for all players to view. Player operating the host screen should also play!
        </div>
        
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </div>
    </div>
  );
}
