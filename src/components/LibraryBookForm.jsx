import { useState } from 'react'
import { libraryError, updateLibraryBook, uploadLibraryBook } from '../services/libraryApi.js'

function LibraryBookForm({ book, genres, onSaved, onCancel }) {
    const [details, setDetails] = useState(() => ({
        title: book?.title || '', author: book?.author || '', description: book?.description || '',
        publishDate: book?.publishDate || '', genreId: book?.genre.id || '',
    }))
    const [pdf, setPdf] = useState(null)
    const [cover, setCover] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    function change(event) {
        setDetails((current) => ({ ...current, [event.target.name]: event.target.value }))
    }

    async function submit(event) {
        event.preventDefault()
        setError('')
        if (!book && (!pdf || pdf.size > 50 * 1024 * 1024 || !cover || cover.size > 5 * 1024 * 1024)) {
            setError('Choose a PDF up to 50 MB and a JPEG/PNG cover up to 5 MB.')
            return
        }
        setBusy(true)
        try {
            const fields = { ...details, genreId: Number(details.genreId) }
            const saved = book ? await updateLibraryBook(book.id, fields) : await uploadLibraryBook({ details: fields, pdf, cover })
            onSaved(saved)
        } catch (failure) {
            setError(libraryError(failure))
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="library-editor" aria-labelledby="library-editor-title">
            <h2 id="library-editor-title">{book ? 'Edit book' : 'Upload book'}</h2>
            <form onSubmit={submit}>
                <fieldset disabled={busy}>
                    <div className="library-form-grid">
                        <label>Title<input name="title" value={details.title} onChange={change} required maxLength={200} /></label>
                        <label>Author<input name="author" value={details.author} onChange={change} required maxLength={200} /></label>
                        <label>Publish date<input type="date" name="publishDate" value={details.publishDate} onChange={change} required /></label>
                        <div className="library-field"><label htmlFor="library-book-genre">Genre</label>
                        <select id="library-book-genre" name="genreId" value={details.genreId} onChange={change} required>
                            <option value="">Select a genre</option>
                            {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
                        </select></div>
                        <label className="library-form-wide">Description<textarea name="description" rows={4} value={details.description} onChange={change} required maxLength={5000} /></label>
                        {!book && <>
                            <label>PDF <small>Up to 50 MB</small><input type="file" accept="application/pdf,.pdf" required onChange={(event) => setPdf(event.target.files[0] || null)} /></label>
                            <label>Cover <small>JPEG or PNG, up to 5 MB</small><input type="file" accept="image/jpeg,image/png" required onChange={(event) => setCover(event.target.files[0] || null)} /></label>
                        </>}
                    </div>
                    {!book && <p className="library-form-hint">Only publish content you have permission to share.</p>}
                    {error && <p role="alert" className="library-error">{error}</p>}
                    <div className="library-actions">
                        <button type="submit" className="library-primary">{busy ? 'Saving...' : book ? 'Save details' : 'Publish book'}</button>
                        <button type="button" onClick={onCancel}>Cancel</button>
                    </div>
                </fieldset>
            </form>
        </section>
    )
}

export default LibraryBookForm
