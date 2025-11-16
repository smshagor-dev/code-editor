import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS } from "@/types/user"
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { useLocation, useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"
import logo from "@/assets/logo.svg"

// Eye icons for password visibility
const EyeOpenIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeClosedIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
)

interface RoomInfo {
    room_id: string;
    room_name: string;
    has_password: boolean;
    created_at: string;
    user_count: number;
}

const FormComponent = () => {
    const location = useLocation()
    const { currentUser, setCurrentUser, status, setStatus } = useAppContext()
    const { socket } = useSocket()
    const [isCreatingRoom, setIsCreatingRoom] = useState(false)
    const [roomPassword, setRoomPassword] = useState("")
    const [rememberMe, setRememberMe] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
    const [isCheckingRoom, setIsCheckingRoom] = useState(false)
    const [verifiedPassword, setVerifiedPassword] = useState("") // Store verified password
    const [showPassword, setShowPassword] = useState(false) // For password visibility
    const [showModalPassword, setShowModalPassword] = useState(false) // For modal password visibility

    const usernameRef = useRef<HTMLInputElement | null>(null)
    const passwordRef = useRef<HTMLInputElement | null>(null)
    const navigate = useNavigate()

    // Load saved credentials from localStorage
    useEffect(() => {
        const savedUsername = localStorage.getItem("savedUsername")
        const savedRoomId = localStorage.getItem("savedRoomId")
        const savedRememberMe = localStorage.getItem("rememberMe") === "true"
        
        if (savedRememberMe && savedUsername && savedRoomId) {
            setCurrentUser({ 
                ...currentUser, 
                username: savedUsername,
                roomId: savedRoomId
            })
            setRememberMe(true)
        }
    }, [setCurrentUser])

    const createNewRoomId = () => {
        const newRoomId = uuidv4()
        setCurrentUser({ ...currentUser, roomId: newRoomId })
        setIsCreatingRoom(true)
        setRoomInfo(null) // Clear any existing room info
        toast.success("Created a new Room ID")
        usernameRef.current?.focus()
    }

    const handleInputChanges = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.name
        const value = e.target.value
        setCurrentUser({ ...currentUser, [name]: value })
    }

    const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
        setRoomPassword(e.target.value)
    }

    const handleRememberMeChange = (e: ChangeEvent<HTMLInputElement>) => {
        setRememberMe(e.target.checked)
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
    }

    const toggleModalPasswordVisibility = () => {
        setShowModalPassword(!showModalPassword)
    }

    const validateForm = () => {
        if (currentUser.username.trim().length === 0) {
            toast.error("Enter your username")
            return false
        } else if (currentUser.roomId.trim().length === 0) {
            toast.error("Enter a room ID")
            return false
        } else if (currentUser.roomId.trim().length < 5) {
            toast.error("Room ID must be at least 5 characters long")
            return false
        } else if (currentUser.username.trim().length < 3) {
            toast.error("Username must be at least 3 characters long")
            return false
        }
        return true
    }

    // Check room info when roomId changes
    useEffect(() => {
        if (currentUser.roomId.trim().length >= 5) {
            checkRoomInfo()
        } else {
            setRoomInfo(null)
            setIsCreatingRoom(false)
        }
    }, [currentUser.roomId])

    const checkRoomInfo = async () => {
        if (currentUser.roomId.trim().length < 5) return
        
        setIsCheckingRoom(true)
        socket.emit(SocketEvent.ROOM_INFO_REQUEST, { roomId: currentUser.roomId })
    }

    const handlePasswordSubmit = () => {
        if (!roomPassword.trim()) {
            toast.error("Please enter room password")
            return
        }

        // Store the verified password
        setVerifiedPassword(roomPassword)

        // Verify password
        socket.emit(SocketEvent.CHECK_ROOM_PASSWORD, {
            roomId: currentUser.roomId,
            password: roomPassword
        })
    }

    const joinRoom = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (status === USER_STATUS.ATTEMPTING_JOIN) return
        if (!validateForm()) return

        // Save credentials if remember me is checked
        if (rememberMe) {
            localStorage.setItem("savedUsername", currentUser.username)
            localStorage.setItem("savedRoomId", currentUser.roomId)
            localStorage.setItem("rememberMe", "true")
        } else {
            // Clear saved credentials
            localStorage.removeItem("savedUsername")
            localStorage.removeItem("savedRoomId")
            localStorage.removeItem("rememberMe")
        }

        // If room exists and has password, show password modal
        if (roomInfo && roomInfo.has_password && !isCreatingRoom) {
            setShowPasswordModal(true)
            return
        }

        // If creating new room or room doesn't require password, proceed
        proceedWithJoin()
    }

    const proceedWithJoin = (passwordToUse?: string) => {
        toast.loading(isCreatingRoom ? "Creating room..." : "Joining room...")
        setStatus(USER_STATUS.ATTEMPTING_JOIN)
        
        // Use the provided password, verified password, or empty string
        const finalPassword = passwordToUse || verifiedPassword || (isCreatingRoom ? roomPassword : "")
        
        const joinData = {
            roomId: currentUser.roomId,
            username: currentUser.username,
            password: finalPassword,
            roomName: isCreatingRoom ? `${currentUser.username}'s Room` : "Collaborative Room"
        }

        console.log("Sending JOIN_REQUEST with password:", finalPassword ? "***" : "empty")
        socket.emit(SocketEvent.JOIN_REQUEST, joinData)
        setIsCreatingRoom(false) // Reset creation flag after join attempt
    }

    // Socket event listeners
    useEffect(() => {
        const handleRoomInfoResponse = (data: { roomInfo: RoomInfo }) => {
            setIsCheckingRoom(false)
            setRoomInfo(data.roomInfo)
            setIsCreatingRoom(false) // Room exists, so we're not creating
        }

        const handlePasswordValid = (data: { roomId: string }) => {
            setShowPasswordModal(false)
            toast.success("Password verified!")
            // Use the current roomPassword that was just verified
            proceedWithJoin(roomPassword)
        }

        const handlePasswordIncorrect = () => {
            toast.error("Incorrect password")
            setRoomPassword("")
            setVerifiedPassword("")
            passwordRef.current?.focus()
        }

        const handlePasswordRequired = () => {
            setShowPasswordModal(true)
        }

        const handleError = (data: { message: string }) => {
            setIsCheckingRoom(false)
            toast.dismiss()
            if (data.message === "Room not found") {
                setRoomInfo(null)
                // If room not found and user entered a room ID, assume they want to create it
                if (currentUser.roomId.trim().length >= 5) {
                    setIsCreatingRoom(true)
                }
            } else {
                toast.error(data.message)
            }
        }

        const handleJoinAccepted = (data: any) => {
            setStatus(USER_STATUS.JOINED)
            toast.dismiss()
            toast.success("Successfully joined room!")
            // Clear verified password after successful join
            setVerifiedPassword("")
            setRoomPassword("")
        }

        const handleUsernameExists = () => {
            setStatus(USER_STATUS.DISCONNECTED)
            toast.dismiss()
            toast.error("Username already exists in this room")
        }

        const handleRoomCreated = (data: any) => {
            setStatus(USER_STATUS.JOINED)
            toast.dismiss()
            toast.success("Room created successfully!")
            setRoomPassword("")
        }

        socket.on(SocketEvent.ROOM_INFO_RESPONSE, handleRoomInfoResponse)
        socket.on(SocketEvent.PASSWORD_VALID, handlePasswordValid)
        socket.on(SocketEvent.PASSWORD_INCORRECT, handlePasswordIncorrect)
        socket.on(SocketEvent.PASSWORD_REQUIRED, handlePasswordRequired)
        socket.on(SocketEvent.ERROR, handleError)
        socket.on(SocketEvent.JOIN_ACCEPTED, handleJoinAccepted)
        socket.on(SocketEvent.USERNAME_EXISTS, handleUsernameExists)
        socket.on(SocketEvent.ROOM_CREATED, handleRoomCreated)

        return () => {
            socket.off(SocketEvent.ROOM_INFO_RESPONSE, handleRoomInfoResponse)
            socket.off(SocketEvent.PASSWORD_VALID, handlePasswordValid)
            socket.off(SocketEvent.PASSWORD_INCORRECT, handlePasswordIncorrect)
            socket.off(SocketEvent.PASSWORD_REQUIRED, handlePasswordRequired)
            socket.off(SocketEvent.ERROR, handleError)
            socket.off(SocketEvent.JOIN_ACCEPTED, handleJoinAccepted)
            socket.off(SocketEvent.USERNAME_EXISTS, handleUsernameExists)
            socket.off(SocketEvent.ROOM_CREATED, handleRoomCreated)
        }
    }, [socket, currentUser.roomId, roomPassword])

    useEffect(() => {
        if (currentUser.roomId.length > 0) return
        if (location.state?.roomId) {
            setCurrentUser({ ...currentUser, roomId: location.state.roomId })
            if (currentUser.username.length === 0) {
                toast.success("Enter your username")
            }
        }
    }, [currentUser, location.state?.roomId, setCurrentUser])

    useEffect(() => {
        if (status === USER_STATUS.DISCONNECTED && !socket.connected) {
            socket.connect()
            return
        }

        const isRedirect = sessionStorage.getItem("redirect") || false

        if (status === USER_STATUS.JOINED && !isRedirect) {
            const username = currentUser.username
            sessionStorage.setItem("redirect", "true")
            navigate(`/editor/${currentUser.roomId}`, {
                state: {
                    username,
                },
            })
        } else if (status === USER_STATUS.JOINED && isRedirect) {
            sessionStorage.removeItem("redirect")
            setStatus(USER_STATUS.DISCONNECTED)
            socket.disconnect()
            socket.connect()
        }
    }, [currentUser, location.state?.redirect, navigate, setStatus, socket, status])

    return (
        <>
            <div className="flex w-full max-w-[500px] flex-col items-center justify-center gap-4 p-4 sm:w-[500px] sm:p-8">
                <img src={logo} alt="Logo" className="w-full"/>
                
                {/* Room Status Info */}
                {currentUser.roomId.length >= 5 && (
                    <div className="w-full rounded-md bg-darkHover p-3 text-sm">
                        {isCheckingRoom ? (
                            <div className="flex items-center gap-2 text-yellow-400">
                                <div className="h-2 w-2 animate-ping rounded-full bg-yellow-400"></div>
                                Checking room...
                            </div>
                        ) : roomInfo ? (
                            <div className="text-green-400">
                                ✓ Room found: {roomInfo.room_name} 
                                {roomInfo.has_password && " (Password protected)"}
                                <div className="text-xs text-gray-400">
                                    {roomInfo.user_count} user(s) online
                                </div>
                            </div>
                        ) : isCreatingRoom ? (
                            <div className="text-blue-400">
                                🆕 New room will be created
                            </div>
                        ) : (
                            <div className="text-gray-400">
                                Enter a Room ID to check availability
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={joinRoom} className="flex w-full flex-col gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            name="roomId"
                            placeholder="Room ID"
                            className="w-full rounded-md border border-gray-500 bg-darkHover px-3 py-3 focus:outline-none"
                            onChange={handleInputChanges}
                            value={currentUser.roomId}
                        />
                        {isCreatingRoom && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="rounded bg-blue-500 px-2 py-1 text-xs text-white">NEW</span>
                            </div>
                        )}
                    </div>
                    
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        className="w-full rounded-md border border-gray-500 bg-darkHover px-3 py-3 focus:outline-none"
                        onChange={handleInputChanges}
                        value={currentUser.username}
                        ref={usernameRef}
                    />

                    {/* Password input for new rooms */}
                    {isCreatingRoom && (
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Room Password (optional)"
                                className="w-full rounded-md border border-gray-500 bg-darkHover px-3 py-3 pr-10 focus:outline-none"
                                value={roomPassword}
                                onChange={handlePasswordChange}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                onClick={togglePasswordVisibility}
                            >
                                {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                            </button>
                        </div>
                    )}

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={handleRememberMeChange}
                            className="h-4 w-4 rounded border-gray-500 bg-darkHover text-primary focus:ring-primary"
                        />
                        <label htmlFor="rememberMe" className="text-sm text-gray-300">
                            Remember me
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="mt-2 w-full rounded-md bg-primary px-8 py-3 text-lg font-semibold text-black disabled:opacity-50"
                        disabled={status === USER_STATUS.ATTEMPTING_JOIN}
                    >
                        {status === USER_STATUS.ATTEMPTING_JOIN 
                            ? (isCreatingRoom ? "Creating..." : "Joining...") 
                            : (isCreatingRoom ? "Create Room" : "Join Room")
                        }
                    </button>
                </form>

                <div className="flex w-full items-center justify-between">
                    <button
                        className="cursor-pointer select-none underline"
                        onClick={createNewRoomId}
                    >
                        Generate Unique Room ID
                    </button>
                    
                    {/* Clear saved credentials */}
                    {localStorage.getItem("rememberMe") === "true" && (
                        <button
                            className="cursor-pointer select-none text-sm text-red-400 underline"
                            onClick={() => {
                                localStorage.removeItem("savedUsername")
                                localStorage.removeItem("savedRoomId")
                                localStorage.removeItem("rememberMe")
                                setRememberMe(false)
                                setCurrentUser({ ...currentUser, username: "", roomId: "" })
                                toast.success("Saved credentials cleared")
                            }}
                        >
                            Clear saved
                        </button>
                    )}
                </div>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg bg-dark p-6 shadow-xl">
                        <h3 className="mb-4 text-lg font-semibold">Room Password Required</h3>
                        <p className="mb-4 text-sm text-gray-300">
                            This room is protected with a password. Please enter the password to join.
                        </p>
                        
                        <div className="relative mb-4">
                            <input
                                type={showModalPassword ? "text" : "password"}
                                placeholder="Enter room password"
                                className="w-full rounded-md border border-gray-500 bg-darkHover px-3 py-3 pr-10 focus:outline-none"
                                value={roomPassword}
                                onChange={handlePasswordChange}
                                ref={passwordRef}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handlePasswordSubmit()
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                onClick={toggleModalPasswordVisibility}
                            >
                                {showModalPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={handlePasswordSubmit}
                                className="flex-1 rounded-md bg-primary px-4 py-2 font-semibold text-black"
                            >
                                Join Room
                            </button>
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false)
                                    setRoomPassword("")
                                    setVerifiedPassword("")
                                }}
                                className="flex-1 rounded-md border border-gray-500 px-4 py-2 font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FormComponent