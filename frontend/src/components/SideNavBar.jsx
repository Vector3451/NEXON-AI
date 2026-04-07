import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const StatusPanel = ({ onClose }) => (
    <div className="fixed left-20 bottom-0 z-50 w-80 bg-surface border border-primary/20 shadow-2xl rounded-tr-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-surface-container border-b border-white/5">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">online_prediction</span>
                <span className="font-mono text-xs text-primary uppercase tracking-widest">System Status</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
        <div className="p-4 space-y-3 font-mono text-xs">
            {[
                { label: 'Agent A (INV-01)', status: 'STANDBY', color: 'text-tertiary' },
                { label: 'Agent B (VAL-01)', status: 'STANDBY', color: 'text-tertiary' },
                { label: 'WebSocket', status: 'CONNECTED', color: 'text-tertiary' },
                { label: 'Ollama API', status: 'CHECKING...', color: 'text-secondary' },
                { label: 'NEXUS Core', status: 'ONLINE', color: 'text-tertiary' },
            ].map(({ label, status, color }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400 uppercase tracking-wider">{label}</span>
                    <span className={`${color} font-bold flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text', 'bg')} animate-pulse`}></span>
                        {status}
                    </span>
                </div>
            ))}
        </div>
    </div>
);

const LogsPanel = ({ onClose }) => {
    const [logs] = useState([
        { time: '13:45:01', level: 'INFO', msg: 'NEXUS Core initialized' },
        { time: '13:45:01', level: 'INFO', msg: 'WebSocket server listening on :7860' },
        { time: '13:45:02', level: 'INFO', msg: 'Agent A ready — NEXUS-CORE-INV-01' },
        { time: '13:45:02', level: 'INFO', msg: 'Agent B ready — NEXUS-CORE-VAL-01' },
        { time: '13:45:05', level: 'WARN', msg: 'No active episode. Awaiting start command.' },
    ]);
    const levelColor = { INFO: 'text-tertiary', WARN: 'text-secondary', ERROR: 'text-error' };

    return (
        <div className="fixed left-20 bottom-0 z-50 w-96 bg-surface border border-primary/20 shadow-2xl rounded-tr-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-container border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">terminal</span>
                    <span className="font-mono text-xs text-primary uppercase tracking-widest">System Logs</span>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
            <div className="p-3 bg-surface-container-lowest h-48 overflow-y-auto space-y-1 font-mono text-[10px]">
                {logs.map((l, i) => (
                    <div key={i} className="flex gap-2">
                        <span className="text-slate-600 shrink-0">{l.time}</span>
                        <span className={`shrink-0 font-bold w-10 ${levelColor[l.level]}`}>{l.level}</span>
                        <span className="text-on-surface/70">{l.msg}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SideNavBar = () => {
    const location = useLocation();
    const [activePanel, setActivePanel] = useState(null); // 'status' | 'logs' | null

    const navLinks = [
        { name: 'Dashboard', icon: 'dashboard', path: '/' },
        { name: 'Scenarios', icon: 'account_tree', path: '/scenarios' },
        { name: 'Settings', icon: 'settings', path: '/settings' },
    ];

    const togglePanel = (panel) => setActivePanel(p => p === panel ? null : panel);

    return (
        <>
            <aside className="fixed left-0 top-16 bottom-0 z-40 flex flex-col items-center py-8 bg-surface border-r border-primary/5 w-20 hover:w-64 transition-all duration-500 group">
                <div className="flex flex-col items-center group-hover:items-start group-hover:px-6 w-full space-y-8">
                    {/* Operator Badge */}
                    <div className="flex flex-col items-center group-hover:flex-row group-hover:gap-4 w-full px-2 transition-all">
                        <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center refractive-edge shrink-0">
                            <span className="material-symbols-outlined text-primary">shield</span>
                        </div>
                        <div className="hidden group-hover:block transition-all">
                            <p className="font-mono text-xs tracking-tight text-white font-bold whitespace-nowrap">OPERATOR_01</p>
                            <p className="font-mono text-[10px] text-slate-500">ID: 9X-2244</p>
                        </div>
                    </div>

                    {/* Nav Links */}
                    <div className="flex flex-col w-full">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                className={`flex items-center h-14 w-full transition-all ${location.pathname === link.path
                                    ? 'bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-primary text-white'
                                    : 'text-slate-500 opacity-60 hover:opacity-100 hover:bg-surface-container-low'
                                    }`}
                            >
                                <div className="w-20 flex justify-center flex-shrink-0">
                                    <span className={`material-symbols-outlined ${location.pathname === link.path ? 'text-primary' : ''}`}>
                                        {link.icon}
                                    </span>
                                </div>
                                <span className="hidden group-hover:block font-mono text-xs tracking-tight uppercase">
                                    {link.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Bottom utility buttons */}
                <div className="mt-auto w-full group-hover:px-6">
                    <div className="flex flex-col gap-2 items-center group-hover:items-start pb-4">
                        <button
                            onClick={() => togglePanel('status')}
                            className={`flex items-center h-12 w-full transition-all rounded ${activePanel === 'status' ? 'text-primary bg-primary/10' : 'text-slate-500 opacity-60 hover:opacity-100 hover:bg-surface-container-low'
                                }`}
                        >
                            <div className="w-20 flex justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-sm">online_prediction</span>
                            </div>
                            <span className="hidden group-hover:block font-mono text-[10px] uppercase tracking-widest">Status</span>
                        </button>
                        <button
                            onClick={() => togglePanel('logs')}
                            className={`flex items-center h-12 w-full transition-all rounded ${activePanel === 'logs' ? 'text-primary bg-primary/10' : 'text-slate-500 opacity-60 hover:opacity-100 hover:bg-surface-container-low'
                                }`}
                        >
                            <div className="w-20 flex justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-sm">terminal</span>
                            </div>
                            <span className="hidden group-hover:block font-mono text-[10px] uppercase tracking-widest">Logs</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Floating Panels */}
            {activePanel === 'status' && <StatusPanel onClose={() => setActivePanel(null)} />}
            {activePanel === 'logs' && <LogsPanel onClose={() => setActivePanel(null)} />}
        </>
    );
};

export default SideNavBar;
