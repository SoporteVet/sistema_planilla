/**
 * Bonos y Rebajos Module - Sistema de Planillas Costa Rica
 */

const BonosRebajosModule = {
    items: [],
    empleados: [],
    filtros: {
        tipo: '',
        estado: '',
        empleado: '',
        mes: (() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        })(),
        quincena: (() => {
            const day = new Date().getDate();
            return day <= 15 ? 'q1' : 'q2';
        })()
    },

    init() {
        // No cargar datos aquí - se cargarán cuando se renderice la vista
    },

    async cargarDatos() {
        this.empleados = await FirebaseHelpers.getEmpleados();
        FirebaseHelpers.listenBonosRebajos((items) => {
            this.items = items;
            this.render();
        });
    },

    render() {
        // Cargar datos si aún no se han cargado
        if (this.empleados.length === 0) {
            this.cargarDatos();
            return; // Esperar a que se carguen los datos
        }
        
        const itemsFiltrados = this.aplicarFiltros();
        const mesesDisponibles = this.obtenerMesesDisponibles();

        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Bonos y Rebajos</h1>
                        <p class="text-sm text-gray-600 mt-1">Gestione bonificaciones y descuentos adicionales</p>
                    </div>
                    <button onclick="BonosRebajosModule.mostrarModalNuevo()" class="btn btn-primary">
                        Nuevo Bono/Rebajo
                    </button>
                </div>

                <!-- Filtros -->
                <div class="card">
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <select id="filtroTipo" class="form-control">
                            <option value="" ${this.filtros.tipo === '' ? 'selected' : ''}>Todos los tipos</option>
                            <option value="bono" ${this.filtros.tipo === 'bono' ? 'selected' : ''}>Bonos</option>
                            <option value="rebajo" ${this.filtros.tipo === 'rebajo' ? 'selected' : ''}>Rebajos</option>
                        </select>
                        <select id="filtroEstado" class="form-control">
                            <option value="" ${this.filtros.estado === '' ? 'selected' : ''}>Todos los estados</option>
                            <option value="pendiente" ${this.filtros.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="aprobado" ${this.filtros.estado === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                            <option value="rechazado" ${this.filtros.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                        </select>
                        <select id="filtroEmpleado" class="form-control">
                            <option value="" ${this.filtros.empleado === '' ? 'selected' : ''}>Todos los empleados</option>
                            ${this.empleados.map(e => `<option value="${e.id}" ${this.filtros.empleado === e.id ? 'selected' : ''}>${e.nombre}</option>`).join('')}
                        </select>
                        <select id="filtroMes" class="form-control">
                            <option value="" ${this.filtros.mes === '' ? 'selected' : ''}>Todos los meses</option>
                            ${mesesDisponibles.map(mes => `
                                <option value="${mes}" ${this.filtros.mes === mes ? 'selected' : ''}>${this.obtenerEtiquetaMes(mes)}</option>
                            `).join('')}
                        </select>
                        <select id="filtroQuincena" class="form-control">
                            <option value="">Ambas quincenas</option>
                            <option value="q1" ${this.filtros.quincena === 'q1' ? 'selected' : ''}>1ª quincena</option>
                            <option value="q2" ${this.filtros.quincena === 'q2' ? 'selected' : ''}>2ª quincena</option>
                        </select>
                    </div>
                </div>

                <!-- Estadísticas -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="stat-card">
                        <div class="stat-value">${itemsFiltrados.length}</div>
                        <div class="stat-label">Total Registros</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${itemsFiltrados.filter(i => i.estado === 'pendiente').length}</div>
                        <div class="stat-label">Pendientes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Formatters.formatearMoneda(this.calcularTotalBonos(itemsFiltrados))}</div>
                        <div class="stat-label">Total Bonos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Formatters.formatearMoneda(this.calcularTotalRebajos(itemsFiltrados))}</div>
                        <div class="stat-label">Total Rebajos</div>
                    </div>
                </div>

                <!-- Tabla -->
                <div class="card">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Tipo</th>
                                    <th>Concepto</th>
                                    <th>Monto</th>
                                    <th>Fecha de Aplicación</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderTabla(itemsFiltrados)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Bonos y Rebajos']);
        this.setupEventListeners();
    },

    renderTabla(items) {
        if (items.length === 0) {
            return '<tr><td colspan="7" class="text-center text-gray-500 py-8">No hay registros</td></tr>';
        }

        return items.map(item => {
            const empleado = this.empleados.find(e => e.id === item.empleadoId);
            return `
                <tr>
                    <td>${empleado?.nombre || 'N/A'}</td>
                    <td><span class="badge ${item.tipo === 'bono' ? 'badge-success' : 'badge-danger'}">
                        ${item.tipo.toUpperCase()}
                    </span></td>
                    <td>${item.concepto}</td>
                    <td class="font-semibold">${Formatters.formatearMoneda(item.monto)}</td>
                    <td>${item.fechaAplicacion ? new Date(item.fechaAplicacion).toLocaleDateString('es-CR') : 'N/A'}</td>
                    <td>${Formatters.formatearEstadoBadge(item.estado)}</td>
                    <td>
                        <div class="flex space-x-2">
                            ${item.estado === 'pendiente' ? `
                                <button onclick="BonosRebajosModule.aprobar('${item.id}')" 
                                    class="text-green-600 hover:text-green-800" title="Aprobar">
                                    ✓
                                </button>
                            ` : ''}
                            <button onclick="BonosRebajosModule.eliminar('${item.id}')" 
                                class="text-red-600 hover:text-red-800" title="Eliminar">
                                ✕
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    setupEventListeners() {
        ['filtroTipo', 'filtroEstado', 'filtroEmpleado', 'filtroMes', 'filtroQuincena'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.render());
        });
    },

    aplicarFiltros() {
        this.filtros.tipo = document.getElementById('filtroTipo')?.value || '';
        this.filtros.estado = document.getElementById('filtroEstado')?.value || '';
        this.filtros.empleado = document.getElementById('filtroEmpleado')?.value || '';
        const mesSeleccionado = document.getElementById('filtroMes')?.value;
        const quincenaSeleccionada = document.getElementById('filtroQuincena')?.value;
        if (mesSeleccionado !== undefined) {
            this.filtros.mes = mesSeleccionado;
        }
        if (quincenaSeleccionada !== undefined) {
            this.filtros.quincena = quincenaSeleccionada;
        }

        return this.items.filter(item => {
            if (this.filtros.tipo && item.tipo !== this.filtros.tipo) return false;
            if (this.filtros.estado && item.estado !== this.filtros.estado) return false;
            if (this.filtros.empleado && item.empleadoId !== this.filtros.empleado) return false;
            const mesItem = this.obtenerMesClave(item.fechaAplicacion);
            if (this.filtros.mes && mesItem !== this.filtros.mes) return false;
            const quincenaItem = this.obtenerQuincena(item.fechaAplicacion);
            if (this.filtros.quincena && quincenaItem !== this.filtros.quincena) return false;
            return true;
        });
    },

    calcularTotalBonos(items) {
        return items.filter(i => i.tipo === 'bono' && i.estado === 'aprobado')
            .reduce((sum, i) => sum + i.monto, 0);
    },

    calcularTotalRebajos(items) {
        return items.filter(i => i.tipo === 'rebajo' && i.estado === 'aprobado')
            .reduce((sum, i) => sum + i.monto, 0);
    },

    obtenerMesClave(timestamp) {
        if (!timestamp) return null;
        const fecha = new Date(timestamp);
        if (isNaN(fecha.getTime())) return null;
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    },

    obtenerEtiquetaMes(mesClave) {
        if (!mesClave) return '';
        const [ano, mes] = mesClave.split('-');
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const indiceMes = parseInt(mes, 10) - 1;
        return indiceMes >= 0 ? `${meses[indiceMes]} ${ano}` : mesClave;
    },

    obtenerQuincena(timestamp) {
        if (!timestamp) return null;
        const fecha = new Date(timestamp);
        if (isNaN(fecha.getTime())) return null;
        return fecha.getDate() <= 15 ? 'q1' : 'q2';
    },

    obtenerMesesDisponibles() {
        const meses = new Set();
        this.items.forEach(item => {
            const mesClave = this.obtenerMesClave(item.fechaAplicacion);
            if (mesClave) meses.add(mesClave);
        });
        if (this.filtros.mes) meses.add(this.filtros.mes);
        return Array.from(meses).sort((a, b) => (a > b ? -1 : 1));
    },

    mostrarModalNuevo() {
        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalBono">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-2xl font-bold">Nuevo Bono/Rebajo</h2>
                        <button onclick="BonosRebajosModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <form id="formBono" class="p-6 space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="form-group">
                                <label class="form-label">Empleado *</label>
                                <select id="empleadoId" class="form-control" required>
                                    <option value="">Seleccione...</option>
                                    ${this.empleados.filter(e => e.estado === 'activo').map(e => 
                                        `<option value="${e.id}">${e.nombre}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tipo *</label>
                                <select id="tipo" class="form-control" required>
                                    <option value="bono">Bono</option>
                                    <option value="rebajo">Rebajo</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Concepto *</label>
                            <select id="concepto" class="form-control" required>
                                <option value="">Seleccione...</option>
                                ${CONFIG.CONCEPTOS_BONO.concat(CONFIG.CONCEPTOS_REBAJO).map(c => 
                                    `<option value="${c}">${c}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Monto (₡) *</label>
                            <input type="number" id="monto" class="form-control" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fecha de Aplicación *</label>
                            <input type="date" id="fechaAplicacion" class="form-control" required>
                            <div class="form-help text-xs text-gray-500 mt-1">
                                Seleccione la fecha en que este bono/rebajo debe aplicarse en la planilla
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Observaciones</label>
                            <textarea id="observaciones" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onclick="BonosRebajosModule.cerrarModal()" class="btn btn-outline">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        document.getElementById('formBono').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardar();
        });
    },

    async guardar() {
        try {
            const fechaAplicacionInput = document.getElementById('fechaAplicacion').value;
            if (!fechaAplicacionInput) {
                Utils.showToast('La fecha de aplicación es requerida', 'error');
                return;
            }

            const datos = {
                empleadoId: document.getElementById('empleadoId').value,
                tipo: document.getElementById('tipo').value,
                concepto: document.getElementById('concepto').value,
                monto: parseFloat(document.getElementById('monto').value),
                fechaAplicacion: new Date(fechaAplicacionInput).getTime(),
                fechaVigencia: new Date().getTime(),
                observaciones: document.getElementById('observaciones').value
            };

            Utils.showLoading('Guardando...');
            await FirebaseHelpers.createBonoRebajo(datos);
            Utils.showToast('Guardado exitosamente', 'success');
            Utils.hideLoading();
            this.cerrarModal();
        } catch (error) {
            Utils.showToast('Error: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    async aprobar(id) {
        if (!confirm('¿Aprobar este bono/rebajo?')) return;
        try {
            await FirebaseHelpers.aprobarBonoRebajo(id);
            Utils.showToast('Aprobado exitosamente', 'success');
        } catch (error) {
            Utils.showToast('Error al aprobar', 'error');
        }
    },

    async eliminar(id) {
        if (!confirm('¿Eliminar este registro?')) return;
        try {
            await FirebaseHelpers.deleteBonoRebajo(id);
            Utils.showToast('Eliminado exitosamente', 'success');
        } catch (error) {
            Utils.showToast('Error al eliminar', 'error');
        }
    },

    cerrarModal() {
        document.getElementById('modalContainer').innerHTML = '';
    }
};

window.BonosRebajosModule = BonosRebajosModule;

