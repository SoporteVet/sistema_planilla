/**
 * Cumpleaños Module - Sistema de Planillas Costa Rica
 * Gestión y envío automático de felicitaciones de cumpleaños
 */

const CumpleanosModule = {
    empleados: [],
    cumpleanosHoy: [],
    cumpleanosProximos: [],
    currentView: null,

    /**
     * Inicializa el módulo
     */
    init() {
        this.cargarEmpleados();
        this.verificarCumpleanosDiario();
    },

    /**
     * Carga empleados desde Firebase
     */
    cargarEmpleados() {
        FirebaseHelpers.listenEmpleados((empleados) => {
            this.empleados = empleados;
            this.actualizarCumpleanos();
            // Verificar cumpleaños diarios después de cargar empleados
            this.verificarCumpleanosDiario();
        });
    },

    /**
     * Actualiza la lista de cumpleaños
     */
    actualizarCumpleanos() {
        const hoy = new Date();
        const diaHoy = hoy.getDate();
        const mesHoy = hoy.getMonth() + 1;

        this.cumpleanosHoy = [];
        this.cumpleanosProximos = [];

        this.empleados.forEach(empleado => {
            if (!empleado.fechaNacimiento || empleado.estado !== 'activo') return;

            const fechaNacimiento = new Date(empleado.fechaNacimiento);
            const diaNacimiento = fechaNacimiento.getDate();
            const mesNacimiento = fechaNacimiento.getMonth() + 1;

            if (diaNacimiento === diaHoy && mesNacimiento === mesHoy) {
                this.cumpleanosHoy.push(empleado);
            } else if (mesNacimiento === mesHoy && diaNacimiento > diaHoy) {
                this.cumpleanosProximos.push(empleado);
            } else if (mesNacimiento > mesHoy) {
                this.cumpleanosProximos.push(empleado);
            }
        });

        // Ordenar próximos cumpleaños por fecha
        this.cumpleanosProximos.sort((a, b) => {
            const fechaA = new Date(a.fechaNacimiento);
            const fechaB = new Date(b.fechaNacimiento);
            const mesA = fechaA.getMonth() + 1;
            const mesB = fechaB.getMonth() + 1;
            const diaA = fechaA.getDate();
            const diaB = fechaB.getDate();

            if (mesA !== mesB) return mesA - mesB;
            return diaA - diaB;
        });

        if (this.currentView === 'cumpleanos') {
            this.render();
        }
    },

    /**
     * Renderiza la vista de cumpleaños
     */
    render() {
        this.currentView = 'cumpleanos';
        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">🎉 Cumpleaños</h1>
                        <p class="text-sm text-gray-600 mt-1">Gestión de felicitaciones de cumpleaños</p>
                    </div>
                    <button onclick="CumpleanosModule.verificarCumpleanos()" class="btn btn-primary">
                        🔍 Verificar Cumpleaños de Hoy
                    </button>
                </div>

                <!-- Cumpleaños de Hoy -->
                <div class="card">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">
                        🎂 Cumpleaños de Hoy (${this.cumpleanosHoy.length})
                    </h3>
                    ${this.cumpleanosHoy.length > 0 ? this.renderCumpleanosLista(this.cumpleanosHoy, true) : `
                        <div class="text-center py-8 text-gray-500">
                            <p>No hay cumpleaños hoy</p>
                        </div>
                    `}
                </div>

                <!-- Próximos Cumpleaños -->
                <div class="card">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">
                        📅 Próximos Cumpleaños
                    </h3>
                    ${this.cumpleanosProximos.length > 0 ? this.renderCumpleanosLista(this.cumpleanosProximos.slice(0, 10), false) : `
                        <div class="text-center py-8 text-gray-500">
                            <p>No hay próximos cumpleaños registrados</p>
                        </div>
                    `}
                </div>

                <!-- Estadísticas -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="stat-card">
                        <div class="stat-value">${this.cumpleanosHoy.length}</div>
                        <div class="stat-label">Cumpleaños Hoy</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.cumpleanosProximos.length}</div>
                        <div class="stat-label">Próximos Cumpleaños</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.empleados.filter(e => e.fechaNacimiento && e.estado === 'activo').length}</div>
                        <div class="stat-label">Con Fecha Registrada</div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Cumpleaños']);
    },

    /**
     * Renderiza la lista de cumpleaños
     */
    renderCumpleanosLista(empleados, esHoy) {
        return `
            <div class="space-y-3">
                ${empleados.map(emp => {
                    const fechaNacimiento = new Date(emp.fechaNacimiento);
                    const edad = new Date().getFullYear() - fechaNacimiento.getFullYear();
                    const fechaFormateada = Formatters.formatearFecha(emp.fechaNacimiento);
                    
                    return `
                        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center space-x-4">
                                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span class="text-2xl">🎂</span>
                                    </div>
                                    <div>
                                        <h4 class="font-semibold text-gray-800">${emp.nombre}</h4>
                                        <p class="text-sm text-gray-600">${emp.cargo} - ${emp.departamento}</p>
                                        <p class="text-xs text-gray-500">${fechaFormateada} (${edad} años)</p>
                                    </div>
                                </div>
                                <div class="flex space-x-2">
                                    ${esHoy ? `
                                        <button onclick="CumpleanosModule.enviarFelicitacion('${emp.id}')" 
                                            class="btn btn-primary btn-sm" 
                                            ${!emp.correo ? 'disabled title="No tiene correo registrado"' : ''}>
                                            ✉️ Enviar Email
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    /**
     * Verifica y envía felicitaciones de cumpleaños de hoy
     */
    async verificarCumpleanos() {
        try {
            Utils.showLoading('Verificando cumpleaños de hoy...');
            
            const hoy = new Date();
            const diaHoy = hoy.getDate();
            const mesHoy = hoy.getMonth() + 1;

            const cumpleanosHoy = this.empleados.filter(emp => {
                if (!emp.fechaNacimiento || emp.estado !== 'activo' || !emp.correo) return false;
                
                const fechaNacimiento = new Date(emp.fechaNacimiento);
                return fechaNacimiento.getDate() === diaHoy && 
                       (fechaNacimiento.getMonth() + 1) === mesHoy;
            });

            if (cumpleanosHoy.length === 0) {
                Utils.hideLoading();
                Utils.showToast('No hay cumpleaños hoy', 'info');
                return;
            }

            let enviados = 0;
            let errores = 0;

            for (const empleado of cumpleanosHoy) {
                try {
                    await this.enviarFelicitacion(empleado.id);
                    enviados++;
                } catch (error) {
                    console.error(`Error enviando felicitación a ${empleado.nombre}:`, error);
                    errores++;
                }
            }

            Utils.hideLoading();
            
            if (enviados > 0) {
                Utils.showToast(`${enviados} felicitación(es) enviada(s) exitosamente`, 'success');
            }
            if (errores > 0) {
                Utils.showToast(`${errores} error(es) al enviar felicitaciones`, 'warning');
            }

            this.actualizarCumpleanos();

        } catch (error) {
            console.error('Error verificando cumpleaños:', error);
            Utils.hideLoading();
            Utils.showToast('Error al verificar cumpleaños: ' + error.message, 'error');
        }
    },

    /**
     * Envía felicitación de cumpleaños a un empleado
     */
    async enviarFelicitacion(empleadoId) {
        try {
            const empleado = this.empleados.find(e => e.id === empleadoId);
            if (!empleado) {
                Utils.showToast('Empleado no encontrado', 'error');
                return;
            }

            if (!empleado.correo || empleado.correo.trim() === '') {
                Utils.showToast('El empleado no tiene un correo electrónico registrado', 'error');
                return;
            }

            if (!empleado.fechaNacimiento) {
                Utils.showToast('El empleado no tiene fecha de nacimiento registrada', 'error');
                return;
            }

            Utils.showLoading(`Enviando felicitación a ${empleado.nombre}...`);

            // Verificar EmailJS
            if (typeof EmailServiceSimple === 'undefined') {
                Utils.showToast('EmailJS no está disponible', 'error');
                Utils.hideLoading();
                return;
            }

            const emailService = new EmailServiceSimple();
            
            if (!emailService.verificarConfiguracion()) {
                Utils.showToast('EmailJS no está configurado correctamente', 'error');
                Utils.hideLoading();
                return;
            }

            // Enviar email de cumpleaños
            const resultado = await emailService.enviarCumpleanos(empleado);

            Utils.hideLoading();

            if (resultado.success) {
                Utils.showToast(`Felicitación enviada exitosamente a ${empleado.correo}`, 'success');
            } else {
                Utils.showToast(`Error enviando felicitación: ${resultado.error}`, 'error');
            }

        } catch (error) {
            console.error('Error enviando felicitación:', error);
            Utils.hideLoading();
            Utils.showToast('Error al enviar felicitación: ' + error.message, 'error');
        }
    },

    /**
     * Verifica cumpleaños diariamente (se ejecuta automáticamente)
     */
    async verificarCumpleanosDiario() {
        // Solo verificar si hay empleados cargados
        if (!this.empleados || this.empleados.length === 0) {
            return;
        }

        // Verificar si ya se ejecutó hoy
        const ultimaVerificacion = localStorage.getItem('ultimaVerificacionCumpleanos');
        const hoy = new Date().toDateString();

        if (ultimaVerificacion === hoy) {
            console.log('Ya se verificaron los cumpleaños hoy');
            return;
        }

        // Verificar cumpleaños de hoy
        const cumpleanosHoy = this.empleados.filter(emp => {
            if (!emp.fechaNacimiento || emp.estado !== 'activo' || !emp.correo) return false;
            
            const fechaNacimiento = new Date(emp.fechaNacimiento);
            const hoy = new Date();
            return fechaNacimiento.getDate() === hoy.getDate() && 
                   (fechaNacimiento.getMonth() + 1) === (hoy.getMonth() + 1);
        });

        if (cumpleanosHoy.length > 0) {
            console.log(`Se encontraron ${cumpleanosHoy.length} cumpleaños hoy`);
            // No enviar automáticamente, solo registrar
            // El usuario puede enviar manualmente desde la interfaz
        }

        // Guardar fecha de última verificación
        localStorage.setItem('ultimaVerificacionCumpleanos', hoy);
    }
};

// Export to window
window.CumpleanosModule = CumpleanosModule;

