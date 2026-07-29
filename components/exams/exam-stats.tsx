'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, Activity, HelpCircle } from 'lucide-react'
import type { ExamDetailsData } from '@/app/admin/exams/[id]/actions'

export function ExamStats({ data }: { data: ExamDetailsData }) {
  const passedCount = data.submissions.filter((s) => (s.score / s.total) * 100 >= 50).length
  const passRate = data.participants > 0 ? Math.round((passedCount / data.participants) * 100) : 0

  const stats = [
    {
      title: 'متوسط الدرجات',
      value: data.avgScore > 0 ? `${data.avgScore}%` : '-',
      icon: Target,
    },
    {
      title: 'نسبة النجاح',
      value: data.participants > 0 ? `${passRate}%` : '-',
      icon: Activity,
    },
    {
      title: 'عدد المشاركين',
      value: data.participants.toLocaleString('ar-EG'),
      icon: Users,
    },
    {
      title: 'عدد الأسئلة',
      value: data.questionsCount,
      icon: HelpCircle,
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 font-sans">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-sans">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
