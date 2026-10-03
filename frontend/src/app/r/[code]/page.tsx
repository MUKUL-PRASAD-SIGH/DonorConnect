'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material'
import { Directions, IosShare, Phone, ShieldOutlined, Verified, WarningAmber } from '@mui/icons-material'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { dayLabel, relative } from '@/lib/format'
import { useNow, useResource } from '@/lib/hooks'
import { useWatchRequest } from '@/lib/socket'
import { useAppSelector } from '@/store/hooks'
import type { PublicRequest } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { BloodBadge, LoadingRows, Logo, Pill, SlotMeter } from '@/components/ui'

export default function PublicRequestPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase()
  const req = useResource(() => api.public.request(code), [code])
  const { user } = useAppSelector((s) => s.auth)
  const [busy, setBusy] = useState(false)
  useNow(30000)

  useWatchRequest(code, (p: PublicRequest) => req.setData(p))

  const r = req.data
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: `${r?.bloodGroup} blood needed`, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied')
      }
    } catch {}
  }

  const offer = async () => {
    setBusy(true)
    try {
      // Public view has no _id; look the request up among the donor's matches
      const nearby = await api.alerts.nearby()
      const match = nearby.find((a) => a.publicCode === code)
      if (!match) {
        toast.error('This request doesn’t match your blood group or current eligibility.')
        return
      }
      const res = await api.alerts.respond(match._id, 'accept')
      toast.success(res.myResponse?.status === 'accepted' ? 'Slot held — see your dashboard for directions' : 'You’re on standby')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const [lng, lat] = r?.hospital?.location || []

  return (
    <Box minHeight="100vh" className="grain">
      <Container maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={{ xs: 4, md: 6 }}>
          <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Logo />
          </Link>
          <Stack direction="row" spacing={0.75} alignItems="center" color={t.inkMuted}>
            <span className="live-dot" style={{ color: t.success, width: 6, height: 6 }} />
            <Typography variant="caption">Live status</Typography>
          </Stack>
        </Stack>

        {req.loading ? (
          <LoadingRows rows={2} height={180} />
        ) : !r ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h2" component="h1" mb={1}>
              Request <em>not found</em>
            </Typography>
            <Typography color="text.secondary">
              This link may be mistyped. Real requests are only ever shared as donorconnect links. Be wary of forwards asking for money.
            </Typography>
          </Box>
        ) : (
          <Box className="stagger">
            <Box>
              {r.shareState === 'open' ? (
                <Pill tone="red" live>
                  Donors needed
                </Pill>
              ) : r.shareState === 'covered' ? (
                <Pill tone="green">Covered</Pill>
              ) : (
                <Pill>{r.status === 'fulfilled' ? 'Fulfilled' : 'Closed'}</Pill>
              )}
              <Typography variant="h1" mt={2} mb={2}>
                {r.shareState === 'open' ? (
                  <>
                    {r.bloodGroup} <em>{r.componentLabel}</em> needed
                  </>
                ) : r.shareState === 'covered' ? (
                  <>
                    Covered. <em>Please don’t travel.</em>
                  </>
                ) : (
                  <>
                    This request has <em>closed.</em>
                  </>
                )}
              </Typography>
              <Typography color="text.secondary" fontSize={17}>
                {r.shareState === 'open'
                  ? `${r.openSlots} of ${r.unitsNeeded} donor slot${r.unitsNeeded > 1 ? 's' : ''} still open. Needed by ${dayLabel(r.requiredBy, true)}.`
                  : r.shareState === 'covered'
                    ? 'Enough donors have committed. If one drops out, this page will reopen automatically.'
                    : `Closed ${relative(r.closedAt)}. If you received this as a forward, it no longer needs action — thank you.`}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: t.surface, border: `1px solid ${t.line}`, borderRadius: 4, p: 3, mt: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <BloodBadge group={r.bloodGroup} size={52} />
                <Box flex={1}>
                  <SlotMeter needed={r.unitsNeeded} arrived={r.unitsCollected} held={Math.max(0, r.donorsConfirmed - r.unitsCollected)} />
                  <Typography variant="caption" display="block" mt={0.75}>
                    {r.unitsCollected} donated · {Math.max(0, r.donorsConfirmed - r.unitsCollected)} on the way · {r.openSlots} open
                  </Typography>
                </Box>
              </Stack>
              {r.requiredPhenotypeLabel && (
                <Typography variant="body2" mt={2} color={t.red} fontWeight={600}>
                  Rare blood: {r.requiredPhenotypeLabel}. Only registered donors with this type can help.
                </Typography>
              )}
              <Divider sx={{ my: 2.5 }} />
              <Typography variant="caption" display="block" mb={1}>
                Who can donate
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {r.compatibleDonorGroups.map((g) => (
                  <Box key={g} sx={{ px: 1.25, py: 0.25, borderRadius: 99, border: `1px solid ${t.lineStrong}`, fontWeight: 600, fontSize: 13 }}>
                    {g}
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box sx={{ border: `1px solid ${t.line}`, borderRadius: 4, p: 3, mt: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                <Typography fontWeight={600}>{r.hospital?.name}</Typography>
                {r.hospital?.verified ? (
                  <Stack direction="row" spacing={0.5} alignItems="center" color={t.info}>
                    <Verified sx={{ fontSize: 16 }} />
                    <Typography variant="caption" color="inherit" fontWeight={600}>
                      Verified hospital
                    </Typography>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={0.5} alignItems="center" color={t.warning}>
                    <WarningAmber sx={{ fontSize: 16 }} />
                    <Typography variant="caption" color="inherit" fontWeight={600}>
                      Not yet verified
                    </Typography>
                  </Stack>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {r.hospital?.address}
              </Typography>
              {r.shareState !== 'closed' && (
                <Stack direction="row" spacing={1} mt={2}>
                  {lat != null && (
                    <Button size="small" variant="outlined" startIcon={<Directions />} href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener">
                      Map
                    </Button>
                  )}
                  {r.hospital?.emergencyContact && (
                    <Button size="small" variant="outlined" startIcon={<Phone />} href={`tel:${r.hospital.emergencyContact}`}>
                      Blood bank
                    </Button>
                  )}
                </Stack>
              )}
            </Box>

            {r.shareState === 'open' && (
              <Box mt={4}>
                {user?.role === 'donor' ? (
                  <Button variant="contained" size="large" fullWidth onClick={offer} disabled={busy}>
                    {busy ? 'Checking your match…' : 'I can donate — hold a slot'}
                  </Button>
                ) : (
                  <Stack spacing={1}>
                    <Button variant="contained" size="large" fullWidth href={`/auth/register?next=/r/${code}`}>
                      I can donate
                    </Button>
                    <Button size="large" fullWidth href={`/auth/login?next=/r/${code}`}>
                      Already registered? Sign in
                    </Button>
                  </Stack>
                )}
                <Typography variant="caption" display="block" textAlign="center" mt={1.5}>
                  Holding a slot tells the hospital you’re coming, so others aren’t sent unnecessarily.
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 4, p: 2.5, borderRadius: 3, bgcolor: t.sunken }}>
              <ShieldOutlined sx={{ color: t.inkMuted, fontSize: 20, mt: '2px' }} />
              <Typography variant="body2" color="text.secondary">
                Blood is never sold. No hospital will ask you to pay or transfer money through this link. If someone does, it’s a scam.
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={3}>
              <Typography variant="caption">Updated {relative(r.updatedAt)}</Typography>
              <Button size="small" startIcon={<IosShare />} onClick={share}>
                Share
              </Button>
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  )
}
