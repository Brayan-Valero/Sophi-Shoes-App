
// Mock Supabase Client Wrapper


// Simple mock data interfaces based on database types
// Using `any` for simplicity in mock implementation

// Seed data
const initialData: Record<string, any[]> = {
    profiles: [],
    suppliers: [
        {
            id: 'sup_1',
            name: 'Calzado Elegante S.A.',
            contact_name: 'Juan Pérez',
            phone: '3001234567',
            email: 'juan@calzado.com',
            address: 'Calle 123 #45-67',
            is_active: true,
            created_at: new Date().toISOString(),
        },
        {
            id: 'sup_2',
            name: 'Moda Shoes Ltd.',
            contact_name: 'Maria Gomez',
            phone: '3109876543',
            email: 'maria@moda.com',
            address: 'Carrera 10 #20-30',
            is_active: true,
            created_at: new Date().toISOString(),
        },
    ],
    products: [
        {
            id: 'prod_1',
            name: 'Tacón Clásico',
            description: 'Zapato de tacón alto en cuero sintético',
            category: 'Formal',
            supplier_id: 'sup_1',
            is_active: true,
            created_at: new Date().toISOString(),
        },
        {
            id: 'prod_2',
            name: 'Sandalia Verano',
            description: 'Sandalia cómoda para playa',
            category: 'Casual',
            supplier_id: 'sup_2',
            is_active: true,
            created_at: new Date().toISOString(),
        },
    ],
    product_variants: [
        {
            id: 'var_1',
            product_id: 'prod_1',
            size: '36',
            color: 'Negro',
            sku: 'TC-36-BLK',
            cost: 50000,
            price: 120000,
            stock: 10,
            min_stock: 2,
        },
        {
            id: 'var_2',
            product_id: 'prod_1',
            size: '37',
            color: 'Negro',
            sku: 'TC-37-BLK',
            cost: 50000,
            price: 120000,
            stock: 8,
            min_stock: 2,
        },
        {
            id: 'var_3',
            product_id: 'prod_2',
            size: '38',
            color: 'Beige',
            sku: 'SV-38-BEI',
            cost: 35000,
            price: 85000,
            stock: 15,
            min_stock: 5,
        },
    ],
    purchases: [],
    purchase_items: [],
    sales: [],
    sale_items: [],
    inventory_movements: [],
    cash_registers: [],
    expenses: [],
    customers: [],
    returns: [],
    return_items: [],
}

// Helper to get from local storage or init
const getStorage = (table: string) => {
    const key = `mock_db_${table}`
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
    // Init if empty
    const data = initialData[table] || []

    // Auto-fix old "Mock User" names if they exist in storage
    if (table === 'profiles') {
        const fixedData = (JSON.parse(stored || '[]') as any[]).map(p => {
            if (p.full_name === 'Mock User' || !p.full_name) {
                return { ...p, full_name: p.email?.includes('admin') ? 'Xiomara' : 'Nicolle' }
            }
            return p
        })
        if (stored) {
            localStorage.setItem(key, JSON.stringify(fixedData))
            return fixedData
        }
    }

    localStorage.setItem(key, JSON.stringify(data))
    return data
}


const setStorage = (table: string, data: any[]) => {
    localStorage.setItem(`mock_db_${table}`, JSON.stringify(data))
}

// Mock query builder
class MockQueryBuilder {
    table: string
    data: any[]
    error: any = null
    _limit: number | null = null
    _order: { column: string; ascending: boolean } | null = null
    _single = false
    _filters: Array<(item: any) => boolean> = []

    constructor(table: string) {
        this.table = table
        this.data = getStorage(table)
    }

