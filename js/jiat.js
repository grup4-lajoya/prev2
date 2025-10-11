// ============================================
// JIAT.JS - VERSIÓN MEJORADA CON VALIDACIONES DE SEGURIDAD
// ============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxIeRDr8R2JAQ39AlFW4f8hOrhMmvaJvuAOGwfOurjmUKn57xdXQ8t-70WweSkAorwy/exec';

let datosCompletos = [];
let datosFiltrados = [];
let paginaActual = 1;
const registrosPorPagina = 10;
let contadorDetalles = 0;
let cabeceraGuardada = false;
let codigoJIATActual = null;
let fechaJIATActual = null;
let periodoJIATActual = null;

// Variables para acciones tomadas
let contadorAcciones = 0;
let codigoJIATAcciones = null;
let periodoJIATAcciones = null;

// Variables para edición
let contadorDetallesEdicion = 0;
let contadorAccionesEdicion = 0;
let cabeceraEdicionGuardada = false;
let codigoActualEdicion = null;

const usuario = localStorage.getItem("usuario") || "";
const unidad = localStorage.getItem("unidad") || "";
const rol = localStorage.getItem("rol") || "";

if (!usuario) {
  window.location.replace("login.html");
}

window.onload = function() {
  cargarPeriodos();
  cargarDatosExcel();
};

// ============================================
// FUNCIONES DE INICIALIZACIÓN
// ============================================

function cargarPeriodos() {
  const select = document.getElementById('periodo');
  const añoActual = new Date().getFullYear();
  
  for (let i = añoActual; i >= añoActual - 30; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    select.appendChild(option);
  }
}

function actualizarRangoFechas() {
  const periodo = document.getElementById('periodo').value;
  const inputFecha = document.getElementById('fecha');
  
  if (periodo) {
    inputFecha.min = `${periodo}-01-01`;
    inputFecha.max = `${periodo}-12-31`;
    inputFecha.value = '';
  }
}

// ============================================
// FUNCIONES DE INVOLUCRADOS
// ============================================

function agregarInvolucrado() {
  const container = document.getElementById('involucradosContainer');
  const nuevoItem = document.createElement('div');
  nuevoItem.className = 'involucrado-item';
  nuevoItem.innerHTML = `
    <input type="text" class="involucrado-input" placeholder="Nombre del involucrado" required>
    <button type="button" class="btn-quitar" onclick="quitarInvolucrado(this)">×</button>
  `;
  container.appendChild(nuevoItem);
}

function quitarInvolucrado(btn) {
  btn.parentElement.remove();
}

// ============================================
// GUARDAR CABECERA (NUEVO REGISTRO) CON VALIDACIÓN
// ============================================

async function guardarCabecera() {
  const form = document.getElementById('formNuevo');
  
  const numero = document.getElementById('numero').value;
  const periodo = document.getElementById('periodo').value;
  const fecha = document.getElementById('fecha').value;
  const lugar = document.getElementById('lugar').value;
  const fatal = document.getElementById('fatal').value;
  const cantfall = document.getElementById('cantfall').value;
  const descripcion = document.getElementById('descripcion').value;

  if (!numero || !periodo || !fecha || !lugar || !fatal || !descripcion) {
    alert('Por favor complete todos los campos obligatorios');
    return;
  }

  const involucradosInputs = document.querySelectorAll('.involucrado-input');
  const involucrados = Array.from(involucradosInputs)
    .map(input => input.value.trim())
    .filter(val => val !== '')
    .join(', ');

  if (!involucrados) {
    alert('Debe agregar al menos un involucrado');
    return;
  }

  const btnGuardar = document.getElementById('btnGuardarCabecera');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Validando...';

  // VALIDACIÓN: Verificar que el número sea único en la unidad
  try {
    const validacion = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'validarNumeroJIAT',
        numero: numero,
        periodo: periodo,
        unidad: unidad
      })
    });

    const resultValidacion = await validacion.json();

    if (resultValidacion.existe) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar y Continuar';
      alert(`⚠️ ${resultValidacion.mensaje}`);
      return;
    }

  } catch (error) {
    console.error('Error al validar:', error);
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    alert('Error al validar el número de JIAT');
    return;
  }

  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Guardando datos principales...');

  try {
    const numeroFormateado = numero.padStart(3, '0');
    const codigo = `JIAT-${numeroFormateado}-${periodo}`;
    codigoJIATActual = codigo;
    fechaJIATActual = fecha;
    periodoJIATActual = periodo;

    const datosJIAT = {
      action: 'crearJIAT',
      USUARIOREG: usuario,
      TIPO: 'JIAT',
      NUMERO: numero,
      PERIODO: periodo,
      CODIGO: codigo,
      UNIDAD: unidad,
      FECHA: fecha,
      LUGAR: lugar,
      INVOLUCRADO: involucrados,
      FATAL: fatal,
      CANTFALL: cantfall,
      DESCRIPCION: descripcion
    };

    console.log("Enviando datos JIAT:", datosJIAT);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datosJIAT)
    });

    const result = await response.json();
    console.log("Respuesta del servidor:", result);

    ocultarOverlay();

    if (result.success) {
      cabeceraGuardada = true;
      
      const seccionCabecera = document.getElementById('seccionCabecera');
      seccionCabecera.classList.add('guardada');
      seccionCabecera.innerHTML += '<span class="badge-guardado">✓ Guardado</span>';
      
      document.querySelectorAll('#seccionCabecera input, #seccionCabecera select, #seccionCabecera textarea, #seccionCabecera button').forEach(el => {
        el.disabled = true;
      });

      const seccionDetalles = document.getElementById('seccionDetalles');
      seccionDetalles.classList.remove('bloqueada');
      document.getElementById('mensajeBloqueo').style.display = 'none';
      document.getElementById('btnAgregarDetalle').disabled = false;

      alert(`✓ Datos principales guardados correctamente.\nCódigo: ${codigo}\n\nAhora puede agregar conclusiones, causas y recomendaciones.`);
    } else {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar y Continuar';
      alert('Error al guardar: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    alert('Error al guardar los datos principales: ' + error.message);
  }
}

