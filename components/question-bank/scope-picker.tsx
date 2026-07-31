'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fieldCls } from './field-styles'
import type { ScopeType } from '@/lib/question-bank'
import type { TreeStage } from '@/app/admin/question-bank/actions'

export type ScopeInput = { scopeType: ScopeType; scopeId: string }

interface ScopePickerFilterProps {
  mode: 'filter'
  tree: TreeStage[]
  value: ScopeInput | null
  onChange: (val: ScopeInput | null) => void
  labelMap?: Map<string, string>
}

interface ScopePickerAssignProps {
  mode: 'assign'
  tree: TreeStage[]
  value: ScopeInput[]
  onChange: (val: ScopeInput[]) => void
  labelMap?: Map<string, string>
}

type ScopePickerProps = ScopePickerFilterProps | ScopePickerAssignProps

export function ScopePicker(props: ScopePickerProps) {
  const { tree } = props

  const [stageId, setStageId]     = useState('')
  const [branchId, setBranchId]   = useState('')
  const [courseId, setCourseId]   = useState('')
  const [lectureId, setLectureId] = useState('')

  const stage   = tree.find(s => s.id === stageId)
  const branch  = stage?.branches.find(b => b.id === branchId)
  const course  = branch?.monthlyCourses.find(c => c.id === courseId)

  // All lectures for the selected branch (course lectures + loose lectures)
  const allLectures = branch
    ? [
        ...(courseId ? (course?.lectures ?? []) : branch.monthlyCourses.flatMap(c => c.lectures)),
        ...branch.looseLectures,
      ]
    : []

  const deepestScope = (): ScopeInput | null => {
    if (lectureId)  return { scopeType: 'lecture',        scopeId: lectureId }
    if (courseId)   return { scopeType: 'monthly_course', scopeId: courseId }
    if (branchId)   return { scopeType: 'branch',         scopeId: branchId }
    if (stageId)    return { scopeType: 'stage',          scopeId: stageId }
    return null
  }

  // Emit scope for filter mode
  useEffect(() => {
    if (props.mode !== 'filter') return
    props.onChange(deepestScope())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, branchId, courseId, lectureId])

  const handleStageChange = (id: string) => {
    setStageId(id); setBranchId(''); setCourseId(''); setLectureId('')
  }
  const handleBranchChange = (id: string) => {
    setBranchId(id); setCourseId(''); setLectureId('')
  }
  const handleCourseChange = (id: string) => {
    setCourseId(id); setLectureId('')
  }

  const handleAdd = () => {
    if (props.mode !== 'assign') return
    const scope = deepestScope()
    if (!scope) return
    const already = (props.value as ScopeInput[]).some(
      s => s.scopeType === scope.scopeType && s.scopeId === scope.scopeId,
    )
    if (!already) props.onChange([...(props.value as ScopeInput[]), scope])
    handleStageChange('')
  }

  const removeScope = (idx: number) => {
    if (props.mode !== 'assign') return
    const next = [...(props.value as ScopeInput[])]
    next.splice(idx, 1)
    props.onChange(next)
  }

  const scopeTypeLabel: Record<ScopeType, string> = {
    stage: 'سنة', branch: 'فرع', monthly_course: 'كورس', lecture: 'محاضرة',
  }

  const resolveLabel = (s: ScopeInput): string => {
    if (props.labelMap?.has(s.scopeId)) return props.labelMap.get(s.scopeId)!
    // Fallback: search tree
    for (const st of tree) {
      if (st.id === s.scopeId) return st.title
      for (const br of st.branches) {
        if (br.id === s.scopeId) return br.title
        for (const co of br.monthlyCourses) {
          if (co.id === s.scopeId) return co.title
          for (const lc of co.lectures) if (lc.id === s.scopeId) return lc.title
        }
        for (const lc of br.looseLectures) if (lc.id === s.scopeId) return lc.title
      }
    }
    return s.scopeId.slice(0, 8) + '…'
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={stageId} onChange={e => handleStageChange(e.target.value)} className={cn(fieldCls, 'py-2')}>
          <option value="">كل السنوات</option>
          {tree.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>

        <select value={branchId} onChange={e => handleBranchChange(e.target.value)} disabled={!stageId} className={cn(fieldCls, 'py-2')}>
          <option value="">كل الفروع</option>
          {stage?.branches.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>

        <select value={courseId} onChange={e => handleCourseChange(e.target.value)} disabled={!branchId} className={cn(fieldCls, 'py-2')}>
          <option value="">كل الكورسات</option>
          {branch?.monthlyCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        <select value={lectureId} onChange={e => setLectureId(e.target.value)} disabled={!branchId} className={cn(fieldCls, 'py-2')}>
          <option value="">كل المحاضرات</option>
          {allLectures.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>

      {props.mode === 'assign' && (
        <>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!deepestScope()}
            className="rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + أضف النطاق المحدد
          </button>

          {(props.value as ScopeInput[]).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(props.value as ScopeInput[]).map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                >
                  <span className="text-muted-foreground">{scopeTypeLabel[s.scopeType]}:</span>
                  {resolveLabel(s)}
                  <button type="button" onClick={() => removeScope(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
