// Entry point: Router + Shell behaviors

const ROUTE_TITLES = {
  home: 'Inicio',
  empleados: 'Empleados',
  planillas: 'Planillas',
  asistencias: 'Asistencias',
  bonos: 'Bonos y Rebajos',
  reportes: 'Reportes',
};

const appView = document.getElementById('app-view');
const topbarTitle = document.getElementById('topbar-title');
const sidebarMenu = document.getElementById('sidebar-menu');
const toastEl = document.getElementById('toast');

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function setActive(route) {
  [...sidebarMenu.querySelectorAll('.menu-item')].forEach(btn => {
    if (btn.dataset.route === route) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

async function renderRoute(route) {
  topbarTitle.textContent = ROUTE_TITLES[route] ?? 'Inicio';
  setActive(route);

  if (route === 'empleados') {
    const mod = await import('./views/employees.js');
    await mod.renderEmployeesView(appView, { showToast });
    return;
  }
  if (route === 'planillas') {
    const mod = await import('./views/payroll.js');
    await mod.renderPayrollView(appView, { showToast });
    return;
  }
  if (route === 'asistencias') {
    const mod = await import('./views/attendance.js');
    await mod.renderAttendanceView(appView, { showToast });
    return;
  }
  if (route === 'bonos') {
    const mod = await import('./views/extras.js');
    await mod.renderExtrasView(appView, { showToast });
    return;
  }
  if (route === 'reportes') {
    const mod = await import('./views/reports.js');
    await mod.renderReportsView(appView, { showToast });
    return;
  }

  // Default: Home
  const { storage } = await import('./storage/index.js');
  const employees = await storage.listEmployees();
  const attendance = await storage.listAttendance();
  const extras = await storage.listExtras();
  const holidays = await storage.listHolidays();

  const totalEmpleados = employees.length;
  const totalAsistencias = attendance.length;
  const totalBonos = extras.filter(x => x.type === 'bono' || x.type === 'comision' || x.type === 'incentivo').length;
  const totalFeriados = holidays.length;

  appView.innerHTML = `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 8px; color: var(--color-text);">
        Bienvenido al Sistema de Planillas CR
      </h2>
      <p style="color: var(--color-text-light); font-size: 16px; margin: 0;">
        Gestiona empleados, asistencias, planillas y reportes desde un solo lugar
      </p>
    </div>

    <div class="grid cols-4" style="margin-bottom: 32px;">
      <div class="stat-card" style="background: linear-gradient(135deg, #2C2C54, #40407a);">
        <div class="stat-label">Total Empleados</div>
        <div class="stat-value">${totalEmpleados}</div>
        <svg style="width: 40px; height: 40px; opacity: 0.3; position: absolute; right: 20px; bottom: 20px;" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #34ace0, #2C2C54);">
        <div class="stat-label">Asistencias Registradas</div>
        <div class="stat-value">${totalAsistencias}</div>
        <svg style="width: 40px; height: 40px; opacity: 0.3; position: absolute; right: 20px; bottom: 20px;" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #706fd3, #40407a);">
        <div class="stat-label">Bonos Activos</div>
        <div class="stat-value">${totalBonos}</div>
        <svg style="width: 40px; height: 40px; opacity: 0.3; position: absolute; right: 20px; bottom: 20px;" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div class="stat-card" style="background: linear-gradient(135deg, #1e1e3f, #2C2C54);">
        <div class="stat-label">Feriados Configurados</div>
        <div class="stat-value">${totalFeriados}</div>
        <svg style="width: 40px; height: 40px; opacity: 0.3; position: absolute; right: 20px; bottom: 20px;" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3 class="panel-title">Funcionalidades Principales</h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #e1e8f0, #c7d2fe); border-radius: 10px; display: grid; place-items: center; flex-shrink: 0;">
              <svg style="width: 24px; height: 24px; color: #2C2C54;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">Gestión de Empleados</strong>
              <p style="margin: 0; color: var(--color-text-light); font-size: 14px;">Registro completo con cédula, puesto, jornada y salario por hora</p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 10px; display: grid; place-items: center; flex-shrink: 0;">
              <svg style="width: 24px; height: 24px; color: #059669;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">Cálculo Automático de Planillas</strong>
              <p style="margin: 0; color: var(--color-text-light); font-size: 14px;">Jornadas diurna/nocturna/mixta/acumulativa con cálculo de horas extra según ley CR</p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 10px; display: grid; place-items: center; flex-shrink: 0;">
              <svg style="width: 24px; height: 24px; color: #d97706;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">Control de Asistencias</strong>
              <p style="margin: 0; color: var(--color-text-light); font-size: 14px;">Registro de ausencias, tardanzas, permisos, feriados e incapacidades</p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #c7d2fe, #a5b4fc); border-radius: 10px; display: grid; place-items: center; flex-shrink: 0;">
              <svg style="width: 24px; height: 24px; color: #40407a;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">Reportes y Exportación</strong>
              <p style="margin: 0; color: var(--color-text-light); font-size: 14px;">Constancias salariales PDF y exportación de planillas a Excel</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="panel-title">Cálculos Automáticos CR</h3>
        <div style="display: grid; gap: 12px;">
          <div style="padding: 14px; background: var(--color-hover); border-radius: 10px; border-left: 4px solid #2C2C54;">
            <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">CCSS (10.67%)</strong>
            <p style="margin: 0; font-size: 14px; color: var(--color-text-light);">Cálculo automático de cargas sociales</p>
          </div>
          <div style="padding: 14px; background: var(--color-hover); border-radius: 10px; border-left: 4px solid #34ace0;">
            <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">Aguinaldo</strong>
            <p style="margin: 0; font-size: 14px; color: var(--color-text-light);">Salarios brutos / 12</p>
          </div>
          <div style="padding: 14px; background: var(--color-hover); border-radius: 10px; border-left: 4px solid #706fd3;">
            <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">Vacaciones</strong>
            <p style="margin: 0; font-size: 14px; color: var(--color-text-light);">1 día por mes trabajado desde ingreso</p>
          </div>
          <div style="padding: 14px; background: var(--color-hover); border-radius: 10px; border-left: 4px solid #40407a;">
            <strong style="display: block; margin-bottom: 4px; color: var(--color-text);">Horas Extra</strong>
            <p style="margin: 0; font-size: 14px; color: var(--color-text-light);">Recargo de ley 1.5x</p>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #e1e8f0, #f1f5f9); border-radius: 12px; border: 1px solid #2C2C54;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg style="width: 32px; height: 32px; color: #2C2C54;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <strong style="display: block; font-size: 16px; margin-bottom: 4px; color: var(--color-text);">Firebase Ready</strong>
          <p style="margin: 0; color: var(--color-text-light);">Sistema preparado para conectar con Firebase Realtime Database. Actualmente usando localStorage.</p>
        </div>
      </div>
    </div>
  `;
}

function navigateTo(route) {
  window.localStorage.setItem('sp.activeRoute', route);
  renderRoute(route);
}

sidebarMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-route]');
  if (!btn) return;
  const route = btn.dataset.route;
  navigateTo(route);
});

document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed');
});

// Initialize
const initialRoute = window.localStorage.getItem('sp.activeRoute') || 'home';
renderRoute(initialRoute);


