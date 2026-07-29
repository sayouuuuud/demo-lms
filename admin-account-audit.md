# Admin Account Audit

---

## 1. TypeScript Interfaces & Types

### `lib/students-data.ts`
```ts
type StudentStatus = 'نشط' | 'غير نشط' | 'موقوف'
type StudentGender = 'ذكر' | 'أنثى'

type StudentRecord = {
  id: string
  name: string
  email: string
  phone: string
  gender: StudentGender
  avatar?: string
  courses: number
  progress: number
  spent: string
  status: StudentStatus
  joinedAt: string
}
```

### `lib/courses-data.ts`
```ts
type CourseStatus = 'منشور' | 'مسودة' | 'مؤرشف'
type CourseLevel  = 'مبتدئ' | 'متوسط' | 'متقدم'
type LessonType   = 'درس' | 'واجب'

type LessonRecord = {
  id: string; order: number; title: string; type: LessonType
  duration: string; meta: string; published: boolean
}

type CourseRecord = {
  id: string; title: string; instructor: string; category: string
  level: CourseLevel; students: number; lessons: number
  durationHours: number; rating: number; price: string
  status: CourseStatus; image: string
}
```

### `app/admin/courses/actions.ts`
```ts
type AdminLesson = {
  id: string; slug: string; title: string; duration: string
  isFree: boolean; sortOrder: number
  videoUrl: string | null; description: string | null
}

type AdminLecture = {
  id: string; slug: string; title: string; description: string
  price: number; oldPrice: number | null; badge: string | null
  image: string | null; sortOrder: number; releaseDate: string | null
  branchId: string; branchTitle: string
  stageId: string; stageTitle: string
  lessons: AdminLesson[]
}

type BranchOption = { id: string; title: string; stageId: string; stageTitle: string }

type LectureInput = {
  branchId: string; title: string; description: string
  price: number; oldPrice: number | null; badge: string | null
  image?: string | null; releaseDate?: string | null
}

type LessonInput = {
  title: string; duration: string; isFree: boolean
  videoUrl?: string | null; description?: string | null
}
```

### `lib/exams-data.ts`
```ts
type ExamStatus = 'منشور' | 'مسودة' | 'منتهي'

type ExamRecord = {
  id: string; title: string; course: string; questions: number
  duration: number; participants: number; avgScore: number
  status: ExamStatus; createdAt: string
}
```

### `app/admin/exams/[id]/actions.ts`
```ts
type ExamQuestion = {
  id: string; text: string; options: string[]
  correctAnswer: string; points: number
}

type ExamSubmissionDetail = {
  id: string; studentId: string; studentName: string; studentCode: string
  score: number; total: number; status: string
  gradingStatus: 'graded' | 'pending'; submittedAt: string
}

type ExamDetailsData = {
  id: string; code: string; title: string; course: string
  duration: number; questionsCount: number; participants: number
  avgScore: number; status: string; createdAt: string
  questions: ExamQuestion[]
  submissions: ExamSubmissionDetail[]
}
```

### `lib/exam-builder.ts`
```ts
type QuestionType        = 'mcq' | 'essay' | 'file'
type QuestionContentMode = 'text' | 'image'

type McqOption = { id: string; text: string }

type Question = {
  id: string; type: QuestionType; contentMode: QuestionContentMode
  text: string; imageUrl: string; points: number
  options: McqOption[]; correctOptionId: string | null
  multipleAnswers: boolean; modelAnswer: string
  wordLimit: number | null; allowedTypes: string[]
  maxFileSizeMb: number; required: boolean
}

type ExamMeta = {
  title: string; course: string; description: string
  duration: number; passMark: number; shuffle: boolean
  branchId: string | null
}
```

### `lib/payments-data.ts`
```ts
type PaymentMethod = 'انستاباي' | 'فودافون كاش'
type PaymentStatus = 'قيد المراجعة' | 'مقبول' | 'مرفوض'

type PaymentRecord = {
  id: string; studentName: string; studentEmail: string; studentPhone: string
  course: string; amount: number; method: PaymentMethod
  receiptUrl: string; reference: string; submittedAt: string; status: PaymentStatus
}
```

### `app/admin/payments/orders-actions.ts`
```ts
type OrderStatus = 'pending' | 'approved' | 'rejected'

type AdminOrderItem = { title: string; branchTitle: string; stageTitle: string; price: number }

type AdminOrder = {
  id: string; code: string; studentId: string; studentName: string
  studentEmail: string; studentPhone: string; method: string
  reference: string; note: string; receiptUrl: string
  total: number; status: OrderStatus; createdAt: string
  items: AdminOrderItem[]
}
```

