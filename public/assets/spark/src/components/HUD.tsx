import { Heart, CurrencyDollar, Fire, Palette } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGame } from '@/contexts/GameContext';

interface HUDProps {
  onWardrobeClick: () => void;
}

export function HUD({ onWardrobeClick }: HUDProps) {
  const { hp, maxHp, gold, streak, activeBoons } = useGame();

  const hpPercent = (hp / maxHp) * 100;

  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 min-w-[200px]">
      <div className="flex items-center gap-2">
        <Heart size={20} weight="fill" className="text-destructive" />
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>HP</span>
            <span>{hp}/{maxHp}</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div 
              className={`h-full transition-all ${
                hpPercent > 60 ? 'bg-success' :
                hpPercent > 30 ? 'bg-yellow-500' :
                'bg-destructive'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <CurrencyDollar size={16} weight="bold" className="text-success" />
          <span className="font-medium">{gold}</span>
        </div>

        {streak > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Fire size={14} weight="fill" className="text-accent" />
            <span>{streak}</span>
          </Badge>
        )}
      </div>

      {activeBoons && activeBoons.length > 0 && (
        <div className="border-t border-border pt-2">
          <div className="text-xs text-muted-foreground mb-1">Active Boons</div>
          {activeBoons.map((boon, i) => (
            <div key={i} className="text-xs text-foreground">{boon?.name || 'Unknown'}</div>
          ))}
        </div>
      )}

      <Button 
        size="sm" 
        variant="outline" 
        className="w-full mt-2"
        onClick={onWardrobeClick}
      >
        <Palette size={16} className="mr-2" />
        Wardrobe
      </Button>
    </div>
  );
}