// ============================================
// FUNCIONES DE DETALLES (NUEVO REGISTRO)
// ============================================

function agregarDetalle() {
  if (!cabeceraGuardada) {
    alert('Primero debe guardar los datos principales');
    return;
  }

  contadorDetalles++;
  const container = document.getElementById('detallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item';
  detalleDiv.id = `detalle-${contadorDetalles}`;
  detalleDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo">
        <strong>Detalle #${contadorDetalles}</strong>
      </div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarDetalle(${contadorDetalles})" id="btnGuardarDet${contadorDetalles}">
          💾 Guardar
        </button>
        <button type="button" class="btn-quitar" onclick="quitarDetalle(${contadorDetalles})">× Quitar</button>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Asunto <span class="required">*</span></label>
        <select class="detalle-subtipo" id="subtipo${contadorDetalles}" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN">CONCLUSIÓN</option>
          <option value="CAUSA">CAUSA</option>
          <option value="RECOMENDACIÓN">RECOMENDACIÓN</option>
        </select>
      </div>

      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="detalle-caracter" id="caracter${contadorDetalles}" required>
          <option value="">Seleccione</option>
          <option value="PSICOFÍSICO">PSICOFÍSICO</option>
          <option value="TÉCNICO">TÉCNICO</option>
          <option value="OPERATIVO">OPERATIVO</option>
          <option value="PSICOLÓGICO">PSICOLÓGICO</option>
          <option value="SALUD">SALUD</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label>Descripción <span class="required">*</span></label>
      <textarea class="detalle-descripcion" id="descripcionDet${contadorDetalles}" required placeholder="Describa la conclusión, causa o recomendación..."></textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

async function guardarDetalle(id) {
  const subtipo = document.getElementById(`subtipo${id}`).value;
  const caracter = document.getElementById(`caracter${id}`).value;
  const descripcionDet = document.getElementById(`descripcionDet${id}`).value;

  if (!subtipo || !caracter || !descripcionDet) {
    alert('Por favor complete todos los campos del detalle');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarDet${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Guardando detalle...');

  try {
    const datosDetalle = {
      action: 'crearDetalleJIAT',
      USUARIOREG: usuario,
      UNIDAD: unidad,
      TIPO: 'JIAT',
      CODIGO: codigoJIATActual,
      SUBTIPO: subtipo,
      FECHA: fechaJIATActual,
      PERIODO: periodoJIATActual,
      CARACTER: caracter,
      DESCRIPCION: descripcionDet
    };

    console.log("Enviando detalle:", datosDetalle);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datosDetalle)
    });

    const result = await response.json();
    console.log("Respuesta del servidor:", result);

    ocultarOverlay();

    if (result.success) {
      const detalleDiv = document.getElementById(`detalle-${id}`);
      detalleDiv.classList.add('guardado');
      
      const titulo = detalleDiv.querySelector('.detalle-titulo');
      titulo.innerHTML += ' <span class="badge-guardado-detalle">✓ Guardado</span>';
      
      document.getElementById(`subtipo${id}`).disabled = true;
      document.getElementById(`caracter${id}`).disabled = true;
      document.getElementById(`descripcionDet${id}`).disabled = true;
      btnGuardar.style.display = 'none';

      console.log('✓ Detalle guardado correctamente');
    } else {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar';
      alert('Error al guardar el detalle: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    alert('Error al guardar el detalle: ' + error.message);
  }
}

function quitarDetalle(id) {
  const elemento = document.getElementById(`detalle-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento && elemento.classList.contains('guardado')) {
    alert('No puede eliminar un detalle ya guardado.');
  }
}

// ============================================
// CARGAR Y MOSTRAR DATOS
// ============================================

async function cargarDatosExcel() {
  const loadingEl = document.getElementById('loading');
  
  try {
    loadingEl.innerHTML = 'Cargando datos... ⏳';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const url = `${API_URL}?action=obtenerJIAT&rol=${encodeURIComponent(rol)}&unidad=${encodeURIComponent(unidad)}`;
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const datos = await response.json();
    
    if (datos.error) {
      throw new Error(datos.error);
    }
    
    datosCompletos = datos.sort((a, b) => {
      const fechaA = convertirFecha(a.FECHA);
      const fechaB = convertirFecha(b.FECHA);
      return fechaB - fechaA;
    });
    
    datosFiltrados = [...datosCompletos];
    
    loadingEl.style.display = 'none';
    document.getElementById('tablaJIAT').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';
    
    actualizarTabla();
    
  } catch (error) {
    console.error('Error al cargar los datos:', error);
    
    if (error.name === 'AbortError') {
      loadingEl.innerHTML = '⏱️ Tiempo de espera agotado.<br><button onclick="cargarDatosExcel()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>';
    } else {
      loadingEl.innerHTML = `❌ Error: ${error.message}<br><button onclick="cargarDatosExcel()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
    }
  }
}

function convertirFecha(fechaStr) {
  if (!fechaStr) return new Date(0);
  
  if (fechaStr.includes('/')) {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      return new Date(partes[2], partes[1] - 1, partes[0]);
    }
  }
  
  return new Date(fechaStr);
}

function actualizarTabla() {
  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const datosPagina = datosFiltrados.slice(inicio, fin);
  
  const tbody = document.getElementById('cuerpoTabla');
  tbody.innerHTML = '';
  
  datosPagina.forEach((registro, index) => {
    const numeroGlobal = inicio + index + 1;
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${numeroGlobal}</td>
      <td>${registro.UNIDAD || '-'}</td>
      <td>${registro.CODIGO || '-'}</td>
      <td>${registro.FECHA || '-'}</td>
      <td>${registro.FATAL || '-'}</td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-ver" onclick="verDetalle(${inicio + index})" title="Ver detalle">👁</button>
          <button class="btn-icono btn-acciones" onclick="registrarAcciones(${inicio + index})" title="Registrar Acciones Tomadas">📋</button>
          <button class="btn-icono btn-editar" onclick="editarRegistro(${inicio + index})" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarRegistro(${inicio + index})" title="Eliminar">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(fila);
  });
  
  actualizarPaginacion();
  actualizarInfoRegistros();
}

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
  info.textContent = `Mostrando ${datosFiltrados.length} registros`;
}

