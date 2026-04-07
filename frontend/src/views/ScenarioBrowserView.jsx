import React, { useState, useEffect } from 'react';
import { config } from '../config';

const STATIC_SCENARIOS = [
    {
        id: 1,
        title: 'GHOST LINK INFILTRATION',
        domain: 'NETWORK',
        difficulty: 'LEVEL 4',
        difficultyNum: 4,
        description: 'Decrypt encrypted command-and-control channels within an enterprise mesh network.',
        accent: 'primary',
        icon: 'shield',
        tag: 'CRITICAL'
    },
    {
        id: 2,
        title: 'ORACLE BREACH TRACE',
        domain: 'DATABASE',
        difficulty: 'LEVEL 2',
        difficultyNum: 2,
        description: 'Perform forensic analysis on a SQL injection attempt. Identify exfiltrated datasets.',
        accent: 'secondary',
        icon: 'database',
        tag: 'COMPLIANCE'
    },
    {
        id: 3,
        title: 'NEBULA API COLLAPSE',
        domain: 'CLOUD FRAMEWORK',
        difficulty: 'LEVEL 5',
        difficultyNum: 5,
        description: 'Massive service degradation across regional clusters. Investigate DDoS vs Zero-Day.',
        accent: 'primary',
        icon: 'cloud',
        tag: null
    },
    {
        id: 4,
        title: 'PHANTOM CREDENTIAL HARVEST',
        domain: 'IDENTITY',
        difficulty: 'LEVEL 3',
        difficultyNum: 3,
        description: 'Trace a credential stuffing attack across microservices. Recover compromised tokens.',
        accent: 'secondary',
        icon: 'fingerprint',
        tag: 'CRITICAL'
    },
    {
        id: 5,
        title: 'SILENT EXFIL TRACE',
        domain: 'ENDPOINT',
        difficulty: 'LEVEL 4',
        difficultyNum: 4,
        description: 'Detect anomalous data outflow from a compromised workstation. Time is critical.',
        accent: 'primary',
        icon: 'leak_remove',
        tag: 'COMPLIANCE'
    }
];

const DIFFICULTY_MAP = { easy: 2, medium: 3, hard: 5 };
const DOMAIN_ICON_MAP = { API: 'api', BACKEND: 'settings', INFRASTRUCTURE: 'dns', NETWORK: 'lan', DATABASE: 'database', CLOUD: 'cloud', CUSTOM: 'extension' };

function mapBackendScenario(s, index) {
    const diffNum = DIFFICULTY_MAP[s.difficulty] || 3;
    const domain = (s.domain || 'BACKEND').toUpperCase();
    return {
        id: `backend-${s.id}`,
        backendId: s.id,
        title: (s.title || s.id).toUpperCase(),
        domain,
        difficulty: `LEVEL ${diffNum}`,
        difficultyNum: diffNum,
        description: s.description || '',
        accent: index % 2 === 0 ? 'primary' : 'secondary',
        icon: DOMAIN_ICON_MAP[domain] || 'bug_report',
        tag: s.difficulty === 'hard' ? 'CRITICAL' : s.difficulty === 'medium' ? 'COMPLIANCE' : null,
        isBackend: true,
        backendTask: s.id.includes('business') ? 'business-process-failure'
            : s.id.includes('cascade') ? 'cascade-system-failure'
            : 'software-incident',
    };
}

const FILTERS = ['ALL', 'CRITICAL', 'COMPLIANCE', 'CUSTOM'];

import { useApp } from '../context/AppContext';

