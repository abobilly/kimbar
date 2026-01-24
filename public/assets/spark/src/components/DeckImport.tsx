import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Check, X } from '@phosphor-icons/react';
import { validateDeck } from '@/lib/deck';
import { FlashcardDeck } from '@/types/flashcard';

interface DeckImportProps {
  onImport: (deck: FlashcardDeck) => void;
  onCancel: () => void;
}

export function DeckImport({ onImport, onCancel }: DeckImportProps) {
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    deck?: FlashcardDeck;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateDeck(data);
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: ['Failed to parse JSON file'],
      });
    }
  };

  const handleImport = () => {
    if (validationResult?.valid && validationResult.deck) {
      onImport(validationResult.deck);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateDeck(data);
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: ['Failed to parse JSON file'],
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-8">
        <h2 className="text-2xl font-bold mb-6">Import Flashcard Deck</h2>

        <div
          className="border-2 border-dashed border-border rounded-lg p-12 text-center mb-6 cursor-pointer hover:border-accent transition"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg mb-2">Drop your JSON file here</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {validationResult && (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 p-4 rounded ${
              validationResult.valid ? 'bg-success/10' : 'bg-destructive/10'
            }`}>
              {validationResult.valid ? (
                <Check size={24} weight="bold" className="text-success flex-shrink-0" />
              ) : (
                <X size={24} weight="bold" className="text-destructive flex-shrink-0" />
              )}
              <div className="flex-1">
                {validationResult.valid && validationResult.deck ? (
                  <div>
                    <div className="font-semibold mb-2">Deck Valid</div>
                    <div className="text-sm space-y-1">
                      <div>{validationResult.deck.totalCards} cards loaded</div>
                      <div>{validationResult.deck.subjects?.length || 0} subjects found</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold mb-2">Validation Failed</div>
                    <ul className="text-sm space-y-1">
                      {(validationResult.errors || []).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {validationResult.errors && validationResult.errors.length > 0 && validationResult.valid && (
              <div className="bg-muted p-4 rounded text-sm">
                <div className="font-semibold mb-2">Warnings:</div>
                <ul className="space-y-1">
                  {validationResult.errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!validationResult?.valid}
            className="flex-1"
          >
            Import Deck
          </Button>
        </div>

        <div className="mt-8 p-4 bg-muted rounded text-sm">
          <div className="font-semibold mb-2">Expected Format:</div>
          <pre className="font-mono text-xs overflow-x-auto">
{`{
  "totalCards": 100,
  "subjects": ["Torts", "Contracts", ...],
  "cards": [
    {
      "id": "card-1",
      "subject": "Torts",
      "frontPrompt": "...",
      "game": {
        "stem": "Which element...",
        "choices": ["A", "B", "C", "D"],
        "answerIndex": 2,
        "explain": "..."
      }
    }
  ]
}`}
          </pre>
        </div>
      </Card>
    </div>
  );
}