document.getElementById('buscar').addEventListener('input', function(e) {
  const termino = e.target.value.toLowerCase();
  
  datosFiltrados = datosCompletos.filter(registro => {
    const unidad = (registro.UNIDAD || '').toString().toLowerCase();
    const codigo = (registro.CODIGO || '').toString().toLowerCase();
    const fecha = (registro.FECHA || '').toString().toLowerCase();
    
    return unidad.includes(termino) || codigo.includes(termino) || fecha.includes(termino);
  });
  
  paginaActual = 1;
  actualizarTabla();
});

// ============================================
// MODALES - NUEVO REGISTRO
// ============================================

function nuevoRegistro() {
  document.getElementById('modalNuevo').style.display = 'block';
  document.getElementById('formNuevo').reset();
  contadorDetalles = 0;
  cabeceraGuardada = false;
  codigoJIATActual = null;
  fechaJIATActual = null;
  periodoJIATActual = null;
  
  const seccionCabecera = document.getElementById('seccionCabecera');
  seccionCabecera.classList.remove('guardada');
  const badge = seccionCabecera.querySelector('.badge-guardado');
  if (badge) badge.remove();
  
  document.querySelectorAll('#seccionCabecera input, #seccionCabecera select, #seccionCabecera textarea, #seccionCabecera button').forEach(el => {
    el.disabled = false;
  });
  
  document.getElementById('btnGuardarCabecera').textContent = '💾 Guardar y Continuar';
  
  document.getElementById('involucradosContainer').innerHTML = `
    <div class="involucrado-item">
      <input type="text" class="involucrado-input" placeholder="Nombre del involucrado" required>
    </div>
  `;
  
  const seccionDetalles = document.getElementById('seccionDetalles');
  seccionDetalles.classList.add('bloqueada');
  document.getElementById('mensajeBloqueo').style.display = 'block';
  document.getElementById('detallesContainer').innerHTML = '';
  document.getElementById('btnAgregarDetalle').disabled = true;
}

function cerrarModal() {
  // Permitir cerrar siempre, sin validar si guardó
  if (cabeceraGuardada) {
    if (confirm('¿Desea cerrar? Ya guardó los datos principales.')) {
      document.getElementById('modalNuevo').style.display = 'none';
      cargarDatosExcel();
    }
  } else {
    document.getElementById('modalNuevo').style.display = 'none';
  }
}

function cerrarModalCompleto() {
  // Permitir cerrar siempre
  if (cabeceraGuardada) {
    alert('✓ JIAT registrada correctamente con código: ' + codigoJIATActual);
    document.getElementById('modalNuevo').style.display = 'none';
    cargarDatosExcel();
  } else {
    if (confirm('No ha guardado ningún dato. ¿Desea cerrar de todos modos?')) {
      document.getElementById('modalNuevo').style.display = 'none';
    }
  }
}

// ============================================
// VER DETALLE COMPLETO CON VALIDACIÓN DE UNIDAD
// ============================================

