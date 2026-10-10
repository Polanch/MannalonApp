import { useEffect, useRef, useState } from 'react'
import farmer from '../../assets/images/farmer.png'
import farmer2 from '../../assets/images/farmer2.png'
import photoIcon from '../../assets/images/m-icon5.png'
import videoIcon from '../../assets/images/m-icon6.png'
import nextIcon from '../../assets/images/m-icon4.png'
import deleteIcon from '../../assets/images/m-icon7.png'
import FarmerPost from './FarmerPost'
function FarmerDashboardMiddleNavigation() {
    const photoInputRef = useRef(null)
    const videoInputRef = useRef(null)
    const mediaPreviewUrlRef = useRef(null)
    const [mediaPreview, setMediaPreview] = useState(null)
    const [postText, setPostText] = useState('')
    const hasContent = postText.trim() !== '' || mediaPreview !== null

    useEffect(() => {
        return () => {
            if (mediaPreviewUrlRef.current) {
                URL.revokeObjectURL(mediaPreviewUrlRef.current)
            }
        }
    }, [])

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
                        className="post-next"
                        onClick={(event) => event.preventDefault()}
                    >
                        <img src={nextIcon} alt="" className="post-next-icon" />
                        Post
                    </a>
                </div>
            </div>
            <FarmerPost />
            <FarmerPost />
            <FarmerPost />
        </div>
    );
}

export default FarmerDashboardMiddleNavigation;