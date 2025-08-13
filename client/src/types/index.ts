export type Player = {
  id: string;
  name: string;
  nameLocked: boolean;
  score: number;
  active: boolean;
  turn: number;
  answer?: string;
  answerActive?: boolean;
};

export type SuggestionVote = {
  playerId: string;
  emoji: 'laugh' | 'love' | 'hundred';
};

export type PromptSuggestion = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  votes: SuggestionVote[];
};

export type AnswerVotesEntry = {
  answer: string;
  votes: SuggestionVote[];
};

export type GameState = {
  players: Player[];
  answers: Player[];
  showAnswers: boolean;
  lockAnswers: boolean;
  currentTurnPlayerId: string | null;
  totals: { totalPlayers: number; totalAnswers: number };
  playOrder: string[];
  prompt: string;
  suggestions: PromptSuggestion[];
  answerVotes: AnswerVotesEntry[];
  roomId?: string;
};

export type UserRole = 'host' | 'player' | null;

export type Theme = 'light' | 'dark';

export type JoinMethod = 'manual' | 'auto' | 'host';

export type JoinAttempt = {
  code: string;
  method: JoinMethod;
  at: number;
};

export type ApiResponse = {
  ok: boolean;
  error?: string;
};

export type SubmitAnswerPayload = {
  clientId: string;
  name?: string;
  answer?: string;
};

export type SubmitPromptSuggestionPayload = {
  clientId: string;
  text: string;
};

export type VoteSuggestionPayload = {
  clientId: string;
  suggestionId: string;
  emoji: 'laugh' | 'love' | 'hundred';
};

export type RemoveSuggestionPayload = {
  suggestionId: string;
};

export type VoteAnswerPayload = {
  clientId: string;
  answer: string;
  emoji: 'laugh' | 'love' | 'hundred';
};

export type PlayerUpdate = {
  id: string;
  name?: string;
  turn?: number;
};

export type ScoreDeltaPayload = {
  playerId: string;
  delta: number;
};

export type ToggleActivePayload = {
  playerId?: string;
  answerText?: string;
};

export type AdminEditPlayersPayload = {
  updates: PlayerUpdate[];
};

export type AdminRemovePlayerPayload = {
  playerId: string;
};

export type SetPromptPayload = {
  value: string;
};
