import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    getDocs,
    setDoc,
    collection
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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

window.buscarCliente = async function () {
    const telefonoBusqueda = document.getElementById("telefonoBusqueda").value;
    if (!telefonoBusqueda) {
        alert("Por favor ingresa un número de teléfono para buscar.");
        return;
    }

    const ref = doc(db, "clientes", telefonoBusqueda);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const c = snap.data();
        llenarFormulario(c);
        const hoy = new Date();
        const fechaVencimiento = new Date(c.fechaVencimiento);
        const estado = hoy <= fechaVencimiento
            ? "<span class='estado-activo'>Activo</span>"
            : "<span class='estado-vencido'>Vencido</span>";
        document.getElementById("resultado").innerHTML =
            `Cliente encontrado. Estado de la membresía: ${estado}`;
    } else {
        document.getElementById("resultado").innerText = "⚠️ Cliente no encontrado. Puedes registrar uno nuevo.";
        document.getElementById("registro").reset();
        document.getElementById("edad").value = "";
        document.getElementById("telefonoBusqueda").value = telefonoBusqueda;
    }
};

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

        clientesSnap.forEach((docu) => {
            const data = docu.data();
            if (data.nombre && data.nombre.toLowerCase().includes(apellidoBusqueda.toLowerCase())) {
                // AQUÍ: data-telefono ahora usa el ID del documento (que debe ser el teléfono)
                listaHTML += `<li style="cursor: pointer;" data-telefono="${docu.id}"><strong>${data.nombre}</strong> - Teléfono: ${data.telefono || 'No registrado'} - Vencimiento: ${data.fechaVencimiento || 'No registrada'}</li>`;
            }
        });

        listaHTML += "</ul>";
        resultadosContainer.innerHTML = listaHTML;

        const listaItems = resultadosContainer.querySelectorAll('li');
        listaItems.forEach(item => {
            item.addEventListener('click', async function () {
                // CORRECCIÓN: Usar telefonoSeleccionado (singular) y asegurar que el ID del documento es el teléfono
                const telefonoSeleccionado = this.getAttribute('data-telefono');
                if (telefonoSeleccionado) {
                    const ref = doc(db, "clientes", telefonoSeleccionado); // Buscar por el ID del documento (que es el teléfono)
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        const clienteData = snap.data();
                        llenarFormulario(clienteData);
                        document.getElementById("resultado").innerHTML = `✅ Cliente <strong>${clienteData.nombre}</strong> seleccionado.`;
                        // Llenar el campo de búsqueda superior con el teléfono del cliente seleccionado
                        document.getElementById("telefonoBusqueda").value = telefonoSeleccionado;
                    } else {
                        document.getElementById("resultado").innerHTML = `⚠️ No se encontró información para el teléfono: ${telefonoSeleccionado}.`;
                    }
                }
            });
        });

        if (listaHTML === `<h3>Clientes encontrados cuyo nombre contiene: ${apellidoBusqueda}</h3><ul></ul>`) {
            resultadosContainer.innerHTML = `<p>No se encontraron clientes cuyo nombre contenga: <strong>${apellidoBusqueda}</strong>.</p>`;
        }

    } catch (error) {
        console.error("Error al buscar por nombre o apellido: ", error);
        resultadosContainer.innerHTML = "<p class='error'>❌ Error al realizar la búsqueda.</p>";
    }
};

document.getElementById("registro").addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value;
    const telefono = document.getElementById("telefono").value; // Teléfono del formulario de registro
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const edad = parseInt(document.getElementById("edad").value);
    const sexo = document.getElementById("sexo").value;
    const plan = parseInt(document.getElementById("plan").value);
    const valorPagado = parseInt(document.getElementById("valorPagado").value);
    const fechaIngreso = new Date(document.getElementById("fechaIngreso").value);

    const fechaVencimiento = new Date(fechaIngreso);
    let diasAAgregar = 0;

    switch (plan) {
        case 1: diasAAgregar = 15; break; // Quincenal
        case 2: diasAAgregar = 30; break; // Mensual
        case 3: diasAAgregar = 60; break; // Bimestral
        case 4: diasAAgregar = 90; break; // Trimestral
    }

    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasAAgregar);
    const fechaIngresoStr = fechaIngreso.toISOString().split('T')[0];
    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];

    try {
        // Usamos el 'telefono' del formulario de registro como ID del documento en Firestore
        await setDoc(doc(db, "clientes", telefono), {
            nombre,
            telefono, // Almacenar el teléfono también como un campo
            fechaNacimiento,
            edad,
            sexo,
            plan,
            valorPagado,
            fechaIngreso: fechaIngresoStr,
            fechaVencimiento: fechaVencimientoStr,
        });

        const hoy = new Date();
        const estado = hoy <= fechaVencimiento
            ? "<span class='estado-activo'>Activo</span>"
            : "<span class='estado-vencido'>Vencido</span>";

        document.getElementById("resultado").innerHTML =
            `✅ Cliente <strong>${nombre}</strong> actualizado correctamente.<br>Su membresía vence el <strong>${fechaVencimientoStr}</strong>.<br>Estado: ${estado}`;

        document.getElementById("registro").reset();
        document.getElementById("edad").value = "";
        document.getElementById("telefonoBusqueda").value = ""; // Limpiar el campo de búsqueda superior

        verificarVencimientos();

    } catch (error) {
        console.error("Error al registrar: ", error);
        document.getElementById("resultado").innerText = "❌ Error al guardar los datos.";
    }
});

async function verificarVencimientos() {
    const container = document.getElementById("vencenManana");
    container.innerHTML = "";

    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const fechaObjetivo = mañana.toISOString().split("T")[0];

    const clientesSnap = await getDocs(collection(db, "clientes"));
    clientesSnap.forEach((docu) => {
        const data = docu.data();
        // Asegurarse de que data.telefono exista para evitar enlaces rotos
        if (data.fechaVencimiento === fechaObjetivo && data.telefono) {
            const mensaje = encodeURIComponent(`Hola ${data.nombre}, te saludamos desde el gimnasio Radical Training. Tu membresía vence el ${data.fechaVencimiento}. Sigue mejorando tu salud y bienestar. ¡Te esperamos con ansías y seguir entrenando! Éste es un mensaje automático.`);
            const link = `https://wa.me/57${data.telefono}?text=${mensaje}`;

            const div = document.createElement("div");
            div.innerHTML = `
        <strong>${data.nombre}</strong> (${data.telefono}) vence el ${data.fechaVencimiento}<br>
        <a class='whatsapp-link' target='_blank' href='${link}' onclick="this.outerHTML='<span>✅ WhatsApp enviado</span>'">📲 Enviar WhatsApp</a>
        <br><br>
      `;
            container.appendChild(div);
        }
    });
}

verificarVencimientos();

function llenarFormulario(data) {
    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("telefono").value = data.telefono || ""; // Llenar el campo de teléfono del formulario de registro
    document.getElementById("fechaNacimiento").value = data.fechaNacimiento || "";
    document.getElementById("edad").value = data.edad || "";
    document.getElementById("sexo").value = data.sexo || "Masculino";
    document.getElementById("plan").value = data.plan || "1";
    document.getElementById("fechaIngreso").value = data.fechaIngreso || "";
    document.getElementById("valorPagado").value = data.valorPagado || "";
    // Llenar el campo de búsqueda superior con el teléfono del cliente encontrado
    document.getElementById("telefonoBusqueda").value = data.telefono || "";
}