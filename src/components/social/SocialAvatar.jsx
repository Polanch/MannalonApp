import { resolveMediaUrl } from '../../services/farmerApi.js'
import { initialsOf } from '../../services/socialApi.js'

function SocialAvatar({ user, size = 36, className = '' }) {
    const pictureUrl = user?.profilePictureUrl ? resolveMediaUrl(user.profilePictureUrl) : ''
    const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }

    return (
        <span className={`social-avatar ${className}`.trim()} style={style}>
            {pictureUrl ? <img src={pictureUrl} alt="" /> : initialsOf(user?.fullName)}
        </span>
    )
}

export default SocialAvatar
