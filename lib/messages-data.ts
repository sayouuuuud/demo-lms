export type ChatMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

export type TicketStatus = 'open' | 'closed'

// Admin-side view of a support ticket (one row in the `messages` table).
export type Conversation = {
  /** ticket code */
  id: string
  /** student display name */
  name: string
  /** ticket subject */
  subject: string
  /** last message preview */
  preview: string
  /** relative time label */
  time: string
  /** messages from the student the admin hasn't read yet */
  unread: number
  /** ticket lifecycle status */
  status: TicketStatus
  messages: ChatMessage[]
}
