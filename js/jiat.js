// ============================================
// JIAT.JS - VERSIÓN COMPLETA ADAPTADA PARA SUPABASE
// ============================================

// Configuración de Supabase - REEMPLAZA CON TUS CREDENCIALES
const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

console.log("=== DATOS DE SESIÓN ===");
console.log("Usuario:", usuario);
console.log("Unidad:", unidad);
console.log("Rol:", rol);
console.log("=== FIN SESIÓN ===");

window.onload = function() {
  cargarPeriodos();
  cargarDatosExcel();
};

// ============================================
// FUNCIONES DE INICIALIZACIÓN
// ============================================

function cargarPeriodos() {
  const selects = ['periodo', 'editPeriodo'];
  const añoActual = new Date().getFullYear();
  
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      for (let i = añoActual; i >= añoActual - 30; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        select.appendChild(option);
      }
    }
  });
}

function actualizarRangoFechas() {
  const periodo = document.getElementById('periodo').value;
  const inputFecha = document.getElementById('fecha');
  
  if (periodo) {
    inputFecha.min = `${periodo}-01-01`;
    inputFecha.max = `${periodo}-12-31`;
    inputFecha.value = '';
    document.getElementById('numero').style.borderColor = '';
    document.getElementById('periodo').style.borderColor = '';
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
  const numero = document.getElementById('numero').value;
  const periodo = document.getElementById('periodo').value;
  const fecha = document.getElementById('fecha').value;
  const lugar = document.getElementById('lugar').value;
  const fatal = document.getElementById('fatal').value;
  const cantfall = document.getElementById('cantfall').value;
  const descripcion = document.getElementById('descripcion').value;

  if (!numero || !periodo || !fecha || !lugar || !fatal || !descripcion) {
    mostrarNotificacion('Por favor complete todos los campos obligatorios', 'error');
    return;
  }

  const involucradosInputs = document.querySelectorAll('.involucrado-input');
  const involucrados = Array.from(involucradosInputs)
    .map(input => input.value.trim())
    .filter(val => val !== '')
    .join(', ');

  if (!involucrados) {
    mostrarNotificacion('Debe agregar al menos un involucrado', 'error');
    return;
  }

  const btnGuardar = document.getElementById('btnGuardarCabecera');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Validando...';

  // VALIDACIÓN: Verificar que el número sea único SOLO en la unidad del usuario logueado
  try {
    const { data: existentes, error: errorValidacion } = await supabase
      .from('jiat')
      .select('codigo, unidad')
      .eq('numero', numero)
      .eq('periodo', periodo)
      .eq('unidad', unidad); // Solo valida en la unidad del usuario

    if (errorValidacion) {
      throw errorValidacion;
    }

    // Si existe al menos un registro con ese número+periodo en esta unidad
    if (existentes && existentes.length > 0) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar y Continuar';
      
      mostrarNotificacion(
        `⚠️ ERROR: Ya existe un JIAT con el número ${numero} y periodo ${periodo} en la unidad ${unidad}.<br><br>Por favor, use otro número para esta unidad.`, 
        'error'
      );
      
      document.getElementById('numero').style.borderColor = '#dc3545';
      document.getElementById('periodo').style.borderColor = '#dc3545';
      
      return;
    }

  } catch (error) {
    console.error('Error al validar:', error);
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    mostrarNotificacion('Error al validar el número de JIAT', 'error');
    return;
  }

  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Guardando datos principales...');

  try {
    const numeroFormateado = numero.padStart(3, '0');
    const codigo = `JIAT-${numeroFormateado}-${periodo}-${unidad.replace(/\s+/g, '')}`;
    codigoJIATActual = codigo;
    fechaJIATActual = fecha;
    periodoJIATActual = periodo;

    // Insertar en Supabase
    const { data, error } = await supabase
      .from('jiat')
      .insert([{
        codigo: codigo,
        usuarioreg: usuario,
        tipo: 'JIAT',
        numero: parseInt(numero),
        periodo: parseInt(periodo),
        unidad: unidad,
        fecha: fecha,
        lugar: lugar,
        involucrado: involucrados,
        fatal: fatal,
        cantfall: parseInt(cantfall),
        descripcion: descripcion
      }])
      .select();

    ocultarOverlay();

    if (error) {
      throw error;
    }

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

    mostrarNotificacion(`✓ Datos principales guardados correctamente. Código: ${codigo}. Ahora puede agregar conclusiones, causas y recomendaciones.`, 'success');
    
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    mostrarNotificacion('Error al guardar los datos principales: ' + error.message, 'error');
  }
}

// ============================================
// FUNCIONES DE DETALLES (NUEVO REGISTRO)
// ============================================

