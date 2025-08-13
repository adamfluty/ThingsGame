import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useLocalStorage } from '../hooks';
import { ThemeToggle, Button, Input, Badge } from '../components/ui';
import { RoomHeader, RulesButton } from '../components/game';
import { PlayerList, AnswerDisplay, PromptSuggestionsModal } from '../components/host';

export function HostGamePage() {
  const gameState = useGameStore();
  const setPrompt = useGameStore(state => state.setPrompt);
  const toggleLock = useGameStore(state => state.toggleLock);
  const nextTurn = useGameStore(state => state.nextTurn);
  const clearAnswers = useGameStore(state => state.clearAnswers);
  
  // UI State
  const [headerHidden, setHeaderHidden] = useLocalStorage('headerHidden', false);
  const [sortMode, setSortMode] = useState<'score' | 'play'>('score');
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  
  // End round animation state
  const [endRoundPhase, setEndRoundPhase] = useState<'idle' | 'answers' | 'players' | 'voters'>('idle');
  const [answerAwardMap, setAnswerAwardMap] = useState<Map<string, 'gold' | 'green'>>(new Map());
  const [playerAwardMap, setPlayerAwardMap] = useState<Map<string, number>>(new Map());
  const [playerColorMap, setPlayerColorMap] = useState<Map<string, 'gold' | 'green'>>(new Map());
  const [voterAwardSet, setVoterAwardSet] = useState<Set<string>>(new Set());
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState<string>('');
  const [phaseMessage, setPhaseMessage] = useState<string>('');
  const endRoundTimersRef = useRef<number[]>([]);
  
  // Prompt draft state
  const [promptDraft, setPromptDraft] = useState<string>(gameState.prompt);
  
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
  
  // Sync prompt draft with store
  useEffect(() => {
    setPromptDraft(gameState.prompt);
  }, [gameState.prompt]);
  
  // Bind input to live store prompt
  useEffect(() => {
    const savedPrompt = localStorage.getItem('prompt') || '';
    if ((!gameState.prompt || gameState.prompt.length === 0) && savedPrompt) {
      setPrompt(savedPrompt);
    }
    if (gameState.prompt && gameState.prompt.length > 0) {
      localStorage.setItem('prompt', gameState.prompt);
    }
  }, [gameState.prompt, setPrompt]);
  
  // Winner overlay logic
  useEffect(() => {
    if (endRoundPhase !== 'idle') {
      setShowWinnerOverlay(false);
      setWinnerName('');
      return;
    }
    
    if (!gameState.lockAnswers) {
      setShowWinnerOverlay(false);
      setWinnerName('');
      return;
    }
    
    const inPlay = gameState.answers.filter(answer => 
      (answer.answer || '').trim().length > 0 && answer.answerActive !== false
    );
    
    if (inPlay.length === 1) {
      setShowWinnerOverlay(true);
      setWinnerName(inPlay[0]?.name || 'Winner');
    } else {
      setShowWinnerOverlay(false);
      setWinnerName('');
    }
  }, [gameState.answers, gameState.lockAnswers, endRoundPhase]);
  
  // Cleanup timers
  useEffect(() => {
    return () => {
      endRoundTimersRef.current.forEach(timer => window.clearTimeout(timer));
      endRoundTimersRef.current = [];
    };
  }, []);

  const handlePromptChange = (value: string) => {
    setPromptDraft(value);
    setPrompt(value);
    localStorage.setItem('prompt', value);
  };

  const handlePromptBlur = () => {
    setPrompt(promptDraft);
    localStorage.setItem('prompt', promptDraft);
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSelectPrompt = (text: string) => {
    setPromptDraft(text);
    setPrompt(text);
    localStorage.setItem('prompt', text);
  };

  const runEndRoundSequence = () => {
    setShowWinnerOverlay(false);
    if (endRoundPhase !== 'idle') return;
    
    // Compute winners based on current visible answers and votes
    const currentAnswers = gameState.answers.map(p => (p.answer || '')).filter(a => a.trim().length > 0);
    const entries = (gameState.answerVotes || []).filter(av => currentAnswers.includes(av.answer));
    const counts = entries.map(e => e.votes.length).filter(c => c > 0);
    const max = counts.length ? Math.max(...counts) : 0;
    const nextAnswerAward = new Map<string, 'gold' | 'green'>();
    const nextPlayerAward = new Map<string, number>();
    const nextPlayerColors = new Map<string, 'gold' | 'green'>();
    const voterSet = new Set<string>();

    // Dynamic best-answer scoring based on participating answers this round
    const participantCount = currentAnswers.length;
    let firstPoints = 2;
    let secondPoints = 1;
    let awardSecond = true;
    
    if (participantCount <= 5) {
      firstPoints = 1;
      awardSecond = false;
    } else if (participantCount <= 9) {
      firstPoints = 1;
      secondPoints = 1;
      awardSecond = true;
    } else {
      firstPoints = 2;
      secondPoints = 1;
      awardSecond = true;
    }

    if (max > 0) {
      const firsts = entries.filter(e => e.votes.length === max);
      const tieForFirst = firsts.length >= 2;
      
      if (tieForFirst) {
        firsts.forEach(e => {
          nextAnswerAward.set(e.answer, 'gold');
          const author = gameState.answers.find(p => (p.answer || '') === e.answer);
          if (author) {
            nextPlayerAward.set(author.id, firstPoints);
            nextPlayerColors.set(author.id, 'gold');
          }
        });
      } else {
        const winner = firsts[0];
        nextAnswerAward.set(winner.answer, 'gold');
        const author = gameState.answers.find(p => (p.answer || '') === winner.answer);
        if (author) {
          nextPlayerAward.set(author.id, firstPoints);
          nextPlayerColors.set(author.id, 'gold');
        }
        
        if (awardSecond) {
          const secondCounts = counts.filter(c => c < max);
          if (secondCounts.length) {
            const secondMax = Math.max(...secondCounts);
            if (secondMax > 0) {
              entries.filter(e => e.votes.length === secondMax).forEach(e2 => {
                nextAnswerAward.set(e2.answer, 'green');
                const a2 = gameState.answers.find(p => (p.answer || '') === e2.answer);
                if (a2) {
                  nextPlayerAward.set(a2.id, secondPoints);
                  nextPlayerColors.set(a2.id, 'green');
                }
              });
            }
          }
        }
      }

      // Participation preview: +1 if a player used both votes on awarded answers (duplicate answers count as 2)
      try {
        const dupCountMap = new Map<string, number>();
        gameState.answers.forEach(p => {
          const t = (p.answer || '').trim();
          if (!t) return;
          dupCountMap.set(t, (dupCountMap.get(t) || 0) + 1);
        });
        
        const weightFor = (text: string) => ((dupCountMap.get(text) || 0) >= 2 ? 2 : 1);
        const weightByPlayer = new Map<string, number>();
        
        entries
          .filter(av => nextAnswerAward.has(av.answer))
          .forEach(av => {
            const w = weightFor(av.answer);
            av.votes.forEach(v => {
              const cur = weightByPlayer.get(v.playerId) || 0;
              const next = Math.min(2, cur + w);
              weightByPlayer.set(v.playerId, next);
            });
          });
          
        for (const [playerId, total] of weightByPlayer.entries()) {
          if (total >= 2) {
            voterSet.add(playerId);
          }
        }
      } catch {}
    }

    // If no votes were cast (max === 0), skip Stage 1 entirely
    if (max <= 0) {
      // No best-answer votes; if no voter bonus targets, skip Stage 2 entirely
      if (voterSet.size === 0) {
        const tClear = window.setTimeout(() => { clearAnswers(); }, 200);
        endRoundTimersRef.current.push(tClear);
        setPrompt('');
        localStorage.setItem('prompt', '');
        setPhaseMessage('');
        const tDone = window.setTimeout(() => {
          setEndRoundPhase('idle');
          setShowSuggestModal(true);
        }, 800);
        endRoundTimersRef.current.push(tDone);
      } else {
        setPhaseMessage('Voter Bonus +1');
        setVoterAwardSet(voterSet);
        setEndRoundPhase('voters');
        const tApplyVoter = window.setTimeout(() => {
          try {
            voterSet.forEach(pid => {
              useGameStore.getState().scoreDelta(pid, 1);
            });
          } catch {}
          const tClear = window.setTimeout(() => { clearAnswers(); }, 200);
          endRoundTimersRef.current.push(tClear);
          setPrompt('');
          localStorage.setItem('prompt', '');
          setVoterAwardSet(new Set());
          setPhaseMessage('');
          const tDone = window.setTimeout(() => {
            setEndRoundPhase('idle');
            setShowSuggestModal(true);
          }, 800);
          endRoundTimersRef.current.push(tDone);
        }, 3200);
        endRoundTimersRef.current.push(tApplyVoter);
      }
      return;
    }

    // Phase 1: immediately clear winner overlay shine, then highlight answers and players together
    setShowWinnerOverlay(false);
    setWinnerName('');
    setPhaseMessage('Best Answer Bonus');
    setAnswerAwardMap(nextAnswerAward);
    setPlayerAwardMap(nextPlayerAward);
    setPlayerColorMap(nextPlayerColors);
    setEndRoundPhase('players');
    
    // Award best-answer points near end of player flash
    const tAwardBest = window.setTimeout(() => {
      try {
        nextPlayerAward.forEach((delta, pid) => {
          useGameStore.getState().scoreDelta(pid, delta);
        });
      } catch {}
    }, 1800);
    endRoundTimersRef.current.push(tAwardBest);
    
    // End of Stage 1: clear player highlights and answer highlights in sync
    const tPlayersEnd = window.setTimeout(() => {
      setPlayerAwardMap(new Map());
      setPlayerColorMap(new Map());
      setAnswerAwardMap(new Map());
      // Clear Stage 1 message before Stage 2
      setPhaseMessage('');
      
      // Wait for fade-out to finish before starting Stage 2
      const tStage2Start = window.setTimeout(() => {
        // Recompute voter eligibility from latest state to avoid stale set
        const freshState = useGameStore.getState();
        const currentAnswers2 = freshState.answers.map(p => (p.answer || '')).filter(a => a.trim().length > 0);
        const entries2 = (freshState.answerVotes || []).filter(av => currentAnswers2.includes(av.answer));
        
        // Recompute awards (same as Stage 1 logic) to know which answers were winners
        const counts2 = entries2.map(e => e.votes.length).filter(c => c > 0);
        const max2 = counts2.length ? Math.max(...counts2) : 0;
        const awardedSet = new Set<string>();
        
        if (max2 > 0) {
          const firsts2 = entries2.filter(e => e.votes.length === max2);
          const t4f = firsts2.length >= 2;
          if (t4f) {
            firsts2.forEach(e => awardedSet.add(e.answer));
          } else {
            awardedSet.add(firsts2[0].answer);
            const secondCounts2 = counts2.filter(c => c < max2);
            if (secondCounts2.length) {
              const secondMax2 = Math.max(...secondCounts2);
              if (secondMax2 > 0) {
                entries2.filter(e => e.votes.length === secondMax2).forEach(e2 => awardedSet.add(e2.answer));
              }
            }
          }
        }
        
        const dupCountMap2 = new Map<string, number>();
        freshState.answers.forEach(p => {
          const t = (p.answer || '').trim();
          if (!t) return;
          dupCountMap2.set(t, (dupCountMap2.get(t) || 0) + 1);
        });
        
        const weightFor2 = (text: string) => ((dupCountMap2.get(text) || 0) >= 2 ? 2 : 1);
        const weightByPlayer2 = new Map<string, number>();
        
        entries2.filter(av => awardedSet.has(av.answer)).forEach(av => {
          const w = weightFor2(av.answer);
          av.votes.forEach(v => {
            const cur = weightByPlayer2.get(v.playerId) || 0;
            const next = Math.min(2, cur + w);
            weightByPlayer2.set(v.playerId, next);
          });
        });
        
        const freshVoters = new Set<string>();
        for (const [pid, tot] of weightByPlayer2.entries()) {
          if (tot >= 2) freshVoters.add(pid);
        }

        // If no eligible voters, skip Stage 2 and wrap up
        if (freshVoters.size === 0) {
          const tApplyClear = window.setTimeout(() => { clearAnswers(); }, 200);
          endRoundTimersRef.current.push(tApplyClear);
          setPrompt('');
          localStorage.setItem('prompt', '');
          setPhaseMessage('');
          const tDone = window.setTimeout(() => {
            setEndRoundPhase('idle');
            setShowSuggestModal(true);
          }, 800);
          endRoundTimersRef.current.push(tDone);
          return;
        }
        
        // Stage 2: flash participation (+1 for placing two votes)
        setPhaseMessage('Voter Bonus +1');
        setVoterAwardSet(freshVoters);
        setEndRoundPhase('voters');
        
        const t3 = window.setTimeout(() => {
          // Apply +1 to eligible voters and fade out
          try {
            freshVoters.forEach(pid => {
              useGameStore.getState().scoreDelta(pid, 1);
            });
          } catch {}
          
          // Slight delay to ensure ordering across socket
          const tApplyClear = window.setTimeout(() => { clearAnswers(); }, 200);
          endRoundTimersRef.current.push(tApplyClear);
          setPrompt('');
          localStorage.setItem('prompt', '');
          
          // Start fade by removing highlight styles now
          setVoterAwardSet(new Set());
          setPhaseMessage('');
          
          const t4 = window.setTimeout(() => {
            // After fade completes, show popup and finalize phase
            setEndRoundPhase('idle');
            setShowSuggestModal(true);
          }, 800);
          endRoundTimersRef.current.push(t4);
        }, 3200);
        endRoundTimersRef.current.push(t3);
      }, 100);
      endRoundTimersRef.current.push(tStage2Start);
    }, 2000);
    endRoundTimersRef.current.push(tPlayersEnd);
  };

  return (
    <div className="min-h-[calc(100vh-0px)] fun-bg">
      {/* Winner Overlay */}
      {(showWinnerOverlay || phaseMessage) && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {showWinnerOverlay && (
            <>
              {Array.from({ length: 70 }).map((_, idx) => {
                const left = Math.random() * 100;
                const colors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];
                const color = colors[idx % 6];
                const duration = 2.5 + Math.random() * 2.5;
                const negDelay = -(Math.random() * duration);
                
                return (
                  <div
                    key={idx}
                    className="confetti-piece"
                    style={{
                      left: `${left}%`,
                      backgroundColor: color,
                      animationDuration: `${duration}s`,
                      animationDelay: `${negDelay}s`,
                      animationName: 'confettiFall',
                      animationTimingFunction: 'linear',
                      animationIterationCount: 'infinite',
                      position: 'absolute',
                      top: '-12px',
                      width: '8px',
                      height: '12px',
                      borderRadius: '2px',
                      opacity: 0.95
                    }}
                  />
                );
              })}
            </>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`rounded-2xl backdrop-blur shadow-2xl px-4 py-2 animate-pulse border ${
                showWinnerOverlay
                  ? 'bg-base-200/80 border-base-300'
                  : phaseMessage?.startsWith('Best')
                    ? 'bg-yellow-300/90 border-yellow-400 text-black'
                    : phaseMessage?.startsWith('Voter')
                      ? 'bg-accent/90 border-accent text-accent-content'
                      : 'bg-base-200/80 border-base-300'
              }`}
            >
              <div className="text-3xl font-extrabold font-display">
                {showWinnerOverlay ? `🎉 ${winnerName} wins the round! 🎉` : phaseMessage}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className={`max-w-7xl mx-auto px-4 ${headerHidden ? 'py-1' : 'py-4'}`}>
        {/* Header */}
        {!headerHidden && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-extrabold font-display tracking-tight">
                <span className="text-primary">Fluty</span>{' '}
                <span className="text-secondary">Things</span> 🎲
              </h2>
              <RoomHeader showDeleteButton={true} showEditButton={false} />
              {gameState.lockAnswers && (
                <Badge variant="warning" size="lg">🔒 Locked</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <RulesButton />
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div className={`${headerHidden ? 'mt-1' : 'mt-3'} rounded-2xl bg-base-200/80 backdrop-blur border border-base-300 p-3 shadow-xl`}>
          <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto">
            <Input
              className="w-full rounded-2xl text-3xl font-display flex-1 min-w-0 text-secondary"
              variant="primary"
              placeholder="Type a prompt…"
              value={promptDraft}
              onChange={e => handlePromptChange(e.target.value)}
              onBlur={handlePromptBlur}
              onKeyDown={handlePromptKeyDown}
            />
            <div className="flex items-center gap-2 shrink-0">
              {!gameState.lockAnswers ? (
                <>
                  <Button
                    variant="accent"
                    className="rounded-2xl h-10 min-h-0"
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).blur();
                      toggleLock();
                    }}
                  >
                    🔒 Show Answers
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-2xl h-10 min-h-0"
                    title="Show suggested prompts"
                    onClick={() => setShowSuggestModal(true)}
                  >
                    💡
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="accent"
                    className="rounded-2xl h-10 min-h-0"
                    title="Unlock"
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).blur();
                      toggleLock();
                    }}
                  >
                    🔓
                  </Button>
                  <Button
                    variant="error"
                    className="rounded-2xl h-10 min-h-0"
                    onClick={runEndRoundSequence}
                  >
                    🏁 End Round
                  </Button>
                  <Button
                    variant="info"
                    className="rounded-2xl h-10 min-h-0"
                    onClick={nextTurn}
                  >
                    ⏭ Next
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="rounded-full px-2 min-h-0 h-7 shrink-0"
              title={headerHidden ? 'Show header' : 'Hide header'}
              onClick={() => setHeaderHidden(!headerHidden)}
            >
              {headerHidden ? '👀' : '🙈'}
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Answers Display */}
          <div className="lg:col-span-2 space-y-3">
            <AnswerDisplay 
              endRoundPhase={endRoundPhase}
              answerAwardMap={answerAwardMap}
            />
          </div>

          {/* Players List */}
          <div className="space-y-3">
            <PlayerList
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              endRoundPhase={endRoundPhase}
              playerAwardMap={playerAwardMap}
              playerColorMap={playerColorMap}
              voterAwardSet={voterAwardSet}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSuggestModal && (
        <PromptSuggestionsModal
          isOpen={showSuggestModal}
          onClose={() => setShowSuggestModal(false)}
          onSelectPrompt={handleSelectPrompt}
        />
      )}
      
      {/* Confetti CSS */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0.9; }
        }
        .confetti-piece {
          position: absolute;
          top: -12px;
          width: 8px;
          height: 12px;
          border-radius: 2px;
          opacity: 0.95;
          will-change: transform, opacity;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
