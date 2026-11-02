import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import '../assets/styles/toast.css'

function Toast({ message, onDismiss, duration = 5000, action }) {
    const dismissRef = useRef(onDismiss)

    useEffect(() => {
        dismissRef.current = onDismiss
    }, [onDismiss])

    useEffect(() => {
        if (!message) return undefined
        const timer = setTimeout(() => dismissRef.current(), duration)
        return () => clearTimeout(timer)
    }, [message, duration])

    if (!message || typeof document === 'undefined') return null

    return createPortal(
        <div className="app-toast">
            <span className="app-toast-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m5 12 4 4L19 6" />
                </svg>
            </span>
            <div className="app-toast-body">
                <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
                {action && <button className="app-toast-action" type="button" onClick={action.onClick}>{action.label}</button>}
            </div>
            <button className="app-toast-dismiss" type="button" aria-label="Dismiss notification" onClick={onDismiss}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 6 12 12M6 18 18 6" />
                </svg>
            </button>
        </div>,
        document.getElementById('toast-root'),
    )
}

export default Toast
