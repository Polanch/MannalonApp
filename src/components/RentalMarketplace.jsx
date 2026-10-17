import { useCallback, useEffect, useMemo, useState } from 'react'
import '../assets/styles/rentals.css'
import {
    RENTAL_CATEGORIES,
    approveRental,
    cancelRental,
    createRentalItem,
    fetchRentalWorkspace,
    markRentalReturned,
    rejectRental,
    rentalError,
    rentalImageUrl,
    requestRental,
} from '../services/rentalApi.js'

const EMPTY_FORM = {
    name: '',
    description: '',
    category: 'HAND_TOOLS',
    pricePerDay: '',
    pickupPlace: '',
}

const TABS = [
    ['browse', 'Browse'],
    ['listings', 'Listings'],
    ['borrowed', 'Rented'],
    ['lent', 'Granted'],
]

function formatCategory(category) {
    return category?.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

function formatMoney(value) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value))
}

function formatDateTime(value) {
    if (!value) return 'Not yet'
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function minimumReturnTime() {
    const date = new Date(Date.now() + 60 * 60 * 1000)
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
}

function statusLabel(status) {
    return {
        AVAILABLE: 'Available',
        RESERVED: 'Taken',
        RENTED: 'Currently rented',
        REQUESTED: 'Waiting for meetup',
        ACTIVE: 'Rental active',
        RETURNED: 'Returned',
        REJECTED: 'Not approved',
        CANCELLED: 'Cancelled',
    }[status] || status
}

function RentalMarketplace({ heading = 'Farm tool rental', adminMode = false }) {
    const [workspace, setWorkspace] = useState({ items: [], listings: [], borrowed: [], lent: [] })
    const [activeTab, setActiveTab] = useState('browse')
    const [category, setCategory] = useState('ALL')
    const [selected, setSelected] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [image, setImage] = useState(null)
    const [returnAt, setReturnAt] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    const loadWorkspace = useCallback(async () => {
        try {
            setIsLoading(true)
            setError('')
            setWorkspace(await fetchRentalWorkspace())
        } catch (requestError) {
            setError(rentalError(requestError, 'Unable to load rental tools.'))
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        const timer = window.setTimeout(loadWorkspace, 0)
        return () => window.clearTimeout(timer)
    }, [loadWorkspace])

    const reminders = useMemo(
        () => workspace.borrowed.filter((booking) => booking.overdue || booking.dueSoon),
        [workspace.borrowed],
    )

    const cards = useMemo(() => {
        const source = activeTab === 'browse'
            ? workspace.items
            : activeTab === 'listings'
                ? workspace.listings
                : workspace[activeTab]
        return source.filter((entry) => {
            const item = entry.item || entry
            return category === 'ALL' || item.category === category
        })
    }, [activeTab, category, workspace])

    function closeDetail() {
        setSelected(null)
        setReturnAt('')
        setError('')
    }

    async function perform(action, successMessage) {
        try {
            setIsSaving(true)
            setError('')
            await action()
            setNotice(successMessage)
            closeDetail()
            await loadWorkspace()
            return true
        } catch (requestError) {
            setError(rentalError(requestError, 'Unable to update this rental.'))
            return false
        } finally {
            setIsSaving(false)
        }
    }

    async function handleCreate(event) {
        event.preventDefault()
        if (!image) {
            setError('Select a picture of the tool.')
            return
        }
        const created = await perform(
            () => createRentalItem(form, image),
            adminMode ? 'MAO rental tool published.' : 'Your rental tool was published.',
        )
        if (created) {
            setShowCreate(false)
            setForm(EMPTY_FORM)
            setImage(null)
        }
    }

    async function handleRequest() {
        if (!returnAt) {
            setError('Select when you will return the tool.')
            return
        }
        const item = selected.item || selected
        const requested = await perform(
            () => requestRental(item.itemId, returnAt),
            'Rental request sent. Meet the owner and pay in cash before approval.',
        )
        if (requested) setActiveTab('borrowed')
    }

    const selectedItem = selected?.item || selected
    const selectedBooking = selected?.bookingId ? selected : null

    return (
        <main className={`rental-page${adminMode ? ' is-admin' : ''}`}>
            <header className="rental-page-header">
                <div>
                    <p className="rental-eyebrow">FARMTOOLS</p>
                    <h1>{heading}</h1>
                    <p>Share equipment locally, arrange pickup, and record cash rentals safely.</p>
                </div>
                <button className="rental-primary-button" type="button" onClick={() => { setError(''); setShowCreate(true) }}>
                    + List a tool
                </button>
            </header>

            {reminders.length > 0 && (
                <section className="rental-reminders" aria-label="Rental return reminders">
                    <strong>{reminders.some((item) => item.overdue) ? 'Return overdue' : 'Return reminder'}</strong>
                    <p>
                        {reminders.length === 1
                            ? `${reminders[0].item.name} ${reminders[0].overdue ? 'is overdue' : 'is due within 24 hours'}. Please return it to the owner.`
                            : `${reminders.length} rented tools are due soon or overdue. Open "Rented" for details.`}
                    </p>
                </section>
            )}

            {notice && <p className="rental-notice" role="status">{notice}</p>}
            {error && !selected && !showCreate && <p className="rental-error" role="alert">{error}</p>}

            <div className="rental-toolbar">
                <div className="rental-tabs" role="tablist" aria-label="Rental views">
                    {TABS.map(([value, label]) => (
                        <button
                            className={activeTab === value ? 'is-active' : ''}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === value}
                            key={value}
                            onClick={() => { setActiveTab(value); setNotice('') }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <label className="rental-category-filter">
                    <span>Category</span>
                    <select value={category} onChange={(event) => setCategory(event.target.value)}>
                        {RENTAL_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
            </div>

            {isLoading ? (
                <p className="rental-empty">Loading rental tools...</p>
            ) : cards.length === 0 ? (
                <section className="rental-empty">
                    <h2>No tools here yet</h2>
                    <p>Try another category or publish the first tool in this section.</p>
                </section>
            ) : (
                <section className="rental-grid" aria-label="Rental tools">
                    {cards.map((entry) => {
                        const item = entry.item || entry
                        const status = entry.status || item.status
                        return (
                            <button className="rental-card" type="button" key={entry.bookingId || item.itemId} onClick={() => { setError(''); setSelected(entry) }}>
                                <img src={rentalImageUrl(item.imageUrl)} alt={item.name} />
                                <span className={`rental-status is-${status.toLowerCase()}`}>{statusLabel(status)}</span>
                                <span className="rental-card-body">
                                    <span className="rental-card-category">{formatCategory(item.category)}</span>
                                    <strong>{item.name}</strong>
                                    <span>{formatMoney(item.pricePerDay)} / day</span>
                                    <small>{activeTab === 'lent' ? `Renter: ${entry.renterName}` : `Owner: ${item.ownerName}`}</small>
                                    {entry.requestedReturnAt && <small>Return by {formatDateTime(entry.requestedReturnAt)}</small>}
                                </span>
                            </button>
                        )
                    })}
                </section>
            )}

            {selectedItem && (
                <div className="rental-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDetail()}>
                    <section className="rental-detail-modal" role="dialog" aria-modal="true" aria-labelledby="rental-detail-title">
                        <button className="rental-modal-close" type="button" aria-label="Close rental details" onClick={closeDetail}>×</button>
                        <img className="rental-detail-image" src={rentalImageUrl(selectedItem.imageUrl)} alt={selectedItem.name} />
                        <div className="rental-detail-content">
                            <div className="rental-detail-heading">
                                <div>
                                    <p className="rental-eyebrow">{formatCategory(selectedItem.category)}</p>
                                    <h2 id="rental-detail-title">{selectedItem.name}</h2>
                                </div>
                                <span className={`rental-status is-${(selectedBooking?.status || selectedItem.status).toLowerCase()}`}>
                                    {statusLabel(selectedBooking?.status || selectedItem.status)}
                                </span>
                            </div>
                            <p>{selectedItem.description}</p>
                            <dl className="rental-detail-list">
                                <div><dt>Price</dt><dd>{formatMoney(selectedItem.pricePerDay)} per day</dd></div>
                                <div><dt>Owner</dt><dd>{selectedItem.ownerName}</dd></div>
                                <div><dt>Pickup</dt><dd>{selectedItem.pickupPlace}</dd></div>
                                {selectedBooking && <div><dt>Renter</dt><dd>{selectedBooking.renterName}</dd></div>}
                                {selectedBooking && <div><dt>Return deadline</dt><dd>{formatDateTime(selectedBooking.requestedReturnAt)}</dd></div>}
                                {selectedBooking?.approvedAt && <div><dt>Granted</dt><dd>{formatDateTime(selectedBooking.approvedAt)}</dd></div>}
                                {selectedBooking?.returnedAt && <div><dt>Returned</dt><dd>{formatDateTime(selectedBooking.returnedAt)}</dd></div>}
                            </dl>
                            {selectedBooking?.overdue && <p className="rental-overdue-message">This tool is overdue and should be returned immediately.</p>}
                            {error && <p className="rental-error" role="alert">{error}</p>}
                            {!selectedBooking && !selectedItem.ownedByCurrentUser && selectedItem.status === 'AVAILABLE' && (
                                <div className="rental-request-panel">
                                    <label>
                                        <span>When will you return it?</span>
                                        <input type="datetime-local" min={minimumReturnTime()} value={returnAt} onChange={(event) => setReturnAt(event.target.value)} />
                                    </label>
                                    <p>Meet the owner at the pickup place and pay in cash. The owner activates the rental after handoff.</p>
                                    <button className="rental-primary-button" type="button" disabled={isSaving} onClick={handleRequest}>
                                        {isSaving ? 'Sending...' : 'Request this tool'}
                                    </button>
                                </div>
                            )}
                            {selectedBooking?.canApprove && (
                                <div className="rental-detail-actions">
                                    <button className="rental-secondary-button is-danger" type="button" disabled={isSaving} onClick={() => perform(() => rejectRental(selectedBooking.bookingId), 'Rental request rejected.')}>Reject</button>
                                    <button className="rental-primary-button" type="button" disabled={isSaving} onClick={() => perform(() => approveRental(selectedBooking.bookingId), 'Cash handoff confirmed. The rental is now active.')}>Grant</button>
                                </div>
                            )}
                            {selectedBooking?.canCancel && (
                                <button className="rental-secondary-button is-danger" type="button" disabled={isSaving} onClick={() => perform(() => cancelRental(selectedBooking.bookingId), 'Request cancelled. The tool is available again.')}>
                                    Cancel request
                                </button>
                            )}
                            {selectedBooking?.canMarkReturned && (
                                <button className="rental-primary-button" type="button" disabled={isSaving} onClick={() => perform(() => markRentalReturned(selectedBooking.bookingId), 'Tool marked as returned and available again.')}>
                                    Confirm tool returned
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {showCreate && (
                <div className="rental-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowCreate(false)}>
                    <section className="rental-form-modal" role="dialog" aria-modal="true" aria-labelledby="rental-create-title">
                        <button className="rental-modal-close" type="button" aria-label="Close new listing form" onClick={() => setShowCreate(false)}>×</button>
                        <p className="rental-eyebrow">{adminMode ? 'MAO PROPERTY' : 'NEW LISTING'}</p>
                        <h2 id="rental-create-title">List a farm tool</h2>
                        <form onSubmit={handleCreate}>
                            <label><span>Tool name</span><input required maxLength="150" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                            <label><span>Category</span><select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{RENTAL_CATEGORIES.slice(1).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="rental-form-wide"><span>Description</span><textarea required maxLength="3000" rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                            <label><span>Price per day (₱)</span><input required type="number" min="0" max="99999999.99" step="0.01" value={form.pricePerDay} onChange={(event) => setForm({ ...form, pricePerDay: event.target.value })} /></label>
                            <label><span>Pickup place</span><input required maxLength="255" value={form.pickupPlace} onChange={(event) => setForm({ ...form, pickupPlace: event.target.value })} /></label>
                            <label className="rental-form-wide"><span>Tool picture</span><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} /><small>JPEG, PNG, or WebP. Maximum 5 MB.</small></label>
                            {error && <p className="rental-error rental-form-wide" role="alert">{error}</p>}
                            <div className="rental-form-actions rental-form-wide">
                                <button className="rental-secondary-button" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button className="rental-primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Publishing...' : 'Publish tool'}</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </main>
    )
}

export default RentalMarketplace
