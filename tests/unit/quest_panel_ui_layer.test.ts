import { describe, it, expect, vi } from 'vitest';
import { QuestPanel } from '../../src/game/ui/QuestPanel';

vi.mock('@content/registry', () => ({
  getGameState: () => ({
    storyFlags: {
      quest_intro: true,
      has_evidence_blazer: true,
      met_court_clerk: false
    }
  })
}));

class MockContainer {
  add = vi.fn();
  setDepth = vi.fn().mockReturnThis();
  destroy = vi.fn();
}

class MockRectangle {
  setStrokeStyle = vi.fn().mockReturnThis();
}

describe('QuestPanel UI layer', () => {
  it('adds the panel container to the UI layer', () => {
    const uiLayer = { add: vi.fn() };
    const mockContainer = new MockContainer();
    const add = {
      container: vi.fn(() => mockContainer),
      rectangle: vi.fn(() => new MockRectangle()),
      text: vi.fn(() => ({}))
    };

    const scene = {
      add,
      scale: { width: 800, height: 600 },
      input: {
        keyboard: null
      },
      getUILayer: () => uiLayer
    };

    const panel = new QuestPanel(scene as any);
    panel.show();

    expect(add.container).toHaveBeenCalledTimes(1);
    expect(uiLayer.add).toHaveBeenCalledWith(mockContainer);
  });
});
