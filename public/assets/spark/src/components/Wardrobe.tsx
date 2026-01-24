import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useGame } from '@/contexts/GameContext';
import { OUTFIT_ITEMS, OutfitSlot } from '@/types/outfit';
import { Check } from '@phosphor-icons/react';

interface WardrobeProps {
  open: boolean;
  onClose: () => void;
}

export function Wardrobe({ open, onClose }: WardrobeProps) {
  const { unlockedOutfits, equippedOutfit, equipOutfitItem } = useGame();

  const slots: OutfitSlot[] = ['hair', 'torso', 'legs', 'shoes'];

  const getItemsForSlot = (slot: OutfitSlot) => {
    return (OUTFIT_ITEMS || []).filter(item => item?.slot === slot);
  };

  const isUnlocked = (itemId: string) => {
    return unlockedOutfits?.has(itemId) || false;
  };

  const isEquipped = (itemId: string, slot: OutfitSlot) => {
    return equippedOutfit?.[slot] === itemId;
  };

  const handleEquip = (slot: OutfitSlot, itemId: string) => {
    if (isUnlocked(itemId)) {
      equipOutfitItem(slot, itemId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Wardrobe</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="hair" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hair">Hair</TabsTrigger>
            <TabsTrigger value="torso">Torso</TabsTrigger>
            <TabsTrigger value="legs">Legs</TabsTrigger>
            <TabsTrigger value="shoes">Shoes</TabsTrigger>
          </TabsList>

          {slots.map(slot => (
            <TabsContent key={slot} value={slot} className="space-y-3">
              {getItemsForSlot(slot).map(item => {
                const unlocked = isUnlocked(item.id);
                const equipped = isEquipped(item.id, slot);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-4 border rounded transition ${
                      unlocked
                        ? equipped
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50 cursor-pointer'
                        : 'border-border opacity-50'
                    }`}
                    onClick={() => unlocked && !equipped && handleEquip(slot, item.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded border-2 border-foreground/20"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.unlockSource === 'completion' ? 'Starter' : `From ${item.unlockSource}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!unlocked && <Badge variant="secondary">Locked</Badge>}
                      {equipped && (
                        <Badge className="bg-accent text-accent-foreground">
                          <Check size={14} className="mr-1" weight="bold" />
                          Equipped
                        </Badge>
                      )}
                      {unlocked && !equipped && (
                        <Button size="sm" variant="outline">
                          Equip
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
