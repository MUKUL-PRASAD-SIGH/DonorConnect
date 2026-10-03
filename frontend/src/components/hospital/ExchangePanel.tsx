'use client'

import { useState } from 'react'
import { Box, Button, Grid, Stack, Typography } from '@mui/material'
import { East, Verified } from '@mui/icons-material'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { relative } from '@/lib/format'
import { useResource } from '@/lib/hooks'
import { useSocketEvent } from '@/lib/socket'
import { COMPONENT_LABEL, ExchangeSuggestion, TransferOffer } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { BloodBadge, EmptyState, LoadingRows, Panel, Pill } from '../ui'

const OFFER_TONE: Record<TransferOffer['status'], 'blue' | 'green' | 'neutral' | 'amber'> = {
  offered: 'blue',
  accepted: 'amber',
  completed: 'green',
  declined: 'neutral',
  cancelled: 'neutral',
}

export default function ExchangePanel({ version, onChanged }: { version: number; onChanged: () => void }) {
  const suggestions = useResource(api.inventory.suggestions, [version])
  const offers = useResource(api.inventory.offers, [version])
  const [busy, setBusy] = useState<string | null>(null)

  useSocketEvent('exchange:update', () => {
    offers.refresh()
    suggestions.refresh()
    toast('A partner hospital updated a transfer')
  })

  const offer = async (s: ExchangeSuggestion) => {
    setBusy(s.lotId + s.to.hospitalId)
    try {
      offers.setData(await api.inventory.offer({ lotId: s.lotId, toHospitalId: s.to.hospitalId, units: s.suggestedUnits }))
      suggestions.refresh()
      toast.success(`Offered ${s.suggestedUnits} units to ${s.to.name}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const act = async (o: TransferOffer, action: string) => {
    setBusy(o._id)
    try {
      offers.setData(await api.inventory.updateOffer(o._id, action))
      if (action === 'complete') {
        toast.success('Units received and added to your inventory')
        onChanged()
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={7}>
        <Typography variant="overline" color="text.secondary" display="block" mb={0.5}>
          Suggested transfers
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Units you’re projected to waste, matched to hospitals within 40 km that are forecast to run short of a compatible group before
          those units expire.
        </Typography>
        {suggestions.loading ? (
          <LoadingRows rows={2} height={120} />
        ) : suggestions.data?.length ? (
          <Stack spacing={2} className="stagger">
            {suggestions.data.map((s) => (
              <Panel key={s.lotId + s.to.hospitalId}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                  <BloodBadge group={s.bloodGroup} size={40} />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600}>
                      {s.unitsAtRisk} × {COMPONENT_LABEL[s.component]} expire {relative(s.expiresAt)}
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center" mt={0.5}>
                      <East sx={{ fontSize: 14, color: t.inkSubtle }} />
                      <Typography variant="body2" color="text.secondary">
                        {s.to.name}
                      </Typography>
                      {s.to.verified && <Verified sx={{ fontSize: 14, color: t.info }} />}
                      <Typography variant="caption">· {s.to.distanceKm} km</Typography>
                    </Stack>
                    <Typography variant="caption" display="block" mt={0.5}>
                      They’re forecast to be short of {s.to.shortfallGroup} by {format(new Date(s.to.shortfallDate), 'EEE d MMM')}
                    </Typography>
                  </Box>
                  <Button variant="contained" onClick={() => offer(s)} disabled={!!busy} sx={{ flexShrink: 0 }}>
                    Offer {s.suggestedUnits}
                  </Button>
                </Stack>
              </Panel>
            ))}
          </Stack>
        ) : (
          <EmptyState
            title={
              <>
                Nothing going to <em>waste</em>
              </>
            }
            body="When units are projected to expire before you can use them, and a nearby hospital needs them, they’ll show up here."
          />
        )}
      </Grid>
      <Grid item xs={12} md={5}>
        <Typography variant="overline" color="text.secondary" display="block" mb={2}>
          Transfers
        </Typography>
        {offers.loading ? (
          <LoadingRows rows={2} height={90} />
        ) : offers.data?.length ? (
          <Stack spacing={1.5}>
            {offers.data.map((o) => {
              const incoming = o.direction === 'incoming'
              return (
                <Panel key={o._id} sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {o.units} × {o.bloodGroup} {COMPONENT_LABEL[o.component].toLowerCase()}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {incoming ? `from ${o.from.name}` : `to ${o.to.name}`} · expires {relative(o.expiresAt)}
                      </Typography>
                    </Box>
                    <Pill tone={OFFER_TONE[o.status]}>{o.status}</Pill>
                  </Stack>
                  {(incoming && ['offered', 'accepted'].includes(o.status)) || (!incoming && ['offered', 'accepted'].includes(o.status)) ? (
                    <Stack direction="row" spacing={1} mt={1.5}>
                      {incoming && o.status === 'offered' && (
                        <>
                          <Button size="small" variant="contained" onClick={() => act(o, 'accept')} disabled={!!busy}>
                            Accept
                          </Button>
                          <Button size="small" onClick={() => act(o, 'decline')} disabled={!!busy}>
                            Decline
                          </Button>
                        </>
                      )}
                      {incoming && o.status === 'accepted' && (
                        <Button size="small" variant="contained" onClick={() => act(o, 'complete')} disabled={!!busy}>
                          Confirm received
                        </Button>
                      )}
                      {!incoming && (
                        <Button size="small" onClick={() => act(o, 'cancel')} disabled={!!busy} sx={{ color: t.inkMuted }}>
                          Cancel offer
                        </Button>
                      )}
                      <Button size="small" href={`tel:${incoming ? o.from.contact : o.to.contact}`} sx={{ ml: 'auto' }}>
                        Call
                      </Button>
                    </Stack>
                  ) : null}
                </Panel>
              )
            })}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, borderTop: `1px solid ${t.line}` }}>
            No transfers yet.
          </Typography>
        )}
      </Grid>
    </Grid>
  )
}
