import React from 'react';
import { Modal, Button } from '../ui';
import { useGameStore } from '../../stores/gameStore';
import { useClientId } from '../../hooks';
import type { Player } from '../../types';

interface AnswerVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnswerVotingModal({ isOpen, onClose }: AnswerVotingModalProps) {
  const clientId = useClientId();
  const gameState = useGameStore();
  const voteAnswer = useGameStore(state => state.voteAnswer);

  const handleVote = (answer: string, emoji: 'laugh' | 'love' | 'hundred') => {
    voteAnswer({ clientId, answer, emoji });
  };

  // Calculate vote usage with duplicate answer weighting
  const calculateVoteUsage = () => {
    const duplicateCountMap = new Map<string, number>();
    gameState.answers.forEach((player: Player) => {
      const text = (player.answer || '').trim();
      if (!text) return;
      duplicateCountMap.set(text, (duplicateCountMap.get(text) || 0) + 1);
    });

    const getWeight = (text: string) => ((duplicateCountMap.get(text) || 0) >= 2 ? 2 : 1);
    
    return gameState.answerVotes.reduce((total, answerVote) => 
      total + (answerVote.votes.some(v => v.playerId === clientId) ? getWeight(answerVote.answer) : 0), 
      0
    );
  };

  const usedVotes = calculateVoteUsage();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Two!" size="lg">
      <div className="max-h-[65vh] overflow-auto space-y-2">
        {gameState.answers.length === 0 ? (
          <div className="text-sm opacity-70">No answers yet…</div>
        ) : (
          gameState.answers
            .filter((answer: Player) => answer.id !== clientId)
            .map((answer: Player) => {
              const answerVoteEntry = gameState.answerVotes.find(av => av.answer === (answer.answer || ''));
              const myVote = answerVoteEntry?.votes.find(v => v.playerId === clientId)?.emoji;
              const totalVotes = answerVoteEntry?.votes.length || 0;
              
              // Calculate weight and voting eligibility
              const duplicateCountMap = new Map<string, number>();
              gameState.answers.forEach((p: Player) => {
                const text = (p.answer || '').trim();
                if (!text) return;
                duplicateCountMap.set(text, (duplicateCountMap.get(text) || 0) + 1);
              });
              
              const getWeight = (text: string) => ((duplicateCountMap.get(text) || 0) >= 2 ? 2 : 1);
              const answerWeight = getWeight(answer.answer || '');
              const canVoteMore = gameState.lockAnswers && (usedVotes + (myVote ? 0 : answerWeight) <= 2);
              
              const buttonBase = 'btn btn-xs rounded-full min-h-0 h-7 px-2';
              
              return (
                <div key={answer.id} className="rounded-xl border border-base-300 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-base break-words">{answer.answer}</div>
                    </div>
                    <div className="text-xs opacity-80 whitespace-nowrap">{totalVotes} votes</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button 
                      className={`${buttonBase} ${myVote === 'laugh' ? 'btn-warning' : 'btn-ghost'}`}
                      disabled={!canVoteMore && myVote !== 'laugh'}
                      onClick={() => handleVote(answer.answer!, 'laugh')}
                    >
                      😂
                    </Button>
                    <Button 
                      className={`${buttonBase} ${myVote === 'love' ? 'btn-error' : 'btn-ghost'}`}
                      disabled={!canVoteMore && myVote !== 'love'}
                      onClick={() => handleVote(answer.answer!, 'love')}
                    >
                      ❤️
                    </Button>
                    <Button 
                      className={`${buttonBase} ${myVote === 'hundred' ? 'btn-success' : 'btn-ghost'}`}
                      disabled={!canVoteMore && myVote !== 'hundred'}
                      onClick={() => handleVote(answer.answer!, 'hundred')}
                    >
                      💯
                    </Button>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </Modal>
  );
}
