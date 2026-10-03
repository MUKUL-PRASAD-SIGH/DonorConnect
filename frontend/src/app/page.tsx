'use client'

import Link from 'next/link'
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material'
import { ArrowForward, Insights, Link as LinkIcon, Science, SwapHoriz, TaskAlt, Timer } from '@mui/icons-material'
import { useAppSelector } from '@/store/hooks'
import { BloodBadge, Logo, Pill, SlotMeter } from '@/components/ui'
import { tokens as t } from '@/theme/tokens'

const STEPS = [
  { n: '01', title: 'A hospital asks', body: 'Group, component, units and deadline. Compatible donor groups are worked out automatically.' },
  { n: '02', title: 'A small wave goes out', body: 'The donors most likely to say yes and turn up in time, ranked by distance, track record and eligibility.' },
  { n: '03', title: 'Donors hold slots', body: 'Each yes reserves one unit. Extra yeses join standby and are promoted if someone drops out.' },
  { n: '04', title: 'Everyone else stands down', body: 'The moment slots are full, pending invites get a thank-you, and the public link says “covered”.' },
]

const FEATURES = [
  {
    icon: <Timer />,
    title: 'Wave dispatch',
    body: 'Invites grow only as needed: three to twelve donors at a time, widening the radius automatically. No floods, no silence.',
  },
  {
    icon: <TaskAlt />,
    title: 'Held slots & standby',
    body: 'Hospitals see expected units weighted by real show-up history, not a count of thumbs-up.',
  },
  {
    icon: <LinkIcon />,
    title: 'Verified live links',
    body: 'A shareable page and QR for every request. When it’s covered, every old forward says so. Unverified hospitals are flagged.',
  },
  {
    icon: <Science />,
    title: 'Eligibility pre-screen',
    body: 'Exact next-eligible dates for whole blood, platelets and plasma, so donors aren’t invited when they’d be turned away.',
  },
  {
    icon: <Insights />,
    title: 'Shortage forecasting',
    body: 'Usage trends and seasonal demand, like platelets in dengue season, flag shortfalls days ahead and book donors calmly.',
  },
  {
    icon: <SwapHoriz />,
    title: 'Expiry-aware exchange',
    body: 'Units about to expire are matched to nearby hospitals forecast to run short, before they’re thrown away.',
  },
]

function DemoCard() {
  return (
    <Box
      className="rise"
      sx={{
        bgcolor: t.surface,
        border: `1px solid ${t.line}`,
        borderRadius: 5,
        p: 3,
        boxShadow: '0 30px 60px -30px rgba(30,25,22,0.25)',
        animationDelay: '120ms',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" mb={2.5}>
        <BloodBadge group="O−" />
        <Box flex={1}>
          <Typography fontWeight={600}>3 × red cells</Typography>
          <Typography variant="caption">Emergency surgery · needed in 4h</Typography>
        </Box>
        <Pill tone="blue" live>
          Matching
        </Pill>
      </Stack>
      <SlotMeter needed={3} arrived={1} held={1} size={22} />
      <Typography variant="caption" display="block" mt={1}>
        1 donated · 1 on the way · 1 open
      </Typography>
      <Stack spacing={1} mt={2.5}>
        {[
          ['Priya N.', '1.2 km · ~13 min', 'Slot held', 'green'],
          ['Arjun R.', '2.8 km · ~17 min', 'Invited', 'blue'],
          ['Meera P.', '3.1 km · ~18 min', 'Standby', 'amber'],
        ].map(([name, meta, status, tone]) => (
          <Stack key={name} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1, borderTop: `1px solid ${t.line}` }}>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {name}
              </Typography>
              <Typography variant="caption">{meta}</Typography>
            </Box>
            <Pill tone={tone as any}>{status}</Pill>
          </Stack>
        ))}
      </Stack>
      <Typography variant="caption" display="block" mt={1.5} sx={{ color: t.inkSubtle }}>
        Example request
      </Typography>
    </Box>
  )
}

