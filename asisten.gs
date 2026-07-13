function doPost(e) {
  try {
    // Parseamos la información que envía el frontend
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // Acción 1: Devolver la lista de todos los grados (Pestañas de Sheets)
    if (action === "getGrados") {
      const grados = getGrados();
      return ContentService.createTextOutput(JSON.stringify(grados))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Acción 2: Devolver alumnos y sus fórmulas de faltas del mes seleccionado
    if (action === "getAlumnos") {
      const alumnos = getAlumnos(data.grado, data.mes);
      return ContentService.createTextOutput(JSON.stringify(alumnos))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Acción 3: Guardar las faltas actualizadas (Soporta nombres "savePagos" o "saveFaltas")
    if (action === "savePagos" || action === "saveFaltas") {
      // El frontend puede enviar el array como 'pagos' o 'faltas' para mantener compatibilidad
      const listaFaltas = data.faltas || data.pagos; 
      const resultado = saveFaltas(data.grado, data.mes, listaFaltas);
      return ContentService.createTextOutput(JSON.stringify(resultado))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    // Si algo falla, enviamos el error detallado a la web
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Obtiene los nombres de todas las hojas de cálculo (Grados)
function getGrados() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  return sheets.map(sheet => sheet.getName());
}

// Lee los alumnos y extrae limpiamente las fórmulas de las faltas
function getAlumnos(grado, mes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(grado);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Si no hay alumnos (asumiendo que los datos empiezan en fila 3)

  // Leer encabezados en la fila 2 (Detecta dinámicamente las columnas de los meses C a la L)
  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const mesIndex = headers.indexOf(mes);
  if (mesIndex === -1) return []; // Mes no encontrado

  const colIndex = mesIndex + 1;

  // Operación masiva: Leemos códigos (Columna A) y nombres (Columna B) de un solo golpe
  const infoData = sheet.getRange(3, 1, lastRow - 2, 2).getValues();
  
  // Operación masiva: Leemos las fórmulas y los valores de la columna del mes seleccionado
  const mesRange = sheet.getRange(3, colIndex, lastRow - 2, 1);
  const formulas = mesRange.getFormulas();
  const valores = mesRange.getValues();

  const alumnos = [];

  for (let i = 0; i < infoData.length; i++) {
    const codigo = infoData[i][0];
    const nombre = infoData[i][1];
    
    // Saltamos filas completamente vacías para limpiar la vista
    if (!codigo && !nombre) continue;

    const formula = formulas[i][0];
    const valor = valores[i][0];

    // Unificación de datos: Si Sheets tiene una fórmula (=2+15) se envía tal cual.
    // Si tiene un número directo (ej: 5), se le concatena el "=" para que el JS frontal
    // siempre procese un formato estandarizado y sin fallas.
    let faltaRaw = "";
    if (formula) {
      faltaRaw = formula;
    } else if (valor !== "" && valor !== null && valor !== undefined) {
      faltaRaw = "=" + valor.toString();
    }

    alumnos.push({
      fila: i + 3, // Almacenamos el número de fila real en Sheets para la posterior escritura
      codigo: codigo ? codigo.toString() : "",
      nombre: nombre ? nombre.toString() : "",
      falta: faltaRaw // Ejemplo de salida: "=2+15+21" o "" si no tiene faltas
    });
  }

  return alumnos;
}

// Guarda de forma masiva y ultra veloz el nuevo estado de las fórmulas
function saveFaltas(grado, mes, listaFaltas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(grado);
  if (!sheet) return { success: false, error: "No se encontró la hoja del grado." };

  // Buscar columna del mes en la fila 2
  const headers = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
  const mesIndex = headers.indexOf(mes);
  if (mesIndex === -1) return { success: false, error: "No se encontró el mes en la hoja de cálculo." };

  const colIndex = mesIndex + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return { success: true, message: "No hay registros que actualizar." };

  // Rango completo de la columna del mes desde la fila 3 hasta la última
  const range = sheet.getRange(3, colIndex, lastRow - 2, 1);
  
  // Leemos el estado actual de la columna para conservar datos de filas que no se editaron
  const currentFormulas = range.getFormulas();
  const currentValues = range.getValues();
  
  // Convertimos el array del frontend en un mapa indexado por el número de fila para acceso rápido
  const faltasMap = {};
  listaFaltas.forEach(f => {
    // Soportamos que el frontend envíe la propiedad como 'formula' o 'falta'
    faltasMap[f.fila] = f.formula !== undefined ? f.formula : f.falta;
  });

  // Reconstruimos la columna completa en memoria
  const updatedFormulas = [];
  for (let i = 0; i < currentFormulas.length; i++) {
    const currentFila = i + 3;
    
    if (faltasMap.hasOwnProperty(currentFila)) {
      let fTarget = faltasMap[currentFila].trim();
      
      // Si el frontend envió datos y no inician con "=", se lo agregamos automáticamente
      if (fTarget && !fTarget.startsWith("=")) {
        fTarget = "=" + fTarget;
      }
      
      // Si la cadena viene vacía o es un simple "=", guardamos una celda vacía ""
      if (fTarget === "=" || fTarget === "") {
        updatedFormulas.push([""]);
      } else {
        updatedFormulas.push([fTarget]);
      }
    } else {
      // Si esta fila no sufrió cambios en la web, preservamos su valor o fórmula original
      const existingFormula = currentFormulas[i][0];
      const existingValue = currentValues[i][0];
      
      if (existingFormula) {
        updatedFormulas.push([existingFormula]);
      } else if (existingValue !== "") {
        updatedFormulas.push(["=" + existingValue]);
      } else {
        updatedFormulas.push([""]);
      }
    }
  }

  // --- EL TRUCO DE VELOCIDAD ---
  // Limpiamos el contenido del rango completo de una sola vez y reescribimos todas las fórmulas juntas.
  // Esto previene errores de "tiempo límite de ejecución agotado" en Google Sheets.
  range.clearContent();
  range.setFormulas(updatedFormulas);

  return { success: true };
}