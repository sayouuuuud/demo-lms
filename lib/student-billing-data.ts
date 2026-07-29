import type { InvoiceStatus, PaymentMethod, Invoice } from './student-types'

// الأنواع مُعرَّفة في lib/student-types.ts — re-export للتوافق مع الاستيرادات الموجودة
export type { InvoiceStatus, PaymentMethod, Invoice } from './student-types'

export const studentInvoices: Invoice[] = [
  {
    id: 'INV-2041',
    course: 'تطوير واجهات React الاحترافية',
    instructor: 'م. أحمد سمير',
    amount: 650,
    issuedAt: '20 يونيو 2025',
    dueDate: '30 يونيو 2025',
    status: 'غير مدفوعة',
  },
  {
    id: 'INV-2038',
    course: 'مقدمة في علوم البيانات وPython',
    instructor: 'د. كريم فؤاد',
    amount: 700,
    issuedAt: '15 يونيو 2025',
    dueDate: '25 يونيو 2025',
    status: 'قيد المراجعة',
    method: 'انستاباي',
    reference: 'IPN-7741209',
    senderInfo: 'kareem.student@instapay',
    submittedAt: 'منذ ساعتين',
  },
  {
    id: 'INV-2025',
    course: 'أساسيات تصميم واجهات المستخدم UI/UX',
    instructor: 'أ. سارة منير',
    amount: 500,
    issuedAt: '2 يونيو 2025',
    dueDate: '12 يونيو 2025',
    status: 'مرفوضة',
    method: 'فودافون كاش',
    reference: 'VFC-339102',
    senderInfo: '011 2345 6789',
    submittedAt: 'منذ 5 أيام',
    rejectionReason: 'صورة الإيصال غير واضحة، برجاء إعادة إرسال إيصال أوضح.',
  },
  {
    id: 'INV-2012',
    course: 'التسويق الرقمي من الصفر للاحتراف',
    instructor: 'أ. ليلى حسن',
    amount: 400,
    issuedAt: '10 مايو 2025',
    dueDate: '20 مايو 2025',
    status: 'مدفوعة',
    method: 'انستاباي',
    reference: 'IPN-6620455',
    submittedAt: '12 مايو 2025',
  },
  {
    id: 'INV-1998',
    course: 'أساسيات HTML و CSS',
    instructor: 'م. أحمد سمير',
    amount: 300,
    issuedAt: '1 أبريل 2025',
    dueDate: '11 أبريل 2025',
    status: 'مدفوعة',
    method: 'فودافون كاش',
    reference: 'VFC-220871',
    submittedAt: '3 أبريل 2025',
  },
]

export const invoiceStatusFilters: Array<{
  label: string
  value: InvoiceStatus | 'الكل'
}> = [
  { label: 'الكل', value: 'الكل' },
  { label: 'غير مدفوعة', value: 'غير مدفوعة' },
  { label: 'قيد المراجعة', value: 'قيد المراجعة' },
  { label: 'مدفوعة', value: 'مدفوعة' },
  { label: 'مرفوضة', value: 'مرفوضة' },
]

// حسابات المنصة التي يحوّل إليها الطالب
export const paymentAccounts: Array<{
  method: PaymentMethod
  account: string
  holder: string
}> = [
  { method: 'انستاباي', account: 'academy@instapay', holder: 'المنصة التعليمية' },
  { method: 'فودافون كاش', account: '010 1234 5678', holder: 'المنصة التعليمية' },
]

export function getBillingStats(invoices: Invoice[]) {
  const unpaid = invoices.filter(
    (i) => i.status === 'غير مدفوعة' || i.status === 'مرفوضة',
  )
  const pending = invoices.filter((i) => i.status === 'قيد المراجعة').length
  const paid = invoices.filter((i) => i.status === 'مدفوعة')

  return {
    dueAmount: unpaid.reduce((sum, i) => sum + i.amount, 0),
    dueCount: unpaid.length,
    pending,
    paidCount: paid.length,
    totalPaid: paid.reduce((sum, i) => sum + i.amount, 0),
  }
}
