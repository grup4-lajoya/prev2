// ============================================
// JIAT.JS - VERSIÓN FINAL CON EDICIÓN EN CASCADA
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxIeRDr8R2JAQ39AlFW4f8hOrhMmvaJvuAOGwfOurjmUKn57xdXQ8t-70WweSkAorwy/exec';
let datosUsuario = {};
let registrosJIAT = [];
let registrosFiltrados = [];
let paginaActual = 1;
let registrosPorPagina = 10;
let codigoJIATActual = '';
let cabeceraGuardada = false;
let detallesGuardados = [];

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  cargarDatosUsuario();
  poblarPeriodos();
  cargarRegistrosJIAT();
  configurarBuscador();
});

function cargarDatosUsuario() {
  const datos = localStorage.getItem('datosUsuario');
  const rol = localStorage.getItem('rolUsuario');
  const unidad = localStorage.getItem('unidadUsuario');
  
  if (datos && rol) {
    datosUsuario = {
      nombre: datos,
      rol: rol,
      unidad: unidad || ''
    };
  } else {
    alert('⚠️ No se encontraron datos de usuario. Por favor, inicie sesión nuevamente.');
    window.location.href = 'index.html';
  }
}

function poblarPeriodos() {
  const selectPeriodo = document.getElementById('periodo');
  const selectEditPeriodo = document.getElementById('editPeriodo');
  const añoActual = new Date().getFullYear();
  
  for (let i = añoActual; i >= añoActual - 10; i--) {
    const option1 = document.createElement('option');
    option1.value = i;
    option1.textContent = i;
    selectPeriodo.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = i;
    option2.textContent = i;
    selectEditPeriodo.appendChild(option2);
  }
}

// ============================================
// CARGA Y VISUALIZACIÓN DE REGISTROS
// ============================================

async function cargarRegistrosJIAT() {
  mostrarCargando(true);
  
  try {
    const response = await fetch(`${API_URL}?action=obtenerJIAT&rol=${encodeURIComponent(datosUsuario.rol)}&unidad=${encodeURIComponent(datosUsuario.unidad)}`);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    registrosJIAT = Array.isArray(data) ? data : [];
    registrosFiltrados = [...registrosJIAT];
    
    mostrarCargando(false);
    mostrarTabla();
    actualizarPaginacion();
    actualizarInfoRegistros();
    
  } catch (error) {
    console.error('Error al cargar registros:', error);
    mostrarCargando(false);
    alert('⚠️ Error al cargar los registros: ' + error.message);
  }
}

function mostrarCargando(mostrar) {
  const loading = document.getElementById('loading');
  const tabla = document.getElementById('tablaJIAT');
  
  if (mostrar) {
    loading.style.display = 'block';
    tabla.style.display = 'none';
  } else {
    loading.style.display = 'none';
    tabla.style.display = 'table';
  }
}

function mostrarTabla() {
  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';
  
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const registrosPagina = registrosFiltrados.slice(inicio, fin);
  
  if (registrosPagina.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay registros para mostrar</td></tr>';
    return;
  }
  
  registrosPagina.forEach((registro, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inicio + index + 1}</td>
      <td>${registro.UNIDAD || '-'}</td>
      <td><strong>${registro.CODIGO || '-'}</strong></td>
      <td>${registro.FECHA || '-'}</td>
      <td>${registro.FATAL || '-'}</td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-ver" onclick="verDetalle('${registro.CODIGO}')" title="Ver Detalle">👁</button>
          <button class="btn-icono btn-acciones" onclick="abrirModalAcciones('${registro.CODIGO}')" title="Acciones Tomadas">✅</button>
          <button class="btn-icono btn-editar" onclick="editarRegistro('${registro.CODIGO}')" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarRegistro('${registro.CODIGO}')" title="Eliminar">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function actualizarPaginacion() {
  const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
  const paginacion = document.getElementById('paginacion');
  
  if (totalPaginas <= 1) {
    paginacion.style.display = 'none';
    return;
  }
  
  paginacion.style.display = 'flex';
  paginacion.innerHTML = `
    <button onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>Anterior</button>
    <span>Página ${paginaActual} de ${totalPaginas}</span>
    <button onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente</button>
  `;
}

function cambiarPagina(nuevaPagina) {
  const totalPaginas = Math.ceil(registrosFiltrados.length / registrosPorPagina);
  if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
    paginaActual = nuevaPagina;
    mostrarTabla();
    actualizarPaginacion();
  }
}

function configurarBuscador() {
  const inputBuscar = document.getElementById('buscar');
  inputBuscar.addEventListener('input', function() {
    const termino = this.value.toLowerCase().trim();
    
    if (termino === '') {
      registrosFiltrados = [...registrosJIAT];
    } else {
      registrosFiltrados = registrosJIAT.filter(reg => 
        (reg.UNIDAD || '').toLowerCase().includes(termino) ||
        (reg.CODIGO || '').toLowerCase().includes(termino) ||
        (reg.FECHA || '').toLowerCase().includes(termino) ||
        (reg.LUGAR || '').toLowerCase().includes(termino)
      );
    }
    
    paginaActual = 1;
    mostrarTabla();
    actualizarPaginacion();
    actualizarInfoRegistros();
  });
}

function actualizarInfoRegistros() {
  const info = document.getElementById('infoRegistros');
  info.textContent = `Mostrando ${registrosFiltrados.length} de ${registrosJIAT.length} registros`;
}

// ============================================
// NUEVO REGISTRO - MODAL
// ============================================

function nuevoRegistro() {
  resetearFormularioNuevo();
  document.getElementById('modalNuevo').style.display = 'block';
}

