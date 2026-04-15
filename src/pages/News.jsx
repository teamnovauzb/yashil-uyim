import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useT } from '../lib/prefs'
import XButton from '../components/XButton'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function NewsCard({ item }) {
  const [expanded, setExpanded] = useState(false)
  const preview = item.content.length > 200 ? item.content.slice(0, 200) + '...' : item.content

  return (
    <article className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden hover:shadow-md transition-shadow">
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-48 object-cover"
          onError={e => { e.target.style.display = 'none' }}
        />
      )}
      {!item.image_url && (
        <div className="w-full h-32 bg-gradient-to-br from-[#2D6A4F] to-[#52B788] flex items-center justify-center">
          <span className="text-4xl">🌿</span>
        </div>
      )}
      <div className="p-6">
        <p className="text-xs text-[#52B788] font-medium mb-2">
          📅 {formatDate(item.published_at)}
        </p>
        <h2 className="text-lg font-bold text-[#1B2D1F] mb-3 leading-snug">
          {item.title}
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          {expanded ? item.content : preview}
        </p>
        {item.content.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-[#2D6A4F] font-medium hover:text-[#40916C] transition-colors"
          >
            {expanded ? 'Kamroq ko\'rsatish ↑' : 'Ko\'proq o\'qish →'}
          </button>
        )}
      </div>
    </article>
  )
}

export default function News() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const t = useT()

  useEffect(() => {
    async function fetchNews() {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false })

      if (!error && data) setNews(data)
      setLoading(false)
    }
    fetchNews()
  }, [])

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <XButton />
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-5xl mb-4 block">📰</span>
          <h1 className="text-3xl font-bold text-[#1B2D1F] mb-2">{t('newsTitle')}</h1>
          <p className="text-[#40916C]">{t('featNewsDesc')}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#52B788]">
            <div className="inline-block w-8 h-8 border-3 border-[#52B788] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>{t('loading')}</p>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#B7E4C7]">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-gray-400">—</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {news.map(item => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
