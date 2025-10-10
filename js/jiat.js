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
      btnGuardar.textContent = '💾 Guardar Datos Principales';
      alert('Error al guardar: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar Datos Principales';
    alert('Error al guardar los datos principales: ' + error.message);
  }
}

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

function agregarAccionEdicionExistente(accion, index) {
  const container = document.getElementById('editAccionesContainer');
  const accionDiv = document.createElement('div');
  accionDiv.className = 'detalle-item-editable';
  accionDiv.style.borderColor = '#28a745';
  accionDiv.id = `editAccion-${index}`;
  accionDiv.setAttribute('data-id-detalle', accion.ID_DETALLE);
  accionDiv.setAttribute('data-tipo', 'existente');
  
  // Convertir fecha
  let fechaInput = '';
  if (accion.FECHA) {
    const partes = accion.FECHA.split('/');
    if (partes.length === 3) {
      fechaInput = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
  }
  
  accionDiv.innerHTML = `
    <div class="detalle-item-editable-header">
      <div class="detalle-item-editable-titulo" style="color: #28a745;">
        Acción Tomada #${index + 1}
      </div>
      <button type="button" class="btn-eliminar-detalle" onclick="marcarAccionParaEliminar(${index})">
        🗑️ Eliminar
      </button>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Fecha de la Acción <span class="required">*</span></label>
        <input type="date" class="edit-accion-fecha" value="${fechaInput}" required>
      </div>

      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="edit-accion-caracter" required>
          <option value="">Seleccione</option>
          <option value="PSICOFÍSICO" ${accion.CARACTER === 'PSICOFÍSICO' ? 'selected' : ''}>PSICOFÍSICO</option>
          <option value="TÉCNICO" ${accion.CARACTER === 'TÉCNICO' ? 'selected' : ''}>TÉCNICO</option>
          <option value="OPERATIVO" ${accion.CARACTER === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
          <option value="PSICOLÓGICO" ${accion.CARACTER === 'PSICOLÓGICO' ? 'selected' : ''}>PSICOLÓGICO</option>
          <option value="SALUD" ${accion.CARACTER === 'SALUD' ? 'selected' : ''}>SALUD</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label>Descripción de la Acción Tomada <span class="required">*</span></label>
      <textarea class="edit-accion-descripcion" required>${accion.DESCRIPCION || ''}</textarea>
    </div>
  `;
  container.appendChild(accionDiv);
}

function agregarDetalleEdicion() {
  contadorDetallesEdicion++;
  const container = document.getElementById('editDetallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item-editable detalle-nuevo';
  detalleDiv.id = `editDetalle-${contadorDetallesEdicion}`;
  detalleDiv.setAttribute('data-tipo', 'nuevo');
  
  detalleDiv.innerHTML = `
    <div class="detalle-item-editable-header">
      <div class="detalle-item-editable-titulo">
        Nuevo Detalle <span class="badge-nuevo">NUEVO</span>
      </div>
      <button type="button" class="btn-eliminar-detalle" onclick="quitarDetalleNuevo(${contadorDetallesEdicion})">
        🗑️ Quitar
      </button>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Asunto <span class="required">*</span></label>
        <select class="edit-detalle-subtipo" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN">CONCLUSIÓN</option>
          <option value="CAUSA">CAUSA</option>
          <option value="RECOMENDACIÓN">RECOMENDACIÓN</option>
        </select>
      </div>

      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="edit-detalle-caracter" required>
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
      <textarea class="edit-detalle-descripcion" required placeholder="Describa la conclusión, causa o recomendación..."></textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

function marcarDetalleParaEliminar(id) {
  const elemento = document.getElementById(`editDetalle-${id}`);
  if (!elemento) return;
  
  if (elemento.classList.contains('eliminado')) {
    // Desmarcar
    elemento.classList.remove('eliminado');
    const badge = elemento.querySelector('.badge-eliminado');
    if (badge) badge.remove();
    
    const idDetalle = elemento.getAttribute('data-id-detalle');
    detallesEliminados = detallesEliminados.filter(id => id !== idDetalle);
  } else {
    // Marcar para eliminar
    elemento.classList.add('eliminado');
    const titulo = elemento.querySelector('.detalle-item-editable-titulo');
    titulo.innerHTML += ' <span class="badge-eliminado">SERÁ ELIMINADO</span>';
    
    const idDetalle = elemento.getAttribute('data-id-detalle');
    if (idDetalle && !detallesEliminados.includes(idDetalle)) {
      detallesEliminados.push(idDetalle);
    }
  }
}

function marcarAccionParaEliminar(index) {
  const elemento = document.getElementById(`editAccion-${index}`);
  if (!elemento) return;
  
  if (elemento.classList.contains('eliminado')) {
    // Desmarcar
    elemento.classList.remove('eliminado');
    const badge = elemento.querySelector('.badge-eliminado');
    if (badge) badge.remove();
    
    const idDetalle = elemento.getAttribute('data-id-detalle');
    accionesEliminadas = accionesEliminadas.filter(id => id !== idDetalle);
  } else {
    // Marcar para eliminar
    elemento.classList.add('eliminado');
    const titulo = elemento.querySelector('.detalle-item-editable-titulo');
    titulo.innerHTML += ' <span class="badge-eliminado">SERÁ ELIMINADO</span>';
    
    const idDetalle = elemento.getAttribute('data-id-detalle');
    if (idDetalle && !accionesEliminadas.includes(idDetalle)) {
      accionesEliminadas.push(idDetalle);
    }
  }
}

function quitarDetalleNuevo(id) {
  const elemento = document.getElementById(`editDetalle-${id}`);
  if (elemento && elemento.getAttribute('data-tipo') === 'nuevo') {
    elemento.remove();
  }
}

async function guardarEdicionCompleta() {
  // Validar campos obligatorios
  const numero = document.getElementById('editNumero').value;
  const periodo = document.getElementById('editPeriodo').value;
  const fecha = document.getElementById('editFecha').value;
  const lugar = document.getElementById('editLugar').value;
  const involucrado = document.getElementById('editInvolucrado').value;
  const fatal = document.getElementById('editFatal').value;
  const cantfall = document.getElementById('editCantfall').value;
  const descripcion = document.getElementById('editDescripcion').value;
  const codigo = document.getElementById('editCodigo').value;
  
  if (!numero || !periodo || !fecha || !lugar || !involucrado || !fatal || !descripcion) {
    alert('Por favor complete todos los campos obligatorios de la cabecera');
    return;
  }
  
  if (!confirm('¿Está seguro de guardar todos los cambios?\n\nEsto actualizará la cabecera y todos los detalles modificados.')) {
    return;
  }
  
  mostrarOverlay('Guardando cambios...');
  
  try {
    // 1. ACTUALIZAR CABECERA
    console.log('1. Actualizando cabecera...');
    const datosCabecera = {
      action: 'editarJIAT',
      CODIGO: codigo,
      NUMERO: numero,
      PERIODO: periodo,
      FECHA: fecha,
      LUGAR: lugar,
      INVOLUCRADO: involucrado,
      FATAL: fatal,
      CANTFALL: cantfall,
      DESCRIPCION: descripcion
    };
    
    const respCabecera = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datosCabecera)
    });
    
    const resultCabecera = await respCabecera.json();
    if (!resultCabecera.success) {
      throw new Error('Error al actualizar cabecera: ' + resultCabecera.error);
    }
    console.log('✓ Cabecera actualizada');
    
    // 2. ELIMINAR DETALLES MARCADOS
    if (detallesEliminados.length > 0) {
      console.log('2. Eliminando detalles:', detallesEliminados);
      for (const idDetalle of detallesEliminados) {
        const respEliminar = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'eliminarDetalleJIAT',
            ID_DETALLE: idDetalle
          })
        });
        const resultEliminar = await respEliminar.json();
        if (!resultEliminar.success) {
          console.error('Error al eliminar detalle:', idDetalle);
        }
      }
      console.log('✓ Detalles eliminados');
    }
    
    // 3. ELIMINAR ACCIONES MARCADAS
    if (accionesEliminadas.length > 0) {
      console.log('3. Eliminando acciones:', accionesEliminadas);
      for (const idDetalle of accionesEliminadas) {
        const respEliminar = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'eliminarDetalleJIAT',
            ID_DETALLE: idDetalle
          })
        });
        const resultEliminar = await respEliminar.json();
        if (!resultEliminar.success) {
          console.error('Error al eliminar acción:', idDetalle);
        }
      }
      console.log('✓ Acciones eliminadas');
    }
    
    // 4. ACTUALIZAR DETALLES EXISTENTES
    console.log('4. Actualizando detalles existentes...');
    const detallesExistentes = document.querySelectorAll('#editDetallesContainer .detalle-item-editable[data-tipo="existente"]:not(.eliminado)');
    for (const detalleDiv of detallesExistentes) {
      const idDetalle = detalleDiv.getAttribute('data-id-detalle');
      const subtipo = detalleDiv.querySelector('.edit-detalle-subtipo').value;
      const caracter = detalleDiv.querySelector('.edit-detalle-caracter').value;
      const descripcionDet = detalleDiv.querySelector('.edit-detalle-descripcion').value;
      
      if (!subtipo || !caracter || !descripcionDet) {
        alert('Complete todos los campos de los detalles');
        ocultarOverlay();
        return;
      }
      
      const datosDetalle = {
        action: 'actualizarDetalleJIAT',
        ID_DETALLE: idDetalle,
        SUBTIPO: subtipo,
        CARACTER: caracter,
        DESCRIPCION: descripcionDet,
        FECHA: fecha,
        PERIODO: periodo
      };
      
      const respActualizar = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(datosDetalle)
      });
      
      const resultActualizar = await respActualizar.json();
      if (!resultActualizar.success) {
        console.error('Error al actualizar detalle:', idDetalle);
      }
    }
    console.log('✓ Detalles actualizados');
    
    // 5. ACTUALIZAR ACCIONES EXISTENTES
    console.log('5. Actualizando acciones existentes...');
    const accionesExistentes = document.querySelectorAll('#editAccionesContainer .detalle-item-editable[data-tipo="existente"]:not(.eliminado)');
    for (const accionDiv of accionesExistentes) {
      const idDetalle = accionDiv.getAttribute('data-id-detalle');
      const fechaAccion = accionDiv.querySelector('.edit-accion-fecha').value;
      const caracter = accionDiv.querySelector('.edit-accion-caracter').value;
      const descripcionAccion = accionDiv.querySelector('.edit-accion-descripcion').value;
      
      if (!fechaAccion || !caracter || !descripcionAccion) {
        alert('Complete todos los campos de las acciones');
        ocultarOverlay();
        return;
      }
      
      const periodoAccion = new Date(fechaAccion).getFullYear();
      
      const datosAccion = {
        action: 'actualizarDetalleJIAT',
        ID_DETALLE: idDetalle,
        CARACTER: caracter,
        DESCRIPCION: descripcionAccion,
        FECHA: fechaAccion,
        PERIODO: periodoAccion
      };
      
      const respActualizar = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(datosAccion)
      });
      
      const resultActualizar = await respActualizar.json();
      if (!resultActualizar.success) {
        console.error('Error al actualizar acción:', idDetalle);
      }
    }
    console.log('✓ Acciones actualizadas');
    
    // 6. CREAR DETALLES NUEVOS
    console.log('6. Creando detalles nuevos...');
    const detallesNuevosElements = document.querySelectorAll('#editDetallesContainer .detalle-item-editable[data-tipo="nuevo"]');
    for (const detalleDiv of detallesNuevosElements) {
      const subtipo = detalleDiv.querySelector('.edit-detalle-subtipo').value;
      const caracter = detalleDiv.querySelector('.edit-detalle-caracter').value;
      const descripcionDet = detalleDiv.querySelector('.edit-detalle-descripcion').value;
      
      if (!subtipo || !caracter || !descripcionDet) {
        continue; // Saltar si no está completo
      }
      
      const datosNuevo = {
        action: 'crearDetalleJIAT',
        USUARIOREG: usuario,
        UNIDAD: unidad,
        TIPO: 'JIAT',
        CODIGO: codigo,
        SUBTIPO: subtipo,
        FECHA: fecha,
        PERIODO: periodo,
        CARACTER: caracter,
        DESCRIPCION: descripcionDet
      };
      
      const respCrear = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(datosNuevo)
      });
      
      const resultCrear = await respCrear.json();
      if (!resultCrear.success) {
        console.error('Error al crear detalle nuevo');
      }
    }
    console.log('✓ Detalles nuevos creados');
    
    ocultarOverlay();
    alert('✓ Todos los cambios se guardaron correctamente');
    cerrarModalEditar();
    cargarDatosExcel();
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error en guardarEdicionCompleta:', error);
    alert('Error al guardar los cambios: ' + error.message);
  }
}

function cerrarModalEditar() {
  if (confirm('¿Está seguro de cerrar? Los cambios no guardados se perderán.')) {
    document.getElementById('modalEditar').style.display = 'none';
    detallesEditados = [];
    detallesNuevos = [];
    detallesEliminados = [];
    accionesEditadas = [];
    accionesEliminadas = [];
  }
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

async function cargarDatosExcel() {
  const loadingEl = document.getElementById('loading');
  
  try {
    loadingEl.innerHTML = 'Cargando datos... ⏳ (Esto puede tomar unos segundos)';
    
    console.log('=== CARGA DE DATOS CON FILTRO AUTOMÁTICO ===');
    console.log('Usuario:', usuario);
    console.log('Rol:', rol);
    console.log('Unidad:', unidad);
    console.log('API URL:', API_URL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const url = `${API_URL}?action=obtenerJIAT&rol=${encodeURIComponent(rol)}&unidad=${encodeURIComponent(unidad)}`;
    console.log('URL completa con parámetros:', url);
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Respuesta recibida, status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const datos = await response.json();
    console.log('✓ Datos recibidos:', datos.length, 'registros');
    
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
    
    console.log('✓ Tabla actualizada correctamente');
    console.log('✓ Mostrando', datosFiltrados.length, 'registros para rol:', rol);
    
  } catch (error) {
    console.error('Error al cargar los datos:', error);
    
    if (error.name === 'AbortError') {
      loadingEl.innerHTML = 
        '⏱️ Tiempo de espera agotado.<br>La API está tardando demasiado en responder.<br><button onclick="cargarDatosExcel()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>';
    } else {
      loadingEl.innerHTML = 
        `❌ Error al cargar los datos: ${error.message}<br><button onclick="cargarDatosExcel()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
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
    
    return unidad.includes(termino) || 
           codigo.includes(termino) || 
           fecha.includes(termino);
  });
  
  paginaActual = 1;
  actualizarTabla();
});

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
  
  document.getElementById('btnGuardarCabecera').textContent = '💾 Guardar Datos Principales';
  
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
  if (cabeceraGuardada) {
    if (confirm('Ha guardado los datos principales. ¿Desea cerrar sin agregar más detalles?')) {
      document.getElementById('modalNuevo').style.display = 'none';
      cargarDatosExcel();
    }
  } else {
    document.getElementById('modalNuevo').style.display = 'none';
  }
}