function verDetalle(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  mostrarOverlay('Cargando información...');
  
  fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}&unidad=${encodeURIComponent(unidad)}`)
    .then(response => response.json())
    .then(data => {
      ocultarOverlay();
      
      if (!data.success) {
        alert('Error al cargar la información: ' + data.error);
        return;
      }
      
      mostrarDetalleCompleto(data);
      document.getElementById('modalVerDetalle').style.display = 'block';
    })
    .catch(error => {
      ocultarOverlay();
      console.error('Error:', error);
      alert('Error al cargar la información del JIAT: ' + error.message);
    });
}

function mostrarDetalleCompleto(data) {
  const cabecera = data.cabecera;
  
  document.getElementById('verCodigo').textContent = cabecera.CODIGO || '-';
  document.getElementById('verFecha').textContent = cabecera.FECHA || '-';
  document.getElementById('verUnidad').textContent = cabecera.UNIDAD || '-';
  document.getElementById('verLugar').textContent = cabecera.LUGAR || '-';
  document.getElementById('verInvolucrado').textContent = cabecera.INVOLUCRADO || '-';
  document.getElementById('verFatal').textContent = cabecera.FATAL || '-';
  document.getElementById('verDescripcion').textContent = cabecera.DESCRIPCION || '-';
  
  const mostrarSeccion = (seccionId, listaId, datos, tipo, color) => {
    const seccion = document.getElementById(seccionId);
    const lista = document.getElementById(listaId);
    if (datos && datos.length > 0) {
      lista.innerHTML = '';
      datos.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'detalle-item-readonly';
        if (color) div.style.borderLeftColor = color;
        div.innerHTML = `
          <div class="detalle-item-readonly-header">
            <span class="detalle-item-readonly-tipo" style="color: ${color || '#17a2b8'};">${tipo} #${index + 1}</span>
            <span class="detalle-item-readonly-caracter" style="background: ${color || '#17a2b8'};">${item.CARACTER}</span>
          </div>
          <div class="detalle-item-readonly-descripcion">${item.DESCRIPCION}</div>
        `;
        lista.appendChild(div);
      });
      seccion.style.display = 'block';
    } else {
      seccion.style.display = 'none';
    }
  };
  
  mostrarSeccion('verSeccionConclusiones', 'verListaConclusiones', data.conclusiones, 'Conclusión', '#17a2b8');
  mostrarSeccion('verSeccionCausas', 'verListaCausas', data.causas, 'Causa', '#ffc107');
  mostrarSeccion('verSeccionRecomendaciones', 'verListaRecomendaciones', data.recomendaciones, 'Recomendación', '#007bff');
  
  // Acciones con fecha
  const seccionAcciones = document.getElementById('verSeccionAcciones');
  const listaAcciones = document.getElementById('verListaAcciones');
  if (data.acciones && data.acciones.length > 0) {
    listaAcciones.innerHTML = '';
    data.acciones.forEach((a, index) => {
      const div = document.createElement('div');
      div.className = 'detalle-item-readonly';
      div.style.borderLeftColor = '#28a745';
      div.innerHTML = `
        <div class="detalle-item-readonly-header">
          <span class="detalle-item-readonly-tipo" style="color: #28a745;">Acción #${index + 1} - 📅 ${a.FECHA}</span>
          <span class="detalle-item-readonly-caracter" style="background: #28a745;">${a.CARACTER}</span>
        </div>
        <div class="detalle-item-readonly-descripcion">${a.DESCRIPCION}</div>
      `;
      listaAcciones.appendChild(div);
    });
    seccionAcciones.style.display = 'block';
  } else {
    seccionAcciones.style.display = 'none';
  }
}

function cerrarModalVerDetalle() {
  document.getElementById('modalVerDetalle').style.display = 'none';
}

// ============================================
// EDITAR REGISTRO - SIN EDITAR NÚMERO NI PERIODO
// ============================================

async function editarRegistro(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  mostrarOverlay('Cargando información...');
  
  try {
    const response = await fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}&unidad=${encodeURIComponent(unidad)}`);
    const data = await response.json();
    
    ocultarOverlay();
    
    if (!data.success) {
      alert('Error al cargar la información: ' + data.error);
      return;
    }
    
    cargarDatosEdicion(data);
    document.getElementById('modalEditar').style.display = 'block';
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    alert('Error: ' + error.message);
  }
}

function cargarDatosEdicion(data) {
  const cabecera = data.cabecera;
  
  // Resetear estado
  contadorDetallesEdicion = 0;
  contadorAccionesEdicion = 0;
  cabeceraEdicionGuardada = false;
  codigoActualEdicion = cabecera.CODIGO;
  
  // Cargar periodos
  const selectPeriodo = document.getElementById('editPeriodo');
  selectPeriodo.innerHTML = '<option value="">Seleccione un año</option>';
  const añoActual = new Date().getFullYear();
  for (let i = añoActual; i >= añoActual - 30; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    selectPeriodo.appendChild(option);
  }
  
  // Llenar cabecera - NÚMERO y PERIODO como solo lectura
  document.getElementById('editCodigoActual').value = cabecera.CODIGO || '';
  document.getElementById('editNumero').value = cabecera.NUMERO || '';
  document.getElementById('editNumero').disabled = true; // DESHABILITAR EDICIÓN
  
  document.getElementById('editPeriodo').value = cabecera.PERIODO || '';
  document.getElementById('editPeriodo').disabled = true; // DESHABILITAR EDICIÓN
  
  let fechaInput = '';
  if (cabecera.FECHA) {
    const partes = cabecera.FECHA.split('/');
    if (partes.length === 3) {
      fechaInput = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
  }
  document.getElementById('editFecha').value = fechaInput;
  
  document.getElementById('editLugar').value = cabecera.LUGAR || '';
  document.getElementById('editInvolucrado').value = cabecera.INVOLUCRADO || '';
  document.getElementById('editFatal').value = cabecera.FATAL || '';
  document.getElementById('editCantfall').value = cabecera.CANTFALL || '0';
  document.getElementById('editDescripcion').value = cabecera.DESCRIPCION || '';
  
  // Ocultar advertencia (ya no aplica porque no se puede cambiar número/periodo)
  document.getElementById('editAdvertenciaCodigo').style.display = 'none';
  
  // Marcar cabecera como no guardada y habilitar botón
  const seccionCabecera = document.getElementById('editSeccionCabecera');
  seccionCabecera.classList.remove('guardada');
  const badge = seccionCabecera.querySelector('.badge-guardado');
  if (badge) badge.remove();
  document.getElementById('btnGuardarCabeceraEdit').disabled = false;
  document.getElementById('btnGuardarCabeceraEdit').textContent = '💾 Guardar y Continuar';
  
  // Bloquear secciones de detalles y acciones
  const seccionDetalles = document.getElementById('editSeccionDetalles');
  const seccionAcciones = document.getElementById('editSeccionAcciones');
  seccionDetalles.classList.add('bloqueada');
  seccionAcciones.classList.add('bloqueada');
  document.getElementById('editMensajeBloqueo').style.display = 'block';
  document.getElementById('btnAgregarDetalleEdit').disabled = true;
  
  // Limpiar containers
  document.getElementById('editDetallesContainer').innerHTML = '';
  document.getElementById('editAccionesContainer').innerHTML = '';
  
  // Guardar detalles y acciones para cargar después
  window.datosEdicionTemp = {
    detalles: [
      ...(data.conclusiones || []),
      ...(data.causas || []),
      ...(data.recomendaciones || [])
    ],
    acciones: data.acciones || []
  };
}

async function guardarCabeceraEdicion() {
  const codigo = document.getElementById('editCodigoActual').value;
  const fecha = document.getElementById('editFecha').value;
  const lugar = document.getElementById('editLugar').value.trim();
  const involucrado = document.getElementById('editInvolucrado').value.trim();
  const fatal = document.getElementById('editFatal').value;
  const cantfall = document.getElementById('editCantfall').value;
  const descripcion = document.getElementById('editDescripcion').value.trim();
  
  if (!fecha || !lugar || !involucrado || !fatal || !descripcion) {
    alert('⚠️ Por favor complete todos los campos obligatorios');
    return;
  }
  
  mostrarOverlay('Guardando cabecera...');
  
  try {
    const datosCabecera = {
      action: 'editarCabeceraJIAT',
      CODIGO: codigo,
      UNIDAD_USUARIO: unidad, // Para validación de permisos
      FECHA: fecha,
      LUGAR: lugar,
      INVOLUCRADO: involucrado,
      FATAL: fatal,
      CANTFALL: cantfall,
      DESCRIPCION: descripcion
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datosCabecera)
    });
    
    const result = await response.json();
    
    ocultarOverlay();
    
    if (result.success) {
      cabeceraEdicionGuardada = true;
      
      // Marcar como guardada
      const seccionCabecera = document.getElementById('editSeccionCabecera');
      seccionCabecera.classList.add('guardada');
      
      const badge = document.createElement('span');
      badge.className = 'badge-guardado';
      badge.textContent = '✓ Guardado';
      seccionCabecera.appendChild(badge);
      
      // Deshabilitar botón
      document.getElementById('btnGuardarCabeceraEdit').disabled = true;
      
      // Desbloquear secciones
      const seccionDetalles = document.getElementById('editSeccionDetalles');
      const seccionAcciones = document.getElementById('editSeccionAcciones');
      seccionDetalles.classList.remove('bloqueada');
      seccionAcciones.classList.remove('bloqueada');
      document.getElementById('editMensajeBloqueo').style.display = 'none';
      document.getElementById('btnAgregarDetalleEdit').disabled = false;
      
      // Cargar detalles y acciones existentes
      if (window.datosEdicionTemp) {
        window.datosEdicionTemp.detalles.forEach((detalle, index) => {
          agregarDetalleEdicionExistente(detalle, index);
        });
        
        const containerAcciones = document.getElementById('editAccionesContainer');
        if (window.datosEdicionTemp.acciones.length > 0) {
          window.datosEdicionTemp.acciones.forEach((accion, index) => {
            agregarAccionEdicionExistente(accion, index);
          });
        } else {
          containerAcciones.innerHTML = '<p style="color:#666;padding:15px;">No hay acciones registradas aún.</p>';
        }
      }
      
      alert('✅ Cabecera actualizada correctamente.\n\nAhora puede editar los detalles y acciones.');
      
    } else {
      alert('⚠️ Error: ' + (result.error || 'Error desconocido'));
    }
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    alert('⚠️ Error al guardar: ' + error.message);
  }
}

