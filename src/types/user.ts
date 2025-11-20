enum USER_CONNECTION_STATUS {
    OFFLINE = "offline",
    ONLINE = "online",
}

interface User {
    username: string
    roomId: string
}

interface RemoteUser extends User {
    status: USER_CONNECTION_STATUS
    cursorPosition: number
    typing: boolean
    currentFile: string
    socketId: string
    selectionStart?: number
    selectionEnd?: number
    photo?: string
    is_active?: number | boolean
    is_banned?: number | boolean
    isActive?: number | boolean
    banned?: boolean
    user_status?: string
    isOwner?: boolean
}


enum USER_STATUS {
    INITIAL = "initial",
    CONNECTING = "connecting",
    ATTEMPTING_JOIN = "attempting-join",
    JOINED = "joined",
    CONNECTION_FAILED = "connection-failed",
    DISCONNECTED = "disconnected",
    BANNED = 'banned'
}

export { USER_CONNECTION_STATUS, USER_STATUS, RemoteUser, User }