function resetearFormularioNuevo() {
  document.getElementById('formNuevo').reset();
  
  // Resetear estado
  cabeceraGuardada = false;
  codigoJIATActual = '';
  detallesGuardados = [];
  
  // Bloquear sección de detalles
  const seccionDetalles = document.getElementById('seccionDetalles');
  seccionDetalles.classList.add('bloqueada');
  document.getElementById('mensajeBloqueo').style.display = 'block';
  document.getElementById('btnAgregarDetalle').disabled = true;
  
  // Limpiar detalles
  document.getElementById('detallesContainer').innerHTML = '';
  
  // Resetear involucrados a uno solo
  const container = document.getElementById('involucradosContainer');
  container.innerHTML = `
    <div class="involucrado-item">
      <input type="text" class="involucrado-input" placeholder="Nombre del involucrado" required>
    </div>
  `;
  
  // Remover clase guardada de cabecera
  document.getElementById('seccionCabecera').classList.remove('guardada');
  const badgeGuardado = document.querySelector('#seccionCabecera .badge-guardado');
  if (badgeGuardado) badgeGuardado.remove();
}

function cerrarModal() {
  document.getElementById('modalNuevo').style.display = 'none';
}

function cerrarModalCompleto() {
  if (!cabeceraGuardada) {
    if (confirm('¿Está seguro de cerrar? No se ha guardado la cabecera del registro.')) {
      cerrarModal();
    }
  } else {
    cerrarModal();
    cargarRegistrosJIAT();
  }
}

// ============================================
// GESTIÓN DE INVOLUCRADOS
// ============================================

function agregarInvolucrado() {
  const container = document.getElementById('involucradosContainer');
  const nuevoItem = document.createElement('div');
  nuevoItem.className = 'involucrado-item';
  nuevoItem.innerHTML = `
    <input type="text" class="involucrado-input" placeholder="Nombre del involucrado" required>
    <button type="button" class="btn-quitar" onclick="quitarInvolucrado(this)">Quitar</button>
  `;
  container.appendChild(nuevoItem);
}

function quitarInvolucrado(btn) {
  btn.parentElement.remove();
}

function obtenerInvolucrados() {
  const inputs = document.querySelectorAll('.involucrado-input');
  const involucrados = [];
  inputs.forEach(input => {
    if (input.value.trim()) {
      involucrados.push(input.value.trim());
    }
  });
  return involucrados.join('; ');
}

// ============================================
// VALIDACIÓN DE FECHAS
// ============================================

function actualizarRangoFechas() {
  const periodo = document.getElementById('periodo').value;
  const inputFecha = document.getElementById('fecha');
  
  if (periodo) {
    const fechaMin = `${periodo}-01-01`;
    const fechaMax = `${periodo}-12-31`;
    inputFecha.setAttribute('min', fechaMin);
    inputFecha.setAttribute('max', fechaMax);
  }
}

// ============================================
// GUARDAR CABECERA (NUEVO REGISTRO)
// ============================================

async function guardarCabecera() {
  const numero = document.getElementById('numero').value.trim();
  const periodo = document.getElementById('periodo').value;
  const fecha = document.getElementById('fecha').value;
  const lugar = document.getElementById('lugar').value.trim();
  const involucrados = obtenerInvolucrados();
  const fatal = document.getElementById('fatal').value;
  const cantfall = document.getElementById('cantfall').value;
  const descripcion = document.getElementById('descripcion').value.trim();
  
  // Validaciones
  if (!numero || !periodo || !fecha || !lugar || !involucrados || !fatal || !descripcion) {
    alert('⚠️ Por favor complete todos los campos obligatorios');
    return;
  }
  
  // Validar fecha dentro del periodo
  const fechaObj = new Date(fecha);
  const añoFecha = fechaObj.getFullYear();
  if (añoFecha.toString() !== periodo) {
    alert(`⚠️ La fecha debe estar dentro del periodo ${periodo}`);
    return;
  }
  
  // Generar código
  const codigo = generarCodigoJIAT(numero, periodo);
  
  // Validar que no exista el código
  const existeCodigo = await validarCodigoJIAT(codigo, null);
  if (existeCodigo) {
    alert(`⚠️ Ya existe un JIAT con el número ${numero} y periodo ${periodo}`);
    return;
  }
  
  // Preparar datos
  const datos = {
    action: 'crearJIAT',
    CODIGO: codigo,
    TIPO: 'JIAT',
    NUMERO: numero,
    PERIODO: periodo,
    FECHA: fecha,
    LUGAR: lugar,
    INVOLUCRADO: involucrados,
    FATAL: fatal,
    CANTFALL: cantfall,
    DESCRIPCION: descripcion,
    UNIDAD: datosUsuario.unidad,
    USUARIOREG: datosUsuario.nombre,
    FECHAREG: new Date().toISOString()
  };
  
  mostrarOverlayCarga('Guardando datos principales...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    
    const result = await response.json();
    
    ocultarOverlayCarga();
    
    if (result.success) {
      cabeceraGuardada = true;
      codigoJIATActual = codigo;
      
      // Marcar como guardada
      const seccionCabecera = document.getElementById('seccionCabecera');
      seccionCabecera.classList.add('guardada');
      
      // Agregar badge de guardado
      const badge = document.createElement('div');
      badge.className = 'badge-guardado';
      badge.textContent = '✓ Guardado';
      seccionCabecera.appendChild(badge);
      
      // Deshabilitar botón
      document.getElementById('btnGuardarCabecera').disabled = true;
      
      // Desbloquear sección de detalles
      const seccionDetalles = document.getElementById('seccionDetalles');
      seccionDetalles.classList.remove('bloqueada');
      document.getElementById('mensajeBloqueo').style.display = 'none';
      document.getElementById('btnAgregarDetalle').disabled = false;
      
      alert('✅ Datos principales guardados correctamente. Ahora puede agregar conclusiones, causas y recomendaciones.');
    } else {
      alert('⚠️ Error al guardar: ' + (result.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al guardar los datos: ' + error.message);
  }
}

function generarCodigoJIAT(numero, periodo) {
  const numeroFormateado = numero.toString().padStart(3, '0');
  return `JIAT-${numeroFormateado}-${periodo}`;
}

async function validarCodigoJIAT(codigoNuevo, codigoActual) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'validarCodigoJIAT',
        codigoNuevo: codigoNuevo,
        codigoActual: codigoActual
      })
    });
    
    const result = await response.json();
    return result.existe;
  } catch (error) {
    console.error('Error al validar código:', error);
    return false;
  }
}

