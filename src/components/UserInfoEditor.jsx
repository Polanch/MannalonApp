import { useEffect, useState } from 'react'
import { accountError, fetchMemberInfo, updateMemberInfo } from '../services/userManagementApi.js'

const addressFields = [
    ['houseLotBlock', 'House / lot / block', 100], ['street', 'Street', 150], ['barangay', 'Barangay', 100],
    ['municipalityCity', 'Municipality / city', 100], ['province', 'Province', 100], ['region', 'Region', 100], ['zipCode', 'ZIP code', 10],
]

function UserInfoEditor({ account, onClose, onSaved }) {
    const [fields, setFields] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        fetchMemberInfo(account.id, controller.signal)
            .then((data) => { if (!controller.signal.aborted) setFields(data) })
            .catch((failure) => { if (!controller.signal.aborted) setError(accountError(failure)) })
        return () => controller.abort()
    }, [account.id])

    function field(name, label, maxLength, required = false, type = 'text', readOnly = false) {
        return <label key={name}>{label}<input name={name} type={type} maxLength={maxLength} required={required}
            readOnly={readOnly} value={fields[name] || ''} onChange={(event) => setFields((current) => ({ ...current, [name]: event.target.value }))} /></label>
    }

    async function submit(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            await updateMemberInfo(account.id, fields)
            onSaved()
        } catch (failure) {
            setError(accountError(failure))
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="um-panel" aria-labelledby="um-edit-title">
            <div className="um-heading"><div><h2 id="um-edit-title">Edit user</h2><p className="um-muted">{account.userId} · {account.role}</p></div>
                <button type="button" disabled={busy} onClick={onClose}>Close</button></div>
            <p className="um-muted">Login IDs, roles, farm assignments, and approval records are protected.</p>
            {error && <p className="um-error" role="alert">{error}</p>}
            {!fields && !error && <p role="status">Loading user information...</p>}
            {fields && <form onSubmit={submit}><fieldset disabled={busy}>
                <div className="um-form-grid">
                    {field('firstName', 'First name', 100, true)}
                    {field('lastName', 'Last name', 100, true)}
                    {field('middleName', account.role === 'Farmer' ? 'Middle name' : 'Middle initial', account.role === 'Farmer' ? 100 : 5)}
                    {field('mobileNumber', account.role === 'Farmer' ? 'Mobile number (login ID)' : 'Mobile number', 20, true, 'tel', account.role === 'Farmer')}
                    {account.role === 'Farmer' ? <>
                        {field('birthdate', 'Birthdate', undefined, true, 'date')}
                        {field('civilStatus', 'Civil status', 30, true)}
                        {field('gender', 'Gender', 30, true)}
                    </> : field('personalEmail', 'Personal email', 150, true, 'email')}
                    {addressFields.map(([name, label, length]) => field(name, label, name === 'zipCode' && account.role === 'Farmer' ? 20 : length, ['barangay', 'municipalityCity', 'province', 'region'].includes(name)))}
                </div>
                <button type="submit">{busy ? 'Saving...' : 'Save changes'}</button>
            </fieldset></form>}
        </section>
    )
}

export default UserInfoEditor
