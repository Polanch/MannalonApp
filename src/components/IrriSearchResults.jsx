import { useEffect, useState } from 'react'
import { irriSearchError, searchIrri } from '../services/irriSearchApi.js'

export function IrriResourceList({ items }) {
    return <ul className="irri-resource-list">
        {items.map((item, index) => <li key={`${item.url}:${index}`}>
            <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></h3>
            <p className="search-hint">International Rice Research Institute · {new URL(item.url).hostname}</p>
            {item.snippet && <p>{item.snippet}</p>}
            <a className="irri-resource-url" href={item.url} target="_blank" rel="noopener noreferrer">
                Open on IRRI: {item.url} <span aria-label="opens in a new tab">↗</span>
            </a>
        </li>)}
    </ul>
}

function IrriSearchResults({ query }) {
    const [page, setPage] = useState(0)
    const [revision, setRevision] = useState(0)
    const [state, setState] = useState({ loading: true })
    useEffect(() => {
        const controller = new AbortController()
        searchIrri({ query, page }, controller.signal).then((data) => {
            if (!controller.signal.aborted) setState({ data, loading: false })
        }).catch((error) => {
            if (!controller.signal.aborted) setState({ error: irriSearchError(error), loading: false })
        })
        return () => controller.abort()
    }, [query, page, revision])

    function changePage(next) {
        setState({ loading: true })
        setPage(next)
    }

    return <section aria-labelledby="search-irri">
        <h2 id="search-irri">IRRI resources</h2>
        <p className="search-hint">External web resources from IRRI. Links open the original site in a new tab; these are not necessarily peer-reviewed papers.</p>
        {state.loading && <p role="status">Searching IRRI resources...</p>}
        {state.error && <p role="alert">{state.error} <button type="button" onClick={() => {
            setState({ loading: true })
            setRevision((value) => value + 1)
        }}>Retry IRRI search</button></p>}
        {state.data && <>
            {!state.data.items.length && <p>No matching IRRI resources found.</p>}
            <IrriResourceList items={state.data.items} />
            {(page > 0 || state.data.hasNext) && <div className="search-pagination" aria-label="IRRI result pages">
                <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>Previous IRRI results</button>
                <span>Page {page + 1}</span>
                <button type="button" disabled={!state.data.hasNext} onClick={() => changePage(page + 1)}>Next IRRI results</button>
            </div>}
        </>}
    </section>
}

export default IrriSearchResults