function agregarDetalle() {
  if (!cabeceraGuardada) {
    mostrarNotificacion('Primero debe guardar los datos principales', 'error');
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
    mostrarNotificacion('Por favor complete todos los campos del detalle', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarDet${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Guardando detalle...');

  try {
    // Generar ID de detalle
    const { data: ultimoDetalle } = await supabase
      .from('detalle_accidentes')
      .select('id_detalle')
      .order('id_detalle', { ascending: false })
      .limit(1)
      .single();

    let nuevoIdDetalle = 'DET-00001';
    if (ultimoDetalle) {
      const numeroActual = parseInt(ultimoDetalle.id_detalle.split('-')[1]);
      nuevoIdDetalle = `DET-${(numeroActual + 1).toString().padStart(5, '0')}`;
    }

    // Insertar en Supabase
    const { error } = await supabase
      .from('detalle_accidentes')
      .insert([{
        id_detalle: nuevoIdDetalle,
        usuarioreg: usuario,
        unidad: unidad,
        tipo: 'JIAT',
        codigo: codigoJIATActual,
        subtipo: subtipo,
        fechareg: new Date().toISOString(),
        fecha: fechaJIATActual,
        periodo: parseInt(periodoJIATActual),
        caracter: caracter,
        descripcion: descripcionDet
      }]);

    ocultarOverlay();

    if (error) {
      throw error;
    }

    const detalleDiv = document.getElementById(`detalle-${id}`);
    detalleDiv.classList.add('guardado');
    
    const titulo = detalleDiv.querySelector('.detalle-titulo');
    titulo.innerHTML += ' <span class="badge-guardado-detalle">✓ Guardado</span>';
    
    document.getElementById(`subtipo${id}`).disabled = true;
    document.getElementById(`caracter${id}`).disabled = true;
    document.getElementById(`descripcionDet${id}`).disabled = true;
    btnGuardar.style.display = 'none';

    mostrarNotificacion('✓ Detalle guardado correctamente', 'success');
    
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error al guardar el detalle: ' + error.message, 'error');
  }
}

function quitarDetalle(id) {
  const elemento = document.getElementById(`detalle-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento && elemento.classList.contains('guardado')) {
    mostrarNotificacion('No puede eliminar un detalle ya guardado', 'warning');
  }
}

// ============================================
// CARGAR Y MOSTRAR DATOS
// ============================================

async function cargarDatosExcel() {
  const loadingEl = document.getElementById('loading');
  
  try {
    loadingEl.innerHTML = 'Cargando datos... ⏳';
    
    let query = supabase
      .from('jiat')
      .select('*')
      .order('fecha', { ascending: false });

    // Filtrar por unidad si no es ADMIN
    if (rol !== 'ADMIN' && rol !== 'admin') {
      query = query.eq('unidad', unidad);
    }

    const { data, error } = await query;
    
    if (error) {
      throw error;
    }

    console.log("=== DATOS RECIBIDOS DE SUPABASE ===");
    console.log(data);
    console.log("=== FIN DATOS ===");
    
    datosCompletos = data.map(registro => ({
      ...registro,
      CODIGO: registro.codigo,
      UNIDAD: registro.unidad,
      FECHA: formatearFechaDisplay(registro.fecha),
      FATAL: registro.fatal,
      NUMERO: registro.numero,
      PERIODO: registro.periodo,
      LUGAR: registro.lugar,
      INVOLUCRADO: registro.involucrado,
      CANTFALL: registro.cantfall,
      DESCRIPCION: registro.descripcion
    }));
    
    datosFiltrados = [...datosCompletos];
    
    loadingEl.style.display = 'none';
    document.getElementById('tablaJIAT').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';
    
    actualizarTabla();
    
  } catch (error) {
    console.error('Error al cargar los datos:', error);
    loadingEl.innerHTML = `❌ Error: ${error.message}<br><button onclick="cargarDatosExcel()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
  }
}

function formatearFechaDisplay(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha + 'T00:00:00');
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
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
// VER DETALLE COMPLETO
// ============================================

async function verDetalle(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  mostrarOverlay('Cargando información...');
  
  try {
    // Obtener cabecera
    const { data: cabecera, error: errorCabecera } = await supabase
      .from('jiat')
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (errorCabecera) throw errorCabecera;

    // Validar permisos
    if (rol !== 'ADMIN' && rol !== 'admin' && cabecera.unidad !== unidad) {
      throw new Error('No tiene permisos para acceder a este JIAT');
    }

    // Obtener detalles
    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalle_accidentes')
      .select('*')
      .eq('codigo', codigo)
      .order('fechareg', { ascending: true });

    if (errorDetalles) throw errorDetalles;

    // Organizar detalles por subtipo
    const conclusiones = detalles.filter(d => d.subtipo === 'CONCLUSIÓN');
    const causas = detalles.filter(d => d.subtipo === 'CAUSA');
    const recomendaciones = detalles.filter(d => d.subtipo === 'RECOMENDACIÓN');
    const acciones = detalles.filter(d => d.subtipo === 'ACCIÓN TOMADA');

    const data = {
      success: true,
      cabecera: {
        CODIGO: cabecera.codigo,
        FECHA: formatearFechaDisplay(cabecera.fecha),
        UNIDAD: cabecera.unidad,
        LUGAR: cabecera.lugar,
        INVOLUCRADO: cabecera.involucrado,
        FATAL: cabecera.fatal,
        DESCRIPCION: cabecera.descripcion,
        NUMERO: cabecera.numero,
        PERIODO: cabecera.periodo,
        CANTFALL: cabecera.cantfall
      },
      conclusiones: conclusiones.map(d => ({
        ID_DETALLE: d.id_detalle,
        CARACTER: d.caracter,
        DESCRIPCION: d.descripcion
      })),
      causas: causas.map(d => ({
        ID_DETALLE: d.id_detalle,
        CARACTER: d.caracter,
        DESCRIPCION: d.descripcion
      })),
      recomendaciones: recomendaciones.map(d => ({
        ID_DETALLE: d.id_detalle,
        CARACTER: d.caracter,
        DESCRIPCION: d.descripcion
      })),
      acciones: acciones.map(d => ({
        ID_DETALLE: d.id_detalle,
        FECHA: formatearFechaDisplay(d.fecha),
        CARACTER: d.caracter,
        DESCRIPCION: d.descripcion
      }))
    };

    ocultarOverlay();
    
    mostrarDetalleCompleto(data);
    document.getElementById('modalVerDetalle').style.display = 'block';
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar la información del JIAT: ' + error.message, 'error');
  }
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
// ELIMINAR REGISTRO
// ============================================

async function eliminarRegistro(index) {
  const registro = datosFiltrados[index];
  
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de eliminar el registro <strong>${registro.CODIGO}</strong>?<br><br>` +
    `<strong>⚠️ ATENCIÓN:</strong> Se eliminará:<br>` +
    `• La JIAT completa<br>` +
    `• Todos los detalles (conclusiones, causas, recomendaciones)<br>` +
    `• Todas las acciones tomadas<br><br>` +
    `<strong>Esta acción NO se puede deshacer.</strong>`,
    '🗑️ Confirmar Eliminación de JIAT'
  );
  
  if (confirmar) {
    mostrarOverlay('Eliminando...');
    
    try {
      // Validar permisos
      if (rol !== 'ADMIN' && rol !== 'admin' && registro.UNIDAD !== unidad) {
        throw new Error('No tiene permisos para eliminar este JIAT');
      }

      // Eliminar detalles primero
      const { error: errorDetalles } = await supabase
        .from('detalle_accidentes')
        .delete()
        .eq('codigo', registro.CODIGO);

      if (errorDetalles) throw errorDetalles;

      // Eliminar JIAT
      const { error: errorJIAT } = await supabase
        .from('jiat')
        .delete()
        .eq('codigo', registro.CODIGO);

      if (errorJIAT) throw errorJIAT;

      await cargarDatosExcel();
      ocultarOverlay();
      mostrarNotificacion('✓ Eliminado correctamente', 'success');
      
    } catch (error) {
      ocultarOverlay();
      mostrarNotificacion('Error: ' + error.message, 'error');
    }
  }
}

// ============================================
// REGISTRAR ACCIONES TOMADAS
// ============================================

async function registrarAcciones(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  mostrarOverlay('Cargando información...');
  
  try {
    // Obtener cabecera
    const { data: cabecera, error: errorCabecera } = await supabase
      .from('jiat')
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (errorCabecera) throw errorCabecera;

    // Validar permisos
    if (rol !== 'ADMIN' && rol !== 'admin' && cabecera.unidad !== unidad) {
      throw new Error('No tiene permisos para acceder a este JIAT');
    }

    // Obtener detalles y acciones
    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalle_accidentes')
      .select('*')
      .eq('codigo', codigo)
      .order('fechareg', { ascending: true });

    if (errorDetalles) throw errorDetalles;

    // Separar por tipo
    const conclusiones = detalles.filter(d => d.subtipo === 'CONCLUSIÓN');
    const causas = detalles.filter(d => d.subtipo === 'CAUSA');
    const recomendaciones = detalles.filter(d => d.subtipo === 'RECOMENDACIÓN');
    const acciones = detalles.filter(d => d.subtipo === 'ACCIÓN TOMADA');

    // Guardar datos globales
    codigoJIATAcciones = codigo;
    periodoJIATAcciones = cabecera.periodo;
    contadorAcciones = 0;

    // Mostrar información en el modal
    document.getElementById('infoCodigo').textContent = cabecera.codigo;
    document.getElementById('infoFecha').textContent = formatearFechaDisplay(cabecera.fecha);
    document.getElementById('infoUnidad').textContent = cabecera.unidad;
    document.getElementById('infoLugar').textContent = cabecera.lugar;
    document.getElementById('infoInvolucrado').textContent = cabecera.involucrado;
    document.getElementById('infoFatal').textContent = cabecera.fatal;
    document.getElementById('infoDescripcion').textContent = cabecera.descripcion;

    // Mostrar detalles existentes
    mostrarDetallesEnModal('detallesConclusiones', 'listaConclusiones', conclusiones, '📌');
    mostrarDetallesEnModal('detallesCausas', 'listaCausas', causas, '⚠️');
    mostrarDetallesEnModal('detallesRecomendaciones', 'listaRecomendaciones', recomendaciones, '💡');

    // Mostrar acciones ya registradas
    const seccionAcciones = document.getElementById('seccionAccionesRegistradas');
    const listaAcciones = document.getElementById('listaAccionesRegistradas');
    
    if (acciones.length > 0) {
      listaAcciones.innerHTML = '';
      acciones.forEach((accion, index) => {
        const div = document.createElement('div');
        div.className = 'detalle-item-readonly';
        div.style.borderLeftColor = '#28a745';
        div.innerHTML = `
          <div class="detalle-item-readonly-header">
            <span class="detalle-item-readonly-tipo" style="color: #28a745;">✅ Acción #${index + 1} - 📅 ${formatearFechaDisplay(accion.fecha)}</span>
            <span class="detalle-item-readonly-caracter" style="background: #28a745;">${accion.caracter}</span>
          </div>
          <div class="detalle-item-readonly-descripcion">${accion.descripcion}</div>
        `;
        listaAcciones.appendChild(div);
      });
      seccionAcciones.style.display = 'block';
    } else {
      seccionAcciones.style.display = 'none';
    }

    // Limpiar contenedor de nuevas acciones
    document.getElementById('accionesContainer').innerHTML = '';

    ocultarOverlay();
    document.getElementById('modalAcciones').style.display = 'block';

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar la información: ' + error.message, 'error');
  }
}

function mostrarDetallesEnModal(seccionId, listaId, detalles, icono) {
  const seccion = document.getElementById(seccionId);
  const lista = document.getElementById(listaId);
  
  if (detalles && detalles.length > 0) {
    lista.innerHTML = '';
    detalles.forEach(det => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${det.caracter}:</strong> ${det.descripcion}`;
      lista.appendChild(li);
    });
    seccion.style.display = 'block';
  } else {
    seccion.style.display = 'none';
  }
}

function agregarAccionTomada() {
  contadorAcciones++;
  const container = document.getElementById('accionesContainer');
  const accionDiv = document.createElement('div');
  accionDiv.className = 'detalle-item';
  accionDiv.id = `accion-${contadorAcciones}`;
  accionDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo">
        <strong>Acción Tomada #${contadorAcciones}</strong>
      </div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarAccionTomada(${contadorAcciones})" id="btnGuardarAccion${contadorAcciones}">
          💾 Guardar
        </button>
        <button type="button" class="btn-quitar" onclick="quitarAccionTomada(${contadorAcciones})">× Quitar</button>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Fecha de la Acción <span class="required">*</span></label>
        <input type="date" id="fechaAccion${contadorAcciones}" required>
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
      <label>Descripción de la Acción <span class="required">*</span></label>
      <textarea id="descripcionAccion${contadorAcciones}" required placeholder="Describa la acción tomada..."></textarea>
    </div>
  `;
  container.appendChild(accionDiv);
}

async function guardarAccionTomada(id) {
  const fechaAccion = document.getElementById(`fechaAccion${id}`).value;
  const caracterAccion = document.getElementById(`caracterAccion${id}`).value;
  const descripcionAccion = document.getElementById(`descripcionAccion${id}`).value;

  if (!fechaAccion || !caracterAccion || !descripcionAccion) {
    mostrarNotificacion('Por favor complete todos los campos de la acción', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarAccion${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Guardando acción tomada...');

  try {
    // Generar ID
    const { data: ultimoDetalle } = await supabase
      .from('detalle_accidentes')
      .select('id_detalle')
      .order('id_detalle', { ascending: false })
      .limit(1)
      .single();

    let nuevoIdDetalle = 'DET-00001';
    if (ultimoDetalle) {
      const numeroActual = parseInt(ultimoDetalle.id_detalle.split('-')[1]);
      nuevoIdDetalle = `DET-${(numeroActual + 1).toString().padStart(5, '0')}`;
    }

    // Insertar en Supabase
    const { error } = await supabase
      .from('detalle_accidentes')
      .insert([{
        id_detalle: nuevoIdDetalle,
        usuarioreg: usuario,
        unidad: unidad,
        tipo: 'JIAT',
        codigo: codigoJIATAcciones,
        subtipo: 'ACCIÓN TOMADA',
        fechareg: new Date().toISOString(),
        fecha: fechaAccion,
        periodo: parseInt(periodoJIATAcciones),
        caracter: caracterAccion,
        descripcion: descripcionAccion
      }]);

    ocultarOverlay();

    if (error) {
      throw error;
    }

    const accionDiv = document.getElementById(`accion-${id}`);
    accionDiv.classList.add('guardado');
    
    const titulo = accionDiv.querySelector('.detalle-titulo');
    titulo.innerHTML += ' <span class="badge-guardado-detalle">✓ Guardado</span>';
    
    document.getElementById(`fechaAccion${id}`).disabled = true;
    document.getElementById(`caracterAccion${id}`).disabled = true;
    document.getElementById(`descripcionAccion${id}`).disabled = true;
    btnGuardar.style.display = 'none';

    mostrarNotificacion('✓ Acción tomada guardada correctamente', 'success');
    
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error al guardar la acción: ' + error.message, 'error');
  }
}

function quitarAccionTomada(id) {
  const elemento = document.getElementById(`accion-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento && elemento.classList.contains('guardado')) {
    mostrarNotificacion('No puede eliminar una acción ya guardada', 'warning');
  }
}

