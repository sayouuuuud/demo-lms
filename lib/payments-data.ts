export type PaymentMethod = 'انستاباي' | 'فودافون كاش'
export type PaymentStatus = 'قيد المراجعة' | 'مقبول' | 'مرفوض'

export type PaymentRecord = {
  id: string
  studentName: string
  studentEmail: string
  studentPhone: string
  course: string
  amount: number
  method: PaymentMethod
  receiptUrl: string
  reference: string
  submittedAt: string
  status: PaymentStatus
}

export const paymentRecords: PaymentRecord[] = [
  {
    id: 'PAY-1001',
    studentName: 'كريم محمود',
    studentEmail: 'karim.mahmoud@example.com',
    studentPhone: '010 1234 5678',
    course: 'أساسيات تطوير الويب',
    amount: 450,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842301',
    submittedAt: 'منذ 12 دقيقة',
    status: 'قيد المراجعة',
  },
  {
    id: 'PAY-1002',
    studentName: 'سارة عبد الله',
    studentEmail: 'sara.abdullah@example.com',
    studentPhone: '011 2345 6789',
    course: 'تصميم واجهات المستخدم UI/UX',
    amount: 650,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552190',
    submittedAt: 'منذ 35 دقيقة',
    status: 'قيد المراجعة',
  },
  {
    id: 'PAY-1003',
    studentName: 'يوسف إبراهيم',
    studentEmail: 'youssef.ibrahim@example.com',
    studentPhone: '012 3456 7890',
    course: 'البرمجة بلغة بايثون',
    amount: 500,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842355',
    submittedAt: 'منذ ساعة',
    status: 'قيد المراجعة',
  },
  {
    id: 'PAY-1004',
    studentName: 'منة الله حسن',
    studentEmail: 'menna.hassan@example.com',
    studentPhone: '010 9876 5432',
    course: 'التسويق الرقمي',
    amount: 400,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552233',
    submittedAt: 'منذ 3 ساعات',
    status: 'مقبول',
  },
  {
    id: 'PAY-1005',
    studentName: 'عمر خالد',
    studentEmail: 'omar.khaled@example.com',
    studentPhone: '011 5566 7788',
    course: 'تحليل البيانات',
    amount: 700,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842401',
    submittedAt: 'منذ 5 ساعات',
    status: 'مقبول',
  },
  {
    id: 'PAY-1006',
    studentName: 'ليلى أحمد',
    studentEmail: 'layla.ahmed@example.com',
    studentPhone: '012 2233 4455',
    course: 'أساسيات تطوير الويب',
    amount: 450,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552288',
    submittedAt: 'أمس',
    status: 'مرفوض',
  },
  {
    id: 'PAY-1007',
    studentName: 'حسام الدين',
    studentEmail: 'hossam.eldin@example.com',
    studentPhone: '010 4455 6677',
    course: 'تطوير تطبيقات الموبايل',
    amount: 800,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842460',
    submittedAt: 'أمس',
    status: 'مقبول',
  },
  {
    id: 'PAY-1008',
    studentName: 'نور محمد',
    studentEmail: 'nour.mohamed@example.com',
    studentPhone: '011 7788 9900',
    course: 'تصميم واجهات المستخدم UI/UX',
    amount: 650,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552301',
    submittedAt: 'منذ يومين',
    status: 'قيد المراجعة',
  },
]

export const paymentStatusFilters: Array<{
  label: string
  value: PaymentStatus | 'الكل'
}> = [
  { label: 'الكل', value: 'الكل' },
  { label: 'قيد المراجعة', value: 'قيد المراجعة' },
  { label: 'مقبول', value: 'مقبول' },
  { label: 'مرفوض', value: 'مرفوض' },
]

export function getPaymentStats(records: PaymentRecord[]) {
  const pending = records.filter((r) => r.status === 'قيد المراجعة').length
  const approved = records.filter((r) => r.status === 'مقبول')
  const rejected = records.filter((r) => r.status === 'مرفوض').length
  const totalRevenue = approved.reduce((sum, r) => sum + r.amount, 0)

  return {
    pending,
    approvedCount: approved.length,
    rejected,
    totalRevenue,
  }
}
