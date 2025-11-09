// ============================================
// PROGRAMACION-RANCHO.JS - GESTIÓN DE PROGRAMACIÓN DE RANCHO
// CRUD COMPLETO: CREATE, READ, UPDATE, DELETE
// ============================================

// Configuración de Supabase
const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let datosCompletos = [];
let datosFiltrados = [];
let paginaActual = 1;
const registrosPorPagina = 15;

// Variables del wizard
let idProgramacionActual = null;
let fechaConfirmada = false;
let desayunosConfirmados = false;
let almuerzosConfirmados = false;

// Listas de elementos
let listaElementos = [];
let desayunosProgramados = [];
let almuerzosProgramados = [];
let cenasProgramadas = [];

// Contadores
let contadorDesayuno = 1;
let contadorAlmuerzo = 1;
let contadorCena = 1;

// Usuario actual
const usuario = localStorage.getItem("usuario") || "";
const unidad = localStorage.getItem("unidad") || "";
const rol = localStorage.getItem("rol") || "";

if (!usuario || !unidad) {
  alert('⚠️ Sesión inválida. Por favor inicie sesión nuevamente.');
  window.location.replace("login.html");
}

// ============================================
// INICIALIZACIÓN
// ============================================

window.onload = function() {
  cargarDatosIniciales();
  configurarFiltros();
  verificarProgramacionesCerradas();
};

async function cargarDatosIniciales() {
  mostrarOverlay('Cargando datos del sistema...');
  
  try {
    await Promise.all([
      cargarElementos(),
      cargarProgramaciones()
    ]);
    
    ocultarOverlay();
    console.log('✅ Datos iniciales cargados correctamente');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error al cargar datos iniciales:', error);
    mostrarNotificacion('Error al cargar datos del sistema: ' + error.message, 'error');
  }
}

// ============================================
// PUBLICAR PROGRAMACIÓN
// ============================================

async function publicarProgramacion(index) {
  const prog = datosFiltrados[index];
  
  if (prog.estado !== 'PROGRAMADO') {
    mostrarNotificacion('Solo puede publicar programaciones con estado PROGRAMADO', 'warning');
    return;
  }
  
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de publicar la programación del <strong>${formatearFecha(prog.fecha)}</strong>?<br><br>
    ℹ️ Una vez publicada, no podrá editarla ni eliminarla.`,
    '📢 Confirmar Publicación'
  );
  
  if (!confirmar) return;
  
  mostrarOverlay('Publicando programación...');
  
  try {
    const { error } = await supabase
      .from('programacion')
      .update({ estado: 'PUBLICADO' })
      .eq('id', prog.id);
    
    ocultarOverlay();
    
    if (error) throw error;
    
    mostrarNotificacion('✓ Programación publicada correctamente', 'success');
    cargarProgramaciones();
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al publicar: ' + error.message, 'error');
  }
}

// ============================================
// ELIMINAR PROGRAMACIÓN (DELETE)
// ============================================

async function eliminarProgramacion(index) {
  const prog = datosFiltrados[index];
  
  if (prog.estado !== 'PROGRAMADO') {
    mostrarNotificacion('Solo puede eliminar programaciones con estado PROGRAMADO', 'warning');
    return;
  }
  
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de eliminar la programación del <strong>${formatearFecha(prog.fecha)}</strong>?<br><br>
    ⚠️ Esta acción eliminará toda la programación y sus detalles de forma permanente.`,
    '🗑️ Confirmar Eliminación'
  );
  
  if (!confirmar) return;
  
  mostrarOverlay('Eliminando programación...');
  
  try {
    // El CASCADE en la BD eliminará automáticamente los detalles
    const { error } = await supabase
      .from('programacion')
      .delete()
      .eq('id', prog.id);
    
    ocultarOverlay();
    
    if (error) throw error;
    
    mostrarNotificacion('✓ Programación eliminada correctamente', 'success');
    cargarProgramaciones();
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
  }
}

// ============================================
// CERRAR MODALES
// ============================================

function cerrarModal() {
  document.getElementById('modalNueva').style.display = 'none';
}

function cerrarModalVerDetalle() {
  document.getElementById('modalVerDetalle').style.display = 'none';
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
  const modalNueva = document.getElementById('modalNueva');
  const modalVerDetalle = document.getElementById('modalVerDetalle');
  const modalEditar = document.getElementById('modalEditar');
  const modalNuevoElemento = document.getElementById('modalNuevoElemento');
  
  if (event.target === modalNueva) cerrarModal();
  if (event.target === modalVerDetalle) cerrarModalVerDetalle();
  if (event.target === modalEditar) cerrarModalEditar();
  if (event.target === modalNuevoElemento) cerrarModalNuevoElemento();
};

// ============================================
// UTILIDADES
// ============================================

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const d = new Date(fecha + 'T00:00:00');
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

