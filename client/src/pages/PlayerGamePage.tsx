import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useClientId, useCurrentPlayer, useLocalStorage, useAutoJoin } from '../hooks';
import { ThemeToggle, Button, Input, Badge } from '../components/ui';
import { 
  RoomHeader, 
  VotingModal, 
  AnswerVotingModal, 
  PromptSuggestionInput,
  RulesModal
} from '../components/game';

export function PlayerGamePage() {
  const clientId = useClientId();
  const currentPlayer = useCurrentPlayer();
  const gameState = useGameStore();
  const submitAnswer = useGameStore(state => state.submitAnswer);
  
  // Local UI state
  const [playerName, setPlayerName] = useLocalStorage('name', '');
  const [answer, setAnswer] = useState('');
  const [votingOpen, setVotingOpen] = useState(false);
  const [answerVotingOpen, setAnswerVotingOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [focusAnswerNext, setFocusAnswerNext] = useState(false);
  const [isNameLocked, setIsNameLocked] = useLocalStorage('nameLocked', false);
  
  // Refs for focus management
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);
  
  // Auto-join functionality
  useAutoJoin();
  
  // Force dark theme by default
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    } catch {}
  }, []);
  
  // Clear local inputs when leaving room
  const prevRoomCodeRef = useRef<string | null>(null);
  useEffect(() => {
    const currentRoomCode = gameState.roomCode;
    const previousRoomCode = prevRoomCodeRef.current;
    
    if (previousRoomCode && !currentRoomCode) {
      setPlayerName('');
      setAnswer('');
    }
    prevRoomCodeRef.current = currentRoomCode;
  }, [gameState.roomCode, setPlayerName]);
  
  // Handle server name lock synchronization
  const prevServerLocked = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    const serverLocked = !!currentPlayer?.nameLocked;
    
    if (serverLocked) {
      if (!isNameLocked) setIsNameLocked(true);
    }
    
    // Only clear local lock on a true -> false transition (admin unlock)
    if (prevServerLocked.current === true && serverLocked === false) {
      setIsNameLocked(false);
    }
    prevServerLocked.current = serverLocked;
  }, [currentPlayer?.nameLocked, isNameLocked, setIsNameLocked]);
  
  // Ensure username field is enabled on fresh join
  useEffect(() => {
    if (gameState.roomCode && !(currentPlayer?.name && currentPlayer.name.trim().length > 0)) {
      if (isNameLocked) {
        setIsNameLocked(false);
      }
    }
  }, [gameState.roomCode, currentPlayer?.name, isNameLocked, setIsNameLocked]);
  
  // Auto-focus name input after joining room
  useEffect(() => {
    if (gameState.roomCode && !(currentPlayer?.name && currentPlayer.name.trim().length > 0)) {
      const timer = window.setTimeout(() => {
        nameInputRef.current?.focus();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [gameState.roomCode, currentPlayer?.name]);
  
  // Close answer voting when answers unlock
  useEffect(() => {
    if (!gameState.lockAnswers) {
      setAnswerVotingOpen(false);
    }
  }, [gameState.lockAnswers]);
  
  // Exit edit mode if answers get locked
  useEffect(() => {
    if (gameState.lockAnswers) {
      setEditingAnswer(false);
    }
  }, [gameState.lockAnswers]);
  
  // Focus answer input when name is submitted
  const prevHasNameRef = useRef<boolean>(!!currentPlayer?.name);
  useEffect(() => {
    const hasServerName = !!(currentPlayer?.name && currentPlayer.name.trim().length > 0);
    
    if (focusAnswerNext && hasServerName && !gameState.lockAnswers) {
      const timeouts: number[] = [];
      [0, 80, 180].forEach(delay => {
              const timer = window.setTimeout(() => {
        answerInputRef.current?.focus();
      }, delay);
      timeouts.push(timer);
      });
      
      const finalTimer = window.setTimeout(() => {
        setFocusAnswerNext(false);
        timeouts.forEach(t => window.clearTimeout(t));
      }, 220);
      
      return () => {
        timeouts.forEach(t => window.clearTimeout(t));
        window.clearTimeout(finalTimer);
      };
    }
    
    // Also trigger focus when name just appeared
    if (!prevHasNameRef.current && hasServerName && !gameState.lockAnswers) {
      const timer = window.setTimeout(() => {
        answerInputRef.current?.focus();
      }, 120);
      return () => window.clearTimeout(timer);
    }
    
    prevHasNameRef.current = hasServerName;
  }, [currentPlayer?.name, gameState.lockAnswers, focusAnswerNext]);
  
  // Room joining interface (shown when not in a room)
  if (!gameState.roomCode) {
    return <RoomJoinInterface />;
  }
  
  // Computed values
  const hasServerName = !!(currentPlayer?.name && currentPlayer.name.trim().length > 0);
  const effectiveHasName = hasServerName || (isNameLocked && playerName.trim().length > 0);
  const canSubmitName = !gameState.lockAnswers && !hasServerName && playerName.trim().length > 0;
  const canSubmitAnswer = !gameState.lockAnswers && 
    (hasServerName || (isNameLocked && playerName.trim().length > 0)) && 
    answer.trim().length > 0;
  
  // Calculate vote usage for display
  const calculateVoteUsage = () => {
    const duplicateCountMap = new Map<string, number>();
    gameState.answers.forEach(player => {
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
  
  // Event handlers
  const handleSubmitName = () => {
    if (!canSubmitName) return;
    
    (document.activeElement as HTMLElement | null)?.blur();
    const nameToSubmit = playerName.trim();
    
    if (nameToSubmit && !currentPlayer?.nameLocked && !isNameLocked) {
      setIsNameLocked(true);
    }
    
    setFocusAnswerNext(true);
    submitAnswer({ clientId, name: nameToSubmit });
  };
  
  const handleSubmitAnswer = () => {
    if (!canSubmitAnswer) return;
    
    submitAnswer({ clientId, answer: answer.trim() });
    setAnswer('');
    if (editingAnswer) setEditingAnswer(false);
  };
  
  const handleEditAnswer = () => {
    setEditingAnswer(true);
    setAnswer(currentPlayer?.answer || '');
    setTimeout(() => answerInputRef.current?.focus(), 80);
  };

  return (
    <div className="min-h-[calc(100vh-0px)] fun-bg px-4 py-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold tracking-tight font-display">
            <span className="text-primary">Fluty</span>
            <span className="text-secondary">Things</span> 🎲
          </h1>
          <ThemeToggle />
        </div>
        
        {/* Room Header */}
        <div className="mb-2 flex items-center justify-center gap-2">
          <RoomHeader showDeleteButton={false} showEditButton={true} />
          <Button 
            variant="accent" 
            size="xs" 
            className="rounded-full min-h-0 h-7"
            onClick={() => setShowRules(true)}
          >
            RULES
          </Button>
        </div>
        
        {/* Locked indicator */}
        {gameState.lockAnswers && (
          <div className="mb-3 flex justify-center">
            <Badge variant="warning" className="gap-2">🔒 Answers Locked</Badge>
          </div>
        )}
        
        {/* Current Prompt */}
        <div className="mb-3 rounded-2xl bg-base-200/80 backdrop-blur p-2 text-center shadow-xl border border-base-300">
          <div className="text-xs uppercase tracking-[0.2em] opacity-70">Current Prompt</div>
          <div className="mt-0.5 text-2xl sm:text-3xl text-secondary font-display break-words">
            {gameState.prompt || 'Waiting for the host…'}
          </div>
        </div>
        
        <div className="space-y-2">
          {/* Username Section */}
          {effectiveHasName ? (
            <div className="p-2 rounded-2xl bg-base-200/80 backdrop-blur text-center shadow-sm border border-base-300">
              <div className="text-[12px] uppercase tracking-[0.2em] opacity-70">Username</div>
              <div className="text-base font-semibold font-display">
                {currentPlayer?.name || playerName}
              </div>
            </div>
          ) : (
            <Input
              ref={nameInputRef}
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder={
                (gameState.lockAnswers && !currentPlayer?.name) 
                  ? 'Player entry is locked' 
                  : 'Enter your username'
              }
              title={
                (gameState.lockAnswers && !currentPlayer?.name) 
                  ? 'Player entry is locked while answers are locked' 
                  : ''
              }
              className="w-full rounded-2xl text-base"
              inputSize="lg"
              disabled={!!currentPlayer?.nameLocked || isNameLocked}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmitName(); }}
            />
          )}
          
          {/* Join Button */}
          {!effectiveHasName && (
            <Button
              variant="primary"
              className="w-full rounded-2xl text-base font-display"
              disabled={!canSubmitName}
              onClick={handleSubmitName}
            >
              Join!
            </Button>
          )}
          
          {/* Answer Section */}
          {effectiveHasName && (
            <>
              {/* Current Answer Display */}
              {currentPlayer?.answer && !editingAnswer && (
                <div className="p-2 rounded-2xl bg-base-200/80 backdrop-blur shadow-sm border border-base-300 flex items-center">
                  <div className="w-8 h-8" />
                  <div className="flex-1 min-w-0 text-center">
                    <div className="text-[12px] uppercase tracking-[0.2em] opacity-70">Current Answer</div>
                    <div className="text-base font-semibold font-display break-words">
                      {currentPlayer.answer}
                    </div>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-end">
                    {!gameState.lockAnswers && (
                      <Button
                        variant="ghost"
                        size="sm"
                        shape="circle"
                        className="min-h-0 h-8 w-8 p-0"
                        title="Edit answer"
                        onClick={handleEditAnswer}
                      >
                        ✏️
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Answer Input */}
              {(!currentPlayer?.answer || editingAnswer) && (
                <>
                  <Input
                    ref={answerInputRef}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder={
                      gameState.lockAnswers 
                        ? 'Answers are locked' 
                        : (currentPlayer?.answer ? 'Re-submit or Exit' : 'Enter your answer')
                    }
                    title={gameState.lockAnswers ? 'Answers are locked while host reveals' : ''}
                    className={`w-full rounded-2xl text-base ${
                      currentPlayer?.answer ? 'placeholder:text-center' : ''
                    }`}
                    inputSize="lg"
                    disabled={gameState.lockAnswers}
                    onKeyDown={e => { 
                      if (e.key === 'Enter') { 
                        e.preventDefault(); 
                        handleSubmitAnswer(); 
                      } 
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      className="rounded-2xl text-base font-display flex-1"
                      size="lg"
                      disabled={!canSubmitAnswer}
                      onClick={() => { 
                        handleSubmitAnswer(); 
                        setEditingAnswer(false); 
                      }}
                    >
                      🚀 Submit Answer
                    </Button>
                    {editingAnswer && (
                      <Button
                        variant="ghost"
                        className="rounded-2xl text-base min-h-0 h-10"
                        size="lg"
                        onClick={() => { 
                          setEditingAnswer(false); 
                          setAnswer(''); 
                        }}
                      >
                        ✖
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          
          {/* Voting Buttons */}
          {currentPlayer?.name && (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button 
                variant="warning" 
                className="rounded-2xl w-full"
                disabled={!gameState.lockAnswers}
                onClick={() => setAnswerVotingOpen(true)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>🗳️ Vote: Answers</span>
                  <Badge 
                    size="sm"
                    variant={usedVotes === 2 ? 'success' : 'error'}
                  >
                    {usedVotes}/2
                  </Badge>
                </div>
              </Button>
              <Button 
                variant="warning" 
                className="rounded-2xl w-full"
                onClick={() => setVotingOpen(true)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>🗳️ Vote: Prompts</span>
                  <Badge size="sm" variant="success">
                    {gameState.suggestions.length}
                  </Badge>
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Prompt Suggestion Input (shown only when player has a name) */}
      {currentPlayer?.name && <PromptSuggestionInput />}
      
      {/* Modals */}
      {votingOpen && (
        <VotingModal 
          isOpen={votingOpen} 
          onClose={() => setVotingOpen(false)} 
        />
      )}
      {answerVotingOpen && (
        <AnswerVotingModal 
          isOpen={answerVotingOpen} 
          onClose={() => setAnswerVotingOpen(false)} 
        />
      )}
      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} />
      )}
    </div>
  );
}

// Component for handling room joining when not in a room
function RoomJoinInterface() {
  const [inlineRoom, setInlineRoom] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const joinRoom = useGameStore(state => state.joinRoom);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  
  const handleInlineJoin = async () => {
    const code = inlineRoom.trim().toUpperCase();
    if (!code) {
      inlineInputRef.current?.focus();
      return;
    }
    
    setJoinBusy(true);
    try {
      const result = await joinRoom(code, { method: 'manual' });
      if (!result.ok) {
        alert('Room not found');
      }
    } finally {
      setJoinBusy(false);
    }
  };
  
  return (
    <div className="min-h-[calc(100vh-0px)] fun-bg px-4 py-4">
      <div className="max-w-lg mx-auto space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-extrabold tracking-tight font-display">
            <span className="text-primary">Fluty</span>
            <span className="text-secondary">Things</span> 🎲
          </h1>
          <ThemeToggle />
        </div>
        <div className="glass-card p-3">
          <div className="text-sm uppercase tracking-[0.2em] opacity-70">
            Enter a room code to join a game!
          </div>
          <div className="mt-1 flex items-center gap-2 whitespace-nowrap flex-nowrap overflow-x-auto">
            <Input
              ref={inlineInputRef}
              value={inlineRoom}
              onChange={e => setInlineRoom(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="rounded-2xl h-12 min-h-12"
              containerClassName="flex-1 min-w-0"
              inputSize="lg"
              maxLength={8}
              onKeyDown={e => { 
                if (e.key === 'Enter') { 
                  e.preventDefault(); 
                  handleInlineJoin(); 
                } 
              }}
            />
            <Button 
              variant="accent" 
              className="rounded-2xl shrink-0 h-12 min-h-12"
              size="lg"
              disabled={joinBusy}
              onClick={handleInlineJoin}
            >
              Join
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
