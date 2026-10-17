function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

const STATUS_LABELS = {
    SENT: 'Sent',
    SANDBOX: 'Sandbox (not delivered)',
    FAILED: 'Failed',
    PENDING: 'Sending',
}

function SmsNotificationLog({ notifications, title = 'SMS sent to Farmer', description }) {
    const items = Array.isArray(notifications) ? notifications : []
    if (!items.length) return null

    return (
        <section className="admin-panel sms-log">
            <h3>{title}</h3>
            {description && <p className="sms-log-description">{description}</p>}
            <ul>
                {items.map((item) => {
                    const status = String(item.status || 'PENDING').toUpperCase()
                    return (
                        <li key={item.notificationId || `${item.sentAt}-${item.recipient}`}>
                            <div className="sms-log-meta">
                                <span className={`sms-log-status sms-log-${status.toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>
                                <span>To {item.recipient || '-'}</span>
                                <span>{formatDate(item.sentAt || item.createdAt)}</span>
                                {item.sentBy?.userName && <span>By {item.sentBy.userName}</span>}
                            </div>
                            <p className="sms-log-bubble">{item.message}</p>
                            {status === 'FAILED' && item.failureReason && <p className="sms-log-error">{item.failureReason}</p>}
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}

export default SmsNotificationLog
