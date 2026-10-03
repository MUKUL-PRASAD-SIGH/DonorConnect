import { createTheme } from '@mui/material/styles'
import { ease, tokens as t } from './tokens'

const sans = 'var(--font-sans), "Inter", system-ui, sans-serif'
const serif = 'var(--font-serif), "Instrument Serif", Georgia, serif'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: t.red, dark: t.redDark, light: t.redSoft, contrastText: '#FFF9F3' },
    secondary: { main: t.ink, contrastText: t.surface },
    error: { main: t.red, light: t.redSoft },
    warning: { main: t.warning, light: t.warningSoft },
    info: { main: t.info, light: t.infoSoft },
    success: { main: t.success, light: t.successSoft },
    background: { default: t.paper, paper: t.surface },
    text: { primary: t.ink, secondary: t.inkMuted, disabled: t.inkSubtle },
    divider: t.line,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: sans,
    fontSize: 14,
    h1: { fontFamily: serif, fontWeight: 400, fontSize: 'clamp(2.6rem, 6vw, 4.5rem)', lineHeight: 1.02, letterSpacing: '-0.02em' },
    h2: { fontFamily: serif, fontWeight: 400, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.06, letterSpacing: '-0.015em' },
    h3: { fontFamily: serif, fontWeight: 400, fontSize: '2rem', lineHeight: 1.1, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, fontSize: '1.375rem', letterSpacing: '-0.015em' },
    h5: { fontWeight: 600, fontSize: '1.125rem', letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.005em' },
    subtitle2: { fontWeight: 600, fontSize: '0.8125rem' },
    overline: { fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.12em', lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem', color: t.inkMuted },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: t.paper },
      },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
          minHeight: 38,
          transition: `transform 160ms ${ease.out}, background-color 150ms ease, border-color 150ms ease, color 150ms ease`,
          '&:active': { transform: 'scale(0.97)' },
          '&.Mui-focusVisible': { outline: `2px solid ${t.red}`, outlineOffset: 2 },
        },
        sizeSmall: { minHeight: 32, paddingInline: 14, fontSize: '0.8125rem' },
        sizeLarge: { minHeight: 46, paddingInline: 24, fontSize: '0.9375rem' },
        outlined: {
          borderColor: t.lineStrong,
          color: t.ink,
          backgroundColor: 'transparent',
          '&:hover': { borderColor: t.ink, backgroundColor: 'transparent' },
        },
        text: { '&:hover': { backgroundColor: t.sunken } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: `transform 160ms ${ease.out}, background-color 150ms ease`,
          '&:active': { transform: 'scale(0.94)' },
          '&:hover': { backgroundColor: t.sunken },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: t.line },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { borderRadius: 16, borderColor: t.line, backgroundColor: t.surface },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600, fontSize: '0.75rem', height: 26 },
        outlined: { borderColor: t.lineStrong },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: t.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.lineStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.inkMuted },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.red, borderWidth: 1.5 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: t.red } } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, border: `1px solid ${t.line}`, boxShadow: '0 24px 64px -24px rgba(30,25,22,0.35)' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 600, fontSize: '1.125rem', paddingTop: 22 } },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(30,25,22,0.32)' } },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: t.ink, height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
          paddingInline: 4,
          marginRight: 20,
          minWidth: 0,
          color: t.inkMuted,
          '&.Mui-selected': { color: t.ink },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, height: 6, backgroundColor: t.sunken },
        bar: { borderRadius: 999 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: t.ink, fontSize: '0.75rem', borderRadius: 8, padding: '6px 10px' },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { '&.Mui-checked': { color: t.surface, '& + .MuiSwitch-track': { backgroundColor: t.success, opacity: 1 } } },
        track: { backgroundColor: t.lineStrong, opacity: 1 },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 12, alignItems: 'center' } },
    },
    MuiMenu: {
      styleOverrides: { paper: { borderRadius: 12, border: `1px solid ${t.line}`, boxShadow: '0 12px 32px -12px rgba(30,25,22,0.25)' } },
    },
  },
})
