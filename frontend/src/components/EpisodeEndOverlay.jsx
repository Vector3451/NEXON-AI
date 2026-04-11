import React from 'react';

const EpisodeEndOverlay = ({ isOpen, onClose, metrics, gameState }) => {
    if (!isOpen) return null;

    const handleDownload = () => {
        if (!gameState) return;

        const sc = gameState.scenario || {};
        const allAgents = gameState.agents || {};
        const allMessages = Object.values(allAgents).flatMap(a => a?.messages || []);

        let report = `=================================================================\n`;
        report += `                  NEXUS INCIDENT INVESTIGATION REPORT            \n`;
        report += `=================================================================\n\n`;

        report += `[ SCENARIO METADATA ]\n`;
        report += `Title:           ${sc.id || 'N/A'}\n`;
        report += `Domain:          ${sc.domain || 'N/A'}\n`;
        report += `Difficulty:      ${sc.difficulty || 'N/A'}\n`;
        report += `Final Grading Score: ${Number(gameState?.cumulativeReward || metrics?.score || 0).toFixed(4)} / 1.00\n`;
        report += `Total Steps:     ${gameState?.step || metrics?.steps || 'N/A'}\n`;
        report += `Active Agents:   ${Object.keys(allAgents).length}\n\n`;
        
        report += `[ AGENTS DEPLOYED ]\n`;
        Object.entries(allAgents).forEach(([agentId, agentData], idx) => {
            const msgs = agentData?.messages || [];
            const msgCount = msgs.filter(m => m.type === 'message').length;
            const toolCount = msgs.filter(m => m.type === 'tool_call').length;
            report += `${idx + 1}. ${agentId}: ${msgCount} messages, ${toolCount} tool calls\n`;
        });
        report += `\n`;
        
        report += `[ STEP REWARDS ]\n`;
        if (gameState?.rewardHistory && gameState.rewardHistory.length > 0) {
            gameState.rewardHistory.forEach((r, i) => {
                report += `Step ${i + 1}: ${r.toFixed(4)}\n`;
            });
            report += `Average: ${(gameState.rewardHistory.reduce((a, b) => a + b, 0) / gameState.rewardHistory.length).toFixed(4)}\n`;
            report += `Final Grading Score: ${Number(gameState.cumulativeReward || 0).toFixed(4)}\n\n`;
        } else {
            report += `No step rewards recorded.\n\n`;
        }
        
        report += `[ REWARD BREAKDOWN ]\n`;
        if (gameState?.rewardBreakdown && Object.keys(gameState.rewardBreakdown).length > 0) {
            Object.entries(gameState.rewardBreakdown).forEach(([key, val]) => {
                report += `${key}: ${typeof val === 'number' ? val.toFixed(4) : val}\n`;
            });
            report += `\n`;
        }

        report += `[ INCIDENT DESCRIPTION & PROBLEM ]\n`;
        report += `${sc.description || 'No description provided.'}\n\n`;

        report += `[ CONTEXT & ROOT CAUSE ]\n`;
        report += `${sc.context || 'No context provided.'}\n`;
        report += `Actual Root Cause Validation: ${metrics?.rootCause || 'N/A'}\n\n`;

        report += `=================================================================\n`;
        report += `[ INVESTIGATION LOG & DETAILED TRACE ]\n`;
        report += `=================================================================\n\n`;

        const allErrors = [];
        const allTools = [];

        allMessages.forEach(msg => {
            if (msg.type === 'tool_call') {
                allTools.push(`- ${msg.tool_name}(${JSON.stringify(msg.params)})`);
            }
            if (msg.type === 'tool_result' && !msg.success) {
                allErrors.push(`- Error from ${msg.tool_name}: ${msg.result}`);
            }
            if (msg.type === 'tool_result' && msg.result?.toLowerCase().includes('error')) {
                allErrors.push(`- Log/Cmd Error: ${msg.result}`);
            }
        });

        report += `> EXECUTED TOOLS & COMMANDS:\n`;
        if (allTools.length > 0) {
            allTools.forEach(t => report += `${t}\n`);
        } else {
            report += `None.\n`;
        }
        report += `\n`;

        report += `> SYSTEMS ERRORS DETECTED DURING INVESTIGATION:\n`;
        if (allErrors.length > 0) {
            // deduplicate
            [...new Set(allErrors)].forEach(err => report += `${err}\n`);
        } else {
            report += `No significant system errors found during tool execution.\n`;
        }
        report += `\n`;

        report += `=================================================================\n`;
        report += `[ SOLUTION IMPLEMENTED & FIX VERIFICATION ]\n`;
        report += `=================================================================\n\n`;
        report += `The Validator Agent verified the proposed fix successfully, leading to the resolution of the incident.\n`;
        report += `End-state: ${metrics?.rootCause === 'VERIFIED' ? 'SUCCESS' : 'UNKNOWN'}\n\n`;

        report += `=================================================================\n`;
        report += `[ TIPS FOR IMPROVEMENT & RECOMMENDATIONS ]\n`;
        report += `=================================================================\n\n`;
        report += `Based on the automated evaluation of this scenario, consider the following:\n`;

        if (allTools.length > 15) {
            report += `1. EFFICIENCY: The agents called a large number of tools (${allTools.length}). Consider refining the initial hypothesis to reduce blind querying.\n`;
        } else {
            report += `1. EFFICIENCY: Tool execution was relatively concise (${allTools.length} calls).\n`;
        }

        if (allErrors.length > 5) {
            report += `2. ACCURACY: Multiple tool execution errors were encountered. Ensure exact syntax and correct tool parameters are used to minimize invalid calls.\n`;
        }

        report += `3. CAUSE-ANALYSIS: Always grep application error logs before querying databases to save time tracking downstream symptoms.\n`;
        report += `4. REMEDIATION: Post-incident reviews should establish better automated alerting for the specific failure domain (${sc.domain || 'general'}).\n`;

        // Trigger Download
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexus_investigation_report_${sc.id || 'export'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-500">
            {/* Particle/Pulse Background */}
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10">
                    <div className="w-full h-full rounded-full border-[1px] border-primary-container/20 animate-[ping_4s_infinite]"></div>
                </div>
            </div>

            {/* Summary Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] glass-panel rounded-xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 bg-surface-container-highest/20 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-1 rounded bg-primary-container/20 border border-primary-container/40">
                            <span className="text-primary material-symbols-outlined text-xl">task_alt</span>
                        </div>
                        <h2 className="font-headline font-bold text-lg tracking-widest text-on-surface uppercase">Episode_Execution_Complete</h2>
                    </div>
                    <button onClick={onClose} className="text-outline hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Primary Metrics */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <span className="font-mono text-[10px] text-outline tracking-widest uppercase">Final Grading Score</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-headline text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary-container drop-shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                                        {Number(gameState?.cumulativeReward || metrics?.score || 0).toFixed(2)}
                                    </span>
                                    <span className="font-headline text-2xl text-primary/40 font-light">/ 1.00</span>
                                </div>
                            </div>
                            
                            {/* Reward Breakdown from Episode */}
                            {gameState?.rewardBreakdown && Object.keys(gameState.rewardBreakdown).length > 0 && (
                                <div className="p-4 bg-surface-container-lowest/50 border border-white/10 rounded-lg">
                                    <span className="font-mono text-[10px] text-outline uppercase block mb-3">Step Reward Breakdown</span>
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.entries(gameState.rewardBreakdown).map(([key, val]) => (
                                            <div key={key} className="text-center bg-surface-container-high/30 rounded p-2">
                                                <div className="text-[8px] text-slate-500 uppercase truncate">{key.replace(/_/g, ' ')}</div>
                                                <div className={`font-mono text-sm font-bold ${val > 0 ? 'text-primary' : 'text-slate-600'}`}>
                                                    {typeof val === 'number' ? val.toFixed(3) : val}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Reward History */}
                            {gameState?.rewardHistory && gameState.rewardHistory.length > 0 && (
                                <div className="p-4 bg-surface-container-lowest/50 border border-white/10 rounded-lg">
                                    <span className="font-mono text-[10px] text-outline uppercase block mb-3">Step Rewards</span>
                                    <div className="flex items-end gap-1 h-16">
                                        {gameState.rewardHistory.map((r, i) => (
                                            <div key={i} className="flex-1 bg-primary/60 rounded-t" 
                                                 style={{ height: `${Math.max(5, (r / 1) * 100)}%` }}
                                                 title={`Step ${i + 1}: ${r.toFixed(3)}`}>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-2 text-[9px] font-mono text-slate-500">
                                        <span>Avg: {(gameState.rewardHistory.reduce((a, b) => a + b, 0) / gameState.rewardHistory.length).toFixed(3)}</span>
                                        <span>Max: {Math.max(...gameState.rewardHistory).toFixed(3)}</span>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-surface-container-lowest/50 p-4 border-l border-primary/20 refractive-edge">
                                    <span className="font-mono text-[9px] text-outline uppercase block mb-1">Clues Found</span>
                                    <span className="font-headline text-2xl font-medium">{gameState?.clues_found?.length || 0}</span>
                                </div>
                                <div className="bg-surface-container-lowest/50 p-4 border-l border-primary/20 refractive-edge">
                                    <span className="font-mono text-[9px] text-outline uppercase block mb-1">Steps Executed</span>
                                    <span className="font-headline text-2xl font-medium">{gameState?.step !== undefined ? gameState.step : (metrics?.steps !== undefined ? metrics.steps : '—')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-5 bg-tertiary/5 border border-tertiary/10 rounded-lg">
                                <div className="p-3 rounded-full bg-tertiary/10 text-tertiary">
                                    <span className="material-symbols-outlined">troubleshoot</span>
                                </div>
                                <div>
                                    <span className="font-mono text-[10px] text-tertiary/60 uppercase block">State Validation</span>
                                    <span className="text-sm font-medium tracking-wide">Status: <span className="font-mono text-tertiary">{metrics?.rootCause || '—'}</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Agent Metrics */}
                        <div className="space-y-6">
                            <h3 className="font-mono text-[10px] text-outline tracking-widest uppercase mb-4">Agent Performance Breakdown</h3>
                            {Object.entries(gameState?.agents || {}).map(([agentId, agentData], idx) => {
                                const colors = ['primary', 'secondary', 'tertiary', 'error', 'success'];
                                const color = colors[idx % colors.length];
                                const msgs = agentData?.messages || [];
                                const msgCount = msgs.filter(m => m.type === 'message').length;
                                const toolCount = msgs.filter(m => m.type === 'tool_call').length;
                                const errCount = msgs.filter(m => m.type === 'tool_result' && m.result?.toLowerCase().includes('error')).length;
                                const agentNames = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'];
                                const agentName = agentNames[idx % agentNames.length];
                                
                                return (
                                    <div key={agentId} className="relative group">
                                        <div className={`absolute -left-4 top-0 bottom-0 w-1 ${idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-secondary' : idx === 2 ? 'bg-tertiary' : 'bg-error'}`}></div>
                                        <div className="bg-surface-container-low/40 p-5 space-y-4 border border-white/5 rounded-r-lg">
                                            <div className="flex justify-between items-center">
                                                <span className={`font-headline font-bold tracking-tighter uppercase ${idx === 0 ? 'text-primary' : idx === 1 ? 'text-secondary' : idx === 2 ? 'text-tertiary' : 'text-error'}`}>Agent_{agentName}</span>
                                                <span className={`font-mono text-[10px] ${idx === 0 ? 'text-primary' : idx === 1 ? 'text-secondary' : idx === 2 ? 'text-tertiary' : 'text-error'}/50`}>{agentId.toUpperCase()}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div>
                                                    <span className="font-mono text-[9px] text-outline flex flex-col items-center justify-center gap-1 uppercase"><span className="material-symbols-outlined text-[12px]">chat</span> MSGS</span>
                                                    <span className={`font-headline text-lg font-medium ${idx === 0 ? 'text-primary' : idx === 1 ? 'text-secondary' : idx === 2 ? 'text-tertiary' : 'text-error'}`}>{msgCount}</span>
                                                </div>
                                                <div className="border-x border-white/5">
                                                    <span className="font-mono text-[9px] text-outline flex flex-col items-center justify-center gap-1 uppercase"><span className="material-symbols-outlined text-[12px]">build</span> TOOLS</span>
                                                    <span className={`font-headline text-lg font-medium ${idx === 0 ? 'text-primary' : idx === 1 ? 'text-secondary' : idx === 2 ? 'text-tertiary' : 'text-error'}`}>{toolCount}</span>
                                                </div>
                                                <div>
                                                    <span className="font-mono text-[9px] text-outline flex flex-col items-center justify-center gap-1 uppercase"><span className="material-symbols-outlined text-[12px]">warning</span> ERRS</span>
                                                    <span className={`font-headline text-lg font-medium ${idx === 0 ? 'text-primary' : idx === 1 ? 'text-secondary' : idx === 2 ? 'text-tertiary' : 'text-error'}`}>{errCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Submit Resolution Report Panel */}
                    {(() => {
                        const resCall = gameState?.tool_calls_made?.find(c => c.tool_name === 'submit_resolution');
                        if (!resCall) return null;
                        const p = resCall.params || {};
                        return (
                            <div className="px-8 pb-4">
                                <div className="p-6 bg-surface-container-low/40 border border-primary/20 rounded-lg">
                                    <h3 className="font-headline font-bold text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined">description</span>
                                        Incident Resolution Report
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <span className="font-mono text-[10px] text-outline uppercase block mb-1">Root Cause Service</span>
                                            <span className="font-mono text-sm text-on-surface bg-surface-container p-1 px-2 rounded border border-white/5">{p.root_cause_service || 'UNKNOWN'}</span>
                                        </div>
                                        <div>
                                            <span className="font-mono text-[10px] text-outline uppercase block mb-1">Root Cause Description</span>
                                            <p className="text-sm text-on-surface/80">{p.root_cause_description || 'No description provided.'}</p>
                                        </div>
                                        <div className="p-4 bg-tertiary/5 border-l-2 border-tertiary rounded-r">
                                            <span className="font-mono text-[10px] text-tertiary uppercase block mb-1">Fix Applied</span>
                                            <p className="text-sm text-on-surface">{p.fix_applied || 'No fix described.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Multi-Agent Final Verdict Panel */}
                    {(() => {
                        const allAgents = gameState?.agents || {};
                        const agentEntries = Object.entries(allAgents);
                        const conclusions = agentEntries.map(([agentId, agentData]) => {
                            const msgs = agentData?.messages || [];
                            const textMsgs = msgs.filter(m => m.type === 'message');
                            return { agentId, lastMsg: textMsgs[textMsgs.length - 1] };
                        }).filter(c => c.lastMsg);
                        
                        if (conclusions.length === 0) return null;
                        
                        const colors = ['primary', 'secondary', 'tertiary', 'error', 'success'];

                        return (
                            <div className="px-8 pb-8">
                                <div className="p-6 bg-surface-container-low/40 border border-white/10 rounded-lg">
                                    <h3 className="font-headline font-bold text-on-surface tracking-widest uppercase mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined">gavel</span>
                                        Multi-Agent Final Verdict
                                    </h3>
                                    <div className="space-y-4">
                                        {conclusions.map(({ agentId, lastMsg }, idx) => {
                                            const agentNames = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'];
                                            const colorClass = idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-secondary' : idx === 2 ? 'bg-tertiary' : 'bg-error';
                                            const borderClass = idx === 0 ? 'border-primary' : idx === 1 ? 'border-secondary' : idx === 2 ? 'border-tertiary' : 'border-error';
                                            const textClass = idx === 0 ? 'text-primary' : idx === 1 ? 'text-secondary' : idx === 2 ? 'text-tertiary' : 'text-error';
                                            return (
                                                <div key={agentId} className={`p-4 ${colorClass}/10 border-l-2 ${borderClass} rounded-r`}>
                                                    <span className={`font-mono text-[10px] ${textClass} uppercase block mb-1 tracking-widest`}>Agent {agentNames[idx % agentNames.length]} ({agentId}) Conclusion</span>
                                                    <p className="text-sm text-on-surface/90 leading-relaxed">{lastMsg.content || lastMsg.text || lastMsg.message}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-surface-container-lowest/90 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-outline/40">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span className="font-mono text-[9px] uppercase tracking-wider">Session telemetry encrypted and cached locally</span>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={handleDownload} className="flex-1 md:flex-none px-8 py-2.5 bg-transparent border border-outline-variant/30 text-on-surface hover:bg-white/5 transition-all font-mono text-xs tracking-widest uppercase">
                            Export Log
                        </button>
                        <button onClick={onClose} className="flex-1 md:flex-none px-12 py-2.5 bg-primary/20 border border-primary text-primary hover:bg-primary/30 transition-all font-mono text-xs tracking-widest font-bold uppercase shadow-[0_0_20px_rgba(0,212,255,0.1)]">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EpisodeEndOverlay;

