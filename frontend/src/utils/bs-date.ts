/**
 * Nepali (Bikram Sambat) calendar utilities.
 * Months use Nepali names, displayed in Devanagari.
 */

export const BS_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण',
  'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर',
  'पुष', 'माघ', 'फाल्गुण', 'चैत्र',
]

export const BS_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashar', 'Shrawan',
  'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
  'Poush', 'Magh', 'Falgun', 'Chaitra',
]

// Current approximate BS year (2081/82 in 2024/25 AD)
export const CURRENT_BS_YEAR = 2081

export function formatBSDate(dateStr: string): string {
  // dateStr is like "2081-04-15" (BS)
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${year} ${BS_MONTHS_EN[month - 1] || ''} ${day}`
}

export function formatBSMonth(monthStr: string): string {
  // monthStr is like "2081-04"
  if (!monthStr) return '—'
  const [year, month] = monthStr.split('-').map(Number)
  return `${BS_MONTHS_EN[month - 1] || ''} ${year}`
}

export function getCurrentBSDateStr(): string {
  // Approximate: AD 2025 ≈ BS 2081/82
  const ad = new Date()
  const adYear = ad.getFullYear()
  const adMonth = ad.getMonth() + 1
  const adDay = ad.getDate()
  // Very rough: BS ≈ AD + 56 years, with month offset ~3.5
  const bsYear = adYear + 56 + (adMonth >= 4 ? 1 : 0)
  const bsMonth = adMonth >= 4 ? adMonth - 3 : adMonth + 9
  return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(adDay).padStart(2, '0')}`
}

export function getCurrentBSMonthStr(): string {
  const d = getCurrentBSDateStr()
  return d.slice(0, 7)
}

// Simple BS date input — plain text input with format hint
interface BSDateInputProps {
  value: string
  onChange: (v: string) => void
  label?: string
  required?: boolean
  min?: string
  placeholder?: string
  error?: string
}

export function BSDateInput({ value, onChange, label, required, placeholder = 'YYYY-MM-DD', error }: BSDateInputProps) {
  return (
    <div>
      {label && <label>{label} {required && <span className="text-status-overdue">*</span>}</label>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${error ? 'border-status-overdue focus:border-status-overdue' : ''}`}
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
        required={required}
        pattern="\d{4}-\d{2}-\d{2}"
        title="BS date in YYYY-MM-DD format (e.g. 2081-04-15)"
      />
      {error && <p className="text-status-overdue text-xs mt-1">{error}</p>}
      <p className="text-slate-500 text-xs mt-1">Bikram Sambat format: YYYY-MM-DD</p>
    </div>
  )
}
