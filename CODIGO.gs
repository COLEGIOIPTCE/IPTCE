/**
 * SISTEMA INTEGRADO DE GESTIÓN DE AULA - BACKEND PARA PORTAL DE ESTUDIANTES
 * Archivo: CODIGO.gs
 */

const ID_DOCUMENTO = "1EUUC4ACvzMxvfmZ34o-Zic14BLZoRAjOVQlOGQiyAis";

// Punto de entrada para peticiones GET (desde el fetch de JS)
function doGet(e) {
  const action = (e && e.parameter) ? e.parameter.action : null;
  
  if (!action) {
    return crearRespuesta({ error: "Acción no especificada." });
  }

  // --- RUTA 1: Obtener la lista de Grados (Hojas) ---
  if (action === 'obtenerGrados') {
    try {
      const ss = SpreadsheetApp.openById(ID_DOCUMENTO);
      const nombresHojas = ss.getSheets()
                             .map(s => s.getName())
                             .filter(n => n !== "CURSOS" && n !== "Hoja 1"); 
      return crearRespuesta({ exito: true, grados: nombresHojas });
    } catch (error) {
      return crearRespuesta({ exito: false, error: "Error al obtener grados: " + error.message });
    }
  }

  // --- RUTA 2: Obtener Alumnos de un Grado específico ---
  if (action === 'obtenerAlumnos') {
    const grado = e.parameter.grado;
    if (!grado) return crearRespuesta({ exito: false, error: "Falta el parámetro grado." });

    try {
      const ss = SpreadsheetApp.openById(ID_DOCUMENTO);
      const hoja = ss.getSheetByName(grado);
      if (!hoja) return crearRespuesta({ exito: false, error: "Grado no encontrado." });

      const ultimaFila = hoja.getLastRow();
      if (ultimaFila < 1) return crearRespuesta({ exito: false, error: "Hoja vacía." });

      const datosNombres = hoja.getRange(1, 2, ultimaFila, 1).getValues();
      let alumnosSet = new Set();
      let leyendoAlumnos = false;

      for (let i = 0; i < datosNombres.length; i++) {
        let valor = String(datosNombres[i][0]).trim();
        
        if (valor === "ALUMNOS") {
          leyendoAlumnos = true;
          continue; 
        }

        if (leyendoAlumnos) {
           if (valor === "" || valor.includes("BIM")) {
               break; 
           }
           alumnosSet.add(valor);
        }
      }

      const listaAlumnos = Array.from(alumnosSet).sort();
      return crearRespuesta({ exito: true, alumnos: listaAlumnos });

    } catch (error) {
      return crearRespuesta({ exito: false, error: "Error al obtener alumnos: " + error.message });
    }
  }

  // --- RUTA 3: Login y Extracción del Dashboard Completo ---
  if (action === 'loginDashboard') {
    const grado = e.parameter.grado;
    const alumno = e.parameter.alumno;
    const codigo = e.parameter.codigo; 
    
    if (!grado || !alumno || !codigo) {
      return crearRespuesta({ exito: false, error: "Faltan credenciales (grado, alumno o código)." });
    }

    try {
      const ss = SpreadsheetApp.openById(ID_DOCUMENTO);
      const hoja = ss.getSheetByName(grado);
      if (!hoja) return crearRespuesta({ exito: false, error: "Grado no encontrado." });

      const ultimaFila = hoja.getLastRow();
      const ultimaCol = hoja.getLastColumn();
      
      const valores = hoja.getRange(1, 1, ultimaFila, ultimaCol).getValues();
      // NUEVO: Obtenemos las fórmulas para desglosar la nota
      const formulas = hoja.getRange(1, 1, ultimaFila, ultimaCol).getFormulas();

      // 1. VALIDACIÓN DE CÓDIGO (Login)
      let accesoPermitido = false;

      for (let i = 0; i < valores.length; i++) {
        if (String(valores[i][1]).trim() === alumno) {
          const codigoReal = String(valores[i][0]).trim();
          if (codigoReal === codigo) {
            accesoPermitido = true;
            break; 
          } else {
             return crearRespuesta({ exito: false, error: "Código incorrecto." });
          }
        }
      }

      if (!accesoPermitido) {
        return crearRespuesta({ exito: false, error: "Alumno no encontrado o código incorrecto." });
      }

      // 2. EXTRACCIÓN DE DATOS PARA EL DASHBOARD
      let datosDashboard = {
        alumno: alumno,
        grado: grado,
        bimestres: [] 
      };

      let bimestreActual = "";
      let cursosEncabezado = [];
      let colPromedioBimestre = -1;

      for (let i = 0; i < valores.length; i++) {
        let celdaColB = String(valores[i][1]).trim(); 

        if (celdaColB.includes("BIM")) {
          bimestreActual = celdaColB;
          let filaEncabezados = i + 1; 
          
          if(filaEncabezados < valores.length && String(valores[filaEncabezados][1]).trim() === "ALUMNOS") {
            cursosEncabezado = [];
            colPromedioBimestre = -1;
            
            for (let c = 2; c < ultimaCol; c++) {
              let nombreCabecera = String(valores[filaEncabezados][c]).trim();
              
              if (nombreCabecera.toUpperCase().includes("PROMEDIO")) {
                colPromedioBimestre = c;
                break; 
              }
              
              if (nombreCabecera !== "") {
                cursosEncabezado.push({
                   indiceCol: c,
                   nombre: nombreCabecera
                });
              }
            }
          }
          continue; 
        }

        if (celdaColB === alumno && bimestreActual !== "") {
          let datosAlumnoBimestre = {
            nombreBimestre: bimestreActual,
            asistencia: "", 
            materias: [],
            promedioBimestre: 0
          };

          // Extraemos la asistencia real de la columna C (índice 2)
          let valAsistenciaReal = valores[i][2];
          let valAsistenciaString = String(valAsistenciaReal).trim();
          let matchAsistencia = valAsistenciaString.match(/^=?\s*(\d+)/);
          
          if (matchAsistencia) {
             datosAlumnoBimestre.asistencia = parseInt(matchAsistencia[1], 10);
          } else {
             datosAlumnoBimestre.asistencia = valAsistenciaReal === "" ? 0 : valAsistenciaReal;
          }

          cursosEncabezado.forEach(curso => {
            if (curso.indiceCol > 2) { 
                let notaFinal = valores[i][curso.indiceCol];
                let formulaNota = formulas[i][curso.indiceCol]; // Ejemplo: =50+32+C32
                
                // Regex para capturar los dos primeros números de la suma y validar que termina en +C[fila]
                // El patrón busca: numero + numero + C (seguido de cualquier numero de fila)
                let matchDesglose = formulaNota.match(/^=?\s*(\d+)\s*\+\s*(\d+)\s*\+\s*C\d+/i);
                
                datosAlumnoBimestre.materias.push({
                  materia: curso.nombre,
                  zona: matchDesglose ? parseInt(matchDesglose[1], 10) : "-",
                  examen: matchDesglose ? parseInt(matchDesglose[2], 10) : "-",
                  asistencia: matchDesglose ? datosAlumnoBimestre.asistencia : "-",
                  nota: (notaFinal === "" || isNaN(notaFinal)) ? 0 : Number(notaFinal)
                });
            }
          });

          if (colPromedioBimestre !== -1) {
            let prom = valores[i][colPromedioBimestre];
            datosAlumnoBimestre.promedioBimestre = (prom === "" || isNaN(prom)) ? 0 : Number(prom).toFixed(2);
          }

          datosDashboard.bimestres.push(datosAlumnoBimestre);
        }
      }

      return crearRespuesta({ exito: true, datos: datosDashboard });

    } catch (error) {
      return crearRespuesta({ exito: false, error: "Error de servidor: " + error.message });
    }
  }

  return crearRespuesta({ error: "Acción no válida." });
}

function crearRespuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}