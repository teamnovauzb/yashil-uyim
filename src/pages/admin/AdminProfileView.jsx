import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  User, Phone, IdCard, Crown, Shield, Sun, Moon, Languages,
  Trash2, Search, UserPlus, LogOut,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePrefs } from '../../lib/prefs'
import { addAdmin, removeAdmin, invalidateAdmins, loadAdmins, isSuperAdmin } from '../../lib/admins'

const LANGS = [
  { code: 'uz', label: "O'zbek"  },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

export default function AdminProfileView({ tgUser, isSuper }) {
  const { theme, setTheme, lang, setLang } = usePrefs()
  const [users, setUsers]     = useState([])
  const [adminSet, setAdminSet] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [query, setQuery]     = useState('')
  const [busy, setBusy]       = useState(null)
  const [tab, setTab]         = useState('users') // 'users' | 'admins'

  const fullName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || '—'
    : 'Admin'

  const load = async () => {
    setLoading(true)
    invalidateAdmins()
    const [{ data: us }, admins] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      loadAdmins(),
    ])
    setUsers(us || [])
    setAdminSet(new Set((admins || []).map(a => Number(a.telegram_id))))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const promote = async (u) => {
    if (!isSuper) return toast.error('Faqat super admin promote qila oladi')
    if (!confirm(`${u.first_name || u.telegram_id} admin qilinsinmi?`)) return
    setBusy(u.telegram_id)
    try {
      await addAdmin({
        telegramId: u.telegram_id,
        username:   u.username,
        firstName:  u.first_name,
        addedBy:    tgUser?.id,
      })
      toast.success('Admin qilindi')
      load()
    } catch (err) { toast.error(err.message || 'Xato') }
    setBusy(null)
  }

  const demote = async (telegramId) => {
    if (!isSuper) return toast.error('Faqat super admin demote qila oladi')
    if (isSuperAdmin(telegramId)) return toast.error("Super adminni o'chirib bo'lmaydi")
    if (!confirm(`Admin o'chirilsinmi?`)) return
    setBusy(telegramId)
    try {
      await removeAdmin(telegramId)
      toast.success("O'chirildi")
      load()
    } catch (err) { toast.error(err.message || 'Xato') }
    setBusy(null)
  }

  const filtered = users.filter(u => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      String(u.telegram_id).includes(q)
    )
  })
  const adminList = users.filter(u => adminSet.has(Number(u.telegram_id)) || isSuperAdmin(u.telegram_id))
  // Ensure hardcoded super appears even if not in users table
  const currentTab = tab === 'admins' ? adminList : filtered

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] rounded-2xl p-5 text-white flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
          {tgUser?.first_name?.[0]?.toUpperCase() || '👤'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold truncate">{fullName}</p>
            {isSuper && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">SUPER</span>}
          </div>
          {tgUser?.username && <p className="text-green-200 text-xs">@{tgUser.username}</p>}
          {tgUser?.id && <p className="text-green-300 text-[11px] font-mono mt-0.5">ID: {tgUser.id}</p>}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4 space-y-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Sozlamalar</p>

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />} Mavzu
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'light', label: 'Oqish', Icon: Sun },
              { id: 'dark',  label: 'Qora',  Icon: Moon },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  theme === id
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-gray-800/80 text-gray-300 border-gray-700'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
            <Languages size={16} /> Til
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  lang === code
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-gray-800/80 text-gray-300 border-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users / Admins */}
      <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold">
            {tab === 'users' ? `Foydalanuvchilar (${users.length})` : `Adminlar (${adminList.length})`}
          </p>
        </div>

        <div className="flex gap-2 mb-3">
          {[
            { k: 'users',  l: 'Foydalanuvchilar' },
            { k: 'admins', l: 'Adminlar' },
          ].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                tab === k ? 'bg-green-600 text-white' : 'bg-gray-800/80 text-gray-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ism, telefon, username yoki ID..."
              className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600 py-8 text-sm">Yuklanmoqda...</div>
        ) : currentTab.length === 0 ? (
          <div className="text-center text-gray-600 py-8 text-sm">Bo'sh</div>
        ) : (
          <ul className="space-y-2">
            {currentTab.map((u) => {
              const isAdm = adminSet.has(Number(u.telegram_id)) || isSuperAdmin(u.telegram_id)
              const isSup = isSuperAdmin(u.telegram_id)
              const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—'
              return (
                <li key={u.telegram_id} className="bg-gray-800/50 rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isSup ? 'bg-amber-500/10 text-amber-400' :
                      isAdm ? 'bg-green-500/10 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {isSup ? <Crown size={16} /> : isAdm ? <Shield size={16} /> : <User size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                        {isSup ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">SUPER</span>
                        ) : isAdm && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-400/20 text-green-400 font-bold">ADMIN</span>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gray-500 mt-0.5">
                        {u.username && <span>@{u.username}</span>}
                        {u.phone && <span className="flex items-center gap-1 font-mono"><Phone size={10} /> {u.phone}</span>}
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono mt-0.5">ID: {u.telegram_id}</p>
                    </div>
                  </div>
                  {isSuper && !isSup && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-700/60">
                      {isAdm ? (
                        <button
                          onClick={() => demote(u.telegram_id)}
                          disabled={busy === u.telegram_id}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {busy === u.telegram_id ? '...' : "Admindan o'chirish"}
                        </button>
                      ) : (
                        <button
                          onClick={() => promote(u)}
                          disabled={busy === u.telegram_id}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-lg disabled:opacity-50"
                        >
                          <UserPlus size={12} />
                          {busy === u.telegram_id ? '...' : 'Admin qilish'}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!isSuper && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-300 text-center">
          Faqat super admin boshqa adminlarni boshqara oladi.
        </div>
      )}
    </div>
  )
}
