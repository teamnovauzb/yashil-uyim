import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, X, Check, Search } from 'lucide-react'
import toast from 'react-hot-toast'

// Fix default marker icon paths (Leaflet's defaults break under bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng) },
  })
  return null
}

export default function MapPicker({ initial, onClose, onPick }) {
  const startLat = parseFloat(initial?.lat) || 41.311081  // Tashkent default
  const startLng = parseFloat(initial?.lng) || 69.240562
  const [pos, setPos] = useState({ lat: startLat, lng: startLng })
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [mapRef, setMapRef] = useState(null)

  const runSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`,
        { headers: { 'Accept-Language': 'uz' } }
      )
      const data = await res.json()
      if (data?.[0]) {
        const { lat, lon } = data[0]
        const newPos = { lat: parseFloat(lat), lng: parseFloat(lon) }
        setPos(newPos)
        mapRef?.flyTo([newPos.lat, newPos.lng], 16)
      } else {
        toast.error('Topilmadi')
      }
    } catch {
      toast.error('Qidiruv xato')
    }
    setSearching(false)
  }

  const confirm = () => {
    onPick({ lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 4rem)' }}>
        <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-gray-800 flex items-center justify-center text-white">
          <X size={18} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Joyni tanlang</p>
          <p className="text-[11px] text-gray-500">Xaritada bosing yoki pin ustiga tashang</p>
        </div>
        <button onClick={confirm} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg">
          <Check size={14} /> Tanlash
        </button>
      </div>

      {/* Search */}
      <form onSubmit={runSearch} className="bg-gray-900 border-b border-gray-800 px-4 py-2.5 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Manzilni qidirish..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>
        <button type="submit" disabled={searching}
          className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium px-3 rounded-lg disabled:opacity-50">
          {searching ? '...' : 'Qidirish'}
        </button>
      </form>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={15}
          className="w-full h-full"
          ref={setMapRef}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[pos.lat, pos.lng]}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = e.target.getLatLng()
                setPos({ lat, lng })
              },
            }}
          />
          <ClickHandler onPick={(latlng) => setPos(latlng)} />
        </MapContainer>

        {/* Coord readout */}
        <div className="absolute bottom-4 left-4 right-4 bg-gray-900/95 backdrop-blur border border-gray-800 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
          <MapPin size={14} className="text-green-400 shrink-0" />
          <span className="font-mono text-gray-300 tabular-nums truncate">
            {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  )
}
