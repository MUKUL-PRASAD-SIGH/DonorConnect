'use client'

import { Box, Button, Grid, Stack, Typography } from '@mui/material'
import { differenceInCalendarDays, format } from 'date-fns'
import { api } from '@/lib/api'
import { useResource } from '@/lib/hooks'
import { COMPONENT_LABEL, ForecastItem } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { BloodBadge, EmptyState, LoadingRows, Panel, Pill } from '../ui'
import StockSparkline from './StockSparkline'
import type { RequestPreset } from './CreateRequestDialog'

export default function ForecastPanel({ onSchedule, version }: { onSchedule: (p: RequestPreset) => void; version: number }) {
  const fc = useResource(api.inventory.forecast, [version])

  if (fc.loading) return <LoadingRows rows={2} height={180} />
  const items = fc.data?.items || []
  if (!items.length)
    return (
      <EmptyState
        title={
          <>
            Nothing to <em>forecast</em> yet
          </>
        }
        body="Forecasts come from your stock and daily usage. Add stock and record usage in Inventory, and projections appear here."
      />
    )

  const atRisk = items.filter((i) => i.shortfallDate)
  const wasting = items.filter((i) => i.projectedWastage.length)
  const steady = items.filter((i) => !i.shortfallDate && !i.projectedWastage.length)

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 4 }}>
        <Typography variant="body2" color="text.secondary">
          <b style={{ color: t.ink }}>{atRisk.length}</b> running short in the next {fc.data?.horizonDays} days
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <b style={{ color: t.ink }}>{wasting.reduce((s, i) => s + i.projectedWastage.reduce((a, w) => a + w.units, 0), 0)}</b> units likely to expire unused
        </Typography>
      </Stack>

      {atRisk.length > 0 && (
        <Section title="Running short">
          {atRisk.map((i) => (
            <ForecastCard key={`${i.bloodGroup}${i.component}`} item={i} onSchedule={onSchedule} />
          ))}
        </Section>
      )}
      {wasting.filter((i) => !i.shortfallDate).length > 0 && (
        <Section title="Surplus at risk of expiry — see Exchange">
          {wasting
            .filter((i) => !i.shortfallDate)
            .map((i) => (
              <ForecastCard key={`${i.bloodGroup}${i.component}`} item={i} onSchedule={onSchedule} />
            ))}
        </Section>
      )}
      {steady.length > 0 && (
        <Section title="Covered">
          {steady.map((i) => (
            <ForecastCard key={`${i.bloodGroup}${i.component}`} item={i} onSchedule={onSchedule} compact />
          ))}
        </Section>
      )}
    </Stack>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" display="block" mb={1.5}>
        {title}
      </Typography>
      <Grid container spacing={2} className="stagger">
        {children}
      </Grid>
    </Box>
  )
}

function ForecastCard({ item, onSchedule, compact }: { item: ForecastItem; onSchedule: (p: RequestPreset) => void; compact?: boolean }) {
  const days = item.shortfallDate ? differenceInCalendarDays(new Date(item.shortfallDate), new Date()) : null
  const wasted = item.projectedWastage.reduce((s, w) => s + w.units, 0)
  const donors = Math.max(1, Math.min(50, item.unitsShortByHorizon || Math.ceil(item.avgDailyUse * 3)))

  const schedule = () => {
    const by = item.shortfallDate ? new Date(new Date(item.shortfallDate).getTime() - 24 * 3600000) : new Date(Date.now() + 3 * 86400000)
    by.setHours(10, 0, 0, 0)
    onSchedule({
      bloodGroup: item.bloodGroup,
      component: item.component,
      unitsNeeded: donors,
      priority: days !== null && days <= 2 ? 'high' : 'low',
      requiredBy: by > new Date() ? by : new Date(Date.now() + 12 * 3600000),
      isPlanned: true,
      patientCondition: `Restock ${item.bloodGroup} ${COMPONENT_LABEL[item.component].toLowerCase()} ahead of a forecast shortage`,
    })
  }

  return (
    <Grid item xs={12} sm={6} md={compact ? 3 : 4}>
      <Panel sx={{ height: '100%', ...(compact ? { p: 2 } : {}) }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={compact ? 1 : 2}>
          <BloodBadge group={item.bloodGroup} size={compact ? 32 : 40} />
          <Box flex={1}>
            <Typography variant="body2" fontWeight={600}>
              {COMPONENT_LABEL[item.component]}
            </Typography>
            <Typography variant="caption">
              {item.availableUnits} on hand{item.avgDailyUse > 0 ? ` · ~${item.avgDailyUse}/day` : ''}
            </Typography>
          </Box>
        </Stack>
        {!compact && (
          <>
            <Typography sx={{ fontWeight: 600, fontSize: 24, letterSpacing: '-0.02em', lineHeight: 1.2 }} className="tabular">
              {days !== null ? (
                <>
                  {days <= 0 ? 'Short today' : `Short in ${days} day${days > 1 ? 's' : ''}`}
                  <Typography component="span" variant="body2" color="text.secondary" ml={1}>
                    {format(new Date(item.shortfallDate!), 'EEE d MMM')}
                  </Typography>
                </>
              ) : (
                `${wasted} unit${wasted > 1 ? 's' : ''} will expire unused`
              )}
            </Typography>
            <Box my={2}>
              <StockSparkline item={item} />
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mb={2}>
              <Pill tone={item.confidence === 'high' ? 'green' : item.confidence === 'medium' ? 'blue' : 'neutral'}>{item.confidence} confidence</Pill>
              {item.drivers.map((d) => (
                <Pill key={d} tone="amber">
                  {d}
                </Pill>
              ))}
            </Stack>
            {item.shortfallDate && (
              <Button variant="contained" fullWidth onClick={schedule}>
                Schedule {donors} donor{donors > 1 ? 's' : ''} ahead
              </Button>
            )}
          </>
        )}
        {compact && (
          <Typography variant="caption">
            {item.daysOfCover === null ? 'No usage recorded' : `${item.daysOfCover} days of cover`}
          </Typography>
        )}
      </Panel>
    </Grid>
  )
}
