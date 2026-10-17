import { useEffect, useState } from 'react'
import FarmerComment from './FarmerComment.jsx'
import { applyToProgram, createComment, getRequirementId, fetchComments, fetchPrograms, getApiErrorMessage, resolveMediaUrl, setProgramVote } from '../../services/farmerApi.js'

function ProgramComments({ programId, session, onCountChange }) {
    const [comments, setComments] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [text, setText] = useState('')
    const [isSending, setIsSending] = useState(false)

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                const loaded = await fetchComments({ postId: programId, userId: session.userId, resource: 'programs' })
                if (isActive) setComments(Array.isArray(loaded) ? loaded : loaded.content ?? [])
            } catch (requestError) {
                if (isActive) setError(getApiErrorMessage(requestError, 'Unable to load comments.'))
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        load()
        return () => { isActive = false }
    }, [programId, session.userId])

    async function submit(event) {
        event.preventDefault()
        const content = text.trim()
        if (!content || isSending) return

        try {
            setIsSending(true)
            setError('')
            const saved = await createComment({ postId: programId, userId: session.userId, content, resource: 'programs' })
            setComments((current) => [...current, saved])
            onCountChange(1)
            setText('')
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to post your comment.'))
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="post-comments">
            <form className="post-comment-form" onSubmit={submit}>
                <input value={text} placeholder="Write a comment..." onChange={(event) => setText(event.target.value)} />
                <button type="submit" disabled={!text.trim() || isSending}>{isSending ? 'Sending...' : 'Comment'}</button>
            </form>
            {error && <p className="post-comment-error" role="alert">{error}</p>}
            {isLoading ? <p className="post-comment-status">Loading comments...</p> : !comments.length ? (
                <p className="post-comment-status">No comments yet. Be the first to comment.</p>
            ) : (
                <ul className="post-comment-list">
                    {comments.map((comment) => (
                        <FarmerComment key={comment.id} comment={comment} postId={programId} resource="programs" session={session} onReplyAdded={() => onCountChange(1)} />
                    ))}
                </ul>
            )}
        </div>
    )
}

