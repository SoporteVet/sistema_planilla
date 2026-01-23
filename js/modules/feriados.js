/**
 * Feriados Module - Sistema de Planillas Costa Rica
 */

const FeriadosModule = {
    feriados: [],

    init() {
        // No cargar datos aquí - se cargarán cuando se renderice la vista
    },

    async cargarFeriados() {
        this.feriados = await FirebaseHelpers.getFeriados();
        
        // Inicializar feriados 2025 y 2026 si no existen
        await FirebaseHelpers.inicializarFeriados2025();
        this.feriados = await FirebaseHelpers.getFeriados();
        
        this.render();
    },

    render() {
        // Cargar feriados si aún no se han cargado
        if (this.feriados.length === 0) {
            this.cargarFeriados();
        }
        
        const feriadosPorAño = this.agruparPorAño();

        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Feriados Nacionales</h1>
                        <p class="text-sm text-gray-600 mt-1">Gestión de feriados de Costa Rica</p>
                    </div>
                    <button onclick="FeriadosModule.mostrarModalNuevo()" class="btn btn-primary">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Nuevo Feriado
                    </button>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <strong>Nota:</strong> Los feriados trabajados se pagan al doble (2x del salario diario).
                </div>

                ${Object.keys(feriadosPorAño).sort((a, b) => parseInt(a) - parseInt(b)).map(año => `
                    <div class="card">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Feriados ${año}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${feriadosPorAño[año].map(f => this.renderFeriadoCard(f)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Feriados']);
    },

    renderFeriadoCard(feriado) {
        if (!feriado || !feriado.id) return '';
        
        const nombre = feriado.nombre || 'Sin nombre';
        const fecha = feriado.fecha ? Formatters.formatearFechaLarga(feriado.fecha) : 'Fecha no definida';
        const tipo = feriado.tipo || 'obligatorio';
        const aplicaDoble = feriado.aplicaDoble !== undefined ? feriado.aplicaDoble : true;
        const activo = feriado.activo !== undefined ? feriado.activo : true;
        
        return `
            <div class="border border-gray-200 rounded-lg p-4 ${activo ? '' : 'opacity-50'}">
                <div class="flex justify-between items-start mb-2">
                    <div class="text-lg font-semibold text-gray-800">${nombre}</div>
                    <div class="flex items-center gap-2">
                        ${aplicaDoble ? 
                            '<span class="badge badge-success text-xs">Pago 2x</span>' : 
                            '<span class="badge badge-secondary text-xs">No aplica 2x</span>'
                        }
                        <button onclick="FeriadosModule.mostrarModalEditar('${feriado.id}')" 
                            class="text-blue-600 hover:text-blue-800" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="FeriadosModule.eliminar('${feriado.id}')" 
                            class="text-red-600 hover:text-red-800" title="Eliminar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                    ${fecha}
                </div>
                <div class="text-xs text-gray-500">
                    Tipo: ${Formatters.capitalizar(tipo)}
                </div>
            </div>
        `;
    },

    agruparPorAño() {
        const grupos = {};
        
        this.feriados.forEach(f => {
            if (!f || !f.fecha) return;
            
            const fecha = new Date(f.fecha);
            if (isNaN(fecha.getTime())) return;
            
            const año = fecha.getFullYear();
            
            if (!grupos[año]) {
                grupos[año] = [];
            }
            
            grupos[año].push(f);
        });

        // Ordenar por fecha dentro de cada año (de menor a mayor)
        Object.keys(grupos).forEach(año => {
            grupos[año].sort((a, b) => {
                // Asegurar que ambos tengan fecha válida
                if (!a.fecha && !b.fecha) return 0;
                if (!a.fecha) return 1; // Sin fecha va al final
                if (!b.fecha) return -1; // Sin fecha va al final
                
                // Comparar timestamps directamente
                const fechaA = Number(a.fecha) || 0;
                const fechaB = Number(b.fecha) || 0;
                
                return fechaA - fechaB; // Orden ascendente (menor a mayor)
            });
        });

        return grupos;
    },

    mostrarModalNuevo() {
        this.mostrarModalEditar(null);
    },

    mostrarModalEditar(feriadoId) {
        const feriado = feriadoId ? this.feriados.find(f => f.id === feriadoId) : null;
        const esEdicion = !!feriado;
        const titulo = esEdicion ? 'Editar Feriado' : 'Nuevo Feriado';
        
        const fechaValue = feriado && feriado.fecha 
            ? this.timestampAFechaString(feriado.fecha) 
            : '';
        
        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalFeriado">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-2xl font-bold">${titulo}</h2>
                        <button onclick="FeriadosModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <form id="formFeriado" class="p-6 space-y-4">
                        <input type="hidden" id="feriadoId" value="${feriadoId || ''}">
                        <div class="form-group">
                            <label class="form-label">Nombre del Feriado *</label>
                            <input type="text" id="nombre" class="form-control" required 
                                placeholder="Ej: Día de la Independencia"
                                value="${feriado?.nombre || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fecha *</label>
                            <input type="date" id="fecha" class="form-control" required
                                value="${fechaValue}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo *</label>
                            <select id="tipo" class="form-control" required>
                                <option value="obligatorio" ${feriado?.tipo === 'obligatorio' ? 'selected' : ''}>Obligatorio</option>
                                <option value="relativo" ${feriado?.tipo === 'relativo' ? 'selected' : ''}>Relativo</option>
                            </select>
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Obligatorio: Debe aplicarse siempre. Relativo: Puede variar según región.
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Aplica Pago Doble *</label>
                            <select id="aplicaDoble" class="form-control" required>
                                <option value="true" ${feriado?.aplicaDoble !== false ? 'selected' : ''}>Sí (2x salario diario)</option>
                                <option value="false" ${feriado?.aplicaDoble === false ? 'selected' : ''}>No</option>
                            </select>
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Si se trabaja en este feriado, se paga al doble del salario diario.
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Estado</label>
                            <select id="activo" class="form-control">
                                <option value="true" ${feriado?.activo !== false ? 'selected' : ''}>Activo</option>
                                <option value="false" ${feriado?.activo === false ? 'selected' : ''}>Inactivo</option>
                            </select>
                        </div>
                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onclick="FeriadosModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">${esEdicion ? 'Actualizar' : 'Guardar'}</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        document.getElementById('formFeriado').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardar(feriadoId);
        });
    },

    /**
     * Convierte una fecha en formato YYYY-MM-DD a timestamp sin problemas de zona horaria
     * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
     * @returns {number} Timestamp en milisegundos
     */
    fechaStringATimestamp(fechaStr) {
        if (!fechaStr) return null;
        
        const partes = fechaStr.split('-');
        if (partes.length !== 3) return null;
        
        const año = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1; // Mes es 0-indexed
        const dia = parseInt(partes[2], 10);
        
        // Crear fecha en hora local (medianoche local)
        const fecha = new Date(año, mes, dia, 0, 0, 0, 0);
        return fecha.getTime();
    },

    /**
     * Convierte un timestamp a fecha en formato YYYY-MM-DD sin problemas de zona horaria
     * @param {number} timestamp - Timestamp en milisegundos
     * @returns {string} Fecha en formato YYYY-MM-DD
     */
    timestampAFechaString(timestamp) {
        if (!timestamp) return '';
        
        const fecha = new Date(timestamp);
        if (isNaN(fecha.getTime())) return '';
        
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        
        return `${año}-${mes}-${dia}`;
    },

    async guardar(feriadoId) {
        try {
            const nombre = document.getElementById('nombre').value.trim();
            const fechaInput = document.getElementById('fecha').value;
            const tipo = document.getElementById('tipo').value;
            const aplicaDoble = document.getElementById('aplicaDoble').value === 'true';
            const activo = document.getElementById('activo').value === 'true';

            if (!nombre || !fechaInput) {
                Utils.showToast('Por favor complete todos los campos requeridos', 'error');
                return;
            }

            // Convertir fecha sin problemas de zona horaria
            const fechaTimestamp = this.fechaStringATimestamp(fechaInput);
            if (!fechaTimestamp) {
                Utils.showToast('Fecha inválida', 'error');
                return;
            }

            // Obtener año de la fecha string directamente
            const partes = fechaInput.split('-');
            const año = parseInt(partes[0], 10);
            
            const esEdicion = !!feriadoId;

            Utils.showLoading(esEdicion ? 'Actualizando feriado...' : 'Guardando feriado...');

            const datosFeriado = {
                fecha: fechaTimestamp,
                nombre,
                tipo,
                aplicaDoble,
                activo,
                año
            };

            if (esEdicion) {
                await FirebaseHelpers.update(`${CONFIG.DB_PATHS.FERIADOS}/${feriadoId}`, datosFeriado);
                Utils.showToast('Feriado actualizado exitosamente', 'success');
            } else {
                await FirebaseHelpers.createFeriado(datosFeriado);
                Utils.showToast('Feriado creado exitosamente', 'success');
            }

            Utils.hideLoading();
            this.cerrarModal();
            await this.cargarFeriados();

        } catch (error) {
            console.error('Error guardando feriado:', error);
            Utils.showToast('Error al guardar feriado: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    async eliminar(id) {
        const feriado = this.feriados.find(f => f.id === id);
        if (!feriado) return;

        if (!confirm(`¿Está seguro de eliminar el feriado "${feriado.nombre}"?`)) {
            return;
        }

        try {
            Utils.showLoading('Eliminando feriado...');
            await FirebaseHelpers.remove(`${CONFIG.DB_PATHS.FERIADOS}/${id}`);
            Utils.showToast('Feriado eliminado exitosamente', 'success');
            Utils.hideLoading();
            await this.cargarFeriados();
        } catch (error) {
            console.error('Error eliminando feriado:', error);
            Utils.showToast('Error al eliminar feriado', 'error');
            Utils.hideLoading();
        }
    },

    cerrarModal() {
        document.getElementById('modalContainer').innerHTML = '';
    }
};

window.FeriadosModule = FeriadosModule;





