/**
 * Main Application - Sistema de Planillas Costa Rica
 * Punto de entrada principal y router
 */

// Utilidades globales
const Utils = {
    /**
     * Muestra notificación toast
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const id = `toast-${Date.now()}`;

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 mb-2`;
        toast.innerHTML = `
            <span class="text-xl">${icons[type]}</span>
            <span>${message}</span>
            <button onclick="Utils.closeToast('${id}')" class="ml-4 text-white hover:text-gray-200">✕</button>
        `;

        container.appendChild(toast);

        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            Utils.closeToast(id);
        }, 5000);
    },

    /**
     * Cierra un toast
     */
    closeToast(id) {
        const toast = document.getElementById(id);
        if (toast) {
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    },

    /**
     * Muestra loading overlay
     */
    showLoading(message = 'Cargando...') {
        let overlay = document.getElementById('loadingOverlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            overlay.innerHTML = `
                <div class="bg-white rounded-lg p-6 shadow-xl">
                    <div class="spinner mx-auto mb-4"></div>
                    <p class="text-gray-700 font-medium">${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('p').textContent = message;
            overlay.classList.remove('hidden');
        }
    },

    /**
     * Oculta loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },

    /**
     * Actualiza breadcrumb
     */
    updateBreadcrumb(items) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = items.map((item, index) => {
                if (index === items.length - 1) {
                    return `<li class="text-gray-700 font-medium">${item}</li>`;
                }
                return `<li><span class="text-gray-500">${item}</span> <span class="text-gray-400 mx-2">/</span></li>`;
            }).join('');
        }
    },

    /**
     * Formatea fecha para comparaciones
     */
    formatDateForComparison(date) {
        return date.toISOString().split('T')[0];
    },

    /**
     * Valida rango de fechas
     */
    validateDateRange(startDate, endDate) {
        return new Date(startDate) <= new Date(endDate);
    }
};