function mostrarOverlay(mensaje) {
  document.getElementById('mensajeCarga').textContent = mensaje;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
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
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${color.bg};
    color: ${color.text};
    border: 2px solid ${color.border};
    border-radius: 8px;
    padding: 15px 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 400px;
    font-size: 14px;
    line-height: 1.5;
    animation: slideIn 0.3s ease-out;
  `;
  
  notificacion.innerHTML = mensaje.replace(/\n/g, '<br>');
  document.body.appendChild(notificacion);
  
  setTimeout(() => {
    notificacion.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notificacion.remove(), 300);
  }, 5000);
}

// Sistema de confirmación
let resolverConfirmacion = null;

function mostrarConfirmacion(mensaje, titulo = '⚠️ Confirmar acción') {
  return new Promise((resolve) => {
    resolverConfirmacion = resolve;
    document.getElementById('tituloConfirmacion').textContent = titulo;
    document.getElementById('mensajeConfirmacion').innerHTML = mensaje;
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

// Estilos de animación
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  .badge-guardado {
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: #28a745;
    color: white;
    padding: 5px 15px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }
`;
document.head.appendChild(style);

// ============================================
// CARGAR ELEMENTOS
// ============================================

async function cargarElementos() {
  try {
    const { data, error } = await supabase
      .from('tipo_racion_elemento')
      .select('*')
      .eq('activo', true)
      .order('descripcion', { ascending: true });

    if (error) throw error;

    listaElementos = data;
    console.log('✅ Elementos cargados:', data.length, 'registros');
    
  } catch (error) {
    console.error('Error al cargar elementos:', error);
    throw error;
  }
}

// ============================================
// CARGAR PROGRAMACIONES
// ============================================

async function cargarProgramaciones() {
  const loadingEl = document.getElementById('loading');
  
  try {
    loadingEl.innerHTML = 'Cargando programaciones... ⏳';
    loadingEl.style.display = 'block';
    
    const { data: programaciones, error } = await supabase
      .from('programacion')
      .select('*')
      .eq('unidad', unidad)
      .order('fecha', { ascending: false });
    
    if (error) throw error;

    datosCompletos = programaciones;
    datosFiltrados = [...datosCompletos];
    
    loadingEl.style.display = 'none';
    document.getElementById('tablaProgramacion').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';
    
    actualizarTabla();
    
  } catch (error) {
    console.error('Error al cargar programaciones:', error);
    loadingEl.innerHTML = `❌ Error: ${error.message}<br><button onclick="cargarProgramaciones()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
  }
}

// ============================================
// VERIFICAR PROGRAMACIONES CERRADAS
// ============================================

async function verificarProgramacionesCerradas() {
  try {
    const hoy = new Date();
    const horaActual = hoy.getHours();
    
    // Solo después del mediodía (12:00)
    if (horaActual < 12) return;
    
    const fechaHoy = hoy.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('programacion')
      .select('id')
      .eq('fecha', fechaHoy)
      .neq('estado', 'CERRADO')
      .eq('unidad', unidad);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      for (const prog of data) {
        await supabase
          .from('programacion')
          .update({ estado: 'CERRADO' })
          .eq('id', prog.id);
      }
      
      console.log('✅ Programaciones cerradas automáticamente');
      cargarProgramaciones();
    }
    
  } catch (error) {
    console.error('Error al verificar programaciones:', error);
  }
}

// ============================================
// ACTUALIZAR TABLA
// ============================================

function actualizarTabla() {
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const datosPagina = datosFiltrados.slice(inicio, fin);
  
  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';
  
  datosPagina.forEach((prog, index) => {
    const numeroGlobal = inicio + index + 1;
    const fila = document.createElement('tr');
    
    // Badge de estado
    let estadoBadge = '';
    if (prog.estado === 'PROGRAMADO') {
      estadoBadge = '<span class="estado-badge estado-programado">📝 Programado</span>';
    } else if (prog.estado === 'PUBLICADO') {
      estadoBadge = '<span class="estado-badge estado-publicado">✅ Publicado</span>';
    } else if (prog.estado === 'CERRADO') {
      estadoBadge = '<span class="estado-badge estado-cerrado">🔒 Cerrado</span>';
    }
    
    // Botones de acciones según estado
    let botonesAccion = `
      <button class="btn-icono btn-ver" onclick="verDetalle(${inicio + index})" title="Ver detalle">👁</button>
    `;
    
    if (prog.estado === 'PROGRAMADO') {
      botonesAccion += `
        <button class="btn-icono btn-editar" onclick="editarProgramacion(${inicio + index})" title="Editar">✏️</button>
        <button class="btn-icono btn-eliminar" onclick="eliminarProgramacion(${inicio + index})" title="Eliminar">🗑️</button>
        <button class="btn-icono btn-publicar" onclick="publicarProgramacion(${inicio + index})" title="Publicar">📢</button>
      `;
    }
    
    fila.innerHTML = `
      <td>${numeroGlobal}</td>
      <td><strong>${formatearFecha(prog.fecha)}</strong></td>
      <td>${estadoBadge}</td>
      <td>
        <div class="acciones">
          ${botonesAccion}
        </div>
      </td>
    `;
    tbody.appendChild(fila);
  });
  
  actualizarPaginacion();
  actualizarInfoRegistros();
}

// ============================================
// PAGINACIÓN
// ============================================

function actualizarPaginacion() {
  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);
  const paginacion = document.getElementById('paginacion');
  paginacion.innerHTML = '';
  
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
}

function cambiarPagina(nuevaPagina) {
  paginaActual = nuevaPagina;
  actualizarTabla();
}

function actualizarInfoRegistros() {
  const info = document.getElementById('infoRegistros');
  info.textContent = `${datosFiltrados.length} programaciones`;
}

// ============================================
// FILTROS
// ============================================

function configurarFiltros() {
  document.getElementById('buscarFecha').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
}

function aplicarFiltros() {
  const fechaBusqueda = document.getElementById('buscarFecha').value;
  const filtroEstado = document.getElementById('filtroEstado').value;
  
  datosFiltrados = datosCompletos.filter(prog => {
    const cumpleFecha = !fechaBusqueda || prog.fecha === fechaBusqueda;
    const cumpleEstado = !filtroEstado || prog.estado === filtroEstado;
    
    return cumpleFecha && cumpleEstado;
  });
  
  paginaActual = 1;
  actualizarTabla();
}

// ============================================
// NUEVA PROGRAMACIÓN - ABRIR MODAL
// ============================================

function nuevaProgramacion() {
  // Reset completo de variables
  idProgramacionActual = null;
  fechaConfirmada = false;
  desayunosConfirmados = false;
  almuerzosConfirmados = false;
  
  desayunosProgramados = [];
  almuerzosProgramados = [];
  cenasProgramadas = [];
  
  contadorDesayuno = 1;
  contadorAlmuerzo = 1;
  contadorCena = 1;
  
  // Reset formulario
  const formNueva = document.getElementById('formNueva');
  if (formNueva) formNueva.reset();
  
  // Establecer fecha mínima (mañana)
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fechaMinima = manana.toISOString().split('T')[0];
  document.getElementById('fechaProgramacion').min = fechaMinima;
  
  // Reset indicadores de pasos
  document.getElementById('indicadorPaso1').classList.add('active');
  document.getElementById('indicadorPaso1').classList.remove('completed');
  document.getElementById('indicadorPaso2').classList.remove('active', 'completed');
  document.getElementById('indicadorPaso3').classList.remove('active', 'completed');
  document.getElementById('indicadorPaso4').classList.remove('active', 'completed');
  
  // Habilitar sección 1
  const seccionFecha = document.getElementById('seccionFecha');
  seccionFecha.classList.remove('bloqueada', 'guardada');
  const badgeFecha = seccionFecha.querySelector('.badge-guardado');
  if (badgeFecha) badgeFecha.remove();
  
  // Bloquear secciones 2, 3, 4
  ['seccionDesayuno', 'seccionAlmuerzo', 'seccionCena'].forEach(id => {
    const seccion = document.getElementById(id);
    seccion.classList.add('bloqueada');
    seccion.classList.remove('guardada');
    const badge = seccion.querySelector('.badge-guardado');
    if (badge) badge.remove();
  });
  
  document.getElementById('mensajeBloqueoDesayuno').style.display = 'block';
  document.getElementById('formularioDesayuno').style.display = 'none';
  
  document.getElementById('mensajeBloqueoAlmuerzo').style.display = 'block';
  document.getElementById('formularioAlmuerzo').style.display = 'none';
  
  document.getElementById('mensajeBloqueCena').style.display = 'block';
  document.getElementById('formularioCena').style.display = 'none';
  
  // Abrir modal
  document.getElementById('modalNueva').style.display = 'block';
}

// ============================================
// PASO 1: CONFIRMAR FECHA
// ============================================

async function confirmarFecha() {
  const fecha = document.getElementById('fechaProgramacion').value;
  
  if (!fecha) {
    mostrarNotificacion('Debe seleccionar una fecha', 'error');
    return;
  }
  
  // Validar que sea fecha futura
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaSeleccionada = new Date(fecha + 'T00:00:00');
  
  if (fechaSeleccionada <= hoy) {
    mostrarNotificacion('La fecha debe ser posterior a hoy', 'error');
    return;
  }
  
  mostrarOverlay('Verificando fecha...');
  
  try {
    // Verificar que no exista programación para esa fecha
    const { data, error } = await supabase
      .from('programacion')
      .select('id')
      .eq('unidad', unidad)
      .eq('fecha', fecha)
      .maybeSingle();
    
    if (error) throw error;
    
    if (data) {
      ocultarOverlay();
      mostrarNotificacion('Ya existe una programación para esta fecha', 'error');
      return;
    }
    
    // Crear registro de programación
    const { data: nuevaProg, error: errorInsert } = await supabase
      .from('programacion')
      .insert([{
        unidad: unidad,
        fecha: fecha,
        estado: 'PROGRAMADO',
        usuario_crea: usuario
      }])
      .select()
      .single();
    
    ocultarOverlay();
    
    if (errorInsert) throw errorInsert;
    
    idProgramacionActual = nuevaProg.id;
    fechaConfirmada = true;
    
    // Marcar paso 1 como completado
    document.getElementById('indicadorPaso1').classList.remove('active');
    document.getElementById('indicadorPaso1').classList.add('completed');
    document.getElementById('indicadorPaso2').classList.add('active');
    
    // Marcar sección como guardada
    const seccionFecha = document.getElementById('seccionFecha');
    seccionFecha.classList.add('guardada');
    seccionFecha.innerHTML += '<span class="badge-guardado">✓ Confirmado</span>';
    
    // Deshabilitar campos del paso 1
    document.querySelectorAll('#seccionFecha input, #seccionFecha button').forEach(el => {
      el.disabled = true;
    });
    
    // Habilitar sección 2
    const seccionDesayuno = document.getElementById('seccionDesayuno');
    seccionDesayuno.classList.remove('bloqueada');
    document.getElementById('mensajeBloqueoDesayuno').style.display = 'none';
    document.getElementById('formularioDesayuno').style.display = 'block';
    
    document.getElementById('fechaMostrar').textContent = formatearFecha(fecha);
    document.getElementById('fechaConfirmada').style.display = 'block';
    
    mostrarNotificacion('✓ Fecha confirmada. Ahora programe los desayunos.', 'success');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al confirmar fecha: ' + error.message, 'error');
  }
}

// ============================================
// PASO 2: AGREGAR DESAYUNO
// ============================================

function agregarDesayuno() {
  const codigo = `DES-${String(contadorDesayuno).padStart(2, '0')}`;
  
  const desayunoDiv = document.createElement('div');
  desayunoDiv.className = 'item-programacion';
  desayunoDiv.dataset.codigo = codigo;
  
  // Obtener elementos de desayuno
  const elementosDesayuno = listaElementos.filter(e => e.tip_rac === 'DESAYUNO');
  
  let checkboxesHTML = '';
  elementosDesayuno.forEach(elem => {
    checkboxesHTML += `
      <label class="checkbox-elemento">
        <input type="checkbox" value="${elem.id}" data-descripcion="${elem.descripcion}">
        ${elem.descripcion}
      </label>
    `;
  });
  
  desayunoDiv.innerHTML = `
    <div class="item-header">
      <h4>☕ ${codigo}</h4>
      <button type="button" class="btn-eliminar-item" onclick="eliminarItemDesayuno('${codigo}')">🗑️</button>
    </div>
    <div class="elementos-checkbox">
      ${checkboxesHTML}
    </div>
    <button type="button" class="btn-agregar-inline" onclick="abrirModalNuevoElemento('DESAYUNO', null)">
      ➕ Agregar nuevo elemento
    </button>
  `;
  
  document.getElementById('listaDesayunos').appendChild(desayunoDiv);
  contadorDesayuno++;
}

function eliminarItemDesayuno(codigo) {
  const item = document.querySelector(`#listaDesayunos [data-codigo="${codigo}"]`);
  if (item) item.remove();
}

// ============================================
// PASO 2: CONFIRMAR DESAYUNOS
// ============================================

function confirmarDesayunos() {
  desayunosProgramados = [];
  
  const itemsDesayuno = document.querySelectorAll('#listaDesayunos .item-programacion');
  
  if (itemsDesayuno.length === 0) {
    mostrarNotificacion('Debe agregar al menos un desayuno', 'error');
    return;
  }
  
  let hayError = false;
  
  itemsDesayuno.forEach(item => {
    const codigo = item.dataset.codigo;
    const checkboxes = item.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
      mostrarNotificacion(`El ${codigo} debe tener al menos un elemento seleccionado`, 'error');
      hayError = true;
      return;
    }
    
    checkboxes.forEach(checkbox => {
      desayunosProgramados.push({
        codigo: codigo,
        id_elemento: checkbox.value,
        descripcion: checkbox.dataset.descripcion
      });
    });
  });
  
  if (hayError) return;
  
  desayunosConfirmados = true;
  
  // Marcar paso 2 como completado
  document.getElementById('indicadorPaso2').classList.remove('active');
  document.getElementById('indicadorPaso2').classList.add('completed');
  document.getElementById('indicadorPaso3').classList.add('active');
  
  // Marcar sección como guardada
  const seccionDesayuno = document.getElementById('seccionDesayuno');
  seccionDesayuno.classList.add('guardada');
  seccionDesayuno.innerHTML += '<span class="badge-guardado">✓ Confirmado</span>';
  
  // Deshabilitar campos del paso 2
  document.querySelectorAll('#seccionDesayuno input, #seccionDesayuno button').forEach(el => {
    el.disabled = true;
  });
  
  // Habilitar sección 3
  const seccionAlmuerzo = document.getElementById('seccionAlmuerzo');
  seccionAlmuerzo.classList.remove('bloqueada');
  document.getElementById('mensajeBloqueoAlmuerzo').style.display = 'none';
  document.getElementById('formularioAlmuerzo').style.display = 'block';
  
  mostrarNotificacion('✓ Desayunos confirmados. Ahora programe los almuerzos.', 'success');
}

// ============================================
// PASO 3: AGREGAR ALMUERZO
// ============================================

function agregarAlmuerzo() {
  const codigo = `ALM-${String(contadorAlmuerzo).padStart(2, '0')}`;
  
  const almuerzoDiv = document.createElement('div');
  almuerzoDiv.className = 'item-programacion';
  almuerzoDiv.dataset.codigo = codigo;
  
  // Obtener elementos por subtipo
  const elementosEntrada = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'ENTRADA');
  const elementosFondo = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'FONDO');
  const elementosPostre = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'POSTRE');
  
  almuerzoDiv.innerHTML = `
    <div class="item-header">
      <h4>🍽️ ${codigo}</h4>
      <button type="button" class="btn-eliminar-item" onclick="eliminarItemAlmuerzo('${codigo}')">🗑️</button>
    </div>
    
    <div class="form-group">
      <label>Entrada <span class="required">*</span></label>
      <div class="input-con-boton">
        <select class="select-con-boton select-entrada" required>
          <option value="">Seleccione entrada</option>
          ${elementosEntrada.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
        </select>
        <button type="button" class="btn-agregar-inline" onclick="abrirModalNuevoElemento('ALMUERZO', 'ENTRADA', '${codigo}')">➕</button>
      </div>
    </div>
    
    <div class="form-group">
      <label>Fondo <span class="required">*</span></label>
      <div class="input-con-boton">
        <select class="select-con-boton select-fondo" required>
          <option value="">Seleccione fondo</option>
          ${elementosFondo.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
        </select>
        <button type="button" class="btn-agregar-inline" onclick="abrirModalNuevoElemento('ALMUERZO', 'FONDO', '${codigo}')">➕</button>
      </div>
    </div>
    
    <div class="form-group">
      <label>Postre <span class="required">*</span></label>
      <div class="input-con-boton">
        <select class="select-con-boton select-postre" required>
          <option value="">Seleccione postre</option>
          ${elementosPostre.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
        </select>
        <button type="button" class="btn-agregar-inline" onclick="abrirModalNuevoElemento('ALMUERZO', 'POSTRE', '${codigo}')">➕</button>
      </div>
    </div>
  `;
  
  document.getElementById('listaAlmuerzos').appendChild(almuerzoDiv);
  contadorAlmuerzo++;
}

