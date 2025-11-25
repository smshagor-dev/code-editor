export interface Language {
    language: string
    version: string
    aliases: string[]
}

export interface ServerProcess {
    pid: number
    port: number
    name: string
    language: string
    log: string
    started_at: number
    file: string
    runner?: string
    status?: string
    user_id?: string
    auto_stop_at?: number
}

export interface CollectedInputs {
    textInputs: { [key: string]: string }
    fileInputs: { [key: string]: File | null }
}

export interface InputField {
    id: string
    label: string
    type: 'text' | 'number' | 'file'
    required: boolean
    accept?: string
}

export interface RunContext {
    setInput: (input: string) => void
    output: string
    isRunning: boolean
    supportedLanguages: Language[]
    selectedLanguage: Language
    setSelectedLanguage: (language: Language) => void
    runCode: () => void
    hasVisualization: boolean
    showVisualization: () => void
    showInputCollector: boolean
    setShowInputCollector: (show: boolean) => void
    collectedInputs: CollectedInputs
    setCollectedInputs: (inputs: CollectedInputs | ((prev: CollectedInputs) => CollectedInputs)) => void
    submitCollectedInputs: () => void
    executeCode: () => void
    // Server management
    runningServers: ServerProcess[]
    startServer: (serverName: string) => Promise<any>
    stopServer: (pid: number) => Promise<void>
    viewServerLogs: (pid: number) => Promise<string | null>
    fetchRunningServers: () => void
    serverWarning: boolean
    acknowledgeServerWarning: () => void
    isStartingServer: boolean
    userServerCount: number
    userServerLimit: number
    getRemainingTime: (autoStopAt: number) => string
    getRunningTime: (startedAt: number) => string
    autoStopWarning: {show: boolean; serverId?: number}
    keepServerRunning: () => void
}