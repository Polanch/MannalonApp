export function normalizeFarmCodePhone(value) {
    const phone = String(value || '').trim().replace(/[\s()-]/g, '')
    if (/^09\d{9}$/.test(phone)) return `+63${phone.slice(1)}`
    if (/^639\d{9}$/.test(phone)) return `+${phone}`
    return /^\+639\d{9}$/.test(phone) ? phone : ''
}

export function approvedCodeFarms(farms) {
    return farms.filter((farm) => farm != null && farm.status === 'APPROVED' && farm.parentFarmId == null
        && Number.isSafeInteger(Number(farm.farmId)) && Number(farm.farmId) > 0
        && typeof farm.farmCode === 'string' && farm.farmCode.trim().length > 0)
}

export function prepareFarmCodeMock(farm, farmers) {
    if (!farm || !approvedCodeFarms([farm]).length) throw new Error('Select an approved main farm with a Farm Code.')
    if (!farmers.length) throw new Error('Select at least one directory record.')
    const seen = new Set()
    const recipients = farmers.map((farmer) => {
        const phone = normalizeFarmCodePhone(farmer.mobileNumber)
        const status = !phone ? 'INVALID_NUMBER' : seen.has(phone) ? 'DUPLICATE_NUMBER' : 'READY'
        if (phone) seen.add(phone)
        return { farmerId: farmer.farmerId, name: [farmer.firstName, farmer.lastName].filter(Boolean).join(' ') || String(farmer.farmerId), phone: phone || String(farmer.mobileNumber || 'Missing'), status }
    })
    if (!recipients.some((recipient) => recipient.status === 'READY')) throw new Error('None of the selected records has a valid, unique Philippine mobile number.')
    return {
        farmId: farm.farmId,
        farmName: farm.farmName,
        farmCode: farm.farmCode,
        message: `Good Day!\n\nWelcome to Mannalon! Your farm has been registered in our database. You may proceed using this Farm Code: ${farm.farmCode}\n\nAccess the site here: Mannalon.com`,
        recipients,
    }
}
