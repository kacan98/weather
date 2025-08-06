// Centralized Design System for Smart Bike Weather

export const designSystem = {
  // Colors
  colors: {
    primary: {
      gradient: 'bg-gradient-to-r from-blue-600 to-blue-700',
      gradientHover: 'hover:from-blue-700 hover:to-blue-800',
      solid: 'bg-blue-600',
      solidHover: 'hover:bg-blue-700',
      text: 'text-blue-600',
      border: 'border-blue-500/20'
    },
    secondary: {
      text: 'text-green-600'
    },
    surface: {
      glass: 'bg-white/80 backdrop-blur-xl',
      glassLight: 'bg-white/60 backdrop-blur-lg',
      card: 'bg-white/90',
      overlay: 'bg-black/80'
    },
    background: {
      main: 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30',
      success: 'bg-green-50/80',
      warning: 'bg-yellow-50/80',
      danger: 'bg-red-50/80',
      loading: 'bg-blue-50/80',
      info: 'bg-blue-50/80',
      card: 'bg-white'
    },
    border: {
      glass: 'border-white/30',
      light: 'border-gray-200/60',
      subtle: 'border-gray-100/80',
      info: 'border-blue-200/50'
    }
  },

  // Typography
  typography: {
    heading: {
      main: 'text-3xl font-light text-gray-800',
      section: 'text-xl font-medium text-gray-700',
      recommendation: 'text-2xl font-semibold text-gray-900'
    },
    card: 'text-sm text-gray-600',
    body: {
      main: 'text-gray-600',
      small: 'text-sm text-gray-500',
      label: 'text-sm font-medium text-gray-600'
    }
  },

  // Spacing & Layout
  spacing: {
    card: 'p-6',
    cardCompact: 'p-4',
    section: 'space-y-4',
    inline: 'gap-3',
    margin: 'mb-4'
  },

  // Borders & Shadows
  effects: {
    rounded: 'rounded-2xl',
    roundedMd: 'rounded-xl',
    shadow: 'shadow-lg',
    shadowMd: 'shadow-md',
    shadowSm: 'shadow-sm'
  },

  // Animations & Transitions
  animations: {
    transition: 'transition-all duration-300',
    transitionColors: 'transition-colors duration-300',
    hover: 'hover:scale-105',
    hoverSm: 'hover:scale-102',
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    ping: 'animate-ping'
  },

  // Interactive Elements
  interactive: {
    cursor: 'cursor-pointer',
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed'
  }
};

// Pre-composed component classes for common patterns
export const componentStyles = {
  // Glass cards
  glassCard: [
    designSystem.colors.surface.glass,
    designSystem.effects.rounded,
    designSystem.effects.shadow,
    designSystem.colors.border.glass,
    'border',
    designSystem.spacing.card
  ].join(' '),

  glassCardCompact: [
    designSystem.colors.surface.glassLight,
    designSystem.effects.rounded,
    designSystem.effects.shadowMd,
    designSystem.colors.border.glass,
    'border',
    designSystem.spacing.cardCompact
  ].join(' '),

  // Buttons
  primaryButton: [
    designSystem.colors.primary.gradient,
    designSystem.colors.primary.gradientHover,
    'text-white',
    'px-10 py-4',
    designSystem.effects.rounded,
    'font-semibold',
    designSystem.interactive.cursor,
    designSystem.animations.transition,
    designSystem.interactive.disabled,
    'disabled:from-gray-400 disabled:to-gray-500',
    designSystem.effects.shadowMd,
    'hover:shadow-xl',
    designSystem.animations.hover,
    designSystem.colors.primary.border,
    'border'
  ].join(' '),

  secondaryButton: [
    designSystem.colors.surface.card,
    'text-gray-700',
    'px-4 py-2',
    designSystem.effects.roundedMd,
    'font-medium',
    designSystem.interactive.cursor,
    designSystem.animations.transition,
    'hover:bg-white hover:text-gray-900',
    'hover:shadow-md',
    designSystem.animations.hover,
    'border border-gray-200/50'
  ].join(' '),

  activeButton: [
    designSystem.colors.primary.gradient,
    'text-white',
    'px-4 py-2',
    designSystem.effects.roundedMd,
    'font-medium',
    designSystem.interactive.cursor,
    designSystem.animations.transition,
    designSystem.effects.shadowMd,
    'hover:shadow-xl',
    designSystem.animations.hover,
    designSystem.colors.primary.border,
    'border'
  ].join(' '),

  // Loading states
  loadingContainer: [
    'text-center py-16',
    designSystem.colors.background.loading,
    designSystem.effects.rounded,
    'border border-blue-100/50'
  ].join(' '),

  // Info cards
  infoCard: [
    designSystem.colors.background.info,
    designSystem.effects.rounded,
    designSystem.spacing.cardCompact,
    'border',
    designSystem.colors.border.info
  ].join(' '),

  // Charts and data visualization
  chartContainer: [
    designSystem.colors.background.card,
    designSystem.effects.rounded,
    designSystem.spacing.card,
    'border',
    designSystem.colors.border.subtle,
    designSystem.effects.shadowSm
  ].join(' ')
};

// Helper function to combine classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Theme-aware color functions
export function getRatingColorClasses(score: number) {
  if (score >= 8) return 'text-green-600 bg-green-100 fill-green-400 hover:fill-green-500';
  if (score >= 6) return 'text-yellow-600 bg-yellow-100 fill-yellow-400 hover:fill-yellow-500';
  if (score >= 4) return 'text-orange-600 bg-orange-100 fill-orange-400 hover:fill-orange-500';
  return 'text-red-600 bg-red-100 fill-red-400 hover:fill-red-500';
}

export function getProviderDisplayName(providerId: string | undefined): string {
  if (!providerId) return 'Unknown';
  const names = {
    weatherapi: 'WeatherAPI',
    openweathermap: 'OpenWeatherMap',
    tomorrow: 'Tomorrow.io'
  };
  return names[providerId as keyof typeof names] || 'Unknown';
}