import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { askChatbot, chatbotError, fetchChatbotHistory } from '../../services/chatbotApi.js'
import ChatbotAnswer from '../ChatbotAnswer.jsx'
import '../../assets/styles/chatbot.css'

function FarmerChatbot() {
    const [turns, setTurns] = useState([])
    const [question, setQuestion] = useState('')
    const [pendingQuestion, setPendingQuestion] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [historyFailed, setHistoryFailed] = useState(false)
    const endRef = useRef(null)

    useEffect(() => {
        let active = true
        fetchChatbotHistory()
            .then((data) => { if (active) setTurns(data) })
            .catch((failure) => {
                if (active) {
                    setError(chatbotError(failure))
                    setHistoryFailed(true)
                }
            })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [turns, pendingQuestion])

    async function send(event) {
        event.preventDefault()
        const text = question.trim()
        if (!text || pendingQuestion || loading) return
        setError('')
        setPendingQuestion(text)
        try {
            const turn = await askChatbot({ conversationId: turns.at(-1)?.conversationId || null, question: text })
            setTurns((current) => [...current, turn])
            setQuestion('')
        } catch (failure) {
            setError(chatbotError(failure))
        } finally {
            setPendingQuestion('')
        }
    }

    function newConversation() {
        setTurns([])
        setError('')
        setQuestion('')
        setHistoryFailed(false)
    }

    return (
        <section className="farmer-dashboard-middle-navigation chatbot-panel" aria-labelledby="chatbot-title">
            <header className="chatbot-heading">
                <div>
                    <h1 id="chatbot-title">Mannalon AI</h1>
                    <p>Katulongmo iti panagtalon. Ilokano a sungbat, manipud iti IRRI.</p>
                </div>
                <button type="button" disabled={loading || Boolean(pendingQuestion)} onClick={newConversation}>Baro a saritaan</button>
            </header>
            <aside className="chatbot-notice">
                <strong>AI ken privacy notice</strong>
                <p>Dagiti saludsod ken sungbat ket maipatulod iti OpenAI ken maidulin iti Mannalon.
                    Makita dagiti awtorisado nga admin ti saritaan, kategoria, ken pakabuklan.
                    Dika mangipatulod iti password wenno personal nga impormasion.</p>
                <p>Questions and replies are recorded with your account for review and possible preparation of a future AI training dataset.
                    No model is trained automatically. By sending a question, you acknowledge this notice.
                    Read the <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</p>
                <p>Mabalin nga agkamali ti AI. Pasingkedan ti sungbat iti lokal nga agricultural officer.
                    Pagtaudan: <a href="https://www.irri.org/" target="_blank" rel="noopener noreferrer">IRRI</a> laeng.</p>
            </aside>
            <div className="chatbot-messages" role="log" aria-label="Saritaan iti AI" aria-live="polite" aria-busy={loading || Boolean(pendingQuestion)}>
                {loading && <p>Agal-ala ti naudi a saritaan...</p>}
                {!loading && turns.length === 0 && !historyFailed && (
                    <div>
                        <h2>Naimbag nga aldaw!</h2>
                        <p>Ania ti kayatmo a saludsoden maipapan iti pagay?</p>
                        <button type="button" disabled={Boolean(pendingQuestion)} onClick={() => setQuestion('Kasano ti umiso a panangdanum iti pagay?')}>
                            Kasano ti umiso a panangdanum iti pagay?
                        </button>
                    </div>
                )}
                {turns.map((turn) => (
                    <article key={turn.id} className="chatbot-turn">
                        <div className="chatbot-question"><strong>Sika</strong><p>{turn.question}</p></div>
                        <div className="chatbot-reply"><strong>Mannalon AI</strong><ChatbotAnswer turn={turn} /></div>
                    </article>
                ))}
                {pendingQuestion && <div className="chatbot-turn"><div className="chatbot-question"><strong>Sika</strong><p>{pendingQuestion}</p></div><p>Agsapsapul iti IRRI ken agisagsagana ti sungbat...</p></div>}
                <div ref={endRef} />
            </div>
            {error && <p className="chatbot-error" role="alert">{error}</p>}
            {historyFailed && <p>History could not be loaded. Reload this page or choose &quot;Baro a saritaan&quot; to start a new conversation.</p>}
            <form className="chatbot-composer" onSubmit={send}>
                <label htmlFor="chatbot-question">Saludsodmo maipapan iti panagtalon</label>
                <textarea id="chatbot-question" maxLength={2000} rows={3} required value={question}
                    disabled={loading || Boolean(pendingQuestion) || historyFailed} onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Isuratmo ditoy ti saludsodmo..." />
                <div><small>{question.length}/2000</small><button type="submit" disabled={loading || Boolean(pendingQuestion) || historyFailed || !question.trim()}>Ipatulod</button></div>
                <small>Ti baro a saritaan ket saan a mangikkat kadagiti naidulin a rekord.</small>
            </form>
        </section>
    )
}

export default FarmerChatbot