function cerrarModalAcciones() {
  document.getElementById('modalAcciones').style.display = 'none';
}

// ============================================
// EDITAR REGISTRO
// ============================================

async function editarRegistro(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  mostrarOverlay('Cargando datos para edición...');
  
  try {
    // Validar permisos
    if (rol !== 'ADMIN' && rol !== 'admin' && registro.UNIDAD !== unidad) {
      throw new Error('No tiene permisos para editar este JIAT');
    }

    // Obtener cabecera
    const { data: cabecera, error: errorCabecera } = await supabase
      .from('jiat')
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (errorCabecera) throw errorCabecera;

    // Obtener detalles
    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalle_accidentes')
      .select('*')
      .eq('codigo', codigo)
      .order('fechareg', { ascending: true });

    if (errorDetalles) throw errorDetalles;

    // Resetear variables
    contadorDetallesEdicion = 0;
    contadorAccionesEdicion = 0;
    cabeceraEdicionGuardada = false;
    codigoActualEdicion = codigo;

    // Cargar datos en el formulario
    document.getElementById('editCodigoActual').value = codigo;
    document.getElementById('editNumero').value = cabecera.numero;
    document.getElementById('editPeriodo').value = cabecera.periodo;
    document.getElementById('editFecha').value = cabecera.fecha;
    document.getElementById('editLugar').value = cabecera.lugar;
    document.getElementById('editInvolucrado').value = cabecera.involucrado;
    document.getElementById('editFatal').value = cabecera.fatal;
    document.getElementById('editCantfall').value = cabecera.cantfall;
    document.getElementById('editDescripcion').value = cabecera.descripcion;

    // Habilitar sección de cabecera
    const seccionCabecera = document.getElementById('editSeccionCabecera');
    seccionCabecera.classList.remove('guardada');
    const badge = seccionCabecera.querySelector('.badge-guardado');
    if (badge) badge.remove();

    // Bloquear detalles hasta guardar cabecera
    const seccionDetalles = document.getElementById('editSeccionDetalles');
    seccionDetalles.classList.add('bloqueada');
    document.getElementById('editMensajeBloqueo').style.display = 'block';
    document.getElementById('btnAgregarDetalleEdit').disabled = true;

    const seccionAcciones = document.getElementById('editSeccionAcciones');
    seccionAcciones.classList.add('bloqueada');

    // Limpiar contenedores
    document.getElementById('editDetallesContainer').innerHTML = '';
    document.getElementById('editAccionesContainer').innerHTML = '';

    ocultarOverlay();
    document.getElementById('modalEditar').style.display = 'block';

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar los datos: ' + error.message, 'error');
  }
}
async function guardarCabeceraEdicion() {
  const codigo = document.getElementById('editCodigoActual').value;
  const fecha = document.getElementById('editFecha').value;
  const lugar = document.getElementById('editLugar').value;
  const involucrado = document.getElementById('editInvolucrado').value;
  const fatal = document.getElementById('editFatal').value;
  const cantfall = document.getElementById('editCantfall').value;
  const descripcion = document.getElementById('editDescripcion').value;

  if (!fecha || !lugar || !involucrado || !fatal || !descripcion) {
    mostrarNotificacion('Por favor complete todos los campos obligatorios', 'error');
    return;
  }

  const btnGuardar = document.getElementById('btnGuardarCabeceraEdit');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Actualizando datos principales...');

  try {
    // Actualizar en Supabase
    const { error } = await supabase
      .from('jiat')
      .update({
        fecha: fecha,
        lugar: lugar,
        involucrado: involucrado,
        fatal: fatal,
        cantfall: parseInt(cantfall),
        descripcion: descripcion
      })
      .eq('codigo', codigo);

    if (error) throw error;

    // Cargar detalles existentes
    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalle_accidentes')
      .select('*')
      .eq('codigo', codigo)
      .order('fechareg', { ascending: true });

    if (errorDetalles) throw errorDetalles;

    // Separar detalles y acciones
    const detallesNormales = detalles.filter(d => d.subtipo !== 'ACCIÓN TOMADA');
    const acciones = detalles.filter(d => d.subtipo === 'ACCIÓN TOMADA');

    // Mostrar detalles existentes EDITABLES
    const containerDetalles = document.getElementById('editDetallesContainer');
    containerDetalles.innerHTML = '';
    
    detallesNormales.forEach((det, index) => {
      contadorDetallesEdicion++;
      const div = document.createElement('div');
      div.className = 'detalle-item editable-existente';
      div.id = `detalleExistente-${det.id_detalle}`;
      div.setAttribute('data-id-detalle', det.id_detalle);
      
      div.innerHTML = `
        <div class="detalle-item-header">
          <div class="detalle-titulo">
            <strong>${det.subtipo} #${index + 1}</strong>
            <span class="badge-existente">📌 Existente</span>
          </div>
          <div>
            <button type="button" class="btn-editar-detalle" onclick="habilitarEdicionDetalle('${det.id_detalle}')" id="btnEditarDet-${det.id_detalle}">
              ✏️ Editar
            </button>
            <button type="button" class="btn-guardar-detalle" onclick="guardarEdicionDetalle('${det.id_detalle}')" id="btnGuardarEditDet-${det.id_detalle}" style="display:none;">
              💾 Guardar
            </button>
            <button type="button" class="btn-eliminar-detalle" onclick="eliminarDetalleExistente('${det.id_detalle}', '${codigo}')">
              🗑️ Eliminar
            </button>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Asunto</label>
            <select id="subtipoExist-${det.id_detalle}" disabled>
              <option value="CONCLUSIÓN" ${det.subtipo === 'CONCLUSIÓN' ? 'selected' : ''}>CONCLUSIÓN</option>
              <option value="CAUSA" ${det.subtipo === 'CAUSA' ? 'selected' : ''}>CAUSA</option>
              <option value="RECOMENDACIÓN" ${det.subtipo === 'RECOMENDACIÓN' ? 'selected' : ''}>RECOMENDACIÓN</option>
            </select>
          </div>

          <div class="form-group">
            <label>Carácter</label>
            <select id="caracterExist-${det.id_detalle}" disabled>
              <option value="PSICOFÍSICO" ${det.caracter === 'PSICOFÍSICO' ? 'selected' : ''}>PSICOFÍSICO</option>
              <option value="TÉCNICO" ${det.caracter === 'TÉCNICO' ? 'selected' : ''}>TÉCNICO</option>
              <option value="OPERATIVO" ${det.caracter === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
              <option value="PSICOLÓGICO" ${det.caracter === 'PSICOLÓGICO' ? 'selected' : ''}>PSICOLÓGICO</option>
              <option value="SALUD" ${det.caracter === 'SALUD' ? 'selected' : ''}>SALUD</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Descripción</label>
          <textarea id="descripcionExist-${det.id_detalle}" disabled>${det.descripcion}</textarea>
        </div>
      `;
      containerDetalles.appendChild(div);
    });

    // Mostrar acciones existentes EDITABLES/ELIMINABLES
    const containerAcciones = document.getElementById('editAccionesContainer');
    containerAcciones.innerHTML = '';
    
    if (acciones.length > 0) {
      acciones.forEach((accion, index) => {
        contadorAccionesEdicion++;
        const div = document.createElement('div');
        div.className = 'detalle-item editable-existente';
        div.id = `accionExistente-${accion.id_detalle}`;
        div.style.borderLeftColor = '#28a745';
        
        div.innerHTML = `
          <div class="detalle-item-header">
            <div class="detalle-titulo">
              <strong>✅ Acción Tomada #${index + 1}</strong>
              <span class="badge-existente" style="background: #28a745;">📌 Existente</span>
            </div>
            <div>
              <button type="button" class="btn-editar-detalle" onclick="habilitarEdicionAccion('${accion.id_detalle}')" id="btnEditarAccion-${accion.id_detalle}">
                ✏️ Editar
              </button>
              <button type="button" class="btn-guardar-detalle" onclick="guardarEdicionAccion('${accion.id_detalle}')" id="btnGuardarEditAccion-${accion.id_detalle}" style="display:none;">
                💾 Guardar
              </button>
              <button type="button" class="btn-eliminar-detalle" onclick="eliminarAccionExistente('${accion.id_detalle}', '${codigo}')">
                🗑️ Eliminar
              </button>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Fecha de la Acción</label>
              <input type="date" id="fechaAccionExist-${accion.id_detalle}" value="${accion.fecha}" disabled>
            </div>

            <div class="form-group">
              <label>Carácter</label>
              <select id="caracterAccionExist-${accion.id_detalle}" disabled>
                <option value="PSICOFÍSICO" ${accion.caracter === 'PSICOFÍSICO' ? 'selected' : ''}>PSICOFÍSICO</option>
                <option value="TÉCNICO" ${accion.caracter === 'TÉCNICO' ? 'selected' : ''}>TÉCNICO</option>
                <option value="OPERATIVO" ${accion.caracter === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
                <option value="PSICOLÓGICO" ${accion.caracter === 'PSICOLÓGICO' ? 'selected' : ''}>PSICOLÓGICO</option>
                <option value="SALUD" ${accion.caracter === 'SALUD' ? 'selected' : ''}>SALUD</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Descripción de la Acción</label>
            <textarea id="descripcionAccionExist-${accion.id_detalle}" disabled>${accion.descripcion}</textarea>
          </div>
        `;
        containerAcciones.appendChild(div);
      });
      
      // Agregar mensaje informativo al final
      const infoDiv = document.createElement('div');
      infoDiv.className = 'mensaje-info';
      infoDiv.style.marginTop = '15px';
      infoDiv.innerHTML = 'ℹ️ Para agregar nuevas acciones tomadas, use el botón "📋 Registrar Acciones" desde la tabla principal.';
      containerAcciones.appendChild(infoDiv);
      
    } else {
      containerAcciones.innerHTML = `
        <div class="mensaje-info">
          No hay acciones tomadas registradas.<br>
          Para agregar acciones, use el botón "📋 Registrar Acciones" desde la tabla principal.
        </div>
      `;
    }

    ocultarOverlay();
    cabeceraEdicionGuardada = true;

    // Marcar cabecera como guardada
    const seccionCabecera = document.getElementById('editSeccionCabecera');
    seccionCabecera.classList.add('guardada');
    seccionCabecera.innerHTML += '<span class="badge-guardado">✓ Guardado</span>';
    
    document.querySelectorAll('#editSeccionCabecera input:not([readonly]), #editSeccionCabecera select:not([disabled]), #editSeccionCabecera textarea, #editSeccionCabecera button').forEach(el => {
      el.disabled = true;
    });

    // Desbloquear detalles
    const seccionDetalles = document.getElementById('editSeccionDetalles');
    seccionDetalles.classList.remove('bloqueada');
    document.getElementById('editMensajeBloqueo').style.display = 'none';
    document.getElementById('btnAgregarDetalleEdit').disabled = false;

    // Desbloquear acciones
    const seccionAcciones = document.getElementById('editSeccionAcciones');
    seccionAcciones.classList.remove('bloqueada');

    mostrarNotificacion('✓ Datos principales actualizados. Puede editar detalles y acciones existentes o agregar nuevos detalles.', 'success');

  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
  }
}

