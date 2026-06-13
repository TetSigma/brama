import { Briefcase, Users, Zap } from 'lucide-react'
import { GlassCard } from 'react-glass-ui'
import { useUIStore } from '@/contexts/uiStore'
import type { RoleMode } from '@/@types/chat'

const MODES: { value: RoleMode; label: string; icon: typeof Zap }[] = [
  { value: 'young', label: 'Standard', icon: Zap },
  { value: 'senior', label: 'Senior', icon: Users },
  { value: 'worker', label: 'Urzędnik', icon: Briefcase },
]

const OPTION =
  'inline-flex items-center gap-[var(--space-2)] px-[20px] py-[10px] border border-white rounded-[20px] ' +
  'bg-transparent text-black text-[length:var(--font-size-sm)] font-semibold cursor-pointer ' +
  'transition-all duration-[250ms] ease-[ease] aria-pressed:bg-white aria-pressed:text-black ' +
  'hover:bg-[rgb(255_255_255/0.5)]'

/**
 * Top tabs for role mode, presented as a liquid-glass bar (react-glass-ui GlassCard).
 * Real <button>s inside keep keyboard/aria support — GlassButton does not forward aria-*.
 */
export function RoleModeSwitch() {
  const role = useUIStore((state) => state.role)
  const setRole = useUIStore((state) => state.setRole)

  return (
    <GlassCard
      className="inline-flex"
      contentClassName="inline-flex gap-[var(--space-1)]"
      blur={17}
      distortion={343}
      flexibility={17}
      borderColor="#ffffff"
      borderSize={1}
      borderRadius={130}
      borderOpacity={0.4}
      backgroundColor="#000000"
      backgroundOpacity={0}
      innerLightColor="#ffffff"
      innerLightSpread={1}
      innerLightBlur={10}
      innerLightOpacity={0}
      outerLightColor="#ffffff"
      outerLightSpread={1}
      outerLightBlur={10}
      outerLightOpacity={0}
      chromaticAberration={0}
      onHoverScale={1}
      saturation={100}
      brightness={100}
      padding="4px"
    >
      <div role="group" aria-label="Tryb użytkownika" className="inline-flex gap-[var(--space-1)]">
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            className={OPTION}
            aria-pressed={role === value}
            onClick={() => setRole(value)}
          >
            <Icon aria-hidden="true" size={16} />
            {label}
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
