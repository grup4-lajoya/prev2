// ============================================
// ADMIN-RESULTADOS.JS
// Gestión de Resultados — Olimpiadas ALAR3
// ============================================

// Configuración Supabase
const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let partidos = [];
let partidosFiltrados = [];
let filtroActual = 'todos';
let resolverConfirmacion = null;

// Sesión
const usuario = localStorage.getItem('usuario') || '';
const rol     = localStorage.getItem('rol') || '';

if (!usuario) {
  alert('⚠️ Sesión inválida. Por favor inicie sesión.');
  window.location.replace('login.html');
}

// Colores por unidad
const COLORES_UNIDAD = {
  'ALAR3':      '#003087',
  'GRUP4':      '#e8650a',
  'GRUP2':      '#f0b800',
  'HORES/ESCOM':'#888888'
};

// Iconos y labels por disciplina
const INFO_DISCIPLINA = {
  fulbito:  { icono: '⚽', label: 'Fulbito',  badge: 'badge-fulbito',  tipo: 'simple' },
  basquet:  { icono: '🏀', label: 'Básquet',  badge: 'badge-basquet',  tipo: 'simple' },
  voley:    { icono: '🏐', label: 'Vóley',    badge: 'badge-voley',    tipo: 'sets'   },
  fronton:  { icono: '🎾', label: 'Frontón',  badge: 'badge-fronton',  tipo: 'sets'   },
  ciclismo: { icono: '🚴', label: 'Ciclismo', badge: 'badge-ciclismo', tipo: 'ranking'}
};

// Labels de categoría
const LABEL_CATEGORIA = {
  master:  'Master',
  libre:   'Libre',
  damas:   'Damas',
  mixto:   'Mixto',
  singles: 'Singles',
  dobles:  'Dobles'
};

// ============================================
// INICIALIZACIÓN
// ============================================

window.onload = function() {
  document.getElementById('headerUsuario').textContent = usuario;
  iniciarSets();
  cargarTodo();
  // Polling cada 30 segundos
  setInterval(cargarTodo, 30000);
};

async function cargarTodo() {
  await Promise.all([
    cargarPartidos(),
    cargarPosiciones()
  ]);
}

// ============================================
// CARGAR PARTIDOS
// ============================================

async function cargarPartidos() {
  try {
    const { data, error } = await supabase
      .from('olimpiadas_partidos')
      .select('*')
      .order('hora_programada', { ascending: true });

    if (error) throw error;

    partidos = data;
    aplicarFiltro();

    document.getElementById('loading-partidos').style.display = 'none';
    document.getElementById('tabla-partidos').style.display = 'table';

  } catch (error) {
    console.error('Error al cargar partidos:', error);
    document.getElementById('loading-partidos').innerHTML =
      `❌ Error al cargar: ${error.message}
       <br><button onclick="cargarPartidos()"
       style="margin-top:10px;padding:8px 16px;cursor:pointer;">
       Reintentar</button>`;
  }
}

// ============================================
// CARGAR POSICIONES
// ============================================

async function cargarPosiciones() {
  try {
    const { data, error } = await supabase
      .from('olimpiadas_posiciones')
      .select('*')
      .order('puntos_total', { ascending: false });

    if (error) throw error;

    renderPosiciones(data);

  } catch (error) {
    console.error('Error al cargar posiciones:', error);
  }
}

