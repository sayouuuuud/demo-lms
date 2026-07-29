import { CalendarProvider } from '@/components/calendar/calendar-context'
import { CalendarPageHeader } from '@/components/calendar/calendar-page-header'
import { CalendarStats } from '@/components/calendar/calendar-stats'
import { CalendarView } from '@/components/calendar/calendar-view'
import { EventFormModal } from '@/components/calendar/event-form-modal'
import { getEvents, getTargetingOptions } from './actions'

export default async function CalendarPage() {
  const [events, targetingOptions] = await Promise.all([
    getEvents(),
    getTargetingOptions(),
  ])

  return (
    <CalendarProvider initialEvents={events} targetingOptions={targetingOptions}>
      <div className="space-y-6">
        <CalendarPageHeader />
        <CalendarStats />
        <CalendarView />
      </div>
      <EventFormModal />
    </CalendarProvider>
  )
}
