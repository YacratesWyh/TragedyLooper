import type { GamePhase } from '@/games/tragedy-looper/types';

export const TL_THEME = {
  page: 'bg-shell-bg text-foreground',
  shell: 'bg-surface-1 border-border-soft text-foreground',
  panel: 'bg-surface-1/95 border-border-soft text-foreground',
  panelMuted: 'bg-surface-2/80 border-border-soft text-foreground',
  panelStrong: 'bg-surface-2 border-border-strong text-foreground',
  chip: 'bg-surface-2 border-border-soft text-foreground',
  chipMuted: 'bg-surface-2/70 border-border-soft text-text-muted',
  buttonMuted: 'bg-surface-3 hover:bg-surface-2 border border-border-soft text-text-muted hover:text-foreground',
  boardGradient:
    'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-2 via-shell-bg to-black',
  overlayCard: 'bg-surface-1/95 border border-border-strong text-foreground',
  handContainer: 'border-t border-border-soft bg-surface-1/90',
  handHint: 'bg-surface-2/90 border border-border-soft text-foreground',
} as const;

export const TL_PHASE_COLORS: Record<GamePhase, string> = {
  dawn: 'bg-doloris/20 border-doloris/50 text-doloris',
  mastermind_action: 'bg-timoris/20 border-timoris/50 text-timoris',
  protagonist_action: 'bg-[#FF5522]/20 border-[#FF5522]/55 text-[#FF5522]',
  resolution: 'bg-mortis/20 border-mortis/50 text-mortis',
  mastermind_ability: 'bg-timoris/15 border-timoris/40 text-timoris',
  protagonist_ability: 'bg-oblivionis/15 border-oblivionis/40 text-oblivionis',
  incident: 'bg-amoris/20 border-amoris/50 text-amoris',
  night: 'bg-surface-3/70 border-border-strong text-foreground',
  loop_end: 'bg-mortis/15 border-mortis/40 text-mortis',
  game_over: 'bg-amoris/25 border-amoris/60 text-amoris',
};

export const TL_STATUS_COLORS = {
  success: 'text-mortis',
  danger: 'text-amoris',
  warning: 'text-doloris',
  info: 'text-oblivionis',
} as const;

export const TL_ACCENT_COLORS = {
  protagonistRows: ['#8d6ea3', '#b16a85', '#6f9870'] as const,
  protagonistSpecial: '#6f7a94',
} as const;
