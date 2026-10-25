import { createClient } from '@supabase/supabase-js'
import { usesVps } from './runtime'
import { vpsData } from './vps-data'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = usesVps ? vpsData : createClient(supabaseUrl, supabaseAnonKey)
