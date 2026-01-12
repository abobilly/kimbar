/**
 * Centralized layout calculations for responsive UI.
 * All positioning logic lives here - no magic numbers in system code.
 * 
 * INVARIANT: All layout functions are pure - same inputs yield same outputs.
 * INVARIANT: All returned positions are within viewport bounds.
 */

import {
  UI_MARGIN, UI_PADDING, UI_GAP,
  DIALOGUE_BOX_HEIGHT_RATIO, DIALOGUE_BOX_MIN_HEIGHT, DIALOGUE_BOX_MAX_HEIGHT,
  MIN_CHOICE_HEIGHT
} from '@game/constants';

// ============================================================================
// Timing Constants (centralized)
// ============================================================================

export const TYPEWRITER_SPEED_MS = 30;
export const HINT_DISPLAY_MS = 3000;
export const NOTIFICATION_DURATION_MS = 2000;
export const NOTIFICATION_FADE_MS = 500;

// ============================================================================
// Layout Types
// ============================================================================

export interface DialogueLayout {
  boxY: number;
  boxHeight: number;
  boxWidth: number;
  boxCenterX: number;
  boxCenterY: number;
  portraitX: number;
  portraitY: number;
  namePlateX: number;
  namePlateY: number;
  textX: number;
  textY: number;
  textWrapWidth: number;
  continueX: number;
  continueY: number;
  choiceWidth: number;
  choiceHeight: number;
  choiceSpacing: number;
  /** Y position for bottom-most choice (stack upward from here) */
  choiceBaseY: number;
}

export interface EncounterLayout {
  /** Center X for all elements */
  centerX: number;
  /** Title Y position */
  titleY: number;
  /** Progress text Y position */
  progressY: number;
  /** Question text Y position */
  questionY: number;
  /** Max width for question text wrap */
  questionWrapWidth: number;
  /** Starting Y for first answer button */
  buttonStartY: number;
  /** Spacing between answer buttons */
  buttonSpacing: number;
  /** Width of answer buttons */
  buttonWidth: number;
  /** Height of answer buttons */
  buttonHeight: number;
  /** X position for cancel button */
  cancelX: number;
  /** Y position for cancel button */
  cancelY: number;
  /** Y position for feedback box center */
  feedbackY: number;
  /** Height of feedback box */
  feedbackHeight: number;
  /** Width of feedback box */
  feedbackWidth: number;
  /** Y position for continue prompt */
  continueY: number;
  /** Hint button position */
  hintX: number;
  hintY: number;
}

export interface HUDLayout {
  /** Stats panel position */
  statsX: number;
  statsY: number;
  statsWidth: number;
  statsHeight: number;
  /** Menu button position */
  menuX: number;
  menuY: number;
  /** Notification position */
  notificationX: number;
  notificationY: number;
}

export interface MenuLayout {
  centerX: number;
  centerY: number;
  titleY: number;
  buttonStartY: number;
  buttonSpacing: number;
}

// ============================================================================
// Layout Calculators
// ============================================================================

/**
 * Calculate dialogue box layout for given viewport.
 */
export function layoutDialogue(width: number, height: number): DialogueLayout {
  const isSmallHeight = height < 600;

  const boxHeight = Math.min(
    DIALOGUE_BOX_MAX_HEIGHT,
    Math.max(DIALOGUE_BOX_MIN_HEIGHT, Math.floor(height * DIALOGUE_BOX_HEIGHT_RATIO))
  );
  const boxY = height - boxHeight;
  const boxWidth = width - UI_MARGIN * 2;
  
  // Compact choices for small screens to ensure they fit in the box
  const choiceHeight = isSmallHeight ? 32 : MIN_CHOICE_HEIGHT;
  const choiceSpacing = isSmallHeight ? 5 : UI_GAP;
  const choiceBottomPadding = 35;
  
  return {
    boxY,
    boxHeight,
    boxWidth,
    boxCenterX: width / 2,
    boxCenterY: boxY + boxHeight / 2,
    portraitX: 50,
    portraitY: boxY + 50,
    namePlateX: 140,
    namePlateY: boxY + 10,
    textX: UI_MARGIN * 2,
    textY: boxY + UI_PADDING * 2,
    textWrapWidth: width - UI_MARGIN * 4,
    continueX: width - UI_MARGIN * 3,
    continueY: height - UI_PADDING * 2,
    choiceWidth: width - 100,
    choiceHeight,
    choiceSpacing,
    choiceBaseY: height - choiceBottomPadding
  };
}

/**
 * Calculate encounter UI layout for given viewport.
 */
export function layoutEncounter(width: number, height: number): EncounterLayout {
  const isSmallHeight = height < 600;
  
  const buttonHeight = isSmallHeight ? 42 : 55;
  const feedbackHeight = isSmallHeight ? 80 : 100;
  
  // Ensure buttons don't overlap (min spacing > button height)
  const minButtonSpacing = buttonHeight + 5;
  const buttonSpacing = Math.min(65, Math.max(minButtonSpacing, height * 0.08));
  
  // Use percentage-based margins for better scaling
  const sideMargin = Math.max(40, width * 0.05);  // At least 40px or 5% of width
  const contentWidth = width - sideMargin * 2;
  
  // Compact vertical layout for small screens
  const titleY = isSmallHeight ? 30 : 60;
  const progressY = isSmallHeight ? 60 : 100;
  
  // Question position
  const questionY = isSmallHeight 
    ? 90 
    : Math.max(125, height * 0.15);
  
  // Button start position
  const buttonStartY = isSmallHeight
    ? questionY + 50
    : Math.max(questionY + 60, height * 0.30);
  
  return {
    centerX: width / 2,
    titleY,
    progressY,
    questionY,
    questionWrapWidth: contentWidth - 40,  // Extra padding for text
    buttonStartY,
    buttonSpacing,
    buttonWidth: contentWidth,
    buttonHeight,
    cancelX: width - 50,
    cancelY: isSmallHeight ? 30 : 50,
    feedbackY: height - feedbackHeight - (isSmallHeight ? 20 : 60),
    feedbackHeight,
    feedbackWidth: contentWidth,
    continueY: height - 30,
    hintX: width - sideMargin - 30,
    hintY: isSmallHeight ? 30 : 60
  };
}

/**
 * Calculate HUD layout for given viewport.
 */
export function layoutHUD(width: number, height: number): HUDLayout {
  return {
    statsX: UI_MARGIN,
    statsY: UI_MARGIN,
    statsWidth: 200,
    statsHeight: 100,
    menuX: width - UI_MARGIN - 30,
    menuY: UI_MARGIN + 20,
    notificationX: width / 2,
    notificationY: height - 50
  };
}

/**
 * Calculate menu layout for given viewport.
 */
export function layoutMenu(width: number, height: number): MenuLayout {
  return {
    centerX: width / 2,
    centerY: height / 2,
    titleY: -150,
    buttonStartY: -50,
    buttonSpacing: 60
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp a value to viewport bounds with margin.
 */
export function clampToViewport(
  value: number,
  min: number,
  max: number,
  margin: number = UI_MARGIN
): number {
  return Math.max(min + margin, Math.min(max - margin, value));
}

/**
 * Check if a rectangle is fully within viewport bounds.
 */
export function isWithinViewport(
  x: number,
  y: number,
  objWidth: number,
  objHeight: number,
  viewWidth: number,
  viewHeight: number
): boolean {
  return (
    x - objWidth / 2 >= 0 &&
    x + objWidth / 2 <= viewWidth &&
    y - objHeight / 2 >= 0 &&
    y + objHeight / 2 <= viewHeight
  );
}
