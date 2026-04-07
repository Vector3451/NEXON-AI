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
        }
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
                const draft = { ...prev };

                if (data.type === 'episode_start') {
                    draft.scenario = data.scenario;
                    draft.active = true;
                    draft.status = 'INVESTIGATING';
                    draft.step = 0;
                    draft.reward = 0;
                    draft.cumulativeReward = 0;
                    draft.clues_found = [];
                    draft.agent_a_model = data.agent_a_model || draft.agent_a_model;
                    draft.agent_b_model = data.agent_b_model || draft.agent_b_model;
                    draft.agents.agent_a = { status: 'ACTIVE', messages: [] };
                    draft.agents.agent_b = { status: 'ACTIVE', messages: [] };
                }

                if (data.step !== undefined) {
                    draft.step = data.step;
                }

                if (data.type === 'agent_partial') {
                    const agent = draft.agents[data.agent_id];
                    if (agent) {
                        const lastMsg = agent.messages[agent.messages.length - 1];
                        if (lastMsg && lastMsg.type === 'message' && lastMsg.partial) {
                            lastMsg.content = data.full_message;
                        } else {
                            agent.messages.push({
                                type: 'message',
                                content: data.full_message,
                                partial: true
                            });
                        }
                    }
                }

                if (data.type === 'agent_message') {
                    const agent = draft.agents[data.agent_id];
                    if (agent) {
                        const lastMsg = agent.messages[agent.messages.length - 1];
                        if (lastMsg && lastMsg.partial) {
                            lastMsg.content = data.message;
                            delete lastMsg.partial;
                        } else {
                            agent.messages.push({
                                type: 'message',
                                content: data.message
                            });
                        }
                    }
                }

                if (data.status === 'READY') {
                    draft.status = 'READY_TO_INJECT';
                    draft.active = false;
                    draft.agents.agent_a.messages = [];
                    draft.agents.agent_b.messages = [];
                }

                if (data.type === 'system_status') {
                    if (data.paused !== undefined) {
                        draft.status = data.paused ? 'PAUSED' : 'INVESTIGATING';
                    }
                    if (data.status) {
                        draft.status = data.status;
                    }
                }

                if (data.type === 'tool_call') {
                    if (draft.agents[data.agent_id]) {
                        draft.agents[data.agent_id].messages.push({
                            type: 'tool_call',
                            tool_name: data.tool_name,
                            params: data.params
                        });
                    }
                }

                if (data.type === 'tool_result') {
                    draft.agents.agent_a.messages.push({
                        type: 'tool_result',
                        tool_name: data.tool_name,
                        result: data.result,
                        success: data.success
                    });
                    
                    // Simple heuristic for clues if not sent explicitly
                    const res = data.result?.toLowerCase() || '';
                    if (res.includes('error') || res.includes('anomaly') || res.includes('warning') || res.includes('degraded') || data.tool_name === 'propose_fix') {
                        if (!draft.clues_found.includes(data.result)) {
                            draft.clues_found.push(data.result);
                        }
                    }
                }

                if (data.type === 'reward_update') {
                    draft.reward = data.reward;
                    draft.cumulativeReward = data.cumulative;
                    draft.rewardBreakdown = data.breakdown || {};
                    draft.rewardHistory = [...(draft.rewardHistory || []), data.reward];
                }

                if (data.type === 'episode_end') {
                    draft.active = false;
                    draft.status = 'COMPLETED';
                    draft.step = data.steps_taken || draft.step;
                    draft.cumulativeReward = data.final_score !== undefined ? data.final_score : draft.cumulativeReward;
                    draft.finalScore = data.final_score;
                    draft.success = data.success;
                    draft.fixVerified = data.fix_verified;
                    if (data.clues_found) {
                        draft.clues_found = data.clues_found;
                    }
                    if (data.reward_history) {
                        draft.rewardHistory = data.reward_history;
                    }
                    if (data.final_breakdown) {
                        draft.rewardBreakdown = data.final_breakdown;
                    }
                    draft.agents.agent_a.status = 'STANDBY';
                    draft.agents.agent_b.status = 'STANDBY';
                }

                return draft;
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
