import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Button, Badge } from '../ui';
import type { Player } from '../../types';

interface AnswerDisplayProps {
  endRoundPhase: string;
  answerAwardMap: Map<string, 'gold' | 'green'>;
}

export function AnswerDisplay({ endRoundPhase, answerAwardMap }: AnswerDisplayProps) {
  const gameState = useGameStore();
  const toggleAnswerActive = useGameStore(state => state.toggleAnswerActive);

  if (!gameState.showAnswers) return null;

  const getAnswerHighlight = (answer: Player) => {
    const inPlayCount = endRoundPhase === 'answers'
      ? gameState.answers.filter(ax => (ax.answer || '').trim().length > 0).length
      : gameState.answers.filter(ax => (ax.answer || '').trim().length > 0 && ax.answerActive !== false).length;

    const isAwarded = answerAwardMap.has(answer.answer || '');
    const inPlay = (endRoundPhase === 'answers' || (endRoundPhase === 'players' && isAwarded)) 
      ? true 
      : (answer.answerActive !== false);
    const award = answerAwardMap.get(answer.answer || '');
    const isLast = endRoundPhase === 'idle' 
      ? (inPlayCount === 1 && (answer.answerActive !== false) && (answer.answer || '').trim().length > 0) 
      : false;

    if (isLast) return 'bg-yellow-300 border-yellow-400 text-black';
    if (award === 'gold') return 'bg-yellow-300 border-yellow-400 text-black';
    if (award === 'green') return 'bg-green-300 border-green-400 text-black';
    return '';
  };

  const calculateBonusPoints = (answer: Player) => {
    const currentAnswers = gameState.answers.map(p => (p.answer || '')).filter(a => a.trim().length > 0);
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

    const answerVote = gameState.answerVotes.find(av => av.answer === (answer.answer || ''));
    const votes = answerVote ? answerVote.votes : [];
    const totalVotes = votes.length;

    const allCounts = gameState.answers.map(ax => (
      gameState.answerVotes.find(v => v.answer === (ax.answer || ''))?.votes.length || 0
    ));
    const maxAcross = Math.max(0, ...allCounts);
    const secondCounts = allCounts.filter(c => c > 0 && c < maxAcross);
    const secondMax = secondCounts.length ? Math.max(...secondCounts) : 0;

    if (maxAcross > 0 && totalVotes === maxAcross) {
      return firstPoints;
    } else if (awardSecond && secondMax > 0 && totalVotes === secondMax) {
      return secondPoints;
    }
    
    return 0;
  };

  const renderVoteEmojis = (votes: any[]) => {
    const countLaugh = votes.filter(v => v.emoji === 'laugh').length;
    const countLove = votes.filter(v => v.emoji === 'love').length;
    const countHundred = votes.filter(v => v.emoji === 'hundred').length;

    const group = (count: number, symbol: string) => (
      <div className="flex -space-x-4">
        {Array.from({ length: count }).map((_, i) => (
          <span key={symbol + i} className="text-base leading-none inline-block">
            {symbol}
          </span>
        ))}
      </div>
    );

    return (
      <>
        {countLaugh > 0 && group(countLaugh, '😂')}
        {countLove > 0 && group(countLove, '❤️')}
        {countHundred > 0 && group(countHundred, '💯')}
      </>
    );
  };

  return (
    <div className="rounded-2xl bg-base-200/80 backdrop-blur border border-base-300 p-2 shadow-xl">
      <div className="text-sm uppercase tracking-[0.2em] opacity-70 mb-1">Answers</div>
      <div className="flex flex-col gap-1">
        {[...gameState.answers]
          .sort((a, b) => Number(a.answerActive === false) - Number(b.answerActive === false))
          .map(answer => {
            const inPlayCount = endRoundPhase === 'answers'
              ? gameState.answers.filter(ax => (ax.answer || '').trim().length > 0).length
              : gameState.answers.filter(ax => (ax.answer || '').trim().length > 0 && ax.answerActive !== false).length;

            const inPlay = (endRoundPhase === 'answers' || (endRoundPhase === 'players' && answerAwardMap.has(answer.answer || ''))) 
              ? true 
              : (answer.answerActive !== false);
            
            const awardClass = getAnswerHighlight(answer);
            const isLast = endRoundPhase === 'idle' ? (inPlayCount === 1 && (answer.answerActive !== false) && (answer.answer || '').trim().length > 0) : false;
            
            const bubbleStateBase = inPlay
              ? `btn btn-outline border-primary text-primary ${isLast ? 'pointer-events-none' : ''}`
              : 'btn btn-ghost text-neutral content-opacity-70';
            
            const bubbleBase = 'btn-sm rounded-xl h-10 min-h-0 normal-case text-left flex-1 w-full justify-start px-3';
            
            const answerVote = gameState.answerVotes.find(av => av.answer === (answer.answer || ''));
            const votes = answerVote ? answerVote.votes : [];
            const bonusPoints = calculateBonusPoints(answer);

            return (
              <div key={answer.id} className="flex items-center gap-1">
                <Button
                  onClick={(e) => {
                    if (inPlayCount === 1 && (answer.answerActive !== false)) {
                      e.preventDefault();
                      return;
                    }
                    (e.currentTarget as HTMLButtonElement).blur();
                    toggleAnswerActive(answer.answer!);
                  }}
                  className={`${bubbleStateBase} ${awardClass} ${bubbleBase}`}
                >
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      {!inPlay && (
                        <span className="text-xs opacity-75 whitespace-nowrap">
                          {answer.name}
                        </span>
                      )}
                      <span className="font-display text-lg leading-none break-words text-left">
                        {answer.answer}
                      </span>
                    </span>
                    <div className="shrink-0 flex items-center gap-2 text-right">
                      {bonusPoints > 0 && (
                        <Badge variant="warning" size="sm" className="text-black">
                          +{bonusPoints}
                        </Badge>
                      )}
                      <div className="flex items-center justify-end flex-wrap max-w-[40vw] gap-[2px]">
                        {renderVoteEmojis(votes)}
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
