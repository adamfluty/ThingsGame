import React from 'react';
import { Modal, Button } from '../ui';
import { useGameStore } from '../../stores/gameStore';
import { useClientId, useConfirmAction } from '../../hooks';
import type { PromptSuggestion } from '../../types';

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VotingModal({ isOpen, onClose }: VotingModalProps) {
  const clientId = useClientId();
  const suggestions = useGameStore(state => state.suggestions);
  const voteSuggestion = useGameStore(state => state.voteSuggestion);
  const removeSuggestion = useGameStore(state => state.removeSuggestion);
  
  const { isConfirming, beginConfirm, executeAction } = useConfirmAction();

  const handleVote = (suggestionId: string, emoji: 'laugh' | 'love' | 'hundred') => {
    voteSuggestion({ clientId, suggestionId, emoji });
  };

  const handleRemove = (suggestionId: string) => {
    executeAction(suggestionId, () => {
      removeSuggestion({ suggestionId });
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="React to your Favorites!" size="lg">
      <div className="max-h-[65vh] overflow-auto space-y-2">
        {suggestions.length === 0 ? (
          <div className="text-sm opacity-70">No suggestions yet…</div>
        ) : (
          suggestions.map((suggestion: PromptSuggestion) => {
            const myVote = suggestion.votes.find(v => v.playerId === clientId)?.emoji;
            const totalVotes = suggestion.votes.length;
            const buttonBase = 'btn btn-xs rounded-full min-h-0 h-7 px-2';
            const isAuthor = suggestion.authorId === clientId;
            
            return (
              <div key={suggestion.id} className="rounded-xl border border-base-300 p-2">
                <div className="font-display text-base break-words">{suggestion.text}</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="text-xs opacity-70">by {suggestion.authorName}</div>
                  <div className="flex items-center gap-1">
                    {!isAuthor && (
                      <>
                        <Button
                          className={`${buttonBase} ${myVote === 'laugh' ? 'btn-warning' : 'btn-ghost'}`}
                          onClick={() => handleVote(suggestion.id, 'laugh')}
                        >
                          😂
                        </Button>
                        <Button
                          className={`${buttonBase} ${myVote === 'love' ? 'btn-error' : 'btn-ghost'}`}
                          onClick={() => handleVote(suggestion.id, 'love')}
                        >
                          ❤️
                        </Button>
                        <Button
                          className={`${buttonBase} ${myVote === 'hundred' ? 'btn-success' : 'btn-ghost'}`}
                          onClick={() => handleVote(suggestion.id, 'hundred')}
                        >
                          💯
                        </Button>
                      </>
                    )}
                    {isAuthor && (
                      <Button
                        shape="circle"
                        size="xs"
                        variant={isConfirming(suggestion.id) ? 'error' : 'ghost'}
                        title={isConfirming(suggestion.id) ? 'Click to remove prompt' : 'Remove'}
                        onClick={() => 
                          isConfirming(suggestion.id) 
                            ? handleRemove(suggestion.id) 
                            : beginConfirm(suggestion.id)
                        }
                      >
                        ✖
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