function eliminarItemAlmuerzo(codigo) {
  const item = document.querySelector(`#listaAlmuerzos [data-codigo="${codigo}"]`);
  if (item) item.remove();
}

// ============================================
// PASO 3: CONFIRMAR ALMUERZOS
// ============================================

function confirmarAlmuerzos() {
  almuerzosProgramados = [];
  
  const itemsAlmuerzo = document.querySelectorAll('#listaAlmuerzos .item-programacion');
  
  if (itemsAlmuerzo.length === 0) {
    mostrarNotificacion('Debe agregar al menos un almuerzo', 'error');
    return;
  }
  
  let hayError = false;
  
  itemsAlmuerzo.forEach(item => {
    const codigo = item.dataset.codigo;
    const entrada = item.querySelector('.select-entrada').value;
    const fondo = item.querySelector('.select-fondo').value;
    const postre = item.querySelector('.select-postre').value;
    
    if (!entrada || !fondo || !postre) {
      mostrarNotificacion(`El ${codigo} debe tener entrada, fondo y postre`, 'error');
      hayError = true;
      return;
    }
    
    almuerzosProgramados.push(
      { codigo, sub_tipo: 'ENTRADA', id_elemento: entrada },
      { codigo, sub_tipo: 'FONDO', id_elemento: fondo },
      { codigo, sub_tipo: 'POSTRE', id_elemento: postre }
    );
  });
  
  if (hayError) return;
  
  almuerzosConfirmados = true;
  
  // Marcar paso 3 como completado
  document.getElementById('indicadorPaso3').classList.remove('active');
  document.getElementById('indicadorPaso3').classList.add('completed');
  document.getElementById('indicadorPaso4').classList.add('active');
  
  // Marcar sección como guardada
  const seccionAlmuerzo = document.getElementById('seccionAlmuerzo');
  seccionAlmuerzo.classList.add('guardada');
  seccionAlmuerzo.innerHTML += '<span class="badge-guardado">✓ Confirmado</span>';
  
  // Deshabilitar campos del paso 3
  document.querySelectorAll('#seccionAlmuerzo input, #seccionAlmuerzo select, #seccionAlmuerzo button').forEach(el => {
    el.disabled = true;
  });
  
  // Habilitar sección 4
  const seccionCena = document.getElementById('seccionCena');
  seccionCena.classList.remove('bloqueada');
  document.getElementById('mensajeBloqueCena').style.display = 'none';
  document.getElementById('formularioCena').style.display = 'block';
  
  mostrarNotificacion('✓ Almuerzos confirmados. Ahora programe las cenas.', 'success');
}

