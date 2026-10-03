'use client'

import { useState } from 'react'
import { Box, Button, Divider, Stack, Typography } from '@mui/material'
import { AccessTime, Directions, Phone, Place, Verified } from '@mui/icons-material'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { countdown, dayLabel } from '@/lib/format'
import { useNow } from '@/lib/hooks'
import type { DonorAlert } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { BloodBadge, Pill, PRIORITY_TONE, SlotMeter } from '../ui'

type Props = { alert: DonorAlert; onChange: (a: DonorAlert) => void; volunteer?: boolean }

export default function InviteCard({ alert, onChange, volunteer }: Props) {
  const now = useNow(15000)
  const [busy, setBusy] = useState<string | null>(null)
  const status = alert.myResponse?.status
  const closed = alert.status !== 'active'
  const held = status === 'accepted'

  const act = async (action: 'accept' | 'decline' | 'withdraw') => {
    setBusy(action)
    try {
      const updated = await api.alerts.respond(alert._id, action)
      onChange(updated)
      const s = updated.myResponse?.status
      if (s === 'accepted') toast.success('Slot held — the hospital is expecting you')
      else if (s === 'standby') toast('All slots just filled — you’re on standby')
      else if (action === 'withdraw') toast('Slot released to the next donor')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const tone = closed || status === 'stood_down' ? 'muted' : held ? 'held' : status === 'standby' ? 'standby' : 'open'
  const border = { held: t.success, standby: t.warning, open: t.line, muted: t.line }[tone]
  const [lng, lat] = alert.hospital?.location || []

  return (
    <Box
      className="lift"
      sx={{
        bgcolor: t.surface,
        border: `1px solid ${border}`,
        boxShadow: held ? `0 0 0 3px ${t.successSoft}` : 'none',
        borderRadius: 4,
        p: { xs: 2.25, md: 3 },
        opacity: tone === 'muted' ? 0.72 : 1,
        transition: 'box-shadow 200ms ease, border-color 200ms ease, opacity 200ms ease',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <BloodBadge group={alert.bloodGroup} />
        <Box flex={1} minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={0.75}>
            <Typography variant="h6" component="h3" noWrap>
              {alert.hospital?.name || 'Hospital'}
            </Typography>
            {alert.hospital?.verified && <Verified sx={{ fontSize: 16, color: t.info }} titleAccess="Verified hospital" />}
          </Stack>
          <Typography color="text.secondary" variant="body2" mb={1.5}>
            {alert.unitsNeeded} unit{alert.unitsNeeded > 1 ? 's' : ''} of {alert.componentLabel}
            {alert.requiredPhenotypeLabel ? ` · ${alert.requiredPhenotypeLabel}` : ''}
            {alert.isPlanned ? ' · planned appointment' : ''}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {!closed && <Pill tone={PRIORITY_TONE[alert.priority]}>{alert.priority === 'critical' ? 'Critical' : alert.priority[0].toUpperCase() + alert.priority.slice(1)}</Pill>}
            {alert.requiredPhenotype && <Pill tone="red">Rare blood</Pill>}
            <Pill icon={<AccessTime />}>Needed by {dayLabel(alert.requiredBy)}</Pill>
            {(alert.myResponse?.distanceKm ?? alert.distanceKm) != null && (
              <Pill icon={<Place />}>
                {alert.myResponse?.distanceKm ?? alert.distanceKm} km
                {alert.myResponse?.etaMinutes ? ` · ~${alert.myResponse.etaMinutes} min` : ''}
              </Pill>
            )}
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ my: 2.25 }} />

      {held ? (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography fontWeight={600} color={t.success}>
                Your slot is held{alert.myResponse?.holdExpiresAt ? ` for ${countdown(alert.myResponse.holdExpiresAt, now)}` : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {alert.hospital?.address}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {lat != null && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Directions />}
                  href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                  target="_blank"
                  rel="noopener"
                >
                  Directions
                </Button>
              )}
              {alert.hospital?.emergencyContact && (
                <Button size="small" variant="outlined" startIcon={<Phone />} href={`tel:${alert.hospital.emergencyContact}`}>
                  Call
                </Button>
              )}
            </Stack>
          </Stack>
          <Button size="small" onClick={() => act('withdraw')} disabled={!!busy} sx={{ mt: 1.5, ml: -1.5, color: t.inkMuted }}>
            {busy === 'withdraw' ? 'Releasing…' : 'I can’t make it — release my slot'}
          </Button>
        </Box>
      ) : status === 'standby' ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            <b style={{ color: t.warning }}>You’re on standby.</b> Every slot is held — if someone drops out, the slot is yours automatically.
          </Typography>
          <Button size="small" onClick={() => act('withdraw')} disabled={!!busy}>
            Leave standby
          </Button>
        </Stack>
      ) : closed || status === 'stood_down' || status === 'arrived' || status === 'declined' || status === 'lapsed' || status === 'withdrawn' ? (
        <Typography variant="body2" color="text.secondary">
          {status === 'arrived'
            ? 'You donated for this request. Thank you.'
            : alert.status === 'fulfilled' || status === 'stood_down'
              ? 'Covered — no need to travel. Thank you for being ready.'
              : status === 'declined'
                ? 'You declined this request.'
                : status === 'lapsed'
                  ? 'Your hold expired and the slot went to another donor.'
                  : status === 'withdrawn'
                    ? 'You released your slot.'
                    : 'This request has closed.'}
        </Typography>
      ) : (
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SlotMeter needed={alert.unitsNeeded} arrived={alert.unitsCollected} held={alert.unitsNeeded - alert.unitsCollected - alert.openSlots} size={14} />
            <Typography variant="caption">
              {alert.openSlots} of {alert.unitsNeeded} slots open
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            {!volunteer && (
              <Button variant="outlined" size="small" onClick={() => act('decline')} disabled={!!busy}>
                Not this time
              </Button>
            )}
            <Button variant="contained" size="small" onClick={() => act('accept')} disabled={!!busy}>
              {busy === 'accept' ? 'Holding…' : volunteer ? 'Offer to help' : 'Hold a slot'}
            </Button>
          </Stack>
        </Stack>
      )}

      {status === 'invited' && alert.myResponse?.replyCode && (
        <Typography variant="caption" display="block" mt={1.5}>
          No data? Text <b>YES {alert.myResponse.replyCode}</b> to reply by SMS.
        </Typography>
      )}
    </Box>
  )
}
