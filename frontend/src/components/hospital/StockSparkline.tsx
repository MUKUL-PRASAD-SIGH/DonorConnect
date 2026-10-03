'use client'

import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { format } from 'date-fns'
import type { ForecastItem } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'

/**
 * Projected stock over the forecast horizon. One series (no legend — the card
 * title names it), a dashed labelled safety line, and the first day below it
 * marked with a point + label so the shortfall never relies on colour alone.
 */
export default function StockSparkline({ item, height = 72 }: { item: ForecastItem; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 280
  const H = height
  const pad = { t: 8, r: 6, b: 14, l: 6 }
  const points = [{ date: new Date().toISOString(), stock: item.availableUnits, demand: 0 }, ...item.daily]
  const safety = item.avgDailyUse * 2
  const max = Math.max(1, safety, ...points.map((p) => p.stock)) * 1.1
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.stock).toFixed(1)}`).join('')
  const area = `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`
  const shortIdx = item.shortfallDate ? points.findIndex((p) => p.date.slice(0, 10) === item.shortfallDate!.slice(0, 10)) : -1
  const h = hover !== null ? points[hover] : null

  return (
    <Box position="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Projected ${item.bloodGroup} stock over ${item.daily.length} days`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1))
          setHover(Math.max(0, Math.min(points.length - 1, i)))
        }}
        style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
      >
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke={t.line} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {safety > 0 && (
          <line x1={pad.l} x2={W - pad.r} y1={y(safety)} y2={y(safety)} stroke={t.inkSubtle} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
        <path d={area} fill={t.sunken} opacity={0.7} />
        <path d={line} fill="none" stroke={t.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke={t.lineStrong} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* Points drawn in HTML so they stay round when the SVG stretches */}
      {shortIdx > 0 && (
        <Dot left={`${(x(shortIdx) / W) * 100}%`} top={y(points[shortIdx].stock)} color={t.red} />
      )}
      {h && hover !== null && <Dot left={`${(x(hover) / W) * 100}%`} top={y(h.stock)} color={t.ink} />}
      {safety > 0 && (
        <Typography variant="caption" sx={{ position: 'absolute', right: 0, top: y(safety) - 16, fontSize: 10, color: t.inkSubtle }}>
          safety {Math.round(safety)}
        </Typography>
      )}
      {h && hover !== null && (
        <Box
          sx={{
            position: 'absolute',
            left: `${(x(hover) / W) * 100}%`,
            top: -6,
            transform: `translate(${hover > points.length / 2 ? '-105%' : '5%'}, -100%)`,
            bgcolor: t.ink,
            color: t.surface,
            borderRadius: 1.5,
            px: 1,
            py: 0.5,
            fontSize: 11,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          <b>{hover === 0 ? 'Today' : format(new Date(h.date), 'EEE d MMM')}</b> · {h.stock} units
          {hover > 0 ? ` · ~${h.demand} used` : ''}
        </Box>
      )}
    </Box>
  )
}

function Dot({ left, top, color }: { left: string; top: number; color: string }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left,
        top,
        width: 9,
        height: 9,
        borderRadius: '50%',
        bgcolor: color,
        border: `2px solid ${t.surface}`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    />
  )
}
