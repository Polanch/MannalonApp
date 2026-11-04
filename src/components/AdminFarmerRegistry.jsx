import { useEffect, useState } from 'react'
import { fetchRsbsaRegistry, importRsbsaRegistry } from '../services/rsbsaRegistryApi.js'
import '../assets/styles/rsbsa-registry.css'
import FarmCodeSender from './FarmCodeSender.jsx'

const PAGE_SIZE = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024
const COLUMNS = [
    ['farmerId', 'Farmer ID'],
    ['firstName', 'First name'],
    ['lastName', 'Last name'],
    ['mobileNumber', 'Mobile number'],
    ['barangay', 'Barangay'],
    ['municipality', 'Municipality'],
    ['farmArea', 'Farm area (ha)'],
    ['cropType', 'Crop type'],
    ['rsbsaNumber', 'RSBSA number'],
    ['registrationStatus', 'Registry status'],
]

function AdminFarmerRegistry({ adminMode = false, farmCodeMode = false }) {
    const [selectedFarmers, setSelectedFarmers] = useState({})
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const [requestState, setRequestState] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [fileInputKey, setFileInputKey] = useState(0)
    const [isImporting, setIsImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const [importError, setImportError] = useState('')
    const [revision, setRevision] = useState(0)
    const requestKey = JSON.stringify([search, page, revision])

    useEffect(() => {
        const controller = new AbortController()
        fetchRsbsaRegistry({ search, page, size: PAGE_SIZE }, controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) setRequestState({ key: requestKey, registry: data, error: '' })
            })
            .catch((failure) => {
                if (!controller.signal.aborted) {
                    setRequestState({ key: requestKey, registry: null, error: failure.message || 'Unable to load the RSBSA directory.' })
                }
            })
        return () => controller.abort()
    }, [search, page, revision, requestKey])

    function submitSearch(event) {
        event.preventDefault()
        setPage(0)
        setSearch(searchInput.trim())
        setRevision((current) => current + 1)
    }

    function chooseFile(file) {
        setImportError('')
        setImportResult(null)
        if (!file) {
            setSelectedFile(null)
            return
        }
        if (!/\.(xlsx|csv)$/i.test(file.name)) {
            setSelectedFile(null)
            setFileInputKey((current) => current + 1)
            setImportError('Choose an Excel workbook (.xlsx) or CSV file.')
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            setSelectedFile(null)
            setFileInputKey((current) => current + 1)
            setImportError('The selected file is larger than 10 MB.')
            return
        }
        setSelectedFile(file)
    }

    async function submitImport(event) {
        event.preventDefault()
        if (!selectedFile || isImporting) return

        setIsImporting(true)
        setImportError('')
        setImportResult(null)
        try {
            const result = await importRsbsaRegistry(selectedFile)
            setImportResult(result)
            setSelectedFile(null)
            setFileInputKey((current) => current + 1)
            setPage(0)
            setSearch('')
            setSearchInput('')
            setRevision((current) => current + 1)
        } catch (failure) {
            setImportError(failure.message || 'Unable to import the RSBSA file.')
        } finally {
            setIsImporting(false)
        }
    }

    const isLoading = requestState?.key !== requestKey
    const registry = isLoading ? null : requestState?.registry
    const error = isLoading ? '' : requestState?.error || ''
    const total = registry?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const columnCount = COLUMNS.length + (farmCodeMode ? 1 : 0)

    return (
        <section className="rsbsa-registry" aria-labelledby="rsbsa-title">
            <header className="rsbsa-heading">
                <div>
                    <p className="rsbsa-eyebrow">FARMER VALIDATION</p>
                    <h1 id="rsbsa-title">RSBSA Directory</h1>
                    <p>Look up farmers in the RSBSA records. Directory membership is separate from having a MannalonApp account.</p>
                </div>
                <div className="rsbsa-total" aria-live="polite">
                    <strong>{registry ? total.toLocaleString() : '—'}</strong>
                    <span>directory records</span>
                </div>
            </header>
            {farmCodeMode && <FarmCodeSender selected={Object.values(selectedFarmers)} onClear={() => setSelectedFarmers({})}
                onSimulated={(farmerIds) => setSelectedFarmers((current) => {
                    const next = { ...current }
                    farmerIds.forEach((id) => { delete next[`farmer:${id}`] })
                    return next
                })} />}

            {adminMode && (
                <section className="rsbsa-import-card" aria-labelledby="rsbsa-import-title">
                    <div>
                        <p className="rsbsa-eyebrow">ADMIN TOOL</p>
                        <h2 id="rsbsa-import-title">Bulk upload records</h2>
                        <p>Upload an Excel or CSV file with Farmer ID, name, mobile number, location, farm area, crop type, RSBSA number, and registration status columns.</p>
                    </div>
                    <form className="rsbsa-upload-form" onSubmit={submitImport}>
                        <label htmlFor="rsbsa-upload">Select a data file</label>
                        <input
                            key={fileInputKey}
                            id="rsbsa-upload"
                            type="file"
                            accept=".xlsx,.csv"
                            disabled={isImporting}
                            onChange={(event) => chooseFile(event.target.files?.[0])}
                        />
                        {selectedFile && <p className="rsbsa-file-name">{selectedFile.name}</p>}
                        <button className="rsbsa-primary-button" type="submit" disabled={!selectedFile || isImporting}>
                            {isImporting ? 'Uploading…' : 'Upload directory'}
                        </button>
                    </form>
                </section>
            )}

            {importError && <p className="rsbsa-message rsbsa-message-error" role="alert">{importError}</p>}
            {importResult && (
                <section className="rsbsa-message rsbsa-message-success" role="status">
                    <strong>{importResult.skippedCount > 0 ? 'Import completed with skipped rows.' : 'Import complete.'}</strong>
                    <span>{importResult.importedCount.toLocaleString()} added; {importResult.updatedCount.toLocaleString()} updated; {importResult.skippedCount.toLocaleString()} skipped.</span>
                    {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                        <details open>
                            <summary>Row errors ({importResult.errors.length})</summary>
                            <ul>
                                {importResult.errors.map((item, index) => (
                                    <li key={`${item.rowNumber ?? index}-${item.farmerId ?? ''}`}>
                                        {item.rowNumber ? `Row ${item.rowNumber}` : 'Row'}
                                        {item.farmerId ? ` (${item.farmerId})` : ''}: {item.message || 'Could not import this row.'}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </section>
            )}

            <form className="rsbsa-search" onSubmit={submitSearch}>
                <label htmlFor="rsbsa-search">Search directory</label>
                <input
                    id="rsbsa-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Farmer ID, name, mobile, barangay, or RSBSA number"
                />
                <button className="rsbsa-primary-button" type="submit">Search</button>
                {search && <button className="rsbsa-reset-button" type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(0) }}>Clear</button>}
            </form>

            {error && <p className="rsbsa-message rsbsa-message-error" role="alert">{error}</p>}
            <div className="rsbsa-table-card">
                <div className="rsbsa-table-heading">
                    <div>
                        <h2>Registered farmers</h2>
                        <p>{search ? `Results for “${search}”` : 'Search this directory to validate farmer registration.'}</p>
                    </div>
                    <button className="rsbsa-reset-button" type="button" onClick={() => { setPage(0); setRevision((current) => current + 1) }} disabled={isLoading}>
                        Refresh
                    </button>
                </div>
                <div className="rsbsa-table-scroll">
                    <table>
                        <thead>
                            <tr>{farmCodeMode && <th scope="col"><input type="checkbox" aria-label="Select all rows on this page"
                                disabled={isLoading || !registry?.items.length}
                                checked={Boolean(registry?.items.length) && registry.items.every((farmer) => selectedFarmers[`farmer:${farmer.farmerId}`])}
                                onChange={(event) => {
                                    const checked = event.target.checked
                                    setSelectedFarmers((current) => {
                                        const next = { ...current }
                                        registry.items.forEach((farmer) => { if (checked) next[`farmer:${farmer.farmerId}`] = farmer; else delete next[`farmer:${farmer.farmerId}`] })
                                        return next
                                    })
                                }} /></th>}{COLUMNS.map(([, label]) => <th scope="col" key={label}>{label}</th>)}</tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td className="rsbsa-table-state" colSpan={columnCount} role="status">Loading directory…</td></tr>
                            ) : registry?.items.length ? registry.items.map((farmer) => (
                                <tr key={farmer.farmerId}>
                                    {farmCodeMode && <td data-label="Select"><input type="checkbox" aria-label={`Select ${farmer.firstName} ${farmer.lastName} (${farmer.farmerId})`}
                                        checked={Boolean(selectedFarmers[`farmer:${farmer.farmerId}`])}
                                        onChange={(event) => {
                                            const checked = event.target.checked
                                            setSelectedFarmers((current) => {
                                                const next = { ...current }
                                                if (checked) next[`farmer:${farmer.farmerId}`] = farmer
                                                else delete next[`farmer:${farmer.farmerId}`]
                                                return next
                                            })
                                        }} /></td>}
                                    {COLUMNS.map(([field, label]) => (
                                        <td key={field} data-label={label}>
                                            {farmer[field] === null || farmer[field] === undefined || farmer[field] === ''
                                                ? '—'
                                                : field === 'farmArea'
                                                    ? Number(farmer[field]).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                    : farmer[field]}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr><td className="rsbsa-table-state" colSpan={columnCount}>
                                    {error ? 'Directory records could not be loaded.' : search ? 'No matching farmers found.' : 'No directory records are available yet.'}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {registry && <footer className="rsbsa-pagination">
                    <span>{total ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()}` : 'No records'}</span>
                    <div>
                        <button type="button" className="rsbsa-reset-button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || isLoading}>Previous</button>
                        <span>Page {page + 1} of {pageCount}</span>
                        <button type="button" className="rsbsa-reset-button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page + 1 >= pageCount || isLoading}>Next</button>
                    </div>
                </footer>}
            </div>
            {adminMode && (
                <p className="rsbsa-account-note">Farmer account approvals are handled by Farm Admin. Admins can block or deactivate accounts in <strong>User Management</strong>.</p>
            )}
            {!adminMode && (
                <p className="rsbsa-account-note">This directory is for checking RSBSA registration only; it does not show or create MannalonApp accounts.</p>
            )}
        </section>
    )
}

export default AdminFarmerRegistry
