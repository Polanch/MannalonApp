import { useEffect, useState } from 'react'
import { chatbotError, fetchChatbotRecords } from '../services/chatbotApi.js'
import ChatbotAnswer from './ChatbotAnswer.jsx'
import '../assets/styles/chatbot.css'

const categories = [
    ['PESTS', 'Pests'], ['DISEASES', 'Diseases'], ['WATER', 'Water'], ['SOIL', 'Soil'],
    ['PLANTING', 'Planting'], ['HARVESTING', 'Harvesting'], ['OTHER', 'Other'],
]

function RecordPreview({ text, label }) {
    return <details className="chatbot-record-preview">
        <summary aria-label={`Expand ${label}`}><span>{text}</span><small>Read more</small></summary>
        <p>{text}</p>
    </details>
}

function AdminChatbotRecords() {
    const [query, setQuery] = useState({ page: 0, category: '', revision: 0 })
    const [data, setData] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        fetchChatbotRecords(query)
            .then((result) => { if (active) setData(result) })
            .catch((failure) => { if (active) setError(chatbotError(failure)) })
        return () => { active = false }
    }, [query])

    function changeQuery(changes) {
        setData(null)
        setError('')
        setQuery((current) => ({ ...current, ...changes, revision: current.revision + 1 }))
    }

    return (
        <section className="chatbot-records" aria-labelledby="chatbot-records-title">
            <header className="chatbot-heading">
                <div><p className="chatbot-records-eyebrow">MANAGEMENT</p><h2 id="chatbot-records-title">AI Chat Records</h2><p>Farmer questions and AI replies.</p></div>
                <button type="button" onClick={() => changeQuery({})}>Refresh</button>
            </header>
            <div className="chatbot-records-toolbar">
                <label htmlFor="chatbot-category">Category
                    <select id="chatbot-category" value={query.category} onChange={(event) => changeQuery({ category: event.target.value, page: 0 })}>
                        <option value="">All categories</option>
                        {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                {data && <span className="chatbot-records-count">{data.totalElements} {data.totalElements === 1 ? 'record' : 'records'}</span>}
                <details className="chatbot-records-privacy">
                    <summary>Data privacy</summary>
                    <p>Restricted farmer data. AI labels and summaries are unreviewed.
                        Verify accuracy, remove personal data, and establish a legal basis before training or export.</p>
                </details>
            </div>
            {error && <p className="chatbot-error" role="alert">{error}</p>}
            {!data && !error && <p role="status">Loading chat records...</p>}
            {data && (
                <>
                    <div className="chatbot-table-scroll">
                        <table>
                            <caption className="chatbot-records-sr-only">Farmer chat records, newest first</caption>
                            <thead><tr><th scope="col">Farmer / date</th><th scope="col">Question</th><th scope="col">Category</th><th scope="col">Summary</th><th scope="col">Reply</th></tr></thead>
                            <tbody>
                                {data.items.map(({ turn, farmerGlobalId, model, inputTokens, outputTokens, policyVersion }) => (
                                    <tr key={turn.id}>
                                        <td><strong>Farmer #{farmerGlobalId}</strong><time dateTime={turn.createdAt}>{new Date(turn.createdAt).toLocaleDateString()}</time></td>
                                        <td><RecordPreview text={turn.question} label={`question ${turn.id}`} /></td>
                                        <td><span className="chatbot-records-category">{categories.find(([value]) => value === turn.category)?.[1] || turn.category}</span>
                                            <small className="chatbot-records-source">{turn.groundingStatus === 'NO_IRRI_SOURCE' ? 'No IRRI source' : 'IRRI sourced'}</small></td>
                                        <td><RecordPreview text={turn.answerSummary} label={`summary ${turn.id}`} /></td>
                                        <td><details className="chatbot-record-reply"><summary>View reply</summary><ChatbotAnswer turn={turn} />
                                            <details className="chatbot-record-metadata"><summary>Technical details</summary>
                                                <small>Turn #{turn.id}<br />Conversation: {turn.conversationId}<br />
                                                    {new Date(turn.createdAt).toLocaleString()}<br />
                                                    Model: {model}<br />Tokens: {inputTokens} in / {outputTokens} out<br />Notice: {policyVersion}</small>
                                            </details>
                                        </details></td>
                                    </tr>
                                ))}
                                {data.items.length === 0 && <tr><td colSpan={5} className="chatbot-records-empty">
                                    <span aria-hidden="true" className="chatbot-records-empty-icon">...</span>
                                    <strong>No records yet</strong><p>{query.category ? 'Try another category.' : 'Farmer chats will appear here.'}</p>
                                </td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {data.totalPages > 1 && <nav className="chatbot-pagination" aria-label="Chat records pages">
                        <button type="button" disabled={data.page === 0} onClick={() => changeQuery({ page: query.page - 1 })}>Previous</button>
                        <span>Page {data.totalPages === 0 ? 0 : data.page + 1} of {data.totalPages}</span>
                        <button type="button" disabled={data.page + 1 >= data.totalPages} onClick={() => changeQuery({ page: query.page + 1 })}>Next</button>
                    </nav>}
                </>
            )}
        </section>
    )
}

export default AdminChatbotRecords
