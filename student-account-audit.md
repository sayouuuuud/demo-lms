# Student Account — Interfaces, Mock Data & State Audit

---

## 1. TypeScript Interfaces & Types

### 1.1 Profile & Dashboard (`lib/student-data.ts`)

```ts
type CourseProgress = {
  id: string
  title: string
  instructor: string
  image: string
  category: string
  completedLessons: number
  totalLessons: number
  nextLesson: string
}

type ScheduleItem = {
  id: string
  title: string
  course: string
  type: 'محاضرة' | 'اختبار' | 'واجب' | 'مراجعة'
  day: string
  date: string
  time: string
}

type GradeItem = {
  id: string
  title: string
  course: string
  score: number
  total: number
  date: string
}

type Certificate = {
  id: string
  title: string
  issuer: string
  date: string
}

type Announcement = {
  id: string
  title: string
  text: string
  time: string
  course: string
}
```

### 1.2 Courses & Lessons (`lib/student-courses-data.ts`)

```ts
type LessonType = 'فيديو' | 'مقال' | 'تمرين'

type Lesson = {
  id: string
  lessonId?: string        // UUID in DB — used to save progress
  title: string
  type: LessonType
  duration: string
  completed: boolean
  locked: boolean
  videoUrl?: string
  description?: string
}

type Section = {
  id: string
  title: string
  lessons: Lesson[]
  assignment?: Assignment
  items?: CourseItem[]     // ordered list overriding lessons + assignment
}

type AssignmentStatus = 'لم يبدأ' | 'قيد التنفيذ' | 'تم التسليم' | 'مصحّح'
type AssignmentType   = 'تسليم' | 'اختبار'
type QuestionKind     = 'mcq' | 'essay' | 'file'

type QuizQuestion = {
  id: string
  kind: QuestionKind
  question: string
  options: string[]
  correctIndex: number
}

type Assignment = {
  id: string
  courseId: string
  sectionId?: string
  type: AssignmentType
  title: string
  description: string
  instructions: string[]
  dueDate: string
  points: number
  score?: number
  status: AssignmentStatus
  attachments: { name: string; size: string }[]
  questions?: QuizQuestion[]
  locked?: boolean
}

// Union item in a course content stream
type CourseItem =
  | { kind: 'lesson';     lesson: Lesson;         sectionId: string }
  | { kind: 'assignment'; assignment: Assignment; sectionId: string }

type CourseDetail = CourseProgress & {
  description: string
  rating: number
  studentsCount: number
  durationHours: number
  level: string
  lastUpdated: string
  sections: Section[]
  whatYouLearn: string[]
}
```

### 1.3 Exams (`lib/student-exams-data.ts`)

```ts
type ExamStatus = 'متاح' | 'قادم' | 'مكتمل'

type ExamQuestion = {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

type Exam = {
  id: string
  title: string
  course: string
  courseId: string
  instructor: string
  category: string
  description: string
  instructions: string[]
  date: string
  time: string
  durationMinutes: number
  totalPoints: number
  passingPercent: number
  status: ExamStatus
  score?: number           // only on completed exams
  topics: string[]
  questions: ExamQuestion[]
}
```

### 1.4 Live Exams — Server Actions (`app/student/exams/actions.ts`)

```ts
type StudentExamQuestion = {
  id: string
  type: 'mcq' | 'essay' | 'file'
  contentMode: 'text' | 'image'
  text: string
  imageUrl: string | null
  points: number
  options: string[]
}

type StudentAnswerReview = {
  questionId: string
  awardedPoints: number
  isCorrect: boolean | null
  needsManual: boolean
  selectedOption: string | null
  answerText: string | null
  fileUrl: string | null
  correctAnswer: string | null
  modelAnswer: string | null
}

type StudentExam = {
  code: string
  title: string
  course: string | null
  description: string | null
  durationMinutes: number
  passMark: number
  totalPoints: number
  questions: StudentExamQuestion[]
  submission: {
    score: number
    total: number
    status: string
    gradingStatus: 'graded' | 'pending'
    submittedAt: string
    answers: StudentAnswerReview[]
  } | null
}

type SubmitAnswer = {
  questionId: string
  selectedOption?: string | null
  answerText?: string | null
  fileUrl?: string | null
}
```

### 1.5 Billing (`lib/student-billing-data.ts`)

```ts
type InvoiceStatus  = 'غير مدفوعة' | 'قيد المراجعة' | 'مدفوعة' | 'مرفوضة'
type PaymentMethod  = 'انستاباي' | 'فودافون كاش'

type Invoice = {
  id: string
  course: string
  instructor: string
  amount: number
  issuedAt: string
  dueDate: string
  status: InvoiceStatus
  method?: PaymentMethod
  reference?: string
  senderInfo?: string
  submittedAt?: string
  rejectionReason?: string
}
```

