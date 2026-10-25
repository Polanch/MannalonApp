export const NAV_SECTIONS = [
    {
        label: 'Overview',
        items: [
            { path: '/admin', label: 'Dashboard', icon: 'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z' },
        ],
    },
    {
        label: 'Users',
        items: [
            { path: '/admin/farm-owners', label: 'Farm Admins', icon: 'M3 21V9l9-6 9 6v12 M9 21v-6h6v6' },
            { path: '/admin/farmers', label: 'Farmers', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 21c0-4 3.6-7 8-7s8 3 8 7' },
        ],
    },
    {
        label: 'Management',
        items: [
            { path: '/admin/users', label: 'User Management', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M20 8v6 M17 11h6' },
            { path: '/admin/chat-records', label: 'AI Chat Records', icon: 'M21 11a8 8 0 0 1-8 8H7l-5 3V11a8 8 0 0 1 8-8h3a8 8 0 0 1 8 8z M7 8h9 M7 12h6' },
            { path: '/admin/farm-management', label: 'Farm Management', icon: 'M5 21c0-9 5-15 15-16-1 10-7 15-15 16z M5 21c2-5 5-8 9-10' },
            { path: '/admin/programs', label: 'Programs', icon: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8 8h8 M8 12h8 M8 16h5' },
            { path: '/admin/rentals', label: 'Tool Rental', icon: 'M4 7h16v12H4z M8 7V5h8v2 M8 19v2 M16 19v2' },
            { path: '/admin/library', label: 'Library', icon: 'M4 3h6a3 3 0 0 1 3 3v15a4 4 0 0 0-4-2H4z M20 3h-4a3 3 0 0 0-3 3v15a4 4 0 0 1 4-2h3z' },
        ],
    },
    {
        label: 'Insights',
        items: [
            { path: '/admin/market', label: 'Market Insights', icon: 'M3 3v18h18 M7 15l4-4 3 3 5-6' },
        ],
    },
]

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

// '/admin/:registrationId' is a Farm Admin detail page, so unknown sub-paths belong to Farm Admins.
export function getActivePath(pathname) {
    if (pathname === '/admin') return '/admin'
    const match = ALL_ITEMS
        .filter((item) => item.path !== '/admin' && pathname.startsWith(item.path))
        .sort((a, b) => b.path.length - a.path.length)[0]
    return match ? match.path : '/admin/farm-owners'
}

export function getAdminPageTitle(pathname) {
    return ALL_ITEMS.find((item) => item.path === getActivePath(pathname))?.label || 'Admin'
}
