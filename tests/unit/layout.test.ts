/**
 * Unit tests for layout.ts
 * 
 * These tests verify that layout calculations produce valid,
 * in-bounds results across various viewport sizes.
 */

import { describe, it, expect } from 'vitest';
import {
  layoutDialogue,
  layoutEncounter,
  layoutHUD,
  layoutMenu,
  clampToViewport,
  isWithinViewport
} from '../../src/game/ui/layout';

describe('layoutDialogue', () => {
  it('should return valid layout for standard 1024x768 viewport', () => {
    const layout = layoutDialogue(1024, 768);
    
    expect(layout.boxY).toBeGreaterThan(0);
    expect(layout.boxY).toBeLessThan(768);
    expect(layout.boxHeight).toBeGreaterThanOrEqual(200);
    expect(layout.boxHeight).toBeLessThanOrEqual(320);
    expect(layout.boxWidth).toBeLessThan(1024);
    expect(layout.boxCenterX).toBe(512);
    expect(layout.textWrapWidth).toBeGreaterThan(0);
    expect(layout.choiceBaseY).toBeLessThan(768);
  });

  it('should handle small viewport (640x480)', () => {
    const layout = layoutDialogue(640, 480);
    
    expect(layout.boxHeight).toBeGreaterThanOrEqual(200); // Min height
    expect(layout.boxY).toBeGreaterThanOrEqual(0);
    expect(layout.boxY + layout.boxHeight).toBeLessThanOrEqual(480);
    expect(layout.continueY).toBeLessThan(480);
  });

  it('should handle large viewport (1920x1080)', () => {
    const layout = layoutDialogue(1920, 1080);
    
    expect(layout.boxHeight).toBeLessThanOrEqual(320); // Max height
    expect(layout.boxWidth).toBeGreaterThan(0);
    expect(layout.boxCenterX).toBe(960);
  });

  it('should handle ultra-wide aspect ratio (2560x720)', () => {
    const layout = layoutDialogue(2560, 720);
    
    expect(layout.boxY).toBeGreaterThan(0);
    expect(layout.boxHeight).toBeGreaterThanOrEqual(200);
    expect(layout.continueY).toBeLessThan(720);
  });

  it('should handle tall aspect ratio (600x1024)', () => {
    const layout = layoutDialogue(600, 1024);
    
    expect(layout.boxHeight).toBeLessThanOrEqual(320);
    expect(layout.boxY + layout.boxHeight).toBeLessThanOrEqual(1024);
    expect(layout.choiceWidth).toBeLessThan(600);
  });
});

describe('layoutEncounter', () => {
  it('should return valid layout for standard viewport', () => {
    const layout = layoutEncounter(1024, 768);
    
    expect(layout.centerX).toBe(512);
    expect(layout.titleY).toBe(60);
    expect(layout.progressY).toBe(100);
    expect(layout.questionY).toBeGreaterThanOrEqual(140);
    expect(layout.buttonStartY).toBeGreaterThan(layout.questionY);
    expect(layout.feedbackY).toBeLessThan(768);
    expect(layout.continueY).toBeLessThan(768);
  });

  it('should keep all elements in bounds on small viewport', () => {
    const layout = layoutEncounter(640, 480);
    
    // Title and progress should be visible
    expect(layout.titleY).toBeLessThan(480);
    expect(layout.progressY).toBeLessThan(480);
    
    // Question should not overlap with title
    expect(layout.questionY).toBeGreaterThan(layout.progressY);
    
    // Buttons should fit
    expect(layout.buttonStartY).toBeGreaterThan(layout.questionY);
    expect(layout.buttonWidth).toBeLessThan(640);
    
    // Feedback and continue at bottom
    expect(layout.feedbackY).toBeLessThan(480);
    expect(layout.continueY).toBeLessThan(480);
  });

  it('should have reasonable button spacing', () => {
    const layout = layoutEncounter(1024, 768);
    
    expect(layout.buttonSpacing).toBeGreaterThanOrEqual(50);
    expect(layout.buttonSpacing).toBeLessThanOrEqual(65);
    expect(layout.buttonHeight).toBe(55);
  });

  it('should position cancel button in top-right', () => {
    const layout = layoutEncounter(1024, 768);
    
    expect(layout.cancelX).toBeGreaterThan(900);
    expect(layout.cancelY).toBeLessThan(100);
  });
});

describe('layoutHUD', () => {
  it('should position stats in top-left', () => {
    const layout = layoutHUD(1024, 768);
    
    expect(layout.statsX).toBe(20); // UI_MARGIN
    expect(layout.statsY).toBe(20);
    expect(layout.statsWidth).toBe(200);
  });

  it('should position menu button in top-right', () => {
    const layout = layoutHUD(1024, 768);
    
    expect(layout.menuX).toBeGreaterThan(900);
    expect(layout.menuY).toBeLessThan(100);
  });

  it('should position notification at bottom center', () => {
    const layout = layoutHUD(1024, 768);
    
    expect(layout.notificationX).toBe(512);
    expect(layout.notificationY).toBe(718); // height - 50
  });
});

describe('layoutMenu', () => {
  it('should center menu in viewport', () => {
    const layout = layoutMenu(1024, 768);
    
    expect(layout.centerX).toBe(512);
    expect(layout.centerY).toBe(384);
  });

  it('should have consistent button spacing', () => {
    const layout = layoutMenu(1024, 768);
    
    expect(layout.buttonSpacing).toBe(60);
    expect(layout.buttonStartY).toBe(-50);
  });
});

describe('clampToViewport', () => {
  it('should clamp values to bounds with margin', () => {
    expect(clampToViewport(0, 0, 100, 10)).toBe(10);
    expect(clampToViewport(100, 0, 100, 10)).toBe(90);
    expect(clampToViewport(50, 0, 100, 10)).toBe(50);
  });

  it('should use default margin if not specified', () => {
    expect(clampToViewport(0, 0, 100)).toBe(20); // UI_MARGIN default
    expect(clampToViewport(100, 0, 100)).toBe(80);
  });
});

describe('isWithinViewport', () => {
  it('should return true when fully inside', () => {
    expect(isWithinViewport(50, 50, 20, 20, 100, 100)).toBe(true);
  });

  it('should return false when partially outside', () => {
    // Left edge
    expect(isWithinViewport(5, 50, 20, 20, 100, 100)).toBe(false);
    // Right edge
    expect(isWithinViewport(95, 50, 20, 20, 100, 100)).toBe(false);
    // Top edge
    expect(isWithinViewport(50, 5, 20, 20, 100, 100)).toBe(false);
    // Bottom edge
    expect(isWithinViewport(50, 95, 20, 20, 100, 100)).toBe(false);
  });

  it('should handle edge-aligned objects', () => {
    // Exactly touching left edge
    expect(isWithinViewport(10, 50, 20, 20, 100, 100)).toBe(true);
    // One pixel over
    expect(isWithinViewport(9, 50, 20, 20, 100, 100)).toBe(false);
  });
});
