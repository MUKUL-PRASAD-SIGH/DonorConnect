'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { BLOOD_GROUPS, COMPONENT_LABEL, Component, HospitalAlert, Priority, RARE_PHENOTYPES } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'

export interface RequestPreset {
  bloodGroup?: string
  component?: Component
  unitsNeeded?: number
  priority?: Priority
  requiredBy?: Date
  isPlanned?: boolean
  patientCondition?: string
}

const toggleSx = {
  flexWrap: 'wrap',
  gap: 0.75,
  '& .MuiToggleButton-root': {
    border: `1px solid ${t.lineStrong} !important`,
    borderRadius: '999px !important',
    px: 1.75,
    py: 0.6,
    textTransform: 'none',
    fontWeight: 600,
    color: t.ink,
    transition: 'background-color 150ms ease, color 150ms ease, transform 160ms var(--ease-out)',
    '&:active': { transform: 'scale(0.96)' },
    '&.Mui-selected': { bgcolor: t.ink, color: t.surface, borderColor: `${t.ink} !important` },
    '&.Mui-selected:hover': { bgcolor: t.ink },
  },
}

const local = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")

export default function CreateRequestDialog({
  open,
  onClose,
  onCreated,
  preset,
}: {
  open: boolean
  onClose: () => void
  onCreated: (a: HospitalAlert) => void
  preset?: RequestPreset | null
}) {
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [component, setComponent] = useState<Component>('whole_blood')
  const [units, setUnits] = useState(2)
  const [priority, setPriority] = useState<Priority>('high')
  const [requiredBy, setRequiredBy] = useState(local(new Date(Date.now() + 4 * 3600000)))
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [radius, setRadius] = useState(5)
  const [rare, setRare] = useState(false)
  const [phenotype, setPhenotype] = useState('bombay')
  const [isPlanned, setIsPlanned] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setBloodGroup(preset?.bloodGroup || 'O+')
    setComponent(preset?.component || 'whole_blood')
    setUnits(preset?.unitsNeeded || 2)
    setPriority(preset?.priority || 'high')
    setRequiredBy(local(preset?.requiredBy || new Date(Date.now() + 4 * 3600000)))
    setCondition(preset?.patientCondition || '')
    setNotes('')
    setRadius(preset?.isPlanned ? 15 : 5)
    setRare(false)
    setIsPlanned(!!preset?.isPlanned)
  }, [open, preset])

  const submit = async () => {
    if (!condition.trim()) return toast.error('Add a short reason so donors understand the need')
    setSaving(true)
    try {
      const alert = await api.alerts.create({
        bloodGroup,
        component,
        unitsNeeded: units,
        priority,
        requiredBy: new Date(requiredBy).toISOString(),
        patientCondition: condition.trim(),
        ...(notes.trim() ? { additionalNotes: notes.trim() } : {}),
        searchRadius: radius,
        isEmergency: priority === 'critical',
        isPlanned,
        ...(rare ? { requiredPhenotype: phenotype } : {}),
      })
      const invited = alert.responses.length
      toast.success(invited ? `Request live — ${invited} best-matched donors invited` : 'Request live — searching wider for donors')
      onCreated(alert)
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
        {isPlanned ? 'Schedule donors ahead of a shortage' : 'New blood request'}
        <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
          {isPlanned
            ? 'Donors are invited slowly to book appointments — no emergency alerts.'
            : 'We invite a small ranked wave first and only widen if needed. Nobody is flooded.'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers data-lenis-prevent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" mb={1}>
              Blood group
            </Typography>
            <ToggleButtonGroup exclusive value={bloodGroup} onChange={(_, v) => v && setBloodGroup(v)} sx={toggleSx}>
              {BLOOD_GROUPS.map((g) => (
                <ToggleButton key={g} value={g} sx={{ minWidth: 52 }}>
                  {g}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="subtitle2" mb={1}>
              Component
            </Typography>
            <ToggleButtonGroup exclusive value={component} onChange={(_, v) => v && setComponent(v)} sx={toggleSx}>
              {(Object.keys(COMPONENT_LABEL) as Component[]).map((c) => (
                <ToggleButton key={c} value={c}>
                  {COMPONENT_LABEL[c]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" display="block" mt={0.75}>
              Compatible donor groups are included automatically.
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" mb={1}>
              Priority
            </Typography>
            <ToggleButtonGroup exclusive value={priority} onChange={(_, v) => v && setPriority(v)} sx={toggleSx}>
              {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                <ToggleButton key={p} value={p} sx={p === 'critical' ? { '&.Mui-selected': { bgcolor: `${t.red} !important`, borderColor: `${t.red} !important` } } : {}}>
                  {p[0].toUpperCase() + p.slice(1)}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <Box>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="Units needed" type="number" value={units} onChange={(e) => setUnits(Math.max(1, Math.min(50, Number(e.target.value))))} inputProps={{ min: 1, max: 50 }} />
            </Grid>
            <Grid item xs={6} sm={8}>
              <TextField fullWidth label="Needed by" type="datetime-local" InputLabelProps={{ shrink: true }} value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Reason" placeholder="e.g. Emergency C-section, post-partum haemorrhage" value={condition} onChange={(e) => setCondition(e.target.value)} inputProps={{ maxLength: 200 }} helperText="Shown to invited donors only — never on the public link." />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Notes for donors (optional)" placeholder="Entrance, parking, who to ask for…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Starting radius (km)" type="number" value={radius} onChange={(e) => setRadius(Math.max(1, Math.min(50, Number(e.target.value))))} helperText="Widens automatically if needed" />
            </Grid>
          </Grid>
          </Box>
          <Box sx={{ border: `1px solid ${rare ? t.redSoft : t.line}`, bgcolor: rare ? t.redTint : 'transparent', borderRadius: 3, p: 2, transition: 'background-color 200ms ease, border-color 200ms ease' }}>
            <FormControlLabel
              control={<Switch checked={rare} onChange={(e) => setRare(e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Rare phenotype required
                  </Typography>
                  <Typography variant="caption">Searches the rare-blood registry, widening up to nationwide.</Typography>
                </Box>
              }
            />
            <Collapse in={rare}>
              <TextField select fullWidth size="small" label="Phenotype" value={phenotype} onChange={(e) => setPhenotype(e.target.value)} sx={{ mt: 2 }}>
                {Object.entries(RARE_PHENOTYPES).map(([code, label]) => (
                  <MenuItem key={code} value={code}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Collapse>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? 'Matching donors…' : isPlanned ? 'Schedule donors' : 'Send request'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
