'use client'

import { Box, Chip, Skeleton, Stack, Typography, BoxProps } from '@mui/material'
import { tokens as t } from '@/theme/tokens'
import type { ResponseStatus } from '@/lib/types'

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.5c3.6 4.4 6.5 8.1 6.5 11.5A6.5 6.5 0 0 1 5.5 14C5.5 10.6 8.4 6.9 12 2.5Z" fill={t.red} />
        <path d="M9.2 14.3a2.8 2.8 0 0 0 2.8 2.8" stroke="#FBF7F0" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <Typography component="span" sx={{ fontWeight: 650, fontSize: size * 0.82, letterSpacing: '-0.02em', lineHeight: 1 }}>
        Donor<span className="accent" style={{ fontSize: '1.12em', color: t.red }}>Connect</span>
      </Typography>
    </Stack>
  )
}

/** Eyebrow + serif title with optional italic emphasis via <em>. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" spacing={2} mb={3}>
      <Box>
        {eyebrow && (
          <Typography variant="overline" color="primary" display="block" mb={0.5}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h3" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" mt={1} maxWidth={620}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  )
}

export function Panel({ children, sx, ...rest }: BoxProps) {
  return (
    <Box
      sx={{ bgcolor: t.surface, border: `1px solid ${t.line}`, borderRadius: 4, p: { xs: 2.5, md: 3 }, ...sx }}
      {...rest}
    >
      {children}
    </Box>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'red' | 'ink' }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography
        className="tabular"
        sx={{ fontWeight: 600, fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.03em', color: tone === 'red' ? t.red : t.ink }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" display="block" mt={0.5}>
          {hint}
        </Typography>
      )}
    </Box>
  )
}

export function BloodBadge({ group, size = 44 }: { group: string; size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: t.redTint,
        color: t.red,
        border: `1px solid ${t.redSoft}`,
        fontWeight: 700,
        fontSize: size * 0.32,
        letterSpacing: '-0.02em',
      }}
    >
      {group}
    </Box>
  )
}

type Tone = 'red' | 'green' | 'amber' | 'blue' | 'neutral'
const TONES: Record<Tone, { bg: string; fg: string }> = {
  red: { bg: t.redSoft, fg: t.redDark },
  green: { bg: t.successSoft, fg: t.success },
  amber: { bg: t.warningSoft, fg: t.warning },
  blue: { bg: t.infoSoft, fg: t.info },
  neutral: { bg: t.sunken, fg: t.inkMuted },
}

export function Pill({ tone = 'neutral', children, live, icon }: { tone?: Tone; children: React.ReactNode; live?: boolean; icon?: React.ReactElement }) {
  const c = TONES[tone]
  return (
    <Chip
      size="small"
      icon={icon}
      label={
        <Stack direction="row" alignItems="center" spacing={0.75}>
          {live && <span className="live-dot" style={{ color: c.fg, width: 6, height: 6 }} />}
          <span>{children}</span>
        </Stack>
      }
      sx={{ bgcolor: c.bg, color: c.fg, '& .MuiChip-icon': { color: c.fg, fontSize: 16 } }}
    />
  )
}

export const RESPONSE_TONE: Record<ResponseStatus, { tone: Tone; label: string }> = {
  invited: { tone: 'blue', label: 'Invited' },
  accepted: { tone: 'green', label: 'Slot held' },
  standby: { tone: 'amber', label: 'Standby' },
  declined: { tone: 'neutral', label: 'Declined' },
  arrived: { tone: 'green', label: 'Donated' },
  lapsed: { tone: 'red', label: 'Hold lapsed' },
  withdrawn: { tone: 'neutral', label: 'Withdrew' },
  stood_down: { tone: 'neutral', label: 'Stood down' },
}

export const PRIORITY_TONE: Record<string, Tone> = { critical: 'red', high: 'red', medium: 'amber', low: 'neutral' }

/**
 * One cell per unit needed: donated (solid), held (outlined green), open (dashed).
 * Communicates "how covered are we" faster than any number.
 */
export function SlotMeter({ needed, arrived, held, size = 18 }: { needed: number; arrived: number; held: number; size?: number }) {
  const cells = Array.from({ length: needed }, (_, i) => (i < arrived ? 'arrived' : i < arrived + held ? 'held' : 'open'))
  return (
    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap aria-label={`${arrived} donated, ${held} held, ${needed - arrived - held} open`}>
      {cells.map((c, i) => (
        <Box
          key={i}
          sx={{
            width: size,
            height: size * 1.25,
            borderRadius: '6px',
            transition: 'background-color 200ms ease, border-color 200ms ease',
            bgcolor: c === 'arrived' ? t.red : c === 'held' ? t.redSoft : 'transparent',
            border: `1.5px ${c === 'open' ? 'dashed' : 'solid'} ${c === 'open' ? t.lineStrong : t.red}`,
          }}
        />
      ))}
    </Stack>
  )
}

export function EmptyState({ title, body, action, icon }: { title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: { xs: 6, md: 8 }, px: 2, border: `1px dashed ${t.lineStrong}`, borderRadius: 4 }}>
      {icon && <Box sx={{ color: t.inkSubtle, mb: 1.5, '& svg': { fontSize: 32 } }}>{icon}</Box>}
      <Typography variant="h5" component="p" mb={0.75}>
        {title}
      </Typography>
      {body && (
        <Typography color="text.secondary" maxWidth={440} mx="auto">
          {body}
        </Typography>
      )}
      {action && <Box mt={2.5}>{action}</Box>}
    </Box>
  )
}

export function LoadingRows({ rows = 3, height = 96 }: { rows?: number; height?: number }) {
  return (
    <Stack spacing={1.5}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={height} sx={{ borderRadius: 4, bgcolor: t.sunken }} />
      ))}
    </Stack>
  )
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} className="tabular">
        {children}
      </Typography>
    </Box>
  )
}
