// ============================================
// SUPABASE-CONFIG.JS
// Configuración de conexión a Supabase
// ============================================

// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase
const SUPABASE_URL = 'https://qgbixgvidxeaoxxpyiyw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYml4Z3ZpZHhlYW94eHB5aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTU3NzMsImV4cCI6MjA3NTc3MTc3M30.NQ5n_vFnHDp8eNjV3I9vRujfWDWWGAywgyICpqX0OKQ';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Función auxiliar para manejar errores
function handleSupabaseError(error, context = '') {
  console.error(`Error en ${context}:`, error);
  return {
    success: false,
    error: error.message || 'Error desconocido',
    details: error
  };
}

// Función auxiliar para verificar sesión
function verificarSesion() {
  const usuario = localStorage.getItem("usuario");
  if (!usuario) {
    window.location.replace("login.html");
    return false;
  }
  return true;
}

// Exportar configuración (si usas módulos ES6)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, handleSupabaseError, verificarSesion };
}
