const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost';

const API_BASE = isProd ? '' : 'http://localhost:7860';

const getWsUrl = () => {
    if (!isProd) return 'ws://localhost:7860/ws';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
};

export const config = {
    API_BASE,
    WS_URL: getWsUrl(),
};
