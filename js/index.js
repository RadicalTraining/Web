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
    const cedula = document.getElementById("cedula").value;
    if (!cedula) {
        alert("Por favor ingresa una cédula para buscar.");
        return;
    }
    const ref = doc(db, "clientes", cedula);
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
        document.getElementById("cedula").value = cedula;
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
                listaHTML += `<li style="cursor: pointer;" data-cedula="${docu.id}"><strong>${data.nombre}</strong> - Cédula: ${data.cedula} - Teléfono: ${data.telefono || 'No registrado'} - Vencimiento: ${data.fechaVencimiento || 'No registrada'}</li>`;
            }
        });

        listaHTML += "</ul>";
        resultadosContainer.innerHTML = listaHTML;

        const listaItems = resultadosContainer.querySelectorAll('li');
        listaItems.forEach(item => {
            item.addEventListener('click', async function () {
                const cedulaSeleccionada = this.getAttribute('data-cedula');
                if (cedulaSeleccionada) {
                    const ref = doc(db, "clientes", cedulaSeleccionada);
                    const snap = await getDoc(ref);
                    if (snap.exists()) {
                        const clienteData = snap.data();
                        llenarFormulario(clienteData);
                        document.getElementById("resultado").innerHTML = `✅ Cliente <strong>${clienteData.nombre}</strong> seleccionado.`;
                    } else {
                        document.getElementById("resultado").innerHTML = `⚠️ No se encontró información para la cédula: ${cedulaSeleccionada}.`;
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
    const cedula = document.getElementById("cedula").value;
    const telefono = document.getElementById("telefono").value;
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const edad = parseInt(document.getElementById("edad").value);
    const sexo = document.getElementById("sexo").value;
    const plan = parseInt(document.getElementById("plan").value);
    const valorPagado = parseInt(document.getElementById("valorPagado").value);
    const fechaIngreso = new Date(document.getElementById("fechaIngreso").value);

    // const fechaVencimiento = new Date(fechaIngreso);
    // fechaVencimiento.setMonth(fechaVencimiento.getMonth() + plan);
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
        await setDoc(doc(db, "clientes", cedula), {
            nombre,
            cedula,
            telefono,
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

        // Limpiar el formulario
        document.getElementById("registro").reset();
        document.getElementById("edad").value = "";

        verificarVencimientos();

    } catch (error) {
        console.error("Error al registrar: ", error);
        document.getElementById("resultado").innerText = "❌ Error al guardar los datos.";
    }
});

// async function verificarVencimientos() {
//     const container = document.getElementById("vencenManana");
//     container.innerHTML = "";

//     const mañana = new Date();
//     mañana.setDate(mañana.getDate() + 1);
//     const fechaObjetivo = mañana.toISOString().split('T')[0];

//     const clientesSnap = await getDocs(collection(db, "clientes"));
//     clientesSnap.forEach((docu) => {
//         const data = docu.data();
//         if (data.fechaVencimiento === fechaObjetivo) {
//             const link = `https://wa.me/57${data.telefono}?text=Hola%20${encodeURIComponent(data.nombre)},%20te%20saludamos%20desde%20el%20Gimnasio%20Radical%20Training.%20Tu%20membres%C3%ADa%20vence%20ma%C3%B1ana.%20%E2%9C%85%20Sigue%20mejorando%20tu%20salud%20y%20bienestar.%20%C2%A1Te%20esperamos%20para%20renovar%20y%20seguir%20entrenando!`;
//             const div = document.createElement("div");
//             div.innerHTML = `<strong>${data.nombre}</strong> (${data.telefono}) vence el ${data.fechaVencimiento}<br><a class='whatsapp-link' target='_blank' href='${link}'>📲 Enviar WhatsApp</a><br><br>`;
//             container.appendChild(div);
//         }
//     });
// }
async function verificarVencimientos() {
    const container = document.getElementById("vencenManana");
    container.innerHTML = "";

    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const fechaObjetivo = mañana.toISOString().split("T")[0];

    const clientesSnap = await getDocs(collection(db, "clientes"));
    clientesSnap.forEach((docu) => {
        const data = docu.data();
        if (data.fechaVencimiento === fechaObjetivo) {
            const mensaje = encodeURIComponent(`Hola ${data.nombre}, te saludamos desde el gimnasio Radical Training. Tu membresía vence el ${data.fechaVencimiento}. Sigue mejorando tu salud y bienestar. ¡Te esperamos con ansías y seguir entrenando!`);
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
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("fechaNacimiento").value = data.fechaNacimiento || "";
    document.getElementById("edad").value = data.edad || "";
    document.getElementById("sexo").value = data.sexo || "Masculino";
    document.getElementById("plan").value = data.plan || "1";
    document.getElementById("fechaIngreso").value = data.fechaIngreso || "";
    document.getElementById("valorPagado").value = data.valorPagado || "";
    document.getElementById("cedula").value = data.cedula || "";
}
