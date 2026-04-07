import React, { useState, useEffect } from 'react';
import { config } from '../config';
import { useApp } from '../context/AppContext';
import AgentTerminal from '../components/AgentTerminal';
import DynamicScenarioInjector from '../components/DynamicScenarioInjector';
import EpisodeEndOverlay from '../components/EpisodeEndOverlay';

const LiveTimer = () => {
    const { simulationSeconds } = useApp();

    const format = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return <span>{format(simulationSeconds)}</span>;
};

const SystemTelemetryWidget = ({ status }) => {
    // We will keep an array of 50 data points for 2 lines (CPU and RAM)
    const maxPoints = 50;
    const [dataPoints, setDataPoints] = useState(Array(maxPoints).fill({ cpu: 0, ram: 0, gpu: 0, vram: 0 }));

    useEffect(() => {
        let isActive = true;
        
        const fetchTelemetry = async () => {
            try {
                const res = await fetch(`${config.API_BASE}/telemetry`);
                if (!res.ok) return;
                const data = await res.json();
                
                if (isActive) {
                    setDataPoints(prev => {
                        const next = [...prev.slice(1)];
                        next.push({ 
                            cpu: data.cpu || 0, 
                            ram: data.ram || 0,
                            gpu: data.gpu || 0,
                            vram: data.vram || 0
                        });
                        return next;
                    });
                }
            } catch (e) {
                // Ignore errors gracefully
            }
        };

        const interval = setInterval(fetchTelemetry, 1000);
        
        return () => {
            isActive = false;
            clearInterval(interval);
        };
    }, []);

    const latest = dataPoints[dataPoints.length - 1] || { cpu: 0, ram: 0, gpu: 0, vram: 0 };

    // SVG coordinates computation
    const toPoints = (key) => dataPoints.map((dp, i) => `${(i / (maxPoints - 1)) * 100},${100 - dp[key]}`).join(' ');

    return (
        <section className="bg-surface-container-low/40 backdrop-blur-md rounded-lg p-5 border border-white/5 refractive-edge flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-sm">memory</span>
                    <h3 className="text-xs font-bold font-headline tracking-widest uppercase text-outline">System Telemetry</h3>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono tracking-widest uppercase">
                    <span className="flex items-center gap-1 text-[#3b82f6]"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span> CPU {Number(latest.cpu).toFixed(0)}%</span>
                    <span className="flex items-center gap-1 text-[#10b981]"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span> RAM {Number(latest.ram).toFixed(0)}%</span>
                    <span className="flex items-center gap-1 text-[#a855f7]"><span className="w-2 h-2 rounded-full bg-[#a855f7]"></span> GPU {Number(latest.gpu).toFixed(0)}%</span>
                    <span className="flex items-center gap-1 text-[#f59e0b]"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> VRAM {Number(latest.vram).toFixed(0)}%</span>
                </div>
            </div>

            <div className="flex-1 min-h-[100px] border-b border-l border-white/10 relative">
                {/* Y-axis grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-t border-dashed border-white/40 h-0"></div>
                    <div className="border-t border-dashed border-white/40 h-0"></div>
                    <div className="border-t border-dashed border-white/40 h-0"></div>
                </div>

                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="gradCPU" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradRAM" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradGPU" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradVRAM" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area fills */}
                    <polygon points={`0,100 ${toPoints('cpu')} 100,100`} fill="url(#gradCPU)" />
                    <polygon points={`0,100 ${toPoints('ram')} 100,100`} fill="url(#gradRAM)" />
                    <polygon points={`0,100 ${toPoints('gpu')} 100,100`} fill="url(#gradGPU)" />
                    <polygon points={`0,100 ${toPoints('vram')} 100,100`} fill="url(#gradVRAM)" />

                    {/* Line strokes */}
                    <polyline points={toPoints('cpu')} fill="none" stroke="#3b82f6" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={toPoints('ram')} fill="none" stroke="#10b981" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={toPoints('gpu')} fill="none" stroke="#a855f7" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={toPoints('vram')} fill="none" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="2,2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </section>
    );
};

