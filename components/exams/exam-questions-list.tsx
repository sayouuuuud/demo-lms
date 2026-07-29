'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CheckCircle2, HelpCircle } from 'lucide-react'
import type { ExamQuestion } from '@/app/admin/exams/[id]/actions'
import { cn } from '@/lib/utils'

export function ExamQuestionsList({ questions }: { questions: ExamQuestion[] }) {
  if (questions.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
        <HelpCircle className="size-8 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">لا توجد أسئلة</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          لم يتم إضافة أي أسئلة لهذا الاختبار حتى الآن. يمكنك إضافة أسئلة جديدة من خلال صفحة التعديل.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <Card key={question.id} className="overflow-hidden">
          <CardHeader className="bg-muted/30 border-b px-4 py-3 flex flex-row items-start justify-between space-y-0 gap-4">
            <div className="flex items-start gap-3">
              <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 text-primary font-medium text-xs">
                {index + 1}
              </span>
              <h3 className="font-medium text-sm leading-6 mt-0.5">
                {question.text}
              </h3>
            </div>
            <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {question.points} {question.points === 1 ? 'درجة' : 'درجات'}
            </span>
          </CardHeader>

          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {question.options.map((option, optIdx) => {
                const isCorrect = option === question.correctAnswer
                return (
                  <div
                    key={optIdx}
                    className={cn(
                      'flex items-center justify-between rounded-md border p-3 text-sm',
                      isCorrect
                        ? 'border-success/50 bg-success/10 text-success font-medium'
                        : 'border-border bg-background text-muted-foreground'
                    )}
                  >
                    <span className="leading-relaxed">{option}</span>
                    {isCorrect && (
                      <CheckCircle2 className="size-4 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
