import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { config } from '../config';
import useWebSocket from '../hooks/useWebSocket';
const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [globalMaxSteps, setGlobalMaxSteps] = useState(30);
    const [simulationSeconds, setSimulationSeconds] = useState(0);
    const { gameState, isConnected, sendCommand } = useWebSocket(config.WS_URL);

    useEffect(() => {
        const status = gameState?.status;
        if (status === 'STANDBY' || status === 'COMPLETED') {
            setSimulationSeconds(0);
            return;
        }
        if (status === 'PAUSED') {
            return;
        }
        const interval = setInterval(() => {
            setSimulationSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState?.status]);

    const value = useMemo(() => ({
        sessionData: gameState,
        isConnected,
        sendCommand,
        globalMaxSteps,
        setGlobalMaxSteps,
        simulationSeconds
    }), [gameState, isConnected, sendCommand, globalMaxSteps, simulationSeconds]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
