import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Send, Reply, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getTelegramUser } from '../lib/telegram'
import { getCachedPhone } from '../lib/contact'

export default function FeedbackPanel() {
  const tgUser = getTelegramUser()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  const fullName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    : 'Mehmon'

  const load = async () => {
    if (!tgUser?.id) return
    const { data } = await supabase
      .from('suggestions')
      .select('id, message, reply, replied_at, created_at')
      .eq('chat_id', tgUser.id)
      .order('created_at', { ascending: false })
    setItems(data || [])
  }

  useEffect(() => { load() }, [tgUser?.id])

  const onSubmit = async ({ message }) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('suggestions')
      .insert({
        full_name: fullName,
        phone: getCachedPhone(tgUser) || null,
        message: message.trim(),
        chat_id: tgUser?.id || null,
      })
      .select('id')
      .single()

    if (error) {
      toast.error('Xatolik yuz berdi')
      setLoading(false)
      return
    }

    // Notify super admins via bot (best-effort)
    fetch('/api/suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'new',
        id: data?.id,
        full_name: fullName,
        message: message.trim(),
        chat_id: tgUser?.id || null,
        username: tgUser?.username || null,
        phone: getCachedPhone(tgUser) || null,
      }),
    }).catch(() => {})

    toast.success('Yuborildi!')
    reset()
    load()
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-2xl shadow-sm border border-[#B7E4C7] p-4 space-y-3"
      >
        <textarea
          rows={4}
          placeholder="Fikr, taklif yoki muammoingizni yozing..."
          {...register('message', {
            required: 'Xabar majburiy',
            minLength: { value: 5, message: "Kamida 5 ta belgi" },
          })}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#52B788] transition-all resize-none ${
            errors.message ? 'border-red-400' : 'border-[#B7E4C7] focus:border-[#52B788]'
          }`}
        />
        {errors.message && <p className="text-red-500 text-xs">{errors.message.message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#2D6A4F] text-white font-semibold py-3 rounded-xl hover:bg-[#40916C] transition-colors disabled:opacity-60 text-sm"
        >
          <Send size={16} />
          {loading ? 'Yuborilmoqda...' : 'Yuborish'}
        </button>
      </form>

      {items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.id} className="bg-white rounded-2xl border border-[#B7E4C7] overflow-hidden">
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-gray-400">
                    {new Date(it.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {it.reply ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#2D6A4F]">
                      <CheckCircle2 size={12} /> Javob berilgan
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-600">Kutilmoqda</span>
                  )}
                </div>
                <p className="text-sm text-[#1B2D1F] leading-relaxed whitespace-pre-wrap">
                  {it.message}
                </p>
              </div>
              {it.reply && (
                <div className="bg-[#F0FFF4] border-t border-[#B7E4C7] p-3.5 flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center shrink-0">
                    <Reply size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[#2D6A4F] mb-0.5 uppercase tracking-wider">
                      Admin javobi
                    </p>
                    <p className="text-sm text-[#1B2D1F] leading-relaxed whitespace-pre-wrap">
                      {it.reply}
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
