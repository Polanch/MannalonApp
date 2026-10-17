import { initialsOf, socialFileUrl } from '../../services/socialApi.js'

function GroupAvatar({ group, viewerId, size = 36, className = '' }) {
    const photoUrl = socialFileUrl(group?.photoUrl, viewerId)
    const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }

    return (
        <span className={`social-avatar is-group ${className}`.trim()} style={style}>
            {photoUrl ? <img src={photoUrl} alt="" /> : initialsOf(group?.title || 'Group')}
        </span>
    )
}

export default GroupAvatar
