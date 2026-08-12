/**
 * Configuración del Asistente IA (cliente)
 *
 * BACKEND disponibles (la API key NUNCA va en este archivo):
 *
 * 1. 'proxy'  — Gratis, sin plan Blaze. Despliegue en Vercel/Netlify (carpeta proxy/).
 * 2. 'firebase' — Requiere plan Blaze de Firebase.
 */

const AI_CONFIG = {
    // 'proxy' = Vercel/Netlify (gratis) | 'firebase' = Cloud Functions (requiere Blaze)
    BACKEND: 'proxy',

    // URL de su proxy desplegado (solo si BACKEND = 'proxy')
    // Ejemplo Vercel: 'https://planify-ai-proxy.vercel.app/api/ai-chat'
    PROXY_URL: 'https://planify-ai-proxy.vercel.app/api/ai-chat',

    MODEL: 'google/gemini-2.5-flash',
    APP_NAME: 'Planify - Sistema de Planillas',
    MAX_TOKENS: 8192,
    TEMPERATURE: 0.2,
    REGION: 'us-central1'
};

let _functionsInstance = null;
let _cachedStatus = null;

function getAIFunctions() {
    if (!_functionsInstance && typeof firebase !== 'undefined') {
        _functionsInstance = firebase.app().functions(AI_CONFIG.REGION);
    }
    return _functionsInstance;
}

function usesProxyBackend() {
    return AI_CONFIG.BACKEND === 'proxy';
}

function isProxyConfigured() {
    return usesProxyBackend() && !!AI_CONFIG.PROXY_URL?.trim();
}

/** Verifica permiso local (sin llamada al servidor) */
function isAIServiceAvailable() {
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) return false;
    if (typeof FirebaseHelpers !== 'undefined' && FirebaseHelpers.tienePermiso) {
        return FirebaseHelpers.tienePermiso('reportes');
    }
    return false;
}

async function _getAuthToken() {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Debe iniciar sesión');
    return user.getIdToken();
}

/** Consulta al servidor si el servicio IA está configurado */
async function checkAIServiceStatus() {
    if (!isAIServiceAvailable()) {
        _cachedStatus = { available: false, reason: 'sin_permiso' };
        return _cachedStatus;
    }

    if (usesProxyBackend()) {
        if (!isProxyConfigured()) {
            _cachedStatus = { available: false, reason: 'proxy_sin_url' };
            return _cachedStatus;
        }
        try {
            const token = await _getAuthToken();
            const statusUrl = AI_CONFIG.PROXY_URL.replace(/\/ai-chat\/?$/, '') + '/ai-status';
            const res = await fetch(statusUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                _cachedStatus = await res.json();
            } else {
                _cachedStatus = { available: true, reason: 'ok' };
            }
        } catch (_) {
            _cachedStatus = { available: true, reason: 'ok' };
        }
        return _cachedStatus;
    }

    try {
        const fn = getAIFunctions().httpsCallable('aiStatus');
        const result = await fn();
        _cachedStatus = result.data;
        return _cachedStatus;
    } catch (err) {
        console.warn('No se pudo verificar estado del servicio IA:', err.message);
        _cachedStatus = { available: false, reason: 'no_desplegado' };
        return _cachedStatus;
    }
}

function isOpenRouterConfigured() {
    if (usesProxyBackend()) return isProxyConfigured();
    return _cachedStatus?.available === true;
}

window.AI_CONFIG = AI_CONFIG;
window.getAIFunctions = getAIFunctions;
window.usesProxyBackend = usesProxyBackend;
window.isProxyConfigured = isProxyConfigured;
window.isAIServiceAvailable = isAIServiceAvailable;
window.checkAIServiceStatus = checkAIServiceStatus;
window.isOpenRouterConfigured = isOpenRouterConfigured;
window.OPENROUTER_CONFIG = AI_CONFIG;
