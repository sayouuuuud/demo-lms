import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Hash } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getAssignmentDetail } from '../actions'
import { AssignmentSubmissionsTable } from '@/components/assignments/assignment-submissions-table'
import { AssignmentDueDateEditor } from '@/components/assignments/assignment-due-date-editor'

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getAssignmentDetail(id)
  if (!data) notFound()

  const breadcrumb = [data.stageTitle, data.branchTitle, data.courseTitle, data.lectureTitle]
    .filter((p) => p && p !== '—' && p !== 'غير مرتبط')
    .join(' › ')

  const kpis = [
    { label: 'المستحقّون', value: data.eligible },
    { label: 'سلّموا', value: data.submitted },
    { label: 'متأخرين', value: data.late },
    { label: 'محتاج تصحيح', value: data.needsGrading },
  ]

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        العودة للواجبات
      </Link>

      {/* Header card */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{data.title}</h1>
              <Badge
                variant="outline"
                className={
                  data.type === 'اختبار'
                    ? 'border-warning/40 text-warning'
                    : 'border-primary/40 text-primary'
                }
              >
                {data.type}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="size-3.5" />
                {data.code}
              </span>
              {breadcrumb && <span>{breadcrumb}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm sm:text-right">
            <div>
              <p className="text-xs text-muted-foreground">الدرجة الكلية</p>
              <p className="font-bold text-foreground">{data.points} درجة</p>
            </div>
            <AssignmentDueDateEditor
              assignmentId={data.id}
              dueDate={data.dueDate}
              dueDateLabel={data.dueDateLabel}
            />
          </div>
        </div>

        {data.description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{data.description}</p>
        )}
        {data.instructions.length > 0 && (
          <ul className="mt-3 space-y-1 list-disc list-inside text-sm text-muted-foreground">
            {data.instructions.map((ins, i) => (
              <li key={i}>{ins}</li>
            ))}
          </ul>
        )}
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 text-center gap-1">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Questions (for اختبار type) */}
      {data.type === 'اختبار' && data.questions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-base font-bold text-foreground mb-4">الأسئلة</h2>
          <ol className="space-y-4">
            {data.questions.map((q, i) => (
              <li key={q.id} className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-primary ml-1">{i + 1}.</span>
                  {q.question}
                </p>
                {q.options.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <li
                        key={oi}
                        className={
                          oi === q.correctIndex
                            ? 'flex items-center gap-1.5 text-sm font-medium text-primary'
                            : 'flex items-center gap-1.5 text-sm text-muted-foreground'
                        }
                      >
                        {oi === q.correctIndex && <Check className="size-3.5 shrink-0" />}
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Submissions table */}
      <AssignmentSubmissionsTable
        assignmentId={data.id}
        points={data.points}
        submissions={data.submissions}
      />
    </div>
  )
}
