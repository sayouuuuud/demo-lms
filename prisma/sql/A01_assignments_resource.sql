-- A01: إضافة مورد "assignments" لجدول صلاحيات المساعدين.
-- التشغيل: يدوي. idempotent.
-- كل مساعد موجود ياخد 'none' كديفولت (الأدمن يفتحها له من تبويب المساعدون).

INSERT INTO public.assistant_permissions (profile_id, resource, access_level)
SELECT p.id, 'assignments', 'none'
FROM public.profiles p
WHERE p.role = 'assistant'
ON CONFLICT (profile_id, resource) DO NOTHING;
