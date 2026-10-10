import { useCallback, useEffect, useState } from 'react'

const API_URL = 'http://localhost:8080/api/farm-admin'
const EMPTY_FORM = { name: '', description: '' }

async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        credentials: 'include',
        ...options,
        headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    })

    if (!response.ok) {
        let message = 'Request failed.'
        try {
            const data = await response.json()
            message = data.message || message
        } catch {
            if (response.status === 404) {
                message = 'This API is not available yet. Ask the backend developer to implement the roles endpoints.'
            }
        }
        throw new Error(message)
    }

    return response.status === 204 ? null : response.json()
}

function getMemberName(member) {
    return member.fullName
        || [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ')
        || member.mobileNumber
}

function FarmAdminRoles() {
    const [roles, setRoles] = useState([])
    const [members, setMembers] = useState([])
    const [form, setForm] = useState(EMPTY_FORM)
    const [editingRoleId, setEditingRoleId] = useState(null)
    const [roleToDelete, setRoleToDelete] = useState(null)
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [assigningId, setAssigningId] = useState(null)
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')

    const [refreshKey, setRefreshKey] = useState(0)

    const loadData = useCallback(() => setRefreshKey((key) => key + 1), [])

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                const [roleData, memberData] = await Promise.all([request('/roles'), request('/farm-members')])
                if (isActive) {
                    setRoles(Array.isArray(roleData) ? roleData : [])
                    setMembers(Array.isArray(memberData) ? memberData : [])
                }
            } catch (requestError) {
                if (isActive) setError(requestError.message)
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        load()
        return () => { isActive = false }
    }, [refreshKey])

    useEffect(() => {
        if (!toast) {
            return undefined
        }
        const timer = setTimeout(() => setToast(''), 3000)
        return () => clearTimeout(timer)
    }, [toast])

    function resetForm() {
        setForm(EMPTY_FORM)
        setEditingRoleId(null)
    }

    function startEditing(role) {
        setEditingRoleId(role.id)
        setForm({ name: role.name, description: role.description || '' })
    }

    async function saveRole(event) {
        event.preventDefault()
        const payload = { name: form.name.trim(), description: form.description.trim() }
        if (!payload.name || isSaving) {
            return
        }

        setIsSaving(true)
        setError('')
        try {
            await request(editingRoleId ? `/roles/${editingRoleId}` : '/roles', {
                method: editingRoleId ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            })
            setToast(editingRoleId ? 'Role updated.' : 'Role created.')
            resetForm()
            loadData()
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteRole() {
        const role = roleToDelete
        setRoleToDelete(null)
        try {
            setError('')
            await request(`/roles/${role.id}`, { method: 'DELETE' })
            setToast('Role deleted.')
            if (editingRoleId === role.id) {
                resetForm()
            }
            loadData()
        } catch (requestError) {
            setError(requestError.message)
        }
    }

    async function assignRole(member, value) {
        const roleId = value === '' ? null : Number(value)
        setAssigningId(member.mobileNumber)
        setError('')
        try {
            await request(`/farm-members/${encodeURIComponent(member.mobileNumber)}/role`, {
                method: 'PUT',
                body: JSON.stringify({ roleId }),
            })
            const role = roles.find((item) => item.id === roleId)
            setMembers((current) => current.map((item) => (
                item.mobileNumber === member.mobileNumber
                    ? { ...item, roleId, roleName: role ? role.name : null }
                    : item
            )))
            setRoles((current) => current.map((item) => {
                let delta = 0
                if (item.id === member.roleId) delta -= 1
                if (item.id === roleId) delta += 1
                return delta ? { ...item, memberCount: (item.memberCount ?? 0) + delta } : item
            }))
            setToast(roleId ? `Assigned ${role.name} to ${getMemberName(member)}.` : `Removed role from ${getMemberName(member)}.`)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setAssigningId(null)
        }
    }

    const query = search.trim().toLowerCase()
    const visibleMembers = members.filter((member) => (
        !query
        || getMemberName(member).toLowerCase().includes(query)
        || (member.mobileNumber || '').includes(query)
        || (member.roleName || '').toLowerCase().includes(query)
    ))

    return (
        <main className="farm-admin-roles">
            <header className="farm-admin-roles-heading">
                <p className="farm-admin-eyebrow">FARM MANAGEMENT</p>
                <h1>Roles</h1>
                <p>Create roles for your farm and assign them to your farmers.</p>
            </header>

            {error && <p className="farm-admin-roles-error" role="alert">{error}</p>}
            {toast && <p className="farm-admin-roles-toast" role="status">{toast}</p>}

            <div className="farm-admin-roles-grid">
                <section className="farm-admin-roles-panel">
                    <h2>{editingRoleId ? 'Edit role' : 'Create role'}</h2>
                    <form onSubmit={saveRole}>
                        <label>
                            Role name
                            <input
                                type="text"
                                value={form.name}
                                maxLength={50}
                                placeholder="e.g. Field Supervisor"
                                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            />
                        </label>
                        <label>
                            Description
                            <textarea
                                rows={3}
                                value={form.description}
                                maxLength={255}
                                placeholder="What is this role responsible for?"
                                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            />
                        </label>
                        <div className="farm-admin-roles-actions">
                            {editingRoleId && (
                                <button className="farm-admin-secondary-button" type="button" onClick={resetForm}>Cancel</button>
                            )}
                            <button className="farm-admin-primary-button" type="submit" disabled={!form.name.trim() || isSaving}>
                                {isSaving ? 'Saving...' : editingRoleId ? 'Save changes' : 'Create role'}
                            </button>
                        </div>
                    </form>

                    <h2>Existing roles</h2>
                    {isLoading ? (
                        <p className="farm-admin-roles-status">Loading roles...</p>
                    ) : roles.length === 0 ? (
                        <p className="farm-admin-roles-status">No roles yet. Create your first role above.</p>
                    ) : (
                        <ul className="farm-admin-roles-list">
                            {roles.map((role) => (
                                <li key={role.id}>
                                    <div>
                                        <strong>{role.name}</strong>
                                        <span>{role.memberCount ?? 0} {role.memberCount === 1 ? 'member' : 'members'}</span>
                                        {role.description && <p>{role.description}</p>}
                                    </div>
                                    <div className="farm-admin-roles-row-actions">
                                        <button type="button" onClick={() => startEditing(role)}>Edit</button>
                                        <button type="button" onClick={() => setRoleToDelete(role)}>Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="farm-admin-roles-panel">
                    <h2>Assign roles</h2>
                    <input
                        className="farm-admin-roles-search"
                        type="search"
                        value={search}
                        placeholder="Search farmers..."
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    {isLoading ? (
                        <p className="farm-admin-roles-status">Loading farmers...</p>
                    ) : visibleMembers.length === 0 ? (
                        <p className="farm-admin-roles-status">No farmers found.</p>
                    ) : (
                        <table className="farm-admin-roles-table">
                            <thead>
                                <tr>
                                    <th>Farmer</th>
                                    <th>Mobile</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleMembers.map((member) => (
                                    <tr key={member.mobileNumber}>
                                        <td>{getMemberName(member)}</td>
                                        <td>{member.mobileNumber}</td>
                                        <td>
                                            <select
                                                value={member.roleId ?? ''}
                                                disabled={assigningId === member.mobileNumber}
                                                onChange={(event) => assignRole(member, event.target.value)}
                                            >
                                                <option value="">No role</option>
                                                {roles.map((role) => (
                                                    <option key={role.id} value={role.id}>{role.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>

            {roleToDelete && (
                <div className="farm-admin-confirm-backdrop" role="presentation">
                    <section className="farm-admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="farm-admin-role-delete-title">
                        <p className="farm-admin-eyebrow">DELETE ROLE</p>
                        <h2 id="farm-admin-role-delete-title">Delete "{roleToDelete.name}"?</h2>
                        <p>
                            {roleToDelete.memberCount
                                ? `${roleToDelete.memberCount} farmer(s) will lose this role.`
                                : 'No farmers currently have this role.'}
                        </p>
                        <div className="farm-admin-confirm-actions">
                            <button className="farm-admin-secondary-button" type="button" onClick={() => setRoleToDelete(null)}>Cancel</button>
                            <button className="farm-admin-primary-button" type="button" onClick={deleteRole}>Delete</button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    )
}

export default FarmAdminRoles
