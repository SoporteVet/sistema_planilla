const { verificarUsuario, llamarOpenRouter, cors } = require('../lib/ai-proxy');

module.exports = async (req, res) => {
    cors(res);

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        await verificarUsuario(req.headers.authorization);

        const { messages, options } = req.body || {};
        if (!Array.isArray(messages) || !messages.length) {
            return res.status(400).json({ error: 'Se requieren mensajes válidos' });
        }

        const content = await llamarOpenRouter(messages, options || {});
        return res.status(200).json({ content });
    } catch (err) {
        const status = err.status || 500;
        const message = err.message || 'Error interno del servidor';
        console.error('ai-chat error:', message);
        return res.status(status).json({ error: message });
    }
};
