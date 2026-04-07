import React from 'react';
import { useApp } from '../context/AppContext';

const TopNavBar = () => {
    const { sessionData, isConnected, sendCommand } = useApp();
    
    const status = sessionData?.status;
    const isActive = sessionData?.active;
    const isCompleted = status === 'COMPLETED';
    const isPaused = status === 'PAUSED';
    const isStandby = status === 'STANDBY' || status === 'READY' || !status;
    
    return (
        <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface/60 backdrop-blur-xl border-b border-primary/10 shadow-[0_0_40px_rgba(0,212,255,0.04)]">
            <div className="flex items-center gap-8">
                <span className="text-2xl font-black tracking-tighter text-primary font-headline">NEXUS</span>
                <div className="h-8 w-px bg-outline-variant/20 hidden md:block"></div>
                <div className="hidden md:flex flex-col">
                    <span className="text-[10px] font-mono text-outline-variant tracking-widest uppercase">System Status</span>
                    <div className="text-sm font-mono text-tertiary">{status || 'INITIALIZING...'}</div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex gap-2">
                    {/* STANDBY/READY state - only show START */}
                    {isStandby && (
                        <button
                            onClick={() => sendCommand({ action: 'start' })}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary/10 border border-tertiary/20 text-tertiary text-xs font-bold hover:bg-tertiary/20 transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-sm">play_arrow</span> START
                        </button>
                    )}

                    {/* ACTIVE state - show PAUSE and FORCE END */}
                    {isActive && !isCompleted && (
                        <>
                            <button
                                onClick={() => sendCommand({ action: 'pause' })}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all active:scale-95 ${isPaused ? 'bg-secondary text-surface border-secondary' : 'bg-secondary/10 border-secondary/20 text-secondary hover:bg-secondary/20'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{isPaused ? 'play_arrow' : 'pause'}</span>
                                {isPaused ? 'RESUME' : 'PAUSE'}
                            </button>
                            <button
                                onClick={() => sendCommand({ action: 'force_end' })}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-[#f59e0b] text-xs font-bold hover:bg-[#f59e0b]/20 transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">stop_circle</span> FORCE END
                            </button>
                        </>
                    )}

                    {/* Always show RESET */}
                    <button
                        onClick={() => sendCommand({ action: 'reset' })}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-error/10 border border-error/20 text-error text-xs font-bold hover:bg-error/20 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-sm">restart_alt</span> RESET
                    </button>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_#66fa8c] ${isConnected ? 'bg-tertiary' : 'bg-error'}`}></div>
                    <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${isConnected ? 'text-tertiary' : 'text-error'}`}>
                        {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default TopNavBar;