function agregarDetalleEdicionExistente(detalle, index) {
  contadorDetallesEdicion++;
  const container = document.getElementById('editDetallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item';
  detalleDiv.id = `editDetalle-${contadorDetallesEdicion}`;
  detalleDiv.setAttribute('data-id-detalle', detalle.ID_DETALLE);
  
  detalleDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo">
        <strong>${detalle.SUBTIPO} #${index + 1}</strong>
      </div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarDetalleEditado(${contadorDetallesEdicion})" id="btnGuardarDetEdit${contadorDetallesEdicion}">
          💾 Guardar
        </button>
        <button type="button" class="btn-eliminar-detalle" onclick="eliminarDetalleEditado(${contadorDetallesEdicion})">🗑️ Eliminar</button>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Asunto</label>
        <select class="edit-detalle-subtipo" id="editSubtipo${contadorDetallesEdicion}">
          <option value="CONCLUSIÓN" ${detalle.SUBTIPO === 'CONCLUSIÓN' ? 'selected' : ''}>CONCLUSIÓN</option>
          <option value="CAUSA" ${detalle.SUBTIPO === 'CAUSA' ? 'selected' : ''}>CAUSA</option>
          <option value="RECOMENDACIÓN" ${detalle.SUBTIPO === 'RECOMENDACIÓN' ? 'selected' : ''}>RECOMENDACIÓN</option>
        </select>
      </div>
      <div class="form-group">
        <label>Carácter</label>
        <select class="edit-detalle-caracter" id="editCaracter${contadorDetallesEdicion}">
          <option value="PSICOFÍSICO" ${detalle.CARACTER === 'PSICOFÍSICO' ? 'selected' : ''}>PSICOFÍSICO</option>
          <option value="TÉCNICO" ${detalle.CARACTER === 'TÉCNICO' ? 'selected' : ''}>TÉCNICO</option>
          <option value="OPERATIVO" ${detalle.CARACTER === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
          <option value="PSICOLÓGICO" ${detalle.CARACTER === 'PSICOLÓGICO' ? 'selected' : ''}>PSICOLÓGICO</option>
          <option value="SALUD" ${detalle.CARACTER === 'SALUD' ? 'selected' : ''}>SALUD</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Descripción</label>
      <textarea class="edit-detalle-descripcion" id="editDescDet${contadorDetallesEdicion}">${detalle.DESCRIPCION || ''}</textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

function agregarAccionEdicionExistente(accion, index) {
  contadorAccionesEdicion++;
  const container = document.getElementById('editAccionesContainer');
  const accionDiv = document.createElement('div');
  accionDiv.className = 'accion-item';
  accionDiv.id = `editAccion-${contadorAccionesEdicion}`;
  accionDiv.setAttribute('data-id-detalle', accion.ID_DETALLE);
  
  let fechaInput = '';
  if (accion.FECHA) {
    const partes = accion.FECHA.split('/');
    if (partes.length === 3) {
      fechaInput = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
  }
  
  accionDiv.innerHTML = `
    <div class="accion-item-header">
      <div class="accion-titulo">
        <strong>Acción #${index + 1}</strong>
      </div>
      <div>
        <button type="button" class="btn-guardar-accion" onclick="guardarAccionEditada(${contadorAccionesEdicion})">💾 Guardar</button>
        <button type="button" class="btn-eliminar-detalle" onclick="eliminarAccionEditada(${contadorAccionesEdicion})">🗑️ Eliminar</button>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Fecha</label>
        <input type="date" class="edit-accion-fecha" id="editFechaAccion${contadorAccionesEdicion}" value="${fechaInput}">
      </div>
      <div class="form-group">
        <label>Carácter</label>
        <select class="edit-accion-caracter" id="editCaracterAccion${contadorAccionesEdicion}">
          <option value="PSICOFÍSICO" ${accion.CARACTER === 'PSICOFÍSICO' ? 'selected' : ''}>PSICOFÍSICO</option>
          <option value="TÉCNICO" ${accion.CARACTER === 'TÉCNICO' ? 'selected' : ''}>TÉCNICO</option>
          <option value="OPERATIVO" ${accion.CARACTER === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
          <option value="PSICOLÓGICO" ${accion.CARACTER === 'PSICOLÓGICO' ? 'selected' : ''}>PSICOLÓGICO</option>
          <option value="SALUD" ${accion.CARACTER === 'SALUD' ? 'selected' : ''}>SALUD</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Descripción</label>
      <textarea class="edit-accion-descripcion" id="editDescAccion${contadorAccionesEdicion}">${accion.DESCRIPCION || ''}</textarea>
    </div>
  `;
  container.appendChild(accionDiv);
}

function agregarDetalleEdicion() {
  contadorDetallesEdicion++;
  const container = document.getElementById('editDetallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item';
  detalleDiv.id = `editDetalle-${contadorDetallesEdicion}`;
  detalleDiv.setAttribute('data-nuevo', 'true');
  
  detalleDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo">
        <strong>Nuevo Detalle</strong>
        <span class="badge-guardado-detalle" style="background:#28a745;">NUEVO</span>
      </div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarDetalleEditado(${contadorDetallesEdicion})">💾 Guardar</button>
        <button type="button" class="btn-quitar" onclick="quitarDetalleNuevo(${contadorDetallesEdicion})">× Quitar</button>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Asunto <span class="required">*</span></label>
        <select class="edit-detalle-subtipo" id="editSubtipo${contadorDetallesEdicion}" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN">CONCLUSIÓN</option>
          <option value="CAUSA">CAUSA</option>
          <option value="RECOMENDACIÓN">RECOMENDACIÓN</option>
        </select>
      </div>
      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="edit-detalle-caracter" id="editCaracter${contadorDetallesEdicion}" required>
          <option value="">Seleccione</option>
          <option value="PSICOFÍSICO">PSICOFÍSICO</option>
          <option value="TÉCNICO">TÉCNICO</option>
          <option value="OPERATIVO">OPERATIVO</option>
          <option value="PSICOLÓGICO">PSICOLÓGICO</option>
          <option value="SALUD">SALUD</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Descripción <span class="required">*</span></label>
      <textarea class="edit-detalle-descripcion" id="editDescDet${contadorDetallesEdicion}" required></textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

async function guardarDetalleEditado(id) {
  const detalleDiv = document.getElementById(`editDetalle-${id}`);
  const idDetalle = detalleDiv.getAttribute('data-id-detalle');
  const esNuevo = detalleDiv.getAttribute('data-nuevo') === 'true';
  
  const subtipo = document.getElementById(`editSubtipo${id}`).value;
  const caracter = document.getElementById(`editCaracter${id}`).value;
  const descripcion = document.getElementById(`editDescDet${id}`).value.trim();
  
  if (!subtipo || !caracter || !descripcion) {
    alert('Complete todos los campos');
    return;
  }
  
  mostrarOverlay('Guardando...');
  
  try {
    let datos;
    if (esNuevo) {
      datos = {
        action: 'crearDetalleJIAT',
        USUARIOREG: usuario,
        UNIDAD: unidad,
        TIPO: 'JIAT',
        CODIGO: codigoActualEdicion,
        SUBTIPO: subtipo,
        FECHA: document.getElementById('editFecha').value,
        PERIODO: document.getElementById('editPeriodo').value,
        CARACTER: caracter,
        DESCRIPCION: descripcion
      };
    } else {
      datos = {
        action: 'actualizarDetalleJIAT',
        ID_DETALLE: idDetalle,
        UNIDAD_USUARIO: unidad, // Para validación
        CODIGO: codigoActualEdicion,
        SUBTIPO: subtipo,
        CARACTER: caracter,
        DESCRIPCION: descripcion,
        FECHA: document.getElementById('editFecha').value,
        PERIODO: document.getElementById('editPeriodo').value
      };
    }
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    
    const result = await response.json();
    
    ocultarOverlay();
    
    if (result.success) {
      detalleDiv.classList.add('guardado');
      document.getElementById(`editSubtipo${id}`).disabled = true;
      document.getElementById(`editCaracter${id}`).disabled = true;
      document.getElementById(`editDescDet${id}`).disabled = true;
      
      const btn = document.getElementById(`btnGuardarDetEdit${id}`);
      if (btn) btn.style.display = 'none';
      
      alert('✅ Guardado correctamente');
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    ocultarOverlay();
    alert('Error: ' + error.message);
  }
}

async function eliminarDetalleEditado(id) {
  const detalleDiv = document.getElementById(`editDetalle-${id}`);
  const idDetalle = detalleDiv.getAttribute('data-id-detalle');
  
  if (!confirm('¿Eliminar este detalle?')) return;
  
  mostrarOverlay('Eliminando...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'eliminarDetalleJIAT',
        ID_DETALLE: idDetalle,
        UNIDAD: unidad // Para validación
      })
    });
    
    const result = await response.json();
    
    ocultarOverlay();
    
    if (result.success) {
      detalleDiv.remove();
      alert('✅ Eliminado correctamente');
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    ocultarOverlay();
    alert('Error: ' + error.message);
  }
}

function quitarDetalleNuevo(id) {
  document.getElementById(`editDetalle-${id}`).remove();
}

async function guardarAccionEditada(id) {
  const accionDiv = document.getElementById(`editAccion-${id}`);
  const idDetalle = accionDiv.getAttribute('data-id-detalle');
  
  const fecha = document.getElementById(`editFechaAccion${id}`).value;
  const caracter = document.getElementById(`editCaracterAccion${id}`).value;
  const descripcion = document.getElementById(`editDescAccion${id}`).value.trim();
  
  if (!fecha || !caracter || !descripcion) {
    alert('Complete todos los campos');
    return;
  }
  
  mostrarOverlay('Guardando...');
  
  try {
    const datos = {
      action: 'actualizarDetalleJIAT',
      ID_DETALLE: idDetalle,
      UNIDAD_USUARIO: unidad, // Para validación
      CODIGO: codigoActualEdicion,
      CARACTER: caracter,
      DESCRIPCION: descripcion,
      FECHA: fecha,
      PERIODO: new Date(fecha).getFullYear()
    };
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datos)
    });
    
    const result = await response.json();
    
    ocultarOverlay();
    
    if (result.success) {
      accionDiv.classList.add('guardado');
      document.getElementById(`editFechaAccion${id}`).disabled = true;
      document.getElementById(`editCaracterAccion${id}`).disabled = true;
      document.getElementById(`editDescAccion${id}`).disabled = true;
      alert('✅ Guardado correctamente');
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    ocultarOverlay();
    alert('Error: ' + error.message);
  }
}

async function eliminarAccionEditada(id) {
  const accionDiv = document.getElementById(`editAccion-${id}`);
  const idDetalle = accionDiv.getAttribute('data-id-detalle');
  
  if (!confirm('¿Eliminar esta acción?')) return;
  
  mostrarOverlay('Eliminando...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'eliminarDetalleJIAT',
        ID_DETALLE: idDetalle,
        UNIDAD: unidad // Para validación
      })
    });
    
    const result = await response.json();
    
    ocultarOverlay();
    
    if (result.success) {
      accionDiv.remove();
      alert('✅ Eliminado correctamente');
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    ocultarOverlay();
    alert('Error: ' + error.message);
  }
}

