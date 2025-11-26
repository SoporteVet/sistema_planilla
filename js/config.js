/**
 * Firebase Configuration and System Constants
 * Sistema de Planillas - Costa Rica
 */

// Firebase Configuration
// IMPORTANT: Replace with your actual Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyBtnnoH8WdNdPso5VSvBdi_T3QUj6bKjdc",
    authDomain: "sistemaplanilla.firebaseapp.com",
    projectId: "sistemaplanilla",
    storageBucket: "sistemaplanilla.firebasestorage.app",
    messagingSenderId: "491116295999",
    appId: "1:491116295999:web:704f7c8620fcb43b00858a",
    measurementId: "G-QBB39HNE7R"
};



// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase references
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Database paths
const DB_PATHS = {
    EMPLEADOS: 'empleados',
    ASISTENCIAS: 'asistencias',
    BONOS_REBAJOS: 'bonos_rebajos',
    PLANILLAS: 'planillas',
    AGUINALDOS: 'aguinaldos',
    FERIADOS: 'feriados',
    JORNADAS: 'jornadas',
    USUARIOS: 'usuarios',
    AUDITORIA: 'auditoria',
    SERVICIOS_PROFESIONALES: 'servicios_profesionales',
    CONTROL_ASISTENCIA: 'control_asistencia'
};

// Jornadas Laborales Costarricenses
const JORNADAS = {
    DIURNA: {
        codigo: 'diurna',
        nombre: 'Jornada Diurna',
        horasPorDia: 8,
        diasPorSemana: 6,
        horasPorMes: 240,
        horasPorQuincena: 120,
        descripcion: '8 horas/día, 6 días/semana'
    },
    MIXTA: {
        codigo: 'mixta',
        nombre: 'Jornada Mixta',
        horasPorDia: 7,
        diasPorSemana: 5,
        horasPorMes: 210,
        horasPorQuincena: 105,
        descripcion: '7 horas/día, 5 días/semana'
    },
    NOCTURNA: {
        codigo: 'nocturna',
        nombre: 'Jornada Nocturna',
        horasPorDia: 6,
        diasPorSemana: 5,
        horasPorMes: 180,
        horasPorQuincena: 90,
        descripcion: '6 horas/día, 5 días/semana'
    },
    DIURNA_ACUMULATIVA: {
        codigo: 'diurna_acumulativa',
        nombre: 'Jornada Diurna Acumulativa',
        horasPorDia: 10, // promedio entre 9-10 (pero puede variar día a día)
        horasPorDiaMin: 8, // Mínimo permitido (puede haber días de 8 horas)
        horasPorDiaMax: 10, // Máximo permitido
        diasPorSemana: 5,
        horasPorMes: 240,
        horasPorQuincena: 120,
        descripcion: '8-10 horas/día (variable), 5 días/semana, total 240 horas/mes'
    },
    MIXTA_ACUMULATIVA: {
        codigo: 'mixta_acumulativa',
        nombre: 'Jornada Mixta Acumulativa',
        horasPorDia: 7, // Promedio (105/15 = 7), pero puede variar día a día
        horasPorDiaMin: 0, // Sin mínimo diario - lo importante es el total quincenal
        horasPorDiaMax: null, // Sin máximo diario - lo importante es el total quincenal
        diasPorSemana: 5,
        horasPorMes: 210,
        horasPorQuincena: 105,
        descripcion: 'Horas variables por día, debe cumplir 105 horas quincenales en total'
    }
};

// Get jornada by code
function getJornadaByCodigo(codigo) {
    return Object.values(JORNADAS).find(j => j.codigo === codigo) || JORNADAS.DIURNA;
}

// CCSS Constants (Costa Rica Social Security)
const CCSS = {
    EMPLEADO: 0.1067, // 10.67% descuento al empleado
    PATRONO: 0.2667,  // 26.67% cargo patronal (informativo)
    DIAS_EMPRESA_MAX: 3, // Primeros 3 días de incapacidad paga empresa al 50%
    PORCENTAJE_INCAPACIDAD_EMPRESA: 0.5 // 50% del salario diario
};

// INS Constants (Costa Rica National Insurance Institute)
const INS = {
    DIAS_EMPRESA_MAX: 1, // Primer día paga empresa al 50%
    PORCENTAJE_INCAPACIDAD_EMPRESA: 0.5 // 50% del salario diario
};