### `lib/messages-data.ts`
```ts
type ChatMessage = { id: string; fromMe: boolean; text: string; time: string }
type TicketStatus = 'open' | 'closed'

type Conversation = {
  id: string; name: string; subject: string; preview: string
  time: string; unread: number; status: TicketStatus
  messages: ChatMessage[]
}
```

### `lib/notifications-data.ts`
```ts
type NotificationType = 'طالب' | 'دفع' | 'اختبار' | 'كورس' | 'رسالة' | 'نظام'

type NotificationRecord = {
  id: string; type: NotificationType; title: string
  description: string; time: string; read: boolean
}
```

### `lib/calendar-data.ts`
```ts
type CalendarEventType = 'محاضرة' | 'اختبار' | 'موعد تسليم' | 'اجتماع' | 'حدث مخصص'

type CalendarEvent = {
  id: string; title: string; date: string; time: string
  type: CalendarEventType; course?: string; description?: string
  custom?: boolean
  stageId?: string | null; branchId?: string | null; lectureId?: string | null
}
```

### `components/calendar/calendar-context.tsx`
```ts
type EventFormValues = {
  title: string; date: string; time: string; type: CalendarEventType
  course?: string; description?: string
}

type TargetingOptions = {
  stages:   { id: string; title: string }[]
  branches: { id: string; stage_id: string; title: string }[]
  lectures: { id: string; branch_id: string; title: string }[]
}
```

### `lib/coupons-data.ts`
```ts
type CouponStatus = 'نشط' | 'منتهي' | 'متوقف'
type CouponType   = 'نسبة مئوية' | 'مبلغ ثابت'
type CouponScope  = 'all' | 'lectures'

type CouponRecord = {
  id: string; code: string; description: string; type: CouponType
  value: number; used: number; limit: number
  startDate: string; endDate: string; status: CouponStatus
  scope?: CouponScope
}
```

### `app/admin/categories/actions.ts`
```ts
type AdminBranch = {
  id: string; slug: string; title: string; description: string
  image: string; topics: string[]; sortOrder: number; lectureCount: number
}

type AdminStage = {
  id: string; slug: string; idx: string; title: string; subtitle: string
  rows: string[]; image: string; sortOrder: number; branches: AdminBranch[]
}

type StageInput  = { title: string; subtitle: string; idx: string; rows: string[]; image: string }
type BranchInput = { stageId: string; title: string; description: string; topics: string[]; image: string }
```

### `lib/categories-data.ts` (mock only — UI icons included as type)
```ts
type CategoryStatus = 'مفعّل' | 'متوقف'

type CategoryRecord = {
  id: string; name: string; description: string
  courses: number; students: number
  icon: LucideIcon; color: string; bg: string
  status: CategoryStatus
}
```

### `app/admin/reports/actions.ts`
```ts
type ReportItem = {
  id: string; code: string; title: string; type: string
  createdBy: string; createdAt: string; status: string
}
```

### `lib/reports-data.ts`
```ts
type CoursePerformance = {
  title: string; category: string; students: number; revenue: number; share: number
}
```

### `lib/settings-data.ts`
```ts
type GlobalSettings = {
  security?: {
    twoFactor?: boolean
    requireEmailVerification?: boolean
    allowRegistrations?: boolean
  }
  [key: string]: any
}
```

### `components/students/students-context.tsx`
```ts
type StudentFormValues = {
  name: string; email: string; password?: string; phone: string
  gender: StudentGender; status: StudentStatus; stageId?: string | null
}
```

---

## 2. Mock Data Arrays (lib/)

