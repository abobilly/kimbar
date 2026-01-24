import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download, ArrowClockwise } from '@phosphor-icons/react';
import { useGame } from '@/contexts/GameContext';
import { CanonicalSubject } from '@/types/flashcard';
import { OUTFIT_ITEMS } from '@/types/outfit';

interface ResultsScreenProps {
  onNewRun: () => void;
  newUnlocks: string[];
}

export function ResultsScreen({ onNewRun, newUnlocks }: ResultsScreenProps) {
  const { runStats, missedCards, shakyCards, deck } = useGame();

  const subjects = Object.keys(runStats) as CanonicalSubject[];

  const handleExport = () => {
    const data = {
      completedAt: Date.now(),
      runStats,
      missedCardIds: missedCards || [],
      shakyCardIds: shakyCards || [],
      studyQueue: [...new Set([...(missedCards || []), ...(shakyCards || [])])],
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bar-exam-dungeon-run-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCardById = (id: string) => {
    if (!deck || !deck.cards || !Array.isArray(deck.cards)) return undefined;
    return deck.cards.find(c => c && c.id === id);
  };

  const unlockedItems = (newUnlocks || [])
    .map(id => OUTFIT_ITEMS.find(item => item && item.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="max-w-4xl w-full max-h-[90vh]">
        <ScrollArea className="h-full max-h-[90vh]">
          <div className="p-8 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2 text-accent">Run Complete!</h1>
              <p className="text-muted-foreground">Here's how you did</p>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">Performance by Subject</h3>
              <div className="space-y-3">
                {subjects.map(subject => {
                  const stats = runStats[subject];
                  const accuracy = stats.attempts > 0
                    ? Math.round((stats.correct / stats.attempts) * 100)
                    : 0;

                  return (
                    <div key={subject} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{subject}</div>
                        <div className="text-sm text-muted-foreground">
                          {stats.correct}/{stats.attempts} correct
                        </div>
                      </div>
                      <Badge
                        className={
                          accuracy >= 80 ? 'bg-success' :
                          accuracy >= 60 ? 'bg-yellow-500' :
                          'bg-destructive'
                        }
                      >
                        {accuracy}%
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {(missedCards || []).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">Missed Cards ({(missedCards || []).length})</h3>
                  <ScrollArea className="h-48 border rounded p-3">
                    <div className="space-y-2">
                      {(missedCards || []).slice(0, 10).map(cardId => {
                        const card = getCardById(cardId);
                        if (!card) return null;
                        return (
                          <div key={cardId} className="text-sm">
                            <div className="font-medium">{card.subject}</div>
                            <div className="text-muted-foreground text-xs">
                              {card.game?.stem || card.frontPrompt || cardId}
                            </div>
                          </div>
                        );
                      })}
                      {(missedCards || []).length > 10 && (
                        <div className="text-xs text-muted-foreground text-center pt-2">
                          ...and {(missedCards || []).length - 10} more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            {(shakyCards || []).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">Marked "Still Shaky" ({(shakyCards || []).length})</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    These will appear more often in future runs
                  </p>
                </div>
              </>
            )}

            {unlockedItems && unlockedItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">New Outfits Unlocked! 🎉</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {unlockedItems.map(item => item && (
                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded bg-accent/5">
                        <div
                          className="w-12 h-12 rounded border-2 border-accent"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="text-sm">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.slot}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-3">
              <Button onClick={handleExport} variant="outline" className="flex-1">
                <Download size={18} className="mr-2" />
                Export Results
              </Button>
              <Button onClick={onNewRun} className="flex-1">
                <ArrowClockwise size={18} className="mr-2" />
                Start New Run
              </Button>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
