// ============================================
// SISTEMA DE PLANILLAS COSTA RICA
// ============================================

// Clase principal del sistema
class SistemaPlanillas {
    constructor() {
        this.empleados = [];
        this.asistencias = [];
        this.bonos = [];
        this.feriados = [];
        this.vacaciones = [];
        this.historialPlanillas = [];
        this.ultimaPlanilla = null;
        this.config = {
            ccss: 10.67,
            incapacidadCCSS: 50,
            incapacidadINS: 0
        };
        // Configuración de jornadas laborales según normativa de Costa Rica
        this.jornadas = {
            diurna: {
                horasPorDia: 8,
                horasTrabajadas: 8, // Horas físicas trabajadas
                horasPagadas: 8,    // Horas que se pagan
                horasMensuales: 240,
                horasQuincenales: 120,
                diasPorSemana: 6
            },
            mixta: {
                horasPorDia: 7,
                horasTrabajadas: 7,
                horasPagadas: 7,
                horasMensuales: 210,
                horasQuincenales: 105,
                diasPorSemana: 6
            },
            nocturna: {
                horasPorDia: 6,
                horasTrabajadas: 6,
                horasPagadas: 8,  // Se pagan 8 horas aunque se trabajen 6
                horasMensuales: 240,  // 8h × 30 días = 240
                horasQuincenales: 120,  // 8h × 15 días = 120
                diasPorSemana: 6
            },
            diurna_acumulativa: {
                horasPorDia: 10,        // Horas físicas trabajadas
                horasTrabajadas: 10,     // Trabaja 10 horas
                horasPagadas: 8,         // Pero se le pagan solo 8 horas
                horasMensuales: 240,     // 8h × 30 días = 240
                horasQuincenales: 120,   // 8h × 15 días = 120
                diasPorSemana: 5,        // Trabaja 5 días a la semana
                diasLibres: 2            // 2 días libres (beneficio por acumular horas)
            },
            mixta_acumulativa: {
                horasPorDia: 8,          // Horas físicas trabajadas (entre 8-9)
                horasTrabajadas: 9,      // Puede trabajar hasta 9 horas
                horasPagadas: 8,         // Pero se le pagan solo 8 horas
                horasMensuales: 240,     // 8h × 30 días = 240
                horasQuincenales: 120,   // 8h × 15 días = 120
                diasPorSemana: 5,        // Trabaja 5 días a la semana
                diasLibres: 2            // 2 días libres
            }
        };
        this.eventListenersInitialized = false; // Flag para evitar duplicados
        this.init();
    }

    async init() {
        await this.initializeFirebase();
        await this.cargarDatos();
        this.initEventListeners();
        this.actualizarFecha();
        this.cargarFeriadosDefecto();
        this.cargarConfiguracionEmailJS();
        this.inicializarDescargaPDF();
    }

    // ============================================
    // GESTIÓN DE DATOS (Firebase + localStorage fallback)
    // ============================================

    async initializeFirebase() {
        try {
            // Importar dinámicamente el módulo de Firebase helpers
            const firebaseHelpers = await import('./firebase-helpers.js');
            this.firebaseHelpers = firebaseHelpers;
            await firebaseHelpers.initializeFirebaseStorage();
        } catch (error) {
            console.warn('⚠️ Firebase no disponible, usando localStorage', error);
            this.firebaseHelpers = null;
        }
    }

    async cargarDatos() {
        if (this.firebaseHelpers) {
            // Cargar desde Firebase
            this.empleados = await this.firebaseHelpers.getData('empleados') || [];
            this.asistencias = await this.firebaseHelpers.getData('asistencias') || [];
            this.bonos = await this.firebaseHelpers.getData('bonos') || [];
            this.feriados = await this.firebaseHelpers.getData('feriados') || [];
            this.vacaciones = await this.firebaseHelpers.getData('vacaciones') || [];
            const configData = await this.firebaseHelpers.getData('config');
            if (configData && typeof configData === 'object' && !Array.isArray(configData)) {
                this.config = { ...this.config, ...configData };
            }
            this.historialPlanillas = await this.firebaseHelpers.getData('historialPlanillas') || [];
        } else {
            // Fallback a localStorage
            const empleadosGuardados = localStorage.getItem('empleados');
            const asistenciasGuardadas = localStorage.getItem('asistencias');
            const bonosGuardados = localStorage.getItem('bonos');
            const feriadosGuardados = localStorage.getItem('feriados');
            const vacacionesGuardadas = localStorage.getItem('vacaciones');
            const configGuardada = localStorage.getItem('config');
            const historialGuardado = localStorage.getItem('historialPlanillas');

            if (empleadosGuardados) {
                this.empleados = JSON.parse(empleadosGuardados);
            }
            if (asistenciasGuardadas) {
                this.asistencias = JSON.parse(asistenciasGuardadas);
            }
            if (bonosGuardados) {
                this.bonos = JSON.parse(bonosGuardados);
            }
            if (feriadosGuardados) {
                this.feriados = JSON.parse(feriadosGuardados);
            }
            if (vacacionesGuardadas) {
                this.vacaciones = JSON.parse(vacacionesGuardadas);
            }
            if (configGuardada) {
                this.config = JSON.parse(configGuardada);
            }
            if (historialGuardado) {
                this.historialPlanillas = JSON.parse(historialGuardado);
            }
        }
    }

    /**
     * Configura EmailJS con las credenciales proporcionadas
     */
    configurarEmailJS() {
        const userId = document.getElementById('emailjsUserId').value.trim();
        const serviceId = document.getElementById('emailjsServiceId').value.trim();
        const templateId = document.getElementById('emailjsTemplateId').value.trim();

        if (!userId || !serviceId || !templateId) {
            notify.error('Por favor, complete todos los campos de configuración de EmailJS');
            return;
        }

        // Actualizar la configuración
        if (typeof window.EMAILJS_CONFIG !== 'undefined') {
            window.EMAILJS_CONFIG.USER_ID = userId;
            window.EMAILJS_CONFIG.SERVICE_ID = serviceId;
            window.EMAILJS_CONFIG.TEMPLATE_ID = templateId;
        }

        // Guardar en localStorage
        const emailjsConfig = {
            userId: userId,
            serviceId: serviceId,
            templateId: templateId
        };
        localStorage.setItem('emailjsConfig', JSON.stringify(emailjsConfig));

        // Actualizar el estado visual
        this.actualizarEstadoEmailJS(true);
        notify.success('Configuración de EmailJS guardada exitosamente');
    }

    /**
     * Prueba el envío de EmailJS con un email de prueba
     */
    async probarEmailJS() {
        if (!this.verificarConfiguracionEmailJS()) {
            return;
        }

        try {
            notify.info('Enviando email de prueba...');

            const templateParams = {
                to_email: 'prueba@ejemplo.com',
                to_name: 'Usuario de Prueba',
                from_name: 'Sistema de Planillas',
                subject: 'Prueba de EmailJS - Comprobante de Pago',
                empleado_nombre: 'Usuario de Prueba',
                empleado_cedula: '123456789',
                empleado_puesto: 'Puesto de Prueba',
                periodo: 'Enero 2024',
                fecha_inicio: '2024-01-01',
                fecha_fin: '2024-01-31',
                salario_base: '₡ 500,000.00',
                salario_bruto: '₡ 500,000.00',
                salario_neto: '₡ 450,000.00',
                ccss: '₡ 50,000.00',
                horas_extras: 0,
                monto_horas_extras: '₡ 0.00',
                bonificaciones: '₡ 0.00',
                deducciones: '₡ 0.00',
                download_link: 'https://ejemplo.com/comprobante.pdf',
                empresa: 'Sistema de Planillas',
                fecha_envio: new Date().toLocaleDateString('es-CR')
            };

            const response = await emailjs.send(
                window.EMAILJS_CONFIG.SERVICE_ID,
                window.EMAILJS_CONFIG.TEMPLATE_ID,
                templateParams
            );

            if (response.status === 200) {
                notify.success('Email de prueba enviado exitosamente');
            } else {
                throw new Error(`Error del servidor: ${response.status}`);
            }

        } catch (error) {
            console.error('Error enviando email de prueba:', error);
            notify.error(`Error enviando email de prueba: ${error.message}`);
        }
    }

    /**
     * Verifica si EmailJS está configurado correctamente
     */
    verificarConfiguracionEmailJS() {
        if (typeof window.isEmailJSConfigured === 'undefined' || !window.isEmailJSConfigured()) {
            notify.error('EmailJS no está configurado. Configure las credenciales primero.');
            return false;
        }

        if (typeof emailjs === 'undefined') {
            notify.error('EmailJS no está cargado. Verifique que el script esté incluido correctamente.');
            return false;
        }

        return true;
    }

    /**
     * Actualiza el estado visual de la configuración de EmailJS
     */
    actualizarEstadoEmailJS(configurado) {
        const statusDiv = document.getElementById('emailjsStatus');
        if (statusDiv) {
            if (configurado) {
                statusDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle"></i> EmailJS configurado correctamente</div>';
                statusDiv.style.display = 'block';
            } else {
                statusDiv.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle"></i> EmailJS no configurado</div>';
                statusDiv.style.display = 'block';
            }
        }
    }

    /**
     * Carga la configuración de EmailJS desde localStorage
     */
    cargarConfiguracionEmailJS() {
        const emailjsConfig = localStorage.getItem('emailjsConfig');
        if (emailjsConfig) {
            try {
                const config = JSON.parse(emailjsConfig);
                document.getElementById('emailjsUserId').value = config.userId || '';
                document.getElementById('emailjsServiceId').value = config.serviceId || '';
                document.getElementById('emailjsTemplateId').value = config.templateId || '';

                // Actualizar la configuración global
                if (typeof window.EMAILJS_CONFIG !== 'undefined') {
                    window.EMAILJS_CONFIG.USER_ID = config.userId;
                    window.EMAILJS_CONFIG.SERVICE_ID = config.serviceId;
                    window.EMAILJS_CONFIG.TEMPLATE_ID = config.templateId;
                }

                this.actualizarEstadoEmailJS(true);
            } catch (error) {
                console.error('Error cargando configuración de EmailJS:', error);
            }
        } else {
            this.actualizarEstadoEmailJS(false);
        }
    }

