/**
 * Vasati — BS Date Picker Component
 * Primary date input for the entire app. Outputs BS string.
 * Shows month/year navigation with Nepali month names.
 */
import { useState, useEffect } from 'react'
import { BS_MONTHS, BS_MONTHS_EN, getDaysInBSMonth, bsToAd, formatADDate, getTodayBS } from '../../utils'

interface BSDatePickerProps {
    value: string             // "2081-04-15"
    onChange: (bs: string, ad: string) => void  // Outputs both BS and AD
    label?: string
    required?: boolean
}

export default function BSDatePicker({ value, onChange, label, required }: BSDatePickerProps) {
    const today = getTodayBS()
    const [year, month, day] = (value || today).split('-').map(Number)
    const [viewYear, setViewYear] = useState(year || 2081)
    const [viewMonth, setViewMonth] = useState(month || 1)
    const [open, setOpen] = useState(false)

    const daysInMonth = getDaysInBSMonth(viewYear, viewMonth)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    function selectDay(d: number) {
        const bsStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const adDate = bsToAd(bsStr)
        onChange(bsStr, formatADDate(adDate))
        setOpen(false)
    }

    function prevMonth() {
        if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1) }
        else setViewMonth(viewMonth - 1)
    }

    function nextMonth() {
        if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1) }
        else setViewMonth(viewMonth + 1)
    }

    const selectedDay = value ? parseInt(value.split('-')[2]) : null
    const adPreview = value ? formatADDate(bsToAd(value)) : ''

    return (
        <div className="relative">
            {label && (
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {label} {required && <span className="text-status-overdue">*</span>}
                </label>
            )}

            {/* Input display */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-4 py-3
                   text-left text-white flex items-center justify-between
                   hover:border-gold/50 focus:border-gold transition-all"
            >
                <span>
                    {value ? (
                        <>
                            <span className="font-medium">{value}</span>
                            <span className="text-slate-400 text-xs ml-2">
                                ({BS_MONTHS[parseInt(value.split('-')[1]) - 1]})
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-500">Select BS date...</span>
                    )}
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {/* AD preview */}
            {adPreview && (
                <p className="text-xs text-slate-500 mt-1">AD: {adPreview}</p>
            )}

            {/* Calendar dropdown */}
            {open && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-bg-card border border-slate-700
                        rounded-2xl shadow-elevated p-4 w-80 animate-slide-down">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={prevMonth} className="btn-ghost p-1 rounded-lg text-xs">◀</button>
                        <div className="text-center">
                            <span className="text-gold font-semibold">
                                {BS_MONTHS[viewMonth - 1]} {viewYear}
                            </span>
                            <span className="block text-xs text-slate-500">
                                {BS_MONTHS_EN[viewMonth - 1]}
                            </span>
                        </div>
                        <button onClick={nextMonth} className="btn-ghost p-1 rounded-lg text-xs">▶</button>
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <div key={d} className="text-slate-500 font-medium py-1">{d}</div>
                        ))}
                        {days.map(d => {
                            const isSelected = d === selectedDay && viewYear === year && viewMonth === month
                            return (
                                <button
                                    key={d}
                                    onClick={() => selectDay(d)}
                                    className={`py-1.5 rounded-lg transition-all text-sm
                    ${isSelected
                                            ? 'bg-gold text-bg font-bold'
                                            : 'hover:bg-gold/10 text-slate-300 hover:text-gold'
                                        }`}
                                >
                                    {d}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