function formatDeadline(value) {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function ApplicationStatus({ status }) {
    const labels = { PENDING: 'Application pending review', APPROVED: 'You are approved for this Program', REJECTED: 'Application rejected' }
    return <p className={`program-application-status program-application-${String(status).toLowerCase()}`}>{labels[status]}</p>
}

function FarmerPrograms({ session, readOnly = false }) {
    const [programs, setPrograms] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [applyingProgram, setApplyingProgram] = useState(null)
    const [files, setFiles] = useState({})
    const [applyError, setApplyError] = useState('')
    const [isApplying, setIsApplying] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [openCommentsId, setOpenCommentsId] = useState(null)

    useEffect(() => {
        let isActive = true

        async function load() {
            try {
                setIsLoading(true)
                setError('')
                const data = await fetchPrograms({ userId: session.userId })
                if (isActive) setPrograms(Array.isArray(data) ? data : [])
            } catch (requestError) {
                if (isActive) setError(getApiErrorMessage(requestError, 'Unable to load Programs.'))
            } finally {
                if (isActive) setIsLoading(false)
            }
        }

        load()
        return () => { isActive = false }
    }, [session.userId, refreshKey])

    function openApply(program) {
        setFiles({})
        setApplyError('')
        setApplyingProgram(program)
    }

    async function submitApplication(event) {
        event.preventDefault()
        const requirements = applyingProgram.requirements || []

        if (requirements.some((requirement) => getRequirementId(requirement) == null || !files[getRequirementId(requirement)])) {
            setApplyError('Please attach a file for every required document.')
            return
        }

        try {
            setIsApplying(true)
            setApplyError('')
            await applyToProgram({ programId: applyingProgram.id, userId: session.userId, requirements, files })
            setApplyingProgram(null)
            setNotice('Application submitted. Please wait for the Admin to review it.')
            setRefreshKey((current) => current + 1)
        } catch (requestError) {
            setApplyError(getApiErrorMessage(requestError, 'Unable to submit your application.'))
        } finally {
            setIsApplying(false)
        }
    }

    async function vote(program, direction) {
        const nextVote = program.myVote === direction ? 'NONE' : direction

        try {
            const result = await setProgramVote({ programId: program.id, userId: session.userId, vote: nextVote })
            setPrograms((current) => current.map((item) => (item.id === program.id
                ? { ...item, myVote: result?.myVote ?? nextVote, voteCount: result?.voteCount ?? item.voteCount }
                : item)))
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, 'Unable to save your vote.'))
        }
    }

    async function share(program) {
        const text = `${program.name} - apply on MannalonApp before ${formatDeadline(program.deadline)}`
        try {
            await navigator.clipboard.writeText(`${text}\n${window.location.origin}/farmer`)
            setNotice('Program details copied to your clipboard.')
        } catch {
            setNotice(text)
        }
    }

    return (
        <div className="farmer-dashboard-middle-navigation">
            <div className="program-feed-heading">
                <h2>Community Programs</h2>
                <p>Benefits and programs offered by Mannalon.</p>
                {readOnly && <p>MAO program announcements. Contact the MAO office about eligibility and enrollment; participation requires MAO approval.</p>}
            </div>
            {notice && <p className="program-notice" role="status">{notice}</p>}
            {error && <p className="program-error" role="alert">{error}</p>}
            {isLoading && <p className="program-feed-empty">Loading Programs...</p>}
            {!isLoading && !programs.length && !error && <p className="program-feed-empty">No Programs have been posted yet.</p>}

            {programs.map((program) => {
                const status = program.myApplicationStatus || 'NOT_APPLIED'
                const isOpen = program.status === 'OPEN'

                return (
                    <article key={program.id} className="program-post">
                        {program.coverUrl && <img className="program-post-cover" src={resolveMediaUrl(program.coverUrl)} alt={`${program.name} poster`} />}
                        <div className="program-post-body">
                            <div className="program-post-meta">
                                <span className={`program-badge program-badge-${String(program.status).toLowerCase()}`}>{program.status}</span>
                                <span>Deadline: {formatDeadline(program.deadline)}</span>
                            </div>
                            <h3>{program.name}</h3>
                            <p>{program.description}</p>
                            {!!(program.requirements || []).length && (
                                <p className="program-post-requirements">
                                    <strong>Required documents:</strong> {program.requirements.map((requirement) => requirement.name).join(', ')}
                                </p>
                            )}

                            {!readOnly && (status === 'NOT_APPLIED' ? (
                                <button type="button" className="program-signup" disabled={!isOpen} onClick={() => openApply(program)}>
                                    {isOpen ? 'SIGN UP' : 'APPLICATIONS CLOSED'}
                                </button>
                            ) : <ApplicationStatus status={status} />)}

                            {!readOnly && <div className="program-actions">
                                <button type="button" className={program.myVote === 'UP' ? 'active' : ''} onClick={() => vote(program, 'UP')} aria-label="Upvote">▲</button>
                                <span className="program-vote-count">{program.voteCount ?? 0}</span>
                                <button type="button" className={program.myVote === 'DOWN' ? 'active' : ''} onClick={() => vote(program, 'DOWN')} aria-label="Downvote">▼</button>
                                <button type="button" onClick={() => setOpenCommentsId(openCommentsId === program.id ? null : program.id)} aria-expanded={openCommentsId === program.id}>Comments ({program.commentCount ?? 0})</button>
                                <button type="button" onClick={() => share(program)}>Share</button>
                            </div>}
                            {!readOnly && openCommentsId === program.id && (
                                <ProgramComments
                                    programId={program.id}
                                    session={session}
                                    onCountChange={(delta) => setPrograms((current) => current.map((item) => (item.id === program.id ? { ...item, commentCount: (item.commentCount ?? 0) + delta } : item)))}
                                />
                            )}
                        </div>
                    </article>
                )
            })}

            {!readOnly && applyingProgram && (
                <div className="program-modal-backdrop" role="presentation">
                    <form className="program-modal" role="dialog" aria-modal="true" aria-labelledby="program-apply-title" onSubmit={submitApplication}>
                        <h3 id="program-apply-title">Sign up: {applyingProgram.name}</h3>
                        {!(applyingProgram.requirements || []).length && <p>No documents are required. Submit to apply.</p>}
                        {(applyingProgram.requirements || []).map((requirement) => (
                            <label key={getRequirementId(requirement) ?? requirement.name}>
                                <span>{requirement.name}</span>
                                <input type="file" accept="image/*,application/pdf" onChange={(event) => setFiles({ ...files, [getRequirementId(requirement)]: event.target.files?.[0] || null })} />
                            </label>
                        ))}
                        {applyError && <p className="program-error" role="alert">{applyError}</p>}
                        <div className="program-modal-actions">
                            <button type="button" onClick={() => setApplyingProgram(null)}>Cancel</button>
                            <button type="submit" className="program-signup" disabled={isApplying}>{isApplying ? 'Submitting...' : 'Submit application'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

export default FarmerPrograms