function renderPosiciones(data) {
  const tbody = document.getElementById('cuerpo-posiciones');

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3"
      style="text-align:center;padding:20px;color:#aaa;">
      Sin datos aún</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((row, i) => `
    <tr>
      <td><span class="pos-numero">${i + 1}</span></td>
      <td>
        <span class="unidad-dot"
              style="background:${COLORES_UNIDAD[row.unidad] || '#888'}"></span>
        <strong>${row.unidad}</strong>
      </td>
      <td>
        <span class="pos-puntos"
              style="color:${COLORES_UNIDAD[row.unidad] || '#003087'}">
          ${row.puntos_total} pts
        </span>
      </td>
    </tr>
  `).join('');

  document.getElementById('posiciones-actualizado').textContent =
    'Actualizado ' + new Date().toLocaleTimeString('es-PE',
      { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// FILTROS
// ============================================

function filtrar(disciplina, btn) {
  filtroActual = disciplina;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  aplicarFiltro();
}

function aplicarFiltro() {
  partidosFiltrados = filtroActual === 'todos'
    ? partidos
    : partidos.filter(p => p.disciplina === filtroActual);

  document.getElementById('info-registros').textContent =
    `${partidosFiltrados.length} partido${partidosFiltrados.length !== 1 ? 's' : ''}`;

  renderPartidos();
}

// ============================================
// RENDER TABLA DE PARTIDOS
// ============================================

function renderPartidos() {
  const tbody = document.getElementById('cuerpo-partidos');

  if (partidosFiltrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"
      style="text-align:center;padding:30px;color:#aaa;">
      No hay partidos para mostrar</td></tr>`;
    return;
  }

  tbody.innerHTML = partidosFiltrados.map(p => {
    const info      = INFO_DISCIPLINA[p.disciplina] || { icono:'🏅', label: p.disciplina, badge:'badge-otro', tipo:'simple' };
    const categoria = LABEL_CATEGORIA[p.categoria] || p.categoria;
    const hora      = p.hora_programada ? p.hora_programada.substring(0, 5) : '—';
    const esCiclismo = p.disciplina === 'ciclismo';

    return `
      <tr>
        <td data-label="Hora">
          <strong>${hora}</strong>
        </td>
        <td data-label="Disciplina">
          <span class="badge-disciplina ${info.badge}">
            ${info.icono} ${info.label}
          </span>
          <div style="font-size:11px;color:#888;margin-top:3px;">
            ${categoria}
          </div>
        </td>
        <td data-label="Encuentro">
          ${esCiclismo
            ? '<span style="font-size:13px;color:#666;">Todos los equipos</span>'
            : `<strong>${p.equipo_a}</strong>
               <span style="color:#aaa;margin:0 6px;">vs</span>
               <strong>${p.equipo_b}</strong>`
          }
        </td>
        <td data-label="Marcador">
          ${renderMarcador(p)}
        </td>
        <td data-label="Estado">
          ${renderEstado(p.estado)}
        </td>
        <td data-label="Acciones">
          <div class="acciones">
            ${renderBotonesAccion(p)}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// RENDER MARCADOR
// ============================================

function renderMarcador(p) {
  const info = INFO_DISCIPLINA[p.disciplina];

  if (p.estado === 'pendiente') {
    return '<span class="marcador-pendiente">Por jugar</span>';
  }

  if (p.disciplina === 'ciclismo') {
    const total = p.puntos_a || 0;
    return `<span style="font-size:12px;color:#666;">
              ${total > 0 ? total + ' participantes' : 'Sin registros'}
            </span>`;
  }

  if (info && (info.tipo === 'sets')) {
    // Vóley y Frontón — mostrar sets ganados
    const sa = p.sets_a ?? '—';
    const sb = p.sets_b ?? '—';
    return `
      <div class="marcador">
        <span class="marcador-equipo"
              style="font-size:11px;">${p.equipo_a}</span>
        <span class="marcador-score ${p.estado}">
          ${sa} — ${sb}
        </span>
        <span class="marcador-equipo"
              style="font-size:11px;">${p.equipo_b}</span>
      </div>`;
  }

  // Fulbito y Básquet — marcador directo
  const pa = p.puntos_a ?? '—';
  const pb = p.puntos_b ?? '—';
  return `
    <div class="marcador">
      <span class="marcador-equipo"
            style="font-size:11px;">${p.equipo_a}</span>
      <span class="marcador-score ${p.estado}">
        ${pa} — ${pb}
      </span>
      <span class="marcador-equipo"
            style="font-size:11px;">${p.equipo_b}</span>
    </div>`;
}

// ============================================
// RENDER ESTADO
// ============================================

function renderEstado(estado) {
  const cfg = {
    pendiente:  { clase: 'estado-pendiente',  texto: '⏳ Pendiente'  },
    en_curso:   { clase: 'estado-en-curso',   texto: '🟢 En curso'   },
    finalizado: { clase: 'estado-finalizado', texto: '✅ Finalizado' }
  };
  const c = cfg[estado] || cfg.pendiente;
  return `<span class="badge-estado ${c.clase}">${c.texto}</span>`;
}

// ============================================
// RENDER BOTONES DE ACCIÓN
// ============================================

function renderBotonesAccion(p) {
  const info = INFO_DISCIPLINA[p.disciplina];
  const finalizado = p.estado === 'finalizado';

  if (p.disciplina === 'ciclismo') {
    return `
      <button class="btn-icono btn-registrar"
              onclick="abrirModalRanking(${p.id})"
              title="${finalizado ? 'Editar ranking' : 'Registrar ranking'}"
              ${finalizado ? '' : ''}>
        ${finalizado ? '✏️' : '🚴'}
      </button>`;
  }

  return `
    <button class="btn-icono btn-registrar"
            onclick="abrirModalSimple(${p.id})"
            title="${finalizado ? 'Editar resultado' : 'Registrar resultado'}">
      ${finalizado ? '✏️' : '📝'}
    </button>`;
}

// ============================================
// MODAL SIMPLE — ABRIR
// (Fulbito, Básquet, Vóley, Frontón)
// ============================================

function abrirModalSimple(id) {
  const p = partidos.find(x => x.id === id);
  if (!p) return;

  const info = INFO_DISCIPLINA[p.disciplina];

  // Título
  document.getElementById('modal-simple-titulo').textContent =
    `${info.icono} ${info.label} — ${LABEL_CATEGORIA[p.categoria] || p.categoria}`;

  // Equipos
  document.getElementById('simple-equipo-a').textContent = p.equipo_a;
  document.getElementById('simple-equipo-b').textContent = p.equipo_b;
  document.getElementById('simple-partido-id').value = id;
  document.getElementById('simple-tipo').value = info.tipo;

  // Ocultar todas las secciones
  document.getElementById('seccion-marcador').style.display     = 'none';
  document.getElementById('seccion-sets-voley').style.display   = 'none';
  document.getElementById('seccion-sets-fronton').style.display = 'none';

  if (info.tipo === 'simple') {
    // Fulbito / Básquet
    document.getElementById('seccion-marcador').style.display = 'block';
    const labelGol = p.disciplina === 'basquet' ? 'Puntos' : 'Goles';
    document.getElementById('label-puntos-a').innerHTML =
      `${labelGol} — <span id="simple-label-a">${p.equipo_a}</span>`;
    document.getElementById('label-puntos-b').innerHTML =
      `${labelGol} — <span id="simple-label-b">${p.equipo_b}</span>`;
    document.getElementById('simple-puntos-a').value = p.puntos_a ?? '';
    document.getElementById('simple-puntos-b').value = p.puntos_b ?? '';

  } else if (info.tipo === 'sets' && p.disciplina === 'voley') {
    document.getElementById('seccion-sets-voley').style.display = 'block';
    cargarSetsEnModal(p, 'voley');

  } else if (info.tipo === 'sets' && p.disciplina === 'fronton') {
    document.getElementById('seccion-sets-fronton').style.display = 'block';
    cargarSetsEnModal(p, 'fronton');
  }

  // Estado
  document.getElementById('simple-estado').value = p.estado === 'pendiente'
    ? 'en_curso' : p.estado;

  document.getElementById('modal-simple').classList.add('abierto');
}

function cargarSetsEnModal(p, tipo) {
  const prefijo = tipo === 'voley' ? '' : 'f';
  const sets = p.detalle_sets || [];

  for (let i = 1; i <= 3; i++) {
    const set = sets.find(s => s.set === i);
    const inputA = document.getElementById(`${prefijo}set${i}-a`);
    const inputB = document.getElementById(`${prefijo}set${i}-b`);
    if (inputA) inputA.value = set ? set.local  : '';
    if (inputB) inputB.value = set ? set.visita : '';
  }

  // Mostrar/ocultar set 3
  const filaSet3 = document.getElementById(`fila-${prefijo}set3`);
  if (filaSet3) {
    const haySet3 = sets.some(s => s.set === 3);
    filaSet3.style.display = haySet3 ? 'grid' : 'none';
  }
}

function cerrarModalSimple() {
  document.getElementById('modal-simple').classList.remove('abierto');
}

// ============================================
// SETS — LÓGICA AUTOMÁTICA
// ============================================

function iniciarSets() {
  // Vóley — mostrar set 3 si hay empate 1-1
  ['set1-a','set1-b','set2-a','set2-b'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', verificarSet3Voley);
  });

  // Frontón — mostrar set 3 si hay empate 1-1
  ['fset1-a','fset1-b','fset2-a','fset2-b'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', verificarSet3Fronton);
  });
}

function verificarSet3Voley() {
  const s1a = parseInt(document.getElementById('set1-a').value) || 0;
  const s1b = parseInt(document.getElementById('set1-b').value) || 0;
  const s2a = parseInt(document.getElementById('set2-a').value) || 0;
  const s2b = parseInt(document.getElementById('set2-b').value) || 0;

  const ganoSet1A = s1a > s1b;
  const ganoSet2A = s2a > s2b;
  const hayEmpate = ganoSet1A !== ganoSet2A;

  document.getElementById('fila-set3').style.display =
    hayEmpate ? 'grid' : 'none';
}

function verificarSet3Fronton() {
  const s1a = parseInt(document.getElementById('fset1-a').value) || 0;
  const s1b = parseInt(document.getElementById('fset1-b').value) || 0;
  const s2a = parseInt(document.getElementById('fset2-a').value) || 0;
  const s2b = parseInt(document.getElementById('fset2-b').value) || 0;

  const ganoSet1A = s1a > s1b;
  const ganoSet2A = s2a > s2b;
  const hayEmpate = ganoSet1A !== ganoSet2A;

  document.getElementById('fila-fset3').style.display =
    hayEmpate ? 'grid' : 'none';
}

// ============================================
// GUARDAR RESULTADO SIMPLE
// ============================================

async function guardarResultadoSimple() {
  const id     = parseInt(document.getElementById('simple-partido-id').value);
  const tipo   = document.getElementById('simple-tipo').value;
  const estado = document.getElementById('simple-estado').value;
  const p      = partidos.find(x => x.id === id);
  if (!p) return;

  let datosUpdate = { estado };
  let setsA = 0, setsB = 0;
  let detalleSets = [];

  if (tipo === 'simple') {
    const pa = parseInt(document.getElementById('simple-puntos-a').value);
    const pb = parseInt(document.getElementById('simple-puntos-b').value);

    if (isNaN(pa) || isNaN(pb)) {
      mostrarNotificacion('Ingresa el marcador completo', 'error');
      return;
    }

    datosUpdate.puntos_a = pa;
    datosUpdate.puntos_b = pb;

  } else if (tipo === 'sets') {
    const prefijo = p.disciplina === 'voley' ? '' : 'f';

    for (let i = 1; i <= 3; i++) {
      const inputA = document.getElementById(`${prefijo}set${i}-a`);
      const inputB = document.getElementById(`${prefijo}set${i}-b`);
      if (!inputA || !inputB) continue;

      const va = inputA.value.trim();
      const vb = inputB.value.trim();
      if (va === '' && vb === '') continue;

      const sa = parseInt(va) || 0;
      const sb = parseInt(vb) || 0;

      detalleSets.push({ set: i, local: sa, visita: sb });
      if (sa > sb) setsA++;
      else if (sb > sa) setsB++;
    }

    if (detalleSets.length === 0) {
      mostrarNotificacion('Ingresa al menos el resultado del Set 1', 'error');
      return;
    }

    datosUpdate.sets_a       = setsA;
    datosUpdate.sets_b       = setsB;
    datosUpdate.detalle_sets = detalleSets;

    // Para vóley y frontón, puntos_a/b = sets ganados
    datosUpdate.puntos_a = setsA;
    datosUpdate.puntos_b = setsB;
  }

  mostrarOverlay('Guardando resultado...');

  try {
    const { error } = await supabase
      .from('olimpiadas_partidos')
      .update(datosUpdate)
      .eq('id', id);

    if (error) throw error;

    // Actualizar posiciones si el partido está finalizado
    if (estado === 'finalizado') {
      await actualizarPosiciones(p, datosUpdate);
    }

    ocultarOverlay();
    cerrarModalSimple();
    mostrarNotificacion('✅ Resultado guardado correctamente', 'success');
    await cargarTodo();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
  }
}

// ============================================
// MODAL RANKING — ABRIR (Ciclismo)
// ============================================

function abrirModalRanking(id) {
  const p = partidos.find(x => x.id === id);
  if (!p) return;

  document.getElementById('ranking-partido-id').value = id;
  document.getElementById('ranking-estado').value =
    p.estado === 'pendiente' ? 'en_curso' : p.estado;

  // Generar filas del ranking (20 participantes = 5 por unidad * 4 unidades)
  generarFilasRanking(p);

  document.getElementById('modal-ranking').classList.add('abierto');
}

async function generarFilasRanking(p) {
  // Cargar ranking existente si hay
  const { data: existente } = await supabase
    .from('olimpiadas_ranking')
    .select('*')
    .eq('disciplina', 'ciclismo')
    .order('puesto', { ascending: true });

  const container = document.getElementById('ranking-rows');
  const unidades  = ['ALAR3', 'GRUP4', 'GRUP2', 'HORES/ESCOM'];

  let html = '';
  for (let i = 1; i <= 20; i++) {
    const reg = existente ? existente.find(r => r.puesto === i) : null;
    const medallon = i === 1 ? '🥇' : i === 2 ? '🥈' : i === 3 ? '🥉' : i;

    html += `
      <div class="ranking-row">
        <span class="ranking-puesto">${medallon}</span>
        <div class="ranking-nombre">
          <input type="text"
                 id="rank-nombre-${i}"
                 placeholder="Nombre participante"
                 value="${reg ? reg.participante : ''}">
        </div>
        <div class="ranking-unidad">
          <select id="rank-unidad-${i}">
            <option value="">Unidad</option>
            ${unidades.map(u =>
              `<option value="${u}" ${reg && reg.unidad === u ? 'selected' : ''}>${u}</option>`
            ).join('')}
          </select>
        </div>
      </div>`;
  }

  container.innerHTML = html;
}

function cerrarModalRanking() {
  document.getElementById('modal-ranking').classList.remove('abierto');
}

// ============================================
// GUARDAR RANKING (Ciclismo)
// ============================================

async function guardarRanking() {
  const id     = parseInt(document.getElementById('ranking-partido-id').value);
  const estado = document.getElementById('ranking-estado').value;

  // Recopilar participantes ingresados
  const registros = [];
  for (let i = 1; i <= 20; i++) {
    const nombre = document.getElementById(`rank-nombre-${i}`)?.value.trim();
    const unidad = document.getElementById(`rank-unidad-${i}`)?.value;
    if (nombre && unidad) {
      registros.push({ disciplina: 'ciclismo', unidad, participante: nombre, puesto: i });
    }
  }

  if (registros.length === 0) {
    mostrarNotificacion('Ingresa al menos un participante', 'error');
    return;
  }

  mostrarOverlay('Guardando ranking...');

  try {
    // Eliminar registros anteriores de ciclismo
    await supabase
      .from('olimpiadas_ranking')
      .delete()
      .eq('disciplina', 'ciclismo');

    // Insertar nuevos
    const { error: errorInsert } = await supabase
      .from('olimpiadas_ranking')
      .insert(registros);

    if (errorInsert) throw errorInsert;

    // Actualizar estado del partido
    const { error: errorUpdate } = await supabase
      .from('olimpiadas_partidos')
      .update({ estado })
      .eq('id', id);

    if (errorUpdate) throw errorUpdate;

    // Actualizar posiciones si finalizado
    if (estado === 'finalizado') {
      await actualizarPosicionesCiclismo(registros);
    }

    ocultarOverlay();
    cerrarModalRanking();
    mostrarNotificacion('✅ Ranking guardado correctamente', 'success');
    await cargarTodo();

  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al guardar: ' + error.message, 'error');
  }
}

// ============================================
// ACTUALIZAR POSICIONES
// ============================================

async function actualizarPosiciones(partido, resultado) {
  try {
    // Obtener todos los partidos finalizados
    const { data: finalizados } = await supabase
      .from('olimpiadas_partidos')
      .select('*')
      .eq('estado', 'finalizado');

    if (!finalizados) return;

    // Calcular puntos por unidad
    const puntos = {
      'ALAR3': 0, 'GRUP4': 0, 'GRUP2': 0, 'HORES/ESCOM': 0
    };

    finalizados.forEach(p => {
      if (p.disciplina === 'ciclismo') return;

      const info = INFO_DISCIPLINA[p.disciplina];
      if (!info) return;

      const pa = p.puntos_a ?? 0;
      const pb = p.puntos_b ?? 0;

      if (info.tipo === 'simple') {
        // Fulbito: ganado=3, empate=1, perdido=0
        // Básquet: ganado=3, perdido=0 (sin empate)
        if (p.disciplina === 'fulbito') {
          if (pa > pb) { puntos[p.equipo_a] += 3; }
          else if (pb > pa) { puntos[p.equipo_b] += 3; }
          else { puntos[p.equipo_a] += 1; puntos[p.equipo_b] += 1; }
        } else if (p.disciplina === 'basquet') {
          if (pa > pb) { puntos[p.equipo_a] += 3; }
          else if (pb > pa) { puntos[p.equipo_b] += 3; }
        }
      } else if (info.tipo === 'sets') {
        // Vóley y Frontón: ganado=2, perdido=0
        const sa = p.sets_a ?? 0;
        const sb = p.sets_b ?? 0;
        if (sa > sb) { puntos[p.equipo_a] += 2; }
        else if (sb > sa) { puntos[p.equipo_b] += 2; }
      }
    });

    // Sumar puntos de ciclismo
    const { data: rankingCiclismo } = await supabase
      .from('olimpiadas_ranking')
      .select('*')
      .eq('disciplina', 'ciclismo');

    if (rankingCiclismo) {
      const puntajeIndividual = { 1: 4, 2: 3, 3: 2, 4: 1 };
      rankingCiclismo.forEach(r => {
        const pts = puntajeIndividual[r.puesto] || 0;
        if (puntos[r.unidad] !== undefined) puntos[r.unidad] += pts;
      });
    }

    // Actualizar tabla de posiciones
    for (const [unidad, total] of Object.entries(puntos)) {
      await supabase
        .from('olimpiadas_posiciones')
        .update({ puntos_total: total, updated_at: new Date().toISOString() })
        .eq('unidad', unidad);
    }

  } catch (error) {
    console.error('Error al actualizar posiciones:', error);
  }
}

async function actualizarPosicionesCiclismo(registros) {
  try {
    const puntajeIndividual = { 1: 4, 2: 3, 3: 2, 4: 1 };
    const puntosPorUnidad   = {};

    registros.forEach(r => {
      if (!puntosPorUnidad[r.unidad]) puntosPorUnidad[r.unidad] = 0;
      puntosPorUnidad[r.unidad] += puntajeIndividual[r.puesto] || 0;
    });

    // Obtener posiciones actuales
    const { data: posActuales } = await supabase
      .from('olimpiadas_posiciones')
      .select('*');

    if (!posActuales) return;

    for (const pos of posActuales) {
      const ptsExtra = puntosPorUnidad[pos.unidad] || 0;
      if (ptsExtra > 0) {
        await supabase
          .from('olimpiadas_posiciones')
          .update({
            puntos_total: pos.puntos_total + ptsExtra,
            updated_at: new Date().toISOString()
          })
          .eq('unidad', pos.unidad);
      }
    }

  } catch (error) {
    console.error('Error al actualizar posiciones ciclismo:', error);
  }
}

// ============================================
// OVERLAY
// ============================================

function mostrarOverlay(mensaje) {
  document.getElementById('mensajeCarga').textContent = mensaje;
  document.getElementById('overlayGlobal').style.display = 'flex';
}

function ocultarOverlay() {
  document.getElementById('overlayGlobal').style.display = 'none';
}

// ============================================
// NOTIFICACIONES
// ============================================

function mostrarNotificacion(mensaje, tipo = 'info') {
  const anterior = document.querySelector('.notificacion-custom');
  if (anterior) anterior.remove();

  const colores = {
    error:   { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
    success: { bg: '#d4edda', border: '#28a745', text: '#155724' },
    warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
    info:    { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460' }
  };

  const color = colores[tipo] || colores.info;
  const el    = document.createElement('div');
  el.className = 'notificacion-custom';
  el.style.cssText = `
    position: fixed;
    top: 20px; right: 20px;
    background: ${color.bg};
    color: ${color.text};
    border: 2px solid ${color.border};
    border-radius: 8px;
    padding: 14px 18px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 360px;
    font-size: 14px;
    line-height: 1.5;
    animation: slideIn 0.3s ease-out;
  `;
  el.textContent = mensaje;
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// ============================================
// CONFIRMACIÓN
// ============================================

function mostrarConfirmacion(mensaje, titulo = '⚠️ Confirmar') {
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

// Cerrar modales al tocar fuera
window.onclick = function(e) {
  if (e.target === document.getElementById('modal-simple'))
    cerrarModalSimple();
  if (e.target === document.getElementById('modal-ranking'))
    cerrarModalRanking();
};
