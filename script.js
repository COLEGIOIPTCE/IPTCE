// === CONFIGURACIÓN ===
const URL_APP_SCRIPT = "https://script.google.com/macros/s/AKfycbzxNP9onA_2iIdwk5dSSif0bWEarOo-dEuY3BVtevbuA1VuQTUjzdsQ69LayFp69X00/exec";

// Elementos del DOM - Login
const selectGrado = document.getElementById('select-grado');
const selectAlumno = document.getElementById('select-alumno');
const inputCodigo = document.getElementById('input-codigo');
const btnIngresar = document.getElementById('btn-ingresar');
const textIngresar = document.getElementById('text-ingresar');

// Spinners e iconos
const spinnerGrados = document.getElementById('spinner-grados');
const iconGrados = document.getElementById('icon-grados');
const spinnerAlumnos = document.getElementById('spinner-alumnos');
const iconAlumnos = document.getElementById('icon-alumnos');
const spinnerIngresar = document.getElementById('spinner-ingresar');

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
    cargarGrados();
    
    // Habilitar botón de ingresar solo si hay datos
    inputCodigo.addEventListener('input', validarFormulario);
    selectAlumno.addEventListener('change', validarFormulario);
});

// === FUNCIONES DE RED (API) ===

async function cargarGrados() {
    mostrarCargaSelect('grados', true);
    selectGrado.disabled = true;
    
    try {
        const response = await fetch(`${URL_APP_SCRIPT}?action=obtenerGrados`);
        const data = await response.json();
        
        if (data.exito) {
            selectGrado.innerHTML = '<option value="">Selecciona tu grado...</option>';
            data.grados.forEach(grado => {
                const option = document.createElement('option');
                option.value = grado;
                option.textContent = grado;
                selectGrado.appendChild(option);
            });
            selectGrado.disabled = false;
        } else {
            showToast('Error', data.error || 'No se pudieron cargar los grados.', 'error');
        }
    } catch (error) {
        console.error("Error:", error);
        showToast('Error de Conexión', 'Verifica tu internet o la URL del script.', 'error');
    } finally {
        mostrarCargaSelect('grados', false);
    }
}

async function cargarAlumnos() {
    const grado = selectGrado.value;
    
    selectAlumno.innerHTML = '<option value="">Primero selecciona un grado...</option>';
    selectAlumno.disabled = true;
    inputCodigo.value = '';
    inputCodigo.disabled = true;
    validarFormulario();

    if (!grado) return;

    mostrarCargaSelect('alumnos', true);
    selectGrado.disabled = true;

    try {
        const response = await fetch(`${URL_APP_SCRIPT}?action=obtenerAlumnos&grado=${encodeURIComponent(grado)}`);
        const data = await response.json();
        
        if (data.exito) {
            selectAlumno.innerHTML = '<option value="">Busca y selecciona tu nombre...</option>';
            data.alumnos.forEach(alumno => {
                const option = document.createElement('option');
                option.value = alumno;
                option.textContent = alumno;
                selectAlumno.appendChild(option);
            });
            selectAlumno.disabled = false;
            inputCodigo.disabled = false;
        } else {
            showToast('Aviso', data.error || 'No se encontraron alumnos para este grado.', 'warning');
            selectAlumno.innerHTML = '<option value="">No hay datos</option>';
        }
    } catch (error) {
        console.error("Error:", error);
        showToast('Error de Conexión', 'No se pudieron cargar los alumnos.', 'error');
    } finally {
        mostrarCargaSelect('alumnos', false);
        selectGrado.disabled = false;
    }
}

