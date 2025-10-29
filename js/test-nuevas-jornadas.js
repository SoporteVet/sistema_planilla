// ============================================
// TEST DE NUEVAS JORNADAS LABORALES
// ============================================

console.log('🧪 Iniciando prueba de nuevas jornadas laborales...');

// Esperar a que el sistema esté cargado
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof window.sistemaPlanillas === 'undefined') {
            console.error('❌ Sistema de planillas no encontrado');
            return;
        }

        console.log('✅ Sistema de planillas cargado');
        
        // Probar configuración de jornadas
        const jornadas = window.sistemaPlanillas.jornadas;
        
        console.log('\n📋 Jornadas disponibles:');
        Object.keys(jornadas).forEach(key => {
            const jornada = jornadas[key];
            console.log(`\n✓ ${key}:`);
            console.log(`  - Nombre: ${jornada.nombre}`);
            console.log(`  - Horas por día: ${jornada.horasPorDia}`);
            console.log(`  - Horas trabajadas: ${jornada.horasTrabajadas}`);
            console.log(`  - Horas pagadas: ${jornada.horasPagadas}`);
            console.log(`  - Días por semana: ${jornada.diasPorSemana}`);
        });

        // Probar función getHorasJornada
        console.log('\n🔍 Probando función getHorasJornada:');
        const jornadasAPrueba = ['diurna', 'nocturna', 'mixta', 'mixta_ampliada', 'parcial', 'medio_tiempo', 'diurna_acumulativa', 'mixta_acumulativa'];
        
        jornadasAPrueba.forEach(jornada => {
            const horas = window.sistemaPlanillas.getHorasJornada(jornada);
            console.log(`  - ${jornada}: ${horas} horas pagadas`);
        });

        console.log('\n✅ Prueba completada');
    }, 2000);
});



