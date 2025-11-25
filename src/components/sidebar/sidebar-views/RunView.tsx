import { useRunCode } from "@/context/RunCodeContext"
import useResponsive from "@/hooks/useResponsive"
import { ChangeEvent, useState, useEffect } from "react"
import toast from "react-hot-toast"
import {
    LuCopy,
    LuX,
    LuEye,
    LuChartBar,
    LuRefreshCw,
    LuHardDrive,
    LuPlay,
    LuSquare,
    LuClock,
    LuExternalLink
} from "react-icons/lu"
import { PiCaretDownBold } from "react-icons/pi"
import InputCollector from "../../InputCollector"
import ServerManager from "../../ServerManager"
import { useFileSystem } from "../../../context/FileContext"

function RunView() {
    const { viewHeight } = useResponsive()
    const {
        setInput,
        output,
        isRunning,
        supportedLanguages,
        selectedLanguage,
        setSelectedLanguage,
        runCode,
        hasVisualization,
        showVisualization,
        startServer,
        stopServer,
        runningServers,
        serverWarning,
        acknowledgeServerWarning,
        isStartingServer,
        userServerCount,
        userServerLimit,
        getRunningTime,
        autoStopWarning,
        keepServerRunning
    } = useRunCode()

    const [showOutputPopup, setShowOutputPopup] = useState(false)
    const [showServerManager, setShowServerManager] = useState(false)
    const [serverName, setServerName] = useState("")

    // Auto-generate server name from active file
    const { activeFile } = useFileSystem()
    useEffect(() => {
        if (activeFile?.name && !serverName) {
            const fileName = activeFile.name.replace(/\.[^/.]+$/, "") 
            const cleanName = fileName
                .replace(/[^a-zA-Z0-9_-]/g, '-') 
                .replace(/-+/g, '-') 
                .replace(/^-|-$/g, '')
                .toLowerCase()
                .slice(0, 30);
            
            if (cleanName) {
                setServerName(cleanName)
            }
        }
    }, [activeFile?.name, serverName])

    // Check if current language supports servers (Python with Flask or Telegram bot)
    // const shouldShowServerUI = (): boolean => {
    //     if (!selectedLanguage) return false
        
    //     const isPython = selectedLanguage.language?.toLowerCase() === 'python'
    //     const isFlask = selectedLanguage.language?.toLowerCase() === 'flask'
    //     const isTelegramBot = selectedLanguage.language?.toLowerCase() === 'telegram bot'
        
    //     return isPython || isFlask || isTelegramBot
    // }

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>): void => {
        try {
            const lang = JSON.parse(e.target.value)
            setSelectedLanguage(lang)
        } catch (error) {
            console.error("Invalid language selection:", error)
            toast.error("Invalid language selection")
        }
    }

    // Filter out base64 image data from output
    const filterOutput = (text: string): string => {
        return text.replace(/\s*data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '')
            .replace(/\s*data:image\/png;[^\n]*/g, '')
            .trim();
    }

    const copyOutput = (): void => {
        navigator.clipboard.writeText(filterOutput(output))
        toast.success("Output copied to clipboard")
    }

    const handleRunCode = async (): Promise<void> => {
        setShowOutputPopup(true)
        await runCode()
    }

    const handleReRunCode = async (): Promise<void> => {
        await runCode()
    }

    const handleStartServer = async (): Promise<void> => {
        if (!serverName.trim()) {
            toast.error("Please enter a server name")
            return
        }
        
        // Validate server name format
        if (!/^[a-zA-Z0-9_-]{1,50}$/.test(serverName)) {
            toast.error("Server name can only contain letters, numbers, hyphens, and underscores (max 50 characters)")
            return
        }
        
        // Check server limit
        if (userServerCount >= userServerLimit) {
            toast.error(`You have reached the maximum limit of ${userServerLimit} servers. Please stop some servers before starting new ones.`)
            return
        }
        
        const result = await startServer(serverName)
        if (result) {
            toast.success(`Server "${serverName}" started successfully!`)
        }
    }

    const handleStopServer = async (pid: number, name: string): Promise<void> => {
        await stopServer(pid)
        toast.success(`Server "${name}" stopped`)
    }

    const openServerUrl = (port: number): void => {
        window.open(`http://cloud.code-editor.ru:${port}`, '_blank')
    }

    const displayOutput = filterOutput(output);

    // Find server for auto-stop warning
    const warningServer = autoStopWarning.serverId 
        ? runningServers.find(server => server.pid === autoStopWarning.serverId)
        : null;

    // const showServerUI = shouldShowServerUI();

    return (
        <>
            <div
                className="flex flex-col items-center gap-2 p-4"
                style={{ height: viewHeight }}
            >
                <h1 className="view-title">Run Code</h1>

                {/* Auto-Stop Warning Banner */}
                {autoStopWarning.show && warningServer && (
                    <div className="w-full bg-red-600 border border-red-400 rounded-md p-3 mb-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <LuClock className="text-red-200" size={20} />
                                <span className="text-white font-semibold">
                                    Server Auto-Stop Warning
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={keepServerRunning}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded text-sm transition-colors"
                                >
                                    <LuPlay size={14} />
                                    Keep Running
                                </button>
                                <button
                                    onClick={() => handleStopServer(warningServer.pid, warningServer.name)}
                                    className="flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white px-3 py-2 rounded text-sm transition-colors"
                                >
                                    <LuSquare size={14} />
                                    Stop Server
                                </button>
                            </div>
                        </div>
                        <p className="text-red-100 text-sm mt-1">
                            Server "{warningServer.name}" has been running for 25 minutes. It will auto-stop in 5 minutes if no action is taken.
                        </p>
                    </div>
                )}

                {/* Server Warning Banner */}
                {serverWarning && (
                    <div className="w-full bg-yellow-600 border border-yellow-400 rounded-md p-3 mb-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <LuHardDrive className="text-yellow-200" size={20} />
                                <span className="text-white font-semibold">
                                    Server Running - Resource Usage Warning
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleStartServer}
                                    disabled={isStartingServer || !serverName.trim() || userServerCount >= userServerLimit}
                                    className="flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {isStartingServer ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Starting...
                                        </>
                                    ) : (
                                        <>
                                            <LuPlay size={14} />
                                            Start New
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={acknowledgeServerWarning}
                                    className="bg-yellow-500 hover:bg-yellow-400 text-white px-3 py-2 rounded text-sm transition-colors"
                                >
                                    Keep Running
                                </button>
                                <button
                                    onClick={() => setShowServerManager(true)}
                                    className="bg-red-500 hover:bg-red-400 text-white px-3 py-2 rounded text-sm transition-colors"
                                >
                                    Manage Servers
                                </button>
                            </div>
                        </div>
                        <p className="text-yellow-100 text-sm mt-1">
                            Your servers have been running for 20+ minutes. Please stop unused servers to conserve resources.
                        </p>
                    </div>
                )}

                {/* Running Servers Quick View */}
                {runningServers.length > 0 && (
                    <div className="w-full bg-gray-800 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <LuHardDrive size={20} />
                                Running Servers ({runningServers.length})
                            </h3>
                            <button
                                onClick={() => setShowServerManager(true)}
                                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                            >
                                View All
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {runningServers.slice(0, 3).map((server) => (
                                <div key={server.pid} className="bg-darkHover rounded-md p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold text-white text-sm">{server.name}</h4>
                                            <p className="text-xs text-gray-400">
                                                <a 
                                                    href={`http://cloud.code-editor.ru:${server.port}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-400 hover:text-blue-300"
                                                >
                                                    http://cloud.code-editor.ru:{server.port}
                                                </a>
                                            </p>
                                            <p className="text-xs text-gray-500">Running: {getRunningTime(server.started_at)}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            getRunningTime(server.started_at).includes('h') 
                                                ? 'bg-orange-600 text-white' 
                                                : 'bg-green-600 text-white'
                                        }`}>
                                            {getRunningTime(server.started_at)}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openServerUrl(server.port)}
                                            className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs transition-colors"
                                            title="Open Server"
                                        >
                                            <LuExternalLink size={12} />
                                            Open
                                        </button>
                                        <button
                                            onClick={() => handleStopServer(server.pid, server.name)}
                                            className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs transition-colors"
                                            title="Stop Server"
                                        >
                                            <LuSquare size={12} />
                                            Stop
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {runningServers.length > 3 && (
                            <p className="text-gray-400 text-xs mt-2 text-center">
                                +{runningServers.length - 3} more servers running
                            </p>
                        )}
                    </div>
                )}

                <div className="flex h-[90%] w-full flex-col items-end gap-2 md:h-[92%]">
                    {/* Language Selector */}
                    <div className="relative w-full">
                        <select
                            className="w-full rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none appearance-none cursor-pointer"
                            value={JSON.stringify(selectedLanguage)}
                            onChange={handleLanguageChange}
                            disabled={isRunning}
                        >
                            {supportedLanguages
                                .sort((a, b) => (a.language > b.language ? 1 : -1))
                                .map((lang, i) => (
                                    <option
                                        key={i}
                                        value={JSON.stringify(lang)}
                                    >
                                        {lang.language +
                                            (lang.version
                                                ? ` (${lang.version})`
                                                : "")}
                                    </option>
                                ))}
                        </select>
                        <PiCaretDownBold
                            size={16}
                            className="absolute bottom-3 right-4 z-10 text-white pointer-events-none"
                        />
                    </div>

                    {/* Input Textarea */}
                    <textarea
                        className="min-h-[120px] w-full resize-none rounded-md border-none bg-darkHover p-2 text-white outline-none placeholder-gray-400"
                        placeholder="Write your input here..."
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isRunning}
                    />

                    {/* Server Name Input for Server Mode - Only show for Python/Flask/Telegram Bot */}
                    {/* {showServerUI && (
                        <div className="w-full flex flex-col sm:flex-row gap-2">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Server name (e.g., my-server)"
                                    value={serverName}
                                    onChange={(e) => setServerName(e.target.value)}
                                    className="w-full rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none placeholder-gray-400"
                                    maxLength={50}
                                    disabled={isStartingServer}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {userServerCount}/{userServerLimit} servers used • Auto-stops after 30 minutes
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleStartServer}
                                    disabled={isStartingServer || !serverName.trim() || userServerCount >= userServerLimit}
                                    className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 min-w-[120px] justify-center"
                                >
                                    {isStartingServer ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Starting...
                                        </>
                                    ) : (
                                        <>
                                            <LuPlay size={16} />
                                            Start Server
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowServerManager(true)}
                                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                                >
                                    <LuHardDrive size={16} />
                                    Manage ({runningServers.length})
                                </button>
                            </div>
                        </div>
                    )} */}

                    {/* Run Button */}
                    <div className="flex w-full gap-2">
                        <button
                            className="flex flex-1 justify-center items-center gap-2 rounded-md bg-primary p-2 font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/90 transition-colors"
                            onClick={handleRunCode}
                            disabled={isRunning}
                        >
                            {isRunning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    Running...
                                </>
                            ) : (
                                "Run Code"
                            )}
                        </button>
                    </div>

                    {/* Output Header with Actions */}
                    <div className="flex w-full items-center justify-between">
                        <label className="text-white font-medium">Output:</label>
                        <div className="flex gap-2">
                            {hasVisualization && (
                                <button
                                    onClick={showVisualization}
                                    className="flex items-center gap-1 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    title="Show Visualization"
                                    disabled={!output}
                                >
                                    <LuChartBar size={18} />
                                </button>
                            )}
                            {displayOutput && (
                                <button
                                    onClick={() => setShowOutputPopup(true)}
                                    className="flex items-center gap-1 p-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                                    title="Open Output in Popup"
                                >
                                    <LuEye size={18} />
                                </button>
                            )}
                            {displayOutput && (
                                <button
                                    onClick={copyOutput}
                                    className="flex items-center gap-1 p-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                                    title="Copy Output"
                                >
                                    <LuCopy size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Output Display */}
                    <div className="w-full flex-grow resize-none overflow-y-auto rounded-md border-none bg-darkHover p-2 text-white outline-none">
                        <code>
                            <pre className="text-wrap whitespace-pre-wrap break-words">
                                {displayOutput || "Run Code to see the Output"}
                            </pre>
                        </code>
                    </div>
                </div>
            </div>

            {/* Input Collector Popup */}
            <InputCollector />

            {/* Server Manager Popup */}
            {showServerManager && (
                <ServerManager
                    onClose={() => setShowServerManager(false)}
                    serverName={serverName}
                    setServerName={setServerName}
                />
            )}

            {/* Output Popup */}
            {showOutputPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="relative w-full max-w-4xl rounded-lg bg-darkHover p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                {isRunning ? "Running Code..." : "Code Execution Result"}
                            </h2>
                            <button
                                onClick={() => setShowOutputPopup(false)}
                                className="rounded-full p-1 text-white hover:bg-gray-700 transition-colors"
                                disabled={isRunning}
                                aria-label="Close output popup"
                            >
                                <LuX size={24} />
                            </button>
                        </div>

                        {isRunning ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </div>
                                <p className="mt-4 text-lg text-white font-semibold">Executing your code...</p>
                                <p className="mt-2 text-sm text-gray-400">Please wait while we run your {selectedLanguage?.language} code</p>

                                <div className="mt-6 flex space-x-2">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="max-h-[60vh] overflow-y-auto rounded-md bg-darkHover p-4">
                                    <code>
                                        <pre className="whitespace-pre-wrap break-words text-white">
                                            {displayOutput || "No output available Click Visualization to view Photo"}
                                        </pre>
                                    </code>
                                </div>

                                <div className="mt-4 flex justify-between items-center">
                                    <div className="flex gap-2">
                                        {hasVisualization && (
                                            <button
                                                onClick={showVisualization}
                                                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                                                title="Show Visualization"
                                                disabled={!output}
                                            >
                                                <LuChartBar size={18} />
                                                <span>Visualization</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleReRunCode}
                                            className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                                            title="Run again with same inputs"
                                        >
                                            <LuRefreshCw size={16} />
                                            Re-run
                                        </button>
                                        <button
                                            onClick={copyOutput}
                                            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-bold text-black transition-colors hover:bg-primary/90"
                                        >
                                            <LuCopy size={16} />
                                            Copy Output
                                        </button>
                                        <button
                                            onClick={() => setShowOutputPopup(false)}
                                            className="rounded-md bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default RunView