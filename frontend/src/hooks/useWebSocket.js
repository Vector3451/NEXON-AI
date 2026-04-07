import { useState, useEffect, useCallback, useRef } from 'react';

const useWebSocket = (url) => {
    const [events, setEvents] = useState([]);
    const [gameState, setGameState] = useState({
        scenario: null,
        active: false,
        status: 'AWAITING_OBJECTIVE',
        step: 0,
        reward: 0,
        cumulativeReward: 0,
        agent_a_model: '',
        agent_b_model: '',
        agents: {
            agent_a: { status: 'STANDBY', messages: [] },
            agent_b: { status: 'STANDBY', messages: [] }
        },
        clues_found: [],
        rewardBreakdown: {},
        rewardHistory: []
    });

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = new WebSocket(url);

        socketRef.current.onopen = () => setIsConnected(true);

        socketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setEvents(prev => [...prev, data]);

            setGameState(prev => {
                let current = { ...prev };

                if (data.type === 'episode_start') {
                    return {
                        ...current,
                        scenario: data.scenario,
                        active: true,
                        status: 'INVESTIGATING',
                        step: 0,
                        reward: 0,
                        cumulativeReward: 0,
                        clues_found: [],
                        agent_a_model: data.agent_a_model || current.agent_a_model,
                        agent_b_model: data.agent_b_model || current.agent_b_model,
                        agents: {
                            agent_a: { status: 'ACTIVE', messages: [] },
                            agent_b: { status: 'ACTIVE', messages: [] }
                        }
                    };
                }

                const newState = { ...current };

                if (data.step !== undefined) {
                    newState.step = data.step;
                }

                if (data.type === 'agent_partial') {
                    const agentId = data.agent_id;
                    const agents = { ...newState.agents };
                    const agentReference = agents[agentId];
                    if (agentReference) {
                        const agent = { ...agentReference };
                        const messages = [...(agent.messages || [])];
                        const lastMsg = messages[messages.length - 1];
                        if (lastMsg && lastMsg.type === 'message' && lastMsg.partial) {
                            messages[messages.length - 1] = { ...lastMsg, content: data.full_message };
                        } else {
                            messages.push({
                                type: 'message',
                                content: data.full_message,
                                partial: true
                            });
                        }
                        agent.messages = messages;
                        agents[agentId] = agent;
                        newState.agents = agents;
                    }
                }

                if (data.type === 'agent_message') {
                    const agentId = data.agent_id;
                    const agents = { ...newState.agents };
                    const agentReference = agents[agentId];
                    if (agentReference) {
                        const agent = { ...agentReference };
                        const messages = [...(agent.messages || [])];
                        const lastMsg = messages[messages.length - 1];
                        if (lastMsg && lastMsg.partial) {
                            messages[messages.length - 1] = { ...lastMsg, content: data.message, partial: undefined };
                        } else {
                            messages.push({
                                type: 'message',
                                content: data.message
                            });
                        }
                        agent.messages = messages;
                        agents[agentId] = agent;
                        newState.agents = agents;
                    }
                }

                if (data.status === 'READY') {
                    newState.status = 'READY_TO_INJECT';
                    newState.active = false;
                    newState.agents = {
                        agent_a: { ...newState.agents.agent_a, messages: [] },
                        agent_b: { ...newState.agents.agent_b, messages: [] }
                    };
                }

                if (data.type === 'system_status') {
                    if (data.paused !== undefined) {
                        newState.status = data.paused ? 'PAUSED' : 'INVESTIGATING';
                    }
                    if (data.status) {
                        newState.status = data.status;
                    }
                    if (data.active !== undefined) {
                        newState.active = data.active;
                    }
                }

                if (data.type === 'tool_call') {
                    const agentId = data.agent_id;
                    const agents = { ...newState.agents };
                    if (agents[agentId]) {
                        const agent = { ...agents[agentId], messages: [...(agents[agentId].messages || [])] };
                        agent.messages.push({
                            type: 'tool_call',
                            tool_name: data.tool_name,
                            params: data.params
                        });
                        agents[agentId] = agent;
                        newState.agents = agents;
                    }
                }

                if (data.type === 'tool_result') {
                    const agents = { ...newState.agents };
                    const agentAReference = agents.agent_a;
                    if (agentAReference) {
                        const agentA = { ...agentAReference, messages: [...(agentAReference.messages || [])] };
                        agentA.messages.push({
                            type: 'tool_result',
                            tool_name: data.tool_name,
                            result: data.result,
                            success: data.success
                        });
                        agents.agent_a = agentA;
                        newState.agents = agents;
                    }

                    // Simple heuristic for clues if not sent explicitly
                    const res = data.result?.toLowerCase() || '';
                    if (res.includes('error') || res.includes('anomaly') || res.includes('warning') || res.includes('degraded') || data.tool_name === 'propose_fix') {
                        const currentClues = newState.clues_found || [];
                        if (!currentClues.includes(data.result)) {
                            newState.clues_found = [...currentClues, data.result];
                        }
                    }
                }

                if (data.type === 'reward_update') {
                    newState.reward = data.reward;
                    newState.cumulativeReward = data.cumulative;
                    newState.rewardBreakdown = data.breakdown || {};
                    newState.rewardHistory = [...(newState.rewardHistory || []), data.reward];
                }

                if (data.type === 'episode_end') {
                    newState.active = false;
                    newState.status = 'COMPLETED';
                    newState.step = data.steps_taken || newState.step;
                    newState.cumulativeReward = data.final_score !== undefined ? data.final_score : newState.cumulativeReward;
                    newState.finalScore = data.final_score;
                    newState.success = data.success;
                    newState.fixVerified = data.fix_verified;
                    if (data.clues_found) newState.clues_found = data.clues_found;
                    if (data.reward_history) newState.rewardHistory = data.reward_history;
                    if (data.final_breakdown) newState.rewardBreakdown = data.final_breakdown;

                    newState.agents = {
                        agent_a: { ...newState.agents.agent_a, status: 'STANDBY' },
                        agent_b: { ...newState.agents.agent_b, status: 'STANDBY' }
                    };
                }

                return newState;
            });
        };

        socketRef.current.onerror = (err) => setError(err);
        socketRef.current.onclose = () => setIsConnected(false);

        return () => socketRef.current.close();
    }, [url]);

    const sendCommand = useCallback((command) => {
        if (socketRef.current && isConnected) {
            socketRef.current.send(JSON.stringify(command));
        }
    }, [isConnected]);

    return { events, gameState, isConnected, error, sendCommand };
};

export default useWebSocket;
