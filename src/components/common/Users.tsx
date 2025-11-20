import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { RemoteUser, USER_CONNECTION_STATUS } from "@/types/user"
import Avatar from "react-avatar"
import toast from "react-hot-toast"
import { FiCamera, FiCheck, FiX, FiUserCheck, FiUserX, FiSlash, FiUsers } from "react-icons/fi"
import { useEffect, useState } from "react"

interface RoomUser {
    username: string;
    photo: string | null;
    is_active: boolean;
    is_banned: boolean;
    is_owner: boolean;
}

function Users() {
    const { users, setUsers, currentUser } = useAppContext()
    const { socket } = useSocket()
    const [roomUsers, setRoomUsers] = useState<RoomUser[]>([])
    const [isOwner, setIsOwner] = useState(false)
    const [showRoomUsers, setShowRoomUsers] = useState(false)
    const [loading, setLoading] = useState(false)

    // Original photo update handler
    useEffect(() => {
        if (!socket) return;

        const handleUserPhotoUpdated = (data: { username: string; photo?: string }) => {
            console.log("Photo updated for user:", data.username, data.photo);
            
            setUsers(prevUsers => 
                prevUsers.map(user => 
                    user.username === data.username 
                        ? { ...user, photo: data.photo }
                        : user
                )
            );
        };

        socket.on("USER_PHOTO_UPDATED", handleUserPhotoUpdated);

        return () => {
            socket.off("USER_PHOTO_UPDATED", handleUserPhotoUpdated);
        };
    }, [socket, setUsers]);

    // New room user management handlers
    useEffect(() => {
        if (!socket || !currentUser?.roomId) return;

        const handleRoomOwnerResponse = (data: { isOwner: boolean; roomId: string }) => {
            console.log("Room owner response:", data);
            setIsOwner(data.isOwner)
            
            // Auto-load room users if owner and showing room users
            if (data.isOwner && showRoomUsers) {
                loadRoomUsers();
            }
        }

        const handleRoomUsersList = (data: { users: RoomUser[] }) => {
            console.log("Room users list received:", data.users);
            setRoomUsers(data.users)
            setLoading(false)
        }

        const handleUserStatusUpdated = (data: { username: string; is_active: boolean }) => {
            console.log("User status updated:", data);
            setRoomUsers(prev => 
                prev.map(user => 
                    user.username === data.username 
                        ? { ...user, is_active: data.is_active }
                        : user
                )
            )
            toast.success(`User ${data.is_active ? 'activated' : 'deactivated'}`)
        }

        const handleUserBanned = (data: { username: string; is_banned: boolean }) => {
            console.log("User banned status updated:", data);
            setRoomUsers(prev => 
                prev.map(user => 
                    user.username === data.username 
                        ? { ...user, is_banned: data.is_banned }
                        : user
                )
            )
            toast.success(`User ${data.is_banned ? 'banned' : 'unbanned'}`)
        }

        const handleUserApproved = (data: { username: string }) => {
            console.log("User approved:", data);
            setRoomUsers(prev => 
                prev.map(user => 
                    user.username === data.username 
                        ? { ...user, is_active: true }
                        : user
                )
            )
            toast.success("User approved")
        }

        const loadRoomUsers = () => {
            setLoading(true);
            socket.emit("GET_ROOM_USERS", { roomId: currentUser.roomId })
        }

        const checkRoomOwner = () => {
            socket.emit("ROOM_OWNER_CHECK", { roomId: currentUser.roomId })
        }

        // Socket event listeners
        socket.on("ROOM_OWNER_RESPONSE", handleRoomOwnerResponse)
        socket.on("ROOM_USERS_LIST", handleRoomUsersList)
        socket.on("USER_STATUS_UPDATED", handleUserStatusUpdated)
        socket.on("USER_BANNED_STATUS", handleUserBanned)
        socket.on("USER_APPROVED", handleUserApproved)

        // Check if user is owner
        checkRoomOwner();

        return () => {
            socket.off("ROOM_OWNER_RESPONSE", handleRoomOwnerResponse)
            socket.off("ROOM_USERS_LIST", handleRoomUsersList)
            socket.off("USER_STATUS_UPDATED", handleUserStatusUpdated)
            socket.off("USER_BANNED_STATUS", handleUserBanned)
            socket.off("USER_APPROVED", handleUserApproved)
        }
    }, [socket, currentUser, showRoomUsers])

    // Load room users when toggle is switched
    useEffect(() => {
        if (showRoomUsers && isOwner && currentUser?.roomId) {
            setLoading(true);
            socket?.emit("GET_ROOM_USERS", { roomId: currentUser.roomId })
        }
    }, [showRoomUsers, isOwner, currentUser, socket])

    return (
        <div className="flex flex-col h-full">
            {/* Header with toggle button */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {showRoomUsers ? "Room Users" : "Online Users"} 
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({showRoomUsers ? roomUsers.length : users.length})
                        </span>
                    </h2>
                    
                    {isOwner && (
                        <button
                            onClick={() => setShowRoomUsers(!showRoomUsers)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                showRoomUsers 
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                            title={showRoomUsers ? "Show Online Users" : "Manage Room Users"}
                        >
                            <FiUsers size={16} />
                            {showRoomUsers ? "Online View" : "Manage Users"}
                        </button>
                    )}
                </div>
                
                {isOwner && showRoomUsers && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Room Owner Dashboard - Manage all users in this room
                    </p>
                )}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {showRoomUsers && isOwner ? (
                    // Room User Management View
                    <div className="p-4">
                        {loading ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="text-gray-500 dark:text-gray-400">Loading users...</div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {roomUsers.map((roomUser) => (
                                    <RoomUserItem 
                                        key={roomUser.username} 
                                        roomUser={roomUser} 
                                        isOwner={isOwner}
                                        currentUsername={currentUser?.username}
                                    />
                                ))}
                                
                                {roomUsers.length === 0 && (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                        No users found in this room
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // Original Online Users View
                    <div className="flex min-h-[200px] flex-grow justify-center overflow-y-auto py-2">
                        <div className="flex h-full w-full flex-wrap items-start gap-x-2 gap-y-6 px-4">
                            {users.map((user) => (
                                <User key={user.socketId} user={user} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Original User Component (unchanged)
const User = ({ user }: { user: RemoteUser }) => {
    const { currentUser } = useAppContext()
    const { socket } = useSocket()
    const { username, status, photo, roomId } = user
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

    const isMe = currentUser?.username === username

    const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isMe) return

        const file = e.target.files?.[0]
        if (!file) return

        console.log("Uploading file:", file.name)

        const formData = new FormData()
        formData.append("photo", file)
        formData.append("roomId", roomId)
        formData.append("username", username)

        try {
            const res = await fetch(`${BACKEND_URL}/upload-photo`, {
                method: "POST",
                body: formData
            })

            const data = await res.json()
            console.log("Upload response:", data)

            if (data.success && data.photo) {
                toast.success("Photo updated!")

                console.log("New photo path:", data.photo)

                // Emit socket event with new photo path
                socket.emit("USER_PHOTO_UPDATED", {
                    username,
                    photo: data.photo
                })
            } else {
                toast.error("Failed to update photo")
            }
        } catch (err) {
            console.error("Upload error:", err)
            toast.error("Server error")
        }
    }

    // Build final image URL if photo exists
    const imageUrl = photo ? `${BACKEND_URL}${photo}` : undefined

    return (
        <div className="relative flex w-[100px] flex-col items-center gap-2">
            <label className={`group relative ${isMe ? "cursor-pointer" : "cursor-default"}`}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={username}
                        className="h-[50px] w-[50px] rounded-xl object-cover"
                        onError={() => console.error("Failed to load image:", imageUrl)}
                    />
                ) : (
                    <Avatar name={username} size="50" round={"12px"} />
                )}

                {/* Camera icon only for own profile */}
                {isMe && (
                    <div
                        className="
                            absolute bottom-[-4px] right-[-4px]
                            bg-black/60 text-white
                            p-[2px] rounded-full
                            opacity-0 group-hover:opacity-100
                            transition-opacity
                        "
                    >
                        <FiCamera size={14} />
                    </div>
                )}

                {/* Only owner can change profile */}
                {isMe && (
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpdate}
                    />
                )}
            </label>

            <p className="line-clamp-2 max-w-full text-ellipsis break-words text-gray-900 dark:text-white text-center text-sm">{username}</p>

            <div
                className={`absolute right-5 top-0 h-3 w-3 rounded-full ${
                    status === USER_CONNECTION_STATUS.ONLINE ? "bg-green-500" : "bg-red-500"
                }`}
            ></div>
        </div>
    )
}

// New Room User Management Component
const RoomUserItem = ({ 
    roomUser, 
    isOwner, 
    currentUsername 
}: { 
    roomUser: RoomUser
    isOwner: boolean
    currentUsername?: string
}) => {
    const { socket } = useSocket()
    const { currentUser, users } = useAppContext()
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

    const isMe = currentUsername === roomUser.username
    const imageUrl = roomUser.photo ? `${BACKEND_URL}${roomUser.photo}` : undefined
    
    // Get online status from original users list
    const onlineUser = users.find(u => u.username === roomUser.username)
    const isOnline = onlineUser?.status === USER_CONNECTION_STATUS.ONLINE

    const handleApprove = () => {
        const roomId = currentUser?.roomId
        if (roomId) {
            socket.emit("APPROVE_USER", { 
                roomId, 
                username: roomUser.username 
            })
        }
    }

    const handleReject = () => {
        const roomId = currentUser?.roomId
        if (roomId) {
            socket.emit("REJECT_USER", { 
                roomId, 
                username: roomUser.username 
            })
        }
    }

    const handleActivate = () => {
        const roomId = currentUser?.roomId
        if (roomId) {
            socket.emit("UPDATE_USER_STATUS", { 
                roomId, 
                username: roomUser.username,
                is_active: true
            })
        }
    }

    const handleDeactivate = () => {
        const roomId = currentUser?.roomId
        if (roomId) {
            socket.emit("UPDATE_USER_STATUS", { 
                roomId, 
                username: roomUser.username,
                is_active: false
            })
        }
    }

    const handleBan = () => {
        const roomId = currentUser?.roomId
        if (roomId) {
            socket.emit("BAN_USER", { 
                roomId, 
                username: roomUser.username,
                reason: "Banned by room owner"
            })
        }
    }

    const handleUnban = () => {
        const roomId = currentUser?.roomId
        if (roomId) {
            socket.emit("UNBAN_USER", { 
                roomId, 
                username: roomUser.username
            })
        }
    }

    // Status badge with dark mode support
    const getStatusBadge = () => {
        if (roomUser.is_banned) {
            return "Banned"
        }
        if (!roomUser.is_active) {
            return "Pending"
        }
        return "Active"
    }

    const getStatusColor = () => {
        if (roomUser.is_banned) {
            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        }
        if (!roomUser.is_active) {
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        }
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    }

    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-all">
            {/* Left Side - User Info */}
            <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* User Avatar with Online Status */}
                <div className="relative flex-shrink-0">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={roomUser.username}
                            className="h-12 w-12 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600"
                            onError={() => console.error("Failed to load image:", imageUrl)}
                        />
                    ) : (
                        <div className="h-12 w-12 rounded-xl border-2 border-gray-200 dark:border-gray-600">
                            <Avatar name={roomUser.username} size="48" round="10px" />
                        </div>
                    )}
                    
                    {/* Online Status Indicator */}
                    <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        isOnline && roomUser.is_active && !roomUser.is_banned 
                            ? "bg-green-500" 
                            : "bg-gray-400"
                    }`}></div>
                </div>

                {/* User Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {roomUser.username}
                        </p>
                        {roomUser.is_owner && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                Owner
                            </span>
                        )}
                        {isMe && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">
                                You
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
                            {getStatusBadge()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {isOnline ? "Online" : "Offline"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Side - Action Buttons */}
            {isOwner && !isMe && (
                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    {/* For pending users - Approve/Reject */}
                    {!roomUser.is_active && !roomUser.is_banned && (
                        <>
                            <button
                                onClick={handleApprove}
                                className="flex items-center justify-center p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                                title="Approve User"
                            >
                                <FiCheck size={18} />
                            </button>
                            <button
                                onClick={handleReject}
                                className="flex items-center justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                                title="Reject User"
                            >
                                <FiX size={18} />
                            </button>
                        </>
                    )}

                    {/* For active users - Deactivate/Ban */}
                    {roomUser.is_active && !roomUser.is_banned && (
                        <>
                            <button
                                onClick={handleDeactivate}
                                className="flex items-center justify-center p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors shadow-sm"
                                title="Deactivate User"
                            >
                                <FiUserX size={18} />
                            </button>
                            <button
                                onClick={handleBan}
                                className="flex items-center justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                                title="Ban User"
                            >
                                <FiSlash size={18} />
                            </button>
                        </>
                    )}

                    {/* For inactive users - Activate/Ban */}
                    {!roomUser.is_active && !roomUser.is_banned && (
                        <>
                            <button
                                onClick={handleActivate}
                                className="flex items-center justify-center p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                                title="Activate User"
                            >
                                <FiUserCheck size={18} />
                            </button>
                            <button
                                onClick={handleBan}
                                className="flex items-center justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                                title="Ban User"
                            >
                                <FiSlash size={18} />
                            </button>
                        </>
                    )}

                    {/* For banned users - Unban only */}
                    {roomUser.is_banned && (
                        <button
                            onClick={handleUnban}
                            className="flex items-center justify-center p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                            title="Unban User"
                        >
                            <FiUserCheck size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default Users