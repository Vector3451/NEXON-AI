import React, { useState, useEffect } from 'react';
import { config } from '../config';

const OllamaModelPicker = ({ value, onChange, accentColor }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchModels = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${config.API_BASE}/models`);
            if (!res.ok) throw new Error('Backend not reachable');
            const data = await res.json();
            setModels((data.local_models || []).map(m => ({ name: m })));
        } catch (e) {
            setError('Backend offline or Ollama disconnected');
            setModels([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchModels(); }, []);

    useEffect(() => {
        if (models.length > 0 && value !== undefined) {
            const isInstalled = models.some(m => m.name === value);
            if (!isInstalled) {
                onChange(models[0].name);
            }
        }
    }, [models, value, onChange]);

    const borderClass = accentColor === 'primary' ? 'border-primary/30 focus:border-primary' : 'border-secondary/30 focus:border-secondary';
    const textClass = accentColor === 'primary' ? 'text-primary' : 'text-secondary';

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Local Ollama Models</label>
                <button
                    onClick={fetchModels}
                    className={`flex items-center gap-1 text-[9px] font-mono ${textClass} hover:opacity-70 transition-opacity`}
                >
                    <span className={`material-symbols-outlined text-xs ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    {loading ? 'Scanning...' : 'Refresh'}
                </button>
            </div>
            {error ? (
                <div className="flex items-center gap-2 py-2 border-b border-error/30">
                    <span className="material-symbols-outlined text-error text-sm">wifi_off</span>
                    <span className="text-[10px] font-mono text-error">{error}</span>
                </div>
            ) : (
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={`w-full bg-surface-container-lowest border-b ${borderClass} py-2 font-mono text-sm text-on-surface cursor-pointer focus:outline-none transition-all`}
                >
                    {models.length === 0 && <option value={value}>{value || "No models found"}</option>}
                    {models.length > 0 && !models.find(m => m.name === value) && value && <option value={value}>{value} (Not installed locally)</option>}
                    {models.length > 0 && !value && <option value="" disabled>Select a model...</option>}
                    {models.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                </select>
            )}
            {models.length > 0 && (
                <p className={`text-[9px] font-mono ${textClass} opacity-50 text-right mt-1`}>{models.length} model{models.length !== 1 ? 's' : ''} available locally</p>
            )}
        </div>
    );
};

