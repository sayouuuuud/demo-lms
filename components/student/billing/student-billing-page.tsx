'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Search,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  CreditCard,
  Smartphone,
  Hash,
  CalendarDays,
  BookOpen,
  X,
  Upload,
  Copy,
  Check,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  invoiceStatusFilters,
  paymentAccounts,
  getBillingStats,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
} from '@/lib/student-billing-data'
import { resubmitPayment } from '@/app/student/actions'
import { UploadDropzone } from '@/lib/uploadthing'
import '@uploadthing/react/styles.css'

const statusStyles: Record<InvoiceStatus, string> = {
  'غير مدفوعة':
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300',
  'قيد المراجعة':
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400',
  مدفوعة:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400',
  مرفوضة:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
}

function MethodBadge({ method }: { method: PaymentMethod }) {
  const isInsta = method === 'انستاباي'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
        isInsta
          ? 'border-primary/20 bg-primary/10 text-primary'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400',
      )}
    >
      {isInsta ? <CreditCard className="size-3.5" /> : <Smartphone className="size-3.5" />}
      {method}
    </span>
  )
}

export function StudentBillingPage({
  initialInvoices = [],
}: {
  initialInvoices?: Invoice[]
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<InvoiceStatus | 'الكل'>('الكل')
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)

  const stats = useMemo(() => getBillingStats(invoices), [invoices])

  const statCards = [
    {
      label: 'مستحق للدفع',
      value: `${stats.dueAmount.toLocaleString('en-US')} ج.م`,
      hint: `${stats.dueCount} فاتورة`,
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
    {
      label: 'قيد المراجعة',
      value: String(stats.pending),
      hint: 'بانتظار التأكيد',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'فواتير مدفوعة',
      value: String(stats.paidCount),
      hint: 'مؤكدة',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'إجمالي المدفوع',
      value: `${stats.totalPaid.toLocaleString('en-US')} ج.م`,
      hint: 'كل الأوقات',
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ]

  const filtered = useMemo(() => {
    return invoices.filter((i) => {
      const matchesStatus = status === 'الكل' || i.status === status
      const q = query.trim()
      const matchesQuery =
        q === '' || i.course.includes(q) || i.id.includes(q)
      return matchesStatus && matchesQuery
    })
  }, [invoices, query, status])

  function submitPayment(
    id: string,
    method: PaymentMethod,
    reference: string,
    senderInfo: string,
  ) {
    // Optimistically reflect the submission, then persist via server action.
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: 'قيد المراجعة',
              method,
              reference,
              senderInfo,
              submittedAt: 'الآن',
              rejectionReason: undefined,
            }
          : i,
      ),
    )
    setPayingInvoice(null)
    void resubmitPayment(id, method, reference)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="gap-0 p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  stat.bg,
                )}
              >
                <stat.icon className={cn('size-5', stat.color)} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{stat.value}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {invoiceStatusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  status === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الكورس أو رقم الفاتورة..."
              className="w-full rounded-lg border border-border bg-background py-2 pr-9 pl-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Invoice list */}
        <div className="divide-y divide-border">
          {filtered.map((inv) => {
            const actionable = inv.status === 'غير مدفوعة' || inv.status === 'مرفوضة'
            return (
              <div key={inv.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{inv.course}</p>
                      <Badge
                        variant="outline"
                        className={cn('font-medium', statusStyles[inv.status] ?? statusStyles['غير مدفوعة'])}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {inv.instructor} • {inv.id}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        تاريخ الاستحقاق: {inv.dueDate}
                      </span>
                      {inv.method && inv.reference && (
                        <span className="flex items-center gap-1 font-mono" dir="ltr">
                          <Hash className="size-3.5" />
                          {inv.reference}
                        </span>
                      )}
                      {inv.senderInfo && (
                        <span className="flex items-center gap-1 font-mono" dir="ltr">
                          {inv.method === 'فودافون كاش' ? (
                            <Smartphone className="size-3.5" />
                          ) : (
                            <CreditCard className="size-3.5" />
                          )}
                          {inv.senderInfo}
                        </span>
                      )}
                    </div>
                    {inv.status === 'مرفوضة' && inv.rejectionReason && (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                        {inv.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
                  <span className="text-lg font-bold text-foreground">
                    {inv.amount.toLocaleString('en-US')} ج.م
                  </span>
                  {actionable ? (
                    <Button size="sm" onClick={() => setPayingInvoice(inv)}>
                      <Wallet className="size-4" />
                      {inv.status === 'مرفوضة' ? 'إعادة الدفع' : 'ادفع الآن'}
                    </Button>
                  ) : inv.status === 'قيد المراجعة' ? (
                    <span className="flex items-center gap-1.5 text-xs text-amber-600">
                      <Clock className="size-3.5" />
                      جاري المراجعة
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="size-3.5" />
                      تم الدفع
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Receipt className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">لا توجد فواتير مطابقة</p>
            </div>
          )}
        </div>
      </Card>

      {payingInvoice && (
        <PaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onSubmit={submitPayment}
        />
      )}
    </div>
  )
}

function PaymentModal({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: Invoice
  onClose: () => void
  onSubmit: (
    id: string,
    method: PaymentMethod,
    reference: string,
    senderInfo: string,
  ) => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('انستاباي')
  const [reference, setReference] = useState('')
  const [senderInfo, setSenderInfo] = useState('')
  const [fileName, setFileName] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isInsta = method === 'انستاباي'
  const account = paymentAccounts.find((a) => a.method === method)
  const canSubmit =
    reference.trim().length >= 4 && senderInfo.trim().length >= 4 && fileName !== ''

  function copyAccount() {
    if (account) {
      navigator.clipboard?.writeText(account.account)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="إرسال طلب دفع"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="text-right">
            <h3 className="text-base font-bold text-foreground">دفع فاتورة الكورس</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{invoice.course}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
            <span className="sr-only">إغلاق</span>
          </Button>
        </div>

        {/* المبلغ */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-foreground">المبلغ المطلوب</span>
          <span className="text-xl font-bold text-primary">
            {invoice.amount.toLocaleString('en-US')} ج.م
          </span>
        </div>

        {/* طريقة التحويل */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">اختر طريقة التحويل</p>
          <div className="grid grid-cols-2 gap-2">
            {(['انستاباي', 'فودافون كاش'] as PaymentMethod[]).map((m) => {
              const isInsta = m === 'انستاباي'
              const selected = method === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m)
                    setSenderInfo('')
                  }}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {isInsta ? <CreditCard className="size-4" /> : <Smartphone className="size-4" />}
                  {m}
                </button>
              )
            })}
          </div>
        </div>

        {/* حساب التحويل */}
        {account && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">حوّل المبلغ إلى</p>
              <p className="font-mono text-sm font-semibold text-foreground" dir="ltr">
                {account.account}
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={copyAccount}>
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              {copied ? 'تم النسخ' : 'نسخ'}
            </Button>
          </div>
        )}

        {/* رقم العم��ية */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            رقم العملية / المرجع
          </label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="مثال: IPN-8842301"
            dir="ltr"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left font-mono text-sm text-foreground outline-none transition-colors placeholder:text-right placeholder:font-sans placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* بيانات المُحوِّل: رقم الهاتف (فودافون كاش) أو عنوان انستاباي */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            {isInsta
              ? 'عنوان انستاباي الذي حوّلت منه'
              : 'رقم الهاتف الذي حوّلت منه'}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {isInsta ? <CreditCard className="size-4" /> : <Smartphone className="size-4" />}
            </span>
            <input
              type={isInsta ? 'text' : 'tel'}
              value={senderInfo}
              onChange={(e) => setSenderInfo(e.target.value)}
              placeholder={isInsta ? 'مثال: your.name@instapay' : 'مثال: 010 1234 5678'}
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background py-2 pr-9 pl-3 text-left font-mono text-sm text-foreground outline-none transition-colors placeholder:text-right placeholder:font-sans placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* رفع الإيصال */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            صورة إيصال التحويل
          </label>
          <UploadDropzone
            endpoint="receiptUploader"
            onClientUploadComplete={(res) => {
              if (res && res[0]) {
                setFileName(res[0].url)
              }
            }}
            onUploadError={(error: Error) => {
              alert(`فشل الرفع: ${error.message}`)
            }}
            config={{ mode: "auto" }}
            className="w-full ut-label:text-primary ut-button:bg-primary ut-button:ut-readying:bg-primary/80"
          />
          {fileName && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600">
              <Check className="size-4" /> تم رفع الصورة بنجاح
            </p>
          )}
        </div>

        <Button
          className="mt-5 w-full"
          disabled={!canSubmit}
          onClick={() => onSubmit(invoice.id, method, reference.trim(), senderInfo.trim())}
        >
          إرسال طلب الدفع للمراجعة
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          سيراجع المشرف طلبك ويؤكد الدفع خلال وقت قصير
        </p>
      </div>
    </div>
  )
}
