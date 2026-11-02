import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
    const [policyOpen, setPolicyOpen] = useState(false)
    const policyRef = useRef(null)
    const endRef = useRef(null)

    useEffect(() => {
        if (!policyOpen) return
        const dialog = policyRef.current
        dialog.showModal()
        return () => dialog.close()
    }, [policyOpen])

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
                    <p>Your rice-farming assistant, with Ilokano answers grounded in IRRI sources.</p>
                </div>
                <button type="button" disabled={loading || Boolean(pendingQuestion)} onClick={newConversation}>New chat</button>
            </header>
            <div className="chatbot-policy-bar">
                <button type="button" className="chatbot-policy-link" aria-haspopup="dialog" onClick={() => setPolicyOpen(true)}>AI usage &amp; privacy policy</button>
                <small>AI can make mistakes. Check important advice with your agricultural officer.</small>
            </div>
            {policyOpen && createPortal(
                <dialog ref={policyRef} className="chatbot-policy-dialog" aria-labelledby="chatbot-policy-title" onCancel={() => setPolicyOpen(false)}>
                    <header className="chatbot-policy-dialog-heading">
                        <div><small>MANNALON AI</small><h2 id="chatbot-policy-title">AI usage &amp; privacy policy</h2></div>
                        <button type="button" autoFocus onClick={() => setPolicyOpen(false)} aria-label="Close AI usage policy">Close</button>
                    </header>
                    <div className="chatbot-policy-dialog-content">
                        <h3>How answers are generated</h3>
                        <p>Answers use stored passages from approved IRRI pages, not a live web search.
                            Model processing uses the backend&apos;s configured local Ollama service.</p>
                        <p>Stored sources may not reflect the latest website updates. IRRI is an information source, not an endorsement of Mannalon.</p>
                        <h3>What is recorded</h3>
                        <p>Your questions and replies are saved with your account. Authorized administrators can review conversations,
                            categories, summaries and related metadata. Do not send passwords, contact details or sensitive personal information.</p>
                        <p>Questions and replies are recorded with your account for review and possible preparation of a future AI training dataset.
                            No model is trained automatically. Future training requires appropriate legal basis, additional notice or consent where required, and human review.</p>
                        <h3>Use AI responsibly</h3>
                        <p>AI advice can be wrong. Confirm important farming decisions with your local agricultural officer.
                            By sending a question, you acknowledge this notice. Using the chatbot is optional.</p>
                        <h3>Your choices</h3>
                        <p>Starting a new chat does not delete saved records. Records have no automatic expiry.
                            Contact your Mannalon administrator or municipal agriculture office to request access, correction or deletion, or raise a concern.</p>
                        <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">Read the full Privacy Policy</Link>
                    </div>
                </dialog>, document.body,
            )}
            <div className="chatbot-messages" role="log" aria-label="AI conversation" aria-live="polite" aria-busy={loading || Boolean(pendingQuestion)}>
                {loading && <p>Loading your latest conversation...</p>}
                {!loading && turns.length === 0 && !historyFailed && (
                    <div className="chatbot-welcome">
                        <h2>Naimbag nga aldaw!</h2>
                        <p>Ania ti kayatmo a saludsoden maipapan iti pagay?</p>
                        <button type="button" disabled={Boolean(pendingQuestion)} onClick={() => setQuestion('How should I water my rice crop?')}>
                            How should I water my rice crop?
                        </button>
                    </div>
                )}
                {turns.map((turn) => (
                    <article key={turn.id} className="chatbot-turn">
                        <div className="chatbot-question"><strong>You</strong><p>{turn.question}</p></div>
                        <div className="chatbot-reply"><strong>Mannalon AI</strong><ChatbotAnswer turn={turn} /></div>
                    </article>
                ))}
                {pendingQuestion && <div className="chatbot-turn"><div className="chatbot-question"><strong>You</strong><p>{pendingQuestion}</p></div><p className="chatbot-pending">Checking stored IRRI sources and preparing an answer...</p></div>}
                <div ref={endRef} />
            </div>
            {error && <p className="chatbot-error" role="alert">{error}</p>}
            {historyFailed && <p>History could not be loaded. Reload this page or choose &quot;New chat&quot; to start a new conversation.</p>}
            <form className="chatbot-composer" onSubmit={send}>
                <label htmlFor="chatbot-question">Your farming question</label>
                <textarea id="chatbot-question" maxLength={2000} rows={3} required value={question}
                    disabled={loading || Boolean(pendingQuestion) || historyFailed} onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask a question about rice farming..." />
                <div><small>{question.length}/2000</small><button type="submit" disabled={loading || Boolean(pendingQuestion) || historyFailed || !question.trim()}>Send</button></div>
                <small>Starting a new chat does not delete saved records.</small>
            </form>
        </section>
    )
}

export default FarmerChatbot
