// ============================================
// MIGRACIÓN DE DATOS EXISTENTES A SISTEMA CR
// ============================================

import { storage } from '../storage/index.js';
import { JORNADAS_LABORALES, SALARIOS_MINIMOS_2025 } from '../services/payroll-costa-rica.js';

/**
 * Migra empleados existentes al nuevo sistema costarricense
 */
export class MigracionDatosCR {
    constructor() {
        this.migracionesRealizadas = [];
    }

    /**
     * Migra todos los empleados existentes
     */
    async migrarEmpleadosExistentes() {
        console.log('🔄 Iniciando migración de empleados al sistema costarricense...');
        
        const empleados = await storage.listEmployees();
        let empleadosMigrados = 0;
        let empleadosActualizados = 0;

        for (const empleado of empleados) {
            const migracion = await this.migrarEmpleado(empleado);
            if (migracion.necesitaActualizacion) {
                await storage.updateEmployee(empleado.id, migracion.datosActualizados);
                empleadosActualizados++;
                console.log(`✅ Empleado migrado: ${empleado.nombre}`);
            } else {
                empleadosMigrados++;
                console.log(`ℹ️ Empleado ya actualizado: ${empleado.nombre}`);
            }
        }

        console.log(`🎉 Migración completada: ${empleadosActualizados} empleados actualizados, ${empleadosMigrados} ya estaban actualizados`);
        
        return {
            total: empleados.length,
            actualizados: empleadosActualizados,
            yaActualizados: empleadosMigrados,
            migraciones: this.migracionesRealizadas
        };
    }

    /**
     * Migra un empleado individual
     */
    async migrarEmpleado(empleado) {
        const migraciones = [];
        const datosActualizados = { ...empleado };

        // 1. Migrar jornada antigua a nueva nomenclatura
        if (empleado.jornada) {
            const jornadaMigrada = this.migrarJornada(empleado.jornada);
            if (jornadaMigrada !== empleado.jornada) {
                datosActualizados.jornada = jornadaMigrada;
                migraciones.push(`Jornada migrada de "${empleado.jornada}" a "${jornadaMigrada}"`);
            }
        }

        // 2. Agregar categoría basada en salario
        if (!empleado.categoria) {
            const categoria = this.determinarCategoria(empleado.salarioHora);
            datosActualizados.categoria = categoria;
            migraciones.push(`Categoría asignada: "${categoria}"`);
        }

        // 3. Agregar email si no existe
        if (!empleado.email) {
            datosActualizados.email = '';
            migraciones.push('Campo email agregado');
        }

        // 4. Agregar departamento si no existe
        if (!empleado.departamento) {
            datosActualizados.departamento = 'Operativo';
            migraciones.push('Departamento asignado: "Operativo"');
        }

        // 5. Validar y ajustar salario si es necesario
        const validacionSalario = this.validarSalarioMinimo(empleado.salarioHora, datosActualizados.categoria);
        if (validacionSalario.necesitaAjuste) {
            migraciones.push(`⚠️ Salario por debajo del mínimo: ${validacionSalario.mensaje}`);
        }

        const migracion = {
            empleado: empleado.nombre,
            migraciones: migraciones,
            datosActualizados: datosActualizados,
            necesitaActualizacion: migraciones.length > 0
        };

        this.migracionesRealizadas.push(migracion);
        return migracion;
    }

    /**
     * Migra jornadas antiguas a la nueva nomenclatura costarricense
     */
    migrarJornada(jornadaAntigua) {
        const mapeoJornadas = {
            'diurna': 'diurna',
            'nocturna': 'nocturna', 
            'mixta': 'mixta',
            'acumulativa': 'diurna_acumulativa',
            'tiempo_completo': 'diurna',
            'medio_tiempo': 'medio_tiempo',
            'tiempo_parcial': 'parcial',
            'jornada_completa': 'diurna',
            'jornada_reducida': 'parcial'
        };

        return mapeoJornadas[jornadaAntigua] || 'diurna';
    }

    /**
     * Determina la categoría del empleado basada en su salario por hora
     */
    determinarCategoria(salarioHora) {
        const salarioMensual = salarioHora * 240; // 8 horas × 30 días

        // Buscar la categoría que mejor se ajuste al salario
        const categorias = Object.entries(SALARIOS_MINIMOS_2025);
        
        for (const [key, categoria] of categorias) {
            if (salarioMensual >= categoria.salarioMensual) {
                return key;
            }
        }

        // Si no encuentra una categoría adecuada, usar la más baja
        return 'trabajador_no_calificado';
    }

