'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { ImageUploadField } from '@/components/ui/image-upload-field'
import { ScopePicker } from './scope-picker'
import { fieldCls } from './field-styles'
import type { ScopeInput } from './scope-picker'
import type { TreeStage } from '@/app/admin/question-bank/actions'
import { saveBankQuestion, type SaveBankQuestionInput } from '@/app/admin/question-bank/actions'
import { cn } from '@/lib/utils'
import { DIFFICULTY_VALUES, type BankQuestion } from '@/lib/question-bank'

interface QuestionEditorModalProps {
  open:    boolean
  onClose: () => void
  onSaved: () => void
  initial: BankQuestion | null
  tree:    TreeStage[]
  topics:  { id: string; title: string }[]
}

export function QuestionEditorModal({
  open, onClose, onSaved, initial, tree, topics,
}: QuestionEditorModalProps) {
  const [type, setType]               = useState<SaveBankQuestionInput['type']>('mcq')
  const [contentMode, setContentMode] = useState<'text' | 'image'>('text')
  const [text, setText]               = useState('')
  const [imageUrl, setImageUrl]       = useState('')
  const [options, setOptions]         = useState<string[]>(['', ''])
  const [correctAnswer, setCorrect]   = useState<string | null>(null)
  const [modelAnswer, setModel]       = useState('')
  const [points, setPoints]           = useState(1)
  const [difficulty, setDifficulty]   = useState<SaveBankQuestionInput['difficulty']>('medium')
  const [notes, setNotes]             = useState('')
  const [topicInput, setTopicInput]   = useState('')
  const [selectedTopics, setTopics]   = useState<string[]>([])
  const [scopes, setScopes]           = useState<ScopeInput[]>([])
  const [saving, start]               = useTransition()

  useEffect(() => {
    if (!open) return
    if (initial) {
      setType(initial.type as SaveBankQuestionInput['type'])
      setContentMode(initial.contentMode)
      setText(initial.text)
      setImageUrl(initial.imageUrl)
      setOptions(initial.options.length >= 2 ? initial.options : ['', ''])
      setCorrect(initial.correctAnswer)
      setModel(initial.modelAnswer)
      setPoints(initial.points)
      setDifficulty(initial.difficulty)
      setNotes(initial.notes)
      setTopics(initial.topics.map(t => t.title))
      setScopes(initial.scopes.map(s => ({ scopeType: s.scopeType, scopeId: s.scopeId })))
    } else {
      setType('mcq'); setContentMode('text'); setText(''); setImageUrl('')
      setOptions(['', '']); setCorrect(null); setModel(''); setPoints(1)
      setDifficulty('medium'); setNotes(''); setTopics([]); setScopes([])
    }
  }, [open, initial])

  const addOption   = () => setOptions(o => [...o, ''])
  const removeOption = (i: number) => setOptions(o => o.filter((_, idx) => idx !== i))
  const setOption   = (i: number, v: string) => setOptions(o => o.map((x, idx) => idx === i ? v : x))

  const addTopic = () => {
    const t = topicInput.trim()
    if (t && !selectedTopics.includes(t)) setTopics(ts => [...ts, t])
    setTopicInput('')
  }
  const removeTopic = (i: number) => setTopics(ts => ts.filter((_, idx) => idx !== i))

  const handleSave = () =>
    start(async () => {
      const res = await saveBankQuestion({
        id: initial?.id ?? null,
        type, contentMode, text, imageUrl,
        options: options.map(o => o.trim()).filter(Boolean),
        correctAnswer,
        modelAnswer: modelAnswer,
        points, difficulty, notes,
        topics: selectedTopics,
        scopes,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success(initial ? 'تم تحديث السؤال' : 'تم إضافة السؤال')
      onSaved()
      onClose()
    })

  const diffLabel: Record<string, string> = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'تعديل سؤال' : 'سؤال جديد'}
      className="max-w-2xl"
    >
      <div className="space-y-4 text-right">
        {/* Type + ContentMode */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">نوع السؤال</label>
            <select value={type} onChange={e => setType(e.target.value as typeof type)} className={cn(fieldCls, 'py-2')}>
              <option value="mcq">اختيار متعدد</option>
              <option value="essay">مقالي</option>
              <option value="file">ملف</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">صيغة السؤال</label>
            <select value={contentMode} onChange={e => setContentMode(e.target.value as typeof contentMode)} className={cn(fieldCls, 'py-2')}>
              <option value="text">نص</option>
              <option value="image">صورة</option>
            </select>
          </div>
        </div>

        {/* Question text / image */}
        {contentMode === 'text' ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">نص السؤال</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="اكتب السؤال هنا..." className={cn(fieldCls, 'resize-none leading-relaxed')} />
          </div>
        ) : (
          <ImageUploadField value={imageUrl} onChange={setImageUrl} label="صورة السؤال" />
        )}

        {/* MCQ options */}
        {type === 'mcq' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">الخيارات (اضغط الدائرة للإجابة الصحيحة)</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(opt.trim() || null)}
                  className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors', correctAnswer === opt.trim() && opt.trim() ? 'border-green-600 bg-green-600 text-white' : 'border-border')}
                >
                  {correctAnswer === opt.trim() && opt.trim() && <span className="text-xs">✓</span>}
                </button>
                <input value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`الخيار ${i + 1}`} className={cn(fieldCls, 'py-2')} />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="size-3.5" /> إضافة خيار
            </Button>
          </div>
        )}

        {/* Essay model answer */}
        {type === 'essay' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">الإجابة النموذجية (اختياري)</label>
            <textarea value={modelAnswer} onChange={e => setModel(e.target.value)} rows={2} className={cn(fieldCls, 'resize-none leading-relaxed')} />
          </div>
        )}

        {/* Points + Difficulty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">الدرجة</label>
            <input type="number" min={1} max={100} value={points} onChange={e => setPoints(Number(e.target.value) || 1)} className={cn(fieldCls, 'py-2')} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">الصعوبة</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)} className={cn(fieldCls, 'py-2')}>
              {DIFFICULTY_VALUES.map(d => <option key={d} value={d}>{diffLabel[d]}</option>)}
            </select>
          </div>
        </div>

        {/* Topics */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">المواضيع</label>
          <div className="flex gap-2">
            <input
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }}
              placeholder="اكتب موضوعًا ثم Enter..."
              className={cn(fieldCls, 'py-2')}
              list="topic-suggestions"
            />
            <datalist id="topic-suggestions">
              {topics.map(t => <option key={t.id} value={t.title} />)}
            </datalist>
            <Button type="button" variant="outline" size="sm" onClick={addTopic}>إضافة</Button>
          </div>
          {selectedTopics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedTopics.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {t}
                  <button type="button" onClick={() => removeTopic(i)} className="text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Scopes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">النطاقات (الباك‌إند بيوسّعها أوتوماتيك للأعلى)</label>
          <ScopePicker mode="assign" tree={tree} value={scopes} onChange={setScopes} />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">ملاحظات (اختياري)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} className={cn(fieldCls, 'py-2')} placeholder="ملاحظات داخلية..." />
        </div>

        <div className="flex justify-start gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : initial ? 'تحديث السؤال' : 'إضافة السؤال'}
          </Button>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Modal>
  )
}