    select(query?: string) {
        // Basic resolving of relations based on query string keywords
        if (query?.includes('supplier:suppliers')) {
            const suppliers = getStorage('suppliers')
            this.data = this.data.map(item => ({
                ...item,
                supplier: suppliers.find((s: any) => s.id === item.supplier_id)
            }))
        }

        if (query?.includes('product:products')) {
            const products = getStorage('products')
            this.data = this.data.map(item => ({
                ...item,
                product: products.find((p: any) => p.id === item.product_id)
            }))
        }

        if (query?.includes('variants:product_variants')) {
            const variants = getStorage('product_variants')
            const products = getStorage('products') // Nested deep
            this.data = this.data.map(item => {
                // If getting products, attach variants
                if (this.table === 'products') {
                    return {
                        ...item,
                        variants: variants.filter((v: any) => v.product_id === item.id),
                        supplier: getStorage('suppliers').find((s: any) => s.id === item.supplier_id)
                    }
                }
                return item
            })
        }

        if (query?.includes('purchase_items') || query?.includes('items:purchase_items')) {
            const items = getStorage('purchase_items')
            const variants = getStorage('product_variants')
            const products = getStorage('products')

            this.data = this.data.map(purchase => {
                const myItems = items.filter((i: any) => i.purchase_id === purchase.id).map((i: any) => {
                    const v = variants.find((v: any) => v.id === i.product_variant_id)
                    const p = v ? products.find((p: any) => p.id === v.product_id) : null
                    return {
                        ...i,
                        product_variant: v ? { ...v, product: p } : null
                    }
                })
                return { ...purchase, items: myItems, supplier: getStorage('suppliers').find((s: any) => s.id === purchase.supplier_id) }
            })
        }

        if (query?.includes('sale_items') || query?.includes('items:sale_items')) {
            const items = getStorage('sale_items')
            const variants = getStorage('product_variants')
            const products = getStorage('products')

            this.data = this.data.map(sale => {
                const myItems = items.filter((i: any) => i.sale_id === sale.id).map((i: any) => {
                    const v = variants.find((v: any) => v.id === i.product_variant_id)
                    const p = v ? products.find((p: any) => p.id === v.product_id) : null
                    return {
                        ...i,
                        product_variant: v ? { ...v, product: p } : null
                    }
                })
                return { ...sale, items: myItems }
            })
        }
        // Deep join for product_variants listing (used in forms)
        if (this.table === 'product_variants' && query?.includes('product:products')) {
            const products = getStorage('products')
            this.data = this.data.map(v => ({
                ...v,
                product: products.find((p: any) => p.id === v.product_id)
            }))
        }

        return this
    }

    // Filters
    eq(column: string, value: any) {
        this._filters.push(item => {
            // Handle nested properties if needed (simple implementation)
            return item[column] === value
        })
        return this
    }

    neq(column: string, value: any) {
        this._filters.push(item => item[column] !== value)
        return this
    }

    gt(column: string, value: any) {
        this._filters.push(item => item[column] > value)
        return this
    }

    gte(column: string, value: any) {
        this._filters.push(item => item[column] >= value)
        return this
    }

    lt(column: string, value: any) {
        this._filters.push(item => item[column] < value)
        return this
    }

    lte(column: string, value: any) {
        this._filters.push(item => item[column] <= value)
        return this
    }

    ilike(column: string, value: any) {
        // Very basic ilike
        const regex = new RegExp(value.replace(/%/g, '.*'), 'i')
        this._filters.push(item => regex.test(item[column]))
        return this
    }

    order(column: string, { ascending = true } = {}) {
        this._order = { column, ascending }
        return this
    }

    limit(count: number) {
        this._limit = count
        return this
    }

    single() {
        this._single = true
        return this
    }

    // Modifiers
    async insert(data: any | any[]) {
        const items = Array.isArray(data) ? data : [data]
        const newItems = items.map(item => ({
            id: crypto.randomUUID(), // Generate UUID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item,
        }))

        // Add to storage
        const current = getStorage(this.table)
        const updated = [...current, ...newItems]
        setStorage(this.table, updated)

        return { data: this._single ? newItems[0] : newItems, error: null }
    }

    async update(data: any) {
        // IMPORTANT: Update requires filters (eq) to have been called usually
        // We will apply updates to items matching current filters
        let store = getStorage(this.table)
        let updatedCount = 0

        const newStore = store.map((item: any) => {
            let match = true
            for (const filter of this._filters) {
                if (!filter(item)) match = false
            }

            if (match) {
                updatedCount++
                return { ...item, ...data, updated_at: new Date().toISOString() }
            }
            return item
        })

        setStorage(this.table, newStore)
        // Return updated items (mock)
        return { data: newStore, error: null } // Simplified return
    }

