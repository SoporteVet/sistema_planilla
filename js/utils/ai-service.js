/**
 * Servicio de IA — proxy seguro (Vercel/Netlify o Firebase Cloud Functions)
 * La API key nunca transita por el navegador.
 */

const AIService = {
    async chat(messages, options = {}) {
        if (!firebase.auth().currentUser) {
            throw new Error('Debe iniciar sesión para usar el Asistente IA.');
        }
        if (typeof FirebaseHelpers !== 'undefined' && !FirebaseHelpers.tienePermiso('reportes')) {
            throw new Error('No tiene permisos para usar el Asistente IA.');
        }

        const payload = {
            messages,
            options: {
                model: options.model || AI_CONFIG.MODEL,
                temperature: options.temperature ?? AI_CONFIG.TEMPERATURE,
                maxTokens: options.maxTokens ?? AI_CONFIG.MAX_TOKENS,
                jsonMode: !!options.jsonMode
            }
        };

        if (usesProxyBackend()) {
            return this._chatViaProxy(payload);
        }
        return this._chatViaFirebase(payload);
    },

    async _chatViaFirebase(payload) {
        const callable = getAIFunctions().httpsCallable('aiChat');
        const result = await callable(payload);
        return result.data?.content || '';
    },

    async _chatViaProxy(payload) {
        if (!isProxyConfigured()) {
            throw new Error('Configure PROXY_URL en js/config/openrouter-config.js');
        }

        const token = await firebase.auth().currentUser.getIdToken();
        const response = await fetch(AI_CONFIG.PROXY_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `Error del proxy (${response.status})`);
        }
        return data.content || '';
    },

    _extractJSON(text) {
        if (!text) return null;
        const trimmed = text.trim();
        try {
            return JSON.parse(trimmed);
        } catch (_) {
            const match = trimmed.match(/\{[\s\S]*\}/);
            if (match) {
                try { return JSON.parse(match[0]); } catch (e) { /* ignore */ }
            }
        }
        return null;
    },

    /** Personalidad base del asistente de RRHH de Planify */
    _getPromptAsistenteRRHH() {
        return `Eres el Asistente IA de Planify, el sistema de planillas de San Martín de Porres (Costa Rica).
Actúas como un especialista en recursos humanos que ayuda al equipo de RRHH a realizar tareas del sistema.

Puedes apoyar en:
- Configurar y actualizar horarios de empleados (entrada/salida por día de la semana)
- Interpretar textos, fotos o documentos con horarios y listas de personal
- Analizar registros del reloj biométrico (marcas, tardías, horas trabajadas)
- Asociar empleados por nombre, cédula o ID de reloj biométrico
- Explicar resultados de asistencia y jornadas laborales costarricenses

Comunicación: español, claro, profesional y orientado a la acción.`;
    },

    _buildUserContent(texto, imagenes = []) {
        if (!imagenes.length) return texto;
        const partes = [];
        if (texto) partes.push({ type: 'text', text: texto });
        imagenes.forEach(img => {
            partes.push({ type: 'image_url', image_url: { url: img.dataUrl } });
        });
        return partes;
    },

    async parsearHorarios(texto, empleados = [], imagenes = []) {
        if (!texto && !imagenes.length) {
            throw new Error('Proporcione texto o imágenes con los horarios');
        }

        const listaEmpleados = empleados
            .filter(e => e.estado === 'activo' && e.tipoEmpleado !== 'SP')
            .map(e => ({
                id: e.id,
                nombre: e.nombre,
                cedula: e.cedula || '',
                idUsuarioReloj: e.idUsuarioReloj || '',
                departamento: e.departamento || ''
            }));

        const systemPrompt = `${this._getPromptAsistenteRRHH()}

Tarea actual: interpretar horarios de empleados y convertirlos al formato del sistema.

Días válidos (claves exactas): domingo, lunes, martes, miercoles, jueves, viernes, sabado
Formato de hora: HH:mm en 24 horas (ej: 08:00, 17:30)
Si un día no tiene horario, omitirlo o dejar entrada/salida null.

Responde SOLO con JSON válido, sin markdown ni texto adicional:
{
  "empleados": [
    {
      "nombre": "Nombre del empleado",
      "cedula": "opcional",
      "idUsuarioReloj": "opcional",
      "horarioPorDia": {
        "lunes": { "entrada": "08:00", "salida": "17:00" }
      },
      "notas": "opcional"
    }
  ],
  "resumen": "Breve resumen de lo interpretado"
}`;

        const instruccion = `Empleados activos en el sistema:
${JSON.stringify(listaEmpleados, null, 2)}

${texto ? `Información adicional en texto:\n"""\n${texto}\n"""` : ''}

${imagenes.length ? 'Analiza también las imágenes adjuntas (pueden ser fotos de tableros de horarios, hojas impresas, capturas de Excel, etc.).' : ''}

Extraiga los horarios y asócielos al empleado correcto usando nombre, cédula o ID de reloj. Si no puede identificar al empleado en el sistema, inclúyalo con el nombre que aparezca en la fuente.`;

        const userContent = this._buildUserContent(instruccion, imagenes);

        const content = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ], { jsonMode: true });

        const parsed = this._extractJSON(content);
        if (!parsed || !Array.isArray(parsed.empleados)) {
            throw new Error('La IA no pudo interpretar los horarios. Intente con otra imagen o sea más específico.');
        }
        return parsed;
    },

    async detectarFormatoBiometrico(muestraFilas, encabezados = null) {
        const systemPrompt = `${this._getPromptAsistenteRRHH()}

Tarea actual: detectar el formato de un archivo exportado del reloj biométrico.

Responde SOLO con JSON válido:
{
  "columnas": {
    "idUsuario": 0,
    "nombre": 1,
    "fechaHora": 2,
    "estado": 3
  },
  "formatoFecha": "descripción del formato detectado",
  "estadoEntrada": "valor que indica entrada (ej: 0)",
  "estadoSalida": "valor que indica salida (ej: 1)",
  "tieneEncabezado": true,
  "confianza": "alta|media|baja",
  "notas": "observaciones sobre el formato"
}

Los índices de columnas son base 0. Si falta alguna columna, usar null.`;

        const userPrompt = `Encabezados detectados: ${encabezados ? JSON.stringify(encabezados) : 'ninguno'}

Primeras filas del archivo (máx 15):
${JSON.stringify(muestraFilas.slice(0, 15), null, 2)}

Formatos comunes:
- Col1: ID usuario, Col2: Nombre, Col3: Fecha/hora, Col4: Estado (0=entrada, 1=salida)
- Variantes con cédula, departamento, etc.`;

        const content = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], { jsonMode: true });

        const parsed = this._extractJSON(content);
        if (!parsed || !parsed.columnas) {
            throw new Error('No se pudo detectar el formato del archivo biométrico.');
        }
        return parsed;
    },

    async interpretarImagenes(imagenes, instruccion = '', contexto = {}) {
        const systemPrompt = `${this._getPromptAsistenteRRHH()}

Tarea actual: analizar imágenes relacionadas con planillas, horarios o asistencia.

Responde en español, de forma clara y estructurada. Incluye:
- Tipo de documento detectado
- Datos extraídos (empleados, fechas, horarios, entradas, salidas, tardías)
- Sugerencias de qué hacer en Planify (ej: guardar horarios, analizar tardías)
- Observaciones sobre datos poco claros

Empleados activos en el sistema:
${JSON.stringify(contexto.empleadosActivos || [], null, 2)}

${contexto.ultimoAnalisis ? `Último análisis de asistencia: ${JSON.stringify(contexto.ultimoAnalisis)}` : ''}`;

        const textoUsuario = instruccion
            || 'Interpreta el contenido de estas imágenes relacionado con horarios o asistencia de empleados.';

        const content = [
            { type: 'text', text: textoUsuario },
            ...imagenes.map(img => ({
                type: 'image_url',
                image_url: { url: img.dataUrl }
            }))
        ];

        return this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content }
        ]);
    },

    async consultarAnalisis(pregunta, contexto) {
        const systemPrompt = `${this._getPromptAsistenteRRHH()}

Tarea actual: responder consultas sobre asistencia, tardías y horas trabajadas usando el contexto disponible.`;

        const content = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Contexto del análisis:\n${JSON.stringify(contexto, null, 2)}\n\nPregunta: ${pregunta}` }
        ]);

        return content;
    }
};

window.AIService = AIService;
