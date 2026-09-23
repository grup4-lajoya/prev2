// ============================================
// PANEL-INSCRIPCIONES.JS - Desafío La Joya
// A diferencia de ippi.js, NO habla directo con la tabla (está bloqueada por RLS).
// Todo pasa por las Edge Functions, que verifican el usuario/rol contra tu tabla "usuarios".
// ============================================

const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const FN_LISTAR = `${SUPABASE_URL}/functions/v1/listar-inscripciones`;
const FN_VALIDAR = `${SUPABASE_URL}/functions/v1/validar-inscripcion`;

let datosCompletos = [];
let datosFiltrados = [];
let paginaActual = 1;
const registrosPorPagina = 15;

const usuario = localStorage.getItem("usuario") || "";

if (!usuario) window.location.replace("login.html");

window.onload = function () {
  cargarDatos();
};

function formatearFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  const dia = d.toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit' });
  const mes = d.toLocaleString('es-PE', { timeZone: 'America/Lima', month: '2-digit' });
  const anio = d.toLocaleString('es-PE', { timeZone: 'America/Lima', year: 'numeric' });
  const hora = d.toLocaleString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', hour12: false });
  const min = d.toLocaleString('es-PE', { timeZone: 'America/Lima', minute: '2-digit' }).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function mostrarOverlay(mensaje) {
  document.getElementById('mensajeCarga').textContent = mensaje;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

async function cargarDatos() {
  const loadingEl = document.getElementById('loading');
  try {
    loadingEl.style.display = 'block';
    loadingEl.innerHTML = 'Cargando datos... ⏳';
    document.getElementById('tablaInscripciones').style.display = 'none';
    document.getElementById('paginacion').style.display = 'none';

    const res = await fetch(FN_LISTAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario })
    });

    const json = await res.json();

    if (res.status === 403) {
      loadingEl.innerHTML = '❌ No tienes permiso para ver esta página.';
      return;
    }
    if (!res.ok) throw new Error(json.error || `Error HTTP: ${res.status}`);

    datosCompletos = json.data || [];
    datosFiltrados = [...datosCompletos];

    loadingEl.style.display = 'none';
    document.getElementById('tablaInscripciones').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';

    actualizarTabla();

  } catch (error) {
    console.error("Error cargando los datos:", error);
    loadingEl.innerHTML = `❌ Error: ${error.message}<br><button onclick="cargarDatos()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
  }
}

function aplicarFiltros() {
  const termino = document.getElementById('buscar').value.toLowerCase();
  const estado = document.getElementById('filtroEstado').value;

  datosFiltrados = datosCompletos.filter(r => {
    const cumpleTexto = !termino ||
      (r.nombre_completo || "").toLowerCase().includes(termino) ||
      (r.dni || "").toLowerCase().includes(termino) ||
      (r.institucion || "").toLowerCase().includes(termino) ||
      (r.unidad || "").toLowerCase().includes(termino);

    const cumpleEstado = !estado || r.estado === estado;

    return cumpleTexto && cumpleEstado;
  });

  paginaActual = 1;
  actualizarTabla();
}

document.getElementById('buscar').addEventListener('input', aplicarFiltros);

function badgeEstado(estado) {
  const colores = { pendiente: '#ffc107', validado: '#28a745', rechazado: '#dc3545' };
  const color = colores[estado] || '#6c757d';
  return `<span class="badge-estado" style="background:${color};">${estado}</span>`;
}

function actualizarTabla() {
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const datosPagina = datosFiltrados.slice(inicio, fin);

  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';

  if (datosPagina.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="9" style="text-align:center; padding:20px; color:#666;">No se encontraron registros</td>`;
    tbody.appendChild(tr);
    document.getElementById("paginacion").innerHTML = "";
    actualizarInfoRegistros();
    return;
  }

  datosPagina.forEach((r, index) => {
    const numeroGlobal = inicio + index + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${numeroGlobal}</td>
      <td>${formatearFecha(r.created_at)}</td>
      <td>${r.nombre_completo || "-"}</td>
      <td>${r.dni || "-"}</td>
      <td>${r.categoria || "-"}</td>
      <td>${r.institucion || "-"}${r.unidad ? " / " + r.unidad : ""}</td>
      <td>${r.localidad || "-"}</td>
      <td>${badgeEstado(r.estado)}</td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-ver" onclick="verDetalle('${r.id}')" title="Ver">👁</button>
          <button class="btn-icono btn-validar" onclick="pedirCambioEstado('${r.id}', 'validado')" title="Validar" ${r.estado === 'validado' ? 'disabled' : ''}>✔</button>
          <button class="btn-icono btn-rechazar" onclick="pedirCambioEstado('${r.id}', 'rechazado')" title="Rechazar" ${r.estado === 'rechazado' ? 'disabled' : ''}>✖</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  actualizarPaginacion();
  actualizarInfoRegistros();
}

function actualizarPaginacion() {
  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
  const paginacion = document.getElementById('paginacion');
  paginacion.innerHTML = '';

  if (totalPaginas <= 1) return;

  const btnAnterior = document.createElement('button');
  btnAnterior.textContent = '← Anterior';
  btnAnterior.disabled = paginaActual === 1;
  btnAnterior.onclick = () => cambiarPagina(paginaActual - 1);
  paginacion.appendChild(btnAnterior);

  const inicio = Math.max(1, paginaActual - 2);
  const fin = Math.min(totalPaginas, paginaActual + 2);

  for (let i = inicio; i <= fin; i++) {
    const btnPagina = document.createElement('button');
    btnPagina.textContent = i;
    btnPagina.className = i === paginaActual ? 'activo' : '';
    btnPagina.onclick = () => cambiarPagina(i);
    paginacion.appendChild(btnPagina);
  }

  const btnSiguiente = document.createElement('button');
  btnSiguiente.textContent = 'Siguiente →';
  btnSiguiente.disabled = paginaActual === totalPaginas;
  btnSiguiente.onclick = () => cambiarPagina(paginaActual + 1);
  paginacion.appendChild(btnSiguiente);

  const info = document.createElement('span');
  info.style.marginLeft = '15px';
  info.style.color = '#666';
  const desde = (paginaActual - 1) * registrosPorPagina + 1;
  const hasta = Math.min(paginaActual * registrosPorPagina, datosFiltrados.length);
  info.textContent = `Mostrando ${desde}-${hasta} de ${datosFiltrados.length}`;
  paginacion.appendChild(info);
}

function cambiarPagina(nuevaPagina) {
  paginaActual = nuevaPagina;
  actualizarTabla();
}

function actualizarInfoRegistros() {
  document.getElementById('infoRegistros').textContent = `${datosFiltrados.length} registros`;
}

function verDetalle(id) {
  const r = datosCompletos.find(x => x.id === id);
  if (!r) { mostrarNotificacion("Registro no encontrado", "error"); return; }

  document.getElementById('verNombre').textContent = r.nombre_completo || "-";
  document.getElementById('verDni').textContent = r.dni || "-";
  document.getElementById('verTelefono').textContent = r.telefono || "-";
  document.getElementById('verCorreo').textContent = r.correo || "-";
  document.getElementById('verCategoria').textContent = r.categoria || "-";
  document.getElementById('verTalla').textContent = r.talla_polo || "-";
  document.getElementById('verInstitucion').textContent = r.institucion || "-";
  document.getElementById('verUnidad').textContent = r.unidad || "-";
  document.getElementById('verLocalidad').textContent = r.localidad || "-";
  document.getElementById('verEstado').textContent = r.estado || "-";
  document.getElementById('verFecha').textContent = formatearFecha(r.created_at);

  document.getElementById('verCarnetImg').src = r.carnet_url || "";
  document.getElementById('verComprobanteImg').src = r.comprobante_url || "";

  document.getElementById('modalVerDetalle').style.display = 'block';
}

function cerrarModalVerDetalle() {
  document.getElementById('modalVerDetalle').style.display = 'none';
}

function abrirImagen(url) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  const loading = document.getElementById("modalLoading");

  modal.style.display = "block";
  loading.style.display = "block";
  modalImg.style.display = "none";

  if (!url) {
    loading.innerHTML = "❌ Imagen no disponible";
    setTimeout(() => cerrarModalImagen(), 2000);
    return;
  }

  modalImg.src = url;
  modalImg.style.display = "block";
  loading.style.display = "none";
}

