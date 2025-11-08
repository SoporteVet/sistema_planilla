/**
 * Empleados Module - Sistema de Planillas Costa Rica
 * Gestión completa de empleados (CRUD)
 */

const EmpleadosModule = {
    empleados: [],
    empleadosFiltrados: [],
    currentPage: 1,
    pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
    filtros: { busqueda: '', empresa: '', departamento: '', jornada: '', estado: '' },
    sortBy: 'nombre',
    sortDirection: 'asc',

    /**
     * Inicializa el módulo
     */
    init() {
        this.cargarEmpleados();
    },

    /**
     * Carga empleados desde Firebase
     */
    cargarEmpleados() {
        FirebaseHelpers.listenEmpleados((empleados) => {
            this.empleados = empleados;
            this.aplicarFiltros();
        });
    },

    /**
     * Renderiza la vista de empleados
     */
    render() {
        const empleadosEmpresa = this.empleados.filter(emp => !this.filtros.empresa || emp.empresa === this.filtros.empresa);
        const departamentosEmpresa = this.getDepartamentosUnicos(empleadosEmpresa);
        const totalEmpleadosEmpresa = empleadosEmpresa.length;
        const totalActivosEmpresa = empleadosEmpresa.filter(e => e.estado === 'activo').length;
        const nominaTotalEmpresa = this.calcularTotalNomina(empleadosEmpresa);

        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Gestión de Empleados</h1>
                        <p class="text-sm text-gray-600 mt-1">Administre los empleados de la empresa</p>
                    </div>
                    <button onclick="EmpleadosModule.mostrarModalNuevo()" class="btn btn-primary">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        Nuevo Empleado
                    </button>
                </div>

                <!-- Filtros -->
                <div class="card">
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <input type="text" id="filtroBusqueda" placeholder="Buscar por nombre o cédula..." 
                                class="form-control" value="${this.filtros.busqueda}">
                        </div>
                        <div>
                            <select id="filtroEmpresa" class="form-control">
                                <option value="">Todas las empresas</option>
                                ${this.getEmpresasUnicas().map(e => 
                                    `<option value="${e}" ${this.filtros.empresa === e ? 'selected' : ''}>${e}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <select id="filtroDepartamento" class="form-control">
                                <option value="">Todos los departamentos</option>
                                ${departamentosEmpresa.map(d => 
                                    `<option value="${d}" ${this.filtros.departamento === d ? 'selected' : ''}>${d}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <select id="filtroJornada" class="form-control">
                                <option value="">Todas las jornadas</option>
                                ${Object.values(CONFIG.JORNADAS).map(j => 
                                    `<option value="${j.codigo}" ${this.filtros.jornada === j.codigo ? 'selected' : ''}>${j.nombre}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <select id="filtroEstado" class="form-control">
                                <option value="">Todos los estados</option>
                                <option value="activo" ${this.filtros.estado === 'activo' ? 'selected' : ''}>Activo</option>
                                <option value="inactivo" ${this.filtros.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                                <option value="suspendido" ${this.filtros.estado === 'suspendido' ? 'selected' : ''}>Suspendido</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Estadísticas -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="stat-card">
                        <div class="stat-value">${totalEmpleadosEmpresa}</div>
                        <div class="stat-label">Total Empleados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${totalActivosEmpresa}</div>
                        <div class="stat-label">Activos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${departamentosEmpresa.length}</div>
                        <div class="stat-label">Departamentos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Formatters.formatearMoneda(nominaTotalEmpresa)}</div>
                        <div class="stat-label">Nómina Total Mensual</div>
                    </div>
                </div>

                <!-- Tabla de empleados -->
                <div class="card">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Listado de Empleados</h3>
                        <button onclick="EmpleadosModule.exportarPDF()" class="btn btn-outline">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Exportar PDF
                        </button>
                    </div>
                    
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th onclick="EmpleadosModule.ordenar('nombre')" class="cursor-pointer">
                                        Nombre ${this.sortBy === 'nombre' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th onclick="EmpleadosModule.ordenar('cedula')" class="cursor-pointer">
                                        Cédula ${this.sortBy === 'cedula' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th>Cargo</th>
                                    <th>Departamento</th>
                                    <th>Jornada</th>
                                    <th onclick="EmpleadosModule.ordenar('salarioMensual')" class="cursor-pointer">
                                        Salario ${this.sortBy === 'salarioMensual' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}
                                    </th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderEmpleadosTable()}
                            </tbody>
                        </table>
                    </div>

                    ${this.renderPaginacion()}
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Empleados']);
        this.setupEventListeners();
    },

    /**
     * Renderiza las filas de la tabla
     */
    renderEmpleadosTable() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const empleadosPagina = this.empleadosFiltrados.slice(start, end);

        if (empleadosPagina.length === 0) {
            return `
                <tr>
                    <td colspan="8" class="text-center text-gray-500 py-8">
                        No se encontraron empleados
                    </td>
                </tr>
            `;
        }

        return empleadosPagina.map(emp => `
            <tr>
                <td class="font-medium text-gray-800">${emp.nombre}</td>
                <td>${Formatters.formatearCedula(emp.cedula)}</td>
                <td>${emp.cargo}</td>
                <td>${emp.departamento}</td>
                <td><span class="text-xs">${Formatters.formatearJornada(emp.jornada)}</span></td>
                <td class="font-semibold">${Formatters.formatearMoneda(emp.salarioMensual)}</td>
                <td>${Formatters.formatearEstadoBadge(emp.estado)}</td>
                <td>
                    <div class="flex space-x-2">
                        <button onclick="EmpleadosModule.verDetalle('${emp.id}')" 
                            class="text-blue-600 hover:text-blue-800" title="Ver detalle">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        <button onclick="EmpleadosModule.mostrarModalEditar('${emp.id}')" 
                            class="text-green-600 hover:text-green-800" title="Editar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="EmpleadosModule.eliminar('${emp.id}')" 
                            class="text-red-600 hover:text-red-800" title="Desactivar">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    /**
     * Renderiza la paginación
     */
    renderPaginacion() {
        const totalPages = Math.ceil(this.empleadosFiltrados.length / this.pageSize);
        
        if (totalPages <= 1) return '';

        let paginacionHTML = '<div class="pagination mt-4">';
        
        // Botón anterior
        paginacionHTML += `
            <button onclick="EmpleadosModule.cambiarPagina(${this.currentPage - 1})" 
                ${this.currentPage === 1 ? 'disabled' : ''}>
                Anterior
            </button>
        `;

        // Números de página
        for (let i = 1; i <= Math.min(totalPages, 10); i++) {
            paginacionHTML += `
                <button onclick="EmpleadosModule.cambiarPagina(${i})" 
                    class="${this.currentPage === i ? 'active' : ''}">
                    ${i}
                </button>
            `;
        }

        // Botón siguiente
        paginacionHTML += `
            <button onclick="EmpleadosModule.cambiarPagina(${this.currentPage + 1})" 
                ${this.currentPage === totalPages ? 'disabled' : ''}>
                Siguiente
            </button>
        `;

        paginacionHTML += '</div>';
        
        return paginacionHTML;
    },

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        document.getElementById('filtroBusqueda')?.addEventListener('input', (e) => {
            this.filtros.busqueda = e.target.value;
            this.aplicarFiltros();
        });

        document.getElementById('filtroEmpresa')?.addEventListener('change', (e) => {
            this.filtros.empresa = e.target.value;
            this.aplicarFiltros();
        });

        document.getElementById('filtroDepartamento')?.addEventListener('change', (e) => {
            this.filtros.departamento = e.target.value;
            this.aplicarFiltros();
        });

        document.getElementById('filtroJornada')?.addEventListener('change', (e) => {
            this.filtros.jornada = e.target.value;
            this.aplicarFiltros();
        });

        document.getElementById('filtroEstado')?.addEventListener('change', (e) => {
            this.filtros.estado = e.target.value;
            this.aplicarFiltros();
        });
    },

    /**
     * Aplica filtros a los empleados
     */
    aplicarFiltros() {
        const activeElementId = document.activeElement?.id;
        let cursorPos = null;
        if (activeElementId === 'filtroBusqueda' && typeof document.activeElement.selectionStart === 'number') {
            cursorPos = document.activeElement.selectionStart;
        }

        this.empleadosFiltrados = this.empleados.filter(emp => {
            let cumpleFiltros = true;

            if (this.filtros.busqueda) {
                const busqueda = this.filtros.busqueda.toLowerCase();
                cumpleFiltros = cumpleFiltros && (
                    emp.nombre.toLowerCase().includes(busqueda) ||
                    emp.cedula.includes(busqueda)
                );
            }

            if (this.filtros.empresa) {
                cumpleFiltros = cumpleFiltros && emp.empresa === this.filtros.empresa;
            }

            if (this.filtros.departamento) {
                cumpleFiltros = cumpleFiltros && emp.departamento === this.filtros.departamento;
            }

            if (this.filtros.jornada) {
                cumpleFiltros = cumpleFiltros && emp.jornada === this.filtros.jornada;
            }

            if (this.filtros.estado) {
                cumpleFiltros = cumpleFiltros && emp.estado === this.filtros.estado;
            }

            return cumpleFiltros;
        });

        this.ordenarEmpleados();
        this.currentPage = 1;
        this.render();

        if (activeElementId === 'filtroBusqueda') {
            const input = document.getElementById('filtroBusqueda');
            if (input) {
                input.focus();
                const pos = cursorPos ?? input.value.length;
                input.setSelectionRange(pos, pos);
            }
        }
    },

    /**
     * Ordena los empleados
     */
    ordenarEmpleados() {
        this.empleadosFiltrados.sort((a, b) => {
            let valorA = a[this.sortBy];
            let valorB = b[this.sortBy];

            if (typeof valorA === 'string') {
                valorA = valorA.toLowerCase();
                valorB = valorB.toLowerCase();
            }

            if (valorA < valorB) return this.sortDirection === 'asc' ? -1 : 1;
            if (valorA > valorB) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    },

    /**
     * Cambia el ordenamiento
     */
    ordenar(campo) {
        if (this.sortBy === campo) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = campo;
            this.sortDirection = 'asc';
        }
        this.ordenarEmpleados();
        this.render();
    },

    /**
     * Cambia de página
     */
    cambiarPagina(pagina) {
        const totalPages = Math.ceil(this.empleadosFiltrados.length / this.pageSize);
        if (pagina >= 1 && pagina <= totalPages) {
            this.currentPage = pagina;
            this.render();
        }
    },

    /**
     * Obtiene departamentos únicos
     */
    getDepartamentosUnicos(lista = this.empleados) {
        return [...new Set(lista.map(e => e.departamento))].filter(Boolean);
    },

    /**
     * Obtiene empresas únicas
     */
    getEmpresasUnicas() {
        return [...new Set(this.empleados.map(e => e.empresa))].filter(Boolean);
    },

    /**
     * Calcula total de nómina mensual
     */
    calcularTotalNomina(lista = this.empleados) {
        return lista
            .filter(e => e.estado === 'activo')
            .reduce((sum, e) => sum + (e.salarioMensual || 0), 0);
    },

    /**
     * Muestra modal para nuevo empleado
     */
    mostrarModalNuevo() {
        const modal = this.crearModalEmpleado();
        document.getElementById('modalContainer').innerHTML = modal;
        this.setupModalEventListeners();
    },

    /**
     * Muestra modal para editar empleado
     */
    async mostrarModalEditar(id) {
        const empleado = this.empleados.find(e => e.id === id);
        if (!empleado) return;

        const modal = this.crearModalEmpleado(empleado);
        document.getElementById('modalContainer').innerHTML = modal;
        this.setupModalEventListeners(id);
    },

    /**
     * Crea HTML del modal de empleado
     */
    crearModalEmpleado(empleado = null) {
        const esNuevo = !empleado;
        const titulo = esNuevo ? 'Nuevo Empleado' : 'Editar Empleado';

        return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalEmpleado">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 class="text-2xl font-bold text-gray-800">${titulo}</h2>
                        <button onclick="EmpleadosModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <form id="formEmpleado" class="p-6 space-y-6">
                        <!-- Información Personal -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Personal</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="form-label">Nombre Completo <span class="text-red-500">*</span></label>
                                    <input type="text" id="nombre" class="form-control" value="${empleado?.nombre || ''}" required>
                                    <div class="form-error hidden" id="error-nombre"></div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Cédula <span class="text-red-500">*</span></label>
                                    <input type="text" id="cedula" class="form-control" 
                                        value="${empleado?.cedula || ''}" required>
                                    <div class="form-error hidden" id="error-cedula"></div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Correo Electrónico <span class="text-red-500">*</span></label>
                                    <input type="email" id="correo" class="form-control" value="${empleado?.correo || ''}" required>
                                    <div class="form-error hidden" id="error-correo"></div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Teléfono</label>
                                    <input type="tel" id="telefono" class="form-control" placeholder="XXXX-XXXX" 
                                        value="${empleado?.telefono || ''}">
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Fecha de Ingreso <span class="text-red-500">*</span></label>
                                    <input type="date" id="fechaIngreso" class="form-control" 
                                        value="${empleado ? Formatters.formatearFechaInput(empleado.fechaIngreso) : ''}" required>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Fecha de Nacimiento</label>
                                    <input type="date" id="fechaNacimiento" class="form-control" 
                                        value="${empleado && empleado.fechaNacimiento ? Formatters.formatearFechaInput(empleado.fechaNacimiento) : ''}">
                                    <div class="form-help">Para envío automático de felicitaciones de cumpleaños</div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Estado <span class="text-red-500">*</span></label>
                                    <select id="estado" class="form-control" required>
                                        <option value="activo" ${empleado?.estado === 'activo' ? 'selected' : ''}>Activo</option>
                                        <option value="inactivo" ${empleado?.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                                        <option value="suspendido" ${empleado?.estado === 'suspendido' ? 'selected' : ''}>Suspendido</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Información Laboral -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Laboral</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="form-label">Salario Mensual (₡) <span class="text-red-500">*</span></label>
                                    <input type="number" id="salarioMensual" class="form-control" step="0.01" 
                                        value="${empleado?.salarioMensual || ''}" required>
                                    <div class="form-error hidden" id="error-salarioMensual"></div>
                                    <div class="form-help">El salario mensual ya contempla los días libres de la jornada</div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Salario por Hora (₡) <span class="text-gray-400">(Opcional)</span></label>
                                    <input type="number" id="salarioHorario" class="form-control" step="0.0000001" 
                                        value="${empleado?.salarioHorario || ''}" placeholder="Se calculará automáticamente">
                                    <div class="form-error hidden" id="error-salarioHorario"></div>
                                    <div class="form-help">Si ingresa este valor, se calculará el salario mensual automáticamente. Use hasta 7 decimales para mayor precisión.</div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Jornada Laboral <span class="text-red-500">*</span></label>
                                    <select id="jornada" class="form-control" required>
                                        ${Object.values(CONFIG.JORNADAS).map(j => 
                                            `<option value="${j.codigo}" ${empleado?.jornada === j.codigo ? 'selected' : ''}>
                                                ${j.nombre} (${j.descripcion})
                                            </option>`
                                        ).join('')}
                                    </select>
                                    <div class="form-help">Al cambiar la jornada, se recalcularán los salarios</div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Cargo <span class="text-red-500">*</span></label>
                                    <input type="text" id="cargo" class="form-control" value="${empleado?.cargo || ''}" required>
                                    <div class="form-error hidden" id="error-cargo"></div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Departamento <span class="text-red-500">*</span></label>
                                    <input type="text" id="departamento" class="form-control" value="${empleado?.departamento || ''}" required>
                                    <div class="form-error hidden" id="error-departamento"></div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Empresa <span class="text-red-500">*</span></label>
                                    <select id="empresa" class="form-control" required>
                                        ${CONFIG.EMPRESAS.map(e => 
                                            `<option value="${e}" ${empleado?.empresa === e ? 'selected' : ''}>${e}</option>`
                                        ).join('')}
                                    </select>
                                    <div class="form-help">La empresa determina el logo y nombre en el comprobante de pago</div>
                                </div>
                            </div>
                        </div>

                        <!-- Información Bancaria -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Bancaria</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="form-label">Banco</label>
                                    <select id="banco" class="form-control">
                                        <option value="">Seleccione un banco</option>
                                        ${CONFIG.BANCOS.map(b => 
                                            `<option value="${b}" ${empleado?.banco === b ? 'selected' : ''}>${b}</option>`
                                        ).join('')}
                                    </select>
                                    <div class="form-help">Información bancaria para depósito de salarios</div>
                                </div>
                            </div>
                        </div>

                        <!-- Información Fiscal -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Fiscal</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-group">
                                    <label class="form-label">Cantidad de Hijos</label>
                                    <input type="number" id="hijos" class="form-control" min="0" max="10" 
                                        value="${empleado?.hijos || 0}">
                                    <div class="form-help">Máximo 4 hijos para crédito fiscal</div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Estado Civil</label>
                                    <select id="estadoCivil" class="form-control">
                                        <option value="soltero" ${empleado?.estadoCivil === 'soltero' ? 'selected' : ''}>Soltero(a)</option>
                                        <option value="casado" ${empleado?.estadoCivil === 'casado' ? 'selected' : ''}>Casado(a)</option>
                                        <option value="divorciado" ${empleado?.estadoCivil === 'divorciado' ? 'selected' : ''}>Divorciado(a)</option>
                                        <option value="viudo" ${empleado?.estadoCivil === 'viudo' ? 'selected' : ''}>Viudo(a)</option>
                                        <option value="union_libre" ${empleado?.estadoCivil === 'union_libre' ? 'selected' : ''}>Unión Libre</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Botones -->
                        <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                            <button type="button" onclick="EmpleadosModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">
                                ${esNuevo ? 'Crear Empleado' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    /**
     * Configura event listeners del modal
     */
    setupModalEventListeners(empleadoId = null) {
        const form = document.getElementById('formEmpleado');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.guardarEmpleado(empleadoId);
        });

        // Validación en tiempo real de cédula
        document.getElementById('cedula').addEventListener('blur', (e) => {
            const cedula = e.target.value;
            if (cedula && !Validators.validarCedula(cedula)) {
                this.mostrarErrorCampo('cedula', 'La cédula es requerida');
            } else {
                this.limpiarErrorCampo('cedula');
            }
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('modalEmpleado').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.cerrarModal();
            }
        });

        // Event listeners para cálculo bidireccional de salarios
        // Usar setTimeout para asegurar que el DOM esté completamente renderizado
        setTimeout(() => {
            const salarioMensualInput = document.getElementById('salarioMensual');
            const salarioHorarioInput = document.getElementById('salarioHorario');
            const jornadaSelect = document.getElementById('jornada');

            if (salarioMensualInput && salarioHorarioInput && jornadaSelect) {
                // Calcular salario horario cuando cambia el salario mensual o la jornada
                const calcularHorarioDesdeMensual = () => {
                    const salarioMensual = parseFloat(salarioMensualInput.value);
                    const jornadaCodigo = jornadaSelect.value;
                    
                    if (salarioMensual && salarioMensual > 0 && jornadaCodigo) {
                        const jornada = CONFIG.getJornadaByCodigo(jornadaCodigo);
                        const salarioHorario = salarioMensual / jornada.horasPorMes;
                        salarioHorarioInput.value = salarioHorario.toFixed(7);
                    }
                };

                // Calcular salario mensual cuando cambia el salario horario
                const calcularMensualDesdeHorario = () => {
                    const salarioHorario = parseFloat(salarioHorarioInput.value);
                    const jornadaCodigo = jornadaSelect.value;
                    
                    if (salarioHorario && salarioHorario > 0 && jornadaCodigo) {
                        const jornada = CONFIG.getJornadaByCodigo(jornadaCodigo);
                        const salarioMensual = salarioHorario * jornada.horasPorMes;
                        salarioMensualInput.value = salarioMensual.toFixed(2);
                    }
                };

                salarioMensualInput.addEventListener('input', calcularHorarioDesdeMensual);
                jornadaSelect.addEventListener('change', () => {
                    // Si hay salario mensual, recalcular horario
                    if (salarioMensualInput.value) {
                        calcularHorarioDesdeMensual();
                    } else if (salarioHorarioInput.value) {
                        // Si hay salario horario, recalcular mensual
                        calcularMensualDesdeHorario();
                    }
                });
                salarioHorarioInput.addEventListener('input', calcularMensualDesdeHorario);
            }
        }, 100);
    },

    /**
     * Guarda empleado (crear o editar)
     */
    async guardarEmpleado(empleadoId) {
        try {
            const salarioHorarioInput = parseFloat(document.getElementById('salarioHorario')?.value) || null;
            const salarioMensualInput = parseFloat(document.getElementById('salarioMensual').value);
            const jornadaCodigo = document.getElementById('jornada').value;

            // Si se ingresó salario horario, calcular mensual (tiene prioridad)
            let salarioMensual = salarioMensualInput;
            if (salarioHorarioInput && salarioHorarioInput > 0) {
                const jornada = CONFIG.getJornadaByCodigo(jornadaCodigo);
                salarioMensual = salarioHorarioInput * jornada.horasPorMes;
            }

            const fechaNacimientoInput = document.getElementById('fechaNacimiento').value;
            // Crear fecha usando componentes locales para evitar problemas de zona horaria
            let fechaNacimiento = null;
            if (fechaNacimientoInput) {
                const [ano, mes, dia] = fechaNacimientoInput.split('-').map(Number);
                // Crear fecha en hora local (mes es 0-indexed en JavaScript)
                const fechaLocal = new Date(ano, mes - 1, dia);
                fechaNacimiento = fechaLocal.getTime();
            }

            const datosEmpleado = {
                nombre: document.getElementById('nombre').value.trim(),
                cedula: document.getElementById('cedula').value.trim(),
                correo: document.getElementById('correo').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                fechaIngreso: new Date(document.getElementById('fechaIngreso').value).getTime(),
                fechaNacimiento: fechaNacimiento,
                salarioMensual: salarioMensual,
                salarioHorario: salarioHorarioInput || null, // Guardar como referencia
                jornada: jornadaCodigo,
                cargo: document.getElementById('cargo').value.trim(),
                departamento: document.getElementById('departamento').value.trim(),
                empresa: document.getElementById('empresa').value,
                banco: document.getElementById('banco').value || '',
                estado: document.getElementById('estado').value,
                hijos: parseInt(document.getElementById('hijos').value) || 0,
                estadoCivil: document.getElementById('estadoCivil').value
            };

            // Validar
            const validacion = Validators.validarEmpleado(datosEmpleado);
            if (!validacion.valido) {
                Object.keys(validacion.errores).forEach(campo => {
                    this.mostrarErrorCampo(campo, validacion.errores[campo]);
                });
                Utils.showToast('Por favor corrija los errores en el formulario', 'error');
                return;
            }

            // Verificar cédula única
            if (!Validators.validarCedulaUnica(datosEmpleado.cedula, empleadoId, this.empleados)) {
                this.mostrarErrorCampo('cedula', 'Esta cédula ya está registrada');
                Utils.showToast('La cédula ya existe', 'error');
                return;
            }

            Utils.showLoading('Guardando empleado...');

            if (empleadoId) {
                // Editar
                await FirebaseHelpers.updateEmpleado(empleadoId, datosEmpleado);
                Utils.showToast('Empleado actualizado exitosamente', 'success');
            } else {
                // Crear
                await FirebaseHelpers.createEmpleado(datosEmpleado);
                Utils.showToast('Empleado creado exitosamente', 'success');
            }

            this.cerrarModal();
            Utils.hideLoading();

        } catch (error) {
            console.error('Error guardando empleado:', error);
            Utils.showToast('Error al guardar empleado: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Muestra error en un campo del formulario
     */
    mostrarErrorCampo(campo, mensaje) {
        const input = document.getElementById(campo);
        const errorDiv = document.getElementById(`error-${campo}`);
        
        if (input) input.classList.add('error');
        if (errorDiv) {
            errorDiv.textContent = mensaje;
            errorDiv.classList.remove('hidden');
        }
    },

    /**
     * Limpia error de un campo
     */
    limpiarErrorCampo(campo) {
        const input = document.getElementById(campo);
        const errorDiv = document.getElementById(`error-${campo}`);
        
        if (input) input.classList.remove('error');
        if (errorDiv) errorDiv.classList.add('hidden');
    },

    /**
     * Cierra el modal
     */
    cerrarModal() {
        document.getElementById('modalContainer').innerHTML = '';
    },

    /**
     * Ver detalle de empleado
     */
    verDetalle(id) {
        const empleado = this.empleados.find(e => e.id === id);
        if (!empleado) return;

        const jornada = CONFIG.getJornadaByCodigo(empleado.jornada);
        const salarioDiario = Calculations.calcularSalarioDiario(empleado.salarioMensual, empleado.jornada);
        const salarioHorario = Calculations.calcularSalarioHorario(empleado.salarioMensual, empleado.jornada, empleado.salarioHorario);
        const vacaciones = Calculations.calcularVacaciones(empleado.fechaIngreso);

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalDetalle">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-800">Detalle del Empleado</h2>
                        <button onclick="EmpleadosModule.cerrarModal()" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="p-6 space-y-6">
                        <!-- Información Personal -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Personal</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div><span class="font-medium">Nombre:</span> ${empleado.nombre}</div>
                                <div><span class="font-medium">Cédula:</span> ${Formatters.formatearCedula(empleado.cedula)}</div>
                                <div><span class="font-medium">Correo:</span> ${empleado.correo}</div>
                                <div><span class="font-medium">Teléfono:</span> ${Formatters.formatearTelefono(empleado.telefono)}</div>
                                <div><span class="font-medium">Ingreso:</span> ${Formatters.formatearFechaLarga(empleado.fechaIngreso)}</div>
                                <div><span class="font-medium">Nacimiento:</span> ${empleado.fechaNacimiento ? Formatters.formatearFechaLarga(empleado.fechaNacimiento) : 'No registrada'}</div>
                                <div><span class="font-medium">Estado:</span> ${Formatters.formatearEstadoBadge(empleado.estado)}</div>
                            </div>
                        </div>

                        <!-- Información Laboral -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Laboral</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div><span class="font-medium">Cargo:</span> ${empleado.cargo}</div>
                                <div><span class="font-medium">Departamento:</span> ${empleado.departamento}</div>
                                <div><span class="font-medium">Empresa:</span> ${empleado.empresa || 'No especificada'}</div>
                                <div><span class="font-medium">Jornada:</span> ${jornada.nombre}</div>
                                <div><span class="font-medium">Horas/Mes:</span> ${jornada.horasPorMes} horas</div>
                            </div>
                        </div>

                        <!-- Información Salarial -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Salarial</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div><span class="font-medium">Salario Mensual:</span> ${Formatters.formatearMoneda(empleado.salarioMensual)}</div>
                                <div><span class="font-medium">Salario por Hora:</span> ${empleado.salarioHorario ? Formatters.formatearMonedaPrecisa(empleado.salarioHorario, 7) : Formatters.formatearMonedaPrecisa(salarioHorario, 7)}</div>
                                <div><span class="font-medium">Salario Diario:</span> ${Formatters.formatearMoneda(salarioDiario)}${jornada.horasPorDiaMin && jornada.horasPorDiaMax ? '' : ` (${jornada.horasPorDia} horas/día)`}</div>
                                <div><span class="font-medium">Banco:</span> ${empleado.banco || '-'}</div>
                                <div class="col-span-2 text-xs text-gray-500 bg-blue-50 p-2 rounded">
                                    <strong>Nota:</strong> El salario mensual ya contempla los días libres de la jornada (${jornada.diasPorSemana} días trabajados por semana, ${7 - jornada.diasPorSemana} día(s) libre(s))${jornada.horasPorDiaMin && jornada.horasPorDiaMax ? `. En jornada acumulativa, aunque se trabajen ${jornada.horasPorDiaMin}-${jornada.horasPorDiaMax} horas/día, el salario diario se muestra como equivalente a 8 horas considerando los días libres.` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Información Fiscal -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Fiscal</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div><span class="font-medium">Hijos:</span> ${empleado.hijos || 0}</div>
                                <div><span class="font-medium">Estado Civil:</span> ${Formatters.capitalizar(empleado.estadoCivil || 'soltero')}</div>
                            </div>
                        </div>

                        <!-- Vacaciones -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Vacaciones</h3>
                            <div class="grid grid-cols-3 gap-4">
                                <div><span class="font-medium">Años de Servicio:</span> ${vacaciones.anosServicio}</div>
                                <div><span class="font-medium">Días Acumulados:</span> ${vacaciones.diasAcumulados}</div>
                                <div><span class="font-medium">Días Disponibles:</span> ${vacaciones.diasDisponibles}</div>
                            </div>
                        </div>

                        <!-- Botones -->
                        <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                            <button onclick="PDFGenerator.generarConstanciaSalarial(${JSON.stringify(empleado).replace(/"/g, '&quot;')})" 
                                class="btn btn-secondary">
                                Generar Constancia
                            </button>
                            <button onclick="EmpleadosModule.cerrarModal()" class="btn btn-outline">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;

        // Cerrar modal al hacer clic fuera
        document.getElementById('modalDetalle').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.cerrarModal();
            }
        });
    },

    /**
     * Elimina (desactiva) empleado
     */
    async eliminar(id) {
        const empleado = this.empleados.find(e => e.id === id);
        if (!empleado) return;

        if (!confirm(`¿Está seguro de desactivar al empleado ${empleado.nombre}?`)) {
            return;
        }

        try {
            Utils.showLoading('Desactivando empleado...');
            await FirebaseHelpers.deleteEmpleado(id);
            Utils.showToast('Empleado desactivado exitosamente', 'success');
            Utils.hideLoading();
        } catch (error) {
            console.error('Error eliminando empleado:', error);
            Utils.showToast('Error al desactivar empleado', 'error');
            Utils.hideLoading();
        }
    },

    /**
     * Exporta empleados a PDF
     */
    exportarPDF() {
        PDFGenerator.exportarEmpleadosPDF(this.empleadosFiltrados);
    }
};

// Export to window
window.EmpleadosModule = EmpleadosModule;

