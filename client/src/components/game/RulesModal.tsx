import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';

interface RulesModalProps {
  onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="How to Play"
      size="sm"
      headerClassName="bg-primary/10 border-primary/30"
      titleClassName="text-primary"
    >
      <div className="space-y-1 text-sm">
        <div className="p-1">
          <div className="font-bold text-secondary mb-0.5">Game Flow</div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              <span className="font-semibold">As a Host:</span> Enter a prompt. Lock to reveal answers when ready. Click correctly guessed answers; advance turn on incorrect guesses.
            </li>
            <li>
              <span className="font-semibold">As a Player:</span> Submit an answer. On your turn: 
              guess who wrote an answer, repeat if correct. Vote for your favorite answers.
            </li>
          </ul>
        </div>
        
        <div className="p-1">
          <div className="font-bold text-secondary mb-0.5">Scoring</div>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>
              Correct guess: <Badge variant="primary" className="text-primary bg-primary/20 border-primary/40">+1</Badge>
            </li>
            <li>
              Vote for best answers: <Badge variant="primary" className="text-primary bg-primary/20 border-primary/40">+1</Badge>
            </li>
            <li>
              Best answer:
              <ul className="list-disc pl-5 mt-0.5 space-y-0.5">
                <li>
                  3–5 players: #1 <Badge className="bg-yellow-300 border-yellow-400 text-black">+1</Badge> (no #2)
                </li>
                <li>
                  6–9 players: #1 <Badge className="bg-yellow-300 border-yellow-400 text-black">+1</Badge>, 
                  #2 <Badge className="bg-green-300 border-green-400 text-black">+1</Badge>
                </li>
                <li>
                  10+ players: #1 <Badge className="bg-yellow-300 border-yellow-400 text-black">+2</Badge>, 
                  #2 <Badge className="bg-green-300 border-green-400 text-black">+1</Badge>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