### 1.6 Messages (`lib/student-messages-data.ts`)

```ts
type TicketStatus = 'open' | 'closed'

type ChatMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

type Conversation = {
  id: string           // ticket code
  name: string         // teacher display name
  role: string
  initials: string
  avatar?: string
  subject: string
  status: TicketStatus
  lastTime: string
  unread: number
  messages: ChatMessage[]
}
```

### 1.7 Notifications (`lib/student-notifications-data.ts`)

```ts
type NotificationType =
  | 'lesson' | 'exam' | 'assignment'
  | 'grade' | 'message' | 'certificate' | 'system'

type Notification = {
  id: string
  type: NotificationType
  title: string
  text: string
  time: string
  read: boolean
}
```

### 1.8 Schedule (`lib/student-schedule-data.ts`)

```ts
type ScheduleEventType = 'محاضرة' | 'اختبار' | 'واجب' | 'مراجعة' | 'مباشر'

type ScheduleEvent = {
  id: string
  title: string
  date: string         // yyyy-mm-dd
  time: string         // HH:mm
  type: ScheduleEventType
  course: string
  instructor?: string
  duration?: number    // minutes
  location?: string
}
```

### 1.9 Real Lectures Data-Layer (`lib/student-lectures-data.ts`)

Internal types used when mapping DB rows to `CourseDetail`:

```ts
// Internal DB row shapes (not exported to UI)
type AssignmentRow = {
  id: string; code: string; type: string | null; title: string
  description: string | null; instructions: string[] | null
  points: number | null; sort_order?: number | null
  assignment_questions: {
    id: string; kind: string | null; question: string
    options: string[]; correct_index: number; position: number | null
  }[]
}

type LectureRow = {
  id: string; slug: string; title: string; description: string | null
  image?: string | null
  branches: { title: string | null; image: string | null; stages: { title: string | null } | null } | null
  lessons: {
    id: string; slug: string; title: string; duration: string | null
    is_free: boolean; sort_order: number | null; video_url: string | null; description: string | null
  }[]
  assignments?: AssignmentRow[]
}

// Per-student progress loaded before building CourseDetail
type Progress = {
  completedLessonIds: Set<string>
  assignmentStatus: Map<string, { status: AssignmentStatus; score: number | null }>
}
```

### 1.10 Context (`components/student/student-context.tsx`)

```ts
type StudentData = {
  profile: any
  enrolledCourses?: any[]
  schedule?: any[]
  grades?: any[]
  announcements?: any[]
  activity?: any[]
}
```

---

## 2. Mock / Seed Data (all in `lib/`)

| Variable | File | Description |
|---|---|---|
| `studentProfile` | `student-data.ts` | Hardcoded profile: name, email, id, gender |
| `enrolledCourses` | `student-data.ts` | 4 courses (c1–c4) with static progress numbers |
| `upcomingSchedule` | `student-data.ts` | 4 items with hardcoded days/dates |
| `recentGrades` | `student-data.ts` | 4 graded items with hardcoded scores |
| `certificates` | `student-data.ts` | 2 certificates |
| `announcements` | `student-data.ts` | 3 announcements |
| `learningActivity` | `student-data.ts` | 7-day hours array |
| `courseDetails` | `student-courses-data.ts` | Derived from `enrolledCourses` + `buildSections()` |
| `assignments` | `student-courses-data.ts` | 6 assignments across 4 courses, some with MCQ questions |
| `exams` | `student-exams-data.ts` | 4 exams with full question sets |
| `studentInvoices` | `student-billing-data.ts` | 5 invoices across all statuses |
| `paymentAccounts` | `student-billing-data.ts` | 2 accounts (Instapay, Vodafone Cash) |
| `notifications` | `student-notifications-data.ts` | 9 notifications across all types |
| `scheduleEvents` | `student-schedule-data.ts` | 12 events built with `relativeDate()` offsets |

---

## 3. Server Actions (Real API)

### `app/student/actions.ts`

| Function | Purpose |
|---|---|
| `getStudentProfile()` | Reads `profiles` + `students` for the logged-in user |
| `getStudentEnrolledCourses()` | Wraps `getPurchasedCourses()` into `CourseProgress` shape |
| `getStudentUpcomingSchedule()` | `calendar_events` filtered by stage + branches + lectures (5 items) |
| `getStudentFullSchedule()` | Same filter, all future events |
| `getStudentRecentGrades()` | `assignment_submissions` where `status = 'مصحّح'` (5 items) |
| `getStudentCertificates()` | `certificates` table for current student |
| `getStudentInvoices()` | `payments` table mapped to `Invoice` shape |
| `resubmitPayment(code, method, reference)` | Updates payment proof after rejection |
| `trackStudentDevice()` | Called once on portal mount (device/session tracking) |