// Router de la aplicación
const AppRouter = {
    currentView: null,

    /**
     * Navega a una vista
     */
    async navigate(view) {
        // Evitar loops infinitos
        if (this.currentView === view) {
            return;
        }

        this.currentView = view;

        // Mapeo de vistas a permisos requeridos
        const viewPermissions = {
            'dashboard': '*', // Todos pueden ver dashboard excepto operador_asistencia
            'empleados': 'empleados',
            'asistencias': 'asistencias',
            'bonos': 'bonos',
            'planillas': 'planillas',
            'servicios-profesionales': 'servicios_profesionales',
            'control-asistencia': 'control_asistencia',
            'aguinaldos': 'aguinaldos',
            'liquidaciones': 'liquidaciones',
            'feriados': 'feriados',
            'reportes': 'reportes',
            'cumpleanos': 'cumpleanos',
            'usuarios': 'usuarios',
            'autorizacion-email': '*' // Todos pueden acceder
        };

        // Operador de asistencia SOLO puede acceder a control-asistencia y autorizacion-email (no dashboard)
        if (FirebaseHelpers.currentUserRole === 'operador_asistencia') {
            if (view !== 'control-asistencia' && view !== 'autorizacion-email') {
                // Si intenta acceder al dashboard o cualquier otra vista, redirigir a control-asistencia
                this.currentView = null; // Reset para permitir la navegación
                this.navigate('control-asistencia');
                return;
            }
        } else {
            // Para otros usuarios, validar permisos normalmente
            const requiredPermission = viewPermissions[view];
            const hasPermission = requiredPermission === '*' ||
                FirebaseHelpers.tienePermiso(requiredPermission);

            // Si no tiene permiso, redirigir
            if (!hasPermission) {
                console.warn(`Usuario sin permisos para: ${view}`);
                Utils.showToast('No tiene permisos para acceder a este módulo', 'error');
                this.currentView = null; // Reset para permitir la navegación
                this.navigate('dashboard');
                return;
            }
        }

        // Actualizar enlaces activos del sidebar
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.view === view) {
                link.classList.add('active');
            }
        });

        // Renderizar vista correspondiente
        switch (view) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'empleados':
                EmpleadosModule.render();
                break;
            case 'asistencias':
                await AsistenciasModule.render();
                break;
            case 'bonos':
                BonosRebajosModule.render();
                break;
            case 'planillas':
                PlanillasModule.render();
                break;
            case 'aguinaldos':
                AguinaldosModule.render();
                break;
            case 'liquidaciones':
                LiquidacionesModule.render();
                break;
            case 'feriados':
                FeriadosModule.render();
                break;
            case 'reportes':
                ReportesModule.render();
                break;
            case 'usuarios':
                UsuariosModule.init();
                break;
            case 'cumpleanos':
                CumpleanosModule.render();
                break;
            case 'servicios-profesionales':
                await ServiciosProfesionalesModule.render();
                break;
            case 'control-asistencia':
                await ControlAsistenciaModule.render();
                break;
            case 'autorizacion-email':
                await AutorizacionEmailModule.render();
                break;
            default:
                // Si es operador_asistencia, redirigir a control-asistencia en lugar de dashboard
                if (FirebaseHelpers.currentUserRole === 'operador_asistencia') {
                    this.navigate('control-asistencia');
                } else {
                    this.renderDashboard();
                }
        }
    },

    /**
     * Renderiza el dashboard principal
     */
    async renderDashboard() {
        // Operador de asistencia no puede ver el dashboard
        if (FirebaseHelpers.currentUserRole === 'operador_asistencia') {
            console.log('Operador de asistencia no puede acceder al dashboard, redirigiendo a control-asistencia');
            this.navigate('control-asistencia');
            return;
        }

        try {
            console.log('Cargando datos del dashboard...');
            
            // Mostrar loading mientras se cargan los datos
            document.getElementById('mainContent').innerHTML = `
                <div class="flex items-center justify-center min-h-screen">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p class="text-gray-600">Cargando datos...</p>
                    </div>
                </div>
            `;

            const empleados = await FirebaseHelpers.getEmpleados();
            console.log(`Empleados cargados: ${empleados.length}`);
            
            const empleadosActivos = empleados.filter(e => e.estado === 'activo');
            const totalNomina = empleadosActivos.reduce((sum, e) => sum + (e.salarioMensual || 0), 0);

            const planillas = await FirebaseHelpers.once(CONFIG.DB_PATHS.PLANILLAS);
            const planillasArray = planillas ? Object.keys(planillas).length : 0;
            console.log(`Planillas cargadas: ${planillasArray}`);

        const html = `
            <div class="space-y-6">
                <!-- Bienvenida -->
                <div class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-4 lg:p-8 text-white">
                    <h1 class="text-xl lg:text-3xl font-bold mb-2">Bienvenido a Planify</h1>
                    <p class="text-sm lg:text-base text-blue-100">Sistema de gestión de planillas para San Martin de Porres</p>
                </div>

                <!-- Estadísticas Principales -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    <div class="stat-card">
                        <div class="flex items-center justify-between mb-2">
                            <div class="stat-value text-blue-600">${empleadosActivos.length}</div>
                            <svg class="w-8 h-8 lg:w-12 lg:h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                        <div class="stat-label">Empleados Activos</div>
                    </div>

                    <div class="stat-card">
                        <div class="flex items-center justify-between mb-2">
                            <div class="stat-value text-green-600">${Formatters.formatearMoneda(totalNomina)}</div>
                            <svg class="w-8 h-8 lg:w-12 lg:h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div class="stat-label">Nómina Mensual Total</div>
                    </div>

                    <div class="stat-card">
                        <div class="flex items-center justify-between mb-2">
                            <div class="stat-value text-purple-600">${planillasArray}</div>
                            <svg class="w-8 h-8 lg:w-12 lg:h-12 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <div class="stat-label">Planillas Generadas</div>
                    </div>

                    <div class="stat-card">
                        <div class="flex items-center justify-between mb-2">
                            <div class="stat-value text-yellow-600">${empleados.length}</div>
                            <svg class="w-8 h-8 lg:w-12 lg:h-12 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                            </svg>
                        </div>
                        <div class="stat-label">Total Empleados</div>
                    </div>
                </div>

                <!-- Acciones Rápidas -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="AppRouter.navigate('empleados')">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800">Gestionar Empleados</h3>
                                <p class="text-sm text-gray-600">Crear y editar empleados</p>
                            </div>
                        </div>
                    </div>

                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="AppRouter.navigate('asistencias')">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800">Registro de Horas</h3>
                                <p class="text-sm text-gray-600">Registre las horas trabajadas por empleado</p>
                            </div>
                        </div>
                    </div>

                    <div class="card hover:shadow-lg transition cursor-pointer" onclick="AppRouter.navigate('planillas')">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800">Generar Planilla</h3>
                                <p class="text-sm text-gray-600">Crear planilla de nómina</p>
                            </div>
                        </div>
                    </div>
                </div>

        `;

            document.getElementById('mainContent').innerHTML = html;
            Utils.updateBreadcrumb(['Dashboard']);
            console.log('Dashboard renderizado exitosamente');
            
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            
            // Mostrar error al usuario
            document.getElementById('mainContent').innerHTML = `
                <div class="flex items-center justify-center min-h-screen">
                    <div class="max-w-md text-center">
                        <div class="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                            <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <h2 class="text-xl font-bold text-red-800 mb-2">Error al cargar datos</h2>
                            <p class="text-red-600 mb-4">${error.message || 'No se pudieron cargar los datos del dashboard'}</p>
                            <button onclick="location.reload()" class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
                                Reintentar
                            </button>
                        </div>
                        <div class="mt-4 text-sm text-gray-600">
                            <p>Si el problema persiste, verifique:</p>
                            <ul class="list-disc list-inside mt-2 text-left">
                                <li>Conexión a internet</li>
                                <li>Configuración de Firebase</li>
                                <li>Permisos de la base de datos</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            
            Utils.showToast('Error al cargar el dashboard', 'error');
        }
    }
};

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    console.log('Planify - Costa Rica');
    console.log('Inicializando aplicación...');

    // Inicializar autenticación
    Auth.init();

    // Configurar navegación del sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            await AppRouter.navigate(view);
        });
    });

    // Inicializar módulos
    JornadasModule.init();
    EmpleadosModule.init();
    AsistenciasModule.init();
    BonosRebajosModule.init();
    PlanillasModule.init();
    AguinaldosModule.init();
    LiquidacionesModule.init();
    FeriadosModule.init();
    CumpleanosModule.init();
    ServiciosProfesionalesModule.init();
    ControlAsistenciaModule.init();
    AutorizacionEmailModule.init();

    console.log('Aplicación inicializada correctamente');
});

// Función para toggle del sidebar en móvil
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('open');

        if (isOpen) {
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('open');
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }
}

// Cerrar sidebar al hacer clic en un enlace (móvil)
document.addEventListener('DOMContentLoaded', () => {
    // Cerrar sidebar cuando se hace clic en un enlace de navegación en móvil
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) {
                setTimeout(() => {
                    toggleSidebar();
                }, 300);
            }
        });
    });

    // Cerrar sidebar al cambiar tamaño de ventana (si se expande a desktop)
    window.addEventListener('resize', () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (window.innerWidth >= 1024) {
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
});

// Exportar para uso global
window.AppRouter = AppRouter;
window.Utils = Utils;
window.toggleSidebar = toggleSidebar;

