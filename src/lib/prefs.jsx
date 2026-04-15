import { createContext, useContext, useEffect, useState } from 'react'

const THEME_KEY = 'pref_theme'
const LANG_KEY  = 'pref_lang'

const PrefsContext = createContext(null)

function applyTheme(theme) {
  if (theme === 'dark') document.body.classList.add('theme-dark')
  else document.body.classList.remove('theme-dark')
}

export function PrefsProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  const [lang,  setLangState]  = useState(() => localStorage.getItem(LANG_KEY)  || 'uz')

  useEffect(() => { applyTheme(theme); localStorage.setItem(THEME_KEY, theme) }, [theme])
  useEffect(() => { localStorage.setItem(LANG_KEY, lang) }, [lang])

  return (
    <PrefsContext.Provider value={{ theme, setTheme: setThemeState, lang, setLang: setLangState }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
  return ctx
}

const DICT = {
  uz: {
    appName: 'Yashil Uyim', tagline: 'Ekologik Festival',
    home: 'Bosh', news: 'Yangilik', tickets: 'Chipta', program: 'Dastur', profile: 'Profil',
    monthlyTashkent: 'Har oy · Toshkent',
    festivalIn: 'Festivalgacha qoldi',
    buyTicket: 'Chipta olish', viewProgram: "Dasturni ko'rish",
    whatAtFestival: "Festivalda nima bo'ladi?",
    forAllAges: 'Barcha yosh va qiziqishlar uchun dastur',
    featTicket: 'Chipta olish', featTicketDesc: "Festival uchun bepul ro'yxatdan o'ting. Joylar cheklangan!", featRegister: "Ro'yxatdan o'tish",
    featProgram: 'Festival dasturi', featProgramDesc: "Ma'ruzalar, master-klasslar, konsertlar va ko'rgazmalar.",
    featNews: 'Yangiliklar', featNewsDesc: "So'nggi yangiliklar va e'lonlar.",
    featSuggestion: 'Taklif yuborish', featSuggestionDesc: "G'oya va takliflaringizni yuboring.", sendSuggestion: 'Taklif yuborish',
    newsTitle: 'Yangiliklar',
    eventLocation: 'Tadbir joyi', whereIsIt: "Qayerda bo'lib o'tadi?", openInMaps: "Google Maps'da ochish",
    aboutUs: 'Yashil Uyim haqida', instagramOurs: 'Bizning Instagram', festivalMoments: 'Festival lahzalari', followUs: 'Kuzatib boring',
    myTickets: 'Mening chiptalarim', noTickets: "Hali chipta yo'q",
    phone: 'Telefon', status: 'Holat', verified: 'Tasdiqlangan', guest: 'Mehmon', notShared: 'Ulashilmagan',
    settings: 'Sozlamalar', theme: 'Mavzu', language: 'Til', light: 'Oqish', dark: 'Qora',
    fullName: "To'liq ism", ticketCount: 'Chipta soni',
    pending: 'Kutilmoqda', approved: 'Tasdiqlangan', fake: 'Rad etilgan',
    loading: 'Yuklanmoqda...', back: 'Orqaga', next: 'Davom etish',
    uploadReceipt: 'Chekni yuklang', receiptSubtitle: "To'lov cheki yoki skrinshot",
    pickImage: 'Rasmni yuklash', submit: 'Yuborish',
    programTitle: 'Festival dasturi', programSubtitle: "Ma'ruzalar va tadbirlar",
    noProgram: "Dastur hali e'lon qilinmagan",
    adminPanel: 'Admin Panel', overview: 'Statistika',
    allUsers: 'Foydalanuvchilar', allTickets: 'Jami chiptalar', soldTickets: 'Sotilgan',
    statusBreakdown: 'Chiptalar holati', details: 'Batafsil',
    signupsTrend: "Ro'yxatdan o'tishlar", last14Days: '14 kunlik trend',
    newsAdmin: 'Yangilik', programAdmin: 'Dastur', admins: 'Admin', users: 'Users',
    settingsTab: 'Sozlama',
    add: "Qo'shish", new: 'Yangi', edit: 'Tahrirlash', delete: "O'chirish",
    save: 'Saqlash', cancel: 'Bekor qilish', confirm: 'Tasdiqlash',
    search: 'Qidirish', empty: "Ro'yxat bo'sh", logout: 'Chiqish',
    promote: 'Admin qilish', demote: "Admindan o'chirish",
  },
  ru: {
    appName: 'Yashil Uyim', tagline: 'Эко-фестиваль',
    home: 'Главная', news: 'Новости', tickets: 'Билеты', program: 'Программа', profile: 'Профиль',
    monthlyTashkent: 'Ежемесячно · Ташкент', festivalIn: 'До фестиваля',
    buyTicket: 'Купить билет', viewProgram: 'Программа',
    whatAtFestival: 'Что на фестивале?',
    forAllAges: 'Программа для всех возрастов',
    featTicket: 'Билеты', featTicketDesc: 'Бесплатная регистрация. Места ограничены!', featRegister: 'Регистрация',
    featProgram: 'Программа', featProgramDesc: 'Лекции, мастер-классы и концерты.',
    featNews: 'Новости', featNewsDesc: 'Последние новости и анонсы.',
    featSuggestion: 'Предложения', featSuggestionDesc: 'Отправьте идею организаторам.', sendSuggestion: 'Отправить',
    newsTitle: 'Новости',
    eventLocation: 'Место', whereIsIt: 'Где проходит?', openInMaps: 'Открыть в Google Maps',
    aboutUs: 'О Yashil Uyim', instagramOurs: 'Наш Instagram', festivalMoments: 'Моменты фестиваля', followUs: 'Подписаться',
    myTickets: 'Мои билеты', noTickets: 'Билетов пока нет',
    phone: 'Телефон', status: 'Статус', verified: 'Подтверждён', guest: 'Гость', notShared: 'Не указан',
    settings: 'Настройки', theme: 'Тема', language: 'Язык', light: 'Светлая', dark: 'Тёмная',
    fullName: 'Полное имя', ticketCount: 'Кол-во',
    pending: 'Ожидание', approved: 'Подтверждён', fake: 'Отклонён',
    loading: 'Загрузка...', back: 'Назад', next: 'Продолжить',
    uploadReceipt: 'Загрузите чек', receiptSubtitle: 'Чек или скриншот',
    pickImage: 'Выбрать', submit: 'Отправить',
    programTitle: 'Программа фестиваля', programSubtitle: 'Лекции и мероприятия',
    noProgram: 'Программа ещё не объявлена',
    adminPanel: 'Админ-панель', overview: 'Обзор',
    allUsers: 'Юзеры', allTickets: 'Всего билетов', soldTickets: 'Продано',
    statusBreakdown: 'Статус билетов', details: 'Подробно',
    signupsTrend: 'Регистрации', last14Days: '14 дней',
    newsAdmin: 'Новости', programAdmin: 'Программа', admins: 'Админы', users: 'Юзеры',
    settingsTab: 'Настр.',
    add: 'Добавить', new: 'Новый', edit: 'Изм.', delete: 'Удалить',
    save: 'Сохранить', cancel: 'Отмена', confirm: 'ОК',
    search: 'Поиск', empty: 'Список пуст', logout: 'Выход',
    promote: 'Админом', demote: 'Удалить',
  },
  en: {
    appName: 'Yashil Uyim', tagline: 'Eco Festival',
    home: 'Home', news: 'News', tickets: 'Tickets', program: 'Program', profile: 'Profile',
    monthlyTashkent: 'Monthly · Tashkent', festivalIn: 'Festival starts in',
    buyTicket: 'Get ticket', viewProgram: 'View program',
    whatAtFestival: "What's at the festival?",
    forAllAges: 'Something for every age and interest',
    featTicket: 'Get a ticket', featTicketDesc: 'Free registration. Seats are limited!', featRegister: 'Register',
    featProgram: 'Program', featProgramDesc: 'Talks, workshops, concerts and exhibits.',
    featNews: 'News', featNewsDesc: 'Latest news and announcements.',
    featSuggestion: 'Suggestion', featSuggestionDesc: 'Share your idea with the organizers.', sendSuggestion: 'Send',
    newsTitle: 'News',
    eventLocation: 'Venue', whereIsIt: 'Where is it held?', openInMaps: 'Open in Google Maps',
    aboutUs: 'About Yashil Uyim', instagramOurs: 'Our Instagram', festivalMoments: 'Festival moments', followUs: 'Follow us',
    myTickets: 'My tickets', noTickets: 'No tickets yet',
    phone: 'Phone', status: 'Status', verified: 'Verified', guest: 'Guest', notShared: 'Not shared',
    settings: 'Settings', theme: 'Theme', language: 'Language', light: 'Light', dark: 'Dark',
    fullName: 'Full name', ticketCount: 'Tickets',
    pending: 'Pending', approved: 'Approved', fake: 'Rejected',
    loading: 'Loading...', back: 'Back', next: 'Continue',
    uploadReceipt: 'Upload receipt', receiptSubtitle: 'Payment receipt or screenshot',
    pickImage: 'Choose image', submit: 'Submit',
    programTitle: 'Festival program', programSubtitle: 'Talks, workshops and entertainment',
    noProgram: "Program hasn't been announced yet",
    adminPanel: 'Admin Panel', overview: 'Overview',
    allUsers: 'Users', allTickets: 'Total tickets', soldTickets: 'Sold',
    statusBreakdown: 'Ticket status', details: 'Details',
    signupsTrend: 'Signups', last14Days: '14-day trend',
    newsAdmin: 'News', programAdmin: 'Program', admins: 'Admins', users: 'Users',
    settingsTab: 'Settings',
    add: 'Add', new: 'New', edit: 'Edit', delete: 'Delete',
    save: 'Save', cancel: 'Cancel', confirm: 'Confirm',
    search: 'Search', empty: 'List is empty', logout: 'Logout',
    promote: 'Promote', demote: 'Remove',
  },
}

export function useT() {
  const { lang } = usePrefs()
  const table = DICT[lang] || DICT.uz
  return (key) => table[key] ?? DICT.uz[key] ?? key
}
