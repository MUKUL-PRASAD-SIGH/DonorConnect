'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AuthLayout from '@/components/AuthLayout'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { clearError, login } from '@/store/slices/authSlice'

const homeFor = (role: string) => (role === 'hospital' ? '/hospital/dashboard' : role === 'admin' ? '/admin' : '/donor/dashboard')

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const dispatch = useAppDispatch()
  const { loading, error } = useAppSelector((s) => s.auth)
  const next = params.get('next')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string; password: string }>()

  useEffect(() => {
    dispatch(clearError())
    if (params.get('expired')) toast('Your session expired — please sign in again')
  }, [dispatch, params])

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      const { user } = await dispatch(login(data)).unwrap()
      router.push(next && next.startsWith('/') ? next : homeFor(user.role))
    } catch {
      // error is shown inline from the store
    }
  }

  return (
    <>
      <Typography variant="h2" component="h1" mb={1}>
        Welcome <em>back</em>
      </Typography>
      <Typography color="text.secondary" mb={4}>
        Sign in to see your invites, requests and stock.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      <Stack component="form" spacing={2.25} onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          fullWidth
          {...register('email', { required: 'Enter your email' })}
          error={!!errors.email}
          helperText={errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          fullWidth
          {...register('password', { required: 'Enter your password' })}
          error={!!errors.password}
          helperText={errors.password?.message}
        />
        <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" mt={4}>
        New here?{' '}
        <Link href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} style={{ color: 'inherit', fontWeight: 600 }}>
          Create an account
        </Link>
      </Typography>
    </>
  )
}

export default function LoginPage() {
  return (
    <AuthLayout
      aside={
        <>
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1.08, letterSpacing: '-0.015em' }}>
            The right donors, the right number, <em>at the right time.</em>
          </Typography>
          <Typography sx={{ mt: 3, color: 'rgba(243,236,224,0.65)', maxWidth: 380 }}>
            Instead of a broadcast that brings forty people for two units, DonorConnect invites a few, holds their slots, and thanks
            everyone else.
          </Typography>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}
