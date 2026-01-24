import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BookOpen, Gear, Palette } from '@phosphor-icons/react';
import { useGame } from '@/contexts/GameContext';
import { CANONICAL_SUBJECTS, CanonicalSubject } from '@/types/flashcard';
import { getSubjectStats } from '@/lib/deck';

interface StartScreenProps {
  onStartRun: () => void;
  onImportDeck: () => void;
  onOpenWardrobe: () => void;
}

export function StartScreen({ onStartRun, onImportDeck, onOpenWardrobe }: StartScreenProps) {
  const { deck, activeSubjects, toggleSubject } = useGame();
  const [showConfig, setShowConfig] = useState(false);

  const subjects = Object.keys(CANONICAL_SUBJECTS) as CanonicalSubject[];
  const stats = deck ? getSubjectStats(deck) : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="font-game-title text-3xl mb-4 text-accent">
            Bar Exam Dungeon
          </h1>
          <p className="text-muted-foreground">
            Where flashcards meet roguelite combat
          </p>
        </div>

        {!deck ? (
          <div className="space-y-4">
            <div className="bg-muted p-6 rounded-lg text-center">
              <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm mb-4">No deck loaded. Import your flashcard deck to begin.</p>
            </div>
            <Button className="w-full" size="lg" onClick={onImportDeck}>
              <BookOpen size={20} className="mr-2" />
              Import Deck
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm font-semibold mb-2">Deck Loaded</div>
              <div className="text-xs text-muted-foreground">
                {deck.totalCards} cards across {deck.subjects?.length || 0} subjects
              </div>
            </div>

            {!showConfig ? (
              <div className="space-y-3">
                <Button className="w-full" size="lg" onClick={onStartRun}>
                  Start Run
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setShowConfig(true)}>
                    <Gear size={18} className="mr-2" />
                    Configure Subjects
                  </Button>
                  <Button variant="outline" onClick={onOpenWardrobe}>
                    <Palette size={18} className="mr-2" />
                    Wardrobe
                  </Button>
                </div>
                <Button variant="ghost" className="w-full" onClick={onImportDeck}>
                  <BookOpen size={18} className="mr-2" />
                  Import Different Deck
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Select Subjects</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowConfig(false)}>
                    Done
                  </Button>
                </div>

                <div className="space-y-3">
                  {subjects.map(subject => {
                    const count = stats?.[subject] || 0;
                    const isActive = activeSubjects.has(subject);
                    const isLastActive = activeSubjects.size === 1 && isActive;

                    return (
                      <div
                        key={subject}
                        className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={subject}
                            checked={isActive}
                            onCheckedChange={() => toggleSubject(subject)}
                            disabled={isLastActive}
                          />
                          <Label htmlFor={subject} className="cursor-pointer">
                            {subject}
                          </Label>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {count} cards
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  At least one subject must be selected
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
