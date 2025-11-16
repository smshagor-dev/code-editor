import axiosInstance from "@/api/pistonApi"
import codeeditorcloudInstance from "@/api/codeeditorcloud"
import { Language, RunContext as RunContextType } from "@/types/run"
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

const RunCodeContext = createContext<RunContextType | null>(null)

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error(
            "useRunCode must be used within a RunCodeContextProvider",
        )
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

    useEffect(() => {
        const fetchSupportedLanguages = async () => {
            try {
                const languages = await axiosInstance.get("/runtimes")
                setSupportedLanguages(languages.data)
            } catch (error: any) {
                toast.error("Failed to fetch supported languages")
                if (error?.response?.data) console.error(error?.response?.data)
            }
        }

        fetchSupportedLanguages()
    }, [])

    // Set the selected language based on the file extension
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
        } else setSelectedLanguage({ language: "", version: "", aliases: [] })
    }, [activeFile?.name, supportedLanguages])

    const runCode = async () => {
        try {
            if (!selectedLanguage) {
                return toast.error("Please select a language to run the code")
            } else if (!activeFile) {
                return toast.error("Please open a file to run the code")
            } else {
                toast.loading("Running code...")
            }

            setIsRunning(true)

            // Try your backend first for Python, fallback to piston API
            if (selectedLanguage.language === "python" || selectedLanguage.aliases.includes("py")) {
                try {
                    console.log("Trying code-editor-cloud for Python execution")
                    const response = await codeeditorcloudInstance.post("/execute.php", {
                        code: activeFile.content,
                        language: "python",
                        input: input
                    })

                    if (response.data.success) {
                        setOutput(response.data.output)
                        console.log("Successfully executed using code-editor-cloud")
                    } else {
                        setOutput(response.data.error || "Execution failed")
                        console.log("code-editor-cloud returned error")
                    }
                } catch (cloudError: any) {
                    console.warn("code-editor-cloud failed, falling back to piston API:", cloudError.message)
                    
                    // Fallback to piston API
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
                // For non-Python languages, use piston API directly
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
            toast.dismiss()
            toast.success("Code executed successfully")
        } catch (error: any) {
            console.error("Execution error:", error.response?.data || error.message)
            setIsRunning(false)
            toast.dismiss()
            toast.error("Failed to run the code")
        }
    }

    return (
        <RunCodeContext.Provider
            value={{
                setInput,
                output,
                isRunning,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }