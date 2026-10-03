'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { API_URL, tokenStore } from './api'

let socket: Socket | null = null
let socketToken: string | null = null

function getSocket(): Socket {
  const token = tokenStore.get()
  // Reconnect when the user signs in/out so the server puts us in the right room
  if (socket && socketToken !== token) {
    socket.disconnect()
    socket = null
  }
  if (!socket) {
    socketToken = token
    socket = io(API_URL, { auth: token ? { token } : {}, transports: ['websocket', 'polling'] })
  }
  return socket
}

/** Subscribe to a server event for the lifetime of the component. */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void, enabled = true) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!enabled) return
    const s = getSocket()
    const listener = (p: T) => ref.current(p)
    s.on(event, listener)
    return () => {
      s.off(event, listener)
    }
  }, [event, enabled])
}

/** Join the anonymous room for a public request page. */
export function useWatchRequest(code: string | undefined, onUpdate: (payload: any) => void) {
  useSocketEvent('request:update', onUpdate, !!code)
  useEffect(() => {
    if (!code) return
    const s = getSocket()
    const join = () => s.emit('watchRequest', code)
    join()
    s.on('connect', join)
    return () => {
      s.off('connect', join)
      s.emit('unwatchRequest', code)
    }
  }, [code])
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  socketToken = null
}
