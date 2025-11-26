/**
 * Reportes Module - Sistema de Planillas Costa Rica
 */

const ReportesModule = {
    render() {
        const html = `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800">Reportes</h1>
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
                            <h3 class="text-lg font-semibold text-gray-800 mb-2">Asistencias</h3>
                            <p class="text-sm text-gray-600">Reporte de asistencias por empleado</p>
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
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Reportes']);
    },

    reporteNomina() {
        Utils.showToast('Funcionalidad en desarrollo', 'info');
    },

    reporteAsistencias() {
        Utils.showToast('Funcionalidad en desarrollo', 'info');
    },

    async reporteVacaciones() {
        const empleados = await FirebaseHelpers.getEmpleados();
        const empleadosActivos = empleados.filter(e => e.estado === 'activo');

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



