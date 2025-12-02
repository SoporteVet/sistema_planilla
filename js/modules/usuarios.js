/**
 * Usuarios Module - Sistema de Planillas Costa Rica
 */

const UsuariosModule = {
    usuarios: [],

    init() {
        // Solo admins pueden acceder
        if (!Auth.isAdmin()) {
            Utils.showToast('No tiene permisos para acceder a este módulo', 'error');
            AppRouter.navigate('dashboard');
            return;
        }
        
        this.cargarUsuarios();
    },

    async cargarUsuarios() {
        const data = await FirebaseHelpers.once(CONFIG.DB_PATHS.USUARIOS);
        this.usuarios = data ? Object.keys(data).map(key => ({uid: key, ...data[key]})) : [];
        this.render();
    },

    render() {
        const html = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
                        <p class="text-sm text-gray-600 mt-1">Administre los usuarios del sistema</p>
                    </div>
                    <button onclick="UsuariosModule.mostrarModalNuevo()" class="btn btn-primary">
                        Nuevo Usuario
                    </button>
                </div>

                <div class="card">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Rol</th>
                                    <th>Departamento</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderTabla()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('mainContent').innerHTML = html;
        Utils.updateBreadcrumb(['Usuarios']);
    },

    renderTabla() {
        if (this.usuarios.length === 0) {
            return '<tr><td colspan="6" class="text-center text-gray-500 py-8">No hay usuarios registrados</td></tr>';
        }

        return this.usuarios.map(user => `
            <tr>
                <td class="font-medium">${user.nombre}</td>
                <td>${user.correo}</td>
                <td>${Formatters.formatearRol(user.rol)}</td>
                <td>${user.departamento || '-'}</td>
                <td>${Formatters.formatearEstadoBadge(user.activo ? 'activo' : 'inactivo')}</td>
                <td>
                    <button onclick="UsuariosModule.editar('${user.uid}')" 
                        class="text-blue-600 hover:text-blue-800 text-sm">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');
    },

    mostrarModalNuevo() {
        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalUsuario">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-2xl font-bold">Nuevo Usuario</h2>
                        <button onclick="UsuariosModule.cerrarModal()" class="text-gray-500">✕</button>
                    </div>
                    <form id="formUsuario" class="p-6 space-y-4">
                        <div class="form-group">
                            <label class="form-label">Nombre *</label>
                            <input type="text" id="nombre" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Correo *</label>
                            <input type="email" id="correo" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contraseña *</label>
                            <input type="password" id="password" class="form-control" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rol *</label>
                            <select id="rol" class="form-control" required>
                                <option value="${CONFIG.ROLES.EMPLEADO}">Empleado</option>
                                <option value="${CONFIG.ROLES.SUPERVISOR}">Supervisor</option>
                                <option value="${CONFIG.ROLES.CONTADOR}">Contador</option>
                                <option value="${CONFIG.ROLES.GERENTE_RRHH}">Gerente RRHH</option>
                                <option value="${CONFIG.ROLES.OPERADOR_ASISTENCIA}">Operador de Asistencia</option>
                                <option value="${CONFIG.ROLES.ADMIN}">Administrador</option>
                            </select>
                        </div>
                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onclick="UsuariosModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">Crear Usuario</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        document.getElementById('formUsuario').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardar();
        });
    },

    async guardar() {
        try {
            const nombre = document.getElementById('nombre').value;
            const correo = document.getElementById('correo').value;
            const password = document.getElementById('password').value;
            const rol = document.getElementById('rol').value;

            Utils.showLoading('Creando usuario...');

            await Auth.registerUser(correo, password, {
                nombre,
                rol,
                activo: true
            });

            Utils.showToast('Usuario creado exitosamente', 'success');
            Utils.hideLoading();
            this.cerrarModal();
            await this.cargarUsuarios();

        } catch (error) {
            console.error('Error creando usuario:', error);
            Utils.showToast('Error al crear usuario: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    editar(uid) {
        const user = this.usuarios.find(u => u.uid === uid);
        if (!user) return;

        const modal = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop" id="modalUsuario">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                    <div class="p-6 border-b flex justify-between items-center">
                        <h2 class="text-2xl font-bold">Editar Usuario</h2>
                        <button onclick="UsuariosModule.cerrarModal()" class="text-gray-500">✕</button>
                    </div>
                    <form id="formEditarUsuario" class="p-6 space-y-4">
                        <input type="hidden" id="editUid" value="${uid}">
                        
                        <div class="form-group">
                            <label class="form-label">Nombre *</label>
                            <input type="text" id="editNombre" class="form-control" value="${user.nombre}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Correo</label>
                            <input type="email" class="form-control bg-gray-100" value="${user.correo}" disabled>
                            <p class="text-xs text-gray-500 mt-1">El correo no se puede cambiar</p>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Rol *</label>
                            <select id="editRol" class="form-control" required>
                                <option value="${CONFIG.ROLES.EMPLEADO}" ${user.rol === CONFIG.ROLES.EMPLEADO ? 'selected' : ''}>Empleado</option>
                                <option value="${CONFIG.ROLES.SUPERVISOR}" ${user.rol === CONFIG.ROLES.SUPERVISOR ? 'selected' : ''}>Supervisor</option>
                                <option value="${CONFIG.ROLES.CONTADOR}" ${user.rol === CONFIG.ROLES.CONTADOR ? 'selected' : ''}>Contador</option>
                                <option value="${CONFIG.ROLES.GERENTE_RRHH}" ${user.rol === CONFIG.ROLES.GERENTE_RRHH ? 'selected' : ''}>Gerente RRHH</option>
                                <option value="${CONFIG.ROLES.OPERADOR_ASISTENCIA}" ${user.rol === CONFIG.ROLES.OPERADOR_ASISTENCIA ? 'selected' : ''}>Operador de Asistencia</option>
                                <option value="${CONFIG.ROLES.ADMIN}" ${user.rol === CONFIG.ROLES.ADMIN ? 'selected' : ''}>Administrador</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Departamento</label>
                            <input type="text" id="editDepartamento" class="form-control" value="${user.departamento || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" id="editActivo" ${user.activo ? 'checked' : ''} class="form-checkbox">
                                <span class="text-sm text-gray-700">Usuario activo</span>
                            </label>
                        </div>
                        
                        <div class="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onclick="UsuariosModule.cerrarModal()" class="btn btn-outline">
                                Cancelar
                            </button>
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('modalContainer').innerHTML = modal;
        document.getElementById('formEditarUsuario').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarEdicion();
        });
    },

    async guardarEdicion() {
        try {
            const uid = document.getElementById('editUid').value;
            const nombre = document.getElementById('editNombre').value;
            const rol = document.getElementById('editRol').value;
            const departamento = document.getElementById('editDepartamento').value;
            const activo = document.getElementById('editActivo').checked;

            Utils.showLoading('Actualizando usuario...');

            await FirebaseHelpers.update(`${CONFIG.DB_PATHS.USUARIOS}/${uid}`, {
                nombre,
                rol,
                departamento,
                activo,
                fechaModificacion: firebase.database.ServerValue.TIMESTAMP,
                modificadoPor: FirebaseHelpers.currentUser?.uid || 'system'
            });

            Utils.showToast('Usuario actualizado exitosamente', 'success');
            Utils.hideLoading();
            this.cerrarModal();
            await this.cargarUsuarios();

        } catch (error) {
            console.error('Error actualizando usuario:', error);
            Utils.showToast('Error al actualizar usuario: ' + error.message, 'error');
            Utils.hideLoading();
        }
    },

    cerrarModal() {
        document.getElementById('modalContainer').innerHTML = '';
    }
};

window.UsuariosModule = UsuariosModule;



