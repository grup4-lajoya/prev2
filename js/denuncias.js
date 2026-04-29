// ============================================
// DENUNCIAS.JS - GESTIÓN DE DENUNCIAS
// ACOSO LABORAL Y HOSTIGAMIENTO SEXUAL
// ============================================

const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let datosCompletos = [];
let datosFiltrados = [];
let paginaActual = 1;
const registrosPorPagina = 15;

// Usuario actual desde localStorage
const usuario = localStorage.getItem('usuario') || '';
const unidad  = localStorage.getItem('unidad')  || '';

if (!usuario || !unidad) {
  alert('⚠️ Sesión inválida. Por favor inicie sesión nuevamente.');
  window.location.replace('login.html');
}

// ============================================
// INICIALIZACIÓN
// ============================================

window.onload = function () {
  cargarDenuncias();
  configurarFiltros();
};

// ============================================
// CARGAR DENUNCIAS
// ============================================

async function cargarDenuncias() {
  const loadingEl = document.getElementById('loading');

  try {
    loadingEl.innerHTML = 'Cargando denuncias... ⏳';
    loadingEl.style.display = 'block';
    document.getElementById('tablaDenuncias').style.display = 'none';

    const { data, error } = await supabase
      .from('denuncias')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    datosCompletos  = data;
    datosFiltrados  = [...datosCompletos];

    loadingEl.style.display = 'none';
    document.getElementById('tablaDenuncias').style.display = 'table';
    document.getElementById('paginacion').style.display     = 'flex';

    actualizarTabla();

  } catch (error) {
    console.error('Error al cargar denuncias:', error);
    loadingEl.innerHTML = `❌ Error: ${error.message}<br>
      <button onclick="cargarDenuncias()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">
        Reintentar
      </button>`;
  }
}

// ============================================
// ACTUALIZAR TABLA
// ============================================