function cerrarModalEditar() {
  // Permitir cerrar siempre
  if (cabeceraEdicionGuardada) {
    alert('✓ Cambios guardados correctamente');
    document.getElementById('modalEditar').style.display = 'none';
    cargarDatosExcel();
  } else {
    if (confirm('¿Cerrar sin guardar los cambios?')) {
      document.getElementById('modalEditar').style.display = 'none';
    }
  }
}

// ============================================
// ACCIONES TOMADAS CON VALIDACIÓN DE UNIDAD
// ============================================

async function registrarAcciones(index) {
  const registro = datosFiltrados[index];
  codigoJIATAcciones = registro.CODIGO;
  
  mostrarOverlay('Cargando...');
  
  try {
    const response = await fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigoJIATAcciones)}&unidad=${encodeURIComponent(unidad)}`);
    const data = await response.json();
    
    ocultarOverlay();
    
    if (!data.success) {
      alert('Error: ' + data.error);
      return;
    }
    
    mostrarInformacionJIAT(data);
    contadorAcciones = 0;
    document.getElementById('accionesContainer').innerHTML = '';
    document.getElementById('modalAcciones').style.display = 'block';
    
  } catch (error) {
    ocultarOverlay();
    alert('Error: ' + error.message);
  }
}

function mostrarInformacionJIAT(data) {
  const cabecera = data.cabecera;
  
  document.getElementById('infoCodigo').textContent = cabecera.CODIGO || '-';
  document.getElementById('infoFecha').textContent = cabecera.FECHA || '-';
  document.getElementById('infoUnidad').textContent = cabecera.UNIDAD || '-';
  document.getElementById('infoLugar').textContent = cabecera.LUGAR || '-';
  document.getElementById('infoInvolucrado').textContent = cabecera.INVOLUCRADO || '-';
  document.getElementById('infoFatal').textContent = cabecera.FATAL || '-';
  document.getElementById('infoDescripcion').textContent = cabecera.DESCRIPCION || '-';
  
  periodoJIATAcciones = cabecera.PERIODO || new Date().getFullYear();
  
  const mostrarListaSimple = (seccionId, listaId, datos) => {
    const seccion = document.getElementById(seccionId);
    const lista = document.getElementById(listaId);
    if (datos && datos.length > 0) {
      lista.innerHTML = '';
      datos.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${item.CARACTER}:</strong> ${item.DESCRIPCION}`;
        lista.appendChild(li);
      });
      seccion.style.display = 'block';
    } else {
      seccion.style.display = 'none';
    }
  };
  
  mostrarListaSimple('detallesConclusiones', 'listaConclusiones', data.conclusiones);
  mostrarListaSimple('detallesCausas', 'listaCausas', data.causas);
  mostrarListaSimple('detallesRecomendaciones', 'listaRecomendaciones', data.recomendaciones);
  
  const seccionAccionesReg = document.getElementById('seccionAccionesRegistradas');
  const listaAccionesReg = document.getElementById('listaAccionesRegistradas');
  if (data.acciones && data.acciones.length > 0) {
    listaAccionesReg.innerHTML = '';
    data.acciones.forEach(a => {
      const div = document.createElement('div');
      div.className = 'accion-registrada';
      div.innerHTML = `
        <div class="accion-registrada-header">
          <span class="accion-registrada-fecha">📅 ${a.FECHA}</span>
          <span class="accion-registrada-caracter">${a.CARACTER}</span>
        </div>
        <div class="accion-registrada-descripcion">${a.DESCRIPCION}</div>
      `;
      listaAccionesReg.appendChild(div);
    });
    seccionAccionesReg.style.display = 'block';
  } else {
    seccionAccionesReg.style.display = 'none';
  }
}

