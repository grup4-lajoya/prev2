// ============================================
// JIA.JS - Juntas de Investigación de Accidentes de Aviación
// ============================================

const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let datosCompletos = [];
let datosFiltrados = [];
let paginaActual = 1;
const registrosPorPagina = 10;
let contadorDetalles = 0;
let cabeceraGuardada = false;
let codigoJIAActual = null;
let fechaJIAActual = null;
let periodoJIAActual = null;
let contadorAcciones = 0;
let codigoJIAAcciones = null;
let periodoJIAAcciones = null;
let contadorDetallesEdicion = 0;
let contadorAccionesEdicion = 0;
let cabeceraEdicionGuardada = false;
let codigoActualEdicion = null;

const usuario = localStorage.getItem("usuario") || "";
const unidad = localStorage.getItem("unidad") || "";
const rol = localStorage.getItem("rol") || "";

if (!usuario) window.location.replace("login.html");

window.onload = function() {
  cargarPeriodos();
  cargarOpcionesCausaPrincipal();
  cargarAeronaves();
  cargarDatosExcel();
};

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
function cargarOpcionesCausaPrincipal() {
  const tiposAccidente = [
    'LEVE',
    'GRAVE',
    'FATAL'
  ];
  
  const causasPrincipales = [
    'ERROR PERSONAL',
    'FALLA MATERIAL',
    'SUPERFICIE DEL AERÓDROMO',
    'FALLA EQUIPOS CONEXOS',
    'MALAS CONDICIONES METEOROLÓGICAS',
    'DIVERSOS',
    'INDETERMINADOS'
  ];
  
  // Cargar tipos de accidente
  const selectTipo = document.getElementById('tipo_accidente');
  if (selectTipo) {
    tiposAccidente.forEach(tipo => {
      const option = document.createElement('option');
      option.value = tipo;
      option.textContent = tipo;
      selectTipo.appendChild(option);
    });
  }
  
  const selectTipoEdit = document.getElementById('editTipoAccidente');
  if (selectTipoEdit) {
    tiposAccidente.forEach(tipo => {
      const option = document.createElement('option');
      option.value = tipo;
      option.textContent = tipo;
      selectTipoEdit.appendChild(option);
    });
  }
  
  // Cargar causas principales
  const selectCausa = document.getElementById('causa_principal');
  if (selectCausa) {
    causasPrincipales.forEach(causa => {
      const option = document.createElement('option');
      option.value = causa;
      option.textContent = causa;
      selectCausa.appendChild(option);
    });
  }
  
  const selectCausaEdit = document.getElementById('editCausaPrincipal');
  if (selectCausaEdit) {
    causasPrincipales.forEach(causa => {
      const option = document.createElement('option');
      option.value = causa;
      option.textContent = causa;
      selectCausaEdit.appendChild(option);
    });
  }
}
async function cargarAeronaves() {
  try {
    console.log('Cargando aeronaves para unidad:', unidad);
    
    // Obtener aeronaves activas de la unidad del usuario logueado
    const { data: aeronaves, error } = await supabase
      .from('aeronave')
      .select('*')
      .eq('unidad', unidad)
      .eq('activo', true);

    if (error) {
      console.error('Error completo de Supabase:', error);
      throw error;
    }

    console.log('Aeronaves obtenidas:', aeronaves);

    // Cargar en el select de nuevo registro
    const selectAeronave = document.getElementById('tipo_aeronave');
    if (selectAeronave) {
      selectAeronave.innerHTML = '<option value="">Seleccione</option>';
      
      if (aeronaves && aeronaves.length > 0) {
        aeronaves.forEach(aero => {
          const option = document.createElement('option');
          option.value = aero.aeronave;  // Guardará en jia.tipo_aeronave
          option.textContent = aero.aeronave;  // Lo que verá el usuario
          selectAeronave.appendChild(option);
        });
      } else {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay aeronaves disponibles para esta unidad';
        option.disabled = true;
        selectAeronave.appendChild(option);
      }
    }

    // Cargar en el select de edición
    const selectAeronaveEdit = document.getElementById('editTipoAeronave');
    if (selectAeronaveEdit) {
      selectAeronaveEdit.innerHTML = '<option value="">Seleccione</option>';
      
      if (aeronaves && aeronaves.length > 0) {
        aeronaves.forEach(aero => {
          const option = document.createElement('option');
          option.value = aero.aeronave;
          option.textContent = aero.aeronave;
          selectAeronaveEdit.appendChild(option);
        });
      }
    }

  } catch (error) {
    console.error('Error al cargar aeronaves:', error);
    mostrarNotificacion('Error al cargar sistemas: ' + error.message, 'error');
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
  const numero = document.getElementById('numero').value;
  const periodo = document.getElementById('periodo').value;
  const fecha = document.getElementById('fecha').value;
  const lugar = document.getElementById('lugar').value;
  const tipo_accidente = document.getElementById('tipo_accidente').value;
  const tipo_aeronave = document.getElementById('tipo_aeronave').value;
  const tipo_lesion = document.getElementById('tipo_lesion').value;
  const tipo_dano = document.getElementById('tipo_dano').value;
  const causa_principal = document.getElementById('causa_principal').value;
  const fase = document.getElementById('fase').value;
  const tipo_vuelo = document.getElementById('tipo_vuelo').value;
  const fatal = document.getElementById('fatal').value;
  const cantfall = document.getElementById('cantfall').value;
  const descripcion = document.getElementById('descripcion').value;

  if (!numero || !periodo || !fecha || !lugar || !tipo_accidente || !tipo_aeronave || !tipo_lesion || !tipo_dano || !causa_principal || !fase || !tipo_vuelo || !fatal || !descripcion) {
    mostrarNotificacion('Complete todos los campos obligatorios', 'error');
    return;
  }

  const btnGuardar = document.getElementById('btnGuardarCabecera');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Validando...';

  try {
    const { data: existentes, error: errorValidacion } = await supabase
      .from('jia')
      .select('codigo, unidad')
      .eq('numero', numero)
      .eq('periodo', periodo)
      .eq('unidad', unidad);

    if (errorValidacion) throw errorValidacion;

    if (existentes && existentes.length > 0) {
      btnGuardar.disabled = false;
      btnGuardar.textContent = '💾 Guardar y Continuar';
      mostrarNotificacion(`⚠️ Ya existe una JIA con número ${numero} y periodo ${periodo} en la unidad ${unidad}. Use otro número.`, 'error');
      document.getElementById('numero').style.borderColor = '#dc3545';
      document.getElementById('periodo').style.borderColor = '#dc3545';
      return;
    }
  } catch (error) {
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    mostrarNotificacion('Error al validar: ' + error.message, 'error');
    return;
  }

  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Guardando datos principales...');

  try {
    const numeroFormateado = numero.padStart(3, '0');
    const codigo = `JIA-${numeroFormateado}-${periodo}-${unidad.replace(/\s+/g, '')}`;
    codigoJIAActual = codigo;
    fechaJIAActual = fecha;
    periodoJIAActual = periodo;

    const { error } = await supabase.from('jia').insert([{
  codigo, usuarioreg: usuario, tipo: 'JIA', numero: parseInt(numero), periodo: parseInt(periodo),
  unidad, fecha, lugar, involucrado: null, fatal, cantfall: parseInt(cantfall),
  descripcion, tipo_accidente, tipo_aeronave, tipo_lesion, tipo_dano, causa_principal, fase, tipo_vuelo
  }]);

  if (error) throw error;

    cabeceraGuardada = true;
    const seccionCabecera = document.getElementById('seccionCabecera');
    seccionCabecera.classList.add('guardada');
    seccionCabecera.innerHTML += '<span class="badge-guardado">✓ Guardado</span>';
    document.querySelectorAll('#seccionCabecera input, #seccionCabecera select, #seccionCabecera textarea, #seccionCabecera button').forEach(el => el.disabled = true);

    const seccionDetalles = document.getElementById('seccionDetalles');
    seccionDetalles.classList.remove('bloqueada');
    document.getElementById('mensajeBloqueo').style.display = 'none';
    document.getElementById('btnAgregarDetalle').disabled = false;

    ocultarOverlay();
    mostrarNotificacion(`✓ Datos principales guardados. Código: ${codigo}. Puede agregar detalles.`, 'success');
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
  }
}

function agregarDetalle() {
  if (!cabeceraGuardada) {
    mostrarNotificacion('Primero guarde los datos principales', 'error');
    return;
  }
  contadorDetalles++;
  const container = document.getElementById('detallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item';
  detalleDiv.id = `detalle-${contadorDetalles}`;
  detalleDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo"><strong>Detalle #${contadorDetalles}</strong></div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarDetalle(${contadorDetalles})" id="btnGuardarDet${contadorDetalles}">💾 Guardar</button>
        <button type="button" class="btn-quitar" onclick="quitarDetalle(${contadorDetalles})">× Quitar</button>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Asunto <span class="required">*</span></label>
        <select id="subtipo${contadorDetalles}" required>
          <option value="">Seleccione</option>
          <option value="CONCLUSIÓN">CONCLUSIÓN</option>
          <option value="CAUSA">CAUSA</option>
          <option value="RECOMENDACIÓN">RECOMENDACIÓN</option>
        </select>
      </div>
      <div class="form-group">
        <label>Carácter <span class="required">*</span></label>
        <select id="caracter${contadorDetalles}" required>
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
      <textarea id="descripcionDet${contadorDetalles}" required></textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

async function guardarDetalle(id) {
  const subtipo = document.getElementById(`subtipo${id}`).value;
  const caracter = document.getElementById(`caracter${id}`).value;
  const descripcionDet = document.getElementById(`descripcionDet${id}`).value;

  if (!subtipo || !caracter || !descripcionDet) {
    mostrarNotificacion('Complete todos los campos del detalle', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarDet${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Guardando detalle...');

  try {
    const { data: ultimoDetalle } = await supabase.from('detalle_jia').select('id_detalle_jia').order('id_detalle_jia', { ascending: false }).limit(1).single();
    let nuevoIdDetalle = 'DET-00001';
    if (ultimoDetalle) {
      const numeroActual = parseInt(ultimoDetalle.id_detalle_jia.split('-')[1]);
      nuevoIdDetalle = `DET-${(numeroActual + 1).toString().padStart(5, '0')}`;
    }

    const { error } = await supabase.from('detalle_jia').insert([{
      id_detalle_jia: nuevoIdDetalle, usuarioreg: usuario, unidad, tipo: 'JIA', codigo: codigoJIAActual,
      subtipo, fechareg: new Date().toISOString(), fecha: fechaJIAActual, periodo: parseInt(periodoJIAActual),
      caracter, descripcion: descripcionDet
    }]);

    if (error) throw error;

    const detalleDiv = document.getElementById(`detalle-${id}`);
    detalleDiv.classList.add('guardado');
    detalleDiv.querySelector('.detalle-titulo').innerHTML += ' <span class="badge-guardado-detalle">✓ Guardado</span>';
    document.getElementById(`subtipo${id}`).disabled = true;
    document.getElementById(`caracter${id}`).disabled = true;
    document.getElementById(`descripcionDet${id}`).disabled = true;
    btnGuardar.style.display = 'none';

    ocultarOverlay();
    mostrarNotificacion('✓ Detalle guardado', 'success');
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

function quitarDetalle(id) {
  const elemento = document.getElementById(`detalle-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento) {
    mostrarNotificacion('No puede eliminar un detalle guardado', 'warning');
  }
}

async function cargarDatosExcel() {
  const loadingEl = document.getElementById('loading');
  try {
    loadingEl.innerHTML = 'Cargando datos... ⏳';
    let query = supabase.from('jia').select('*').order('fecha', { ascending: false });
    if (rol !== 'ADMIN' && rol !== 'admin') {
      query = query.eq('unidad', unidad);
    }
    const { data, error } = await query;
    if (error) throw error;

    datosCompletos = data.map(registro => ({
      ...registro,
      CODIGO: registro.codigo,
      UNIDAD: registro.unidad,
      FECHA: formatearFechaDisplay(registro.fecha),
      CAUSA: registro.causa_principal
    }));
    datosFiltrados = [...datosCompletos];
    loadingEl.style.display = 'none';
    document.getElementById('tablaJIA').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';
    actualizarTabla();
  } catch (error) {
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
  <td>${registro.CAUSA || '-'}</td>
  <td>
  <div class="acciones">
    <button class="btn-icono btn-ver" onclick="verDetalle(${inicio + index})" title="Ver">👁</button>
    <button class="btn-icono btn-acciones" onclick="registrarAcciones(${inicio + index})" title="Acciones">📋</button>
    <button class="btn-icono btn-editar" onclick="editarRegistro(${inicio + index})" title="Editar">✏️</button>
    <button class="btn-icono btn-eliminar" onclick="eliminarRegistro(${inicio + index})" title="Eliminar">🗑️</button>
    <button class="btn-icono btn-imprimir" onclick="imprimirJIA(${inicio + index})" title="Imprimir">🖨️</button>
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
  document.getElementById('infoRegistros').textContent = `Mostrando ${datosFiltrados.length} registros`;
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

async function verDetalle(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  mostrarOverlay('Cargando información...');
  try {
    const { data: cabecera, error: errorCabecera } = await supabase.from('jia').select('*').eq('codigo', codigo).single();
    if (errorCabecera) throw errorCabecera;
    if (rol !== 'ADMIN' && rol !== 'admin' && cabecera.unidad !== unidad) throw new Error('Sin permisos');

    const { data: detalles, error: errorDetalles } = await supabase.from('detalle_jia').select('*').eq('codigo', codigo).order('fechareg', { ascending: true });
    if (errorDetalles) throw errorDetalles;

    const conclusiones = detalles.filter(d => d.subtipo === 'CONCLUSIÓN');
    const causas = detalles.filter(d => d.subtipo === 'CAUSA');
    const recomendaciones = detalles.filter(d => d.subtipo === 'RECOMENDACIÓN');
    const acciones = detalles.filter(d => d.subtipo === 'ACCIÓN TOMADA');

    document.getElementById('verCodigo').textContent = cabecera.codigo;
    document.getElementById('verFecha').textContent = formatearFechaDisplay(cabecera.fecha);
    document.getElementById('verUnidad').textContent = cabecera.unidad;
    document.getElementById('verLugar').textContent = cabecera.lugar;
    document.getElementById('verTipoAccidente').textContent = cabecera.tipo_accidente || '-';
    document.getElementById('verTipoAeronave').textContent = cabecera.tipo_aeronave || '-';
    document.getElementById('verTipoLesion').textContent = cabecera.tipo_lesion || '-';
    document.getElementById('verTipoDano').textContent = cabecera.tipo_dano || '-';
    document.getElementById('verCausaPrincipal').textContent = cabecera.causa_principal || '-';
    document.getElementById('verFase').textContent = cabecera.fase || '-';
    document.getElementById('verTipoVuelo').textContent = cabecera.tipo_vuelo || '-';
    document.getElementById('verInvolucrado').textContent = cabecera.involucrado;
    document.getElementById('verFatal').textContent = cabecera.fatal;
    document.getElementById('verDescripcion').textContent = cabecera.descripcion;

    const mostrarSeccion = (seccionId, listaId, datos, tipo, color) => {
      const seccion = document.getElementById(seccionId);
      const lista = document.getElementById(listaId);
      if (datos && datos.length > 0) {
        lista.innerHTML = '';
        datos.forEach((item, idx) => {
          const div = document.createElement('div');
          div.className = 'detalle-item-readonly';
          if (color) div.style.borderLeftColor = color;
          div.innerHTML = `
            <div class="detalle-item-readonly-header">
              <span class="detalle-item-readonly-tipo" style="color: ${color};">${tipo} #${idx + 1}</span>
              <span class="detalle-item-readonly-caracter" style="background: ${color};">${item.CARACTER || item.caracter}</span>
            </div>
            <div class="detalle-item-readonly-descripcion">${item.DESCRIPCION || item.descripcion}</div>
          `;
          lista.appendChild(div);
        });
        seccion.style.display = 'block';
      } else {
        seccion.style.display = 'none';
      }
    };

    mostrarSeccion('verSeccionConclusiones', 'verListaConclusiones', conclusiones.map(d => ({CARACTER: d.caracter, DESCRIPCION: d.descripcion})), 'Conclusión', '#17a2b8');
    mostrarSeccion('verSeccionCausas', 'verListaCausas', causas.map(d => ({CARACTER: d.caracter, DESCRIPCION: d.descripcion})), 'Causa', '#ffc107');
    mostrarSeccion('verSeccionRecomendaciones', 'verListaRecomendaciones', recomendaciones.map(d => ({CARACTER: d.caracter, DESCRIPCION: d.descripcion})), 'Recomendación', '#007bff');

    const seccionAcciones = document.getElementById('verSeccionAcciones');
    const listaAcciones = document.getElementById('verListaAcciones');
    if (acciones && acciones.length > 0) {
      listaAcciones.innerHTML = '';
      acciones.forEach((a, idx) => {
        const div = document.createElement('div');
        div.className = 'detalle-item-readonly';
        div.style.borderLeftColor = '#28a745';
        div.innerHTML = `
          <div class="detalle-item-readonly-header">
            <span class="detalle-item-readonly-tipo" style="color: #28a745;">Acción #${idx + 1} - 📅 ${formatearFechaDisplay(a.fecha)}</span>
            <span class="detalle-item-readonly-caracter" style="background: #28a745;">${a.caracter}</span>
          </div>
          <div class="detalle-item-readonly-descripcion">${a.descripcion}</div>
        `;
        listaAcciones.appendChild(div);
      });
      seccionAcciones.style.display = 'block';
    } else {
      seccionAcciones.style.display = 'none';
    }

    ocultarOverlay();
    document.getElementById('modalVerDetalle').style.display = 'block';
  } catch (error) {
    ocultarOverlay();
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

async function imprimirJIA(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  
  mostrarOverlay('Preparando impresión...');
  
  try {
    const { data: cabecera, error: errorCabecera } = await supabase
      .from('jia')
      .select('*')
      .eq('codigo', codigo)
      .single();

    if (errorCabecera) throw errorCabecera;

    if (rol !== 'ADMIN' && rol !== 'admin' && cabecera.unidad !== unidad) {
      throw new Error('No tiene permisos para acceder a esta JIA');
    }

    const { data: detalles, error: errorDetalles } = await supabase
      .from('detalle_jia')
      .select('*')
      .eq('codigo', codigo)
      .order('fechareg', { ascending: true });

    if (errorDetalles) throw errorDetalles;

    const conclusiones = detalles.filter(d => d.subtipo === 'CONCLUSIÓN');
    const causas = detalles.filter(d => d.subtipo === 'CAUSA');
    const recomendaciones = detalles.filter(d => d.subtipo === 'RECOMENDACIÓN');
    const acciones = detalles.filter(d => d.subtipo === 'ACCIÓN TOMADA');

    ocultarOverlay();

    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>JIA - ${codigo}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 30px; 
            max-width: 1200px;
            margin: 0 auto;
          }
          h1 { 
            color: #333; 
            border-bottom: 3px solid #007bff; 
            padding-bottom: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          h2 { 
            color: #007bff; 
            margin-top: 30px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e9ecef;
          }
          .info-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin: 15px 0; 
          }
          .info-item { 
            padding: 10px; 
            background: white; 
            border-left: 4px solid #007bff;
            border-radius: 4px;
          }
          .info-item strong { 
            display: inline-block; 
            min-width: 140px;
            color: #495057;
          }
          .info-full {
            grid-column: 1 / -1;
            padding: 15px;
            background: white;
            border-left: 4px solid #007bff;
            border-radius: 4px;
          }
          .info-full strong {
            display: block;
            margin-bottom: 8px;
            color: #495057;
          }
          .detalle { 
            margin: 15px 0; 
            padding: 15px; 
            border-left: 5px solid #17a2b8; 
            background: #f8f9fa;
            border-radius: 4px;
            page-break-inside: avoid;
          }
          .detalle-conclusion { border-left-color: #17a2b8; }
          .detalle-causa { border-left-color: #ffc107; }
          .detalle-recomendacion { border-left-color: #007bff; }
          .detalle-accion { border-left-color: #28a745; }
          
          .detalle-header { 
            font-weight: bold; 
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .detalle-tipo { 
            color: #17a2b8;
            font-size: 1.1em;
          }
          .detalle-caracter {
            background: #17a2b8;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 0.85em;
          }
          .detalle-descripcion {
            color: #495057;
            line-height: 1.6;
          }
          .no-datos {
            text-align: center;
            padding: 20px;
            color: #6c757d;
            font-style: italic;
          }
          @media print {
            button { display: none; }
            body { padding: 20px; }
            .detalle { page-break-inside: avoid; }
          }
          .btn-imprimir {
            margin-top: 30px; 
            padding: 12px 30px; 
            background: #007bff; 
            color: white; 
            border: none; 
            cursor: pointer; 
            border-radius: 5px;
            font-size: 16px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .btn-imprimir:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <h1>✈️ JUNTA DE INVESTIGACIÓN DE ACCIDENTES DE AVIACIÓN (JIA)</h1>
        
        <div class="info-section">
          <div class="info-grid">
            <div class="info-item"><strong>Código:</strong> ${cabecera.codigo}</div>
            <div class="info-item"><strong>Fecha:</strong> ${formatearFechaDisplay(cabecera.fecha)}</div>
            <div class="info-item"><strong>Unidad:</strong> ${cabecera.unidad}</div>
            <div class="info-item"><strong>Lugar:</strong> ${cabecera.lugar}</div>
            <div class="info-item"><strong>Tipo Accidente:</strong> ${cabecera.tipo_accidente || '-'}</div>
            <div class="info-item"><strong>Tipo Aeronave:</strong> ${cabecera.tipo_aeronave || '-'}</div>
            <div class="info-item"><strong>Tipo Lesión:</strong> ${cabecera.tipo_lesion || '-'}</div>
            <div class="info-item"><strong>Tipo Daño:</strong> ${cabecera.tipo_dano || '-'}</div>
            <div class="info-item"><strong>Causa Principal:</strong> ${cabecera.causa_principal || '-'}</div>
            <div class="info-item"><strong>Fase:</strong> ${cabecera.fase || '-'}</div>
            <div class="info-item"><strong>Tipo Vuelo:</strong> ${cabecera.tipo_vuelo || '-'}</div>
            <div class="info-item"><strong>Fatal:</strong> ${cabecera.fatal}</div>
            <div class="info-item"><strong>Cant. Fatalidades:</strong> ${cabecera.cantfall}</div>
          </div>
          
          <div class="info-full">
            <strong>Descripción del Accidente:</strong>
            <div>${cabecera.descripcion}</div>
          </div>
        </div>
        
        ${conclusiones.length > 0 ? `
          <h2>📌 CONCLUSIONES</h2>
          ${conclusiones.map((c, i) => `
            <div class="detalle detalle-conclusion">
              <div class="detalle-header">
                <span class="detalle-tipo">Conclusión #${i + 1}</span>
                <span class="detalle-caracter" style="background: #17a2b8;">${c.caracter}</span>
              </div>
              <div class="detalle-descripcion">${c.descripcion}</div>
            </div>
          `).join('')}
        ` : '<div class="no-datos">No hay conclusiones registradas</div>'}
        
        ${causas.length > 0 ? `
          <h2>⚠️ CAUSAS</h2>
          ${causas.map((c, i) => `
            <div class="detalle detalle-causa">
              <div class="detalle-header">
                <span class="detalle-tipo" style="color: #ffc107;">Causa #${i + 1}</span>
                <span class="detalle-caracter" style="background: #ffc107; color: #000;">${c.caracter}</span>
              </div>
              <div class="detalle-descripcion">${c.descripcion}</div>
            </div>
          `).join('')}
        ` : '<div class="no-datos">No hay causas registradas</div>'}
        
        ${recomendaciones.length > 0 ? `
          <h2>💡 RECOMENDACIONES</h2>
          ${recomendaciones.map((r, i) => `
            <div class="detalle detalle-recomendacion">
              <div class="detalle-header">
                <span class="detalle-tipo" style="color: #007bff;">Recomendación #${i + 1}</span>
                <span class="detalle-caracter" style="background: #007bff;">${r.caracter}</span>
              </div>
              <div class="detalle-descripcion">${r.descripcion}</div>
            </div>
          `).join('')}
        ` : '<div class="no-datos">No hay recomendaciones registradas</div>'}
        
        ${acciones.length > 0 ? `
          <h2>✅ ACCIONES TOMADAS</h2>
          ${acciones.map((a, i) => `
            <div class="detalle detalle-accion">
              <div class="detalle-header">
                <span class="detalle-tipo" style="color: #28a745;">Acción #${i + 1} - 📅 ${formatearFechaDisplay(a.fecha)}</span>
                <span class="detalle-caracter" style="background: #28a745;">${a.caracter}</span>
              </div>
              <div class="detalle-descripcion">${a.descripcion}</div>
            </div>
          `).join('')}
        ` : '<div class="no-datos">No hay acciones tomadas registradas</div>'}
        
        <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir Documento</button>
      </body>
      </html>
    `);
    ventanaImpresion.document.close();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al preparar la impresión: ' + error.message, 'error');
  }
}

function cerrarModalVerDetalle() {
  document.getElementById('modalVerDetalle').style.display = 'none';
}

async function eliminarRegistro(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  const unidadRegistro = registro.UNIDAD;
  if (rol !== 'ADMIN' && rol !== 'admin' && unidadRegistro !== unidad) {
    mostrarNotificacion('Sin permisos', 'error');
    return;
  }
  const confirmar = await mostrarConfirmacion(`¿Eliminar ${codigo} de ${unidadRegistro}?<br><br>Se eliminará todo.`, '🗑️ Confirmar');
  if (confirmar) {
    mostrarOverlay('Eliminando...');
    try {
      await supabase.from('detalle_jia').delete().eq('codigo', codigo);
      const { error } = await supabase.from('jia').delete().eq('codigo', codigo).eq('unidad', unidadRegistro);
      if (error) throw error;
      await cargarDatosExcel();
      ocultarOverlay();
      mostrarNotificacion('✓ Eliminado', 'success');
    } catch (error) {
      ocultarOverlay();
      mostrarNotificacion('Error: ' + error.message, 'error');
    }
  }
}

async function registrarAcciones(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  mostrarOverlay('Cargando...');
  try {
    const { data: cabecera, error: errorCabecera } = await supabase.from('jia').select('*').eq('codigo', codigo).single();
    if (errorCabecera) throw errorCabecera;
    if (rol !== 'ADMIN' && rol !== 'admin' && cabecera.unidad !== unidad) throw new Error('Sin permisos');

    const { data: detalles, error: errorDetalles } = await supabase.from('detalle_jia').select('*').eq('codigo', codigo).order('fechareg', { ascending: true });
    if (errorDetalles) throw errorDetalles;

    const conclusiones = detalles.filter(d => d.subtipo === 'CONCLUSIÓN');
    const causas = detalles.filter(d => d.subtipo === 'CAUSA');
    const recomendaciones = detalles.filter(d => d.subtipo === 'RECOMENDACIÓN');
    const acciones = detalles.filter(d => d.subtipo === 'ACCIÓN TOMADA');

    codigoJIAAcciones = codigo;
    periodoJIAAcciones = cabecera.periodo;
    contadorAcciones = 0;

    document.getElementById('infoCodigo').textContent = cabecera.codigo;
    document.getElementById('infoFecha').textContent = formatearFechaDisplay(cabecera.fecha);
    document.getElementById('infoUnidad').textContent = cabecera.unidad;
    document.getElementById('infoLugar').textContent = cabecera.lugar;
    document.getElementById('infoTipoAccidente').textContent = cabecera.tipo_accidente || '-';
    document.getElementById('infoTipoAeronave').textContent = cabecera.tipo_aeronave || '-';
    document.getElementById('infoInvolucrado').textContent = cabecera.involucrado;
    document.getElementById('infoFatal').textContent = cabecera.fatal;
    document.getElementById('infoDescripcion').textContent = cabecera.descripcion;

    const mostrarDetallesEnModal = (seccionId, listaId, dets, icono) => {
      const seccion = document.getElementById(seccionId);
      const lista = document.getElementById(listaId);
      if (dets && dets.length > 0) {
        lista.innerHTML = '';
        dets.forEach(det => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${det.caracter}:</strong> ${det.descripcion}`;
          lista.appendChild(li);
        });
        seccion.style.display = 'block';
      } else {
        seccion.style.display = 'none';
      }
    };

    mostrarDetallesEnModal('detallesConclusiones', 'listaConclusiones', conclusiones, '📌');
    mostrarDetallesEnModal('detallesCausas', 'listaCausas', causas, '⚠️');
    mostrarDetallesEnModal('detallesRecomendaciones', 'listaRecomendaciones', recomendaciones, '💡');

    const seccionAcciones = document.getElementById('seccionAccionesRegistradas');
    const listaAcciones = document.getElementById('listaAccionesRegistradas');
    if (acciones.length > 0) {
      listaAcciones.innerHTML = '';
      acciones.forEach((accion, idx) => {
        const div = document.createElement('div');
        div.className = 'detalle-item-readonly';
        div.style.borderLeftColor = '#28a745';
        div.innerHTML = `
          <div class="detalle-item-readonly-header">
            <span class="detalle-item-readonly-tipo" style="color: #28a745;">✅ Acción #${idx + 1} - 📅 ${formatearFechaDisplay(accion.fecha)}</span>
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

    document.getElementById('accionesContainer').innerHTML = '';
    ocultarOverlay();
    document.getElementById('modalAcciones').style.display = 'block';
  } catch (error) {
    ocultarOverlay();
    mostrarNotificacion('Error: ' + error.message, 'error');
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
      <div class="detalle-titulo"><strong>Acción #${contadorAcciones}</strong></div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarAccionTomada(${contadorAcciones})" id="btnGuardarAccion${contadorAcciones}">💾 Guardar</button>
        <button type="button" class="btn-quitar" onclick="quitarAccionTomada(${contadorAcciones})">× Quitar</button>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Fecha <span class="required">*</span></label>
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
      <label>Descripción <span class="required">*</span></label>
      <textarea id="descripcionAccion${contadorAcciones}" required></textarea>
    </div>
  `;
  container.appendChild(accionDiv);
}

async function guardarAccionTomada(id) {
  const fechaAccion = document.getElementById(`fechaAccion${id}`).value;
  const caracterAccion = document.getElementById(`caracterAccion${id}`).value;
  const descripcionAccion = document.getElementById(`descripcionAccion${id}`).value;

  if (!fechaAccion || !caracterAccion || !descripcionAccion) {
    mostrarNotificacion('Complete todos los campos', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarAccion${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Guardando acción...');

  try {
    const { data: ultimoDetalle } = await supabase.from('detalle_jia').select('id_detalle_jia').order('id_detalle_jia', { ascending: false }).limit(1).single();
    let nuevoIdDetalle = 'DET-00001';
    if (ultimoDetalle) {
      const numeroActual = parseInt(ultimoDetalle.id_detalle_jia.split('-')[1]);
      nuevoIdDetalle = `DET-${(numeroActual + 1).toString().padStart(5, '0')}`;
    }

    const { error } = await supabase.from('detalle_jia').insert([{
      id_detalle_jia: nuevoIdDetalle, usuarioreg: usuario, unidad, tipo: 'JIA', codigo: codigoJIAAcciones,
      subtipo: 'ACCIÓN TOMADA', fechareg: new Date().toISOString(), fecha: fechaAccion,
      periodo: parseInt(periodoJIAAcciones), caracter: caracterAccion, descripcion: descripcionAccion
    }]);

    if (error) throw error;

    const accionDiv = document.getElementById(`accion-${id}`);
    accionDiv.classList.add('guardado');
    accionDiv.querySelector('.detalle-titulo').innerHTML += ' <span class="badge-guardado-detalle">✓ Guardado</span>';
    document.getElementById(`fechaAccion${id}`).disabled = true;
    document.getElementById(`caracterAccion${id}`).disabled = true;
    document.getElementById(`descripcionAccion${id}`).disabled = true;
    btnGuardar.style.display = 'none';

    ocultarOverlay();
    mostrarNotificacion('✓ Acción guardada', 'success');
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

function quitarAccionTomada(id) {
  const elemento = document.getElementById(`accion-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento) {
    mostrarNotificacion('No puede eliminar una acción guardada', 'warning');
  }
}

function cerrarModalAcciones() {
  document.getElementById('modalAcciones').style.display = 'none';
}

async function editarRegistro(index) {
  const registro = datosFiltrados[index];
  const codigo = registro.CODIGO;
  mostrarOverlay('Cargando...');
  try {
    if (rol !== 'ADMIN' && rol !== 'admin' && registro.UNIDAD !== unidad) throw new Error('Sin permisos');

    const { data: cabecera, error: errorCabecera } = await supabase.from('jia').select('*').eq('codigo', codigo).single();
    if (errorCabecera) throw errorCabecera;

    const { data: detalles, error: errorDetalles } = await supabase.from('detalle_jia').select('*').eq('codigo', codigo).order('fechareg', { ascending: true });
    if (errorDetalles) throw errorDetalles;

    contadorDetallesEdicion = 0;
    contadorAccionesEdicion = 0;
    cabeceraEdicionGuardada = false;
    codigoActualEdicion = codigo;

    const seccionCabecera = document.getElementById('editSeccionCabecera');
    seccionCabecera.classList.remove('guardada');
    const badgeGuardado = seccionCabecera.querySelector('.badge-guardado');
    if (badgeGuardado) badgeGuardado.remove();

    document.querySelectorAll('#editSeccionCabecera input:not([readonly]), #editSeccionCabecera select:not([disabled]), #editSeccionCabecera textarea').forEach(el => el.disabled = false);

    const btnGuardar = document.getElementById('btnGuardarCabeceraEdit');
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';

    const seccionDetalles = document.getElementById('editSeccionDetalles');
    seccionDetalles.classList.add('bloqueada');
    document.getElementById('editMensajeBloqueo').style.display = 'block';
    document.getElementById('btnAgregarDetalleEdit').disabled = true;

    const seccionAcciones = document.getElementById('editSeccionAcciones');
    seccionAcciones.classList.add('bloqueada');

    document.getElementById('editDetallesContainer').innerHTML = '';
    document.getElementById('editAccionesContainer').innerHTML = '';

    document.getElementById('editCodigoActual').value = codigo;
    document.getElementById('editNumero').value = cabecera.numero;
    document.getElementById('editPeriodo').value = cabecera.periodo;
    document.getElementById('editFecha').value = cabecera.fecha;
    document.getElementById('editLugar').value = cabecera.lugar;
    document.getElementById('editTipoAccidente').value = cabecera.tipo_accidente || '';
    document.getElementById('editTipoAeronave').value = cabecera.tipo_aeronave || '';
    document.getElementById('editTipoLesion').value = cabecera.tipo_lesion || '';
    document.getElementById('editTipoDano').value = cabecera.tipo_dano || '';
    document.getElementById('editCausaPrincipal').value = cabecera.causa_principal || '';
    document.getElementById('editFase').value = cabecera.fase || '';
    document.getElementById('editTipoVuelo').value = cabecera.tipo_vuelo || '';
    document.getElementById('editInvolucrado').value = cabecera.involucrado;
    document.getElementById('editFatal').value = cabecera.fatal;
    document.getElementById('editCantfall').value = cabecera.cantfall;
    document.getElementById('editDescripcion').value = cabecera.descripcion;

    ocultarOverlay();
    document.getElementById('modalEditar').style.display = 'block';
  } catch (error) {
    ocultarOverlay();
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

async function guardarCabeceraEdicion() {
  const codigo = document.getElementById('editCodigoActual').value;
  const fecha = document.getElementById('editFecha').value;
  const lugar = document.getElementById('editLugar').value;
  const tipo_accidente = document.getElementById('editTipoAccidente').value;
  const tipo_aeronave = document.getElementById('editTipoAeronave').value;
  const tipo_lesion = document.getElementById('editTipoLesion').value;
  const tipo_dano = document.getElementById('editTipoDano').value;
  const causa_principal = document.getElementById('editCausaPrincipal').value;
  const fase = document.getElementById('editFase').value;
  const tipo_vuelo = document.getElementById('editTipoVuelo').value;
  const involucrado = document.getElementById('editInvolucrado').value;
  const fatal = document.getElementById('editFatal').value;
  const cantfall = document.getElementById('editCantfall').value;
  const descripcion = document.getElementById('editDescripcion').value;

  if (!fecha || !lugar || !tipo_accidente || !tipo_aeronave || !tipo_lesion || !tipo_dano || !causa_principal || !fase || !tipo_vuelo || !involucrado || !fatal || !descripcion) {
    mostrarNotificacion('Complete todos los campos obligatorios', 'error');
    return;
  }

  const btnGuardar = document.getElementById('btnGuardarCabeceraEdit');
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Actualizando...');

  try {
    const { error } = await supabase.from('jia').update({
      fecha, lugar, tipo_accidente, tipo_aeronave, tipo_lesion, tipo_dano,
      causa_principal, fase, tipo_vuelo, involucrado, fatal, cantfall: parseInt(cantfall), descripcion
    }).eq('codigo', codigo);

    if (error) throw error;

    const { data: detalles, error: errorDetalles } = await supabase.from('detalle_jia').select('*').eq('codigo', codigo).order('fechareg', { ascending: true });
    if (errorDetalles) throw errorDetalles;

    const detallesNormales = detalles.filter(d => d.subtipo !== 'ACCIÓN TOMADA');
    const acciones = detalles.filter(d => d.subtipo === 'ACCIÓN TOMADA');

    const containerDetalles = document.getElementById('editDetallesContainer');
    containerDetalles.innerHTML = '';

    detallesNormales.forEach((det, idx) => {
      contadorDetallesEdicion++;
      const div = document.createElement('div');
      div.className = 'detalle-item editable-existente';
      div.id = `detalleExistente-${det.id_detalle_jia}`;
      div.innerHTML = `
        <div class="detalle-item-header">
          <div class="detalle-titulo">
            <strong>${det.subtipo} #${idx + 1}</strong>
            <span class="badge-existente">📌 Existente</span>
          </div>
          <div>
            <button type="button" class="btn-editar-detalle" onclick="habilitarEdicionDetalle('${det.id_detalle_jia}')" id="btnEditarDet-${det.id_detalle_jia}">✏️ Editar</button>
            <button type="button" class="btn-guardar-detalle" onclick="guardarEdicionDetalle('${det.id_detalle_jia}')" id="btnGuardarEditDet-${det.id_detalle_jia}" style="display:none;">💾 Guardar</button>
            <button type="button" class="btn-eliminar-detalle" onclick="eliminarDetalleExistente('${det.id_detalle_jia}')">🗑️ Eliminar</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Asunto</label>
            <select id="subtipoExist-${det.id_detalle_jia}" disabled>
              <option value="CONCLUSIÓN" ${det.subtipo === 'CONCLUSIÓN' ? 'selected' : ''}>CONCLUSIÓN</option>
              <option value="CAUSA" ${det.subtipo === 'CAUSA' ? 'selected' : ''}>CAUSA</option>
              <option value="RECOMENDACIÓN" ${det.subtipo === 'RECOMENDACIÓN' ? 'selected' : ''}>RECOMENDACIÓN</option>
            </select>
          </div>
          <div class="form-group">
            <label>Carácter</label>
            <select id="caracterExist-${det.id_detalle_jia}" disabled>
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
          <textarea id="descripcionExist-${det.id_detalle_jia}" disabled>${det.descripcion}</textarea>
        </div>
      `;
      containerDetalles.appendChild(div);
    });

    const containerAcciones = document.getElementById('editAccionesContainer');
    containerAcciones.innerHTML = '';

    if (acciones.length > 0) {
      acciones.forEach((accion, idx) => {
        contadorAccionesEdicion++;
        const div = document.createElement('div');
        div.className = 'detalle-item editable-existente';
        div.id = `accionExistente-${accion.id_detalle_jia}`;
        div.style.borderLeftColor = '#28a745';
        div.innerHTML = `
          <div class="detalle-item-header">
            <div class="detalle-titulo">
              <strong>✅ Acción #${idx + 1}</strong>
              <span class="badge-existente" style="background: #28a745;">📌 Existente</span>
            </div>
            <div>
              <button type="button" class="btn-editar-detalle" onclick="habilitarEdicionAccion('${accion.id_detalle_jia}')" id="btnEditarAccion-${accion.id_detalle_jia}">✏️ Editar</button>
              <button type="button" class="btn-guardar-detalle" onclick="guardarEdicionAccion('${accion.id_detalle_jia}')" id="btnGuardarEditAccion-${accion.id_detalle_jia}" style="display:none;">💾 Guardar</button>
              <button type="button" class="btn-eliminar-detalle" onclick="eliminarAccionExistente('${accion.id_detalle_jia}')">🗑️ Eliminar</button>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Fecha</label>
              <input type="date" id="fechaAccionExist-${accion.id_detalle_jia}" value="${accion.fecha}" disabled>
            </div>
            <div class="form-group">
              <label>Carácter</label>
              <select id="caracterAccionExist-${accion.id_detalle_jia}" disabled>
                <option value="PSICOFÍSICO" ${accion.caracter === 'PSICOFÍSICO' ? 'selected' : ''}>PSICOFÍSICO</option>
                <option value="TÉCNICO" ${accion.caracter === 'TÉCNICO' ? 'selected' : ''}>TÉCNICO</option>
                <option value="OPERATIVO" ${accion.caracter === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
                <option value="PSICOLÓGICO" ${accion.caracter === 'PSICOLÓGICO' ? 'selected' : ''}>PSICOLÓGICO</option>
                <option value="SALUD" ${accion.caracter === 'SALUD' ? 'selected' : ''}>SALUD</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea id="descripcionAccionExist-${accion.id_detalle_jia}" disabled>${accion.descripcion}</textarea>
          </div>
        `;
        containerAcciones.appendChild(div);
      });

      const infoDiv = document.createElement('div');
      infoDiv.className = 'mensaje-info';
      infoDiv.style.marginTop = '15px';
      infoDiv.innerHTML = 'ℹ️ Para agregar nuevas acciones, use el botón "📋 Registrar Acciones" desde la tabla principal.';
      containerAcciones.appendChild(infoDiv);
    } else {
      containerAcciones.innerHTML = '<div class="mensaje-info">No hay acciones registradas. Use el botón "📋 Registrar Acciones" desde la tabla principal.</div>';
    }

    ocultarOverlay();
    cabeceraEdicionGuardada = true;

    const seccionCabecera = document.getElementById('editSeccionCabecera');
    seccionCabecera.classList.add('guardada');
    seccionCabecera.innerHTML += '<span class="badge-guardado">✓ Guardado</span>';

    document.querySelectorAll('#editSeccionCabecera input:not([readonly]), #editSeccionCabecera select:not([disabled]), #editSeccionCabecera textarea, #editSeccionCabecera button').forEach(el => el.disabled = true);

    const seccionDetalles = document.getElementById('editSeccionDetalles');
    seccionDetalles.classList.remove('bloqueada');
    document.getElementById('editMensajeBloqueo').style.display = 'none';
    document.getElementById('btnAgregarDetalleEdit').disabled = false;

    const seccionAcciones = document.getElementById('editSeccionAcciones');
    seccionAcciones.classList.remove('bloqueada');

    mostrarNotificacion('✓ Datos actualizados. Puede editar detalles y acciones.', 'success');
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar y Continuar';
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

function habilitarEdicionDetalle(idDetalle) {
  document.getElementById(`subtipoExist-${idDetalle}`).disabled = false;
  document.getElementById(`caracterExist-${idDetalle}`).disabled = false;
  document.getElementById(`descripcionExist-${idDetalle}`).disabled = false;
  document.getElementById(`btnEditarDet-${idDetalle}`).style.display = 'none';
  document.getElementById(`btnGuardarEditDet-${idDetalle}`).style.display = 'inline-block';
}

async function guardarEdicionDetalle(idDetalle) {
  const subtipo = document.getElementById(`subtipoExist-${idDetalle}`).value;
  const caracter = document.getElementById(`caracterExist-${idDetalle}`).value;
  const descripcion = document.getElementById(`descripcionExist-${idDetalle}`).value;

  if (!subtipo || !caracter || !descripcion) {
    mostrarNotificacion('Complete todos los campos', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarEditDet-${idDetalle}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Actualizando...');

  try {
    const { error } = await supabase.from('detalle_jia').update({ subtipo, caracter, descripcion }).eq('id_detalle_jia', idDetalle);
    if (error) throw error;

    ocultarOverlay();
    document.getElementById(`subtipoExist-${idDetalle}`).disabled = true;
    document.getElementById(`caracterExist-${idDetalle}`).disabled = true;
    document.getElementById(`descripcionExist-${idDetalle}`).disabled = true;
    btnGuardar.style.display = 'none';
    document.getElementById(`btnEditarDet-${idDetalle}`).style.display = 'inline-block';
    mostrarNotificacion('✓ Actualizado', 'success');
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}
async function eliminarDetalleExistente(idDetalle) {
 const confirmar = await mostrarConfirmacion('¿Eliminar este detalle?<br><br><strong>No se puede deshacer.</strong>', '🗑️ Confirmar');
  if (!confirmar) {
    console.log('Usuario canceló');
    return;
  }
  
  mostrarOverlay('Eliminando...');
  try {
    const { error, data } = await supabase
      .from('detalle_jia')
      .delete()
      .eq('id_detalle_jia', idDetalle)
      .select(); // ← AGREGAR .select() para ver qué se eliminó
    
    console.log('Resultado DELETE:', { error, data });
    
    if (error) throw error;
    
    ocultarOverlay();
    const elemento = document.getElementById(`detalleExistente-${idDetalle}`);
    if (elemento) elemento.remove();
    mostrarNotificacion('✓ Eliminado', 'success');
    cabeceraEdicionGuardada = true;
    
  } catch (error) {
    console.error('Error completo:', error);
    ocultarOverlay();
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

function habilitarEdicionAccion(idDetalle) {
  document.getElementById(`fechaAccionExist-${idDetalle}`).disabled = false;
  document.getElementById(`caracterAccionExist-${idDetalle}`).disabled = false;
  document.getElementById(`descripcionAccionExist-${idDetalle}`).disabled = false;
  document.getElementById(`btnEditarAccion-${idDetalle}`).style.display = 'none';
  document.getElementById(`btnGuardarEditAccion-${idDetalle}`).style.display = 'inline-block';
}

async function guardarEdicionAccion(idDetalle) {
  const fecha = document.getElementById(`fechaAccionExist-${idDetalle}`).value;
  const caracter = document.getElementById(`caracterAccionExist-${idDetalle}`).value;
  const descripcion = document.getElementById(`descripcionAccionExist-${idDetalle}`).value;

  if (!fecha || !caracter || !descripcion) {
    mostrarNotificacion('Complete todos los campos', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarEditAccion-${idDetalle}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Actualizando...');

  try {
    const { error } = await supabase.from('detalle_jia').update({ fecha, caracter, descripcion }).eq('id_detalle_jia', idDetalle);
    if (error) throw error;

    ocultarOverlay();
    document.getElementById(`fechaAccionExist-${idDetalle}`).disabled = true;
    document.getElementById(`caracterAccionExist-${idDetalle}`).disabled = true;
    document.getElementById(`descripcionAccionExist-${idDetalle}`).disabled = true;
    btnGuardar.style.display = 'none';
    document.getElementById(`btnEditarAccion-${idDetalle}`).style.display = 'inline-block';
    mostrarNotificacion('✓ Actualizado', 'success');
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

async function eliminarAccionExistente(idDetalle) {
  const confirmar = await mostrarConfirmacion('¿Eliminar esta acción?<br><br><strong>No se puede deshacer.</strong>', '🗑️ Confirmar');
  if (!confirmar) return;
  mostrarOverlay('Eliminando...');
  try {
    const { error } = await supabase.from('detalle_jia').delete().eq('id_detalle_jia', idDetalle);
    if (error) throw error;
    ocultarOverlay();
    const elemento = document.getElementById(`accionExistente-${idDetalle}`);
    if (elemento) elemento.remove();
    mostrarNotificacion('✓ Eliminado', 'success');
  } catch (error) {
    ocultarOverlay();
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

function agregarDetalleEdicion() {
  if (!cabeceraEdicionGuardada) {
    mostrarNotificacion('Primero guarde los cambios principales', 'error');
    return;
  }
  contadorDetallesEdicion++;
  const container = document.getElementById('editDetallesContainer');
  const detalleDiv = document.createElement('div');
  detalleDiv.className = 'detalle-item';
  detalleDiv.id = `detalleEdit-${contadorDetallesEdicion}`;
  detalleDiv.innerHTML = `
    <div class="detalle-item-header">
      <div class="detalle-titulo"><strong>Nuevo Detalle #${contadorDetallesEdicion}</strong></div>
      <div>
        <button type="button" class="btn-guardar-detalle" onclick="guardarDetalleEdicion(${contadorDetallesEdicion})" id="btnGuardarDetEdit${contadorDetallesEdicion}">💾 Guardar</button>
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
      <textarea id="descripcionDetEdit${contadorDetallesEdicion}" required></textarea>
    </div>
  `;
  container.appendChild(detalleDiv);
}

async function guardarDetalleEdicion(id) {
  const subtipo = document.getElementById(`subtipoEdit${id}`).value;
  const caracter = document.getElementById(`caracterEdit${id}`).value;
  const descripcionDet = document.getElementById(`descripcionDetEdit${id}`).value;

  if (!subtipo || !caracter || !descripcionDet) {
    mostrarNotificacion('Complete todos los campos', 'error');
    return;
  }

  const btnGuardar = document.getElementById(`btnGuardarDetEdit${id}`);
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando...';
  mostrarOverlay('Guardando...');

  try {
    const codigo = codigoActualEdicion;
    const { data: jia } = await supabase.from('jia').select('fecha, periodo').eq('codigo', codigo).single();

    const { data: ultimoDetalle } = await supabase.from('detalle_jia').select('id_detalle_jia').order('id_detalle_jia', { ascending: false }).limit(1).single();
    let nuevoIdDetalle = 'DET-00001';
    if (ultimoDetalle) {
      const numeroActual = parseInt(ultimoDetalle.id_detalle_jia.split('-')[1]);
      nuevoIdDetalle = `DET-${(numeroActual + 1).toString().padStart(5, '0')}`;
    }

    const { error } = await supabase.from('detalle_jia').insert([{
      id_detalle_jia: nuevoIdDetalle, usuarioreg: usuario, unidad, tipo: 'JIA', codigo,
      subtipo, fechareg: new Date().toISOString(), fecha: jia.fecha, periodo: parseInt(jia.periodo),
      caracter, descripcion: descripcionDet
    }]);

    if (error) throw error;

    const detalleDiv = document.getElementById(`detalleEdit-${id}`);
    detalleDiv.classList.add('guardado');
    detalleDiv.querySelector('.detalle-titulo').innerHTML += ' <span class="badge-guardado-detalle">✓ Guardado</span>';
    document.getElementById(`subtipoEdit${id}`).disabled = true;
    document.getElementById(`caracterEdit${id}`).disabled = true;
    document.getElementById(`descripcionDetEdit${id}`).disabled = true;
    btnGuardar.style.display = 'none';

    ocultarOverlay();
    mostrarNotificacion('✓ Detalle guardado', 'success');
  } catch (error) {
    ocultarOverlay();
    btnGuardar.disabled = false;
    btnGuardar.textContent = '💾 Guardar';
    mostrarNotificacion('Error: ' + error.message, 'error');
  }
}

function quitarDetalleEdicion(id) {
  const elemento = document.getElementById(`detalleEdit-${id}`);
  if (elemento && !elemento.classList.contains('guardado')) {
    elemento.remove();
  } else if (elemento) {
    mostrarNotificacion('No puede eliminar un detalle guardado', 'warning');
  }
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
  if (cabeceraEdicionGuardada) {
    cargarDatosExcel();
  }
}

function nuevoRegistro() {
  document.getElementById('modalNuevo').style.display = 'block';
  document.getElementById('formNuevo').reset();
  contadorDetalles = 0;
  cabeceraGuardada = false;
  codigoJIAActual = null;
  fechaJIAActual = null;
  periodoJIAActual = null;

  const seccionCabecera = document.getElementById('seccionCabecera');
  seccionCabecera.classList.remove('guardada');
  const badge = seccionCabecera.querySelector('.badge-guardado');
  if (badge) badge.remove();

  document.querySelectorAll('#seccionCabecera input, #seccionCabecera select, #seccionCabecera textarea, #seccionCabecera button').forEach(el => el.disabled = false);
  document.getElementById('btnGuardarCabecera').textContent = '💾 Guardar y Continuar';

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
    mostrarNotificacion('✓ JIA registrada: ' + codigoJIAActual, 'success');
    document.getElementById('modalNuevo').style.display = 'none';
    cargarDatosExcel();
  } else {
    if (confirm('No ha guardado ningún dato. ¿Cerrar de todos modos?')) {
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
  const modalEditar = document.getElementById('modalEditar');
  const modalNuevo = document.getElementById('modalNuevo');
  const modalAcciones = document.getElementById('modalAcciones');
  const modalVerDetalle = document.getElementById('modalVerDetalle');

  if (event.target === modalEditar) cerrarModalEditar();
  if (event.target === modalNuevo) cerrarModal();
  if (event.target === modalAcciones) cerrarModalAcciones();
  if (event.target === modalVerDetalle) cerrarModalVerDetalle();
};