// Habilitar edición de detalle existente
function habilitarEdicionDetalle(idDetalle) {
  document.getElementById(`subtipoExist-${idDetalle}`).disabled = false;
  document.getElementById(`caracterExist-${idDetalle}`).disabled = false;
  document.getElementById(`descripcionExist-${idDetalle}`).disabled = false;
  
  document.getElementById(`btnEditarDet-${idDetalle}`).style.display = 'none';
  document.getElementById(`btnGuardarEditDet-${idDetalle}`).style.display = 'inline-block';
}

// Guardar edición de detalle existente
async function guardarEdicionDetalle(idDetalle) {
  const subtipo = document.getElementById(`subtipoExist-${idDetalle}`).value;
  const caracter = document.getElementById(`caracterExist-${idDetalle}`).value;
  const descripcion = document.getElementById(`descripcionExist-${idDetalle}`).value;

  if (!subtipo || !caracter || !descripcion) {
    mostrarNotificacion('Complete todos los campos del detalle', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarEditDet-${idDetalle}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Actualizando detalle...');

  try {
    const { error } = await supabase
      .from('detalle_accidentes')
      .update({
        subtipo: subtipo,
        caracter: caracter,
        descripcion: descripcion
      })
      .eq('id_detalle', idDetalle);

    if (error) throw error;

    ocultarOverlay();

    document.getElementById(`subtipoExist-${idDetalle}`).disabled = true;
    document.getElementById(`caracterExist-${idDetalle}`).disabled = true;
    document.getElementById(`descripcionExist-${idDetalle}`).disabled = true;
    
    btnGuardar.style.display = 'none';
    document.getElementById(`btnEditarDet-${idDetalle}`).style.display = 'inline-block';

    mostrarNotificacion('✓ Detalle actualizado correctamente', 'success');

  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
  }
}

// Eliminar detalle existente
async function eliminarDetalleExistente(idDetalle, codigo) {
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de eliminar este detalle?<br><br><strong>Esta acción NO se puede deshacer.</strong>`,
    '🗑️ Confirmar Eliminación'
  );

  if (!confirmar) return;

  mostrarOverlay('Eliminando detalle...');

  try {
    const { error } = await supabase
      .from('detalle_accidentes')
      .delete()
      .eq('id_detalle', idDetalle);

    if (error) throw error;

    ocultarOverlay();
    
    const elemento = document.getElementById(`detalleExistente-${idDetalle}`);
    if (elemento) elemento.remove();

    mostrarNotificacion('✓ Detalle eliminado correctamente', 'success');

  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
  }
}

// Habilitar edición de acción existente
function habilitarEdicionAccion(idDetalle) {
  document.getElementById(`fechaAccionExist-${idDetalle}`).disabled = false;
  document.getElementById(`caracterAccionExist-${idDetalle}`).disabled = false;
  document.getElementById(`descripcionAccionExist-${idDetalle}`).disabled = false;
  
  document.getElementById(`btnEditarAccion-${idDetalle}`).style.display = 'none';
  document.getElementById(`btnGuardarEditAccion-${idDetalle}`).style.display = 'inline-block';
}

// Guardar edición de acción existente
async function guardarEdicionAccion(idDetalle) {
  const fecha = document.getElementById(`fechaAccionExist-${idDetalle}`).value;
  const caracter = document.getElementById(`caracterAccionExist-${idDetalle}`).value;
  const descripcion = document.getElementById(`descripcionAccionExist-${idDetalle}`).value;

  if (!fecha || !caracter || !descripcion) {
    mostrarNotificacion('Complete todos los campos de la acción', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarEditAccion-${idDetalle}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Actualizando acción...');

  try {
    const { error } = await supabase
      .from('detalle_accidentes')
      .update({
        fecha: fecha,
        caracter: caracter,
        descripcion: descripcion
      })
      .eq('id_detalle', idDetalle);

    if (error) throw error;

    ocultarOverlay();

    document.getElementById(`fechaAccionExist-${idDetalle}`).disabled = true;
    document.getElementById(`caracterAccionExist-${idDetalle}`).disabled = true;
    document.getElementById(`descripcionAccionExist-${idDetalle}`).disabled = true;
    
    btnGuardar.style.display = 'none';
    document.getElementById(`btnEditarAccion-${idDetalle}`).style.display = 'inline-block';

    mostrarNotificacion('✓ Acción actualizada correctamente', 'success');

  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
  }
}

// Eliminar acción existente
async function eliminarAccionExistente(idDetalle, codigo) {
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de eliminar esta acción tomada?<br><br><strong>Esta acción NO se puede deshacer.</strong>`,
    '🗑️ Confirmar Eliminación'
  );

  if (!confirmar) return;

  mostrarOverlay('Eliminando acción...');

  try {
    const { error } = await supabase
      .from('detalle_accidentes')
      .delete()
      .eq('id_detalle', idDetalle);

    if (error) throw error;

    ocultarOverlay();
    
    const elemento = document.getElementById(`accionExistente-${idDetalle}`);
    if (elemento) elemento.remove();

    mostrarNotificacion('✓ Acción eliminada correctamente', 'success');

  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
  }
}

// Función de cierre mejorada
function cerrarModalEditar() {
  const confirmacion = cabeceraEdicionGuardada 
    ? confirm('Los cambios ya fueron guardados. ¿Desea cerrar?')
    : confirm('¿Desea cerrar sin guardar cambios?');
    
  if (confirmacion) {
    document.getElementById('modalEditar').style.display = 'none';
    if (cabeceraEdicionGuardada) {
      cargarDatosExcel();
    }
  }
}


// Habilitar edición de detalle existente
function habilitarEdicionDetalle(idDetalle) {
  document.getElementById(`subtipoExist-${idDetalle}`).disabled = false;
  document.getElementById(`caracterExist-${idDetalle}`).disabled = false;
  document.getElementById(`descripcionExist-${idDetalle}`).disabled = false;
  
  document.getElementById(`btnEditarDet-${idDetalle}`).style.display = 'none';
  document.getElementById(`btnGuardarEditDet-${idDetalle}`).style.display = 'inline-block';
}

// Guardar edición de detalle existente
async function guardarEdicionDetalle(idDetalle) {
  const subtipo = document.getElementById(`subtipoExist-${idDetalle}`).value;
  const caracter = document.getElementById(`caracterExist-${idDetalle}`).value;
  const descripcion = document.getElementById(`descripcionExist-${idDetalle}`).value;

  if (!subtipo || !caracter || !descripcion) {
    mostrarNotificacion('Complete todos los campos del detalle', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarEditDet-${idDetalle}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Actualizando detalle...');

  try {
    const { error } = await supabase
      .from('detalle_accidentes')
      .update({
        subtipo: subtipo,
        caracter: caracter,
        descripcion: descripcion
      })
      .eq('id_detalle', idDetalle);

    if (error) throw error;

    ocultarOverlay();

    document.getElementById(`subtipoExist-${idDetalle}`).disabled = true;
    document.getElementById(`caracterExist-${idDetalle}`).disabled = true;
    document.getElementById(`descripcionExist-${idDetalle}`).disabled = true;
    
    btnGuardar.style.display = 'none';
    document.getElementById(`btnEditarDet-${idDetalle}`).style.display = 'inline-block';

    mostrarNotificacion('✓ Detalle actualizado correctamente', 'success');

  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
  }
}

// Eliminar detalle existente
async function eliminarDetalleExistente(idDetalle, codigo) {
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de eliminar este detalle?<br><br><strong>Esta acción NO se puede deshacer.</strong>`,
    '🗑️ Confirmar Eliminación'
  );

  if (!confirmar) return;

  mostrarOverlay('Eliminando detalle...');

  try {
    const { error } = await supabase
      .from('detalle_accidentes')
      .delete()
      .eq('id_detalle', idDetalle);

    if (error) throw error;

    ocultarOverlay();
    
    const elemento = document.getElementById(`detalleExistente-${idDetalle}`);
    if (elemento) elemento.remove();

    mostrarNotificacion('✓ Detalle eliminado correctamente', 'success');

  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
  }
}

// Función de cierre mejorada
function cerrarModalEditar() {
  const confirmacion = cabeceraEdicionGuardada 
    ? confirm('Los cambios ya fueron guardados. ¿Desea cerrar?')
    : confirm('¿Desea cerrar sin guardar cambios?');
    
  if (confirmacion) {
    document.getElementById('modalEditar').style.display = 'none';
    if (cabeceraEdicionGuardada) {
      cargarDatosExcel();
    }
  }
}


function agregarDetalleEdicion() {
  if (!cabeceraEdicionGuardada) {
    mostrarNotificacion('Primero debe guardar los cambios en los datos principales', 'error');
    return;
  }

  contadorDetallesEdicion++;
  const container = document.getElementById('editDetallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item';
  detalleDiv.id = `detalleEdit-${contadorDetallesEdicion}`;
  detalleDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo">
        <strong>Nuevo Detalle #${contadorDetallesEdicion}</strong>
      </div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarDetalleEdicion(${contadorDetallesEdicion})" id="btnGuardarDetEdit${contadorDetallesEdicion}">
          💾 Guardar
        </button>
        <button type="button" class="btn-quitar" onclick="quitarDetalleEdicion(${contadorDetallesEdicion})">× Quitar</button>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label>Asunto <span class="required">*</span></label>
        <select id="subtipoEdit${contadorDetallesEdicion}" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN">CONCLUSIÓN</option>
          <option value="CAUSA">CAUSA</option>
          <option value="RECOMENDACIÓN">RECOMENDACIÓN</option>
        </select>
      </div>

      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select id="caracterEdit${contadorDetallesEdicion}" required>
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
      <textarea id="descripcionDetEdit${contadorDetallesEdicion}" required placeholder="Describa la conclusión, causa o recomendación..."></textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

async function guardarDetalleEdicion(id) {
  const subtipo = document.getElementById(`subtipoEdit${id}`).value;
  const caracter = document.getElementById(`caracterEdit${id}`).value;
  const descripcionDet = document.getElementById(`descripcionDetEdit${id}`).value;

  if (!subtipo || !caracter || !descripcionDet) {
    mostrarNotificacion('Por favor complete todos los campos del detalle', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarDetEdit${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';

  mostrarOverlay('Guardando detalle...');

  try {
    // Obtener datos de la JIAT
    const codigo = codigoActualEdicion;
    const { data: jiat } = await supabase
      .from('jiat')
      .select('fecha, periodo')
      .eq('codigo', codigo)
      .single();

    // Generar ID
    const { data: ultimoDetalle } = await supabase
      .from('detalle_accidentes')
      .select('id_detalle')
      .order('id_detalle', { ascending: false })
      .limit(1)
      .single();

    let nuevoIdDetalle = 'DET-00001';
    if (ultimoDetalle) {
      const numeroActual = parseInt(ultimoDetalle.id_detalle.split('-')[1]);
      nuevoIdDetalle = `DET-${(numeroActual + 1).toString().padStart(5, '0')}`;
    }

    // Insertar
    const { error } = await supabase
      .from('detalle_accidentes')
      .insert([{
        id_detalle: nuevoIdDetalle,
        usuarioreg: usuario,
        unidad: unidad,
        tipo: 'JIAT',
        codigo: codigo,
        subtipo: subtipo,
        fechareg: new Date().toISOString(),
        fecha: jiat.fecha,
        periodo: parseInt(jiat.periodo),
        caracter: caracter,
        descripcion: descripcionDet
      }]);

    ocultarOverlay();

    if (error) throw error;

    const detalleDiv = document.getElementById(`detalleEdit-${id}`);
    detalleDiv.classList.add('guardado');
    
    const titulo = detalleDiv.querySelector('.detalle-titulo');
    titulo.innerHTML += ' <span class="badge-guardado-detalle">✓ Guardado</span>';
    
    document.getElementById(`subtipoEdit${id}`).disabled = true;
    document.getElementById(`caracterEdit${id}`).disabled = true;
    document.getElementById(`descripcionDetEdit${id}`).disabled = true;
    btnGuardar.style.display = 'none';

    mostrarNotificacion('✓ Detalle guardado correctamente', 'success');
    
  } catch (error) {
    console.error('Error:', error);
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error al guardar el detalle: ' + error.message, 'error');
  }
}

function quitarDetalleEdicion(id) {
  const elemento = document.getElementById(`detalleEdit-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento && elemento.classList.contains('guardado')) {
    mostrarNotificacion('No puede eliminar un detalle ya guardado', 'warning');
  }
}

function cerrarModalEditar() {
  // Simplificar el cierre
  const confirmacion = cabeceraEdicionGuardada 
    ? confirm('Los cambios ya fueron guardados. ¿Desea cerrar?')
    : confirm('¿Desea cerrar sin guardar cambios?');
    
  if (confirmacion) {
    document.getElementById('modalEditar').style.display = 'none';
    if (cabeceraEdicionGuardada) {
      cargarDatosExcel(); // Recargar tabla si hubo cambios
    }
  }
}

// ============================================
// MODALES
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
  if (cabeceraGuardada) {
    mostrarNotificacion('✓ JIAT registrada correctamente con código: ' + codigoJIATActual, 'success');
    document.getElementById('modalNuevo').style.display = 'none';
    cargarDatosExcel();
  } else {
    if (confirm('No ha guardado ningún dato. ¿Desea cerrar de todos modos?')) {
      document.getElementById('modalNuevo').style.display = 'none';
    }
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

function mostrarNotificacion(mensaje, tipo = 'info') {
  const notifAnterior = document.querySelector('.notificacion-custom');
  if (notifAnterior) {
    notifAnterior.remove();
  }
  
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

// Sistema de confirmación personalizado
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

// Agregar estilos de animación
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
`;
document.head.appendChild(style);
