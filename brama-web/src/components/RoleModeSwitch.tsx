import { Briefcase, ListChecks, Users, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/contexts/uiStore'
import type { RoleMode } from '@/@types/chat'

const MODES: { value: RoleMode; icon: typeof Zap }[] = [
  { value: 'young', icon: Zap },
  { value: 'senior', icon: Users },
  { value: 'worker', icon: Briefcase },
]

const OPTION =
  'inline-flex items-center gap-[var(--space-2)] px-[16px] py-[8px] border border-white rounded-[20px] ' +
  'bg-transparent text-[var(--color-text)] text-[length:var(--font-size-sm)] font-semibold cursor-pointer ' +
  'transition-all duration-[260ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ' +
  'hover:-translate-y-[2px] active:translate-y-0 ' +
  'aria-pressed:bg-white aria-pressed:text-black hover:bg-[rgb(255_255_255/0.5)]'

/** Role-mode tabs (plain buttons). Sits inside the chat header glass bar. */
export function RoleModeSwitch() {
  const { t } = useTranslation()
  const role = useUIStore((state) => state.role)
  const setRole = useUIStore((state) => state.setRole)
  const lifeMode = useUIStore((state) => state.lifeMode)
  const setLifeMode = useUIStore((state) => state.setLifeMode)

  return (
    <div role="group" aria-label={t('chat.rolesLabel')} className="inline-flex gap-[var(--space-1)]">
      {MODES.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={OPTION}
          aria-pressed={!lifeMode && role === value}
          onClick={() => setRole(value)}
        >
          <Icon aria-hidden="true" size={16} />
          {t(`navigation.roles.${value}`)}
        </button>
      ))}
      <button
        type="button"
        className={OPTION}
        aria-pressed={lifeMode}
        onClick={() => setLifeMode(true)}
      >
        <ListChecks aria-hidden="true" size={16} />
        {t('lifeEvents.heading')}
      </button>
    </div>
  )
}
