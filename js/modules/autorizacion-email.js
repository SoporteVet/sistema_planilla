/**
 * Autorización Email Module - Sistema de Planillas Costa Rica
 * Formulario de autorización para uso de correo electrónico personal
 * Módulo provisional
 */

const AutorizacionEmailModule = {
    codigoAcceso: 'AUTH2024', // Código de acceso provisional
    empleadoActual: null,
    canvas: null,
    ctx: null,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    autorizaciones: [],
    vistaActual: 'formulario', // 'formulario' o 'lista'

    /**
     * Inicializa el módulo
     */
    init() {
        // No necesita carga inicial
    },

    /**
     * Renderiza la vista del módulo
     */
    async render() {
        // Verificar si ya está autenticado con código
        const codigoIngresado = sessionStorage.getItem('codigoAutorizacionEmail');
        
        if (!codigoIngresado) {
            this.renderPantallaCodigo();
        } else {
            if (this.vistaActual === 'lista') {
                await this.renderListaAutorizaciones();
            } else {
                await this.renderFormulario();
            }
        }
    },

    /**
     * Renderiza la pantalla de código de acceso
     */
    renderPantallaCodigo() {
        const html = `
            <div class="flex items-center justify-center min-h-screen">
                <div class="bg-white rounded-lg shadow-xl p-6 lg:p-8 w-full max-w-md">
                    <div class="text-center mb-6">
                        <div class="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                        </div>
                        <h1 class="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">Código de Acceso</h1>
                        <p class="text-gray-600">Ingrese el código para acceder al formulario de autorización</p>
                    </div>

                    <form id="formCodigoAcceso" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Código de Acceso</label>
                            <input type="text" id="inputCodigo" required
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
                                placeholder="Ingrese código" maxlength="20" autocomplete="off">
                        </div>

                        <div id="errorCodigo" class="hidden bg-red-50 text-red-600 p-3 rounded-lg text-sm"></div>

                        <button type="submit"
                            class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium">
                            Ingresar
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Autorización de Email']);

        // Configurar evento del formulario
        document.getElementById('formCodigoAcceso').addEventListener('submit', (e) => {
            e.preventDefault();
            this.validarCodigo();
        });
    },

    /**
     * Valida el código de acceso
     */
    validarCodigo() {
        const codigo = document.getElementById('inputCodigo').value.trim();
        const errorDiv = document.getElementById('errorCodigo');

        if (codigo === this.codigoAcceso) {
            sessionStorage.setItem('codigoAutorizacionEmail', 'true');
            errorDiv.classList.add('hidden');
            this.render();
        } else {
            errorDiv.textContent = 'Código incorrecto. Por favor, intente nuevamente.';
            errorDiv.classList.remove('hidden');
            document.getElementById('inputCodigo').value = '';
            document.getElementById('inputCodigo').focus();
        }
    },

    /**
     * Renderiza el formulario de autorización
     */
    async renderFormulario() {
        // Cargar empleados para autocompletar
        const empleados = await FirebaseHelpers.getEmpleados();
        const empleadosActivos = empleados.filter(e => e.estado === 'activo');

        const html = `
            <div class="max-w-4xl mx-auto space-y-6">
                <!-- Header -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-800">Formato de Autorización para Uso de Correo Electrónico Personal</h1>
                            <p class="text-sm text-gray-600 mt-1">Ley N.º 8968 - Protección de la Persona frente al Tratamiento de sus Datos Personales</p>
                        </div>
                        <div class="flex space-x-2">
                            ${Auth.isAdmin() ? `
                            <button onclick="AutorizacionEmailModule.mostrarLista()" 
                                class="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 rounded-lg">
                                Ver Autorizaciones
                            </button>
                            ` : ''}
                            <button onclick="AutorizacionEmailModule.cerrarSesion()" 
                                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                    <p class="text-sm text-gray-700">
                        En cumplimiento de la Ley N.º 8968, Veterinaria San Martín de Porres solicita su consentimiento expreso 
                        para el uso de su correo electrónico personal con las finalidades específicas indicadas a continuación, 
                        garantizando que la información será utilizada únicamente para los fines indicados y con las medidas de 
                        seguridad correspondientes.
                    </p>
                </div>

                <form id="formAutorizacion" class="bg-white rounded-lg shadow-lg p-6 space-y-6">
                    <!-- Sección 1: Datos del Colaborador -->
                    <div class="border-b border-gray-200 pb-6">
                        <h2 class="text-xl font-semibold text-gray-800 mb-4">1. DATOS DEL COLABORADOR</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Nombre Completo *</label>
                                <input type="text" id="nombreCompleto" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ingrese nombre completo">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Número de Cédula *</label>
                                <input type="text" id="numeroCedula" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ingrese número de cédula">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Puesto *</label>
                                <input type="text" id="puesto" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ingrese puesto">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico Personal *</label>
                                <input type="email" id="correoPersonal" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="correo@ejemplo.com">
                            </div>
                        </div>
                    </div>

                    <!-- Sección 2: Finalidad del Uso -->
                    <div class="border-b border-gray-200 pb-6">
                        <h2 class="text-xl font-semibold text-gray-800 mb-4">2. FINALIDAD DEL USO DEL CORREO ELECTRÓNICO PERSONAL</h2>
                        <p class="text-sm text-gray-600 mb-4">Marque con una "X" su decisión para cada tipo de comunicación:</p>
                        
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-50">
                                        <th class="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Tipo de Comunicación</th>
                                        <th class="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 w-32">Autorizo</th>
                                        <th class="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 w-32">No Autorizo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                            Envío de comprobantes de pago (planilla, aguinaldo, etc.)
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="comprobantes" value="autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="comprobantes" value="no_autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                            Envío de comunicados internos (políticas, avisos generales, procedimientos)
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="comunicados" value="autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="comunicados" value="no_autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                    </tr>
                                    <tr class="bg-gray-50">
                                        <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                            Envío de felicitaciones por cumpleaños
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="cumpleanos" value="autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="cumpleanos" value="no_autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                            Envío de felicitaciones por aniversarios laborales
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="aniversarios" value="autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                        <td class="border border-gray-300 px-4 py-3 text-center">
                                            <input type="radio" name="aniversarios" value="no_autorizo" class="w-4 h-4 text-blue-600">
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Sección 3: Declaración de Consentimiento -->
                    <div class="border-b border-gray-200 pb-6">
                        <h2 class="text-xl font-semibold text-gray-800 mb-4">3. DECLARACIÓN DE CONSENTIMIENTO</h2>
                        <p class="text-sm text-gray-700 mb-3">Declaro que he sido debidamente informado(a) de lo siguiente:</p>
                        <ul class="space-y-2 text-sm text-gray-700 ml-4">
                            <li class="flex items-start">
                                <span class="mr-2">•</span>
                                <span>Que mi correo electrónico personal constituye un dato personal protegido por la Ley N.º 8968.</span>
                            </li>
                            <li class="flex items-start">
                                <span class="mr-2">•</span>
                                <span>Que la Veterinaria San Martín de Porres utilizará mi correo únicamente para las finalidades autorizadas en este documento.</span>
                            </li>
                            <li class="flex items-start">
                                <span class="mr-2">•</span>
                                <span>Que mi consentimiento es voluntario, informado y específico.</span>
                            </li>
                            <li class="flex items-start">
                                <span class="mr-2">•</span>
                                <span>Que puedo revocar este consentimiento en cualquier momento, mediante solicitud escrita, sin que ello implique sanción alguna.</span>
                            </li>
                            <li class="flex items-start">
                                <span class="mr-2">•</span>
                                <span>Que mis datos serán tratados con confidencialidad y no serán compartidos con terceros sin mi autorización, salvo obligación legal.</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Sección 4: Vigencia -->
                    <div class="border-b border-gray-200 pb-6">
                        <h2 class="text-xl font-semibold text-gray-800 mb-4">4. VIGENCIA</h2>
                        <p class="text-sm text-gray-700">
                            Este consentimiento tendrá vigencia mientras exista relación laboral o de prestación de servicios, 
                            o hasta que el colaborador revoque su autorización por escrito.
                        </p>
                    </div>

                    <!-- Sección 5: Firma -->
                    <div>
                        <h2 class="text-xl font-semibold text-gray-800 mb-4">5. FIRMA</h2>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Nombre del colaborador *</label>
                                <input type="text" id="nombreFirma" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Ingrese su nombre completo para la firma">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Firma Digital *</label>
                                <div class="border-2 border-gray-300 rounded-lg p-4 bg-white">
                                    <canvas id="canvasFirma" 
                                        class="border border-gray-200 rounded cursor-crosshair"
                                        style="touch-action: none; width: 100%; max-width: 600px; height: 200px; display: block;"></canvas>
                                    <div class="flex justify-between items-center mt-2">
                                        <button type="button" onclick="AutorizacionEmailModule.limpiarFirma()" 
                                            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">
                                            Limpiar Firma
                                        </button>
                                        <span class="text-xs text-gray-500">Firme en el recuadro arriba</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                                <input type="date" id="fechaFirma" required
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                    </div>

                    <!-- Botones de acción -->
                    <div class="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                        <button type="button" onclick="AutorizacionEmailModule.generarPDFEnBlanco()" 
                            class="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Generar PDF (en blanco)
                        </button>
                        <button type="button" onclick="AutorizacionEmailModule.limpiarFormulario()" 
                            class="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Limpiar Formulario
                        </button>
                        <button type="submit" 
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                            Guardar Autorización
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Autorización de Email', 'Formulario']);

        // Inicializar canvas de firma
        this.inicializarCanvas();

        // Configurar evento del formulario
        document.getElementById('formAutorizacion').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarAutorizacion();
        });
    },

    /**
     * Inicializa el canvas para la firma digital
     */
    inicializarCanvas() {
        this.canvas = document.getElementById('canvasFirma');
        if (!this.canvas) return;

        // Esperar un momento para que el DOM se renderice completamente
        setTimeout(() => {
            // Configurar tamaño del canvas
            const container = this.canvas.parentElement;
            const containerWidth = container.clientWidth - 32; // Restar padding
            const canvasHeight = 200;
            const canvasWidth = Math.min(containerWidth, 600);
            
            // Establecer tamaño visual
            this.canvas.style.width = canvasWidth + 'px';
            this.canvas.style.height = canvasHeight + 'px';
            
            // Establecer tamaño interno (sin escalado DPI para simplificar)
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;

            this.ctx = this.canvas.getContext('2d');
            
            // Configurar estilo de dibujo
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2.5;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.configurarEventos();
        }, 100);
    },

    /**
     * Configura los eventos del canvas
     */
    configurarEventos() {
        if (!this.canvas) return;

        // Limpiar listeners anteriores si existen
        if (this.handleMouseDown) {
            this.canvas.removeEventListener('mousedown', this.handleMouseDown);
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.canvas.removeEventListener('mouseup', this.handleMouseUp);
            this.canvas.removeEventListener('mouseout', this.handleMouseOut);
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
            this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        }

        // Crear handlers
        this.handleMouseDown = (e) => this.iniciarDibujo(e);
        this.handleMouseMove = (e) => this.dibujar(e);
        this.handleMouseUp = () => this.detenerDibujo();
        this.handleMouseOut = () => this.detenerDibujo();
        this.handleTouchStart = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {}
            };
            this.iniciarDibujo(mouseEvent);
        };
        this.handleTouchMove = (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {}
            };
            this.dibujar(mouseEvent);
        };
        this.handleTouchEnd = (e) => {
            e.preventDefault();
            this.detenerDibujo();
        };

        // Eventos del mouse
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mouseout', this.handleMouseOut);

        // Eventos táctiles
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    },

    /**
     * Obtiene las coordenadas del evento relativas al canvas
     */
    obtenerCoordenadas(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Calcular escala entre tamaño visual y tamaño interno
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        // Obtener posición relativa al canvas visual
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Aplicar escala para convertir a coordenadas del canvas interno
        return {
            x: x * scaleX,
            y: y * scaleY
        };
    },

    /**
     * Inicia el dibujo en el canvas
     */
    iniciarDibujo(e) {
        this.isDrawing = true;
        const coords = this.obtenerCoordenadas(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
        
        // Dibujar un punto inicial para que la firma comience inmediatamente
        this.ctx.beginPath();
        this.ctx.arc(this.lastX, this.lastY, this.ctx.lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();
    },

    /**
     * Dibuja en el canvas
     */
    dibujar(e) {
        if (!this.isDrawing) return;

        const coords = this.obtenerCoordenadas(e);
        const currentX = coords.x;
        const currentY = coords.y;

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();

        this.lastX = currentX;
        this.lastY = currentY;
    },

    /**
     * Detiene el dibujo
     */
    detenerDibujo() {
        this.isDrawing = false;
    },

    /**
     * Limpia la firma del canvas
     */
    limpiarFirma() {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    /**
     * Limpia todo el formulario
     */
    limpiarFormulario() {
        if (confirm('¿Está seguro de que desea limpiar todo el formulario?')) {
            document.getElementById('formAutorizacion').reset();
            this.limpiarFirma();
        }
    },

    /**
     * Guarda la autorización en Firebase
     */
    async guardarAutorizacion() {
        // Validar que todos los campos requeridos estén llenos
        const nombreCompleto = document.getElementById('nombreCompleto').value.trim();
        const numeroCedula = document.getElementById('numeroCedula').value.trim();
        const puesto = document.getElementById('puesto').value.trim();
        const correoPersonal = document.getElementById('correoPersonal').value.trim();
        const nombreFirma = document.getElementById('nombreFirma').value.trim();
        const fechaFirma = document.getElementById('fechaFirma').value;

        // Validar autorizaciones
        const comprobantes = document.querySelector('input[name="comprobantes"]:checked');
        const comunicados = document.querySelector('input[name="comunicados"]:checked');
        const cumpleanos = document.querySelector('input[name="cumpleanos"]:checked');
        const aniversarios = document.querySelector('input[name="aniversarios"]:checked');

        if (!comprobantes || !comunicados || !cumpleanos || !aniversarios) {
            Utils.showToast('Por favor, complete todas las autorizaciones', 'error');
            return;
        }

        // Validar que haya una firma
        const imagenFirma = this.canvas.toDataURL('image/png');
        const esCanvasVacio = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
            .data.every(channel => channel === 0);

        if (esCanvasVacio) {
            Utils.showToast('Por favor, firme el documento', 'error');
            return;
        }

        try {
            Utils.showLoading('Guardando autorización...');

            const autorizacion = {
                nombreCompleto,
                numeroCedula,
                puesto,
                correoPersonal,
                autorizaciones: {
                    comprobantes: comprobantes.value,
                    comunicados: comunicados.value,
                    cumpleanos: cumpleanos.value,
                    aniversarios: aniversarios.value
                },
                nombreFirma,
                fechaFirma,
                firmaDigital: imagenFirma,
                fechaCreacion: new Date().toISOString(),
                timestamp: Date.now()
            };

            // Guardar en Firebase
            await FirebaseHelpers.set(`${CONFIG.DB_PATHS.AUTORIZACIONES_EMAIL}/${numeroCedula}`, autorizacion);

            Utils.hideLoading();
            Utils.showToast('Autorización guardada exitosamente', 'success');

            // Limpiar formulario después de guardar
            setTimeout(() => {
                document.getElementById('formAutorizacion').reset();
                this.limpiarFirma();
            }, 2000);

        } catch (error) {
            console.error('Error guardando autorización:', error);
            Utils.hideLoading();
            Utils.showToast('Error al guardar la autorización', 'error');
        }
    },

    /**
     * Muestra la lista de autorizaciones
     */
    async mostrarLista() {
        // Solo administradores pueden ver la lista
        if (!Auth.isAdmin()) {
            Utils.showToast('No tiene permisos para ver esta información', 'error');
            this.vistaActual = 'formulario';
            await this.render();
            return;
        }
        
        this.vistaActual = 'lista';
        await this.render();
    },

    /**
     * Vuelve al formulario
     */
    mostrarFormulario() {
        this.vistaActual = 'formulario';
        this.render();
    },

    /**
     * Carga las autorizaciones desde Firebase
     */
    async cargarAutorizaciones() {
        try {
            const data = await FirebaseHelpers.once(CONFIG.DB_PATHS.AUTORIZACIONES_EMAIL);
            if (data) {
                this.autorizaciones = Object.keys(data).map(cedula => ({
                    cedula,
                    ...data[cedula]
                })).sort((a, b) => {
                    // Ordenar por fecha más reciente primero
                    return (b.timestamp || 0) - (a.timestamp || 0);
                });
            } else {
                this.autorizaciones = [];
            }
        } catch (error) {
            console.error('Error cargando autorizaciones:', error);
            this.autorizaciones = [];
            Utils.showToast('Error al cargar las autorizaciones', 'error');
        }
    },

    /**
     * Renderiza la lista de autorizaciones
     */
    async renderListaAutorizaciones() {
        // Solo administradores pueden ver la lista
        if (!Auth.isAdmin()) {
            Utils.showToast('No tiene permisos para ver esta información', 'error');
            this.vistaActual = 'formulario';
            await this.renderFormulario();
            return;
        }

        await this.cargarAutorizaciones();

        const html = `
            <div class="max-w-6xl mx-auto space-y-6">
                <!-- Header -->
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h1 class="text-2xl font-bold text-gray-800">Autorizaciones de Correo Electrónico</h1>
                            <p class="text-sm text-gray-600 mt-1">Lista de empleados que han firmado la autorización</p>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="AutorizacionEmailModule.mostrarFormulario()" 
                                class="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 border border-green-600 rounded-lg">
                                Nuevo Formulario
                            </button>
                            <button onclick="AutorizacionEmailModule.cerrarSesion()" 
                                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Estadísticas -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="stat-card">
                        <div class="stat-value text-blue-600">${this.autorizaciones.length}</div>
                        <div class="stat-label">Total Autorizaciones</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value text-green-600">${this.autorizaciones.filter(a => a.autorizaciones?.comprobantes === 'autorizo').length}</div>
                        <div class="stat-label">Autorizan Comprobantes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value text-purple-600">${this.autorizaciones.filter(a => a.autorizaciones?.comunicados === 'autorizo').length}</div>
                        <div class="stat-label">Autorizan Comunicados</div>
                    </div>
                </div>

                <!-- Tabla de autorizaciones -->
                <div class="card">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nombre Completo</th>
                                    <th>Cédula</th>
                                    <th>Puesto</th>
                                    <th>Correo</th>
                                    <th>Fecha de Firma</th>
                                    <th>Autorizaciones</th>
                                    ${Auth.isAdmin() ? '<th>Acciones</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderTablaAutorizaciones()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Autorización de Email', 'Lista de Autorizaciones']);
    },

    /**
     * Renderiza la tabla de autorizaciones
     */
    renderTablaAutorizaciones() {
        const colSpan = Auth.isAdmin() ? 7 : 6;
        if (this.autorizaciones.length === 0) {
            return `
                <tr>
                    <td colspan="${colSpan}" class="text-center py-8 text-gray-500">
                        No hay autorizaciones registradas aún.
                    </td>
                </tr>
            `;
        }

        return this.autorizaciones.map(aut => {
            // Formatear fecha sin problemas de zona horaria
            let fechaFirma = 'N/A';
            if (aut.fechaFirma) {
                if (typeof aut.fechaFirma === 'string' && aut.fechaFirma.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const partes = aut.fechaFirma.split('-');
                    const año = parseInt(partes[0], 10);
                    const mes = parseInt(partes[1], 10) - 1;
                    const dia = parseInt(partes[2], 10);
                    const fecha = new Date(año, mes, dia);
                    fechaFirma = fecha.toLocaleDateString('es-CR');
                } else {
                    const fecha = new Date(aut.fechaFirma);
                    fechaFirma = fecha.toLocaleDateString('es-CR');
                }
            }
            const autorizaciones = aut.autorizaciones || {};
            
            const badges = [];
            if (autorizaciones.comprobantes === 'autorizo') badges.push('<span class="badge badge-success">Comprobantes</span>');
            if (autorizaciones.comunicados === 'autorizo') badges.push('<span class="badge badge-info">Comunicados</span>');
            if (autorizaciones.cumpleanos === 'autorizo') badges.push('<span class="badge badge-primary">Cumpleaños</span>');
            if (autorizaciones.aniversarios === 'autorizo') badges.push('<span class="badge badge-secondary">Aniversarios</span>');

            const botonDetalle = Auth.isAdmin() ? `
                    <td>
                        <button onclick="AutorizacionEmailModule.verDetalle('${aut.numeroCedula}')" 
                            class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                            Ver Detalle
                        </button>
                    </td>
            ` : '';

            return `
                <tr>
                    <td class="font-medium">${aut.nombreCompleto || 'N/A'}</td>
                    <td>${aut.numeroCedula || 'N/A'}</td>
                    <td>${aut.puesto || 'N/A'}</td>
                    <td class="text-sm">${aut.correoPersonal || 'N/A'}</td>
                    <td>${fechaFirma}</td>
                    <td>
                        <div class="flex flex-wrap gap-1">
                            ${badges.length > 0 ? badges.join('') : '<span class="text-gray-400 text-xs">Sin autorizaciones</span>'}
                        </div>
                    </td>
                    ${botonDetalle}
                </tr>
            `;
        }).join('');
    },

    /**
     * Muestra el detalle de una autorización
     */
    async verDetalle(cedula) {
        // Solo administradores pueden ver detalles
        if (!Auth.isAdmin()) {
            Utils.showToast('No tiene permisos para ver esta información', 'error');
            return;
        }

        const autorizacion = this.autorizaciones.find(a => a.numeroCedula === cedula);
        if (!autorizacion) {
            Utils.showToast('Autorización no encontrada', 'error');
            return;
        }

        // Formatear fecha de firma sin problemas de zona horaria
        let fechaFirma = 'N/A';
        if (autorizacion.fechaFirma) {
            if (typeof autorizacion.fechaFirma === 'string' && autorizacion.fechaFirma.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const partes = autorizacion.fechaFirma.split('-');
                const año = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1;
                const dia = parseInt(partes[2], 10);
                const fecha = new Date(año, mes, dia);
                fechaFirma = fecha.toLocaleDateString('es-CR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } else {
                const fecha = new Date(autorizacion.fechaFirma);
                fechaFirma = fecha.toLocaleDateString('es-CR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }

        // Formatear fecha de creación
        let fechaCreacion = 'N/A';
        if (autorizacion.fechaCreacion) {
            const fecha = new Date(autorizacion.fechaCreacion);
            fechaCreacion = fecha.toLocaleDateString('es-CR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        const autorizaciones = autorizacion.autorizaciones || {};

        const html = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                        <h2 class="text-2xl font-bold text-gray-800">Detalle de Autorización</h2>
                        <button onclick="this.closest('.fixed').remove()" 
                            class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-6">
                        <!-- Datos del Colaborador -->
                        <div class="border-b border-gray-200 pb-4">
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Datos del Colaborador</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="text-sm font-medium text-gray-600">Nombre Completo</label>
                                    <p class="text-gray-800">${autorizacion.nombreCompleto || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-600">Número de Cédula</label>
                                    <p class="text-gray-800">${autorizacion.numeroCedula || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-600">Puesto</label>
                                    <p class="text-gray-800">${autorizacion.puesto || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-600">Correo Electrónico Personal</label>
                                    <p class="text-gray-800">${autorizacion.correoPersonal || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Autorizaciones -->
                        <div class="border-b border-gray-200 pb-4">
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Autorizaciones</h3>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <span class="text-gray-700">Envío de comprobantes de pago</span>
                                    <span class="px-3 py-1 rounded text-sm font-medium ${autorizaciones.comprobantes === 'autorizo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${autorizaciones.comprobantes === 'autorizo' ? 'Autorizado' : 'No Autorizado'}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <span class="text-gray-700">Envío de comunicados internos</span>
                                    <span class="px-3 py-1 rounded text-sm font-medium ${autorizaciones.comunicados === 'autorizo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${autorizaciones.comunicados === 'autorizo' ? 'Autorizado' : 'No Autorizado'}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <span class="text-gray-700">Envío de felicitaciones por cumpleaños</span>
                                    <span class="px-3 py-1 rounded text-sm font-medium ${autorizaciones.cumpleanos === 'autorizo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${autorizaciones.cumpleanos === 'autorizo' ? 'Autorizado' : 'No Autorizado'}
                                    </span>
                                </div>
                                <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <span class="text-gray-700">Envío de felicitaciones por aniversarios laborales</span>
                                    <span class="px-3 py-1 rounded text-sm font-medium ${autorizaciones.aniversarios === 'autorizo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${autorizaciones.aniversarios === 'autorizo' ? 'Autorizado' : 'No Autorizado'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Firma -->
                        <div class="border-b border-gray-200 pb-4">
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Firma</h3>
                            <div class="space-y-3">
                                <div>
                                    <label class="text-sm font-medium text-gray-600">Nombre del Firmante</label>
                                    <p class="text-gray-800">${autorizacion.nombreFirma || 'N/A'}</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-600">Fecha de Firma</label>
                                    <p class="text-gray-800">${fechaFirma}</p>
                                </div>
                                <div>
                                    <label class="text-sm font-medium text-gray-600 mb-2 block">Firma Digital</label>
                                    ${autorizacion.firmaDigital ? 
                                        `<img src="${autorizacion.firmaDigital}" alt="Firma" class="border border-gray-300 rounded p-2 bg-white max-w-full" style="max-height: 200px;">` : 
                                        '<p class="text-gray-400">No disponible</p>'
                                    }
                                </div>
                            </div>
                        </div>

                        <!-- Información Adicional -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-800 mb-4">Información Adicional</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="text-sm font-medium text-gray-600">Fecha de Creación</label>
                                    <p class="text-gray-800">${fechaCreacion}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end space-x-2">
                        <button onclick="AutorizacionEmailModule.generarPDF('${cedula}')" 
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Generar PDF
                        </button>
                        <button onclick="this.closest('.fixed').remove()" 
                            class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = html;
    },

    /**
     * Genera un PDF del formulario en blanco (sin necesidad de llenar datos)
     */
    async generarPDFEnBlanco() {
        const autorizacionVacia = {
            nombreCompleto: '',
            numeroCedula: '',
            puesto: '',
            correoPersonal: '',
            autorizaciones: {},
            nombreFirma: '',
            fechaFirma: new Date().toISOString().split('T')[0],
            firmaDigital: null
        };
        const filename = `Autorizacion_Email_Formulario_En_Blanco_${new Date().toISOString().split('T')[0]}.pdf`;
        await this._generarPDFConDatos(autorizacionVacia, filename);
    },

    /**
     * Genera un PDF del consentimiento completo (desde lista, con datos guardados)
     */
    async generarPDF(cedula) {
        // Solo administradores pueden generar PDFs desde la lista
        if (!Auth.isAdmin()) {
            Utils.showToast('No tiene permisos para generar PDFs', 'error');
            return;
        }

        const autorizacion = this.autorizaciones.find(a => a.numeroCedula === cedula);
        if (!autorizacion) {
            Utils.showToast('Autorización no encontrada', 'error');
            return;
        }

        const filename = `Autorizacion_Email_${autorizacion.numeroCedula || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`;
        await this._generarPDFConDatos(autorizacion, filename);
    },

    /**
     * Genera el PDF con los datos de una autorización (completa o en blanco)
     * @param {Object} autorizacion - Objeto con datos de la autorización (puede tener campos vacíos)
     * @param {string} filename - Nombre del archivo a descargar
     */
    async _generarPDFConDatos(autorizacion, filename) {
        try {
            Utils.showLoading('Generando PDF...');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            const primaryColor = [30, 64, 175];
            const lightGray = [240, 240, 240];
            let yPos = 15;
            const marginLeft = 15;
            const marginRight = 15;
            const pageWidth = 210;
            const contentWidth = pageWidth - marginLeft - marginRight;

            // ========== ENCABEZADO ==========
            doc.setFillColor(...primaryColor);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('Veterinaria San Martín de Porres', pageWidth / 2, 12, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('FORMATO DE AUTORIZACIÓN PARA USO DE CORREO ELECTRÓNICO PERSONAL', pageWidth / 2, 20, { align: 'center' });
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text('(Ley N.º 8968 - Protección de la Persona frente al Tratamiento de sus Datos Personales)', pageWidth / 2, 28, { align: 'center' });

            yPos = 42;

            // Información de contacto
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(8);
            doc.text('Tel: 4000-1365 | 8612-3030 | Email: info@vetsanmartin.com', marginLeft, yPos);
            yPos += 4;
            doc.text('San Rafael Abajo de Desamparados', marginLeft, yPos);
            yPos += 8;

            // Línea separadora
            doc.setDrawColor(200, 200, 200);
            doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
            yPos += 6;

            // ========== INTRODUCCIÓN ==========
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const introText = 'En cumplimiento de la Ley N.º 8968, Veterinaria San Martín de Porres solicita su consentimiento expreso para el uso de su correo electrónico personal con las finalidades específicas indicadas a continuación, garantizando que la información será utilizada únicamente para los fines indicados y con las medidas de seguridad correspondientes.';
            const introLines = doc.splitTextToSize(introText, contentWidth);
            doc.text(introLines, marginLeft, yPos);
            yPos += introLines.length * 5 + 8;

            // ========== SECCIÓN 1: DATOS DEL COLABORADOR ==========
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('1. DATOS DEL COLABORADOR', marginLeft, yPos);
            yPos += 7;

            // Fondo gris para la sección
            doc.setFillColor(...lightGray);
            doc.rect(marginLeft, yPos - 2, contentWidth, 28, 'F');

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const vacio = (v) => (v === undefined || v === null || String(v).trim() === '') ? '_________________________' : v;
            doc.text(`Nombre completo: ${vacio(autorizacion.nombreCompleto)}`, marginLeft + 2, yPos + 6);
            doc.text(`Número de cédula: ${vacio(autorizacion.numeroCedula)}`, marginLeft + 2, yPos + 11);
            doc.text(`Puesto: ${vacio(autorizacion.puesto)}`, marginLeft + 2, yPos + 16);
            doc.text(`Correo electrónico personal: ${vacio(autorizacion.correoPersonal)}`, marginLeft + 2, yPos + 21);
            yPos += 32;

            // ========== SECCIÓN 2: FINALIDAD DEL USO ==========
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('2. FINALIDAD DEL USO DEL CORREO ELECTRÓNICO PERSONAL', marginLeft, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('Marque con una "X" su decisión para cada tipo de comunicación:', marginLeft, yPos);
            yPos += 7;

            const autorizaciones = autorizacion.autorizaciones || {};
            const tiposComunicacion = [
                { texto: 'Envío de comprobantes de pago (planilla, aguinaldo, etc.)', key: 'comprobantes' },
                { texto: 'Envío de comunicados internos (políticas, avisos generales, procedimientos)', key: 'comunicados' },
                { texto: 'Envío de felicitaciones por cumpleaños', key: 'cumpleanos' },
                { texto: 'Envío de felicitaciones por aniversarios laborales', key: 'aniversarios' }
            ];

            tiposComunicacion.forEach((tipo) => {
                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }

                const valor = autorizaciones[tipo.key];
                const autorizado = valor === 'autorizo';
                const noAutorizado = valor === 'no_autorizo';
                doc.setFontSize(10);
                
                // Dibujar checkboxes
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.5);
                doc.rect(marginLeft, yPos - 3, 3, 3, 'S'); // Primer checkbox
                doc.rect(marginLeft + 50, yPos - 3, 3, 3, 'S'); // Segundo checkbox
                
                // Marcar con X solo si hay valor (en blanco no se marca ninguno)
                if (autorizado) {
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'bold');
                    doc.text('X', marginLeft + 0.5, yPos - 0.5);
                } else if (noAutorizado) {
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'bold');
                    doc.text('X', marginLeft + 50.5, yPos - 0.5);
                }
                
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text('Autorizo', marginLeft + 5, yPos);
                doc.text('No Autorizo', marginLeft + 55, yPos);
                
                // Texto de la comunicación
                const textoLines = doc.splitTextToSize(tipo.texto, contentWidth - 60);
                doc.text(textoLines, marginLeft + 2, yPos + 5);
                yPos += textoLines.length * 5 + 8;
            });

            yPos += 3;

            // ========== SECCIÓN 3: DECLARACIÓN ==========
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('3. DECLARACIÓN DE CONSENTIMIENTO', marginLeft, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('Declaro que he sido debidamente informado(a) de lo siguiente:', marginLeft, yPos);
            yPos += 7;

            const declaraciones = [
                'Que mi correo electrónico personal constituye un dato personal protegido por la Ley N.º 8968.',
                'Que la Veterinaria San Martín de Porres utilizará mi correo únicamente para las finalidades autorizadas en este documento.',
                'Que mi consentimiento es voluntario, informado y específico.',
                'Que puedo revocar este consentimiento en cualquier momento, mediante solicitud escrita, sin que ello implique sanción alguna.',
                'Que mis datos serán tratados con confidencialidad y no serán compartidos con terceros sin mi autorización, salvo obligación legal.'
            ];

            declaraciones.forEach(declaracion => {
                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFontSize(10);
                doc.text('•', marginLeft, yPos);
                const declaracionLines = doc.splitTextToSize(declaracion, contentWidth - 5);
                doc.text(declaracionLines, marginLeft + 4, yPos);
                yPos += declaracionLines.length * 5 + 2;
            });

            yPos += 3;

            // ========== SECCIÓN 4: VIGENCIA ==========
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('4. VIGENCIA', marginLeft, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const vigenciaText = 'Este consentimiento tendrá vigencia mientras exista relación laboral o de prestación de servicios, o hasta que el colaborador revoque su autorización por escrito.';
            const vigenciaLines = doc.splitTextToSize(vigenciaText, contentWidth);
            doc.text(vigenciaLines, marginLeft, yPos);
            yPos += vigenciaLines.length * 5 + 8;

            // ========== SECCIÓN 5: FIRMA ==========
            if (yPos > 230) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('5. FIRMA', marginLeft, yPos);
            yPos += 7;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Nombre del colaborador: ${vacio(autorizacion.nombreFirma)}`, marginLeft, yPos);
            yPos += 8;

            // Firma digital
            if (autorizacion.firmaDigital) {
                try {
                    const img = new Image();
                    img.src = autorizacion.firmaDigital;
                    
                    await new Promise((resolve) => {
                        img.onload = () => {
                            const imgWidth = 100;
                            const imgHeight = (img.height * imgWidth) / img.width;
                            
                            // Asegurar que la firma no sea muy grande
                            const maxHeight = 40;
                            const finalHeight = imgHeight > maxHeight ? maxHeight : imgHeight;
                            const finalWidth = (img.width * finalHeight) / img.height;
                            
                            // Dibujar borde para la firma
                            doc.setDrawColor(150, 150, 150);
                            doc.setLineWidth(0.5);
                            doc.rect(marginLeft, yPos, finalWidth + 4, finalHeight + 4, 'S');
                            
                            doc.addImage(autorizacion.firmaDigital, 'PNG', marginLeft + 2, yPos + 2, finalWidth, finalHeight);
                            yPos += finalHeight + 8;
                            resolve();
                        };
                        img.onerror = () => {
                            doc.text('(Espacio para firma)', marginLeft, yPos);
                            yPos += 5;
                            resolve();
                        };
                    });
                } catch (error) {
                    console.error('Error cargando firma:', error);
                    doc.text('(Espacio para firma)', marginLeft, yPos);
                    yPos += 5;
                }
            } else {
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.rect(marginLeft, yPos, 80, 25, 'S');
                doc.text('(Espacio para firma)', marginLeft + 2, yPos + 12);
                yPos += 30;
            }

            yPos += 5;
            
            // Formatear fecha
            let fechaFirmaTexto = '_________________________';
            if (autorizacion.fechaFirma) {
                let fechaConHora = null;
                if (autorizacion.fechaCreacion) {
                    fechaConHora = new Date(autorizacion.fechaCreacion);
                } else if (autorizacion.timestamp) {
                    fechaConHora = new Date(autorizacion.timestamp);
                }
                
                if (fechaConHora && !isNaN(fechaConHora.getTime())) {
                    fechaFirmaTexto = fechaConHora.toLocaleDateString('es-CR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }) + ' a las ' + fechaConHora.toLocaleTimeString('es-CR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } else if (typeof autorizacion.fechaFirma === 'string' && autorizacion.fechaFirma.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const partes = autorizacion.fechaFirma.split('-');
                    const año = parseInt(partes[0], 10);
                    const mes = parseInt(partes[1], 10) - 1;
                    const dia = parseInt(partes[2], 10);
                    const fecha = new Date(año, mes, dia);
                    fechaFirmaTexto = fecha.toLocaleDateString('es-CR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                } else {
                    const fecha = new Date(autorizacion.fechaFirma);
                    fechaFirmaTexto = fecha.toLocaleDateString('es-CR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            }
            
            doc.text(`Fecha: ${fechaFirmaTexto}`, marginLeft, yPos);

            doc.save(filename);

            Utils.hideLoading();
            Utils.showToast('PDF generado exitosamente', 'success');

        } catch (error) {
            console.error('Error generando PDF:', error);
            Utils.hideLoading();
            Utils.showToast('Error al generar el PDF', 'error');
        }
    },

    /**
     * Cierra la sesión y vuelve a la pantalla de código
     */
    cerrarSesion() {
        sessionStorage.removeItem('codigoAutorizacionEmail');
        this.vistaActual = 'formulario';
        this.render();
    }
};

