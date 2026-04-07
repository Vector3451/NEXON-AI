import React, { useRef, useEffect } from 'react';

const AgentTerminal = ({ agentName, model, status, accentColor, icon, messages }) => {
    const borderColor = accentColor === 'cyan' ? 'border-primary/20' : 'border-secondary/20';
    const bgColor = accentColor === 'cyan' ? 'bg-primary/5' : 'bg-secondary/5';
    const textColor = accentColor === 'cyan' ? 'text-primary' : 'text-secondary';
    const shadowColor = accentColor === 'cyan' ? 'shadow-[0_0_15px_rgba(0,212,255,0.1)]' : 'shadow-[0_0_15px_rgba(221,183,255,0.1)]';

    const scrollRef = useRef(null);

    // Scroll by modifying scrollTop directly to avoid ancestor scroll hijacking
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages?.length]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const observer = new MutationObserver(() => {
            el.scrollTop = el.scrollHeight;
        });
        observer.observe(el, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, []);

    return (
        <section className={`flex flex-col h-[500px] bg-surface-container-low rounded-lg border ${borderColor} overflow-hidden shadow-2xl relative group`}>
            <div className={`absolute inset-0 ${bgColor} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>
            <div className={`flex items-center justify-between px-4 py-3 bg-surface border-b ${borderColor} shrink-0`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded ${bgColor} flex items-center justify-center border ${borderColor} ${shadowColor}`}>
                        <span className={`material-symbols-outlined ${textColor}`}>{icon}</span>
                    </div>
                    <div>
                        <h2 className={`text-sm font-bold font-headline ${textColor} tracking-wider uppercase`}>{agentName}</h2>
                        <p className="text-[10px] font-mono text-outline-variant uppercase">MODEL: {model || '[UNCONFIGURED]'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${bgColor} ${textColor} border ${borderColor} ${status === 'ACTIVE' ? 'animate-pulse' : ''}`}>
                        {status}
                    </span>
                </div>
            </div>

            {/* Scrollable terminal body — grows to fill all available space */}
            <div ref={scrollRef} className="flex-1 p-4 font-mono text-sm bg-surface-container-lowest overflow-y-auto relative space-y-4">
                <div className="text-on-surface/40 text-xs italic whitespace-pre-wrap">
                    {accentColor === 'cyan' ? '// System initialized. Awaiting objective...' : '// System initialized. Awaiting investigator output...'}
                </div>

                {messages && messages.map((msg, i) => (
                    <div key={i} className="text-sm">
                        {msg.type === 'message' && (
                            <div className="text-on-surface whitespace-pre-wrap break-words leading-relaxed">
                                <span className={`${textColor} mr-2`}>nexus@{agentName.toLowerCase().split(':')[0]}:~$</span>
                                {msg.content}
                                {msg.partial && <span className={`inline-block w-2 h-4 ml-1 align-middle ${accentColor === 'cyan' ? 'bg-primary' : 'bg-secondary'} cursor-blink`} />}
                            </div>
                        )}
                        {msg.type === 'tool_call' && (
                            <div className="text-tertiary mt-1 bg-tertiary/10 p-2 rounded border border-tertiary/20 whitespace-pre-wrap break-words">
                                ❯ executing: {msg.tool_name}({JSON.stringify(msg.params)})
                            </div>
                        )}
                        {msg.type === 'tool_result' && (
                            <div className={`mt-1 p-2 rounded border whitespace-pre-wrap break-words ${msg.success ? 'bg-primary/5 border-primary/20 text-on-surface/80' : 'bg-error/5 border-error/20 text-error/80'}`}>
                                ❮ result: {msg.result}
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex items-center gap-2 text-on-surface mt-4">
                    <span className={textColor}>nexus@{agentName.toLowerCase().split(':')[0]}:~$</span>
                    <span className={`w-2 h-5 cursor-blink ${accentColor === 'cyan' ? 'bg-primary' : 'bg-secondary'}`}></span>
                </div>
            </div>
        </section>
    );
};

export default AgentTerminal;

