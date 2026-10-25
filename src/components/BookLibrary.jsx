import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createLibraryGenre, fetchLibraryBook, fetchLibraryBooks, fetchLibraryGenres, libraryError, setLibraryBookSaved } from '../services/libraryApi.js'
import { resolveMediaUrl } from '../services/farmerApi.js'
import LibraryBookForm from './LibraryBookForm.jsx'
import '../assets/styles/library.css'

function BookLibrary({ adminMode = false }) {
    const [genres, setGenres] = useState([])
    const [genreError, setGenreError] = useState('')
    const [genreRevision, setGenreRevision] = useState(0)
    const [newGenre, setNewGenre] = useState('')
    const [genreBusy, setGenreBusy] = useState(false)
    const [query, setQuery] = useState({ search: '', genreId: '', savedOnly: false, page: 0, revision: 0 })
    const [searchInput, setSearchInput] = useState('')
    const [catalog, setCatalog] = useState(null)
    const [catalogError, setCatalogError] = useState('')
    const [selected, setSelected] = useState(null)
    const [selectedError, setSelectedError] = useState('')
    const [selectedLoading, setSelectedLoading] = useState(false)
    const [savingId, setSavingId] = useState(null)
    const [actionError, setActionError] = useState('')
    const [editor, setEditor] = useState(null)
    const [notice, setNotice] = useState(null)
    const detailController = useRef(null)
    const readerRef = useRef(null)
    const editorRef = useRef(null)

    useEffect(() => {
        let active = true
        fetchLibraryGenres().then((data) => { if (active) setGenres(data) })
            .catch((failure) => { if (active) setGenreError(libraryError(failure)) })
        return () => { active = false }
    }, [genreRevision])

    useEffect(() => {
        const controller = new AbortController()
        fetchLibraryBooks(query, controller.signal)
            .then((data) => { if (!controller.signal.aborted) setCatalog(data) })
            .catch((failure) => { if (!controller.signal.aborted) setCatalogError(libraryError(failure)) })
        return () => controller.abort()
    }, [query])

    useEffect(() => () => detailController.current?.abort(), [])

    useEffect(() => {
        if (!notice) return undefined
        const timer = setTimeout(() => setNotice(null), 5000)
        return () => clearTimeout(timer)
    }, [notice])

    useEffect(() => {
        if (selected || selectedLoading) readerRef.current?.focus()
    }, [selected, selectedLoading])

    useEffect(() => {
        if (editor) editorRef.current?.focus()
    }, [editor])

    function changeQuery(changes) {
        setCatalog(null)
        setCatalogError('')
        setQuery((current) => ({ ...current, ...changes, revision: current.revision + 1 }))
    }

    async function addGenre(event) {
        event.preventDefault()
        if (!newGenre.trim() || genreBusy) return
        setGenreError('')
        setGenreBusy(true)
        try {
            const genre = await createLibraryGenre(newGenre.trim())
            setGenres((current) => [...current, genre].sort((a, b) => a.name.localeCompare(b.name)))
            setNewGenre('')
            setNotice({ message: 'Genre added.' })
        } catch (failure) {
            setGenreError(libraryError(failure))
        } finally {
            setGenreBusy(false)
        }
    }

    async function openBook(book) {
        detailController.current?.abort()
        const controller = new AbortController()
        detailController.current = controller
        setSelected(null)
        setSelectedError('')
        setSelectedLoading(true)
        try {
            const detail = await fetchLibraryBook(book.id, controller.signal)
            if (!controller.signal.aborted) setSelected(detail)
        } catch (failure) {
            if (!controller.signal.aborted) setSelectedError(libraryError(failure))
        } finally {
            if (!controller.signal.aborted) setSelectedLoading(false)
        }
    }

    function closeBook() {
        detailController.current?.abort()
        setSelected(null)
        setSelectedLoading(false)
        setSelectedError('')
    }

    async function toggleSaved(book) {
        if (savingId !== null) return
        setSavingId(book.id)
        setActionError('')
        try {
            await setLibraryBookSaved(book.id, !book.saved)
            setSelected((current) => current?.id === book.id ? { ...current, saved: !book.saved } : current)
            setNotice({ message: book.saved ? 'Book removed from My Library.' : 'Book saved to My Library.' })
            changeQuery(query.savedOnly ? { page: 0 } : {})
        } catch (failure) {
            setActionError(libraryError(failure))
        } finally {
            setSavingId(null)
        }
    }

    function onPublished(book) {
        setEditor(null)
        setNotice({ message: editor?.book ? 'Book updated.' : 'Book published.' })
        setSelected((current) => current?.id === book.id ? book : current)
        changeQuery({})
    }

    return (
        <section className="book-library" aria-labelledby="library-title">
            <header className="library-header">
                <div><p className="library-eyebrow">BOOK ARCHIVE</p><h1 id="library-title">Library</h1>
                    <p className="library-subtitle">{adminMode ? 'Manage your book collection.' : 'Farming knowledge at your fingertips.'}</p></div>
                {adminMode && <button type="button" className="library-primary" onClick={() => setEditor({ book: null })}>
                    <span aria-hidden="true">+ </span>Upload book
                </button>}
            </header>
            {notice && createPortal(
                <div className="library-toast">
                    <span className="library-toast-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg>
                    </span>
                    <p role="status" aria-live="polite" aria-atomic="true">{notice.message}</p>
                    <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
                    </button>
                </div>,
                document.body,
            )}
            {adminMode && (
                <details className="library-genres">
                    <summary>Genres <span className="library-genre-count">{genres.length}</span></summary>
                    <form onSubmit={addGenre} className="library-genre-form">
                        <label htmlFor="library-new-genre" className="library-sr-only">New genre</label>
                        <input id="library-new-genre" placeholder="New genre" maxLength={80} value={newGenre} onChange={(event) => setNewGenre(event.target.value)} required />
                        <button type="submit" disabled={genreBusy || !newGenre.trim()}>{genreBusy ? 'Adding...' : 'Add genre'}</button>
                    </form>
                    <ul className="library-genre-list">{genres.map((genre) => <li key={genre.id}>{genre.name}</li>)}</ul>
                </details>
            )}
            {genreError && <div className="library-error" role="alert">{genreError} <button type="button" onClick={() => { setGenreError(''); setGenreRevision((value) => value + 1) }}>Reload genres</button></div>}
            {editor && adminMode && <div ref={editorRef} tabIndex={-1}>
                <LibraryBookForm key={editor.book?.id || 'new'} book={editor.book} genres={genres} onSaved={onPublished} onCancel={() => setEditor(null)} />
            </div>}
            {(selected || selectedLoading || selectedError) && (
                <section className="library-reader" ref={readerRef} tabIndex={-1} aria-label="Book reader">
                    <button type="button" onClick={closeBook}>Back to books</button>
                    {selectedLoading && <p role="status">Opening book...</p>}
                    {selectedError && <p role="alert" className="library-error">{selectedError}</p>}
                    {selected && <>
                        <div className="library-book-detail">
                            <img src={resolveMediaUrl(selected.coverUrl)} alt={`Cover of ${selected.title}`} />
                            <div><span className="library-genre">{selected.genre.name}</span><h2>{selected.title}</h2>
                                <p>By {selected.author}</p><p>Published {selected.publishDate}</p>
                                <p className="library-description">{selected.description}</p>
                                <div className="library-actions">
                                    <button type="button" disabled={savingId !== null} onClick={() => toggleSaved(selected)}>{selected.saved ? 'Unsave book' : 'Save book'}</button>
                                    {adminMode && <button type="button" onClick={() => setEditor({ book: selected })}>Edit details</button>}
                                </div>
                            </div>
                        </div>
                        <p className="library-reader-hint">Read below or <a href={resolveMediaUrl(selected.pdfUrl)} target="_blank" rel="noopener noreferrer">open PDF in a new tab</a>.</p>
                        <object key={selected.id} className="library-pdf" data={resolveMediaUrl(selected.pdfUrl)} type="application/pdf" aria-label={`Read ${selected.title}`}>
                            <p>This browser cannot display PDFs here. <a href={resolveMediaUrl(selected.pdfUrl)} target="_blank" rel="noopener noreferrer">Open the PDF</a>.</p>
                        </object>
                    </>}
                </section>
            )}
            {actionError && <p role="alert" className="library-error">{actionError}</p>}
            <div className="library-tabs" role="group" aria-label="Library collections">
                <button type="button" aria-pressed={!query.savedOnly} onClick={() => changeQuery({ savedOnly: false, page: 0 })}>All books</button>
                <button type="button" aria-pressed={query.savedOnly} onClick={() => changeQuery({ savedOnly: true, page: 0 })}>My Library</button>
            </div>
            <form className="library-filters" onSubmit={(event) => { event.preventDefault(); changeQuery({ search: searchInput.trim(), page: 0 }) }}>
                <label>Search books<input type="search" maxLength={200} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search title or author..." /></label>
                <div className="library-field"><label htmlFor="library-filter-genre">Genre</label>
                <select id="library-filter-genre" value={query.genreId} onChange={(event) => changeQuery({ genreId: event.target.value, page: 0 })}>
                    <option value="">All genres</option>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
                </select></div>
                <button type="submit">Search</button>
            </form>
            {catalogError && <div className="library-error" role="alert">{catalogError} <button type="button" onClick={() => changeQuery({})}>Retry</button></div>}
            {!catalog && !catalogError && <p role="status">Loading books...</p>}
            {catalog && <>
                <p className="library-result-count">{catalog.totalElements} {catalog.totalElements === 1 ? 'book' : 'books'}</p>
                {catalog.items.length === 0 && <div className="library-empty">
                    <span className="library-empty-icon" aria-hidden="true">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z" /></svg>
                    </span>
                    <h2>{query.search || query.genreId ? 'No matches found' : query.savedOnly ? 'Your shelf is empty' : 'No books yet'}</h2>
                    <p>{query.search || query.genreId ? 'Try another search or genre.' : query.savedOnly ? 'Save books to read them later.' : adminMode ? 'Upload your first book to get started.' : 'New books will appear here soon.'}</p>
                    {adminMode && !query.savedOnly && !query.search && !query.genreId && !editor && <button type="button" onClick={() => setEditor({ book: null })}>Upload book</button>}
                </div>}
                <div className="library-grid">
                    {catalog.items.map((book) => (
                        <article className="library-card" key={book.id}>
                            <button type="button" className="library-cover-button" onClick={() => openBook(book)} aria-label={`Read ${book.title}`}>
                                <img src={resolveMediaUrl(book.coverUrl)} alt={`Cover of ${book.title}`} loading="lazy" />
                            </button>
                            <span className="library-genre">{book.genre.name}</span>
                            <h2><button type="button" className="library-title-button" onClick={() => openBook(book)}>{book.title}</button></h2>
                            <p className="library-author">{book.author}</p>
                            <p className="library-preview">{book.description}</p>
                            <div className="library-actions">
                                <button type="button" onClick={() => openBook(book)}>Read</button>
                                <button type="button" disabled={savingId !== null} aria-label={`${book.saved ? 'Unsave' : 'Save'} ${book.title}`} onClick={() => toggleSaved(book)}>{book.saved ? 'Saved' : '+ Save'}</button>
                                {adminMode && <button type="button" onClick={() => setEditor({ book })}>Edit</button>}
                            </div>
                        </article>
                    ))}
                </div>
                {catalog.totalPages > 1 && <nav className="library-pagination" aria-label="Book pages">
                    <button type="button" disabled={catalog.page === 0} onClick={() => changeQuery({ page: query.page - 1 })}>Previous</button>
                    <span>Page {catalog.totalPages ? catalog.page + 1 : 0} of {catalog.totalPages}</span>
                    <button type="button" disabled={catalog.page + 1 >= catalog.totalPages} onClick={() => changeQuery({ page: query.page + 1 })}>Next</button>
                </nav>}
            </>}
        </section>
    )
}

export default BookLibrary