// ============================================
// PASO 4: AGREGAR CENA
// ============================================

function agregarCena() {
  const codigo = `CEN-${String(contadorCena).padStart(2, '0')}`;
  
  const cenaDiv = document.createElement('div');
  cenaDiv.className = 'item-programacion';
  cenaDiv.dataset.codigo = codigo;
  
  // Obtener elementos de cena
  const elementosCena = listaElementos.filter(e => e.tip_rac === 'CENA');
  
  cenaDiv.innerHTML = `
    <div class="item-header">
      <h4>🌙 ${codigo}</h4>
      <button type="button" class="btn-eliminar-item" onclick="eliminarItemCena('${codigo}')">🗑️</button>
    </div>
    
    <div class="form-group">
      <label>Cena <span class="required">*</span></label>
      <div class="input-con-boton">
        <select class="select-con-boton select-cena" required>
          <option value="">Seleccione cena</option>
          ${elementosCena.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
        </select>
        <button type="button" class="btn-agregar-inline" onclick="abrirModalNuevoElemento('CENA', null, '${codigo}')">➕</button>
      </div>
    </div>
  `;
  
  document.getElementById('listaCenas').appendChild(cenaDiv);
  contadorCena++;
}

function eliminarItemCena(codigo) {
  const item = document.querySelector(`#listaCenas [data-codigo="${codigo}"]`);
  if (item) item.remove();
}

