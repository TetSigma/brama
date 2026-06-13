import { Briefcase, Users, Zap } from 'lucide-react'
import { useUIStore } from '@/contexts/uiStore'
import type { RoleMode } from '@/@types/chat'

const MODES: { value: RoleMode; label: string; icon: typeof Zap }[] = [
  { value: 'young', label: 'Standard', icon: Zap },
  { value: 'senior', label: 'Senior', icon: Users },
  { value: 'worker', label: 'Urzędnik', icon: Briefcase },
]

export function RoleModeSwitch() {
  const role = useUIStore((state) => state.role)
  const setRole = useUIStore((state) => state.setRole)

  return (
    <div className="role-switch" role="group" aria-label="Tryb użytkownika">
      {MODES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className="role-switch__option"
          aria-pressed={role === value}
          onClick={() => setRole(value)}
        >
          <Icon aria-hidden="true" size={16} />
          {label}
        </button>
      ))}
    </div>
  )
}
