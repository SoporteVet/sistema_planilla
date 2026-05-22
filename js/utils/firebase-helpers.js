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
     * Verifica la conexión a Firebase
     * @returns {Promise<boolean>}
     */
    async verificarConexion() {
        try {
            console.log('Verificando conexión a Firebase...');
            const connectedRef = this.db.ref('.info/connected');
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout al verificar conexión a Firebase'));
                }, 10000); // 10 segundos timeout
                
                connectedRef.once('value', (snapshot) => {
                    clearTimeout(timeout);
                    const connected = snapshot.val();
                    console.log('Estado de conexión Firebase:', connected ? 'Conectado' : 'Desconectado');
                    resolve(connected === true);
                }, (error) => {
                    clearTimeout(timeout);
                    console.error('Error al verificar conexión:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Error en verificarConexion:', error);
            return false;
        }
    },

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
            console.log(`Firebase: Leyendo datos de ${path}...`);
            const snapshot = await this.db.ref(path).once('value');
            const data = snapshot.val();
            console.log(`Firebase: Datos leídos exitosamente de ${path}`, data ? 'con datos' : 'vacío');
            return data;
        } catch (error) {
            console.error(`Error reading data from ${path}:`, error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            // Proporcionar mensajes de error más informativos
            if (error.code === 'PERMISSION_DENIED') {
                throw new Error(`Permiso denegado para acceder a ${path}. Verifique las reglas de seguridad de Firebase.`);
            } else if (error.message && error.message.includes('network')) {
                throw new Error('Error de conexión a Firebase. Verifique su conexión a internet.');
            } else {
                throw new Error(`Error al leer datos de Firebase: ${error.message}`);
            }
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
        try {
            console.log('=== Iniciando carga de empleados ===');
            console.log('Usuario actual:', this.currentUser?.email || 'No autenticado');
            console.log('Rol actual:', this.currentUserRole || 'Sin rol');
            
            // Verificar conexión primero
            const conectado = await this.verificarConexion();
            if (!conectado) {
                console.warn('⚠️ Firebase no está conectado, intentando de todas formas...');
            }
            
            const data = await this.once(CONFIG.DB_PATHS.EMPLEADOS);
            const empleados = [];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    empleados.push({ id: key, ...data[key] });
                });
                console.log(`✓ ${empleados.length} empleados cargados exitosamente`);
            } else {
                console.warn('⚠️ No se encontraron datos de empleados en Firebase');
            }
            
            return empleados;
        } catch (error) {
            console.error('❌ Error al cargar empleados:', error);
            throw error;
        }
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
     * @param {boolean} permitirFutura - Si permite fechas futuras (útil para períodos quincenales)
     * @returns {Promise}
     */
    async registrarAsistencia(empleadoId, fecha, asistencia, permitirFutura = false) {
        // Convertir fechaKey (YYYYMMDD) a objeto Date para validación
        let fechaParaValidar = fecha;
        if (typeof fecha === 'string' && /^\d{8}$/.test(fecha)) {
            // Formato YYYYMMDD
            const ano = parseInt(fecha.substring(0, 4));
            const mes = parseInt(fecha.substring(4, 6)) - 1; // Mes es 0-indexed
            const dia = parseInt(fecha.substring(6, 8));
            fechaParaValidar = new Date(ano, mes, dia);
        }

        const validacion = Validators.validarAsistencia({ ...asistencia, empleadoId, fecha: fechaParaValidar }, permitirFutura);
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
    },

    // ==================== CONTROL DE ASISTENCIA ====================

    /**
     * Indica si hay al menos una entrada sin salida en los registros del día
     * @param {Array} registros - Registros de entrada/salida
     * @returns {boolean}
     */
    tieneEntradaPendiente(registros) {
        const entradas = registros.filter(r => r.tipo === 'entrada').length;
        const salidas = registros.filter(r => r.tipo === 'salida').length;
        return entradas > salidas;
    },

    /**
     * Busca una entrada pendiente (sin salida) en el día actual o el anterior.
     * Cubre el caso de entrada antes de medianoche y salida después de medianoche.
     * @param {string} empleadoId - ID del empleado
     * @returns {Promise<{fecha: string, registros: Array}|null>}
     */
    async buscarEntradaPendiente(empleadoId) {
        const hoy = new Date();
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);

        for (const fechaRef of [hoy, ayer]) {
            const fecha = Formatters.formatearFechaKey(fechaRef);
            const registros = await this.obtenerRegistrosAsistenciaDia(empleadoId, fecha);
            if (this.tieneEntradaPendiente(registros)) {
                return { fecha, registros };
            }
        }

        return null;
    },

    /**
     * Registra entrada o salida de un empleado
     * @param {string} empleadoId - ID del empleado
     * @param {string} tipo - 'entrada' o 'salida'
     * @returns {Promise<object>} Registro creado
     */
    async registrarControlAsistencia(empleadoId, tipo) {
        const ahora = new Date();
        const fechaHoy = Formatters.formatearFechaKey(ahora); // YYYYMMDD
        const hora = Formatters.formatearHora(ahora); // HH:mm
        const timestamp = ahora.getTime();

        console.log('Registrando asistencia:', { empleadoId, tipo, fecha: fechaHoy, hora });

        // Obtener registros del día - FORZAR LECTURA DIRECTA DE FIREBASE
        let fechaRegistro = fechaHoy;
        let registrosDelDia = await this.obtenerRegistrosAsistenciaDia(empleadoId, fechaHoy);
        
        console.log('Registros del día obtenidos:', registrosDelDia);

        // Validaciones
        if (tipo === 'entrada') {
            const pendiente = await this.buscarEntradaPendiente(empleadoId);
            if (pendiente) {
                throw new Error('Ya existe una entrada sin salida registrada');
            }
        } else if (tipo === 'salida') {
            // Si no hay entrada pendiente hoy, buscar en el día anterior
            // (entrada antes de medianoche, salida después de medianoche)
            if (!this.tieneEntradaPendiente(registrosDelDia)) {
                const ayer = new Date(ahora);
                ayer.setDate(ayer.getDate() - 1);
                const fechaAyer = Formatters.formatearFechaKey(ayer);
                const registrosAyer = await this.obtenerRegistrosAsistenciaDia(empleadoId, fechaAyer);

                if (this.tieneEntradaPendiente(registrosAyer)) {
                    fechaRegistro = fechaAyer;
                    registrosDelDia = registrosAyer;
                    console.log('Salida vinculada a entrada del día anterior:', fechaAyer);
                }
            }

            const entradas = registrosDelDia.filter(r => r.tipo === 'entrada');
            const salidas = registrosDelDia.filter(r => r.tipo === 'salida');

            console.log('Validación salida - Entradas:', entradas.length, 'Salidas:', salidas.length, 'Fecha registro:', fechaRegistro);

            if (entradas.length === 0) {
                throw new Error('No hay una entrada registrada para marcar salida');
            }
            
            if (entradas.length <= salidas.length) {
                throw new Error('Ya existe una salida para la última entrada registrada');
            }
        }

        const nuevoRegistro = {
            empleadoId,
            fecha: fechaRegistro,
            tipo,
            hora,
            timestamp,
            registradoPor: this.currentUser?.uid || 'system',
            fechaRegistro: firebase.database.ServerValue.TIMESTAMP
        };

        console.log('Guardando nuevo registro:', nuevoRegistro);

        // Guardar en Firebase y esperar confirmación
        const path = `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${empleadoId}/${fechaRegistro}`;
        const registroId = await this.push(path, nuevoRegistro);

        console.log('Registro guardado exitosamente con ID:', registroId);

        // Retornar el registro con el ID
        return { 
            id: registroId, 
            ...nuevoRegistro,
            fechaRegistro: Date.now() // Usar timestamp local ya que ServerValue.TIMESTAMP se establece en servidor
        };
    },

    /**
     * Obtiene registros de asistencia de un empleado para una fecha específica
     * @param {string} empleadoId - ID del empleado
     * @param {string} fecha - Fecha en formato YYYYMMDD
     * @returns {Promise<Array>} Registros del día
     */
    async obtenerRegistrosAsistenciaDia(empleadoId, fecha) {
        const path = `${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${empleadoId}/${fecha}`;
        console.log('Obteniendo registros del día desde:', path);
        
        const data = await this.once(path);
        const registros = [];

        if (data) {
            console.log('Datos crudos obtenidos de Firebase:', data);
            Object.keys(data).forEach(key => {
                registros.push({ id: key, ...data[key] });
            });
        } else {
            console.log('No se encontraron registros para esta fecha');
        }

        // Ordenar por timestamp
        registros.sort((a, b) => a.timestamp - b.timestamp);

        console.log('Registros procesados y ordenados:', registros);
        return registros;
    },

    /**
     * Obtiene todos los registros de asistencia de un empleado en un rango de fechas
     * @param {string} empleadoId - ID del empleado
     * @param {string} fechaInicio - Fecha inicio YYYYMMDD
     * @param {string} fechaFin - Fecha fin YYYYMMDD
     * @returns {Promise<Array>} Registros del período
     */
    async obtenerRegistrosAsistenciaPeriodo(empleadoId, fechaInicio, fechaFin) {
        const data = await this.once(`${CONFIG.DB_PATHS.CONTROL_ASISTENCIA}/${empleadoId}`);
        const registros = [];

        if (data) {
            Object.keys(data).forEach(fecha => {
                if (fecha >= fechaInicio && fecha <= fechaFin) {
                    const registrosDia = data[fecha];
                    Object.keys(registrosDia).forEach(id => {
                        registros.push({
                            id,
                            fecha,
                            ...registrosDia[id]
                        });
                    });
                }
            });
        }

        // Ordenar por fecha y timestamp
        registros.sort((a, b) => {
            if (a.fecha !== b.fecha) {
                return a.fecha.localeCompare(b.fecha);
            }
            return a.timestamp - b.timestamp;
        });

        return registros;
    },

    /**
     * Calcula horas trabajadas desde los registros de asistencia
     * @param {Array} registros - Registros de entrada/salida
     * @returns {Array} Registros con horas calculadas
     */
    calcularHorasDesdeRegistros(registros) {
        const registrosPorDia = {};

        // Agrupar por fecha
        registros.forEach(r => {
            if (!registrosPorDia[r.fecha]) {
                registrosPorDia[r.fecha] = [];
            }
            registrosPorDia[r.fecha].push(r);
        });

        const resultado = [];

        // Calcular horas para cada día
        Object.keys(registrosPorDia).forEach(fecha => {
            const registrosDia = registrosPorDia[fecha].sort((a, b) => a.timestamp - b.timestamp);

            let entrada = null;
            let totalHoras = 0;

            registrosDia.forEach(registro => {
                if (registro.tipo === 'entrada') {
                    // Si había una entrada previa sin salida, agregarla al resultado
                    if (entrada) {
                        resultado.push({
                            fecha,
                            horaEntrada: entrada.hora,
                            horaSalida: 'Pendiente',
                            horasTrabajadas: 0,
                            entrada: entrada,
                            salida: null,
                            pendiente: true
                        });
                    }
                    entrada = registro;
                } else if (registro.tipo === 'salida' && entrada) {
                    // Calcular horas entre entrada y salida
                    const diffMs = registro.timestamp - entrada.timestamp;
                    const horas = diffMs / (1000 * 60 * 60);
                    totalHoras += horas;

                    resultado.push({
                        fecha,
                        horaEntrada: entrada.hora,
                        horaSalida: registro.hora,
                        horasTrabajadas: parseFloat(horas.toFixed(2)),
                        entrada: entrada,
                        salida: registro,
                        pendiente: false
                    });

                    entrada = null;
                }
            });

            // Si queda una entrada sin salida al final del día, agregarla
            if (entrada) {
                resultado.push({
                    fecha,
                    horaEntrada: entrada.hora,
                    horaSalida: 'Pendiente',
                    horasTrabajadas: 0,
                    entrada: entrada,
                    salida: null,
                    pendiente: true
                });
            }
        });

        return resultado;
    }
};

// Export to window
window.FirebaseHelpers = FirebaseHelpers;

