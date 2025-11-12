// ============================================
// CONTROL-RANCHO.JS - GESTIÓN DE CONTROL DE RANCHO
// ============================================

// Configuración de Supabase
const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let datosCompletos = [];
let datosAgrupados = {};
let charts = {};

// Usuario actual
const usuario = localStorage.getItem("usuario") || "";
const unidad = localStorage.getItem("unidad") || "";

if (!usuario || !unidad) {
  alert('⚠️ Sesión inválida. Por favor inicie sesión nuevamente.');
  window.location.replace("login.html");
}

// ============================================
// INICIALIZACIÓN
// ============================================

window.onload = function() {
  configurarFechasPorDefecto();
  aplicarFiltros();
};

function configurarFechasPorDefecto() {
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  
  document.getElementById('fechaInicio').value = formatearFechaInput(primerDiaMes);
  document.getElementById('fechaFin').value = formatearFechaInput(hoy);
}

function formatearFechaInput(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================
// CARGAR DATOS DESDE SUPABASE
// ============================================

async function aplicarFiltros() {
  const filtros = obtenerFiltros();
  
  // Validar fechas
  if (!filtros.fechaInicio || !filtros.fechaFin) {
    mostrarNotificacion('Debe seleccionar ambas fechas', 'error');
    return;
  }
  
  if (filtros.fechaInicio > filtros.fechaFin) {
    mostrarNotificacion('La fecha de inicio debe ser menor o igual a la fecha fin', 'error');
    return;
  }
  
  mostrarOverlay('Cargando datos...');
  
  try {
    const datos = await cargarDatosControl(filtros);
    datosCompletos = datos;
    
    // Procesar y agrupar datos
    datosAgrupados = procesarDatos(datos);
    
    // Actualizar UI
    actualizarResumen(datosAgrupados);
    actualizarGraficas(datosAgrupados);
    actualizarTablaDetalle(datosAgrupados);
    
    ocultarOverlay();
    mostrarNotificacion(`✓ Datos cargados: ${datos.length} consumos`, 'success');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error:', error);
    mostrarNotificacion('Error al cargar datos: ' + error.message, 'error');
  }
}

function obtenerFiltros() {
  return {
    fechaInicio: document.getElementById('fechaInicio').value,
    fechaFin: document.getElementById('fechaFin').value,
    tipoRacion: document.getElementById('tipoRacion').value,
    tipoPersonal: document.getElementById('tipoPersonal').value
  };
}

async function cargarDatosControl(filtros) {
  let query = supabase
    .from('vista_control_rancho_completa')
    .select('*')
    .eq('unidad_programacion', unidad) // Filtro por unidad del usuario
    .gte('fecha', filtros.fechaInicio)
    .lte('fecha', filtros.fechaFin);
  
  if (filtros.tipoRacion) {
    query = query.eq('tipo_racion', filtros.tipoRacion);
  }
  
  if (filtros.tipoPersonal) {
    query = query.eq('tipo_origen', filtros.tipoPersonal);
  }
  
  const { data, error } = await query.order('fecha', { ascending: true });
  
  if (error) throw error;
  
  return data || [];
}

// ============================================
// PROCESAR DATOS
// ============================================

function procesarDatos(datos) {
  const resultado = {
    totales: {
      DESAYUNO: 0,
      ALMUERZO: 0,
      CENA: 0,
      total: 0
    },
    porTipoRacion: {},
    porTipoPersonal: {},
    porFecha: {},
    porCodigoMenu: {},
    programadoVsConsumido: {},
    detalleExcel: []
  };
  
  // Para evitar contar duplicados en programado
  const codigosContados = new Set();
  
  datos.forEach(item => {
    const tipoRacion = item.tipo_racion;
    const tipoOrigen = item.tipo_origen;
    const fecha = item.fecha;
    const codigoMenu = item.codigo_menu;
    const unidad = item.unidad_personal || item.unidad_programacion;
    const plana = item.plana;
    const evento = item.evento;
    
    // Totales por tipo de ración
    resultado.totales[tipoRacion] = (resultado.totales[tipoRacion] || 0) + 1;
    resultado.totales.total++;
    
    // Por tipo de ración
    if (!resultado.porTipoRacion[tipoRacion]) {
      resultado.porTipoRacion[tipoRacion] = 0;
    }
    resultado.porTipoRacion[tipoRacion]++;
    
    // Por tipo de personal
    if (!resultado.porTipoPersonal[tipoOrigen]) {
      resultado.porTipoPersonal[tipoOrigen] = 0;
    }
    resultado.porTipoPersonal[tipoOrigen]++;
    
    // Por fecha
    if (!resultado.porFecha[fecha]) {
      resultado.porFecha[fecha] = { DESAYUNO: 0, ALMUERZO: 0, CENA: 0 };
    }
    resultado.porFecha[fecha][tipoRacion]++;
    
    // Por código de menú (para Excel)
    const key = `${unidad}|${evento || 'N/A'}|${plana || 'N/A'}|${tipoRacion}|${codigoMenu}`;
    if (!resultado.porCodigoMenu[key]) {
      resultado.porCodigoMenu[key] = {
        unidad: unidad,
        evento: evento || 'N/A',
        plana: plana || 'N/A',
        tipo_racion: tipoRacion,
        codigo_menu: codigoMenu,
        cantidad: 0
      };
    }
    resultado.porCodigoMenu[key].cantidad++;
    
    // Programado vs Consumido
    if (!resultado.programadoVsConsumido[tipoRacion]) {
      resultado.programadoVsConsumido[tipoRacion] = {
        programado: 0,
        consumido: 0
      };
    }
    resultado.programadoVsConsumido[tipoRacion].consumido++;
    
    // Sumar programado (evitar duplicados por código)
    const keyProg = `${tipoRacion}-${codigoMenu}`;
    if (item.cantidad_programada && !codigosContados.has(keyProg)) {
      resultado.programadoVsConsumido[tipoRacion].programado += item.cantidad_programada;
      codigosContados.add(keyProg);
    }
  });
  
  // Convertir porCodigoMenu a array para Excel
  resultado.detalleExcel = Object.values(resultado.porCodigoMenu);
  
  return resultado;
}

// ============================================
// ACTUALIZAR RESUMEN
// ============================================

function actualizarResumen(datos) {
  document.getElementById('totalDesayunos').textContent = datos.totales.DESAYUNO || 0;
  document.getElementById('totalAlmuerzos').textContent = datos.totales.ALMUERZO || 0;
  document.getElementById('totalCenas').textContent = datos.totales.CENA || 0;
  document.getElementById('totalGeneral').textContent = datos.totales.total || 0;
}

// ============================================
// ACTUALIZAR GRÁFICAS
// ============================================

function actualizarGraficas(datos) {
  // Destruir gráficas anteriores
  Object.values(charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  charts = {};
  
  // 1. Gráfica por Tipo de Ración
  crearGraficaTipoRacion(datos.porTipoRacion);
  
  // 2. Gráfica Programado vs Consumido
  crearGraficaComparacion(datos.programadoVsConsumido);
  
  // 3. Gráfica por Tipo de Personal
  crearGraficaTipoPersonal(datos.porTipoPersonal);
  
  // 4. Gráfica de Tendencia por Fecha
  crearGraficaTendencia(datos.porFecha);
}

function crearGraficaTipoRacion(data) {
  const ctx = document.getElementById('chartTipoRacion').getContext('2d');
  
  const labels = Object.keys(data);
  const valores = Object.values(data);
  
  if (labels.length === 0) {
    ctx.canvas.parentNode.innerHTML = '<p style="text-align:center;padding:50px;color:#999;">No hay datos para mostrar</p>';
    return;
  }
  
  charts.tipoRacion = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: [
          'rgba(249, 147, 251, 0.8)',
          'rgba(79, 172, 254, 0.8)',
          'rgba(67, 233, 123, 0.8)'
        ],
        borderColor: [
          'rgba(249, 147, 251, 1)',
          'rgba(79, 172, 254, 1)',
          'rgba(67, 233, 123, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 },
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function crearGraficaComparacion(data) {
  const ctx = document.getElementById('chartComparacion').getContext('2d');
  
  const tipos = ['DESAYUNO', 'ALMUERZO', 'CENA'];
  const programado = tipos.map(t => data[t]?.programado || 0);
  const consumido = tipos.map(t => data[t]?.consumido || 0);
  
  charts.comparacion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tipos,
      datasets: [
        {
          label: 'Programado',
          data: programado,
          backgroundColor: 'rgba(102, 126, 234, 0.6)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 2
        },
        {
          label: 'Consumido',
          data: consumido,
          backgroundColor: 'rgba(40, 167, 69, 0.6)',
          borderColor: 'rgba(40, 167, 69, 1)',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 10
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            afterLabel: function(context) {
              if (context.datasetIndex === 1) {
                const programado = context.chart.data.datasets[0].data[context.dataIndex];
                const consumido = context.parsed.y;
                if (programado > 0) {
                  const porcentaje = ((consumido / programado) * 100).toFixed(1);
                  return `Aprovechamiento: ${porcentaje}%`;
                }
              }
              return '';
            }
          }
        }
      }
    }
  });
}

