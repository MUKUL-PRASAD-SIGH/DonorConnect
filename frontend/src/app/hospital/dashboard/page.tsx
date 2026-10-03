'use client'

import { useState } from 'react'
import { Alert as MuiAlert, Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material'
import { Add } from '@mui/icons-material'
import AppShell from '@/components/AppShell'
import RequireRole from '@/components/RequireRole'
import RequestCard from '@/components/hospital/RequestCard'
import CreateRequestDialog, { RequestPreset } from '@/components/hospital/CreateRequestDialog'
import ShareDialog from '@/components/hospital/ShareDialog'
import InventoryPanel from '@/components/hospital/InventoryPanel'
import ForecastPanel from '@/components/hospital/ForecastPanel'
import ExchangePanel from '@/components/hospital/ExchangePanel'
import { EmptyState, LoadingRows, Pill, Stat } from '@/components/ui'
import { api } from '@/lib/api'
import { useResource } from '@/lib/hooks'
import { useSocketEvent } from '@/lib/socket'
import { useAppSelector } from '@/store/hooks'
import type { HospitalAlert } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'

function HospitalDashboard() {
  const user = useAppSelector((s) => s.auth.user)
  const [tab, setTab] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [preset, setPreset] = useState<RequestPreset | null>(null)
  const [share, setShare] = useState<HospitalAlert | null>(null)
  const [justCreated, setJustCreated] = useState<string | null>(null)
  const [stockVersion, setStockVersion] = useState(0)
  const alerts = useResource(api.alerts.hospital)

  const upsert = (a: HospitalAlert) =>
    alerts.setData((list = []) => (list.some((x) => x._id === a._id) ? list.map((x) => (x._id === a._id ? a : x)) : [a, ...list]))

  useSocketEvent<HospitalAlert>('alert:update', upsert)

  const list = alerts.data || []
  const active = list.filter((a) => a.status === 'active')
  const closed = list.filter((a) => a.status !== 'active')
  const onTheWay = active.reduce((s, a) => s + a.coverage.held, 0)
  const expected = active.reduce((s, a) => s + a.coverage.expectedUnits, 0)
  const needed = active.reduce((s, a) => s + a.unitsNeeded, 0)

  const openCreate = (p: RequestPreset | null = null) => {
    setPreset(p)
    setCreateOpen(true)
  }

  return (
    <>
      <Box component="section" pt={{ xs: 4, md: 6 }} pb={4} className="rise">
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={3} alignItems={{ md: 'flex-end' }}>
          <Box>
            <Typography variant="overline" color="primary">
              {user?.hospitalName}
            </Typography>
            <Typography variant="h2" component="h1">
              Blood <em>coordination</em>
            </Typography>
            <Stack direction="row" spacing={1} mt={1.5}>
              {active.length ? (
                <Pill tone="blue" live>
                  {active.length} live request{active.length > 1 ? 's' : ''}
                </Pill>
              ) : (
                <Pill>No live requests</Pill>
              )}
              {user && !user.isVerified && <Pill tone="amber">Verification pending</Pill>}
            </Stack>
          </Box>
          <Stack direction="row" spacing={{ xs: 3, md: 5 }} alignItems="flex-start">
            <Stat label="Donors on the way" value={onTheWay} />
            <Stat label="Expected units" value={needed ? `${Math.round(expected * 10) / 10}/${needed}` : '—'} hint="weighted by show-up record" />
            <Button variant="contained" size="large" startIcon={<Add />} onClick={() => openCreate()} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              New request
            </Button>
          </Stack>
        </Stack>
        <Button variant="contained" size="large" fullWidth startIcon={<Add />} onClick={() => openCreate()} sx={{ display: { xs: 'flex', md: 'none' }, mt: 3 }}>
          New request
        </Button>
      </Box>

      {user && !user.isVerified && (
        <MuiAlert severity="warning" sx={{ mb: 3, bgcolor: t.warningSoft, color: t.ink }}>
          Your hospital isn’t verified yet. Requests still go out, but public links show “unverified” until an administrator confirms your
          license.
        </MuiAlert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: `1px solid ${t.line}`, mb: 3.5 }}>
        <Tab label={`Requests${active.length ? ` · ${active.length}` : ''}`} />
        <Tab label="Inventory" />
        <Tab label="Forecast" />
        <Tab label="Exchange" />
      </Tabs>

      {tab === 0 &&
        (alerts.loading ? (
          <LoadingRows rows={2} height={200} />
        ) : !list.length ? (
          <EmptyState
            title={
              <>
                Ready when you <em>need it</em>
              </>
            }
            body="Create a request and we’ll invite a small, ranked wave of compatible, eligible donors, hold slots for those who commit, and stand everyone else down once you’re covered."
            action={
              <Button variant="contained" startIcon={<Add />} onClick={() => openCreate()}>
                New request
              </Button>
            }
          />
        ) : (
          <Stack spacing={4}>
            {active.length > 0 && (
              <Stack spacing={2} className="stagger">
                {active.map((a) => (
                  <RequestCard key={a._id} alert={a} onChange={upsert} onShare={setShare} defaultOpen={a._id === justCreated} />
                ))}
              </Stack>
            )}
            {closed.length > 0 && (
              <Box>
                <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
                  Closed
                </Typography>
                <Stack spacing={1.5}>
                  {closed.slice(0, 10).map((a) => (
                    <RequestCard key={a._id} alert={a} onChange={upsert} onShare={setShare} />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        ))}

      {tab === 1 && <InventoryPanel onChanged={() => setStockVersion((v) => v + 1)} />}
      {tab === 2 && <ForecastPanel version={stockVersion} onSchedule={(p) => openCreate(p)} />}
      {tab === 3 && <ExchangePanel version={stockVersion} onChanged={() => setStockVersion((v) => v + 1)} />}

      <CreateRequestDialog
        open={createOpen}
        preset={preset}
        onClose={() => setCreateOpen(false)}
        onCreated={(a) => {
          upsert(a)
          setJustCreated(a._id)
          setTab(0)
        }}
      />
      <ShareDialog alert={share} onClose={() => setShare(null)} />
    </>
  )
}

export default function Page() {
  return (
    <AppShell>
      <RequireRole role="hospital">
        <HospitalDashboard />
      </RequireRole>
    </AppShell>
  )
}
