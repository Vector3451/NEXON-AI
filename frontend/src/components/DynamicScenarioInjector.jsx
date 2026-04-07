import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { config } from '../config';

const DynamicScenarioInjector = ({ scenario }) => {
    const { globalMaxSteps, setGlobalMaxSteps } = useApp();
    const [mode, setMode] = useState('simple'); // 'simple' or 'structured'

    // Auto-update injector fields when scenario prop changes
    useEffect(() => {
        if (scenario && scenario.id) {
            setSimpleText(`name: ${scenario.id}\ncontext: ${scenario.context || ''}\nsymptoms: ${scenario.description || ''}\nobjective: Identify the root cause and propose a verified fix.`);
            setJsonInput(JSON.stringify({
                task: "custom-incident",
                custom_scenario: scenario
            }, null, 2));
        }
    }, [scenario]);

    const [simpleText, setSimpleText] = useState(`name: Database Latency Issue
context: The API connects to a cloud database cluster.
symptoms: Users report 5s delays on GET /users.
objective: Identify if a missing index or connection pool exhaustion is the cause.`);

    const [jsonInput, setJsonInput] = useState(`{
  "task": "software-incident",
  "custom_scenario": {
    "id": "custom-scenario-1",
    "description": "Slow API response times.",
    "context": "Cloud DB cluster.",
    "difficulty": "medium",
    "clue_map": {
      "check_service_status:database": "CPU is high."
    }
  }
}`);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState("");

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                setMode('structured');
                if (!parsed.custom_scenario) {
                    setJsonInput(JSON.stringify({ task: parsed.task || "software-incident", custom_scenario: parsed }, null, 2));
                } else {
                    setJsonInput(JSON.stringify(parsed, null, 2));
                }
            } catch (err) {
                setFeedback("Invalid JSON file uploaded.");
            }
        };
        reader.readAsText(file);
    };

    const submitScenario = async () => {
        setSubmitting(true);
        setFeedback("");
        try {
            let payload;
            if (mode === 'simple') {
                payload = {
                    task: "custom-incident",
                    custom_scenario: {
                        id: `id_${Date.now()}`,
                        description: simpleText,
                        context: "Manually injected scenario description.",
                        difficulty: "medium",
                        clue_map: {}
                    },
                    max_steps: globalMaxSteps
                };
            } else {
                payload = JSON.parse(jsonInput);
                payload.max_steps = globalMaxSteps;
            }

            const res = await fetch(`${config.API_BASE}/reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setFeedback("Scenario injected successfully.");
            } else {
                setFeedback(`Error: ${res.statusText}`);
            }
        } catch (e) {
            setFeedback(`Error: ${e.message}`);
        }
        setSubmitting(false);
    };

    return (
        <section className="bg-surface-container-low/40 backdrop-blur-md rounded-lg p-5 border border-primary/20 refractive-edge">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">data_object</span>
                    <h3 className="text-xs font-bold font-headline tracking-widest uppercase text-primary">Scenario Configurator</h3>
                </div>
                <div className="flex bg-surface-container-highest rounded p-1 border border-white/5">
                    <button
                        onClick={() => setMode('simple')}
                        className={`px-3 py-1 text-[9px] font-bold rounded transition-all ${mode === 'simple' ? 'bg-primary text-surface shadow-lg' : 'text-on-surface/60 hover:text-on-surface'}`}
                    >
                        SIMPLE (TEXT)
                    </button>
                    <button
                        onClick={() => setMode('structured')}
                        className={`px-3 py-1 text-[9px] font-bold rounded transition-all ${mode === 'structured' ? 'bg-primary text-surface shadow-lg' : 'text-on-surface/60 hover:text-on-surface'}`}
                    >
                        STRUCTURED (JSON)
                    </button>
                </div>
            </div>

            {mode === 'simple' ? (
                <textarea
                    className="w-full h-48 bg-surface-container-lowest text-on-surface font-mono text-[11px] p-3 rounded border border-white/5 focus:border-primary/50 focus:outline-none mb-4 leading-relaxed"
                    value={simpleText}
                    onChange={(e) => setSimpleText(e.target.value)}
                    placeholder="Type your scenario description here... (e.g. Symptoms, Objective, etc.)"
                />
            ) : (
                <textarea
                    className="w-full h-48 bg-surface-container-lowest text-primary font-mono text-[10px] p-3 rounded border border-white/5 focus:border-primary/50 focus:outline-none mb-4"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    spellCheck={false}
                />
            )}

            <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="text-[9px] w-full max-w-48 truncate file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-surface-container-highest file:text-on-surface hover:file:bg-primary/20 cursor-pointer"
                    />
                    <span className={`text-[10px] font-mono truncate ${feedback.includes('Error') ? 'text-error' : 'text-tertiary'}`}>
                        {feedback}
                    </span>
                </div>
                
                <div className="flex items-center gap-4 bg-surface-container-highest p-2 rounded border border-white/5 mx-auto lg:mx-0">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-mono uppercase text-on-surface-variant flex justify-between">
                            <span>Max Steps</span>
                            <span className="text-primary font-bold">{globalMaxSteps}</span>
                        </span>
                        <input 
                            type="range" 
                            min="1" 
                            max="100" 
                            value={globalMaxSteps} 
                            onChange={e => setGlobalMaxSteps(parseInt(e.target.value))} 
                            className="w-32 accent-primary h-1 bg-surface-container-lowest rounded-lg appearance-none cursor-pointer mt-1" 
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                        onClick={submitScenario}
                        disabled={submitting}
                        className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 rounded font-headline text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(0,212,255,0.1)] active:scale-95 whitespace-nowrap"
                    >
                        {submitting ? 'Injecting...' : 'Inject & Reset'}
                    </button>
                    <button
                        onClick={() => fetch(`${config.API_BASE}/start-simulation`, { method: "POST" })}
                        className="px-4 py-2 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 rounded font-headline text-xs font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(221,183,255,0.05)] active:scale-95 whitespace-nowrap"
                    >
                        + START FULL SIMULATION
                    </button>
                </div>
            </div>
        </section>
    );
};

export default DynamicScenarioInjector;
