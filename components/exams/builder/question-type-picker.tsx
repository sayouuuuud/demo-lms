'use client'

import { questionTypeMeta, type QuestionType } from '@/lib/exam-builder'

interface QuestionTypePickerProps {
  onPick: (type: QuestionType) => void
}

export function QuestionTypePicker({ onPick }: QuestionTypePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(Object.keys(questionTypeMeta) as QuestionType[]).map((type) => {
        const meta = questionTypeMeta[type]
        const Icon = meta.icon
        return (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-secondary/40 p-4 text-center transition-colors hover:border-primary hover:bg-secondary"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">{meta.label}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {meta.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
