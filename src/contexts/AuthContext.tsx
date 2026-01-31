import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Profile } from '../types/database'

interface AuthContextType {
    user: User | null
    session: Session | null
    profile: Profile | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    // Fetch user profile
    const fetchProfile = async (userId: string) => {
        if (!isSupabaseConfigured()) return null

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Error fetching profile:', error)
            return null
        }

        return data as Profile
    }

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoading(false)
            return
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                fetchProfile(session.user.id).then(setProfile)
            }

            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, session: any) => {
                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user) {
                    const profile = await fetchProfile(session.user.id)
                    setProfile(profile)
                } else {
                    setProfile(null)
                }

                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
            return { error: new Error('Supabase not configured') }
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        return { error: error as Error | null }
    }

    const signOut = async () => {
        if (!isSupabaseConfigured()) return

        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
    }

    const value: AuthContextType = {
        user,
        session,
        profile,
        loading,
        signIn,
        signOut,
        isAdmin: profile?.role === 'admin',
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