    async delete() {
        const store = getStorage(this.table)
        const newStore = store.filter((item: any) => {
            let match = true
            for (const filter of this._filters) {
                if (!filter(item)) match = false
            }
            return !match // Keep items that DON'T match
        })
        setStorage(this.table, newStore)
        return { data: null, error: null }
    }

    // Execute
    then(resolve: (res: { data: any; error: any }) => void, reject?: (err: any) => void) {
        // 1. Apply filters
        let result = this.data.filter(item => {
            for (const filter of this._filters) {
                if (!filter(item)) return false
            }
            return true
        })

        // 2. Sort
        if (this._order) {
            const { column, ascending } = this._order
            result.sort((a, b) => {
                if (a[column] < b[column]) return ascending ? -1 : 1
                if (a[column] > b[column]) return ascending ? 1 : -1
                return 0
            })
        }

        // 3. Limit
        if (this._limit) {
            result = result.slice(0, this._limit)
        }

        // 4. Single
        if (this._single) {
            if (result.length === 0) {
                resolve({ data: null, error: { message: 'No rows found', code: 'PGRST116' } })
                return
            }
            resolve({ data: result[0], error: null })
            return
        }

        resolve({ data: result, error: null })
    }
}

// Auth subscription handling
const authSubscribers = new Set<(event: string, session: any) => void>()

// Main Mock Client
export const createMockClient = () => {
    console.warn('⚠️ RUNNING WITH MOCK DATABASE (LocalStorage) ⚠️')

    return {
        from: (table: string) => new MockQueryBuilder(table),
        auth: {
            getSession: async () => {
                const session = localStorage.getItem('mock_session')
                return { data: { session: session ? JSON.parse(session) : null }, error: null }
            },
            signInWithPassword: async ({ email }: { email: string }) => {
                return new Promise((resolve, _reject) => {
                    setTimeout(() => {
                        const isAdmin = email.includes('admin')
                        const user = {
                            id: 'mock_user_123',
                            email,
                            role: 'authenticated',
                            user_metadata: {
                                role: isAdmin ? 'admin' : 'vendedor',
                                full_name: isAdmin ? 'Xiomara' : 'Nicolle'
                            },
                            created_at: new Date().toISOString()

                        }
                        const session = {
                            access_token: 'mock_token',
                            token_type: 'bearer',
                            expires_in: 3600,
                            refresh_token: 'mock_refresh',
                            user
                        }
                        localStorage.setItem('mock_session', JSON.stringify(session))

                        // Ensure profile exists in 'profiles' table with correct role and name
                        const profiles = getStorage('profiles')
                        const existingProfileIndex = profiles.findIndex((p: any) => p.email === email)

                        const profileData = {
                            id: user.id,
                            email,
                            full_name: isAdmin ? 'Xiomara' : 'Nicolle',
                            role: isAdmin ? 'admin' : 'vendedor',
                            updated_at: new Date().toISOString()
                        }

                        if (existingProfileIndex >= 0) {
                            profiles[existingProfileIndex] = { ...profiles[existingProfileIndex], ...profileData }
                        } else {
                            profiles.push({ ...profileData, created_at: new Date().toISOString() })
                        }
                        setStorage('profiles', profiles)


                        authSubscribers.forEach(cb => cb('SIGNED_IN', session))
                        resolve({ data: { session, user }, error: null })
                    }, 500)
                })
            },
            signOut: async () => {
                localStorage.removeItem('mock_session')
                authSubscribers.forEach(cb => cb('SIGNED_OUT', null))
                return { error: null }
            },
            onAuthStateChange: (callback: any) => {
                // Determine initial state
                const session = localStorage.getItem('mock_session')
                if (session) {
                    callback('SIGNED_IN', JSON.parse(session))
                } else {
                    callback('SIGNED_OUT', null)
                }

                authSubscribers.add(callback)

                return {
                    data: {
                        subscription: {
                            unsubscribe: () => {
                                authSubscribers.delete(callback)
                            }
                        }
                    }
                }
            }
        }
    } as any
}
