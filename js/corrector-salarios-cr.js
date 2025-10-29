// ============================================
// CORRECTOR DE CÁLCULOS DE SALARIOS
// Script para corregir cálculos incorrectos en el sistema
// ============================================

import CalculadorSalariosUnificado from './js/services/calculador-salarios-unificado.js';

// Crear instancia del calculador unificado
const calculadorUnificado = new CalculadorSalariosUnificado();

/**
 * Función para corregir los cálculos de salarios de todos los empleados
 */
window.corregirCalculosSalarios = async function() {
    console.log('🔧 Iniciando corrección de cálculos de salarios...');
    
    try {
        // Verificar si existe el sistema de planillas
        if (typeof window.sistemaPlanillas === 'undefined') {
            console.error('❌ Sistema de planillas no encontrado');
            return;
        }

        const empleados = window.sistemaPlanillas.empleados;
        console.log(`📊 Procesando ${empleados.length} empleados...`);

        let empleadosCorregidos = 0;
        const correcciones = [];

        for (const empleado of empleados) {
            console.log(`\n🔄 Procesando: ${empleado.nombre}`);
            
            // Obtener asistencias del empleado para el último mes
            const asistencias = window.sistemaPlanillas.asistencias.filter(a => a.empleadoId === empleado.id);
            
            if (asistencias.length === 0) {
                console.log(`   ⚠️ Sin asistencias registradas`);
                continue;
            }

            // Preparar datos para el cálculo unificado
            const diasTrabajados = asistencias.map(asistencia => ({
                fecha: asistencia.fecha,
                horas: parseFloat(asistencia.horas || 0),
                esFeriado: false // Se puede mejorar para detectar feriados
            }));

            // Calcular con el sistema unificado
            const calculoCorregido = calculadorUnificado.calcularSalarioEmpleado({
                empleado: empleado,
                diasTrabajados: diasTrabajados,
                bonificaciones: 0,
                rebajos: 0
            });

            // Mostrar comparación
            console.log(`   📋 Jornada: ${empleado.jornada}`);
            console.log(`   ⏰ Horas trabajadas: ${calculoCorregido.periodo.totalHorasTrabajadas}`);
            console.log(`   💰 Salario base calculado: ${calculadorUnificado.formatearMoneda(calculoCorregido.calculos.salarioBase)}`);
            console.log(`   📊 Horas extra: ${calculoCorregido.periodo.totalHorasExtra}`);
            
            if (calculoCorregido.validaciones.alertas.length > 0) {
                console.log(`   🚨 Alertas: ${calculoCorregido.validaciones.alertas.join(', ')}`);
            }

            correcciones.push({
                empleado: empleado.nombre,
                calculo: calculoCorregido
            });

            empleadosCorregidos++;
        }

        console.log(`\n✅ Corrección completada: ${empleadosCorregidos} empleados procesados`);
        
        // Mostrar resumen
        mostrarResumenCorrecciones(correcciones);

        return correcciones;

    } catch (error) {
        console.error('❌ Error durante la corrección:', error);
        throw error;
    }
};

/**
 * Función para mostrar el resumen de correcciones
 */
function mostrarResumenCorrecciones(correcciones) {
    console.log('\n📊 RESUMEN DE CORRECCIONES');
    console.log('============================');
    
    correcciones.forEach(correccion => {
        const { empleado, calculo } = correccion;
        console.log(`\n👤 ${empleado}:`);
        console.log(`   Jornada: ${calculo.empleado.jornada}`);
        console.log(`   Horas trabajadas: ${calculo.periodo.totalHorasTrabajadas}`);
        console.log(`   Horas ordinarias: ${calculo.periodo.totalHorasOrdinarias}`);
        console.log(`   Horas extra: ${calculo.periodo.totalHorasExtra}`);
        console.log(`   Salario base: ${calculadorUnificado.formatearMoneda(calculo.calculos.salarioBase)}`);
        console.log(`   Salario bruto: ${calculadorUnificado.formatearMoneda(calculo.calculos.salarioBruto)}`);
        console.log(`   Salario neto: ${calculadorUnificado.formatearMoneda(calculo.calculos.salarioNeto)}`);
        
        if (calculo.validaciones.alertas.length > 0) {
            console.log(`   🚨 Alertas: ${calculo.validaciones.alertas.join(', ')}`);
        }
    });
}

/**
 * Función para corregir un empleado específico
 */
