'use client'

import { useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { ContentCopy, Check, WhatsApp } from '@mui/icons-material'
import { QRCodeSVG } from 'qrcode.react'
import type { HospitalAlert } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'

export default function ShareDialog({ alert, onClose }: { alert: HospitalAlert | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = useMemo(() => (alert && typeof window !== 'undefined' ? `${window.location.origin}/r/${alert.publicCode}` : ''), [alert])
  if (!alert) return null

  const message = `${alert.bloodGroup} ${alert.componentLabel} needed urgently. Live status (updates automatically — please check before forwarding): ${url}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <Dialog open={!!alert} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        Share a <em className="accent">live</em> link
        <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
          Forward this instead of a phone number. When the request is covered, the page says so — old WhatsApp forwards stop
          sending people to the hospital.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', placeItems: 'center', p: 3, bgcolor: '#fff', border: `1px solid ${t.line}`, borderRadius: 3, mb: 2 }}>
          <QRCodeSVG value={url} size={176} fgColor={t.ink} bgColor="#ffffff" level="M" />
          <Typography variant="caption" mt={1.5} className="tabular" letterSpacing="0.1em">
            {alert.publicCode}
          </Typography>
        </Box>
        <TextField fullWidth size="small" value={url} InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()} />
        <Stack direction="row" spacing={1} mt={1.5}>
          <Button fullWidth variant="outlined" startIcon={copied ? <Check /> : <ContentCopy />} onClick={copy}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<WhatsApp />}
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener"
          >
            WhatsApp
          </Button>
        </Stack>
        <Typography variant="caption" display="block" mt={2}>
          The public page shows blood group, units and your hospital’s verification status. It never shows patient details.
        </Typography>
      </DialogContent>
    </Dialog>
  )
}
