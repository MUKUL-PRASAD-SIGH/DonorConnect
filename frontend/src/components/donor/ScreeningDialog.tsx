'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { DonorProfile, Screening } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'

const DATED: { key: keyof Screening; question: string; hint: string }[] = [
  { key: 'tattooOrPiercingOn', question: 'Tattoo or piercing in the last 12 months?', hint: 'Date of the most recent one' },
  { key: 'majorSurgeryOn', question: 'Major surgery in the last 12 months?', hint: 'Date of surgery' },
  { key: 'illnessRecoveredOn', question: 'Fever, flu or infection recently?', hint: 'Date you recovered' },
  { key: 'antibioticsCompletedOn', question: 'Finished a course of antibiotics recently?', hint: 'Last dose' },
  { key: 'malariaTreatedOn', question: 'Treated for malaria in the last 3 months?', hint: 'Date treatment finished' },
  { key: 'childbirthOn', question: 'Given birth in the last 12 months?', hint: 'Date of delivery' },
]

const CONDITIONS: Record<string, string> = {
  hiv: 'HIV',
  hepatitis_b: 'Hepatitis B',
  hepatitis_c: 'Hepatitis C',
  cancer: 'Cancer',
  heart_disease: 'Heart disease',
  bleeding_disorder: 'Bleeding disorder',
}

const toInput = (iso?: string) => (iso ? iso.slice(0, 10) : '')

export default function ScreeningDialog({
  open,
  onClose,
  profile,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  profile: DonorProfile
  onSaved: (p: DonorProfile) => void
}) {
  const [form, setForm] = useState<Screening>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const s = profile.screening || {}
    setForm(s)
    setEnabled(Object.fromEntries(DATED.map((d) => [d.key, !!s[d.key]])))
  }, [open, profile.screening])

  const set = (k: keyof Screening, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const body: Screening = {
        pregnantOrBreastfeeding: !!form.pregnantOrBreastfeeding,
        alcoholLast24h: !!form.alcoholLast24h,
        conditions: form.conditions || [],
      }
      if (form.hemoglobin) body.hemoglobin = Number(form.hemoglobin)
      for (const d of DATED) {
        const v = form[d.key] as string | undefined
        if (enabled[d.key] && v) (body as any)[d.key] = new Date(v).toISOString()
      }
      onSaved(await api.donors.screening(body))
      toast.success('Screening saved — your eligibility is up to date')
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>
        Pre-donation screening
        <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
          Two minutes now saves you a wasted trip. Answers are private and only used to work out when you can donate.
        </Typography>
      </DialogTitle>
      <DialogContent dividers data-lenis-prevent>
        <Stack spacing={2.25}>
          {DATED.map((d) => (
            <Box key={d.key}>
              <FormControlLabel
                control={<Switch checked={!!enabled[d.key]} onChange={(e) => setEnabled((x) => ({ ...x, [d.key]: e.target.checked }))} />}
                label={<Typography variant="body2">{d.question}</Typography>}
              />
              {enabled[d.key] && (
                <TextField
                  type="date"
                  size="small"
                  label={d.hint}
                  InputLabelProps={{ shrink: true }}
                  value={toInput(form[d.key] as string)}
                  onChange={(e) => set(d.key, e.target.value)}
                  inputProps={{ max: new Date().toISOString().slice(0, 10) }}
                  sx={{ ml: 6.5, mt: 1, width: 220 }}
                  className="rise"
                />
              )}
            </Box>
          ))}
          <FormControlLabel
            control={<Switch checked={!!form.pregnantOrBreastfeeding} onChange={(e) => set('pregnantOrBreastfeeding', e.target.checked)} />}
            label={<Typography variant="body2">Currently pregnant or breastfeeding?</Typography>}
          />
          <FormControlLabel
            control={<Switch checked={!!form.alcoholLast24h} onChange={(e) => set('alcoholLast24h', e.target.checked)} />}
            label={<Typography variant="body2">Alcohol in the last 24 hours?</Typography>}
          />
          <TextField
            label="Last hemoglobin reading (g/dL, optional)"
            type="number"
            size="small"
            value={form.hemoglobin ?? ''}
            onChange={(e) => set('hemoglobin', e.target.value === '' ? undefined : e.target.value)}
            inputProps={{ step: 0.1, min: 3, max: 25 }}
            helperText="Leave blank if you don’t know — it’s tested on site anyway."
            sx={{ maxWidth: 320 }}
          />
          <Box>
            <Typography variant="subtitle2" mb={0.5}>
              Have you ever been diagnosed with:
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={2}>
              {Object.entries(CONDITIONS).map(([code, label]) => (
                <FormControlLabel
                  key={code}
                  control={
                    <Checkbox
                      size="small"
                      sx={{ '&.Mui-checked': { color: t.red } }}
                      checked={(form.conditions || []).includes(code)}
                      onChange={(e) =>
                        set('conditions', e.target.checked ? [...(form.conditions || []), code] : (form.conditions || []).filter((c) => c !== code))
                      }
                    />
                  }
                  label={<Typography variant="body2">{label}</Typography>}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" sx={{ flex: 1 }}>
          Final eligibility is always decided by the blood bank’s doctor.
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save answers'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