// ============================================
// AGREGAR Y GUARDAR DETALLES (NUEVO REGISTRO)
// ============================================

function agregarDetalle() {
  if (!cabeceraGuardada) {
    alert('⚠️ Primero debe guardar los datos principales');
    return;
  }
  
  const container = document.getElementById('detallesContainer');
  const detalleId = 'detalle_' + Date.now();
  
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item';
  detalleDiv.id = detalleId;
  detalleDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo">
        <strong>Nuevo Detalle</strong>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Subtipo <span class="required">*</span></label>
        <select class="detalle-subtipo" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN">Conclusión</option>
          <option value="CAUSA">Causa</option>
          <option value="RECOMENDACIÓN">Recomendación</option>
        </select>
      </div>
      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="detalle-caracter" required>
          <option value="">Seleccione</option>
          <option value="INMEDIATA">Inmediata</option>
          <option value="MEDIATA">Mediata</option>
          <option value="BÁSICA">Básica</option>
        </select>
      </div>
    </div>
    
    <div class="form-group">
      <label>Descripción <span class="required">*</span></label>
      <textarea class="detalle-descripcion" required rows="3"></textarea>
    </div>
    
    <button type="button" class="btn-guardar-detalle" onclick="guardarDetalle('${detalleId}')">💾 Guardar Detalle</button>
  `;
  
  container.appendChild(detalleDiv);
}

async function guardarDetalle(detalleId) {
  const detalleDiv = document.getElementById(detalleId);
  const subtipo = detalleDiv.querySelector('.detalle-subtipo').value;
  const caracter = detalleDiv.querySelector('.detalle-caracter').value;
  const descripcion = detalleDiv.querySelector('.detalle-descripcion').value.trim();
  
  if (!subtipo || !caracter || !descripcion) {
    alert('⚠️ Por favor complete todos los campos del detalle');
    return;
  }
  
  const datos = {
    action: 'crearDetalleJIAT',
    CODIGO: codigoJIATActual,
    TIPO: 'JIAT',
    SUBTIPO: subtipo,
    CARACTER: caracter,
    DESCRIPCION: descripcion,
    USUARIOREG: datosUsuario.nombre
  };
  
  mostrarOverlayCarga('Guardando detalle...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    
    const result = await response.json();
    
    ocultarOverlayCarga();
    
    if (result.success) {
      detalleDiv.classList.add('guardado');
      
      // Agregar badge
      const header = detalleDiv.querySelector('.detalle-item-header .detalle-titulo');
      const badge = document.createElement('span');
      badge.className = 'badge-guardado-detalle';
      badge.textContent = '✓ Guardado';
      header.appendChild(badge);
      
      // Deshabilitar campos
      detalleDiv.querySelector('.detalle-subtipo').disabled = true;
      detalleDiv.querySelector('.detalle-caracter').disabled = true;
      detalleDiv.querySelector('.detalle-descripcion').disabled = true;
      detalleDiv.querySelector('.btn-guardar-detalle').disabled = true;
      
      detallesGuardados.push(detalleId);
      
      alert('✅ Detalle guardado correctamente');
    } else {
      alert('⚠️ Error al guardar detalle: ' + (result.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al guardar el detalle: ' + error.message);
  }
}

// ============================================
// VER DETALLE COMPLETO
// ============================================

async function verDetalle(codigo) {
  mostrarOverlayCarga('Cargando detalle...');
  
  try {
    const response = await fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}`);
    const data = await response.json();
    
    ocultarOverlayCarga();
    
    if (data.success) {
      mostrarModalVerDetalle(data);
    } else {
      alert('⚠️ Error al cargar el detalle: ' + (data.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al cargar el detalle: ' + error.message);
  }
}

function mostrarModalVerDetalle(data) {
  const cabecera = data.cabecera;
  
  // Llenar información básica
  document.getElementById('verCodigo').textContent = cabecera.CODIGO || '-';
  document.getElementById('verFecha').textContent = cabecera.FECHA || '-';
  document.getElementById('verUnidad').textContent = cabecera.UNIDAD || '-';
  document.getElementById('verLugar').textContent = cabecera.LUGAR || '-';
  document.getElementById('verInvolucrado').textContent = cabecera.INVOLUCRADO || '-';
  document.getElementById('verFatal').textContent = cabecera.FATAL || '-';
  document.getElementById('verDescripcion').textContent = cabecera.DESCRIPCION || '-';
  
  // Mostrar conclusiones
  const seccionConclusiones = document.getElementById('verSeccionConclusiones');
  const listaConclusiones = document.getElementById('verListaConclusiones');
  if (data.conclusiones && data.conclusiones.length > 0) {
    seccionConclusiones.style.display = 'block';
    listaConclusiones.innerHTML = data.conclusiones.map(c => `
      <div class="detalle-item-readonly">
        <div class="detalle-item-readonly-header">
          <span class="detalle-item-readonly-tipo">Conclusión</span>
          <span class="detalle-item-readonly-caracter">${c.CARACTER || '-'}</span>
        </div>
        <div class="detalle-item-readonly-descripcion">${c.DESCRIPCION || '-'}</div>
      </div>
    `).join('');
  } else {
    seccionConclusiones.style.display = 'none';
  }
  
  // Mostrar causas
  const seccionCausas = document.getElementById('verSeccionCausas');
  const listaCausas = document.getElementById('verListaCausas');
  if (data.causas && data.causas.length > 0) {
    seccionCausas.style.display = 'block';
    listaCausas.innerHTML = data.causas.map(c => `
      <div class="detalle-item-readonly">
        <div class="detalle-item-readonly-header">
          <span class="detalle-item-readonly-tipo">Causa</span>
          <span class="detalle-item-readonly-caracter">${c.CARACTER || '-'}</span>
        </div>
        <div class="detalle-item-readonly-descripcion">${c.DESCRIPCION || '-'}</div>
      </div>
    `).join('');
  } else {
    seccionCausas.style.display = 'none';
  }
  
  // Mostrar recomendaciones
  const seccionRecomendaciones = document.getElementById('verSeccionRecomendaciones');
  const listaRecomendaciones = document.getElementById('verListaRecomendaciones');
  if (data.recomendaciones && data.recomendaciones.length > 0) {
    seccionRecomendaciones.style.display = 'block';
    listaRecomendaciones.innerHTML = data.recomendaciones.map(r => `
      <div class="detalle-item-readonly">
        <div class="detalle-item-readonly-header">
          <span class="detalle-item-readonly-tipo">Recomendación</span>
          <span class="detalle-item-readonly-caracter">${r.CARACTER || '-'}</span>
        </div>
        <div class="detalle-item-readonly-descripcion">${r.DESCRIPCION || '-'}</div>
      </div>
    `).join('');
  } else {
    seccionRecomendaciones.style.display = 'none';
  }
  
  // Mostrar acciones tomadas
  const seccionAcciones = document.getElementById('verSeccionAcciones');
  const listaAcciones = document.getElementById('verListaAcciones');
  if (data.acciones && data.acciones.length > 0) {
    seccionAcciones.style.display = 'block';
    listaAcciones.innerHTML = data.acciones.map(a => `
      <div class="accion-registrada">
        <div class="accion-registrada-header">
          <span class="accion-registrada-fecha">📅 ${a.FECHA || '-'}</span>
          <span class="accion-registrada-caracter">${a.CARACTER || '-'}</span>
        </div>
        <div class="accion-registrada-descripcion">${a.DESCRIPCION || '-'}</div>
      </div>
    `).join('');
  } else {
    seccionAcciones.style.display = 'none';
  }
  
  document.getElementById('modalVerDetalle').style.display = 'block';
}

function cerrarModalVerDetalle() {
  document.getElementById('modalVerDetalle').style.display = 'none';
}

// ============================================
// ACCIONES TOMADAS
// ============================================

async function abrirModalAcciones(codigo) {
  mostrarOverlayCarga('Cargando información...');
  
  try {
    const response = await fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}`);
    const data = await response.json();
    
    ocultarOverlayCarga();
    
    if (data.success) {
      mostrarModalAcciones(data);
    } else {
      alert('⚠️ Error al cargar información: ' + (data.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al cargar información: ' + error.message);
  }
}

function mostrarModalAcciones(data) {
  const cabecera = data.cabecera;
  codigoJIATActual = cabecera.CODIGO;
  
  // Llenar información del JIAT
  document.getElementById('infoCodigo').textContent = cabecera.CODIGO || '-';
  document.getElementById('infoFecha').textContent = cabecera.FECHA || '-';
  document.getElementById('infoUnidad').textContent = cabecera.UNIDAD || '-';
  document.getElementById('infoLugar').textContent = cabecera.LUGAR || '-';
  document.getElementById('infoInvolucrado').textContent = cabecera.INVOLUCRADO || '-';
  document.getElementById('infoFatal').textContent = cabecera.FATAL || '-';
  document.getElementById('infoDescripcion').textContent = cabecera.DESCRIPCION || '-';
  
  // Mostrar conclusiones
  const seccionConclusiones = document.getElementById('detallesConclusiones');
  const listaConclusiones = document.getElementById('listaConclusiones');
  if (data.conclusiones && data.conclusiones.length > 0) {
    seccionConclusiones.style.display = 'block';
    listaConclusiones.innerHTML = data.conclusiones.map(c => 
      `<li><strong>${c.CARACTER || '-'}:</strong> ${c.DESCRIPCION || '-'}</li>`
    ).join('');
  } else {
    seccionConclusiones.style.display = 'none';
  }
  
  // Mostrar causas
  const seccionCausas = document.getElementById('detallesCausas');
  const listaCausas = document.getElementById('listaCausas');
  if (data.causas && data.causas.length > 0) {
    seccionCausas.style.display = 'block';
    listaCausas.innerHTML = data.causas.map(c => 
      `<li><strong>${c.CARACTER || '-'}:</strong> ${c.DESCRIPCION || '-'}</li>`
    ).join('');
  } else {
    seccionCausas.style.display = 'none';
  }
  
  // Mostrar recomendaciones
  const seccionRecomendaciones = document.getElementById('detallesRecomendaciones');
  const listaRecomendaciones = document.getElementById('listaRecomendaciones');
  if (data.recomendaciones && data.recomendaciones.length > 0) {
    seccionRecomendaciones.style.display = 'block';
    listaRecomendaciones.innerHTML = data.recomendaciones.map(r => 
      `<li><strong>${r.CARACTER || '-'}:</strong> ${r.DESCRIPCION || '-'}</li>`
    ).join('');
  } else {
    seccionRecomendaciones.style.display = 'none';
  }
  
  // Mostrar acciones ya registradas
  const seccionAccionesRegistradas = document.getElementById('seccionAccionesRegistradas');
  const listaAccionesRegistradas = document.getElementById('listaAccionesRegistradas');
  if (data.acciones && data.acciones.length > 0) {
    seccionAccionesRegistradas.style.display = 'block';
    listaAccionesRegistradas.innerHTML = data.acciones.map(a => `
      <div class="accion-registrada">
        <div class="accion-registrada-header">
          <span class="accion-registrada-fecha">📅 ${a.FECHA || '-'}</span>
          <span class="accion-registrada-caracter">${a.CARACTER || '-'}</span>
        </div>
        <div class="accion-registrada-descripcion">${a.DESCRIPCION || '-'}</div>
      </div>
    `).join('');
  } else {
    seccionAccionesRegistradas.style.display = 'none';
  }
  
  // Limpiar contenedor de nuevas acciones
  document.getElementById('accionesContainer').innerHTML = '';
  
  document.getElementById('modalAcciones').style.display = 'block';
}

function agregarAccionTomada() {
  const container = document.getElementById('accionesContainer');
  const accionId = 'accion_' + Date.now();
  
  const accionDiv = document.createElement('div');
  accionDiv.className = 'accion-item';
  accionDiv.id = accionId;
  accionDiv.innerHTML = `
    <div class="accion-item-header">
      <span class="accion-titulo">Nueva Acción Tomada</span>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Fecha <span class="required">*</span></label>
        <input type="date" class="accion-fecha" required>
      </div>
      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="accion-caracter" required>
          <option value="">Seleccione</option>
          <option value="INMEDIATA">Inmediata</option>
          <option value="MEDIATA">Mediata</option>
          <option value="BÁSICA">Básica</option>
        </select>
      </div>
    </div>
    
    <div class="form-group">
      <label>Descripción de la Acción <span class="required">*</span></label>
      <textarea class="accion-descripcion" required rows="3"></textarea>
    </div>
    
    <button type="button" class="btn-guardar-accion" onclick="guardarAccionTomada('${accionId}')">💾 Guardar Acción</button>
  `;
  
  container.appendChild(accionDiv);
}

async function guardarAccionTomada(accionId) {
  const accionDiv = document.getElementById(accionId);
  const fecha = accionDiv.querySelector('.accion-fecha').value;
  const caracter = accionDiv.querySelector('.accion-caracter').value;
  const descripcion = accionDiv.querySelector('.accion-descripcion').value.trim();
  
  if (!fecha || !caracter || !descripcion) {
    alert('⚠️ Por favor complete todos los campos de la acción');
    return;
  }
  
  const datos = {
    action: 'crearDetalleJIAT',
    CODIGO: codigoJIATActual,
    TIPO: 'JIAT',
    SUBTIPO: 'ACCIÓN TOMADA',
    CARACTER: caracter,
    FECHA: fecha,
    DESCRIPCION: descripcion,
    USUARIOREG: datosUsuario.nombre
  };
  
  mostrarOverlayCarga('Guardando acción...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    
    const result = await response.json();
    
    ocultarOverlayCarga();
    
    if (result.success) {
      accionDiv.classList.add('guardado');
      
      // Agregar badge
      const header = accionDiv.querySelector('.accion-item-header .accion-titulo');
      const badge = document.createElement('span');
      badge.className = 'badge-guardado-accion';
      badge.textContent = '✓ Guardado';
      header.appendChild(badge);
      
      // Deshabilitar campos
      accionDiv.querySelector('.accion-fecha').disabled = true;
      accionDiv.querySelector('.accion-caracter').disabled = true;
      accionDiv.querySelector('.accion-descripcion').disabled = true;
      accionDiv.querySelector('.btn-guardar-accion').disabled = true;
      
      alert('✅ Acción guardada correctamente');
    } else {
      alert('⚠️ Error al guardar acción: ' + (result.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al guardar la acción: ' + error.message);
  }
}

function cerrarModalAcciones() {
  document.getElementById('modalAcciones').style.display = 'none';
  cargarRegistrosJIAT();
}

// ============================================
// EDITAR REGISTRO
// ============================================

let datosEdicionOriginales = {};
let detallesParaEliminar = [];
let accionesParaEliminar = [];

async function editarRegistro(codigo) {
  mostrarOverlayCarga('Cargando datos...');
  
  try {
    const response = await fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}`);
    const data = await response.json();
    
    ocultarOverlayCarga();
    
    if (data.success) {
      mostrarModalEditar(data);
    } else {
      alert('⚠️ Error al cargar datos: ' + (data.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al cargar datos: ' + error.message);
  }
}

function mostrarModalEditar(data) {
  const cabecera = data.cabecera;
  datosEdicionOriginales = { ...cabecera };
  detallesParaEliminar = [];
  accionesParaEliminar = [];
  
  // Guardar código actual
  document.getElementById('editCodigoActual').value = cabecera.CODIGO;
  
  // Extraer número y periodo del código
  const partesCodeigo = cabecera.CODIGO.split('-');
  const numero = parseInt(partesCodeigo[1]);
  const periodo = partesCodeigo[2];
  
  // Llenar formulario de cabecera
  document.getElementById('editNumero').value = numero;
  document.getElementById('editPeriodo').value = periodo;
  document.getElementById('editFecha').value = convertirFechaParaInput(cabecera.FECHA);
  document.getElementById('editLugar').value = cabecera.LUGAR || '';
  document.getElementById('editInvolucrado').value = cabecera.INVOLUCRADO || '';
  document.getElementById('editFatal').value = cabecera.FATAL || '';
  document.getElementById('editCantfall').value = cabecera.CANTFALL || 0;
  document.getElementById('editDescripcion').value = cabecera.DESCRIPCION || '';
  
  // Configurar listeners para campos sensibles
  document.getElementById('editNumero').addEventListener('input', mostrarAdvertenciaCodigo);
  document.getElementById('editPeriodo').addEventListener('change', mostrarAdvertenciaCodigo);
  
  // Bloquear sección de detalles inicialmente
  const seccionDetalles = document.getElementById('editSeccionDetalles');
  const seccionAcciones = document.getElementById('editSeccionAcciones');
  seccionDetalles.classList.add('bloqueada');
  seccionAcciones.classList.add('bloqueada');
  document.getElementById('mensajeBloqueoEdit').style.display = 'block';
  document.getElementById('btnAgregarDetalleEdit').disabled = true;
  
  document.getElementById('modalEditar').style.display = 'block';
}

function mostrarAdvertenciaCodigo() {
  const codigoActual = document.getElementById('editCodigoActual').value;
  const numeroNuevo = document.getElementById('editNumero').value;
  const periodoNuevo = document.getElementById('editPeriodo').value;
  
  if (!numeroNuevo || !periodoNuevo) return;
  
  const codigoNuevo = generarCodigoJIAT(numeroNuevo, periodoNuevo);
  
  if (codigoActual !== codigoNuevo) {
    // Contar detalles y acciones que se actualizarán
    const advertenciaDiv = document.getElementById('advertenciaCodigo');
    const textoDiv = document.getElementById('textoAdvertencia');
    
    textoDiv.innerHTML = `
      Al cambiar el Número o Periodo se generará un nuevo código:<br><br>
      <strong>Código actual:</strong> ${codigoActual}<br>
      <strong>Código nuevo:</strong> ${codigoNuevo}<br><br>
      Esto actualizará el código en <strong>todos los detalles y acciones asociados</strong> a este JIAT.
    `;
    
    advertenciaDiv.style.display = 'block';
  } else {
    document.getElementById('advertenciaCodigo').style.display = 'none';
  }
}

async function guardarCabeceraEdicion() {
  const codigoActual = document.getElementById('editCodigoActual').value;
  const numeroNuevo = document.getElementById('editNumero').value.trim();
  const periodoNuevo = document.getElementById('editPeriodo').value;
  const fecha = document.getElementById('editFecha').value;
  const lugar = document.getElementById('editLugar').value.trim();
  const involucrado = document.getElementById('editInvolucrado').value.trim();
  const fatal = document.getElementById('editFatal').value;
  const cantfall = document.getElementById('editCantfall').value;
  const descripcion = document.getElementById('editDescripcion').value.trim();
  
  // Validaciones
  if (!numeroNuevo || !periodoNuevo || !fecha || !lugar || !involucrado || !fatal || !descripcion) {
    alert('⚠️ Por favor complete todos los campos obligatorios');
    return;
  }
  
  // Generar nuevo código
  const codigoNuevo = generarCodigoJIAT(numeroNuevo, periodoNuevo);
  const cambioEnCodigo = codigoActual !== codigoNuevo;
  
  // Si cambió el código, validar que no exista
  if (cambioEnCodigo) {
    const existeCodigo = await validarCodigoJIAT(codigoNuevo, codigoActual);
    if (existeCodigo) {
      alert(`⚠️ Ya existe un JIAT con el número ${numeroNuevo} y periodo ${periodoNuevo}`);
      return;
    }
    
    // Confirmar actualización en cascada
    if (!confirm(`⚠️ ADVERTENCIA:\n\nSe actualizará el código de ${codigoActual} a ${codigoNuevo}\n\nEsto actualizará TODOS los detalles y acciones asociados.\n\n¿Desea continuar?`)) {
      return;
    }
  }
  
  // Preparar datos
  const datos = {
    action: 'editarCabeceraJIAT',
    codigoActual: codigoActual,
    codigoNuevo: codigoNuevo,
    CODIGO: codigoNuevo,
    TIPO: 'JIAT',
    NUMERO: numeroNuevo,
    PERIODO: periodoNuevo,
    FECHA: fecha,
    LUGAR: lugar,
    INVOLUCRADO: involucrado,
    FATAL: fatal,
    CANTFALL: cantfall,
    DESCRIPCION: descripcion,
    UNIDAD: datosUsuario.unidad,
    USUARIOREG: datosUsuario.nombre
  };
  
  mostrarOverlayCarga(cambioEnCodigo ? 'Actualizando código en todo el sistema...' : 'Guardando cambios...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    
    const result = await response.json();
    
    ocultarOverlayCarga();
    
    if (result.success) {
      // Actualizar código actual
      document.getElementById('editCodigoActual').value = codigoNuevo;
      codigoJIATActual = codigoNuevo;
      
      // Marcar como guardada
      const seccionCabecera = document.getElementById('editSeccionCabecera');
      seccionCabecera.classList.add('guardada');
      
      // Deshabilitar botón
      document.getElementById('btnGuardarCabeceraEdit').disabled = true;
      
      // Desbloquear secciones de detalles y acciones
      const seccionDetalles = document.getElementById('editSeccionDetalles');
      const seccionAcciones = document.getElementById('editSeccionAcciones');
      seccionDetalles.classList.remove('bloqueada');
      seccionAcciones.classList.remove('bloqueada');
      document.getElementById('mensajeBloqueoEdit').style.display = 'none';
      document.getElementById('btnAgregarDetalleEdit').disabled = false;
      
      // Cargar detalles y acciones existentes
      await cargarDetallesEdicion(codigoNuevo);
      await cargarAccionesEdicion(codigoNuevo);
      
      let mensaje = '✅ Cabecera actualizada correctamente.';
      if (cambioEnCodigo) {
        mensaje += `\n\n📝 Código actualizado de ${codigoActual} a ${codigoNuevo}`;
        mensaje += `\n✅ ${result.registrosActualizados || 0} detalles/acciones actualizados`;
      }
      
      alert(mensaje);
    } else {
      alert('⚠️ Error al actualizar: ' + (result.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al actualizar la cabecera: ' + error.message);
  }
}

async function cargarDetallesEdicion(codigo) {
  try {
    const response = await fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}`);
    const data = await response.json();
    
    if (data.success) {
      const container = document.getElementById('editDetallesContainer');
      container.innerHTML = '';
      
      const todosDetalles = [
        ...(data.conclusiones || []),
        ...(data.causas || []),
        ...(data.recomendaciones || [])
      ];
      
      todosDetalles.forEach(detalle => {
        const detalleDiv = document.createElement('div');
        detalleDiv.className = 'detalle-item-editable';
        detalleDiv.id = 'edit_detalle_' + detalle.ID_DETALLE;
        detalleDiv.innerHTML = `
          <div class="detalle-item-editable-header">
            <span class="detalle-item-editable-titulo">${detalle.SUBTIPO || '-'}</span>
            <button type="button" class="btn-eliminar-detalle" onclick="marcarDetalleParaEliminar('${detalle.ID_DETALLE}')">🗑️ Eliminar</button>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Subtipo</label>
              <select class="detalle-subtipo">
                <option value="CONCLUSIÓN" ${detalle.SUBTIPO === 'CONCLUSIÓN' ? 'selected' : ''}>Conclusión</option>
                <option value="CAUSA" ${detalle.SUBTIPO === 'CAUSA' ? 'selected' : ''}>Causa</option>
                <option value="RECOMENDACIÓN" ${detalle.SUBTIPO === 'RECOMENDACIÓN' ? 'selected' : ''}>Recomendación</option>
              </select>
            </div>
            <div class="form-group">
              <label>Carácter</label>
              <select class="detalle-caracter">
                <option value="INMEDIATA" ${detalle.CARACTER === 'INMEDIATA' ? 'selected' : ''}>Inmediata</option>
                <option value="MEDIATA" ${detalle.CARACTER === 'MEDIATA' ? 'selected' : ''}>Mediata</option>
                <option value="BÁSICA" ${detalle.CARACTER === 'BÁSICA' ? 'selected' : ''}>Básica</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Descripción</label>
            <textarea class="detalle-descripcion" rows="3">${detalle.DESCRIPCION || ''}</textarea>
          </div>
          
          <input type="hidden" class="detalle-id" value="${detalle.ID_DETALLE}">
        `;
        
        container.appendChild(detalleDiv);
      });
    }
  } catch (error) {
    console.error('Error al cargar detalles:', error);
  }
}

async function cargarAccionesEdicion(codigo) {
  try {
    const response = await fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}`);
    const data = await response.json();
    
    if (data.success) {
      const container = document.getElementById('editAccionesContainer');
      container.innerHTML = '';
      
      if (data.acciones && data.acciones.length > 0) {
        data.acciones.forEach(accion => {
          const accionDiv = document.createElement('div');
          accionDiv.className = 'detalle-item-editable';
          accionDiv.id = 'edit_accion_' + accion.ID_DETALLE;
          accionDiv.innerHTML = `
            <div class="detalle-item-editable-header">
              <span class="detalle-item-editable-titulo">Acción Tomada</span>
              <button type="button" class="btn-eliminar-detalle" onclick="marcarAccionParaEliminar('${accion.ID_DETALLE}')">🗑️ Eliminar</button>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Fecha</label>
                <input type="date" class="accion-fecha" value="${convertirFechaParaInput(accion.FECHA)}">
              </div>
              <div class="form-group">
                <label>Carácter</label>
                <select class="accion-caracter">
                  <option value="INMEDIATA" ${accion.CARACTER === 'INMEDIATA' ? 'selected' : ''}>Inmediata</option>
                  <option value="MEDIATA" ${accion.CARACTER === 'MEDIATA' ? 'selected' : ''}>Mediata</option>
                  <option value="BÁSICA" ${accion.CARACTER === 'BÁSICA' ? 'selected' : ''}>Básica</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Descripción</label>
              <textarea class="accion-descripcion" rows="3">${accion.DESCRIPCION || ''}</textarea>
            </div>
            
            <input type="hidden" class="accion-id" value="${accion.ID_DETALLE}">
          `;
          
          container.appendChild(accionDiv);
        });
      } else {
        container.innerHTML = '<p style="text-align:center; color:#666;">No hay acciones tomadas registradas.</p>';
      }
    }
  } catch (error) {
    console.error('Error al cargar acciones:', error);
  }
}

function marcarDetalleParaEliminar(idDetalle) {
  if (!confirm('¿Está seguro de eliminar este detalle?')) return;
  
  const detalleDiv = document.getElementById('edit_detalle_' + idDetalle);
  detalleDiv.classList.add('eliminado');
  
  const header = detalleDiv.querySelector('.detalle-item-editable-header .detalle-item-editable-titulo');
  const badge = document.createElement('span');
  badge.className = 'badge-eliminado';
  badge.textContent = 'Marcado para eliminar';
  header.appendChild(badge);
  
  detalleDiv.querySelector('.btn-eliminar-detalle').disabled = true;
  
  detallesParaEliminar.push(idDetalle);
}

function marcarAccionParaEliminar(idDetalle) {
  if (!confirm('¿Está seguro de eliminar esta acción?')) return;
  
  const accionDiv = document.getElementById('edit_accion_' + idDetalle);
  accionDiv.classList.add('eliminado');
  
  const header = accionDiv.querySelector('.detalle-item-editable-header .detalle-item-editable-titulo');
  const badge = document.createElement('span');
  badge.className = 'badge-eliminado';
  badge.textContent = 'Marcado para eliminar';
  header.appendChild(badge);
  
  accionDiv.querySelector('.btn-eliminar-detalle').disabled = true;
  
  accionesParaEliminar.push(idDetalle);
}

function agregarDetalleEdicion() {
  const container = document.getElementById('editDetallesContainer');
  const detalleId = 'nuevo_detalle_' + Date.now();
  
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item-editable detalle-nuevo';
  detalleDiv.id = detalleId;
  detalleDiv.innerHTML = `
    <div class="detalle-item-editable-header">
      <span class="detalle-item-editable-titulo">Nuevo Detalle<span class="badge-nuevo">NUEVO</span></span>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Subtipo <span class="required">*</span></label>
        <select class="detalle-subtipo" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN">Conclusión</option>
          <option value="CAUSA">Causa</option>
          <option value="RECOMENDACIÓN">Recomendación</option>
        </select>
      </div>
      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="detalle-caracter" required>
          <option value="">Seleccione</option>
          <option value="INMEDIATA">Inmediata</option>
          <option value="MEDIATA">Mediata</option>
          <option value="BÁSICA">Básica</option>
        </select>
      </div>
    </div>
    
    <div class="form-group">
      <label>Descripción <span class="required">*</span></label>
      <textarea class="detalle-descripcion" required rows="3"></textarea>
    </div>
    
    <input type="hidden" class="detalle-id" value="NUEVO">
  `;
  
  container.appendChild(detalleDiv);
}

async function guardarDetallesYAccionesEditados() {
  mostrarOverlayCarga('Guardando cambios...');
  
  try {
    // 1. Eliminar detalles marcados
    for (const idDetalle of detallesParaEliminar) {
      await eliminarDetalle(idDetalle);
    }
    
    // 2. Eliminar acciones marcadas
    for (const idDetalle of accionesParaEliminar) {
      await eliminarDetalle(idDetalle);
    }
    
    // 3. Actualizar detalles existentes
    const detallesExistentes = document.querySelectorAll('#editDetallesContainer .detalle-item-editable:not(.eliminado):not(.detalle-nuevo)');
    for (const detalleDiv of detallesExistentes) {
      const idDetalle = detalleDiv.querySelector('.detalle-id').value;
      const subtipo = detalleDiv.querySelector('.detalle-subtipo').value;
      const caracter = detalleDiv.querySelector('.detalle-caracter').value;
      const descripcion = detalleDiv.querySelector('.detalle-descripcion').value.trim();
      
      if (subtipo && caracter && descripcion) {
        await actualizarDetalle(idDetalle, subtipo, caracter, descripcion);
      }
    }
    
    // 4. Crear nuevos detalles
    const detallesNuevos = document.querySelectorAll('#editDetallesContainer .detalle-nuevo');
    for (const detalleDiv of detallesNuevos) {
      const subtipo = detalleDiv.querySelector('.detalle-subtipo').value;
      const caracter = detalleDiv.querySelector('.detalle-caracter').value;
      const descripcion = detalleDiv.querySelector('.detalle-descripcion').value.trim();
      
      if (subtipo && caracter && descripcion) {
        await crearNuevoDetalle(subtipo, caracter, descripcion);
      }
    }
    
    // 5. Actualizar acciones existentes
    const accionesExistentes = document.querySelectorAll('#editAccionesContainer .detalle-item-editable:not(.eliminado)');
    for (const accionDiv of accionesExistentes) {
      const idDetalle = accionDiv.querySelector('.accion-id').value;
      const fecha = accionDiv.querySelector('.accion-fecha').value;
      const caracter = accionDiv.querySelector('.accion-caracter').value;
      const descripcion = accionDiv.querySelector('.accion-descripcion').value.trim();
      
      if (fecha && caracter && descripcion) {
        await actualizarAccion(idDetalle, fecha, caracter, descripcion);
      }
    }
    
    ocultarOverlayCarga();
    alert('✅ Todos los cambios se han guardado correctamente');
    cerrarModalEditar();
    cargarRegistrosJIAT();
    
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al guardar los cambios: ' + error.message);
  }
}

async function eliminarDetalle(idDetalle) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'eliminarDetalleJIAT',
      ID_DETALLE: idDetalle
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error('Error al eliminar detalle: ' + result.error);
  }
}

async function actualizarDetalle(idDetalle, subtipo, caracter, descripcion) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'actualizarDetalleJIAT',
      ID_DETALLE: idDetalle,
      SUBTIPO: subtipo,
      CARACTER: caracter,
      DESCRIPCION: descripcion
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error('Error al actualizar detalle: ' + result.error);
  }
}

