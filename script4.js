/* 
    SCRIPT 4 - MÓDULO DE CITATORIOS Y GENERACIÓN PDF
    Colegio IPTCE - Kronos OS
*/

document.addEventListener('DOMContentLoaded', () => {
    
    // Referencias a los elementos del DOM
    const btnGenerarCarta = document.getElementById('btnGenerarCarta');
    const modal = document.getElementById('citatorioModal');
    const btnClose = document.getElementById('btnCloseCitatorio');
    const btnGenerarPDF = document.getElementById('btnGenerarPDFCitatorio');
    const selectPendiente = document.getElementById('selectEstudiantePendiente');
    
    // Inputs del Modal
    const citTutor = document.getElementById('citTutor');
    const citAlumno = document.getElementById('citAlumno');
    const citFecha = document.getElementById('citFecha');
    const citHora = document.getElementById('citHora');
    const citMotivo = document.getElementById('citMotivo');
    const citDetalles = document.getElementById('citDetalles');

    // Abrir Modal
    if(btnGenerarCarta) {
        btnGenerarCarta.addEventListener('click', () => {
            // Pre-llenar el nombre del estudiante si hay uno seleccionado en el select principal
            if (selectPendiente && selectPendiente.value) {
                citAlumno.value = selectPendiente.value;
                
                // Si la causa es Inasistencia, se puede poner predeterminado la información en el detalle
                const optionElegida = selectPendiente.options[selectPendiente.selectedIndex];
                const faltas = optionElegida.dataset.faltas;
                const dias = optionElegida.dataset.dias;
                
                citMotivo.value = "Inasistencias Reiteradas";
                
                let extraDetalle = "";
                if(dias && dias.trim() !== "") {
                    extraDetalle = `Faltas registradas los días: ${dias}. `;
                }
                citDetalles.value = `${extraDetalle}Se requiere traer justificación escrita o médica correspondiente.`;
                
            } else {
                citAlumno.value = '';
                citDetalles.value = '';
                citMotivo.selectedIndex = 0;
            }
            
            modal.style.display = 'flex';
        });
    }

    // Cerrar Modal
    if(btnClose) {
        btnClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Cerrar al hacer clic fuera del panel
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    btnGenerarPDF.addEventListener('click', () => {
        
        // Validación básica
        if (!citTutor.value.trim() || !citAlumno.value.trim() || !citFecha.value || !citHora.value) {
            if(typeof showKronosToast === 'function') {
                showKronosToast('Campos Incompletos', 'Por favor, complete al menos el Tutor, Alumno, Fecha y Hora.', 'info');
            } else {
                alert("Por favor, complete los campos obligatorios.");
            }
            return;
        }

        const { jsPDF } = window.jspdf;
        
        // Documento tamaño carta estándar (612 x 792 puntos)
        const doc = new jsPDF({ format: 'letter', unit: 'pt' });
        
        // Paleta de Colores Institucionales IPTCE (Basados en el diseño premium)
        const colorDarkNavy = [5, 10, 21]; // #050a15 Casi negro
        const colorGold = [212, 175, 55];  // #d4af37 Dorado
        const colorBlack = [20, 20, 20];
        const colorGray = [100, 100, 100];
        const colorLightGray = [220, 220, 220];

        // Márgenes y medidas
        const marginX = 50;
        const contentWidth = 512; // 612 - (50*2)
        let currentY = 50;

        // ----- BORDES ELEGANTES -----
        doc.setDrawColor(...colorLightGray);
        doc.setLineWidth(0.5);
        doc.rect(20, 20, 572, 752); // Borde exterior muy fino

        // ----- ENCABEZADO TIPO MEMBRETE -----
        doc.setFont("times", "bold");
        doc.setFontSize(28);
        doc.setTextColor(...colorDarkNavy);
        doc.text("COLEGIO IPTCE", 612 - marginX, currentY + 30, { align: 'right' });
        
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...colorGray);
        doc.text("INSTITUTO PROFESIONAL DE TÉCNICAS COMERCIALES ESPECIALIZADAS", 612 - marginX, currentY + 45, { align: 'right' });
        
        // Etiqueta "CITATORIO OFICIAL" con fondo sutil
        doc.setDrawColor(...colorGold);
        doc.setFillColor(252, 248, 235); // Fondo amarillento muy sutil
        doc.setLineWidth(1);
        doc.rect(612 - marginX - 110, currentY + 55, 110, 20, 'FD');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...colorDarkNavy);
        doc.text("CITATORIO OFICIAL", 612 - marginX - 55, currentY + 68, { align: 'center' });

        currentY += 100;
        
        // Línea divisoria cabecera
        doc.setDrawColor(...colorBlack);
        doc.setLineWidth(0.5);
        doc.line(marginX, currentY, 612 - marginX, currentY);

        currentY += 30;

        // ----- REFERENCIA Y FECHA -----
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...colorGray);
        doc.text("Ref: ", marginX, currentY);
        doc.setTextColor(...colorDarkNavy);
        
        // Generar un folio aleatorio para realismo
        const folio = Math.floor(1000 + Math.random() * 9000);
        doc.text(`DIR-2026-${folio}`, marginX + 22, currentY);

        // Fecha de hoy formal
        const today = new Date();
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const fechaFormal = `${today.getDate()} de ${meses[today.getMonth()]} del ${today.getFullYear()}`;
        
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(...colorBlack);
        doc.text(`Emisión: ${fechaFormal}`, 612 - marginX, currentY, { align: 'right' });

        currentY += 40;

        // ----- SALUDO -----
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("A la atención de", marginX, currentY);
        
        currentY += 15;
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...colorDarkNavy);
        const destinatario = citTutor.value.trim();
        doc.text(destinatario, marginX, currentY);

        currentY += 30;

        // ----- CUERPO (PÁRRAFO PRINCIPAL) -----
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...colorBlack);
        const textoIntro = "La Dirección General y el Consejo Académico del Colegio IPTCE se dirigen a usted de la manera más atenta para extenderle una convocatoria oficial. Se requiere su honorable presencia en nuestras instalaciones con el propósito de tratar asuntos institucionales relacionados con el proceso formativo del alumno(a):";
        const lineasIntro = doc.splitTextToSize(textoIntro, contentWidth);
        doc.text(lineasIntro, marginX, currentY, { align: 'justify', maxWidth: contentWidth, lineHeightFactor: 1.5 });

        currentY += (lineasIntro.length * 15) + 30;

        // ----- NOMBRE DEL ALUMNO (DESTACADO) -----
        const nombreAlumno = citAlumno.value.trim().toUpperCase();
        doc.setFont("times", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...colorDarkNavy);
        doc.text(nombreAlumno, 306, currentY, { align: 'center' });
        
        // Subrayado sutil al alumno
        doc.setDrawColor(...colorGray);
        doc.setLineWidth(0.5);
        const widthAlumno = doc.getTextWidth(nombreAlumno);
        doc.line(306 - (widthAlumno/2) - 10, currentY + 5, 306 + (widthAlumno/2) + 10, currentY + 5);

        currentY += 40;

        // ----- CUADRO DE ESPECIFICACIONES -----
        const boxHeight = 90;
        doc.setDrawColor(...colorBlack);
        doc.setLineWidth(0.5);
        doc.rect(marginX, currentY, contentWidth, boxHeight); // Borde de caja

        // Mini esquinas (Diseño premium)
        doc.setLineWidth(1.5);
        doc.setDrawColor(...colorDarkNavy);
        const sizeC = 5;
        // Arriba-Izq
        doc.line(marginX, currentY, marginX + sizeC, currentY);
        doc.line(marginX, currentY, marginX, currentY + sizeC);
        // Arriba-Der
        doc.line(612 - marginX, currentY, 612 - marginX - sizeC, currentY);
        doc.line(612 - marginX, currentY, 612 - marginX, currentY + sizeC);
        // Abajo-Izq
        doc.line(marginX, currentY + boxHeight, marginX + sizeC, currentY + boxHeight);
        doc.line(marginX, currentY + boxHeight, marginX, currentY + boxHeight - sizeC);
        // Abajo-Der
        doc.line(612 - marginX, currentY + boxHeight, 612 - marginX - sizeC, currentY + boxHeight);
        doc.line(612 - marginX, currentY + boxHeight, 612 - marginX, currentY + boxHeight - sizeC);

        // Título de la caja
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.text("ESPECIFICACIONES DE LA CONVOCATORIA", 306, currentY + 18, { align: 'center' });

        // Procesar fecha elegida para formatearla formalmente
        let dateStr = "";
        if (citFecha.value) {
            const dateParts = citFecha.value.split('-');
            const dObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            // Array de días para asegurar compatibilidad total en PDF
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            dateStr = `${diasSemana[dObj.getDay()]}, ${dObj.getDate()} de ${meses[dObj.getMonth()]} de ${dObj.getFullYear()}`;
        }

        const timeStr = citHora.value;
        const reasonStr = citMotivo.value;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...colorGray);
        
        const labelX = marginX + 20;
        const dataX = marginX + 130;

        doc.text("FECHA ESTIPULADA:", labelX, currentY + 40);
        doc.text("HORA EXACTA:", labelX, currentY + 60);
        doc.text("ASUNTO CENTRAL:", labelX, currentY + 80);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...colorBlack);
        doc.text(dateStr, dataX, currentY + 40);
        doc.text(timeStr, dataX, currentY + 60);
        doc.text(reasonStr, dataX, currentY + 80);

        // Líneas sutiles divisorias dentro de la caja
        doc.setDrawColor(...colorLightGray);
        doc.setLineWidth(0.5);
        doc.line(labelX, currentY + 45, 612 - marginX - 20, currentY + 45);
        doc.line(labelX, currentY + 65, 612 - marginX - 20, currentY + 65);

        currentY += boxHeight + 30;

        // ----- OBSERVACIONES -----
        const obsText = citDetalles.value.trim();
        if (obsText) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(...colorDarkNavy);
            doc.text("DESGLOSE / ANOTACIONES ADICIONALES:", marginX, currentY);
            
            // Barra decorativa dorada
            doc.setFillColor(...colorGold);
            doc.rect(marginX, currentY + 10, 3, 30, 'F');

            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(...colorBlack);
            const lineasObs = doc.splitTextToSize(obsText, contentWidth - 15);
            doc.text(lineasObs, marginX + 15, currentY + 20);
        }

        // ----- FIRMAS Y SELLO (PIE DE PÁGINA) -----
        // Forzamos a la parte inferior de la página (y=680)
        const signY = 680;
        
        // 1. Dirección (Izquierda)
        doc.setDrawColor(...colorBlack);
        doc.setLineWidth(0.5);
        doc.line(marginX, signY, marginX + 130, signY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...colorDarkNavy);
        doc.text("Dirección General", marginX + 65, signY + 15, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...colorGray);
        doc.text("Colegio IPTCE", marginX + 65, signY + 26, { align: 'center' });

        // 2. SELLO INSTITUCIONAL (Centro)
        doc.setDrawColor(...colorGray);
        doc.setLineWidth(1);
        doc.setLineDashPattern([3, 3], 0);
        doc.circle(306, signY - 25, 35, 'S'); // Circulo del sello
        doc.setLineDashPattern([], 0); // Restaurar línea continua
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...colorLightGray); // Color sutil
        doc.text("SELLO", 306, signY - 25, { align: 'center' });
        doc.text("INSTITUCIONAL", 306, signY - 15, { align: 'center' });

        // 3. Tutor (Derecha)
        doc.setDrawColor(...colorBlack);
        doc.setLineWidth(0.5);
        doc.line(612 - marginX - 130, signY, 612 - marginX, signY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...colorDarkNavy);
        doc.text("Firma de Enterado", 612 - marginX - 65, signY + 15, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...colorGray);
        doc.text("Padre, Madre o Tutor Legal", 612 - marginX - 65, signY + 26, { align: 'center' });

        // ----- DESCARGAR PDF -----
        // Nombre del archivo personalizado
        const nombreArchivo = `Citatorio_IPTCE_${nombreAlumno.replace(/ /g, '_')}.pdf`;
        doc.save(nombreArchivo);
        
        if(typeof showKronosToast === 'function') {
            showKronosToast('Documento Generado', 'El citatorio oficial se ha descargado como PDF.', 'success');
        }
        
        // Cerrar modal automáticamente tras descargar
        modal.style.display = 'none';
    });

});