// ============================================
// MODAL: NUEVO ELEMENTO
// ============================================

let elementoContexto = { tipRac: null, subTipo: null, codigoItem: null };

function abrirModalNuevoElemento(tipRac, subTipo, codigoItem = null) {
  elementoContexto = { tipRac, subTipo, codigoItem };
  
  document.getElementById('formNuevoElemento').reset();
  document.getElementById('nuevoElementoTipRac').value = tipRac;
  document.getElementById('nuevoElementoSubTipo').value = subTipo || '';
  
  document.getElementById('modalNuevoElemento').style.display = 'block';
}

function cerrarModalNuevoElemento() {
  document.getElementById('modalNuevoElemento').style.display = 'none';
}

async function guardarNuevoElemento() {
  const tipRac = document.getElementById('nuevoElementoTipRac').value;
  const subTipo = document.getElementById('nuevoElementoSubTipo').value || null;
  const descripcion = document.getElementById('nuevoElementoDescripcion').value.trim();
  
  if (!descripcion) {
    mostrarNotificacion('La descripción es obligatoria', 'error');
    return;
  }
  
  mostrarOverlay('Registrando elemento...');
  
  try {
    // Verificar si ya existe
    const { data: existente } = await supabase
      .from('tipo_racion_elemento')
      .select('id')
      .eq('tip_rac', tipRac)
      .eq('sub_tipo', subTipo)
      .eq('descripcion', descripcion)
      .maybeSingle();
    
    if (existente) {
      ocultarOverlay();
      mostrarNotificacion(`El elemento "${descripcion}" ya está registrado`, 'warning');
      return;
    }
    
    // Insertar nuevo elemento
    const { data: nuevoElemento, error } = await supabase
      .from('tipo_racion_elemento')
      .insert([{
        tip_rac: tipRac,
        sub_tipo: subTipo,
        descripcion: descripcion,
        activo: true
      }])
      .select()
      .single();
    
    ocultarOverlay();
    
    if (error) throw error;
    
    // Actualizar lista local
    listaElementos.push(nuevoElemento);
    
    // Actualizar selectores correspondientes
    actualizarSelectoresElementos(tipRac, subTipo, nuevoElemento, elementoContexto.codigoItem);
    
    cerrarModalNuevoElemento();
    mostrarNotificacion(`✓ Elemento registrado: ${descripcion}`, 'success');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al registrar elemento: ' + error.message, 'error');
  }
}

function actualizarSelectoresElementos(tipRac, subTipo, nuevoElemento, codigoItem) {
  if (tipRac === 'DESAYUNO') {
    // Agregar checkbox en todos los desayunos
    const listaDesayunos = document.querySelectorAll('#listaDesayunos .item-programacion');
    listaDesayunos.forEach(item => {
      const checkboxContainer = item.querySelector('.elementos-checkbox');
      if (checkboxContainer) {
        const label = document.createElement('label');
        label.className = 'checkbox-elemento';
        label.innerHTML = `
          <input type="checkbox" value="${nuevoElemento.id}" data-descripcion="${nuevoElemento.descripcion}">
          ${nuevoElemento.descripcion}
        `;
        checkboxContainer.appendChild(label);
      }
    });
  } else if (tipRac === 'ALMUERZO') {
    // Agregar opción en select específico
    const item = codigoItem ? document.querySelector(`#listaAlmuerzos [data-codigo="${codigoItem}"]`) : null;
    
    if (item) {
      let selector;
      if (subTipo === 'ENTRADA') selector = item.querySelector('.select-entrada');
      else if (subTipo === 'FONDO') selector = item.querySelector('.select-fondo');
      else if (subTipo === 'POSTRE') selector = item.querySelector('.select-postre');
      
      if (selector) {
        const option = document.createElement('option');
        option.value = nuevoElemento.id;
        option.textContent = nuevoElemento.descripcion;
        selector.appendChild(option);
        selector.value = nuevoElemento.id;
      }
    }
  } else if (tipRac === 'CENA') {
    // Agregar opción en select de cena
    const item = codigoItem ? document.querySelector(`#listaCenas [data-codigo="${codigoItem}"]`) : null;
    
    if (item) {
      const selector = item.querySelector('.select-cena');
      if (selector) {
        const option = document.createElement('option');
        option.value = nuevoElemento.id;
        option.textContent = nuevoElemento.descripcion;
        selector.appendChild(option);
        selector.value = nuevoElemento.id;
      }
    }
  }
}

// ============================================
// GUARDAR PROGRAMACIÓN COMPLETA (CREATE)
// ============================================

async function guardarProgramacion() {
  cenasProgramadas = [];
  
  const itemsCena = document.querySelectorAll('#listaCenas .item-programacion');
  
  if (itemsCena.length === 0) {
    mostrarNotificacion('Debe agregar al menos una cena', 'error');
    return;
  }
  
  let hayError = false;
  
  itemsCena.forEach(item => {
    const codigo = item.dataset.codigo;
    const cena = item.querySelector('.select-cena').value;
    
    if (!cena) {
      mostrarNotificacion(`El ${codigo} debe tener una cena seleccionada`, 'error');
      hayError = true;
      return;
    }
    
    cenasProgramadas.push({
      codigo: codigo,
      id_elemento: cena
    });
  });
  
  if (hayError) return;
  
  mostrarOverlay('Guardando programación completa...');
  
  try {
    // Preparar detalles para insertar
    const detalles = [];
    
    // Desayunos
    desayunosProgramados.forEach(d => {
      detalles.push({
        id_programacion: idProgramacionActual,
        tip_rac: 'DESAYUNO',
        codigo: d.codigo,
        sub_tipo: null,
        id_elemento: d.id_elemento
      });
    });
    
    // Almuerzos
    almuerzosProgramados.forEach(a => {
      detalles.push({
        id_programacion: idProgramacionActual,
        tip_rac: 'ALMUERZO',
        codigo: a.codigo,
        sub_tipo: a.sub_tipo,
        id_elemento: a.id_elemento
      });
    });
    
    // Cenas
    cenasProgramadas.forEach(c => {
      detalles.push({
        id_programacion: idProgramacionActual,
        tip_rac: 'CENA',
        codigo: c.codigo,
        sub_tipo: null,
        id_elemento: c.id_elemento
      });
    });
    
    // Insertar todos los detalles
    const { error } = await supabase
      .from('detalle_programacion')
      .insert(detalles);
    
    ocultarOverlay();
    
    if (error) throw error;
    
    mostrarNotificacion('✓ Programación guardada correctamente', 'success');
    cerrarModal();
    cargarProgramaciones();
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al guardar programación: ' + error.message, 'error');
  }
}

