import { create } from 'zustand'
import type { RoleMode } from '../features/chat/types'

type UIState = {
  role: RoleMode
  setRole: (role: RoleMode) => void
}

const storageKey = 'brama.role'

function getInitialRole(): RoleMode {
  try {
    const stored = window.localStorage.getItem(storageKey)
    if (stored === 'young' || stored === 'senior' || stored === 'worker') {
      return stored
    }
  } catch {
    // ignore storage access errors
  }
  return 'young'
}

export const useUIStore = create<UIState>((set) => ({
  role: getInitialRole(),
  setRole: (role) => {
    try {
      window.localStorage.setItem(storageKey, role)
    } catch {
      // ignore storage access errors
    }
    set({ role })
  },
}))