function actualizarTabla() {
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin    = inicio + registrosPorPagina;
  const pagina = datosFiltrados.slice(inicio, fin);

  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';

  if (pagina.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#888;">
      No se encontraron registros.</td></tr>`;
    actualizarPaginacion();
    actualizarInfoRegistros();
    return;
  }

  pagina.forEach((den, index) => {
    const numeroGlobal = inicio + index + 1;
    const fila = document.createElement('tr');

    // Nombre concatenado del denunciante
    const denunciante = den.denunciante_tipo === 'militar' && den.denunciante_grado
      ? `${den.denunciante_grado} ${den.denunciante_nombres}`
      : den.denunciante_nombres;

    // Badge estado
    const estadoBadge = generarBadgeEstado(den.estado || 'Abierto');

    fila.innerHTML = `
      <td>${numeroGlobal}</td>
      <td><strong>${formatearFecha(den.created_at)}</strong></td>
      <td>${denunciante}</td>
      <td>${estadoBadge}</td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-ver"    onclick="verDetalle(${inicio + index})"  title="Ver detalle">👁</button>
          <button class="btn-icono btn-editar" onclick="editarDenuncia(${inicio + index})" title="Gestionar">✏️</button>
        </div>
      </td>
    `;
    tbody.appendChild(fila);
  });

  actualizarPaginacion();
  actualizarInfoRegistros();
}

// ============================================
// VER DETALLE
// ============================================

function verDetalle(index) {
  const den = datosFiltrados[index];

  // Denunciante
  document.getElementById('verDenTipo').textContent    = den.denunciante_tipo === 'militar' ? 'Personal Militar' : 'Personal Civil';
  document.getElementById('verDenNombres').textContent = den.denunciante_nombres || '-';
  document.getElementById('verDenCelular').textContent = den.denunciante_celular || '-';
  document.getElementById('verDenCorreo').textContent  = den.denunciante_correo  || 'No registrado';

  const gradoWrap = document.getElementById('verDenGradoWrap');
  if (den.denunciante_tipo === 'militar' && den.denunciante_grado) {
    gradoWrap.style.display = 'block';
    document.getElementById('verDenGrado').textContent = den.denunciante_grado;
  } else {
    gradoWrap.style.display = 'none';
  }

  // Denunciado
  document.getElementById('verDdoTipo').textContent    = den.denunciado_tipo === 'militar' ? 'Personal Militar' : 'Personal Civil';
  document.getElementById('verDdoNombres').textContent = den.denunciado_nombres || '-';

  const gradoDdoWrap = document.getElementById('verDdoGradoWrap');
  if (den.denunciado_tipo === 'militar' && den.denunciado_grado) {
    gradoDdoWrap.style.display = 'block';
    document.getElementById('verDdoGrado').textContent = den.denunciado_grado;
  } else {
    gradoDdoWrap.style.display = 'none';
  }

  // Hechos
  document.getElementById('verFechaHechos').textContent = formatearFechaSolo(den.fecha_hechos);
  document.getElementById('verEstado').innerHTML         = generarBadgeEstado(den.estado || 'Abierto');
  document.getElementById('verDescripcion').textContent  = den.descripcion || '-';

  // Acciones tomadas
  const secAcciones = document.getElementById('seccionAccionesVer');
  if (den.acciones_tomadas) {
    secAcciones.style.display = 'block';
    document.getElementById('verAcciones').textContent = den.acciones_tomadas;
  } else {
    secAcciones.style.display = 'none';
  }

  document.getElementById('modalVerDetalle').style.display = 'block';
}

function cerrarModalVer() {
  document.getElementById('modalVerDetalle').style.display = 'none';
}

// ============================================
// EDITAR DENUNCIA
// ============================================

function editarDenuncia(index) {
  const den = datosFiltrados[index];

  document.getElementById('editId').value        = den.id;
  document.getElementById('editEstado').value    = den.estado || 'Abierto';
  document.getElementById('editAcciones').value  = den.acciones_tomadas || '';

  document.getElementById('modalEditar').style.display = 'block';
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
}

async function guardarEdicion() {
  const id      = document.getElementById('editId').value;
  const estado  = document.getElementById('editEstado').value;
  const acciones = document.getElementById('editAcciones').value.trim();

  if (!estado) {
    mostrarNotificacion('Debe seleccionar un estado.', 'error');
    return;
  }

  const confirmar = await mostrarConfirmacion(
    `¿Confirma actualizar el estado a <strong>${estado}</strong>?`,
    '✏️ Confirmar actualización'
  );
  if (!confirmar) return;

  mostrarOverlay('Guardando cambios...');

  try {
    const { error } = await supabase
      .from('denuncias')
      .update({
        estado: estado,
        acciones_tomadas: acciones || null
      })
      .eq('id', id);

    ocultarOverlay();
    if (error) throw error;

    mostrarNotificacion('✓ Denuncia actualizada correctamente.', 'success');
    cerrarModalEditar();
    cargarDenuncias();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
  }
}

// ============================================
// FILTROS Y BÚSQUEDA
// ============================================

function configurarFiltros() {
  document.getElementById('buscar').addEventListener('input', aplicarFiltros);
  document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
}

function aplicarFiltros() {
  const textoBusqueda = document.getElementById('buscar').value.toLowerCase().trim();
  const filtroEstado  = document.getElementById('filtroEstado').value;

  datosFiltrados = datosCompletos.filter(den => {
    const denunciante = `${den.denunciante_grado || ''} ${den.denunciante_nombres || ''}`.toLowerCase();
    const denunciado  = `${den.denunciado_grado  || ''} ${den.denunciado_nombres  || ''}`.toLowerCase();
    const cumpleTexto = !textoBusqueda || denunciante.includes(textoBusqueda) || denunciado.includes(textoBusqueda);
    const cumpleEstado = !filtroEstado || (den.estado || 'Abierto') === filtroEstado;
    return cumpleTexto && cumpleEstado;
  });

  paginaActual = 1;
  actualizarTabla();
}

// ============================================
// PAGINACIÓN
// ============================================

function actualizarPaginacion() {
  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
  const paginacion   = document.getElementById('paginacion');
  paginacion.innerHTML = '';

  if (totalPaginas <= 1) return;

  const btnAnterior = document.createElement('button');
  btnAnterior.textContent = '← Anterior';
  btnAnterior.disabled    = paginaActual === 1;
  btnAnterior.onclick     = () => cambiarPagina(paginaActual - 1);
  paginacion.appendChild(btnAnterior);

  const inicio = Math.max(1, paginaActual - 2);
  const fin    = Math.min(totalPaginas, paginaActual + 2);

  for (let i = inicio; i <= fin; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className   = i === paginaActual ? 'activo' : '';
    btn.onclick     = () => cambiarPagina(i);
    paginacion.appendChild(btn);
  }

  const btnSiguiente = document.createElement('button');
  btnSiguiente.textContent = 'Siguiente →';
  btnSiguiente.disabled    = paginaActual === totalPaginas;
  btnSiguiente.onclick     = () => cambiarPagina(paginaActual + 1);
  paginacion.appendChild(btnSiguiente);
}

function cambiarPagina(nueva) {
  paginaActual = nueva;
  actualizarTabla();
}

function actualizarInfoRegistros() {
  document.getElementById('infoRegistros').textContent = `${datosFiltrados.length} denuncia${datosFiltrados.length !== 1 ? 's' : ''}`;
}

// ============================================
// UTILIDADES
// ============================================

function generarBadgeEstado(estado) {
  const mapa = {
    'Abierto':    { clase: 'estado-abierto',    texto: '🔴 Abierto'    },
    'En proceso': { clase: 'estado-en-proceso',  texto: '🟡 En proceso' },
    'Cerrado':    { clase: 'estado-cerrado',     texto: '🟢 Cerrado'    }
  };
  const cfg = mapa[estado] || mapa['Abierto'];
  return `<span class="estado-badge ${cfg.clase}">${cfg.texto}</span>`;
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return '-';
  const d = new Date(fechaISO);
  const dia  = String(d.getDate()).padStart(2, '0');
  const mes  = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function formatearFechaSolo(fechaStr) {
  if (!fechaStr) return '-';
  const [y, m, d] = fechaStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

function mostrarOverlay(msg) {
  document.getElementById('mensajeCarga').textContent = msg;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

function mostrarNotificacion(mensaje, tipo = 'info') {
  const anterior = document.querySelector('.notificacion-custom');
  if (anterior) anterior.remove();

  const colores = {
    error:   { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
    success: { bg: '#d4edda', border: '#28a745', text: '#155724' },
    warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
    info:    { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460' }
  };
  const c = colores[tipo] || colores.info;

  const notif = document.createElement('div');
  notif.className = 'notificacion-custom';
  notif.style.cssText = `
    position:fixed; top:20px; right:20px;
    background:${c.bg}; color:${c.text};
    border:2px solid ${c.border}; border-radius:8px;
    padding:15px 20px; box-shadow:0 4px 12px rgba(0,0,0,.15);
    z-index:10000; max-width:400px; font-size:14px;
    line-height:1.5; animation:slideIn .3s ease-out;
  `;
  notif.innerHTML = mensaje;
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.animation = 'slideOut .3s ease-out';
    setTimeout(() => notif.remove(), 300);
  }, 5000);
}

// Sistema de confirmación
let resolverConfirmacion = null;

function mostrarConfirmacion(mensaje, titulo = '⚠️ Confirmar acción') {
  return new Promise(resolve => {
    resolverConfirmacion = resolve;
    document.getElementById('tituloConfirmacion').textContent  = titulo;
    document.getElementById('mensajeConfirmacion').innerHTML   = mensaje;
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

// Cerrar modales al hacer clic fuera
window.onclick = function (event) {
  if (event.target === document.getElementById('modalVerDetalle')) cerrarModalVer();
  if (event.target === document.getElementById('modalEditar'))     cerrarModalEditar();
};

// Animaciones notificación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn  { from { transform:translateX(400px); opacity:0; } to { transform:translateX(0); opacity:1; } }
  @keyframes slideOut { from { transform:translateX(0); opacity:1; } to { transform:translateX(400px); opacity:0; } }
`;
document.head.appendChild(style);
