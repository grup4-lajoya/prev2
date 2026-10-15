// ============================================
// PANEL-INSCRIPCIONES.JS - Desafío La Joya · Corredores
// La encargada carga, edita, elimina y publica corredores.
// Todo pasa por la Edge Function "gestionar-corredores", que verifica el usuario
// y su rol (MARATON o ADMIN) contra la tabla "users". La tabla está cerrada a la anon key.
// ============================================

const SUPABASE_URL  = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';
const FN_GESTIONAR  = `${SUPABASE_URL}/functions/v1/gestionar-corredores`;

let corredores = [];
let filtrados = [];
let paginaActual = 1;
const registrosPorPagina = 25;

const usuario = localStorage.getItem("usuario") || "";

if (!usuario) window.location.replace("login.html");

window.onload = function () {
  cargarDatos();
};

// Orden igual al del Excel: 5K antes que 10K, Varones antes que Mujeres, Libre antes que Mayores
const ORDEN_DIST = { '5K': 0, '10K': 1 };
const ORDEN_SEXO = { 'Varones': 0, 'Mujeres': 1 };
const ORDEN_CAT  = { 'Libre': 0, 'Mayores': 1 };

const GRUPOS = [];
['5K', '10K'].forEach(d =>
  ['Varones', 'Mujeres'].forEach(s =>
    ['Libre', 'Mayores'].forEach(c => GRUPOS.push({ d, s, c }))
  )
);

// ---------- Utilidades ----------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function normalizar(str) {
  return (str || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function mostrarOverlay(mensaje) {
  document.getElementById('mensajeCarga').textContent = mensaje;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

function ordenar(lista) {
  return lista.sort((a, b) =>
    (ORDEN_DIST[a.distancia] - ORDEN_DIST[b.distancia]) ||
    (ORDEN_SEXO[a.sexo] - ORDEN_SEXO[b.sexo]) ||
    (ORDEN_CAT[a.categoria] - ORDEN_CAT[b.categoria]) ||
    a.apellidos.localeCompare(b.apellidos, 'es') ||
    a.nombres.localeCompare(b.nombres, 'es')
  );
}

// ---------- Llamada a la Edge Function ----------

async function llamar(accion, datos = {}) {
  const res = await fetch(FN_GESTIONAR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
      'Authorization': `Bearer ${SUPABASE_ANON}`
    },
    body: JSON.stringify({ usuario, accion, ...datos })
  });

  let json = {};
  try { json = await res.json(); } catch (e) { /* respuesta sin cuerpo */ }

  if (res.status === 403) {
    const err = new Error('No tienes permiso para esta acción.');
    err.sinPermiso = true;
    throw err;
  }
  if (!res.ok) throw new Error(json.error || `Error HTTP: ${res.status}`);
  return json;
}

// ---------- Carga y filtros ----------

