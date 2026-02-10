import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { Sale } from '../../types/database'



export default function ReceiptPage() {
    const { id } = useParams()

    const { data: sale, isLoading } = useQuery({
        queryKey: ['sale', id],
        queryFn: async () => {
            if (!isSupabaseConfigured() || !id) return null
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    items:sale_items(
                        *,
                        product_variant:product_variants(
                            product:products(name),
                            size,
                            color
                        )
                    ),
                    customer:customers(full_name, phone)
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data as Sale & { customer?: { full_name: string, phone: string } }
        },
        enabled: !!id
    })

    useEffect(() => {
        if (sale) {
            // Give time for images/layout to settle
            setTimeout(() => {
                window.print()
            }, 500)
        }
    }, [sale])

    if (isLoading) return <div className="p-4 text-center">Cargando recibo...</div>
    if (!sale) return <div className="p-4 text-center text-red-500">Recibo no encontrado</div>

    return (
        <div className="bg-white text-black font-mono text-sm p-4 w-[80mm] mx-auto min-h-screen">
            <div className="text-center mb-4">
                <img src="/logo.jpg" alt="Sophi Shoes" className="w-24 h-24 mx-auto mb-2 object-contain grayscale" />
                <h1 className="text-xl font-bold uppercase">Sophi Shoes</h1>
                <p>NIT: 123456789</p>
                <p>Cc Maracay local 58</p>
                <p>Tel: 3164726085</p>
            </div>

            <div className="mb-4 border-b border-dashed border-black pb-2">
                <p><strong>Recibo:</strong> #{sale.id.slice(0, 8)}</p>
                <p><strong>Fecha:</strong> {new Date(sale.created_at).toLocaleString('es-CO')}</p>
                {sale.customer && (
                    <p><strong>Cliente:</strong> {sale.customer.full_name}</p>
                )}
            </div>

            <table className="w-full mb-4">
                <thead>
                    <tr className="border-b border-dashed border-black text-left">
                        <th className="py-1">Cant.</th>
                        <th className="py-1">Desc.</th>
                        <th className="py-1 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items?.map((item: any) => (
                        <tr key={item.id}>
                            <td className="align-top py-1">{item.quantity}</td>
                            <td className="align-top py-1">
                                {item.product_variant?.product?.name}
                                <div className="text-xs">
                                    {item.product_variant?.size} / {item.product_variant?.color}
                                </div>
                            </td>
                            <td className="align-top text-right py-1">
                                ${(item.unit_price * item.quantity).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-t border-dashed border-black pt-2 mb-4 space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(sale.total_amount + (sale.discount_amount || 0)).toLocaleString()}</span>
                </div>
                {(sale.discount_amount || 0) > 0 && (
                    <div className="flex justify-between">
                        <span>Descuento:</span>
                        <span>-${(sale.discount_amount || 0).toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-black pt-1 mt-1">
                    <span>TOTAL:</span>
                    <span>${sale.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                    <span>Pago: {sale.payment_method}</span>
                </div>
            </div>

            <div className="text-center text-xs mt-8">
                <p>¡Gracias por su compra!</p>
                <p>No se aceptan devoluciones después de 30 días.</p>
            </div>

            <style>
                {`
                    @media print {
                        @page { margin: 0; size: 80mm auto; }
                        body { margin: 0; }
                    }
                `}
            </style>
        </div>
    )
}
