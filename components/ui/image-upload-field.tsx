'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { ImagePlus, X, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadToR2 } from '@/lib/upload-to-r2'
import type { MediaKind } from '@/lib/media-kinds'
import { cn } from '@/lib/utils'

// Reusable authenticated image picker for curriculum, profile, and exam forms.
// Uploads straight to Cloudflare R2 via a presigned PUT, then stores the
// /api/media/... proxy URL so the bucket can stay private.
export function ImageUploadField({
  value,
  onChange,
  label = 'الصورة',
  hint,
  kind = 'curriculum',
}: {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
  kind?: MediaKind
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('من فضلك اختر ملف صورة')
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const { url } = await uploadToR2(file, kind, { onProgress: setProgress })
      onChange(url)
      toast.success('تم رفع الصورة')
    } catch (e) {
      toast.error(`فشل الرفع: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`)
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-right text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Preview thumbnail */}
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/60">
          {value ? (
            <>
              <Image
                src={value}
                alt="معاينة"
                fill
                sizes="96px"
                unoptimized={value.startsWith('/api/media/')}
                className="object-contain p-1"
              />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-background/90 text-muted-foreground shadow hover:text-destructive"
                aria-label="إزالة الصورة"
              >
                <X className="size-3" />
              </button>
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-8" />
            </div>
          )}
        </div>

        {/* Upload zone */}
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-center transition-colors hover:bg-secondary/60',
              uploading && 'cursor-not-allowed opacity-70',
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="size-7 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {progress > 0 ? `جاري الرفع... ${progress}%` : 'جاري الرفع...'}
                </span>
              </>
            ) : (
              <>
                <Upload className="size-7 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  اختر صورة لرفعها
                </span>
                <span className="text-xs text-muted-foreground">
                  JPG أو PNG أو WebP (أقل من 8 MB)
                </span>
              </>
            )}
          </button>
          {hint && (
            <p className="mt-2 text-right text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </div>
  )
}
