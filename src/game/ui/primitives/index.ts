/**
 * UI Primitives - Code-first components using Phaser Graphics.
 * No image asset dependencies - uses rectangles with stroke.
 * 
 * INVARIANT: All primitives must be attached to UI layer via
 * WorldScene.getUILayer() for proper camera isolation.
 */

export { UIPanel, createPanel } from './UIPanel';
export type { UIPanelConfig } from './UIPanel';

export { UIButton, createButton } from './UIButton';
export type { UIButtonConfig, ButtonState } from './UIButton';

export { UIChoiceList, createChoiceList } from './UIChoiceList';
export type { UIChoiceListConfig, Choice, ChoiceState } from './UIChoiceList';

export { UILabel, createLabel, createPrimaryLabel, createAccentLabel, createSecondaryLabel } from './UILabel';
export type { UILabelConfig } from './UILabel';