    /**
     * Valida si el salario cumple con el mínimo legal
     */
    validarSalarioMinimo(salarioHora, categoria) {
        const salarioMensual = salarioHora * 240;
        const categoriaInfo = SALARIOS_MINIMOS_2025[categoria];

        if (!categoriaInfo) {
            return {
                necesitaAjuste: false,
                mensaje: 'Categoría no reconocida'
            };
        }

        if (salarioMensual < categoriaInfo.salarioMensual) {
            return {
                necesitaAjuste: true,
                mensaje: `Salario actual: ₡${salarioMensual.toLocaleString()}, Mínimo requerido: ₡${categoriaInfo.salarioMensual.toLocaleString()}`
            };
        }

        return {
            necesitaAjuste: false,
            mensaje: 'Salario cumple con el mínimo legal'
        };
    }

    /**
     * Genera un reporte de migración
     */
    generarReporteMigracion() {
        const reporte = {
            fecha: new Date().toISOString(),
            totalEmpleados: this.migracionesRealizadas.length,
            empleadosActualizados: this.migracionesRealizadas.filter(m => m.necesitaActualizacion).length,
            detalles: this.migracionesRealizadas
        };

        return reporte;
    }

    /**
     * Muestra el modal de migración
     */
    mostrarModalMigracion() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content migracion-modal">
                <div class="modal-header">
                    <h2>🔄 Migración al Sistema Costarricense</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="migracion-info">
                        <p>Se detectaron empleados con datos del sistema anterior. Esta migración:</p>
                        <ul>
                            <li>✅ Actualizará las jornadas laborales a la nomenclatura costarricense</li>
                            <li>✅ Asignará categorías basadas en los salarios actuales</li>
                            <li>✅ Agregará campos faltantes (email, departamento)</li>
                            <li>✅ Validará salarios mínimos según la legislación CR</li>
                        </ul>
                        <p><strong>¿Desea proceder con la migración?</strong></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary" id="cancelar-migracion">Cancelar</button>
                    <button class="btn" id="proceder-migracion">🔄 Proceder con Migración</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => this.cerrarModal(modal));
        modal.querySelector('#cancelar-migracion').addEventListener('click', () => this.cerrarModal(modal));
        modal.querySelector('#proceder-migracion').addEventListener('click', async () => {
            await this.ejecutarMigracion(modal);
        });

        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.cerrarModal(modal);
            }
        });
    }

    /**
     * Ejecuta la migración y muestra resultados
     */
    async ejecutarMigracion(modal) {
        const body = modal.querySelector('.modal-body');
        body.innerHTML = `
            <div class="migracion-progreso">
                <div class="spinner"></div>
                <p>Migrando empleados al sistema costarricense...</p>
            </div>
        `;

        try {
            const resultado = await this.migrarEmpleadosExistentes();
            
            body.innerHTML = `
                <div class="migracion-resultado">
                    <h3>✅ Migración Completada</h3>
                    <div class="resultado-stats">
                        <div class="stat">
                            <span class="stat-number">${resultado.total}</span>
                            <span class="stat-label">Total Empleados</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${resultado.actualizados}</span>
                            <span class="stat-label">Actualizados</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${resultado.yaActualizados}</span>
                            <span class="stat-label">Ya Actualizados</span>
                        </div>
                    </div>
                    <div class="migracion-detalles">
                        <h4>Detalles de la Migración:</h4>
                        <ul>
                            ${resultado.migraciones.map(m => `
                                <li>
                                    <strong>${m.empleado}:</strong>
                                    <ul>
                                        ${m.migraciones.map(mig => `<li>${mig}</li>`).join('')}
                                    </ul>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;

            // Actualizar botones
            const footer = modal.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="btn" id="cerrar-migracion">Cerrar</button>
            `;
            footer.querySelector('#cerrar-migracion').addEventListener('click', () => this.cerrarModal(modal));

        } catch (error) {
            console.error('Error en migración:', error);
            body.innerHTML = `
                <div class="migracion-error">
                    <h3>❌ Error en la Migración</h3>
                    <p>Ocurrió un error durante la migración: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Cierra el modal
     */
    cerrarModal(modal) {
        document.body.removeChild(modal);
    }

    /**
     * Verifica si se necesita migración
     */
    async necesitaMigracion() {
        const empleados = await storage.listEmployees();
        return empleados.some(emp => 
            !emp.categoria || 
            !emp.email || 
            !emp.departamento ||
            ['acumulativa', 'tiempo_completo', 'medio_tiempo', 'tiempo_parcial'].includes(emp.jornada)
        );
    }
}

// Exportar la clase
export default MigracionDatosCR;