const HFModelPicker = ({ value, onChange, accentColor }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await fetch(`${config.API_BASE}/models/hf`);
                if (res.ok) {
                    const data = await res.json();
                    setModels(data.models || []);
                } else {
                    setModels([]);
                }
            } catch (e) {
                setModels([]);
            } finally {
                setLoading(false);
            }
        };
        fetchModels();
    }, []);

    const borderClass = accentColor === 'primary' ? 'border-primary/30 focus:border-primary' : 'border-secondary/30 focus:border-secondary';
    const textClass = accentColor === 'primary' ? 'text-primary' : 'text-secondary';

    const groupedModels = models.reduce((acc, model) => {
        const org = model.split('/')[0];
        if (!acc[org]) acc[org] = [];
        acc[org].push(model);
        return acc;
    }, {});

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">HuggingFace Models</label>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`text-[9px] font-mono ${textClass} hover:opacity-70 transition-opacity`}
                >
                    {expanded ? '▲ Collapse' : '▼ Expand'}
                </button>
            </div>
            {loading ? (
                <div className="flex items-center gap-2 py-2">
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span className="text-[10px] font-mono text-slate-500">Loading models...</span>
                </div>
            ) : expanded ? (
                <div className="max-h-48 overflow-y-auto bg-surface-container-lowest rounded border border-white/5">
                    {Object.entries(groupedModels).map(([org, orgModels]) => (
                        <div key={org}>
                            <div className="px-3 py-1 bg-surface-container-highest text-[9px] font-mono text-slate-400 uppercase sticky top-0">
                                {org}
                            </div>
                            {orgModels.map(model => (
                                <button
                                    key={model}
                                    onClick={() => onChange(model)}
                                    className={`w-full text-left px-3 py-1.5 text-[10px] font-mono transition-all hover:bg-surface-container-high ${
                                        value === model ? `${textClass} bg-primary/10` : 'text-on-surface'
                                    }`}
                                >
                                    {model.split('/')[1]}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className={`w-full bg-surface-container-lowest border-b ${borderClass} py-2 font-mono text-xs text-on-surface cursor-pointer focus:outline-none transition-all`}
                >
                    {models.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
            )}
            <p className={`text-[9px] font-mono ${textClass} opacity-50`}>{models.length} models available</p>
        </div>
    );
};

const ROLES = ["INVESTIGATOR", "VALIDATOR", "FORENSIC_ANALYST", "NETWORK_ENGINEER", "SYSTEM_ADMIN", "SECURITY_ARCHITECT", "COMPLIANCE_OFFICER", "CUSTOM_ROLE"];

const SettingsView = () => {
    const [agentA, setAgentA] = useState({ provider: 'hf', model: '', hfModel: 'meta-llama/Llama-3.1-8B-Instruct', openaiModel: 'gpt-4o', temp: 0.7, role: 'INVESTIGATOR', customRoleName: '', customPrompt: '' });
    const [agentB, setAgentB] = useState({ provider: 'hf', model: '', hfModel: 'meta-llama/Llama-3.2-1B-Instruct', openaiModel: 'gpt-4o-mini', temp: 0.5, role: 'VALIDATOR', customRoleName: '', customPrompt: '' });
    const [openaiKey, setOpenaiKey] = useState('');
    const [maxSteps, setMaxSteps] = useState(12);
    const [complexity, setComplexity] = useState('LEVEL_02: ADVERSARIAL');
    const [saved, setSaved] = useState(false);
    const [executionMode, setExecutionMode] = useState('simulated');
    const [sshConfig, setSshConfig] = useState({ host: '', port: 22, user: '', password: '' });
    const [sshTestStatus, setSshTestStatus] = useState(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${config.API_BASE}/config`);
                const data = await res.json();
                const roleA = data.models.agent_a_role || 'INVESTIGATOR';
                const roleB = data.models.agent_b_role || 'VALIDATOR';
                setAgentA({
                    provider: data.models.agent_a_provider || 'hf',
                    model: data.models.agent_a,
                    hfModel: data.models.agent_a?.includes('/') ? data.models.agent_a : 'meta-llama/Llama-3.1-8B-Instruct',
                    temp: data.models.agent_a_temp,
                    role: roleA.startsWith('CUSTOM_') ? 'CUSTOM_ROLE' : roleA,
                    customRoleName: roleA.startsWith('CUSTOM_') ? roleA.replace('CUSTOM_', '').replace(/_/g, ' ') : '',
                    customPrompt: data.models.agent_a_system_prompt || ''
                });
                setAgentB({
                    provider: data.models.agent_b_provider || 'hf',
                    model: data.models.agent_b,
                    hfModel: data.models.agent_b?.includes('/') ? data.models.agent_b : 'meta-llama/Llama-3.2-1B-Instruct',
                    temp: data.models.agent_b_temp,
                    role: roleB.startsWith('CUSTOM_') ? 'CUSTOM_ROLE' : roleB,
                    customRoleName: roleB.startsWith('CUSTOM_') ? roleB.replace('CUSTOM_', '').replace(/_/g, ' ') : '',
                    customPrompt: data.models.agent_b_system_prompt || ''
                });
                setAgentB({
                    provider: data.models.agent_b_provider || 'ollama',
                    model: data.models.agent_b,
                    hfModel: 'Qwen/Qwen2.5-3B-Instruct',
                    temp: data.models.agent_b_temp,
                    role: roleB.startsWith('CUSTOM_') ? 'CUSTOM_ROLE' : roleB,
                    customRoleName: roleB.startsWith('CUSTOM_') ? roleB.replace('CUSTOM_', '').replace(/_/g, ' ') : '',
                    customPrompt: data.models.agent_b_system_prompt || ''
                });
                if (data.models.openai_api_key) setOpenaiKey(data.models.openai_api_key);
                setMaxSteps(data.episode.max_steps);
                if (data.execution) {
                    setExecutionMode(data.execution.mode || 'simulated');
                    setSshConfig({
                        host: data.execution.ssh_host || '',
                        port: data.execution.ssh_port || 22,
                        user: data.execution.ssh_user || '',
                        password: data.execution.ssh_password || ''
                    });
                }
            } catch (e) {
                console.error("Failed to fetch initial config", e);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        try {
            await fetch(`${config.API_BASE}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    MAX_STEPS: maxSteps,
                    AGENT_A_MODEL: agentA.provider === 'ollama' ? agentA.model : (agentA.provider === 'openai' ? agentA.openaiModel : agentA.hfModel),
                    AGENT_B_MODEL: agentB.provider === 'ollama' ? agentB.model : (agentB.provider === 'openai' ? agentB.openaiModel : agentB.hfModel),
                    AGENT_A_PROVIDER: agentA.provider,
                    AGENT_B_PROVIDER: agentB.provider,
                    AGENT_A_ROLE: agentA.role === 'CUSTOM_ROLE' ? `CUSTOM_${agentA.customRoleName.replace(/ /g, '_').toUpperCase()}` : agentA.role,
                    AGENT_B_ROLE: agentB.role === 'CUSTOM_ROLE' ? `CUSTOM_${agentB.customRoleName.replace(/ /g, '_').toUpperCase()}` : agentB.role,
                    AGENT_A_SYSTEM_PROMPT: agentA.customPrompt,
                    AGENT_B_SYSTEM_PROMPT: agentB.customPrompt,
                    AGENT_A_TEMPERATURE: agentA.temp,
                    AGENT_B_TEMPERATURE: agentB.temp,
                    EXECUTION_MODE: executionMode,
                    SSH_HOST: sshConfig.host,
                    SSH_PORT: sshConfig.port,
                    SSH_USER: sshConfig.user,
                    SSH_PASSWORD: sshConfig.password,
                    OPENAI_API_KEY: openaiKey
                })
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Save failed", e);
        }
    };

    // Auto-sync active settings so navigation doesn't wipe them
    useEffect(() => {
        if (!agentA.model && !agentB.model) return; // Wait for initial load or valid models
        fetch(`${config.API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                MAX_STEPS: maxSteps,
                AGENT_A_MODEL: agentA.provider === 'ollama' ? agentA.model : (agentA.provider === 'openai' ? agentA.openaiModel : agentA.hfModel),
                AGENT_B_MODEL: agentB.provider === 'ollama' ? agentB.model : (agentB.provider === 'openai' ? agentB.openaiModel : agentB.hfModel),
                AGENT_A_PROVIDER: agentA.provider,
                AGENT_B_PROVIDER: agentB.provider,
                AGENT_A_ROLE: agentA.role === 'CUSTOM_ROLE' ? `CUSTOM_${agentA.customRoleName.replace(/ /g, '_').toUpperCase()}` : agentA.role,
                AGENT_B_ROLE: agentB.role === 'CUSTOM_ROLE' ? `CUSTOM_${agentB.customRoleName.replace(/ /g, '_').toUpperCase()}` : agentB.role,
                AGENT_A_SYSTEM_PROMPT: agentA.customPrompt,
                AGENT_B_SYSTEM_PROMPT: agentB.customPrompt,
                AGENT_A_TEMPERATURE: agentA.temp,
                AGENT_B_TEMPERATURE: agentB.temp,
                EXECUTION_MODE: executionMode,
                SSH_HOST: sshConfig.host,
                SSH_PORT: sshConfig.port,
                SSH_USER: sshConfig.user,
                SSH_PASSWORD: sshConfig.password,
                OPENAI_API_KEY: openaiKey
            })
        }).catch(e => { });
    }, [agentA, agentB, maxSteps, executionMode, sshConfig, openaiKey]);

    const ProviderToggle = ({ agent, agentId, onSetAgent }) => (
        <div className="flex gap-2 p-1 bg-surface-container-highest rounded-lg border border-white/5">
            {['ollama', 'hf', 'openai'].map(p => (
                <button
                    key={p}
                    onClick={() => onSetAgent(a => ({ ...a, provider: p }))}
                    className={`flex-1 py-1 px-3 rounded text-[10px] font-mono font-bold uppercase transition-all ${agent.provider === p ? (agentId === 'A' ? 'bg-primary text-black' : 'bg-secondary text-black') : 'text-outline-variant hover:text-white'}`}
                >
                    {p === 'ollama' ? 'Local Ollama' : (p === 'hf' ? 'Hugging Face' : 'OpenAI')}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <section className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-primary"></div>
                        <span className="font-mono text-xs tracking-[0.3em] text-primary uppercase">NEXUS_CORE_V2.0</span>
                    </div>
                    <h1 className="text-5xl font-headline font-bold text-on-surface tracking-tight leading-none mb-4 uppercase">
                        Settings <span className="text-primary/40">Configuration</span>
                    </h1>
                    <p className="text-on-surface-variant font-body leading-relaxed max-w-lg">
                        Calibrate the investigation environment for active agents. Adjust neural temperature, step limits, and procedural complexity.
                    </p>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                {/* Agent A Config */}
                <div className="md:col-span-6 glass-panel rounded-xl p-8 relative overflow-hidden group refractive-edge h-full">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <span className="material-symbols-outlined text-primary">smart_toy</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-headline text-xl font-bold uppercase">Agent A <span className="text-primary text-sm ml-2 tracking-tighter">[PRIMARY]</span></h3>
                                    <p className="font-mono text-[10px] text-slate-500 uppercase">Neural Processing Unit 01</p>
                                </div>
                                <ProviderToggle agent={agentA} agentId="A" onSetAgent={setAgentA} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        {agentA.provider === 'ollama' ? (
                            <OllamaModelPicker
                                value={agentA.model}
                                onChange={v => setAgentA(a => ({ ...a, model: v }))}
                                accentColor="primary"
                            />
                        ) : agentA.provider === 'hf' ? (
                            <HFModelPicker
                                value={agentA.hfModel}
                                onChange={v => setAgentA(a => ({ ...a, hfModel: v }))}
                                accentColor="primary"
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">OpenAI API Key</label>
                                    <input
                                        className="w-full bg-transparent border-0 border-b border-primary/30 py-2 font-mono text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-slate-700"
                                        placeholder="sk-..."
                                        type="password"
                                        value={openaiKey}
                                        onChange={e => setOpenaiKey(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">OpenAI Model Name</label>
                                    <input
                                        className="w-full bg-transparent border-0 border-b border-primary/30 py-2 font-mono text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-slate-700"
                                        placeholder="gpt-4o"
                                        type="text"
                                        value={agentA.openaiModel}
                                        onChange={e => setAgentA(a => ({ ...a, openaiModel: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Neural Temperature</label>
                                <span className="font-mono text-xs text-primary font-bold">{agentA.temp.toFixed(1)}</span>
                            </div>
                            <input
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary bg-surface-container-highest"
                                max="1" min="0" step="0.1" type="range"
                                value={agentA.temp}
                                onChange={e => setAgentA(a => ({ ...a, temp: parseFloat(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Operational Role</label>
                            <select
                                className="w-full bg-surface-container-lowest border-b border-primary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-primary transition-all cursor-pointer"
                                value={agentA.role}
                                onChange={e => setAgentA(a => ({ ...a, role: e.target.value }))}
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                            </select>

                            {agentA.role === 'CUSTOM_ROLE' && (
                                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="font-mono text-[9px] tracking-widest text-primary uppercase">Custom Role Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. DATABASE NINJA"
                                            value={agentA.customRoleName}
                                            onChange={e => setAgentA(a => ({ ...a, customRoleName: e.target.value }))}
                                            className="w-full bg-transparent border-0 border-b border-primary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-mono text-[9px] tracking-widest text-primary uppercase flex justify-between">
                                            <span>System Prompt Configuration</span>
                                        </label>
                                        <textarea
                                            placeholder="You are an elite expert... Your objective is to..."
                                            value={agentA.customPrompt}
                                            onChange={e => setAgentA(a => ({ ...a, customPrompt: e.target.value }))}
                                            className="w-full h-32 bg-surface-container-lowest text-primary font-mono text-[10px] p-3 rounded border border-white/5 focus:border-primary/50 focus:outline-none leading-relaxed"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Agent B Config */}
                <div className="md:col-span-6 glass-panel rounded-xl p-8 relative overflow-hidden group refractive-edge h-full">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center border border-secondary/20">
                            <span className="material-symbols-outlined text-secondary">memory</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-headline text-xl font-bold uppercase">Agent B <span className="text-secondary text-sm ml-2 tracking-tighter">[SECONDARY]</span></h3>
                                    <p className="font-mono text-[10px] text-slate-500 uppercase">Logical Validation Unit 02</p>
                                </div>
                                <ProviderToggle agent={agentB} agentId="B" onSetAgent={setAgentB} />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        {agentB.provider === 'ollama' ? (
                            <OllamaModelPicker
                                value={agentB.model}
                                onChange={v => setAgentB(b => ({ ...b, model: v }))}
                                accentColor="secondary"
                            />
                        ) : agentB.provider === 'hf' ? (
                            <HFModelPicker
                                value={agentB.hfModel}
                                onChange={v => setAgentB(b => ({ ...b, hfModel: v }))}
                                accentColor="secondary"
                            />
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Global OpenAI API Key</label>
                                    <input
                                        className="w-full bg-transparent border-0 border-b border-secondary/30 py-2 font-mono text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-slate-700"
                                        placeholder="sk-..."
                                        type="password"
                                        value={openaiKey}
                                        onChange={e => setOpenaiKey(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">OpenAI Model Name</label>
                                    <input
                                        className="w-full bg-transparent border-0 border-b border-secondary/30 py-2 font-mono text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-slate-700"
                                        placeholder="gpt-4o-mini"
                                        type="text"
                                        value={agentB.openaiModel}
                                        onChange={e => setAgentB(b => ({ ...b, openaiModel: e.target.value }))}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Neural Temperature</label>
                                <span className="font-mono text-xs text-secondary font-bold">{agentB.temp.toFixed(1)}</span>
                            </div>
                            <input
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-secondary bg-surface-container-highest"
                                max="1" min="0" step="0.1" type="range"
                                value={agentB.temp}
                                onChange={e => setAgentB(b => ({ ...b, temp: parseFloat(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Operational Role</label>
                            <select
                                className="w-full bg-surface-container-lowest border-b border-secondary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-secondary transition-all cursor-pointer"
                                value={agentB.role}
                                onChange={e => setAgentB(b => ({ ...b, role: e.target.value }))}
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                            </select>

                            {agentB.role === 'CUSTOM_ROLE' && (
                                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <label className="font-mono text-[9px] tracking-widest text-secondary uppercase">Custom Role Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. LOGICAL SKEPTIC"
                                            value={agentB.customRoleName}
                                            onChange={e => setAgentB(b => ({ ...b, customRoleName: e.target.value }))}
                                            className="w-full bg-transparent border-0 border-b border-secondary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-mono text-[9px] tracking-widest text-secondary uppercase flex justify-between">
                                            <span>System Prompt Configuration</span>
                                        </label>
                                        <textarea
                                            placeholder="You are an expert... Challenge your partner..."
                                            value={agentB.customPrompt}
                                            onChange={e => setAgentB(b => ({ ...b, customPrompt: e.target.value }))}
                                            className="w-full h-32 bg-surface-container-lowest text-secondary font-mono text-[10px] p-3 rounded border border-white/5 focus:border-secondary/50 focus:outline-none leading-relaxed"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Execution Environment */}
                <div className="md:col-span-12 glass-panel rounded-xl p-8 refractive-edge">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center border border-tertiary/20">
                            <span className="material-symbols-outlined text-tertiary">lan</span>
                        </div>
                        <div>
                            <h3 className="font-headline text-xl font-bold uppercase tracking-tight">Execution Environment</h3>
                            <p className="font-mono text-[10px] text-slate-500 uppercase">Agent Tool Execution Mode</p>
                        </div>
                    </div>
                    {/* Mode Toggle */}
                    <div className="flex gap-2 p-1 bg-surface-container-highest rounded-lg border border-white/5 mb-6 max-w-sm">
                        {[{ id: 'simulated', label: 'Simulated', icon: 'psychology' }, { id: 'ssh', label: 'SSH Lab Node', icon: 'terminal' }].map(m => (
                            <button
                                key={m.id}
                                id={`exec-mode-${m.id}`}
                                onClick={() => setExecutionMode(m.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-[11px] font-mono font-bold uppercase transition-all ${executionMode === m.id ? 'bg-tertiary text-black' : 'text-outline-variant hover:text-white'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">{m.icon}</span>
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {executionMode === 'simulated' && (
                        <p className="font-mono text-xs text-slate-500">
                            Agents use pre-scripted scenario data (clue maps). No real system is touched.
                        </p>
                    )}

                    {executionMode === 'ssh' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Host / IP</label>
                                <input id="ssh-host" type="text" placeholder="192.168.1.100"
                                    className="w-full bg-transparent border-0 border-b border-tertiary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-tertiary transition-all placeholder:text-slate-700"
                                    value={sshConfig.host} onChange={e => setSshConfig(s => ({ ...s, host: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Port</label>
                                <input id="ssh-port" type="number" placeholder="22"
                                    className="w-full bg-transparent border-0 border-b border-tertiary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-tertiary transition-all placeholder:text-slate-700"
                                    value={sshConfig.port} onChange={e => setSshConfig(s => ({ ...s, port: parseInt(e.target.value) || 22 }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Username</label>
                                <input id="ssh-user" type="text" placeholder="sandbox"
                                    className="w-full bg-transparent border-0 border-b border-tertiary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-tertiary transition-all placeholder:text-slate-700"
                                    value={sshConfig.user} onChange={e => setSshConfig(s => ({ ...s, user: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Password</label>
                                <input id="ssh-password" type="password" placeholder="••••••••"
                                    className="w-full bg-transparent border-0 border-b border-tertiary/30 py-2 font-mono text-sm text-on-surface focus:outline-none focus:border-tertiary transition-all placeholder:text-slate-700"
                                    value={sshConfig.password} onChange={e => setSshConfig(s => ({ ...s, password: e.target.value }))} />
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4 pt-2">
                                <button
                                    id="ssh-test-btn"
                                    onClick={async () => {
                                        setSshTestStatus('testing');
                                        try {
                                            const res = await fetch(`${config.API_BASE}/config/ssh-test`, { method: 'POST' });
                                            const data = await res.json();
                                            setSshTestStatus(data.success ? 'ok' : 'fail');
                                        } catch { setSshTestStatus('fail'); }
                                        setTimeout(() => setSshTestStatus(null), 4000);
                                    }}
                                    className="flex items-center gap-2 px-6 py-2 border border-tertiary/40 rounded text-tertiary font-mono text-xs uppercase hover:bg-tertiary/10 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm">{sshTestStatus === 'testing' ? 'sync' : 'cable'}</span>
                                    {sshTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                </button>
                                {sshTestStatus === 'ok' && <span className="font-mono text-xs text-success">✓ Connected successfully</span>}
                                {sshTestStatus === 'fail' && <span className="font-mono text-xs text-error">✗ Connection failed — check credentials</span>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Environmental Parameters */}
                <div className="md:col-span-8 glass-panel rounded-xl p-8 refractive-edge">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center border border-white/5">
                            <span className="material-symbols-outlined text-on-surface-variant">settings_suggest</span>
                        </div>
                        <h3 className="font-headline text-xl font-bold uppercase tracking-tight">Environmental Parameters</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Max Inference Steps</label>
                                <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded font-mono text-sm text-primary font-bold min-w-[40px] text-center">{maxSteps}</div>
                            </div>
                            <input
                                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                                max="16" min="4" step="1" type="range"
                                value={maxSteps}
                                onChange={e => setMaxSteps(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">Complexity Level</label>
                            <select
                                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-4 py-3 appearance-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-on-surface cursor-pointer"
                                value={complexity}
                                onChange={e => setComplexity(e.target.value)}
                            >
                                <option>LEVEL_01: NOMINAL</option>
                                <option>LEVEL_02: ADVERSARIAL</option>
                                <option>LEVEL_03: CHAOS_SIM</option>
                                <option>LEVEL_04: BLACK_BOX</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sync Status */}
                <div className="md:col-span-4 h-full">
                    <div className="glass-panel rounded-xl p-8 border-l-2 border-primary refractive-edge h-full flex flex-col justify-center">
                        <h4 className="font-mono text-[10px] tracking-[0.2em] text-primary uppercase mb-4">Sync Status</h4>
                        <div className="space-y-2 font-mono text-[10px] text-slate-500 uppercase">
                            <p>Persistence: ACTIVE</p>
                            <p>Node: NY-SOC-04</p>
                            <p>Version: 2.0.4-STABLE</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 py-10 border-t border-white/5">
                <div className="font-mono text-[10px] text-slate-500 uppercase tracking-tight">
                    System parameters are synchronized with NEXUS-CORE-API.
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { setAgentA(a => ({ ...a, model: '', provider: 'ollama' })); setAgentB(b => ({ ...b, model: '', provider: 'ollama' })); setMaxSteps(12); }}
                        className="px-8 py-3 bg-surface-container-high text-on-surface-variant font-headline font-bold text-sm tracking-widest rounded hover:bg-surface-container-highest hover:text-white transition-all uppercase"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleSave}
                        className={`px-10 py-3 font-headline font-bold text-sm tracking-[0.2em] rounded transition-all uppercase ${saved ? 'bg-tertiary/20 border border-tertiary text-tertiary' : 'bg-primary text-black hover:bg-primary/80'}`}
                    >
                        {saved ? '✓ Saved' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
