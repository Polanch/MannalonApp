function ChatbotAnswer({ turn }) {
    const parts = []
    let cursor = 0
    const sources = turn.sources.filter((source) => {
        try {
            const url = new URL(source.url)
            return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
                && (url.hostname === 'irri.org' || url.hostname.endsWith('.irri.org'))
        } catch {
            return false
        }
    })
    let invalidCitation = sources.length !== turn.sources.length
    const citations = [...sources].sort((a, b) => a.startIndex - b.startIndex)
    citations.forEach((source, index) => {
        if (source.startIndex === 0 && source.endIndex === 0) return
        if (!Number.isInteger(source.startIndex) || !Number.isInteger(source.endIndex)
            || source.startIndex < cursor || source.endIndex <= source.startIndex || source.endIndex > turn.answer.length) {
            invalidCitation = true
            return
        }
        // Java's citation offsets and JavaScript slice both count UTF-16 code units.
        parts.push(turn.answer.slice(cursor, source.startIndex))
        parts.push(
            <a key={`${source.startIndex}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>
                {turn.answer.slice(source.startIndex, source.endIndex)}
            </a>,
        )
        cursor = source.endIndex
    })
    parts.push(turn.answer.slice(cursor))

    return (
        <div className="chatbot-answer">
            <p>{parts}</p>
            {turn.groundingStatus === 'NO_IRRI_SOURCE' && <small>No verified IRRI source found.</small>}
            {invalidCitation && <small role="alert">Some source references could not be displayed correctly. Verify this answer against the IRRI pages.</small>}
            {sources.length > 0 && (
                <ul aria-label="IRRI sources">
                    {[...new Map(sources.map((source) => [source.url, source])).values()].map((source) => (
                        <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.url}</a></li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default ChatbotAnswer
