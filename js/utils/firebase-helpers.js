/**
 * Firebase Helpers - Sistema de Planillas Costa Rica
 * Funciones de ayuda para operaciones con Firebase Realtime Database
 */

const FirebaseHelpers = {
    /**
     * Referencia a la base de datos
     */
    db: CONFIG.database,

    /**
     * Usuario actual
     */
    currentUser: null,

    /**
     * Rol del usuario actual
     */
    currentUserRole: null,

    /**
     * Lee datos en tiempo real
     * @param {string} path - Ruta en la base de datos
     * @param {function} callback - Función callback con los datos
     */
    onValue(path, callback) {
        const ref = this.db.ref(path);
        ref.on('value', (snapshot) => {
            callback(snapshot.val(), snapshot.key);
        });
        return ref;
    },

    /**
     * Lee datos una sola vez
     * @param {string} path - Ruta en la base de datos
     * @returns {Promise} Promesa con los datos
     */
    async once(path) {
        try {
            const snapshot = await this.db.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error reading data:', error);
            throw error;
        }
    },

    /**
     * Escribe datos en la base de datos
     * @param {string} path - Ruta en la base de datos
     * @param {any} data - Datos a escribir
     * @returns {Promise}
     */
    async set(path, data) {
        try {
            await this.db.ref(path).set(data);
            await this.registrarAuditoria('create', path, data);
            return true;
        } catch (error) {
            console.error('Error writing data:', error);
            throw error;
        }
    },

    /**
     * Actualiza datos parcialmente
     * @param {string} path - Ruta en la base de datos
     * @param {object} updates - Actualizaciones a realizar
     * @returns {Promise}
     */
    async update(path, updates) {
        try {
            await this.db.ref(path).update(updates);
            await this.registrarAuditoria('update', path, updates);
            return true;
        } catch (error) {
            console.error('Error updating data:', error);
            throw error;
        }
    },

    /**
     * Elimina datos de la base de datos
     * @param {string} path - Ruta en la base de datos
     * @returns {Promise}
     */
    async remove(path) {
        try {
            await this.db.ref(path).remove();
            await this.registrarAuditoria('delete', path, null);
            return true;
        } catch (error) {
            console.error('Error removing data:', error);
            throw error;
        }
    },

    /**
     * Crea un nuevo registro con ID automático
     * @param {string} path - Ruta en la base de datos
     * @param {object} data - Datos a escribir
     * @returns {Promise<string>} ID generado
     */
    async push(path, data) {
        try {
            const ref = this.db.ref(path).push();
            await ref.set(data);
            await this.registrarAuditoria('create', `${path}/${ref.key}`, data);
            return ref.key;
        } catch (error) {
            console.error('Error pushing data:', error);
            throw error;
        }
    },

    /**
     * Registra acción en auditoría
     * @param {string} accion - Tipo de acción
     * @param {string} modulo - Módulo afectado
     * @param {any} datos - Datos de la acción
     */
    async registrarAuditoria(accion, modulo, datos) {
        if (!this.currentUser) return;

        try {
            const logRef = this.db.ref(CONFIG.DB_PATHS.AUDITORIA).push();
            await logRef.set({
                usuario: this.currentUser.uid,
                usuarioEmail: this.currentUser.email,
                accion,
                modulo,
                descripcion: `${accion} en ${modulo}`,
                cambios: datos,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                estado: 'exitosa'
            });
        } catch (error) {
            console.error('Error registering audit:', error);
        }
    },

    // ==================== EMPLEADOS ====================

    /**
     * Lee todos los empleados
     * @param {function} callback - Callback con los datos
     */
    listenEmpleados(callback) {
        return this.onValue(CONFIG.DB_PATHS.EMPLEADOS, (data) => {
            const empleados = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    empleados.push({ id: key, ...data[key] });
                });
            }
            callback(empleados);
        });
    },

    /**
     * Lee todos los empleados una vez
     * @returns {Promise<Array>}
     */
    async getEmpleados() {
        const data = await this.once(CONFIG.DB_PATHS.EMPLEADOS);
        const empleados = [];
        if (data) {
            Object.keys(data).forEach(key => {
                empleados.push({ id: key, ...data[key] });
            });
        }
        return empleados;
    },

    /**
     * Lee un empleado por ID
     * @param {string} id - ID del empleado
     * @returns {Promise<object>}
     */
    async getEmpleado(id) {
        const data = await this.once(`${CONFIG.DB_PATHS.EMPLEADOS}/${id}`);
        return data ? { id, ...data } : null;
    },

    /**
     * Crea un nuevo empleado
     * @param {object} empleado - Datos del empleado
     * @returns {Promise<string>} ID del empleado creado
     */
    async createEmpleado(empleado) {
        const validacion = Validators.validarEmpleado(empleado);
        if (!validacion.valido) {
            throw new Error('Datos de empleado inválidos: ' + JSON.stringify(validacion.errores));
        }

        const data = {
            ...empleado,
            fechaCreacion: firebase.database.ServerValue.TIMESTAMP,
            creadoPor: this.currentUser?.uid || 'system',
            estado: empleado.estado || CONFIG.ESTADOS_EMPLEADO.ACTIVO
        };

        return await this.push(CONFIG.DB_PATHS.EMPLEADOS, data);
    },

    /**
     * Actualiza un empleado
     * @param {string} id - ID del empleado
     * @param {object} updates - Datos a actualizar
     * @returns {Promise}
     */
    async updateEmpleado(id, updates) {
        const data = {
            ...updates,
            fechaModificacion: firebase.database.ServerValue.TIMESTAMP,
            modificadoPor: this.currentUser?.uid || 'system'
        };

        return await this.update(`${CONFIG.DB_PATHS.EMPLEADOS}/${id}`, data);
    },

    /**
     * Elimina un empleado (marca como inactivo)
     * @param {string} id - ID del empleado
     * @returns {Promise}
     */
    async deleteEmpleado(id) {
        const path = `${CONFIG.DB_PATHS.EMPLEADOS}/${id}`;
        return await this.remove(path);
    },

    // ==================== ASISTENCIAS ====================

    /**
     * Lee asistencias de un empleado
     * @param {string} empleadoId - ID del empleado
     * @param {function} callback - Callback con los datos
     */
    listenAsistencias(empleadoId, callback) {
        return this.onValue(`${CONFIG.DB_PATHS.ASISTENCIAS}/${empleadoId}`, (data) => {
            const asistencias = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    asistencias.push({ fecha: key, ...data[key] });
                });
            }
            callback(asistencias);
        });
    },

    /**
     * Lee asistencias de un empleado en un período
     * @param {string} empleadoId - ID del empleado
     * @param {string} fechaInicio - Fecha inicio (YYYYMMDD)
     * @param {string} fechaFin - Fecha fin (YYYYMMDD)
     * @returns {Promise<Array>}
     */
    async getAsistenciasPeriodo(empleadoId, fechaInicio, fechaFin, empleadoCedula = null) {
        const path = `${CONFIG.DB_PATHS.ASISTENCIAS}/${empleadoId}`;
        let data = await this.once(path);
        const asistencias = [];
        
        console.log(`Buscando asistencias para empleado ${empleadoId}:`);
        console.log(`  Ruta en Firebase: ${path}`);
        console.log(`  Rango: ${fechaInicio} - ${fechaFin}`);
        if (empleadoCedula) {
            console.log(`  Cédula del empleado: ${empleadoCedula}`);
        }
        
        if (data) {
            const fechasDisponibles = Object.keys(data);
            console.log(`  Fechas disponibles en Firebase:`, fechasDisponibles);
            console.log(`  Total fechas en Firebase: ${fechasDisponibles.length}`);
            
            Object.keys(data).forEach(fecha => {
                if (fecha >= fechaInicio && fecha <= fechaFin) {
                    console.log(`  ✓ Asistencia encontrada: ${fecha} - tipo: ${data[fecha].tipoDia}`);
                    asistencias.push({ fecha, ...data[fecha] });
                } else {
                    console.log(`  ✗ Asistencia fuera de rango: ${fecha} (tipo: ${data[fecha].tipoDia})`);
                }
            });
        } else {
            console.log(`  No hay datos de asistencias para este empleado en la ruta: ${path}`);
            
            // Si se proporciona la cédula, intentar buscar por cédula
            if (empleadoCedula) {
                console.log(`  Intentando buscar asistencias por cédula: ${empleadoCedula}`);
                const allAsistencias = await this.once(CONFIG.DB_PATHS.ASISTENCIAS);
                if (allAsistencias) {
                    // Primero obtener los IDs de empleados que tienen asistencias
                    const empleadoIdsConAsistencias = Object.keys(allAsistencias);
                    console.log(`  IDs de empleados con asistencias: ${empleadoIdsConAsistencias.length} total`);
                    
                    // Obtener todos los empleados para comparar cédulas
                    const allEmpleados = await this.once(CONFIG.DB_PATHS.EMPLEADOS);
                    const empleadosConAsistencias = [];
                    
                    // Crear un mapa de cédula -> ID para empleados que tienen asistencias
                    const cedulaToIdConAsistencias = {};
                    
                    if (allEmpleados) {
                        // Iterar sobre los empleados que tienen asistencias
                        empleadoIdsConAsistencias.forEach(empIdConAsistencias => {
                            if (allEmpleados[empIdConAsistencias]) {
                                const empleado = allEmpleados[empIdConAsistencias];
                                const cedulaLimpia = (empleado.cedula || '').replace(/[-\s]/g, '');
                                if (cedulaLimpia) {
                                    cedulaToIdConAsistencias[cedulaLimpia] = empIdConAsistencias;
                                    empleadosConAsistencias.push({
                                        id: empIdConAsistencias,
                                        cedula: empleado.cedula,
                                        cedulaLimpia: cedulaLimpia,
                                        nombre: empleado.nombre || 'Sin nombre'
                                    });
                                }
                            }
                        });
                    }
                    
                    console.log(`  Empleados con asistencias encontrados: ${empleadosConAsistencias.length}`);
                    if (empleadosConAsistencias.length > 0) {
                        console.log(`  Primeros 5 empleados con asistencias:`, empleadosConAsistencias.slice(0, 5).map(e => ({
                            id: e.id,
                            nombre: e.nombre,
                            cedula: e.cedula,
                            cedulaLimpia: e.cedulaLimpia
                        })));
                    }
                    
                    const cedulaLimpia = empleadoCedula.replace(/[-\s]/g, '');
                    console.log(`  Buscando cédula limpia: "${cedulaLimpia}"`);
                    console.log(`  Cédulas disponibles en mapa:`, Object.keys(cedulaToIdConAsistencias).slice(0, 10));
                    
                    const empleadoIdConAsistencias = cedulaToIdConAsistencias[cedulaLimpia];
                    
                    if (empleadoIdConAsistencias && allAsistencias[empleadoIdConAsistencias]) {
                        console.log(`  ✓ Encontrado empleado con misma cédula: ID ${empleadoIdConAsistencias}`);
                        data = allAsistencias[empleadoIdConAsistencias];
                        
                        Object.keys(data).forEach(fecha => {
                            if (fecha >= fechaInicio && fecha <= fechaFin) {
                                console.log(`  ✓ Asistencia encontrada por cédula: ${fecha} - tipo: ${data[fecha].tipoDia}`);
                                asistencias.push({ fecha, ...data[fecha] });
                            }
                        });
                    } else {
                        console.log(`  ✗ No se encontró empleado con cédula ${cedulaLimpia} que tenga asistencias`);
                        if (empleadoIdConAsistencias) {
                            console.log(`  ⚠ Empleado encontrado con cédula pero sin asistencias: ID ${empleadoIdConAsistencias}`);
                        }
                    }
                }
            } else {
                // Intentar verificar si hay datos en otras rutas
                const allAsistencias = await this.once(CONFIG.DB_PATHS.ASISTENCIAS);
                if (allAsistencias) {
                    console.log(`  Empleados con asistencias en Firebase:`, Object.keys(allAsistencias).slice(0, 10), '...');
                } else {
                    console.log(`  No hay asistencias en Firebase en absoluto`);
                }
            }
        }
        
        console.log(`  Total asistencias encontradas: ${asistencias.length}`);
        return asistencias;
    },

    /**
     * Registra asistencia de un empleado
     * @param {string} empleadoId - ID del empleado
     * @param {string} fecha - Fecha (YYYYMMDD)
     * @param {object} asistencia - Datos de asistencia
     * @returns {Promise}
     */
    async registrarAsistencia(empleadoId, fecha, asistencia) {
        // Convertir fechaKey (YYYYMMDD) a objeto Date para validación
        let fechaParaValidar = fecha;
        if (typeof fecha === 'string' && /^\d{8}$/.test(fecha)) {
            // Formato YYYYMMDD
            const ano = parseInt(fecha.substring(0, 4));
            const mes = parseInt(fecha.substring(4, 6)) - 1; // Mes es 0-indexed
            const dia = parseInt(fecha.substring(6, 8));
            fechaParaValidar = new Date(ano, mes, dia);
        }

        const validacion = Validators.validarAsistencia({ ...asistencia, empleadoId, fecha: fechaParaValidar });
        if (!validacion.valido) {
            throw new Error('Datos de asistencia inválidos: ' + JSON.stringify(validacion.errores));
        }

        const data = {
            ...asistencia,
            fechaRegistro: firebase.database.ServerValue.TIMESTAMP,
            registradoPor: this.currentUser?.uid || 'system'
        };

        const path = `${CONFIG.DB_PATHS.ASISTENCIAS}/${empleadoId}/${fecha}`;
        console.log(`Guardando asistencia en: ${path}`);
        console.log(`  Empleado ID: ${empleadoId}`);
        console.log(`  Fecha: ${fecha}`);
        console.log(`  Tipo: ${asistencia.tipoDia}`);
        console.log(`  Datos:`, data);

        const result = await this.set(path, data);
        console.log(`  ✓ Asistencia guardada exitosamente`);
        return result;
    },

    /**
     * Actualiza asistencia
     * @param {string} empleadoId - ID del empleado
     * @param {string} fecha - Fecha (YYYYMMDD)
     * @param {object} updates - Datos a actualizar
     * @returns {Promise}
     */
    async updateAsistencia(empleadoId, fecha, updates) {
        const data = {
            ...updates,
            fechaModificacion: firebase.database.ServerValue.TIMESTAMP,
            modificadoPor: this.currentUser?.uid || 'system'
        };

        return await this.update(`${CONFIG.DB_PATHS.ASISTENCIAS}/${empleadoId}/${fecha}`, data);
    },

    /**
     * Elimina asistencia
     * @param {string} empleadoId - ID del empleado
     * @param {string} fecha - Fecha (YYYYMMDD)
     * @returns {Promise}
     */
    async deleteAsistencia(empleadoId, fecha) {
        return await this.remove(`${CONFIG.DB_PATHS.ASISTENCIAS}/${empleadoId}/${fecha}`);
    },

    // ==================== BONOS Y REBAJOS ====================

    /**
     * Lee todos los bonos/rebajos
     * @param {function} callback - Callback con los datos
     */
    listenBonosRebajos(callback) {
        return this.onValue(CONFIG.DB_PATHS.BONOS_REBAJOS, (data) => {
            const items = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    items.push({ id: key, ...data[key] });
                });
            }
            callback(items);
        });
    },

    /**
     * Lee bonos/rebajos de un empleado
     * @param {string} empleadoId - ID del empleado
     * @returns {Promise<Array>}
     */
    async getBonosRebajosPorEmpleado(empleadoId) {
        const data = await this.once(CONFIG.DB_PATHS.BONOS_REBAJOS);
        const items = [];
        
        if (data) {
            Object.keys(data).forEach(key => {
                if (data[key].empleadoId === empleadoId) {
                    items.push({ id: key, ...data[key] });
                }
            });
        }
        
        return items;
    },

    /**
     * Crea bono/rebajo
     * @param {object} bonoRebajo - Datos del bono/rebajo
     * @returns {Promise<string>} ID creado
     */
    async createBonoRebajo(bonoRebajo) {
        const validacion = Validators.validarBonoRebajo(bonoRebajo);
        if (!validacion.valido) {
            throw new Error('Datos inválidos: ' + JSON.stringify(validacion.errores));
        }

        const data = {
            ...bonoRebajo,
            estado: CONFIG.ESTADOS_BONO_REBAJO.PENDIENTE,
            fechaCreacion: firebase.database.ServerValue.TIMESTAMP,
            creadoPor: this.currentUser?.uid || 'system'
        };

        return await this.push(CONFIG.DB_PATHS.BONOS_REBAJOS, data);
    },

    /**
     * Actualiza bono/rebajo
     * @param {string} id - ID del bono/rebajo
     * @param {object} updates - Datos a actualizar
     * @returns {Promise}
     */
    async updateBonoRebajo(id, updates) {
        return await this.update(`${CONFIG.DB_PATHS.BONOS_REBAJOS}/${id}`, updates);
    },

    /**
     * Aprueba bono/rebajo
     * @param {string} id - ID del bono/rebajo
     * @returns {Promise}
     */
    async aprobarBonoRebajo(id) {
        return await this.update(`${CONFIG.DB_PATHS.BONOS_REBAJOS}/${id}`, {
            estado: CONFIG.ESTADOS_BONO_REBAJO.APROBADO,
            aprobadoPor: this.currentUser?.uid || 'system',
            fechaAprobacion: firebase.database.ServerValue.TIMESTAMP
        });
    },

    /**
     * Elimina bono/rebajo
     * @param {string} id - ID del bono/rebajo
     * @returns {Promise}
     */
    async deleteBonoRebajo(id) {
        return await this.remove(`${CONFIG.DB_PATHS.BONOS_REBAJOS}/${id}`);
    },

    // ==================== PLANILLAS ====================

    /**
     * Lee todas las planillas
     * @param {function} callback - Callback con los datos
     */
    listenPlanillas(callback) {
        return this.onValue(CONFIG.DB_PATHS.PLANILLAS, (data) => {
            const planillas = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    planillas.push({ id: key, ...data[key] });
                });
            }
            callback(planillas);
        });
    },

    /**
     * Lee una planilla por ID
     * @param {string} id - ID de la planilla
     * @returns {Promise<object>}
     */
    async getPlanilla(id) {
        const data = await this.once(`${CONFIG.DB_PATHS.PLANILLAS}/${id}`);
        return data ? { id, ...data } : null;
    },

    /**
     * Crea una planilla
     * @param {object} planilla - Datos de la planilla
     * @returns {Promise<string>} ID de la planilla creada
     */
    async createPlanilla(planilla) {
        const data = {
            ...planilla,
            estado: CONFIG.ESTADOS_PLANILLA.GENERADA,
            fechaGeneracion: firebase.database.ServerValue.TIMESTAMP,
            generadaPor: this.currentUser?.uid || 'system'
        };

        return await this.push(CONFIG.DB_PATHS.PLANILLAS, data);
    },

    /**
     * Actualiza una planilla
     * @param {string} id - ID de la planilla
     * @param {object} updates - Datos a actualizar
     * @returns {Promise}
     */
    async updatePlanilla(id, updates) {
        return await this.update(`${CONFIG.DB_PATHS.PLANILLAS}/${id}`, updates);
    },

    /**
     * Elimina una planilla
     * @param {string} id - ID de la planilla
     * @returns {Promise}
     */
    async deletePlanilla(id) {
        return await this.remove(`${CONFIG.DB_PATHS.PLANILLAS}/${id}`);
    },

    /**
     * Aprueba una planilla
     * @param {string} id - ID de la planilla
     * @returns {Promise}
     */
    async aprobarPlanilla(id) {
        return await this.update(`${CONFIG.DB_PATHS.PLANILLAS}/${id}`, {
            estado: CONFIG.ESTADOS_PLANILLA.APROBADA,
            aprobadaPor: this.currentUser?.uid || 'system',
            fechaAprobacion: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // ==================== FERIADOS ====================

    /**
     * Lee todos los feriados
     * @returns {Promise<Array>}
     */
    async getFeriados() {
        const data = await this.once(CONFIG.DB_PATHS.FERIADOS);
        const feriados = [];
        if (data) {
            Object.keys(data).forEach(key => {
                feriados.push({ id: key, ...data[key] });
            });
        }
        return feriados;
    },

    /**
     * Crea un feriado
     * @param {object} feriado - Datos del feriado
     * @returns {Promise<string>} ID del feriado creado
     */
    async createFeriado(feriado) {
        const data = {
            ...feriado,
            fechaCreacion: firebase.database.ServerValue.TIMESTAMP,
            creadoPor: this.currentUser?.uid || 'system'
        };

        return await this.push(CONFIG.DB_PATHS.FERIADOS, data);
    },

    /**
     * Inicializa feriados de 2025 y 2026 si no existen
     */
    async inicializarFeriados2025() {
        const feriados = await this.getFeriados();
        const feriadosPorAño = {};
        
        feriados.forEach(f => {
            const año = new Date(f.fecha).getFullYear();
            if (!feriadosPorAño[año]) {
                feriadosPorAño[año] = [];
            }
            feriadosPorAño[año].push(f);
        });
        
        // Inicializar 2025 si no existe
        if (!feriadosPorAño[2025] || feriadosPorAño[2025].length === 0) {
            for (const feriado of CONFIG.FERIADOS_2025) {
                await this.createFeriado({
                    fecha: new Date(feriado.fecha).getTime(),
                    nombre: feriado.nombre,
                    tipo: feriado.tipo,
                    aplicaDoble: feriado.aplicaDoble,
                    activo: true,
                    año: 2025
                });
            }
        }
        
        // Inicializar 2026 si no existe
        if (!feriadosPorAño[2026] || feriadosPorAño[2026].length === 0) {
            for (const feriado of CONFIG.FERIADOS_2026) {
                await this.createFeriado({
                    fecha: new Date(feriado.fecha).getTime(),
                    nombre: feriado.nombre,
                    tipo: feriado.tipo,
                    aplicaDoble: feriado.aplicaDoble,
                    activo: true,
                    año: 2026
                });
            }
        }
    },

    // ==================== AGUINALDOS ====================

    /**
     * Obtiene datos de aguinaldos por año
     * @param {number|string} año - Año de cálculo
     * @returns {Promise<object>}
     */
    async getAguinaldosPorAño(año) {
        const data = await this.once(`${CONFIG.DB_PATHS.AGUINALDOS}/${año}`);
        return data || {};
    },

    /**
     * Escucha cambios en los aguinaldos de un año
     * @param {number|string} año - Año de cálculo
     * @param {function} callback - Callback con los datos
     * @returns {firebase.database.Reference}
     */
    listenAguinaldosPorAño(año, callback) {
        const path = `${CONFIG.DB_PATHS.AGUINALDOS}/${año}`;
        const ref = this.db.ref(path);
        ref.on('value', (snapshot) => {
            callback(snapshot.val() || {});
        });
        return ref;
    },

    /**
     * Actualiza un periodo de aguinaldo para un empleado
     * @param {number|string} año - Año de cálculo
     * @param {string} empleadoId - ID del empleado
     * @param {string} periodoId - Identificador del periodo
     * @param {object} data - Datos a actualizar
     * @returns {Promise}
     */
    async updateAguinaldoPeriodo(año, empleadoId, periodoId, data) {
        const payload = {
            ...data,
            actualizadoPor: this.currentUser?.uid || 'system',
            actualizadoEn: firebase.database.ServerValue.TIMESTAMP
        };

        return await this.update(
            `${CONFIG.DB_PATHS.AGUINALDOS}/${año}/${empleadoId}/periodos/${periodoId}`,
            payload
        );
    },

    // ==================== USUARIOS ====================

    /**
     * Crea o actualiza perfil de usuario
     * @param {string} uid - UID del usuario
     * @param {object} userData - Datos del usuario
     * @returns {Promise}
     */
    async setUserProfile(uid, userData) {
        return await this.set(`${CONFIG.DB_PATHS.USUARIOS}/${uid}`, {
            ...userData,
            fechaActualizacion: firebase.database.ServerValue.TIMESTAMP
        });
    },

    /**
     * Lee perfil de usuario
     * @param {string} uid - UID del usuario
     * @returns {Promise<object>}
     */
    async getUserProfile(uid) {
        return await this.once(`${CONFIG.DB_PATHS.USUARIOS}/${uid}`);
    },

    /**
     * Verifica permisos del usuario actual
     * @param {string} modulo - Módulo a verificar
     * @returns {boolean} Tiene permiso
     */
    tienePermiso(modulo) {
        if (!this.currentUserRole) return false;
        
        const permisos = CONFIG.PERMISOS[this.currentUserRole];
        return permisos && permisos.includes(modulo);
    }
};

// Export to window
window.FirebaseHelpers = FirebaseHelpers;

