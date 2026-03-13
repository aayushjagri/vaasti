/**
 * Vasati — Bikram Sambat Calendar Utility
 * BS ↔ AD conversion lookup table.
 * Covers 2000 BS to 2090 BS (approx 1943 AD to 2033 AD).
 * Every date field in the UI must use this.
 */

// BS month days for each year (2000-2090 BS)
// Each entry: [month1_days, month2_days, ..., month12_days]
const BS_CALENDAR: Record<number, number[]> = {
    2070: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2072: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2073: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2074: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2077: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2078: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
    2079: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2080: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
    2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2082: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2084: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2086: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2088: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2089: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
}

// Reference point: 2070-01-01 BS = 2013-04-14 AD
const BS_REF = { year: 2070, month: 1, day: 1 }
const AD_REF = new Date(2013, 3, 14) // April 14, 2013

const BS_MONTHS = [
    'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
    'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फाल्गुन', 'चैत'
]

const BS_MONTHS_EN = [
    'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
]

function getDaysInBSMonth(year: number, month: number): number {
    if (BS_CALENDAR[year]) {
        return BS_CALENDAR[year][month - 1]
    }
    return 30 // fallback
}

function getTotalDaysInBSYear(year: number): number {
    if (BS_CALENDAR[year]) {
        return BS_CALENDAR[year].reduce((sum, d) => sum + d, 0)
    }
    return 365
}

/**
 * Convert BS date string to AD Date.
 */
export function bsToAd(bsDate: string): Date {
    const [year, month, day] = bsDate.split('-').map(Number)
    if (!year || !month || !day) return new Date()

    let totalDays = 0

    // Add days for complete years between reference and target
    for (let y = BS_REF.year; y < year; y++) {
        totalDays += getTotalDaysInBSYear(y)
    }

    // Add days for complete months in target year
    for (let m = 1; m < month; m++) {
        totalDays += getDaysInBSMonth(year, m)
    }

    // Add remaining days
    totalDays += day - 1

    const result = new Date(AD_REF)
    result.setDate(result.getDate() + totalDays)
    return result
}

/**
 * Convert AD Date to BS date string "YYYY-MM-DD".
 */
export function adToBs(adDate: Date): string {
    const diffMs = adDate.getTime() - AD_REF.getTime()
    let totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    let bsYear = BS_REF.year
    let bsMonth = BS_REF.month
    let bsDay = BS_REF.day

    // Add days
    while (totalDays > 0) {
        const daysInMonth = getDaysInBSMonth(bsYear, bsMonth)
        const remainingDaysInMonth = daysInMonth - bsDay

        if (totalDays <= remainingDaysInMonth) {
            bsDay += totalDays
            totalDays = 0
        } else {
            totalDays -= (remainingDaysInMonth + 1)
            bsMonth++
            bsDay = 1
            if (bsMonth > 12) {
                bsMonth = 1
                bsYear++
            }
        }
    }

    return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`
}

/**
 * Format BS date for display: "15 बैशाख 2081"
 */
export function formatBSDate(bsDate: string): string {
    if (!bsDate) return '-'
    const [year, month, day] = bsDate.split('-').map(Number)
    return `${day} ${BS_MONTHS[month - 1]} ${year}`
}

/**
 * Format BS date in English: "15 Baisakh 2081"
 */
export function formatBSDateEn(bsDate: string): string {
    if (!bsDate) return '-'
    const [year, month, day] = bsDate.split('-').map(Number)
    return `${day} ${BS_MONTHS_EN[month - 1]} ${year}`
}

/**
 * Format BS month for display: "बैशाख 2081"
 */
export function formatBSMonth(bsMonth: string): string {
    if (!bsMonth) return '-'
    const [year, month] = bsMonth.split('-').map(Number)
    return `${BS_MONTHS[month - 1]} ${year}`
}

/**
 * Get today's BS date.
 */
export function getTodayBS(): string {
    return adToBs(new Date())
}

/**
 * Get current BS month: "2081-04"
 */
export function getCurrentBSMonth(): string {
    const today = getTodayBS()
    return today.substring(0, 7)
}

/**
 * Format AD date for display: "2024-07-28"
 */
export function formatADDate(date: string | Date): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
}

/**
 * Format NPR currency: "NPR 15,000.00"
 */
export function formatNPR(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return 'NPR 0.00'
    return `NPR ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export { BS_MONTHS, BS_MONTHS_EN, BS_CALENDAR, getDaysInBSMonth }
