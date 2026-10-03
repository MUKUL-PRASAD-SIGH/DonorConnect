import axios, { AxiosError } from 'axios'
import type {
  DonorAlert,
  DonorProfile,
  Eligibility,
  ExchangeSuggestion,
  ForecastItem,
  HospitalAlert,
  HospitalProfile,
  Inventory,
  PublicRequest,
  Screening,
  TransferOffer,
  User,
} from './types'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const client = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : safe(() => localStorage.getItem('token'))),
  set: (t: string) => safe(() => localStorage.setItem('token', t)),
  clear: () => safe(() => (localStorage.removeItem('token'), localStorage.removeItem('user'))),
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn()
  } catch {
    return null
  }
}

client.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<any>) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    // An expired session on an authenticated call: sign out. A 401 from the
    // login form itself is just "wrong password" and must reach the form.
    if (status === 401 && !url.startsWith('/auth/') && tokenStore.get()) {
      tokenStore.clear()
      if (typeof window !== 'undefined') window.location.href = '/auth/login?expired=1'
    }
    if (!error.response) {
      return Promise.reject(new Error('Can’t reach the server. Check your connection and try again.'))
    }
    const data = error.response.data
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message || data?.error || error.message
    return Promise.reject(new Error(message))
  },
)

const get = <T>(url: string) => client.get<T, T>(url)
const post = <T>(url: string, body?: unknown) => client.post<T, T>(url, body)
const patch = <T>(url: string, body?: unknown) => client.patch<T, T>(url, body)
const del = <T>(url: string) => client.delete<T, T>(url)

export const api = {
  auth: {
    login: (body: { email: string; password: string }) => post<{ user: User; token: string }>('/auth/login', body),
    register: (body: Record<string, unknown>) => post<{ user: User; token: string }>('/auth/register', body),
    me: () => get<User>('/auth/me'),
  },
  alerts: {
    create: (body: Record<string, unknown>) => post<HospitalAlert>('/alerts', body),
    hospital: () => get<HospitalAlert[]>('/alerts/hospital'),
    close: (id: string, status: 'fulfilled' | 'cancelled') => patch<HospitalAlert>(`/alerts/${id}/status`, { status }),
    arrived: (id: string, donorId: string) => post<HospitalAlert>(`/alerts/${id}/responses/${donorId}/arrived`),
    noShow: (id: string, donorId: string) => post<HospitalAlert>(`/alerts/${id}/responses/${donorId}/no-show`),
    invites: () => get<DonorAlert[]>('/alerts/invites'),
    nearby: () => get<DonorAlert[]>('/alerts/nearby'),
    respond: (id: string, action: 'accept' | 'decline' | 'withdraw', notes?: string) =>
      post<DonorAlert>(`/alerts/${id}/respond`, { action, notes }),
  },
  donors: {
    profile: () => get<DonorProfile>('/donors/profile'),
    update: (body: Record<string, unknown>) => patch<DonorProfile>('/donors/profile', body),
    eligibility: () => get<Eligibility>('/donors/eligibility'),
    screening: (body: Screening) => post<DonorProfile>('/donors/screening', body),
  },
  hospitals: {
    profile: () => get<HospitalProfile>('/hospitals/profile'),
    update: (body: Record<string, unknown>) => patch<HospitalProfile>('/hospitals/profile', body),
    review: () => get<any[]>('/hospitals/review'),
    setVerified: (id: string, verified: boolean) => patch(`/hospitals/${id}/verification`, { verified }),
  },
  inventory: {
    get: () => get<Inventory>('/inventory'),
    addLot: (body: Record<string, unknown>) => post<Inventory>('/inventory/lots', body),
    discard: (id: string) => del<Inventory>(`/inventory/lots/${id}`),
    usage: (body: Record<string, unknown>) => post<Inventory>('/inventory/usage', body),
    forecast: () => get<{ horizonDays: number; generatedAt: string; items: ForecastItem[] }>('/inventory/forecast'),
    suggestions: () => get<ExchangeSuggestion[]>('/inventory/exchange/suggestions'),
    offers: () => get<TransferOffer[]>('/inventory/exchange/offers'),
    offer: (body: Record<string, unknown>) => post<TransferOffer[]>('/inventory/exchange/offers', body),
    updateOffer: (id: string, action: string) => patch<TransferOffer[]>(`/inventory/exchange/offers/${id}`, { action }),
  },
  public: {
    request: (code: string) => get<PublicRequest>(`/public/requests/${code}`),
    registry: () => get<{ code: string; label: string; registered: number; verified: number }[]>('/public/registry'),
  },
}
