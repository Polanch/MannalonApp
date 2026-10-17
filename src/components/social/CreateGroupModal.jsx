import { useEffect, useMemo, useState } from 'react'
import SocialAvatar from './SocialAvatar.jsx'
import { getApiErrorMessage } from '../../services/farmerApi.js'
import { asList, createGroupConversation, fetchGroupCandidates } from '../../services/socialApi.js'

function CreateGroupModal({ session, onClose, onCreated }) {
    const [candidates, setCandidates] = useState([])
    const [selected, setSelected] = useState([])
    const [title, setTitle] = useState('')
    const [query, setQuery] = useState('')
    const [photo, setPhoto] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        let isActive = true
        fetchGroupCandidates({ userId: session.userId })
            .then((data) => {
                if (isActive) setCandidates(asList(data))
            })
            .catch((requestError) => {
                if (isActive) setError(getApiErrorMessage(requestError, 'Unable to load people you can add.'))
            })
            .finally(() => {
                if (isActive) setIsLoading(false)
            })
        return () => {
            isActive = false
        }
    }, [session.userId])

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (!needle) return candidates
        return candidates.filter((candidate) => String(candidate.fullName || '').toLowerCase().includes(needle))
    }, [candidates, query])

    function toggle(userId) {
        setSelected((current) => (current.includes(userId)
            ? current.filter((id) => id !== userId)
            : [...current, userId]))
    }

    async function submit(event) {
        event.preventDefault()
        if (isSaving) return
        if (!title.trim()) {
            setError('Give your group a name.')
            return
        }
        if (!selected.length) {
            setError('Pick at least one member.')
            return
        }
        setIsSaving(true)
        setError('')
        try {
            const conversation = await createGroupConversation({
                userId: session.userId,
                title: title.trim(),
                memberUserIds: selected,
                photo,
            })
            onCreated(conversation)
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to create this group chat.'))
            setIsSaving(false)
        }
    }

    return (
        <div className="social-modal-backdrop" role="presentation" onClick={onClose}>
            <section className="social-modal social-group-modal" role="dialog" aria-modal="true" aria-labelledby="create-group-title" onClick={(event) => event.stopPropagation()}>
                <header>
                    <h3 id="create-group-title">New group chat</h3>
                    <button type="button" className="social-modal-close" onClick={onClose} aria-label="Close">×</button>
                </header>
                <form className="social-group-form" onSubmit={submit}>
                    <label className="social-group-field">
                        <span>Group name</span>
                        <input type="text" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="Harvest planning" />
                    </label>
                    <label className="social-group-field">
                        <span>Group photo (optional)</span>
                        <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
                    </label>
                    <label className="social-group-field">
                        <span>Add members</span>
                        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search friends and farm members" />
                    </label>
                    <p className="social-group-count">{selected.length} selected</p>
                    <ul className="social-group-candidates">
                        {isLoading && <li className="social-group-status">Loading people...</li>}
                        {!isLoading && !visible.length && <li className="social-group-status">No one to add yet.</li>}
                        {visible.map((candidate) => (
                            <li key={candidate.userId}>
                                <label className="social-group-candidate">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(candidate.userId)}
                                        onChange={() => toggle(candidate.userId)}
                                    />
                                    <SocialAvatar user={candidate} size={30} />
                                    <span className="social-group-candidate-text">
                                        <strong>{candidate.fullName}</strong>
                                        <small>{candidate.role === 'Farm-Admin' ? 'Farm Administrator' : candidate.role}</small>
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                    {error && <p className="social-group-error" role="alert">{error}</p>}
                    <div className="social-group-actions">
                        <button type="button" className="social-group-cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="social-group-submit" disabled={isSaving}>
                            {isSaving ? 'Creating...' : 'Create group'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    )
}

export default CreateGroupModal
