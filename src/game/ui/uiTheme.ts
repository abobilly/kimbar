/**
 * Centralized UI theme tokens for Kimbar.
 * Single source of truth for colors, spacing, fonts, and borders.
 * INVARIANT: Use these tokens instead of hardcoded magic numbers.
 */

import {
  UI_MARGIN, UI_PADDING, UI_GAP,
  FONT_SM, FONT_MD, FONT_LG, FONT_XL, FONT_TITLE,
  MIN_BUTTON_HEIGHT, MIN_CHOICE_HEIGHT
} from '@game/constants';

/**
 * UI Theme tokens - code-first, no image dependencies.
 */
export const uiTheme = {
  // Spacing scale (derived from constants)
  spacing: {
    xs: Math.floor(UI_GAP / 2),  // 4
    sm: UI_GAP,                   // 8
    md: UI_PADDING,               // 16
    lg: UI_MARGIN,                // 20
    xl: UI_MARGIN * 2,            // 40
  },

  // Colors (code-first, no images)
  colors: {
    // Panel backgrounds
    panelBg: 0x1a1a2e,
    panelBgAlpha: 0.95,
    panelBorder: 0x4a90a4,

    // Text colors (CSS format for Phaser Text)
    textPrimary: '#FFFFFF',
    textSecondary: '#AAAAAA',
    textAccent: '#FFD700',
    textDisabled: '#666666',
    textError: '#FF6B6B',
    textSuccess: '#6BCB77',

    // Button states (hex for Graphics)
    buttonNormal: 0x2a4858,
    buttonHover: 0x3a5868,
    buttonPressed: 0x1a3848,
    buttonDisabled: 0x1a1a2e,
    buttonBorder: 0x4a90a4,
    buttonBorderHover: 0xFFD700,
    buttonBorderDisabled: 0x333333,

    // Choice states
    choiceNormal: 0x2a3a4a,
    choiceHover: 0x3a4a5a,
    choiceSelected: 0x1a2a3a,
    choiceDisabled: 0x1a1a2e,
    choiceBorder: 0x4a90a4,
    choiceBorderSelected: 0xFFD700,

    // Scrim/overlay
    scrim: 0x000000,
    scrimAlpha: 0.3,
  },

  // Typography (string format for Phaser Text)
  fonts: {
    sm: `${FONT_SM}px`,
    md: `${FONT_MD}px`,
    lg: `${FONT_LG}px`,
    xl: `${FONT_XL}px`,
    title: `${FONT_TITLE}px`,
  },

  // Font sizes as numbers (for calculations)
  fontSizes: {
    sm: FONT_SM,
    md: FONT_MD,
    lg: FONT_LG,
    xl: FONT_XL,
    title: FONT_TITLE,
  },

  // Border/stroke thickness
  borders: {
    thin: 2,
    normal: 3,
    thick: 4,
  },

  // Corner radius (for rounded rectangles if needed)
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
  },

  // Minimum dimensions
  minDimensions: {
    buttonHeight: MIN_BUTTON_HEIGHT,
    choiceHeight: MIN_CHOICE_HEIGHT,
  },

  // Z-depths (relative to UI layer base depth)
  depth: {
    panel: 0,
    content: 10,
    buttons: 20,
    overlay: 100,
    modal: 1000,
  },

  // Animation timing (ms)
  timing: {
    instant: 0,
    fast: 100,
    normal: 200,
    slow: 400,
  },
} as const;

export type UITheme = typeof uiTheme;

/**
 * Helper to get text style object for Phaser Text.
 */
export function getTextStyle(
  size: keyof typeof uiTheme.fonts = 'md',
  color: keyof Pick<typeof uiTheme.colors, 'textPrimary' | 'textSecondary' | 'textAccent' | 'textDisabled' | 'textError' | 'textSuccess'> = 'textPrimary',
  options: { bold?: boolean; italic?: boolean; lineSpacing?: number } = {}
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontSize: uiTheme.fonts[size],
    color: uiTheme.colors[color],
    fontStyle: options.bold && options.italic ? 'bold italic' : options.bold ? 'bold' : options.italic ? 'italic' : 'normal',
    lineSpacing: options.lineSpacing ?? 4,
  };
}

/**
 * Helper to create a panel background configuration.
 */
export function getPanelConfig() {
  return {
    fillColor: uiTheme.colors.panelBg,
    fillAlpha: uiTheme.colors.panelBgAlpha,
    strokeColor: uiTheme.colors.panelBorder,
    strokeWidth: uiTheme.borders.normal,
  };
}

/**
 * Helper to create a button configuration for different states.
 */
export function getButtonConfig(state: 'normal' | 'hover' | 'pressed' | 'disabled' = 'normal') {
  switch (state) {
    case 'hover':
      return {
        fillColor: uiTheme.colors.buttonHover,
        strokeColor: uiTheme.colors.buttonBorderHover,
        strokeWidth: uiTheme.borders.normal,
      };
    case 'pressed':
      return {
        fillColor: uiTheme.colors.buttonPressed,
        strokeColor: uiTheme.colors.buttonBorder,
        strokeWidth: uiTheme.borders.normal,
      };
    case 'disabled':
      return {
        fillColor: uiTheme.colors.buttonDisabled,
        strokeColor: uiTheme.colors.buttonBorderDisabled,
        strokeWidth: uiTheme.borders.thin,
      };
    default:
      return {
        fillColor: uiTheme.colors.buttonNormal,
        strokeColor: uiTheme.colors.buttonBorder,
        strokeWidth: uiTheme.borders.normal,
      };
  }
}

/**
 * Helper to create a choice button configuration for different states.
 */
export function getChoiceConfig(state: 'normal' | 'hover' | 'selected' | 'disabled' = 'normal') {
  switch (state) {
    case 'hover':
      return {
        fillColor: uiTheme.colors.choiceHover,
        strokeColor: uiTheme.colors.choiceBorder,
        strokeWidth: uiTheme.borders.normal,
        textColor: uiTheme.colors.textPrimary,
      };
    case 'selected':
      return {
        fillColor: uiTheme.colors.choiceSelected,
        strokeColor: uiTheme.colors.choiceBorderSelected,
        strokeWidth: uiTheme.borders.thick,
        textColor: uiTheme.colors.textAccent,
      };
    case 'disabled':
      return {
        fillColor: uiTheme.colors.choiceDisabled,
        strokeColor: uiTheme.colors.buttonBorderDisabled,
        strokeWidth: uiTheme.borders.thin,
        textColor: uiTheme.colors.textDisabled,
      };
    default:
      return {
        fillColor: uiTheme.colors.choiceNormal,
        strokeColor: uiTheme.colors.choiceBorder,
        strokeWidth: uiTheme.borders.normal,
        textColor: uiTheme.colors.textPrimary,
      };
  }
}