// ============================================
// VER DETALLE (READ)
// ============================================

async function verDetalle(index) {
  const prog = datosFiltrados[index];
  
  mostrarOverlay('Cargando información...');
  
  try {
    // Obtener detalles
    const { data: detalles, error } = await supabase
      .from('detalle_programacion')
      .select(`
        *,
        tipo_racion_elemento (descripcion)
      `)
      .eq('id_programacion', prog.id)
      .order('codigo');
    
    if (error) throw error;
    
    ocultarOverlay();
    
    // Mostrar información general
    document.getElementById('verFecha').textContent = formatearFecha(prog.fecha);
    document.getElementById('verEstado').textContent = prog.estado;
    document.getElementById('verUnidad').textContent = prog.unidad;
    
    // Agrupar por tipo
    const desayunos = detalles.filter(d => d.tip_rac === 'DESAYUNO');
    const almuerzos = detalles.filter(d => d.tip_rac === 'ALMUERZO');
    const cenas = detalles.filter(d => d.tip_rac === 'CENA');
    
    // Mostrar desayunos
    mostrarDetalleDesayunos(desayunos);
    
    // Mostrar almuerzos
    mostrarDetalleAlmuerzos(almuerzos);
    
    // Mostrar cenas
    mostrarDetalleCenas(cenas);
    
    document.getElementById('modalVerDetalle').style.display = 'block';
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar información: ' + error.message, 'error');
  }
}

function mostrarDetalleDesayunos(desayunos) {
  const container = document.getElementById('verDesayunos');
  container.innerHTML = '';
  
  if (desayunos.length === 0) {
    container.innerHTML = '<p>No hay desayunos programados</p>';
    return;
  }
  
  // Agrupar por código
  const agrupados = {};
  desayunos.forEach(d => {
    if (!agrupados[d.codigo]) agrupados[d.codigo] = [];
    agrupados[d.codigo].push(d.tipo_racion_elemento.descripcion);
  });
  
  for (const codigo in agrupados) {
    const div = document.createElement('div');
    div.className = 'detalle-item';
    div.innerHTML = `
      <strong>${codigo}:</strong>
      <ul>
        ${agrupados[codigo].map(elem => `<li>${elem}</li>`).join('')}
      </ul>
    `;
    container.appendChild(div);
  }
}

function mostrarDetalleAlmuerzos(almuerzos) {
  const container = document.getElementById('verAlmuerzos');
  container.innerHTML = '';
  
  if (almuerzos.length === 0) {
    container.innerHTML = '<p>No hay almuerzos programados</p>';
    return;
  }
  
  // Agrupar por código
  const agrupados = {};
  almuerzos.forEach(a => {
    if (!agrupados[a.codigo]) agrupados[a.codigo] = { ENTRADA: '', FONDO: '', POSTRE: '' };
    agrupados[a.codigo][a.sub_tipo] = a.tipo_racion_elemento.descripcion;
  });
  
  for (const codigo in agrupados) {
    const div = document.createElement('div');
    div.className = 'detalle-item';
    div.innerHTML = `
      <strong>${codigo}:</strong>
      <ul>
        <li><strong>Entrada:</strong> ${agrupados[codigo].ENTRADA}</li>
        <li><strong>Fondo:</strong> ${agrupados[codigo].FONDO}</li>
        <li><strong>Postre:</strong> ${agrupados[codigo].POSTRE}</li>
      </ul>
    `;
    container.appendChild(div);
  }
}

function mostrarDetalleCenas(cenas) {
  const container = document.getElementById('verCenas');
  container.innerHTML = '';
  
  if (cenas.length === 0) {
    container.innerHTML = '<p>No hay cenas programadas</p>';
    return;
  }
  
  cenas.forEach(c => {
    const div = document.createElement('div');
    div.className = 'detalle-item';
    div.innerHTML = `<strong>${c.codigo}:</strong> ${c.tipo_racion_elemento.descripcion}`;
    container.appendChild(div);
  });
}

// ============================================
// EDITAR PROGRAMACIÓN (UPDATE)
// ============================================

async function editarProgramacion(index) {
  const prog = datosFiltrados[index];
  
  if (prog.estado !== 'PROGRAMADO') {
    mostrarNotificacion('Solo puede editar programaciones con estado PROGRAMADO', 'warning');
    return;
  }
  
  mostrarOverlay('Cargando datos para editar...');
  
  try {
    // Obtener detalles
    const { data: detalles, error } = await supabase
      .from('detalle_programacion')
      .select('*')
      .eq('id_programacion', prog.id)
      .order('codigo');
    
    if (error) throw error;
    
    ocultarOverlay();
    
    // Establecer ID y fecha
    document.getElementById('editIdProgramacion').value = prog.id;
    document.getElementById('editFechaProgramacion').value = prog.fecha;
    
    // Establecer fecha mínima
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    document.getElementById('editFechaProgramacion').min = manana.toISOString().split('T')[0];
    
    // Cargar desayunos
    cargarEditDesayunos(detalles.filter(d => d.tip_rac === 'DESAYUNO'));
    
    // Cargar almuerzos
    cargarEditAlmuerzos(detalles.filter(d => d.tip_rac === 'ALMUERZO'));
    
    // Cargar cenas
    cargarEditCenas(detalles.filter(d => d.tip_rac === 'CENA'));
    
    document.getElementById('modalEditar').style.display = 'block';
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar datos: ' + error.message, 'error');
  }
}

