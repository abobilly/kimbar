import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Question, Check, X } from '@phosphor-icons/react';
import { Flashcard } from '@/types/flashcard';
import { parseCloze, checkClozeAnswer } from '@/lib/cloze';
import { useGame } from '@/contexts/GameContext';

interface FlashcardDuelProps {
  card: Flashcard;
  onComplete: (correct: boolean, shaky: boolean) => void;
}

export function FlashcardDuel({ card, onComplete }: FlashcardDuelProps) {
  const { activeBoons } = useGame();
  const hasChoices = card?.game?.choices && Array.isArray(card.game.choices) && card.game.choices.length > 0 && typeof card.game.answerIndex === 'number';
  
  const [mode, setMode] = useState<'mcq' | 'cloze'>(hasChoices ? 'mcq' : 'cloze');
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [clozeAnswers, setClozeAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const hasFreeReveal = activeBoons?.some(b => b?.effect === 'free-reveal') ?? false;
  const hasUsedReveal = revealed.size > 0;

  const prompt = card?.game?.stem || card?.frontPrompt || '';
  const hint = card?.game?.hint;
  const explanation = card?.game?.explain || card?.backPlain || '';

  const clozeText = card?.game?.clozeLite || card?.clozeLite || '';
  const clozeSegments = mode === 'cloze' ? parseCloze(clozeText) : [];
  const clozeBlankCount = clozeSegments ? clozeSegments.filter(s => s?.type === 'blank').length : 0;

  const handleMCQSubmit = () => {
    if (selectedChoice === null || !card?.game) return;

    const correct = selectedChoice === card.game.answerIndex;
    setIsCorrect(correct);
    setAnswered(true);
  };

  const handleClozeSubmit = () => {
    if (!clozeSegments || !Array.isArray(clozeSegments) || clozeSegments.length === 0) {
      setIsCorrect(false);
      setAnswered(true);
      return;
    }
    
    const blanks = clozeSegments.filter(s => s && s.type === 'blank');
    
    if (blanks.length === 0) {
      setIsCorrect(false);
      setAnswered(true);
      return;
    }
    
    let allCorrect = true;

    for (const blank of blanks) {
      if (!blank || !blank.index || typeof blank.index !== 'number') continue;
      
      if (revealed.has(blank.index)) {
        continue;
      }

      const answer = clozeAnswers[blank.index] || '';
      if (!checkClozeAnswer(blank.content, answer)) {
        allCorrect = false;
        break;
      }
    }

    setIsCorrect(allCorrect && revealed.size === 0);
    setAnswered(true);
  };

  const handleReveal = (index: number) => {
    if (hasFreeReveal && !hasUsedReveal) {
      setRevealed(prev => new Set([...prev, index]));
    }
  };

  const handleRating = (shaky: boolean) => {
    onComplete(isCorrect, shaky);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (answered) return;

    if (mode === 'mcq' && !answered) {
      if (e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        const choicesLength = card?.game?.choices?.length || 0;
        if (index < choicesLength) {
          setSelectedChoice(index);
        }
      } else if (e.key === 'Enter' && selectedChoice !== null) {
        handleMCQSubmit();
      }
    } else if (mode === 'cloze' && e.key === 'Enter') {
      handleClozeSubmit();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <ScrollArea className="h-full max-h-[90vh]">
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-2">
                  {card.subject} - {card.topic || 'General'}
                </div>
                <h3 className="text-lg font-semibold">{prompt}</h3>
              </div>
              
              {hint && !answered && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowHint(!showHint)}
                >
                  <Question size={20} />
                </Button>
              )}
            </div>

            {showHint && hint && (
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Hint:</strong> {hint}
              </div>
            )}

            {mode === 'mcq' && card?.game?.choices && Array.isArray(card.game.choices) && (
              <div className="space-y-2">
                {card.game.choices.map((choice, index) => (
                  <button
                    key={index}
                    disabled={answered}
                    onClick={() => setSelectedChoice(index)}
                    className={`w-full p-4 text-left border-2 rounded transition ${
                      selectedChoice === index
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-accent/50'
                    } ${
                      answered && index === card.game.answerIndex
                        ? 'border-success bg-success/10'
                        : answered && index === selectedChoice && index !== card.game.answerIndex
                        ? 'border-destructive bg-destructive/10'
                        : ''
                    } disabled:cursor-not-allowed`}
                  >
                    <span className="font-medium mr-2">{index + 1}.</span>
                    {choice}
                  </button>
                ))}
              </div>
            )}

            {mode === 'cloze' && (
              <div className="space-y-4">
                {clozeSegments && clozeSegments.length > 0 ? (
                  <div className="text-base leading-relaxed">
                    {clozeSegments.map((segment, i) => {
                      if (!segment) return null;
                      if (segment.type === 'text') {
                        return <span key={i}>{segment.content}</span>;
                      } else {
                        const index = segment.index!;
                        const isRevealed = revealed.has(index);

                        return (
                          <span key={i} className="inline-flex items-center mx-1">
                            {isRevealed || answered ? (
                              <span className={`px-2 py-1 rounded ${
                                isRevealed ? 'bg-muted text-muted-foreground' :
                                answered ? 'bg-success/20 text-success' : ''
                              }`}>
                                {segment.content}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <Input
                                  className="inline-block w-32 h-8 text-sm"
                                  placeholder="____"
                                  value={clozeAnswers[index] || ''}
                                  onChange={(e) =>
                                    setClozeAnswers({ ...clozeAnswers, [index]: e.target.value })
                                  }
                                  disabled={answered}
                                />
                                {hasFreeReveal && !hasUsedReveal && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleReveal(index)}
                                  >
                                    Reveal
                                  </Button>
                                )}
                              </span>
                            )}
                          </span>
                        );
                      }
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-4 border rounded">
                    No cloze deletions available for this card.
                  </div>
                )}
              </div>
            )}

            {!answered && (
              <div className="flex justify-end gap-2 pt-4">
                {mode === 'mcq' && card?.game?.choices && Array.isArray(card.game.choices) && card.game.choices.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setMode('cloze')}
                    disabled={!clozeText}
                  >
                    Switch to Cloze
                  </Button>
                )}
                <Button onClick={mode === 'mcq' ? handleMCQSubmit : handleClozeSubmit}>
                  Submit
                </Button>
              </div>
            )}

            {answered && (
              <div className="space-y-4 pt-4">
                <Separator />
                
                <div className={`flex items-center gap-2 text-lg font-semibold ${
                  isCorrect ? 'text-success' : 'text-destructive'
                }`}>
                  {isCorrect ? (
                    <>
                      <Check size={24} weight="bold" />
                      Correct!
                    </>
                  ) : (
                    <>
                      <X size={24} weight="bold" />
                      Incorrect
                    </>
                  )}
                </div>

                {explanation && (
                  <div className="bg-muted p-4 rounded">
                    <strong className="block mb-2">Explanation:</strong>
                    <div className="text-sm">{explanation}</div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleRating(true)}
                  >
                    Still Shaky
                  </Button>
                  <Button
                    onClick={() => handleRating(false)}
                  >
                    Got It!
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
