/**
 * Jornadas Module - Sistema de Planillas Costa Rica
 * Gestión de jornadas laborales
 */

const JornadasModule = {
    jornadas: [],

    /**
     * Inicializa el módulo
     */
    init() {
        this.cargarJornadas();
    },

    /**
     * Carga las jornadas desde CONFIG
     */
    cargarJornadas() {
        this.jornadas = Object.values(CONFIG.JORNADAS);
    },

    /**
     * Renderiza la vista de jornadas
     */
    render() {
        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Jornadas Laborales</h1>
                        <p class="text-sm text-gray-600 mt-1">Jornadas disponibles según normativa costarricense</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${this.jornadas.map(jornada => this.renderJornadaCard(jornada)).join('')}
                </div>

                <div class="card">
                    <div class="card-header">Información de Jornadas</div>
                    <div class="prose">
                        <p class="text-gray-700">
                            Las jornadas laborales en Costa Rica están reguladas por el Código de Trabajo.
                            Cada jornada define las horas mensuales, quincenales y diarias que se utilizan
                            para calcular el salario correspondiente.
                        </p>
                        <ul class="text-gray-700 mt-4 space-y-2">
                            <li><strong>Horas por mes:</strong> Total de horas laborales mensuales</li>
                            <li><strong>Horas por quincena:</strong> Horas laborales en período quincenal</li>
                            <li><strong>Horas por día:</strong> Horas laborales diarias</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Jornadas Laborales']);
    },

    /**
     * Renderiza una tarjeta de jornada
     * @param {object} jornada - Datos de la jornada
     * @returns {string} HTML
     */
    renderJornadaCard(jornada) {
        return `
            <div class="card hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">${jornada.nombre}</h3>
                    <span class="badge badge-info">${jornada.codigo}</span>
                </div>
                
                <p class="text-sm text-gray-600 mb-4">${jornada.descripcion}</p>
                
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Horas por mes:</span>
                        <span class="font-semibold text-gray-800">${jornada.horasPorMes} horas</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Horas por quincena:</span>
                        <span class="font-semibold text-gray-800">${jornada.horasPorQuincena} horas</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Horas por día:</span>
                        <span class="font-semibold text-gray-800">${jornada.horasPorDia} horas</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Días por semana:</span>
                        <span class="font-semibold text-gray-800">${jornada.diasPorSemana} días</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Obtiene jornada por código
     * @param {string} codigo - Código de la jornada
     * @returns {object} Jornada
     */
    getJornadaByCodigo(codigo) {
        return this.jornadas.find(j => j.codigo === codigo);
    },

    /**
     * Obtiene todas las jornadas para dropdown
     * @returns {array} Array de jornadas
     */
    getJornadasParaDropdown() {
        return this.jornadas.map(j => ({
            value: j.codigo,
            label: j.nombre,
            description: j.descripcion
        }));
    }
};

// Export to window
window.JornadasModule = JornadasModule;




