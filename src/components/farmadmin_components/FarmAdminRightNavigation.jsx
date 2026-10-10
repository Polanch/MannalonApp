import { useEffect, useRef, useState } from 'react'
import { getApiErrorMessage, formatRelativeTime, resolveMediaUrl } from '../../services/farmerApi.js'
import { createAnnouncement } from '../../services/farmAdminApi.js'

function FarmAdminRightNavigation({ session, announcements, isLoading, listError, onAnnouncementCreated, onDeleteAnnouncement }) {
    const imageInputRef = useRef(null)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [image, setImage] = useState(null)
    const [isSending, setIsSending] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const canSend = title.trim() !== '' && content.trim() !== '' && !isSending

    useEffect(() => {
        return () => {
            if (image) {
                URL.revokeObjectURL(image.url)
            }
        }
    }, [image])

    useEffect(() => {
        if (!success) {
            return undefined
        }
        const timer = setTimeout(() => setSuccess(''), 3000)
        return () => clearTimeout(timer)
    }, [success])

    function handleImageSelect(event) {
        const file = event.target.files?.[0]
        if (file) {
            setImage({ file, url: URL.createObjectURL(file) })
        }
        event.target.value = ''
    }

    async function submit(event) {
        event.preventDefault()
        if (!canSend) {
            return
        }

        setError('')
        setIsSending(true)
        try {
            const saved = await createAnnouncement({
                userId: session.userId,
                title: title.trim(),
                content: content.trim(),
                image: image?.file ?? null,
            })
            onAnnouncementCreated(saved)
            setTitle('')
            setContent('')
            setImage(null)
            setSuccess('Announcement published.')
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to publish the announcement.'))
        } finally {
            setIsSending(false)
        }
    }

    return (
        <aside className="farmer-dashboard-right-navigation">
            <div className="farmer-right-content">
                <section className="farmer-sidebar-section farmer-right-first-section">
                    <h2>Make an Announcement</h2>
                    <form className="farm-admin-announce-form" onSubmit={submit}>
                        <input
                            type="text"
                            value={title}
                            maxLength={100}
                            placeholder="Title"
                            onChange={(event) => setTitle(event.target.value)}
                        />
                        <textarea
                            rows={5}
                            value={content}
                            maxLength={1000}
                            placeholder="What would you like to announce to your farmers?"
                            onChange={(event) => setContent(event.target.value)}
                        />
                        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
                        {image ? (
                            <div className="farm-admin-announce-preview">
                                <img src={image.url} alt="Announcement preview" />
                                <button type="button" onClick={() => setImage(null)}>Remove picture</button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="farm-admin-announce-attach"
                                onClick={() => imageInputRef.current?.click()}
                            >
                                + Add a picture
                            </button>
                        )}
                        {error && <p className="farm-admin-announce-error" role="alert">{error}</p>}
                        {success && <p className="farm-admin-announce-success" role="status">{success}</p>}
                        <button type="submit" className="farm-admin-announce-submit" disabled={!canSend}>
                            {isSending ? 'Publishing...' : 'Announce'}
                        </button>
                    </form>
                </section>

                <section className="farmer-sidebar-section">
                    <h2>My Announcements</h2>
                    {isLoading ? (
                        <p className="farm-admin-side-status">Loading...</p>
                    ) : listError ? (
                        <p className="farm-admin-side-status">{listError}</p>
                    ) : announcements.length === 0 ? (
                        <p className="farm-admin-side-status">You haven't announced anything yet.</p>
                    ) : (
                        <ul className="farm-admin-past-announcements">
                            {announcements.map((announcement) => (
                                <li key={announcement.id}>
                                    {announcement.imageUrl && (
                                        <img src={resolveMediaUrl(announcement.imageUrl)} alt="" />
                                    )}
                                    <div>
                                        <strong>{announcement.title}</strong>
                                        <p>{announcement.content}</p>
                                        <span>{formatRelativeTime(announcement.createdAt)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={`Delete announcement ${announcement.title}`}
                                        onClick={() => onDeleteAnnouncement(announcement)}
                                    >
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <footer className="farmer-sidebar-copyright">
                <p>Mannalon Rules</p>
                <p>Privacy Policy User Agreement</p>
                <p>Accessibility</p>
                <p>© MannalonApp 2026. All rights reserved.</p>
            </footer>
        </aside>
    )
}

export default FarmAdminRightNavigation