function cerrarModalCompleto() {
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

function mostrarOverlay(mensaje) {
  document.getElementById('mensajeCarga').textContent = mensaje;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

function verDetalle(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  console.log('Abriendo modal ver detalle para:', codigo);
  
  mostrarOverlay('Cargando información del JIAT...');
  
  fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}`)
    .then(response => response.json())
    .then(data => {
      console.log('Respuesta obtenerDetalleJIAT:', data);
      
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
  
  // Información básica
  document.getElementById('verCodigo').textContent = cabecera.CODIGO || '-';
  document.getElementById('verFecha').textContent = cabecera.FECHA || '-';
  document.getElementById('verUnidad').textContent = cabecera.UNIDAD || '-';
  document.getElementById('verLugar').textContent = cabecera.LUGAR || '-';
  document.getElementById('verInvolucrado').textContent = cabecera.INVOLUCRADO || '-';
  document.getElementById('verFatal').textContent = cabecera.FATAL || '-';
  document.getElementById('verDescripcion').textContent = cabecera.DESCRIPCION || '-';
  
  // Conclusiones
  const seccionConclusiones = document.getElementById('verSeccionConclusiones');
  const listaConclusiones = document.getElementById('verListaConclusiones');
  if (data.conclusiones && data.conclusiones.length > 0) {
    listaConclusiones.innerHTML = '';
    data.conclusiones.forEach((c, index) => {
      const div = document.createElement('div');
      div.className = 'detalle-item-readonly';
      div.innerHTML = `
        <div class="detalle-item-readonly-header">
          <span class="detalle-item-readonly-tipo">Conclusión #${index + 1}</span>
          <span class="detalle-item-readonly-caracter">${c.CARACTER}</span>
        </div>
        <div class="detalle-item-readonly-descripcion">${c.DESCRIPCION}</div>
      `;
      listaConclusiones.appendChild(div);
    });
    seccionConclusiones.style.display = 'block';
  } else {
    seccionConclusiones.style.display = 'none';
  }
  
  // Causas
  const seccionCausas = document.getElementById('verSeccionCausas');
  const listaCausas = document.getElementById('verListaCausas');
  if (data.causas && data.causas.length > 0) {
    listaCausas.innerHTML = '';
    data.causas.forEach((c, index) => {
      const div = document.createElement('div');
      div.className = 'detalle-item-readonly';
      div.style.borderLeftColor = '#ffc107';
      div.innerHTML = `
        <div class="detalle-item-readonly-header">
          <span class="detalle-item-readonly-tipo" style="color: #ffc107;">Causa #${index + 1}</span>
          <span class="detalle-item-readonly-caracter" style="background: #ffc107;">${c.CARACTER}</span>
        </div>
        <div class="detalle-item-readonly-descripcion">${c.DESCRIPCION}</div>
      `;
      listaCausas.appendChild(div);
    });
    seccionCausas.style.display = 'block';
  } else {
    seccionCausas.style.display = 'none';
  }
  
  // Recomendaciones
  const seccionRecomendaciones = document.getElementById('verSeccionRecomendaciones');
  const listaRecomendaciones = document.getElementById('verListaRecomendaciones');
  if (data.recomendaciones && data.recomendaciones.length > 0) {
    listaRecomendaciones.innerHTML = '';
    data.recomendaciones.forEach((r, index) => {
      const div = document.createElement('div');
      div.className = 'detalle-item-readonly';
      div.style.borderLeftColor = '#007bff';
      div.innerHTML = `
        <div class="detalle-item-readonly-header">
          <span class="detalle-item-readonly-tipo" style="color: #007bff;">Recomendación #${index + 1}</span>
          <span class="detalle-item-readonly-caracter" style="background: #007bff;">${r.CARACTER}</span>
        </div>
        <div class="detalle-item-readonly-descripcion">${r.DESCRIPCION}</div>
      `;
      listaRecomendaciones.appendChild(div);
    });
    seccionRecomendaciones.style.display = 'block';
  } else {
    seccionRecomendaciones.style.display = 'none';
  }
  
  // Acciones Tomadas
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
          <span class="detalle-item-readonly-tipo" style="color: #28a745;">Acción Tomada #${index + 1} - 📅 ${a.FECHA}</span>
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

function editarRegistro(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  console.log('Abriendo modal de edición para:', codigo);
  
  mostrarOverlay('Cargando información del JIAT...');
  
  fetch(`${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigo)}`)
    .then(response => response.json())
    .then(data => {
      console.log('Respuesta obtenerDetalleJIAT:', data);
      
      ocultarOverlay();
      
      if (!data.success) {
        alert('Error al cargar la información: ' + data.error);
        return;
      }
      
      cargarDatosEdicion(data);
      document.getElementById('modalEditar').style.display = 'block';
    })
    .catch(error => {
      ocultarOverlay();
      console.error('Error:', error);
      alert('Error al cargar la información del JIAT: ' + error.message);
    });
}

let detallesEditados = [];
let detallesNuevos = [];
let detallesEliminados = [];
let accionesEditadas = [];
let accionesEliminadas = [];
let contadorDetallesEdicion = 0;

function cargarDatosEdicion(data) {
  const cabecera = data.cabecera;
  
  // Resetear contadores
  detallesEditados = [];
  detallesNuevos = [];
  detallesEliminados = [];
  accionesEditadas = [];
  accionesEliminadas = [];
  contadorDetallesEdicion = 0;
  
  // Cargar periodos en el select
  const selectPeriodo = document.getElementById('editPeriodo');
  selectPeriodo.innerHTML = '<option value="">Seleccione un año</option>';
  const añoActual = new Date().getFullYear();
  for (let i = añoActual; i >= añoActual - 30; i--) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    selectPeriodo.appendChild(option);
  }
  
  // Cargar datos de cabecera
  document.getElementById('editCodigo').value = cabecera.CODIGO || '';
  document.getElementById('editNumero').value = cabecera.NUMERO || '';
  document.getElementById('editPeriodo').value = cabecera.PERIODO || '';
  
  // Convertir fecha de dd/MM/yyyy a yyyy-MM-dd
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
  
  // Cargar detalles (conclusiones, causas, recomendaciones)
  const containerDetalles = document.getElementById('editDetallesContainer');
  containerDetalles.innerHTML = '';
  
  const todosLosDetalles = [
    ...(data.conclusiones || []),
    ...(data.causas || []),
    ...(data.recomendaciones || [])
  ];
  
  todosLosDetalles.forEach((detalle, index) => {
    agregarDetalleEdicionExistente(detalle, index);
  });
  
  // Cargar acciones tomadas
  const containerAcciones = document.getElementById('editAccionesContainer');
  containerAcciones.innerHTML = '';
  
  if (data.acciones && data.acciones.length > 0) {
    data.acciones.forEach((accion, index) => {
      agregarAccionEdicionExistente(accion, index);
    });
  } else {
    containerAcciones.innerHTML = '<p style="color: #666; padding: 15px;">No hay acciones tomadas registradas.</p>';
  }
}

function agregarDetalleEdicionExistente(detalle, index) {
  contadorDetallesEdicion++;
  const container = document.getElementById('editDetallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item-editable';
  detalleDiv.id = `editDetalle-${contadorDetallesEdicion}`;
  detalleDiv.setAttribute('data-id-detalle', detalle.ID_DETALLE);
  detalleDiv.setAttribute('data-tipo', 'existente');
  
  // Convertir fecha
  let fechaInput = '';
  if (detalle.FECHA) {
    const partes = detalle.FECHA.split('/');
    if (partes.length === 3) {
      fechaInput = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
  }
  
  detalleDiv.innerHTML = `
    <div class="detalle-item-editable-header">
      <div class="detalle-item-editable-titulo">
        ${detalle.SUBTIPO} #${index + 1}
      </div>
      <button type="button" class="btn-eliminar-detalle" onclick="marcarDetalleParaEliminar(${contadorDetallesEdicion})">
        🗑️ Eliminar
      </button>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Asunto <span class="required">*</span></label>
        <select class="edit-detalle-subtipo" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN" ${detalle.SUBTIPO === 'CONCLUSIÓN' ? 'selected' : ''}>CONCLUSIÓN</option>
          <option value="CAUSA" ${detalle.SUBTIPO === 'CAUSA' ? 'selected' : ''}>CAUSA</option>
          <option value="RECOMENDACIÓN" ${detalle.SUBTIPO === 'RECOMENDACIÓN' ? 'selected' : ''}>RECOMENDACIÓN</option>
        </select>
      </div>

      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="edit-detalle-caracter" required>
          <option value="">Seleccione</option>
          <option value="PSICOFÍSICO" ${detalle.CARACTER === 'PSICOFÍSICO' ? 'selected' : ''}>PSICOFÍSICO</option>
          <option value="TÉCNICO" ${detalle.CARACTER === 'TÉCNICO' ? 'selected' : ''}>TÉCNICO</option>
          <option value="OPERATIVO" ${detalle.CARACTER === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
          <option value="PSICOLÓGICO" ${detalle.CARACTER === 'PSICOLÓGICO' ? 'selected' : ''}>PSICOLÓGICO</option>
          <option value="SALUD" ${detalle.CARACTER === 'SALUD' ? 'selected' : ''}>SALUD</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label>Descripción <span class="required">*</span></label>
      <textarea class="edit-detalle-descripcion" required>${detalle.DESCRIPCION || ''}</textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

function eliminarRegistro(index) {
  const registro = datosFiltrados[index];
  if (confirm('¿Estás seguro de eliminar el registro ' + registro.CODIGO + '?')) {
    mostrarOverlay('Eliminando registro...');
    
    fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'eliminarJIAT',
        CODIGO: registro.CODIGO
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        cargarDatosExcel().then(() => {
          ocultarOverlay();
          alert('Registro eliminado exitosamente');
        });
      } else {
        ocultarOverlay();
        alert('Error al eliminar: ' + data.error);
      }
    })
    .catch(error => {
      ocultarOverlay();
      alert('Error al eliminar el registro');
      console.error(error);
    });
  }
}

