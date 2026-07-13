// Función Principal: Extrae los datos y construye el PDF sin romper nada de la web
async function generarPDF() {
    const btn = document.getElementById('btn-descargar-pdf');
    const btnText = document.getElementById('text-descargar-pdf');
    const icono = btn.querySelector('i');
    const originalText = btnText.innerText;
    
    try {
        // Estado visual de carga (Feedback al usuario)
        btn.disabled = true;
        btnText.innerText = 'Generando Reporte...';
        icono.className = 'loader border-white w-4 h-4 mr-2'; // Cambiamos el icono por un spinner
        btn.classList.add('opacity-75', 'cursor-wait');

        // 1. CARGA DINÁMICA DE LIBRERÍAS (Evita modificar el HTML externo)
        if (!window.jspdf) {
            await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        if (!window.jspdf.AutoTable && !window.jsPDF?.API?.autoTable) {
            await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
        }

        // 2. INICIALIZAR DOCUMENTO (Tamaño Carta - Letter)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        
        // Medidas Tamaño Carta: 215.9 mm de ancho x 279.4 mm de alto
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginX = 20;

        // 3. EXTRACCIÓN DE DATOS DE LA WEB (DOM)
        const nombreAlumno = document.getElementById('dash-nombre').innerText || 'Estudiante';
        const gradoAlumno = document.getElementById('dash-grado').innerText || 'Grado no especificado';
        const promedioGlobal = document.getElementById('dash-promedio-global').innerText || '0';


        // ==========================================
        // PÁGINA 1: PORTADA Y REPORTE CUALITATIVO
        // ==========================================
        
        // Franja superior azul oscuro
        doc.setFillColor(10, 17, 40); 
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Títulos de Encabezado
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text('COLEGIO IPTCE', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text('REPORTE ACADÉMICO OFICIAL DEL ESTUDIANTE', pageWidth / 2, 28, { align: 'center' });

        // Tarjeta gráfica de datos del alumno
        doc.setFillColor(241, 245, 249); // Gris muy claro de fondo
        doc.roundedRect(marginX, 50, pageWidth - (marginX * 2), 35, 4, 4, 'F');
        
        doc.setTextColor(10, 17, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(nombreAlumno, marginX + 10, 63);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139);
        doc.text(`Grado asignado: ${gradoAlumno}`, marginX + 10, 73);
        
        // Bloque del Promedio General
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('PROMEDIO GENERAL', pageWidth - marginX - 10, 63, { align: 'right' });
        
        doc.setFontSize(22);
        doc.setTextColor(59, 130, 246); // Color Accent (Blue-500)
        doc.text(`${promedioGlobal} pts`, pageWidth - marginX - 10, 75, { align: 'right' });

        // Título de sección de IA
        doc.setTextColor(10, 17, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Reporte Cualitativo y Recomendaciones', marginX, 105);
        
        // Línea estética separadora
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, 110, pageWidth - marginX, 110);

        // Listado de las 7 recomendaciones
        const comentariosDivs = document.querySelectorAll('#comentarios-cualitativos .ai-comment-item p');
        let currentY = 120;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85); 

        comentariosDivs.forEach((p) => {
            const textoLimpio = p.innerText.trim();
            if (textoLimpio) {
                // Dibujar viñeta
                doc.setFillColor(59, 130, 246);
                doc.circle(marginX + 2, currentY - 1.5, 1.5, 'F');
                
                // Cortar texto para que no se salga de los márgenes
                const splitText = doc.splitTextToSize(textoLimpio, pageWidth - marginX * 2 - 10);
                doc.text(splitText, marginX + 8, currentY);
                
                // Mover cursor Y hacia abajo para el siguiente párrafo
                currentY += (splitText.length * 6) + 4;
            }
        });


        // ==========================================
        // PÁGINA 2: REGISTRO DE CALIFICACIONES (TABLAS)
        // ==========================================
        doc.addPage();
        
        // Encabezado P2
        doc.setFillColor(10, 17, 40);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('REGISTRO DE CALIFICACIONES DETALLADO', pageWidth / 2, 16, { align: 'center' });

        let yPosTablas = 35;
        const tarjetasBimestres = document.querySelectorAll('#bimestres-grid > div');
        
        if (tarjetasBimestres.length > 0) {
            tarjetasBimestres.forEach((tarjeta) => {
                const tituloElement = tarjeta.querySelector('h3');
                if (!tituloElement) return;
                
                const tituloBimestre = tituloElement.innerText;
                const filas = tarjeta.querySelectorAll('tbody tr');
                
                let dataTabla = [];
                filas.forEach(fila => {
                    const celdas = fila.querySelectorAll('td');
                    if(celdas.length >= 5) {
                        dataTabla.push([
                            celdas[0].innerText.trim(), // Nombre Materia
                            celdas[1].innerText.trim(), // Nota Zona
                            celdas[2].innerText.trim(), // Nota Examen
                            celdas[3].innerText.trim(), // Nota Asistencia
                            celdas[celdas.length - 1].innerText.trim() // Nota Total
                        ]);
                    }
                });

                if (dataTabla.length > 0) {
                    // Título de la tabla (ej. "Bimestre 1")
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(13);
                    doc.setTextColor(10, 17, 40);
                    doc.text(tituloBimestre.toUpperCase(), marginX, yPosTablas - 3);

                    // Generar tabla autoestilizada
                    doc.autoTable({
                        startY: yPosTablas,
                        head: [['Clase / Materia', 'Zona (50)', 'Examen (40)', 'Asist. (10)', 'Total (100)']],
                        body: dataTabla,
                        theme: 'striped',
                        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
                        styles: { fontSize: 10, cellPadding: 4, font: 'helvetica' },
                        columnStyles: {
                            0: { cellWidth: 'auto' },
                            1: { halign: 'center', cellWidth: 25 },
                            2: { halign: 'center', cellWidth: 25 },
                            3: { halign: 'center', cellWidth: 25 },
                            4: { halign: 'center', cellWidth: 25, fontStyle: 'bold', textColor: [15, 23, 42] }
                        },
                        margin: { left: marginX, right: marginX }
                    });
                    
                    // Actualizar la posición Y para la siguiente iteración
                    yPosTablas = doc.lastAutoTable.finalY + 15;

                    // Si la siguiente tabla no va a caber, creamos una hoja nueva para evitar cortes feos
                    if (yPosTablas > pageHeight - 40) {
                        doc.addPage();
                        yPosTablas = 30; // Resetear margen superior
                    }
                }
            });
        } else {
            doc.setTextColor(100, 116, 139);
            doc.setFontSize(12);
            doc.text('No hay calificaciones registradas para mostrar.', pageWidth / 2, 50, { align: 'center' });
        }


        // ==========================================
        // PÁGINA 3: ANÁLISIS ESTADÍSTICO E INSIGHTS
        // ==========================================
        doc.addPage();
        
        // Encabezado P3
        doc.setFillColor(10, 17, 40);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('ANÁLISIS ESTADÍSTICO E INDICADORES CLAVE', pageWidth / 2, 16, { align: 'center' });

        let currentYPage3 = 40;
        const insights = document.querySelectorAll('#comentario-analisis .ai-card');
        
        if (insights.length > 0) {
            doc.setTextColor(10, 17, 40);
            doc.setFontSize(14);
            doc.text('Métricas Clave de Rendimiento', marginX, currentYPage3);
            currentYPage3 += 10;

            // Organizar las 10 tarjetas en 2 columnas estilo "Grid"
            const colWidth = (pageWidth - (marginX * 2)) / 2; // Ancho mitad de página
            let count = 0;
            
            insights.forEach(card => {
                const titulo = card.querySelector('p:nth-child(1)').innerText;
                const valor = card.querySelector('p:nth-child(2)').innerText;
                
                const isLeftCol = (count % 2 === 0);
                const xPos = isLeftCol ? marginX : marginX + colWidth;
                
                // Dibujar caja de la métrica
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(xPos, currentYPage3, colWidth - 5, 14, 2, 2, 'FD');
                
                doc.setTextColor(100, 116, 139);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.text(titulo, xPos + 5, currentYPage3 + 6);
                
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(11);
                doc.text(valor, xPos + 5, currentYPage3 + 11);
                
                if (!isLeftCol) {
                    currentYPage3 += 17; // Bajar de fila solo cuando terminamos la columna derecha
                }
                count++;
            });
            
            if (count % 2 !== 0) currentYPage3 += 17; // Ajuste por si el total es impar
        }

        // Gráfica Global (Intenta capturar el canvas web para insertarlo como imagen visual)
        currentYPage3 += 5;
        try {
            const canvasGlobal = document.getElementById('graficaEvolucionGlobal');
            if (canvasGlobal) {
                const imgData = canvasGlobal.toDataURL('image/png', 1.0);
                doc.setTextColor(10, 17, 40);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text('Gráfica de Evolución Global', marginX, currentYPage3);
                
                // Plasmar imagen en el PDF centrándola levemente
                doc.addImage(imgData, 'PNG', marginX + 15, currentYPage3 + 5, 140, 70);
            }
        } catch(e) {
            console.log('Omisión silenciosa: No se pudo capturar la gráfica HTML5 para el PDF.');
        }

        // 4. GUARDAR EL ARCHIVO PDF AUTOMÁTICAMENTE
        const nombreArchivoLimpio = nombreAlumno.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        doc.save(`Estado_Alumno_${nombreArchivoLimpio}.pdf`);

    } catch (error) {
        console.error('Error Crítico al generar PDF:', error);
        alert('Hubo un error al descargar el PDF. Asegúrate de tener conexión a internet o verifica la consola.');
    } finally {
        // Restaurar botón a su estado original
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-wait');
        btnText.innerText = originalText;
        icono.className = 'fa-solid fa-file-pdf text-lg'; // Devolver su ícono normal
    }
}

// Función auxiliar para inyectar scripts en tiempo de ejecución de manera limpia
function cargarScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}