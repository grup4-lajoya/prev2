// ============================================
// IPPI.JS - Informes de Peligros Potenciales e Incidentes
// ============================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxIeRDr8R2JAQ39AlFW4f8hOrhMmvaJvuAOGwfOurjmUKn57xdXQ8t-70WweSkAorwy/exec";

let datosCompletos = [];
let datosFiltrados = [];
let paginaActual = 1;
const registrosPorPagina = 15;

const usuario = localStorage.getItem("usuario") || "";
const unidad = localStorage.getItem("unidad") || "";
const rol = localStorage.getItem("rol") || "";

if (!usuario) window.location.replace("login.html");

window.onload = function() {
  cargarDatos();
};

function formatearFecha(fecha) {
  if(!fecha) return "";
  const d = new Date(fecha);
  const dia = d.getDate().toString().padStart(2,"0");
  const mes = (d.getMonth()+1).toString().padStart(2,"0");
  const anio = d.getFullYear();
  const hora = d.getHours().toString().padStart(2,"0");
  const min = d.getMinutes().toString().padStart(2,"0");
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function mostrarOverlay(mensaje) {
  document.getElementById('mensajeCarga').textContent = mensaje;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

async function cargarDatos(forzar = false) {
  const loadingEl = document.getElementById('loading');
  try {
    loadingEl.innerHTML = 'Cargando datos... ⏳';
    
    const url = forzar ? `${SCRIPT_URL}?t=${Date.now()}` : SCRIPT_URL;
    const response = await fetch(url, {
      method: 'GET',
      cache: forzar ? 'no-cache' : 'default'
    });
    
    if(!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    datosCompletos = await response.json();
    
    if(datosCompletos.error) {
      throw new Error(datosCompletos.error);
    }
    
    datosFiltrados = [...datosCompletos];
    
    loadingEl.style.display = 'none';
    document.getElementById('tablaIPPI').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';
    
    actualizarTabla();
    
  } catch (error) {
    console.error("Error cargando los datos:", error);
    loadingEl.innerHTML = `❌ Error: ${error.message}<br><button onclick="cargarDatos(true)" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
  }
}

function aplicarFiltros() {
  const termino = document.getElementById('buscar').value.toLowerCase();
  const estado = document.getElementById('filtroEstado').value;
  
  datosFiltrados = datosCompletos.filter(registro => {
    const cumpleTexto = !termino || 
      (registro["informe"] || "").toLowerCase().includes(termino) ||
      (registro["lugar"] || "").toLowerCase().includes(termino) ||
      (registro["nombre"] || "").toLowerCase().includes(termino);
    
    const cumpleEstado = !estado || (registro["estado"] || "") === estado;
    
    return cumpleTexto && cumpleEstado;
  });
  
  paginaActual = 1;
  actualizarTabla();
}

document.getElementById('buscar').addEventListener('input', aplicarFiltros);

function actualizarTabla() {
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const datosPagina = datosFiltrados.slice(inicio, fin);
  
  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';
  
  if(datosPagina.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" style="text-align:center; padding:20px; color:#666;">No se encontraron registros</td>`;
    tbody.appendChild(tr);
    document.getElementById("paginacion").innerHTML = "";
    actualizarInfoRegistros();
    return;
  }
  
  datosPagina.forEach((registro, index) => {
    const numeroGlobal = inicio + index + 1;
    const indiceOriginal = datosCompletos.indexOf(registro);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${numeroGlobal}</td>
      <td>${formatearFecha(registro["marca temporal"])}</td>
      <td>${registro["informe"] || "-"}</td>
      <td>${registro["lugar"] || "-"}</td>
      <td style="white-space: normal; word-wrap: break-word;">${(registro["descripcion"] || "-").substring(0, 200)}${registro["descripcion"] && registro["descripcion"].length > 200 ? '...' : ''}</td>
      <td>${registro["nombre"] || "-"}</td>
      <td><span style="padding:4px 8px; border-radius:4px; background:${registro["estado"] === 'Cerrado' ? '#28a745' : registro["estado"] === 'En proceso' ? '#ffc107' : '#dc3545'}; color:white; font-size:0.85em;">${registro["estado"] || "Abierto"}</span></td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-ver" onclick="verDetalle(${indiceOriginal})" title="Ver">👁</button>
          <button class="btn-icono btn-editar" onclick="editarRegistro(${indiceOriginal})" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarRegistro(${indiceOriginal})" title="Eliminar">🗑️</button>
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
  
  if(totalPaginas <= 1) return;
  
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

function extraerIdDrive(url) {
  if(!url) return null;
  
  // Limpiar espacios y saltos de línea
  url = url.trim();
  
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /open\?id=([a-zA-Z0-9_-]+)/,
    /\/uc\?.*id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{25,})$/
  ];
  
  for(let pattern of patterns) {
    const match = url.match(pattern);
    if(match) return match[1];
  }
  
  return null;
}

function crearURLVisualizacion(url) {
  const id = extraerIdDrive(url);
  if(!id) return url;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w200`;
}

function crearURLCompleta(url) {
  const id = extraerIdDrive(url);
  if(!id) return url;
  
  // Intentar múltiples formatos de URL
  return `https://lh3.googleusercontent.com/d/${id}`;
}

async function verDetalle(indiceOriginal) {
  const registro = datosCompletos[indiceOriginal];
  
  if(!registro) {
    mostrarNotificacion("Registro no encontrado", "error");
    return;
  }
  
  document.getElementById('verFecha').textContent = formatearFecha(registro["marca temporal"]);
  document.getElementById('verAsunto').textContent = registro["informe"] || "-";
  document.getElementById('verLugar').textContent = registro["lugar"] || "-";
  document.getElementById('verReporta').textContent = registro["nombre"] || "-";
  document.getElementById('verEstado').textContent = registro["estado"] || "Abierto";
  document.getElementById('verDescripcion').textContent = registro["descripcion"] || "-";
  document.getElementById('verRecomendaciones').textContent = registro["recomendaciones"] || "-";
  document.getElementById('verAccionesTomadas').textContent = registro["accion tomada"] || "Sin acciones registradas";
  
  const seccionImagenes = document.getElementById('verSeccionImagenes');
  const containerImagenes = document.getElementById('verImagenes');
  
  if(registro["archivos"]) {
    const urls = registro["archivos"].split(/[\n,]+/).map(u => u.trim()).filter(u => u);
    
    if(urls.length > 0) {
      containerImagenes.innerHTML = '';
      urls.forEach(url => {
        const urlMiniatura = crearURLVisualizacion(url);
        const urlCompleta = crearURLCompleta(url);
        
        const img = document.createElement('img');
        img.src = urlMiniatura;
        img.onclick = () => abrirImagen(urlCompleta);
        img.onerror = function() {
          this.src = 'https://via.placeholder.com/100?text=Error';
        };
        img.loading = 'lazy';
        img.title = 'Click para ampliar';
        
        containerImagenes.appendChild(img);
      });
      seccionImagenes.style.display = 'block';
    } else {
      seccionImagenes.style.display = 'none';
    }
  } else {
    seccionImagenes.style.display = 'none';
  }
  
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
  
  const id = extraerIdDrive(url);
  
  if(!id) {
    loading.innerHTML = "❌ URL de imagen no válida";
    setTimeout(() => cerrarModalImagen(), 2000);
    return;
  }
  
  // Lista de URLs alternativas para intentar
  const urlsAlternativas = [
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    url // URL original como último recurso
  ];
  
  let intentoActual = 0;
  
  function intentarCargarImagen() {
    if(intentoActual >= urlsAlternativas.length) {
      loading.innerHTML = "❌ No se pudo cargar la imagen<br><small>Verifica que el archivo sea público en Google Drive</small>";
      setTimeout(() => cerrarModalImagen(), 3000);
      return;
    }
    
    const urlActual = urlsAlternativas[intentoActual];
    const img = new Image();
    
    img.onload = function() {
      modalImg.src = urlActual;
      modalImg.style.display = "block";
      loading.style.display = "none";
    };
    
    img.onerror = function() {
      intentoActual++;
      intentarCargarImagen();
    };
    
    img.src = urlActual;
  }
  
  intentarCargarImagen();
}

function cerrarModalImagen() {
  document.getElementById("imageModal").style.display = "none";
}

function editarRegistro(indiceOriginal) {
  const registro = datosCompletos[indiceOriginal];
  
  if(!registro) {
    mostrarNotificacion("Registro no encontrado", "error");
    return;
  }
  
  document.getElementById('editFila').value = registro._filaExcel;
  document.getElementById('editEstado').value = registro["estado"] || "Abierto";
  document.getElementById('editAccionesTomadas').value = registro["accion tomada"] || "";
  
  document.getElementById('modalEditar').style.display = 'block';
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
}

async function guardarEdicion() {
  const fila = document.getElementById('editFila').value;
  const estado = document.getElementById('editEstado').value;
  const accionTomada = document.getElementById('editAccionesTomadas').value;
  
  const btnGuardar = document.getElementById('btnGuardarEdicion');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  
  mostrarOverlay('Guardando cambios...');
  
  try {
    const formData = new FormData();
    formData.append('action', 'update');
    formData.append('row', fila);
    formData.append('estado', estado);
    formData.append('accionTomada', accionTomada);
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if(result.status === "ok") {
      ocultarOverlay();
      mostrarNotificacion("✓ Registro actualizado correctamente", "success");
      cerrarModalEditar();
      await cargarDatos(true);
    } else {
      throw new Error(result.error || "Error desconocido");
    }
    
  } catch(err) {
    ocultarOverlay();
    mostrarNotificacion("Error al guardar: " + err.message, "error");
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar Cambios';
  }
}

async function eliminarRegistro(indiceOriginal) {
  const registro = datosCompletos[indiceOriginal];
  
  if(!registro) {
    mostrarNotificacion("Registro no encontrado", "error");
    return;
  }
  
  const mensaje = `¿Está seguro de que desea eliminar este registro?\n\nAsunto: ${registro["informe"]}\nLugar: ${registro["lugar"]}\n\nEsta acción no se puede deshacer.`;
  
  const confirmar = await mostrarConfirmacion(mensaje, '🗑️ Confirmar Eliminación');
  
  if(!confirmar) return;
  
  mostrarOverlay('Eliminando registro...');
  
  try {
    const formData = new FormData();
    formData.append('action', 'delete');
    formData.append('row', registro._filaExcel);
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if(result.status === "ok") {
      ocultarOverlay();
      mostrarNotificacion("✓ Registro eliminado correctamente", "success");
      await cargarDatos(true);
    } else {
      throw new Error(result.error || "Error desconocido");
    }
    
  } catch(err) {
    ocultarOverlay();
    mostrarNotificacion("Error al eliminar: " + err.message, "error");
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
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

window.onclick = function(event) {
  const modalVerDetalle = document.getElementById('modalVerDetalle');
  const modalEditar = document.getElementById('modalEditar');
  const modalImagen = document.getElementById('imageModal');

  if (event.target === modalVerDetalle) cerrarModalVerDetalle();
  if (event.target === modalEditar) cerrarModalEditar();
  if (event.target === modalImagen) cerrarModalImagen();
};
