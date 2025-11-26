/**
 * Reportes Module - Sistema de Planillas Costa Rica
 */

const ReportesModule = {
    render() {
        const html = `
            \u003cdiv class="space-y-6"\u003e
                \u003cdiv\u003e
                    \u003ch1 class="text-2xl font-bold text-gray-800"\u003eReportes\u003c/h1\u003e
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
