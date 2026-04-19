import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  QrCode, Camera, CameraOff, Check, X, RefreshCw, User, Phone, Hash,
  CheckCircle2, XCircle, AlertCircle, RotateCcw,
} from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { isSuperAdmin } from '../../lib/admins'

const SCANNER_ID = 'qr-scanner-region'

export default function ScannerView({ tgUser }) {
  const isSuper = isSuperAdmin(tgUser?.id)
  const [active, setActive] = useState(false)
  const [error, setError]   = useState(null)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const scannerRef = useRef(null)
  const lastTokenRef = useRef({ token: null, t: 0 })

  const stop = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { await scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setActive(false)
  }

  const handleScan = async (token) => {
    // Debounce same token within 2s
    const now = Date.now()
    if (lastTokenRef.current.token === token && now - lastTokenRef.current.t < 2000) return
    lastTokenRef.current = { token, t: now }

    await stop()

    try {
      const r = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mode: 'lookup' }),
      })
      const data = await r.json()
      if (!data.ok) {
        setResult({ kind: data.reason || 'error', token })
      } else {
        setResult({ kind: 'ready', token, ticket: data.ticket })
      }
    } catch {
      setResult({ kind: 'server_error', token })
    }
  }

  const start = async () => {
    setError(null)
    setResult(null)
    try {
      const cams = await Html5Qrcode.getCameras()
      if (!cams || cams.length === 0) {
        setError('Kamera topilmadi')
        return
      }
      const back = cams.find(c => /back|rear|environment/i.test(c.label)) || cams[cams.length - 1]
      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false })
      scannerRef.current = scanner
      await scanner.start(
        back.id,
        { fps: 12, qrbox: { width: 240, height: 240 } },
        (decoded) => handleScan(decoded),
        () => {}
      )
      setActive(true)
    } catch (e) {
      console.error('scanner start failed:', e)
      setError(e?.message || 'Kamerani ochib bo\'lmadi')
    }
  }

  useEffect(() => () => { stop() }, [])

  const admit = async (count) => {
    if (!result?.token) return
    const r = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: result.token, count }),
    })
    const data = await r.json()
    if (data.ok) {
      toast.success(`${data.admitted} kishi kiritildi`)
      setHistory(h => [{
        id:        data.ticket.id,
        name:      data.ticket.full_name,
        admitted:  data.admitted,
        total:     data.ticket.ticket_count,
        used:      data.ticket.checked_in_count,
        when:      Date.now(),
      }, ...h].slice(0, 10))
      setResult({ kind: 'admitted', ticket: data.ticket, admitted: data.admitted })
    } else {
      toast.error(data.reason || 'Xatolik')
      setResult({ kind: data.reason || 'error', ticket: data.ticket || result.ticket })
    }
  }

  const resetTicket = async () => {
    if (!result?.token || !isSuper) return
    if (!confirm('Bu chiptaning kirishlarini nolga qaytarish?')) return
    const r = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: result.token, mode: 'reset' }),
    })
    const data = await r.json()
    if (data.ok) {
      toast.success('Reset qilindi')
      setResult({ kind: 'ready', token: result.token, ticket: data.ticket })
    } else {
      toast.error('Xatolik')
    }
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <QrCode size={16} className="text-green-400" /> QR Skaner
        </h2>
        {active ? (
          <button onClick={stop} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg">
            <CameraOff size={12} /> To'xtatish
          </button>
        ) : (
          <button onClick={start} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg">
            <Camera size={12} /> Kamerani yoqish
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Scanner viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black aspect-square max-w-sm mx-auto w-full">
        <div id={SCANNER_ID} className="w-full h-full" />
        {!active && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-xs gap-2 pointer-events-none">
            <Camera size={28} />
            <p>"Kamerani yoqish" tugmasini bosing</p>
          </div>
        )}
      </div>

      {/* Result modal */}
      {result && (
        <ResultPanel
          result={result}
          isSuper={isSuper}
          onAdmit={admit}
          onReset={resetTicket}
          onScanAgain={() => { setResult(null); start() }}
          onClose={() => { setResult(null) }}
        />
      )}

      {/* Recent history */}
      {history.length > 0 && (
        <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Oxirgi skanerlar
          </p>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={`${h.id}-${h.when}`} className="flex items-center gap-3 text-xs">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{h.name || '—'}</p>
                  <p className="text-gray-500 text-[10px]">
                    +{h.admitted} kishi · {h.used}/{h.total}
                  </p>
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">
                  {new Date(h.when).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ResultPanel({ result, isSuper, onAdmit, onReset, onScanAgain, onClose }) {
  const { kind, ticket } = result

  if (kind === 'not_found') {
    return (
      <Banner color="rose" Icon={XCircle} title="Topilmadi" subtitle="Bu QR kod tizimda yo'q">
        <BtnRow primary={{ label: 'Yana skan qilish', onClick: onScanAgain }} secondary={{ label: 'Yopish', onClick: onClose }} />
      </Banner>
    )
  }

  if (kind === 'not_approved') {
    return (
      <Banner color="amber" Icon={AlertCircle} title="Tasdiqlanmagan" subtitle="Bu chipta hali tasdiqlanmagan yoki rad etilgan">
        <TicketInfo ticket={ticket} />
        <BtnRow primary={{ label: 'Yana skan qilish', onClick: onScanAgain }} secondary={{ label: 'Yopish', onClick: onClose }} />
      </Banner>
    )
  }

  if (kind === 'already_used') {
    return (
      <Banner color="rose" Icon={XCircle} title="To'liq foydalanilgan" subtitle="Barcha kirishlar ishlatilgan">
        <TicketInfo ticket={ticket} />
        {isSuper && (
          <button onClick={onReset} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-lg mb-2">
            <RotateCcw size={12} /> Reset
          </button>
        )}
        <BtnRow primary={{ label: 'Yana skan qilish', onClick: onScanAgain }} secondary={{ label: 'Yopish', onClick: onClose }} />
      </Banner>
    )
  }

  if (kind === 'admitted') {
    return (
      <Banner color="emerald" Icon={CheckCircle2} title="Kiritildi ✓" subtitle={`+${result.admitted} kishi muvaffaqiyatli`}>
        <TicketInfo ticket={ticket} />
        <BtnRow primary={{ label: 'Yana skan qilish', onClick: onScanAgain }} secondary={{ label: 'Yopish', onClick: onClose }} />
      </Banner>
    )
  }

  if (kind === 'ready' && ticket) {
    const remaining = ticket.ticket_count - ticket.checked_in_count
    return (
      <Banner color="emerald" Icon={Check} title="Ruxsat berish" subtitle={`${ticket.checked_in_count}/${ticket.ticket_count} kirgan`}>
        <TicketInfo ticket={ticket} />
        {remaining > 0 ? (
          <>
            <button
              onClick={() => onAdmit(remaining)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl mb-2"
            >
              <Check size={16} strokeWidth={2.5} />
              Hammasini kiritish ({remaining} kishi)
            </button>
            {remaining > 1 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {Array.from({ length: Math.min(remaining, 3) }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => onAdmit(n)}
                    className="py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-rose-400 text-xs mb-2 font-semibold">
            ⚠️ Hech kim qoldirilmagan
          </p>
        )}
        <BtnRow primary={{ label: 'Yana skan qilish', onClick: onScanAgain }} secondary={{ label: 'Yopish', onClick: onClose }} />
      </Banner>
    )
  }

  return (
    <Banner color="rose" Icon={XCircle} title="Xatolik" subtitle="Server xatosi, qayta urinib ko'ring">
      <BtnRow primary={{ label: 'Yana skan qilish', onClick: onScanAgain }} secondary={{ label: 'Yopish', onClick: onClose }} />
    </Banner>
  )
}

function Banner({ color, Icon, title, subtitle, children }) {
  const colors = {
    emerald: 'from-emerald-500/20 border-emerald-500/30',
    amber:   'from-amber-500/20 border-amber-500/30',
    rose:    'from-rose-500/20 border-rose-500/30',
  }
  const text = {
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    rose:    'text-rose-400',
  }
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors[color]} bg-gray-900/80 p-4`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center ${text[color]}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className={`text-base font-bold ${text[color]}`}>{title}</p>
          <p className="text-[11px] text-gray-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function TicketInfo({ ticket }) {
  if (!ticket) return null
  return (
    <div className="bg-gray-900/60 rounded-xl border border-gray-800 p-3 mb-3 space-y-1.5">
      <Row Icon={Hash}  label="Chipta №" value={ticket.ticket_number ? `#${ticket.ticket_number}` : '—'} />
      <Row Icon={User}  label="Ism"      value={ticket.full_name} />
      <Row Icon={Phone} label="Telefon"  value={ticket.phone} />
    </div>
  )
}

function Row({ Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon size={12} className="text-gray-500" />
      <span className="text-gray-500 w-20">{label}</span>
      <span className="text-white font-semibold truncate">{value}</span>
    </div>
  )
}

function BtnRow({ primary, secondary }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      <button onClick={secondary.onClick} className="py-2.5 bg-gray-800 text-gray-300 text-xs font-semibold rounded-lg">
        {secondary.label}
      </button>
      <button onClick={primary.onClick} className="py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5">
        <RefreshCw size={12} /> {primary.label}
      </button>
    </div>
  )
}
