export const SMS_MESSAGE_MAX = 300

export const REJECTION_QUICK_MESSAGES = [
    "I couldn't find your documents in the office. You may have to enroll with us first.",
    'Your RSBSA number does not match our records. Please visit the MAO office with a valid ID.',
    'Your RSBSA ID is unclear. Please bring the original copy to the MAO office.',
]

// Must stay identical to the backend template so the preview matches the real SMS.
export function buildRejectionSms(firstName, message, registrationId) {
    const name = String(firstName || '').trim() || 'Farmer'
    return `MannalonApp MAO: Hi ${name}, your farmer registration was not approved. ${String(message || '').trim()} Ref #${registrationId}`
}

export function smsSegments(text) {
    const length = String(text || '').length
    if (length <= 160) return 1
    return Math.ceil(length / 153)
}
