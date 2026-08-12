/**
 * Asistente IA Module - Horarios y análisis biométrico
 */

const AsistenteIAModule = {
    tabActiva: 'horarios',
    empleadosCache: [],
    horariosParseados: null,
    rawData: null,
    formatoDetectado: null,
    ultimosResultados: null,
    imagenesPendientes: [],
    imagenesHorariosPendientes: [],
    historialInterpretacion: [],

    async init() {
        this.empleadosCache = await FirebaseHelpers.getEmpleados();
    },

    async render() {
        await this.init();

        const aiStatus = await checkAIServiceStatus();
        const servicioListo = aiStatus.available === true;
        const statusLabel = servicioListo
            ? '● Servicio activo'
            : aiStatus.reason === 'sin_permiso'
                ? '⚠ Sin permisos'
                : aiStatus.reason === 'proxy_sin_url'
                    ? '⚠ Configure PROXY_URL'
                    : aiStatus.reason === 'no_desplegado'
                        ? '⚠ Servidor no desplegado'
                        : '⚠ Servidor sin configurar';

        const configBanner = !servicioListo && aiStatus.reason !== 'sin_permiso'
            ? (usesProxyBackend()
                ? `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-sm text-yellow-800 mb-2">
                        <strong>Opción gratuita (sin plan Blaze):</strong> Despliegue el proxy en Vercel (carpeta <code class="bg-yellow-100 px-1 rounded">proxy/</code>).
                        La API key queda en Vercel, nunca en el navegador.
                    </p>
                    <pre class="text-xs bg-yellow-100 rounded p-3 overflow-x-auto">cd proxy
npm install
npx vercel login
npx vercel env add OPENROUTER_API_KEY
npx vercel env add FIREBASE_SERVICE_ACCOUNT
npx vercel deploy</pre>
                    <p class="text-sm text-yellow-800 mt-3">
                        Luego pegue la URL en <code class="bg-yellow-100 px-1 rounded">js/config/openrouter-config.js</code>:
                    </p>
                    <pre class="text-xs bg-yellow-100 rounded p-3 mt-1 overflow-x-auto">PROXY_URL: 'https://su-proyecto.vercel.app/api/ai-chat'</pre>
                   </div>`
                : `<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-sm text-yellow-800">
                        <strong>Requiere plan Blaze de Firebase.</strong> O cambie a <code class="bg-yellow-100 px-1 rounded">BACKEND: 'proxy'</code> en openrouter-config.js para usar Vercel gratis.
                    </p>
                    <pre class="mt-2 text-xs bg-yellow-100 rounded p-3 overflow-x-auto">firebase functions:secrets:set OPENROUTER_API_KEY
cd functions && npm install && firebase deploy --only functions</pre>
                   </div>`)
            : '';

        const html = `
            <div class="space-y-6" id="asistenteIAView">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span class="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg">✦</span>
                            Asistente IA
                        </h1>
                        <p class="text-sm text-gray-600 mt-1">Asistente de RRHH para horarios, asistencia y planillas</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs px-3 py-1 rounded-full ${servicioListo ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                            ${statusLabel}
                        </span>
                    </div>
                </div>

                ${configBanner}

                <!-- Tabs -->
                <div class="border-b border-gray-200">
                    <nav class="flex space-x-1">
                        <button onclick="AsistenteIAModule.cambiarTab('horarios')" id="tabHorarios"
                            class="tab-btn px-4 py-3 text-sm font-medium border-b-2 transition ${this.tabActiva === 'horarios' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                            📅 Configurar Horarios
                        </button>
                        <button onclick="AsistenteIAModule.cambiarTab('analisis')" id="tabAnalisis"
                            class="tab-btn px-4 py-3 text-sm font-medium border-b-2 transition ${this.tabActiva === 'analisis' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                            🕐 Analizar Asistencia
                        </button>
                        <button onclick="AsistenteIAModule.cambiarTab('chat')" id="tabChat"
                            class="tab-btn px-4 py-3 text-sm font-medium border-b-2 transition ${this.tabActiva === 'chat' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                            🖼️ Interpretar imágenes
                        </button>
                    </nav>
                </div>

                <div id="tabContent">
                    ${this.tabActiva === 'horarios' ? this._renderTabHorarios() :
                      this.tabActiva === 'analisis' ? this._renderTabAnalisis() :
                      this._renderTabChat()}
                </div>
            </div>`;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Asistente IA']);
    },

    cambiarTab(tab) {
        this.tabActiva = tab;
        this.render();
    },

    // ─── TAB HORARIOS ───────────────────────────────────────────────────────────

    _renderPreviewImagenes(imagenes, quitarHandler) {
        if (!imagenes.length) return '';
        return `<div class="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            ${imagenes.map((img, idx) => `
                <div class="relative group">
                    <img src="${img.dataUrl}" alt="${this._escapeHtml(img.name)}"
                        class="w-24 h-24 object-cover rounded-lg border border-gray-300">
                    <button onclick="${quitarHandler}(${idx})"
                        class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 shadow">✕</button>
                    <p class="text-xs text-gray-500 mt-1 truncate w-24">${this._escapeHtml(img.name)}</p>
                </div>
            `).join('')}
        </div>`;
    },

    async _procesarArchivosImagen(files, destino) {
        const maxImagenes = 5;
        const maxBytes = 4 * 1024 * 1024;
        const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        for (const file of files) {
            if (destino.length >= maxImagenes) {
                Utils.showToast(`Máximo ${maxImagenes} imágenes`, 'warning');
                break;
            }
            if (!permitidos.includes(file.type)) {
                Utils.showToast(`${file.name}: formato no soportado`, 'warning');
                continue;
            }
            if (file.size > maxBytes) {
                Utils.showToast(`${file.name}: supera 4 MB`, 'warning');
                continue;
            }
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Error al leer imagen'));
                reader.readAsDataURL(file);
            });
            destino.push({ name: file.name, dataUrl, type: file.type });
        }
    },

    _renderTabHorarios() {
        const empleadosActivos = this.empleadosCache.filter(e => e.estado === 'activo' && e.tipoEmpleado !== 'SP');
        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-800 mb-3">Configurar horarios de empleados</h2>
                    <p class="text-sm text-gray-600 mb-4">
                        Su asistente de RRHH interpretará texto o imágenes (fotos de tableros, hojas impresas,
                        capturas) y los convertirá al formato del sistema para guardarlos en cada empleado.
                    </p>

                    <div class="bg-indigo-50 rounded-lg p-3 mb-4 text-xs text-indigo-800 space-y-1">
                        <p><strong>Puede escribir, adjuntar imágenes, o ambos:</strong></p>
                        <p>• Texto: "Juan Pérez: lunes a viernes 8am-5pm"</p>
                        <p>• Foto de un cuadro de horarios o Excel impreso</p>
                        <p>• Captura de pantalla con la planilla semanal</p>
                    </div>

                    ${this._renderPreviewImagenes(this.imagenesHorariosPendientes, 'AsistenteIAModule.quitarImagenHorario')}

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Imágenes de horarios</label>
                        <input type="file" id="inputImagenesHorarios" accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple class="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                            file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100"
                            onchange="AsistenteIAModule.adjuntarImagenesHorarios(this)">
                    </div>

                    <label class="block text-sm font-medium text-gray-700 mb-2">Texto o instrucción (opcional)</label>
                    <textarea id="inputHorariosTexto" rows="6"
                        class="form-control w-full text-sm"
                        placeholder="Ej: Aplicar estos horarios a los empleados de recepción..."></textarea>

                    <div class="mt-4 flex justify-end gap-2">
                        <button onclick="AsistenteIAModule.interpretarHorarios()" class="btn btn-primary" id="btnInterpretarHorarios">
                            ✦ Interpretar con asistente RRHH
                        </button>
                    </div>
                </div>

                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-800 mb-3">Empleados activos (${empleadosActivos.length})</h2>
                    <p class="text-xs text-gray-500 mb-3">Referencia para que la IA asocie los horarios correctamente</p>
                    <div class="max-h-80 overflow-y-auto space-y-2">
                        ${empleadosActivos.slice(0, 50).map(e => `
                            <div class="flex justify-between items-center text-sm py-1 border-b border-gray-100">
                                <span class="font-medium text-gray-800">${e.nombre}</span>
                                <span class="text-xs text-gray-400">${e.cedula || ''} ${e.idUsuarioReloj ? '· ID:' + e.idUsuarioReloj : ''}</span>
                            </div>
                        `).join('')}
                        ${empleadosActivos.length > 50 ? `<p class="text-xs text-gray-400">... y ${empleadosActivos.length - 50} más</p>` : ''}
                    </div>
                </div>
            </div>

            <div id="panelHorariosPreview" class="hidden mt-6"></div>`;
    },

    async adjuntarImagenesHorarios(input) {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        await this._procesarArchivosImagen(files, this.imagenesHorariosPendientes);
        input.value = '';
        this._actualizarVistaHorarios();
    },

    quitarImagenHorario(idx) {
        this.imagenesHorariosPendientes.splice(idx, 1);
        this._actualizarVistaHorarios();
    },

    _actualizarVistaHorarios() {
        if (this.tabActiva !== 'horarios') return;
        const tab = document.getElementById('tabContent');
        if (!tab) return;
        tab.innerHTML = this._renderTabHorarios() + '<div id="panelHorariosPreview" class="hidden mt-6"></div>';
        if (this.horariosParseados) this._renderHorariosPreview(this.horariosParseados);
    },

    async interpretarHorarios() {
        const texto = document.getElementById('inputHorariosTexto')?.value?.trim() || '';
        const imagenes = this.imagenesHorariosPendientes.map(img => ({ ...img }));

        if (!texto && !imagenes.length) {
            Utils.showToast('Escriba una instrucción o adjunte imágenes con los horarios', 'warning');
            return;
        }
        if (!isAIServiceAvailable()) {
            Utils.showToast('No tiene permisos o no ha iniciado sesión', 'error');
            return;
        }

        Utils.showLoading('El asistente de RRHH está interpretando los horarios...');
        try {
            const resultado = await AIService.parsearHorarios(texto, this.empleadosCache, imagenes);
            this.horariosParseados = resultado;
            this.imagenesHorariosPendientes = [];
            this._renderHorariosPreview(resultado);
            Utils.hideLoading();
            Utils.showToast('Horarios interpretados correctamente', 'success');
        } catch (err) {
            console.error(err);
            Utils.showToast(err.message, 'error');
            Utils.hideLoading();
        }
    },

    _buscarEmpleadoSistema(item) {
        const normalizar = (s) => (s || '').toString().trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (item.cedula) {
            const ced = item.cedula.replace(/[-\s]/g, '');
            const emp = this.empleadosCache.find(e => (e.cedula || '').replace(/[-\s]/g, '') === ced);
            if (emp) return emp;
        }
        if (item.idUsuarioReloj) {
            const emp = this.empleadosCache.find(e => String(e.idUsuarioReloj) === String(item.idUsuarioReloj));
            if (emp) return emp;
        }
        const nombreNorm = normalizar(item.nombre);
        return this.empleadosCache.find(e => {
            const n = normalizar(e.nombre);
            return n === nombreNorm || n.includes(nombreNorm) || nombreNorm.includes(n);
        }) || null;
    },

    _renderHorariosPreview(resultado) {
        const panel = document.getElementById('panelHorariosPreview');
        if (!panel) return;

        const diasLabels = { domingo: 'Dom', lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb' };

        const filas = resultado.empleados.map((item, idx) => {
            const emp = this._buscarEmpleadoSistema(item);
            const horario = item.horarioPorDia || {};
            const diasTexto = Object.keys(horario).map(d => {
                const h = horario[d];
                if (!h?.entrada) return '';
                return `${diasLabels[d] || d}: ${h.entrada}-${h.salida || '?'}`;
            }).filter(Boolean).join(' · ');

            return `
                <tr class="${emp ? '' : 'bg-yellow-50'}">
                    <td class="px-3 py-2">
                        <input type="checkbox" class="horario-check" data-idx="${idx}" ${emp ? 'checked' : ''}>
                    </td>
                    <td class="px-3 py-2 text-sm font-medium">${item.nombre}</td>
                    <td class="px-3 py-2 text-sm">${emp ? emp.nombre : '<span class="text-yellow-600">No encontrado</span>'}</td>
                    <td class="px-3 py-2 text-xs text-gray-600">${diasTexto || '—'}</td>
                    <td class="px-3 py-2 text-xs text-gray-400">${item.notas || ''}</td>
                </tr>`;
        }).join('');

        panel.innerHTML = `
            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h2 class="text-lg font-semibold text-gray-800">Vista previa de horarios interpretados</h2>
                        ${resultado.resumen ? `<p class="text-sm text-gray-600 mt-1">${resultado.resumen}</p>` : ''}
                    </div>
                    <button onclick="AsistenteIAModule.guardarHorarios()" class="btn btn-primary">
                        Guardar horarios seleccionados
                    </button>
                </div>
                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left w-10"><input type="checkbox" onchange="AsistenteIAModule.toggleTodosHorarios(this.checked)"></th>
                                <th class="px-3 py-2 text-left">Nombre en texto</th>
                                <th class="px-3 py-2 text-left">Empleado en sistema</th>
                                <th class="px-3 py-2 text-left">Horario interpretado</th>
                                <th class="px-3 py-2 text-left">Notas</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">${filas}</tbody>
                    </table>
                </div>
            </div>`;
        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth' });
    },

    toggleTodosHorarios(checked) {
        document.querySelectorAll('.horario-check').forEach(cb => { cb.checked = checked; });
    },

    async guardarHorarios() {
        if (!this.horariosParseados?.empleados?.length) return;

        const seleccionados = [];
        document.querySelectorAll('.horario-check:checked').forEach(cb => {
            const idx = parseInt(cb.dataset.idx, 10);
            if (!isNaN(idx)) seleccionados.push(idx);
        });

        if (!seleccionados.length) {
            Utils.showToast('Seleccione al menos un empleado', 'warning');
            return;
        }

        Utils.showLoading('Guardando horarios...');
        let guardados = 0;
        let errores = 0;

        for (const idx of seleccionados) {
            const item = this.horariosParseados.empleados[idx];
            const emp = this._buscarEmpleadoSistema(item);
            if (!emp || !item.horarioPorDia) { errores++; continue; }

            try {
                await FirebaseHelpers.updateEmpleado(emp.id, { horarioPorDia: item.horarioPorDia });
                guardados++;
            } catch (e) {
                console.error(e);
                errores++;
            }
        }

        Utils.hideLoading();
        Utils.showToast(`Horarios guardados: ${guardados}${errores ? ` · Errores: ${errores}` : ''}`, guardados ? 'success' : 'warning');
        this.empleadosCache = await FirebaseHelpers.getEmpleados();
    },

    // ─── TAB ANÁLISIS BIOMÉTRICO ────────────────────────────────────────────────

    _renderTabAnalisis() {
        return `
            <div class="space-y-6">
                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">Análisis de asistencia</h2>
                    <p class="text-sm text-gray-600 mb-4">
                        Cargue el archivo del reloj biométrico. El asistente de RRHH detectará el formato,
                        calculará tardías según el horario de cada empleado y las horas trabajadas.
                    </p>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Archivo del reloj (.xlsx, .xls, .csv)</label>
                            <input type="file" id="inputBiometrico" accept=".xlsx,.xls,.csv"
                                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                                file:rounded-lg file:border-0 file:text-sm file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                onchange="AsistenteIAModule.onArchivoSeleccionado(this)">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tolerancia (minutos)</label>
                            <input type="number" id="toleranciaIA" value="5" min="0" max="60" class="form-control w-full">
                        </div>
                    </div>

                    <div class="mt-4 flex flex-wrap gap-2">
                        <button onclick="AsistenteIAModule.procesarArchivo()" id="btnProcesar" class="btn btn-primary" disabled>
                            ✦ Analizar con asistente RRHH
                        </button>
                        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input type="checkbox" id="usarFormatoEstandar" checked class="rounded">
                            Usar formato estándar (ID, Nombre, Fecha/Hora, Estado)
                        </label>
                    </div>
                </div>

                <div id="panelFormatoDetectado" class="hidden"></div>
                <div id="panelResultadosIA" class="hidden"></div>
            </div>`;
    },

    onArchivoSeleccionado(input) {
        const btn = document.getElementById('btnProcesar');
        if (btn) btn.disabled = !(input.files && input.files[0]);
    },

    async leerArchivo(file) {
        if (typeof ReportesModule !== 'undefined' && ReportesModule.leerArchivoExcel) {
            return ReportesModule.leerArchivoExcel(file);
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    resolve(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'DD-MM-YYYY HH:mm:ss' }));
                } catch (err) { reject(err); }
            };
            reader.onerror = () => reject(new Error('Error al leer archivo'));
            reader.readAsArrayBuffer(file);
        });
    },

    _normalizarDataConFormato(data, formato) {
        const cols = formato.columnas;
        const filaInicio = formato.tieneEncabezado ? 1 : 0;
        const estadoEntrada = String(formato.estadoEntrada ?? '0');
        const estadoSalida = String(formato.estadoSalida ?? '1');

        const normalizado = [['ID', 'Nombre', 'FechaHora', 'Estado']];
        for (let i = filaInicio; i < data.length; i++) {
            const row = data[i];
            if (!row || !row.length) continue;
            const id = cols.idUsuario != null ? row[cols.idUsuario] : '';
            const nombre = cols.nombre != null ? row[cols.nombre] : '';
            const fechaHora = cols.fechaHora != null ? row[cols.fechaHora] : '';
            let estado = cols.estado != null ? String(row[cols.estado]).trim() : '';
            const estadoMatch = estado.match(/^(\d+)/);
            if (estadoMatch) estado = estadoMatch[1];
            if (!nombre && !id) continue;
            normalizado.push([id, nombre, fechaHora, estado || estadoEntrada]);
        }
        return normalizado;
    },

    async procesarArchivo() {
        const fileInput = document.getElementById('inputBiometrico');
        if (!fileInput?.files?.[0]) {
            Utils.showToast('Seleccione un archivo', 'warning');
            return;
        }

        Utils.showLoading('Procesando archivo...');
        try {
            let data = await this.leerArchivo(fileInput.files[0]);
            this.rawData = data;
            this.empleadosCache = await FirebaseHelpers.getEmpleados();

            const usarEstandar = document.getElementById('usarFormatoEstandar')?.checked;

            if (!usarEstandar && isAIServiceAvailable()) {
                Utils.showLoading('El asistente de RRHH está detectando el formato...');
                this.formatoDetectado = await AIService.detectarFormatoBiometrico(data.slice(0, 20), data[0]);
                data = this._normalizarDataConFormato(data, this.formatoDetectado);
                this.rawData = data;
                this._renderFormatoDetectado(this.formatoDetectado);
            }

            const tolerancia = parseInt(document.getElementById('toleranciaIA')?.value || '5', 10);
            const horaFallback = CONFIG.getJornadaByCodigo?.('diurna')?.horarioEntrada || '08:00';

            const { matchings } = ReportesModule._construirMatchings(data, this.empleadosCache);
            const tardias = await ReportesModule.analizarTardias(data, horaFallback, tolerancia, this.empleadosCache, matchings);
            const horas = this._calcularHorasTrabajadas(data, matchings);

            this.ultimosResultados = { tardias, horas, tolerancia, matchings };
            this._renderResultadosAnalisis(tardias, horas);
            Utils.hideLoading();
            Utils.showToast('Análisis completado', 'success');
        } catch (err) {
            console.error(err);
            Utils.showToast('Error: ' + err.message, 'error');
            Utils.hideLoading();
        }
    },

    _renderFormatoDetectado(formato) {
        const panel = document.getElementById('panelFormatoDetectado');
        if (!panel) return;
        panel.innerHTML = `
            <div class="card bg-indigo-50 border border-indigo-200">
                <h3 class="font-semibold text-indigo-900 mb-2">Formato detectado por IA</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span class="text-indigo-600">Confianza:</span> ${formato.confianza || '—'}</div>
                    <div><span class="text-indigo-600">Fecha:</span> ${formato.formatoFecha || '—'}</div>
                    <div><span class="text-indigo-600">Entrada:</span> ${formato.estadoEntrada ?? '0'}</div>
                    <div><span class="text-indigo-600">Salida:</span> ${formato.estadoSalida ?? '1'}</div>
                </div>
                ${formato.notas ? `<p class="text-xs text-indigo-700 mt-2">${formato.notas}</p>` : ''}
            </div>`;
        panel.classList.remove('hidden');
    },

    _calcularHorasTrabajadas(data, matchings) {
        const claveAEmpleado = {};
        matchings?.forEach(m => {
            claveAEmpleado[m.idExcel || m.nombreExcel] = m.empleadoSistema;
        });

        const porEmpleado = {};

        const normalizarFH = (valor) => {
            if (valor instanceof Date && !isNaN(valor.getTime())) {
                const dd = String(valor.getDate()).padStart(2, '0');
                const mm = String(valor.getMonth() + 1).padStart(2, '0');
                const yyyy = valor.getFullYear();
                const hh = String(valor.getHours()).padStart(2, '0');
                const mn = String(valor.getMinutes()).padStart(2, '0');
                return { fecha: `${dd}-${mm}-${yyyy}`, horaStr: `${hh}:${mn}`, min: valor.getHours() * 60 + valor.getMinutes() };
            }
            const v = String(valor).trim();
            const partes = v.split(/\s+/);
            if (partes.length >= 2) {
                const parsed = Formatters.parsearHoraReloj(partes.slice(1).join(' '));
                return parsed ? { fecha: partes[0], horaStr: partes.slice(1).join(' '), min: parsed.minutosDesdeMedianoche } : null;
            }
            return null;
        };

        data.slice(1).forEach(row => {
            if (!row || row.length < 4) return;
            const id = row[0] != null ? String(row[0]).trim() : '';
            const nombre = row[1] != null ? String(row[1]).trim() : '';
            const clave = id || nombre;
            if (!clave) return;

            const fh = normalizarFH(row[2]);
            if (!fh) return;

            const estadoRaw = String(row[3] ?? '').trim();
            const estadoMatch = estadoRaw.match(/^(\d+)/);
            const estado = estadoMatch ? estadoMatch[1] : estadoRaw;

            if (!porEmpleado[clave]) {
                porEmpleado[clave] = {
                    idUsuario: id,
                    nombre,
                    empleado: claveAEmpleado[clave] || null,
                    dias: {}
                };
            }

            const diaKey = fh.fecha;
            if (!porEmpleado[clave].dias[diaKey]) {
                porEmpleado[clave].dias[diaKey] = { marcas: [] };
            }
            porEmpleado[clave].dias[diaKey].marcas.push({ estado, horaStr: fh.horaStr, min: fh.min });
        });

        const resultado = [];

        Object.values(porEmpleado).forEach(emp => {
            let totalHoras = 0;
            const detalleDias = [];

            Object.keys(emp.dias).sort().forEach(fecha => {
                const marcas = emp.dias[fecha].marcas.sort((a, b) => a.min - b.min);
                let horasDia = 0;
                let entrada = null;

                marcas.forEach(m => {
                    if (String(m.estado) === '0' || (!entrada && String(m.estado) !== '1')) {
                        entrada = m;
                    } else if (String(m.estado) === '1' && entrada) {
                        const diffMin = m.min - entrada.min;
                        if (diffMin > 0) {
                            horasDia += diffMin / 60;
                        }
                        entrada = null;
                    }
                });

                totalHoras += horasDia;
                detalleDias.push({
                    fecha,
                    horas: parseFloat(horasDia.toFixed(2)),
                    marcas: marcas.length,
                    primeraEntrada: marcas.find(m => String(m.estado) === '0')?.horaStr || marcas[0]?.horaStr,
                    ultimaSalida: [...marcas].reverse().find(m => String(m.estado) === '1')?.horaStr || '—'
                });
            });

            resultado.push({
                ...emp,
                totalHoras: parseFloat(totalHoras.toFixed(2)),
                detalleDias,
                diasTrabajados: detalleDias.filter(d => d.horas > 0).length
            });
        });

        resultado.sort((a, b) => b.totalHoras - a.totalHoras);
        return resultado;
    },

    _renderResultadosAnalisis(tardias, horas) {
        const panel = document.getElementById('panelResultadosIA');
        if (!panel) return;

        const totalTardias = tardias.detalleTardias.reduce((s, e) => s + e.tardias.length, 0);
        const totalHorasGlobal = horas.reduce((s, e) => s + e.totalHoras, 0);

        const fmtRetraso = (min) => {
            const h = Math.floor(min / 60), m = min % 60;
            return h > 0 ? `${h}h ${m}min` : `${m} min`;
        };

        const horasMap = {};
        horas.forEach(h => { horasMap[h.idUsuario || h.nombre] = h; });

        let html = `
            <div class="card">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-lg font-semibold text-gray-800">Resultados del análisis</h2>
                    <button onclick="AsistenteIAModule.exportarResultados()" class="btn btn-outline btn-sm">Exportar Excel</button>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-blue-600">${tardias.totalRegistros}</p>
                        <p class="text-xs text-gray-600">Registros</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-red-600">${tardias.totalEmpleadosConTardias}</p>
                        <p class="text-xs text-gray-600">Con tardías</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-orange-600">${totalTardias}</p>
                        <p class="text-xs text-gray-600">Tardías totales</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-green-600">${totalHorasGlobal.toFixed(1)}h</p>
                        <p class="text-xs text-gray-600">Horas trabajadas</p>
                    </div>
                </div>

                <div class="space-y-3">`;

        tardias.detalleTodos.forEach((emp, idx) => {
            const clave = emp.idUsuario || emp.nombre;
            const horasEmp = horasMap[clave];
            const totalTardiasEmp = emp.tardias.length;
            const idDiv = `result-${idx}`;

            html += `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                        onclick="document.getElementById('${idDiv}').classList.toggle('hidden')">
                        <div>
                            <span class="font-semibold text-gray-800">${emp.nombre}</span>
                            ${horasEmp ? `<span class="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">${horasEmp.totalHoras}h trabajadas</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            ${totalTardiasEmp > 0
                                ? `<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">${totalTardiasEmp} tardía(s)</span>`
                                : `<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">A tiempo</span>`}
                        </div>
                    </div>
                    <div id="${idDiv}" class="hidden">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-3 py-2 text-left">Fecha</th>
                                    <th class="px-3 py-2 text-left">Entrada</th>
                                    <th class="px-3 py-2 text-left">Esperada</th>
                                    <th class="px-3 py-2 text-left">Tardía</th>
                                    <th class="px-3 py-2 text-left">Horas día</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">`;

            (emp.diasAnalizados || []).forEach(d => {
                const horasDia = horasEmp?.detalleDias?.find(hd => hd.fecha === d.fecha);
                html += `
                    <tr class="${d.esTardia ? 'bg-red-50/40' : ''}">
                        <td class="px-3 py-2">${d.fecha}</td>
                        <td class="px-3 py-2">${d.horaEntrada}</td>
                        <td class="px-3 py-2 text-purple-700">${d.horaEsperada}</td>
                        <td class="px-3 py-2">${d.esTardia ? fmtRetraso(d.minutosRetraso) : d.diaLibre ? 'Día libre' : 'A tiempo'}</td>
                        <td class="px-3 py-2 font-medium">${horasDia ? horasDia.horas + 'h' : '—'}</td>
                    </tr>`;
            });

            html += `</tbody></table></div></div>`;
        });

        html += `</div></div>`;
        panel.innerHTML = html;
        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth' });
    },

    exportarResultados() {
        if (!this.ultimosResultados) {
            Utils.showToast('No hay resultados para exportar', 'warning');
            return;
        }

        const { tardias, horas } = this.ultimosResultados;
        const horasMap = {};
        horas.forEach(h => { horasMap[h.idUsuario || h.nombre] = h; });

        const data = [
            ['REPORTE ASISTENCIA - ASISTENTE IA'],
            ['Tolerancia:', tardias.toleranciaMinutos + ' min'],
            [],
            ['Nombre', 'Cédula', 'Fecha', 'Entrada', 'Esperada', 'Tardía (min)', 'Estado', 'Horas día', 'Total horas emp.']
        ];

        tardias.detalleTodos.forEach(emp => {
            const clave = emp.idUsuario || emp.nombre;
            const horasEmp = horasMap[clave];
            (emp.diasAnalizados || []).forEach(d => {
                const horasDia = horasEmp?.detalleDias?.find(hd => hd.fecha === d.fecha);
                data.push([
                    emp.nombre,
                    emp.cedula,
                    d.fecha,
                    d.horaEntrada,
                    d.horaEsperada,
                    d.esTardia ? d.minutosRetraso : 0,
                    d.esTardia ? 'Tardía' : d.diaLibre ? 'Día libre' : 'A tiempo',
                    horasDia?.horas || 0,
                    horasEmp?.totalHoras || 0
                ]);
            });
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Asistencia IA');

        const fecha = Formatters.formatearFechaArchivo?.(new Date()) || new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Asistencia_IA_${fecha}.xlsx`);
        Utils.showToast('Reporte exportado', 'success');
    },

    // ─── TAB INTERPRETAR IMÁGENES ───────────────────────────────────────────────

    _escapeHtml(texto) {
        const div = document.createElement('div');
        div.textContent = texto || '';
        return div.innerHTML;
    },

    _renderTabChat() {
        const historialHtml = this.historialInterpretacion.length
            ? this.historialInterpretacion.map(item => {
                if (item.tipo === 'user') {
                    const imgs = (item.imagenes || []).map(img =>
                        `<img src="${img.dataUrl}" alt="${this._escapeHtml(img.name)}" class="max-w-[180px] max-h-32 object-cover rounded mt-2 border border-indigo-200">`
                    ).join('');
                    return `<div class="flex justify-end">
                        <div class="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm max-w-md">
                            ${item.texto ? `<p>${this._escapeHtml(item.texto)}</p>` : ''}
                            <div class="flex flex-wrap gap-2">${imgs}</div>
                        </div>
                    </div>`;
                }
                return `<div class="flex justify-start">
                    <div class="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm max-w-lg whitespace-pre-wrap">${this._escapeHtml(item.texto)}</div>
                </div>`;
            }).join('')
            : `<div class="text-sm text-gray-500 text-center py-8">
                    Adjunte fotos o capturas de horarios, listas de asistencia o reportes del reloj.
               </div>`;

        const previewHtml = this._renderPreviewImagenes(this.imagenesPendientes, 'AsistenteIAModule.quitarImagen');

        return `
            <div class="card max-w-3xl mx-auto">
                <h2 class="text-lg font-semibold text-gray-800 mb-2">Interpretar documentos con el asistente RRHH</h2>
                <p class="text-sm text-gray-600 mb-4">
                    Adjunte fotos o capturas de horarios, reportes del reloj, listas de asistencia u otros
                    documentos de RRHH. El asistente los analizará y le indicará qué hacer en Planify.
                </p>

                <div id="chatMessages" class="bg-gray-50 rounded-lg p-4 min-h-64 max-h-96 overflow-y-auto mb-4 space-y-3">
                    ${historialHtml}
                </div>

                ${previewHtml}

                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
                        <input type="file" id="inputImagenesIA" accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple class="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                            file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700
                            hover:file:bg-indigo-100"
                            onchange="AsistenteIAModule.adjuntarImagenes(this)">
                        <p class="text-xs text-gray-500 mt-1">JPG, PNG, WEBP o GIF · Máx. 5 imágenes · 4 MB c/u</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Instrucción (opcional)</label>
                        <input type="text" id="chatInput"
                            placeholder="Ej: Extrae los horarios de cada empleado"
                            class="form-control w-full"
                            onkeydown="if(event.key==='Enter') AsistenteIAModule.enviarInterpretacion()">
                    </div>

                    <div class="flex justify-end">
                        <button onclick="AsistenteIAModule.enviarInterpretacion()" class="btn btn-primary"
                            ${this.imagenesPendientes.length === 0 ? 'disabled' : ''} id="btnInterpretarImagen">
                            ✦ Interpretar con asistente RRHH
                        </button>
                    </div>
                </div>
            </div>`;
    },

    async adjuntarImagenes(input) {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        await this._procesarArchivosImagen(files, this.imagenesPendientes);
        input.value = '';
        if (this.tabActiva === 'chat') {
            const preview = document.getElementById('tabContent');
            if (preview) preview.innerHTML = this._renderTabChat();
        }
    },

    quitarImagen(idx) {
        this.imagenesPendientes.splice(idx, 1);
        if (this.tabActiva === 'chat') {
            const preview = document.getElementById('tabContent');
            if (preview) preview.innerHTML = this._renderTabChat();
        }
    },

    async enviarInterpretacion() {
        if (!this.imagenesPendientes.length) {
            Utils.showToast('Adjunte al menos una imagen', 'warning');
            return;
        }
        if (!isAIServiceAvailable()) {
            Utils.showToast('No tiene permisos para usar el Asistente IA', 'error');
            return;
        }

        const input = document.getElementById('chatInput');
        const instruccion = input?.value?.trim() || '';

        const imagenesEnvio = this.imagenesPendientes.map(img => ({ ...img }));
        this.historialInterpretacion.push({
            tipo: 'user',
            texto: instruccion,
            imagenes: imagenesEnvio
        });
        this.imagenesPendientes = [];
        if (input) input.value = '';

        const tabContent = document.getElementById('tabContent');
        if (tabContent) tabContent.innerHTML = this._renderTabChat();

        Utils.showLoading('El asistente de RRHH está analizando...');
        try {
            const contexto = {
                empleadosActivos: this.empleadosCache.filter(e => e.estado === 'activo').map(e => ({
                    nombre: e.nombre,
                    cedula: e.cedula || '',
                    idUsuarioReloj: e.idUsuarioReloj || ''
                })),
                ultimoAnalisis: this.ultimosResultados ? {
                    totalConTardias: this.ultimosResultados.tardias.totalEmpleadosConTardias,
                    totalHoras: this.ultimosResultados.horas.reduce((s, h) => s + h.totalHoras, 0)
                } : null
            };

            const respuesta = await AIService.interpretarImagenes(imagenesEnvio, instruccion, contexto);
            this.historialInterpretacion.push({ tipo: 'ai', texto: respuesta });

            const tabContent2 = document.getElementById('tabContent');
            if (tabContent2) tabContent2.innerHTML = this._renderTabChat();

            const chatBox = document.getElementById('chatMessages');
            if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;

            Utils.hideLoading();
            Utils.showToast('Imágenes interpretadas', 'success');
        } catch (err) {
            Utils.showToast(err.message, 'error');
            Utils.hideLoading();
        }
    }
};

window.AsistenteIAModule = AsistenteIAModule;