async function cargarDatos() {
  const loadingEl = document.getElementById('loading');
  try {
    loadingEl.style.display = 'block';
    loadingEl.innerHTML = 'Cargando datos... ⏳';
    document.getElementById('tablaCorredores').style.display = 'none';
    document.getElementById('paginacion').style.display = 'none';

    const json = await llamar('listar');
    corredores = ordenar(json.data || []);

    loadingEl.style.display = 'none';
    document.getElementById('tablaCorredores').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';

    aplicarFiltros();

  } catch (error) {
    console.error("Error cargando los datos:", error);
    if (error.sinPermiso) {
      loadingEl.innerHTML = '❌ No tienes permiso para ver esta página.';
      return;
    }
    loadingEl.innerHTML = `❌ Error: ${escapeHtml(error.message)}<br><button onclick="cargarDatos()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
  }
}

function filtrar() {
  const termino = normalizar(document.getElementById('buscar').value);
  const distancia = document.getElementById('fDistancia').value;
  const sexo = document.getElementById('fSexo').value;
  const categoria = document.getElementById('fCategoria').value;
  const publicado = document.getElementById('fPublicado').value;

  filtrados = corredores.filter(r => {
    const textoFila = normalizar([r.apellidos, r.nombres, r.grado, r.unidad, r.dni, r.dorsal].join(' '));
    const cumpleTexto = !termino || textoFila.includes(termino);
    const cumpleDist = !distancia || r.distancia === distancia;
    const cumpleSexo = !sexo || r.sexo === sexo;
    const cumpleCat = !categoria || r.categoria === categoria;
    const cumplePub = !publicado || (publicado === 'si' ? r.publicado : !r.publicado);
    return cumpleTexto && cumpleDist && cumpleSexo && cumpleCat && cumplePub;
  });
}

// Vuelve a aplicar los filtros conservando la página actual
function refrescar() {
  filtrar();
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / registrosPorPagina));
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  actualizarTabla();
  actualizarResumen();
}

// Cuando cambia un filtro, vuelve a la primera página
function aplicarFiltros() {
  paginaActual = 1;
  refrescar();
}

function limpiarFiltros() {
  document.getElementById('buscar').value = '';
  document.getElementById('fDistancia').value = '';
  document.getElementById('fSexo').value = '';
  document.getElementById('fCategoria').value = '';
  document.getElementById('fPublicado').value = '';
  aplicarFiltros();
}

function filtrarGrupo(distancia, sexo, categoria) {
  document.getElementById('fDistancia').value = distancia;
  document.getElementById('fSexo').value = sexo;
  document.getElementById('fCategoria').value = categoria;
  aplicarFiltros();
}

document.getElementById('buscar').addEventListener('input', aplicarFiltros);

// ---------- Resumen por categoría ----------

function actualizarResumen() {
  const total = corredores.length;
  const publicados = corredores.filter(r => r.publicado).length;

  const tarjetas = GRUPOS.map(g => {
    const delGrupo = corredores.filter(r => r.distancia === g.d && r.sexo === g.s && r.categoria === g.c);
    const pubs = delGrupo.filter(r => r.publicado).length;
    return `
      <button type="button" class="grupo-card" onclick="filtrarGrupo('${g.d}','${g.s}','${g.c}')">
        <small>${g.d} · ${g.s} · ${g.c}</small>
        <strong>${delGrupo.length}</strong>
        <small>${pubs} publicados</small>
      </button>`;
  }).join('');

  document.getElementById('resumen').innerHTML = `
    <div class="resumen-totales">
      <div class="chip-total">Total: <strong>${total}</strong></div>
      <div class="chip-total">Publicados: <strong>${publicados}</strong></div>
      <div class="chip-total">Sin publicar: <strong>${total - publicados}</strong></div>
    </div>
    <div class="resumen-grupos">${tarjetas}</div>`;
}

// ---------- Tabla ----------

function actualizarTabla() {
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const datosPagina = filtrados.slice(inicio, fin);

  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';

  document.getElementById('infoRegistros').textContent = `${filtrados.length} de ${corredores.length} corredores`;

  if (datosPagina.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="10" style="text-align:center; padding:20px; color:#666;">No se encontraron corredores</td>`;
    tbody.appendChild(tr);
    document.getElementById('paginacion').innerHTML = '';
    return;
  }

  datosPagina.forEach((r, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inicio + index + 1}</td>
      <td>${escapeHtml(r.apellidos)}, ${escapeHtml(r.nombres)}</td>
      <td>${escapeHtml(r.grado || '-')}</td>
      <td><span class="badge-dist ${r.distancia === '5K' ? 'badge-5k' : 'badge-10k'}">${escapeHtml(r.distancia)}</span></td>
      <td>${escapeHtml(r.sexo)}</td>
      <td>${escapeHtml(r.categoria)}</td>
      <td>${escapeHtml(r.unidad || '-')}</td>
      <td>${escapeHtml(r.dorsal || '-')}</td>
      <td>
        <label class="switch" title="${r.publicado ? 'Publicado en la web' : 'No se muestra en la web'}">
          <input type="checkbox" ${r.publicado ? 'checked' : ''} onchange="alternarPublicado('${r.id}', this)" aria-label="Publicado">
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-editar" onclick="editarCorredor('${r.id}')" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarCorredor('${r.id}')" title="Eliminar">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  actualizarPaginacion();
}

function actualizarPaginacion() {
  const totalPaginas = Math.ceil(filtrados.length / registrosPorPagina);
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
  const hasta = Math.min(paginaActual * registrosPorPagina, filtrados.length);
  info.textContent = `Mostrando ${desde}-${hasta} de ${filtrados.length}`;
  paginacion.appendChild(info);
}

function cambiarPagina(nuevaPagina) {
  paginaActual = nuevaPagina;
  actualizarTabla();
}

// ---------- Formulario de corredor ----------

function valor(id) {
  return document.getElementById(id).value.trim();
}

function leerFormulario() {
  return {
    id: document.getElementById('cId').value || undefined,
    apellidos: valor('cApellidos'),
    nombres: valor('cNombres'),
    distancia: valor('cDistancia'),
    sexo: valor('cSexo'),
    categoria: valor('cCategoria'),
    grado: valor('cGrado'),
    unidad: valor('cUnidad'),
    edad: valor('cEdad'),
    dni: valor('cDni'),
    telefono: valor('cTelefono'),
    talla_polo: valor('cTalla'),
    dorsal: valor('cDorsal')
  };
}

function limpiarFormulario() {
  ['cId', 'cApellidos', 'cNombres', 'cDistancia', 'cSexo', 'cCategoria',
   'cGrado', 'cUnidad', 'cEdad', 'cDni', 'cTelefono', 'cTalla', 'cDorsal']
    .forEach(id => { document.getElementById(id).value = ''; });
}

function abrirModalNuevo() {
  limpiarFormulario();
  document.getElementById('tituloModalCorredor').textContent = '➕ Nuevo corredor';
  document.getElementById('btnGuardarOtro').style.display = 'inline-block';
  document.getElementById('modalCorredor').style.display = 'block';
  document.getElementById('cApellidos').focus();
}

function editarCorredor(id) {
  const r = corredores.find(x => x.id === id);
  if (!r) { mostrarNotificacion('Corredor no encontrado', 'error'); return; }

  limpiarFormulario();
  document.getElementById('cId').value = r.id;
  document.getElementById('cApellidos').value = r.apellidos || '';
  document.getElementById('cNombres').value = r.nombres || '';
  document.getElementById('cDistancia').value = r.distancia || '';
  document.getElementById('cSexo').value = r.sexo || '';
  document.getElementById('cCategoria').value = r.categoria || '';
  document.getElementById('cGrado').value = r.grado || '';
  document.getElementById('cUnidad').value = r.unidad || '';
  document.getElementById('cEdad').value = r.edad == null ? '' : r.edad;
  document.getElementById('cDni').value = r.dni || '';
  document.getElementById('cTelefono').value = r.telefono || '';
  document.getElementById('cTalla').value = r.talla_polo || '';
  document.getElementById('cDorsal').value = r.dorsal || '';

  document.getElementById('tituloModalCorredor').textContent = '✏️ Editar corredor';
  document.getElementById('btnGuardarOtro').style.display = 'none';
  document.getElementById('modalCorredor').style.display = 'block';
}

function cerrarModalCorredor() {
  document.getElementById('modalCorredor').style.display = 'none';
}

// Deja listo el formulario para el siguiente corredor, conservando distancia, sexo y categoría
function prepararSiguiente() {
  ['cId', 'cApellidos', 'cNombres', 'cGrado', 'cUnidad', 'cEdad', 'cDni', 'cTelefono', 'cTalla', 'cDorsal']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('cApellidos').focus();
}

async function guardarCorredor(agregarOtro = false) {
  const corredor = leerFormulario();

  if (!corredor.apellidos || !corredor.nombres) {
    mostrarNotificacion('Apellidos y nombres son obligatorios.', 'warning');
    return;
  }
  if (!corredor.distancia || !corredor.sexo || !corredor.categoria) {
    mostrarNotificacion('Selecciona distancia, sexo y categoría.', 'warning');
    return;
  }
  if (corredor.dni && !/^\d{8}$/.test(corredor.dni)) {
    mostrarNotificacion('El DNI debe tener 8 dígitos.', 'warning');
    return;
  }

  // Aviso de posible duplicado al crear (mismos apellidos y nombres)
  if (!corredor.id) {
    const clave = normalizar(corredor.apellidos) + '|' + normalizar(corredor.nombres);
    const repetido = corredores.find(r => normalizar(r.apellidos) + '|' + normalizar(r.nombres) === clave);
    if (repetido) {
      const seguir = await mostrarConfirmacion(
        `Ya existe un corredor con ese nombre:\n\n${repetido.apellidos}, ${repetido.nombres}\n(${repetido.distancia} · ${repetido.sexo} · ${repetido.categoria})\n\n¿Agregarlo de todos modos?`,
        '⚠️ Posible duplicado'
      );
      if (!seguir) return;
    }
  }

  const btnGuardar = document.getElementById('btnGuardar');
  const btnGuardarOtro = document.getElementById('btnGuardarOtro');
  btnGuardar.disabled = true;
  btnGuardarOtro.disabled = true;
  mostrarOverlay('Guardando corredor...');

  try {
    const json = await llamar('guardar', { corredor });
    const fila = json.data;

    const idx = corredores.findIndex(x => x.id === fila.id);
    if (idx >= 0) corredores[idx] = fila; else corredores.push(fila);
    ordenar(corredores);
    refrescar();

    ocultarOverlay();
    mostrarNotificacion(`✓ ${fila.apellidos}, ${fila.nombres} guardado`, 'success');

    if (agregarOtro && !corredor.id) {
      prepararSiguiente();
    } else {
      cerrarModalCorredor();
    }

  } catch (err) {
    ocultarOverlay();
    mostrarNotificacion('Error al guardar: ' + err.message, 'error');
  } finally {
    btnGuardar.disabled = false;
    btnGuardarOtro.disabled = false;
  }
}

// ---------- Eliminar ----------

async function eliminarCorredor(id) {
  const r = corredores.find(x => x.id === id);
  if (!r) { mostrarNotificacion('Corredor no encontrado', 'error'); return; }

  const confirmar = await mostrarConfirmacion(
    `¿Eliminar a este corredor?\n\n${r.apellidos}, ${r.nombres}\n(${r.distancia} · ${r.sexo} · ${r.categoria})\n\nEsta acción no se puede deshacer.`,
    '🗑️ Confirmar eliminación',
    true
  );
  if (!confirmar) return;

  mostrarOverlay('Eliminando corredor...');
  try {
    await llamar('eliminar', { id });
    corredores = corredores.filter(x => x.id !== id);
    refrescar();
    ocultarOverlay();
    mostrarNotificacion('✓ Corredor eliminado', 'success');
  } catch (err) {
    ocultarOverlay();
    mostrarNotificacion('Error al eliminar: ' + err.message, 'error');
  }
}

// ---------- Publicación ----------

async function alternarPublicado(id, checkbox) {
  const nuevo = checkbox.checked;
  checkbox.disabled = true;
  try {
    await llamar('publicar', { id, publicado: nuevo });
    const r = corredores.find(x => x.id === id);
    if (r) r.publicado = nuevo;
    refrescar();
  } catch (err) {
    checkbox.checked = !nuevo;
    checkbox.disabled = false;
    mostrarNotificacion('Error: ' + err.message, 'error');
  }
}

async function publicarTodos(publicar) {
  if (corredores.length === 0) {
    mostrarNotificacion('Todavía no hay corredores cargados.', 'warning');
    return;
  }

  const confirmar = await mostrarConfirmacion(
    publicar
      ? `Se publicarán en la web los ${corredores.length} corredores (solo apellidos, nombres y categoría).\n\n¿Continuar?`
      : `Se ocultarán de la web los ${corredores.length} corredores.\n\n¿Continuar?`,
    publicar ? '🌐 Publicar todos' : '🚫 Ocultar todos'
  );
  if (!confirmar) return;

  mostrarOverlay(publicar ? 'Publicando...' : 'Ocultando...');
  try {
    await llamar('publicar_todos', { publicado: publicar });
    corredores.forEach(r => { r.publicado = publicar; });
    refrescar();
    ocultarOverlay();
    mostrarNotificacion(publicar ? '✓ Lista publicada en la web' : '✓ Lista oculta de la web', 'success');
  } catch (err) {
    ocultarOverlay();
    mostrarNotificacion('Error: ' + err.message, 'error');
  }
}

// ---------- Notificaciones y confirmación ----------

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

  notificacion.innerHTML = escapeHtml(mensaje).replace(/\n/g, '<br>');
  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notificacion.remove(), 300);
  }, 5000);
}

let resolverConfirmacion = null;

function mostrarConfirmacion(mensaje, titulo = '⚠️ Confirmar', peligro = false) {
  return new Promise((resolve) => {
    resolverConfirmacion = resolve;
    document.getElementById('tituloConfirmacion').textContent = titulo;
    document.getElementById('mensajeConfirmacion').innerHTML = escapeHtml(mensaje).replace(/\n/g, '<br>');
    document.getElementById('btnConfirmarSi').className = peligro ? 'btn-confirmar-si peligro' : 'btn-confirmar-si';
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
