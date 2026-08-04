import { Suspense } from 'react'
import { OrdersManager } from '@/components/payments/orders-manager'
import { getOrders } from './orders-actions'

export default async function PaymentsPage() {
  const orders = await getOrders()

  return (
    <div className="space-y-6">
      <div className="text-right">
        <h2 className="text-2xl font-bold text-foreground">الطلبات</h2>
      </div>
      {/* OrdersManager بيقرا ?status من الـ URL، فمحتاج Suspense boundary */}
      <Suspense fallback={null}>
        <OrdersManager initialOrders={orders} />
      </Suspense>
    </div>
  )
}
