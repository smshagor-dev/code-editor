import SidebarButton from "@/components/sidebar/sidebar-views/SidebarButton"
import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { useViews } from "@/context/ViewContext"
import useResponsive from "@/hooks/useResponsive"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { ACTIVITY_STATE } from "@/types/app"
import { SocketEvent } from "@/types/socket"
import { VIEWS } from "@/types/view"
import { IoCodeSlash } from "react-icons/io5"
import { MdOutlineDraw } from "react-icons/md"
import { RiTerminalBoxFill } from "react-icons/ri"
import cn from "classnames"
import { Tooltip } from 'react-tooltip'
import { useState } from 'react'
import { tooltipStyles } from "./tooltipStyles"

function Sidebar() {
    const {
        activeView,
        isSidebarOpen,
        viewComponents,
        viewIcons,
        setIsSidebarOpen,
    } = useViews()
    const { minHeightReached } = useResponsive()
    const { activityState, setActivityState } = useAppContext()
    const { socket } = useSocket()
    const { isMobile } = useWindowDimensions()
    const [showTooltip, setShowTooltip] = useState(true)
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)
    const [terminalCommand, setTerminalCommand] = useState('')
    const [terminalOutput, setTerminalOutput] = useState('')
    const [isExecuting, setIsExecuting] = useState(false)

    const changeState = () => {
        setShowTooltip(false)
        if (activityState === ACTIVITY_STATE.CODING) {
            setActivityState(ACTIVITY_STATE.DRAWING)
            socket.emit(SocketEvent.REQUEST_DRAWING)
        } else {
            setActivityState(ACTIVITY_STATE.CODING)
        }

        if (isMobile) {
            setIsSidebarOpen(false)
        }
    }

    const executeTerminalCommand = async () => {
        if (!terminalCommand.trim()) return
        
        setIsExecuting(true)
        setTerminalOutput(prev => prev + `\n$ ${terminalCommand}\n`)
        
        try {
            const response = await fetch('https://cloud.code-editor.ru/api/terminal.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command: terminalCommand }),
            })
            
            const result = await response.json()
            
            if (result.success) {
                setTerminalOutput(prev => prev + result.output + '\n')
            } else {
                setTerminalOutput(prev => prev + `Error: ${result.error}\n`)
            }
        } catch (error) {
            setTerminalOutput(prev => prev + `Network Error: ${error}\n`)
        } finally {
            setIsExecuting(false)
            setTerminalCommand('')
        }
    }

    const handleTerminalKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            executeTerminalCommand()
        }
    }

    const clearTerminal = () => {
        setTerminalOutput('')
    }

    const installCommonPackage = (packageName: string) => {
        setTerminalCommand(`pip install ${packageName}`)
    }

    return (
        <>
            <aside className="flex w-full md:h-full md:max-h-full md:min-h-full md:w-auto">
                <div
                    className={cn(
                        "fixed bottom-0 left-0 z-50 flex h-[50px] w-full gap-4 self-end overflow-hidden border-t border-darkHover bg-dark p-2 md:static md:h-full md:w-[50px] md:min-w-[50px] md:flex-col md:border-r md:border-t-0 md:p-2 md:pt-4",
                        {
                            hidden: minHeightReached,
                        },
                    )}
                >
                    <SidebarButton
                        viewName={VIEWS.FILES}
                        icon={viewIcons[VIEWS.FILES]}
                    />
                    <SidebarButton
                        viewName={VIEWS.CHATS}
                        icon={viewIcons[VIEWS.CHATS]}
                    />
                    <SidebarButton
                        viewName={VIEWS.COPILOT}
                        icon={viewIcons[VIEWS.COPILOT]}
                    />
                    <SidebarButton
                        viewName={VIEWS.RUN}
                        icon={viewIcons[VIEWS.RUN]}
                    />
                    <SidebarButton
                        viewName={VIEWS.CLIENTS}
                        icon={viewIcons[VIEWS.CLIENTS]}
                    />
                    <SidebarButton
                        viewName={VIEWS.SETTINGS}
                        icon={viewIcons[VIEWS.SETTINGS]}
                    />

                    {/* Terminal Button */}
                    <div className="flex h-fit items-center justify-center">
                        <button
                            className="flex items-center justify-center rounded p-1.5 transition-colors duration-200 ease-in-out hover:bg-[#3D404A]"
                            onClick={() => setIsTerminalOpen(true)}
                            onMouseEnter={() => setShowTooltip(true)}
                            data-tooltip-id="terminal-tooltip"
                            data-tooltip-content="Open Terminal"
                        >
                            <RiTerminalBoxFill size={24} className="text-green-400" />
                        </button>
                        {showTooltip && (
                            <Tooltip
                                id="terminal-tooltip"
                                place="right"
                                offset={15}
                                className="!z-50"
                                style={tooltipStyles}
                                noArrow={false}
                                positionStrategy="fixed"
                                float={true}
                            />
                        )}
                    </div>

                    {/* Button to change activity state coding or drawing */}
                    <div className="flex h-fit items-center justify-center">
                        <button
                            className="flex items-center justify-center rounded p-1.5 transition-colors duration-200 ease-in-out hover:bg-[#3D404A]"
                            onClick={changeState}
                            onMouseEnter={() => setShowTooltip(true)}
                            data-tooltip-id="activity-state-tooltip"
                            data-tooltip-content={
                                activityState === ACTIVITY_STATE.CODING
                                    ? "Switch to Drawing Mode"
                                    : "Switch to Coding Mode"
                            }
                        >
                            {activityState === ACTIVITY_STATE.CODING ? (
                                <MdOutlineDraw size={30} />
                            ) : (
                                <IoCodeSlash size={30} />
                            )}
                        </button>
                        {showTooltip && (
                            <Tooltip
                                id="activity-state-tooltip"
                                place="right"
                                offset={15}
                                className="!z-50"
                                style={tooltipStyles}
                                noArrow={false}
                                positionStrategy="fixed"
                                float={true}
                            />
                        )}
                    </div>
                </div>
                <div
                    className="absolute left-0 top-0 z-20 w-full flex-col bg-dark md:static md:min-w-[300px]"
                    style={isSidebarOpen ? {} : { display: "none" }}
                >
                    {/* Render the active view component */}
                    {viewComponents[activeView]}
                </div>
            </aside>

            {/* Terminal Modal */}
            {isTerminalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="flex h-[600px] w-[800px] flex-col overflow-hidden rounded-lg border border-gray-700 bg-[#0C0C0C] shadow-2xl">
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between bg-[#2D2D2D] px-4 py-2">
                            <div className="flex items-center space-x-2">
                                <RiTerminalBoxFill className="text-green-400" size={16} />
                                <span className="text-sm font-medium text-white">Command Prompt</span>
                            </div>
                            <div className="flex space-x-1">
                                <button 
                                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#3D3D3D]"
                                    onClick={clearTerminal}
                                >
                                    <span className="text-xs text-white">🗑️</span>
                                </button>
                                <button 
                                    className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#3D3D3D]"
                                    onClick={() => setIsTerminalOpen(false)}
                                >
                                    <span className="text-xs text-white">✕</span>
                                </button>
                            </div>
                        </div>

                        {/* Quick Actions Bar */}
                        <div className="flex space-x-2 bg-[#1E1E1E] px-4 py-2">
                            <span className="text-xs text-gray-400">Quick install:</span>
                            <button 
                                onClick={() => installCommonPackage('numpy')}
                                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            >
                                numpy
                            </button>
                            <button 
                                onClick={() => installCommonPackage('pandas')}
                                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            >
                                pandas
                            </button>
                            <button 
                                onClick={() => installCommonPackage('matplotlib')}
                                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            >
                                matplotlib
                            </button>
                            <button 
                                onClick={() => installCommonPackage('requests')}
                                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            >
                                requests
                            </button>
                        </div>

                        {/* Terminal Output */}
                        <div className="flex-1 overflow-y-auto bg-[#0C0C0C] p-4 font-mono text-sm">
                            <div className="text-green-400">
                                Windows Terminal [Version 1.0.0]
                                <br />
                                (c) Code Editor Cloud. All rights reserved.
                                <br />
                                <br />
                                Type 'pip list' to see installed packages
                                <br />
                                Type 'venv-info' for virtual environment info
                                <br />
                                <br />
                            </div>
                            <pre className="whitespace-pre-wrap break-words text-gray-200">
                                {terminalOutput || 'Welcome to Code Editor Cloud Terminal\n'}
                            </pre>
                            {isExecuting && (
                                <div className="flex items-center space-x-2 text-yellow-400">
                                    <div className="h-2 w-2 animate-ping rounded-full bg-yellow-400"></div>
                                    <span>Executing command...</span>
                                </div>
                            )}
                        </div>

                        {/* Terminal Input */}
                        <div className="border-t border-gray-700 bg-[#0C0C0C] p-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-green-400">$</span>
                                <input
                                    type="text"
                                    value={terminalCommand}
                                    onChange={(e) => setTerminalCommand(e.target.value)}
                                    onKeyPress={handleTerminalKeyPress}
                                    placeholder="Enter command..."
                                    className="flex-1 bg-transparent font-mono text-sm text-white outline-none placeholder:text-gray-500"
                                    disabled={isExecuting}
                                    autoFocus
                                />
                                <button
                                    onClick={executeTerminalCommand}
                                    disabled={isExecuting || !terminalCommand.trim()}
                                    className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400"
                                >
                                    {isExecuting ? 'Running...' : 'Run'}
                                </button>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                Available commands: pip install, pip list, python --version, venv-info, check &lt;package&gt;
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Sidebar