function cargarEditDesayunos(desayunos) {
  const container = document.getElementById('editListaDesayunos');
  container.innerHTML = '';
  
  // Agrupar por código
  const agrupados = {};
  desayunos.forEach(d => {
    if (!agrupados[d.codigo]) agrupados[d.codigo] = [];
    agrupados[d.codigo].push(d.id_elemento);
  });
  
  for (const codigo in agrupados) {
    const div = document.createElement('div');
    div.className = 'item-programacion';
    div.dataset.codigo = codigo;
    
    const elementosDesayuno = listaElementos.filter(e => e.tip_rac === 'DESAYUNO');
    
    let checkboxesHTML = '';
    elementosDesayuno.forEach(elem => {
      const checked = agrupados[codigo].includes(elem.id) ? 'checked' : '';
      checkboxesHTML += `
        <label class="checkbox-elemento">
          <input type="checkbox" value="${elem.id}" data-descripcion="${elem.descripcion}" ${checked}>
          ${elem.descripcion}
        </label>
      `;
    });
    
    div.innerHTML = `
      <div class="item-header">
        <h4>☕ ${codigo}</h4>
        <button type="button" class="btn-eliminar-item" onclick="eliminarEditDesayuno('${codigo}')">🗑️</button>
      </div>
      <div class="elementos-checkbox">
        ${checkboxesHTML}
      </div>
    `;
    
    container.appendChild(div);
  }
}

function cargarEditAlmuerzos(almuerzos) {
  const container = document.getElementById('editListaAlmuerzos');
  container.innerHTML = '';
  
  // Agrupar por código
  const agrupados = {};
  almuerzos.forEach(a => {
    if (!agrupados[a.codigo]) agrupados[a.codigo] = {};
    agrupados[a.codigo][a.sub_tipo] = a.id_elemento;
  });
  
  for (const codigo in agrupados) {
    const div = document.createElement('div');
    div.className = 'item-programacion';
    div.dataset.codigo = codigo;
    
    const elementosEntrada = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'ENTRADA');
    const elementosFondo = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'FONDO');
    const elementosPostre = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'POSTRE');
    
    div.innerHTML = `
      <div class="item-header">
        <h4>🍽️ ${codigo}</h4>
        <button type="button" class="btn-eliminar-item" onclick="eliminarEditAlmuerzo('${codigo}')">🗑️</button>
      </div>
      
      <div class="form-group">
        <label>Entrada</label>
        <select class="select-entrada">
          <option value="">Seleccione entrada</option>
          ${elementosEntrada.map(e => `<option value="${e.id}" ${e.id === agrupados[codigo].ENTRADA ? 'selected' : ''}>${e.descripcion}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Fondo</label>
        <select class="select-fondo">
          <option value="">Seleccione fondo</option>
          ${elementosFondo.map(e => `<option value="${e.id}" ${e.id === agrupados[codigo].FONDO ? 'selected' : ''}>${e.descripcion}</option>`).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Postre</label>
        <select class="select-postre">
          <option value="">Seleccione postre</option>
          ${elementosPostre.map(e => `<option value="${e.id}" ${e.id === agrupados[codigo].POSTRE ? 'selected' : ''}>${e.descripcion}</option>`).join('')}
        </select>
      </div>
    `;
    
    container.appendChild(div);
  }
}

function cargarEditCenas(cenas) {
  const container = document.getElementById('editListaCenas');
  container.innerHTML = '';
  
  cenas.forEach(c => {
    const div = document.createElement('div');
    div.className = 'item-programacion';
    div.dataset.codigo = c.codigo;
    
    const elementosCena = listaElementos.filter(e => e.tip_rac === 'CENA');
    
    div.innerHTML = `
      <div class="item-header">
        <h4>🌙 ${c.codigo}</h4>
        <button type="button" class="btn-eliminar-item" onclick="eliminarEditCena('${c.codigo}')">🗑️</button>
      </div>
      
      <div class="form-group">
        <label>Cena</label>
        <select class="select-cena">
          <option value="">Seleccione cena</option>
          ${elementosCena.map(e => `<option value="${e.id}" ${e.id === c.id_elemento ? 'selected' : ''}>${e.descripcion}</option>`).join('')}
        </select>
      </div>
    `;
    
    container.appendChild(div);
  });
}

function eliminarEditDesayuno(codigo) {
  const item = document.querySelector(`#editListaDesayunos [data-codigo="${codigo}"]`);
  if (item) item.remove();
}

function eliminarEditAlmuerzo(codigo) {
  const item = document.querySelector(`#editListaAlmuerzos [data-codigo="${codigo}"]`);
  if (item) item.remove();
}

function eliminarEditCena(codigo) {
  const item = document.querySelector(`#editListaCenas [data-codigo="${codigo}"]`);
  if (item) item.remove();
}

function editAgregarDesayuno() {
  // Similar a agregarDesayuno pero en contexto de edición
  const codigosExistentes = Array.from(document.querySelectorAll('#editListaDesayunos .item-programacion')).map(i => i.dataset.codigo);
  let nuevoNumero = 1;
  while (codigosExistentes.includes(`DES-${String(nuevoNumero).padStart(2, '0')}`)) {
    nuevoNumero++;
  }
  const codigo = `DES-${String(nuevoNumero).padStart(2, '0')}`;
  
  const desayunoDiv = document.createElement('div');
  desayunoDiv.className = 'item-programacion';
  desayunoDiv.dataset.codigo = codigo;
  
  const elementosDesayuno = listaElementos.filter(e => e.tip_rac === 'DESAYUNO');
  
  let checkboxesHTML = '';
  elementosDesayuno.forEach(elem => {
    checkboxesHTML += `
      <label class="checkbox-elemento">
        <input type="checkbox" value="${elem.id}" data-descripcion="${elem.descripcion}">
        ${elem.descripcion}
      </label>
    `;
  });
  
  desayunoDiv.innerHTML = `
    <div class="item-header">
      <h4>☕ ${codigo}</h4>
      <button type="button" class="btn-eliminar-item" onclick="eliminarEditDesayuno('${codigo}')">🗑️</button>
    </div>
    <div class="elementos-checkbox">
      ${checkboxesHTML}
    </div>
  `;
  
  document.getElementById('editListaDesayunos').appendChild(desayunoDiv);
}