function crearGraficaTipoPersonal(data) {
  const ctx = document.getElementById('chartTipoPersonal').getContext('2d');
  
  const labels = Object.keys(data).map(key => {
    const nombres = {
      'PERSONAL_UNIDAD': 'Personal Unidad',
      'EVENTO': 'Evento',
      'FORANEO': 'Foráneo/Civil'
    };
    return nombres[key] || key;
  });
  const valores = Object.values(data);
  
  if (labels.length === 0) {
    ctx.canvas.parentNode.innerHTML = '<p style="text-align:center;padding:50px;color:#999;">No hay datos para mostrar</p>';
    return;
  }
  
  charts.tipoPersonal = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 12 },
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function crearGraficaTendencia(data) {
  const ctx = document.getElementById('chartTendencia').getContext('2d');
  
  const fechas = Object.keys(data).sort();
  const desayunos = fechas.map(f => data[f].DESAYUNO);
  const almuerzos = fechas.map(f => data[f].ALMUERZO);
  const cenas = fechas.map(f => data[f].CENA);
  
  // Formatear fechas para mostrar
  const fechasFormateadas = fechas.map(f => {
    const [year, month, day] = f.split('-');
    return `${day}/${month}`;
  });
  
  charts.tendencia = new Chart(ctx, {
    type: 'line',
    data: {
      labels: fechasFormateadas,
      datasets: [
        {
          label: 'Desayuno',
          data: desayunos,
          borderColor: 'rgba(249, 147, 251, 1)',
          backgroundColor: 'rgba(249, 147, 251, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Almuerzo',
          data: almuerzos,
          borderColor: 'rgba(79, 172, 254, 1)',
          backgroundColor: 'rgba(79, 172, 254, 0.2)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Cena',
          data: cenas,
          borderColor: 'rgba(67, 233, 123, 1)',
          backgroundColor: 'rgba(67, 233, 123, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 5
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  });
}

// ============================================
// ACTUALIZAR TABLA DETALLE
// ============================================

function actualizarTablaDetalle(datos) {
  const tbody = document.getElementById('cuerpoTablaDetalle');
  tbody.innerHTML = '';
  
  const detalle = datos.detalleExcel;
  
  if (detalle.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999;">No hay datos para mostrar</td></tr>';
    document.getElementById('infoRegistros').textContent = '0 registros';
    return;
  }
  
  // Ordenar por tipo de ración y cantidad
  detalle.sort((a, b) => {
    if (a.tipo_racion !== b.tipo_racion) {
      return a.tipo_racion.localeCompare(b.tipo_racion);
    }
    return b.cantidad - a.cantidad;
  });
  
  detalle.forEach(item => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><strong>${item.tipo_racion}</strong></td>
      <td>${item.codigo_menu}</td>
      <td>${item.unidad}</td>
      <td>${item.evento}</td>
      <td>${item.plana}</td>
      <td><span class="badge-cantidad">${item.cantidad}</span></td>
    `;
    tbody.appendChild(fila);
  });
  
  document.getElementById('infoRegistros').textContent = `${detalle.length} registros`;
}

// ============================================
// EXPORTAR A EXCEL
// ============================================

function exportarExcel() {
  if (!datosAgrupados.detalleExcel || datosAgrupados.detalleExcel.length === 0) {
    mostrarNotificacion('No hay datos para exportar', 'warning');
    return;
  }
  
  mostrarOverlay('Generando archivo Excel...');
  
  try {
    // Preparar datos para Excel
    const datosExcel = datosAgrupados.detalleExcel.map(item => ({
      'Tipo Ración': item.tipo_racion,
      'Código Menú': item.codigo_menu,
      'Unidad': item.unidad,
      'Evento': item.evento,
      'Plana': item.plana,
      'Cantidad': item.cantidad
    }));
    
    // Crear hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 15 }, // Tipo Ración
      { wch: 15 }, // Código Menú
      { wch: 20 }, // Unidad
      { wch: 30 }, // Evento
      { wch: 15 }, // Plana
      { wch: 10 }  // Cantidad
    ];
    ws['!cols'] = colWidths;
    
    // Crear libro
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Control Rancho');
    
    // Generar nombre de archivo
    const filtros = obtenerFiltros();
    const nombreArchivo = `Control_Rancho_${filtros.fechaInicio}_${filtros.fechaFin}.xlsx`;
    
    // Descargar
    XLSX.writeFile(wb, nombreArchivo);
    
    ocultarOverlay();
    mostrarNotificacion('✓ Excel exportado correctamente', 'success');
    
  } catch (error) {
    ocultarOverlay();
    console.error('Error al exportar Excel:', error);
    mostrarNotificacion('Error al exportar Excel: ' + error.message, 'error');
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
`;
document.head.appendChild(style);
