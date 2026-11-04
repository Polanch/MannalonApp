import '../assets/styles/library-content.css'

const STATUS_TEXT = {
    PENDING: 'PDF text indexing queued.',
    PROCESSING: 'PDF text indexing in progress.',
    INDEXED: 'PDF text is searchable.',
    NO_TEXT: 'No extractable PDF text. Scanned documents need OCR, which is not supported yet.',
    FAILED: 'PDF text indexing failed. Book details remain searchable and the PDF can still be read.',
}

function LibraryContentStatus({ book, showMatch = false, onRetry, busy = false }) {
    const status = book.contentIndexStatus
    const text = status == null ? 'PDF text indexing status is unavailable.' : STATUS_TEXT[status] || 'Unrecognized PDF text indexing status.'
    return <div className="library-content-status">
        {showMatch && book.matchesDocumentContent === true && <div className="library-content-match">
            <strong>Match inside PDF</strong>
            {typeof book.contentMatchSnippet === 'string' && book.contentMatchSnippet.trim() && <p>{book.contentMatchSnippet}</p>}
        </div>}
        <p>{text}</p>
        {status === 'INDEXED' && book.contentIndexedAt && <p>Indexed: <time dateTime={book.contentIndexedAt}>{book.contentIndexedAt.replace('T', ' ')}</time></p>}
        {onRetry && ['INDEXED', 'NO_TEXT', 'FAILED'].includes(status) && <button type="button" disabled={busy} onClick={() => onRetry(book)}>
            {busy ? 'Queueing...' : 'Retry PDF indexing'}
        </button>}
    </div>
}

export default LibraryContentStatus