const ScenarioBrowserView = () => {
    const { globalMaxSteps } = useApp();
    const [backendScenarios, setBackendScenarios] = useState([]);
    const [loadingBackend, setLoadingBackend] = useState(true);
    const [customScenarios, setCustomScenarios] = useState(() => {
        try {
            const saved = localStorage.getItem('nexus_custom_scenarios');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [activeFilter, setActiveFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('id');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetch(`${config.API_BASE}/scenarios`)
            .then(r => r.json())
            .then(data => {
                const allBackend = [
                    ...(data.easy || []),
                    ...(data.medium || []),
                    ...(data.hard || []),
                ].map((s, i) => mapBackendScenario(s, i));
                setBackendScenarios(allBackend);
            })
            .catch(() => setBackendScenarios([]))
            .finally(() => setLoadingBackend(false));
    }, []);

    const allScenarios = [...STATIC_SCENARIOS, ...backendScenarios, ...customScenarios];

    const defaultForm = { title: '', domain: 'CUSTOM', difficulty: 'LEVEL 3', difficultyNum: 3, description: '', accent: 'primary', icon: 'extension', tag: 'CUSTOM' };
    const [form, setForm] = useState(defaultForm);

    const handleSave = () => {
        if (!form.title.trim() || !form.description.trim()) return;
        const newScenario = { ...form, id: Date.now(), isCustom: true };
        const updated = [...customScenarios, newScenario];
        setCustomScenarios(updated);
        localStorage.setItem('nexus_custom_scenarios', JSON.stringify(updated));
        setIsCreating(false);
        setForm(defaultForm);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        const updated = customScenarios.filter(s => s.id !== id);
        setCustomScenarios(updated);
        localStorage.setItem('nexus_custom_scenarios', JSON.stringify(updated));
    };

    const injectScenario = async (scenario) => {
        try {
            const body = scenario.isBackend
                ? { task: scenario.backendTask, seed: 42, max_steps: globalMaxSteps }
                : {
                    task: 'custom-incident',
                    custom_scenario: {
                        id: scenario.title,
                        description: scenario.description,
                        context: `Domain: ${scenario.domain}`,
                        difficulty: scenario.difficulty,
                        clue_map: {}
                    },
                    max_steps: globalMaxSteps
                };
            await fetch(`${config.API_BASE}/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            window.location.hash = '#';
        } catch (e) {
            console.error('Failed to inject', e);
        }
    };

    const filtered = allScenarios
        .filter(s => activeFilter === 'ALL' || s.tag === activeFilter)
        .sort((a, b) => sortBy === 'difficulty' ? b.difficultyNum - a.difficultyNum : 0);

    const accentClasses = {
        primary: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
        secondary: { text: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-mono text-[10px] tracking-[0.2em] uppercase">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        Scenario Registry v2.5 — {filtered.length} results
                        {loadingBackend && <span className="text-slate-500 ml-2">· Fetching live scenarios...</span>}
                        {!loadingBackend && backendScenarios.length > 0 && (
                            <span className="text-green-500 ml-2">· {backendScenarios.length} Live scenarios loaded</span>
                        )}
                    </div>
                    <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight uppercase">Nexus Scenario Browser</h1>
                    <p className="text-on-surface-variant max-w-xl text-sm leading-relaxed">
                        Select a tactical simulation to begin intelligence harvesting. Live scenarios are fetched from the backend engine in real-time.
                    </p>
                </div>

                <div className="flex flex-col gap-3 items-end">
                    <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded border border-white/5">
                        {FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-4 py-1.5 text-[10px] font-mono tracking-widest rounded-sm transition-all ${activeFilter === f
                                    ? 'bg-primary text-black font-bold'
                                    : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsCreating(true)} className="flex items-center gap-1 font-mono text-[10px] font-bold text-primary border border-primary/20 px-3 py-1.5 rounded hover:bg-primary/10 transition-colors uppercase">
                            <span className="material-symbols-outlined text-[14px]">add</span> NEW SCENARIO
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-600 uppercase">Sort:</span>
                        <button
                            onClick={() => setSortBy('id')}
                            className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${sortBy === 'id' ? 'text-primary' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            Default
                        </button>
                        <button
                            onClick={() => setSortBy('difficulty')}
                            className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${sortBy === 'difficulty' ? 'text-primary' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            Hardest First
                        </button>
                    </div>
                </div>
            </header>

            {isCreating && (
                <div className="glass-panel p-6 rounded-lg border border-primary/20 bg-surface-container-highest flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
                    <h2 className="text-xl font-headline font-bold text-on-surface uppercase">Create Custom Scenario</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Scenario Title (e.g. INTRUSION)" className="bg-surface p-2 rounded border border-white/5 text-sm text-on-surface font-mono" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        <input type="text" placeholder="Domain (e.g. ENDPOINT)" className="bg-surface p-2 rounded border border-white/5 text-sm text-on-surface font-mono" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} />
                    </div>
                    <textarea placeholder="Detailed description of the incident..." className="bg-surface p-2 rounded border border-white/5 text-sm text-on-surface flex-1 min-h-[80px]" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <label className="text-[10px] font-mono uppercase text-on-surface-variant">Difficulty ({form.difficultyNum}/5)</label>
                            <input type="range" min="1" max="5" value={form.difficultyNum} onChange={e => setForm({ ...form, difficultyNum: parseInt(e.target.value), difficulty: `LEVEL ${e.target.value}` })} className="w-32 accent-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-xs font-mono text-on-surface-variant hover:text-white transition-colors">CANCEL</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-primary text-black font-bold text-xs uppercase font-mono rounded hover:bg-primary/90 transition-colors">SAVE SCENARIO</button>
                        </div>
                    </div>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <span className="material-symbols-outlined text-outline-variant/40 text-5xl mb-3">filter_list_off</span>
                    <p className="font-mono text-sm text-outline-variant uppercase">No scenarios match the filter</p>
                    <button onClick={() => setActiveFilter('ALL')} className="mt-4 text-[10px] font-mono text-primary hover:underline">Clear filter</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((s) => {
                        const ac = accentClasses[s.accent] || accentClasses.primary;
                        return (
                            <div key={s.id} className="glass-panel group flex flex-col transition-all duration-300 hover:ring-2 hover:ring-primary/20 rounded-lg overflow-hidden">
                                <div className="relative h-36 w-full bg-surface-container-highest overflow-hidden flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent z-10"></div>
                                    <div className={`absolute inset-0 ${ac.bg} opacity-30 group-hover:opacity-60 transition-opacity`}></div>
                                    <span className={`material-symbols-outlined text-5xl ${ac.text} opacity-20 group-hover:opacity-40 transition-opacity`}>{s.icon}</span>
                                    {s.tag && (
                                        <div className={`absolute top-3 right-3 backdrop-blur-md px-2 py-0.5 rounded-sm z-20 border ${s.tag === 'CRITICAL' ? 'bg-error/20 border-error/30' : 'bg-tertiary/20 border-tertiary/30'}`}>
                                            <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ${s.tag === 'CRITICAL' ? 'text-error' : 'text-tertiary'}`}>{s.tag}</span>
                                        </div>
                                    )}
                                    {s.isBackend && (
                                        <div className="absolute top-3 left-3 backdrop-blur-md px-2 py-0.5 rounded-sm z-20 border bg-green-500/20 border-green-500/30">
                                            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-green-400">LIVE</span>
                                        </div>
                                    )}
                                    {s.isCustom && (
                                        <button onClick={(e) => handleDelete(e, s.id)} className="absolute top-3 left-3 bg-surface border border-error/20 text-error hover:bg-error hover:text-white p-1 rounded transition-colors opacity-0 group-hover:opacity-100 z-20">
                                            <span className="material-symbols-outlined text-[14px]">delete</span>
                                        </button>
                                    )}
                                </div>
                                <div className="p-6 flex flex-col flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className={`text-[10px] font-mono ${ac.text} tracking-widest mb-1 uppercase`}>{s.domain}</div>
                                            <h3 className="text-lg font-headline font-bold text-on-surface leading-tight">{s.title}</h3>
                                        </div>
                                        <div className={`px-2 py-1 rounded ${ac.bg} border ${ac.border}`}>
                                            <div className={`text-xs font-mono font-bold ${ac.text}`}>{s.difficultyNum}/5</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-on-surface-variant flex-1 line-clamp-2">{s.description}</p>
                                    <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                                        <div className="font-mono text-[9px] text-slate-600 uppercase">{s.difficulty}</div>
                                        <button onClick={() => injectScenario(s)} className={`flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest ${ac.text} hover:text-white transition-colors`}>
                                            SELECT SCENARIO
                                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ScenarioBrowserView;