window.corregirEmpleadoEspecifico = function(nombreEmpleado) {
    console.log(`🔧 Corrigiendo empleado específico: ${nombreEmpleado}`);
    
    if (typeof window.sistemaPlanillas === 'undefined') {
        console.error('❌ Sistema de planillas no encontrado');
        return;
    }

    const empleado = window.sistemaPlanillas.empleados.find(e => 
        e.nombre.toLowerCase().includes(nombreEmpleado.toLowerCase())
    );

    if (!empleado) {
        console.error(`❌ Empleado "${nombreEmpleado}" no encontrado`);
        return;
    }

    console.log(`✅ Empleado encontrado: ${empleado.nombre}`);
    console.log(`   Jornada actual: ${empleado.jornada}`);
    console.log(`   Salario/hora: ₡${empleado.salarioHora}`);
    
    // Obtener asistencias
    const asistencias = window.sistemaPlanillas.asistencias.filter(a => a.empleadoId === empleado.id);
    console.log(`   Asistencias registradas: ${asistencias.length}`);
    
    if (asistencias.length === 0) {
        console.log('⚠️ Sin asistencias registradas para este empleado');
        return;
    }

    // Preparar datos para cálculo
    const diasTrabajados = asistencias.map(asistencia => ({
        fecha: asistencia.fecha,
        horas: parseFloat(asistencia.horas || 0),
        esFeriado: false
    }));

    // Calcular con sistema unificado
    const calculoCorregido = calculadorUnificado.calcularSalarioEmpleado({
        empleado: empleado,
        diasTrabajados: diasTrabajados,
        bonificaciones: 0,
        rebajos: 0
    });

    // Mostrar reporte detallado
    console.log(calculadorUnificado.generarReporteDetallado(calculoCorregido));

    return calculoCorregido;
};

/**
 * Función para verificar problemas específicos de jornadas
 */
window.verificarProblemasJornadas = function() {
    console.log('🔍 Verificando problemas de jornadas...');
    
    if (typeof window.sistemaPlanillas === 'undefined') {
        console.error('❌ Sistema de planillas no encontrado');
        return;
    }

    const empleados = window.sistemaPlanillas.empleados;
    const problemas = [];

    empleados.forEach(empleado => {
        const config = calculadorUnificado.getConfiguracionJornada(empleado.jornada);
        
        // Verificar si la jornada es válida
        if (!config) {
            problemas.push({
                empleado: empleado.nombre,
                problema: `Jornada "${empleado.jornada}" no reconocida`,
                tipo: 'error'
            });
        }

        // Verificar si tiene asistencias
        const asistencias = window.sistemaPlanillas.asistencias.filter(a => a.empleadoId === empleado.id);
        if (asistencias.length === 0) {
            problemas.push({
                empleado: empleado.nombre,
                problema: 'Sin asistencias registradas',
                tipo: 'advertencia'
            });
        }

        // Verificar salario mínimo
        const categoriaInfo = calculadorUnificado.obtenerCategoriaInfo(empleado.categoria);
        if (categoriaInfo) {
            const salarioMensualCalculado = empleado.salarioHora * 240;
            if (salarioMensualCalculado < categoriaInfo.salarioMensual) {
                problemas.push({
                    empleado: empleado.nombre,
                    problema: `Salario por debajo del mínimo (₡${calculadorUnificado.formatearMoneda(salarioMensualCalculado)} < ₡${calculadorUnificado.formatearMoneda(categoriaInfo.salarioMensual)})`,
                    tipo: 'alerta'
                });
            }
        }
    });

    // Mostrar problemas encontrados
    console.log(`\n📋 PROBLEMAS ENCONTRADOS: ${problemas.length}`);
    console.log('============================');
    
    problemas.forEach(problema => {
        const icono = problema.tipo === 'error' ? '❌' : problema.tipo === 'alerta' ? '🚨' : '⚠️';
        console.log(`${icono} ${problema.empleado}: ${problema.problema}`);
    });

    return problemas;
};

/**
 * Función para mostrar información del sistema de corrección
 */
window.infoCorrectorSalarios = function() {
    console.log('🔧 CORRECTOR DE SALARIOS - SISTEMA COSTA RICA');
    console.log('==============================================');
    console.log('');
    console.log('✅ Funcionalidades:');
    console.log('  - Cálculo unificado según legislación CR');
    console.log('  - Corrección de problemas de jornadas');
    console.log('  - Validación de salarios mínimos');
    console.log('  - Reportes detallados de cálculos');
    console.log('');
    console.log('🔧 Comandos disponibles:');
    console.log('  - corregirCalculosSalarios() - Corrige todos los empleados');
    console.log('  - corregirEmpleadoEspecifico("nombre") - Corrige empleado específico');
    console.log('  - verificarProblemasJornadas() - Verifica problemas de jornadas');
    console.log('  - infoCorrectorSalarios() - Muestra esta información');
    console.log('');
    console.log('📚 Jornadas soportadas:');
    console.log('  - diurna: 8h trabajadas, 8h pagadas');
    console.log('  - diurna_acumulativa: 10h trabajadas, 8h pagadas');
    console.log('  - nocturna: 6h trabajadas, 8h pagadas');
    console.log('  - mixta: 7h trabajadas, 7h pagadas');
    console.log('  - mixta_ampliada: 8h trabajadas, 8h pagadas');
    console.log('  - parcial: 4h trabajadas, 4h pagadas');
    console.log('  - medio_tiempo: 4h trabajadas, 4h pagadas');
};

// Auto-ejecutar información al cargar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🔧 Corrector de Salarios Costa Rica cargado');
        console.log('Usa infoCorrectorSalarios() para ver más información');
    }, 3000);
});

// Exportar funciones para uso global
window.correctorSalarios = {
    corregirTodos: window.corregirCalculosSalarios,
    corregirEmpleado: window.corregirEmpleadoEspecifico,
    verificarProblemas: window.verificarProblemasJornadas,
    info: window.infoCorrectorSalarios
};






