import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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
    // CRITICAL CHANGE: Default to FALSE to show Login screen immediately.
    // We only set to true if we detect a session later.
    const [loading, setLoading] = useState(true)

    // Fix: Use Ref to track profile in callbacks without stale closures
    const profileRef = useRef<Profile | null>(null)
    const sessionRef = useRef<Session | null>(null)
    // Fix: Valid manual login handling
    const manualLoginRef = useRef(false)

    // Helper to update both state and ref
    const updateProfile = (newProfile: Profile | null) => {
        profileRef.current = newProfile
        setProfile(newProfile)
    }

    // Fetch user profile with Retry and Timeout Logic
    // We allow customizing timeout/retries to differentiate between "Auto-login" (fail fast) and "Manual login" (be patient)
    const fetchProfile = async (userId: string, timeoutMs = 10000, retries = 3): Promise<Profile | null> => {
        // Optimization: If we already have the profile for this user, return it immediately.
        if (profileRef.current && profileRef.current.id === userId) {
            // console.log('Auth: Profile already loaded, skipping fetch.')
            return profileRef.current
        }

        console.log(`Auth: Fetching profile for ${userId} (timeout: ${timeoutMs}ms, retries: ${retries})...`)
        if (!isSupabaseConfigured()) return null

        try {
            // Create a promise that rejects after the specified timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), timeoutMs)
            )

            // The actual data fetch
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            // Race them
            const { data, error } = await (Promise.race([fetchPromise, timeoutPromise]) as Promise<any>)

            if (error) {
                console.error('Auth: Error fetching profile:', error)
                throw error
            }

            console.log('Auth: Profile fetched successfully')
            return data as Profile
        } catch (err) {
            console.error('Auth: fetchProfile caught error:', err)

            // Retry logic
            if (retries > 0) {
                console.log(`Auth: Retrying profile fetch in 1s...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
                return fetchProfile(userId, timeoutMs, retries - 1)
            } else {
                console.error('Auth: All profile fetch retries failed.')
            }

            return null
        }
    }

    useEffect(() => {
        let isMounted = true

        // Safety fallback: If nothing happens in 20 seconds, force loading false
        // This prevents infinite loading screens if Supabase client hangs
        const safetyTimer = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Auth: Safety timer triggered (20s). Forcing load completion.')
                // CRITIAL SECURITY: If we hit safety timer, we probably have a zombie session (user but no profile).
                // It is safer to kill the loading but we must accept the risk or sign out.
                // For now, let's allow it to finish loading, but the profile check below handles the strictness.
                setLoading(false)
            }
        }, 20000)

        // REMOVED initAuth: We no longer block on startup.
        // We rely 100% on onAuthStateChange to tell us if there is a session.
        // If there is one, it will fire INITIAL_SESSION or SIGNED_IN.

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, session: any) => {
                const eventType = _event

                if (!isMounted) return

                // Update refs immediately to avoid race conditions in timeouts
                sessionRef.current = session

                // Determine if this is a manual login vs auto-restore
                const isManualLogin = manualLoginRef.current

                // BLOCKING LOGIC REFINED:
                // If it's manual login, we block and wait.
                // If it's auto-restore (INITIAL_SESSION or SIGNED_IN but not manual),
                // we should ONLY block if we are going to try to fetch profile.

                // CRITICAL FIX: Ensure we check the LATEST profile state, not the closure one.
                const hasProfile = !!profileRef.current

                const shouldBlock = (isManualLogin || eventType === 'INITIAL_SESSION') && session?.user && !hasProfile

                if (shouldBlock) {
                    setLoading(true)
                }

                const currentUser = session?.user ?? null

                setSession(session)
                setUser(currentUser)

                if (currentUser) {
                    // Optimized: If we already have a profile for this user, don't refetch unless forced or different user
                    // Checking user ID against current profile ID would be ideal, but for now let's just refetch
                    // to be safe but NOT block UI if we already have data.

                    // CONTEXT-AWARE FETCH:
                    // If this is manual login, patience (10s, 3 retries).
                    // If this is auto-restore (startup/new tab), 5s, 1 retry for reliability.
                    const timeoutMs = isManualLogin ? 10000 : 5000
                    const retries = isManualLogin ? 3 : 1

                    console.log(`Auth: Handling event ${eventType}. Manual Login: ${isManualLogin}. Strategy: ${timeoutMs}ms timeout.`)

                    const profileData = await fetchProfile(currentUser.id, timeoutMs, retries)

                    if (isMounted) {
                        updateProfile(profileData) // Use helper to update Ref + State
                        manualLoginRef.current = false // Reset after attempt

                        // SECURITY ENFORCEMENT:
                        if (!profileData && isManualLogin) {
                            console.error('Auth: CRITICAL - Manual login successful but Profile fetch failed.')
                            console.error('Auth: Enforcing Logout to ensure clean state.')
                            signOut()
                            return
                        }

                        if (!profileData && !isManualLogin) {
                            console.warn('Auth: Auto-restore profile fetch failed. Session kept but profile is null.')
                            // We don't signOut() here to avoid kicking the user out of all tabs 
                            // if a new tab (like a receipt) fails to load the profile quickly.
                        }
                    }
                } else {
                    if (isMounted) updateProfile(null)
                }

                if (isMounted) {
                    setLoading(false)
                }
            }
        )

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
            subscription.unsubscribe()
        }
    }, [])

    const signIn = async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
            return { error: new Error('Supabase not configured') }
        }

        // Mark as manual login so onAuthStateChange knows to be patient
        manualLoginRef.current = true

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            manualLoginRef.current = false
        }

        return { error: error as Error | null }
    }

    const signOut = async () => {
        // Optimistic SignOut: Clear state immediately to update UI
        setUser(null)
        setSession(null)
        setProfile(null)

        if (!isSupabaseConfigured()) return

        try {
            await supabase.auth.signOut()
        } catch (error) {
            console.error('Auth: Error signing out (background):', error)
        }
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