// Impuesto de Renta - Tabla de Tramos 2025 (Costa Rica)
const TRAMOS_RENTA = [
    {
        tramo: 1,
        desde: 0,
        hasta: 922000,
        porcentaje: 0,
        descripcion: 'Exento'
    },
    {
        tramo: 2,
        desde: 922001,
        hasta: 1352000,
        porcentaje: 0.10,
        descripcion: '10% sobre exceso de ₡922,000'
    },
    {
        tramo: 3,
        desde: 1352001,
        hasta: 2373000,
        porcentaje: 0.15,
        descripcion: '15% sobre exceso de ₡1,352,000'
    },
    {
        tramo: 4,
        desde: 2373001,
        hasta: 4745000,
        porcentaje: 0.20,
        descripcion: '20% sobre exceso de ₡2,373,000'
    },
    {
        tramo: 5,
        desde: 4745001,
        hasta: Infinity,
        porcentaje: 0.25,
        descripcion: '25% sobre exceso de ₡4,745,000'
    }
];

// Créditos Fiscales
const CREDITOS_FISCALES = {
    HIJO: 1720,    // ₡1,720 por hijo (máximo 4)
    CONYUGE: 2600, // ₡2,600 por cónyuge
    MAX_HIJOS: 4   // Máximo 4 hijos para crédito
};

// Horas Extra
const HORAS_EXTRA = {
    MULTIPLICADOR: 1.5, // 1.5x del salario horario (50% adicional)
    MAX_DIARIAS: 4,     // Máximo 4 horas extras por día (informativo)
    MAX_SEMANALES: 12   // Máximo 12 horas extras por semana (informativo)
};

// Feriados Trabajados
const FERIADO_TRABAJADO = {
    MULTIPLICADOR: 2 // 2x del salario diario (100% adicional)
};

// Aguinaldo
const AGUINALDO = {
    PORCENTAJE: 0.0833, // 8.33% del salario anual (equivalente a 1 mes / 12)
    MESES_CALCULO: 12   // Basado en últimos 12 meses
};

// Vacaciones
const VACACIONES = {
    DIAS_POR_ANO: 12.17, // 12.17 días por año según ley costarricense
    DIAS_MINIMOS_ACUMULADOS: 10 // Mínimo de días antes de poder tomar vacaciones
};

// Tipos de Día de Asistencia
const TIPOS_DIA = {
    NORMAL: 'normal',
    INCOMPLETO: 'incompleto',
    PERMISO_SIN_GOCE: 'permiso',
    INCAPACIDAD_CCSS: 'ccss',
    INCAPACIDAD_INS: 'ins',
    FERIADO_TRABAJADO: 'festivo',
    DIA_LIBRE_TRABAJADO: 'dia_libre',
    DIA_LIBRE: 'libre',
    HORAS_EXTRA: 'extras'
};

// Estados de Empleados
const ESTADOS_EMPLEADO = {
    ACTIVO: 'activo',
    INACTIVO: 'inactivo',
    SUSPENDIDO: 'suspendido'
};

// Tipos de Bonos/Rebajos
const TIPOS_BONO_REBAJO = {
    BONO: 'bono',
    REBAJO: 'rebajo'
};

// Conceptos de Bonos
const CONCEPTOS_BONO = [
    'Desempeño',
    'Productividad',
    'Asistencia perfecta',
    'Bono navideño',
    'Bono de transporte',
    'Bono alimenticio',
    'Otro'
];

// Conceptos de Rebajos
const CONCEPTOS_REBAJO = [
    'Falta injustificada',
    'Daño a propiedad',
    'Descuento convencional',
    'Anticipos',
    'Préstamo',
    'Embargo',
    'Otro'
];

// Estados de Bonos/Rebajos
const ESTADOS_BONO_REBAJO = {
    PENDIENTE: 'pendiente',
    APROBADO: 'aprobado',
    RECHAZADO: 'rechazado'
};

// Tipos de Período de Planilla
const TIPOS_PERIODO = {
    QUINCENAL: 'quincenal',
    MENSUAL: 'mensual'
};

// Estados de Planilla
const ESTADOS_PLANILLA = {
    GENERADA: 'generada',
    APROBADA: 'aprobada',
    PAGADA: 'pagada',
    ANULADA: 'anulada'
};

// Roles de Usuario
const ROLES = {
    ADMIN: 'admin',
    GERENTE_RRHH: 'gerente_rrhh',
    SUPERVISOR: 'supervisor',
    CONTADOR: 'contador',
    EMPLEADO: 'empleado',
    OPERADOR_ASISTENCIA: 'operador_asistencia'
};