// ============================================
// FUNCIONES PARA ACCIONES TOMADAS
// ============================================

async function registrarAcciones(index) {
  const registro = datosFiltrados[index];
  codigoJIATAcciones = registro.CODIGO;
  
  console.log('Abriendo modal de acciones para:', codigoJIATAcciones);
  
  mostrarOverlay('Cargando información del JIAT...');
  
  try {
    const url = `${API_URL}?action=obtenerDetalleJIAT&codigo=${encodeURIComponent(codigoJIATAcciones)}`;
    console.log('URL para obtener detalle:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Respuesta obtenerDetalleJIAT:', data);
    
    ocultarOverlay();
    
    if (!data.success) {
      alert('Error al cargar la información: ' + data.error);
      return;
    }
    
    mostrarInformacionJIAT(data);
    
    contadorAcciones = 0;
    document.getElementById('accionesContainer').innerHTML = '';
    
    document.getElementById('modalAcciones').style.display = 'block';
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    alert('Error al cargar la información del JIAT: ' + error.message);
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
  
  const seccionConclusiones = document.getElementById('detallesConclusiones');
  const listaConclusiones = document.getElementById('listaConclusiones');
  if (data.conclusiones && data.conclusiones.length > 0) {
    listaConclusiones.innerHTML = '';
    data.conclusiones.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${c.CARACTER}:</strong> ${c.DESCRIPCION}`;
      listaConclusiones.appendChild(li);
    });
    seccionConclusiones.style.display = 'block';
  } else {
    seccionConclusiones.style.display = 'none';
  }
  
  const seccionCausas = document.getElementById('detallesCausas');
  const listaCausas = document.getElementById('listaCausas');
  if (data.causas && data.causas.length > 0) {
    listaCausas.innerHTML = '';
    data.causas.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${c.CARACTER}:</strong> ${c.DESCRIPCION}`;
      listaCausas.appendChild(li);
    });
    seccionCausas.style.display = 'block';
  } else {
    seccionCausas.style.display = 'none';
  }
  
  const seccionRecomendaciones = document.getElementById('detallesRecomendaciones');
  const listaRecomendaciones = document.getElementById('listaRecomendaciones');
  if (data.recomendaciones && data.recomendaciones.length > 0) {
    listaRecomendaciones.innerHTML = '';
    data.recomendaciones.forEach(r => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${r.CARACTER}:</strong> ${r.DESCRIPCION}`;
      listaRecomendaciones.appendChild(li);
    });
    seccionRecomendaciones.style.display = 'block';
  } else {
    seccionRecomendaciones.style.display = 'none';
  }
  
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
        <strong>Acción Tomada #${contadorAcciones}</strong>
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
        <label>Fecha de la Acción <span class="required">*</span></label>
        <input type="date" class="accion-fecha" id="fechaAccion${contadorAcciones}" value="${hoy}" required>
      </div>

      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select class="accion-caracter" id="caracterAccion${contadorAcciones}" required>
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
      <label>Descripción de la Acción Tomada <span class="required">*</span></label>
      <textarea class="accion-descripcion" id="descripcionAccion${contadorAcciones}" required placeholder="Describa detalladamente la acción que se tomó..."></textarea>
    </div>
  `;
  container.appendChild(accionDiv);
}

async function guardarAccionTomada(id) {
  const fecha = document.getElementById(`fechaAccion${id}`).value;
  const caracter = document.getElementById(`caracterAccion${id}`).value;
  const descripcion = document.getElementById(`descripcionAccion${id}`).value;

  if (!fecha || !caracter || !descripcion) {
    alert('Por favor complete todos los campos de la acción');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarAccion${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Guardando acción tomada...');

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

    console.log("Enviando acción tomada:", datosAccion);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(datosAccion)
    });

    const result = await response.json();
    console.log("Respuesta del servidor:", result);

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

      alert('✓ Acción tomada registrada correctamente');
      
      const indexRegistro = datosFiltrados.findIndex(r => r.CODIGO === codigoJIATAcciones);
      if (indexRegistro !== -1) {
        await registrarAcciones(indexRegistro);
      }
      
    } else {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar';
      alert('Error al guardar la acción: ' + result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    alert('Error al guardar la acción tomada: ' + error.message);
  }
}

function quitarAccionTomada(id) {
  const elemento = document.getElementById(`accion-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento && elemento.classList.contains('guardado')) {
    alert('No puede eliminar una acción ya guardada.');
  }
}

function cerrarModalAcciones() {
  document.getElementById('modalAcciones').style.display = 'none';
  cargarDatosExcel();
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
    // No cerrar automáticamente el modal de editar
  }
}
