import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-[#1B2D1F] text-green-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-bold text-xl mb-3">
              <span className="text-2xl">🌿</span>
              <span className="text-white">Yashil Uyim</span>
            </div>
            <p className="text-sm text-green-300 leading-relaxed">
              Ekologiya va barqaror turmush tarzi uchun yillik festival.
              Tabiat bilan uyg'unlikda yashaymiz.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">Sahifalar</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-green-300 hover:text-white transition-colors">Bosh sahifa</Link></li>
              <li><Link to="/chipta" className="text-green-300 hover:text-white transition-colors">Chipta olish</Link></li>
              <li><Link to="/dastur" className="text-green-300 hover:text-white transition-colors">Festival dasturi</Link></li>
              <li><Link to="/yangiliklar" className="text-green-300 hover:text-white transition-colors">Yangiliklar</Link></li>
              <li><Link to="/taklif" className="text-green-300 hover:text-white transition-colors">Taklif yuborish</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-semibold mb-3">Ijtimoiy tarmoqlar</h4>
            <a
              href="https://www.instagram.com/yashil_uyim"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-green-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              @yashil_uyim
            </a>
          </div>
        </div>

        <div className="border-t border-green-800 mt-8 pt-6 text-center text-xs text-green-400">
          © 2025 Yashil Uyim Ekologik Festival. Barcha huquqlar himoyalangan.
        </div>
      </div>
    </footer>
  )
}
