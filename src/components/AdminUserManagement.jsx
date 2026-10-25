import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { accountError, changeUserStatus, createAdminAccount, deactivateCurrentAdmin, fetchAccountAppeals, fetchCurrentAdmin, fetchManagedUsers, reviewAccountAppeal } from '../services/userManagementApi.js'
import { clearLocalAccount } from '../services/accountAccess.js'
import UserInfoEditor from './UserInfoEditor.jsx'
import '../assets/styles/user-management.css'

function AdminUserManagement() {
    const navigate = useNavigate()
    const [tab, setTab] = useState('users')
    const [query, setQuery] = useState({ search: '', role: '', status: '', page: 0, revision: 0 })
    const [search, setSearch] = useState('')
    const [data, setData] = useState(null)
    const [me, setMe] = useState(null)
    const [error, setError] = useState('')
    const [toast, setToast] = useState(null)
    const [editing, setEditing] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [admin, setAdmin] = useState({ fullName: '', employeeId: '', password: '' })
    const [busy, setBusy] = useState(false)
    const [action, setAction] = useState(null)
    const [reason, setReason] = useState('')
    const [password, setPassword] = useState('')
    const [actionError, setActionError] = useState('')
    const dialogRef = useRef(null)
    const editorRef = useRef(null)
    const previousFocus = useRef(null)

    useEffect(() => {
        let active = true
        fetchCurrentAdmin().then((result) => { if (active) setMe(result) })
            .catch((failure) => { if (active) setError(accountError(failure)) })
        return () => { active = false }
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        const request = tab === 'appeals'
            ? fetchAccountAppeals({ status: query.status || 'PENDING', page: query.page }, controller.signal)
            : fetchManagedUsers({ ...query, admins: tab === 'admins' }, controller.signal)
        request.then((result) => { if (!controller.signal.aborted) setData(result) })
            .catch((failure) => { if (!controller.signal.aborted) setError(accountError(failure)) })
        return () => controller.abort()
    }, [tab, query])

    useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(null), 5000)
        return () => clearTimeout(timer)
    }, [toast])

    useEffect(() => {
        if (editing || showCreate) editorRef.current?.focus()
    }, [editing, showCreate])

    useEffect(() => {
        if (!action) return undefined
        previousFocus.current = document.activeElement
        const dialog = dialogRef.current
        dialog.showModal()
        return () => { dialog.close(); previousFocus.current?.focus() }
    }, [action])

    function refresh(changes = {}) {
        setData(null)
        setError('')
        setQuery((current) => ({ ...current, ...changes, revision: current.revision + 1 }))
    }

    function switchTab(next) {
        setTab(next)
        setSearch('')
        setEditing(null)
        setShowCreate(false)
        refresh({ search: '', role: '', status: '', page: 0 })
    }

    function confirm(next) {
        setReason('')
        setPassword('')
        setActionError('')
        setAction(next)
    }

    async function execute(event) {
        event.preventDefault()
        setBusy(true)
        setActionError('')
        try {
            if (action.kind === 'deactivate') {
                await deactivateCurrentAdmin(password)
                clearLocalAccount()
                navigate('/', { replace: true })
                return
            }
            if (action.kind === 'appeal') {
                await reviewAccountAppeal(action.appeal.id, { approve: action.approve, note: reason.trim() })
                setToast({ message: action.approve ? 'Appeal approved. Access restored.' : 'Appeal rejected.' })
            } else {
                await changeUserStatus(action.account.id, { status: action.status, reason: reason.trim() })
                setToast({ message: action.status === 'BLOCKED' ? 'User blocked.' : action.status === 'INACTIVE' ? 'User set to inactive.' : 'Access restored.' })
            }
            setAction(null)
            refresh()
        } catch (failure) {
            setActionError(accountError(failure))
        } finally {
            setBusy(false)
        }
    }

    async function addAdmin(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        try {
            await createAdminAccount(admin)
            setAdmin({ fullName: '', employeeId: '', password: '' })
            setShowCreate(false)
            setToast({ message: 'Admin account created.' })
            refresh({ page: 0 })
        } catch (failure) {
            setError(accountError(failure))
        } finally {
            setBusy(false)
        }
    }

    const actionTitle = action?.kind === 'deactivate' ? 'Deactivate your account?'
        : action?.kind === 'appeal' ? `${action.approve ? 'Approve' : 'Reject'} appeal?`
        : action?.status === 'BLOCKED' ? 'Block user?' : action?.status === 'INACTIVE' ? 'Set user inactive?' : 'Restore access?'

    return (
        <section className="user-management" aria-labelledby="um-title">
            <header className="um-heading"><div><p className="um-eyebrow">ACCOUNTS & ACCESS</p><h1 id="um-title">User Management</h1>
                <p className="um-muted">Manage approved users and account access.</p></div>
                {tab === 'admins' && <button type="button" onClick={() => setShowCreate(true)}>Add admin</button>}
            </header>
            <div className="um-tabs" role="group" aria-label="Account sections">
                {[['users', 'Users'], ['admins', 'Admins'], ['appeals', 'Appeals']].map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => switchTab(value)}>{label}</button>)}
            </div>
            {error && <p className="um-error" role="alert">{error} <button type="button" onClick={() => refresh()}>Retry</button></p>}
            {showCreate && tab === 'admins' && <section className="um-panel" ref={editorRef} tabIndex={-1} aria-label="Create admin account">
                <div className="um-heading"><h2>Add admin</h2><button type="button" disabled={busy} onClick={() => { setShowCreate(false); setAdmin({ fullName: '', employeeId: '', password: '' }) }}>Cancel</button></div>
                <form onSubmit={addAdmin}><fieldset disabled={busy}><div className="um-form-grid">
                    <label>Full name<input required maxLength={100} value={admin.fullName} onChange={(event) => setAdmin((current) => ({ ...current, fullName: event.target.value }))} /></label>
                    <label>Employee ID<input required maxLength={50} pattern={'[A-Za-z0-9_\\-]+'} value={admin.employeeId} onChange={(event) => setAdmin((current) => ({ ...current, employeeId: event.target.value }))} /></label>
                    <label>Initial password<input type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={admin.password} onChange={(event) => setAdmin((current) => ({ ...current, password: event.target.value }))} /><small>10–72 characters. Share privately.</small></label>
                </div><p className="um-muted">Role: MAO-Admin · Status: Active</p><button type="submit">{busy ? 'Creating...' : 'Create admin'}</button></fieldset></form>
            </section>}
            {editing && <div ref={editorRef} tabIndex={-1}><UserInfoEditor key={editing.id} account={editing} onClose={() => setEditing(null)}
                onSaved={() => { setEditing(null); setToast({ message: 'User information updated.' }); refresh() }} /></div>}
            <form className="um-filters" onSubmit={(event) => { event.preventDefault(); refresh({ search: search.trim(), page: 0 }) }}>
                {tab !== 'appeals' && <label>Search<input type="search" maxLength={200} placeholder="Name or login ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label>}
                {tab === 'users' && <label htmlFor="um-role">Role<select id="um-role" value={query.role} onChange={(event) => refresh({ role: event.target.value, page: 0 })}>
                    <option value="">All roles</option><option value="Farmer">Farmer</option><option value="Farm-Admin">Farm Admin</option></select></label>}
                <label htmlFor="um-status">Status<select id="um-status" value={query.status} onChange={(event) => refresh({ status: event.target.value, page: 0 })}>
                    {tab === 'appeals' ? <><option value="">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CLOSED">Closed</option></>
                        : <><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLOCKED">Blocked</option></>}
                </select></label>
                <button type="submit">{tab === 'appeals' ? 'Refresh' : 'Search'}</button>
            </form>
            {!data && !error && <p role="status">Loading accounts...</p>}
            {data && <>
                <p className="um-muted">{data.totalElements} {tab === 'appeals' ? 'appeals' : 'accounts'}</p>
                <div className="um-table-scroll"><table><caption className="um-sr-only">{tab === 'appeals' ? 'Account appeals' : 'Managed accounts'}</caption>
                    <thead><tr><th scope="col">User</th><th scope="col">{tab === 'appeals' ? 'Appeal' : 'Role'}</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
                    <tbody>{data.items.map((item) => {
                        const account = tab === 'appeals' ? item.account : item
                        return <tr key={item.id}>
                            <td><strong>{account.fullName}</strong><small>{account.userId}</small>
                                {(tab === 'appeals' ? item.blockReason : account.blockReason) && <details><summary>Block reason</summary><p className="um-preserve">{tab === 'appeals' ? item.blockReason : account.blockReason}</p></details>}</td>
                            <td>{tab === 'appeals' ? <><p className="um-preserve">{item.message}</p><small>{new Date(item.submittedAt).toLocaleString()}</small>
                                {item.reviewNote && <p className="um-preserve">Response: {item.reviewNote}</p>}</> : account.role}</td>
                            <td><span className={`um-badge um-badge-${(tab === 'appeals' ? item.status : account.status).toLowerCase()}`}>{tab === 'appeals' ? item.status : account.status}</span></td>
                            <td><div className="um-actions">
                                {tab === 'users' && <><button type="button" onClick={() => setEditing(account)}>Edit</button>
                                    {account.status !== 'BLOCKED' && <button type="button" onClick={() => confirm({ kind: 'status', account, status: 'BLOCKED' })}>Block</button>}
                                    {account.status !== 'INACTIVE' && <button type="button" onClick={() => confirm({ kind: 'status', account, status: 'INACTIVE' })}>Set inactive</button>}
                                    {account.status !== 'ACTIVE' && <button type="button" onClick={() => confirm({ kind: 'status', account, status: 'ACTIVE' })}>Restore access</button>}
                                </>}
                                {tab === 'admins' && (account.id === me?.id ? 'Current account' : '—')}
                                {tab === 'appeals' && item.status === 'PENDING' && <><button type="button" onClick={() => confirm({ kind: 'appeal', appeal: item, approve: true })}>Approve</button>
                                    <button type="button" onClick={() => confirm({ kind: 'appeal', appeal: item, approve: false })}>Reject</button></>}
                            </div></td>
                        </tr>
                    })}{data.items.length === 0 && <tr><td colSpan={4}>No {tab === 'appeals' ? 'appeals' : 'accounts'} found.</td></tr>}</tbody>
                </table></div>
                {data.totalPages > 1 && <nav className="um-actions um-pagination" aria-label="Account pages">
                    <button type="button" disabled={data.page === 0} onClick={() => refresh({ page: query.page - 1 })}>Previous</button>
                    <span>{data.page + 1} / {data.totalPages}</span>
                    <button type="button" disabled={data.page + 1 >= data.totalPages} onClick={() => refresh({ page: query.page + 1 })}>Next</button>
                </nav>}
            </>}
            {tab === 'admins' && <section className="um-danger-zone"><div><h2>Your account</h2><p>Deactivation signs you out. The last active admin is protected.</p></div>
                <button type="button" disabled={!me} onClick={() => confirm({ kind: 'deactivate' })}>Deactivate Account</button>
            </section>}
            {action && createPortal(<dialog ref={dialogRef} className="um-dialog" aria-labelledby="um-confirm-title"
                onCancel={(event) => { if (busy) event.preventDefault(); else setAction(null) }}>
                <form onSubmit={execute}><h2 id="um-confirm-title">{actionTitle}</h2>
                    <p>{action.kind === 'deactivate' ? 'Enter your current password to confirm. Your data will be kept.'
                        : action.kind === 'appeal' ? action.approve ? 'This restores the user’s access.' : 'The account will remain blocked.'
                            : `${action.account.fullName} (${action.account.userId})`}</p>
                    {action.kind === 'deactivate' ? <label>Current password<input type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
                        : (action.kind === 'appeal' || action.status === 'BLOCKED') && <label>{action.kind === 'appeal' ? 'Review note' : 'Block reason'}
                            <textarea required maxLength={1000} rows={4} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} /></label>}
                    {actionError && <p className="um-error" role="alert">{actionError}</p>}
                    <div className="um-actions"><button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Confirm'}</button>
                        <button type="button" disabled={busy} onClick={() => setAction(null)}>Cancel</button></div>
                </form>
            </dialog>, document.body)}
            {toast && createPortal(<div className="um-toast"><p role="status">{toast.message}</p>
                <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button></div>, document.body)}
        </section>
    )
}

export default AdminUserManagement
