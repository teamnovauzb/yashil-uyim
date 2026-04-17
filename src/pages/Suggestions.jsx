import { MessageSquare } from 'lucide-react'
import XButton from '../components/XButton'
import FeedbackPanel from '../components/FeedbackPanel'

export default function Suggestions() {
  return (
    <div className="py-10 px-4 pb-24">
      <div className="max-w-xl mx-auto">
        <XButton />
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#D8F3DC] text-[#2D6A4F] flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={26} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-[#1B2D1F] mb-1">Talab va Takliflar</h1>
          <p className="text-[#40916C] text-sm">
            Fikr, g'oya yoki muammoingizni biz bilan baham ko'ring
          </p>
        </div>
        <FeedbackPanel />
      </div>
    </div>
  )
}
