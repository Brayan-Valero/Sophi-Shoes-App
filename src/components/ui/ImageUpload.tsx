import React, { useState } from 'react'
import { Camera, X } from 'lucide-react'
import { uploadImage } from '../../lib/storage'

interface ImageUploadProps {
    value: string | null
    onChange: (url: string | null) => void
    bucket?: string
    path?: string
    label?: string
}

export default function ImageUpload({
    value,
    onChange,
    bucket = 'products',
    path = 'images',
    label = 'Imagen'
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = e.target.files?.[0]
            if (!file) return

            setUploading(true)

            // If there's an existing image, we could delete it, 
            // but for simplicity and safety (multi-variants), we'll just upload the new one

            const url = await uploadImage(bucket, path, file)
            if (url) {
                onChange(url)
            }
        } catch (error) {
            console.error('Error in handleFileChange:', error)
        } finally {
            setUploading(false)
        }
    }

    const removeImage = async () => {
        // If we want to delete from storage:
        // if (value) await deleteImage(bucket, value)
        onChange(null)
    }

    return (
        <div className="space-y-2">
            {label && <label className="text-xs font-medium text-gray-500">{label}</label>}

            <div className="relative group w-full aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center">
                {value ? (
                    <>
                        <img src={value} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={14} />
                        </button>
                    </>
                ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                        {uploading ? (
                            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <div className="p-3 bg-white rounded-full shadow-sm">
                                    <Camera className="text-gray-400" size={20} />
                                </div>
                                <span className="text-xs text-gray-400">Clic para subir foto</span>
                            </>
                        )}
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>
        </div>
    )
}
