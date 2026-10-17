import { useEffect, useRef, useState } from 'react'
import farmer from '../../assets/images/farmer.png'
import farmer2 from '../../assets/images/farmer2.png'
import photoIcon from '../../assets/images/m-icon5.png'
import videoIcon from '../../assets/images/m-icon6.png'
import nextIcon from '../../assets/images/m-icon4.png'
import deleteIcon from '../../assets/images/m-icon7.png'
import FarmerPost from './FarmerPost'
import { createPost, fetchPosts, getApiErrorMessage } from '../../services/farmerApi.js'

const PAGE_SIZE = 10

function FarmerDashboardMiddleNavigation({ session, authorId, header, hideComposer = false, emptyText = 'No posts yet. Be the first to post!' }) {
    const photoInputRef = useRef(null)
    const videoInputRef = useRef(null)
    const mediaPreviewUrlRef = useRef(null)
    const sentinelRef = useRef(null)
    const isFetchingRef = useRef(false)
    const [mediaPreview, setMediaPreview] = useState(null)
    const [postText, setPostText] = useState('')
    const [isPosting, setIsPosting] = useState(false)
    const [postError, setPostError] = useState('')
    const [posts, setPosts] = useState([])
    const [nextPage, setNextPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [isLoadingPosts, setIsLoadingPosts] = useState(false)
    const [feedError, setFeedError] = useState('')
    const hasContent = postText.trim() !== '' || mediaPreview !== null
    const canPost = postText.trim() !== '' && !isPosting

    useEffect(() => {
        return () => {
            if (mediaPreviewUrlRef.current) {
                URL.revokeObjectURL(mediaPreviewUrlRef.current)
            }
        }
    }, [])

    async function loadMorePosts() {
        if (isFetchingRef.current) {
            return
        }

        isFetchingRef.current = true
        setIsLoadingPosts(true)
        setFeedError('')

        try {
            const data = await fetchPosts({ userId: session.userId, authorId, page: nextPage, size: PAGE_SIZE })
            const items = Array.isArray(data) ? data : data.content ?? []

            setPosts((current) => {
                const knownIds = new Set(current.map((post) => post.id))
                return [...current, ...items.filter((post) => !knownIds.has(post.id))]
            })
            setNextPage(nextPage + 1)
            setHasMore(Array.isArray(data) ? items.length === PAGE_SIZE : Boolean(data.hasNext))
        } catch (error) {
            setFeedError(getApiErrorMessage(error, 'Unable to load posts.'))
        } finally {
            isFetchingRef.current = false
            setIsLoadingPosts(false)
        }
    }

    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel || !hasMore || isLoadingPosts || feedError) {
            return undefined
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    loadMorePosts()
                }
            },
            { rootMargin: '300px' },
        )
        observer.observe(sentinel)

        return () => observer.disconnect()
    })

    async function submitPost(event) {
        event.preventDefault()
        if (!canPost) {
            return
        }

        setPostError('')
        setIsPosting(true)

        try {
            const saved = await createPost({
                userId: session.userId,
                content: postText.trim(),
                media: mediaPreview?.file ?? null,
            })
            const newPost = { ...saved, authorName: saved.authorName || session.fullName,
                authorProfilePictureUrl: saved.authorProfilePictureUrl || session.profilePictureUrl,
            }

            setPosts((current) => [newPost, ...current.filter((post) => post.id !== newPost.id)])
            setPostText('')
            removeMedia()
        } catch (error) {
            setPostError(getApiErrorMessage(error, 'Unable to publish your post. Please try again.'))
        } finally {
            setIsPosting(false)
        }
    }

    function handleMediaSelect(event) {
        const file = event.target.files?.[0]
        if (file) {
            if (mediaPreviewUrlRef.current) {
                URL.revokeObjectURL(mediaPreviewUrlRef.current)
            }

            const previewUrl = URL.createObjectURL(file)
            mediaPreviewUrlRef.current = previewUrl
            setMediaPreview({ file, url: previewUrl })
        }

        event.target.value = ''
    }

    function removeMedia() {
        if (mediaPreviewUrlRef.current) {
            URL.revokeObjectURL(mediaPreviewUrlRef.current)
            mediaPreviewUrlRef.current = null
        }
        setMediaPreview(null)
    }

    return (
        <div className="farmer-dashboard-middle-navigation">
            {header}
            {!hideComposer && (
            <div className="create-post-container">
                <div className="post-mini-menu">
                    <div className="post-media">
                        {!mediaPreview ? (
                            <div className="post-media-actions">
                                <input
                                    ref={photoInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleMediaSelect}
                                    hidden
                                />
                                <button type="button" onClick={() => photoInputRef.current?.click()}>
                                    <img src={photoIcon} alt="" className="post-media-icon" />
                                    I want to add an Image
                                </button>
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/*"
                                    onChange={handleMediaSelect}
                                    hidden
                                />
                                <button type="button" onClick={() => videoInputRef.current?.click()}>
                                    <img src={videoIcon} alt="" className="post-media-icon" />
                                    I want to add a video
                                </button>
                            </div>
                        ) : mediaPreview.file.type.startsWith('image/') ? (
                            <img src={mediaPreview.url} alt="Selected post media preview" />
                        ) : (
                            <video src={mediaPreview.url} controls playsInline />
                        )}
                    </div>
                </div>
                {mediaPreview && (
                    <button type="button" className="post-media-remove" onClick={removeMedia}>
                        <img src={deleteIcon} alt="" className="post-media-icon" />
                        {mediaPreview.file.type.startsWith('image/')
                            ? 'I want to remove the image'
                            : 'I want to remove the video'}
                    </button>
                )}
                <div className="post-box">
                    <div className="farmer-name">
                        <p>Kuya Mannalon</p>
                    </div>
                    <img src={hasContent ? farmer2 : farmer} alt="Farmer" className="post-farmer"/>
                    <textarea
                        className="post-textarea"
                        placeholder="What's on your mind?"
                        value={postText}
                        onChange={(event) => setPostText(event.target.value)}
                    ></textarea>
                    <a
                        href="#"
                        className={`post-next${canPost ? '' : ' is-disabled'}`}
                        aria-disabled={!canPost}
                        onClick={submitPost}
                    >
                        <img src={nextIcon} alt="" className="post-next-icon" />
                        {isPosting ? 'Posting...' : 'Post'}
                    </a>
                </div>
                {postError && <p className="post-error" role="alert">{postError}</p>}
            </div>
            )}
            {posts.map((post) => (
                <FarmerPost key={post.id} post={post} session={session} />
            ))}
            {feedError && (
                <p className="feed-status feed-status-error" role="alert">
                    {feedError}{' '}
                    <button type="button" onClick={loadMorePosts}>Try again</button>
                </p>
            )}
            {isLoadingPosts && <p className="feed-status">Loading posts...</p>}
            {!hasMore && !feedError && (
                <p className="feed-status">
                    {posts.length === 0 ? emptyText : "You're all caught up."}
                </p>
            )}
            <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true"></div>
        </div>
    );
}

export default FarmerDashboardMiddleNavigation;