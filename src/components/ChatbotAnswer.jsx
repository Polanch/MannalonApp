function ChatbotAnswer({ turn }) {
    const characters = Array.from(turn.answer)
    const parts = []
    let cursor = 0
    const citations = [...turn.sources].sort((a, b) => a.startIndex - b.startIndex)
    citations.forEach((source, index) => {
        if (source.startIndex < cursor || source.endIndex > characters.length) return
        parts.push(characters.slice(cursor, source.startIndex).join(''))
        parts.push(
            <a key={`${source.startIndex}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>
                {characters.slice(source.startIndex, source.endIndex).join('') || `[IRRI ${index + 1}]`}
            </a>,
        )
        cursor = source.endIndex
    })
    parts.push(characters.slice(cursor).join(''))

    return (
        <div className="chatbot-answer">
            <p>{parts}</p>
            {turn.groundingStatus === 'NO_IRRI_SOURCE' && <small>No verified IRRI source found. / Awan ti napasingked a pagtaudan.</small>}
            {turn.sources.length > 0 && (
                <ul aria-label="IRRI sources">
                    {[...new Map(turn.sources.map((source) => [source.url, source])).values()].map((source) => (
                        <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title || source.url}</a></li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default ChatbotAnswer