| المتغير | الملف | يمثّل |
|---|---|---|
| `revenueData` | `dashboard-data.ts` | إيرادات شهرية (6 أشهر) |
| `studentsData` | `dashboard-data.ts` | نمو الطلاب التراكمي (6 أشهر) |
| `activityData` | `dashboard-data.ts` | نشاط يومي أسبوعي |
| `topCourses` | `dashboard-data.ts` | أفضل 5 كورسات |
| `messages` | `dashboard-data.ts` | آخر 3 رسائل لواجهة الداشبورد |
| `payments` | `dashboard-data.ts` | آخر 3 مدفوعات للداشبورد |
| `students` | `dashboard-data.ts` | آخر 3 طلاب للداشبورد |
| `recentCourses` | `dashboard-data.ts` | آخر 3 كورسات للداشبورد |
| `courseRecords` | `courses-data.ts` | 8 كورسات تجريبية |
| `courseStatusFilters` | `courses-data.ts` | فلاتر حالة الكورس |
| `examRecords` | `exams-data.ts` | 9 اختبارات تجريبية |
| `examStatusFilters` | `exams-data.ts` | فلاتر حالة الاختبار |
| `paymentRecords` | `payments-data.ts` | 8 طلبات دفع تجريبية |
| `paymentStatusFilters` | `payments-data.ts` | فلاتر حالة الدفع |
| `notificationTypeFilters` | `notifications-data.ts` | فلاتر نوع الإشعار |
| `reportStats` | `reports-data.ts` | 4 كروت إحصائيات تقارير (hard-coded) |
| `monthlyRevenue` | `reports-data.ts` | إيرادات شهرية مع target (6 أشهر) |
| `studentsGrowth` | `reports-data.ts` | نمو الطلاب (6 أشهر) |
| `categoryDistribution` | `reports-data.ts` | توزيع الطلاب على الفئات |
| `coursePerformance` | `reports-data.ts` | أداء 6 كورسات |
| `initialEvents` | `calendar-data.ts` | 10 أحداث تقويم نسبية |
| `couponRecords` | `coupons-data.ts` | 6 كوبونات تجريبية |
| `categoryRecords` | `categories-data.ts` | 6 تصنيفات تجريبية |
| `studentRecords` | `students-data.ts` | طلاب تجريبيون |

---

## 3. Server Actions (حقيقية — متصلة بـ Supabase)

### Dashboard — `app/admin/dashboard/actions.ts`
| الدالة | العملية |
|---|---|
| `getDashboardData()` | تجمع كل بيانات الداشبورد: إحصائيات، رسوم بيانية، أحدث طلاب/كورسات/مدفوعات/رسائل |

### Courses/Lectures — `app/admin/courses/actions.ts`
| الدالة | العملية |
|---|---|
| `getLectures()` | جلب المحاضرات مع الدروس مرتّبة حسب stage → branch |
| `createLecture(input)` | إنشاء محاضرة جديدة |
| `updateLecture(id, input)` | تحديث محاضرة |
| `deleteLecture(id)` | حذف محاضرة |
| `createLesson(lectureId, input)` | إضافة درس لمحاضرة |
| `updateLesson(id, input)` | تحديث درس |
| `deleteLesson(id)` | حذف درس |

### Payments/Orders — `app/admin/payments/orders-actions.ts`
| الدالة | العملية |
|---|---|
| `getOrders()` | جلب كل الطلبات مع items |
| `updateOrderStatus(id, status)` | قبول / رفض طلب |
| `messageStudent(orderId)` | فتح محادثة مع طالب بخصوص طلب |

### Messages — `app/admin/messages/actions.ts`
| الدالة | العملية |
|---|---|
| `getConversations()` | جلب كل تذاكر الدعم |
| `markAsRead(id)` | تعليم تذكرة كمقروءة |
| `markAllAsRead()` | تعليم كل التذاكر كمقروءة |
| `replyToConversation(id, message)` | إرسال رد على تذكرة |
| `setTicketStatus(id, status)` | فتح / إغلاق تذكرة |

### Notifications — `app/admin/notifications/actions.ts`
| الدالة | العملية |
|---|---|
| `getNotificationTargets()` | جلب stages/branches/lectures للتهدئة |
| `sendAnnouncement(input)` | إرسال إشعار مستهدف للطلاب |
| `getNotifications()` | جلب كل الإشعارات |
| `markAsRead(id)` | تعليم إشعار كمقروء |
| `markAllAsRead()` | تعليم كل الإشعارات كمقروءة |
| `deleteNotification(id)` | حذف إشعار |

### Reports — `app/admin/reports/actions.ts`
| الدالة | العملية |
|---|---|
| `getReports()` | جلب قائمة التقارير المحفوظة |
| `generateReport()` | إنشاء تقرير جديد |
| `getReportsData()` | جلب بيانات التقارير الإحصائية الكاملة (إيرادات، طلاب، توزيع) |

### Calendar — `app/admin/calendar/actions.ts`
| الدالة | العملية |
|---|---|
| `getEvents()` | جلب أحداث التقويم |
| `createEvent(values)` | إنشاء حدث |
| `updateEvent(id, values)` | تحديث حدث |
| `deleteEvent(id)` | حذف حدث |

### Coupons — `app/admin/coupons/actions.ts`
| الدالة | العملية |
|---|---|
| `getCoupons()` | جلب كل الكوبونات |
| `getAllLectures()` | جلب المحاضرات لـ picker |
| `getCouponLectureIds(displayCode)` | جلب المحاضرات المرتبطة بكوبون |
| `createCoupon(values)` | إنشاء كوبون |
| `updateCoupon(id, values)` | تحديث كوبون |
| `deleteCoupon(id)` | حذف كوبون |

