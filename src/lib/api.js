import { usesVps } from './runtime'
import { apiFetch as vpsFetch } from './session'

// Keep the existing deployment's request behavior unchanged unless VPS is opted in.
export const apiFetch = (path,options) => usesVps ? vpsFetch(path,options) : fetch(path,options)