function cerrarModalImagen() {
  document.getElementById("imageModal").style.display = "none";
}

async function pedirCambioEstado(id, nuevoEstado) {
  const r = datosCompletos.find(x => x.id === id);
  if (!r) { mostrarNotificacion("Registro no encontrado", "error"); return; }

  const esValidar = nuevoEstado === 'validado';
  const btnSi = document.getElementById('btnConfirmarSi');
  btnSi.className = esValidar ? 'btn-confirmar-si' : 'btn-confirmar-si rechazo';

  const confirmar = await mostrarConfirmacion(
    `¿Confirmas ${esValidar ? 'validar' : 'rechazar'} la inscripción de:\n\n${r.nombre_completo} (DNI ${r.dni})?`,
    esValidar ? '✔ Confirmar validación' : '✖ Confirmar rechazo'
  );

  if (!confirmar) return;

  mostrarOverlay(esValidar ? 'Validando inscripción...' : 'Rechazando inscripción...');

  try {
    const res = await fetch(FN_VALIDAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, id, estado: nuevoEstado })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al actualizar');

    ocultarOverlay();
    mostrarNotificacion(esValidar ? "✓ Inscripción validada" : "✓ Inscripción rechazada", "success");
    await cargarDatos();

  } catch (err) {
    ocultarOverlay();
    mostrarNotificacion("Error: " + err.message, "error");
  }
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const notifAnterior = document.querySelector('.notificacion-custom');
  if (notifAnterior) notifAnterior.remove();

  const notificacion = document.createElement('div');
  notificacion.className = 'notificacion-custom';

  const colores = {
    'error': { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
    'success': { bg: '#d4edda', border: '#28a745', text: '#155724' },
    'warning': { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
    'info': { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460' }
  };

  const color = colores[tipo] || colores.info;

  notificacion.style.cssText = `
    position: fixed; top: 20px; right: 20px; background: ${color.bg}; color: ${color.text};
    border: 2px solid ${color.border}; border-radius: 8px; padding: 15px 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; max-width: 400px;
    font-size: 14px; line-height: 1.5; animation: slideIn 0.3s ease-out;
  `;

  notificacion.innerHTML = mensaje.replace(/\n/g, '<br>');
  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notificacion.remove(), 300);
  }, 5000);
}

let resolverConfirmacion = null;

function mostrarConfirmacion(mensaje, titulo = '⚠️ Confirmar') {
  return new Promise((resolve) => {
    resolverConfirmacion = resolve;
    document.getElementById('tituloConfirmacion').textContent = titulo;
    document.getElementById('mensajeConfirmacion').innerHTML = mensaje.replace(/\n/g, '<br>');
    document.getElementById('modalConfirmacion').style.display = 'flex';
  });
}

function cerrarConfirmacion(respuesta) {
  document.getElementById('modalConfirmacion').style.display = 'none';
  if (resolverConfirmacion) {
    resolverConfirmacion(respuesta);
    resolverConfirmacion = null;
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
`;
document.head.appendChild(style);

window.onclick = function (event) {
  const modalVerDetalle = document.getElementById('modalVerDetalle');
  const modalImagen = document.getElementById('imageModal');

  if (event.target === modalVerDetalle) cerrarModalVerDetalle();
  if (event.target === modalImagen) cerrarModalImagen();
};
