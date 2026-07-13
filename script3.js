const URL = "https://script.google.com/macros/s/AKfycbzuMoCE7kI3XcDKssvGW2Fh3dtzogWwk7rNUhJCn3aNXtlUTRdLThoY2a8H6HczS6qxFA/exec";

// Al cargar la página, traemos los grados automáticamente
window.onload = function() {
    obtenerGrados();
};

// Función maestra para comunicarse con el Backend
async function enviarPeticion(datos) {
    try {
        const response = await fetch(URL, {
            method: "POST",
            body: JSON.stringify(datos)
        });
        return await response.json();
    } catch (error) {
        console.error("Error de conexión:", error);
        // Utiliza tu sistema de Toasts si está disponible en lugar del alert
        if(typeof showKronosToast === "function") {
            showKronosToast('Error de conexión', 'No se pudo comunicar con el servidor maestro.', 'info');
        } else {
            alert("Error de conexión con Google Sheets.");
        }
        return null;
    }
}

// 1. Obtener los grados (Pestañas)
async function obtenerGrados() {
    const selectGrado = document.getElementById("selectGrado");
    const datos = await enviarPeticion({ action: "getGrados" });
    
    if (datos && Array.isArray(datos)) {
        selectGrado.innerHTML = '<option value="">-- Selecciona un Grado --</option>';
        datos.forEach(grado => {
            selectGrado.innerHTML += `<option value="${grado}">${grado}</option>`;
        });
    } else {
        selectGrado.innerHTML = '<option value="">Error al cargar grados</option>';
    }
}

// 2. Cargar los alumnos y desarmar las fórmulas de ausentismo
async function cargarAlumnos() {
    const grado = document.getElementById("selectGrado").value;
    const mes = document.getElementById("selectMes").value;
    const btnCargar = document.getElementById("btnCargar");
    const statusMsg = document.getElementById("statusMsg");
    const tabla = document.getElementById("tablaAlumnos");
    const tbody = document.getElementById("tbodyAlumnos");
    const btnGuardar = document.getElementById("btnGuardar");

    if (!grado) {
        if(typeof showKronosToast === "function") showKronosToast('Aviso', 'Por favor selecciona un grado.', 'info');
        else alert("Por favor selecciona un grado.");
        return;
    }

    // UI Updates
    btnCargar.disabled = true;
    statusMsg.style.display = "block";
    statusMsg.textContent = `Consultando inasistencias de ${mes} en ${grado}...`;
    tabla.style.display = "none";
    btnGuardar.style.display = "none";
    tbody.innerHTML = ""; // Limpiar tabla

    const datos = await enviarPeticion({ action: "getAlumnos", grado: grado, mes: mes });

    if (datos && datos.length > 0) {
        datos.forEach(alumno => {
            const tr = document.createElement("tr");
            tr.dataset.fila = alumno.fila; 
            
            let faltasArray = [];
            let faltaRaw = alumno.falta.toString().trim();
            
            // DESARMADO DE FÓRMULA (Soporta =COUNT(10, 3) y legacy =2+15)
            if (faltaRaw.toUpperCase().includes("COUNT") || faltaRaw.toUpperCase().includes("CONTAR")) {
                // Extraemos lo que hay dentro de los paréntesis
                let match = faltaRaw.match(/\(([^)]+)\)/);
                if (match) {
                    // Separamos por coma (,) o punto y coma (;) por si acaso, y quitamos espacios
                    faltasArray = match[1].split(/[;,]/).map(num => num.trim());
                }
            } else if (faltaRaw.startsWith("=")) {
                // Soporte para los datos viejos que usaban el "+"
                faltasArray = faltaRaw.substring(1).split("+").map(num => num.trim());
            } else if (faltaRaw !== "") {
                faltasArray = [faltaRaw.trim()];
            }

            let inputsHTML = '';
            faltasArray.forEach(dia => {
                if (dia.trim() !== "") {
                    // Se inyecta un pequeño contenedor con el Input y su botón "X"
                    inputsHTML += `
                        <div class="falta-item" style="display:inline-flex; align-items:center; margin-right:6px; margin-bottom:6px;">
                            <input type="number" class="falta-input pago-input" value="${dia}" oninput="calcularTotalFaltas(this)" placeholder="Día" min="1" max="31">
                            <button class="btn-remove-falta" onclick="eliminarInputFalta(this)" style="background:transparent; border:none; color:var(--accent-danger, #ff0055); cursor:pointer; font-weight:900; margin-left:4px; padding:2px;" title="Eliminar falta">✕</button>
                        </div>
                    `;
                }
            });

            tr.innerHTML = `
                <td>${alumno.codigo}</td>
                <td>${alumno.nombre}</td>
                <td>
                    <div class="faltas-container" style="display:flex; flex-wrap:wrap; align-items:center;">
                        ${inputsHTML}
                        <button class="btn-add-pago" onclick="agregarInputFalta(this)" title="Registrar nueva falta">+</button>
                    </div>
                </td>
                <td class="total-cell" style="font-size: 1.3rem;">0</td>
            `;
            tbody.appendChild(tr);
            
            // Calculamos el total inicial al renderizar la fila
            calcularTotalFaltas(tr.querySelector('.btn-add-pago'));
        });

        tabla.style.display = "table";
        btnGuardar.style.display = "block";
        statusMsg.style.display = "none";
    } else {
        statusMsg.textContent = "No se encontraron alumnos o hubo un error.";
    }
    btnCargar.disabled = false;
}

