import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Boon, AVAILABLE_BOONS } from '@/contexts/GameContext';
import { Sparkle, HeartStraight, ArrowsClockwise } from '@phosphor-icons/react';

interface BoonSelectionProps {
  onSelect: (boon: Boon) => void;
}

export function BoonSelection({ onSelect }: BoonSelectionProps) {
  const shuffledBoons = [...(AVAILABLE_BOONS || [])].sort(() => Math.random() - 0.5).slice(0, 3);

  const getIcon = (effect: string) => {
    switch (effect) {
      case 'free-reveal':
        return <Sparkle size={32} weight="fill" className="text-accent" />;
      case 'max-hp':
        return <HeartStraight size={32} weight="fill" className="text-success" />;
      case 'reroll':
        return <ArrowsClockwise size={32} weight="bold" className="text-primary" />;
      default:
        return <Sparkle size={32} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="max-w-4xl w-full p-8">
        <h2 className="text-3xl font-bold text-center mb-2 text-accent">Room Cleared!</h2>
        <p className="text-center text-muted-foreground mb-8">Choose your boon</p>

        <div className="grid grid-cols-3 gap-6">
          {shuffledBoons.map((boon) => boon && (
            <Card
              key={boon.id}
              className="p-6 flex flex-col items-center text-center space-y-4 cursor-pointer transition hover:border-accent hover:shadow-lg hover:-translate-y-1"
              onClick={() => onSelect(boon)}
            >
              <div className="w-16 h-16 flex items-center justify-center">
                {getIcon(boon.effect)}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">{boon.name}</h3>
                <p className="text-sm text-muted-foreground">{boon.description}</p>
              </div>
              <Button className="w-full mt-auto">Select</Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
