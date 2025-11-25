import { useRunCode } from "@/context/RunCodeContext"
import { ServerProcess } from "@/types/run"
import { useState } from "react"
import toast from "react-hot-toast"
import {
    LuX,
    LuPlay,
    LuSquare,
    LuFileText,
    LuExternalLink,
    LuHardDrive,
    LuClock
} from "react-icons/lu"

interface ServerManagerProps {
    onClose: () => void
    serverName: string
    setServerName: (name: string) => void
}

function ServerManager({ onClose, serverName, setServerName }: ServerManagerProps) {
    const {
        runningServers,
        startServer,
        stopServer,
        viewServerLogs,
        fetchRunningServers,
        userServerCount,
        userServerLimit,
        getRemainingTime
    } = useRunCode()

    const [showLogs, setShowLogs] = useState<{ [key: number]: string }>({})

    const handleStartServer = async (): Promise<void> => {
        if (!serverName.trim()) {
            toast.error("Please enter a server name")
            return
        }

        if (userServerCount >= userServerLimit) {
            toast.error(`You have reached the maximum limit of ${userServerLimit} servers. Please stop some servers before starting new ones.`)
            return
        }

        const result = await startServer(serverName)
        if (result) {
            setServerName("")
            toast.success(`Server "${serverName}" started successfully`)
        }
    }

    const handleStopServer = async (pid: number, name: string): Promise<void> => {
        await stopServer(pid)
        toast.success(`Server "${name}" stopped`)
    }

    const handleViewLogs = async (pid: number): Promise<void> => {
        const logs = await viewServerLogs(pid)
        if (logs) {
            setShowLogs(prev => ({
                ...prev,
                [pid]: logs
            }))
        }
    }

    const formatTime = (timestamp: number): string => {
        return new Date(timestamp * 1000).toLocaleString()
    }

    const openServerUrl = (port: number): void => {
        window.open(`http://cloud.code-editor.ru:${port}`, '_blank')
    }

    const closeLogs = (pid: number): void => {
        setShowLogs(prev => {
            const newLogs = { ...prev }
            delete newLogs[pid]
            return newLogs
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="relative w-full max-w-6xl rounded-lg bg-darkHover p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Server Manager</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {userServerCount}/{userServerLimit} servers used • Auto-stops after 6 hours
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-white hover:bg-gray-700 transition-colors"
                        aria-label="Close server manager"
                    >
                        <LuX size={24} />
                    </button>
                </div>

                {/* Start New Server Section */}
                <div className="mb-8 rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-3 text-lg font-semibold text-white">Start New Server</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter server name..."
                            value={serverName}
                            onChange={(e) => setServerName(e.target.value)}
                            className="flex-1 rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none placeholder-gray-400"
                            maxLength={50}
                        />
                        <button
                            onClick={handleStartServer}
                            disabled={userServerCount >= userServerLimit}
                            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LuPlay size={18} />
                            Start Server
                        </button>
                    </div>
                    {userServerCount >= userServerLimit && (
                        <p className="text-red-400 text-sm mt-2">
                            Server limit reached. Stop existing servers to start new ones.
                        </p>
                    )}
                </div>

                {/* Running Servers Section */}
                <div className="rounded-lg bg-gray-800 p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                            Running Servers ({runningServers.length})
                        </h3>
                        <button
                            onClick={fetchRunningServers}
                            className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 transition-colors text-sm"
                        >
                            Refresh
                        </button>
                    </div>

                    {runningServers.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <LuHardDrive size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No servers running</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {runningServers.map((server: ServerProcess) => (
                                <div key={server.pid} className="rounded-md bg-darkHover p-4">
                                    {/* Server Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-white text-lg">
                                                    {server.name}
                                                </h4>
                                                {server.auto_stop_at && (
                                                    <div className="flex items-center gap-1 bg-orange-600 text-white px-2 py-1 rounded text-xs">
                                                        <LuClock size={12} />
                                                        {getRemainingTime(server.auto_stop_at)}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                Started: {formatTime(server.started_at)}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                PID: {server.pid} | Port: {server.port} | Language: {server.language}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                                                PID: {server.pid}
                                            </span>
                                            <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                                                Port: {server.port}
                                            </span>
                                            <span className="bg-purple-600 text-white px-2 py-1 rounded text-sm">
                                                {server.language}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openServerUrl(server.port)}
                                            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 transition-colors text-sm"
                                        >
                                            <LuExternalLink size={16} />
                                            Open
                                        </button>
                                        <button
                                            onClick={() => handleViewLogs(server.pid)}
                                            className="flex items-center gap-2 rounded-md bg-yellow-600 px-3 py-2 text-white hover:bg-yellow-700 transition-colors text-sm"
                                        >
                                            <LuFileText size={16} />
                                            View Logs
                                        </button>
                                        <button
                                            onClick={() => handleStopServer(server.pid, server.name)}
                                            className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-700 transition-colors text-sm"
                                        >
                                            <LuSquare size={16} />
                                            Stop
                                        </button>
                                    </div>

                                    {/* Logs Display */}
                                    {showLogs[server.pid] && (
                                        <div className="mt-3 rounded-md bg-black p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-semibold text-white">
                                                    Server Logs - {server.name}
                                                </span>
                                                <button
                                                    onClick={() => closeLogs(server.pid)}
                                                    className="text-gray-400 hover:text-white transition-colors"
                                                    aria-label="Close logs"
                                                >
                                                    <LuX size={16} />
                                                </button>
                                            </div>
                                            <pre className="text-xs text-green-400 overflow-x-auto max-h-40 whitespace-pre-wrap">
                                                {showLogs[server.pid]}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ServerManager