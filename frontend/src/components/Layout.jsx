import React, { useState, useRef, useEffect } from 'react';
import { config } from '../config';
import TopNavBar from './TopNavBar';
import SideNavBar from './SideNavBar';

/* ─── Terminal Panel ─── */
const COMMANDS = {
    help: () => ['Commands: help | status | clear | echo <text>'],
    status: () => ['Agent A (INV-01): STANDBY', 'Agent B (VAL-01): STANDBY', `WebSocket: ${config.WS_URL} — CONNECTED`, 'Episode: None active'],
};

const TerminalDrawer = ({ onClose }) => {
    const [input, setInput] = useState('');
    const [lines, setLines] = useState([{ type: 'system', text: '// NEXUS Terminal v2.0 — type "help" for commands' }]);
    const [history, setHistory] = useState([]);
    const [histIdx, setHistIdx] = useState(-1);
    const endRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);
    useEffect(() => { inputRef.current?.focus(); }, []);

    const run = (e) => {
        e.preventDefault();
        const cmd = input.trim();
        if (!cmd) return;
        setHistory(h => [cmd, ...h].slice(0, 50));
        setHistIdx(-1);
        if (cmd.toLowerCase() === 'clear') { setLines([]); setInput(''); return; }
        const parts = cmd.toLowerCase().split(' ');
        let output, type;
        if (parts[0] === 'echo') { output = [cmd.slice(5) || '']; type = 'output'; }
        else if (COMMANDS[parts[0]]) { output = COMMANDS[parts[0]](); type = 'output'; }
        else { output = [`Command not found: ${parts[0]}. Type "help".`]; type = 'error'; }
        setLines(l => [...l, { type: 'input', text: `nexus@terminal:~$ ${cmd}` }, ...output.map(t => ({ type, text: t }))]);
        setInput('');
    };

    const handleKey = (e) => {
        if (e.key === 'ArrowUp') { const i = Math.min(histIdx + 1, history.length - 1); setHistIdx(i); setInput(history[i] ?? ''); e.preventDefault(); }
        if (e.key === 'ArrowDown') { const i = Math.max(histIdx - 1, -1); setHistIdx(i); setInput(i === -1 ? '' : history[i]); e.preventDefault(); }
    };

    const colorMap = { system: 'text-slate-600 italic', input: 'text-primary', output: 'text-on-surface/80', error: 'text-error' };

    return (
        <div className="flex flex-col h-full" onClick={() => inputRef.current?.focus()}>
            <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-0.5 bg-surface-container-lowest cursor-text">
                {lines.map((l, i) => <div key={i} className={colorMap[l.type]}>{l.text}</div>)}
                <div ref={endRef} />
            </div>
            <form onSubmit={run} className="flex items-center gap-2 px-3 py-2 border-t border-white/5 bg-surface-container-lowest shrink-0">
                <span className="text-primary font-mono text-xs shrink-0">nexus@terminal:~$</span>
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                    className="flex-1 bg-transparent font-mono text-xs text-on-surface focus:outline-none placeholder:text-slate-700"
                    placeholder="type a command and press Enter..." />
            </form>
        </div>
    );
};

/* ─── Communication Panel ─── */
const CommunicationDrawer = () => (
    <div className="flex flex-col h-full p-4 font-mono text-xs space-y-2 bg-surface-container-lowest overflow-y-auto">
        {[
            { agent: 'AGENT_A', msg: 'Awaiting objective. Standing by for episode_start event.', time: '—', color: 'text-primary' },
            { agent: 'AGENT_B', msg: 'Validation module idle. Ready to receive investigator output.', time: '—', color: 'text-secondary' },
            { agent: 'SYSTEM', msg: 'No active episode. Use START to begin.', time: '—', color: 'text-outline-variant' },
        ].map((m, i) => (
            <div key={i} className="flex gap-3 py-1.5 border-b border-white/5">
                <span className={`${m.color} font-bold shrink-0 w-20`}>[{m.agent}]</span>
                <span className="text-on-surface/70">{m.msg}</span>
                <span className="text-slate-600 ml-auto shrink-0">{m.time}</span>
            </div>
        ))}
    </div>
);

