import axiosInstance from "@/api/pistonApi"
import codeeditorcloudInstance from "@/api/codeeditorcloud"
import { 
    Language, 
    RunContext, 
    CollectedInputs, 
    ServerProcess 
} from "@/types/run"
import { 
    hasVisualizationSupport, 
    requiresInputCollection, 
    hasVisualizationOutput 
} from "@/utils/inputConfig"
import langMap from "lang-map"
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react"
import toast from "react-hot-toast"
import { useFileSystem } from "./FileContext"

const RunCodeContext = createContext<RunContext | null>(null)

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error("useRunCode must be used within a RunCodeContextProvider")
    }
    return context
}

const RunCodeContextProvider = ({ children }: { children: ReactNode }) => {
    const { activeFile } = useFileSystem()
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [supportedLanguages, setSupportedLanguages] = useState<Language[]>([])
    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: "",
        version: "",
        aliases: [],
    })
    const [hasVisualization, setHasVisualization] = useState<boolean>(false)
    const [showInputCollector, setShowInputCollector] = useState<boolean>(false)
    const [collectedInputs, setCollectedInputs] = useState<CollectedInputs>({
        textInputs: {},
        fileInputs: {}
    })
    const [runningServers, setRunningServers] = useState<ServerProcess[]>([])
    const [serverWarning, setServerWarning] = useState<boolean>(false)
    const [isStartingServer, setIsStartingServer] = useState<boolean>(false)
    const [userServerLimit, setUserServerLimit] = useState<number>(5)
    const [userServerCount, setUserServerCount] = useState<number>(0)
    const [autoStopWarning, setAutoStopWarning] = useState<{show: boolean; serverId?: number}>({show: false})

    // Fetch supported languages and initial server list
    useEffect(() => {
        const initializeData = async () => {
            try {
                const languages = await axiosInstance.get("/runtimes")
                setSupportedLanguages(languages.data)
                await fetchRunningServers()
                await fetchUserServers()
            } catch (error: any) {
                toast.error("Failed to initialize run context")
                console.error("Initialization error:", error)
            }
        }

        initializeData()
    }, [])

    // Auto-refresh running servers every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchRunningServers()
            fetchUserServers()
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    // Auto-stop warning system (25 minutes - warning at 25, auto-stop at 30)
    useEffect(() => {
        if (runningServers.length > 0) {
            const autoStopInterval = setInterval(() => {
                runningServers.forEach(server => {
                    const runningTime = Date.now() - (server.started_at * 1000)
                    const twentyFiveMinutes = 25 * 60 * 1000 // 25 minutes
                    const thirtyMinutes = 30 * 60 * 1000 // 30 minutes
                    
                    // Show warning at 25 minutes
                    if (runningTime >= twentyFiveMinutes && runningTime < twentyFiveMinutes + 60000) {
                        setAutoStopWarning({show: true, serverId: server.pid})
                        toast.error(`Server "${server.name}" has been running for 25 minutes. It will auto-stop in 5 minutes if no action is taken.`, {
                            duration: 10000
                        })
                    }
                    
                    // Auto-stop at 30 minutes if no user response
                    if (runningTime >= thirtyMinutes) {
                        handleAutoStop(server.pid)
                    }
                })
            }, 60000) // Check every minute

            return () => clearInterval(autoStopInterval)
        }
    }, [runningServers])

    // Server warning system (general resource warning at 20 minutes)
    useEffect(() => {
        if (runningServers.length > 0 && !serverWarning) {
            const warningInterval = setInterval(() => {
                const longRunningServers = runningServers.filter(server => {
                    const runningTime = Date.now() - (server.started_at * 1000)
                    return runningTime > 20 * 60 * 1000 // 20 minutes
                })
                
                if (longRunningServers.length > 0 && !serverWarning) {
                    setServerWarning(true)
                }
            }, 600000) // Check every 10 minutes

            return () => clearInterval(warningInterval)
        }
    }, [runningServers.length, serverWarning])

    const fetchRunningServers = async (): Promise<void> => {
        try {
            const response = await codeeditorcloudInstance.get("/execute.php?mode=list-servers")
            if (response.data.success) {
                const servers: ServerProcess[] = (response.data.servers || []).map((server: any) => ({
                    pid: server.pid,
                    port: server.port,
                    name: server.name,
                    language: server.language || 'python',
                    started_at: server.started_at || Math.floor(Date.now() / 1000),
                    file: server.file || '',
                    log: server.log || '',
                    runner: server.runner || '',
                    status: server.status || 'running',
                    user_id: server.user_id,
                    auto_stop_at: server.auto_stop_at
                }))
                setRunningServers(servers)
                
                if (response.data.max_servers_per_user) {
                    setUserServerLimit(response.data.max_servers_per_user)
                }
            } else {
                console.error("Failed to fetch servers:", response.data.error)
                setRunningServers([])
            }
        } catch (error) {
            console.error("Failed to fetch running servers:", error)
            setRunningServers([])
        }
    }

    const fetchUserServers = async (): Promise<void> => {
        try {
            const response = await codeeditorcloudInstance.get("/execute.php?mode=user-servers")
            if (response.data.success) {
                setUserServerCount(response.data.count)
            }
        } catch (error) {
            console.error("Failed to fetch user servers:", error)
        }
    }

    const handleAutoStop = async (pid: number): Promise<void> => {
        try {
            await stopServer(pid)
            toast.success("Server auto-stopped after 30 minutes of inactivity")
            setAutoStopWarning({show: false})
        } catch (error) {
            console.error("Auto-stop failed:", error)
        }
    }

    const keepServerRunning = (): void => {
        setAutoStopWarning({show: false})
        toast.success("Server will continue running")
    }

    // Auto-detect language from file extension
    useEffect(() => {
        if (supportedLanguages.length === 0 || !activeFile?.name) return

        const extension = activeFile.name.split(".").pop()
        if (extension) {
            const languageName = langMap.languages(extension)
            const language = supportedLanguages.find(
                (lang) =>
                    lang.aliases.includes(extension) ||
                    languageName.includes(lang.language.toLowerCase()),
            )
            if (language) setSelectedLanguage(language)
        } else {
            setSelectedLanguage({ language: "", version: "", aliases: [] })
        }
    }, [activeFile?.name, supportedLanguages])

    // Check for visualization support
    useEffect(() => {
        if (activeFile?.content && selectedLanguage.language) {
            const hasViz = hasVisualizationSupport(activeFile.content)
            setHasVisualization(hasViz)
        } else {
            setHasVisualization(false)
        }
    }, [activeFile?.content, selectedLanguage.language])

    const showVisualization = (): void => {
        const hasVisualOutput = hasVisualizationOutput(output)

        if (hasVisualOutput) {
            const vizWindow = window.open('', '_blank')
            if (vizWindow) {
                const base64Match = output.match(/data:image\/[^;]+;base64,([^"'\s]+)/)

                vizWindow.document.write(`
                    <html>
                        <head>
                            <title>Code Visualization - ${selectedLanguage.language}</title>
                            <style>
                                body { 
                                    font-family: Arial, sans-serif; 
                                    margin: 20px; 
                                    background: #1e1e1e; 
                                    color: white;
                                }
                                .container { max-width: 1200px; margin: 0 auto; }
                                .output { 
                                    background: #2d2d2d; 
                                    padding: 20px; 
                                    border-radius: 8px; 
                                    margin-top: 20px;
                                    white-space: pre-wrap;
                                }
                                .info-box {
                                    background: #3a3a3a;
                                    padding: 15px;
                                    border-radius: 8px;
                                    margin-bottom: 20px;
                                    border-left: 4px solid #007acc;
                                }
                                .image-container { 
                                    text-align: center; 
                                    margin: 20px 0; 
                                    background: white;
                                    padding: 20px;
                                    border-radius: 8px;
                                }
                                .image-container img { 
                                    max-width: 100%; 
                                    height: auto;
                                    border: 1px solid #ddd;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>Code Visualization - ${selectedLanguage.language}</h1>
                                ${base64Match ?
                        `<div class="image-container">
                                        <img src="data:image/png;base64,${base64Match[1]}" alt="Generated Plot" />
                                    </div>` :
                        `<div class="info-box">
                                        <strong>Visualization Output Detected</strong><br/>
                                        Your code contains visualization commands. The output below may contain plot data or instructions.
                                    </div>
                                    <div class="output">${output}</div>`
                    }
                            </div>
                        </body>
                    </html>
                `)
                vizWindow.document.close()
            }
        } else {
            toast.error("No visualization output found. Make sure your code generates plot data.")
        }
    }

    const submitCollectedInputs = (): void => {
        const combinedInput = Object.values(collectedInputs.textInputs).join('\n')
        setInput(combinedInput)
        setShowInputCollector(false)
        toast.success("Inputs collected successfully")
        executeCode()
    }

    const executeCode = async (): Promise<void> => {
        if (!activeFile) {
            toast.error("No active file to execute")
            return
        }

        setIsRunning(true)
        const loadingToast = toast.loading("Running code...")

        try {
            if (selectedLanguage.language === "python" && Object.keys(collectedInputs.fileInputs).length > 0) {
                const formData = new FormData()
                formData.append('code', activeFile.content || '')
                formData.append('language', 'python')
                formData.append('input', input || '')
                formData.append('timeout', '30')

                Object.entries(collectedInputs.fileInputs).forEach(([key, file]) => {
                    if (file) {
                        formData.append(key, file)
                    }
                })

                const response = await codeeditorcloudInstance.post("/execute.php", formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })

                if (response.data.success) {
                    setOutput(response.data.output)
                } else {
                    setOutput(response.data.error || "Execution failed")
                }
            }
            else if (selectedLanguage.language === "python" || selectedLanguage.aliases.includes("py")) {
                try {
                    const response = await codeeditorcloudInstance.post("/execute.php", {
                        code: activeFile.content,
                        language: "python",
                        input: input,
                        timeout: 30
                    })

                    if (response.data.success) {
                        setOutput(response.data.output)
                    } else {
                        setOutput(response.data.error || "Execution failed")
                    }
                } catch (cloudError: any) {
                    console.warn("code-editor-cloud failed, falling back to piston API:", cloudError.message)

                    const { language, version } = selectedLanguage
                    const response = await axiosInstance.post("/execute", {
                        language,
                        version,
                        files: [{ name: activeFile.name, content: activeFile.content }],
                        stdin: input,
                    })

                    if (response.data.run.stderr) {
                        setOutput(response.data.run.stderr)
                    } else {
                        setOutput(response.data.run.stdout)
                    }
                }
            } else {
                const { language, version } = selectedLanguage
                const response = await axiosInstance.post("/execute", {
                    language,
                    version,
                    files: [{ name: activeFile.name, content: activeFile.content }],
                    stdin: input,
                })

                if (response.data.run.stderr) {
                    setOutput(response.data.run.stderr)
                } else {
                    setOutput(response.data.run.stdout)
                }
            }

            setIsRunning(false)
            toast.dismiss(loadingToast)
            toast.success("Code executed successfully")
        } catch (error: any) {
            console.error("Execution error:", error.response?.data || error.message)
            setIsRunning(false)
            toast.dismiss(loadingToast)
            toast.error("Failed to run the code")
        }
    }

    const runCode = async (): Promise<void> => {
        try {
            if (!selectedLanguage.language) {
                toast.error("Please select a language to run the code")
                return
            } else if (!activeFile) {
                toast.error("Please open a file to run the code")
                return
            }

            const needsInput = requiresInputCollection(selectedLanguage.language, activeFile.content || '')

            if (needsInput) {
                setShowInputCollector(true)
                return
            }

            setIsRunning(true)
            await executeCode()
        } catch (error: any) {
            console.error("Execution error:", error.response?.data || error.message)
            setIsRunning(false)
            toast.dismiss()
            toast.error("Failed to run the code")
        }
    }

    const startServer = async (serverName: string): Promise<any> => {
        if (!activeFile) {
            toast.error("No active file to run as server")
            return null
        }

        if (!serverName.trim()) {
            toast.error("Please enter a server name")
            return null
        }

        // Check server limit before starting
        if (userServerCount >= userServerLimit) {
            toast.error(`You have reached the maximum limit of ${userServerLimit} servers. Please stop some servers before starting new ones.`)
            return null
        }

        setIsStartingServer(true)
        const loadingToast = toast.loading(`Starting server "${serverName}"...`)

        try {
            const response = await codeeditorcloudInstance.post(
                "/execute.php?mode=start-server",
                {
                    code: activeFile.content,
                    language: selectedLanguage.language,
                    name: serverName
                }
            )

            toast.dismiss(loadingToast)

            if (response.data.success) {
                const serverData: ServerProcess = {
                    pid: response.data.pid,
                    port: response.data.port,
                    name: response.data.name,
                    language: selectedLanguage.language,
                    started_at: response.data.started_at || Math.floor(Date.now() / 1000),
                    status: 'running',
                    file: response.data.file || '',
                    log: response.data.log || '',
                    runner: response.data.runner || '',
                    user_id: response.data.user_id,
                    auto_stop_at: response.data.auto_stop_at
                }

                toast.success(`Server "${serverName}" started on port ${response.data.port}. Auto-stops in 30 minutes.`)

                setRunningServers(prev => [...prev, serverData])
                setUserServerCount(prev => prev + 1)
                await fetchRunningServers()

                setIsStartingServer(false)
                return response.data
            } else {
                toast.error(response.data.error || "Failed to start server")
                setIsStartingServer(false)
                return null
            }
        } catch (error: any) {
            console.error("Server start error:", error)
            toast.dismiss(loadingToast)
            toast.error("Failed to start server: " + (error.response?.data?.error || error.message))
            setIsStartingServer(false)
            return null
        }
    }

    const stopServer = async (pid: number): Promise<void> => {
        try {
            const response = await codeeditorcloudInstance.post("/execute.php?mode=stop", {
                pid: pid
            })

            if (response.data.success) {
                toast.success("Server stopped successfully")
                setRunningServers(prev => prev.filter(server => server.pid !== pid))
                setUserServerCount(prev => Math.max(0, prev - 1))
                setAutoStopWarning({show: false})
                fetchRunningServers()
            } else {
                toast.error(response.data.error || "Failed to stop server")
            }
        } catch (error: any) {
            console.error("Server stop error:", error)
            toast.error("Failed to stop server")
        }
    }

    const viewServerLogs = async (pid: number): Promise<string | null> => {
        try {
            const response = await codeeditorcloudInstance.post("/execute.php?mode=logs", {
                pid: pid
            })

            if (response.data.success) {
                return response.data.log
            } else {
                toast.error(response.data.error || "Failed to fetch logs")
                return null
            }
        } catch (error: any) {
            console.error("Log fetch error:", error)
            toast.error("Failed to fetch logs")
            return null
        }
    }

    const acknowledgeServerWarning = (): void => {
        setServerWarning(false)
    }

    const getRemainingTime = (autoStopAt: number): string => {
        const now = Math.floor(Date.now() / 1000)
        const remaining = autoStopAt - now
        if (remaining <= 0) return "Expired"
        
        const hours = Math.floor(remaining / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)
        return `${hours}h ${minutes}m`
    }

    const getRunningTime = (startedAt: number): string => {
        const now = Math.floor(Date.now() / 1000)
        const running = now - startedAt
        
        const minutes = Math.floor(running / 60)
        const hours = Math.floor(minutes / 60)
        const remainingMinutes = minutes % 60
        
        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`
        }
        return `${minutes}m`
    }

    const contextValue: RunContext = {
        setInput,
        output,
        isRunning,
        supportedLanguages,
        selectedLanguage,
        setSelectedLanguage,
        runCode,
        hasVisualization,
        showVisualization,
        showInputCollector,
        setShowInputCollector,
        collectedInputs,
        setCollectedInputs,
        submitCollectedInputs,
        executeCode,
        runningServers,
        startServer,
        stopServer,
        viewServerLogs,
        fetchRunningServers,
        serverWarning,
        acknowledgeServerWarning,
        isStartingServer,
        userServerCount,
        userServerLimit,
        getRemainingTime,
        getRunningTime,
        autoStopWarning,
        keepServerRunning
    }

    return (
        <RunCodeContext.Provider value={contextValue}>
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }