import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    getDocs,
    setDoc,
    collection
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Escucha el cambio en la fecha de nacimiento para calcular la edad automáticamente
document.getElementById("fechaNacimiento").addEventListener("change", function () {
    const nacimiento = new Date(this.value);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    document.getElementById("edad").value = edad;
});

// Función para buscar cliente por número de teléfono
window.buscarCliente = async function () {
    const telefonoBusqueda = document.getElementById("telefonoBusqueda").value;
    if (!telefonoBusqueda) {
        alert("Por favor ingresa un número de teléfono para buscar.");
        return;
    }

    const ref = doc(db, "clientes", telefonoBusqueda); // Se asume que el ID del documento es el teléfono
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const c = snap.data();
        llenarFormulario(c); // Rellena el formulario con los datos del cliente encontrado
        const hoy = new Date();
        const fechaVencimiento = new Date(c.fechaVencimiento); // Convertir string a Date
        const estado = hoy <= fechaVencimiento
            ? "<span class='estado-activo'>Activo</span>"
            : "<span class='estado-vencido'>Vencido</span>";
        document.getElementById("resultado").innerHTML =
            `Cliente encontrado. Estado de la membresía: ${estado}`;
    } else {
        document.getElementById("resultado").innerText = "⚠️ Cliente no encontrado. Puedes registrar uno nuevo.";
        document.getElementById("registro").reset(); // Limpiar el formulario
        document.getElementById("edad").value = "";
        document.getElementById("telefonoBusqueda").value = telefonoBusqueda; // Mantener el teléfono de búsqueda
    }
};

// Función para buscar clientes por nombre o apellido
window.buscarClientePorApellido = async function () {
    const apellidoBusqueda = document.getElementById("apellidoBusqueda").value;
    const resultadosContainer = document.getElementById("resultadosBusquedaApellido");

    if (!apellidoBusqueda) {
        alert("Por favor ingresa un nombre o apellido para buscar.");
        resultadosContainer.innerHTML = "";
        return;
    }

    resultadosContainer.innerHTML = `<p>Buscando clientes cuyo nombre contiene: <strong>${apellidoBusqueda}</strong>...</p>`;

    try {
        const clientesSnap = await getDocs(collection(db, "clientes"));
        let listaHTML = `<h3>Clientes encontrados cuyo nombre contiene: ${apellidoBusqueda}</h3><ul>`;
        let found = false;

        clientesSnap.forEach((docu) => {
            const data = docu.data();
            // Filtrar por nombre que incluya la cadena de búsqueda (insensible a mayúsculas/minúsculas)
            if (data.nombre && data.nombre.toLowerCase().includes(apellidoBusqueda.toLowerCase())) {
                found = true;
                // data-telefono usa el ID del documento (que es el teléfono)
                listaHTML += `<li style="cursor: pointer;" data-telefono="${docu.id}"><strong>${data.nombre}</strong> - Teléfono: ${data.telefono || 'No registrado'} - Vencimiento: ${data.fechaVencimiento || 'No registrada'}</li>`;
            }
        });

        listaHTML += "</ul>";
        resultadosContainer.innerHTML = listaHTML;

        // Añadir el evento click a cada elemento de la lista de resultados
        const listaItems = resultadosContainer.querySelectorAll('li');
        listaItems.forEach(item => {
            item.addEventListener('click', async function () {
                const telefonoSeleccionado = this.getAttribute('data-telefono');
                if (telefonoSeleccionado) {
                    const ref = doc(db, "clientes", telefonoSeleccionado);
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        const clienteData = snap.data();
                        llenarFormulario(clienteData); // Rellenar el formulario con los datos del cliente seleccionado
                        document.getElementById("resultado").innerHTML = `✅ Cliente <strong>${clienteData.nombre}</strong> seleccionado.`;
                        document.getElementById("telefonoBusqueda").value = telefonoSeleccionado; // Rellenar campo de búsqueda principal
                    } else {
                        document.getElementById("resultado").innerHTML = `⚠️ No se encontró información para el teléfono: ${telefonoSeleccionado}.`;
                    }
                }
            });
        });

        if (!found) {
            resultadosContainer.innerHTML = `<p>No se encontraron clientes cuyo nombre contenga: <strong>${apellidoBusqueda}</strong>.</p>`;
        }

    } catch (error) {
        console.error("Error al buscar por nombre o apellido: ", error);
        resultadosContainer.innerHTML = "<p class='error'>❌ Error al realizar la búsqueda.</p>";
    }
};

// Escucha el envío del formulario de registro/actualización
document.getElementById("registro").addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevenir el envío por defecto del formulario

    const nombre = document.getElementById("nombre").value;
    const telefono = document.getElementById("telefono").value;
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const edad = parseInt(document.getElementById("edad").value);
    const sexo = document.getElementById("sexo").value;
    const plan = parseInt(document.getElementById("plan").value);
    const valorPagado = parseInt(document.getElementById("valorPagado").value);
    const fechaIngreso = new Date(document.getElementById("fechaIngreso").value);

    const fechaVencimiento = new Date(fechaIngreso);
    let diasAAgregar = 0;

    switch (plan) {
        case 1: diasAAgregar = 1; break; // Clase
        case 2: diasAAgregar = 7; break; // Semanal
        case 3: diasAAgregar = 15; break; // Quincenal
        case 4: diasAAgregar = 30; break; // Mensual
        case 5: diasAAgregar = 60; break; // Bimestral
        case 6: diasAAgregar = 90; break; // Trimestral
    }

    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasAAgregar);
    // Formatear fechas a YYYY-MM-DD para guardar como string en Firebase
    const fechaIngresoStr = fechaIngreso.toISOString().split('T')[0];
    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

    try {
        // Usa el 'telefono' del formulario de registro como ID del documento en Firestore
        await setDoc(doc(db, "clientes", telefono), {
            nombre,
            telefono, // Almacenar el teléfono también como un campo dentro del documento
            fechaNacimiento,
            edad,
            sexo,
            plan,
            valorPagado,
            fechaIngreso: fechaIngresoStr,
            fechaVencimiento: fechaVencimientoStr, // Guardar la fecha de vencimiento
        });

        const hoy = new Date();
        const estado = hoy <= fechaVencimiento
            ? "<span class='estado-activo'>Activo</span>"
            : "<span class='estado-vencido'>Vencido</span>";

        document.getElementById("resultado").innerHTML =
            `✅ Cliente <strong>${nombre}</strong> actualizado correctamente.<br>Su membresía vence el <strong>${fechaVencimientoStr}</strong>.<br>Estado: ${estado}`;

        document.getElementById("registro").reset(); // Limpiar el formulario
        document.getElementById("edad").value = "";
        document.getElementById("telefonoBusqueda").value = ""; // Limpiar el campo de búsqueda superior

        verificarVencimientos(); // Actualizar las alertas de vencimiento

    } catch (error) {
        console.error("Error al registrar/actualizar: ", error);
        document.getElementById("resultado").innerText = "❌ Error al guardar los datos.";
    }
});

// Función para verificar y mostrar clientes que vencen mañana
async function verificarVencimientos() {
    const container = document.getElementById("vencenManana");
    container.innerHTML = ""; // Limpiar el contenedor antes de añadir nuevos clientes

    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1); // Establecer la fecha a mañana
    const fechaObjetivo = mañana.toISOString().split("T")[0]; // Formato YYYY-MM-DD para comparación

    const clientesSnap = await getDocs(collection(db, "clientes"));
    let foundVencimiento = false;

    clientesSnap.forEach((docu) => {
        const data = docu.data();
        // Asegurarse de que data.telefono exista para evitar enlaces rotos y que la fecha coincida
        if (data.fechaVencimiento === fechaObjetivo && data.telefono) {
            foundVencimiento = true;
            const mensaje = encodeURIComponent(`Hola ${data.nombre}, te saludamos desde el gimnasio Radical Training. Tu membresía vence el ${data.fechaVencimiento}. Sigue mejorando tu salud y bienestar. ¡Te esperamos con ansías y seguir entrenando! Éste es un mensaje automático.`);
            const link = `https://wa.me/57${data.telefono}?text=${mensaje}`; // Enlace de WhatsApp

            const div = document.createElement("div");
            div.innerHTML = `
                <strong>${data.nombre}</strong> (${data.telefono}) vence el ${data.fechaVencimiento}<br>
                <a class='whatsapp-link' target='_blank' href='${link}' onclick="this.outerHTML='<span>✅ WhatsApp enviado</span>'">📲 Enviar WhatsApp</a>
                <br><br>
            `;
            container.appendChild(div);
        }
    });

    if (!foundVencimiento) {
        container.innerHTML = "<p>No hay clientes que venzan mañana.</p>";
    }
}

// Llama a la función de verificación de vencimientos al cargar la página
verificarVencimientos();

// Función para rellenar el formulario con los datos de un cliente
function llenarFormulario(data) {
    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("fechaNacimiento").value = data.fechaNacimiento || "";
    document.getElementById("edad").value = data.edad || "";
    document.getElementById("sexo").value = data.sexo || "Masculino";
    document.getElementById("plan").value = data.plan || "1";
    document.getElementById("fechaIngreso").value = data.fechaIngreso || "";
    document.getElementById("valorPagado").value = data.valorPagado || "";
    document.getElementById("telefonoBusqueda").value = data.telefono || ""; // También llena el campo de búsqueda superior
}

// Nueva funcionalidad: Generar reporte de Excel
window.generarReporteExcel = async function () {
    const fechaInicioStr = document.getElementById("fechaInicioReporte").value;
    const fechaFinStr = document.getElementById("fechaFinReporte").value;
    const mensajeReporte = document.getElementById("mensajeReporte");

    if (!fechaInicioStr || !fechaFinStr) {
        mensajeReporte.innerText = "Por favor, selecciona una fecha de inicio y fin para el reporte.";
        mensajeReporte.style.color = "orange";
        return;
    }

    const fechaInicio = new Date(fechaInicioStr);
    const fechaFin = new Date(fechaFinStr);
    fechaFin.setHours(23, 59, 59, 999); // Ajustar a fin del día para incluir pagos de ese día

    mensajeReporte.innerText = "Generando reporte...";
    mensajeReporte.style.color = "black";

    try {
        const clientesRef = collection(db, "clientes");
        const clientesSnap = await getDocs(clientesRef);

        let data = [];
        // Añadir encabezados del reporte
        const headers = [
            "Nombre",
            "Teléfono",
            "Fecha de Nacimiento",
            "Edad",
            "Sexo",
            "Tipo de Plan",
            "Valor Pagado",
            "Fecha de Ingreso (Pago)",
            "Fecha de Vencimiento"
        ];
        data.push(headers);

        clientesSnap.forEach((docu) => {
            const cliente = docu.data();
            // Asegúrate de que la fecha de ingreso exista y sea una fecha válida
            const fechaIngresoCliente = cliente.fechaIngreso ? new Date(cliente.fechaIngreso) : null;

            // Filtrar por la fecha de ingreso (fecha del pago) dentro del rango seleccionado
            if (fechaIngresoCliente && fechaIngresoCliente >= fechaInicio && fechaIngresoCliente <= fechaFin) {
                data.push([
                    cliente.nombre || "",
                    cliente.telefono || "",
                    cliente.fechaNacimiento || "",
                    cliente.edad || "",
                    cliente.sexo || "",
                    // Mapear el valor numérico del plan a su descripción
                    cliente.plan === 1 ? "Clase" :
                        cliente.plan === 2 ? "Semanal" :                    
                           cliente.plan === 3 ? "Quincenal" :
                               cliente.plan === 4 ? "Mensual" :
                                  cliente.plan === 5 ? "Bimestral" :
                                     cliente.plan === 6 ? "Trimestral" : "Desconocido",
                    cliente.valorPagado || 0,
                    cliente.fechaIngreso || "",
                    cliente.fechaVencimiento || ""
                ]);
            }
        });

        if (data.length <= 1) { // Solo contiene los encabezados, no hay datos
            mensajeReporte.innerText = "No se encontraron clientes con pagos en el rango de fechas seleccionado.";
            mensajeReporte.style.color = "red";
            return;
        }

        // --- INICIO DE MODIFICACIONES PARA MEJORAR EL FORMATO ---

        // Convertir Array of Arrays a Worksheet
        const ws = XLSX.utils.aoa_to_sheet(data);

        // 1. Auto-ajuste de anchos de columna
        const colWidths = headers.map((header, i) => {
            let maxLen = header.length; // Longitud del encabezado
            for (let j = 1; j < data.length; j++) {
                const cellValue = String(data[j][i]);
                maxLen = Math.max(maxLen, cellValue.length);
            }
            return { wch: maxLen + 2 }; // wch es "width in characters", se añade un poco de padding
        });
        ws['!cols'] = colWidths;

        // 2. Aplicar filtros automáticos a los encabezados
        // !ref es el rango de la hoja, ej. A1:I5
        if (ws['!ref']) {
            ws['!autofilter'] = { ref: ws['!ref'] };
        }

        // 3. Opcional: Estilo para la fila de encabezados (negrita y color de fondo)
        // Esto es un poco más avanzado con SheetJS, ya que hay que modificar las celdas directamente.
        // Si no se ve el estilo, a veces Excel lo ignora si no está habilitada la edición.
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } }, // Letra blanca
            fill: { fgColor: { rgb: "2E75B6" } }, // Fondo azul (similar al de tu imagen)
            alignment: { horizontal: "center" }
        };

        for (let C = 0; C < headers.length; ++C) {
            const cellRef = XLSX.utils.encode_cell({ c: C, r: 0 }); // c = columna, r = fila (0 es la primera fila)
            if (ws[cellRef]) {
                ws[cellRef].s = headerStyle;
            }
        }

        // --- FIN DE MODIFICACIONES PARA MEJORAR EL FORMATO ---

        const wb = XLSX.utils.book_new(); // Crear nuevo Workbook
        XLSX.utils.book_append_sheet(wb, ws, "Reporte de Clientes"); // Añadir Worksheet al Workbook

        // Generar y descargar el archivo Excel
        const nombreArchivo = `Reporte_Pagos_${fechaInicioStr}_a_${fechaFinStr}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);

        mensajeReporte.innerText = `✅ Reporte "${nombreArchivo}" generado correctamente.`;
        mensajeReporte.style.color = "green";

    } catch (error) {
        console.error("Error al generar el reporte Excel: ", error);
        mensajeReporte.innerText = "❌ Error al generar el reporte. Consulta la consola para más detalles.";
        mensajeReporte.style.color = "red";
    }
};