/* ─── Reward Analytics Panel ─── */
const AnalyticsDrawer = () => {
    const stats = [
        { label: 'Avg Reward', value: '—', color: 'text-primary' },
        { label: 'Best Step', value: '—', color: 'text-tertiary' },
        { label: 'Root Cause', value: '—', color: 'text-tertiary' },
        { label: 'Steps Run', value: '—', color: 'text-on-surface' },
        { label: 'Episodes', value: '—', color: 'text-on-surface' },
        { label: 'Success Rate', value: '—', color: 'text-secondary' },
    ];
    return (
        <div className="flex h-full">
            {/* Reward chart placeholder */}
            <div className="flex-1 p-4 flex flex-col">
                <p className="text-[9px] font-mono text-outline-variant uppercase mb-2">Cumulative Reward Over Steps</p>
                <div className="flex-1 flex items-end gap-1 border-l border-b border-outline-variant/20 px-2 pb-1">
                    {[12, 24, 18, 36, 30, 48, 42, 60].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end">
                            <div className="w-full bg-primary/30 rounded-sm transition-all" style={{ height: `${h}%` }}></div>
                        </div>
                    ))}
                </div>
                <p className="text-[9px] font-mono text-outline-variant/40 italic mt-1">No live data — connect to episode to populate</p>
            </div>
            {/* Stat grid */}
            <div className="w-48 shrink-0 p-3 border-l border-white/5 grid grid-cols-2 gap-2 content-start">
                {stats.map(s => (
                    <div key={s.label} className="bg-surface-container p-2 rounded border border-white/5">
                        <span className="text-[8px] font-mono text-outline-variant block uppercase truncate">{s.label}</span>
                        <span className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─── Layout ─── */
const TABS = [
    { id: 'communication', label: 'Communication', icon: 'forum' },
    { id: 'terminal', label: 'Terminal', icon: 'code' },
];

const Layout = ({ children }) => {
    const [activeTab, setActiveTab] = useState(null); // null = closed

    const toggle = (id) => setActiveTab(prev => prev === id ? null : id);

    /* drawer height when open */
    const drawerH = 'h-64';

    return (
        <div className="min-h-screen flex flex-col">
            <TopNavBar />
            <SideNavBar />

            {/* Main scrollable area — leave room for fixed footer + optional drawer */}
            <main className={`ml-20 pt-16 flex-1 transition-all ${activeTab ? 'pb-[calc(48px+256px)]' : 'pb-12'}`}>
                <div className="p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Sliding drawer */}
            {activeTab && (
                <div className={`fixed bottom-12 left-20 right-0 ${drawerH} z-40 bg-surface border-t border-primary/20 shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col`}>
                    {/* Drawer title bar */}
                    <div className="flex items-center justify-between px-5 py-2 bg-surface-container border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-sm">
                                {TABS.find(t => t.id === activeTab)?.icon}
                            </span>
                            <span className="font-mono text-xs text-primary uppercase tracking-widest">
                                {TABS.find(t => t.id === activeTab)?.label}
                            </span>
                        </div>
                        <button onClick={() => setActiveTab(null)} className="text-slate-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                        </button>
                    </div>
                    {/* Drawer content */}
                    <div className="flex-1 overflow-hidden">
                        {activeTab === 'terminal' && <TerminalDrawer onClose={() => setActiveTab(null)} />}
                        {activeTab === 'communication' && <CommunicationDrawer />}
                        {activeTab === 'analytics' && <AnalyticsDrawer />}
                    </div>
                </div>
            )}

            {/* Footer tab bar */}
            <footer className="fixed bottom-0 left-0 w-full h-12 bg-background/90 backdrop-blur-2xl z-50 flex items-center border-t border-primary/15 px-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                {/* Left: ticker */}
                <div className="flex-1 hidden md:flex items-center gap-2 overflow-hidden">
                    <span className="text-[9px] font-mono text-outline-variant italic uppercase tracking-tight whitespace-nowrap">
                        SYSTEM_INITIALIZED: STANDBY FOR AGENT HANDSHAKE...
                    </span>
                </div>

                {/* Centre: tabs */}
                <div className="flex items-center gap-1 shrink-0">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => toggle(tab.id)}
                            className={`flex items-center gap-2 px-4 h-12 transition-all border-t-2 font-mono text-[10px] tracking-widest uppercase ${activeTab === tab.id
                                    ? 'border-primary text-primary bg-primary/10'
                                    : 'border-transparent text-slate-500 hover:text-primary hover:bg-white/5'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Right: session info */}
                <div className="flex-1 hidden md:flex items-center justify-end gap-2 text-[9px] font-mono text-outline-variant/50">
                    <span>SESSION: IDLE</span>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