// Permisos por Rol
const PERMISOS = {
    admin: ['empleados', 'asistencias', 'bonos', 'planillas', 'aguinaldos', 'feriados', 'reportes', 'usuarios', 'jornadas', 'control_asistencia', 'servicios_profesionales', 'cumpleanos'],
    gerente_rrhh: ['empleados', 'asistencias', 'bonos', 'planillas', 'reportes', 'servicios_profesionales'],
    supervisor: ['asistencias'],
    contador: ['planillas', 'reportes'],
    empleado: ['consulta_propia'],
    operador_asistencia: ['control_asistencia']
};

// Bancos Costarricenses
const BANCOS = [
    'Banco Nacional de Costa Rica (BNCR)',
    'Banco de Costa Rica (BCR)',
    'BAC Credomatic',
    'Scotiabank',
    'Banco Popular',
    'Davivienda',
    'Banco Improsa',
    'Banco Lafise',
    'Coopealianza',
    'Coopeservidores',
    'Otro'
];

// Empresas
const EMPRESAS = [
    'Instituto Veterinario San Martin de Porres',
    'Veterinaria San Martín de Porres',
    'Grupo Empresarial San Martin de Porres',
    'Otro'
];

// Feriados Nacionales Costa Rica 2025
const FERIADOS_2025 = [
    { fecha: '2025-01-01', nombre: 'Año Nuevo', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-04-11', nombre: 'Día de Juan Santamaría', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-04-17', nombre: 'Jueves Santo', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-04-18', nombre: 'Viernes Santo', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-05-01', nombre: 'Día del Trabajador', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-07-25', nombre: 'Anexión del Partido de Nicoya', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-08-02', nombre: 'Día de la Virgen de los Ángeles', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-08-15', nombre: 'Día de la Madre', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-08-31', nombre: 'Día de la Persona Negra y la Cultura Afrocostarricense', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-09-15', nombre: 'Día de la Independencia', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-12-01', nombre: 'Día de la Abolición del Ejército', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2025-12-25', nombre: 'Navidad', tipo: 'obligatorio', aplicaDoble: true }
];

// Feriados Nacionales Costa Rica 2026
const FERIADOS_2026 = [
    { fecha: '2026-01-01', nombre: 'Año Nuevo', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-04-02', nombre: 'Jueves Santo', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-04-03', nombre: 'Viernes Santo', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-04-11', nombre: 'Día de Juan Santamaría', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-05-01', nombre: 'Día del Trabajador', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-07-25', nombre: 'Anexión del Partido de Nicoya', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-08-02', nombre: 'Día de la Virgen de los Ángeles', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-08-15', nombre: 'Día de la Madre', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-08-31', nombre: 'Día de la Persona Negra y la Cultura Afrocostarricense', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-09-15', nombre: 'Día de la Independencia', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-12-01', nombre: 'Día de la Abolición del Ejército', tipo: 'obligatorio', aplicaDoble: true },
    { fecha: '2026-12-25', nombre: 'Navidad', tipo: 'obligatorio', aplicaDoble: true }
];

// Pagination
const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
};

// Date Formats
const DATE_FORMATS = {
    DATABASE: 'YYYYMMDD',
    DISPLAY: 'DD/MM/YYYY',
    DISPLAY_LONG: 'DD de MMMM, YYYY',
    MONTH_YEAR: 'YYYYMM'
};

// Currency Format
const CURRENCY = {
    SYMBOL: '₡',
    LOCALE: 'es-CR',
    DECIMALS: 2
};

// Export for use in other modules
window.CONFIG = {
    firebaseConfig,
    auth,
    database,
    storage,
    DB_PATHS,
    JORNADAS,
    getJornadaByCodigo,
    CCSS,
    INS,
    TRAMOS_RENTA,
    CREDITOS_FISCALES,
    HORAS_EXTRA,
    FERIADO_TRABAJADO,
    AGUINALDO,
    VACACIONES,
    TIPOS_DIA,
    ESTADOS_EMPLEADO,
    TIPOS_BONO_REBAJO,
    CONCEPTOS_BONO,
    CONCEPTOS_REBAJO,
    ESTADOS_BONO_REBAJO,
    TIPOS_PERIODO,
    ESTADOS_PLANILLA,
    ROLES,
    PERMISOS,
    BANCOS,
    EMPRESAS,
    FERIADOS_2025,
    FERIADOS_2026,
    PAGINATION,
    DATE_FORMATS,
    CURRENCY
};

