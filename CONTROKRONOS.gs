function doPost(e) {
  try {
    // Parseamos la información que envía el frontend
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // Acción 1: Devolver la lista de todos los grados (Pestañas)
    if (action === "getGrados") {
      const grados = getGrados();
      return ContentService.createTextOutput(JSON.stringify(grados))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Acción 2: Devolver la lista de alumnos y sus pagos (fórmulas) del mes seleccionado
    if (action === "getAlumnos") {
      const alumnos = getAlumnos(data.grado, data.mes);
      return ContentService.createTextOutput(JSON.stringify(alumnos))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Acción 3: Guardar los nuevos pagos reconstruidos en fórmula
    if (action === "savePagos") {
      const resultado = savePagos(data.grado, data.mes, data.pagos);
      return ContentService.createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    // Si algo falla, le enviamos el error a la web para saber qué pasó
    return ContentService.createTextOutput(JSON.stringify({error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función para evitar errores de CORS si se hace un GET accidental
 */
function doGet(e) {
  return ContentService.createTextOutput("La API de Pagos está funcionando correctamente.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// =====================================================================
// FUNCIONES LÓGICAS INTERNAS
// =====================================================================

function getGrados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const grados = [];
  
  // Recorremos todas las hojas y guardamos sus nombres
  sheets.forEach(sheet => {
    grados.push(sheet.getName());
  });
  return grados;
}

function getAlumnos(grado, mes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(grado);
  if (!sheet) throw new Error("No se encontró la hoja del grado especificado.");

  // Obtenemos los encabezados que están en la Fila 2
  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const mesIndex = headers.indexOf(mes); // Buscamos en qué columna está el mes
  
  if (mesIndex === -1) throw new Error("No se encontró el mes en los encabezados.");

  const lastRow = sheet.getLastRow();
  const numRows = lastRow - 2; // Descontamos la fila 1 (Título) y 2 (Encabezados)
  
  if (numRows <= 0) return []; // Si no hay alumnos, devolvemos vacío

  // Extraemos Códigos (Columna A) y Nombres (Columna B)
  const dataRange = sheet.getRange(3, 1, numRows, 2);
  const dataValues = dataRange.getValues();

  // Extraemos las celdas del mes elegido
  const colIndex = mesIndex + 1; // Le sumamos 1 porque los rangos en Apps Script no son "base 0"
  const formulasRange = sheet.getRange(3, colIndex, numRows, 1);
  const formulasValues = formulasRange.getFormulas(); // Lee si hay "=600+75"
  const displayValues = formulasRange.getValues();    // Lee si hay solo un valor directo "600"

  const alumnos = [];

  for (let i = 0; i < numRows; i++) {
    let codigo = dataValues[i][0];
    let nombre = dataValues[i][1];
    
    if (!codigo || codigo === "") continue; // Ignoramos filas en blanco

    let formula = formulasValues[i][0];
    let valor = displayValues[i][0];

    // Si la celda tiene fórmula la enviamos, si no, enviamos el valor directo en formato texto
    let pagoRaw = formula ? formula : valor.toString();

    alumnos.push({
      fila: i + 3, // Guardamos el número de fila real para saber dónde escribir después
      codigo: codigo,
      nombre: nombre,
      pago: pagoRaw
    });
  }

  return alumnos;
}

function savePagos(grado, mes, pagos) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(grado);
  if (!sheet) throw new Error("No se encontró la hoja del grado.");

  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const mesIndex = headers.indexOf(mes);
  if (mesIndex === -1) throw new Error("No se encontró el mes para guardar.");

  const colIndex = mesIndex + 1;

  // Recorremos el paquete de pagos que nos mandó la web
  pagos.forEach(p => {
    const celda = sheet.getRange(p.fila, colIndex);
    
    if (!p.formula || p.formula === "" || p.formula === "=") {
      // Si la web nos manda vacío, borramos el contenido de la celda
      celda.clearContent();
    } else {
      // Si empieza con "=", lo guardamos como fórmula matemática. Si no, como valor normal.
      if (p.formula.toString().startsWith("=")) {
        celda.setFormula(p.formula);
      } else {
        celda.setValue(p.formula);
      }
    }
  });

  return { success: true, message: "Todos los pagos fueron registrados correctamente." };
}