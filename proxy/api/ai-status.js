const { verificarUsuario, cors } = require('../lib/ai-proxy');

module.exports = async (req, res) => {
    cors(res);

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
        if (req.method === 'GET') {
            const configured = !!process.env.OPENROUTER_API_KEY;
            if (!configured) {
                return res.status(200).json({ available: false, reason: 'no_configurado' });
            }
            if (req.headers.authorization) {
                await verificarUsuario(req.headers.authorization);
            }
            return res.status(200).json({ available: true, reason: 'ok' });
        }

        return res.status(405).json({ error: 'Método no permitido' });
    } catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ available: false, reason: err.message });
    }
};