### Categories — `app/admin/categories/actions.ts`
| الدالة | العملية |
|---|---|
| `getCurriculumAdmin()` | جلب شجرة stages → branches كاملة |
| `createStage(input)` | إنشاء مرحلة |
| `updateStage(id, input)` | تحديث مرحلة |
| `deleteStage(id)` | حذف مرحلة |
| `createBranch(input)` | إنشاء فرع |
| `updateBranch(id, input)` | تحديث فرع |
| `deleteBranch(id)` | حذف فرع |

### Students — `app/admin/students/actions.ts` + `app/admin/students/[id]/actions.ts`
| الدالة | العملية |
|---|---|
| `getStudents()` | جلب كل الطلاب |
| `createStudent(values)` | إنشاء طالب |
| `deleteStudent(id)` | حذف طالب |
| `getStudentProfile(id)` | جلب بروفايل طالب كامل |

### Exams — `app/admin/exams/actions.ts` + `app/admin/exams/[id]/actions.ts`
| الدالة | العملية |
|---|---|
| `getExams()` | جلب الاختبارات |
| `createExam(meta, questions)` | إنشاء اختبار |
| `deleteExam(id)` | حذف اختبار |
| `getExamDetails(code)` | جلب تفاصيل اختبار مع أسئلة وتسليمات |
| `gradeSubmission(id, score)` | تصحيح إجابة طالب |

### Settings — `app/admin/settings/actions.ts`
| الدالة | العملية |
|---|---|
| `getSettings()` | جلب إعدادات المنصة |
| `saveSettings(values)` | حفظ الإعدادات |

---

## 4. Client State (useState per Context / Page)

### `components/students/students-context.tsx` — `StudentsProvider`
| المتغير | النوع | الوصف |
|---|---|---|
| `students` | `StudentRecord[]` | قائمة الطلاب (optimistic update عند الحذف) |
| `formOpen` | `boolean` | ظهور مودال إضافة طالب |
| `deleting` | `StudentRecord \| null` | الطالب المراد حذفه |

### `components/courses/lectures-context.tsx` — `LecturesProvider`
| المتغير | النوع | الوصف |
|---|---|---|
| `lectureFormOpen` | `boolean` | مودال إضافة/تعديل محاضرة |
| `editingLecture` | `AdminLecture \| null` | المحاضرة المفتوح عليها التعديل |
| `deletingLecture` | `AdminLecture \| null` | المحاضرة المراد حذفها |
| `lessonFormOpen` | `boolean` | مودال إضافة/تعديل درس |
| `editingLesson` | `AdminLesson \| null` | الدرس المفتوح عليه التعديل |
| `lessonLectureId` | `string \| null` | الـ id للمحاضرة الحاوية للدرس |
| `deletingLesson` | `AdminLesson \| null` | الدرس المراد حذفه |

### `components/calendar/calendar-context.tsx` — `CalendarProvider`
| المتغير | النوع | الوصف |
|---|---|---|
| `events` | `CalendarEvent[]` | أحداث التقويم (optimistic update) |
| `current` | `Date` | الشهر الحالي المعروض |
| `selectedDate` | `string \| null` | اليوم المحدد |
| `formOpen` | `boolean` | مودال إنشاء/تعديل حدث |
| `editing` | `CalendarEvent \| null` | الحدث المراد تعديله |
| `presetDate` | `string \| null` | تاريخ مبدئي عند فتح المودال من يوم معين |
| `deleting` | `CalendarEvent \| null` | الحدث المراد حذفه |

---

## 5. Mock Data مازالت Hard-coded (لم تُربط بالـ DB)

| الملف | ما يحتاج ربط |
|---|---|
| `lib/dashboard-data.ts` | `revenueData`, `studentsData`, `activityData` — لا تُستخدم فعلياً (الداشبورد يستخدم `getDashboardData()`) |
| `lib/courses-data.ts` | `courseRecords` — لا تُستخدم فعلياً (الصفحة تستخدم `getLectures()`) |
| `lib/exams-data.ts` | `examRecords` — لا تُستخدم فعلياً (الصفحة تستخدم `getExams()`) |
| `lib/payments-data.ts` | `paymentRecords` — لا تُستخدم فعلياً (الصفحة تستخدم `getOrders()`) |
| `lib/categories-data.ts` | `categoryRecords` — mock فقط للـ UI، الصفحة تستخدم `getCurriculumAdmin()` |
| `lib/reports-data.ts` | `reportStats`, `monthlyRevenue`, `studentsGrowth` — لا تُستخدم فعلياً (الصفحة تستخدم `getReportsData()`) |
| `lib/calendar-data.ts` | `initialEvents` — fallback فقط، الصفحة تستخدم `getEvents()` |
