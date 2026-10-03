'use client'

import { useState } from 'react'
import { Box, Grid, Stack, Tab, Tabs, Typography } from '@mui/material'
import { Inbox } from '@mui/icons-material'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import RequireRole from '@/components/RequireRole'
import InviteCard from '@/components/donor/InviteCard'
import EligibilityPanel from '@/components/donor/EligibilityPanel'
import ProfilePanel from '@/components/donor/ProfilePanel'
import ScreeningDialog from '@/components/donor/ScreeningDialog'
import { BloodBadge, EmptyState, LoadingRows, Pill, Stat } from '@/components/ui'
import { api } from '@/lib/api'
import { shortDate } from '@/lib/format'
import { useResource } from '@/lib/hooks'
import { useSocketEvent } from '@/lib/socket'
import type { DonorAlert, DonorProfile } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const EVENT_TOAST: Record<string, (a: DonorAlert) => string | null> = {
  invite: (a) => `${a.hospital?.name || 'A hospital'} needs ${a.bloodGroup} ${a.componentLabel}`,
  confirmed: (a) => `A slot opened at ${a.hospital?.name} — it’s yours`,
  stood_down: () => 'A request you were invited to is now covered. Thank you!',
  lapsed: () => 'Your held slot expired and was offered to another donor',
  closed: () => null,
  standby: () => null,
}

function DonorDashboard() {
  const [tab, setTab] = useState(0)
  const [screeningOpen, setScreeningOpen] = useState(false)
  const profile = useResource(api.donors.profile)
  const invites = useResource(api.alerts.invites)
  const nearby = useResource(api.alerts.nearby)

  useSocketEvent<{ kind: string; alert: DonorAlert }>('invite:update', ({ kind, alert }) => {
    invites.refresh()
    nearby.refresh()
    const msg = EVENT_TOAST[kind]?.(alert)
    if (msg) (kind === 'invite' || kind === 'confirmed' ? toast.success : toast)(msg)
    if (kind === 'invite') setTab(0)
  })

  const replace = (updated: DonorAlert) => {
    invites.refresh()
    nearby.setData((list) => list?.filter((a) => a._id !== updated._id))
    profile.refresh()
  }

  const p = profile.data
  const active = (invites.data || []).filter((a) => a.status === 'active' && ['invited', 'accepted', 'standby'].includes(a.myResponse?.status || ''))
  const past = (invites.data || []).filter((a) => !active.includes(a))
  const wb = p?.eligibility.components.whole_blood

  return (
    <>
      <Box component="section" pt={{ xs: 4, md: 6 }} pb={4} className="rise">
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3}>
          <Stack direction="row" spacing={2.5} alignItems="center">
            {p && <BloodBadge group={p.bloodGroup} size={64} />}
            <Box>
              <Typography variant="h2" component="h1">
                {greeting()}, <em>{p?.name.split(' ')[0] || '…'}</em>
              </Typography>
              <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
                {p &&
                  (p.availableForEmergency ? (
                    <Pill tone="green" live>
                      Available for requests
                    </Pill>
                  ) : (
                    <Pill>Paused — not receiving invites</Pill>
                  ))}
                {p?.rarePhenotypes.length ? <Pill tone="red">Rare blood registry</Pill> : null}
              </Stack>
            </Box>
          </Stack>
          {p && (
            <Stack direction="row" spacing={{ xs: 3, md: 5 }} alignItems="flex-start">
              <Stat label="Donations" value={p.totalDonations} />
              <Stat
                label="Whole blood"
                value={wb?.eligible ? 'Ready' : wb?.nextEligibleDate ? shortDate(wb.nextEligibleDate).replace(/ \d{4}$/, '') : '—'}
                hint={wb?.eligible ? 'You can donate today' : 'Next eligible'}
                tone={wb?.eligible ? 'red' : 'ink'}
              />
            </Stack>
          )}
        </Stack>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: `1px solid ${t.line}`, mb: 3.5 }}>
        <Tab label={`Requests${active.length ? ` · ${active.length}` : ''}`} />
        <Tab label="Eligibility" />
        <Tab label="Profile" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
              Your invites
            </Typography>
            {invites.loading ? (
              <LoadingRows rows={2} height={180} />
            ) : active.length ? (
              <Stack spacing={2} className="stagger">
                {active.map((a) => (
                  <InviteCard key={a._id} alert={a} onChange={replace} />
                ))}
              </Stack>
            ) : (
              <EmptyState
                icon={<Inbox />}
                title={
                  <>
                    Nothing needs you <em>right now</em>
                  </>
                }
                body="We only invite a few well-matched donors at a time, so you won’t get a flood of alerts. Keep your screening current and we’ll reach you when it counts."
              />
            )}
            {past.length > 0 && (
              <>
                <Typography variant="overline" color="text.secondary" display="block" mt={5} mb={1.5}>
                  Recent
                </Typography>
                <Stack spacing={1.5}>
                  {past.slice(0, 5).map((a) => (
                    <InviteCard key={a._id} alert={a} onChange={replace} />
                  ))}
                </Stack>
              </>
            )}
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
              Open requests near you
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Requests you match but haven’t been invited to yet. Offering puts you straight into an open slot.
            </Typography>
            {nearby.loading ? (
              <LoadingRows rows={2} height={160} />
            ) : nearby.data?.length ? (
              <Stack spacing={2}>
                {nearby.data.map((a) => (
                  <InviteCard key={a._id} alert={a} onChange={replace} volunteer />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, borderTop: `1px solid ${t.line}` }}>
                No other open requests match your blood group nearby.
              </Typography>
            )}
          </Grid>
        </Grid>
      )}

      {tab === 1 && (p ? <EligibilityPanel profile={p} onScreen={() => setScreeningOpen(true)} /> : <LoadingRows rows={2} height={160} />)}
      {tab === 2 && (p ? <ProfilePanel profile={p} onSaved={(x: DonorProfile) => profile.setData(x)} /> : <LoadingRows rows={2} height={200} />)}

      {p && (
        <ScreeningDialog
          open={screeningOpen}
          onClose={() => setScreeningOpen(false)}
          profile={p}
          onSaved={(x) => {
            profile.setData(x)
            nearby.refresh()
          }}
        />
      )}
    </>
  )
}

export default function Page() {
  return (
    <AppShell>
      <RequireRole role="donor">
        <DonorDashboard />
      </RequireRole>
    </AppShell>
  )
}
