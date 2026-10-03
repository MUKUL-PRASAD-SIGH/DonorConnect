'use client'

import { useEffect, useState } from 'react'
import { Box, Button, Chip, Grid, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import { Verified } from '@mui/icons-material'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { DonorProfile, RARE_PHENOTYPES } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'
import { KeyValue, Panel } from '../ui'

export default function ProfilePanel({ profile, onSaved }: { profile: DonorProfile; onSaved: (p: DonorProfile) => void }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', weight: '', sex: '' })
  const [phenotypes, setPhenotypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({ name: profile.name, phone: profile.phone, address: profile.address, weight: String(profile.weight), sex: profile.sex || '' })
    setPhenotypes(profile.rarePhenotypes)
  }, [profile])

  const toggle = async (key: 'availableForEmergency' | 'notificationsEnabled', value: boolean) => {
    try {
      onSaved(await api.donors.update({ [key]: value }))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      onSaved(
        await api.donors.update({
          name: form.name,
          phone: form.phone,
          address: form.address,
          weight: Number(form.weight),
          ...(form.sex ? { sex: form.sex } : {}),
          rarePhenotypes: phenotypes,
        }),
      )
      toast.success('Profile saved')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const r = profile.reliability
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={5}>
        <Stack spacing={2.5}>
          <Panel>
            <Typography variant="h6" mb={2}>
              Availability
            </Typography>
            {[
              { key: 'availableForEmergency' as const, label: 'Invite me to requests', hint: 'Turn off while travelling or unwell.' },
              { key: 'notificationsEnabled' as const, label: 'SMS and email alerts', hint: 'You’ll still see invites in the app.' },
            ].map((row) => (
              <Stack key={row.key} direction="row" justifyContent="space-between" alignItems="center" py={1}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {row.label}
                  </Typography>
                  <Typography variant="caption">{row.hint}</Typography>
                </Box>
                <Switch checked={profile[row.key]} onChange={(e) => toggle(row.key, e.target.checked)} />
              </Stack>
            ))}
          </Panel>
          <Panel>
            <Typography variant="h6" mb={0.5}>
              Your track record
            </Typography>
            <Typography variant="caption" display="block" mb={2}>
              Hospitals never see this. It decides how early you’re invited, and showing up when you commit moves you up.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <KeyValue label="Donations">{profile.totalDonations}</KeyValue>
              </Grid>
              <Grid item xs={6}>
                <KeyValue label="Invites answered">{r.invited ? `${r.accepted}/${r.invited}` : '—'}</KeyValue>
              </Grid>
              <Grid item xs={6}>
                <KeyValue label="Showed up when committed">{r.accepted ? `${Math.round((r.arrived / r.accepted) * 100)}%` : '—'}</KeyValue>
              </Grid>
              <Grid item xs={6}>
                <KeyValue label="Points">{profile.rewardPoints}</KeyValue>
              </Grid>
            </Grid>
          </Panel>
        </Stack>
      </Grid>
      <Grid item xs={12} md={7}>
        <Stack spacing={2.5}>
          <Panel>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="h6">
                Rare blood <em>registry</em>
              </Typography>
              {profile.rarePhenotypes.length > 0 && (
                <Chip
                  size="small"
                  icon={<Verified />}
                  label={profile.rarePhenotypeVerified ? 'Lab verified' : 'Awaiting lab confirmation'}
                  sx={{ bgcolor: profile.rarePhenotypeVerified ? t.infoSoft : t.warningSoft, color: profile.rarePhenotypeVerified ? t.info : t.warning, '& .MuiChip-icon': { color: 'inherit' } }}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              If a lab has ever told you that you have a rare blood type, add it here. Requests for rare blood search beyond the
              usual radius, across the whole country if needed. You may be one of very few people who can help.
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
              {Object.entries(RARE_PHENOTYPES).map(([code, label]) => {
                const on = phenotypes.includes(code)
                return (
                  <Chip
                    key={code}
                    label={label}
                    onClick={() => setPhenotypes((p) => (on ? p.filter((x) => x !== code) : [...p, code]))}
                    variant={on ? 'filled' : 'outlined'}
                    sx={{
                      bgcolor: on ? t.red : 'transparent',
                      color: on ? '#FFF9F3' : t.ink,
                      transition: 'background-color 150ms ease, color 150ms ease, transform 160ms var(--ease-out)',
                      '&:active': { transform: 'scale(0.96)' },
                      '&:hover': { bgcolor: on ? t.redDark : t.sunken },
                    }}
                  />
                )
              })}
            </Stack>
          </Panel>
          <Panel>
            <Typography variant="h6" mb={2}>
              Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth size="small" type="number" label="Weight (kg)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Sex"
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                  helperText="Affects the recovery interval"
                >
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="other">Other / prefer not to say</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption">
                    Blood group {profile.bloodGroup} · changes need a hospital record
                  </Typography>
                  <Button variant="contained" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Panel>
        </Stack>
      </Grid>
    </Grid>
  )
}