    /**
     * Inicializa el sistema de descarga de PDFs desde enlaces
     */
    inicializarDescargaPDF() {
        // Verificar si hay un parámetro de descarga en la URL
        const hash = window.location.hash;
        if (hash && hash.includes('download=')) {
            const fileId = hash.split('download=')[1];
            this.descargarPDFDesdeEnlace(fileId);
        }

        // Escuchar cambios en el hash para descargas futuras
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash;
            if (newHash && newHash.includes('download=')) {
                const fileId = newHash.split('download=')[1];
                this.descargarPDFDesdeEnlace(fileId);
            }
        });
    }

    /**
     * Descarga un PDF desde un enlace guardado en localStorage
     */
    descargarPDFDesdeEnlace(fileId) {
        try {
            const pdfData = localStorage.getItem(`pdf_${fileId}`);
            if (!pdfData) {
                notify.error('El enlace de descarga ha expirado o no es válido');
                return;
            }

            const data = JSON.parse(pdfData);
            
            // Verificar si el archivo ha expirado
            if (Date.now() > data.expires) {
                localStorage.removeItem(`pdf_${fileId}`);
                notify.error('El enlace de descarga ha expirado');
                return;
            }

            // Convertir base64 a blob y descargar
            const byteCharacters = atob(data.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            // Crear enlace de descarga
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = data.fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Limpiar el hash de la URL
            window.history.replaceState({}, document.title, window.location.pathname);

            notify.success(`Descargando ${data.fileName}...`);

        } catch (error) {
            console.error('Error descargando PDF desde enlace:', error);
            notify.error('Error al descargar el archivo');
        }
    }

    async guardarDatos() {
        if (this.firebaseHelpers) {
            // Guardar en Firebase y localStorage
            await Promise.all([
                this.firebaseHelpers.saveData('empleados', this.empleados),
                this.firebaseHelpers.saveData('asistencias', this.asistencias),
                this.firebaseHelpers.saveData('bonos', this.bonos),
                this.firebaseHelpers.saveData('feriados', this.feriados),
                this.firebaseHelpers.saveData('vacaciones', this.vacaciones),
                this.firebaseHelpers.saveData('config', this.config),
                this.firebaseHelpers.saveData('historialPlanillas', this.historialPlanillas)
            ]);
        } else {
            // Fallback a localStorage
            localStorage.setItem('empleados', JSON.stringify(this.empleados));
            localStorage.setItem('asistencias', JSON.stringify(this.asistencias));
            localStorage.setItem('bonos', JSON.stringify(this.bonos));
            localStorage.setItem('feriados', JSON.stringify(this.feriados));
            localStorage.setItem('vacaciones', JSON.stringify(this.vacaciones));
            localStorage.setItem('config', JSON.stringify(this.config));
            localStorage.setItem('historialPlanillas', JSON.stringify(this.historialPlanillas));
        }
    }

    // ============================================
    // GESTIÓN DE EMPLEADOS
    // ============================================

    agregarEmpleado(empleado) {
        empleado.id = Date.now().toString();
        this.empleados.push(empleado);
        this.guardarDatos();
        this.renderEmpleados();
        this.actualizarSelectsEmpleados();
        
        // Mostrar notificación de éxito
        if (window.showNotification) {
            window.showNotification('Empleado creado exitosamente', 'success');
        }
    }

    editarEmpleado(id, datosActualizados) {
        const index = this.empleados.findIndex(e => e.id === id);
        if (index !== -1) {
            this.empleados[index] = { ...this.empleados[index], ...datosActualizados };
            this.guardarDatos();
            this.renderEmpleados();
        }
    }

    async eliminarEmpleado(id) {
        const empleado = this.empleados.find(e => e.id === id);
        const nombreEmpleado = empleado ? empleado.nombre : 'este empleado';
        
        const confirmado = await confirmDialog.confirmDelete(`el empleado ${nombreEmpleado}`);
        
        if (confirmado) {
            try {
                loadingOverlay.show();
                
                // Simular delay para mejor UX
                await new Promise(resolve => setTimeout(resolve, 500));
                
            this.empleados = this.empleados.filter(e => e.id !== id);
            this.asistencias = this.asistencias.filter(a => a.empleadoId !== id);
            this.bonos = this.bonos.filter(b => b.empleadoId !== id);
            this.guardarDatos();
            this.renderEmpleados();
            this.actualizarSelectsEmpleados();
                
                loadingOverlay.hide();
                notify.success(`Empleado ${nombreEmpleado} eliminado correctamente`);
            } catch (error) {
                loadingOverlay.hide();
                notify.error('Error al eliminar el empleado');
            }
        }
    }

    buscarEmpleado(termino) {
        return this.empleados.filter(e => 
            e.nombre.toLowerCase().includes(termino.toLowerCase()) ||
            e.cedula.includes(termino)
        );
    }

    aplicarFiltrosEmpleados() {
        const textoBusqueda = document.getElementById('searchEmpleado').value.toLowerCase();
        const empresaFiltro = document.getElementById('filtroEmpresa').value;
        
        let empleadosFiltrados = this.empleados;
        
        // Filtro por texto (nombre o cédula)
        if (textoBusqueda) {
            empleadosFiltrados = empleadosFiltrados.filter(emp => 
                emp.nombre.toLowerCase().includes(textoBusqueda) ||
                emp.cedula.includes(textoBusqueda)
            );
        }
        
        // Filtro por empresa (solo si se selecciona una empresa específica)
        if (empresaFiltro && empresaFiltro !== '') {
            empleadosFiltrados = empleadosFiltrados.filter(emp => 
                emp.empresa === empresaFiltro
            );
        }
        
        this.renderEmpleados(empleadosFiltrados);
    }

    aplicarFiltrosAsistencias() {
        const empleadoId = document.getElementById('filtroEmpleadoAsistencia').value;
        const fechaInicio = document.getElementById('filtroFechaInicio').value;
        const fechaFin = document.getElementById('filtroFechaFin').value;
        const resultados = this.filtrarAsistencias(empleadoId, fechaInicio, fechaFin);
        this.renderAsistencias(resultados);
    }

    aplicarFiltrosBonos() {
        const empleadoId = document.getElementById('filtroEmpleadoBono').value;
        const tipo = document.getElementById('filtroTipoBono').value;
        const resultados = this.filtrarBonos(empleadoId, tipo);
        this.renderBonos(resultados);
    }

    renderEmpleados(empleados = this.empleados) {
        const tbody = document.getElementById('tablaEmpleados');
        
        if (!tbody) {
            console.warn('No se encontró el elemento tablaEmpleados');
            return;
        }
        
        if (!empleados || empleados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No hay empleados registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = empleados.map(emp => `
            <tr>
                <td>${emp.cedula}</td>
                <td>${emp.nombre}</td>
                <td>${emp.empresa || 'No asignada'}</td>
                <td>${emp.puesto}</td>
                <td><span class="badge badge-info">${this.formatJornada(emp.jornada)}</span></td>
                <td>₡${this.formatearMoneda(emp.salarioHora)}</td>
                <td>${this.formatearFecha(emp.fechaIngreso)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarEmpleado('${emp.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="sistema.eliminarEmpleado('${emp.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ============================================
    // GESTIÓN DE ASISTENCIAS
    // ============================================

    agregarAsistencia(asistencia) {
        asistencia.id = Date.now().toString();
        this.asistencias.push(asistencia);
        this.guardarDatos();
        this.renderAsistencias();
    }

    editarAsistencia(id, datosActualizados) {
        const index = this.asistencias.findIndex(a => a.id === id);
        if (index !== -1) {
            this.asistencias[index] = { ...this.asistencias[index], ...datosActualizados };
            this.guardarDatos();
            this.renderAsistencias();
        }
    }

    async eliminarAsistencia(id) {
        const asistencia = this.asistencias.find(a => a.id === id);
        if (!asistencia) {
            console.error('Asistencia no encontrada para eliminar:', id);
            return;
        }

        const empleado = this.empleados.find(e => e.id === asistencia.empleadoId);
        const empleadoNombre = empleado ? empleado.nombre : 'Empleado desconocido';
        
        // Usar confirmación personalizada
        const confirmado = await confirmDialog.confirmAction(
            `¿Está seguro de que desea eliminar la asistencia de ${empleadoNombre} del ${asistencia.fecha}?`,
            'Eliminar Asistencia'
        );
        
        if (confirmado) {
            try {
                loadingOverlay.show();
                await new Promise(resolve => setTimeout(resolve, 300));
                
            this.asistencias = this.asistencias.filter(a => a.id !== id);
            this.guardarDatos();
            this.renderAsistencias();
                
                loadingOverlay.hide();
                notify.success('Asistencia eliminada correctamente');
            } catch (error) {
                loadingOverlay.hide();
                notify.error('Error al eliminar la asistencia');
            }
        }
    }

    filtrarAsistencias(empleadoId, fechaInicio, fechaFin) {
        return this.asistencias.filter(a => {
            let cumple = true;
            if (empleadoId) cumple = cumple && a.empleadoId === empleadoId;
            if (fechaInicio) cumple = cumple && a.fecha >= fechaInicio;
            if (fechaFin) cumple = cumple && a.fecha <= fechaFin;
            return cumple;
        });
    }

    renderAsistencias(asistencias = this.asistencias) {
        const tbody = document.getElementById('tablaAsistencias');
        
        if (asistencias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>No hay registros de asistencia</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = asistencias.map(asist => {
            const empleado = this.empleados.find(e => e.id === asist.empleadoId);
            return `
                <tr>
                    <td>${this.formatearFecha(asist.fecha)}</td>
                    <td>${empleado ? empleado.nombre : 'N/A'}</td>
                    <td><span class="badge ${this.getBadgeClaseTipo(asist.tipo)}">${this.formatTipo(asist.tipo)}</span></td>
                    <td>${asist.horas || 0} hrs ${asist.horasExtra ? `+ ${asist.horasExtra} extra` : ''}</td>
                    <td>${asist.detalle || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarAsistencia('${asist.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="sistema.eliminarAsistencia('${asist.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================
    // GESTIÓN DE BONOS Y REBAJOS
    // ============================================

    agregarBono(bono) {
        bono.id = Date.now().toString();
        this.bonos.push(bono);
        this.guardarDatos();
        this.renderBonos();
    }

    editarBono(id, datosActualizados) {
        const index = this.bonos.findIndex(b => b.id === id);
        if (index !== -1) {
            this.bonos[index] = { ...this.bonos[index], ...datosActualizados };
            this.guardarDatos();
            this.renderBonos();
        }
    }

    async eliminarBono(id) {
        const confirmado = await confirmDialog.confirmAction(
            '¿Está seguro de eliminar este bono/rebajo?',
            'Eliminar Bono/Rebajo'
        );
        
        if (confirmado) {
            try {
                loadingOverlay.show();
                await new Promise(resolve => setTimeout(resolve, 300));
                
            this.bonos = this.bonos.filter(b => b.id !== id);
            this.guardarDatos();
            this.renderBonos();
                
                loadingOverlay.hide();
                notify.success('Bono/Rebajo eliminado correctamente');
            } catch (error) {
                loadingOverlay.hide();
                notify.error('Error al eliminar el bono/rebajo');
            }
        }
    }

    filtrarBonos(empleadoId, tipo) {
        return this.bonos.filter(b => {
            let cumple = true;
            if (empleadoId) cumple = cumple && b.empleadoId === empleadoId;
            if (tipo) cumple = cumple && b.tipo === tipo;
            return cumple;
        });
    }

    renderBonos(bonos = this.bonos) {
        const tbody = document.getElementById('tablaBonos');
        
        if (bonos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-gift"></i>
                        <p>No hay bonos o rebajos registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = bonos.map(bono => {
            const empleado = this.empleados.find(e => e.id === bono.empleadoId);
            return `
                <tr>
                    <td>${empleado ? empleado.nombre : 'N/A'}</td>
                    <td><span class="badge ${bono.tipo === 'bono' ? 'badge-success' : 'badge-danger'}">${bono.tipo === 'bono' ? 'Bono' : 'Rebajo'}</span></td>
                    <td>${bono.concepto}</td>
                    <td>₡${this.formatearMoneda(bono.monto)}</td>
                    <td>${this.formatearFecha(bono.fecha)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarBono('${bono.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="sistema.eliminarBono('${bono.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================
    // CÁLCULO DE PLANILLAS
    // ============================================

    calcularPlanilla(periodo, fechaInicio, fechaFin, empresaFiltro = '') {
        const planilla = [];

        let empleadosAFiltrar = this.empleados;
        
        // Aplicar filtro por empresa si se especifica
        if (empresaFiltro) {
            empleadosAFiltrar = this.empleados.filter(emp => emp.empresa === empresaFiltro);
        }

        empleadosAFiltrar.forEach(empleado => {
            const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);
            planilla.push({
                empleado: empleado,
                ...calculos
            });
        });

        return planilla;
    }

    calcularSalarioEmpleado(empleado, fechaInicio, fechaFin) {
        // Determinar si es la segunda quincena (planilla del 30)
        const fechaFinObj = new Date(fechaFin + 'T00:00:00');
        const esSegundaQuincena = fechaFinObj.getDate() >= 15;
        
        // Obtener asistencias del empleado en el período
        // Solo incluir días que estén registrados en asistencias
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleado.id &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin
        );

        // Calcular salario base según jornada
        let salarioBase = 0;
        let horasNormales = 0;
        let horasExtra = 0;
        let montoHorasExtra = 0;

        // Si no hay asistencias registradas, NO pagar nada
        if (asistencias.length === 0) {
            return {
                horasNormales: '0.00',
                horasExtra: '0.00',
                salarioBase: '0.00',
                montoHorasExtra: '0.00',
                bonos: '0.00',
                rebajos: '0.00',
                salarioBruto: '0.00',
                ccss: '0.00',
                impuestoRenta: '0.00',
                salarioNeto: '0.00'
            };
        }

        asistencias.forEach(asist => {
            if (asist.tipo === 'presente') {
                // Si no hay horas registradas o son 0, asumir jornada completa
                let horas = parseFloat(asist.horas || 0);
                if (horas === 0) {
                    horas = this.getHorasJornada(empleado.jornada);
                }
                
                const extra = parseFloat(asist.horasExtra || 0);

                // Calcular según jornada
                const horasPorDia = this.getHorasJornada(empleado.jornada);
                
                if (empleado.jornada === 'diurna') {
                    // Jornada diurna: 8 horas por día
                    // Las horas trabajadas se pagan normalmente
                    // Las horas extra SOLO se toman del campo "Horas Extra"
                    horasNormales += horas;
                } else if (empleado.jornada === 'nocturna') {
                    // Jornada nocturna: 6 horas trabajadas = 8 horas pagadas
                    // Se trabajan 6 horas pero se pagan 8 horas (equivalencia diurna)
                    // Las horas extra SOLO se toman del campo "Horas Extra"
                    if (horas >= 6) {
                        // Si trabajó 6 horas o más, pagar 8 horas completas
                        horasNormales += 8;
                    } else {
                        // Si trabajó menos de 6 horas, pagar proporcionalmente
                        horasNormales += (horas / 6) * 8;
                    }
                } else if (empleado.jornada === 'mixta') {
                    // Jornada mixta: 7 horas por día
                    // Las horas trabajadas se pagan normalmente
                    // Las horas extra SOLO se toman del campo "Horas Extra"
                    horasNormales += horas;
                } else if (empleado.jornada === 'diurna_acumulativa') {
                    // Jornada diurna acumulativa:
                    // Se trabajan 10 horas físicas pero se PAGAN 8 horas
                    // Por cada hora menos trabajada, se resta 1 hora de pago
                    // Ej: 10h trabajadas = 8h pagadas, 9h trabajadas = 7h pagadas, 8h = 6h pagadas
                    // Los días libres también se pagan 8 horas
                    
                    const horasOriginales = parseFloat(asist.horas || 0);
                    
                    // Si el día fue registrado con 0 horas (día libre), pagar jornada completa
                    if (horasOriginales === 0) {
                        // Día libre en jornada acumulativa: se paga la jornada completa
                        horasNormales += horasPorDia; // 8 horas
                    } else {
                        // Día trabajado: calcular según las horas trabajadas
                        const fecha = asist.fecha;
                        const diaSemana = this.getDiaSemana(fecha);
                        const horasVisualesNormales = this.getHorasVisualesJornada(empleado.jornada, diaSemana, empleado.horario);
                        
                        let horasPagadas;
                        
                        if (horasVisualesNormales === 0) {
                            // Según horario es día libre, pero está trabajando: pagar 1:1
                            horasPagadas = horas;
                        } else if (horasVisualesNormales === 8) {
                            // Días de 8 horas visuales: relación 1:1
                            // 8h trabajadas = 8h pagadas, 7h = 7h, etc.
                            horasPagadas = horas;
                        } else {
                            // Días con más de 8 horas visuales (típicamente 10h)
                            // Si trabaja las horas completas esperadas → pagar 8 horas
                            // Si trabaja menos → restar proporcionalmente
                            // 10h visuales → 8h pagadas (si trabaja las 10 completas)
                            // 9h visuales → 7h pagadas (1h menos)
                            if (horas >= horasVisualesNormales) {
                                // Trabajó las horas completas: pagar jornada completa (8h)
                                horasPagadas = horasPorDia;
                            } else {
                                // Trabajó menos: calcular proporción
                                const horasFaltantes = horasVisualesNormales - horas;
                                horasPagadas = Math.max(0, horasPorDia - horasFaltantes);
                            }
                        }
                        
                        horasNormales += horasPagadas;
                    }
                    // NO calcular horas extra automáticamente
                } else if (empleado.jornada === 'mixta_acumulativa') {
                    // Jornada mixta acumulativa:
                    // Se trabajan entre 8-9 horas físicas pero se PAGAN 8 horas
                    // Los días libres NO se pagan automáticamente
                    
                    const horasOriginales = parseFloat(asist.horas || 0);
                    
                    // Si el día fue registrado con 0 horas (día libre), NO pagar automáticamente
                    if (horasOriginales === 0) {
                        // Día libre en jornada mixta acumulativa: NO se paga automáticamente
                        // Solo se paga si está explícitamente marcado como día libre en el tipo de asistencia
                        // (esto se maneja en la sección de 'libre' más abajo)
                        horasNormales += 0; // No pagar horas por día libre no registrado
                    } else {
                        // Día trabajado: calcular según las horas trabajadas
                        const fecha = asist.fecha;
                        const diaSemana = this.getDiaSemana(fecha);
                        const horasVisualesNormales = this.getHorasVisualesJornada(empleado.jornada, diaSemana, empleado.horario);
                        
                        // Si trabajó 8 horas o más, pagar 8 horas completas
                        // Si trabajó menos de 8 horas, pagar las horas trabajadas
                        let horasPagadas;
                        if (horas >= horasPorDia) {
                            // Trabajó 8 horas o más: siempre pagar 8 horas
                            horasPagadas = horasPorDia; // 8 horas
                        } else {
                            // Trabajó menos de 8 horas: pagar las horas trabajadas
                            horasPagadas = horas;
                        }
                        
                        horasNormales += horasPagadas;
                    }
                    // NO calcular horas extra automáticamente
                } else if (empleado.jornada === 'acumulativa') {
                    // Jornada acumulativa (antigua):
                    // Similar a diurna_acumulativa: se trabajan más horas pero solo se pagan 8
                    // Las horas extra SOLO se toman del campo "Horas Extra"
                    
                    const horasOriginales = parseFloat(asist.horas || 0);
                    
                    // Si el día fue registrado con 0 horas (día libre), pagar jornada completa
                    if (horasOriginales === 0) {
                        horasNormales += horasPorDia; // 8 horas
                    } else {
                        // Pagar máximo 8 horas por día trabajado
                        const horasPagadas = Math.min(horas, 8);
                        horasNormales += horasPagadas;
                    }
                } else {
                    // Jornada no reconocida, usar horas directamente
                    horasNormales += horas;
                }

                // Sumar horas extra registradas explícitamente
                horasExtra += extra;
            } else if (asist.tipo === 'ausencia') {
                // Ausencia: las horas registradas son las horas que faltó (no trabajó)
                // Calcular las horas que SÍ trabajó (jornada completa - horas de ausencia)
                let horasAusencia = parseFloat(asist.horas || 0);
                if (horasAusencia === 0) {
                    // Si no se especifican horas de ausencia, no trabajó nada (jornada completa de ausencia)
                    horasAusencia = this.getHorasJornada(empleado.jornada);
                }
                
                // Calcular horas trabajadas = jornada completa - horas de ausencia
                const horasJornada = this.getHorasJornada(empleado.jornada);
                const horasTrabajadas = Math.max(0, horasJornada - horasAusencia);
                
                // Sumar las horas trabajadas (no las de ausencia)
                horasNormales += horasTrabajadas;
            } else if (asist.tipo === 'tardanza') {
                // Tardanza: se pagan las horas que trabajó (si las hay)
                let horas = parseFloat(asist.horas || 0);
                if (horas === 0) {
                    // Si no hay horas registradas, asumir jornada completa menos tiempo de tardanza
                    const horasJornada = this.getHorasJornada(empleado.jornada);
                    // Asumir 1 hora de tardanza si no se especifica
                    horas = Math.max(0, horasJornada - 1);
                }
                horasNormales += horas;
            } else if (asist.tipo === 'permiso') {
                // Permiso: las horas registradas son las horas NO trabajadas (del permiso)
                // Calcular las horas que SÍ trabajó (jornada completa - horas de permiso)
                let horasPermiso = parseFloat(asist.horas || 0);
                if (horasPermiso === 0) {
                    // Si no se especifican horas de permiso, no trabajó nada (jornada completa de permiso)
                    horasPermiso = this.getHorasJornada(empleado.jornada);
                }
                
                // Calcular horas trabajadas = jornada completa - horas de permiso
                const horasJornada = this.getHorasJornada(empleado.jornada);
                const horasTrabajadas = Math.max(0, horasJornada - horasPermiso);
                
                // Sumar las horas trabajadas (no las de permiso)
                horasNormales += horasTrabajadas;
            } else if (asist.tipo === 'incapacidad_ccss') {
                // CCSS: primeros 3 días la empresa paga 50%, después del día 3 paga 100%
                const horasDia = this.getHorasJornada(empleado.jornada);
                const diaIncapacidad = this.contarDiasIncapacidadCCSS(empleado.id, asist.fecha);
                
                if (diaIncapacidad <= 3) {
                    // Primeros 3 días: empresa paga 50%
                    horasNormales += horasDia * 0.5;
                } else {
                    // Después del día 3: empresa paga 100%
                    horasNormales += horasDia;
                }
            } else if (asist.tipo === 'vacaciones') {
                // Vacaciones: se pagan las horas de la jornada completa
                const horasDia = this.getHorasJornada(empleado.jornada);
                horasNormales += horasDia;
            } else if (asist.tipo === 'libre') {
                // Días libres en jornadas acumulativas SÍ se pagan
                // porque las horas trabajadas en otros días cubren toda la semana
                if (empleado.jornada === 'diurna_acumulativa' || empleado.jornada === 'mixta_acumulativa' || empleado.jornada === 'acumulativa') {
                    const horasDia = this.getHorasJornada(empleado.jornada);
                    horasNormales += horasDia;
                }
                // Para otras jornadas, los días libres no se pagan (0%)
            }
            // INS no paga (0%)
        });

        // NOTA: En jornadas acumulativas solo se cuentan los días registrados en asistencias
        // No se agregan días automáticamente para evitar contar días fuera del período

        // Calcular salario base con las horas normales (ya incluye el cálculo correcto de permisos)
        salarioBase = Math.round((horasNormales * empleado.salarioHora) * 100000000) / 100000000;
        
        // Horas extra con recargo del 50% según ley costarricense
        montoHorasExtra = Math.round((horasExtra * empleado.salarioHora * 1.5) * 100000000) / 100000000;

        // Obtener bonos y rebajos del período
        const bonosEmpleado = this.bonos.filter(b => 
            b.empleadoId === empleado.id &&
            b.fecha >= fechaInicio &&
            b.fecha <= fechaFin
        );

        const totalBonos = bonosEmpleado
            .filter(b => b.tipo === 'bono')
            .reduce((sum, b) => sum + parseFloat(b.monto), 0);

        const totalRebajos = bonosEmpleado
            .filter(b => b.tipo === 'rebajo')
            .reduce((sum, b) => sum + parseFloat(b.monto), 0);

        // Calcular salario bruto
        const salarioBruto = Math.round((salarioBase + montoHorasExtra + totalBonos) * 100000000) / 100000000;

        // Calcular deducciones CCSS
        const ccss = Math.round((salarioBruto * (this.config.ccss / 100)) * 100000000) / 100000000;
        
        // Calcular impuesto de renta (solo en la segunda quincena)
        let impuestoRenta = 0;
        if (esSegundaQuincena) {
            // Calcular salario mensual estimado (quincenal x 2)
            const salarioMensualEstimado = salarioBruto * 2;
            // Calcular impuesto mensual
            const impuestoMensual = this.calcularImpuestoRenta(salarioMensualEstimado);
            // Aplicar solo la mitad del impuesto mensual en la segunda quincena
            impuestoRenta = impuestoMensual / 2;
        }

        // Calcular salario neto
        const salarioNeto = Math.round((salarioBruto - ccss - impuestoRenta - totalRebajos) * 100000000) / 100000000;

        return {
            horasNormales: horasNormales.toFixed(2),
            horasExtra: horasExtra.toFixed(2),
            salarioBase: salarioBase.toFixed(2),
            montoHorasExtra: montoHorasExtra.toFixed(2),
            bonos: totalBonos.toFixed(2),
            rebajos: totalRebajos.toFixed(2),
            salarioBruto: salarioBruto.toFixed(2),
            ccss: ccss.toFixed(2),
            impuestoRenta: impuestoRenta.toFixed(2),
            salarioNeto: salarioNeto.toFixed(2)
        };
    }

    getHorasJornada(jornada) {
        // Retorna las horas PAGADAS por día según la jornada
        // Para acumulativas: se trabaja más horas pero se pagan menos por día
        const config = this.jornadas[jornada];
        if (config) {
            return config.horasPagadas || config.horasPorDia;
        }
        // Default para jornadas antiguas o no reconocidas
        return 8;
    }
    
    getHorasTrabajadas(jornada) {
        // Retorna las horas FÍSICAS trabajadas por día
        const config = this.jornadas[jornada];
        if (config) {
            return config.horasTrabajadas || config.horasPorDia;
        }
        return 8;
    }
    
    getHorasMensuales(jornada) {
        const config = this.jornadas[jornada];
        return config ? config.horasMensuales : 240;
    }
    
    getHorasQuincenales(jornada) {
        const config = this.jornadas[jornada];
        return config ? config.horasQuincenales : 120;
    }
    
    getDiasPorSemana(jornada) {
        const config = this.jornadas[jornada];
        return config ? config.diasPorSemana : 6;
    }


    renderPlanilla(planilla) {
        const tbody = document.getElementById('tablaPlanilla');
        
        if (planilla.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <p>No hay datos para mostrar</p>
                    </td>
                </tr>
            `;
            document.getElementById('planillaSummary').style.display = 'none';
            document.getElementById('planillaActions').style.display = 'none';
            return;
        }

        tbody.innerHTML = planilla.map(item => `
            <tr>
                <td>${item.empleado.nombre}</td>
                <td>${item.empleado.email || ''}</td>
                <td>₡${this.formatearMoneda(item.salarioBase)}</td>
                <td>₡${this.formatearMoneda(item.montoHorasExtra)}</td>
                <td>₡${this.formatearMoneda(item.bonos)}</td>
                <td><strong>₡${this.formatearMoneda(item.salarioBruto)}</strong></td>
                <td>₡${this.formatearMoneda(item.ccss)}</td>
                <td>₡${this.formatearMoneda(item.rebajos)}</td>
                <td><strong>₡${this.formatearMoneda(item.salarioNeto)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="sistema.generarConstanciaSalarial('${item.empleado.id}')" title="Constancia Salarial">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-success dropdown-toggle" type="button" data-bs-toggle="dropdown" title="Comprobante de Pago">
                            <i class="fas fa-receipt"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="sistema.generarComprobantePago('${item.empleado.id}', '${document.getElementById('periodoPlanilla').value}', '${document.getElementById('fechaInicioPlanilla').value}', '${document.getElementById('fechaFinPlanilla').value}')">
                                <i class="fas fa-download"></i> Descargar PDF
                            </a></li>
                            <li><a class="dropdown-item" href="#" onclick="sistema.generarComprobantePago('${item.empleado.id}', '${document.getElementById('periodoPlanilla').value}', '${document.getElementById('fechaInicioPlanilla').value}', '${document.getElementById('fechaFinPlanilla').value}', true)">
                                <i class="fas fa-envelope"></i> Enviar por Email
                            </a></li>
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');

        // Calcular totales
        const totalBruto = planilla.reduce((sum, item) => sum + parseFloat(item.salarioBruto), 0);
        const totalDeducciones = planilla.reduce((sum, item) => sum + parseFloat(item.ccss) + parseFloat(item.rebajos), 0);
        const totalNeto = planilla.reduce((sum, item) => sum + parseFloat(item.salarioNeto), 0);

        document.getElementById('totalBruto').textContent = `₡${this.formatearMoneda(totalBruto)}`;
        document.getElementById('totalDeducciones').textContent = `₡${this.formatearMoneda(totalDeducciones)}`;
        document.getElementById('totalNeto').textContent = `₡${this.formatearMoneda(totalNeto)}`;

        document.getElementById('planillaSummary').style.display = 'block';
        document.getElementById('planillaActions').style.display = 'flex';
        
        // Mostrar botón de guardar planilla
        const btnGuardar = document.getElementById('btnGuardarPlanilla');
        if (btnGuardar) {
            btnGuardar.style.display = 'inline-block';
        }

        this.ultimaPlanilla = planilla;
    }

    // ============================================
    // CÁLCULOS ESPECIALES
    // ============================================

    calcularVacaciones(empleadoId) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return 0;

        const fechaIngreso = new Date(empleado.fechaIngreso);
        const hoy = new Date();
        const meses = this.calcularMesesTrabajados(fechaIngreso, hoy);
        
        // 1 día de vacaciones por mes trabajado
        return meses;
    }

    // ============================================
    // GESTIÓN DE VACACIONES TOMADAS
    // ============================================

    agregarVacacion(vacacion) {
        vacacion.id = Date.now().toString();
        this.vacaciones.push(vacacion);
        this.guardarDatos();
        this.renderVacaciones();
        notify.success('Vacaciones registradas correctamente');
    }

    editarVacacion(id, datos) {
        const index = this.vacaciones.findIndex(v => v.id === id);
        if (index !== -1) {
            this.vacaciones[index] = { ...this.vacaciones[index], ...datos };
            this.guardarDatos();
            this.renderVacaciones();
            notify.success('Vacaciones actualizadas correctamente');
        }
    }

    eliminarVacacion(id) {
        this.vacaciones = this.vacaciones.filter(v => v.id !== id);
        this.guardarDatos();
        this.renderVacaciones();
        notify.success('Vacaciones eliminadas correctamente');
    }

    calcularDiasVacacionesTomadas(empleadoId) {
        return this.vacaciones
            .filter(v => v.empleadoId === empleadoId && v.tomada === true)
            .reduce((total, v) => total + parseInt(v.dias || 0), 0);
    }

    renderVacaciones() {
        const tabla = document.getElementById('tablaVacaciones');
        if (!tabla) return;

        const filas = this.empleados.map(emp => {
            const diasAcumulados = this.calcularVacaciones(emp.id);
            const diasTomados = this.calcularDiasVacacionesTomadas(emp.id);
            const diasDisponibles = diasAcumulados - diasTomados;

            return `
                <tr>
                    <td>${emp.nombre}</td>
                    <td>${this.formatearFecha(emp.fechaIngreso)}</td>
                    <td><span class="badge badge-info">${diasAcumulados} días</span></td>
                    <td><span class="badge badge-warning">${diasTomados} días</span></td>
                    <td><span class="badge ${diasDisponibles > 0 ? 'badge-success' : 'badge-danger'}">${diasDisponibles} días</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="sistema.verDetalleVacaciones('${emp.id}')">
                            <i class="fas fa-eye"></i> Ver Detalle
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tabla.innerHTML = filas;
    }

    verDetalleVacaciones(empleadoId) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return;

        const vacacionesEmpleado = this.vacaciones.filter(v => v.empleadoId === empleadoId);
        
        let detalleHTML = `
            <div class="modal-detalle-vacaciones">
                <h3>${empleado.nombre}</h3>
                <p><strong>Fecha Ingreso:</strong> ${this.formatearFecha(empleado.fechaIngreso)}</p>
                <p><strong>Días Acumulados:</strong> ${this.calcularVacaciones(empleadoId)} días</p>
                <p><strong>Días Tomados:</strong> ${this.calcularDiasVacacionesTomadas(empleadoId)} días</p>
                <p><strong>Días Disponibles:</strong> ${this.calcularVacaciones(empleadoId) - this.calcularDiasVacacionesTomadas(empleadoId)} días</p>
                <hr>
                <h4>Historial de Vacaciones</h4>
        `;

        if (vacacionesEmpleado.length === 0) {
            detalleHTML += '<p class="text-muted">No hay vacaciones registradas</p>';
        } else {
            detalleHTML += '<table class="table"><thead><tr><th>Fecha Inicio</th><th>Fecha Fin</th><th>Días</th><th>Estado</th><th>Detalle</th><th>Acciones</th></tr></thead><tbody>';
            vacacionesEmpleado.forEach(v => {
                const estado = v.tomada ? '<span class="badge badge-success">Tomadas</span>' : '<span class="badge badge-warning">Pendientes</span>';
                detalleHTML += `
                    <tr>
                        <td>${this.formatearFecha(v.fechaInicio)}</td>
                        <td>${this.formatearFecha(v.fechaFin)}</td>
                        <td>${v.dias} días</td>
                        <td>${estado}</td>
                        <td>${v.detalle || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="sistema.marcarVacacionComoTomada('${v.id}')" ${v.tomada ? 'disabled' : ''}>
                                <i class="fas fa-check"></i> Marcar como Tomada
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="sistema.eliminarVacacion('${v.id}'); document.querySelector('.modal.active').remove();">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            detalleHTML += '</tbody></table>';
        }

        detalleHTML += '</div>';

        // Crear modal temporal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Detalle de Vacaciones</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    ${detalleHTML}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    marcarVacacionComoTomada(id) {
        const index = this.vacaciones.findIndex(v => v.id === id);
        if (index !== -1) {
            this.vacaciones[index].tomada = true;
            this.guardarDatos();
            this.renderVacaciones();
            notify.success('Vacaciones marcadas como tomadas correctamente');
        }
    }

    calcularAguinaldo(empleadoId, fechaInicio, fechaFin) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return 0;

        const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);
        const aguinaldo = parseFloat(calculos.salarioBruto) / 12;
        
        return aguinaldo.toFixed(2);
    }

    calcularMesesTrabajados(fechaInicio, fechaFin) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        // Calcular la diferencia de meses
        let meses = (fin.getFullYear() - inicio.getFullYear()) * 12;
        meses += fin.getMonth() - inicio.getMonth();
        
        // Si el día de la fecha final es menor al día de inicio,
        // significa que el mes actual aún no se ha completado
        if (fin.getDate() < inicio.getDate()) {
            meses -= 1;
        }
        
        return meses <= 0 ? 0 : meses;
    }

    // ============================================
    // HISTORIAL DE PLANILLAS
    // ============================================

    guardarPlanillaEnHistorial() {
        if (!this.ultimaPlanilla || this.ultimaPlanilla.length === 0) {
            notify.warning('No hay una planilla calculada para guardar');
            return;
        }

        const periodo = document.getElementById('periodoPlanilla').value;
        const fechaInicio = document.getElementById('fechaInicioPlanilla').value;
        const fechaFin = document.getElementById('fechaFinPlanilla').value;

        // Guardar cada registro de la planilla en el historial
        this.ultimaPlanilla.forEach(item => {
            const registro = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                empleadoId: item.empleado.id,
                empleadoNombre: item.empleado.nombre,
                periodo: periodo,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                fechaGuardado: new Date().toISOString(),
                salarioBase: parseFloat(item.salarioBase),
                horasExtra: item.horasExtra || 0,
                montoHorasExtra: parseFloat(item.montoHorasExtra),
                bonos: parseFloat(item.bonos),
                rebajos: parseFloat(item.rebajos),
                salarioBruto: parseFloat(item.salarioBruto),
                ccss: parseFloat(item.ccss),
                salarioNeto: parseFloat(item.salarioNeto),
                aguinaldo: parseFloat(item.salarioBruto) / 12,
                vacaciones: this.calcularVacaciones(item.empleado.id)
            };
            this.historialPlanillas.push(registro);
        });

        this.guardarDatos();
        notify.success(`Planilla guardada exitosamente (${this.ultimaPlanilla.length} empleados)`);
    }

    renderHistorialPlanillas(empleadoId = '') {
        const container = document.getElementById('historialContainer');
        if (!container) return;

        let historial = this.historialPlanillas;
        
        // Filtrar por empleado si se especifica
        if (empleadoId) {
            historial = historial.filter(h => h.empleadoId === empleadoId);
        }

        if (historial.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>No hay registros de planillas guardadas. Guarda una planilla desde la sección de Planillas.</p>
                </div>
            `;
            return;
        }

        // Ordenar por fecha más reciente
        historial.sort((a, b) => new Date(b.fechaGuardado) - new Date(a.fechaGuardado));

        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha Guardado</th>
                            <th>Empleado</th>
                            <th>Período</th>
                            <th>Fecha Inicio</th>
                            <th>Fecha Fin</th>
                            <th>Horas Extra</th>
                            <th>Salario Bruto</th>
                            <th>CCSS</th>
                            <th>Neto</th>
                            <th>Aguinaldo</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historial.map(h => `
                            <tr>
                                <td>${new Date(h.fechaGuardado).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td>${h.empleadoNombre}</td>
                                <td><span class="badge badge-info">${h.periodo}</span></td>
                                <td>${h.fechaInicio}</td>
                                <td>${h.fechaFin}</td>
                                <td>${h.horasExtra}h</td>
                                <td>₡${this.formatearMoneda(h.salarioBruto)}</td>
                                <td>₡${this.formatearMoneda(h.ccss)}</td>
                                <td>₡${this.formatearMoneda(h.salarioNeto)}</td>
                                <td>₡${this.formatearMoneda(h.aguinaldo)}</td>
                                <td>
                                    <button class="btn btn-sm btn-danger" onclick="sistema.eliminarRegistroHistorial('${h.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    calcularAguinaldoDelHistorial(historial) {
        const currentYear = new Date().getFullYear();
        const periodStart = new Date(currentYear - 1, 11, 1); // 1 diciembre año anterior
        const periodEnd = new Date(currentYear, 10, 30); // 30 noviembre año actual

        // Filtrar registros dentro del período de aguinaldo
        const registrosRelevantes = historial.filter(h => {
            const fecha = new Date(h.fechaFin || h.fechaGuardado);
            return fecha >= periodStart && fecha <= periodEnd;
        });

        const totalBruto = registrosRelevantes.reduce((sum, h) => sum + h.salarioBruto, 0);
        const aguinaldo = totalBruto / 12;

        return {
            periodStart: periodStart.toLocaleDateString('es-CR'),
            periodEnd: periodEnd.toLocaleDateString('es-CR'),
            periodCount: registrosRelevantes.length,
            totalBruto: totalBruto,
            aguinaldo: aguinaldo
        };
    }

    async eliminarRegistroHistorial(id) {
        const confirmado = await confirmDialog.confirmAction(
            '¿Estás seguro de eliminar este registro?',
            'Eliminar Registro'
        );
        
        if (!confirmado) return;
        
        try {
            loadingOverlay.show();
            await new Promise(resolve => setTimeout(resolve, 300));
        
        this.historialPlanillas = this.historialPlanillas.filter(h => h.id !== id);
        this.guardarDatos();
        
        const filtroEmpleado = document.getElementById('filtroEmpleadoHistorial');
        this.renderHistorialPlanillas(filtroEmpleado ? filtroEmpleado.value : '');
            
            loadingOverlay.hide();
            notify.success('Registro eliminado correctamente');
        } catch (error) {
            loadingOverlay.hide();
            notify.error('Error al eliminar el registro');
        }
    }

    // ============================================
    // GESTIÓN DE FERIADOS
    // ============================================

    cargarFeriadosDefecto() {
        if (this.feriados.length === 0) {
            const anioActual = new Date().getFullYear();
            this.feriados = [
                { id: '1', fecha: `${anioActual}-01-01`, descripcion: 'Año Nuevo', recargo: 50 },
                { id: '2', fecha: `${anioActual}-04-11`, descripcion: 'Día de Juan Santamaría', recargo: 50 },
                { id: '3', fecha: `${anioActual}-05-01`, descripcion: 'Día Internacional del Trabajo', recargo: 50 },
                { id: '4', fecha: `${anioActual}-07-25`, descripcion: 'Anexión del Partido de Nicoya', recargo: 50 },
                { id: '5', fecha: `${anioActual}-08-02`, descripcion: 'Día de la Virgen de los Ángeles', recargo: 50 },
                { id: '6', fecha: `${anioActual}-08-15`, descripcion: 'Día de la Madre', recargo: 50 },
                { id: '7', fecha: `${anioActual}-09-15`, descripcion: 'Día de la Independencia', recargo: 50 },
                { id: '8', fecha: `${anioActual}-12-25`, descripcion: 'Navidad', recargo: 50 }
            ];
            this.guardarDatos();
        }
    }

    agregarFeriado(feriado) {
        feriado.id = Date.now().toString();
        this.feriados.push(feriado);
        this.guardarDatos();
        this.renderFeriados();
    }

    editarFeriado(id, datosActualizados) {
        const index = this.feriados.findIndex(f => f.id === id);
        if (index !== -1) {
            this.feriados[index] = { ...this.feriados[index], ...datosActualizados };
            this.guardarDatos();
            this.renderFeriados();
        }
    }

    async eliminarFeriado(id) {
        console.log('🗑️ Eliminando feriado:', id);
        const feriado = this.feriados.find(f => f.id === id);
        const nombreFeriado = feriado ? feriado.descripcion : 'este feriado';
        
        console.log('📋 Feriado a eliminar:', feriado);
        console.log('🤔 Mostrando confirmación...');
        
        const confirmado = await confirmDialog.confirmAction(
            `¿Está seguro de eliminar ${nombreFeriado}?`,
            'Eliminar Feriado'
        );
        
        console.log('✅ Usuario confirmó:', confirmado);
        
        if (confirmado) {
            try {
                console.log('⏳ Mostrando loading overlay...');
                loadingOverlay.show();
                await new Promise(resolve => setTimeout(resolve, 300));
                
                console.log('🔄 Filtrando feriados...');
                this.feriados = this.feriados.filter(f => f.id !== id);
                this.guardarDatos();
                this.renderFeriados();
                
                loadingOverlay.hide();
                notify.success(`Feriado ${nombreFeriado} eliminado correctamente`);
                console.log('✅ Feriado eliminado exitosamente');
            } catch (error) {
                console.error('❌ Error al eliminar feriado:', error);
                loadingOverlay.hide();
                notify.error('Error al eliminar el feriado');
            }
        } else {
            console.log('❌ Usuario canceló la eliminación');
        }
    }

    renderFeriados() {
        console.log('🎨 Renderizando feriados...');
        const tbody = document.getElementById('tablaFeriados');
        
        if (!tbody) {
            console.error('❌ No se encontró el elemento tablaFeriados');
            return;
        }
        
        console.log('📊 Total de feriados:', this.feriados.length);
        
        if (this.feriados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-calendar-alt"></i>
                        <p>No hay feriados registrados</p>
                    </td>
                </tr>
            `;
            console.log('📝 Mostrando mensaje de vacío');
            return;
        }

        const html = this.feriados.map(feriado => {
            console.log('🔧 Generando HTML para feriado:', feriado.id, feriado.descripcion);
            return `
                <tr>
                    <td>${this.formatearFecha(feriado.fecha)}</td>
                    <td>${feriado.descripcion}</td>
                    <td>${feriado.recargo}%</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="sistema.abrirEditarFeriado('${feriado.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="sistema.eliminarFeriado('${feriado.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = html;
        console.log('✅ Feriados renderizados correctamente');
    }

    // ============================================
    // REPORTES
    // ============================================

    generarReporteVacaciones() {
        const reporte = this.empleados.map(emp => {
            const diasAcumulados = this.calcularVacaciones(emp.id);
            const diasUsados = this.asistencias.filter(a => 
                a.empleadoId === emp.id && a.tipo === 'vacaciones'
            ).length;
            const diasDisponibles = diasAcumulados - diasUsados;

            return {
                empleado: emp.nombre,
                fechaIngreso: this.formatearFecha(emp.fechaIngreso),
                mesesTrabajados: this.calcularMesesTrabajados(emp.fechaIngreso, new Date()),
                diasAcumulados,
                diasUsados,
                diasDisponibles
            };
        });

        this.mostrarReporteTabla(
            'Reporte de Vacaciones',
            ['Empleado', 'Fecha Ingreso', 'Meses Trabajados', 'Días Acumulados', 'Días Usados', 'Días Disponibles'],
            reporte.map(r => [r.empleado, r.fechaIngreso, r.mesesTrabajados, r.diasAcumulados, r.diasUsados, r.diasDisponibles])
        );
    }

    generarReporteAguinaldo() {
        const anioActual = new Date().getFullYear();
        
        // Ocultar las tarjetas de reportes
        const reportsGrid = document.querySelector('.reports-grid');
        const reporteDetalle = document.getElementById('reporteDetalle');
        
        if (reportsGrid) reportsGrid.style.display = 'none';
        
        // Calcular aguinaldo basado en el historial real de planillas
        const reporte = this.empleados.map(emp => {
            const historialEmpleado = this.historialPlanillas.filter(h => h.empleadoId === emp.id);
            const aguinaldoData = this.calcularAguinaldoDelHistorial(historialEmpleado);
            
            return {
                empleado: emp.nombre,
                cedula: emp.cedula,
                planillasProcesadas: aguinaldoData.periodCount,
                totalBruto: aguinaldoData.totalBruto,
                aguinaldo: aguinaldoData.aguinaldo
            };
        });

        // Crear tabla personalizada con más detalles
        const reporteTitulo = document.getElementById('reporteTitulo');
        const reporteTableHead = document.getElementById('reporteTableHead');
        const reporteTableBody = document.getElementById('reporteTableBody');

        reporteTitulo.textContent = `Reporte de Aguinaldo ${anioActual}`;
        
        reporteTableHead.innerHTML = `
            <tr>
                <th>Empleado</th>
                <th>Cédula</th>
                <th>Planillas Procesadas</th>
                <th>Total Bruto Acumulado</th>
                <th>Aguinaldo (Bruto/12)</th>
            </tr>
        `;
        
        reporteTableBody.innerHTML = reporte.map(r => `
            <tr>
                <td>${r.empleado}</td>
                <td>${r.cedula}</td>
                <td>${r.planillasProcesadas}</td>
                <td>₡${this.formatearMoneda(r.totalBruto)}</td>
                <td><strong>₡${this.formatearMoneda(r.aguinaldo)}</strong></td>
            </tr>
        `).join('');

        // Agregar resumen total
        const totalAguinaldo = reporte.reduce((sum, r) => sum + r.aguinaldo, 0);
        reporteTableBody.innerHTML += `
            <tr style="background: var(--gray-200); font-weight: bold;">
                <td colspan="4" style="text-align: right;">TOTAL A PAGAR:</td>
                <td>₡${this.formatearMoneda(totalAguinaldo)}</td>
            </tr>
        `;

        // Agregar nota sobre el período
        const periodStart = new Date(anioActual - 1, 11, 1).toLocaleDateString('es-CR');
        const periodEnd = new Date(anioActual, 10, 30).toLocaleDateString('es-CR');
        reporteTableBody.innerHTML += `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; background: var(--gray-100);">
                    <i class="fas fa-info-circle"></i> 
                    <strong>Período de cálculo:</strong> ${periodStart} al ${periodEnd}<br>
                    <small>Basado en las planillas guardadas en el sistema</small>
                </td>
            </tr>
        `;

        // Mostrar el reporte en la misma sección
        reporteDetalle.style.display = 'block';
    }

    generarReporteIncapacidades() {
        const incapacidades = this.asistencias.filter(a => 
            a.tipo === 'incapacidad_ccss' || a.tipo === 'incapacidad_ins'
        );

        const reporte = incapacidades.map(inc => {
            const empleado = this.empleados.find(e => e.id === inc.empleadoId);
            return {
                empleado: empleado ? empleado.nombre : 'N/A',
                fecha: this.formatearFecha(inc.fecha),
                tipo: inc.tipo === 'incapacidad_ccss' ? 'CCSS' : 'INS',
                detalle: inc.detalle || '-'
            };
        });

        this.mostrarReporteTabla(
            'Reporte de Incapacidades',
            ['Empleado', 'Fecha', 'Tipo', 'Detalle'],
            reporte.map(r => [r.empleado, r.fecha, r.tipo, r.detalle])
        );
    }

    mostrarReporteTabla(titulo, headers, data) {
        document.getElementById('reporteTitulo').textContent = titulo;
        
        const thead = document.getElementById('reporteTableHead');
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        
        const tbody = document.getElementById('reporteTableBody');
        tbody.innerHTML = data.map(row => 
            `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
        ).join('');

        document.getElementById('reporteDetalle').style.display = 'block';
        document.querySelector('.reports-grid').style.display = 'none';
    }

    cerrarReporte() {
        document.getElementById('reporteDetalle').style.display = 'none';
        document.querySelector('.reports-grid').style.display = 'grid';
    }

    // ============================================
    // EXPORTACIÓN
    // ============================================

    exportarExcel(planilla) {
        const data = planilla.map(item => ({
            'Empleado': item.empleado.nombre,
            'Email': item.empleado.email || '',
            'Cédula': item.empleado.cedula,
            'Salario Base': parseFloat(item.salarioBase),
            'Horas Extra': parseFloat(item.montoHorasExtra),
            'Bonos': parseFloat(item.bonos),
            'Salario Bruto': parseFloat(item.salarioBruto),
            'CCSS (10.67%)': parseFloat(item.ccss),
            'Rebajos': parseFloat(item.rebajos),
            'Salario Neto': parseFloat(item.salarioNeto)
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Planilla");
        
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `planilla_${fecha}.xlsx`);
    }

    exportarPDF(planilla) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text('Planilla de Salarios', 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Fecha: ${this.formatearFecha(new Date().toISOString().split('T')[0])}`, 14, 30);

        const tableData = planilla.map(item => [
            item.empleado.nombre,
            `₡${this.formatearMoneda(item.salarioBase)}`,
            `₡${this.formatearMoneda(item.montoHorasExtra)}`,
            `₡${this.formatearMoneda(item.bonos)}`,
            `₡${this.formatearMoneda(item.salarioBruto)}`,
            `₡${this.formatearMoneda(item.ccss)}`,
            `₡${this.formatearMoneda(item.rebajos)}`,
            `₡${this.formatearMoneda(item.salarioNeto)}`
        ]);

        doc.autoTable({
            startY: 40,
            head: [['Empleado', 'Salario Base', 'H. Extra', 'Bonos', 'S. Bruto', 'CCSS', 'Rebajos', 'S. Neto']],
            body: tableData,
            styles: { fontSize: 8 }
        });

        const fecha = new Date().toISOString().split('T')[0];
        doc.save(`planilla_${fecha}.pdf`);
    }

    generarConstanciaSalarial(empleadoId) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('CONSTANCIA SALARIAL', 105, 30, { align: 'center' });

        doc.setFontSize(12);
        const y = 60;
        doc.text(`La empresa certifica que ${empleado.nombre}, cédula ${empleado.cedula},`, 20, y);
        doc.text(`se desempeña como ${empleado.puesto} desde el ${this.formatearFecha(empleado.fechaIngreso)}.`, 20, y + 10);
        doc.text(``, 20, y + 20);
        doc.text(`Jornada laboral: ${this.formatJornada(empleado.jornada)}`, 20, y + 30);
        doc.text(`Salario por hora: ₡${this.formatearMoneda(empleado.salarioHora)}`, 20, y + 40);
        doc.text(``, 20, y + 50);
        doc.text(`Se extiende la presente constancia a solicitud del interesado,`, 20, y + 60);
        doc.text(`para los fines que estime conveniente.`, 20, y + 70);
        doc.text(``, 20, y + 80);
        doc.text(`Fecha: ${this.formatearFecha(new Date().toISOString().split('T')[0])}`, 20, y + 100);

        doc.save(`constancia_${empleado.nombre.replace(/\s/g, '_')}.pdf`);
    }

    generarComprobantePago(empleadoId, periodo, fechaInicio, fechaFin, enviarPorCorreo = false) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado) {
            notify.error('Empleado no encontrado');
            return;
        }

        // Verificar si se puede enviar por correo
        if (enviarPorCorreo && (!empleado.email || empleado.email.trim() === '')) {
            notify.error('El empleado no tiene un email válido para enviar el comprobante');
            return;
        }

        // Calcular los datos de la planilla para este empleado
        const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);

        // Crear un contenedor temporal para el comprobante
        const comprobanteHTML = document.createElement('div');
        comprobanteHTML.id = 'comprobante-temp';
        comprobanteHTML.style.position = 'fixed';
        comprobanteHTML.style.left = '-9999px';
        comprobanteHTML.style.top = '0';
        comprobanteHTML.style.width = '210mm';
        comprobanteHTML.style.background = 'white';
        comprobanteHTML.style.padding = '20px';
        comprobanteHTML.style.fontFamily = 'Arial, sans-serif';

        // Calcular fechas formateadas
        const fechaInicioObj = new Date(fechaInicio + 'T00:00:00');
        const fechaFinObj = new Date(fechaFin + 'T00:00:00');
        const nombreMes = fechaFinObj.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

        // Calcular valores
        const salarioDiario = parseFloat(empleado.salarioHora) * this.getHorasJornada(empleado.jornada);
        const diasLaborados = this.contarDiasLaborados(empleado.id, fechaInicio, fechaFin);
        
        // Salario mensual de referencia (sin rebajos)
        const salarioMensual = salarioDiario * 30; // Salario diario x 30 días
        
        // Subtotal quincenal: mitad del salario mensual (sin rebajos)
        const subtotalQuincenal = salarioMensual / 2;
        
        const horasFeriado = this.calcularHorasFeriado(empleado.id, fechaInicio, fechaFin);
        const totalFeriado = horasFeriado * parseFloat(empleado.salarioHora) * 2;
        
        const horasExtraFeriado = this.calcularHorasExtraFeriado(empleado.id, fechaInicio, fechaFin);
        const totalExtraFeriado = horasExtraFeriado * parseFloat(empleado.salarioHora) * 3;
        
        const horasExtras = parseFloat(calculos.horasExtra || 0);
        const totalExtras = parseFloat(calculos.montoHorasExtra || 0);
        
        const subtotalPagado = parseFloat(calculos.salarioBase) + totalFeriado + totalExtraFeriado + totalExtras;
        const salarioBruto = parseFloat(calculos.salarioBruto);
        
        const ccss = parseFloat(calculos.ccss);
        const impuestoRenta = parseFloat(calculos.impuestoRenta || 0);
        const otrasDedu = parseFloat(calculos.rebajos);
        
        // Calcular deducciones por horas faltantes
        const deduccionesHoras = this.calcularDeduccionesHorasComprobante(empleado.id, fechaInicio, fechaFin, empleado.salarioHora);
        
        const totalDeducciones = ccss + impuestoRenta + otrasDedu + deduccionesHoras.total;
        
        const salarioNeto = parseFloat(calculos.salarioNeto);

        // Obtener todos los detalles de asistencias del período
        const asistenciasConDetalle = this.asistencias.filter(a => 
            a.empleadoId === empleado.id &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            a.detalle && a.detalle.trim() !== ''
        );

        // Formatear detalles para mostrar en observaciones
        let observacionesTexto = '';
        
        // Agregar detalles de rebajos por horas
        if (deduccionesHoras.detalles.length > 0) {
            observacionesTexto += 'REBAJOS POR HORAS FALTANTES:\n';
            observacionesTexto += deduccionesHoras.detalles.join('\n');
            observacionesTexto += '\n\n';
        }
        
        // Agregar observaciones de asistencias
        if (asistenciasConDetalle.length > 0) {
            observacionesTexto += 'OBSERVACIONES DE ASISTENCIAS:\n';
            observacionesTexto += asistenciasConDetalle.map(a => {
                const fechaFormateada = this.formatearFecha(a.fecha);
                return `${fechaFormateada}: ${a.detalle}`;
            }).join('\n');
        } else if (deduccionesHoras.detalles.length === 0) {
            observacionesTexto = 'Sin observaciones especiales';
        }

        // Construir el HTML del comprobante
        comprobanteHTML.innerHTML = `
            <style>
                #comprobante-temp {
                    font-size: 11px;
                    line-height: 1.4;
                }
                #comprobante-temp .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                }
                #comprobante-temp .logo {
                    width: 120px;
                    height: 120px;
                    margin-left: -20px;
                }
                #comprobante-temp .logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                #comprobante-temp .title {
                    text-align: center;
                    background: #007bff;
                    color: white;
                    padding: 8px 20px;
                    border-radius: 15px;
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 15px;
                }
                #comprobante-temp table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    margin-bottom: 15px;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                #comprobante-temp table.info-table th {
                    background: #007bff;
                    color: white;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    border: none;
                }
                #comprobante-temp table.info-table td {
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                #comprobante-temp table.info-table tr:nth-child(even) {
                    background: #f9f9f9;
                }
                #comprobante-temp .section-title {
                    background: #007bff;
                    color: white;
                    padding: 8px;
                    font-weight: bold;
                    text-align: center;
                    margin-top: 15px;
                    margin-bottom: 10px;
                    border-radius: 10px;
                }
                #comprobante-temp table.detail-table {
                    border: 2px solid #007bff;
                }
                #comprobante-temp table.detail-table thead {
                    background: #007bff;
                    color: white;
                }
                #comprobante-temp table.detail-table th {
                    padding: 8px;
                    border: 1px solid white;
                    font-weight: bold;
                    text-align: center;
                    border-radius: 5px;
                }
                #comprobante-temp table.detail-table td {
                    padding: 6px 8px;
                    border: 1px solid #ddd;
                    text-align: right;
                    border-radius: 5px;
                }
                #comprobante-temp table.detail-table td:first-child {
                    text-align: left;
                }
                #comprobante-temp .deductions-header {
                    background: #E74C3C !important;
                    color: white;
                }
                #comprobante-temp .salary-net {
                    background: #007bff;
                    color: white;
                    font-size: 16px;
                    font-weight: bold;
                    text-align: center;
                    padding: 12px;
                    margin-top: 15px;
                    border-radius: 15px;
                }
                #comprobante-temp .notes {
                    margin-top: 20px;
                    padding: 10px;
                    background: #f0f8ff;
                    border-left: 4px solid #007bff;
                    font-size: 10px;
                    border-radius: 10px;
                }
            </style>
            
            <div class="header">
                <div class="logo">
                    <img src="${empleado.empresa === 'Instituto Veterinario San Martin de Porres' ? './images/empresa.png' : './images/logo.jpg'}" alt="Logo" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23007bff%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22%3EVeterinaria%3C/text%3E%3C/svg%3E'">
                </div>
                <div style="flex: 1; text-align: right;">
                    <h2 style="margin: 0; color: #007bff;">${empleado.empresa || 'Veterinaria San Martín de Porres'}</h2>
                    <p style="margin: 5px 0; color: #666;">San Rafael Abajo de Desamparados</p>
                    <p style="margin: 5px 0; color: #666;">Tel: 4000-1365 | WhatsApp: 8839-2214</p>
                </div>
            </div>

            <div class="title">Comprobante de Pago</div>

            <table class="info-table">
                <tr>
                    <th colspan="2">DATOS DEL COLABORADOR</th>
                </tr>
                <tr>
                    <td><strong>Nombre del colaborador</strong></td>
                    <td>${empleado.nombre}</td>
                </tr>
                <tr>
                    <td><strong>Identificación</strong></td>
                    <td>${empleado.cedula}</td>
                </tr>
                <tr>
                    <td><strong>Departamento</strong></td>
                    <td>${empleado.departamento || 'Operativo'}</td>
                </tr>
                <tr>
                    <td><strong>Puesto</strong></td>
                    <td>${empleado.puesto}</td>
                </tr>
                <tr>
                    <td><strong>Periodo de pago</strong></td>
                    <td>${nombreMes}</td>
                </tr>
                <tr>
                    <td><strong>Depositado en</strong></td>
                    <td>${empleado.depositadoEn || 'Bac San José'}</td>
                </tr>
                <tr>
                    <td><strong>Cuenta</strong></td>
                    <td></td>
                </tr>
            </table>

            <div class="section-title">Detalle de Ingresos en el mes</div>

            <table class="detail-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">INGRESOS</th>
                        <th style="width: 25%;"></th>
                        <th style="width: 25%;" class="deductions-header">DEDUCCIONES</th>
                        <th style="width: 25%;"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Salario Mensual</td>
                        <td>₡ ${this.formatearMoneda(salarioMensual)}</td>
                        <td>C.C.S.S. ${this.config.ccss}%</td>
                        <td>₡ ${this.formatearMoneda(ccss)}</td>
                    </tr>
                    <tr>
                        <td>Salario diario</td>
                        <td>₡ ${this.formatearMoneda(salarioDiario)}</td>
                        <td>Impuesto de Renta</td>
                        <td>₡ ${this.formatearMoneda(impuestoRenta)}</td>
                    </tr>
                    <tr>
                        <td>Salario x hora</td>
                        <td>₡ ${this.formatearMoneda(empleado.salarioHora)}</td>
                        <td>Rebajo por horas</td>
                        <td>₡ ${this.formatearMoneda(deduccionesHoras.total)}</td>
                    </tr>
                    <tr>
                        <td></td>
                        <td></td>
                        <td>Otras deducciones</td>
                        <td>₡ ${this.formatearMoneda(otrasDedu)}</td>
                    </tr>
                    <tr>
                        <td>Días laborados</td>
                        <td>${diasLaborados}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Subtotal quincenal</td>
                        <td>₡ ${this.formatearMoneda(subtotalQuincenal)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Horas laboradas feriado</td>
                        <td>${horasFeriado.toFixed(2)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>₡ ${this.formatearMoneda(totalFeriado)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Horas extras feriado</td>
                        <td>${horasExtraFeriado.toFixed(2)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>₡ ${this.formatearMoneda(totalExtraFeriado)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Horas extras</td>
                        <td>${horasExtras}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>₡ ${this.formatearMoneda(totalExtras)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td>Sub-total Pagado</td>
                        <td>₡ ${this.formatearMoneda(subtotalPagado)}</td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr style="font-weight: bold; background: #e8f4f8;">
                        <td>SALARIO BRUTO</td>
                        <td>₡ ${this.formatearMoneda(salarioBruto)}</td>
                        <td>Total de Deducciones</td>
                        <td>₡ ${this.formatearMoneda(totalDeducciones)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="salary-net">
                SALARIO NETO: ₡ ${this.formatearMoneda(salarioNeto)}
            </div>

            <div class="notes">
                <strong>Observaciones:</strong><br>
                ${observacionesTexto}
            </div>
        `;

        document.body.appendChild(comprobanteHTML);

        // Generar el PDF con html2canvas
        setTimeout(() => {
            html2canvas(comprobanteHTML, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const imgWidth = 190;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
                const y = 5;

                pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

                const fileName = `Comprobante_${empleado.nombre.replace(/\s/g, '_')}_${nombreMes.replace(/\s/g, '_')}.pdf`;
                
                if (enviarPorCorreo) {
                    // Enviar por correo electrónico
                    this.enviarComprobantePorCorreo(empleado, calculos, {
                        periodo: nombreMes,
                        fechaInicio: fechaInicio,
                        fechaFin: fechaFin
                    }, pdf);
                } else {
                    // Descargar PDF normalmente
                    pdf.save(fileName);
                }

                // Eliminar el elemento temporal
                document.body.removeChild(comprobanteHTML);
            }).catch(error => {
                console.error('Error al generar el comprobante:', error);
                alert('Error al generar el comprobante: ' + error.message);
                document.body.removeChild(comprobanteHTML);
            });
        }, 100);
    }

    /**
     * Envía un comprobante de pago por correo electrónico usando EmailJS
     * @param {Object} empleado - Datos del empleado
     * @param {Object} calculos - Cálculos de salario
     * @param {Object} planilla - Información de la planilla
     * @param {Object} pdf - Objeto PDF de jsPDF
     */
    async enviarComprobantePorCorreo(empleado, calculos, planilla, pdf) {
        try {
            // Verificar si el servicio de email está disponible
            if (typeof window.EmailService === 'undefined') {
                notify.error('Servicio de email no disponible. Verifique que el script esté cargado correctamente.');
                return;
            }

            // Mostrar notificación de envío
            notify.info('Enviando comprobante por correo...');

            // Crear instancia del servicio de email
            const emailService = new window.EmailService();

            // Enviar comprobante usando el servicio optimizado
            const resultado = await emailService.enviarComprobante(empleado, calculos, planilla, pdf);

            if (resultado.success) {
                notify.success(`Comprobante enviado exitosamente a ${empleado.email}. El PDF se ha descargado automáticamente.`);
                
                // Registrar el envío en logs
                this.registrarEnvioComprobante({
                    empleadoId: empleado.id,
                    empleadoNombre: empleado.nombre,
                    email: empleado.email,
                    periodo: planilla.periodo,
                    fechaEnvio: new Date().toISOString(),
                    estado: 'enviado',
                    messageId: resultado.messageId,
                    fileName: resultado.fileName
                });
            } else {
                throw new Error('Error enviando comprobante');
            }

        } catch (error) {
            console.error('Error enviando comprobante por correo:', error);
            notify.error(`Error enviando comprobante: ${error.message}`);
            
            // Registrar el error en logs
            this.registrarEnvioComprobante({
                empleadoId: empleado.id,
                empleadoNombre: empleado.nombre,
                email: empleado.email,
                periodo: planilla.periodo,
                fechaEnvio: new Date().toISOString(),
                estado: 'error',
                error: error.message
            });
        }
    }

    /**
     * Registra el envío de comprobante en el sistema
     * @param {Object} logData - Datos del envío
     */
    registrarEnvioComprobante(logData) {
        try {
            // Obtener logs existentes
            let logs = JSON.parse(localStorage.getItem('logsEnvioComprobantes') || '[]');
            
            // Agregar nuevo log
            logs.push({
                id: Date.now().toString(),
                ...logData
            });
            
            // Mantener solo los últimos 1000 logs
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }
            
            // Guardar logs
            localStorage.setItem('logsEnvioComprobantes', JSON.stringify(logs));
            
        } catch (error) {
            console.error('Error registrando envío de comprobante:', error);
        }
    }

    /**
     * Obtiene los logs de envío de comprobantes
     * @returns {Array} - Lista de logs
     */
    obtenerLogsEnvioComprobantes() {
        try {
            return JSON.parse(localStorage.getItem('logsEnvioComprobantes') || '[]');
        } catch (error) {
            console.error('Error obteniendo logs de envío:', error);
            return [];
        }
    }

    /**
     * Envía comprobantes de pago a todos los empleados de la planilla actual
     * @param {string} periodo - Período de la planilla
     * @param {string} fechaInicio - Fecha de inicio
     * @param {string} fechaFin - Fecha de fin
     */
    async enviarComprobantesMasivo(periodo, fechaInicio, fechaFin) {
        try {
            // Verificar si el servicio de email está disponible
            if (typeof window.emailService === 'undefined') {
                notify.error('Servicio de correo no disponible. Asegúrese de cargar el AppsScriptEmailService.');
                return;
            }

            if (!window.emailService.estaConfigurado()) {
                notify.error('Google Apps Script no configurado correctamente. Verifique el Script ID.');
                return;
            }

            // Confirmar envío masivo
            const confirmacion = confirm(
                `¿Está seguro de que desea enviar comprobantes de pago a todos los empleados?\n\n` +
                `Período: ${periodo}\n` +
                `Del ${this.formatearFecha(fechaInicio)} al ${this.formatearFecha(fechaFin)}\n\n` +
                `Esta acción enviará correos a todos los empleados que tengan email válido.`
            );

            if (!confirmacion) {
                return;
            }

            // Mostrar notificación de inicio
            notify.info('Iniciando envío masivo de comprobantes...');

            // Preparar datos de empleados para envío
            const empleadosConEmail = this.empleados.filter(emp => 
                emp.email && emp.email.trim() !== ''
            );

            if (empleadosConEmail.length === 0) {
                notify.error('No hay empleados con email válido para enviar comprobantes.');
                return;
            }

            // Mostrar progreso
            const modalProgreso = this.mostrarModalProgreso(empleadosConEmail.length);

            try {
                // Actualizar progreso
                this.actualizarProgresoModal(modalProgreso, 0, empleadosConEmail.length, 'Preparando datos...');

                // Preparar datos para envío masivo con Google Apps Script
                const empleadosConDatos = empleadosConEmail.map(empleado => {
                    const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio, fechaFin);
                    
                    return {
                        empleado: {
                            nombre: empleado.nombre,
                            cedula: empleado.cedula,
                            email: empleado.email,
                            puesto: empleado.puesto || 'N/A',
                            departamento: empleado.departamento || 'N/A'
                        },
                        datosPago: {
                            salarioBase: parseFloat(calculos.salarioBase || 0),
                            salarioBruto: parseFloat(calculos.salarioBruto || 0),
                            salarioNeto: parseFloat(calculos.salarioNeto || 0),
                            ccss: parseFloat(calculos.ccss || 0),
                            horasTrabajadas: empleado.horasTrabajadas || 0,
                            salarioHora: parseFloat(empleado.salarioHora || 0),
                            horasExtras: parseFloat(calculos.horasExtra || 0),
                            montoHorasExtras: parseFloat(calculos.montoHorasExtra || 0),
                            bonificaciones: parseFloat(calculos.bonificaciones || 0),
                            deducciones: parseFloat(calculos.rebajos || 0)
                        }
                    };
                });

                // Actualizar progreso
                this.actualizarProgresoModal(modalProgreso, empleadosConEmail.length, empleadosConEmail.length, 'Enviando a Google Apps Script...');

                // Enviar usando Google Apps Script
                const resultado = await window.emailService.enviarComprobantesMasivo(
                    empleadosConDatos,
                    { periodo, fechaInicio, fechaFin }
                );

                // Cerrar modal de progreso
                this.cerrarModalProgreso(modalProgreso);

                if (resultado.success) {
                    // Registrar envíos exitosos
                    resultado.resultados.forEach(res => {
                        this.registrarEnvioComprobante({
                            empleadoId: res.empleado,
                            empleadoNombre: res.empleado,
                            email: res.email,
                            periodo: periodo,
                            fechaEnvio: new Date().toISOString(),
                            estado: res.success ? 'enviado' : 'error',
                            error: res.error || '',
                            messageId: res.success ? 'apps_script' : ''
                        });
                    });

                    // Mostrar resumen final
                    this.mostrarResumenEnvioMasivo(
                        resultado.resumen.exitosos, 
                        resultado.resumen.errores, 
                        resultado.resultados
                    );
                } else {
                    notify.error(`Error en envío masivo: ${resultado.error}`);
                }

            } catch (error) {
                // Cerrar modal de progreso
                this.cerrarModalProgreso(modalProgreso);
                
                console.error('Error en envío masivo:', error);
                notify.error(`Error en envío masivo: ${error.message}`);
            }

        } catch (error) {
            console.error('Error en envío masivo:', error);
            notify.error(`Error en envío masivo: ${error.message}`);
        }
    }

    /**
     * Genera un PDF como blob para envío por correo
     * @param {Object} empleado - Datos del empleado
     * @param {Object} datosPago - Datos de pago
     * @param {Object} planilla - Información de la planilla
     * @returns {Promise<Blob>} - PDF como blob
     */
    async generarPDFBlob(empleado, datosPago, planilla) {
        return new Promise((resolve, reject) => {
            // Crear un contenedor temporal para el comprobante
            const comprobanteHTML = document.createElement('div');
            comprobanteHTML.id = 'comprobante-email-temp';
            comprobanteHTML.style.position = 'fixed';
            comprobanteHTML.style.left = '-9999px';
            comprobanteHTML.style.top = '0';
            comprobanteHTML.style.width = '210mm';
            comprobanteHTML.style.background = 'white';
            comprobanteHTML.style.padding = '20px';
            comprobanteHTML.style.fontFamily = 'Arial, sans-serif';

            // Generar HTML del comprobante (reutilizar lógica existente)
            const fechaInicioObj = new Date(planilla.fechaInicio + 'T00:00:00');
            const fechaFinObj = new Date(planilla.fechaFin + 'T00:00:00');
            const nombreMes = fechaFinObj.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

            comprobanteHTML.innerHTML = `
                <style>
                    .comprobante { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: white; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .empresa-info { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                    .periodo { background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center; font-weight: bold; }
                    .employee-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .employee-details, .payment-details { width: 48%; }
                    .section-title { font-size: 16px; font-weight: bold; background-color: #333; color: white; padding: 8px; margin: 20px 0 10px 0; }
                    .payment-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .payment-table th, .payment-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .payment-table th { background-color: #f2f2f2; font-weight: bold; }
                    .total-row { font-weight: bold; background-color: #e6e6e6; }
                    .salary-net { text-align: center; font-size: 18px; font-weight: bold; background-color: #4CAF50; color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                </style>
                
                <div class="comprobante">
                    <div class="header">
                        <div class="empresa-info">Veterinaria San Martín de Porres</div>
                        <div>Cédula Jurídica: 3-105-761559</div>
                        <div>150 metros este del Mall, Zona Centro, San José, Desamparados, San Rafael Abajo, 10311</div>
                        <div>Tel: 4000-1365 | Email: info@vetsanmartin.com</div>
                    </div>
                    
                    <div class="periodo">PERÍODO DE PAGO: ${this.formatearFecha(planilla.fechaInicio)} al ${this.formatearFecha(planilla.fechaFin)}</div>
                    
                    <div class="employee-info">
                        <div class="employee-details">
                            <strong>EMPLEADO:</strong><br>
                            Nombre: ${empleado.nombre}<br>
                            Cédula: ${empleado.cedula}<br>
                            Puesto: ${empleado.puesto || 'N/A'}<br>
                            Departamento: ${empleado.departamento || 'N/A'}
                        </div>
                        <div class="payment-details">
                            <strong>DETALLES DE PAGO:</strong><br>
                            Fecha de emisión: ${this.formatearFecha(new Date().toISOString().split('T')[0])}<br>
                            Método de pago: ${empleado.metodo_pago || 'Transferencia bancaria'}<br>
                            Cuenta: ${empleado.numero_cuenta || 'N/A'}
                        </div>
                    </div>
                    
                    <div class="section-title">DETALLE DE SALARIOS Y BENEFICIOS</div>
                    <table class="payment-table">
                        <tr><th>Concepto</th><th>Horas/Días</th><th>Tarifa</th><th>Monto</th></tr>
                        <tr>
                            <td>Salario base</td>
                            <td>${datosPago.horasTrabajadas || 0}</td>
                            <td>₡${datosPago.salarioHora || 0}</td>
                            <td>₡${this.formatearMoneda(datosPago.salarioBase || 0)}</td>
                        </tr>
                        ${datosPago.horasExtras > 0 ? `
                        <tr>
                            <td>Horas extras</td>
                            <td>${datosPago.horasExtras}</td>
                            <td>₡${(datosPago.salarioHora * 1.5).toFixed(2)}</td>
                            <td>₡${this.formatearMoneda(datosPago.montoHorasExtras || 0)}</td>
                        </tr>
                        ` : ''}
                    </table>
                    
                    <div class="section-title">DETALLE DE DEDUCCIONES</div>
                    <table class="payment-table">
                        <tr><th>Concepto</th><th>Porcentaje</th><th>Monto</th></tr>
                        <tr>
                            <td>CCSS (Caja Costarricense de Seguro Social)</td>
                            <td>10.67%</td>
                            <td>₡${this.formatearMoneda(datosPago.ccss || 0)}</td>
                        </tr>
                    </table>
                    
                    <div class="section-title">RESUMEN DE PAGO</div>
                    <table class="payment-table">
                        <tr><td><strong>Salario Bruto</strong></td><td colspan="3"><strong>₡${this.formatearMoneda(datosPago.salarioBruto)}</strong></td></tr>
                        <tr><td>Menos: Deducciones</td><td colspan="3">₡${this.formatearMoneda((datosPago.ccss || 0) + (datosPago.deducciones || 0))}</td></tr>
                        <tr class="total-row"><td><strong>Salario Neto a Pagar</strong></td><td colspan="3"><strong>₡${this.formatearMoneda(datosPago.salarioNeto)}</strong></td></tr>
                    </table>
                    
                    <div class="footer">
                        <p>Este comprobante ha sido generado automáticamente por el sistema de planillas.</p>
                        <p>Para consultas contactar a: info@vetsanmartin.com</p>
                        <p>Fecha de generación: ${this.formatearFecha(new Date().toISOString().split('T')[0])}</p>
                    </div>
                </div>
            `;

            document.body.appendChild(comprobanteHTML);

            // Generar PDF con html2canvas
            setTimeout(() => {
                html2canvas(comprobanteHTML, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                }).then(canvas => {
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    
                    const imgWidth = 190;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
                    const y = 5;

                    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);

                    // Convertir a blob
                    const pdfBlob = pdf.output('blob');
                    
                    // Limpiar
                    document.body.removeChild(comprobanteHTML);
                    
                    resolve(pdfBlob);
                }).catch(error => {
                    document.body.removeChild(comprobanteHTML);
                    reject(error);
                });
            }, 100);
        });
    }

    /**
     * Muestra un modal de progreso para el envío masivo
     * @param {number} total - Total de empleados a procesar
     * @returns {HTMLElement} - Elemento del modal
     */
    mostrarModalProgreso(total) {
        const modal = document.createElement('div');
        modal.id = 'modal-progreso-envio';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Enviando Comprobantes de Pago</h5>
                    </div>
                    <div class="modal-body text-center">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">Enviando...</span>
                        </div>
                        <div id="progreso-texto">Preparando envío...</div>
                        <div class="progress mt-3">
                            <div id="progreso-barra" class="progress-bar" role="progressbar" style="width: 0%"></div>
                        </div>
                        <div id="progreso-detalle" class="mt-2 text-muted"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Mostrar modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        return modal;
    }

    /**
     * Actualiza el progreso del modal
     * @param {HTMLElement} modal - Elemento del modal
     * @param {number} actual - Progreso actual
     * @param {number} total - Total
     * @param {string} empleadoActual - Nombre del empleado actual
     */
    actualizarProgresoModal(modal, actual, total, empleadoActual) {
        const porcentaje = Math.round((actual / total) * 100);
        
        const texto = modal.querySelector('#progreso-texto');
        const barra = modal.querySelector('#progreso-barra');
        const detalle = modal.querySelector('#progreso-detalle');

        texto.textContent = `Enviando comprobante ${actual} de ${total}`;
        barra.style.width = `${porcentaje}%`;
        barra.textContent = `${porcentaje}%`;
        detalle.textContent = `Procesando: ${empleadoActual}`;
    }

    /**
     * Cierra el modal de progreso
     * @param {HTMLElement} modal - Elemento del modal
     */
    cerrarModalProgreso(modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
        modal.remove();
    }

    /**
     * Muestra el resumen del envío masivo
     * @param {number} exitosos - Número de envíos exitosos
     * @param {number} errores - Número de errores
     * @param {Array} resultados - Resultados detallados
     */
    mostrarResumenEnvioMasivo(exitosos, errores, resultados) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Resumen de Envío de Comprobantes</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <div class="card text-center ${exitosos > 0 ? 'border-success' : ''}">
                                    <div class="card-body">
                                        <h5 class="card-title text-success">${exitosos}</h5>
                                        <p class="card-text">Enviados</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card text-center ${errores > 0 ? 'border-danger' : ''}">
                                    <div class="card-body">
                                        <h5 class="card-title text-danger">${errores}</h5>
                                        <p class="card-text">Errores</p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h5 class="card-title">${exitosos + errores}</h5>
                                        <p class="card-text">Total</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${errores > 0 ? `
                        <div class="alert alert-warning">
                            <h6>Empleados con errores:</h6>
                            <ul class="mb-0">
                                ${resultados.filter(r => !r.success).map(r => 
                                    `<li><strong>${r.empleado}</strong> (${r.email}): ${r.error}</li>`
                                ).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        ${exitosos > 0 ? `
                        <div class="alert alert-success">
                            <h6>Comprobantes enviados exitosamente a:</h6>
                            <ul class="mb-0">
                                ${resultados.filter(r => r.success).map(r => 
                                    `<li><strong>${r.empleado}</strong> (${r.email})</li>`
                                ).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Mostrar modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        // Limpiar modal cuando se cierre
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Pausa la ejecución por un tiempo determinado
     * @param {number} ms - Milisegundos a pausar
     * @returns {Promise} - Promise que se resuelve después del tiempo
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    contarDiasLaborados(empleadoId, fechaInicio, fechaFin) {
        // Obtener todas las asistencias del empleado en el período
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleadoId &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin
        );
        
        // Contar días laborados según el tipo de asistencia
        let diasLaborados = 0;
        
        asistencias.forEach(asist => {
            if (asist.tipo === 'presente') {
                // Día trabajado normalmente
                diasLaborados++;
            } else if (asist.tipo === 'ausencia') {
                // Solo contar como día laborado si tiene horas especificadas (ausencia parcial)
                const horas = parseFloat(asist.horas || 0);
                if (horas > 0) {
                    diasLaborados++;
                }
                // Si no tiene horas (ausencia completa), no cuenta como día laborado
            } else if (asist.tipo === 'permiso') {
                // Solo contar como día laborado si tiene horas especificadas (permiso parcial)
                const horas = parseFloat(asist.horas || 0);
                if (horas > 0) {
                    diasLaborados++;
                }
                // Si no tiene horas (permiso completo), no cuenta como día laborado
            } else if (asist.tipo === 'tardanza') {
                // Tardanza cuenta como día laborado
                diasLaborados++;
            } else if (asist.tipo === 'vacaciones') {
                // Vacaciones cuenta como día laborado
                diasLaborados++;
            } else if (asist.tipo === 'incapacidad_ccss') {
                // Incapacidad CCSS cuenta como día laborado
                diasLaborados++;
            }
            // incapacidad_ins y libre no cuentan como días laborados
        });
        
        return diasLaborados;
    }

    contarDiasIncapacidadCCSS(empleadoId, fechaActual) {
        // Obtener todas las incapacidades CCSS del empleado ordenadas por fecha
        const incapacidades = this.asistencias
            .filter(a => a.empleadoId === empleadoId && a.tipo === 'incapacidad_ccss')
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
        // Encontrar el grupo de incapacidades consecutivas que incluye la fecha actual
        let diasConsecutivos = 0;
        let fechaInicio = null;
        
        for (let i = 0; i < incapacidades.length; i++) {
            const fechaIncap = new Date(incapacidades[i].fecha);
            const fechaAnterior = i > 0 ? new Date(incapacidades[i-1].fecha) : null;
            
            // Si es la primera incapacidad o hay un salto de más de 1 día, reiniciar contador
            if (!fechaAnterior || (fechaIncap - fechaAnterior) > (24 * 60 * 60 * 1000)) {
                diasConsecutivos = 1;
                fechaInicio = fechaIncap;
            } else {
                diasConsecutivos++;
            }
            
            // Si encontramos la fecha actual, retornar el día dentro de esta secuencia
            if (fechaIncap.getTime() === new Date(fechaActual).getTime()) {
                return diasConsecutivos;
            }
        }
        
        return 1; // Si no se encuentra en una secuencia, asumir día 1
    }

    calcularDeduccionesHorasComprobante(empleadoId, fechaInicio, fechaFin, salarioHora) {
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleadoId &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            (a.tipo === 'permiso' || a.tipo === 'ausencia')
        );

        let totalDeducciones = 0;
        let detalles = [];

        asistencias.forEach(asist => {
            const horasFaltantes = parseFloat(asist.horas || 0);
            if (horasFaltantes > 0) {
                const deduccion = horasFaltantes * salarioHora;
                totalDeducciones += deduccion;
                
                const fechaFormateada = this.formatearFecha(asist.fecha);
                const tipoTexto = asist.tipo === 'permiso' ? 'Permiso' : 'Ausencia';
                detalles.push(`${fechaFormateada} - ${tipoTexto}: ${horasFaltantes}h (₡${this.formatearMoneda(deduccion)})`);
            }
        });

        return {
            total: totalDeducciones,
            detalles: detalles
        };
    }

    calcularDiasLaborales(fechaInicio, fechaFin) {
        const inicio = new Date(fechaInicio + 'T00:00:00');
        const fin = new Date(fechaFin + 'T00:00:00');
        let diasLaborales = 0;
        
        for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
            const diaSemana = fecha.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
            // Contar solo lunes a viernes (1-5)
            if (diaSemana >= 1 && diaSemana <= 5) {
                diasLaborales++;
            }
        }
        
        return diasLaborales;
    }

    calcularHorasFeriado(empleadoId, fechaInicio, fechaFin) {
        let horasFeriado = 0;
        const feriadosFechas = this.feriados.map(f => f.fecha);
        
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleadoId &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            a.tipo === 'presente' &&
            feriadosFechas.includes(a.fecha)
        );
        
        asistencias.forEach(a => {
            horasFeriado += parseFloat(a.horas || 0);
        });
        
        return horasFeriado;
    }

    calcularHorasExtraFeriado(empleadoId, fechaInicio, fechaFin) {
        let horasExtraFeriado = 0;
        const feriadosFechas = this.feriados.map(f => f.fecha);
        
        const asistencias = this.asistencias.filter(a => 
            a.empleadoId === empleadoId &&
            a.fecha >= fechaInicio &&
            a.fecha <= fechaFin &&
            feriadosFechas.includes(a.fecha)
        );
        
        asistencias.forEach(a => {
            horasExtraFeriado += parseFloat(a.horasExtra || 0);
        });
        
        return horasExtraFeriado;
    }

    exportarReportePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const titulo = document.getElementById('reporteTitulo').textContent;
        doc.setFontSize(16);
        doc.text(titulo, 14, 20);

        const thead = document.getElementById('reporteTableHead');
        const tbody = document.getElementById('reporteTableBody');

        const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent);
        const data = Array.from(tbody.querySelectorAll('tr')).map(tr => 
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
        );

        doc.autoTable({
            startY: 30,
            head: [headers],
            body: data
        });

        const fecha = new Date().toISOString().split('T')[0];
        doc.save(`reporte_${fecha}.pdf`);
    }


    // ============================================
    // REGISTRO AUTOMÁTICO DE ASISTENCIAS
    // ============================================

    registrarAsistenciasAutomaticas(empleadoId, fechaInicio, fechaFin) {
        const empleado = this.empleados.find(e => e.id === empleadoId);
        if (!empleado || !empleado.horario) {
            alert('El empleado no tiene horario definido');
            return;
        }

        const diasTrabajo = this.extraerDiasTrabajo(empleado.horario);
        const fechas = this.generarFechasEntre(fechaInicio, fechaFin);
        let registrosCreados = 0;

        fechas.forEach(fecha => {
            const diaSemana = this.getDiaSemana(fecha);
            const asistenciaExistente = this.asistencias.find(a => 
                a.empleadoId === empleadoId && a.fecha === fecha
            );

            if (!asistenciaExistente) {
                if (diasTrabajo.includes(diaSemana)) {
                    // Usar las horas VISUALES (reales trabajadas) para el registro
                    const horasVisuales = this.getHorasVisualesJornada(empleado.jornada, diaSemana, empleado.horario);
                    
                    this.agregarAsistencia({
                        empleadoId: empleadoId,
                        fecha: fecha,
                        tipo: 'presente',
                        horas: horasVisuales,
                        horasExtra: 0,
                        detalle: ''
                    });
                    registrosCreados++;
                } else {
                    this.agregarAsistencia({
                        empleadoId: empleadoId,
                        fecha: fecha,
                        tipo: 'libre',
                        horas: 0,
                        horasExtra: 0,
                        detalle: `Día libre - ${diaSemana}`
                    });
                    registrosCreados++;
                }
            }
        });

        notify.success(`Se crearon ${registrosCreados} registros de asistencia automática`);
        this.renderAsistencias();
    }

    extraerDiasTrabajo(horario) {
        const dias = [];
        const horarioLower = horario.toLowerCase();
        
        const mapeoDias = {
            'lunes': 'lunes', 'monday': 'lunes',
            'martes': 'martes', 'tuesday': 'martes',
            'miércoles': 'miércoles', 'miercoles': 'miércoles', 'wednesday': 'miércoles',
            'jueves': 'jueves', 'thursday': 'jueves',
            'viernes': 'viernes', 'friday': 'viernes',
            'sábado': 'sábado', 'sabado': 'sábado', 'saturday': 'sábado',
            'domingo': 'domingo', 'sunday': 'domingo'
        };

        Object.keys(mapeoDias).forEach(dia => {
            if (horarioLower.includes(dia)) {
                dias.push(mapeoDias[dia]);
            }
        });

        const rangos = horarioLower.match(/(\w+)\s+a\s+(\w+)/g);
        if (rangos) {
            rangos.forEach(rango => {
                const match = rango.match(/(\w+)\s+a\s+(\w+)/);
                if (match) {
                    const inicio = mapeoDias[match[1]];
                    const fin = mapeoDias[match[2]];
                    if (inicio && fin) {
                        const todosDias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                        const indiceInicio = todosDias.indexOf(inicio);
                        const indiceFin = todosDias.indexOf(fin);
                        
                        if (indiceInicio !== -1 && indiceFin !== -1) {
                            for (let i = indiceInicio; i <= indiceFin; i++) {
                                if (!dias.includes(todosDias[i])) {
                                    dias.push(todosDias[i]);
                                }
                            }
                        }
                    }
                }
            });
        }

        const diasUnicos = [...new Set(dias)];
        return diasUnicos;
    }

    generarFechasEntre(fechaInicio, fechaFin) {
        const fechas = [];
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        
        for (let fecha = new Date(inicio); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
            fechas.push(fecha.toISOString().split('T')[0]);
        }
        
        return fechas;
    }

    getDiaSemana(fecha) {
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const [año, mes, dia] = fecha.split('-').map(Number);
        const fechaObj = new Date(año, mes - 1, dia);
        return dias[fechaObj.getDay()];
    }

    calcularHorasSegunJornada(jornada, diaSemana, horario) {
        // Para jornadas acumulativas: trabajan más horas pero se registran menos
        if (jornada === 'diurna_acumulativa' || jornada === 'acumulativa') {
            // Trabajan 10 horas pero se pagan 8 horas
            // Si el horario especifica algo diferente, respetar eso
            if (horario && horario.toLowerCase().includes(diaSemana.toLowerCase())) {
                const match = horario.match(new RegExp(diaSemana + '[^:]*:?\\s*(\\d+)', 'i'));
                if (match) {
                    const horasTrabajadas = parseInt(match[1]);
                    // Si son acumulativas, ajustar a horas pagadas (80% de las trabajadas)
                    return Math.round(horasTrabajadas * 0.8);
                }
            }
            // Default: devolver horas PAGADAS (8), no trabajadas (10)
            return 8;
        }
        
        if (jornada === 'mixta_acumulativa') {
            // Trabajan entre 8-9 horas pero se pagan 8 horas
            if (horario && horario.toLowerCase().includes(diaSemana.toLowerCase())) {
                const match = horario.match(new RegExp(diaSemana + '[^:]*:?\\s*(\\d+)', 'i'));
                if (match) {
                    const horasTrabajadas = parseInt(match[1]);
                    // Siempre pagar 8 horas máximo
                    return Math.min(horasTrabajadas, 8);
                }
            }
            // Default: devolver horas PAGADAS (8), no trabajadas (8-9)
            return 8;
        }
        
        // Para el resto de jornadas, usar las horas estándar (que son las pagadas)
        return this.getHorasJornada(jornada);
    }

    // Nueva función para obtener las horas VISUALES (horas reales trabajadas)
    getHorasVisualesJornada(jornada, diaSemana, horario) {
        // Función mejorada para extraer horas del horario del empleado
        const extraerHorasDelHorario = (horario, diaSemana) => {
            if (!horario) {
                return null;
            }
            
            const horarioLower = horario.toLowerCase();
            const diaLower = diaSemana.toLowerCase();
            
            // Buscar patrones como:
            // "martes a viernes: 7:00 a 5:00" -> 10 horas
            // "sábado: 8:00 a 4:00" -> 8 horas
            // "lunes: 8:00 a 5:00" -> 9 horas
            
            // Patrón 2: "día a día: hora1 a hora2" (para rangos como "martes a viernes") - PRIORITARIO
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const diaIndex = diasSemana.indexOf(diaLower);
            
            if (diaIndex >= 0) {
                // Intentar encontrar múltiples rangos o días en el horario
                const patron2 = new RegExp(`(\\w+)\\s*a\\s*(\\w+)\\s*:?\\s*(\\d{1,2})(?::?(\\d{2}))?\\s*a\\s*(\\d{1,2})(?::?(\\d{2}))?`, 'gi');
                let match2;
                while ((match2 = patron2.exec(horarioLower)) !== null) {
                    const diaInicio = diasSemana.indexOf(match2[1].toLowerCase());
                    const diaFin = diasSemana.indexOf(match2[2].toLowerCase());
                    const horaInicio = parseInt(match2[3]);
                    const minInicio = match2[4] ? parseInt(match2[4]) : 0;
                    const horaFin = parseInt(match2[5]);
                    const minFin = match2[6] ? parseInt(match2[6]) : 0;
                    
                    // Verificar si el día actual está en el rango
                    if (diaInicio >= 0 && diaFin >= 0 && diaIndex >= diaInicio && diaIndex <= diaFin) {
                        let horas = horaFin - horaInicio;
                        const minutos = minFin - minInicio;
                        horas += minutos / 60;
                        return Math.abs(horas);
                    }
                }
            }
            
            // Patrón 1: "día: hora1 a hora2" (días individuales) - formato original
            const patron1 = new RegExp(`${diaLower}\\s*:?\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}\\s*a\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}`, 'i');
            const match1 = horarioLower.match(patron1);
            if (match1) {
                const horaInicio = parseInt(match1[1]);
                const horaFin = parseInt(match1[2]);
                const horas = Math.abs(horaFin - horaInicio);
                return horas;
            }
            
            // Patrón 1b: "día: hora1 AM - hora2 PM" (formato con AM/PM y guión)
            const patron1b = new RegExp(`${diaLower}\\s*:?\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}\\s*(a\\.?m\\.?)?\\s*-\\s*(\\d{1,2})\\s*:?\\s*\\d{0,2}\\s*(p\\.?m\\.?)?`, 'i');
            const match1b = horarioLower.match(patron1b);
            if (match1b) {
                let horaInicio = parseInt(match1b[1]);
                let horaFin = parseInt(match1b[3]);
                
                const tieneAM = match1b[2]; // Captura si hay "a.m" en hora inicio
                const tienePM = match1b[4]; // Captura si hay "p.m" en hora fin
                
                // Convertir PM a formato 24h
                if (tienePM && horaFin < 12) {
                    horaFin += 12;
                }
                
                // Si la hora de inicio es PM también
                if (tieneAM === undefined && horaInicio >= 12) {
                    // Ya está en formato 24h
                } else if (!tieneAM && !tienePM && horaInicio < horaFin) {
                    // Caso sin AM/PM explícito, asumir que está bien
                }
                
                const horas = Math.abs(horaFin - horaInicio);
                return horas;
            }
            
            // Patrón 3: "día: X horas" (horas explícitas)
            const patron3 = new RegExp(`${diaLower}\\s*:?\\s*(\\d+)\\s*horas?`, 'i');
            const match3 = horarioLower.match(patron3);
            if (match3) {
                const horas = parseInt(match3[1]);
                return horas;
            }
            
            // Patrón 4: "día: Libre" (día libre)
            const patron4 = new RegExp(`${diaLower}\\s*:?\\s*libre`, 'i');
            const match4 = horarioLower.match(patron4);
            if (match4) {
                return 0;
            }
            
            return null;
        };
        
            // Para jornadas acumulativas: usar el horario del empleado
            if (jornada === 'diurna_acumulativa' || jornada === 'acumulativa' || jornada === 'mixta_acumulativa') {
                // Intentar extraer horas del horario del empleado
                const horasDelHorario = extraerHorasDelHorario(horario, diaSemana);
                if (horasDelHorario !== null) {
                    return horasDelHorario;
                }
            
            // Si no se encuentra en el horario, usar valores por defecto genéricos
            // IMPORTANTE: Siempre es mejor que el horario del empleado esté bien definido
            // Estos son valores de respaldo que pueden no coincidir con el horario real
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const diaIndex = diasSemana.indexOf(diaSemana.toLowerCase());
            
            if (jornada === 'diurna_acumulativa' || jornada === 'acumulativa') {
                // Por defecto: 10 horas para días laborales típicos, 0 para fines de semana
                // NOTA: Esto es un fallback - el horario del empleado debe estar definido correctamente
                if (diaIndex >= 1 && diaIndex <= 5) { // Lunes a Viernes
                    return 10;
                } else { // Sábado y Domingo
                    return 0;
                }
            } else if (jornada === 'mixta_acumulativa') {
                // Por defecto: 9 horas para días laborales típicos
                if (diaIndex >= 1 && diaIndex <= 5) { // Lunes a Viernes
                    return 9;
                } else { // Sábado y Domingo
                    return 0;
                }
            }
        }
        
        // Para el resto de jornadas, las horas visuales son iguales a las pagadas
        return this.getHorasJornada(jornada);
    }

    abrirModalRegistroAutomatico() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Registro Automático de Asistencias</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="formRegistroAutomatico">
                        <div class="form-group">
                            <label>Empleado *</label>
                            <select id="autoEmpleado" class="form-control" required>
                                <option value="">Seleccione un empleado</option>
                                ${this.empleados.map(emp => 
                                    `<option value="${emp.id}">${emp.nombre} - ${emp.horario ? 'Con horario' : 'Sin horario'}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fecha Inicio *</label>
                            <input type="date" id="autoFechaInicio" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha Fin *</label>
                            <input type="date" id="autoFechaFin" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <div class="alert alert-info">
                                <strong>Instrucciones:</strong><br>
                                • Seleccione un empleado que tenga horario definido<br>
                                • El sistema registrará automáticamente asistencias para los días de trabajo<br>
                                • No se sobrescribirán asistencias existentes
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                            <button type="submit" class="btn btn-success">Registrar Asistencias</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const hoy = new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
        
        document.getElementById('autoFechaInicio').value = inicioSemana.toISOString().split('T')[0];
        document.getElementById('autoFechaFin').value = hoy.toISOString().split('T')[0];

        document.getElementById('formRegistroAutomatico').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const empleadoId = document.getElementById('autoEmpleado').value;
            const fechaInicio = document.getElementById('autoFechaInicio').value;
            const fechaFin = document.getElementById('autoFechaFin').value;

            if (!empleadoId || !fechaInicio || !fechaFin) {
                notify.warning('Por favor complete todos los campos');
                return;
            }

            this.registrarAsistenciasAutomaticas(empleadoId, fechaInicio, fechaFin);
            modal.remove();
        });
    }

    // ============================================
    // UTILIDADES
    // ============================================

    formatearMoneda(valor) {
        return parseFloat(valor).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    formatearFecha(fecha) {
        if (!fecha) return '';
        const date = new Date(fecha + 'T00:00:00');
        return date.toLocaleDateString('es-CR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    formatJornada(jornada) {
        const jornadas = {
            'diurna': 'Diurna (8h)',
            'mixta': 'Mixta (7h)',
            'nocturna': 'Nocturna (6h)',
            'diurna_acumulativa': 'Diurna Acumulativa',
            'mixta_acumulativa': 'Mixta Acum. (8-9h→8h)',
            'acumulativa': 'Acumulativa' // Compatibilidad con datos antiguos
        };
        return jornadas[jornada] || jornada;
    }

    formatTipo(tipo) {
        const tipos = {
            'presente': 'Presente',
            'ausencia': 'Ausencia',
            'tardanza': 'Tardanza',
            'permiso': 'Permiso',
            'incapacidad_ccss': 'Incapacidad CCSS',
            'incapacidad_ins': 'Incapacidad INS',
            'vacaciones': 'Vacaciones',
            'libre': 'Libre'
        };
        return tipos[tipo] || tipo;
    }

    getBadgeClaseTipo(tipo) {
        const clases = {
            'presente': 'badge-success',
            'ausencia': 'badge-danger',
            'tardanza': 'badge-warning',
            'permiso': 'badge-info',
            'incapacidad_ccss': 'badge-warning',
            'incapacidad_ins': 'badge-warning',
            'vacaciones': 'badge-info',
            'libre': 'badge-info'
        };
        return clases[tipo] || 'badge-info';
    }

    actualizarFecha() {
        const fecha = new Date().toLocaleDateString('es-CR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        document.getElementById('currentDate').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    }

    actualizarSelectsEmpleados() {
        const selects = [
            document.getElementById('asistenciaEmpleado'),
            document.getElementById('bonoEmpleado'),
            document.getElementById('vacacionEmpleado'),
            document.getElementById('filtroEmpleadoAsistencia'),
            document.getElementById('filtroEmpleadoBono')
        ];

        selects.forEach(select => {
            if (select) {
                const valorActual = select.value;
                const opciones = this.empleados.map(emp => 
                    `<option value="${emp.id}">${emp.nombre} - ${emp.cedula}</option>`
                ).join('');
                
                if (select.id.startsWith('filtro')) {
                    select.innerHTML = '<option value="">Todos los empleados</option>' + opciones;
                } else {
                    select.innerHTML = '<option value="">Seleccione un empleado</option>' + opciones;
                }
                
                select.value = valorActual;
            }
        });
    }

    // ============================================
    // MODALES
    // ============================================

    abrirModal(modalId) {
        // Usar el nuevo sistema de modales centrados
        if (window.modalManager) {
            window.modalManager.showModal(modalId);
        } else {
            // Fallback para compatibilidad
        const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.classList.add('show');
            }
        }
    }

    cerrarModal(modalId) {
        // Usar el nuevo sistema de modales centrados
        if (window.modalManager) {
            window.modalManager.closeModal(modalId);
        } else {
            // Fallback para compatibilidad
        const modal = document.getElementById(modalId);
            if (modal) {
        modal.style.display = 'none';
                modal.classList.remove('show');
            }
        }
    }

    abrirEditarEmpleado(id) {
        const empleado = this.empleados.find(e => e.id === id);
        if (!empleado) return;

        document.getElementById('modalEmpleadoTitulo').textContent = 'Editar Empleado';
        document.getElementById('empleadoId').value = empleado.id;
        document.getElementById('empleadoCedula').value = empleado.cedula;
        document.getElementById('empleadoNombre').value = empleado.nombre;
        document.getElementById('empleadoPuesto').value = empleado.puesto;
        document.getElementById('empleadoJornada').value = empleado.jornada;
        document.getElementById('empleadoSalarioHora').value = empleado.salarioHora;
        document.getElementById('empleadoFechaIngreso').value = empleado.fechaIngreso;
        document.getElementById('empleadoHorario').value = empleado.horario || '';
        document.getElementById('empleadoTelefono').value = empleado.telefono || '';
        document.getElementById('empleadoEmail').value = empleado.email || '';
        document.getElementById('empleadoEmpresa').value = empleado.empresa || '';
        document.getElementById('empleadoDepositadoEn').value = empleado.depositadoEn || '';
        document.getElementById('empleadoDepartamento').value = empleado.departamento || '';

        this.abrirModal('modalEmpleado');
    }

    abrirEditarAsistencia(id) {
        const asistencia = this.asistencias.find(a => a.id === id);
        if (!asistencia) return;

        document.getElementById('asistenciaId').value = asistencia.id;
        document.getElementById('asistenciaEmpleado').value = asistencia.empleadoId;
        document.getElementById('asistenciaFecha').value = asistencia.fecha;
        document.getElementById('asistenciaTipo').value = asistencia.tipo;
        document.getElementById('asistenciaHoras').value = asistencia.horas || '';
        document.getElementById('asistenciaHorasExtra').value = asistencia.horasExtra || '';
        document.getElementById('asistenciaDetalle').value = asistencia.detalle || '';

        this.abrirModal('modalAsistencia');
    }

    abrirEditarBono(id) {
        const bono = this.bonos.find(b => b.id === id);
        if (!bono) return;

        document.getElementById('bonoId').value = bono.id;
        document.getElementById('bonoEmpleado').value = bono.empleadoId;
        document.getElementById('bonoTipo').value = bono.tipo;
        document.getElementById('bonoConcepto').value = bono.concepto;
        document.getElementById('bonoMonto').value = bono.monto;
        document.getElementById('bonoFecha').value = bono.fecha;

        this.abrirModal('modalBono');
    }

    abrirEditarFeriado(id) {
        console.log('🔧 Abriendo edición de feriado:', id);
        const feriado = this.feriados.find(f => f.id === id);
        if (!feriado) {
            console.error('❌ Feriado no encontrado:', id);
            return;
        }

        console.log('✅ Feriado encontrado:', feriado);
        document.getElementById('feriadoId').value = feriado.id;
        document.getElementById('feriadoFecha').value = feriado.fecha;
        document.getElementById('feriadoDescripcion').value = feriado.descripcion;
        document.getElementById('feriadoRecargo').value = feriado.recargo;

        console.log('🎯 Abriendo modal...');
        this.abrirModal('modalFeriado');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    initEventListeners() {
        // Evitar inicializar múltiples veces
        if (this.eventListenersInitialized) {
            return;
        }
        
        // Navegación
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.cambiarSeccion(section);
            });
        });

        // Toggle sidebar (ahora manejado por ModalManager en móviles)
        // En desktop sigue funcionando con CSS

        // Modales - cerrar (ahora manejado por ModalManager)
        // Los event listeners se manejan automáticamente en Modal.js

        // Empleados
        document.getElementById('btnNuevoEmpleado')?.addEventListener('click', () => {
            document.getElementById('formEmpleado').reset();
            document.getElementById('empleadoId').value = '';
            document.getElementById('modalEmpleadoTitulo').textContent = 'Nuevo Empleado';
            this.abrirModal('modalEmpleado');
        });

        document.getElementById('formEmpleado')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('empleadoId').value;
            const datos = {
                cedula: document.getElementById('empleadoCedula').value,
                nombre: document.getElementById('empleadoNombre').value,
                puesto: document.getElementById('empleadoPuesto').value,
                jornada: document.getElementById('empleadoJornada').value,
                salarioHora: parseFloat(document.getElementById('empleadoSalarioHora').value),
                fechaIngreso: document.getElementById('empleadoFechaIngreso').value,
                horario: document.getElementById('empleadoHorario').value,
                telefono: document.getElementById('empleadoTelefono').value,
                email: document.getElementById('empleadoEmail').value,
                empresa: document.getElementById('empleadoEmpresa').value,
                depositadoEn: document.getElementById('empleadoDepositadoEn').value,
                departamento: document.getElementById('empleadoDepartamento').value
            };

            if (id) {
                this.editarEmpleado(id, datos);
            } else {
                this.agregarEmpleado(datos);
            }

            this.cerrarModal('modalEmpleado');
        });

        document.getElementById('searchEmpleado')?.addEventListener('input', (e) => {
            this.aplicarFiltrosEmpleados();
        });

        // Filtro por empresa en empleados
        document.getElementById('filtroEmpresa')?.addEventListener('change', () => {
            this.aplicarFiltrosEmpleados();
        });

        // Botón limpiar filtros
        document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
            document.getElementById('searchEmpleado').value = '';
            document.getElementById('filtroEmpresa').value = '';
            this.renderEmpleados();
        });

        // Asistencias
        document.getElementById('btnNuevaAsistencia')?.addEventListener('click', () => {
            document.getElementById('formAsistencia').reset();
            document.getElementById('asistenciaId').value = '';
            document.getElementById('asistenciaFecha').value = new Date().toISOString().split('T')[0];
            this.abrirModal('modalAsistencia');
        });

        document.getElementById('btnAsistenciaAutomatica')?.addEventListener('click', () => {
            this.abrirModalRegistroAutomatico();
        });

        // Auto-llenar horas según jornada cuando se selecciona empleado en modal de asistencia
        document.getElementById('asistenciaEmpleado')?.addEventListener('change', () => {
            const empId = document.getElementById('asistenciaEmpleado').value;
            if (empId) {
                const empleado = this.empleados.find(e => e.id === empId);
                if (empleado) {
                    // Obtener la fecha seleccionada para calcular el día de la semana
                    const fechaInput = document.getElementById('asistenciaFecha');
                    const fecha = fechaInput ? fechaInput.value : new Date().toISOString().split('T')[0];
                    const diaSemana = this.getDiaSemana(fecha);
                    
                    // Usar la función corregida para obtener las horas visuales según el día
                    const horasSugeridas = this.getHorasVisualesJornada(empleado.jornada, diaSemana, empleado.horario);
                    
                    const horasInput = document.getElementById('asistenciaHoras');
                    if (horasInput && !horasInput.value) {
                        horasInput.value = horasSugeridas;
                    }
                }
            }
        });

        // Cambiar etiqueta del campo de horas según el tipo de asistencia
        document.getElementById('asistenciaTipo')?.addEventListener('change', () => {
            const tipo = document.getElementById('asistenciaTipo').value;
            const labelHoras = document.querySelector('label[for="asistenciaHoras"]');
            
            if (tipo === 'permiso') {
                if (labelHoras) {
                    labelHoras.textContent = 'Horas de Permiso';
                }
            } else if (tipo === 'ausencia') {
                if (labelHoras) {
                    labelHoras.textContent = 'Horas de Ausencia';
                }
            } else {
                if (labelHoras) {
                    labelHoras.textContent = 'Horas Trabajadas';
                }
            }
        });

        // Auto-llenar horas cuando se cambia la fecha en el modal de asistencia
        document.getElementById('asistenciaFecha')?.addEventListener('change', () => {
            const empId = document.getElementById('asistenciaEmpleado').value;
            const tipo = document.getElementById('asistenciaTipo').value;
            
            if (empId && tipo !== 'permiso' && tipo !== 'ausencia') {
                const empleado = this.empleados.find(e => e.id === empId);
                if (empleado) {
                    const fechaInput = document.getElementById('asistenciaFecha');
                    const fecha = fechaInput ? fechaInput.value : new Date().toISOString().split('T')[0];
                    const diaSemana = this.getDiaSemana(fecha);
                    
                    const horasSugeridas = this.getHorasVisualesJornada(empleado.jornada, diaSemana, empleado.horario);
                    
                    const horasInput = document.getElementById('asistenciaHoras');
                    if (horasInput) {
                        horasInput.value = horasSugeridas;
                    }
                }
            }
        });

        document.getElementById('formAsistencia')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('asistenciaId').value;
            const datos = {
                empleadoId: document.getElementById('asistenciaEmpleado').value,
                fecha: document.getElementById('asistenciaFecha').value,
                tipo: document.getElementById('asistenciaTipo').value,
                horas: parseFloat(document.getElementById('asistenciaHoras').value) || 0,
                horasExtra: parseFloat(document.getElementById('asistenciaHorasExtra').value) || 0,
                detalle: document.getElementById('asistenciaDetalle').value
            };

            if (id) {
                this.editarAsistencia(id, datos);
            } else {
                this.agregarAsistencia(datos);
            }

            this.cerrarModal('modalAsistencia');
        });

        // Filtros automáticos para asistencias
        document.getElementById('filtroEmpleadoAsistencia')?.addEventListener('change', () => {
            this.aplicarFiltrosAsistencias();
        });

        document.getElementById('filtroFechaInicio')?.addEventListener('change', () => {
            this.aplicarFiltrosAsistencias();
        });

        document.getElementById('filtroFechaFin')?.addEventListener('change', () => {
            this.aplicarFiltrosAsistencias();
        });

        // Bonos
        document.getElementById('btnNuevoBono')?.addEventListener('click', () => {
            document.getElementById('formBono').reset();
            document.getElementById('bonoId').value = '';
            document.getElementById('bonoFecha').value = new Date().toISOString().split('T')[0];
            this.abrirModal('modalBono');
        });

        document.getElementById('formBono')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('bonoId').value;
            const datos = {
                empleadoId: document.getElementById('bonoEmpleado').value,
                tipo: document.getElementById('bonoTipo').value,
                concepto: document.getElementById('bonoConcepto').value,
                monto: parseFloat(document.getElementById('bonoMonto').value),
                fecha: document.getElementById('bonoFecha').value,
                periodo: document.getElementById('bonoPeriodo').value
            };

            if (id) {
                this.editarBono(id, datos);
            } else {
                this.agregarBono(datos);
            }

            this.cerrarModal('modalBono');
        });

        // Filtros automáticos para bonos
        document.getElementById('filtroEmpleadoBono')?.addEventListener('change', () => {
            this.aplicarFiltrosBonos();
        });

        document.getElementById('filtroTipoBono')?.addEventListener('change', () => {
            this.aplicarFiltrosBonos();
        });

        // Planillas
        document.getElementById('btnGenerarPlanilla')?.addEventListener('click', () => {
            const periodo = document.getElementById('periodoPlanilla').value;
            const fechaInicio = document.getElementById('fechaInicioPlanilla').value;
            const fechaFin = document.getElementById('fechaFinPlanilla').value;
            const empresaFiltro = document.getElementById('filtroEmpresaPlanilla').value;

            if (!fechaInicio || !fechaFin) {
                notify.warning('Por favor seleccione las fechas de inicio y fin');
                return;
            }

            const planilla = this.calcularPlanilla(periodo, fechaInicio, fechaFin, empresaFiltro);
            this.renderPlanilla(planilla);
        });

        document.getElementById('btnExportarExcel')?.addEventListener('click', () => {
            if (this.ultimaPlanilla) {
                this.exportarExcel(this.ultimaPlanilla);
            }
        });

        document.getElementById('btnExportarPDF')?.addEventListener('click', () => {
            if (this.ultimaPlanilla) {
                this.exportarPDF(this.ultimaPlanilla);
            }
        });

        document.getElementById('btnGuardarPlanilla')?.addEventListener('click', () => {
            this.guardarPlanillaEnHistorial();
        });

        // Botón de envío masivo de comprobantes
        document.getElementById('btnEnviarMasivo')?.addEventListener('click', () => {
            const periodo = document.getElementById('periodoPlanilla').value;
            const fechaInicio = document.getElementById('fechaInicioPlanilla').value;
            const fechaFin = document.getElementById('fechaFinPlanilla').value;
            
            if (!fechaInicio || !fechaFin) {
                notify.error('Por favor seleccione las fechas de inicio y fin del período');
                return;
            }
            
            this.enviarComprobantesMasivo(periodo, fechaInicio, fechaFin);
        });

        // Pestañas de Empleados
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.tab;
                
                // Cambiar estado activo de las pestañas
                document.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.color = 'var(--gray-600)';
                    b.style.borderBottomColor = 'transparent';
                });
                btn.classList.add('active');
                btn.style.color = 'var(--primary-color)';
                btn.style.borderBottomColor = 'var(--primary-color)';
                
                // Mostrar/ocultar contenido
                document.querySelectorAll('.tab-panel').forEach(panel => {
                    panel.style.display = 'none';
                });
                const targetPanel = document.getElementById(`tab-${tab}`);
                if (targetPanel) {
                    targetPanel.style.display = 'block';
                }
                
                // Si es la pestaña de historial, cargar empleados y renderizar
                if (tab === 'historial') {
                    const filtroEmpleado = document.getElementById('filtroEmpleadoHistorial');
                    if (filtroEmpleado && filtroEmpleado.options.length === 1) {
                        // Cargar opciones de empleados
                        this.empleados.forEach(emp => {
                            const option = document.createElement('option');
                            option.value = emp.id;
                            option.textContent = emp.nombre;
                            filtroEmpleado.appendChild(option);
                        });
                    }
                    this.renderHistorialPlanillas();
                }
            });
        });

        // Filtro de historial por empleado
        document.getElementById('filtroEmpleadoHistorial')?.addEventListener('change', (e) => {
            this.renderHistorialPlanillas(e.target.value);
        });

        // Reportes
        document.querySelectorAll('.report-card button').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const reportCard = btn.closest('.report-card');
                const reportId = reportCard.id;
                
                if (reportId === 'reporteVacaciones') {
                    this.generarReporteVacaciones();
                } else if (reportId === 'reporteAguinaldo') {
                    this.generarReporteAguinaldo();
                } else if (reportId === 'reporteConstancias') {
                    this.cambiarSeccion('reportes');
                    // Cargar la vista de constancias después de cambiar la sección
                    setTimeout(() => {
                        this.cargarVistaConstancias();
                    }, 100);
                } else if (reportId === 'reporteIncapacidades') {
                    this.generarReporteIncapacidades();
                }
            });
        });

        document.getElementById('btnCerrarReporte')?.addEventListener('click', () => {
            this.cerrarReporte();
        });

        document.getElementById('btnExportarReportePDF')?.addEventListener('click', () => {
            this.exportarReportePDF();
        });

        // Feriados
        document.getElementById('btnNuevoFeriado')?.addEventListener('click', () => {
            document.getElementById('formFeriado').reset();
            document.getElementById('feriadoId').value = '';
            this.abrirModal('modalFeriado');
        });

        document.getElementById('formFeriado')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('feriadoId').value;
            const datos = {
                fecha: document.getElementById('feriadoFecha').value,
                descripcion: document.getElementById('feriadoDescripcion').value,
                recargo: parseInt(document.getElementById('feriadoRecargo').value)
            };

            if (id) {
                this.editarFeriado(id, datos);
            } else {
                this.agregarFeriado(datos);
            }

            this.cerrarModal('modalFeriado');
        });

        // Vacaciones
        document.getElementById('btnNuevaVacacion')?.addEventListener('click', () => {
            document.getElementById('formVacaciones').reset();
            document.getElementById('vacacionId').value = '';
            document.getElementById('vacacionTomada').checked = false;
            this.actualizarSelectsEmpleados();
            this.abrirModal('modalVacaciones');
        });

        // Calcular días automáticamente cuando cambian las fechas
        const calcularDiasVacaciones = () => {
            const fechaInicio = document.getElementById('vacacionFechaInicio').value;
            const fechaFin = document.getElementById('vacacionFechaFin').value;
            
            if (fechaInicio && fechaFin) {
                const inicio = new Date(fechaInicio);
                const fin = new Date(fechaFin);
                const diferencia = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
                document.getElementById('vacacionDias').value = diferencia > 0 ? diferencia : 0;
            }
        };

        document.getElementById('vacacionFechaInicio')?.addEventListener('change', calcularDiasVacaciones);
        document.getElementById('vacacionFechaFin')?.addEventListener('change', calcularDiasVacaciones);

        document.getElementById('formVacaciones')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('vacacionId').value;
            const datos = {
                empleadoId: document.getElementById('vacacionEmpleado').value,
                fechaInicio: document.getElementById('vacacionFechaInicio').value,
                fechaFin: document.getElementById('vacacionFechaFin').value,
                dias: parseInt(document.getElementById('vacacionDias').value),
                detalle: document.getElementById('vacacionDetalle').value,
                tomada: document.getElementById('vacacionTomada').checked
            };

            if (id) {
                this.editarVacacion(id, datos);
            } else {
                this.agregarVacacion(datos);
            }

            this.cerrarModal('modalVacaciones');
        });

        // Configuración
        document.getElementById('btnGuardarConfig')?.addEventListener('click', () => {
            this.config.ccss = parseFloat(document.getElementById('configCCSS').value);
            this.config.incapacidadCCSS = parseInt(document.getElementById('configIncapCCSS').value);
            this.config.incapacidadINS = parseInt(document.getElementById('configIncapINS').value);
            this.guardarDatos();
            notify.success('Configuración guardada exitosamente');
        });

        // Configuración EmailJS
        document.getElementById('btnConfigurarEmailJS')?.addEventListener('click', () => {
            this.configurarEmailJS();
        });

        document.getElementById('btnProbarEmailJS')?.addEventListener('click', () => {
            this.probarEmailJS();
        });

        document.getElementById('btnLimpiarDatos')?.addEventListener('click', async () => {
            const confirmado = await confirmDialog.show(
                '¿Está seguro de eliminar TODOS los datos? Esta acción no se puede deshacer y se perderá toda la información del sistema.',
                '⚠️ PELIGRO: Eliminar Todos los Datos',
                'danger',
                {
                    confirmText: 'ELIMINAR TODO',
                    cancelText: 'Cancelar',
                    confirmClass: 'btn-danger'
                }
            );
            
            if (confirmado) {
                try {
                    loadingOverlay.show();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                localStorage.clear();
                    loadingOverlay.hide();
                    
                    notify.warning('Todos los datos han sido eliminados');
                    
                    setTimeout(() => {
                location.reload();
                    }, 2000);
                } catch (error) {
                    loadingOverlay.hide();
                    notify.error('Error al eliminar los datos');
                }
            }
        });

        document.getElementById('btnExportarDatos')?.addEventListener('click', () => {
            const datos = {
                empleados: this.empleados,
                asistencias: this.asistencias,
                bonos: this.bonos,
                feriados: this.feriados,
                config: this.config
            };
            const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_planillas_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        });

        document.getElementById('btnImportarDatos')?.addEventListener('click', () => {
            document.getElementById('inputImportarDatos').click();
        });

        document.getElementById('inputImportarDatos')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const datos = JSON.parse(event.target.result);
                        this.empleados = datos.empleados || [];
                        this.asistencias = datos.asistencias || [];
                        this.bonos = datos.bonos || [];
                        this.feriados = datos.feriados || [];
                        this.config = datos.config || this.config;
                        this.guardarDatos();
                        notify.success('Datos importados exitosamente');
                        setTimeout(() => location.reload(), 1500);
                    } catch (error) {
                        notify.error('Error al importar datos: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        });

        // Cargar datos iniciales
        document.getElementById('configCCSS').value = this.config.ccss;
        document.getElementById('configIncapCCSS').value = this.config.incapacidadCCSS;
        document.getElementById('configIncapINS').value = this.config.incapacidadINS;

        // Configurar fechas por defecto para planilla
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        document.getElementById('fechaInicioPlanilla').value = inicioMes.toISOString().split('T')[0];
        document.getElementById('fechaFinPlanilla').value = hoy.toISOString().split('T')[0];
        
        // Marcar como inicializados
        this.eventListenersInitialized = true;
    }

    cambiarSeccion(seccion) {
        // Actualizar menú
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${seccion}"]`).classList.add('active');

        // Actualizar secciones
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`section-${seccion}`).classList.add('active');

        // Renderizar datos según la sección
        switch(seccion) {
            case 'empleados':
                this.renderEmpleados();
                break;
            case 'asistencias':
                this.renderAsistencias();
                this.actualizarSelectsEmpleados();
                break;
            case 'bonos':
                this.renderBonos();
                this.actualizarSelectsEmpleados();
                break;
            case 'feriados':
                this.renderFeriados();
                break;
            case 'vacaciones':
                this.renderVacaciones();
                break;
            case 'reportes':
                // La sección de reportes se mantiene como está por defecto
                break;
        }
    }

    cargarVistaConstancias() {
        // Reemplazar el contenido de la sección de reportes con la vista de constancias
        const sectionReportes = document.getElementById('section-reportes');
        sectionReportes.innerHTML = `
            <style>
                .constancias-container {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .constancias-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #007bff;
                }
                .constancias-title {
                    font-size: 28px;
                    font-weight: bold;
                    color: #333;
                    margin: 0;
                }
                .constancias-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                }
                .constancias-toolbar select {
                    padding: 8px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 14px;
                    min-width: 200px;
                    background: white;
                }
                .constancias-toolbar .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .constancias-toolbar .btn-primary {
                    background: #007bff;
                    color: white;
                }
                .constancias-toolbar .btn-primary:hover {
                    background: #0056b3;
                }
                .constancias-toolbar .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                .constancias-toolbar .btn-secondary:hover {
                    background: #545b62;
                }
                .constancias-table-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .constancias-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .constancias-table thead {
                    background: #007bff;
                    color: white;
                }
                .constancias-table th,
                .constancias-table td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #dee2e6;
                }
                .constancias-table th {
                    font-weight: 600;
                    font-size: 14px;
                }
                .constancias-table tbody tr:hover {
                    background: #f8f9fa;
                }
                .constancias-table tbody tr:last-child td {
                    border-bottom: none;
                }
                .no-data {
                    text-align: center;
                    padding: 40px;
                    color: #6c757d;
                    font-style: italic;
                }
                .spacer {
                    flex: 1;
                }
            </style>
            <div class="constancias-container">
                <div class="constancias-header">
                    <h1 class="constancias-title">Constancias Salariales</h1>
                </div>
                <div class="constancias-toolbar">
                    <select id="emp">
                        <option value="">Seleccione empleado</option>
                    </select>
                    <button id="constancia" class="btn btn-primary">Constancia salarial PDF</button>
                    <div class="spacer"></div>
                    <button id="volver-reportes" class="btn btn-secondary">Volver a Reportes</button>
                </div>
                <div class="constancias-table-container">
                    <table class="constancias-table" id="emp-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Cédula</th>
                                <th>Puesto</th>
                                <th>Jornada</th>
                                <th>Salario por Hora</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `;

        const empSel = sectionReportes.querySelector('#emp');
        const tbody = sectionReportes.querySelector('#emp-table tbody');

        // Cargar empleados
        const employees = this.empleados;
        
        // Verificar que hay empleados
        if (!employees || employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No hay empleados registrados</td></tr>';
            notify.warning('No hay empleados registrados. Agrega empleados primero.');
            return;
        }

        // Llenar dropdown y tabla
        empSel.innerHTML += employees.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        tbody.innerHTML = employees.map(e => `
            <tr>
                <td>${e.nombre}</td>
                <td>${e.cedula}</td>
                <td>${e.puesto || ''}</td>
                <td>${e.jornada}</td>
                <td>${this.formatearMoneda(e.salarioHora || 0)}</td>
            </tr>
        `).join('');

        // Event listener para generar constancia
        sectionReportes.querySelector('#constancia').addEventListener('click', () => {
            const id = empSel.value;
            if (!id) { 
                notify.warning('Seleccione un empleado de la lista'); 
                return; 
            }
            
            const empleado = employees.find(x => x.id === id);
            if (!empleado) {
                notify.error('Empleado no encontrado');
                return;
            }
            
            // Llamar a la función de generar constancia
            this.generarConstanciaSalarial(empleado);
        });

        // Event listener para volver a reportes
        sectionReportes.querySelector('#volver-reportes').addEventListener('click', () => {
            location.reload(); // Recargar la página para volver a la vista original
        });
    }

    generarConstanciaSalarial(empleado) {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) { 
            alert('jsPDF no está cargado'); 
            return; 
        }

        // Obtener fecha actual
        const fechaActual = new Date();
        const dia = fechaActual.getDate();
        const mes = fechaActual.toLocaleDateString('es-ES', { month: 'long' });
        const año = fechaActual.getFullYear();
        const fechaFormateada = `${dia} de ${mes} de ${año}`;
        
        // Calcular salario mensual usando la misma lógica del sistema de planillas
        // Simular un período de quincena para obtener el salario base
        const hoy = new Date();
        const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        
        const calculos = this.calcularSalarioEmpleado(empleado, fechaInicio.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0]);
        const subtotalQuincenal = parseFloat(calculos.salarioBase);
        const salarioMensualBruto = subtotalQuincenal * 2; // Salario quincenal x 2
        
        // Calcular deducciones mensuales
        const ccssMensual = salarioMensualBruto * 0.1067; // 10.67% CCSS mensual
        const impuestoRentaMensual = this.calcularImpuestoRenta(salarioMensualBruto);
        const totalDeduccionesMensual = ccssMensual + impuestoRentaMensual;
        
        // Calcular salario neto mensual
        const salarioMensualNeto = salarioMensualBruto - totalDeduccionesMensual;
        
        // Crear elemento HTML temporal para la constancia
        const constanciaHTML = document.createElement('div');
        constanciaHTML.id = 'constancia-temp';
            constanciaHTML.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 210mm;
                height: 297mm;
                background: white;
                font-family: Arial, sans-serif;
                padding: 20mm;
                box-sizing: border-box;
                z-index: -1;
                display: flex;
                flex-direction: column;
            `;
        
        constanciaHTML.innerHTML = `
            <style>
                #constancia-temp {
                    font-family: Arial, sans-serif;
                    line-height: 1.4;
                    color: #333;
                    display: flex;
                    flex-direction: column;
                }
                
                #constancia-temp .header {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    position: relative;
                    top: 0;
                    width: 100%;
                }
                
                #constancia-temp .logo {
                    width: 120px;
                    height: 120px;
                    margin-right: -20px;
                }
                
                #constancia-temp .logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                
                #constancia-temp .company-info {
                    flex: 1;
                    text-align: left;
                }
                
                #constancia-temp .company-info h1 {
                    margin: 0;
                    font-size: 15px;
                    color: #007bff;
                    font-weight: bold;
                }
                
                #constancia-temp .company-info p {
                    margin: 2px 0;
                    font-size: 13px;
                    color: #666;
                }
                
                #constancia-temp .title {
                    text-align: center;
                    font-size: 20px;
                    font-weight: bold;
                    margin: 30px 0 20px 0;
                    color: #333;
                }
                
                #constancia-temp .subtitle {
                    text-align: center;
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 30px;
                    color: #333;
                }
                
                #constancia-temp .content {
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 20px;
                    text-align: justify;
                }
                
                #constancia-temp .date {
                    font-size: 14px;
                    margin: 20px 0;
                }
                
                #constancia-temp .contact {
                    font-size: 14px;
                    margin: 20px 0;
                }
                
                #constancia-temp .signature {
                    font-size: 14px;
                    margin: 30px 0;
                }
                
                #constancia-temp .director {
                    font-size: 14px;
                    margin: 20px 0;
                    font-weight: bold;
                }
                
            </style>
            
            <div class="header">
                <div class="logo">
                    <img src="${empleado.empresa === 'Instituto Veterinario San Martin de Porres' ? './images/empresa.png' : './images/logo.jpg'}" alt="Logo" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23007bff%22 width=%22120%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22%3EVeterinaria%3C/text%3E%3C/svg%3E'">
                </div>
                
            </div>
            
            <div class="title">CONSTANCIA SALARIAL</div>
            <div class="subtitle">A QUIEN INTERESE</div>

            <div class="content">
                Por medio de este documento hacemos constar que el (la) Sr. (Sra.) <strong>${empleado.nombre}</strong> con documento de identidad número <strong>${empleado.cedula}</strong>, labora en nuestra empresa en el puesto de <strong>${empleado.puesto || 'Empleado'}</strong> desde el <strong>${empleado.fechaIngreso || 'fecha de ingreso'}</strong> y hasta la actualidad. Percibiendo en el último mes un salario mensual bruto de <strong>${this.formatearMoneda(salarioMensualBruto)}</strong> (${this.salarioATexto(salarioMensualBruto)}) y salario mensual neto de <strong>${this.formatearMoneda(salarioMensualNeto)}</strong> (${this.salarioATexto(salarioMensualNeto)}).
            </div>
            
            <div class="date">
                La presente se extiende a solicitud de la persona interesada el día <strong>${fechaFormateada}</strong>.
            </div>
            
            <div class="contact">
                Si usted tiene alguna pregunta o inquietud, o si desea validar esta información; por favor contacte al departamento de Recursos Humanos<br>
                Enviando un correo electrónico a <strong>rrhh@vetsanmartin.com</strong>
            </div>
            
            <div class="signature">
                Atentamente,
            </div>
            
            <div class="director">
                <strong>Dr. Randall Azofeifa</strong><br>
                Director General
            </div>
        `;
        
        document.body.appendChild(constanciaHTML);
        
        // Generar PDF usando html2canvas
        setTimeout(() => {
            html2canvas(constanciaHTML, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new jsPDF('p', 'mm', 'a4');
                
                const imgWidth = 190;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const x = (pdf.internal.pageSize.getWidth() - imgWidth) / 2;
                const y = 5;
                
                pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
                
                const fileName = `Constancia_Salarial_${empleado.nombre.replace(/\s/g, '_')}.pdf`;
                pdf.save(fileName);
                
                document.body.removeChild(constanciaHTML);
            }).catch(error => {
                console.error('Error al generar la constancia:', error);
                alert('Error al generar la constancia: ' + error.message);
                document.body.removeChild(constanciaHTML);
            });
        }, 100);
    }
    
    calcularImpuestoRenta(salarioBruto) {
        // Nuevos tramos de impuesto de renta
        if (salarioBruto <= 922000) return 0;
        if (salarioBruto <= 1352000) return (salarioBruto - 922000) * 0.10;
        if (salarioBruto <= 2373000) return 43000 + (salarioBruto - 1352000) * 0.15;
        if (salarioBruto <= 4745000) return 196150 + (salarioBruto - 2373000) * 0.20;
        return 670450 + (salarioBruto - 4745000) * 0.25;
    }

    salarioATexto(salario) {
        const parteEntera = Math.floor(salario);
        const parteDecimal = Math.round((salario - parteEntera) * 100);
        
        let texto = this.numeroATexto(parteEntera) + ' colones';
        
        if (parteDecimal > 0) {
            texto += ' con ' + this.numeroATexto(parteDecimal) + ' céntimos';
        }
        
        return texto;
    }

    numeroATexto(numero) {
        const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
        
        if (numero === 0) return 'cero';
        if (numero < 10) return unidades[numero];
        if (numero < 20) return especiales[numero - 10];
        if (numero < 100) {
            const decena = Math.floor(numero / 10);
            const unidad = numero % 10;
            return decenas[decena] + (unidad > 0 ? ' y ' + unidades[unidad] : '');
        }
        if (numero < 1000) {
            const centena = Math.floor(numero / 100);
            const resto = numero % 100;
            let texto = '';
            if (centena === 1) {
                texto = 'ciento';
            } else if (centena === 5) {
                texto = 'quinientos';
            } else if (centena === 7) {
                texto = 'setecientos';
            } else if (centena === 9) {
                texto = 'novecientos';
            } else {
                texto = unidades[centena] + 'cientos';
            }
            if (resto > 0) {
                texto += ' ' + this.numeroATexto(resto);
            }
            return texto;
        }
        if (numero < 1000000) {
            const miles = Math.floor(numero / 1000);
            const resto = numero % 1000;
            let texto = '';
            if (miles === 1) {
                texto = 'mil';
            } else {
                texto = this.numeroATexto(miles) + ' mil';
            }
            if (resto > 0) {
                texto += ' ' + this.numeroATexto(resto);
            }
            return texto;
        }
        if (numero < 1000000000) {
            const millones = Math.floor(numero / 1000000);
            const resto = numero % 1000000;
            let texto = '';
            if (millones === 1) {
                texto = 'un millón';
            } else {
                texto = this.numeroATexto(millones) + ' millones';
            }
            if (resto > 0) {
                texto += ' ' + this.numeroATexto(resto);
            }
            return texto;
        }
        
        return numero.toString();
    }
}

// Inicializar el sistema
let sistema;

// Función para inicializar el sistema después de autenticación
async function initializeSistema() {
    try {
        sistema = new SistemaPlanillas();
        window.sistema = sistema; // Hacer accesible globalmente para onclick handlers
        await sistema.init(); // Asegurar que se ejecute la inicialización completa
        
        // Pequeño delay para asegurar que el DOM esté listo
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Cerrar cualquier modal que esté abierto
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active', 'show');
            modal.style.display = 'none';
        });
        
        await sistema.renderEmpleados();
        await sistema.actualizarSelectsEmpleados();
        
        // Aplicar filtros iniciales para mostrar todos los empleados
        setTimeout(() => {
            if (sistema.aplicarFiltrosEmpleados) {
                sistema.aplicarFiltrosEmpleados();
            }
        }, 200);
        
    } catch (error) {
        console.error('❌ Error al inicializar el sistema:', error);
    }
}

// Inicialización con autenticación
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Importar el manejador de login
        const { initializeAuth } = await import('./login-handler.js');
        
        // Inicializar autenticación (muestra spinner, verifica auth, muestra login o app)
        await initializeAuth();
        
        // Si el usuario está autenticado, inicializar el sistema
        const { checkAuthState } = await import('./auth.js');
        const user = await checkAuthState();
        
        if (user) {
            await initializeSistema();
        } else {
            // Esperar a que el usuario inicie sesión
            // El sistema se inicializará cuando el usuario haga login exitoso
            window.addEventListener('userLoggedIn', async () => {
                await initializeSistema();
            });
        }
    } catch (error) {
        console.error('Error en la inicialización:', error);
        // En caso de error, inicializar el sistema de todas formas (modo fallback)
        await initializeSistema();
    }
});

// Exportar para uso global
window.initializeSistema = initializeSistema;