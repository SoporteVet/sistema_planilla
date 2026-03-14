/**
 * Reportes Module - Sistema de Planillas Costa Rica
 */

const ReportesModule = {
    render() {
        const html = `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Herramientas Útiles</h1>
                    <p class="text-sm text-gray-600 mt-1">Genere reportes y estadísticas</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Reporte de Nómina Mensual -->
                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="ReportesModule.reporteNomina()">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">Resumen de Nómina</h3>
                            <p class="text-sm text-gray-600">Reporte mensual consolidado</p>
                        </div>
                    </div>

                    <!-- Reporte de Asistencias -->
                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="ReportesModule.reporteAsistencias()">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">Análisis de Tardías</h3>
                            <p class="text-sm text-gray-600">Importar Excel del reloj marcador</p>
                        </div>
                    </div>

                    <!-- Reporte de Vacaciones -->
                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="ReportesModule.reporteVacaciones()">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">Vacaciones</h3>
                            <p class="text-sm text-gray-600">Días acumulados y disponibles</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Herramientas Útiles']);
    },

    reporteNomina() {
        Utils.showToast('Funcionalidad en desarrollo', 'info');
    },

    // ─── ANÁLISIS DE TARDÍAS ────────────────────────────────────────────────────

    async reporteAsistencias() {
        const html = `
            <div class="space-y-6" id="viewTardias">
                <div class="flex items-center space-x-4">
                    <button onclick="ReportesModule.render()" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Análisis de Tardías</h1>
                        <p class="text-sm text-gray-600 mt-1">Reloj marcador — basado en horario por día de cada empleado</p>
                    </div>
                </div>

                <!-- Paso 1: Cargar archivo -->
                <div class="card" id="panelCarga">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">Paso 1: Cargar archivo Excel del reloj</h2>

                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <h3 class="font-semibold text-blue-900 mb-2 text-sm">Formato esperado del Excel:</h3>
                        <ul class="text-sm text-blue-800 space-y-1">
                            <li><strong>Columna 1:</strong> ID de Usuario</li>
                            <li><strong>Columna 2:</strong> Nombre del empleado</li>
                            <li><strong>Columna 3:</strong> Fecha y hora (DD-MM-YYYY HH:MM:SS, con a.m./p.m. o tipo fecha de Excel)</li>
                            <li><strong>Columna 4:</strong> Estado (0 = entrada, 1 = salida)</li>
                        </ul>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Seleccione archivo Excel (.xlsx, .xls)</label>
                            <input type="file" id="inputExcelAsistencias" accept=".xlsx,.xls"
                                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                                file:rounded-lg file:border-0 file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                onchange="ReportesModule.onExcelSeleccionado(this)">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Minutos de tolerancia</label>
                            <input type="number" id="minutosTolerance" value="5" min="0" max="60" class="form-control w-32">
                            <p class="text-xs text-gray-500 mt-1">Minutos de gracia antes de contar tardía</p>
                        </div>
                    </div>

                    <div class="mt-4 flex justify-end">
                        <button onclick="ReportesModule.previsualizar()" id="btnPrevisualizar" class="btn btn-primary" disabled>
                            Previsualizar coincidencias
                        </button>
                    </div>
                </div>

                <!-- Paso 2: Previsualización de coincidencias (oculto hasta cargar) -->
                <div id="panelPreview" class="hidden"></div>

                <!-- Paso 3: Resultados (oculto hasta analizar) -->
                <div id="panelResultados" class="hidden"></div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Herramientas Útiles', 'Análisis de Tardías']);
        this.ultimosResultadosTardias = null;
        this._rawData = null;
        this._empleadosCache = null;
    },

    onExcelSeleccionado(input) {
        const btn = document.getElementById('btnPrevisualizar');
        if (btn) btn.disabled = !(input.files && input.files[0]);
    },

    async previsualizar() {
        const fileInput = document.getElementById('inputExcelAsistencias');
        if (!fileInput.files || !fileInput.files[0]) {
            Utils.showToast('Seleccione un archivo Excel primero', 'warning');
            return;
        }

        Utils.showLoading('Leyendo archivo...');
        try {
            const data = await this.leerArchivoExcel(fileInput.files[0]);
            this._rawData = data;

            const empleados = await FirebaseHelpers.getEmpleados();
            this._empleadosCache = empleados;

            const { matchings, filasSaltadas } = this._construirMatchings(data, empleados);
            this._matchings = matchings;

            this._renderPreview(matchings, filasSaltadas, data.length - 1);
            Utils.hideLoading();
        } catch (err) {
            console.error(err);
            Utils.showToast('Error al leer el archivo: ' + err.message, 'error');
            Utils.hideLoading();
        }
    },

    // Construye un map de empleados del Excel → empleado del sistema + horario
    _construirMatchings(data, empleados) {
        const normalizarNombre = (str) => {
            if (!str || typeof str !== 'string') return '';
            return str.trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ');
        };

        const diasSemanaLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const diasSemanaKeys  = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

        // Construir mapa de empleados del sistema
        const empMap = {};
        const agregarAlMapa = (key, emp) => {
            if (!key) return;
            const k = normalizarNombre(String(key));
            if (k && !empMap[k]) empMap[k] = emp;
        };
        empleados.forEach(emp => {
            const cedula = (emp.cedula || '').toString().replace(/[-\s]/g, '');
            const nombre = (emp.nombre || '').toString().trim();
            if (cedula) empMap[cedula] = emp;
            agregarAlMapa(nombre, emp);
            if (nombre) {
                empMap[nombre.toLowerCase()] = emp;
                const partes = nombre.split(/\s+/).filter(Boolean);
                if (partes.length >= 2) {
                    const ultima = partes[partes.length - 1];
                    const resto = partes.slice(0, -1).join(' ');
                    agregarAlMapa(ultima + ' ' + resto, emp);
                    agregarAlMapa(resto + ' ' + ultima, emp);
                }
            }
            if (emp.idUsuarioReloj != null) empMap[String(emp.idUsuarioReloj).trim()] = emp;
        });

        const buscarEmpleado = (nombreExcel, idExcel) => {
            const n = (nombreExcel || '').toString().trim();
            const id = idExcel != null ? String(idExcel).trim() : '';
            let emp = empMap[normalizarNombre(n)] || empMap[n.toLowerCase()];
            if (emp) return emp;
            if (id) { emp = empMap[id] || empMap[id.replace(/[-\s]/g, '')]; if (emp) return emp; }
            if (n.includes(',')) {
                const [ap, no] = n.split(',').map(s => s.trim());
                if (ap && no) { emp = empMap[normalizarNombre(no + ' ' + ap)] || empMap[normalizarNombre(ap + ' ' + no)]; if (emp) return emp; }
            }
            const partes = n.split(/\s+/).filter(Boolean);
            if (partes.length >= 2) {
                const ul = partes[partes.length - 1], re = partes.slice(0, -1).join(' ');
                emp = empMap[normalizarNombre(ul + ' ' + re)] || empMap[normalizarNombre(re + ' ' + ul)];
                if (emp) return emp;
            }
            const nNorm = normalizarNombre(n);
            for (const e of empleados) {
                const ns = normalizarNombre((e.nombre || '').toString());
                if (!ns) continue;
                if (ns === nNorm || ns.includes(nNorm) || nNorm.includes(ns)) return e;
            }
            return null;
        };

        const horaFallback = (CONFIG.getJornadaByCodigo && CONFIG.getJornadaByCodigo('diurna')?.horarioEntrada) || '08:00';

        const getHorarioResumen = (emp, fechaStr) => {
            if (!emp) return { fuente: 'fallback', hora: horaFallback };
            const esPlanilla = String(emp.tipoEmpleado || '') !== 'SP';
            const horarioPorDia = emp.horarioPorDia && typeof emp.horarioPorDia === 'object' ? emp.horarioPorDia : null;
            if (esPlanilla && horarioPorDia) {
                const diasConEntrada = diasSemanaKeys.filter(d => horarioPorDia[d]?.entrada);
                if (diasConEntrada.length > 0) {
                    return {
                        fuente: 'horario-por-dia',
                        dias: diasSemanaKeys.map((d, i) => ({
                            key: d,
                            label: diasSemanaLabels[i],
                            entrada: horarioPorDia[d]?.entrada || '',
                            salida: horarioPorDia[d]?.salida || ''
                        }))
                    };
                }
            }
            if (emp.horarioEntrada) return { fuente: 'horario-fijo', hora: emp.horarioEntrada };
            if (emp.jornada) {
                const j = CONFIG.getJornadaByCodigo(emp.jornada);
                if (j && j.horarioEntrada) return { fuente: 'jornada', hora: j.horarioEntrada, jornada: j.nombre };
            }
            return { fuente: 'fallback', hora: horaFallback };
        };

        // Extraer personas únicas del Excel
        const personasExcel = {};
        let filasSaltadas = 0;
        const registros = data.slice(1);
        registros.forEach(row => {
            if (!row || row.length < 2) { filasSaltadas++; return; }
            const idUsuario = row[0] != null ? String(row[0]).trim() : '';
            const nombre = row[1] != null ? String(row[1]).trim() : '';
            if (!nombre) { filasSaltadas++; return; }
            const claveExcel = idUsuario || nombre;
            if (!personasExcel[claveExcel]) personasExcel[claveExcel] = { idUsuario, nombre, registros: 0 };
            personasExcel[claveExcel].registros++;
        });

        const matchings = Object.values(personasExcel).map(p => {
            const emp = buscarEmpleado(p.nombre, p.idUsuario);
            return {
                idExcel: p.idUsuario,
                nombreExcel: p.nombre,
                registros: p.registros,
                empleadoSistema: emp,
                horario: getHorarioResumen(emp, null),
                encontrado: !!emp
            };
        });

        return { matchings, filasSaltadas };
    },

    _renderPreview(matchings, filasSaltadas, totalRegistros) {
        const encontrados = matchings.filter(m => m.encontrado).length;
        const noEncontrados = matchings.filter(m => !m.encontrado).length;

        const badgeFuente = (h) => {
            if (h.fuente === 'horario-por-dia') return '<span class="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">Por día</span>';
            if (h.fuente === 'horario-fijo') return '<span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Horario fijo</span>';
            if (h.fuente === 'jornada') return `<span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Jornada</span>`;
            return '<span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">Fallback</span>';
        };

        const horarioTexto = (h) => {
            if (h.fuente === 'horario-por-dia') {
                const dias = h.dias.filter(d => d.entrada).map(d => `${d.label}: ${d.entrada}`);
                return dias.join(' / ');
            }
            return h.hora || (h.jornada ? `${h.jornada} (${h.hora})` : '—');
        };

        const filas = matchings.map((m, i) => {
            const rowBg = m.encontrado ? '' : 'bg-yellow-50';
            const icon = m.encontrado
                ? '<svg class="w-4 h-4 text-green-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
                : '<svg class="w-4 h-4 text-yellow-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
            return `
                <tr class="${rowBg}">
                    <td class="px-3 py-2 text-sm">${icon} ${m.nombreExcel}</td>
                    <td class="px-3 py-2 text-sm text-gray-500">${m.idExcel || '—'}</td>
                    <td class="px-3 py-2 text-sm">${m.empleadoSistema ? m.empleadoSistema.nombre : '<span class="text-yellow-600">No encontrado</span>'}</td>
                    <td class="px-3 py-2 text-sm">${badgeFuente(m.horario)}</td>
                    <td class="px-3 py-2 text-xs text-gray-600 max-w-xs">${horarioTexto(m.horario)}</td>
                    <td class="px-3 py-2 text-sm text-center">${m.registros}</td>
                </tr>`;
        }).join('');

        const html = `
            <div class="card" id="panelPreviewCard">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-gray-800">Paso 2: Previsualización de coincidencias</h2>
                    <div class="flex items-center space-x-3 text-sm">
                        <span class="text-green-600 font-medium">${encontrados} encontrados</span>
                        ${noEncontrados > 0 ? `<span class="text-yellow-600 font-medium">${noEncontrados} no encontrados</span>` : ''}
                    </div>
                </div>

                ${noEncontrados > 0 ? `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                    Los empleados marcados en amarillo no fueron encontrados en el sistema. Se usará horario fallback (${(CONFIG.getJornadaByCodigo && CONFIG.getJornadaByCodigo('diurna')?.horarioEntrada) || '08:00'}).
                    Verifique que el nombre en el Excel coincida con el nombre en el módulo de Empleados, o asigne un <strong>ID de reloj</strong> al empleado.
                </div>` : ''}

                <div class="overflow-x-auto rounded-lg border border-gray-200">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left">Nombre en Excel</th>
                                <th class="px-3 py-2 text-left">ID</th>
                                <th class="px-3 py-2 text-left">Empleado en sistema</th>
                                <th class="px-3 py-2 text-left">Fuente horario</th>
                                <th class="px-3 py-2 text-left">Horario que se usará</th>
                                <th class="px-3 py-2 text-center">Registros</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">${filas}</tbody>
                    </table>
                </div>

                <div class="mt-4 flex justify-between items-center text-xs text-gray-500">
                    <span>${totalRegistros} registros totales · ${filasSaltadas} filas omitidas (vacías)</span>
                    <button onclick="ReportesModule.ejecutarAnalisis()" class="btn btn-primary">
                        Ejecutar análisis de tardías
                    </button>
                </div>
            </div>`;

        const panel = document.getElementById('panelPreview');
        if (panel) {
            panel.innerHTML = html;
            panel.classList.remove('hidden');
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    async ejecutarAnalisis() {
        const toleranciaValue = document.getElementById('minutosTolerance')?.value;
        const toleranciaMinutos = toleranciaValue !== '' && !isNaN(toleranciaValue)
            ? parseInt(toleranciaValue, 10)
            : 5;

        if (!this._rawData) { Utils.showToast('Cargue un archivo primero', 'warning'); return; }

        Utils.showLoading('Analizando tardías...');
        try {
            const horaFallback = (CONFIG.getJornadaByCodigo && CONFIG.getJornadaByCodigo('diurna')?.horarioEntrada) || '08:00';
            const resultados = await this.analizarTardias(this._rawData, horaFallback, toleranciaMinutos, this._empleadosCache, this._matchings);
            this.ultimosResultadosTardias = resultados;
            this._renderResultados(resultados);
            Utils.hideLoading();
        } catch (err) {
            console.error(err);
            Utils.showToast('Error al analizar: ' + err.message, 'error');
            Utils.hideLoading();
        }
    },

    // ─── LECTURA DEL EXCEL ──────────────────────────────────────────────────────

    leerArchivoExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    // cellDates:true convierte seriales de Excel a objetos Date
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    // raw:false + dateNF formatea fechas tipo datetime como texto legible
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                        header: 1,
                        raw: false,
                        dateNF: 'DD-MM-YYYY HH:mm:ss'
                    });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    },

    // ─── ANÁLISIS PRINCIPAL ─────────────────────────────────────────────────────

    async analizarTardias(data, horaEsperadaPorDefecto, toleranciaMinutos, empleadosCargados, matchingsPrevios) {
        if (!data || data.length < 2) throw new Error('El archivo Excel no contiene datos válidos');

        const normalizarNombre = (str) => {
            if (!str || typeof str !== 'string') return '';
            return str.trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ');
        };

        const empleados = empleadosCargados || await FirebaseHelpers.getEmpleados();

        // Mapa rápido por claveExcel → empleado del sistema (reutiliza matchings previos si existen)
        const claveExcelAEmpleado = {};
        if (matchingsPrevios) {
            matchingsPrevios.forEach(m => {
                const clave = m.idExcel || m.nombreExcel;
                claveExcelAEmpleado[clave] = m.empleadoSistema || null;
            });
        } else {
            // Construir mapa completo de búsqueda
            const empMap = {};
            const agregarAlMapa = (key, emp) => {
                if (!key) return;
                const k = normalizarNombre(String(key));
                if (k && !empMap[k]) empMap[k] = emp;
            };
            empleados.forEach(emp => {
                const cedula = (emp.cedula || '').toString().replace(/[-\s]/g, '');
                const nombre = (emp.nombre || '').toString().trim();
                if (cedula) empMap[cedula] = emp;
                agregarAlMapa(nombre, emp);
                if (nombre) {
                    empMap[nombre.toLowerCase()] = emp;
                    const partes = nombre.split(/\s+/).filter(Boolean);
                    if (partes.length >= 2) {
                        const ul = partes[partes.length - 1], re = partes.slice(0, -1).join(' ');
                        agregarAlMapa(ul + ' ' + re, emp);
                        agregarAlMapa(re + ' ' + ul, emp);
                    }
                }
                if (emp.idUsuarioReloj != null) empMap[String(emp.idUsuarioReloj).trim()] = emp;
            });

            const buscar = (n, id) => {
                let emp = empMap[normalizarNombre(n)] || empMap[n.toLowerCase()];
                if (emp) return emp;
                if (id) { emp = empMap[id] || empMap[id.replace(/[-\s]/g, '')]; if (emp) return emp; }
                const nNorm = normalizarNombre(n);
                for (const e of empleados) {
                    const ns = normalizarNombre((e.nombre || '').toString());
                    if (ns && (ns === nNorm || ns.includes(nNorm) || nNorm.includes(ns))) return e;
                }
                return null;
            };

            data.slice(1).forEach(row => {
                if (!row || row.length < 2) return;
                const id = row[0] != null ? String(row[0]).trim() : '';
                const nombre = row[1] != null ? String(row[1]).trim() : '';
                const clave = id || nombre;
                if (clave && !(clave in claveExcelAEmpleado)) {
                    claveExcelAEmpleado[clave] = buscar(nombre, id);
                }
            });
        }

        const diasSemanaKeys  = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diasSemanaLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const getDiaKeyFromFecha = (fechaStr) => {
            const s = (fechaStr || '').toString().trim();
            if (!s) return null;
            const p = s.split(/[-/]/).map(x => parseInt(x, 10)).filter(n => !isNaN(n));
            if (p.length !== 3) return null;
            let dia, mes, anio;
            if (p[0] > 12) { dia = p[0]; mes = p[1] - 1; anio = p[2]; }
            else if (p[1] > 12) { dia = p[1]; mes = p[0] - 1; anio = p[2]; }
            else { dia = p[0]; mes = p[1] - 1; anio = p[2]; }
            const date = new Date(anio, mes, dia);
            if (isNaN(date.getTime())) return null;
            return { key: diasSemanaKeys[date.getDay()], label: diasSemanaLabels[date.getDay()] };
        };

        const getHoraEsperada = (emp, fechaStr) => {
            if (!emp) return horaEsperadaPorDefecto;
            const diaInfo = fechaStr ? getDiaKeyFromFecha(fechaStr) : null;
            const diaKey = diaInfo ? diaInfo.key : null;
            const esPlanilla = String(emp.tipoEmpleado || '') !== 'SP';
            const horarioPorDia = emp.horarioPorDia && typeof emp.horarioPorDia === 'object' ? emp.horarioPorDia : null;
            if (esPlanilla && horarioPorDia && diaKey) {
                const h = horarioPorDia[diaKey];
                const entrada = h && h.entrada != null ? String(h.entrada).trim() : '';
                if (!entrada) return null; // día libre
                return entrada;
            }
            if (emp.horarioEntrada) return String(emp.horarioEntrada).trim();
            if (emp.jornada) {
                const j = CONFIG.getJornadaByCodigo(emp.jornada);
                if (j && j.horarioEntrada) return j.horarioEntrada;
            }
            return horaEsperadaPorDefecto;
        };

        // Normalizar celda de fecha/hora (SheetJS con raw:false ya la da como texto)
        const normalizarFechaHora = (valor) => {
            if (valor == null) return null;
            // Si es un objeto Date (SheetJS con cellDates)
            if (valor instanceof Date && !isNaN(valor.getTime())) {
                const dd = String(valor.getDate()).padStart(2, '0');
                const mm = String(valor.getMonth() + 1).padStart(2, '0');
                const yyyy = valor.getFullYear();
                const hh = String(valor.getHours()).padStart(2, '0');
                const mn = String(valor.getMinutes()).padStart(2, '0');
                const ss = String(valor.getSeconds()).padStart(2, '0');
                return { fecha: `${dd}-${mm}-${yyyy}`, horaStr: `${hh}:${mn}:${ss}` };
            }
            const v = String(valor).trim();
            // Número serial de Excel
            const num = parseFloat(v);
            if (!isNaN(num) && num > 1000 && !v.includes('-') && !v.includes('/')) {
                // Usar UTC para evitar offset de zona horaria
                const date = new Date(Math.round((num - 25569) * 86400 * 1000));
                if (!isNaN(date.getTime())) {
                    const dd = String(date.getUTCDate()).padStart(2, '0');
                    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
                    const yyyy = date.getUTCFullYear();
                    const hh = String(date.getUTCHours()).padStart(2, '0');
                    const mn = String(date.getUTCMinutes()).padStart(2, '0');
                    const ss = String(date.getUTCSeconds()).padStart(2, '0');
                    return { fecha: `${dd}-${mm}-${yyyy}`, horaStr: `${hh}:${mn}:${ss}` };
                }
            }
            // Texto: "DD-MM-YYYY HH:MM:SS" o "DD/MM/YYYY HH:MM:SS"
            const partes = v.split(/\s+/);
            if (partes.length >= 2) return { fecha: partes[0], horaStr: partes.slice(1).join(' ') };
            return null;
        };

        // Agrupar marcas por (clave empleado, fecha)
        const porEmpleadoYFecha = {};
        data.slice(1).forEach(row => {
            if (!row || row.length < 4) return;
            const idUsuario = row[0] != null ? String(row[0]).trim() : '';
            const nombre = row[1] != null ? String(row[1]).trim() : '';
            const estadoRaw = row[3] != null ? String(row[3]).trim() : '';
            if (!nombre) return;

            const fh = normalizarFechaHora(row[2]);
            if (!fh || !fh.fecha) return;
            const { fecha, horaStr } = fh;
            const parsed = Formatters.parsearHoraReloj(horaStr);
            if (!parsed) return;

            const estadoMatch = estadoRaw.match(/^(\d+)/);
            const estado = String(estadoMatch ? estadoMatch[1] : estadoRaw);

            const claveEmp = idUsuario || nombre;
            const clave = claveEmp + '|||' + fecha;
            if (!porEmpleadoYFecha[clave]) porEmpleadoYFecha[clave] = { idUsuario, nombre, claveEmp, marcas: [] };
            porEmpleadoYFecha[clave].marcas.push({ estado, horaStr, min: parsed.minutosDesdeMedianoche });
        });

        // Por (empleado, fecha) tomar la primera entrada del día y evaluar tardía
        const tardiasMap = {};
        const noEncontradosSet = {};
        let totalEntradas = 0;
        let conHorarioPersonalizado = 0;
        let sinHorarioPersonalizado = 0;

        Object.keys(porEmpleadoYFecha).forEach(clave => {
            const item = porEmpleadoYFecha[clave];
            const lastSep = clave.lastIndexOf('|||');
            const fecha = lastSep >= 0 ? clave.substring(lastSep + 3) : '';
            if (!item.marcas.length || !fecha) return;

            item.marcas.sort((a, b) => a.min - b.min);
            // Usar marca con estado 0 (entrada) si existe; si no, la primera del día para no perder ningún día
            const primeraEntrada = item.marcas.find(m => String(m.estado) === '0') || item.marcas[0];

            const empleado = claveExcelAEmpleado[item.claveEmp] !== undefined
                ? claveExcelAEmpleado[item.claveEmp]
                : null;

            if (!empleado) noEncontradosSet[item.claveEmp] = { nombreExcel: item.nombre, idExcel: item.idUsuario };

            const horaEsperada = getHoraEsperada(empleado, fecha);
            const esDiaLibre = horaEsperada === null;

            const c = item.claveEmp;
            if (!tardiasMap[c]) {
                tardiasMap[c] = {
                    idUsuario: item.idUsuario,
                    nombre: item.nombre,
                    cedula: empleado?.cedula || 'N/A',
                    empleadoEnSistema: empleado || null,
                    horarioEntrada: esDiaLibre ? null : horaEsperada,
                    tardias: [],
                    diasAnalizados: []
                };
            }

            const diaInfo = getDiaKeyFromFecha(fecha);
            const diaLabel = diaInfo ? diaInfo.label : '';

            if (esDiaLibre) {
                // Incluir día libre para que aparezca en la revisión (hora entrada vs "Día libre")
                tardiasMap[c].diasAnalizados.push({
                    fecha,
                    dia: diaLabel,
                    horaEntrada: primeraEntrada.horaStr,
                    horaEsperada: 'Día libre',
                    minutosRetraso: 0,
                    esTardia: false,
                    diaLibre: true
                });
                return;
            }

            totalEntradas++;
            const horarioPorDiaObj = empleado && empleado.horarioPorDia && typeof empleado.horarioPorDia === 'object' ? empleado.horarioPorDia : null;
            const tieneHorarioPorDia = horarioPorDiaObj && Object.keys(horarioPorDiaObj).some(d => horarioPorDiaObj[d]?.entrada);
            const tienePersonalizado = empleado && (tieneHorarioPorDia || empleado.horarioEntrada);
            if (tienePersonalizado) conHorarioPersonalizado++;
            else sinHorarioPersonalizado++;

            const [hEsp, mEsp] = horaEsperada.split(':').map(Number);
            const minutosEsperados = (hEsp || 0) * 60 + (mEsp || 0);
            const minutosRetraso = primeraEntrada.min - minutosEsperados - toleranciaMinutos;

            tardiasMap[c].diasAnalizados.push({
                fecha,
                dia: diaLabel,
                horaEntrada: primeraEntrada.horaStr,
                horaEsperada,
                minutosRetraso: Math.max(0, minutosRetraso),
                esTardia: minutosRetraso > 0
            });

            if (minutosRetraso > 0) {
                tardiasMap[c].tardias.push({
                    fecha,
                    dia: diaLabel,
                    horaEntrada: primeraEntrada.horaStr,
                    horaEsperada,
                    minutosRetraso
                });
            }
        });

        const detalleTardias = Object.values(tardiasMap).filter(e => e.tardias.length > 0);
        detalleTardias.sort((a, b) => b.tardias.length - a.tardias.length);

        const detalleTodos = Object.values(tardiasMap);
        detalleTodos.sort((a, b) => b.tardias.length - a.tardias.length);

        return {
            totalRegistros: data.length - 1,
            totalEntradas,
            totalEmpleadosConTardias: detalleTardias.length,
            conHorarioPersonalizado,
            sinHorarioPersonalizado,
            detalleTardias,
            detalleTodos,
            noEncontrados: Object.values(noEncontradosSet),
            horaEsperadaPorDefecto,
            toleranciaMinutos
        };
    },

    // ─── RENDER DE RESULTADOS ───────────────────────────────────────────────────

    _renderResultados(resultados) {
        const panel = document.getElementById('panelResultados');
        if (!panel) return;

        const noEncontrados = resultados.noEncontrados || [];
        const totalTardiasGlobal = resultados.detalleTardias.reduce((sum, e) => sum + e.tardias.length, 0);
        const totalMinutosGlobal = resultados.detalleTardias.reduce((sum, e) =>
            sum + e.tardias.reduce((s, t) => s + t.minutosRetraso, 0), 0);

        const fmtRetraso = (min) => {
            const h = Math.floor(min / 60), m = min % 60;
            return h > 0 ? `${h}h ${m}min` : `${m} min`;
        };

        const badgeHorario = (emp) => {
            if (!emp) return '<span class="text-xs text-gray-400">fallback</span>';
            const h = emp.horarioPorDia && typeof emp.horarioPorDia === 'object' ? emp.horarioPorDia : null;
            if (h && Object.keys(h).some(d => h[d]?.entrada)) return '<span class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Por día</span>';
            if (emp.horarioEntrada) return '<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Fijo</span>';
            if (emp.jornada) return '<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Jornada</span>';
            return '<span class="text-xs text-gray-400">fallback</span>';
        };

        // Cards de resumen
        let html = `
            <div class="card" id="panelResultadosCard">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-lg font-semibold text-gray-800">Paso 3: Resultados del análisis</h2>
                    <div class="flex space-x-2">
                        <button onclick="ReportesModule.exportarTardiasExcel()" class="btn btn-outline btn-sm">
                            Exportar Excel
                        </button>
                    </div>
                </div>

                <!-- Tarjetas resumen -->
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-blue-600">${resultados.totalRegistros}</p>
                        <p class="text-xs text-gray-600 mt-1">Registros en el archivo</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-green-600">${resultados.totalEntradas}</p>
                        <p class="text-xs text-gray-600 mt-1">Entradas analizadas</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-red-600">${resultados.totalEmpleadosConTardias}</p>
                        <p class="text-xs text-gray-600 mt-1">Con tardías</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-orange-600">${totalTardiasGlobal}</p>
                        <p class="text-xs text-gray-600 mt-1">Tardías totales</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 text-center">
                        <p class="text-2xl font-bold text-purple-600">${resultados.toleranciaMinutos} min</p>
                        <p class="text-xs text-gray-600 mt-1">Tolerancia</p>
                    </div>
                </div>

                <!-- Sub-estadísticas horario -->
                <div class="text-sm text-gray-600 mb-6 flex flex-wrap gap-4">
                    <span>Con horario personalizado: <strong class="text-green-700">${resultados.conHorarioPersonalizado}</strong> entradas</span>
                    <span>Sin horario personalizado: <strong class="text-yellow-700">${resultados.sinHorarioPersonalizado}</strong> entradas</span>
                    ${totalMinutosGlobal > 0 ? `<span>Tiempo total perdido: <strong class="text-red-700">${fmtRetraso(totalMinutosGlobal)}</strong></span>` : ''}
                </div>`;

        // Mensaje cuando nadie tuvo tardías
        if (resultados.detalleTardias.length === 0) {
            html += `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-6">
                    <p class="text-green-800 font-semibold">No se detectaron tardías en el período analizado</p>
                </div>`;
        }

        // Lista de TODOS los empleados analizados (hora entrada y horario esperado por día)
        const detalleTodos = resultados.detalleTodos || [];
        html += `<h3 class="text-base font-semibold text-gray-800 mb-3">Todos los empleados analizados (${detalleTodos.length})</h3>`;
        html += `<div class="space-y-3 mb-6">`;

        detalleTodos.forEach((emp, idx) => {
            const totalTardias = emp.tardias.length;
            const totalMin = totalTardias > 0 ? emp.tardias.reduce((s, t) => s + t.minutosRetraso, 0) : 0;
            const promedio = totalTardias > 0 ? Math.round(totalMin / totalTardias) : 0;
            const idDiv = `emp-${idx}`;
            const enSistema = emp.empleadoEnSistema;
            const dias = emp.diasAnalizados || emp.tardias || [];

            const filasDias = dias.map(d => {
                const esDiaLibre = d.diaLibre === true;
                const esTardia = !esDiaLibre && (d.esTardia !== undefined ? d.esTardia : true);
                let badgeTardia;
                if (esDiaLibre) {
                    badgeTardia = `<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Día libre</span>`;
                } else if (esTardia) {
                    badgeTardia = `<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">${fmtRetraso(d.minutosRetraso)} tarde</span>`;
                } else {
                    badgeTardia = `<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">A tiempo</span>`;
                }
                return `
                    <tr class="${esTardia ? 'bg-red-50/40' : ''}">
                        <td class="px-4 py-2 text-sm">${d.fecha}</td>
                        <td class="px-4 py-2 text-sm text-gray-500">${d.dia || ''}</td>
                        <td class="px-4 py-2 text-sm font-medium ${esTardia ? 'text-red-700' : 'text-gray-800'}">${d.horaEntrada}</td>
                        <td class="px-4 py-2 text-sm text-purple-700">${d.horaEsperada}</td>
                        <td class="px-4 py-2 text-sm">${badgeTardia}</td>
                    </tr>`;
            }).join('');

            const badgeResumen = totalTardias > 0
                ? `<span class="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">${totalTardias} tardía${totalTardias !== 1 ? 's' : ''}</span>
                   <p class="text-xs text-gray-500 mt-1">Promedio: ${promedio} min · Total: ${fmtRetraso(totalMin)}</p>`
                : `<span class="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">A tiempo</span>
                   <p class="text-xs text-gray-500 mt-1">${dias.length} día${dias.length !== 1 ? 's' : ''} analizado${dias.length !== 1 ? 's' : ''}</p>`;

            html += `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 select-none"
                        onclick="document.getElementById('${idDiv}').classList.toggle('hidden')">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-gray-800">${emp.nombre}</span>
                                ${badgeHorario(enSistema)}
                                ${!enSistema ? '<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">No en sistema</span>' : ''}
                            </div>
                            <div class="text-xs text-gray-500 mt-0.5">
                                ID: ${emp.idUsuario || '—'}
                                ${emp.cedula !== 'N/A' ? ` · Cédula: ${emp.cedula}` : ''}
                                ${enSistema?.jornada ? ` · Jornada: ${Formatters.formatearJornada(enSistema.jornada)}` : ''}
                            </div>
                        </div>
                        <div class="text-right ml-4">
                            ${badgeResumen}
                        </div>
                    </div>
                    <div id="${idDiv}" class="hidden">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 border-t border-gray-200">
                                <tr>
                                    <th class="px-4 py-2 text-left font-medium text-gray-600">Fecha</th>
                                    <th class="px-4 py-2 text-left font-medium text-gray-600">Día</th>
                                    <th class="px-4 py-2 text-left font-medium text-gray-600">Hora entrada</th>
                                    <th class="px-4 py-2 text-left font-medium text-gray-600">Horario esperado</th>
                                    <th class="px-4 py-2 text-left font-medium text-gray-600">Estado</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">${filasDias}</tbody>
                        </table>
                    </div>
                </div>`;
        });

        html += `</div>`;

        // Sección de empleados no encontrados
        if (noEncontrados.length > 0) {
            const filas = noEncontrados.map(ne => `
                <tr>
                    <td class="px-3 py-2 text-sm text-yellow-800">${ne.nombreExcel}</td>
                    <td class="px-3 py-2 text-sm text-gray-500">${ne.idExcel || '—'}</td>
                    <td class="px-3 py-2 text-xs text-gray-400">Se usó fallback (${resultados.horaEsperadaPorDefecto})</td>
                </tr>`).join('');
            html += `
                <div class="border border-yellow-200 rounded-lg overflow-hidden mb-4">
                    <div class="bg-yellow-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-yellow-100 select-none"
                        onclick="document.getElementById('panelNoEncontrados').classList.toggle('hidden')">
                        <span class="font-semibold text-yellow-800">Empleados no encontrados en el sistema (${noEncontrados.length})</span>
                        <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <div id="panelNoEncontrados" class="hidden bg-white">
                        <table class="w-full">
                            <thead class="bg-gray-50 border-t border-yellow-200">
                                <tr>
                                    <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">Nombre en Excel</th>
                                    <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">ID</th>
                                    <th class="px-3 py-2 text-left text-sm font-medium text-gray-600">Nota</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">${filas}</tbody>
                        </table>
                        <p class="px-4 py-3 text-xs text-yellow-700 bg-yellow-50 border-t border-yellow-200">
                            Para que el sistema encuentre a estos empleados, asegúrese de que el nombre en el Excel coincida con el del sistema,
                            o asigne el ID de reloj del empleado en el módulo Empleados.
                        </p>
                    </div>
                </div>`;
        }

        html += `</div>`; // cierre card

        panel.innerHTML = html;
        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ─── EXPORTAR EXCEL ─────────────────────────────────────────────────────────

    exportarTardiasExcel() {
        if (!this.ultimosResultadosTardias) {
            Utils.showToast('No hay resultados para exportar', 'warning');
            return;
        }
        try {
            const r = this.ultimosResultadosTardias;
            const data = [
                ['REPORTE DE TARDÍAS - RELOJ MARCADOR'],
                ['Tolerancia (minutos):', r.toleranciaMinutos],
                ['Total Registros:', r.totalRegistros],
                ['Entradas Analizadas:', r.totalEntradas],
                ['Empleados con Tardías:', r.totalEmpleadosConTardias],
                ['Con Horario Personalizado:', r.conHorarioPersonalizado],
                ['Sin Horario Personalizado:', r.sinHorarioPersonalizado],
                [],
                ['Nombre', 'Cédula', 'Fecha', 'Día', 'Hora Entrada', 'Hora Esperada', 'Minutos Retraso', 'Estado']
            ];

            r.detalleTodos.forEach(emp => {
                (emp.diasAnalizados || emp.tardias).forEach(d => {
                    data.push([
                        emp.nombre,
                        emp.cedula,
                        d.fecha,
                        d.dia || '',
                        d.horaEntrada,
                        d.horaEsperada,
                        d.esTardia !== false ? d.minutosRetraso : 0,
                        d.esTardia !== false ? 'Tardía' : 'A tiempo'
                    ]);
                });
            });

            if (r.noEncontrados && r.noEncontrados.length > 0) {
                data.push([], ['EMPLEADOS NO ENCONTRADOS EN EL SISTEMA'], ['Nombre en Excel', 'ID']);
                r.noEncontrados.forEach(ne => data.push([ne.nombreExcel, ne.idExcel || '']));
            }

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = [
                { wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 12 },
                { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 10 }
            ];
            XLSX.utils.book_append_sheet(wb, ws, 'Tardías');

            const fecha = Formatters.formatearFechaArchivo ? Formatters.formatearFechaArchivo(new Date()) : new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Reporte_Tardias_${fecha}.xlsx`);
            Utils.showToast('Reporte exportado exitosamente', 'success');
        } catch (err) {
            console.error('Error exportando:', err);
            Utils.showToast('Error al exportar: ' + err.message, 'error');
        }
    },

    cerrarModal() {
        const modal = document.getElementById('modalReporteAsistencias');
        if (modal) modal.remove();
    },

    // ─── OTROS REPORTES ─────────────────────────────────────────────────────────

    async reporteVacaciones() {
        const empleados = await FirebaseHelpers.getEmpleados();
        const empleadosActivos = empleados.filter(e => e.estado === 'activo' && e.tipoEmpleado !== 'SP');

        const datosVacaciones = empleadosActivos.map(emp => {
            const vacaciones = Calculations.calcularVacaciones(emp.fechaIngreso);
            return { nombre: emp.nombre, cedula: emp.cedula, fechaIngreso: emp.fechaIngreso, ...vacaciones };
        });

        console.log('Reporte de Vacaciones:', datosVacaciones);
        Utils.showToast('Reporte de vacaciones generado', 'success');
    },

    constanciaSalarial() {
        Utils.showToast('Seleccione un empleado desde el módulo de Empleados', 'info');
    }
};

window.ReportesModule = ReportesModule;
