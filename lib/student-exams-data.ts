import type { ExamStatus, ExamQuestion, Exam } from './student-types'

// الأنواع مُعرَّفة في lib/student-types.ts — re-export للتوافق مع الاستيرادات الموجودة
export type { ExamStatus, ExamQuestion, Exam } from './student-types'

/** @deprecated use getStudentExams() server action */
export const exams: Exam[] = [
  {
    id: 'ex1',
    title: 'اختبار الوحدة الأولى: أساسيات React',
    course: 'تطوير واجهات React الاحترافية',
    courseId: 'c1',
    instructor: 'م. أحمد سمير',
    category: 'برمجة',
    description:
      'اختبار شامل لقياس فهمك لأساسيات React من مكوّنات وخطافات وإدارة الحالة. تأكد من مراجعة دروس الوحدة الأولى قبل البدء.',
    instructions: [
      'أجب عن جميع الأسئلة قبل التسليم',
      'لكل سؤال إجابة واحدة صحيحة فقط',
      'تحتاج إلى 60% على الأقل لاجتياز الاختبار',
      'لا يمكنك تعديل إجاباتك بعد التسليم',
    ],
    date: 'متاح الآن',
    time: 'حتى 30 يونيو',
    durationMinutes: 30,
    totalPoints: 20,
    passingPercent: 60,
    status: 'متاح',
    topics: ['المكوّنات', 'الخطافات', 'إدارة الحالة', 'JSX'],
    questions: [
      {
        id: 'ex1-q1',
        question: 'ما هو الخطّاف المستخدم لإدارة الحالة داخل مكوّن دالّي في React؟',
        options: ['useState', 'useFetch', 'useRouter', 'useStyle'],
        correctIndex: 0,
      },
      {
        id: 'ex1-q2',
        question: 'ماذا تُعيد دالة المكوّن (Functional Component) في React؟',
        options: ['كائن CSS', 'عنصر JSX', 'سلسلة نصية فقط', 'دالة أخرى'],
        correctIndex: 1,
      },
      {
        id: 'ex1-q3',
        question: 'أي خطّاف يُستخدم لمشاركة الحالة بين عدة مكوّنات دون تمريرها يدوياً؟',
        options: ['useEffect', 'useMemo', 'useContext', 'useRef'],
        correctIndex: 2,
      },
      {
        id: 'ex1-q4',
        question: 'متى يُنفَّذ الكود داخل useEffect بمصفوفة اعتماديات فارغة []؟',
        options: [
          'عند كل إعادة رسم',
          'مرة واحدة بعد أول تركيب للمكوّن',
          'لا يُنفَّذ أبداً',
          'عند تغيّر أي حالة',
        ],
        correctIndex: 1,
      },
      {
        id: 'ex1-q5',
        question: 'ما الطريقة الصحيحة لتمرير البيانات من مكوّن أب إلى مكوّن ابن؟',
        options: ['عبر الحالة state', 'عبر الخصائص props', 'عبر المتغيرات العامة', 'عبر الـ refs'],
        correctIndex: 1,
      },
      {
        id: 'ex1-q6',
        question: 'ما الغرض من المفتاح key عند عرض قائمة عناصر في React؟',
        options: [
          'تنسيق العناصر',
          'مساعدة React على تمييز كل عنصر عند التحديث',
          'ربط العنصر بقاعدة البيانات',
          'لا غرض له',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'ex2',
    title: 'اختبار منتصف الفصل: مبادئ التصميم',
    course: 'أساسيات تصميم واجهات المستخدم UI/UX',
    courseId: 'c2',
    instructor: 'أ. سارة منير',
    category: 'تصميم',
    description:
      'اختبار يقيس فهمك لمبادئ التصميم الأساسية، نظرية الألوان، والتسلسل البصري. يغطي محتوى الوحدتين الأولى والثانية.',
    instructions: [
      'أجب عن جميع الأسئلة قبل التسليم',
      'لكل سؤال إجابة واحدة صحيحة فقط',
      'تحتاج إلى 70% على الأقل لاجتياز الاختبار',
    ],
    date: 'الأحد 29 يونيو',
    time: '07:00 م',
    durationMinutes: 45,
    totalPoints: 25,
    passingPercent: 70,
    status: 'قادم',
    topics: ['نظرية الألوان', 'التسلسل البصري', 'التباعد', 'الطباعة'],
    questions: [
      {
        id: 'ex2-q1',
        question: 'أي مبدأ تصميمي يهتم بإبراز أهم العناصر أولاً؟',
        options: ['التباين', 'التسلسل البصري', 'التكرار', 'المحاذاة'],
        correctIndex: 1,
      },
      {
        id: 'ex2-q2',
        question: 'ما اللون المكمّل للأزرق في عجلة الألوان؟',
        options: ['الأخضر', 'البرتقالي', 'البنفسجي', 'الأحمر'],
        correctIndex: 1,
      },
      {
        id: 'ex2-q3',
        question: 'ما الهدف الأساسي من المساحات البيضاء (White Space) في التصميم؟',
        options: [
          'ملء الفراغات',
          'تحسين القراءة والتركيز على المحتوى',
          'توفير الحبر',
          'إخفاء العيوب',
        ],
        correctIndex: 1,
      },
      {
        id: 'ex2-q4',
        question: 'أي مما يلي يُعد أفضل ممارسة لتباين النص مع الخلفية؟',
        options: [
          'نص فاتح على خلفية فاتحة',
          'الالتزام بنسب تباين كافية للوصولية',
          'استخدام ألوان عشوائية',
          'تصغير حجم الخط',
        ],
        correctIndex: 1,
      },
      {
        id: 'ex2-q5',
        question: 'ما المقصود بنظام التصميم (Design System)؟',
        options: [
          'مجموعة قواعد ومكوّنات موحّدة لإنشاء واجهات متسقة',
          'برنامج لتحرير الصور',
          'لغة برمجة',
          'نوع من الخطوط',
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    id: 'ex3',
    title: 'اختبار قصير: متغيرات وأنواع البيانات في Python',
    course: 'مقدمة في علوم البيانات وPython',
    courseId: 'c3',
    instructor: 'د. كريم فؤاد',
    category: 'بيانات',
    description:
      'اختبار قصير لتقييم إتقانك لأساسيات لغة Python: المتغيرات، أنواع البيانات، والعمليات الأساسية.',
    instructions: [
      'أجب عن جميع الأسئلة قبل التسليم',
      'لكل سؤال إجابة واحدة صحيحة فقط',
      'تحتاج إلى 50% على الأقل لاجتياز الاختبار',
    ],
    date: '5 يوليو',
    time: '03:00 م',
    durationMinutes: 20,
    totalPoints: 15,
    passingPercent: 50,
    status: 'قادم',
    topics: ['المتغيرات', 'أنواع البيانات', 'القوائم', 'العمليات'],
    questions: [
      {
        id: 'ex3-q1',
        question: 'أي مما يلي يمثّل نوع بيانات صحيح (Integer) في Python؟',
        options: ['"5"', '5', '5.0', 'True'],
        correctIndex: 1,
      },
      {
        id: 'ex3-q2',
        question: 'ما الدالة المستخدمة لمعرفة نوع متغيّر في Python؟',
        options: ['typeof()', 'type()', 'kind()', 'class()'],
        correctIndex: 1,
      },
      {
        id: 'ex3-q3',
        question: 'كيف تُنشئ قائمة (List) فارغة في Python؟',
        options: ['{}', '()', '[]', '<>'],
        correctIndex: 2,
      },
      {
        id: 'ex3-q4',
        question: 'ما ناتج التعبير: 7 // 2 ؟',
        options: ['3.5', '3', '4', '1'],
        correctIndex: 1,
      },
      {
        id: 'ex3-q5',
        question: 'أي نوع بيانات يُستخدم لتخزين قيمة منطقية (صح/خطأ)؟',
        options: ['str', 'int', 'bool', 'float'],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'ex4',
    title: 'اختبار الوحدة الثانية: تطوير واجهات React',
    course: 'تطوير واجهات React الاحترافية',
    courseId: 'c1',
    instructor: 'م. أحمد سمير',
    category: 'برمجة',
    description:
      'اختبار الوحدة الثانية الذي يغطي إدارة الحالة المتقدمة والتعامل مع الـ API. تم اجتيازه بنجاح.',
    instructions: [
      'أجب عن جميع الأسئلة قبل التسليم',
      'لكل سؤال إجابة واحدة صحيحة فقط',
      'تحتاج إلى 60% على الأقل لاجتياز الاختبار',
    ],
    date: 'اكتمل · منذ يومين',
    time: '—',
    durationMinutes: 40,
    totalPoints: 50,
    passingPercent: 60,
    status: 'مكتمل',
    score: 47,
    topics: ['إدارة الحالة', 'جلب البيانات', 'useEffect', 'الأداء'],
    questions: [
      {
        id: 'ex4-q1',
        question: 'أي خطّاف يُستخدم لتخزين قيمة محسوبة لتجنّب إعادة حسابها في كل رسم؟',
        options: ['useMemo', 'useState', 'useId', 'useRef'],
        correctIndex: 0,
      },
      {
        id: 'ex4-q2',
        question: 'ما الطريقة الشائعة لجلب البيانات من واجهة برمجية في React؟',
        options: ['document.write', 'fetch أو مكتبة مثل SWR', 'alert', 'console.log'],
        correctIndex: 1,
      },
      {
        id: 'ex4-q3',
        question: 'ماذا يحدث إذا نسيت إضافة اعتمادية مستخدَمة داخل useEffect؟',
        options: [
          'لا شيء على الإطلاق',
          'قد تحدث أخطاء بسبب قيَم قديمة (stale)',
          'يتوقف التطبيق نهائياً',
          'يتم حذف المكوّن',
        ],
        correctIndex: 1,
      },
      {
        id: 'ex4-q4',
        question: 'أي خطّاف مناسب للوصول المباشر إلى عنصر DOM؟',
        options: ['useRef', 'useState', 'useMemo', 'useContext'],
        correctIndex: 0,
      },
    ],
  },
]

export function getExam(id: string): Exam | undefined {
  return exams.find((e) => e.id === id)
}
