// ============================================
// CONTROL-VEHICULOS.JS - GESTIÓN DE VEHÍCULOS
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

let propietarioSeleccionado = null;
let propietarioConfirmado = false;

const usuario = localStorage.getItem("usuario") || "";
const unidad = localStorage.getItem("unidad") || "";
const rol = localStorage.getItem("rol") || "";

if (!usuario) window.location.replace("login.html");

// ============================================
// INICIALIZACIÓN
// ============================================

window.onload = function() {
  cargarDatosVehiculos();
  configurarFiltros();
  cargarPersonalParaSelect();
};

// ============================================
// CARGAR DATOS DE VEHÍCULOS
// ============================================

async function cargarDatosVehiculos() {
  const loadingEl = document.getElementById('loading');
  
  try {
    loadingEl.innerHTML = 'Cargando vehículos... ⏳';
    
    // Consultar vehículos con tipo_propietario = 'Personal'
  let query = supabase
    .from('vehiculo_seguridad')
    .select('*')
    .eq('tipo_propietario', 'personal')  // ← EN MINÚSCULA
    .eq('activo', true)
    .order('created_at', { ascending: false });

    const { data: vehiculos, error: errorVehiculos } = await query;
    
    if (errorVehiculos) throw errorVehiculos;

    // Obtener IDs únicos de propietarios
    const idsPropietarios = [...new Set(vehiculos.map(v => v.id_propietario))];

    // Consultar datos de personal
     const { data: personal, error: errorPersonal } = await supabase
      .from('personal')
      .select('id, nombre, dni, unidad')
      .in('id', idsPropietarios);

    if (errorPersonal) throw errorPersonal;

    // Crear mapa de propietarios
      const mapaPropietarios = {};
      personal.forEach(p => {
        mapaPropietarios[p.id] = {
          nombreCompleto: p.nombre,
          dni: p.dni,
          unidad: p.unidad
        };
      });

    // Enriquecer datos de vehículos
       datosCompletos = vehiculos.map(v => {
      const propietario = mapaPropietarios[v.id_propietario];
      return {
        ...v,
        nombreCompleto: propietario?.nombreCompleto || 'Sin propietario',
        dniPropietario: propietario?.dni || 'N/A',
        unidadPropietario: propietario?.unidad || 'N/A',
        marcaModelo: [v.marca, v.modelo].filter(Boolean).join(' ') || 'N/A'
      };
    });

    datosFiltrados = [...datosCompletos];
    
    loadingEl.style.display = 'none';
    document.getElementById('tablaVehiculos').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';
    
    actualizarTabla();
    
  } catch (error) {
    console.error('Error al cargar vehículos:', error);
    loadingEl.innerHTML = `❌ Error: ${error.message}<br><button onclick="cargarDatosVehiculos()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
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
  
  datosPagina.forEach((vehiculo, index) => {
    const numeroGlobal = inicio + index + 1;
    const fila = document.createElement('tr');
    
    // Badge de estado
    const estadoBadge = vehiculo.estado 
      ? '<span class="estado-badge estado-activo">✓ Activo</span>'
      : '<span class="estado-badge estado-inactivo">✗ Inactivo</span>';
    
    fila.innerHTML = `
      <td>${numeroGlobal}</td>
      <td><strong>${vehiculo.placa}</strong></td>
      <td>${vehiculo.tipo_vehiculo || 'N/A'}</td>
      <td>${vehiculo.marcaModelo}</td>
      <td>${vehiculo.nombreCompleto}</td>
      <td>${estadoBadge}</td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-ver" onclick="verDetalle(${inicio + index})" title="Ver detalle">👁</button>
          <button class="btn-icono btn-editar" onclick="editarVehiculo(${inicio + index})" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarVehiculo(${inicio + index})" title="Eliminar">🗑️</button>
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
  info.textContent = `${datosFiltrados.length} vehículos`;
}

// ============================================
// FILTROS
// ============================================

function configurarFiltros() {
  document.getElementById('buscar').addEventListener('input', aplicarFiltros);
  document.getElementById('filtroTipoVehiculo').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
}

function aplicarFiltros() {
  const textoBusqueda = document.getElementById('buscar').value.toLowerCase();
  const tipoVehiculo = document.getElementById('filtroTipoVehiculo').value;
  const estado = document.getElementById('filtroEstado').value;
  
  datosFiltrados = datosCompletos.filter(vehiculo => {
    const cumpleBusqueda = !textoBusqueda || 
      (vehiculo.placa || '').toLowerCase().includes(textoBusqueda) ||
      (vehiculo.nombreCompleto || '').toLowerCase().includes(textoBusqueda) ||
      (vehiculo.dniPropietario || '').toLowerCase().includes(textoBusqueda);
    
    const cumpleTipo = !tipoVehiculo || vehiculo.tipo_vehiculo === tipoVehiculo;
    const cumpleEstado = !estado || vehiculo.estado.toString() === estado;
    
    return cumpleBusqueda && cumpleTipo && cumpleEstado;
  });
  
  paginaActual = 1;
  actualizarTabla();
}

// ============================================
// CARGAR PERSONAL PARA SELECT
// ============================================

let listaPersonalCompleta = [];

async function cargarPersonalParaSelect() {
  try {
    const { data: personal, error } = await supabase
      .from('personal')
      .select('id, nombre, dni, nsa, unidad')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    listaPersonalCompleta = personal;
    
    console.log('✅ Cargados', personal.length, 'registros');

    configurarAutocomplete();

  } catch (error) {
    console.error('Error al cargar personal:', error);
    mostrarNotificacion('Error al cargar personal: ' + error.message, 'error');
  }
}

function configurarAutocomplete() {
  const input = document.getElementById('inputPersonal');
  const dropdown = document.getElementById('sugerenciasPersonal');
  
  if (!input || !dropdown) {
    console.error('Elementos no encontrados');
    return;
  }

  // Limpiar eventos anteriores
  const nuevoInput = input.cloneNode(true);
  input.parentNode.replaceChild(nuevoInput, input);
  
  const inputFinal = document.getElementById('inputPersonal');

  // Evento de escritura
  inputFinal.addEventListener('input', function() {
    const texto = this.value.trim();
    
    if (texto.length === 0) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');
      return;
    }

    buscarYMostrar(texto, dropdown, inputFinal);
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!inputFinal.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function buscarYMostrar(texto, dropdown, input) {
  const textoLower = texto.toLowerCase();
  
  const resultados = listaPersonalCompleta.filter(p => {
    return p.nombre.toLowerCase().includes(textoLower) ||
           p.dni.includes(texto) ||
           p.nsa.includes(texto);
  });

  dropdown.innerHTML = '';
  
  if (resultados.length === 0) {
    dropdown.innerHTML = '<div class="sin-resultados">No se encontraron resultados</div>';
    dropdown.classList.add('active');
    return;
  }

  resultados.slice(0, 20).forEach(persona => {
    const item = document.createElement('div');
    item.className = 'sugerencia-item';
    item.innerHTML = `
      <span class="sugerencia-nombre">${persona.nombre}</span>
      <span class="sugerencia-datos">NSA: ${persona.nsa} | DNI: ${persona.dni} | ${persona.unidad || 'Sin unidad'}</span>
    `;
    
    item.onclick = function() {
      seleccionarPersona(persona, input, dropdown);
    };
    
    dropdown.appendChild(item);
  });
  
  dropdown.classList.add('active');
}

function seleccionarPersona(persona, input, dropdown) {
  propietarioSeleccionado = {
    id: persona.id,
    dni: persona.dni,
    nsa: persona.nsa,
    nombre: persona.nombre,
    unidad: persona.unidad
  };

  input.value = `${persona.nombre} - NSA: ${persona.nsa}`;
  dropdown.classList.remove('active');

  document.getElementById('idPersonalSeleccionado').value = persona.id;
  document.getElementById('dniSeleccionado').textContent = persona.dni;
  document.getElementById('nombreSeleccionado').textContent = persona.nombre;
  document.getElementById('unidadSeleccionado').textContent = persona.unidad || 'Sin unidad';
  
  document.getElementById('infoPersonalSeleccionado').style.display = 'block';
  document.getElementById('btnConfirmarPropietario').disabled = false;
}


function mostrarSugerencias(resultados, dropdown, input) {
  dropdown.innerHTML = '';
  
  if (resultados.length === 0) {
    dropdown.innerHTML = '<div class="sin-resultados">No se encontraron resultados</div>';
    dropdown.classList.add('active');
    return;
  }

  resultados.forEach(persona => {
    const item = document.createElement('div');
    item.className = 'sugerencia-item';
    item.innerHTML = `
      <span class="sugerencia-nombre">${persona.nombre}</span>
      <span class="sugerencia-datos">NSA: ${persona.nsa} | DNI: ${persona.dni} | ${persona.unidad || 'Sin unidad'}</span>
    `;
    
    item.addEventListener('click', function() {
      seleccionarPersona(persona, input, dropdown);
    });
    
    dropdown.appendChild(item);
  });
  
  dropdown.classList.add('active');
}

function seleccionarPersona(persona, input, dropdown) {
  propietarioSeleccionado = {
    id: persona.id,
    dni: persona.dni,
    nsa: persona.nsa,
    nombre: persona.nombre,
    unidad: persona.unidad
  };

  input.value = `${persona.nombre} - NSA: ${persona.nsa}`;
  dropdown.classList.remove('active');

  document.getElementById('idPersonalSeleccionado').value = persona.id;
  document.getElementById('dniSeleccionado').textContent = persona.dni;
  document.getElementById('nombreSeleccionado').textContent = persona.nombre;
  document.getElementById('unidadSeleccionado').textContent = persona.unidad || 'Sin unidad';
  
  document.getElementById('infoPersonalSeleccionado').style.display = 'block';
  document.getElementById('btnConfirmarPropietario').disabled = false;
}

// ============================================
// NUEVO REGISTRO
// ============================================

function nuevoRegistro() {
  // Reset completo
  propietarioSeleccionado = null;
  propietarioConfirmado = false;
  
  document.getElementById('formNuevo').reset();
  document.getElementById('inputPersonal').value = '';
  document.getElementById('idPersonalSeleccionado').value = '';
  document.getElementById('sugerenciasPersonal').classList.remove('active');
  document.getElementById('infoPersonalSeleccionado').style.display = 'none';
  document.getElementById('btnConfirmarPropietario').disabled = true;
  
  // Bloquear sección de vehículo
  const seccionVehiculo = document.getElementById('seccionVehiculo');
  seccionVehiculo.classList.add('bloqueada');
  document.getElementById('mensajeBloqueoVehiculo').style.display = 'block';
  document.getElementById('propietarioConfirmado').style.display = 'none';
  document.getElementById('btnGuardarVehiculo').disabled = true;
  
  // Habilitar sección de propietario
  const seccionPropietario = document.getElementById('seccionPropietario');
  seccionPropietario.classList.remove('guardada');
  const badge = seccionPropietario.querySelector('.badge-guardado');
  if (badge) badge.remove();
  
  document.querySelectorAll('#seccionPropietario input, #seccionPropietario select, #seccionPropietario button').forEach(el => {
    el.disabled = false;
  });
  configurarAutocomplete();
  document.getElementById('modalNuevo').style.display = 'block';
}

// ============================================
// CONFIRMAR PROPIETARIO
// ============================================

function confirmarPropietario() {
  if (!propietarioSeleccionado) {
    mostrarNotificacion('Debe seleccionar un propietario', 'error');
    return;
  }

  propietarioConfirmado = true;

  // Marcar sección como guardada
  const seccionPropietario = document.getElementById('seccionPropietario');
  seccionPropietario.classList.add('guardada');
  seccionPropietario.innerHTML += '<span class="badge-guardado">✓ Confirmado</span>';
  
  // Deshabilitar campos
  document.querySelectorAll('#seccionPropietario input, #seccionPropietario select, #seccionPropietario button').forEach(el => {
    el.disabled = true;
  });

  // Habilitar sección de vehículo
  const seccionVehiculo = document.getElementById('seccionVehiculo');
  seccionVehiculo.classList.remove('bloqueada');
  document.getElementById('mensajeBloqueoVehiculo').style.display = 'none';
  
  document.getElementById('nombrePropietarioConfirmado').textContent = propietarioSeleccionado.nombre;
  document.getElementById('propietarioConfirmado').style.display = 'block';
  document.getElementById('btnGuardarVehiculo').disabled = false;

  mostrarNotificacion('✓ Propietario confirmado. Ahora complete los datos del vehículo.', 'success');
}

// ============================================
// GUARDAR VEHÍCULO
// ============================================

async function guardarVehiculo() {
  if (!propietarioConfirmado) {
    mostrarNotificacion('Debe confirmar primero al propietario', 'error');
    return;
  }

  const placa = document.getElementById('placa').value.trim().toUpperCase();
  const tipoVehiculo = document.getElementById('tipoVehiculo').value;
  const tipoPropiedad = document.getElementById('tipoPropiedad').value;
  const marca = document.getElementById('marca').value.trim();
  const modelo = document.getElementById('modelo').value.trim();
  const color = document.getElementById('color').value.trim();
  const fecVencSoat = document.getElementById('fecVencSoat').value || null;
  const fecVencRevTecnica = document.getElementById('fecVencRevTecnica').value || null;
  const fecVencBrev = document.getElementById('fecVencBrev').value || null;
  const estado = document.getElementById('estado').checked;

  if (!placa || !tipoVehiculo || !tipoPropiedad) {
    mostrarNotificacion('Complete los campos obligatorios', 'error');
    return;
  }

  mostrarOverlay('Guardando vehículo...');

  try {
    // Verificar que la placa no exista
    const { data: existente, error: errorVerificar } = await supabase
      .from('vehiculo_seguridad')
      .select('id')
      .eq('placa', placa)
      .eq('activo', true)
      .single();

    if (existente) {
      throw new Error(`La placa ${placa} ya está registrada`);
    }

    // Insertar vehículo
const { data, error } = await supabase
  .from('vehiculo_seguridad')
  .insert([{
    id_propietario: propietarioSeleccionado.id,
    tipo_propietario: 'personal',  // ← EN MINÚSCULA
    tipo_vehiculo: tipoVehiculo,
    tipo_propiedad: tipoPropiedad,
    placa: placa,
    marca: marca || null,
    modelo: modelo || null,
    color: color || null,
    fec_venc_soat: fecVencSoat,
    fec_venc_revtecnica: fecVencRevTecnica,
    fec_venc_brev: fecVencBrev,
    estado: estado,
    activo: true,
    temporal: false
  }])
  .select();

    ocultarOverlay();

    if (error) throw error;

    mostrarNotificacion(`✓ Vehículo registrado correctamente: ${placa}`, 'success');
    cerrarModal();
    cargarDatosVehiculos();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
  }
}

// ============================================
// VER DETALLE
// ============================================

async function verDetalle(index) {
  const vehiculo = datosFiltrados[index];
  
  mostrarOverlay('Cargando información...');
  
  try {
    // Obtener datos completos del vehículo
    const { data, error } = await supabase
      .from('vehiculo_seguridad')
      .select('*')
      .eq('id', vehiculo.id)
      .single();

    if (error) throw error;

    // Obtener datos del propietario
    const { data: propietario, error: errorPropietario } = await supabase
      .from('personal')
      .select('nombre, dni, unidad')
      .eq('id', data.id_propietario)
      .single();

    if (errorPropietario) throw errorPropietario;

    ocultarOverlay();

    // Mostrar datos en el modal
    document.getElementById('verPlaca').textContent = data.placa || '-';
    document.getElementById('verTipoVehiculo').textContent = data.tipo_vehiculo || '-';
    document.getElementById('verTipoPropiedad').textContent = data.tipo_propiedad || '-';
    document.getElementById('verMarca').textContent = data.marca || '-';
    document.getElementById('verModelo').textContent = data.modelo || '-';
    document.getElementById('verColor').textContent = data.color || '-';
    document.getElementById('verEstado').textContent = data.estado ? 'Activo' : 'Inactivo';

    document.getElementById('verNombreCompleto').textContent = propietario.nombre;
    document.getElementById('verDni').textContent = propietario.dni || '-';
    document.getElementById('verUnidad').textContent = propietario.unidad || '-';

    document.getElementById('verSoat').textContent = data.fec_venc_soat ? formatearFecha(data.fec_venc_soat) : 'No registrado';
    document.getElementById('verRevTecnica').textContent = data.fec_venc_revtecnica ? formatearFecha(data.fec_venc_revtecnica) : 'No registrado';
    document.getElementById('verBrevete').textContent = data.fec_venc_brev ? formatearFecha(data.fec_venc_brev) : 'No registrado';

    document.getElementById('modalVerDetalle').style.display = 'block';

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar información: ' + error.message, 'error');
  }
}

function cerrarModalVerDetalle() {
  document.getElementById('modalVerDetalle').style.display = 'none';
}

// ============================================
// EDITAR VEHÍCULO
// ============================================

async function editarVehiculo(index) {
  const vehiculo = datosFiltrados[index];
  
  mostrarOverlay('Cargando datos...');
  
  try {
    // Obtener datos completos
    const { data, error } = await supabase
      .from('vehiculo_seguridad')
      .select('*')
      .eq('id', vehiculo.id)
      .single();

    if (error) throw error;

    // Obtener propietario
 const { data: propietario, error: errorPropietario } = await supabase
  .from('personal')
  .select('nombre, dni, unidad')
  .eq('id', data.id_propietario)
  .single();

    if (errorPropietario) throw errorPropietario;

    ocultarOverlay();

    // Cargar datos en el formulario de edición
    document.getElementById('editIdVehiculo').value = data.id;
    document.getElementById('editNombreCompleto').textContent = propietario.nombre;
    document.getElementById('editDni').textContent = propietario.dni;
    document.getElementById('editUnidad').textContent = propietario.unidad;

    document.getElementById('editPlaca').value = data.placa;
    document.getElementById('editTipoVehiculo').value = data.tipo_vehiculo || '';
    document.getElementById('editTipoPropiedad').value = data.tipo_propiedad || '';
    document.getElementById('editMarca').value = data.marca || '';
    document.getElementById('editModelo').value = data.modelo || '';
    document.getElementById('editColor').value = data.color || '';
    document.getElementById('editFecVencSoat').value = data.fec_venc_soat || '';
    document.getElementById('editFecVencRevTecnica').value = data.fec_venc_revtecnica || '';
    document.getElementById('editFecVencBrev').value = data.fec_venc_brev || '';
    document.getElementById('editEstado').checked = data.estado;

    document.getElementById('modalEditar').style.display = 'block';

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar datos: ' + error.message, 'error');
  }
}

async function actualizarVehiculo() {
  const idVehiculo = document.getElementById('editIdVehiculo').value;
  const placa = document.getElementById('editPlaca').value.trim().toUpperCase();
  const tipoVehiculo = document.getElementById('editTipoVehiculo').value;
  const tipoPropiedad = document.getElementById('editTipoPropiedad').value;
  const marca = document.getElementById('editMarca').value.trim();
  const modelo = document.getElementById('editModelo').value.trim();
  const color = document.getElementById('editColor').value.trim();
  const fecVencSoat = document.getElementById('editFecVencSoat').value || null;
  const fecVencRevTecnica = document.getElementById('editFecVencRevTecnica').value || null;
  const fecVencBrev = document.getElementById('editFecVencBrev').value || null;
  const estado = document.getElementById('editEstado').checked;

  if (!placa || !tipoVehiculo || !tipoPropiedad) {
    mostrarNotificacion('Complete los campos obligatorios', 'error');
    return;
  }

  mostrarOverlay('Actualizando vehículo...');

  try {
    const { error } = await supabase
      .from('vehiculo_seguridad')
      .update({
        placa: placa,
        tipo_vehiculo: tipoVehiculo,
        tipo_propiedad: tipoPropiedad,
        marca: marca || null,
        modelo: modelo || null,
        color: color || null,
        fec_venc_soat: fecVencSoat,
        fec_venc_revtecnica: fecVencRevTecnica,
        fec_venc_brev: fecVencBrev,
        estado: estado
      })
      .eq('id', idVehiculo);

    ocultarOverlay();

    if (error) throw error;

    mostrarNotificacion('✓ Vehículo actualizado correctamente', 'success');
    cerrarModalEditar();
    cargarDatosVehiculos();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
  }
}

function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
}

// ============================================
// ELIMINAR VEHÍCULO
// ============================================

async function eliminarVehiculo(index) {
  const vehiculo = datosFiltrados[index];
  
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de eliminar el vehículo <strong>${vehiculo.placa}</strong>?<br><br>⚠️ Esta acción es PERMANENTE y NO se puede deshacer.`,
    '🗑️ Confirmar Eliminación Permanente'
  );

  if (!confirmar) return;

  mostrarOverlay('Eliminando vehículo permanentemente...');

  try {
    // Eliminación REAL (DELETE)
    const { error } = await supabase
      .from('vehiculo_seguridad')
      .delete()
      .eq('id', vehiculo.id);

    ocultarOverlay();

    if (error) throw error;

    mostrarNotificacion('✓ Vehículo eliminado permanentemente', 'success');
    cargarDatosVehiculos();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al eliminar: ' + error.message, 'error');
  }
}

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

function cerrarModal() {
  document.getElementById('modalNuevo').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
  const modalNuevo = document.getElementById('modalNuevo');
  const modalEditar = document.getElementById('modalEditar');
  const modalVerDetalle = document.getElementById('modalVerDetalle');
  
  if (event.target === modalNuevo) cerrarModal();
  if (event.target === modalEditar) cerrarModalEditar();
  if (event.target === modalVerDetalle) cerrarModalVerDetalle();
};

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