// 3. Crear una nueva casilla de falta
function agregarInputFalta(btn) {
    const container = btn.parentElement;
    
    // Creamos el contenedor del ítem (Input + Botón X)
    const itemDiv = document.createElement("div");
    itemDiv.className = "falta-item";
    itemDiv.style.cssText = "display:inline-flex; align-items:center; margin-right:6px; margin-bottom:6px;";
    
    itemDiv.innerHTML = `
        <input type="number" class="falta-input pago-input" value="" oninput="calcularTotalFaltas(this)" placeholder="Día" min="1" max="31">
        <button class="btn-remove-falta" onclick="eliminarInputFalta(this)" style="background:transparent; border:none; color:var(--accent-danger, #ff0055); cursor:pointer; font-weight:900; margin-left:4px; padding:2px;" title="Eliminar falta">✕</button>
    `;
    
    container.insertBefore(itemDiv, btn);
    itemDiv.querySelector("input").focus(); // Ponemos el cursor automático
}

// 4. Eliminar una casilla de falta
function eliminarInputFalta(btn) {
    const itemDiv = btn.parentElement;
    const tablaFila = itemDiv.closest("tr");
    
    // Removemos el elemento del DOM
    itemDiv.remove();
    
    // Recalculamos el total enviando la fila como referencia
    calcularTotalFaltas(tablaFila);
}

// 5. CÁLCULO ESTRELLA: Contar (NO SUMAR) los elementos
function calcularTotalFaltas(elemento) {
    // Nos aseguramos de encontrar la fila <tr> padre, ya sea desde un input o desde la fila misma
    const tr = elemento.closest("tr") || elemento;
    const inputs = tr.querySelectorAll(".falta-input");
    
    let diasFaltados = 0;
    
    inputs.forEach(input => {
        // Solo contamos las casillas que no estén en blanco
        if (input.value.trim() !== "") {
            diasFaltados++; // Aquí está la magia: incrementamos en 1, no sumamos el valor
        }
    });
    
    // Actualizamos el número visual
    tr.querySelector(".total-cell").textContent = diasFaltados;
}

// 6. Guardar cambios (Ensamblador de fórmula)
async function guardarFaltas() {
    // Conservo el ID btnGuardar de tu HTML original
    const grado = document.getElementById("selectGrado").value;
    const mes = document.getElementById("selectMes").value;
    const filas = document.querySelectorAll("#tbodyAlumnos tr");
    const statusMsg = document.getElementById("statusMsg");
    const btnGuardar = document.getElementById("btnGuardar");

    let faltasReconstruidas = [];

    filas.forEach(tr => {
        const filaExcel = tr.dataset.fila;
        const inputs = tr.querySelectorAll(".falta-input");
        let valoresDia = [];
        
        // Recogemos todos los días ingresados
        inputs.forEach(input => {
            const dia = input.value.trim();
            if (dia !== "" && !isNaN(dia)) {
                valoresDia.push(dia);
            }
        });

        let formulaFinal = "";
        
        // ARMADO DE FÓRMULA: [10, 3, 4, 5] -> "=COUNT(10, 3, 4, 5)"
        if (valoresDia.length > 0) {
            formulaFinal = "=COUNT(" + valoresDia.join(", ") + ")"; 
        }

        faltasReconstruidas.push({
            fila: parseInt(filaExcel),
            falta: formulaFinal // Usamos 'falta' para que coincida con el backend nuevo
        });
    });

    // UI Updates
    btnGuardar.disabled = true;
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.innerHTML = "Sincronizando Sistema...";
    statusMsg.style.display = "block";
    statusMsg.textContent = "Guardando matriz de inasistencias...";

    const resultado = await enviarPeticion({ 
        action: "saveFaltas", // Acción requerida por tu backend
        grado: grado, 
        mes: mes, 
        faltas: faltasReconstruidas 
    });

    if (resultado && resultado.success) {
        if(typeof showKronosToast === "function") {
            showKronosToast('Sincronización Exitosa', 'Base de datos maestra actualizada.', 'success');
            statusMsg.style.display = "none";
        } else {
            statusMsg.textContent = "¡Datos guardados con éxito!";
            statusMsg.style.color = "var(--accent-teal, #00e0b0)";
            setTimeout(() => {
                statusMsg.style.display = "none";
                statusMsg.style.color = "";
            }, 3000);
        }
    } else {
        if(typeof showKronosToast === "function") {
            showKronosToast('Error del Sistema', 'La nube maestra rechazó los datos.', 'info');
        } else {
            alert("Hubo un problema al guardar los datos.");
        }
        statusMsg.style.display = "none";
    }

    btnGuardar.disabled = false;
    btnGuardar.innerHTML = textoOriginal;
}

// Parche de compatibilidad por si en el HTML tienes onclick="guardarPagos()"
// Lo redirigimos a la nueva función
window.guardarPagos = guardarFaltas;