async function iniciarSesion() {
    const grado = selectGrado.value;
    const alumno = selectAlumno.value;
    const codigo = inputCodigo.value.trim();

    if (!grado || !alumno || !codigo) {
        showToast('Atención', 'Por favor completa todos los campos.', 'warning');
        return;
    }

    btnIngresar.disabled = true;
    textIngresar.textContent = "Validando...";
    spinnerIngresar.classList.remove('hidden');
    selectGrado.disabled = true;
    selectAlumno.disabled = true;
    inputCodigo.disabled = true;

    try {
        const url = `${URL_APP_SCRIPT}?action=loginDashboard&grado=${encodeURIComponent(grado)}&alumno=${encodeURIComponent(alumno)}&codigo=${encodeURIComponent(codigo)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.exito) {
            showToast('¡Éxito!', 'Bienvenido al portal.', 'success');
            renderizarDashboard(data.datos);
            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('dashboard-container').classList.remove('hidden');
        } else {
            showToast('Acceso Denegado', data.error || 'Código incorrecto.', 'error');
            inputCodigo.value = '';
            inputCodigo.focus();
        }
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        showToast('Error del Servidor', 'Ocurrió un problema al validar tus datos.', 'error');
    } finally {
        btnIngresar.disabled = false;
        textIngresar.textContent = "Ingresar al Portal";
        spinnerIngresar.classList.add('hidden');
        selectGrado.disabled = false;
        selectAlumno.disabled = false;
        inputCodigo.disabled = false;
        validarFormulario();
    }
}

function renderizarDashboard(datos) {
    document.getElementById('dash-nombre').textContent = datos.alumno;
    document.getElementById('dash-grado').textContent = datos.grado;

    const grid = document.getElementById('bimestres-grid');
    grid.innerHTML = '';

    if (!datos.bimestres || datos.bimestres.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No hay registros académicos disponibles.</div>';
        document.getElementById('dash-promedio-global').textContent = "0.00";
        return;
    }

    let sumaPromedios = 0;
    let bimestresValidos = 0;

    datos.bimestres.forEach(bim => {
        if(Number(bim.promedioBimestre) > 0) {
            sumaPromedios += Number(bim.promedioBimestre);
            bimestresValidos++;
        }

        let promColorClass = Number(bim.promedioBimestre) >= 60 ? 'text-green-600' : 'text-red-600';
        let asistenciaDisplay = (bim.asistencia === "" || bim.asistencia === null) ? "-" : bim.asistencia;

        let filasMaterias = '';
        bim.materias.forEach(mat => {
            let notaClass = mat.nota >= 60 ? 'text-blue-700 font-bold' : 'text-red-600 font-bold';
            filasMaterias += `
                <tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td class="py-3 px-4 text-sm text-gray-700 font-medium whitespace-nowrap">${mat.materia}</td>
                    <td class="py-3 px-2 text-sm text-center text-gray-500">${mat.zona}</td>
                    <td class="py-3 px-2 text-sm text-center text-gray-500">${mat.examen}</td>
                    <td class="py-3 px-2 text-sm text-center text-blue-500 font-semibold">${mat.asistencia}</td>
                    <td class="py-3 px-4 text-sm text-right ${notaClass}">${mat.nota}</td>
                </tr>
            `;
        });

        const card = document.createElement('div');
        card.className = "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col";
        card.innerHTML = `
            <div class="bg-slate-50 border-b border-gray-200 p-4 flex justify-between items-center">
                <h3 class="text-lg font-bold text-slate-800 flex items-center">
                    <i class="fa-regular fa-calendar-check text-blue-500 mr-2"></i>
                    ${bim.nombreBimestre}
                </h3>
                <div class="text-right">
                    <span class="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Promedio</span>
                    <div class="text-xl font-bold ${promColorClass}">${bim.promedioBimestre}</div>
                </div>
            </div>
            <div class="p-0 flex-1 overflow-x-auto no-scrollbar">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50/50">
                            <th class="py-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Materia</th>
                            <th class="py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Zona</th>
                            <th class="py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Exa.</th>
                            <th class="py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Asis.</th>
                            <th class="py-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>${filasMaterias}</tbody>
                </table>
            </div>
        `;
        grid.appendChild(card);
    });

    if (bimestresValidos > 0) {
        let promedioGlobal = (sumaPromedios / bimestresValidos).toFixed(2);
        const elGlobal = document.getElementById('dash-promedio-global');
        elGlobal.textContent = promedioGlobal;
        elGlobal.className = `text-4xl font-extrabold mt-1 ${Number(promedioGlobal) >= 60 ? 'text-green-600' : 'text-red-600'}`;
    }
}

// === UTILIDADES ===

function validarFormulario() {
    btnIngresar.disabled = !(selectAlumno.value !== "" && inputCodigo.value.trim() !== "");
}

function cerrarSesion() {
    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
    inputCodigo.value = '';
    validarFormulario();
    showToast('Sesión Cerrada', 'Has salido del portal correctamente.', 'success');
}

function mostrarCargaSelect(tipo, isLoading) {
    const spinner = document.getElementById(`spinner-${tipo}`);
    const icon = document.getElementById(`icon-${tipo}`);
    if (isLoading) {
        spinner.classList.remove('hidden');
        icon.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        icon.classList.remove('hidden');
    }
}

let toastTimeout;
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = document.getElementById('toast-icon');

    toastTitle.textContent = title;
    toastMsg.textContent = message;

    const icons = {
        success: '<i class="fa-solid fa-circle-check text-green-400 text-xl"></i>',
        error: '<i class="fa-solid fa-circle-xmark text-red-400 text-xl"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation text-yellow-400 text-xl"></i>',
        info: '<i class="fa-solid fa-circle-info text-blue-400 text-xl"></i>'
    };

    toastIcon.innerHTML = icons[type] || icons.info;
    toast.classList.remove('translate-x-full', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(hideToast, 4000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-full', 'opacity-0');
}