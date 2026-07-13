// TU URL DE IMPLEMENTACIÓN DE APPS SCRIPT
const URL = "https://script.google.com/macros/s/AKfycbwJgiaFrdAJT0I_-bl5VO23R3ltNB4QbAPxLa-Pc3zdtYxsvNm4Kqvm5K62gbfrdlNz/exec";

// Al cargar la página, traemos los grados automáticamente
window.onload = function() {
    obtenerGrados();
};

async function enviarPeticion(datos) {
    try {
        const response = await fetch(URL, {
            method: "POST",
            body: JSON.stringify(datos)
        });
        return await response.json();
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Error de conexión con Google Sheets.");
        return null;
    }
}

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

async function cargarAlumnos() {
    const grado = document.getElementById("selectGrado").value;
    const mes = document.getElementById("selectMes").value;
    const btnCargar = document.getElementById("btnCargar");
    const statusMsg = document.getElementById("statusMsg");
    const tabla = document.getElementById("tablaAlumnos");
    const tbody = document.getElementById("tbodyAlumnos");
    const btnGuardar = document.getElementById("btnGuardar");

    if (!grado) return alert("Por favor selecciona un grado.");

    // UI Updates
    btnCargar.disabled = true;
    statusMsg.style.display = "block";
    statusMsg.textContent = `Consultando ${mes} de ${grado}...`;
    tabla.style.display = "none";
    btnGuardar.style.display = "none";
    tbody.innerHTML = ""; // Limpiar tabla

    const datos = await enviarPeticion({ action: "getAlumnos", grado: grado, mes: mes });

    if (datos && datos.length > 0) {
        datos.forEach(alumno => {
            const tr = document.createElement("tr");
            tr.dataset.fila = alumno.fila; 
            
            let pagosArray = [""];
            let pagoRaw = alumno.pago.toString().trim();
            
            if (pagoRaw.startsWith("=")) {
                pagosArray = pagoRaw.substring(1).split("+");
            } else if (pagoRaw !== "") {
                pagosArray = [pagoRaw];
            }

            let inputsHTML = '';
            pagosArray.forEach(p => {
                inputsHTML += `<input type="number" class="pago-input" value="${p}" oninput="calcularTotal(this)">`;
            });

            tr.innerHTML = `
                <td>${alumno.codigo}</td>
                <td>${alumno.nombre}</td>
                <td>
                    <div class="pagos-container">
                        ${inputsHTML}
                        <button class="btn-add-pago" onclick="agregarInputPago(this)" title="Agregar nuevo pago">+</button>
                    </div>
                </td>
                <td class="total-cell">0</td>
            `;
            tbody.appendChild(tr);
            
            calcularTotal(tr.querySelector('.pago-input'));
        });

        tabla.style.display = "table";
        btnGuardar.style.display = "block";
        statusMsg.style.display = "none";
    } else {
        statusMsg.textContent = "No se encontraron alumnos o hubo un error.";
    }
    btnCargar.disabled = false;
}

function agregarInputPago(btn) {
    const container = btn.parentElement;
    const nuevoInput = document.createElement("input");
    nuevoInput.type = "number";
    nuevoInput.className = "pago-input";
    nuevoInput.oninput = function() { calcularTotal(this); };
    
    container.insertBefore(nuevoInput, btn);
    nuevoInput.focus();
}

function calcularTotal(elemento) {
    const tr = elemento.closest("tr");
    const inputs = tr.querySelectorAll(".pago-input");
    let total = 0;
    
    inputs.forEach(input => {
        const valor = parseFloat(input.value);
        if (!isNaN(valor)) {
            total += valor;
        }
    });
    
    tr.querySelector(".total-cell").textContent = total.toFixed(2);
}

async function guardarPagos() {
    const grado = document.getElementById("selectGrado").value;
    const mes = document.getElementById("selectMes").value;
    const filas = document.querySelectorAll("#tbodyAlumnos tr");
    const statusMsg = document.getElementById("statusMsg");
    const btnGuardar = document.getElementById("btnGuardar");

    let pagosReconstruidos = [];

    filas.forEach(tr => {
        const filaExcel = tr.dataset.fila;
        const inputs = tr.querySelectorAll(".pago-input");
        let valores = [];
        
        inputs.forEach(input => {
            if (input.value.trim() !== "") {
                valores.push(input.value.trim());
            }
        });

        let formulaFinal = "";
        if (valores.length === 1) {
            formulaFinal = valores[0]; 
        } else if (valores.length > 1) {
            formulaFinal = "=" + valores.join("+"); 
        }

        pagosReconstruidos.push({
            fila: parseInt(filaExcel),
            formula: formulaFinal
        });
    });

    // UI Updates
    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";
    statusMsg.style.display = "block";
    statusMsg.textContent = "Sincronizando con Google Sheets...";

    const resultado = await enviarPeticion({ 
        action: "savePagos", 
        grado: grado, 
        mes: mes, 
        pagos: pagosReconstruidos 
    });

    if (resultado && resultado.success) {
        statusMsg.textContent = "¡Datos guardados con éxito!";
        statusMsg.style.color = "green";
        setTimeout(() => {
            statusMsg.style.display = "none";
            statusMsg.style.color = "#666";
        }, 3000);
    } else {
        alert("Hubo un problema al guardar los datos.");
        statusMsg.style.display = "none";
    }

    btnGuardar.disabled = false;
    btnGuardar.textContent = "Guardar Cambios en Google Sheets";
}