import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Leaf, Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Bosh sahifa' },
  { to: '/chipta', label: 'Chipta olish' },
  { to: '/dastur', label: 'Dastur' },
  { to: '/yangiliklar', label: 'Yangiliklar' },
  { to: '/taklif', label: 'Taklif yuborish' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-[#2D6A4F] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Leaf size={24} className="text-[#B7E4C7]" />
          <span>Yashil Uyim</span>
        </Link>

        <ul className="hidden md:flex gap-1">
          {navLinks.map(link => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#52B788] text-white'
                      : 'hover:bg-[#40916C] text-green-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-[#40916C] transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Menyuni ochish"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#40916C] px-4 pb-4">
          <ul className="flex flex-col gap-1">
            {navLinks.map(link => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#2D6A4F] text-white'
                        : 'hover:bg-[#2D6A4F] text-green-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}
