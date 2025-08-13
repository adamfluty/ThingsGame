import React from 'react';
import { Modal, Button } from '../ui';
import { useGameStore } from '../../stores/gameStore';
import { useConfirmAction } from '../../hooks';
import type { PromptSuggestion } from '../../types';

interface PromptSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (text: string) => void;
}

export function PromptSuggestionsModal({ 
  isOpen, 
  onClose, 
  onSelectPrompt 
}: PromptSuggestionsModalProps) {
  const suggestions = useGameStore(state => state.suggestions);
  const removeSuggestion = useGameStore(state => state.removeSuggestion);
  
  const { isConfirming, beginConfirm, executeAction } = useConfirmAction();

  const handleSelectPrompt = (suggestion: PromptSuggestion) => {
    onSelectPrompt(suggestion.text);
    removeSuggestion({ suggestionId: suggestion.id });
    onClose();
  };

  const handleRemovePrompt = (suggestionId: string) => {
    executeAction(suggestionId, () => {
      removeSuggestion({ suggestionId });
    });
  };

  const sortedSuggestions = suggestions
    .slice()
    .sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Prompt Suggestions" 
      size="xl"
    >
      <div className="max-h-[60vh] overflow-auto space-y-1">
        {suggestions.length === 0 ? (
          <div className="text-sm opacity-70">No suggestions yet…</div>
        ) : (
          sortedSuggestions.map(suggestion => {
            const stats = {
              laugh: suggestion.votes.filter(v => v.emoji === 'laugh').length,
              love: suggestion.votes.filter(v => v.emoji === 'love').length,
              hundred: suggestion.votes.filter(v => v.emoji === 'hundred').length,
            };

            return (
              <div key={suggestion.id} className="flex items-center gap-2 w-full">
                <Button
                  shape="circle"
                  size="xs"
                  variant={isConfirming(suggestion.id) ? 'error' : 'ghost'}
                  className="shrink-0"
                  title={isConfirming(suggestion.id) ? 'Click to remove prompt' : 'Remove'}
                  onClick={() => 
                    isConfirming(suggestion.id) 
                      ? handleRemovePrompt(suggestion.id) 
                      : beginConfirm(suggestion.id)
                  }
                >
                  ✖
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 min-w-0 text-left normal-case justify-start rounded-xl h-auto min-h-0 py-2"
                  onClick={() => handleSelectPrompt(suggestion)}
                >
                  <div className="flex items-start gap-2 w-full">
                    <span className="font-display text-lg leading-snug break-words flex-1">
                      {suggestion.text}
                    </span>
                    <span className="text-xs opacity-70 whitespace-nowrap">
                      [{suggestion.authorName}]
                    </span>
                    <div className="ml-2 flex items-center gap-2 text-xs opacity-80">
                      <span>😂 {stats.laugh}</span>
                      <span>❤️ {stats.love}</span>
                      <span>💯 {stats.hundred}</span>
                    </div>
                  </div>
                </Button>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