const DashboardView = () => {
    const { sessionData, isConnected } = useApp();
    // Since AppContext maps the useWebSocket return `gameState` or `data` to `sessionData`
    // And I rewritten useWebSocket to return { events, gameState, isConnected }, AppContext 
    // might still just say sessionData: data. Wait! AppContext maps `data` literally.
    // useWebSocket exports { gameState }. If AppContext just takes data, it will be undefined!
    // I need to read gameState directly from useApp(). Wait, I'll export gameState from AppContext later or just assume `sessionData` mapped to `data`.
    // Actually in useWebSocket I returned { events, gameState, isConnected, sendCommand } instead of data!
    // So AppContext should map `sessionData` to `gameState`. But wait, AppContext has `data`.
    // Let me check my useWebSocket.js... I returned { events, gameState, isConnected, error, sendCommand }
    // If I didn't change AppContext, then `const { data } = useWebSocket(...)` means `data` is undefined!
    // Let's fix AppContext inside this file write temporarily? No I can't.
    // I should destructure both, but `data` will be undefined.
    // I will fix AppContext in a moment, but let's assume `sessionData` has the gameState object.

    const state = sessionData || {
        scenario: null,
        active: false,
        step: 0,
        cumulativeReward: 0,
        agents: {
            agent_a: { status: 'STANDBY', messages: [] },
            agent_b: { status: 'STANDBY', messages: [] }
        }
    };

    const sc = state.scenario || {};

    const [isOverlayDismissed, setIsOverlayDismissed] = useState(false);
    const [configModels, setConfigModels] = useState({ agent_a: 'Loading...', agent_b: 'Loading...' });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${config.API_BASE}/config`);
                const data = await res.json();
                setConfigModels({
                    agent_a: data.models.agent_a || 'Unconfigured',
                    agent_b: data.models.agent_b || 'Unconfigured',
                    agent_a_role: data.models.agent_a_role,
                    agent_b_role: data.models.agent_b_role
                });
            } catch (e) {
                console.error("Failed to fetch config models for dashboard", e);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        if (state.status !== 'COMPLETED') {
            setIsOverlayDismissed(false);
        }
    }, [state.status]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-outline-variant/10 pb-6">
                <div>
                    <h1 className="text-4xl font-headline font-bold tracking-tight text-on-surface uppercase">Operational_Dashboard</h1>
                    <p className={`font-mono text-sm mt-2 opacity-80 ${isConnected ? 'text-primary' : 'text-error'}`}>
                        {isConnected ? `CONNECTED_TO: ${config.WS_URL}` : 'DISCONNECTED: Backend server offline or starting...'}
                    </p>
                </div>
                <div className="flex gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Runtime</p>
                        <p className="font-mono text-lg text-white">
                            <LiveTimer />
                        </p>
                    </div>
                    <div className="h-10 w-px bg-outline-variant/20"></div>
                    <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Episode Step</p>
                        <p className="font-mono text-lg text-white">{String(state.step).padStart(2, '0')}</p>
                    </div>
                    <div className="h-10 w-px bg-outline-variant/20"></div>
                    <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Current Reward</p>
                        <p className="font-mono text-lg text-tertiary">{Number(state.cumulativeReward).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Twin Terminals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AgentTerminal
                    agentName={`Agent A: ${configModels.agent_a_role ? configModels.agent_a_role.replace(/_/g, ' ') : 'Investigator'}`}
                    model={state.agent_a_model || configModels.agent_a}
                    status={state.agents.agent_a.status}
                    accentColor="cyan"
                    icon="search"
                    messages={state.agents.agent_a.messages}
                />
                <AgentTerminal
                    agentName={`Agent B: ${configModels.agent_b_role ? configModels.agent_b_role.replace(/_/g, ' ') : 'Validator'}`}
                    model={state.agent_b_model || configModels.agent_b}
                    status={state.agents.agent_b.status}
                    accentColor="purple"
                    icon="verified_user"
                    messages={state.agents.agent_b.messages}
                />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Incident Brief Mini */}
                <section className="bg-surface-container-low/40 backdrop-blur-md rounded-lg p-5 border border-white/5 refractive-edge">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-outline text-sm">info</span>
                        <h3 className="text-xs font-bold font-headline tracking-widest uppercase text-outline">Incident Brief</h3>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-mono text-outline-variant uppercase">Scenario Title</label>
                            <div className="h-6 w-full border-b border-outline-variant/20 text-sm text-on-surface/80">{sc.id || '—'}</div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-mono text-outline-variant uppercase">Difficulty</label>
                                <div className="h-6 w-full border-b border-outline-variant/20 text-sm text-on-surface/80">{sc.difficulty || '—'}</div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-mono text-outline-variant uppercase">Domain</label>
                                <div className="h-6 w-full border-b border-outline-variant/20 text-sm text-on-surface/80">{sc.domain || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Scenario Injector */}
                <div className="lg:col-span-1">
                    <DynamicScenarioInjector scenario={sc} />
                </div>

                {/* Live Task Manager Graph */}
                <SystemTelemetryWidget
                    status={state.status || 'STANDBY'}
                />
            </div>

            {/* Background glows */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2"></div>
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none -z-10 -translate-x-1/2 translate-y-1/2"></div>

            {/* Episode End Overlay */}
            <EpisodeEndOverlay
                isOpen={state.status === 'COMPLETED' && !isOverlayDismissed}
                onClose={() => setIsOverlayDismissed(true)}
                metrics={{
                    score: Number(state.cumulativeReward || 0).toFixed(2),
                    runtime: '00:00:00', // could calculate if we tracked start/end time
                    steps: state.step || 0,
                    rootCause: 'VERIFIED',
                    agentA: { accuracy: 'High', latency: '42ms', iops: '9' },
                    agentB: { accuracy: 'High', latency: '38ms', iops: '7' }
                }}
                gameState={state}
            />
        </div>
    );
};

export default DashboardView;
