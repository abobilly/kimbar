/**
 * Edge case tests for layout calculations.
 * Focusing on small screens, tall aspect ratios, and ultra-wide displays.
 */

import { describe, it, expect } from 'vitest';
import { layoutDialogue, layoutEncounter } from '../../src/game/ui/layout';

describe('Layout Edge Cases', () => {

  describe('Small Screen (640x480)', () => {
    it('Dialogue: should have safe text wrapping and visibility', () => {
      const layout = layoutDialogue(640, 480);
      
      // Text wrap must be positive and leave room for margins
      expect(layout.textWrapWidth).toBeGreaterThan(300);
      expect(layout.textWrapWidth).toBeLessThan(640);
      
      // Continue button must be visible
      expect(layout.continueY).toBeLessThan(480);
      expect(layout.continueY).toBeGreaterThan(400); // Should be near bottom
      
      // Box should take up reasonable height (min 200px)
      expect(layout.boxHeight).toBeGreaterThanOrEqual(200);
      expect(layout.boxY).toBeLessThan(480 - 150);
    });

    it('Encounter: feedback should not overlap answer buttons', () => {
      const layout = layoutEncounter(640, 480);
      
      // Assume 4 buttons
      const lastButtonY = layout.buttonStartY + (3 * layout.buttonSpacing);
      const lastButtonBottom = lastButtonY + (layout.buttonHeight / 2);
      
      // Feedback box top
      const feedbackTop = layout.feedbackY - (layout.feedbackHeight / 2);
      
      // Should have some gap (e.g., >= 5px)
      expect(feedbackTop).toBeGreaterThan(lastButtonBottom + 5);
      
      // Feedback should be fully visible
      expect(layout.feedbackY + layout.feedbackHeight/2).toBeLessThan(480);
    });
  });

  describe('Tall Mobile (600x800)', () => {
    it('Dialogue: should handle narrow width', () => {
      const layout = layoutDialogue(600, 800);
      
      expect(layout.boxWidth).toBe(600 - 40); // 20px margin each side
      expect(layout.textWrapWidth).toBe(600 - 80); // Double margin
      expect(layout.choiceWidth).toBeLessThan(600);
    });

    it('Encounter: vertical spacing should use available height', () => {
      const layout = layoutEncounter(600, 800);
      
      // More vertical space means larger spacing allowed
      expect(layout.buttonSpacing).toBeGreaterThan(50);
      
      // Feedback should sit comfortably at bottom
      expect(layout.feedbackY).toBeGreaterThan(600); 
    });
  });

  describe('Ultrawide (2560x720)', () => {
    it('Dialogue: should span width but maintain height constraints', () => {
      const layout = layoutDialogue(2560, 720);
      
      // Width spans screen
      expect(layout.boxWidth).toBeGreaterThan(2000);
      
      // Height restricted by ratio/max
      expect(layout.boxHeight).toBeLessThan(350);
      
      // Centered correctly
      expect(layout.boxCenterX).toBe(1280);
    });

    it('Encounter: elements should be centered', () => {
      const layout = layoutEncounter(2560, 720);
      
      expect(layout.centerX).toBe(1280);
      expect(layout.buttonWidth).toBeGreaterThan(2000); // Buttons span width
      // Note: In a real game, might want max-width on buttons for ultrawide, 
      // but current logic scales with width.
    });
  });
});
