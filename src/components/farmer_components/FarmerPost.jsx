import placeholderImage from '../../assets/images/placeholder.png';
import upIcon from '../../assets/images/m-icon8.png';
import downIcon from '../../assets/images/m-icon9.png';
function FarmerPost() {
    return (
        <div className="farmer-post-box">
            <div className="post-header">
                <div className="farmer-pfp">
                    <img src={placeholderImage} alt="Farmer Profile" />
                </div>
                <div className="farmer-username">
                    <p>Placehodler Farmer Name</p>
                </div>
                <div className="post-date">
                    <p>2 days ago</p>
                </div>
            </div>
            <div className="post-description">
                <div className="post-message">
                    <p>This is a placeholder message for the post description.</p>
                </div>
            </div>
            <div className="post-content">
                <div className="post-content-file">
                    <p>This is a placeholder for the post content file like image/video.</p>
                </div>
            </div>
            <div className="post-reaction">
                <div className="post-reaction-primary">
                    <div className="post-reaction-emojis">
                        <button aria-label="Upvote">
                            <img className="post-reaction-up" src={upIcon} alt="" />
                        </button>
                        <span className="vote-count">199</span>
                        <button aria-label="Downvote">
                            <img className="post-reaction-down" src={downIcon} alt="" />
                        </button>
                    </div>
                    <button className="post-social-action" type="button" aria-label="Comment, 194 comments">
                        <img src={placeholderImage} alt="" />
                        <span>194</span>
                    </button>
                    <button className="post-social-action" type="button" aria-label="Repost, 1 repost">
                        <img src={placeholderImage} alt="" />
                        <span>1</span>
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
        </div>
    );
}

export default FarmerPost;