function editAgregarAlmuerzo() {
  const codigosExistentes = Array.from(document.querySelectorAll('#editListaAlmuerzos .item-programacion')).map(i => i.dataset.codigo);
  let nuevoNumero = 1;
  while (codigosExistentes.includes(`ALM-${String(nuevoNumero).padStart(2, '0')}`)) {
    nuevoNumero++;
  }
  const codigo = `ALM-${String(nuevoNumero).padStart(2, '0')}`;
  
  const almuerzoDiv = document.createElement('div');
  almuerzoDiv.className = 'item-programacion';
  almuerzoDiv.dataset.codigo = codigo;
  
  const elementosEntrada = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'ENTRADA');
  const elementosFondo = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'FONDO');
  const elementosPostre = listaElementos.filter(e => e.tip_rac === 'ALMUERZO' && e.sub_tipo === 'POSTRE');
  
  almuerzoDiv.innerHTML = `
    <div class="item-header">
      <h4>🍽️ ${codigo}</h4>
      <button type="button" class="btn-eliminar-item" onclick="eliminarEditAlmuerzo('${codigo}')">🗑️</button>
    </div>
    
    <div class="form-group">
      <label>Entrada</label>
      <select class="select-entrada">
        <option value="">Seleccione entrada</option>
        ${elementosEntrada.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
      </select>
    </div>
    
    <div class="form-group">
      <label>Fondo</label>
      <select class="select-fondo">
        <option value="">Seleccione fondo</option>
        ${elementosFondo.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
      </select>
    </div>
    
    <div class="form-group">
      <label>Postre</label>
      <select class="select-postre">
        <option value="">Seleccione postre</option>
        ${elementosPostre.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
      </select>
    </div>
  `;
  
  document.getElementById('editListaAlmuerzos').appendChild(almuerzoDiv);
}

function editAgregarCena() {
  const codigosExistentes = Array.from(document.querySelectorAll('#editListaCenas .item-programacion')).map(i => i.dataset.codigo);
  let nuevoNumero = 1;
  while (codigosExistentes.includes(`CEN-${String(nuevoNumero).padStart(2, '0')}`)) {
    nuevoNumero++;
  }
  const codigo = `CEN-${String(nuevoNumero).padStart(2, '0')}`;
  
  const cenaDiv = document.createElement('div');
  cenaDiv.className = 'item-programacion';
  cenaDiv.dataset.codigo = codigo;
  
  const elementosCena = listaElementos.filter(e => e.tip_rac === 'CENA');
  
  cenaDiv.innerHTML = `
    <div class="item-header">
      <h4>🌙 ${codigo}</h4>
      <button type="button" class="btn-eliminar-item" onclick="eliminarEditCena('${codigo}')">🗑️</button>
    </div>
    
    <div class="form-group">
      <label>Cena</label>
      <select class="select-cena">
        <option value="">Seleccione cena</option>
        ${elementosCena.map(e => `<option value="${e.id}">${e.descripcion}</option>`).join('')}
      </select>
    </div>
  `;
  
  document.getElementById('editListaCenas').appendChild(cenaDiv);
}

async function actualizarProgramacion() {
  const idProg = document.getElementById('editIdProgramacion').value;
  const fecha = document.getElementById('editFechaProgramacion').value;
  
  if (!fecha) {
    mostrarNotificacion('La fecha es obligatoria', 'error');
    return;
  }
  
  // Validar fecha futura
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaSeleccionada = new Date(fecha + 'T00:00:00');
  
  if (fechaSeleccionada <= hoy) {
    mostrarNotificacion('La fecha debe ser posterior a hoy', 'error');
    return;
  }
  
  mostrarOverlay('Actualizando programación...');
  
  try {
    // Actualizar fecha de programación
    const { error: errorUpdate } = await supabase
      .from('programacion')
      .update({ fecha: fecha })
      .eq('id', idProg);
    
    if (errorUpdate) throw errorUpdate;
    
    // Eliminar detalles existentes
    const { error: errorDelete } = await supabase
      .from('detalle_programacion')
      .delete()
      .eq('id_programacion', idProg);
    
    if (errorDelete) throw errorDelete;
    
    // Preparar nuevos detalles
    const detalles = [];
    
    // Desayunos
    const itemsDesayuno = document.querySelectorAll('#editListaDesayunos .item-programacion');
    itemsDesayuno.forEach(item => {
      const codigo = item.dataset.codigo;
      const checkboxes = item.querySelectorAll('input[type="checkbox"]:checked');
      
      checkboxes.forEach(checkbox => {
        detalles.push({
          id_programacion: idProg,
          tip_rac: 'DESAYUNO',
          codigo: codigo,
          sub_tipo: null,
          id_elemento: checkbox.value
        });
      });
    });
    
    // Almuerzos
    const itemsAlmuerzo = document.querySelectorAll('#editListaAlmuerzos .item-programacion');
    itemsAlmuerzo.forEach(item => {
      const codigo = item.dataset.codigo;
      const entrada = item.querySelector('.select-entrada').value;
      const fondo = item.querySelector('.select-fondo').value;
      const postre = item.querySelector('.select-postre').value;
      
      if (entrada && fondo && postre) {
        detalles.push(
          { id_programacion: idProg, tip_rac: 'ALMUERZO', codigo, sub_tipo: 'ENTRADA', id_elemento: entrada },
          { id_programacion: idProg, tip_rac: 'ALMUERZO', codigo, sub_tipo: 'FONDO', id_elemento: fondo },
          { id_programacion: idProg, tip_rac: 'ALMUERZO', codigo, sub_tipo: 'POSTRE', id_elemento: postre }
        );
      }
    });
    
    // Cenas
    const itemsCena = document.querySelectorAll('#editListaCenas .item-programacion');
    itemsCena.forEach(item => {
      const codigo = item.dataset.codigo;
      const cena = item.querySelector('.select-cena').value;
      
      if (cena) {
        detalles.push({
          id_programacion: idProg,
          tip_rac: 'CENA',
          codigo: codigo,
          sub_tipo: null,
          id_elemento: cena
        });
      }
    });
    
    if (detalles.length === 0) {
      ocultarOverlay();
      mostrarNotificacion('Debe programar al menos un elemento', 'error');
      return;
    }
    
// Insertar nuevos detalles
    const { error: errorInsert } = await supabase
      .from('detalle_programacion')
      .insert(detalles);
    
    ocultarOverlay();
    
    if (errorInsert) throw errorInsert;
    
    mostrarNotificacion('✓ Programación actualizada correctamente', 'success');
    cerrarModalEditar();
    cargarProgramaciones();
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
  }
}
