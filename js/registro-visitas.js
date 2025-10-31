// ============================================
// CONTROL-VISITAS.JS - GESTIÓN DE VISITAS AUTORIZADAS
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
let visitanteSeleccionado = null;
let visitanteConfirmado = false;
let vehiculoSeleccionado = null;
let vehiculoConfirmado = false;
let opcionVehiculo = 'sin_vehiculo';

// Listas para autocomplete
let listaPersonalForaneo = [];
let listaVehiculos = [];
let listaUnidades = [];
let listaEmpresas = [];

// Usuario actual
const usuario = localStorage.getItem("usuario") || "";
const unidad = localStorage.getItem("unidad") || "";
const rol = localStorage.getItem("rol") || "";

if (!usuario) window.location.replace("login.html");

// ============================================
// INICIALIZACIÓN
// ============================================

window.onload = function() {
  cargarDatosIniciales();
  configurarFiltros();
};

async function cargarDatosIniciales() {
  mostrarOverlay('Cargando datos del sistema...');
  
  try {
    // Cargar todo en paralelo
    await Promise.all([
      cargarPersonalForaneo(),
      cargarUnidades(),
      cargarEmpresas(),
      cargarVehiculos(),
      cargarVisitasAutorizadas()
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
// CARGAR PERSONAL FORÁNEO
// ============================================

async function cargarPersonalForaneo() {
  try {
    const { data, error } = await supabase
      .from('personal_foraneo')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    listaPersonalForaneo = data;
    console.log('✅ Personal foráneo cargado:', data.length, 'registros');
    
    // Enriquecer con nombres de origen
    await enriquecerOrigenPersonal();
    
    configurarAutocompleteVisitante();
    
  } catch (error) {
    console.error('Error al cargar personal foráneo:', error);
    throw error;
  }
}

async function enriquecerOrigenPersonal() {
  // Obtener IDs únicos de unidades y empresas
  const idsUnidades = [...new Set(
    listaPersonalForaneo
      .filter(p => p.tipo_origen === 'unidad' && p.id_origen)
      .map(p => p.id_origen)
  )];
  
  const idsEmpresas = [...new Set(
    listaPersonalForaneo
      .filter(p => p.tipo_origen === 'empresa' && p.id_origen)
      .map(p => p.id_origen)
  )];

  // Consultar nombres de unidades
  if (idsUnidades.length > 0) {
    const { data: unidades, error: errorUnidades } = await supabase
      .from('unidad')
      .select('id, nombre')
      .in('id', idsUnidades);
    
    if (!errorUnidades) {
      const mapaUnidades = {};
      unidades.forEach(u => mapaUnidades[u.id] = u.nombre);
      
      listaPersonalForaneo.forEach(p => {
        if (p.tipo_origen === 'unidad' && p.id_origen) {
          p.nombre_origen = mapaUnidades[p.id_origen] || 'Unidad desconocida';
        }
      });
    }
  }

  // Consultar nombres de empresas
  if (idsEmpresas.length > 0) {
    const { data: empresas, error: errorEmpresas } = await supabase
      .from('empresa')
      .select('id, nombre')
      .in('id', idsEmpresas);
    
    if (!errorEmpresas) {
      const mapaEmpresas = {};
      empresas.forEach(e => mapaEmpresas[e.id] = e.nombre);
      
      listaPersonalForaneo.forEach(p => {
        if (p.tipo_origen === 'empresa' && p.id_origen) {
          p.nombre_origen = mapaEmpresas[p.id_origen] || 'Empresa desconocida';
        }
      });
    }
  }
}

// ============================================
// CARGAR UNIDADES
// ============================================

async function cargarUnidades() {
  try {
    const { data, error } = await supabase
      .from('unidad')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    listaUnidades = data;
    console.log('✅ Unidades cargadas:', data.length, 'registros');
    
    // Llenar select de unidades
    actualizarSelectUnidades();
    
  } catch (error) {
    console.error('Error al cargar unidades:', error);
    throw error;
  }
}

function actualizarSelectUnidades() {
  const select = document.getElementById('nuevoForaneoUnidad');
  if (!select) return;
  
  select.innerHTML = '<option value="">Seleccione una unidad</option>';
  
  listaUnidades.forEach(unidad => {
    const option = document.createElement('option');
    option.value = unidad.id;
    option.textContent = unidad.nombre;
    select.appendChild(option);
  });
}

// ============================================
// CARGAR EMPRESAS
// ============================================

async function cargarEmpresas() {
  try {
    const { data, error } = await supabase
      .from('empresa')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    listaEmpresas = data;
    console.log('✅ Empresas cargadas:', data.length, 'registros');
    
    // Llenar select de empresas
    actualizarSelectEmpresas();
    
  } catch (error) {
    console.error('Error al cargar empresas:', error);
    throw error;
  }
}

function actualizarSelectEmpresas() {
  const select = document.getElementById('nuevoForaneoEmpresa');
  if (!select) return;
  
  select.innerHTML = '<option value="">Seleccione una empresa</option>';
  
  listaEmpresas.forEach(empresa => {
    const option = document.createElement('option');
    option.value = empresa.id;
    option.textContent = empresa.nombre + (empresa.ruc ? ` (RUC: ${empresa.ruc})` : '');
    select.appendChild(option);
  });
}

// ============================================
// CARGAR VEHÍCULOS
// ============================================

async function cargarVehiculos() {
  try {
    const { data, error } = await supabase
      .from('vehiculo_seguridad')
      .select('*')
      .eq('tipo_propietario', 'foraneo')
      .eq('activo', true)
      .order('placa', { ascending: true });

    if (error) throw error;

    listaVehiculos = data;
    console.log('✅ Vehículos cargados:', data.length, 'registros');
    
    configurarAutocompleteVehiculo();
    
  } catch (error) {
    console.error('Error al cargar vehículos:', error);
    throw error;
  }
}

// ============================================
// CARGAR VISITAS AUTORIZADAS
// ============================================

async function cargarVisitasAutorizadas() {
  const loadingEl = document.getElementById('loading');
  
  try {
    loadingEl.innerHTML = 'Cargando visitas autorizadas... ⏳';
    loadingEl.style.display = 'block';
    
    // Consultar TODAS las visitas (activas e inactivas) para que aparezcan en el historial
    const { data: visitas, error: errorVisitas } = await supabase
      .from('visitas_autorizadas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (errorVisitas) throw errorVisitas;

    // Obtener IDs únicos de visitantes
    const idsVisitantes = [...new Set(visitas.map(v => v.id_visita))];

    // Consultar datos de personal foráneo
    const { data: visitantes, error: errorVisitantes } = await supabase
      .from('personal_foraneo')
      .select('id, nombre, dni, nsa, pasaporte, tipo_origen, id_origen')
      .in('id', idsVisitantes);

    if (errorVisitantes) throw errorVisitantes;

    // Obtener IDs únicos de vehículos
    const idsVehiculos = [...new Set(visitas.filter(v => v.id_vehiculo).map(v => v.id_vehiculo))];

    let vehiculosMap = {};
    if (idsVehiculos.length > 0) {
      const { data: vehiculos, error: errorVehiculos } = await supabase
        .from('vehiculo_seguridad')
        .select('id, placa, tipo_vehiculo, marca, modelo')
        .in('id', idsVehiculos);

      if (!errorVehiculos) {
        vehiculos.forEach(v => {
          vehiculosMap[v.id] = v;
        });
      }
    }

    // Crear mapa de visitantes
    const mapaVisitantes = {};
    visitantes.forEach(v => {
      mapaVisitantes[v.id] = v;
    });

    // Obtener nombres de origen
    await enriquecerOrigenVisitantes(visitantes);

    // Enriquecer datos de visitas
    datosCompletos = visitas.map(v => {
      const visitante = mapaVisitantes[v.id_visita] || {};
      const vehiculo = vehiculosMap[v.id_vehiculo];
      
      return {
        ...v,
        nombreVisitante: visitante.nombre || 'Sin nombre',
        dniVisitante: visitante.dni || '-',
        nsaVisitante: visitante.nsa || '-',
        pasaporteVisitante: visitante.pasaporte || '-',
        tipoOrigen: visitante.tipo_origen || '-',
        nombreOrigen: visitante.nombre_origen || '-',
        placaVehiculo: vehiculo ? vehiculo.placa : 'Sin vehículo',
        tipoVehiculo: vehiculo ? vehiculo.tipo_vehiculo : '-',
        marcaModelo: vehiculo ? [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || '-' : '-'
      };
    });

    datosFiltrados = [...datosCompletos];
    
    loadingEl.style.display = 'none';
    document.getElementById('tablaVisitas').style.display = 'table';
    document.getElementById('paginacion').style.display = 'flex';
    
    actualizarTabla();
    
  } catch (error) {
    console.error('Error al cargar visitas:', error);
    loadingEl.innerHTML = `❌ Error: ${error.message}<br><button onclick="cargarVisitasAutorizadas()" style="margin-top:10px;padding:10px 20px;cursor:pointer;">Reintentar</button>`;
  }
}

async function enriquecerOrigenVisitantes(visitantes) {
  const idsUnidades = [...new Set(
    visitantes
      .filter(v => v.tipo_origen === 'unidad' && v.id_origen)
      .map(v => v.id_origen)
  )];
  
  const idsEmpresas = [...new Set(
    visitantes
      .filter(v => v.tipo_origen === 'empresa' && v.id_origen)
      .map(v => v.id_origen)
  )];

  if (idsUnidades.length > 0) {
    const { data: unidades, error: errorUnidades } = await supabase
      .from('unidad')
      .select('id, nombre')
      .in('id', idsUnidades);
    
    if (!errorUnidades) {
      const mapaUnidades = {};
      unidades.forEach(u => mapaUnidades[u.id] = u.nombre);
      
      visitantes.forEach(v => {
        if (v.tipo_origen === 'unidad' && v.id_origen) {
          v.nombre_origen = mapaUnidades[v.id_origen] || 'Unidad desconocida';
        }
      });
    }
  }

  if (idsEmpresas.length > 0) {
    const { data: empresas, error: errorEmpresas } = await supabase
      .from('empresa')
      .select('id, nombre')
      .in('id', idsEmpresas);
    
    if (!errorEmpresas) {
      const mapaEmpresas = {};
      empresas.forEach(e => mapaEmpresas[e.id] = e.nombre);
      
      visitantes.forEach(v => {
        if (v.tipo_origen === 'empresa' && v.id_origen) {
          v.nombre_origen = mapaEmpresas[v.id_origen] || 'Empresa desconocida';
        }
      });
    }
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
  
  datosPagina.forEach((visita, index) => {
    const numeroGlobal = inicio + index + 1;
    const fila = document.createElement('tr');
    
    // Calcular estado de la visita
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaInicio = new Date(visita.fec_inicio + 'T00:00:00');
    const fechaFin = new Date(visita.fec_fin + 'T00:00:00');
    
    let estadoBadge = '';
    if (!visita.estado) {
      estadoBadge = '<span class="estado-badge estado-vencido">❌ Inactiva</span>';
    } else if (hoy > fechaFin) {
      estadoBadge = '<span class="estado-badge estado-vencido">⏰ Vencida</span>';
    } else if (hoy < fechaInicio) {
      estadoBadge = '<span class="estado-badge estado-proximo">📅 Próxima</span>';
    } else {
      estadoBadge = '<span class="estado-badge estado-activo">✓ Activa</span>';
    }
    
    // Badge de origen
    const origenBadge = visita.tipoOrigen === 'unidad' 
      ? `<span class="badge-origen badge-unidad">🏢 ${visita.nombreOrigen}</span>`
      : `<span class="badge-origen badge-empresa">🏭 ${visita.nombreOrigen}</span>`;
    
    fila.innerHTML = `
      <td>${numeroGlobal}</td>
      <td><strong>${visita.nombreVisitante}</strong></td>
      <td>${visita.dniVisitante !== '-' ? visita.dniVisitante : (visita.nsaVisitante !== '-' ? visita.nsaVisitante : visita.pasaporteVisitante)}</td>
      <td>${origenBadge}</td>
      <td>${visita.placaVehiculo}</td>
      <td>${formatearFecha(visita.fec_inicio)}</td>
      <td>${formatearFecha(visita.fec_fin)}</td>
      <td>${estadoBadge}</td>
      <td>
        <div class="acciones">
          <button class="btn-icono btn-ver" onclick="verDetalle(${inicio + index})" title="Ver detalle">👁</button>
          <button class="btn-icono btn-editar" onclick="editarVisita(${inicio + index})" title="Editar">✏️</button>
          <button class="btn-icono btn-eliminar" onclick="eliminarVisita(${inicio + index})" title="Eliminar">🗑️</button>
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
  info.textContent = `${datosFiltrados.length} visitas autorizadas`;
}

// ============================================
// FILTROS
// ============================================

function configurarFiltros() {
  document.getElementById('buscar').addEventListener('input', aplicarFiltros);
  document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
  document.getElementById('filtroOrigen').addEventListener('change', aplicarFiltros);
}

function aplicarFiltros() {
  const textoBusqueda = document.getElementById('buscar').value.toLowerCase();
  const filtroEstado = document.getElementById('filtroEstado').value;
  const filtroOrigen = document.getElementById('filtroOrigen').value;
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  datosFiltrados = datosCompletos.filter(visita => {
    // Filtro de búsqueda
    const cumpleBusqueda = !textoBusqueda || 
      (visita.nombreVisitante || '').toLowerCase().includes(textoBusqueda) ||
      (visita.dniVisitante || '').toLowerCase().includes(textoBusqueda) ||
      (visita.nsaVisitante || '').toLowerCase().includes(textoBusqueda) ||
      (visita.nombreOrigen || '').toLowerCase().includes(textoBusqueda);
    
    // Filtro de estado
    let cumpleEstado = true;
    if (filtroEstado) {
      const fechaInicio = new Date(visita.fec_inicio + 'T00:00:00');
      const fechaFin = new Date(visita.fec_fin + 'T00:00:00');
      
      if (filtroEstado === 'activa') {
        cumpleEstado = visita.estado && hoy >= fechaInicio && hoy <= fechaFin;
      } else if (filtroEstado === 'vencida') {
        cumpleEstado = hoy > fechaFin;
      } else if (filtroEstado === 'proxima') {
        cumpleEstado = visita.estado && hoy < fechaInicio;
      }
    }
    
    // Filtro de origen
    const cumpleOrigen = !filtroOrigen || visita.tipoOrigen === filtroOrigen;
    
    return cumpleBusqueda && cumpleEstado && cumpleOrigen;
  });
  
  paginaActual = 1;
  actualizarTabla();
}

// ============================================
// AUTOCOMPLETE - VISITANTES
// ============================================

function configurarAutocompleteVisitante() {
  const input = document.getElementById('inputVisitante');
  const dropdown = document.getElementById('sugerenciasVisitante');
  
  if (!input || !dropdown) {
    console.error('Elementos de autocomplete visitante no encontrados');
    return;
  }

  // Limpiar eventos anteriores
  const nuevoInput = input.cloneNode(true);
  input.parentNode.replaceChild(nuevoInput, input);
  
  const inputFinal = document.getElementById('inputVisitante');

  // Evento de escritura
  inputFinal.addEventListener('input', function() {
    const texto = this.value.trim();
    
    if (texto.length === 0) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');
      return;
    }

    buscarYMostrarVisitantes(texto, dropdown, inputFinal);
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!inputFinal.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function buscarYMostrarVisitantes(texto, dropdown, input) {
  const textoLower = texto.toLowerCase();
  
  const resultados = listaPersonalForaneo.filter(p => {
    return p.nombre.toLowerCase().includes(textoLower) ||
           (p.dni && p.dni.includes(texto)) ||
           (p.nsa && p.nsa.includes(texto)) ||
           (p.pasaporte && p.pasaporte.toLowerCase().includes(textoLower));
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
    
    const identificacion = [];
    if (persona.dni) identificacion.push(`DNI: ${persona.dni}`);
    if (persona.nsa) identificacion.push(`NSA: ${persona.nsa}`);
    if (persona.pasaporte) identificacion.push(`Pasaporte: ${persona.pasaporte}`);
    
    const origen = persona.nombre_origen || (persona.tipo_origen === 'unidad' ? 'Unidad' : 'Empresa');
    
    item.innerHTML = `
      <span class="sugerencia-nombre">${persona.nombre}</span>
      <span class="sugerencia-datos">${identificacion.join(' | ')} | ${origen}</span>
    `;
    
    item.onclick = function() {
      seleccionarVisitante(persona, input, dropdown);
    };
    
    dropdown.appendChild(item);
  });
  
  dropdown.classList.add('active');
}

function seleccionarVisitante(persona, input, dropdown) {
  visitanteSeleccionado = {
    id: persona.id,
    dni: persona.dni || '',
    nsa: persona.nsa || '',
    pasaporte: persona.pasaporte || '',
    nombre: persona.nombre,
    tipo_origen: persona.tipo_origen,
    id_origen: persona.id_origen,
    nombre_origen: persona.nombre_origen || ''
  };

  input.value = persona.nombre;
  dropdown.classList.remove('active');

  document.getElementById('idVisitanteSeleccionado').value = persona.id;
  document.getElementById('nombreVisitante').textContent = persona.nombre;
  document.getElementById('dniVisitante').textContent = persona.dni || 'N/A';
  document.getElementById('nsaVisitante').textContent = persona.nsa || 'N/A';
  document.getElementById('pasaporteVisitante').textContent = persona.pasaporte || 'N/A';
  document.getElementById('origenVisitante').textContent = persona.nombre_origen || (persona.tipo_origen === 'unidad' ? 'Unidad' : 'Empresa');
  
  document.getElementById('infoVisitanteSeleccionado').style.display = 'block';
  document.getElementById('btnConfirmarVisitante').disabled = false;
}

// ============================================
// AUTOCOMPLETE - VEHÍCULOS
// ============================================

function configurarAutocompleteVehiculo() {
  const input = document.getElementById('inputVehiculo');
  const dropdown = document.getElementById('sugerenciasVehiculo');
  
  if (!input || !dropdown) return;

  // Limpiar eventos anteriores
  const nuevoInput = input.cloneNode(true);
  input.parentNode.replaceChild(nuevoInput, input);
  
  const inputFinal = document.getElementById('inputVehiculo');

  inputFinal.addEventListener('input', function() {
    const texto = this.value.trim();
    
    if (texto.length === 0) {
      dropdown.innerHTML = '';
      dropdown.classList.remove('active');
      return;
    }

    buscarYMostrarVehiculos(texto, dropdown, inputFinal);
  });

  document.addEventListener('click', function(e) {
    if (!inputFinal.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function buscarYMostrarVehiculos(texto, dropdown, input) {
  const textoLower = texto.toLowerCase();
  
  // Filtrar vehículos del visitante seleccionado si existe
  let vehiculosFiltrados = listaVehiculos;
  if (visitanteSeleccionado) {
    vehiculosFiltrados = listaVehiculos.filter(v => v.id_propietario === visitanteSeleccionado.id);
  }
  
  const resultados = vehiculosFiltrados.filter(v => {
    return (v.placa || '').toLowerCase().includes(textoLower) ||
           (v.marca || '').toLowerCase().includes(textoLower) ||
           (v.modelo || '').toLowerCase().includes(textoLower);
  });

  dropdown.innerHTML = '';
  
  if (resultados.length === 0) {
    dropdown.innerHTML = '<div class="sin-resultados">No se encontraron vehículos</div>';
    dropdown.classList.add('active');
    return;
  }

  resultados.slice(0, 20).forEach(vehiculo => {
    const item = document.createElement('div');
    item.className = 'sugerencia-item';
    
    const marcaModelo = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || 'Sin marca/modelo';
    
    item.innerHTML = `
      <span class="sugerencia-nombre">${vehiculo.placa}</span>
      <span class="sugerencia-datos">${vehiculo.tipo_vehiculo || 'N/A'} | ${marcaModelo}</span>
    `;
    
    item.onclick = function() {
      seleccionarVehiculo(vehiculo, input, dropdown);
    };
    
    dropdown.appendChild(item);
  });
  
  dropdown.classList.add('active');
}

function seleccionarVehiculo(vehiculo, input, dropdown) {
  vehiculoSeleccionado = {
    id: vehiculo.id,
    placa: vehiculo.placa,
    tipo_vehiculo: vehiculo.tipo_vehiculo,
    marca: vehiculo.marca || '',
    modelo: vehiculo.modelo || ''
  };

  input.value = vehiculo.placa;
  dropdown.classList.remove('active');

  document.getElementById('idVehiculoSeleccionado').value = vehiculo.id;
  document.getElementById('placaVehiculo').textContent = vehiculo.placa;
  document.getElementById('tipoVehiculo').textContent = vehiculo.tipo_vehiculo || 'N/A';
  
  const marcaModelo = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || 'N/A';
  document.getElementById('marcaModeloVehiculo').textContent = marcaModelo;
  
  document.getElementById('infoVehiculoSeleccionado').style.display = 'block';
}

// ============================================
// NUEVA VISITA - ABRIR MODAL
// ============================================

function nuevaVisita() {
  // Reset completo de variables
  visitanteSeleccionado = null;
  visitanteConfirmado = false;
  vehiculoSeleccionado = null;
  vehiculoConfirmado = false;
  opcionVehiculo = 'sin_vehiculo';
  
  // Reset formulario
  document.getElementById('formNueva').reset();
  document.getElementById('inputVisitante').value = '';
  document.getElementById('idVisitanteSeleccionado').value = '';
  document.getElementById('sugerenciasVisitante').classList.remove('active');
  document.getElementById('infoVisitanteSeleccionado').style.display = 'none';
  document.getElementById('btnConfirmarVisitante').disabled = true;
  
  // Reset indicadores de pasos
  document.getElementById('indicadorPaso1').classList.add('active');
  document.getElementById('indicadorPaso1').classList.remove('completed');
  document.getElementById('indicadorPaso2').classList.remove('active', 'completed');
  document.getElementById('indicadorPaso3').classList.remove('active', 'completed');
  
  // Habilitar sección 1
  const seccionVisitante = document.getElementById('seccionVisitante');
  seccionVisitante.classList.remove('bloqueada', 'guardada');
  const badgeVisitante = seccionVisitante.querySelector('.badge-guardado');
  if (badgeVisitante) badgeVisitante.remove();
  
  document.querySelectorAll('#seccionVisitante input, #seccionVisitante button').forEach(el => {
    el.disabled = false;
  });
  
  // Bloquear sección 2
  const seccionVehiculo = document.getElementById('seccionVehiculo');
  seccionVehiculo.classList.add('bloqueada');
  document.getElementById('mensajeBloqueoVehiculo').style.display = 'block';
  document.getElementById('formularioVehiculo').style.display = 'none';
  
  // Bloquear sección 3
  const seccionAutorizacion = document.getElementById('seccionAutorizacion');
  seccionAutorizacion.classList.add('bloqueada');
  document.getElementById('mensajeBloqueoAutorizacion').style.display = 'block';
  document.getElementById('formularioAutorizacion').style.display = 'none';
  
  // Reconfigurar autocomplete
  configurarAutocompleteVisitante();
  configurarAutocompleteVehiculo();
  
  // Abrir modal
  document.getElementById('modalNueva').style.display = 'block';
}

// ============================================
// PASO 1: CONFIRMAR VISITANTE
// ============================================

function confirmarVisitante() {
  if (!visitanteSeleccionado) {
    mostrarNotificacion('Debe seleccionar un visitante', 'error');
    return;
  }

  visitanteConfirmado = true;

  // Marcar paso 1 como completado
  document.getElementById('indicadorPaso1').classList.remove('active');
  document.getElementById('indicadorPaso1').classList.add('completed');
  document.getElementById('indicadorPaso2').classList.add('active');

  // Marcar sección como guardada
  const seccionVisitante = document.getElementById('seccionVisitante');
  seccionVisitante.classList.add('guardada');
  seccionVisitante.innerHTML += '<span class="badge-guardado">✓ Confirmado</span>';
  
  // Deshabilitar campos del paso 1
  document.querySelectorAll('#seccionVisitante input, #seccionVisitante button').forEach(el => {
    el.disabled = true;
  });

  // Habilitar sección 2 (vehículo)
  const seccionVehiculo = document.getElementById('seccionVehiculo');
  seccionVehiculo.classList.remove('bloqueada');
  document.getElementById('mensajeBloqueoVehiculo').style.display = 'none';
  document.getElementById('formularioVehiculo').style.display = 'block';
  
  document.getElementById('nombreVisitanteConfirmado').textContent = visitanteSeleccionado.nombre;
  document.getElementById('visitanteConfirmado').style.display = 'block';

  mostrarNotificacion('✓ Visitante confirmado. Ahora seleccione la opción de vehículo.', 'success');
}

// ============================================
// PASO 2: CAMBIAR OPCIÓN DE VEHÍCULO
// ============================================

function cambiarOpcionVehiculo() {
  const opcion = document.querySelector('input[name="opcionVehiculo"]:checked').value;
  opcionVehiculo = opcion;
  
  // Ocultar todas las subsecciones
  document.getElementById('contenedorVehiculoExistente').style.display = 'none';
  document.getElementById('contenedorVehiculoNuevo').style.display = 'none';
  
  // Resetear vehículo seleccionado
  vehiculoSeleccionado = null;
  document.getElementById('inputVehiculo').value = '';
  document.getElementById('infoVehiculoSeleccionado').style.display = 'none';
  
  // Mostrar subsección según opción
  if (opcion === 'existente') {
    document.getElementById('contenedorVehiculoExistente').style.display = 'block';
  } else if (opcion === 'nuevo') {
    document.getElementById('contenedorVehiculoNuevo').style.display = 'block';
  }
}

// ============================================
// PASO 2: CONFIRMAR VEHÍCULO
// ============================================

async function confirmarVehiculo() {
  // Si es sin vehículo, pasar directo
  if (opcionVehiculo === 'sin_vehiculo') {
    vehiculoConfirmado = true;
    vehiculoSeleccionado = null;
    avanzarPaso3();
    return;
  }
  
  // Si es vehículo existente, verificar selección
  if (opcionVehiculo === 'existente') {
    if (!vehiculoSeleccionado) {
      mostrarNotificacion('Debe seleccionar un vehículo de la lista', 'error');
      return;
    }
    vehiculoConfirmado = true;
    avanzarPaso3();
    return;
  }
  
  // Si es vehículo nuevo, validar y registrar
  if (opcionVehiculo === 'nuevo') {
    const placa = document.getElementById('nuevaPlaca').value.trim().toUpperCase().replace(/[-\s]/g, '');
    const tipoVehiculo = document.getElementById('nuevoTipoVehiculo').value;
    
    if (!placa || !tipoVehiculo) {
      mostrarNotificacion('Complete la placa y tipo de vehículo', 'error');
      return;
    }
    
    mostrarOverlay('Registrando vehículo...');
    
    try {
      // Verificar que la placa no exista activa
      const { data: existente, error: errorVerificar } = await supabase
        .from('vehiculo_seguridad')
        .select('id, placa')
        .eq('placa', placa)
        .eq('activo', true)
        .maybeSingle();

      if (errorVerificar) {
        console.error('Error al verificar placa:', errorVerificar);
      }

      if (existente) {
        ocultarOverlay();
        mostrarNotificacion(`❌ La placa ${placa} ya está registrada y activa en el sistema`, 'error');
        return;
      }

      // Registrar vehículo
      const marca = document.getElementById('nuevaMarca').value.trim();
      const modelo = document.getElementById('nuevoModelo').value.trim();
      const color = document.getElementById('nuevoColor').value.trim();

      const { data: nuevoVehiculo, error } = await supabase
        .from('vehiculo_seguridad')
        .insert([{
          id_propietario: visitanteSeleccionado.id,
          tipo_propietario: 'foraneo',
          tipo_vehiculo: tipoVehiculo,
          tipo_propiedad: 'PARTICULAR',
          placa: placa,
          marca: marca || null,
          modelo: modelo || null,
          color: color || null,
          estado: true,
          activo: true,
          temporal: false
        }])
        .select()
        .single();

      ocultarOverlay();

      if (error) throw error;

      // Guardar vehículo seleccionado
      vehiculoSeleccionado = {
        id: nuevoVehiculo.id,
        placa: nuevoVehiculo.placa,
        tipo_vehiculo: nuevoVehiculo.tipo_vehiculo,
        marca: nuevoVehiculo.marca,
        modelo: nuevoVehiculo.modelo
      };

      vehiculoConfirmado = true;
      
      // Recargar lista de vehículos
      await cargarVehiculos();
      
      mostrarNotificacion(`✓ Vehículo ${placa} registrado correctamente`, 'success');
      avanzarPaso3();

    } catch (error) {
      ocultarOverlay();
      console.error('Error:', error);
      mostrarNotificacion('Error al registrar vehículo: ' + error.message, 'error');
    }
  }
}

function avanzarPaso3() {
  // Marcar paso 2 como completado
  document.getElementById('indicadorPaso2').classList.remove('active');
  document.getElementById('indicadorPaso2').classList.add('completed');
  document.getElementById('indicadorPaso3').classList.add('active');

  // Marcar sección 2 como guardada
  const seccionVehiculo = document.getElementById('seccionVehiculo');
  seccionVehiculo.classList.add('guardada');
  seccionVehiculo.innerHTML += '<span class="badge-guardado">✓ Confirmado</span>';
  
  // Deshabilitar campos del paso 2
  document.querySelectorAll('#seccionVehiculo input, #seccionVehiculo select, #seccionVehiculo button').forEach(el => {
    el.disabled = true;
  });

  // Habilitar sección 3 (autorización)
  const seccionAutorizacion = document.getElementById('seccionAutorizacion');
  seccionAutorizacion.classList.remove('bloqueada');
  document.getElementById('mensajeBloqueoAutorizacion').style.display = 'none';
  document.getElementById('formularioAutorizacion').style.display = 'block';
  
  // Mostrar resumen
  document.getElementById('resumenVisitante').textContent = visitanteSeleccionado.nombre;
  document.getElementById('resumenVehiculo').textContent = vehiculoSeleccionado 
    ? `${vehiculoSeleccionado.placa} (${vehiculoSeleccionado.tipo_vehiculo})` 
    : 'Sin vehículo';
  document.getElementById('resumenConfirmado').style.display = 'block';
  
  // Establecer fecha mínima como hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fechaInicio').min = hoy;
  document.getElementById('fechaFin').min = hoy;
// Mostrar el nombre que se guardará
  const nombreOrigenMostrar = document.getElementById('nombreOrigenMostrar');
  if (nombreOrigenMostrar) {
    nombreOrigenMostrar.textContent = visitanteSeleccionado.nombre_origen || 'Sin origen';
  }

  mostrarNotificacion('✓ Paso 2 completado. Ahora complete los datos de la autorización.', 'success');
}

// ============================================
// MODAL: NUEVO FORÁNEO
// ============================================

function abrirModalNuevoForaneo() {
  // Reset formulario
  document.getElementById('formNuevoForaneo').reset();
  document.getElementById('contenedorUnidad').style.display = 'none';
  document.getElementById('contenedorEmpresa').style.display = 'none';
  
  // Abrir modal
  document.getElementById('modalNuevoForaneo').style.display = 'block';
}

function cerrarModalNuevoForaneo() {
  document.getElementById('modalNuevoForaneo').style.display = 'none';
}

function cambiarTipoOrigen() {
  const tipoOrigen = document.getElementById('nuevoForaneoTipoOrigen').value;
  
  document.getElementById('contenedorUnidad').style.display = 'none';
  document.getElementById('contenedorEmpresa').style.display = 'none';
  
  if (tipoOrigen === 'unidad') {
    document.getElementById('contenedorUnidad').style.display = 'block';
    document.getElementById('nuevoForaneoUnidad').required = true;
    document.getElementById('nuevoForaneoEmpresa').required = false;
  } else if (tipoOrigen === 'empresa') {
    document.getElementById('contenedorEmpresa').style.display = 'block';
    document.getElementById('nuevoForaneoEmpresa').required = true;
    document.getElementById('nuevoForaneoUnidad').required = false;
  }
}

async function guardarNuevoForaneo() {
  const nombre = document.getElementById('nuevoForaneoNombre').value.trim();
  const dni = document.getElementById('nuevoForaneoDni').value.trim();
  const nsa = document.getElementById('nuevoForaneoNsa').value.trim();
  const pasaporte = document.getElementById('nuevoForaneoPasaporte').value.trim();
  const tipoOrigen = document.getElementById('nuevoForaneoTipoOrigen').value;
  
  // Validaciones
  if (!nombre) {
    mostrarNotificacion('El nombre es obligatorio', 'error');
    return;
  }
  
  if (!dni && !nsa && !pasaporte) {
    mostrarNotificacion('Debe ingresar al menos: DNI, NSA o Pasaporte', 'error');
    return;
  }
  
  if (!tipoOrigen) {
    mostrarNotificacion('Debe seleccionar el tipo de origen', 'error');
    return;
  }
  
  let idOrigen = null;
  let nombreOrigen = '';
  
  if (tipoOrigen === 'unidad') {
    idOrigen = document.getElementById('nuevoForaneoUnidad').value;
    if (!idOrigen) {
      mostrarNotificacion('Debe seleccionar una unidad', 'error');
      return;
    }
    const unidadSeleccionada = listaUnidades.find(u => u.id === idOrigen);
    nombreOrigen = unidadSeleccionada ? unidadSeleccionada.nombre : '';
  } else if (tipoOrigen === 'empresa') {
    idOrigen = document.getElementById('nuevoForaneoEmpresa').value;
    if (!idOrigen) {
      mostrarNotificacion('Debe seleccionar una empresa', 'error');
      return;
    }
    const empresaSeleccionada = listaEmpresas.find(e => e.id === idOrigen);
    nombreOrigen = empresaSeleccionada ? empresaSeleccionada.nombre : '';
  }
  
  mostrarOverlay('Registrando persona...');
  
  try {
    // Verificar duplicados
    if (dni) {
      const { data: existeDni } = await supabase
        .from('personal_foraneo')
        .select('id, nombre')
        .eq('dni', dni)
        .maybeSingle();
      
      if (existeDni) {
        ocultarOverlay();
        mostrarNotificacion(`El DNI ${dni} ya está registrado para: ${existeDni.nombre}`, 'error');
        return;
      }
    }
    
    if (nsa) {
      const { data: existeNsa } = await supabase
        .from('personal_foraneo')
        .select('id, nombre')
        .eq('nsa', nsa)
        .maybeSingle();
      
      if (existeNsa) {
        ocultarOverlay();
        mostrarNotificacion(`El NSA ${nsa} ya está registrado para: ${existeNsa.nombre}`, 'error');
        return;
      }
    }
    
    if (pasaporte) {
      const { data: existePasaporte } = await supabase
        .from('personal_foraneo')
        .select('id, nombre')
        .eq('pasaporte', pasaporte)
        .maybeSingle();
      
      if (existePasaporte) {
        ocultarOverlay();
        mostrarNotificacion(`El Pasaporte ${pasaporte} ya está registrado para: ${existePasaporte.nombre}`, 'error');
        return;
      }
    }
    
    // Insertar nuevo foráneo
    const { data: nuevoForaneo, error } = await supabase
      .from('personal_foraneo')
      .insert([{
        nombre: nombre,
        dni: dni || null,
        nsa: nsa || null,
        pasaporte: pasaporte || null,
        tipo_origen: tipoOrigen,
        id_origen: idOrigen,
        activo: true
      }])
      .select()
      .single();
    
    ocultarOverlay();
    
    if (error) throw error;
    
    // Agregar nombre de origen al objeto
    nuevoForaneo.nombre_origen = nombreOrigen;
    
    // Actualizar lista local
    listaPersonalForaneo.push(nuevoForaneo);
    
    // Seleccionar automáticamente
    const input = document.getElementById('inputVisitante');
    const dropdown = document.getElementById('sugerenciasVisitante');
    seleccionarVisitante(nuevoForaneo, input, dropdown);
    
    cerrarModalNuevoForaneo();
    mostrarNotificacion(`✓ Persona registrada correctamente: ${nombre}`, 'success');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al registrar persona: ' + error.message, 'error');
  }
}

// ============================================
// MODAL: NUEVA UNIDAD
// ============================================

function abrirModalNuevaUnidad() {
  document.getElementById('formNuevaUnidad').reset();
  document.getElementById('modalNuevaUnidad').style.display = 'block';
}

function cerrarModalNuevaUnidad() {
  document.getElementById('modalNuevaUnidad').style.display = 'none';
}

async function guardarNuevaUnidad() {
  const nombre = document.getElementById('nuevaUnidadNombre').value.trim();
  
  if (!nombre) {
    mostrarNotificacion('El nombre de la unidad es obligatorio', 'error');
    return;
  }
  
  mostrarOverlay('Registrando unidad...');
  
  try {
    // Verificar si ya existe
    const { data: existente } = await supabase
      .from('unidad')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle();
    
    if (existente) {
      ocultarOverlay();
      mostrarNotificacion(`La unidad "${nombre}" ya está registrada`, 'warning');
      return;
    }
    
    // Insertar nueva unidad
    const { data: nuevaUnidad, error } = await supabase
      .from('unidad')
      .insert([{
        nombre: nombre,
        activo: true
      }])
      .select()
      .single();
    
    ocultarOverlay();
    
    if (error) throw error;
    
    // Actualizar lista local
    listaUnidades.push(nuevaUnidad);
    listaUnidades.sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    // Actualizar select
    actualizarSelectUnidades();
    
    // Seleccionar automáticamente
    document.getElementById('nuevoForaneoUnidad').value = nuevaUnidad.id;
    
    cerrarModalNuevaUnidad();
    mostrarNotificacion(`✓ Unidad registrada correctamente: ${nombre}`, 'success');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al registrar unidad: ' + error.message, 'error');
  }
}

// ============================================
// MODAL: NUEVA EMPRESA
// ============================================

function abrirModalNuevaEmpresa() {
  document.getElementById('formNuevaEmpresa').reset();
  document.getElementById('modalNuevaEmpresa').style.display = 'block';
}

function cerrarModalNuevaEmpresa() {
  document.getElementById('modalNuevaEmpresa').style.display = 'none';
}

async function guardarNuevaEmpresa() {
  const ruc = document.getElementById('nuevaEmpresaRuc').value.trim();
  const nombre = document.getElementById('nuevaEmpresaNombre').value.trim();
  
  if (!nombre) {
    mostrarNotificacion('El nombre de la empresa es obligatorio', 'error');
    return;
  }
  
  if (ruc && ruc.length !== 11) {
    mostrarNotificacion('El RUC debe tener 11 dígitos', 'error');
    return;
  }
  
  mostrarOverlay('Registrando empresa...');
  
  try {
    // Verificar si ya existe el RUC
    if (ruc) {
      const { data: existeRuc } = await supabase
        .from('empresa')
        .select('id, nombre')
        .eq('ruc', ruc)
        .maybeSingle();
      
      if (existeRuc) {
        ocultarOverlay();
        mostrarNotificacion(`El RUC ${ruc} ya está registrado para: ${existeRuc.nombre}`, 'error');
        return;
      }
    }
    
    // Insertar nueva empresa
    const { data: nuevaEmpresa, error } = await supabase
      .from('empresa')
      .insert([{
        ruc: ruc || null,
        nombre: nombre,
        activo: true
      }])
      .select()
      .single();
    
    ocultarOverlay();
    
    if (error) throw error;
    
    // Actualizar lista local
    listaEmpresas.push(nuevaEmpresa);
    listaEmpresas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    // Actualizar select
    actualizarSelectEmpresas();
    
    // Seleccionar automáticamente
    document.getElementById('nuevoForaneoEmpresa').value = nuevaEmpresa.id;
    
    cerrarModalNuevaEmpresa();
    mostrarNotificacion(`✓ Empresa registrada correctamente: ${nombre}`, 'success');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al registrar empresa: ' + error.message, 'error');
  }
}

// ============================================
// GUARDAR VISITA AUTORIZADA (CREATE)
// ============================================

async function guardarVisita() {
  if (!visitanteConfirmado) {
    mostrarNotificacion('Debe confirmar primero al visitante', 'error');
    return;
  }

  // El nombre debe ser el origen del visitante (empresa o unidad)
  const nombreOrigen = visitanteSeleccionado.nombre_origen || 'Sin origen';
  
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;
  const motivo = document.getElementById('motivoVisita').value.trim();
  const estado = document.getElementById('estadoVisita').checked;

  // Validaciones
  if (!fechaInicio || !fechaFin) {
    mostrarNotificacion('Complete las fechas de inicio y fin', 'error');
    return;
  }

  mostrarOverlay('Guardando visita autorizada...');

  try {
    // Insertar visita autorizada
      const { data, error } = await supabase
        .from('visitas_autorizadas')
        .insert([{
          id_visita: visitanteSeleccionado.id,
          id_vehiculo: vehiculoSeleccionado ? vehiculoSeleccionado.id : null,
          nombre: nombreOrigen,  // ✅ AHORA GUARDA EL NOMBRE DE LA EMPRESA/UNIDAD
          fec_inicio: fechaInicio,
          fec_fin: fechaFin,
          motivo: motivo || null,
          estado: estado
        }])
      .select();

    ocultarOverlay();

    if (error) throw error;

    mostrarNotificacion(`✓ Visita autorizada registrada correctamente`, 'success');
    cerrarModal();
    cargarVisitasAutorizadas();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al guardar visita: ' + error.message, 'error');
  }
}

// ============================================
// VER DETALLE DE VISITA (READ)
// ============================================

async function verDetalle(index) {
  const visita = datosFiltrados[index];
  
  mostrarOverlay('Cargando información...');
  
  try {
    // Obtener datos completos de la visita
    const { data: visitaCompleta, error } = await supabase
      .from('visitas_autorizadas')
      .select('*')
      .eq('id', visita.id)
      .single();

    if (error) throw error;

    // Obtener datos del visitante
    const { data: visitante, error: errorVisitante } = await supabase
      .from('personal_foraneo')
      .select('*')
      .eq('id', visitaCompleta.id_visita)
      .single();

    if (errorVisitante) throw errorVisitante;

    // Obtener nombre de origen
    let nombreOrigen = 'N/A';
    if (visitante.tipo_origen === 'unidad' && visitante.id_origen) {
      const { data: unidad } = await supabase
        .from('unidad')
        .select('nombre')
        .eq('id', visitante.id_origen)
        .single();
      nombreOrigen = unidad ? `🏢 ${unidad.nombre}` : 'Unidad desconocida';
    } else if (visitante.tipo_origen === 'empresa' && visitante.id_origen) {
      const { data: empresa } = await supabase
        .from('empresa')
        .select('nombre')
        .eq('id', visitante.id_origen)
        .single();
      nombreOrigen = empresa ? `🏭 ${empresa.nombre}` : 'Empresa desconocida';
    }

    // Obtener datos del vehículo si existe
    let vehiculo = null;
    if (visitaCompleta.id_vehiculo) {
      const { data: vehiculoData, error: errorVehiculo } = await supabase
        .from('vehiculo_seguridad')
        .select('*')
        .eq('id', visitaCompleta.id_vehiculo)
        .single();

      if (!errorVehiculo) vehiculo = vehiculoData;
    }

    ocultarOverlay();

    // Mostrar datos en el modal
    document.getElementById('verNombreVisitante').textContent = visitante.nombre;
    document.getElementById('verDniVisitante').textContent = visitante.dni || 'N/A';
    document.getElementById('verNsaVisitante').textContent = visitante.nsa || 'N/A';
    document.getElementById('verPasaporteVisitante').textContent = visitante.pasaporte || 'N/A';
    document.getElementById('verOrigenVisitante').textContent = nombreOrigen;

    if (vehiculo) {
      document.getElementById('verPlacaVehiculo').textContent = vehiculo.placa;
      document.getElementById('verTipoVehiculoDetalle').textContent = vehiculo.tipo_vehiculo || 'N/A';
      
      const marcaModelo = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || 'N/A';
      document.getElementById('verMarcaModeloDetalle').textContent = marcaModelo;
      document.getElementById('verColorVehiculo').textContent = vehiculo.color || 'N/A';
    } else {
      document.getElementById('verPlacaVehiculo').textContent = 'Sin vehículo';
      document.getElementById('verTipoVehiculoDetalle').textContent = '-';
      document.getElementById('verMarcaModeloDetalle').textContent = '-';
      document.getElementById('verColorVehiculo').textContent = '-';
    }

    document.getElementById('verNombreAutorizacion').textContent = visitaCompleta.nombre;
    document.getElementById('verFechaInicio').textContent = formatearFecha(visitaCompleta.fec_inicio);
    document.getElementById('verFechaFin').textContent = formatearFecha(visitaCompleta.fec_fin);
    document.getElementById('verEstadoVisita').textContent = visitaCompleta.estado ? 'Activa' : 'Inactiva';
    document.getElementById('verMotivoVisita').textContent = visitaCompleta.motivo || 'No especificado';

    document.getElementById('modalVerDetalle').style.display = 'block';

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar información: ' + error.message, 'error');
  }
}

// ============================================
// EDITAR VISITA (UPDATE) - IMPLEMENTACIÓN COMPLETA
// ============================================
async function editarVisita(index) {
  const visita = datosFiltrados[index];
  
  mostrarOverlay('Cargando datos para editar...');
  
  try {
    const { data, error } = await supabase
      .from('visitas_autorizadas')
      .select('*')
      .eq('id', visita.id)
      .single();

    if (error) throw error;

    const { data: visitante, error: errorVisitante } = await supabase
      .from('personal_foraneo')
      .select('*')
      .eq('id', data.id_visita)
      .single();

    if (errorVisitante) throw errorVisitante;

    let nombreOrigen = 'N/A';
    if (visitante.tipo_origen === 'unidad' && visitante.id_origen) {
      const { data: unidad } = await supabase
        .from('unidad')
        .select('nombre')
        .eq('id', visitante.id_origen)
        .single();
      nombreOrigen = unidad ? unidad.nombre : 'Unidad desconocida';
    } else if (visitante.tipo_origen === 'empresa' && visitante.id_origen) {
      const { data: empresa } = await supabase
        .from('empresa')
        .select('nombre')
        .eq('id', visitante.id_origen)
        .single();
      nombreOrigen = empresa ? empresa.nombre : 'Empresa desconocida';
    }

    let textoVehiculo = 'Sin vehículo';
    if (data.id_vehiculo) {
      const { data: vehiculo } = await supabase
        .from('vehiculo_seguridad')
        .select('placa, tipo_vehiculo')
        .eq('id', data.id_vehiculo)
        .single();
      
      if (vehiculo) {
        textoVehiculo = `${vehiculo.placa} (${vehiculo.tipo_vehiculo})`;
      }
    }

    ocultarOverlay();

    document.getElementById('editIdVisita').value = data.id;
    document.getElementById('editNombreVisitante').textContent = visitante.nombre;
    document.getElementById('editDniVisitante').textContent = visitante.dni || 'N/A';
    document.getElementById('editNsaVisitante').textContent = visitante.nsa || 'N/A';
    document.getElementById('editPasaporteVisitante').textContent = visitante.pasaporte || 'N/A';
    document.getElementById('editOrigenVisitante').textContent = nombreOrigen;
    document.getElementById('editVehiculoVisitante').textContent = textoVehiculo;

    // Mostrar el nombre de origen (no es editable, solo informativo)
    document.getElementById('editNombreOrigen').textContent = nombreOrigen;
    document.getElementById('editFechaInicio').value = data.fec_inicio;
    document.getElementById('editFechaFin').value = data.fec_fin;
    document.getElementById('editMotivoVisita').value = data.motivo || '';
    document.getElementById('editEstadoVisita').checked = data.estado;

    document.getElementById('modalEditar').style.display = 'block';

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar datos: ' + error.message, 'error');
  }
}
function cerrarModalEditar() {
  document.getElementById('modalEditar').style.display = 'none';
}
async function actualizarVisita() {
  const idVisita = document.getElementById('editIdVisita').value;
  // El nombre NO se edita, se mantiene del origen original
  const fechaInicio = document.getElementById('editFechaInicio').value;
  const fechaFin = document.getElementById('editFechaFin').value;
  const motivo = document.getElementById('editMotivoVisita').value.trim();
  const estado = document.getElementById('editEstadoVisita').checked;

  // Validaciones
  if (!fechaInicio || !fechaFin) {
    mostrarNotificacion('Complete todos los campos obligatorios', 'error');
    return;
  }

  // Validar que fecha fin >= fecha inicio
  if (fechaFin < fechaInicio) {
    mostrarNotificacion('La fecha de fin debe ser igual o posterior a la fecha de inicio', 'error');
    return;
  }

  mostrarOverlay('Actualizando visita...');

  try {
    const { error } = await supabase
          .from('visitas_autorizadas')
          .update({
            fec_inicio: fechaInicio,
            fec_fin: fechaFin,
            motivo: motivo || null,
            estado: estado
          })
      .eq('id', idVisita);

    ocultarOverlay();

    if (error) throw error;

    mostrarNotificacion('✓ Visita actualizada correctamente', 'success');
    cerrarModalEditar();
    cargarVisitasAutorizadas();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al actualizar: ' + error.message, 'error');
  }
}
// ============================================
// ELIMINAR VISITA (DELETE LÓGICO)
// ============================================

async function eliminarVisita(index) {
  const visita = datosFiltrados[index];
  
  const confirmar = await mostrarConfirmacion(
    `¿Está seguro de eliminar la visita autorizada de <strong>${visita.nombreVisitante}</strong>?<br><br>
    📅 Período: ${formatearFecha(visita.fec_inicio)} - ${formatearFecha(visita.fec_fin)}<br><br>
    ℹ️ Esta acción marcará la visita como inactiva. La persona podrá ser autorizada nuevamente en el futuro.`,
    '🗑️ Confirmar Eliminación'
  );

  if (!confirmar) return;

  mostrarOverlay('Eliminando visita...');

  try {
    // Eliminación LÓGICA (estado = false)
    const { error } = await supabase
      .from('visitas_autorizadas')
      .update({ estado: false })
      .eq('id', visita.id);

    ocultarOverlay();

    if (error) throw error;

    mostrarNotificacion('✓ Visita eliminada correctamente. La persona puede ser autorizada nuevamente.', 'success');
    cargarVisitasAutorizadas();

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

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
  const modalNueva = document.getElementById('modalNueva');
  const modalVerDetalle = document.getElementById('modalVerDetalle');
  const modalNuevoForaneo = document.getElementById('modalNuevoForaneo');
  const modalNuevaUnidad = document.getElementById('modalNuevaUnidad');
  const modalNuevaEmpresa = document.getElementById('modalNuevaEmpresa');
  const modalEditar = document.getElementById('modalEditar');
  
  if (event.target === modalNueva) cerrarModal();
  if (event.target === modalVerDetalle) cerrarModalVerDetalle();
  if (event.target === modalNuevoForaneo) cerrarModalNuevoForaneo();
  if (event.target === modalNuevaUnidad) cerrarModalNuevaUnidad();
  if (event.target === modalNuevaEmpresa) cerrarModalNuevaEmpresa();
  if (event.target === modalEditar) cerrarModalEditar();
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
  
  .info-propietario-readonly {
    padding: 15px;
    background-color: #e7f3ff;
    border-radius: 4px;
    border-left: 4px solid #0056A6;
  }
  
  .info-propietario-readonly p {
    margin: 8px 0;
    color: #333;
    font-size: 0.95rem;
  }
`;
document.head.appendChild(style);
