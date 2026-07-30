-- إضافة عمود التحكم في إشعارات الواتساب عند قبول الدفع
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS whatsapp_payment_notify BOOLEAN NOT NULL DEFAULT TRUE;
