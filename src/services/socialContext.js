import { createContext, useContext } from 'react'

export const SocialContext = createContext(null)

const NOOP_SOCIAL = {
    session: null,
    summary: { unreadMessages: 0, unreadNotifications: 0, pendingFriendRequests: 0 },
    refreshSummary: () => {},
    openChat: () => {},
    openGroupChat: () => {},
    groupsVersion: 0,
    refreshGroups: () => {},
    openProfile: () => {},
}

export function useSocial() {
    return useContext(SocialContext) || NOOP_SOCIAL
}

export const MAX_OPEN_CHATS = 3
