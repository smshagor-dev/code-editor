import { useSettings } from "@/context/SettingContext"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import useResponsive from "@/hooks/useResponsive"
import { editorFonts } from "@/resources/Fonts"
import { editorThemes } from "@/resources/Themes"
import { langNames } from "@uiw/codemirror-extensions-langs"
import { ChangeEvent, useEffect, useState } from "react"
import RoomEditSection from "@/components/RoomEditSection"
import { RoomInfo } from "@/types/room"

function SettingsView() {
    const {
        theme,
        setTheme,
        language,
        setLanguage,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        showGitHubCorner,
        setShowGitHubCorner,
        resetSettings,
    } = useSettings()
    
    const { currentUser } = useAppContext()
    const { socket } = useSocket()
    const { viewHeight } = useResponsive()
    
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
    const [isCheckingRoom, setIsCheckingRoom] = useState(false)

    const handleFontFamilyChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newFontFamily = e.target.value
        setFontFamily(newFontFamily)
        applyFontFamilyToEditor(newFontFamily)
    }

    const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setTheme(e.target.value)
    }

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setLanguage(e.target.value)
    }

    const handleFontSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newFontSize = parseInt(e.target.value)
        setFontSize(newFontSize)
        applyFontSizeToEditor(newFontSize)
    }

    const handleShowGitHubCornerChange = (e: ChangeEvent<HTMLInputElement>) => {
        setShowGitHubCorner(e.target.checked)
    }

    const applyFontFamilyToEditor = (fontFamily: string) => {
        const editor = document.querySelector(".cm-editor > .cm-scroller") as HTMLElement
        if (editor) {
            editor.style.fontFamily = `${fontFamily}, monospace`
        }
    }

    const applyFontSizeToEditor = (fontSize: number) => {
        const editor = document.querySelector(".cm-editor > .cm-scroller") as HTMLElement
        if (editor) {
            editor.style.fontSize = `${fontSize}px`
        }
    }

    const applyAllEditorSettings = () => {
        applyFontFamilyToEditor(fontFamily)
        applyFontSizeToEditor(fontSize)
    }

    // Check room info when component mounts or roomId changes
    useEffect(() => {
        if (currentUser.roomId) {
            checkRoomInfo()
        }
    }, [currentUser.roomId])

    // Apply editor settings when component mounts
    useEffect(() => {
        applyAllEditorSettings()
    }, [])

    const checkRoomInfo = () => {
        if (!currentUser.roomId) return
        
        setIsCheckingRoom(true)
        socket.emit(SocketEvent.ROOM_INFO_REQUEST, { roomId: currentUser.roomId })
    }

    // Socket event listeners for room info
    useEffect(() => {
        const handleRoomInfoResponse = (data: { roomInfo: any }) => {
            setIsCheckingRoom(false)
            console.log('[SettingsView] Room info received:', data.roomInfo);
            
            // Safely process room info with fallbacks for missing fields
            const processedRoomInfo: RoomInfo = {
                room_id: data.roomInfo.room_id,
                room_name: data.roomInfo.room_name,
                owner_name: data.roomInfo.owner_name || "Unknown",
                has_password: data.roomInfo.has_password || false,
                is_active: data.roomInfo.is_active !== undefined ? Boolean(data.roomInfo.is_active) : 
                  (data.roomInfo.status === 1 || data.roomInfo.status === 'active'),
                is_delete: data.roomInfo.is_delete !== undefined ? Boolean(data.roomInfo.is_delete) : false, 
                created_at: data.roomInfo.created_at,
                user_count: data.roomInfo.user_count || 0
            };
            
            console.log('[SettingsView] Processed room info:', processedRoomInfo);
            setRoomInfo(processedRoomInfo);
        }

        const handleError = (data: { message: string }) => {
            setIsCheckingRoom(false)
            console.log('[SettingsView] Room info error:', data.message);
            if (data.message === "Room not found") {
                setRoomInfo(null)
            }
        }

        const handleEditRoomResponse = (data: any) => {
            console.log('[SettingsView] Room edit response received:', data);
            if (data.success && data.roomInfo) {
                // Refresh room info after successful edit
                setRoomInfo(data.roomInfo);
                console.log('[SettingsView] Room info updated from edit response');
            }
        }

        socket.on(SocketEvent.ROOM_INFO_RESPONSE, handleRoomInfoResponse)
        socket.on(SocketEvent.ERROR, handleError)
        socket.on(SocketEvent.EDIT_ROOM_RESPONSE, handleEditRoomResponse)

        return () => {
            socket.off(SocketEvent.ROOM_INFO_RESPONSE, handleRoomInfoResponse)
            socket.off(SocketEvent.ERROR, handleError)
            socket.off(SocketEvent.EDIT_ROOM_RESPONSE, handleEditRoomResponse)
        }
    }, [socket])

    // Apply settings changes to editor in real-time
    useEffect(() => {
        applyFontFamilyToEditor(fontFamily)
    }, [fontFamily])

    useEffect(() => {
        applyFontSizeToEditor(fontSize)
    }, [fontSize])

    const handleRoomUpdate = () => {
        console.log('[SettingsView] Refreshing room info after update');
        checkRoomInfo()
    }

    return (
        <div
            className="flex flex-col items-center gap-4 p-4 overflow-y-auto"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Settings</h1>

            {/* Room Information Section */}
            {currentUser.roomId && (
                <div className="w-full rounded-lg border border-gray-700 bg-darkHover p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Room Information</h3>
                        <button
                            onClick={checkRoomInfo}
                            className="flex items-center gap-2 rounded-md bg-primary/20 px-3 py-1 text-primary hover:bg-primary/30 disabled:opacity-50"
                            disabled={isCheckingRoom}
                        >
                            <svg 
                                className={`h-4 w-4 ${isCheckingRoom ? 'animate-spin' : ''}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reload
                        </button>
                    </div>

                    {isCheckingRoom ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-yellow-400">
                            <div className="h-2 w-2 animate-ping rounded-full bg-yellow-400"></div>
                            Loading room information...
                        </div>
                    ) : roomInfo ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {/* Row 1: Room ID */}
                            <div className="col-span-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Room ID:</span>
                                    <span className="font-mono text-white bg-black/30 px-2 py-1 rounded text-xs">
                                        {roomInfo.room_id}
                                    </span>
                                </div>
                            </div>

                            {/* Row 2: Room Name and Status */}
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400">Room name</span>
                                <span className="text-white font-medium">{roomInfo.room_name}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400">Status</span>
                                <span className={`font-medium ${
                                    roomInfo.is_delete ? "text-red-400" : 
                                    roomInfo.is_active ? "text-green-400" : "text-yellow-400"
                                }`}>
                                    {roomInfo.is_delete ? "Deleted" : 
                                     roomInfo.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {/* Row 3: Password Protection and Created by */}
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400">Password Protected</span>
                                <span className={roomInfo.has_password ? "text-yellow-400 font-medium" : "text-green-400 font-medium"}>
                                    {roomInfo.has_password ? "Yes" : "No"}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400">Created by</span>
                                <span className="text-white font-medium">
                                    {roomInfo.owner_name || "Unknown"}
                                </span>
                            </div>

                            {/* Row 4: Users and Created date */}
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400">Users</span>
                                <span className="text-white font-medium">
                                    {roomInfo.user_count} online
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-400">Created</span>
                                <span className="text-white font-medium">
                                    {new Date(roomInfo.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400">
                            Room information not available 
                        </div>
                    )}
                </div>
            )}

            {/* Room Edit Section - Only show if roomInfo has the required fields */}
            {roomInfo && roomInfo.room_id && (
                <RoomEditSection 
                    roomInfo={roomInfo} 
                    onRoomUpdate={handleRoomUpdate}
                />
            )}

            {/* Editor Settings */}
            <div className="w-full rounded-lg border border-gray-700 bg-darkHover p-4">
                <h3 className="text-lg font-semibold mb-4 text-white">Editor Settings</h3>
                
                <div className="space-y-4">
                    {/* Font Family and Size */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Font Family</label>
                            <select
                                value={fontFamily}
                                onChange={handleFontFamilyChange}
                                className="rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                            >
                                {editorFonts.map((font) => (
                                    <option key={font} value={font}>
                                        {font}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Font Size</label>
                            <select
                                value={fontSize}
                                onChange={handleFontSizeChange}
                                className="rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                            >
                                {[...Array(13).keys()].map((size) => (
                                    <option key={size} value={size + 12}>
                                        {size + 12}px
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    {/* Theme */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400">Theme</label>
                        <select
                            value={theme}
                            onChange={handleThemeChange}
                            className="rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                        >
                            {Object.keys(editorThemes).map((themeName) => (
                                <option key={themeName} value={themeName}>
                                    {themeName}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Language */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400">Language</label>
                        <select
                            value={language}
                            onChange={handleLanguageChange}
                            className="rounded-md border border-gray-600 bg-darkHover px-3 py-2 text-white outline-none focus:border-primary"
                        >
                            {langNames.map((lang) => (
                                <option key={lang} value={lang}>
                                    {lang}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {/* GitHub Corner Toggle */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-white">Show GitHub Corner</label>
                            <span className="text-xs text-gray-400">Display GitHub corner ribbon</span>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                className="peer sr-only"
                                type="checkbox"
                                onChange={handleShowGitHubCornerChange}
                                checked={showGitHubCorner}
                            />
                            <div className="peer h-6 w-12 rounded-full bg-gray-600 outline-none duration-100 after:absolute after:left-1 after:top-1 after:flex after:h-4 after:w-4 after:items-center after:justify-center after:rounded-full after:bg-white after:font-bold after:outline-none after:duration-500 peer-checked:after:translate-x-6 peer-checked:bg-primary peer-focus:outline-none"></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 w-full">
                <button
                    className="flex-1 rounded-md border border-gray-600 bg-darkHover px-4 py-3 text-white outline-none hover:bg-darkHover/80 transition-colors"
                    onClick={applyAllEditorSettings}
                >
                    Apply Settings
                </button>
                <button
                    className="flex-1 rounded-md border-none bg-red-500/20 px-4 py-3 text-red-400 outline-none hover:bg-red-500/30 transition-colors"
                    onClick={resetSettings}
                >
                    Reset to Default
                </button>
            </div>
        </div>
    )
}

export default SettingsView