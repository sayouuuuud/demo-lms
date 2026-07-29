'use client'

import { useMemo, useState, useTransition } from 'react'
import { Search, Send, ArrowRight, CheckCheck, Lock, LockOpen, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/get-initials'
import { type Conversation, type ChatMessage, type TicketStatus } from '@/lib/messages-data'
import {
  markAsRead,
  markAllAsRead,
  replyToConversation,
  setTicketStatus,
} from '@/app/admin/messages/actions'

type Filter = 'all' | 'open' | 'closed'

export function MessagesInbox({ initialConversations }: { initialConversations: Conversation[] }) {
  const router = useRouter()
  const [chats, setChats] = useState<Conversation[]>(initialConversations)
  const [activeId, setActiveId] = useState<string>(initialConversations[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showChat, setShowChat] = useState(false)
  const [isPending, startTransition] = useTransition()

  const active = chats.find((c) => c.id === activeId)

  const counts = useMemo(
    () => ({
      all: chats.length,
      open: chats.filter((c) => c.status === 'open').length,
      closed: chats.filter((c) => c.status === 'closed').length,
    }),
    [chats],
  )

  const totalUnread = useMemo(() => chats.reduce((a, c) => a + c.unread, 0), [chats])

  const filtered = useMemo(() => {
    const q = query.trim()
    return chats.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false
      if (!q) return true
      return c.name.includes(q) || c.subject.includes(q) || c.preview.includes(q)
    })
  }, [chats, filter, query])

  async function selectChat(id: string) {
    setActiveId(id)
    setShowChat(true)
    const chat = chats.find((c) => c.id === id)
    if (chat && chat.unread > 0) {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)))
      await markAsRead(id)
      router.refresh()
    }
  }

  async function sendMessage() {
    const text = draft.trim()
    if (!text || !active) return

    const newMsg: ChatMessage = { id: `temp-${Date.now()}`, fromMe: true, text, time: 'الآن' }
    const original = chats
    setChats((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? { ...c, messages: [...c.messages, newMsg], preview: text, time: 'الآن', status: 'open' }
          : c,
      ),
    )
    setDraft('')

    const res = await replyToConversation(active.id, text)
    if (res?.error) {
      toast.error(res.error)
      setChats(original)
    } else {
      router.refresh()
    }
  }

  function toggleStatus() {
    if (!active) return
    const next: TicketStatus = active.status === 'open' ? 'closed' : 'open'
    setChats((prev) => prev.map((c) => (c.id === active.id ? { ...c, status: next } : c)))
    startTransition(async () => {
      const res = await setTicketStatus(active.id, next)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(next === 'closed' ? 'تم إغلاق التذكرة' : 'تمت إعادة فتح التذكرة')
        router.refresh()
      }
    })
  }

  function handleMarkAll() {
    setChats((prev) => prev.map((c) => ({ ...c, unread: 0 })))
    startTransition(async () => {
      await markAllAsRead()
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs + bulk action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">الكل ({counts.all})</TabsTrigger>
            <TabsTrigger value="open">مفتوحة ({counts.open})</TabsTrigger>
            <TabsTrigger value="closed">مغلقة ({counts.closed})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" onClick={handleMarkAll} disabled={totalUnread === 0 || isPending}>
          <CheckCheck className="size-4" />
          تعليم الكل كمقروء
        </Button>
      </div>

      <Card className="grid h-[calc(100vh-18rem)] min-h-[480px] grid-cols-1 overflow-hidden p-0 md:grid-cols-[20rem_1fr]">
        {/* Ticket list */}
        <div
          className={cn(
            'flex min-h-0 flex-col border-l border-border bg-card',
            showChat ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في التذاكر..."
                className="pr-9"
              />
            </div>
          </div>

          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {filtered.map((c) => {
              const isActive = c.id === activeId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectChat(c.id)}
                    className={cn(
                      'flex w-full items-start gap-3 p-4 text-right transition-colors hover:bg-muted/50',
                      isActive && 'bg-primary/5',
                    )}
                  >
                    <Avatar className="size-11 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          {c.time}
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <StatusDot status={c.status} />
                        <span className="truncate text-xs font-medium text-foreground/80">
                          {c.subject}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.preview}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">لا توجد تذاكر مطابقة</li>
            )}
          </ul>
        </div>

        {/* Chat panel */}
        <div className={cn('flex min-h-0 flex-col bg-muted/20', showChat ? 'flex' : 'hidden md:flex')}>
          {active ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-card p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChat(false)}
                    className="md:hidden"
                  >
                    <ArrowRight className="size-5" />
                    <span className="sr-only">رجوع</span>
                  </Button>
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {getInitials(active.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">{active.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{active.subject}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={active.status} />
                  <Button variant="outline" size="sm" onClick={toggleStatus} disabled={isPending}>
                    {active.status === 'open' ? (
                      <>
                        <Lock className="size-4" />
                        إغلاق
                      </>
                    ) : (
                      <>
                        <LockOpen className="size-4" />
                        إعادة فتح
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {active.messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.fromMe ? 'justify-start' : 'justify-end')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        m.fromMe
                          ? 'rounded-bl-sm bg-primary text-primary-foreground'
                          : 'rounded-br-sm bg-card text-foreground shadow-sm',
                      )}
                    >
                      <p>{m.text}</p>
                      <p
                        className={cn(
                          'mt-1 text-[10px]',
                          m.fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {m.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              <div className="border-t border-border bg-card p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex items-end gap-2"
                >
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
                    placeholder="اكتب ردّك على الطالب..."
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="size-11 shrink-0"
                    disabled={!draft.trim()}
                  >
                    <Send className="size-5" />
                    <span className="sr-only">إرسال</span>
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              اختر تذكرة لعرضها
            </div>
          )}
        </div>
      </Card>
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        status === 'open'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {status === 'open' ? 'مفتوحة' : 'مغلقة'}
    </span>
  )
}
