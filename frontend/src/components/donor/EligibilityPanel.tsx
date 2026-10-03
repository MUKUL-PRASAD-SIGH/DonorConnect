'use client'

import { Box, Button, Grid, Stack, Typography } from '@mui/material'
import { CheckCircle, Schedule } from '@mui/icons-material'
import { differenceInCalendarDays } from 'date-fns'
import { relative, shortDate } from '@/lib/format'
import { DONATION_LABEL, DonationType, DonorProfile } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { Panel } from '../ui'

const ORDER: DonationType[] = ['whole_blood', 'platelets', 'plasma']
const WHY: Record<DonationType, string> = {
  whole_blood: 'Used for trauma, surgery and childbirth.',
  platelets: 'For dengue and cancer patients. Lasts only 5 days, so always needed.',
  plasma: 'For burns, liver disease and clotting disorders.',
}

export default function EligibilityPanel({ profile, onScreen }: { profile: DonorProfile; onScreen: () => void }) {
  const e = profile.eligibility
  return (
    <Stack spacing={2.5}>
      <Panel sx={{ bgcolor: e.screeningCompleted && !e.screeningStale ? t.surface : t.redTint, borderColor: e.screeningCompleted && !e.screeningStale ? t.line : t.redSoft }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
          <Box>
            <Typography variant="h6">
              {!e.screeningCompleted ? 'Complete your screening' : e.screeningStale ? 'Your screening is out of date' : 'Screening up to date'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!e.screeningCompleted
                ? 'One in ten donors who travel to donate are turned away. A short screening means we only invite you when you can actually donate.'
                : e.screeningStale
                  ? `Last answered ${relative(profile.screening?.completedAt)}. A quick refresh keeps your invites accurate.`
                  : `Last answered ${relative(profile.screening?.completedAt)}.`}
            </Typography>
          </Box>
          <Button variant={e.screeningCompleted && !e.screeningStale ? 'outlined' : 'contained'} onClick={onScreen} sx={{ flexShrink: 0 }}>
            {e.screeningCompleted ? 'Update answers' : 'Start screening'}
          </Button>
        </Stack>
      </Panel>

      <Box>
      <Grid container spacing={2} className="stagger">
        {ORDER.map((type) => {
          const c = e.components[type]
          const days = c.nextEligibleDate ? differenceInCalendarDays(new Date(c.nextEligibleDate), new Date()) : null
          return (
            <Grid item xs={12} md={4} key={type}>
              <Panel sx={{ height: '100%' }}>
                <Typography variant="overline" color="text.secondary">
                  {DONATION_LABEL[type]}
                </Typography>
                {c.eligible ? (
                  <Stack direction="row" alignItems="center" spacing={1} my={1}>
                    <CheckCircle sx={{ color: t.success }} />
                    <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: 30, lineHeight: 1 }}>
                      Ready <em>now</em>
                    </Typography>
                  </Stack>
                ) : c.nextEligibleDate ? (
                  <Box my={1}>
                    <Typography className="tabular" sx={{ fontWeight: 600, fontSize: 30, lineHeight: 1, letterSpacing: '-0.03em' }}>
                      {days} <em style={{ fontWeight: 400, color: t.inkMuted }}>days</em>
                    </Typography>
                    <Typography variant="caption">from {shortDate(c.nextEligibleDate)}</Typography>
                  </Box>
                ) : (
                  <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: 30, lineHeight: 1, my: 1 }}>
                    <em>Not eligible</em>
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" mb={c.deferrals.length ? 1.5 : 0}>
                  {WHY[type]}
                </Typography>
                {c.deferrals.map((d) => (
                  <Stack key={d.code} direction="row" spacing={1} alignItems="flex-start" mt={0.75}>
                    <Schedule sx={{ fontSize: 16, color: t.inkSubtle, mt: '2px' }} />
                    <Typography variant="caption">
                      {d.label}
                      {d.until ? ` — until ${shortDate(d.until)}` : ''}
                    </Typography>
                  </Stack>
                ))}
              </Panel>
            </Grid>
          )
        })}
      </Grid>
      </Box>

      {e.notes.map((n) => (
        <Typography key={n} variant="caption">
          {n}
        </Typography>
      ))}
    </Stack>
  )
}
