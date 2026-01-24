export interface ClozeSegment {
  type: 'text' | 'blank';
  content: string;
  index?: number;
}

export function parseCloze(text: string): ClozeSegment[] {
  if (!text) return [];
  
  const segments: ClozeSegment[] = [];
  const regex = /\{\{c(\d+)::([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: 'blank',
      content: match[2],
      index: parseInt(match[1]),
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

export function checkClozeAnswer(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[.,;:!?'"]/g, '');

  return normalize(expected) === normalize(provided);
}

export function extractClozeAnswers(text: string): string[] {
  const regex = /\{\{c\d+::([^}]+)\}\}/g;
  const answers: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    answers.push(match[1]);
  }

  return answers;
}