### `app/student/exams/actions.ts`

| Function | Purpose |
|---|---|
| `getStudentExam(code)` | Loads published exam + prior submission if any |
| `submitExam(code, answers)` | Persists attempt; auto-grades MCQ, flags essay/file as `pending` |

### `app/student/progress/actions.ts`

| Function | Purpose |
|---|---|
| `markLessonComplete(lessonId, courseSlug?)` | Upserts `student_content_progress` with `status='completed'` |
| `submitAssignmentProgress(assignmentId, payload)` | Upserts assignment status + optional score |

### `app/student/messages/actions.ts`

| Function | Purpose |
|---|---|
| `getStudentConversations()` | Reads student's tickets from `messages` (scoped by `student_id`) |
| `startConversation(subject, text)` | Creates a new support ticket |
| `sendStudentMessage(code, text)` | Appends message to `chat_history`, bumps `unread_count` |
| `markTicketRead(code)` | Resets `student_unread` to 0 |

### `lib/student-lectures-data.ts` (server-only)

| Function | Purpose |
|---|---|
| `getPurchasedCourses()` | All approved-order lectures → `CourseDetail[]` with live progress |
| `getPurchasedCourseDetail(slug)` | Single lecture by slug |
| `getPurchasedAssignment(assignmentId)` | Assignment with ownership check |
| `getPurchasedLesson(courseSlug, lessonSlug)` | Lesson + neighbours for the player |

---

## 4. UI State (per page)

### Courses page
```ts
const [search, setSearch] = useState('')
const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all')
```

### Lesson player
```ts
const [completed, setCompleted]   // optimistic lesson-complete flag
const [saving, setSaving]         // in-flight markLessonComplete call
const [current, setCurrent]       // active lesson index
```

### Exams page
```ts
const [filter, setFilter] = useState<ExamStatus | 'الكل'>('الكل')
```

### Exam detail
```ts
const [phase, setPhase]           // 'intro' | 'exam' | 'result'
const [answers, setAnswers]       // Map<questionId, selectedOption>
const [timeLeft, setTimeLeft]     // seconds countdown
const [submitting, setSubmitting]
```

### Assignments page
```ts
const [filter, setFilter] = useState<AssignmentStatus | 'الكل'>('الكل')
```

### Assignment detail
```ts
const [answers, setAnswers]       // Map<questionId, string>
const [submitting, setSubmitting]
const [submitted, setSubmitted]
```

### Billing
```ts
const [filter, setFilter]           // InvoiceStatus | 'الكل'
const [activeInvoice, setActiveInvoice]
const [payModal, setPayModal]
const [method, setMethod]           // PaymentMethod
const [reference, setReference]
const [submitting, setSubmitting]
```

### Messages
```ts
const [active, setActive]           // active Conversation | null
const [conversations, setConversations]
const [input, setInput]
const [sending, setSending]
const [newSubject, setNewSubject]
const [newMessage, setNewMessage]
const [creating, setCreating]
```

### Schedule
```ts
const [view, setView]               // 'week' | 'month' | 'list'
const [currentDate, setCurrentDate] // active Date
const [selectedDay, setSelectedDay] // Date | null
```

### Settings
```ts
const [name, setName]
const [email, setEmail]
const [phone, setPhone]
const [avatarUrl, setAvatarUrl]
const [uploading, setUploading]
const [saving, setSaving]
```

---

## 5. Key Gaps (mock → real)

| Area | Current State | What's Needed |
|---|---|---|
| `StudentContext.StudentData` | All fields typed as `any` | Replace with proper interfaces from sections 1.x |
| Dashboard data | Falls back to mock arrays when DB is empty | Wire all fields to real server actions |
| Notifications | Fully mock (`student-notifications-data.ts`) | Server action reading `notifications` table |
| Announcements | Fully mock (`student-data.ts`) | Server action reading `announcements` table |
| Lesson `type` | Hardcoded `'فيديو'` in `mapOneLesson()` | Read from `lessons.content_type` column |
| Assignment `dueDate` | Empty string from DB mapper | Add `due_date` column to `assignments` table |
| `CourseDetail.instructor` | Hardcoded `'أ. عبد السلام'` | Join to instructor profile |
| `CourseDetail.studentsCount` | Always `0` | Aggregate from `orders` table |
