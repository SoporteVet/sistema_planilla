// ============================================
// COMPONENTE DE DESGLOSE DE CÁLCULOS COSTA RICA
// Muestra el desglose detallado paso a paso según la legislación costarricense
// ============================================

import { calculadoraCR, JORNADAS_LABORALES, SALARIOS_MINIMOS_2025, CONSTANTES_CALCULO } from '../services/payroll.js';

export class DesgloseCalculosCR {
    constructor() {
        this.modal = null;
    }

    /**
     * Muestra el desglose detallado de cálculos para un empleado
     * @param {Object} empleado - Datos del empleado
     * @param {Object} calculos - Resultados del cálculo de planilla
     * @param {Object} periodo - Información del período
     */
    mostrarDesglose(empleado, calculos, periodo) {
        this.crearModal();
        this.popularModal(empleado, calculos, periodo);
        this.mostrarModal();
    }

    /**
     * Crea el modal para mostrar el desglose
     */
    crearModal() {
        if (this.modal) {
            document.body.removeChild(this.modal);
        }

        this.modal = document.createElement('div');
        this.modal.className = 'modal-overlay';
        this.modal.innerHTML = `
            <div class="modal-content desglose-modal">
                <div class="modal-header">
                    <h2>📊 Desglose de Cálculos - Costa Rica</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" id="desglose-content">
                    <!-- Contenido se llena dinámicamente -->
                </div>
                <div class="modal-footer">
                    <button class="btn secondary" id="cerrar-desglose">Cerrar</button>
                    <button class="btn" id="imprimir-desglose">🖨️ Imprimir</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Event listeners
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.cerrarModal());
        this.modal.querySelector('#cerrar-desglose').addEventListener('click', () => this.cerrarModal());
        this.modal.querySelector('#imprimir-desglose').addEventListener('click', () => this.imprimirDesglose());
        
        // Cerrar al hacer clic fuera del modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.cerrarModal();
            }
        });
    }

    /**
     * Popula el modal con los datos del desglose
     * @param {Object} empleado - Datos del empleado
     * @param {Object} calculos - Resultados del cálculo
     * @param {Object} periodo - Información del período
     */
    popularModal(empleado, calculos, periodo) {
        const content = this.modal.querySelector('#desglose-content');
        
        const jornadaInfo = JORNADAS_LABORALES[empleado.jornada?.toUpperCase()] || JORNADAS_LABORALES.DIURNA;
        const categoriaInfo = SALARIOS_MINIMOS_2025[empleado.categoria] || SALARIOS_MINIMOS_2025.trabajador_no_calificado;
        
        content.innerHTML = `
            <div class="desglose-container">
                <!-- Información del Empleado -->
                <div class="desglose-section">
                    <h3>👤 Información del Empleado</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Nombre:</label>
                            <span>${empleado.nombre}</span>
                        </div>
                        <div class="info-item">
                            <label>Cédula:</label>
                            <span>${empleado.cedula}</span>
                        </div>
                        <div class="info-item">
                            <label>Jornada:</label>
                            <span title="${jornadaInfo.nombre}">${empleado.jornada || 'diurna'}</span>
                        </div>
                        <div class="info-item">
                            <label>Categoría:</label>
                            <span title="${categoriaInfo.categoria}">${empleado.categoria || 'trabajador_no_calificado'}</span>
                        </div>
                    </div>
                </div>

                <!-- Información de la Jornada -->
                <div class="desglose-section">
                    <h3>⏰ Información de la Jornada</h3>
                    <div class="jornada-info">
                        <p><strong>${jornadaInfo.nombre}</strong></p>
                        <p>Horario: ${jornadaInfo.horario}</p>
                        <p>Horas máximas diarias: ${jornadaInfo.horasMaximasDiarias}</p>
                        <p>Horas máximas semanales: ${jornadaInfo.horasMaximasSemanales}</p>
                        <p>Días de trabajo: ${jornadaInfo.diasTrabajo}</p>
                        ${jornadaInfo.restriccion ? `<p class="restriccion">⚠️ ${jornadaInfo.restriccion}</p>` : ''}
                    </div>
                </div>

                <!-- Período Trabajado -->
                <div class="desglose-section">
                    <h3>📅 Período Trabajado</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Período:</label>
                            <span>${periodo.tipo || 'Mensual'}</span>
                        </div>
                        <div class="info-item">
                            <label>Fecha inicio:</label>
                            <span>${periodo.fechaInicio || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Fecha fin:</label>
                            <span>${periodo.fechaFin || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <label>Días laborados:</label>
                            <span>${calculos.diasLaborados || 0}</span>
                        </div>
                    </div>
                </div>

                <!-- Cálculos Paso a Paso -->
                <div class="desglose-section">
                    <h3>💰 Cálculos Paso a Paso</h3>
                    
                    <!-- Valor Hora Ordinaria -->
                    <div class="calculo-item">
                        <h4>1. Valor Hora Ordinaria</h4>
                        <div class="formula">
                            <p><strong>Fórmula:</strong> Salario Mensual ÷ 240 horas</p>
                            <p><strong>Cálculo:</strong> ₡${calculadoraCR.formatearMoneda(empleado.salario || 0)} ÷ 240 = <strong>₡${calculadoraCR.formatearMoneda(calculos.valorHoraOrdinaria || 0)}</strong></p>
                        </div>
                    </div>

                    <!-- Salario Base -->
                    <div class="calculo-item">
                        <h4>2. Salario Base del Período</h4>
                        <div class="formula">
                            <p><strong>Horas ordinarias:</strong> ${calculos.horasOrdinarias || 0} horas</p>
                            <p><strong>Cálculo:</strong> ${calculos.horasOrdinarias || 0} × ₡${calculadoraCR.formatearMoneda(calculos.valorHoraOrdinaria || 0)} = <strong>₡${calculadoraCR.formatearMoneda(calculos.salarioBase || 0)}</strong></p>
                        </div>
                    </div>

                    <!-- Horas Extra -->
                    <div class="calculo-item">
                        <h4>3. Horas Extra</h4>
                        <div class="formula">
                            <p><strong>Horas extra trabajadas:</strong> ${calculos.horasExtra?.cantidad || 0} horas</p>
                            <p><strong>Tipo de recargo:</strong> ${calculos.horasExtra?.tipoRecargo || 'Diurno (50%)'}</p>
                            <p><strong>Multiplicador:</strong> ${calculos.horasExtra?.multiplicadorRecargo || 1.5}</p>
                            <p><strong>Valor por hora extra:</strong> ₡${calculadoraCR.formatearMoneda(calculos.horasExtra?.valorHoraExtra || 0)}</p>
                            <p><strong>Total horas extra:</strong> ${calculos.horasExtra?.cantidad || 0} × ₡${calculadoraCR.formatearMoneda(calculos.horasExtra?.valorHoraExtra || 0)} = <strong>₡${calculadoraCR.formatearMoneda(calculos.horasExtra?.montoTotal || 0)}</strong></p>
                        </div>
                    </div>

                    <!-- Bonificaciones y Rebajos -->
                    <div class="calculo-item">
                        <h4>4. Bonificaciones y Rebajos</h4>
                        <div class="formula">
                            <p><strong>Bonificaciones:</strong> ₡${calculadoraCR.formatearMoneda(calculos.bonificaciones || 0)}</p>
                            <p><strong>Rebajos:</strong> ₡${calculadoraCR.formatearMoneda(calculos.rebajos || 0)}</p>
                        </div>
                    </div>

                    <!-- Salario Bruto -->
                    <div class="calculo-item destacado">
                        <h4>5. Salario Bruto</h4>
                        <div class="formula">
                            <p><strong>Cálculo:</strong> Salario Base + Horas Extra + Bonificaciones - Rebajos</p>
                            <p><strong>Total:</strong> ₡${calculadoraCR.formatearMoneda(calculos.salarioBase || 0)} + ₡${calculadoraCR.formatearMoneda(calculos.horasExtra?.montoTotal || 0)} + ₡${calculadoraCR.formatearMoneda(calculos.bonificaciones || 0)} - ₡${calculadoraCR.formatearMoneda(calculos.rebajos || 0)} = <strong>₡${calculadoraCR.formatearMoneda(calculos.salarioBruto || 0)}</strong></p>
                        </div>
                    </div>
                </div>

                <!-- Descuentos Obligatorios -->
                <div class="desglose-section">
                    <h3>📋 Descuentos Obligatorios</h3>
                    
                    <!-- CCSS -->
                    <div class="calculo-item">
                        <h4>CCSS (Caja Costarricense de Seguro Social)</h4>
                        <div class="formula">
                            <p><strong>Porcentaje:</strong> ${CONSTANTES_CALCULO.CCSS_PORCENTAJE}% del salario bruto</p>
                            <p><strong>Cálculo:</strong> ₡${calculadoraCR.formatearMoneda(calculos.salarioBruto || 0)} × ${CONSTANTES_CALCULO.CCSS_PORCENTAJE}% = <strong>₡${calculadoraCR.formatearMoneda(calculos.descuentos?.ccss?.monto || 0)}</strong></p>
                        </div>
                    </div>

                    <!-- Banco Popular -->
                    <div class="calculo-item">
                        <h4>Banco Popular</h4>
                        <div class="formula">
                            <p><strong>Porcentaje:</strong> ${CONSTANTES_CALCULO.BANCO_POPULAR_PORCENTAJE}% del salario bruto</p>
                            <p><strong>Cálculo:</strong> ₡${calculadoraCR.formatearMoneda(calculos.salarioBruto || 0)} × ${CONSTANTES_CALCULO.BANCO_POPULAR_PORCENTAJE}% = <strong>₡${calculadoraCR.formatearMoneda(calculos.descuentos?.bancoPopular?.monto || 0)}</strong></p>
                        </div>
                    </div>

                    <!-- Total Descuentos -->
                    <div class="calculo-item destacado">
                        <h4>Total Descuentos</h4>
                        <div class="formula">
                            <p><strong>Total:</strong> ₡${calculadoraCR.formatearMoneda(calculos.descuentos?.ccss?.monto || 0)} + ₡${calculadoraCR.formatearMoneda(calculos.descuentos?.bancoPopular?.monto || 0)} = <strong>₡${calculadoraCR.formatearMoneda(calculos.descuentos?.totalDescuentos || 0)}</strong></p>
                        </div>
                    </div>
                </div>

                <!-- Salario Neto -->
                <div class="desglose-section destacada">
                    <h3>💵 Salario Neto a Pagar</h3>
                    <div class="salario-neto">
                        <p><strong>Cálculo:</strong> Salario Bruto - Total Descuentos</p>
                        <p><strong>Total:</strong> ₡${calculadoraCR.formatearMoneda(calculos.salarioBruto || 0)} - ₡${calculadoraCR.formatearMoneda(calculos.descuentos?.totalDescuentos || 0)} = <strong class="monto-final">₡${calculadoraCR.formatearMoneda(calculos.salarioNeto || 0)}</strong></p>
                    </div>
                </div>

                <!-- Validaciones y Alertas -->
                ${calculos.validaciones?.alertas?.length > 0 || calculos.validaciones?.advertencias?.length > 0 ? `
                <div class="desglose-section">
                    <h3>⚠️ Validaciones Legales</h3>
                    ${calculos.validaciones?.alertas?.length > 0 ? `
                    <div class="alertas">
                        <h4>🚨 Alertas Críticas:</h4>
                        <ul>
                            ${calculos.validaciones.alertas.map(alerta => `<li>${alerta}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    ${calculos.validaciones?.advertencias?.length > 0 ? `
                    <div class="advertencias">
                        <h4>⚠️ Advertencias:</h4>
                        <ul>
                            ${calculos.validaciones.advertencias.map(adv => `<li>${adv}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Información Legal -->
                <div class="desglose-section">
                    <h3>📚 Información Legal</h3>
                    <div class="info-legal">
                        <p><strong>Límites Legales de Horas Extra:</strong></p>
                        <ul>
                            <li>Máximo diario: ${CONSTANTES_CALCULO.MAXIMO_HORAS_EXTRA_DIARIAS} horas extra por día</li>
                            <li>Máximo mensual: ${CONSTANTES_CALCULO.MAXIMO_HORAS_EXTRA_MENSUALES} horas extra por mes</li>
                        </ul>
                        <p><strong>Recargos por Horas Extra:</strong></p>
                        <ul>
                            <li>Hora extra diurna: ${CONSTANTES_CALCULO.RECARGO_HORA_EXTRA_DIURNA}x (50% de recargo)</li>
                            <li>Hora extra nocturna: ${CONSTANTES_CALCULO.RECARGO_HORA_EXTRA_NOCTURNA}x (50% de recargo)</li>
                            <li>Hora extra día feriado: ${CONSTANTES_CALCULO.RECARGO_HORA_EXTRA_FERIADO}x (100% de recargo)</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Muestra el modal
     */
    mostrarModal() {
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    /**
     * Cierra el modal
     */
    cerrarModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    /**
     * Imprime el desglose
     */
    imprimirDesglose() {
        const content = this.modal.querySelector('.desglose-container');
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Desglose de Cálculos - Costa Rica</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .desglose-section { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
                        .desglose-section h3 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                        .info-item { display: flex; justify-content: space-between; }
                        .calculo-item { margin: 10px 0; padding: 10px; background: #f8f9fa; }
                        .calculo-item.destacado { background: #e8f4fd; border-left: 4px solid #3498db; }
                        .formula { margin: 10px 0; }
                        .salario-neto { text-align: center; font-size: 1.2em; }
                        .monto-final { color: #27ae60; font-size: 1.5em; font-weight: bold; }
                        .alertas { background: #f8d7da; padding: 10px; border-radius: 5px; }
                        .advertencias { background: #fff3cd; padding: 10px; border-radius: 5px; }
                        @media print { .modal-footer { display: none; } }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }
}

// Exportar la clase
export default DesgloseCalculosCR;






