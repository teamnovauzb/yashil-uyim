import { useState } from 'react'
import { Newspaper, CalendarDays, Settings as SettingsIcon } from 'lucide-react'
import NewsView from './NewsView'
import ProgramView from './ProgramView'
import SettingsView from './SettingsView'

const TABS = [
  { key: 'news',     label: 'Yangiliklar', Icon: Newspaper,    Component: NewsView },
  { key: 'program',  label: 'Dastur',      Icon: CalendarDays, Component: ProgramView },
  { key: 'settings', label: 'Sozlama',     Icon: SettingsIcon, Component: SettingsView },
]

export default function EventsView() {
  const [tab, setTab] = useState('news')
  const Active = TABS.find(t => t.key === tab)?.Component || NewsView

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800/70 text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <Active />
    </div>
  )
}
