'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { CheckCircle, LocalHospital, MyLocation, VolunteerActivism } from '@mui/icons-material'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AuthLayout from '@/components/AuthLayout'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearError, register as registerUser } from '@/store/slices/authSlice'
import { BLOOD_GROUPS, RARE_PHENOTYPES } from '@/lib/types'
import { tokens as t } from '@/theme/tokens'

type Role = 'donor' | 'hospital'

interface Form {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  address: string
  bloodGroup: string
  dateOfBirth: string
  weight: number
  sex: string
  hospitalName: string
  licenseNumber: string
  contactPerson: string
  emergencyContact: string
}

const STEP_FIELDS: Record<number, (keyof Form)[]> = {
  1: ['name', 'email', 'phone', 'password', 'confirmPassword'],
}

function RoleCard({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        textAlign: 'left',
        width: '100%',
        p: 2.5,
        borderRadius: 4,
        cursor: 'pointer',
        font: 'inherit',
        color: t.ink,
        bgcolor: active ? t.surface : 'transparent',
        border: `1.5px solid ${active ? t.ink : t.lineStrong}`,
        transition: 'border-color 150ms ease, background-color 150ms ease, transform 160ms var(--ease-out)',
        '&:active': { transform: 'scale(0.98)' },
        '&:focus-visible': { outline: `2px solid ${t.red}`, outlineOffset: 2 },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box sx={{ color: active ? t.red : t.inkMuted, mt: '2px' }}>{icon}</Box>
        <Box flex={1}>
          <Typography fontWeight={600}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {body}
          </Typography>
        </Box>
        {active && <CheckCircle sx={{ color: t.ink, fontSize: 20 }} />}
      </Stack>
    </Box>
  )
}

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector((s) => s.auth)
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role>('donor')
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [rare, setRare] = useState<string[]>([])
  const [showRare, setShowRare] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Form>({ defaultValues: { bloodGroup: '', sex: '' } })

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Location isn’t available in this browser')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        setCoords({ latitude: c.latitude, longitude: c.longitude })
        setLocating(false)
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.latitude}&longitude=${c.longitude}&localityLanguage=en`,
          )
          const d = await res.json()
          if (d.locality) setValue('address', [d.locality, d.principalSubdivision].filter(Boolean).join(', '), { shouldValidate: true })
        } catch {
          // Address autofill is a convenience only
        }
      },
      (err) => {
        setLocating(false)
        toast.error(err.code === err.PERMISSION_DENIED ? 'Allow location access so we can match you with nearby requests' : 'Couldn’t get your location — try again')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  const goNext = async () => {
    if (await trigger(STEP_FIELDS[step] || [])) {
      setStep((s) => s + 1)
      if (step === 1 && !coords) locate()
    }
  }

  const onSubmit = async (data: Form) => {
    if (!coords) return toast.error('Share your location to finish — it’s how we match nearby requests')
    const { confirmPassword, ...rest } = data
    const body: Record<string, unknown> = {
      name: rest.name,
      email: rest.email,
      phone: rest.phone,
      password: rest.password,
      address: rest.address,
      role,
      ...coords,
    }
    if (role === 'donor') {
      Object.assign(body, {
        bloodGroup: rest.bloodGroup,
        dateOfBirth: rest.dateOfBirth,
        weight: Number(rest.weight),
        ...(rest.sex ? { sex: rest.sex } : {}),
        ...(rare.length ? { rarePhenotypes: rare } : {}),
      })
    } else {
      Object.assign(body, {
        hospitalName: rest.hospitalName,
        licenseNumber: rest.licenseNumber,
        contactPerson: rest.contactPerson,
        emergencyContact: rest.emergencyContact,
      })
    }
    try {
      await dispatch(registerUser(body)).unwrap()
      toast.success(role === 'donor' ? 'Welcome! Complete your screening next so we only invite you when you can donate.' : 'Hospital account created')
      router.push(next && next.startsWith('/') ? next : role === 'hospital' ? '/hospital/dashboard' : '/donor/dashboard')
    } catch {
      // shown inline
    }
  }

  const password = watch('password')
  const today = new Date()
  const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().slice(0, 10)

  return (
    <>
      <Typography variant="overline" color="text.secondary">
        Step {step + 1} of 3
      </Typography>
      <Typography variant="h2" component="h1" mb={1}>
        {step === 0 ? (
          <>
            Join <em>DonorConnect</em>
          </>
        ) : step === 1 ? (
          <>
            About <em>you</em>
          </>
        ) : role === 'donor' ? (
          <>
            Your <em>blood</em>
          </>
        ) : (
          <>
            Your <em>hospital</em>
          </>
        )}
      </Typography>
      <Typography color="text.secondary" mb={4}>
        {step === 0
          ? 'Choose how you’ll use DonorConnect.'
          : step === 1
            ? 'We’ll only contact you about requests you can actually help with.'
            : role === 'donor'
              ? 'This decides which requests you match and when you’re eligible.'
              : 'New hospitals are verified before their public links show a verified badge.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {step === 0 && (
          <Stack spacing={1.5}>
            <RoleCard
              active={role === 'donor'}
              onClick={() => setRole('donor')}
              icon={<VolunteerActivism />}
              title="I want to donate"
              body="Get a few well-matched invites, hold a slot when you can go, never get spammed."
            />
            <RoleCard
              active={role === 'hospital'}
              onClick={() => setRole('hospital')}
              icon={<LocalHospital />}
              title="I run a hospital or blood bank"
              body="Request donors, track who’s coming, forecast shortages and share surplus."
            />
          </Stack>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label={role === 'hospital' ? 'Your name' : 'Full name'} autoComplete="name" {...register('name', { required: 'Enter your name' })} error={!!errors.name} helperText={errors.name?.message} />
            </Grid>
            <Grid item xs={12} sm={7}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                autoComplete="email"
                {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField fullWidth label="Mobile" type="tel" autoComplete="tel" {...register('phone', { required: 'Enter your mobile number' })} error={!!errors.phone} helperText={errors.phone?.message || 'For SMS invites'} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                autoComplete="new-password"
                {...register('password', { required: 'Choose a password', minLength: { value: 8, message: 'At least 8 characters' } })}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', { validate: (v) => v === password || 'Passwords don’t match' })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />
            </Grid>
          </Grid>
        )}

        {step === 2 && (
          <Stack spacing={3}>
            <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${coords ? t.successSoft : t.line}`, bgcolor: coords ? t.successSoft : t.surface }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {coords ? 'Location shared' : locating ? 'Finding you…' : 'Share your location'}
                  </Typography>
                  <Typography variant="caption">Used to measure distance to hospitals. Never shown to anyone.</Typography>
                </Box>
                <Button size="small" variant={coords ? 'text' : 'contained'} startIcon={<MyLocation />} onClick={locate} disabled={locating}>
                  {coords ? 'Update' : 'Share'}
                </Button>
              </Stack>
            </Box>
            <TextField fullWidth label="Area / address" {...register('address', { required: 'Enter your area' })} error={!!errors.address} helperText={errors.address?.message} />

            {role === 'donor' ? (
              <>
                <Box>
                  <Typography variant="subtitle2" mb={1}>
                    Blood group
                  </Typography>
                  <Controller
                    name="bloodGroup"
                    control={control}
                    rules={{ required: 'Choose your blood group' }}
                    render={({ field }) => (
                      <ToggleButtonGroup
                        exclusive
                        value={field.value}
                        onChange={(_, v) => v && field.onChange(v)}
                        sx={{
                          flexWrap: 'wrap',
                          gap: 0.75,
                          '& .MuiToggleButton-root': {
                            minWidth: 56,
                            border: `1px solid ${t.lineStrong} !important`,
                            borderRadius: '999px !important',
                            fontWeight: 700,
                            color: t.ink,
                            '&.Mui-selected, &.Mui-selected:hover': { bgcolor: t.red, color: '#FFF9F3', borderColor: `${t.red} !important` },
                          },
                        }}
                      >
                        {BLOOD_GROUPS.map((g) => (
                          <ToggleButton key={g} value={g}>
                            {g}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    )}
                  />
                  {errors.bloodGroup && (
                    <Typography variant="caption" color="error" display="block" mt={0.75}>
                      {errors.bloodGroup.message}
                    </Typography>
                  )}
                </Box>
                <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Date of birth"
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ max: maxDob }}
                      {...register('dateOfBirth', { required: 'Enter your date of birth' })}
                      error={!!errors.dateOfBirth}
                      helperText={errors.dateOfBirth?.message || 'Donors must be 18+'}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Weight (kg)"
                      {...register('weight', { required: 'Required', min: { value: 45, message: 'Minimum 45 kg' }, valueAsNumber: true })}
                      error={!!errors.weight}
                      helperText={errors.weight?.message}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Controller
                      name="sex"
                      control={control}
                      render={({ field }) => (
                        <TextField select fullWidth label="Sex" {...field} helperText="Optional">
                          <MenuItem value="female">Female</MenuItem>
                          <MenuItem value="male">Male</MenuItem>
                          <MenuItem value="other">Prefer not to say</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
                </Box>
                <Box>
                  <Button size="small" onClick={() => setShowRare((s) => !s)} sx={{ ml: -1.5 }}>
                    {showRare ? 'Hide rare blood types' : 'I’ve been told I have a rare blood type'}
                  </Button>
                  <Collapse in={showRare}>
                    <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} mt={1}>
                      {Object.entries(RARE_PHENOTYPES).map(([code, label]) => {
                        const on = rare.includes(code)
                        return (
                          <Chip
                            key={code}
                            label={label}
                            onClick={() => setRare((r) => (on ? r.filter((x) => x !== code) : [...r, code]))}
                            variant={on ? 'filled' : 'outlined'}
                            sx={{ bgcolor: on ? t.red : 'transparent', color: on ? '#FFF9F3' : t.ink, '&:hover': { bgcolor: on ? t.redDark : t.sunken } }}
                          />
                        )
                      })}
                    </Stack>
                  </Collapse>
                </Box>
              </>
            ) : (
              <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField fullWidth label="Hospital name" {...register('hospitalName', { required: 'Required' })} error={!!errors.hospitalName} helperText={errors.hospitalName?.message} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Blood bank license no." {...register('licenseNumber', { required: 'Required' })} error={!!errors.licenseNumber} helperText={errors.licenseNumber?.message} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Contact person" {...register('contactPerson', { required: 'Required' })} error={!!errors.contactPerson} helperText={errors.contactPerson?.message} />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Blood bank phone (24×7)"
                    {...register('emergencyContact', { required: 'Required' })}
                    error={!!errors.emergencyContact}
                    helperText={errors.emergencyContact?.message || 'Shared with donors once they commit'}
                  />
                </Grid>
              </Grid>
              </Box>
            )}
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between" mt={4}>
          <Button onClick={() => setStep((s) => s - 1)} disabled={step === 0} sx={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
            Back
          </Button>
          {step < 2 ? (
            <Button variant="contained" size="large" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          )}
        </Stack>
      </form>

      <Typography variant="body2" color="text.secondary" mt={4}>
        Already registered?{' '}
        <Link href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} style={{ color: 'inherit', fontWeight: 600 }}>
          Sign in
        </Link>
      </Typography>
    </>
  )
}

export default function RegisterPage() {
  return (
    <AuthLayout
      aside={
        <>
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1.08, letterSpacing: '-0.015em' }}>
            One donation can help <em>three people.</em>
          </Typography>
          <Stack spacing={2} mt={4} sx={{ color: 'rgba(243,236,224,0.72)', maxWidth: 380 }}>
            {[
              'Invited only when you match and can actually donate',
              'Hold a slot so nobody makes a wasted trip',
              'Stood down the moment a request is covered',
            ].map((s) => (
              <Stack key={s} direction="row" spacing={1.5} alignItems="flex-start">
                <CheckCircle sx={{ fontSize: 18, color: '#E0484F', mt: '2px' }} />
                <Typography variant="body2" color="inherit">
                  {s}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </>
      }
    >
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  )
}