async function actualizarAccion(idDetalle, fecha, caracter, descripcion) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'actualizarDetalleJIAT',
      ID_DETALLE: idDetalle,
      FECHA: fecha,
      CARACTER: caracter,
      DESCRIPCION: descripcion
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error('Error al actualizar acción: ' + result.error);
  }
}

async function crearNuevoDetalle(subtipo, caracter, descripcion) {
  const response = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'crearDetalleJIAT',
      CODIGO: codigoJIATActual,
      TIPO: 'JIAT',
      SUBTIPO: subtipo,
      CARACTER: caracter,
      DESCRIPCION: descripcion,
      USUARIOREG: datosUsuario.nombre
    })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error('Error al crear nuevo detalle: ' + result.error);
  }
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
  cargarRegistrosJIAT();
}

// ============================================
// ELIMINAR REGISTRO
// ============================================

async function eliminarRegistro(codigo) {
  if (!confirm(`⚠️ ¿Está seguro de eliminar el JIAT ${codigo}?\n\nEsta acción NO se puede deshacer.`)) {
    return;
  }
  
  mostrarOverlayCarga('Eliminando registro...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'eliminarJIAT',
        CODIGO: codigo
      })
    });
    
    const result = await response.json();
    
    ocultarOverlayCarga();
    
    if (result.success) {
      alert('✅ Registro eliminado correctamente');
      cargarRegistrosJIAT();
    } else {
      alert('⚠️ Error al eliminar: ' + (result.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlayCarga();
    console.error('Error:', error);
    alert('⚠️ Error al eliminar el registro: ' + error.message);
  }
}

// ============================================
// UTILIDADES
// ============================================

function convertirFechaParaInput(fechaStr) {
  if (!fechaStr) return '';
  
  // Si la fecha viene en formato dd/MM/yyyy
  if (fechaStr.includes('/')) {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
  }
  
  // Si la fecha ya está en formato yyyy-MM-dd
  return fechaStr;
}

function mostrarOverlayCarga(mensaje) {
  const overlay = document.getElementById('overlayGlobal');
  const mensajeCarga = document.getElementById('mensajeCarga');
  mensajeCarga.textContent = mensaje;
  overlay.style.display = 'flex';
}

function ocultarOverlayCarga() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
  const modalNuevo = document.getElementById('modalNuevo');
  const modalAcciones = document.getElementById('modalAcciones');
  const modalVerDetalle = document.getElementById('modalVerDetalle');
  const modalEditar = document.getElementById('modalEditar');
  
  if (event.target === modalNuevo) {
    cerrarModalCompleto();
  }
  if (event.target === modalAcciones) {
    cerrarModalAcciones();
  }
  if (event.target === modalVerDetalle) {
    cerrarModalVerDetalle();
  }
  if (event.target === modalEditar) {
    cerrarModalEditar();
  }
};
