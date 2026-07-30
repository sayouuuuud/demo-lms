-- W01: سجل رسائل الواتساب (outbox/audit)
-- التشغيل: يدوي من صاحب المشروع على الـ live DB. مرة واحدة.
-- آمن للتشغيل مرتين (idempotent).

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_phone            text NOT NULL,
  template            text NOT NULL,
  body                text NOT NULL DEFAULT '',
  status              text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error               text,
  student_id          uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  CONSTRAINT wa_msg_status_chk CHECK (status IN ('queued','sent','failed')),
  CONSTRAINT wa_msg_template_chk CHECK (template IN ('login_otp','payment_approved','custom'))
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_created ON public.whatsapp_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_status  ON public.whatsapp_messages (status);
CREATE INDEX IF NOT EXISTS idx_wa_msg_student ON public.whatsapp_messages (student_id);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
-- مفيش أي policy: الوصول من التطبيق فقط عبر Prisma (service connection).

-- تنظيف السجل القديم (شغّلها دوريًا لو حبيت)
-- DELETE FROM public.whatsapp_messages WHERE created_at < now() - interval '90 days';
