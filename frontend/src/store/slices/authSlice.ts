import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { api, tokenStore } from '@/lib/api'
import { disconnectSocket } from '@/lib/socket'
import type { User } from '@/lib/types'

export type { User }

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  /** false until we've read localStorage on the client — avoids redirect flicker */
  ready: boolean
  loading: boolean
  error: string | null
}

// Start empty on both server and client so hydration matches; AuthWrapper restores.
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  ready: false,
  loading: false,
  error: null,
}

const persist = (data: { user: User; token: string }) => {
  tokenStore.set(data.token)
  try {
    localStorage.setItem('user', JSON.stringify(data.user))
  } catch {}
  return data
}

export const login = createAsyncThunk('auth/login', async (credentials: { email: string; password: string }) =>
  persist(await api.auth.login(credentials)),
)

export const register = createAsyncThunk('auth/register', async (userData: Record<string, unknown>) =>
  persist(await api.auth.register(userData)),
)

/** Re-validate the stored session with the server and refresh the cached user. */
export const refreshUser = createAsyncThunk('auth/refresh', async () => {
  const user = await api.auth.me()
  try {
    localStorage.setItem('user', JSON.stringify(user))
  } catch {}
  return user
})

export const logout = createAsyncThunk('auth/logout', async () => {
  tokenStore.clear()
  disconnectSocket()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    restore: (state, action: PayloadAction<{ user: User; token: string } | null>) => {
      if (action.payload) {
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
      }
      state.ready = true
    },
  },
  extraReducers: (builder) => {
    const pending = (state: AuthState) => {
      state.loading = true
      state.error = null
    }
    const fulfilled = (state: AuthState, action: PayloadAction<{ user: User; token: string }>) => {
      state.loading = false
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.ready = true
    }
    builder
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, fulfilled)
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Login failed'
      })
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, fulfilled)
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Registration failed'
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
  },
})

export const { clearError, restore } = authSlice.actions
export default authSlice.reducer