export default function HomePage() {
  const { user, isAuthenticated } = useAppSelector((s) => s.auth)
  const dashboard = user?.role === 'hospital' ? '/hospital/dashboard' : user?.role === 'admin' ? '/admin' : '/donor/dashboard'

  return (
    <Box className="grain">
      <Container maxWidth="lg">
        <Stack component="nav" direction="row" alignItems="center" justifyContent="space-between" height={72}>
          <Logo />
          <Stack direction="row" spacing={{ xs: 0.5, sm: 2 }} alignItems="center">
            <Button href="#how" sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: t.inkMuted }}>
              How it works
            </Button>
            {isAuthenticated ? (
              <Button variant="contained" href={dashboard}>
                Open dashboard
              </Button>
            ) : (
              <>
                <Button href="/auth/login" sx={{ color: t.ink }}>
                  Sign in
                </Button>
                <Button variant="contained" href="/auth/register">
                  Join
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center" pt={{ xs: 6, md: 12 }} pb={{ xs: 10, md: 16 }}>
          <Grid item xs={12} md={7} className="rise">
            <Typography variant="overline" color="primary">
              Coordinated blood response
            </Typography>
            <Typography variant="h1" mt={1.5}>
              Not more alerts.
              <br />
              The <em>right donors,</em> at the right time.
            </Typography>
            <Typography color="text.secondary" fontSize={{ xs: 17, md: 19 }} mt={3} maxWidth={540} lineHeight={1.55}>
              A broadcast appeal either reaches nobody or brings forty people for two units. DonorConnect invites a few well-matched donors
              at a time, holds their slots, and thanks everyone else the moment the need is covered.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={4.5}>
              <Button variant="contained" size="large" href="/auth/register" endIcon={<ArrowForward />}>
                Become a donor
              </Button>
              <Button variant="outlined" size="large" href="/auth/register">
                Register a hospital
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <DemoCard />
          </Grid>
        </Grid>
      </Container>

      <Box id="how" sx={{ borderTop: `1px solid ${t.line}`, py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <Typography variant="h2" maxWidth={640} mb={{ xs: 6, md: 8 }}>
            How a request <em>actually</em> gets covered
          </Typography>
          <Grid container spacing={{ xs: 4, md: 3 }}>
            {STEPS.map((s) => (
              <Grid item xs={12} sm={6} md={3} key={s.n}>
                <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 44, color: t.red, lineHeight: 1 }}>{s.n}</Typography>
                <Typography variant="h6" mt={2} mb={1}>
                  {s.title}
                </Typography>
                <Typography color="text.secondary" variant="body2" lineHeight={1.6}>
                  {s.body}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box sx={{ bgcolor: t.surface, borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 8 }} mb={{ xs: 6, md: 8 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h2">
                Built for the parts <em>alerts</em> never solved
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography color="text.secondary" fontSize={17} lineHeight={1.6}>
                Real-time notifications are table stakes now. The hard problems are coordination, trust and foresight: knowing who will
                really turn up, stopping stale forwards and scams, and seeing a shortage before it becomes an emergency.
              </Typography>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            {FEATURES.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <Box className="lift" sx={{ height: '100%', p: 3, borderRadius: 4, border: `1px solid ${t.line}`, bgcolor: t.paper }}>
                  <Box sx={{ color: t.red, mb: 2, '& svg': { fontSize: 22 } }}>{f.icon}</Box>
                  <Typography variant="h6" mb={1}>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                    {f.body}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 10, md: 14 } }}>
        <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="overline" color="primary">
              Rare blood registry
            </Typography>
            <Typography variant="h2" mt={1}>
              When the match is <em>one in ten thousand</em>
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography color="text.secondary" fontSize={17} lineHeight={1.6}>
              Families searching for Bombay-phenotype or Rh-null blood still rely on phone chains. Donors who register a rare phenotype are
              reached by a search that widens step by step, from the city to the state to the whole country, and labs can verify their
              type so hospitals know whom to trust.
            </Typography>
            <Button href="/auth/register" endIcon={<ArrowForward />} sx={{ mt: 2, ml: -1.5 }}>
              Register your rare type
            </Button>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ bgcolor: t.ink, color: t.paper, py: { xs: 10, md: 12 } }} className="grain">
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h2" sx={{ color: t.paper }}>
            Be the one they <em>can count on.</em>
          </Typography>
          <Typography sx={{ color: 'rgba(243,236,224,0.7)', mt: 2, mb: 4.5, fontSize: 17 }}>
            Two minutes to sign up. A few invites a year. Every one of them matters.
          </Typography>
          <Button variant="contained" size="large" href="/auth/register" endIcon={<ArrowForward />}>
            Become a donor
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} py={4}>
          <Logo size={18} />
          <Typography variant="caption">
            Eligibility guidance is informational. The collecting blood bank’s medical officer always decides.{' '}
            <Link href="/auth/login" style={{ color: 'inherit' }}>
              Hospital sign in
            </Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  )
}
