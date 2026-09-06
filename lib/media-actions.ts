'use server'

/**
 * lib/media-actions.ts — إصدار روابط رفع موقّعة (presigned PUT) لكل الميديا على Cloudflare R2
 * بديل UploadThing: الصور والإيصالات والأفاتار والفيديو العادي كلها بتتخزن على R2.
 */

import { auth } from '@/auth'
import { isStaff } from '@/lib/auth-guard'
import { createR2UploadUrl, deleteR2Object, isR2Configured } from '@/lib/r2'
import { MEDIA_KINDS, MEDIA_PREFIX, mediaKeyToUrl, type MediaKind } from '@/lib/media-kinds'

export type MediaUploadTicket = {
  uploadUrl: string
  key: string
  /** الرابط النهائي اللي يُحفظ في الداتابيز ويُعرض للمستخدم */
  url: string
}

function safeExtension(filename: string, contentType: string): string {
  const fromName = filename.includes('.') ? filename.split('.').pop() ?? '' : ''
  const ext = fromName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
  if (ext) return ext
  const fromType = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '').slice(0, 5)
  return fromType || 'bin'
}

/**
 * يرجّع presigned PUT URL لرفع ملف ميديا مباشرةً من المتصفح إلى R2.
 * الصلاحيات: الأنواع الإدارية للـ staff فقط، والأفاتار/الإيصالات/صور الاختبارات لأي مستخدم مسجّل.
 */
export async function getMediaUploadUrl(
  kind: MediaKind,
  filename: string,
  contentType: string,
  size?: number,
): Promise<MediaUploadTicket | { error: string }> {
  const config = MEDIA_KINDS[kind]
  if (!config) return { error: 'نوع الملف غير معروف' }

  if (!isR2Configured()) {
    return { error: 'التخزين السحابي (R2) غير مهيّأ — اضبط متغيرات R2 من الإعدادات' }
  }

  const session = await auth()
  if (!session?.user?.id) return { error: 'غير مسجّل — سجّل الدخول وحاول مرة أخرى' }

  if (!config.studentAllowed && !(await isStaff())) {
    return { error: 'غير مسموح. لازم تكون أدمن.' }
  }

  if (!config.accept.some((prefix) => contentType.startsWith(prefix))) {
    return { error: `نوع الملف غير مسموح لـ ${config.label}` }
  }

  if (typeof size === 'number' && size > config.maxSize) {
    return { error: `حجم الملف أكبر من الحد المسموح (${Math.round(config.maxSize / 1024 / 1024)} MB)` }
  }

  const key = `${MEDIA_PREFIX}${config.folder}/${crypto.randomUUID()}.${safeExtension(filename, contentType)}`

  try {
    const uploadUrl = await createR2UploadUrl(key, contentType, 900)
    return { uploadUrl, key, url: mediaKeyToUrl(key) }
  } catch (error) {
    console.error('[media] getMediaUploadUrl error:', error)
    return { error: 'فشل في إنشاء رابط الرفع على Cloudflare R2' }
  }
}

/**
 * حذف ملف ميديا من R2 (للـ staff فقط). يقبل الرابط `/api/media/...` أو المفتاح الخام.
 */
export async function deleteMediaObject(urlOrKey: string): Promise<{ success: true } | { error: string }> {
  if (!(await isStaff())) return { error: 'غير مسموح. لازم تكون أدمن.' }

  const raw = urlOrKey.startsWith('/api/media/')
    ? `${MEDIA_PREFIX}${urlOrKey.replace('/api/media/', '')}`
    : urlOrKey

  if (!raw.startsWith(MEDIA_PREFIX) || raw.includes('..')) {
    return { error: 'المسار غير صحيح' }
  }

  try {
    await deleteR2Object(raw)
    return { success: true }
  } catch (error) {
    console.error('[media] deleteMediaObject error:', error)
    return { error: 'تعذّر حذف الملف من R2' }
  }
}