function agregarAccionTomada() {
  contadorAcciones++;
  const container = document.getElementById('accionesContainer');
  const accionDiv = document.createElement('div');
  accionDiv.className = 'accion-item';
  accionDiv.id = `accion-${contadorAcciones}`;
  
  const hoy = new Date().toISOString().split('T')[0];
  
  accionDiv.innerHTML = `
    <div class="accion-item-header">
      <div class="accion-titulo">
        <strong>Acción #${contadorAcciones}</strong>
      </div>
      <div>
        <button type="button" class="btn-guardar-accion" onclick="guardarAccionTomada(${contadorAcciones})" id="btnGuardarAccion${contadorAcciones}">
          💾 Guardar
        </button>
        <button type="button" class="btn-quitar" onclick="quitarAccionTomada(${contadorAcciones})">× Quitar</button>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Fecha <span class="required">*</span></label>
        <input type="date" id="fechaAccion${contadorAcciones}" value="${hoy}" required>
      </div>
      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select id="caracterAccion${contadorAcciones}" required>
          <option value="">Seleccione</option>
          <option value="PSICOFÍSICO">PSICOFÍSICO</option>
          <option value="TÉCNICO">TÉCNICO</option>
          <option value="OPERATIVO">OPERATIVO</option>
          <option value="PSICOLÓGICO">PSICOLÓGICO</option>
          <option value="SALUD">SALUD</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label>Descripción <span class="required">*</span></label>
      <textarea id="descripcionAccion${contadorAcciones}" required></textarea>
    </div>
  `;
  container.appendChild(accionDiv);
}

