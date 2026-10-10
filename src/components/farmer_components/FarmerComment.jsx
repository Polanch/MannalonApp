import { useState } from 'react'
import placeholderImage from '../../assets/images/placeholder.png'
import upIcon from '../../assets/images/m-icon8.png'
import downIcon from '../../assets/images/m-icon9.png'
import {
    createComment,
    formatRelativeTime,
    getApiErrorMessage,
    resolveMediaUrl,
    setCommentReaction,
} from '../../services/farmerApi.js'

function FarmerComment({ comment, postId, session, onReplyAdded, onThreadReply, isReply = false }) {
    const [reaction, setReaction] = useState({
        upvotes: comment.upvotes ?? 0,
        downvotes: comment.downvotes ?? 0,
        userReaction: comment.userReaction ?? null,
    })
    const [isReacting, setIsReacting] = useState(false)
    const [replies, setReplies] = useState(comment.replies ?? [])
    const [areRepliesOpen, setAreRepliesOpen] = useState(false)
    const [isReplying, setIsReplying] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [replyError, setReplyError] = useState('')

    const score = reaction.upvotes - reaction.downvotes
    const avatar = comment.authorProfilePictureUrl ? resolveMediaUrl(comment.authorProfilePictureUrl) : placeholderImage

    async function handleReaction(type) {
        if (isReacting) {
            return
        }

        const previous = reaction
        const next = previous.userReaction === type ? null : type
        const optimistic = {
            upvotes: previous.upvotes - (previous.userReaction === 'UPVOTE' ? 1 : 0) + (next === 'UPVOTE' ? 1 : 0),
            downvotes: previous.downvotes - (previous.userReaction === 'DOWNVOTE' ? 1 : 0) + (next === 'DOWNVOTE' ? 1 : 0),
            userReaction: next,
        }

        setReaction(optimistic)
        setIsReacting(true)
        try {
            const saved = await setCommentReaction({
                postId,
                commentId: comment.id,
                userId: session.userId,
                reaction: next ?? 'NONE',
            })
            setReaction({
                upvotes: saved.upvotes ?? optimistic.upvotes,
                downvotes: saved.downvotes ?? optimistic.downvotes,
                userReaction: saved.userReaction ?? null,
            })
        } catch {
            setReaction(previous)
        } finally {
            setIsReacting(false)
        }
    }

    async function submitReply(event) {
        event.preventDefault()
        const content = replyText.trim()
        if (!content || isSending) {
            return
        }

        setReplyError('')
        setIsSending(true)
        try {
            const saved = await createComment({
                postId,
                userId: session.userId,
                content,
                parentCommentId: isReply ? comment.parentCommentId : comment.id,
            })
            if (isReply) {
                onThreadReply?.(saved)
            } else {
                setReplies((current) => [...current, saved])
                setAreRepliesOpen(true)
            }
            setReplyText('')
            setIsReplying(false)
            onReplyAdded?.()
        } catch (error) {
            setReplyError(getApiErrorMessage(error, 'Unable to post your reply.'))
        } finally {
            setIsSending(false)
        }
    }

    return (
        <li className="post-comment-item">
            <div className="post-comment">
                <img src={avatar} alt="" />
                <div className="post-comment-main">
                    <div className="post-comment-body">
                        <p className="post-comment-meta">
                            <strong>{comment.authorName}</strong>
                            <span>{formatRelativeTime(comment.createdAt)}</span>
                        </p>
                        <p className="post-comment-text">{comment.content}</p>
                    </div>
                    <div className="post-comment-actions">
                        <div className="post-comment-votes">
                            <button
                                type="button"
                                aria-label="Upvote comment"
                                aria-pressed={reaction.userReaction === 'UPVOTE'}
                                className={reaction.userReaction === 'UPVOTE' ? 'is-active' : ''}
                                onClick={() => handleReaction('UPVOTE')}
                            >
                                <img src={upIcon} alt="" />
                            </button>
                            <span>{score}</span>
                            <button
                                type="button"
                                aria-label="Downvote comment"
                                aria-pressed={reaction.userReaction === 'DOWNVOTE'}
                                className={reaction.userReaction === 'DOWNVOTE' ? 'is-active' : ''}
                                onClick={() => handleReaction('DOWNVOTE')}
                            >
                                <img src={downIcon} alt="" />
                            </button>
                        </div>
                        <button type="button" className="post-comment-link" onClick={() => setIsReplying((open) => !open)}>
                            Reply
                        </button>
                        {!isReply && replies.length > 0 && (
                            <button
                                type="button"
                                className="post-comment-link"
                                onClick={() => setAreRepliesOpen((open) => !open)}
                            >
                                {areRepliesOpen
                                    ? 'Hide replies'
                                    : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                            </button>
                        )}
                    </div>
                    {isReplying && (
                        <form className="post-comment-form post-reply-form" onSubmit={submitReply}>
                            <input
                                type="text"
                                value={replyText}
                                maxLength={1000}
                                autoFocus
                                placeholder={`Reply to ${comment.authorName}...`}
                                onChange={(event) => setReplyText(event.target.value)}
                            />
                            <button type="submit" disabled={!replyText.trim() || isSending}>
                                {isSending ? 'Sending...' : 'Reply'}
                            </button>
                        </form>
                    )}
                    {replyError && <p className="post-comment-error" role="alert">{replyError}</p>}
                    {!isReply && areRepliesOpen && replies.length > 0 && (
                        <ul className="post-comment-list post-reply-list">
                            {replies.map((reply) => (
                                <FarmerComment
                                    key={reply.id}
                                    comment={reply}
                                    postId={postId}
                                    session={session}
                                    onReplyAdded={onReplyAdded}
                                    onThreadReply={(saved) => setReplies((current) => [...current, saved])}
                                    isReply
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </li>
    )
}

export default FarmerComment
