'use client'

import { useState } from 'react'
import { Box, Button, Collapse, Divider, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material'
import { ExpandMore, MoreHoriz, Phone, QrCode2 } from '@mui/icons-material'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { countdown, dayLabel, relative } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import type { HospitalAlert, HospitalResponse } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { BloodBadge, KeyValue, Pill, PRIORITY_TONE, RESPONSE_TONE, SlotMeter } from '../ui'

const STATE_COPY: Record<string, { tone: 'red' | 'green' | 'amber' | 'blue' | 'neutral'; label: string; live?: boolean }> = {
  dispatching: { tone: 'blue', label: 'Matching donors', live: true },
  covered: { tone: 'green', label: 'Covered' },
  exhausted: { tone: 'amber', label: 'No more donors in range' },
  closed: { tone: 'neutral', label: 'Closed' },
}

// Order donors by how actionable they are for the coordinator
const ORDER = ['accepted', 'arrived', 'standby', 'invited', 'lapsed', 'declined', 'withdrawn', 'stood_down']

export default function RequestCard({
  alert,
  onChange,
  onShare,
  defaultOpen,
}: {
  alert: HospitalAlert
  onChange: (a: HospitalAlert) => void
  onShare: (a: HospitalAlert) => void
  defaultOpen?: boolean
}) {
  const now = useNow(15000)
  const [open, setOpen] = useState(!!defaultOpen)
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const c = alert.coverage
  const active = alert.status === 'active'
  const state = active ? STATE_COPY[alert.dispatchState] : { tone: alert.status === 'fulfilled' ? 'green' : 'neutral', label: alert.status === 'fulfilled' ? 'Fulfilled' : alert.status === 'expired' ? 'Expired' : 'Cancelled' }

  const run = async (key: string, fn: () => Promise<HospitalAlert>, success?: string) => {
    setBusy(key)
    try {
      onChange(await fn())
      if (success) toast.success(success)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const close = (status: 'fulfilled' | 'cancelled') => {
    setMenu(null)
    run('close', () => api.alerts.close(alert._id, status), status === 'fulfilled' ? 'Marked fulfilled — remaining donors stood down' : 'Request cancelled — donors notified')
  }

  const responses = [...alert.responses].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
  const radius = alert.currentRadiusKm === null ? 'nationwide' : `within ${alert.currentRadiusKm} km`

  return (
    <Box
      sx={{
        bgcolor: t.surface,
        border: `1px solid ${active && alert.priority === 'critical' ? t.redSoft : t.line}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: { xs: 2.25, md: 3 } }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <BloodBadge group={alert.bloodGroup} />
          <Box flex={1} minWidth={0}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.5}>
              <Typography variant="h6" component="h3">
                {alert.unitsNeeded} × {alert.componentLabel}
              </Typography>
              <Pill tone={state.tone as any} live={(state as any).live}>
                {state.label}
              </Pill>
              {active && <Pill tone={PRIORITY_TONE[alert.priority]}>{alert.priority}</Pill>}
              {alert.requiredPhenotypeLabel && <Pill tone="red">{alert.requiredPhenotypeLabel}</Pill>}
              {alert.isPlanned && <Pill tone="blue">Planned</Pill>}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {alert.patientCondition} · needed by {dayLabel(alert.requiredBy, true)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Share live link">
              <IconButton size="small" onClick={() => onShare(alert)} aria-label="Share live link">
                <QrCode2 fontSize="small" />
              </IconButton>
            </Tooltip>
            {active && (
              <>
                <IconButton size="small" onClick={(e) => setMenu(e.currentTarget)} aria-label="More actions">
                  <MoreHoriz fontSize="small" />
                </IconButton>
                <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                  <MenuItem onClick={() => close('fulfilled')}>Mark fulfilled</MenuItem>
                  <MenuItem onClick={() => close('cancelled')} sx={{ color: t.red }}>
                    Cancel request
                  </MenuItem>
                </Menu>
              </>
            )}
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 4 }} mt={2.5} alignItems={{ md: 'center' }}>
          <Box>
            <SlotMeter needed={alert.unitsNeeded} arrived={c.arrived} held={c.held} />
            <Typography variant="caption" display="block" mt={0.75}>
              {c.arrived} donated · {c.held} on the way · {c.openSlots} open
            </Typography>
          </Box>
          <Stack direction="row" spacing={{ xs: 2.5, md: 4 }} flexWrap="wrap" useFlexGap>
            <Tooltip title="Units you can count on: donated, plus held slots weighted by each donor’s show-up record">
              <Box>
                <KeyValue label="Expected units">
                  {c.expectedUnits} / {alert.unitsNeeded}
                </KeyValue>
              </Box>
            </Tooltip>
            <KeyValue label="Awaiting reply">{c.pending}</KeyValue>
            {c.standby > 0 && <KeyValue label="Standby">{c.standby}</KeyValue>}
            {active && (
              <KeyValue label="Search">
                Wave {alert.waves.length || 0} · {radius}
              </KeyValue>
            )}
            {alert.nextWaveAt && <KeyValue label="Next wave">{countdown(alert.nextWaveAt, now)}</KeyValue>}
          </Stack>
        </Stack>
      </Box>

      <Divider />
      <Button
        fullWidth
        onClick={() => setOpen((o) => !o)}
        endIcon={<ExpandMore sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }} />}
        sx={{ borderRadius: 0, justifyContent: 'space-between', px: { xs: 2.25, md: 3 }, py: 1.25, color: t.inkMuted, '&:active': { transform: 'none' } }}
      >
        {alert.responses.length ? `${alert.responses.length} donor${alert.responses.length > 1 ? 's' : ''} contacted` : 'No donors contacted yet'}
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: { xs: 1, md: 1.5 }, pb: 1.5 }}>
          {responses.length === 0 ? (
            <Typography variant="body2" color="text.secondary" px={1.5} py={2}>
              {alert.dispatchState === 'exhausted'
                ? 'No eligible donors matched anywhere on the search ladder. We re-check every 30 minutes as new donors register — sharing the live link helps.'
                : 'The first wave is being prepared.'}
            </Typography>
          ) : (
            responses.map((r) => (
              <DonorRow
                key={r.donorId}
                r={r}
                now={now}
                active={active}
                busy={busy}
                onArrived={() => run(`a-${r.donorId}`, () => api.alerts.arrived(alert._id, r.donorId), `${r.name} donated — thank you logged`)}
                onNoShow={() => run(`n-${r.donorId}`, () => api.alerts.noShow(alert._id, r.donorId), 'Slot released to the next donor')}
              />
            ))
          )}
          {alert.waves.length > 0 && (
            <Typography variant="caption" display="block" px={1.5} pt={1.5}>
              {alert.waves.map((w) => `Wave ${w.number}: ${w.invited} invited ${w.radiusKm === null ? 'nationwide' : `≤${w.radiusKm} km`} ${relative(w.sentAt)}`).join(' · ')}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}

function DonorRow({
  r,
  now,
  active,
  busy,
  onArrived,
  onNoShow,
}: {
  r: HospitalResponse
  now: number
  active: boolean
  busy: string | null
  onArrived: () => void
  onNoShow: () => void
}) {
  const s = RESPONSE_TONE[r.status]
  // Only donors who committed get the shortcut; walk-ins can still be marked from standby
  const canArrive = active && ['accepted', 'standby'].includes(r.status)
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      spacing={1.5}
      sx={{ px: 1.5, py: 1.25, borderRadius: 2.5, '&:hover': { bgcolor: t.paper } }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth: 0 }}>
          {r.name}
        </Typography>
        <Typography variant="caption" className="tabular">
          {r.bloodGroup}
          {r.distanceKm != null ? ` · ${r.distanceKm} km` : ''}
          {r.etaMinutes ? ` · ~${r.etaMinutes} min` : ''}
          {r.wave === 0 ? ' · volunteered' : ''}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Pill tone={s.tone}>{s.label}</Pill>
        {r.status === 'accepted' && r.holdExpiresAt && <Typography variant="caption">holds {countdown(r.holdExpiresAt, now)}</Typography>}
        {r.phone && (
          <IconButton size="small" href={`tel:${r.phone}`} aria-label={`Call ${r.name}`}>
            <Phone sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        {canArrive && (
          <Button size="small" variant={r.status === 'accepted' ? 'contained' : 'outlined'} onClick={onArrived} disabled={!!busy}>
            Donated
          </Button>
        )}
        {active && r.status === 'accepted' && (
          <Button size="small" onClick={onNoShow} disabled={!!busy} sx={{ color: t.inkMuted }}>
            No-show
          </Button>
        )}
      </Stack>
    </Stack>
  )
}