async function guardarAccionTomada(id) {
  const fecha = document.getElementById(`fechaAccion${id}`).value;
  const caracter = document.getElementById(`caracterAccion${id}`).value;
  const descripcion = document.getElementById(`descripcionAccion${id}`).value;

  if (!fecha || !caracter || !descripcion) {
    alert('Complete todos los campos');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarAccion${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Guardando acción...');

  try {
    const periodo = new Date(fecha).getFullYear();
    
    const datosAccion = {
      action: 'crearDetalleJIAT',
      USUARIOREG: usuario,
      UNIDAD: unidad,
      TIPO: 'JIAT',
      CODIGO: codigoJIATAcciones,
      SUBTIPO: 'ACCIÓN TOMADA',
      FECHA: fecha,
      PERIODO: periodo,
      CARACTER: caracter,
      DESCRIPCION: descripcion
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datosAccion)
    });

    const result = await response.json();

    ocultarOverlay();

    if (result.success) {
      const accionDiv = document.getElementById(`accion-${id}`);
      accionDiv.classList.add('guardado');
      
      const titulo = accionDiv.querySelector('.accion-titulo');
      titulo.innerHTML += ' <span class="badge-guardado-accion">✓ Guardado</span>';
      
      document.getElementById(`fechaAccion${id}`).disabled = true;
      document.getElementById(`caracterAccion${id}`).disabled = true;
      document.getElementById(`descripcionAccion${id}`).disabled = true;
      btnGuardar.style.display = 'none';

      alert('✓ Acción guardada correctamente');
      
      const indexRegistro = datosFiltrados.findIndex(r => r.CODIGO === codigoJIATAcciones);
      if (indexRegistro !== -1) {
        await registrarAcciones(indexRegistro);
      }
      
    } else {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar';
      alert('Error: ' + result.error);
    }
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    alert('Error: ' + error.message);
  }
}

function quitarAccionTomada(id) {
  const elemento = document.getElementById(`accion-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  }
}

function cerrarModalAcciones() {
  document.getElementById('modalAcciones').style.display = 'none';
  cargarDatosExcel();
}

// ============================================
// ELIMINAR REGISTRO CON VALIDACIÓN DE UNIDAD
// ============================================

function eliminarRegistro(index) {
  const registro = datosFiltrados[index];
  if (confirm('¿Eliminar el registro ' + registro.CODIGO + '?')) {
    mostrarOverlay('Eliminando...');
    
    fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'eliminarJIAT',
        CODIGO: registro.CODIGO,
        UNIDAD: unidad // Para validación
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        cargarDatosExcel().then(() => {
          ocultarOverlay();
          alert('✓ Eliminado correctamente');
        });
      } else {
        ocultarOverlay();
        alert('Error: ' + data.error);
      }
    })
    .catch(error => {
      ocultarOverlay();
      alert('Error: ' + error.message);
    });
  }
}

// ============================================
// UTILIDADES
// ============================================

function mostrarOverlay(mensaje) {
  document.getElementById('mensajeCarga').textContent = mensaje;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

window.onclick = function(event) {
  const modalNuevo = document.getElementById('modalNuevo');
  const modalAcciones = document.getElementById('modalAcciones');
  const modalVerDetalle = document.getElementById('modalVerDetalle');
  const modalEditar = document.getElementById('modalEditar');
  
  if (event.target == modalNuevo) {
    cerrarModal();
  }
  
  if (event.target == modalAcciones) {
    cerrarModalAcciones();
  }
  
  if (event.target == modalVerDetalle) {
    cerrarModalVerDetalle();
  }
  
  if (event.target == modalEditar) {
    // No cerrar automáticamente al hacer clic fuera
  }
};
