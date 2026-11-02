import { useEffect, useState } from 'react'
import { TICKET_POLL_MS } from '../services/ticketingApi.js'

export default function useTicketResource(load, poll = true) {
    const [state, setState] = useState({ data: null, error: '', loading: true })
    const [revision, setRevision] = useState(0)

    useEffect(() => {
        const controller = new AbortController()
        let pending = false
        async function refresh(initial = false) {
            if (pending || controller.signal.aborted) return
            pending = true
            if (initial) setState((current) => ({ ...current, loading: true }))
            try {
                const data = await load(controller.signal)
                if (!controller.signal.aborted) setState({ data, error: '', loading: false, source: load })
            } catch (error) {
                if (!controller.signal.aborted) {
                    setState((current) => ({
                        ...current, data: current.source === load ? current.data : null,
                        error: error.message || 'Unable to refresh tickets. Check your connection.', loading: false, source: load,
                    }))
                }
            } finally {
                pending = false
            }
        }
        const initial = window.setTimeout(() => refresh(true), 0)
        const interval = poll ? window.setInterval(() => refresh(), TICKET_POLL_MS) : null
        return () => {
            controller.abort()
            window.clearTimeout(initial)
            window.clearInterval(interval)
        }
    }, [load, poll, revision])

    return {
        ...state, data: state.source === load ? state.data : null,
        loading: state.source !== load || state.loading,
        refresh: () => setRevision((current) => current + 1),
    }
}
