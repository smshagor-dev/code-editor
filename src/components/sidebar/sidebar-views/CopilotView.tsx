import { useCopilot } from "@/context/CopilotContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import { useState, useRef, useEffect } from "react"
import toast from "react-hot-toast"
import { LuClipboardPaste, LuCopy, LuRepeat, LuSend } from "react-icons/lu"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"
import { generateWithDeepSeek as generateWithDeepSeekAPI } from "@/api/deepseek"

type TabType = 'deepseek' | 'copilot'

function CopilotView() {
    const {socket} = useSocket()
    const { viewHeight } = useResponsive()
    const { generateCode, output, isRunning, input, setInput } = useCopilot() 
    const { activeFile, updateFileContent, setActiveFile } = useFileSystem()
    const [activeTab, setActiveTab] = useState<TabType>('deepseek')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    
    // DeepSeek state
    const [deepseekInput, setDeepseekInput] = useState('')
    const [deepseekOutput, setDeepseekOutput] = useState('')
    const [isDeepseekLoading, setIsDeepseekLoading] = useState(false)

    // Helper functions declared before use
    const getCurrentInput = () => {
        switch (activeTab) {
            case 'copilot': return input 
            case 'deepseek': return deepseekInput
            default: return ''
        }
    }

    const getCurrentOutput = () => {
        switch (activeTab) {
            case 'copilot': return output
            case 'deepseek': return deepseekOutput
            default: return ''
        }
    }

    const getCurrentLoading = () => {
        switch (activeTab) {
            case 'copilot': return isRunning
            case 'deepseek': return isDeepseekLoading
            default: return false
        }
    }

    const getButtonText = () => {
        const baseText = {
            'copilot': 'Generate Code',
            'deepseek': 'Generate with DeepSeek'
        }[activeTab]

        return getCurrentLoading() ? `Generating...` : baseText
    }

    const getButtonColor = () => {
        switch (activeTab) {
            case 'copilot': return 'bg-primary'
            case 'deepseek': return 'bg-purple-600'
            default: return 'bg-primary'
        }
    }

    const getPlaceholderText = () => {
        switch (activeTab) {
            case 'copilot': return "What code do you want to generate? (Press Enter to send)"
            case 'deepseek': return "Ask DeepSeek to generate code... (Press Enter to send)"
            default: return "Enter your prompt..."
        }
    }

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }, [getCurrentInput()])

    // DeepSeek Functions
    const generateWithDeepSeek = async () => {
        if (!deepseekInput.trim()) {
            toast.error("Please enter a prompt for DeepSeek")
            return
        }

        setIsDeepseekLoading(true)
        try {
            const response = await generateWithDeepSeekAPI(deepseekInput)
            setDeepseekOutput(response)
            setDeepseekInput('') // Clear input after send
            toast.success("DeepSeek response generated!")
        } catch (error: any) {
            console.error("Error generating with DeepSeek:", error)
            
            if (error?.message?.includes('region') || error?.response?.status === 403) {
                toast.error("DeepSeek API is not available in your region")
                setDeepseekOutput("Error: DeepSeek API is not available in your region. Please try using a different service or check your region restrictions.")
            } else {
                toast.error("Failed to generate code with DeepSeek")
                setDeepseekOutput("Error: Unable to generate code. Please try again.")
            }
        } finally {
            setIsDeepseekLoading(false)
        }
    }

    // Copilot function with input clearing
    const handleCopilotGenerate = () => {
        if (!input.trim()) {
            toast.error("Please enter a prompt for Copilot")
            return
        }
        generateCode()
        setInput('') // Clear input after send
    }

    const handleGenerate = () => {
        switch (activeTab) {
            case 'copilot': handleCopilotGenerate(); break
            case 'deepseek': generateWithDeepSeek(); break
        }
    }

    const handleInputChange = (value: string) => {
        switch (activeTab) {
            case 'copilot': setInput(value); break
            case 'deepseek': setDeepseekInput(value); break
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            const currentInput = getCurrentInput()
            if (!getCurrentLoading() && currentInput.trim()) {
                handleGenerate()
            }
        }
    }

    const copyOutput = async () => {
        const content = getCurrentOutput()
        if (!content) return
        
        try {
            const cleanedContent = content.replace(/```[\w]*\n?/g, "").trim()
            await navigator.clipboard.writeText(cleanedContent)
            toast.success("Output copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy output to clipboard")
            console.log(error)
        }
    }

    const pasteCodeInFile = () => {
        const content = getCurrentOutput()
        if (!content || !activeFile) return

        const fileContent = activeFile.content
            ? `${activeFile.content}\n`
            : ""
        const cleanedContent = `${fileContent}${content.replace(/```[\w]*\n?/g, "").trim()}`
        updateFileContent(activeFile.id, cleanedContent)
        setActiveFile({ ...activeFile, content: cleanedContent })
        toast.success("Code pasted successfully")
        socket.emit(SocketEvent.FILE_UPDATED, {
            fileId: activeFile.id,
            newContent: cleanedContent,
        })
    }

    const replaceCodeInFile = () => {
        const content = getCurrentOutput()
        if (!content || !activeFile) return

        const isConfirmed = confirm(
            `Are you sure you want to replace the code in the file?`,
        )
        if (!isConfirmed) return
        
        const cleanedContent = content.replace(/```[\w]*\n?/g, "").trim()
        updateFileContent(activeFile.id, cleanedContent)
        setActiveFile({ ...activeFile, content: cleanedContent })
        toast.success("Code replaced successfully")
        socket.emit(SocketEvent.FILE_UPDATED, {
            fileId: activeFile.id,
            newContent: cleanedContent,
        })
    }

    // SVG Icons for tabs - Actual logos
    const DeepSeekIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <path d="M12 8l-4 4 4 4 4-4-4-4zm0 6l-2-2 2-2 2 2-2 2z"/>
        </svg>
    )

    const CopilotIcon = () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            <circle cx="9" cy="9" r="1.5"/>
            <circle cx="15" cy="9" r="1.5"/>
            <path d="M8 16h8v1.5H8z"/>
        </svg>
    )

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">AI Assistant</h1>
            
            {/* 3D Tab Navigation */}
            <div className="flex border-b border-gray-600 gap-2 relative">
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gray-700 z-0"></div>
                {(['deepseek', 'copilot'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        className={`px-6 py-3 font-medium transition-all duration-300 capitalize flex items-center relative z-10
                            ${activeTab === tab 
                                ? `transform translate-y-0 
                                   ${tab === 'copilot' 
                                       ? 'bg-primary text-white shadow-lg border-t-2 border-l-2 border-r-2 border-primary rounded-t-lg' 
                                       : 'bg-purple-600 text-white shadow-lg border-t-2 border-l-2 border-r-2 border-purple-500 rounded-t-lg'
                                   }` 
                                : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-t-lg border-t border-l border-r border-gray-600 transform translate-y-1 shadow-md'
                            }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'copilot' ? <CopilotIcon /> : <DeepSeekIcon />}
                        {tab === 'deepseek' ? 'DeepSeek' : 'Copilot'}
                    </button>
                ))}
            </div>

            {/* Larger Input Area */}
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    className="min-h-[150px] max-h-[300px] w-full rounded-lg border-2 border-gray-600 bg-darkHover p-4 text-white outline-none pr-12 resize-none text-lg leading-relaxed focus:border-primary transition-colors"
                    placeholder={getPlaceholderText()}
                    value={getCurrentInput()}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows={4}
                />
                <button
                    className={`absolute right-3 bottom-3 p-2 rounded-lg text-white disabled:opacity-50 shadow-lg hover:scale-105 transition-transform ${getButtonColor()}`}
                    onClick={handleGenerate}
                    disabled={getCurrentLoading() || !getCurrentInput().trim()}
                >
                    <LuSend size={20} />
                </button>
            </div>
            
            <button
                className={`flex w-full justify-center rounded-lg p-3 font-bold text-white outline-none disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-xl transition-all ${getButtonColor()}`}
                onClick={handleGenerate}
                disabled={getCurrentLoading() || !getCurrentInput().trim()}
            >
                {getButtonText()}
            </button>

            {/* Output Display */}
            <div className="h-full rounded-lg w-full overflow-y-auto p-0 border-2 border-gray-600 bg-gray-900">
                {/* Output Actions */}
                {getCurrentOutput() && (
                    <div className="flex justify-end gap-4 p-3 bg-gray-800 rounded-t-lg">
                        <button 
                            title="Copy Output" 
                            onClick={copyOutput}
                            className="p-2 rounded-lg hover:bg-gray-700 transition-colors bg-gray-600 hover:scale-105 transform"
                        >
                            <LuCopy size={18} className="text-white" />
                        </button>
                        <button
                            title="Replace code in file"
                            onClick={replaceCodeInFile}
                            className="p-2 rounded-lg hover:bg-gray-700 transition-colors bg-gray-600 hover:scale-105 transform"
                        >
                            <LuRepeat size={18} className="text-white" />
                        </button>
                        <button
                            title="Paste code in file"
                            onClick={pasteCodeInFile}
                            className="p-2 rounded-lg hover:bg-gray-700 transition-colors bg-gray-600 hover:scale-105 transform"
                        >
                            <LuClipboardPaste size={18} className="text-white" />
                        </button>
                    </div>
                )}

                <div className="p-4">
                    <ReactMarkdown
                        components={{
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            code({ inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || "")
                                const language = match ? match[1] : "javascript"

                                return !inline ? (
                                    <SyntaxHighlighter
                                        style={dracula}
                                        language={language}
                                        PreTag="pre"
                                        className="!m-0 !rounded-lg !bg-gray-800 !p-4 !border !border-gray-600"
                                    >
                                        {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={`${className} bg-gray-800 px-2 py-1 rounded border border-gray-600`} {...props}>
                                        {children}
                                    </code>
                                )
                            },
                            pre({ children }) {
                                return <pre className="rounded-lg border border-gray-600 overflow-hidden">{children}</pre>
                            },
                        }}
                    >
                        {getCurrentLoading() ? "🔄 Generating code..." : getCurrentOutput() || "💡 Your generated code will appear here..."}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    )
}

export default CopilotView