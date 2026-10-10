import { useState } from 'react';
import placeholderImage from '../../assets/images/placeholder.png';
import upIcon from '../../assets/images/m-icon8.png';
import downIcon from '../../assets/images/m-icon9.png';
import FarmerComment from './FarmerComment.jsx';
import {
    createComment,
    fetchComments,
    formatRelativeTime,
    getApiErrorMessage,
    resolveMediaUrl,
    setPostReaction,
} from '../../services/farmerApi.js';

function FarmerPost({ post, session }) {
    const [reaction, setReaction] = useState({
        upvotes: post.upvotes ?? 0,
        downvotes: post.downvotes ?? 0,
        myReaction: post.myReaction ?? null,
    });
    const [isReacting, setIsReacting] = useState(false);
    const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
    const [comments, setComments] = useState([]);
    const [areCommentsOpen, setAreCommentsOpen] = useState(false);
    const [areCommentsLoading, setAreCommentsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSendingComment, setIsSendingComment] = useState(false);
    const [commentError, setCommentError] = useState('');

    const mediaUrl = resolveMediaUrl(post.mediaUrl);
    const isVideo = post.mediaType?.toUpperCase() === 'VIDEO';
    const score = reaction.upvotes - reaction.downvotes;

    async function handleReaction(type) {
        if (isReacting) {
            return;
        }

        const previous = reaction;
        const next = previous.myReaction === type ? null : type;
        const optimistic = {
            upvotes: previous.upvotes - (previous.myReaction === 'UP' ? 1 : 0) + (next === 'UP' ? 1 : 0),
            downvotes: previous.downvotes - (previous.myReaction === 'DOWN' ? 1 : 0) + (next === 'DOWN' ? 1 : 0),
            myReaction: next,
        };

        setReaction(optimistic);
        setIsReacting(true);

        try {
            const saved = await setPostReaction({ postId: post.id, userId: session.userId, reaction: next });
            setReaction({
                upvotes: saved.upvotes ?? optimistic.upvotes,
                downvotes: saved.downvotes ?? optimistic.downvotes,
                myReaction: saved.myReaction ?? null,
            });
        } catch {
            setReaction(previous);
        } finally {
            setIsReacting(false);
        }
    }

    async function toggleComments() {
        const willOpen = !areCommentsOpen;
        setAreCommentsOpen(willOpen);

        if (!willOpen || areCommentsLoading) {
            return;
        }

        setCommentError('');
        setAreCommentsLoading(true);
        try {
            const loaded = await fetchComments({ postId: post.id, userId: session.userId });
            setComments(Array.isArray(loaded) ? loaded : loaded.content ?? []);
        } catch (error) {
            setCommentError(getApiErrorMessage(error, 'Unable to load comments.'));
        } finally {
            setAreCommentsLoading(false);
        }
    }

    async function submitComment(event) {
        event.preventDefault();
        const content = commentText.trim();
        if (!content || isSendingComment) {
            return;
        }

        setCommentError('');
        setIsSendingComment(true);
        try {
            const saved = await createComment({ postId: post.id, userId: session.userId, content });
            setComments((current) => [...current, saved]);
            setCommentCount((count) => count + 1);
            setCommentText('');
        } catch (error) {
            setCommentError(getApiErrorMessage(error, 'Unable to post your comment.'));
        } finally {
            setIsSendingComment(false);
        }
    }

    return (
        <div className="farmer-post-box">
            <div className="post-header">
                <div className="farmer-pfp">
                    <img src={post.authorProfilePictureUrl ? resolveMediaUrl(post.authorProfilePictureUrl) : placeholderImage} alt="Farmer Profile" />
                </div>
                <div className="farmer-username">
                    <p>{post.authorName}</p>
                    {post.authorFarmName && <p className="post-author-farm">{post.authorFarmName}</p>}
                </div>
                <div className="post-date">
                    <p>{formatRelativeTime(post.createdAt)}</p>
                </div>
            </div>
            <div className="post-description">
                <div className="post-message">
                    <p>{post.content}</p>
                </div>
            </div>
            {mediaUrl && (
                <div className="post-content">
                    {isVideo ? (
                        <video className="post-content-media" src={mediaUrl} controls playsInline />
                    ) : (
                        <img className="post-content-media" src={mediaUrl} alt="Post attachment" />
                    )}
                </div>
            )}
            <div className="post-reaction">
                <div className="post-reaction-primary">
                    <div className="post-reaction-emojis">
                        <button
                            type="button"
                            aria-label="Upvote"
                            aria-pressed={reaction.myReaction === 'UP'}
                            className={reaction.myReaction === 'UP' ? 'is-active' : ''}
                            onClick={() => handleReaction('UP')}
                        >
                            <img className="post-reaction-up" src={upIcon} alt="" />
                        </button>
                        <span className="vote-count">{score}</span>
                        <button
                            type="button"
                            aria-label="Downvote"
                            aria-pressed={reaction.myReaction === 'DOWN'}
                            className={reaction.myReaction === 'DOWN' ? 'is-active' : ''}
                            onClick={() => handleReaction('DOWN')}
                        >
                            <img className="post-reaction-down" src={downIcon} alt="" />
                        </button>
                    </div>
                    <button
                        className="post-social-action"
                        type="button"
                        aria-label={`Comment, ${commentCount} comments`}
                        aria-expanded={areCommentsOpen}
                        onClick={toggleComments}
                    >
                        <img src={placeholderImage} alt="" />
                        <span>{commentCount}</span>
                    </button>
                    <button className="post-social-action" type="button" aria-label="Repost">
                        <img src={placeholderImage} alt="" />
                        <span>0</span>
                    </button>
                </div>
                <div className="post-reaction-social">
                    <button className="post-social-action post-social-icon" type="button" aria-label="Share">
                        <img src={placeholderImage} alt="" />
                    </button>
                    <button className="post-social-action post-social-icon" type="button" aria-label="Save">
                        <img src={placeholderImage} alt="" />
                    </button>
                </div>
            </div>
            {areCommentsOpen && (
                <div className="post-comments">
                    <form className="post-comment-form" onSubmit={submitComment}>
                        <input
                            type="text"
                            value={commentText}
                            maxLength={1000}
                            placeholder="Write a comment..."
                            onChange={(event) => setCommentText(event.target.value)}
                        />
                        <button type="submit" disabled={!commentText.trim() || isSendingComment}>
                            {isSendingComment ? 'Sending...' : 'Comment'}
                        </button>
                    </form>
                    {commentError && <p className="post-comment-error" role="alert">{commentError}</p>}
                    {areCommentsLoading ? (
                        <p className="post-comment-status">Loading comments...</p>
                    ) : comments.length === 0 ? (
                        <p className="post-comment-status">No comments yet. Be the first to comment.</p>
                    ) : (
                        <ul className="post-comment-list">
                            {comments.map((comment) => (
                                <FarmerComment
                                    key={comment.id}
                                    comment={comment}
                                    postId={post.id}
                                    session={session}
                                    onReplyAdded={() => setCommentCount((count) => count + 1)}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default FarmerPost;
