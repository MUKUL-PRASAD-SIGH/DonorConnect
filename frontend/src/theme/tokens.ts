// Single source of truth for colours, mirrored as CSS variables in globals.css.
// Warm paper neutrals + one deep oxblood red. Semantic colours are muted so the
// red stays reserved for what actually needs attention.
export const tokens = {
  paper: '#F3ECE0',
  surface: '#FBF7F0',
  sunken: '#EDE4D5',
  line: '#E0D5C3',
  lineStrong: '#CDBFA9',
  ink: '#1E1916',
  inkMuted: '#6A5F55',
  inkSubtle: '#958879',
  red: '#9E1B22',
  redDark: '#7C1219',
  redSoft: '#F2DCD7',
  redTint: '#F8ECE8',
  success: '#2E6A4F',
  successSoft: '#DCEBE2',
  warning: '#9A6512',
  warningSoft: '#F3E6CC',
  info: '#3A5674',
  infoSoft: '#DEE6EE',
} as const

export const ease = {
  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
  inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
  drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
}
