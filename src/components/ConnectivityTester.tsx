
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ConnectivityTester() {
    const [status, setStatus] = useState<any>({
        env: 'checking',
        auth: 'checking',
        db: 'checking',
        latency: 0
    })
    const [logs, setLogs] = useState<string[]>([])

    const addLog = (msg: string) => setLogs(prev => [...prev.slice(-4), msg])

    const checkConnection = async () => {
        setStatus((prev: any) => ({ ...prev, auth: 'checking', db: 'checking' }))
        setLogs([]) // Clear logs
        const start = Date.now()

        // 1. Check ENV
        const url = import.meta.env.VITE_SUPABASE_URL
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY
        const hasEnv = !!url && !!key && url !== 'YOUR_SUPABASE_URL'

        addLog(`ENV: ${hasEnv ? 'Present' : 'Missing/Default'}`)

        // 2. Check Auth Service (Get Session) - With Timeout
        addLog('Auth: Pinging getSession...')

        let authResult = 'OK'
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
            const sessionPromise = supabase.auth.getSession()

            const { error } = await Promise.race([sessionPromise, timeoutPromise]) as any
            if (error) throw error
            addLog('Auth: OK')
        } catch (err: any) {
            authResult = `FAIL: ${err.message || err}`
            addLog(`Auth Result: ${authResult}`)
        }

        // 3. Check Database (Public read) - With Timeout
        addLog('DB: Fetching cash_registers...')
        let dbResult = 'OK'
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
            const dbPromise = supabase
                .from('cash_registers')
                .select('count')
                .limit(1)

            const { error } = await Promise.race([dbPromise, timeoutPromise]) as any
            if (error) throw error
            addLog('DB: OK')
        } catch (err: any) {
            dbResult = `FAIL: ${err.message || err}`
            addLog(`DB Result: ${dbResult}`)
        }

        const end = Date.now()

        setStatus({
            env: hasEnv ? 'OK' : 'FAIL',
            auth: authResult === 'OK' ? 'OK' : 'FAIL',
            db: dbResult === 'OK' ? 'OK' : 'FAIL',
            latency: end - start
        })

        addLog('Done.')
    }

    const clearStorage = () => {
        localStorage.clear()
        window.location.reload()
    }

    useEffect(() => {
        checkConnection()
    }, [])

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-[9999] max-w-sm shadow-2xl border border-gray-700">
            <h3 className="font-bold border-b border-gray-600 mb-2 flex justify-between items-center">
                Diagnóstico
                <button onClick={checkConnection} className="text-[10px] underline text-blue-300">Reintentar</button>
            </h3>

            <div className={`mb-1 flex justify-between ${status.env === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                <span>ENV:</span> <span>{status.env}</span>
            </div>
            <div className={`mb-1 flex justify-between ${status.auth === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                <span>Auth:</span> <span>{status.auth}</span>
            </div>
            <div className={`mb-1 flex justify-between ${status.db === 'OK' ? 'text-green-400' : 'text-red-400'}`}>
                <span>DB:</span> <span>{status.db}</span>
            </div>

            <div className="text-gray-400 mb-2 text-[10px]">Latencia: {status.latency}ms</div>

            <div className="border-t border-gray-600 pt-2 opacity-70 mb-3 bg-black/50 p-1 rounded">
                {logs.map((l, i) => <div key={i} className="truncate">{l}</div>)}
            </div>

            <button
                onClick={clearStorage}
                className="w-full bg-red-900/50 hover:bg-red-800 text-red-200 py-1 rounded border border-red-800/50 transition-colors"
            >
                ⚠️ Limpiar Datos y Recargar
            </button>
        </div>
    )
}
