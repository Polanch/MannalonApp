import { fetchPosts } from './farmerApi.js'

export function matchingPosts(posts, query) {
    const text = query.trim().toLowerCase()
    return posts.filter((post) => text && String(post.content || '').toLowerCase().includes(text))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id - a.id)
}

export async function scanPosts({ userId, query, signal, onProgress }, loadPage = fetchPosts) {
    const matches = new Map()
    let scanned = 0
    for (let page = 0; ; page += 1) {
        signal.throwIfAborted()
        const data = await loadPage({ userId, page, size: 50 }, signal)
        signal.throwIfAborted()
        if (!Array.isArray(data?.content) || typeof data.hasNext !== 'boolean') {
            throw new Error('The server returned an invalid post page. Search could not be completed.')
        }
        if (!data.content.length && data.hasNext) {
            throw new Error('Post search could not advance to the next page. Please retry.')
        }
        scanned += data.content.length
        matchingPosts(data.content, query).forEach((post) => matches.set(post.id, post))
        onProgress({ items: matchingPosts([...matches.values()], query), scanned, complete: !data.hasNext })
        if (!data.hasNext) return
    }
}
