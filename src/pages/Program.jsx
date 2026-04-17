import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/prefs'
import XButton from '../components/XButton'
import ImageLightbox from '../components/ImageLightbox'

const CATEGORY_LABELS = {
  'suhbat':         { label: 'Suhbat',        color: 'bg-blue-100 text-blue-700' },
  'master-klass':   { label: 'Master-klass',  color: 'bg-orange-100 text-orange-700' },
  'konsert':        { label: 'Konsert',       color: 'bg-purple-100 text-purple-700' },
  "ko'rgazma":      { label: "Ko'rgazma",     color: 'bg-pink-100 text-pink-700' },
  'boshqa':         { label: 'Tadbir',        color: 'bg-gray-100 text-gray-700' },
}

function formatTime(t) {
  return t ? t.slice(0, 5) : ''
}

function ProgramCard({ item, onOpenImage }) {
  const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS['boshqa']
  return (
    <article className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden hover:shadow-md transition-shadow">
      {item.image_url && (
        <button type="button" onClick={() => onOpenImage(item.image_url, item.title)} className="block w-full bg-[#F0FFF4]">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full aspect-[4/5] object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
          />
        </button>
      )}
      <div className="p-4 flex gap-4">
        <div className="flex-shrink-0 text-center min-w-[60px]">
          <span className="text-[#2D6A4F] font-bold text-sm block">{formatTime(item.start_time)}</span>
          {item.end_time && (
            <span className="text-gray-400 text-xs">{formatTime(item.end_time)}</span>
          )}
        </div>
        <div className="border-l border-[#B7E4C7] pl-4 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="font-semibold text-[#1B2D1F] text-sm">{item.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>
              {cat.label}
            </span>
          </div>
          {item.description && (
            <p className="text-gray-500 text-xs leading-relaxed mb-2">{item.description}</p>
          )}
          {item.speaker && (
            <p className="text-xs text-gray-400">👤 {item.speaker}</p>
          )}
        </div>
      </div>
    </article>
  )
}

export default function Program() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const t = useT()

  useEffect(() => {
    supabase.from('programs').select('*').order('start_time', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setItems(data)
        setLoading(false)
      })
  }, [])

  return (
    <div className="py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <XButton />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1B2D1F] mb-2">{t('programTitle')}</h1>
          <p className="text-[#40916C] text-sm">{t('programSubtitle')}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#52B788]">
            <div className="inline-block w-8 h-8 border-3 border-[#52B788] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>{t('loading')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#B7E4C7]">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-gray-400">{t('noProgram')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <ProgramCard
                key={item.id}
                item={item}
                onOpenImage={(src, alt) => setLightbox({ src, alt })}
              />
            ))}
          </div>
        )}
      </div>
      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}
