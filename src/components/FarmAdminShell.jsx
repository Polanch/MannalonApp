import { useEffect, useState } from 'react'
import '../assets/styles/farmer.css'
import FarmAdminLeftNavigation from './farmadmin_components/FarmAdminLeftNavigation.jsx'
import FarmAdminRightNavigation from './farmadmin_components/FarmAdminRightNavigation.jsx'
import { getApiErrorMessage } from '../services/farmerApi.js'
import { deleteAnnouncement, fetchAnnouncements, getFarmAdminSession } from '../services/farmAdminApi.js'

function FarmAdminShell({ onNavigate, isFeed = false, children }) {
    const [session] = useState(getFarmAdminSession)
    const [announcements, setAnnouncements] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                const data = await fetchAnnouncements({ userId: session.userId })
                if (isActive) setAnnouncements(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setError(getApiErrorMessage(requestError, 'Unable to load announcements.'))
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        load()
        return () => { isActive = false }
    }, [session.userId])

    async function handleDelete(announcement) {
        if (!window.confirm(`Delete the announcement "${announcement.title}"?`)) {
            return
        }

        try {
            await deleteAnnouncement({ id: announcement.id, userId: session.userId })
            setAnnouncements((current) => current.filter((item) => item.id !== announcement.id))
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to delete the announcement.'))
        }
    }

    return (
        <div className="farm-admin-home">
            <div className="farmer-dashboard farm-admin-shell">
                <FarmAdminLeftNavigation onNavigate={onNavigate} />
                <div className={`farm-admin-shell-main${isFeed ? ' is-feed' : ''}`}>
                    {children}
                </div>
                <FarmAdminRightNavigation
                    session={session}
                    announcements={announcements}
                    isLoading={isLoading}
                    listError={error}
                    onDeleteAnnouncement={handleDelete}
                    onAnnouncementCreated={(saved) => setAnnouncements((current) => [saved, ...current])}
                />
            </div>
        </div>
    )
}

export default FarmAdminShell
