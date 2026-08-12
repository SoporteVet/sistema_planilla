/**
 * Cloud Function: proxy seguro hacia OpenRouter
 * La API key se almacena como secreto de Firebase, nunca en el cliente.
 *
 * Despliegue (una sola vez):
 *   1. firebase login
 *   2. firebase functions:secrets:set OPENROUTER_API_KEY
 *   3. cd functions && npm install
 *   4. firebase deploy --only functions
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const openRouterApiKey = defineSecret('OPENROUTER_API_KEY');

const PERMISOS = {
    admin: ['empleados', 'asistencias', 'bonos', 'planillas', 'aguinaldos', 'liquidaciones', 'feriados', 'reportes', 'usuarios', 'jornadas', 'control_asistencia', 'servicios_profesionales', 'cumpleanos'],
    gerente_rrhh: ['empleados', 'asistencias', 'bonos', 'planillas', 'liquidaciones', 'reportes', 'servicios_profesionales'],
    supervisor: ['asistencias'],
    contador: ['planillas', 'liquidaciones', 'reportes'],
    empleado: ['consulta_propia'],
    operador_asistencia: ['control_asistencia']
};

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const APP_NAME = 'Planify - Sistema de Planillas';

async function verificarPermisoReportes(uid) {
    const snap = await admin.database().ref(`usuarios/${uid}`).once('value');
    const perfil = snap.val();
    if (!perfil || !perfil.rol) return false;
    const permisos = PERMISOS[perfil.rol] || [];
    return permisos.includes('reportes');
}

/**
 * Proxy de chat completions hacia OpenRouter.
 * Solo usuarios autenticados con permiso "reportes" pueden invocarla.
 */
exports.aiChat = onCall(
    {
        secrets: [openRouterApiKey],
        region: 'us-central1',
        maxInstances: 10,
        timeoutSeconds: 120
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Debe iniciar sesión para usar el Asistente IA.');
        }

        const tienePermiso = await verificarPermisoReportes(request.auth.uid);
        if (!tienePermiso) {
            throw new HttpsError('permission-denied', 'No tiene permisos para usar el Asistente IA.');
        }

        const apiKey = openRouterApiKey.value();
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'El servicio de IA no está configurado en el servidor. Contacte al administrador.');
        }

        const { messages, options = {} } = request.data || {};

        if (!Array.isArray(messages) || messages.length === 0) {
            throw new HttpsError('invalid-argument', 'Se requieren mensajes válidos.');
        }

        const body = {
            model: options.model || DEFAULT_MODEL,
            messages,
            temperature: options.temperature ?? 0.2,
            max_tokens: options.maxTokens ?? 8192
        };

        if (options.jsonMode) {
            body.response_format = { type: 'json_object' };
        }

        let response;
        try {
            response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://sistemaplanilla.firebaseapp.com',
                    'X-Title': APP_NAME
                },
                body: JSON.stringify(body)
            });
        } catch (err) {
            console.error('Error conectando con OpenRouter:', err);
            throw new HttpsError('unavailable', 'No se pudo conectar con el servicio de IA.');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const msg = data.error?.message || `Error de OpenRouter (${response.status})`;
            console.error('OpenRouter error:', msg);
            throw new HttpsError('internal', msg);
        }

        const content = data.choices?.[0]?.message?.content || '';
        return { content };
    }
);

/**
 * Verifica que el servicio IA esté configurado (sin exponer la key).
 */
exports.aiStatus = onCall(
    {
        secrets: [openRouterApiKey],
        region: 'us-central1'
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
        }

        const tienePermiso = await verificarPermisoReportes(request.auth.uid);
        if (!tienePermiso) {
            return { available: false, reason: 'sin_permiso' };
        }

        // Solo indica si el secreto existe; no revela su valor
        let configured = false;
        try {
            configured = !!openRouterApiKey.value();
        } catch (_) {
            configured = false;
        }

        return { available: configured, reason: configured ? 'ok' : 'no_configurado' };
    }
);
