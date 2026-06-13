import { create } from 'zustand'
import type { RoleMode } from '@/@types/chat'

type UIState = {
  role: RoleMode
  setRole: (role: RoleMode) => void
  /** Whether the "Life situations" view is active (a sibling of the role tabs). */
  lifeMode: boolean
  setLifeMode: (lifeMode: boolean) => void
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
  lifeMode: false,
  setRole: (role) => {
    try {
      window.localStorage.setItem(storageKey, role)
    } catch {
      // ignore storage access errors
    }
    // Selecting an audience role leaves the Life situations view.
    set({ role, lifeMode: false })
  },
  setLifeMode: (lifeMode) => set({ lifeMode }),
}))
