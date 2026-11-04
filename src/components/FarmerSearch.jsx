import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLibraryBooks, libraryError } from '../services/libraryApi.js'
import { getApiErrorMessage, resolveMediaUrl } from '../services/farmerApi.js'
import { searchUsers } from '../services/socialApi.js'
import { scanPosts } from '../services/globalSearch.js'
import FarmerPost from './farmer_components/FarmerPost.jsx'
import SocialAvatar from './social/SocialAvatar.jsx'
import LibraryContentStatus from './LibraryContentStatus.jsx'
import IrriSearchResults from './IrriSearchResults.jsx'
import '../assets/styles/search.css'

function BookResults({ query }) {
    const [page, setPage] = useState(0)
    const [revision, setRevision] = useState(0)
    const [state, setState] = useState({ loading: true })
    useEffect(() => {
        const controller = new AbortController()
        fetchLibraryBooks({ search: query, page }, controller.signal).then((data) => {
            if (!Array.isArray(data?.items) || !Number.isInteger(data.totalPages)) throw new Error('Invalid book search response.')
            if (!controller.signal.aborted) setState({ data, loading: false })
        }).catch((error) => {
            if (!controller.signal.aborted) setState({ error: libraryError(error), loading: false })
        })
        return () => controller.abort()
    }, [query, page, revision])
    function changePage(next) { setState({ loading: true }); setPage(next) }
    return <section aria-labelledby="search-books">
        <h2 id="search-books">Books</h2>
        <p className="search-hint">Matches titles, descriptions, authors, and indexed PDF text. Scanned PDFs are not searchable without OCR.</p>
        {state.loading && <p role="status">Searching books...</p>}
        {state.error && <p role="alert">{state.error} <button type="button" onClick={() => { setState({ loading: true }); setRevision((value) => value + 1) }}>Retry books</button></p>}
        {state.data && <>
            <p>{state.data.totalElements} matching {state.data.totalElements === 1 ? 'book' : 'books'}</p>
            {!state.data.items.length && <p>No matching books.</p>}
            <div className="search-books">{state.data.items.map((book) => <article key={book.id}>
                <Link to={`/farmer/library?book=${book.id}`}>
                    {book.coverUrl && <img src={resolveMediaUrl(book.coverUrl)} alt="" loading="lazy" />}
                    <h3>{book.title}</h3>
                </Link>
                <p>By {book.author}</p><p className="search-description">{book.description}</p>
                <LibraryContentStatus book={book} showMatch />
                <Link to={`/farmer/library?book=${book.id}`}>Read book</Link>
            </article>)}</div>
            {state.data.totalPages > 1 && <div className="search-pagination" aria-label="Book result pages">
                <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>Previous books</button>
                <span>Page {page + 1} of {state.data.totalPages}</span>
                <button type="button" disabled={page + 1 >= state.data.totalPages} onClick={() => changePage(page + 1)}>Next books</button>
            </div>}
        </>}
    </section>
}

function PeopleResults({ query, session }) {
    const [state, setState] = useState({ loading: true })
    const [revision, setRevision] = useState(0)
    useEffect(() => {
        const controller = new AbortController()
        searchUsers({ userId: session.userId, query }, controller.signal).then((items) => {
            if (!Array.isArray(items)) throw new Error('Invalid people search response.')
            if (!controller.signal.aborted) setState({ items, loading: false })
        }).catch((error) => {
            if (!controller.signal.aborted) setState({ error: getApiErrorMessage(error, 'People search failed. Please retry.'), loading: false })
        })
        return () => controller.abort()
    }, [query, session.userId, revision])
    return <section aria-labelledby="search-people">
        <h2 id="search-people">People</h2>
        <p className="search-hint">Up to 20 matching active accounts, as returned by the people directory.</p>
        {state.loading && <p role="status">Searching people...</p>}
        {state.error && <p role="alert">{state.error} <button type="button" onClick={() => { setState({ loading: true }); setRevision((value) => value + 1) }}>Retry people</button></p>}
        {state.items && (!state.items.length ? <p>No matching people.</p> : <ul className="search-people">
            {state.items.map((user) => <li key={user.userId}><Link to={`/farmer/user/${encodeURIComponent(user.userId)}`}>
                <SocialAvatar user={user} size={44} />
                <span><strong>{user.fullName}</strong><small>{user.farmName || user.role}</small></span>
            </Link></li>)}
        </ul>)}
    </section>
}

function PostResults({ query, session }) {
    const [state, setState] = useState({ items: [], scanned: 0, loading: true })
    const [revision, setRevision] = useState(0)
    const [visible, setVisible] = useState(10)
    const controllerRef = useRef(null)
    useEffect(() => {
        const controller = new AbortController()
        controllerRef.current = controller
        scanPosts({ query, userId: session.userId, signal: controller.signal, onProgress: (progress) => {
            setState({ ...progress, loading: !progress.complete })
        } }).catch((error) => {
            if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, error: getApiErrorMessage(error, error.message || 'Post search failed.') }))
        })
        return () => controller.abort()
    }, [query, session.userId, revision])
    return <section aria-labelledby="search-posts">
        <h2 id="search-posts">Posts</h2>
        <p className="search-hint">Matching post text, newest first. Searches feed pages accessible to your account.</p>
        <p role="status">{state.items.length} matches found in {state.scanned} checked posts. {state.complete ? 'Search complete.' : 'Results are partial.'}</p>
        {state.loading && <p>Searching remaining posts... <button type="button" onClick={() => {
            controllerRef.current.abort()
            setState((current) => ({ ...current, loading: false, stopped: true }))
        }}>Stop post search</button></p>}
        {state.error && <p role="alert">{state.error}</p>}
        {(state.stopped || state.error) && <button type="button" onClick={() => {
            setState({ items: [], scanned: 0, loading: true })
            setVisible(10)
            setRevision((value) => value + 1)
        }}>Restart post search</button>}
        {state.complete && !state.items.length && <p>No matching posts.</p>}
        {state.items.slice(0, visible).map((post) => <FarmerPost key={post.id} post={post} session={session} />)}
        {visible < state.items.length && <button type="button" onClick={() => setVisible((value) => value + 10)}>Show more matching posts</button>}
    </section>
}

function FarmerSearch({ query, session }) {
    const text = query.trim()
    const valid = text.length >= 2 && text.length <= 200
    return <main className="farmer-search" aria-labelledby="search-title">
        <h1 id="search-title">{text ? `Search results for "${text}"` : 'Search MannalonApp'}</h1>
        {!valid ? <p>Enter between 2 and 200 characters in the header search bar to search books, people, posts, and IRRI resources.</p> : <>
            <BookResults key={`books:${text}`} query={text} />
            <PeopleResults key={`people:${text}`} query={text} session={session} />
            <PostResults key={`posts:${text}`} query={text} session={session} />
            <IrriSearchResults key={`irri:${text}`} query={text} />
        </>}
    </main>
}

export default FarmerSearch
