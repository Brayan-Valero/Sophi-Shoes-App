import { createClient } from '@supabase/supabase-js'
import { createMockClient } from './mockSupabase'

// Intentar obtener las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Flag manual para forzar modo demo si se desea, o automático si faltan keys
const FORCE_MOCK = false
const USE_MOCK = FORCE_MOCK || !supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL'

// Función para inicializar el cliente
const initSupabase = () => {
    if (USE_MOCK) {
        console.info('Using Mock Supabase Client (Demo Mode)')
        return createMockClient()
    }
    return createClient(supabaseUrl!, supabaseKey!, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    })
}

export const supabase = initSupabase()

export const isSupabaseConfigured = () => {
    // Always true now, either mocked or real
    return true
}

export const isMockMode = () => {
    return USE_MOCK
}
