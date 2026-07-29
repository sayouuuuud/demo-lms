'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight,
  Check,
  CheckCheck,
  Headset,
  LifeBuoy,
  Loader2,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { type Conversation, type TicketStatus } from '@/lib/student-messages-data'
import {
  sendStudentMessage,
  startConversation,
  markTicketRead,
} from '@/app/student/messages/actions'

export function StudentMessagesPage({
  initialConversations,
}: {
  initialConversations: Conversation[]
}) {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeId, setActiveId] = useState<string>(initialConversations[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [showChatMobile, setShowChatMobile] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => c.subject.toLowerCase().includes(q))
  }, [conversations, query])

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0)

  const selectConversation = (id: string) => {
    setActiveId(id)
    setShowChatMobile(true)
    const convo = conversations.find((c) => c.id === id)
    if (convo && convo.unread > 0) {
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)))
      startTransition(async () => {
        await markTicketRead(id)
        router.refresh()
      })
    }
  }

  const sendMessage = () => {
    const text = draft.trim()
    if (!text || !active) return
    const convoId = active.id
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? {
              ...c,
              lastTime: 'الآن',
              status: 'open',
              messages: [
                ...c.messages,
                { id: `${c.id}-${c.messages.length + 1}`, fromMe: true, text, time: 'الآن' },
              ],
            }
          : c,
      ),
    )
    setDraft('')
    startTransition(async () => {
      const res = await sendStudentMessage(convoId, text)
      if (res?.error) toast.error(res.error)
      else router.refresh()
    })
  }

  // Empty state — no tickets yet.
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageIntro totalUnread={0} onNew={() => setNewOpen(true)} />
        <Card className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-foreground">لا توجد تذاكر بعد</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            عندك استفسار أو مشكلة؟ افتح تذكرة دعم وتواصل مباشرةً مع الأستاذ عبد السلام.
          </p>
          <Button onClick={() => setNewOpen(true)} className="mt-2">
            <Plus className="size-4" />
            تذكرة دعم جديدة
          </Button>
        </Card>

        {newOpen && (
          <NewTicketModal
            onClose={() => setNewOpen(false)}
            onCreated={() => {
              setNewOpen(false)
              router.refresh()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageIntro totalUnread={totalUnread} onNew={() => setNewOpen(true)} />

      <Card className="grid h-[calc(100vh-15rem)] min-h-[520px] grid-cols-1 gap-0 overflow-hidden p-0 md:grid-cols-[320px_1fr]">
        {/* Tickets list */}
        <div
          className={cn(
            'flex min-h-0 flex-col border-l border-border',
            showChatMobile ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في التذاكر..."
                className="h-10 w-full rounded-xl border border-border bg-secondary/60 pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                لا توجد تذاكر مطابقة.
              </p>
            ) : (
              filtered.map((c) => {
                const last = c.messages[c.messages.length - 1]
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-border px-4 py-3 text-right transition-colors hover:bg-secondary/50',
                      c.id === activeId && 'bg-primary/5',
                    )}
                  >
                    <Avatar className="size-11 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {c.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-foreground">
                          {c.subject}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {c.lastTime}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <StatusDot status={c.status} />
                        <span className="truncate text-xs text-muted-foreground">
                          {last ? `${last.fromMe ? 'أنت: ' : ''}${last.text}` : c.name}
                        </span>
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat pane */}
        <div
          className={cn(
            'flex min-h-0 flex-col bg-secondary/20',
            showChatMobile ? 'flex' : 'hidden md:flex',
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground md:hidden"
              onClick={() => setShowChatMobile(false)}
              aria-label="الرجوع للتذاكر"
            >
              <ArrowRight className="size-5" />
            </Button>
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {active.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{active.name}</p>
              <p className="truncate text-xs text-muted-foreground">{active.role}</p>
            </div>
            <StatusBadge status={active.status} />
          </div>

          {/* Subject strip */}
          <div className="border-b border-border bg-card/60 px-4 py-2">
            <p className="truncate text-xs text-muted-foreground">
              الموضوع: <span className="font-semibold text-foreground">{active.subject}</span>
            </p>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-hide p-4">
            {active.messages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.fromMe ? 'justify-start' : 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                    msg.fromMe
                      ? 'rounded-bl-md bg-primary text-primary-foreground'
                      : 'rounded-br-md bg-card text-foreground',
                  )}
                >
                  <p>{msg.text}</p>
                  <span
                    className={cn(
                      'mt-1 flex items-center justify-end gap-1 text-[10px]',
                      msg.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {msg.time}
                    {msg.fromMe &&
                      (msg.time === 'الآن' ? (
                        <Check className="size-3" />
                      ) : (
                        <CheckCheck className="size-3" />
                      ))}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-card p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing &&
                    e.keyCode !== 229
                  ) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                rows={1}
                placeholder="اكتب رسالتك للأستاذ..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
              />
              <Button
                size="icon"
                className="size-11 shrink-0"
                onClick={sendMessage}
                disabled={!draft.trim()}
                aria-label="إرسال"
              >
                <Send className="size-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {newOpen && (
        <NewTicketModal
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function PageIntro({ totalUnread, onNew }: { totalUnread: number; onNew: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Headset className="size-6 text-primary" />
          تذاكر الدعم
        </h1>
        <p className="text-sm text-muted-foreground">
          تواصل مباشرةً مع الأستاذ عبد السلام بخصوص اشتراكاتك أو أي استفسار.
          {totalUnread > 0 && (
            <span className="mr-1 font-semibold text-primary"> لديك {totalUnread} ردود جديدة.</span>
          )}
        </p>
      </div>
      <Button onClick={onNew}>
        <Plus className="size-4" />
        تذكرة جديدة
      </Button>
    </div>
  )
}

function StatusDot({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        'size-2 shrink-0 rounded-full',
        status === 'open' ? 'bg-emerald-500' : 'bg-muted-foreground/40',
      )}
      aria-hidden
    />
  )
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        status === 'open'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {status === 'open' ? 'مفتوحة' : 'مغلقة'}
    </span>
  )
}

function NewTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!text.trim()) {
      toast.error('اكتب رسالتك الأول.')
      return
    }
    setSending(true)
    const res = await startConversation(subject, text)
    setSending(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success('تم فتح التذكرة وإرسالها للأستاذ')
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">تذكرة دعم جديدة</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-foreground">الموضوع</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="مثال: استفسار عن اشتراك"
          className="mb-4 h-11 w-full rounded-xl border border-border bg-secondary/50 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
        />

        <label className="mb-1.5 block text-sm font-semibold text-foreground">رسالتك</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="اكتب استفسارك للأستاذ عبد السلام..."
          className="mb-4 w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
        />

        <div className="flex justify-start gap-2">
          <Button onClick={submit} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            إرسال
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  )
}
