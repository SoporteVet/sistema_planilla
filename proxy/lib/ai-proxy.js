const PERMISOS = {
    admin: ['empleados', 'asistencias', 'bonos', 'planillas', 'aguinaldos', 'liquidaciones', 'feriados', 'reportes', 'usuarios', 'jornadas', 'control_asistencia', 'servicios_profesionales', 'cumpleanos'],
    gerente_rrhh: ['empleados', 'asistencias', 'bonos', 'planillas', 'liquidaciones', 'reportes', 'servicios_profesionales'],
    supervisor: ['asistencias'],
    contador: ['planillas', 'liquidaciones', 'reportes'],
    empleado: ['consulta_propia'],
    operador_asistencia: ['control_asistencia']
};

let _admin = null;

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL
    || 'https://sistemaplanilla-default-rtdb.firebaseio.com';

function getAdmin() {
    if (_admin) return _admin;
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT no configurado');
        const cred = admin.credential.cert(JSON.parse(sa));
        admin.initializeApp({
            credential: cred,
            databaseURL: FIREBASE_DATABASE_URL
        });
    }
    _admin = admin;
    return admin;
}

async function verificarUsuario(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) {
        throw { status: 401, message: 'Token de autenticación requerido' };
    }

    try {
        const token = authHeader.slice(7);
        const admin = getAdmin();
        const decoded = await admin.auth().verifyIdToken(token);

        const snap = await admin.database().ref(`usuarios/${decoded.uid}`).once('value');
        const perfil = snap.val();
        if (!perfil?.rol) {
            throw { status: 403, message: 'Usuario sin rol asignado' };
        }

        const permisos = PERMISOS[perfil.rol] || [];
        if (!permisos.includes('reportes')) {
            throw { status: 403, message: 'No tiene permisos para usar el Asistente IA' };
        }

        return decoded;
    } catch (err) {
        if (err.status) throw err;
        console.error('Error verificando usuario:', err);
        throw { status: 500, message: err.message || 'Error al verificar usuario' };
    }
}

async function llamarOpenRouter(messages, options = {}) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw { status: 503, message: 'OPENROUTER_API_KEY no configurada en el servidor' };
    }

    const body = {
        model: options.model || 'google/gemini-2.5-flash',
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 8192
    };
    if (options.jsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://planify-ai-proxy.vercel.app',
            'X-Title': 'Planify - Sistema de Planillas'
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw { status: 502, message: data.error?.message || `Error OpenRouter (${response.status})` };
    }

    return data.choices?.[0]?.message?.content || '';
}

function cors(res) {
    const origin = process.env.ALLOWED_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

module.exports = { verificarUsuario, llamarOpenRouter, cors, PERMISOS };
