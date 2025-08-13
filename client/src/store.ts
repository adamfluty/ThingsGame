// This file is deprecated - use stores/gameStore.ts instead
// Keeping for backward compatibility during migration
export { useGameStore as useStore } from './stores/gameStore';
export type {
  Player,
  SuggestionVote,
  PromptSuggestion,
  AnswerVotesEntry,
  GameState as StateWire
} from './types';