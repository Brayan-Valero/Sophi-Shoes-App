import { supabase } from './supabase'

/**
 * Compresses and resizes an image file
 */
async function compressImage(file: File, maxWidth = 1024, quality = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Calculate aspect ratio resizing
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width
                        width = maxWidth
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height
                        height = maxWidth
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob)
                        else reject(new Error('Canvas to Blob failed'))
                    },
                    'image/jpeg',
                    quality
                )
            }
        }
        reader.onerror = (error) => reject(error)
    })
}

/**
 * Uploads a file to Supabase Storage and returns the public URL
 * @param bucket Storage bucket name
 * @param path Folder path within the bucket
 * @param file File object from input
 */
export async function uploadImage(bucket: string, path: string, file: File): Promise<string | null> {
    try {
        console.log(`Storage: Resizing and uploading ${file.name}...`)

        // Compress the image before uploading
        const compressedBlob = await compressImage(file)

        // Create a unique filename (forcing .jpg as we convert to jpeg)
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.jpg`
        const filePath = `${path}/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, compressedBlob, {
                contentType: 'image/jpeg',
                upsert: true
            })

        if (uploadError) {
            console.error('Storage: Upload error detail:', uploadError)
            throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath)

        return publicUrl
    } catch (error: any) {
        console.error('Error uploading image:', error)
        window.alert(`Error al subir imagen: ${error.message || 'Error desconocido'}. Asegúrate de que el bucket "products" sea público en tu panel de Supabase.`)
        return null
    }
}

/**
 * Deletes a file from Supabase Storage using its public URL
 * @param bucket Storage bucket name
 * @param publicUrl Public URL of the file
 */
export async function deleteImage(bucket: string, publicUrl: string): Promise<void> {
    try {
        // Extract path from public URL
        // Example: https://.../storage/v1/object/public/products/folder/file.jpg
        const urlParts = publicUrl.split(`${bucket}/`)
        if (urlParts.length < 2) return

        const filePath = urlParts[1]

        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath])

        if (error) throw error
    } catch (error) {
        console.error('Error deleting image:', error)
    }
}
