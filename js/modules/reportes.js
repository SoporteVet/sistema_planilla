/**
 * Reportes Module - Sistema de Planillas Costa Rica
 */

const ReportesModule = {
    render() {
        const html = `
            \u003cdiv class="space-y-6"\u003e
                \u003cdiv\u003e
                    \u003ch1 class="text-2xl font-bold text-gray-800"\u003eHerramientas Útiles\u003c/h1\u003e
                    \u003cp class="text-sm text-gray-600 mt-1"\u003eGenere reportes y estadísticas\u003c/p\u003e
                \u003c/div\u003e

                \u003cdiv class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"\u003e
                    \u003c!-- Reporte de Nómina Mensual --\u003e
                    \u003cdiv class="card hover:shadow-lg transition cursor-pointer" onclick="ReportesModule.reporteNomina()"\u003e
                        \u003cdiv class="text-center"\u003e
                            \u003cdiv class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"\u003e
                                \u003csvg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"\u003e
                                    \u003cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"\u003e\u003c/path\u003e
                                \u003c/svg\u003e
                            \u003c/div\u003e
                            \u003ch3 class="text-lg font-semibold text-gray-800 mb-2"\u003eResumen de Nómina\u003c/h3\u003e
                            \u003cp class="text-sm text-gray-600"\u003eReporte mensual consolidado\u003c/p\u003e
                        \u003c/div\u003e
                    \u003c/div\u003e

                    \u003c!-- Reporte de Asistencias --\u003e
                    \u003cdiv class="card hover:shadow-lg transition cursor-pointer" onclick="ReportesModule.reporteAsistencias()"\u003e
                        \u003cdiv class="text-center"\u003e
                            \u003cdiv class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"\u003e
                                \u003csvg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"\u003e
                                    \u003cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"\u003e\u003c/path\u003e
                                \u003c/svg\u003e
                            \u003c/div\u003e
                            \u003ch3 class="text-lg font-semibold text-gray-800 mb-2"\u003eAsistencias\u003c/h3\u003e
                            \u003cp class="text-sm text-gray-600"\u003eReporte de asistencias por empleado\u003c/p\u003e
                        \u003c/div\u003e
                    \u003c/div\u003e

                    \u003c!-- Reporte de Vacaciones --\u003e
                    \u003cdiv class="card hover:shadow-lg transition cursor-pointer" onclick="ReportesModule.reporteVacaciones()"\u003e
                        \u003cdiv class="text-center"\u003e
                            \u003cdiv class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"\u003e
                                \u003csvg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"\u003e
                                    \u003cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"\u003e\u003c/path\u003e
                                \u003c/svg\u003e
                            \u003c/div\u003e
                            \u003ch3 class="text-lg font-semibold text-gray-800 mb-2"\u003eVacaciones\u003c/h3\u003e
                            \u003cp class="text-sm text-gray-600"\u003eDías acumulados y disponibles\u003c/p\u003e
                        \u003c/div\u003e
                    \u003c/div\u003e
                    \u003c/div\u003e
                \u003c/div\u003e
            \u003c/div\u003e
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Herramientas Útiles']);
    },

    reporteNomina() {
        Utils.showToast('Funcionalidad en desarrollo', 'info');
    },

    async reporteAsistencias() {
        // Cargar empleados activos
        const empleados = await FirebaseHelpers.getEmpleados();
        const empleadosActivos = empleados.filter(e => e.estado === 'activo');

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalReporteAsistencias">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">Análisis de Tardías - Reloj Marcador</h2>
                            <p class="text-sm text-gray-600">Importe archivo Excel del reloj marcador para analizar tardías</p>
                        </div>
                        <button onclick="ReportesModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="p-6 space-y-6">
                        <!-- Información sobre el formato -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 class="font-semibold text-blue-900 mb-2">📋 Formato esperado del Excel del Reloj Marcador:</h3>
                            <ul class="text-sm text-blue-800 space-y-1">
                                <li>• <strong>Columna 1:</strong> ID de Usuario</li>
                                <li>• <strong>Columna 2:</strong> Nombre del empleado</li>
                                <li>• <strong>Columna 3:</strong> Tiempo (fecha y hora: DD-MM-YYYY HH:MM:SS)</li>
                                <li>• <strong>Columna 4:</strong> Estado de Trabajo (0 = entrada, 1 = salida)</li>
                            </ul>
                            <p class="text-xs text-blue-700 mt-2">
                                <strong>Nota:</strong> El sistema filtrará automáticamente solo las entradas (Estado = 0) para analizar tardías.
                            </p>
                        </div>

                        <!-- Input de archivo -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                Seleccione archivo Excel (.xlsx, .xls)
                            </label>
                            <input type="file" id="inputExcelAsistencias" accept=".xlsx,.xls" 
                                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 
                                file:rounded-lg file:border-0 file:text-sm file:font-semibold 
                                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                        </div>

                        <!-- Configuración de hora de entrada -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Hora de Entrada por Defecto
                                </label>
                                <input type="time" id="horaEntradaEsperada" value="08:00" 
                                    class="form-control">
                                <p class="text-xs text-gray-500 mt-1">Solo se usará si el empleado no está en el sistema</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">
                                    Minutos de Tolerancia
                                </label>
                                <input type="number" id="minutosTolerance" value="5" min="0" max="30"
                                    class="form-control">
                                <p class="text-xs text-gray-500 mt-1">Minutos de gracia antes de considerar una tardía</p>
                            </div>
                        </div>

                        <!-- Información sobre formato de Estado -->
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p class="text-sm text-blue-800">
                                <strong>📋 Formato de Estado:</strong> El sistema asume que <strong>Estado 0 = Entrada</strong> y 
                                <strong>Estado 1 = Salida</strong>. Solo se analizarán los registros con Estado 0 (entradas) 
                                y que tengan una hora razonable para entrada (antes de las 14:00).
                            </p>
                        </div>

                        <!-- Información sobre horarios -->
                        <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p class="text-sm text-green-800">
                                <strong>🕐 Detección de horarios:</strong> El sistema buscará cada empleado en la base de datos 
                                y usará el horario de entrada de su jornada específica. Si el empleado no está registrado, 
                                se usará la hora por defecto configurada arriba.
                            </p>
                        </div>

                        <!-- Botón procesar -->
                        <div class="flex justify-end space-x-4">
                            <button onclick="ReportesModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button onclick="ReportesModule.procesarExcelAsistencias()" class="btn btn-primary">
                                Procesar y Analizar
                            </button>
                        </div>

                        <!-- Resultados -->
                        <div id="resultadosAsistencias" class="hidden">
                            <div class="border-t border-gray-200 pt-6">
                                <h3 class="text-lg font-semibold text-gray-800 mb-4">📊 Resultados del Análisis</h3>
                                <div id="contenidoResultados"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;

        document.getElementById('modalReporteAsistencias').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.cerrarModal();
            }
        });
    },

    async procesarExcelAsistencias() {
        const fileInput = document.getElementById('inputExcelAsistencias');
        const horaEsperada = document.getElementById('horaEntradaEsperada').value;
        const toleranciaValue = document.getElementById('minutosTolerance').value;
        // Usar nullish coalescing para permitir 0 como valor válido
        const toleranciaMinutos = toleranciaValue !== '' && !isNaN(toleranciaValue) 
            ? parseInt(toleranciaValue) 
            : 5; // Solo usar 5 si el campo está vacío o no es un número

        if (!fileInput.files || !fileInput.files[0]) {
            Utils.showToast('Por favor seleccione un archivo Excel', 'warning');
            return;
        }

        Utils.showLoading('Procesando archivo Excel...');

        try {
            const file = fileInput.files[0];
            const data = await this.leerArchivoExcel(file);
            
            // Analizar tardías (Estado 0 = Entrada, Estado 1 = Salida)
            const resultados = await this.analizarTardias(data, horaEsperada, toleranciaMinutos);
            
            // Mostrar resultados
            this.mostrarResultadosTardias(resultados);
            
            Utils.hideLoading();
            Utils.showToast('Análisis completado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error procesando Excel:', error);
            Utils.showToast('Error al procesar el archivo: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },


    leerArchivoExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Leer la primera hoja
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    },

    async analizarTardias(data, horaEsperadaPorDefecto, toleranciaMinutos) {
        if (!data || data.length < 2) {
            throw new Error('El archivo Excel no contiene datos válidos');
        }

        // Cargar empleados del sistema
        const empleados = await FirebaseHelpers.getEmpleados();
        const empleadosMap = {};
        empleados.forEach(emp => {
            const cedulaLimpia = emp.cedula.replace(/[-\s]/g, '');
            const nombreLimpio = emp.nombre.trim().toLowerCase();
            // Buscar por cédula, nombre e ID
            empleadosMap[cedulaLimpia] = emp;
            empleadosMap[nombreLimpio] = emp;
            // También por ID si lo tuviera
            if (emp.idUsuarioReloj) {
                empleadosMap[emp.idUsuarioReloj] = emp;
            }
        });

        // Saltar encabezados (primera fila)
        const registros = data.slice(1);
        
        // Objeto para acumular tardías por empleado
        const tardiasMap = {};
        
        let totalEntradas = 0;
        let empleadosConHorarioPersonalizado = 0;
        let empleadosSinHorarioPersonalizado = 0;
        
        registros.forEach((row, index) => {
            if (!row || row.length < 4) return; // Saltar filas vacías o incompletas
            
            const idUsuario = row[0]?.toString().trim();
            const nombre = row[1]?.toString().trim();
            const tiempoCompleto = row[2]?.toString().trim(); // "DD-MM-YYYY HH:MM:SS"
            const estadoTrabajoRaw = row[3]?.toString().trim(); // Puede venir como "0 VTSN" o "1 VTSN"
            
            if (!nombre || !tiempoCompleto) return;
            
            // Extraer solo el número del Estado (ignorar "VTSN" u otros textos)
            // El formato puede ser "0", "0 VTSN", "1", "1 VTSN", etc.
            let estadoTrabajo = '';
            if (estadoTrabajoRaw) {
                // Extraer el primer número del string
                const match = estadoTrabajoRaw.match(/^(\d+)/);
                if (match) {
                    estadoTrabajo = match[1];
                } else {
                    // Si no hay número, intentar usar el valor completo
                    estadoTrabajo = estadoTrabajoRaw;
                }
            }
            
            // Parsear fecha y hora del formato "DD-MM-YYYY HH:MM:SS"
            let fecha = '';
            let horaEntrada = '';
            let minutosEntrada = 0;
            let horaNumero = 0;
            
            try {
                // Separar fecha y hora
                const partes = tiempoCompleto.split(' ');
                if (partes.length >= 2) {
                    fecha = partes[0]; // DD-MM-YYYY
                    horaEntrada = partes[1]; // HH:MM:SS
                    
                    // Parsear hora
                    const partesHora = horaEntrada.split(':');
                    if (partesHora.length >= 2) {
                        horaNumero = parseInt(partesHora[0]);
                        const minEnt = parseInt(partesHora[1]);
                        minutosEntrada = horaNumero * 60 + minEnt;
                    }
                }
            } catch (e) {
                console.error('Error parseando fecha/hora:', tiempoCompleto, e);
                return;
            }
            
            // VALIDACIÓN: Solo procesar ENTRADAS
            // Formato del reloj marcador: Estado 0 = Entrada, Estado 1 = Salida
            // Las entradas típicamente ocurren en la mañana (antes de las 14:00)
            // Las salidas típicamente ocurren en la tarde/noche (después de las 14:00)
            const esHoraRazonableParaEntrada = horaNumero < 14; // Antes de las 2 PM
            
            // Solo procesar ENTRADAS: Estado debe ser 0
            const esEntradaPorEstado = estadoTrabajo === '0';
            
            if (!esEntradaPorEstado) {
                // No es entrada (es salida o estado desconocido), ignorar
                return;
            }
            
            // Validación adicional: Si el Estado dice que es entrada (0) pero la hora es tarde (>= 14:00),
            // entonces probablemente es una salida mal marcada, ignorar
            if (!esHoraRazonableParaEntrada) {
                // Estado dice entrada pero hora es tarde - probablemente es una salida, ignorar
                return;
            }
            
            totalEntradas++;
            
            // Buscar empleado en el sistema por nombre o ID
            const nombreLimpio = nombre.trim().toLowerCase();
            const empleado = empleadosMap[nombreLimpio] || empleadosMap[idUsuario];
            
            // Determinar hora esperada para este empleado específico
            let horaEsperada = horaEsperadaPorDefecto;
            if (empleado && empleado.horarioEntrada) {
                horaEsperada = empleado.horarioEntrada;
                empleadosConHorarioPersonalizado++;
            } else {
                empleadosSinHorarioPersonalizado++;
            }
            
            // Parsear hora esperada para este empleado
            const [horaEsp, minEsp] = horaEsperada.split(':').map(Number);
            const minutosEsperados = horaEsp * 60 + minEsp;
            
            // Calcular diferencia (minutos de retraso)
            const minutosRetraso = minutosEntrada - minutosEsperados - toleranciaMinutos;
            
            // Si hay retraso, registrar
            if (minutosRetraso > 0) {
                // Usar ID de usuario o nombre como clave única
                const clave = idUsuario || nombre;
                
                if (!tardiasMap[clave]) {
                    tardiasMap[clave] = {
                        idUsuario: idUsuario,
                        nombre: nombre,
                        cedula: empleado?.cedula || 'N/A',
                        empleadoEnSistema: empleado || null,
                        horarioEntrada: horaEsperada, // Guardar el horario usado
                        tardias: []
                    };
                }
                
                tardiasMap[clave].tardias.push({
                    fecha: fecha,
                    horaEntrada: horaEntrada,
                    horaEsperada: horaEsperada,
                    minutosRetraso: minutosRetraso
                });
            }
        });
        
        // Convertir a array y ordenar por cantidad de tardías
        const resultados = Object.values(tardiasMap);
        resultados.sort((a, b) => b.tardias.length - a.tardias.length);
        
        return {
            totalRegistros: registros.length,
            totalEntradas: totalEntradas,
            totalEmpleadosConTardias: resultados.length,
            empleadosConHorarioPersonalizado: empleadosConHorarioPersonalizado,
            empleadosSinHorarioPersonalizado: empleadosSinHorarioPersonalizado,
            detalleTardias: resultados,
            horaEsperadaPorDefecto: horaEsperadaPorDefecto,
            toleranciaMinutos: toleranciaMinutos
        };
    },

    mostrarResultadosTardias(resultados) {
        const container = document.getElementById('resultadosAsistencias');
        const contenido = document.getElementById('contenidoResultados');
        
        if (!resultados.detalleTardias || resultados.detalleTardias.length === 0) {
            contenido.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <svg class="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-xl font-semibold text-green-900 mb-2">¡Excelente!</h3>
                    <p class="text-green-700">No se detectaron tardías en el período analizado.</p>
                    <div class="mt-4 text-sm text-green-600 space-y-1">
                        <p>Total de registros en el archivo: ${resultados.totalRegistros}</p>
                        <p>Entradas analizadas: ${resultados.totalEntradas}</p>
                        <p>Hora por defecto: ${resultados.horaEsperadaPorDefecto} (tolerancia: ${resultados.toleranciaMinutos} min)</p>
                        <p>✅ Con horario personalizado: ${resultados.empleadosConHorarioPersonalizado} | ⚠️ Con horario por defecto: ${resultados.empleadosSinHorarioPersonalizado}</p>
                    </div>
                </div>
            `;
        } else {
            let html = `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center mb-4">
                        <div>
                            <p class="text-2xl font-bold text-blue-600">${resultados.totalRegistros}</p>
                            <p class="text-xs text-gray-600">Total Registros</p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-green-600">${resultados.totalEntradas}</p>
                            <p class="text-xs text-gray-600">Entradas Analizadas</p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-red-600">${resultados.totalEmpleadosConTardias}</p>
                            <p class="text-xs text-gray-600">Empleados con Tardías</p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-purple-600">${resultados.horaEsperadaPorDefecto}</p>
                            <p class="text-xs text-gray-600">Hora Por Defecto</p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-orange-600">${resultados.toleranciaMinutos} min</p>
                            <p class="text-xs text-gray-600">Tolerancia</p>
                        </div>
                    </div>
                    <div class="border-t border-gray-300 pt-3 text-sm text-gray-700 text-center">
                        <p>
                            ✅ <strong>${resultados.empleadosConHorarioPersonalizado}</strong> entradas con horario personalizado | 
                            ⚠️ <strong>${resultados.empleadosSinHorarioPersonalizado}</strong> entradas usando horario por defecto
                        </p>
                    </div>
                </div>

                <div class="mb-4 flex justify-end">
                    <button onclick="ReportesModule.exportarTardiasExcel()" class="btn btn-primary">
                        <svg class="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Exportar a Excel
                    </button>
                </div>

                <div class="space-y-4">
            `;
            
            resultados.detalleTardias.forEach(emp => {
                const totalTardias = emp.tardias.length;
                const totalMinutosRetraso = emp.tardias.reduce((sum, t) => sum + t.minutosRetraso, 0);
                const promedioRetraso = Math.round(totalMinutosRetraso / totalTardias);
                const enSistema = emp.empleadoEnSistema ? '✅' : '❌';
                
                const idParaDiv = emp.idUsuario ? emp.idUsuario.replace(/\s+/g, '-') : emp.nombre.replace(/\s+/g, '-');
                
                html += `
                    <div class="border border-gray-200 rounded-lg overflow-hidden">
                        <div class="bg-gray-100 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-200"
                            onclick="document.getElementById('detalles-${idParaDiv}').classList.toggle('hidden')">
                            <div class="flex-1">
                                <h4 class="font-semibold text-gray-800">${emp.nombre}</h4>
                                <div class="text-sm text-gray-600">
                                    <span>ID: ${emp.idUsuario}</span>
                                    ${emp.cedula !== 'N/A' ? ` | Cédula: ${Formatters.formatearCedula(emp.cedula)}` : ''}
                                    <span class="ml-2">${enSistema}</span>
                                </div>
                                <div class="text-xs text-purple-700 mt-1">
                                    🕐 Horario: ${emp.horarioEntrada}
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                                    ${totalTardias} tardía${totalTardias > 1 ? 's' : ''}
                                </span>
                                <p class="text-xs text-gray-600 mt-1">Promedio: ${promedioRetraso} min</p>
                            </div>
                        </div>
                        <div id="detalles-${idParaDiv}" class="hidden bg-white">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-4 py-2 text-left">Fecha</th>
                                        <th class="px-4 py-2 text-left">Hora Entrada</th>
                                        <th class="px-4 py-2 text-left">Hora Esperada</th>
                                        <th class="px-4 py-2 text-right">Retraso</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                `;
                
                emp.tardias.forEach(tardia => {
                    const horas = Math.floor(tardia.minutosRetraso / 60);
                    const mins = tardia.minutosRetraso % 60;
                    const retrasoStr = horas > 0 ? `${horas}h ${mins}min` : `${mins} min`;
                    
                    html += `
                        <tr>
                            <td class="px-4 py-2">${tardia.fecha}</td>
                            <td class="px-4 py-2">${tardia.horaEntrada}</td>
                            <td class="px-4 py-2 text-purple-600">${tardia.horaEsperada}</td>
                            <td class="px-4 py-2 text-right text-red-600 font-semibold">${retrasoStr}</td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
            contenido.innerHTML = html;
        }
        
        container.classList.remove('hidden');
        
        // Guardar resultados para exportar
        this.ultimosResultadosTardias = resultados;
    },

    exportarTardiasExcel() {
        if (!this.ultimosResultadosTardias) {
            Utils.showToast('No hay resultados para exportar', 'warning');
            return;
        }

        try {
            const resultados = this.ultimosResultadosTardias;
            
            // Crear datos para el Excel
            const data = [
                ['REPORTE DE TARDÍAS - RELOJ MARCADOR'],
                ['Hora Por Defecto:', resultados.horaEsperadaPorDefecto],
                ['Tolerancia (minutos):', resultados.toleranciaMinutos],
                ['Total Registros:', resultados.totalRegistros],
                ['Total Entradas Analizadas:', resultados.totalEntradas],
                ['Empleados con Tardías:', resultados.totalEmpleadosConTardias],
                ['Con Horario Personalizado:', resultados.empleadosConHorarioPersonalizado],
                ['Con Horario Por Defecto:', resultados.empleadosSinHorarioPersonalizado],
                [],
                ['ID Usuario', 'Nombre', 'Cédula', 'Horario Empleado', 'Total Tardías', 'Fecha', 'Hora Entrada', 'Hora Esperada', 'Minutos Retraso']
            ];
            
            // Agregar detalles
            resultados.detalleTardias.forEach(emp => {
                emp.tardias.forEach((tardia, index) => {
                    data.push([
                        index === 0 ? emp.idUsuario : '',
                        index === 0 ? emp.nombre : '',
                        index === 0 ? emp.cedula : '',
                        index === 0 ? emp.horarioEntrada : '',
                        index === 0 ? emp.tardias.length : '',
                        tardia.fecha,
                        tardia.horaEntrada,
                        tardia.horaEsperada,
                        tardia.minutosRetraso
                    ]);
                });
            });
            
            // Crear workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Ajustar anchos de columna
            ws['!cols'] = [
                { wch: 12 }, // ID Usuario
                { wch: 30 }, // Nombre
                { wch: 15 }, // Cédula
                { wch: 16 }, // Horario Empleado
                { wch: 15 }, // Total Tardías
                { wch: 15 }, // Fecha
                { wch: 15 }, // Hora Entrada
                { wch: 15 }, // Hora Esperada
                { wch: 18 }  // Minutos Retraso
            ];
            
            XLSX.utils.book_append_sheet(wb, ws, 'Tardías');
            
            // Generar archivo
            const fecha = Formatters.formatearFechaArchivo(new Date());
            XLSX.writeFile(wb, `Reporte_Tardias_${fecha}.xlsx`);
            
            Utils.showToast('Reporte exportado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error exportando a Excel:', error);
            Utils.showToast('Error al exportar: ' + error.message, 'error');
        }
    },

    cerrarModal() {
        const modal = document.getElementById('modalReporteAsistencias');
        if (modal) {
            modal.remove();
        }
    },

    async reporteVacaciones() {
        const empleados = await FirebaseHelpers.getEmpleados();
        // Filtrar empleados activos que NO sean SP (ellos no tienen derecho a vacaciones)
        const empleadosActivos = empleados.filter(e =>
            e.estado === 'activo' &&
            e.tipoEmpleado !== 'SP'
        );

        const datosVacaciones = empleadosActivos.map(emp => {
            const vacaciones = Calculations.calcularVacaciones(emp.fechaIngreso);
            return {
                nombre: emp.nombre,
                cedula: emp.cedula,
                fechaIngreso: emp.fechaIngreso,
                ...vacaciones
            };
        });

        // Aquí se podría generar un PDF o mostrar en modal
        console.log('Reporte de Vacaciones:', datosVacaciones);
        Utils.showToast('Reporte de vacaciones generado', 'success');
    },

    constanciaSalarial() {
        Utils.showToast('Seleccione un empleado desde el módulo de Empleados', 'info');
    }
};

window.ReportesModule = ReportesModule;


