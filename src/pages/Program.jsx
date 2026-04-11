import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORY_LABELS = {
  'suhbat': { label: 'Suhbat', color: 'bg-blue-100 text-blue-700' },
  'master-klass': { label: 'Master-klass', color: 'bg-orange-100 text-orange-700' },
  'konsert': { label: 'Konsert', color: 'bg-purple-100 text-purple-700' },
  'ko\'rgazma': { label: 'Ko\'rgazma', color: 'bg-pink-100 text-pink-700' },
  'boshqa': { label: 'Tadbir', color: 'bg-gray-100 text-gray-700' },
}

function formatTime(t) {
  if (!t) return ''
  return t.slice(0, 5)
}

function ProgramCard({ item }) {
  const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS['boshqa']
  return (
    <div className="bg-white rounded-xl border border-[#B7E4C7] p-5 flex gap-4 hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0 text-center min-w-[70px]">
        <span className="text-[#2D6A4F] font-bold text-sm block">{formatTime(item.start_time)}</span>
        {item.end_time && (
          <span className="text-gray-400 text-xs">{formatTime(item.end_time)}</span>
        )}
      </div>
      <div className="border-l border-[#B7E4C7] pl-4 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h3 className="font-semibold text-[#1B2D1F] text-sm">{item.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
            {cat.label}
          </span>
        </div>
        {item.description && (
          <p className="text-gray-500 text-xs leading-relaxed mb-2">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          {item.speaker && (
            <span className="flex items-center gap-1">
              <span>👤</span> {item.speaker}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1">
              <span>📍</span> {item.location}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Program() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState(null)
  const [days, setDays] = useState([])

  useEffect(() => {
    async function fetchPrograms() {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (!error && data) {
        setPrograms(data)
        const uniqueDays = [...new Set(data.map(p => p.event_date))].sort()
        setDays(uniqueDays)
        if (uniqueDays.length > 0) setActiveDay(uniqueDays[0])
      }
      setLoading(false)
    }
    fetchPrograms()
  }, [])

  const filtered = programs.filter(p => p.event_date === activeDay)

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', weekday: 'long' })
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-5xl mb-4 block">📋</span>
          <h1 className="text-3xl font-bold text-[#1B2D1F] mb-2">Festival dasturi</h1>
          <p className="text-[#40916C]">
            2 kunlik festival jadvali — ma'ruzalar, master-klasslar va ko'ngilochar tadbirlar
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#52B788]">
            <div className="inline-block w-8 h-8 border-3 border-[#52B788] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>Yuklanmoqda...</p>
          </div>
        ) : days.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#B7E4C7]">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-gray-400">Dastur hali e'lon qilinmagan</p>
          </div>
        ) : (
          <>
            {/* Day tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {days.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                    activeDay === day
                      ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                      : 'bg-white text-[#2D6A4F] border-[#B7E4C7] hover:bg-[#D8F3DC]'
                  }`}
                >
                  {idx + 1}-kun · {formatDate(day)}
                </button>
              ))}
            </div>

            {/* Events */}
            <div className="space-y-3">
              {filtered.map(item => (
                <ProgramCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
