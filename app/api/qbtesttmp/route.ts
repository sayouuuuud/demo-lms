/**
 * مؤقّت — اختبار end-to-end لبنك الأسئلة (خطة 03).
 * يتحذف بعد الاختبار. مش مربوط بأي حاجة في التطبيق.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getContentTree, saveBankQuestion, getBankQuestions, getBankStats, getBankTopics,
  generateExamQuestions, pickReplacementQuestion, bulkUpdateBankQuestions,
  bulkCreateBankQuestions, archiveBankQuestions, restoreBankQuestions,
  deleteBankQuestions, importQuestionsFromExam, refreshBankQuestionStats,
  cleanupOrphanScopes,
} from '@/app/admin/question-bank/actions'
import { saveExam } from '@/app/admin/exams/actions'
import {
  bankQuestionToBuilderQuestion, computeAutoDifficulty, normalizeDifficulty,
  normalizeScopeType, parseBulkQuestions,
} from '@/lib/question-bank'

const MARK = '[[QBTEST]]'
const log: string[] = []
let pass = 0, fail = 0
const t = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; log.push('PASS  ' + name) }
  else { fail++; log.push('FAIL  ' + name + (detail ? ' :: ' + detail : '')) }
}
const note = (s: string) => log.push('      · ' + s)

export async function GET() {
  const createdQ: string[] = []
  const createdExams: string[] = []
  const createdTopics: string[] = []

  try {
    // ═══ M4.1 getContentTree ═════════════════════════════════════════════
    const tree = await getContentTree()
    t('M4.1 getContentTree يرجّع مصفوفة', Array.isArray(tree) && tree.length > 0, 'len=' + tree.length)

    const lecTarget = tree
      .flatMap(s => s.branches.map(b => ({ s, b })))
      .flatMap(({ s, b }) => [
        ...b.monthlyCourses.flatMap(c => c.lectures.map(l => ({ s, b, c, l }))),
      ])[0]

    const looseTarget = tree
      .flatMap(s => s.branches.map(b => ({ s, b })))
      .flatMap(({ s, b }) => b.looseLectures.map(l => ({ s, b, c: null, l })))[0]

    const anyLecture = lecTarget ?? looseTarget
    t('M4.1 فيه محاضرة واحدة على الأقل في الشجرة', !!anyLecture)
    note('محاضرة الاختبار: ' + JSON.stringify({
      stage: anyLecture?.s.title, branch: anyLecture?.b.title,
      course: (anyLecture as any)?.c?.title ?? '(loose)', lecture: anyLecture?.l.title,
    }))

    const stageT = tree[0]
    const branchT = tree.find(s => s.branches.length > 0)?.branches[0]
    const courseT = tree.flatMap(s => s.branches).flatMap(b => b.monthlyCourses)[0]

    // شجرة سليمة: مفيش فرع متكرر، مفيش محاضرة في مكانين
    const allBranchIds = tree.flatMap(s => s.branches.map(b => b.id))
    t('M4.1 مفيش فرع متكرر بين السنوات', new Set(allBranchIds).size === allBranchIds.length)
    const allLecIds = tree.flatMap(s => s.branches).flatMap(b => [
      ...b.monthlyCourses.flatMap(c => c.lectures.map(l => l.id)),
      ...b.looseLectures.map(l => l.id),
    ])
    t('M4.1 مفيش محاضرة متكررة', new Set(allLecIds).size === allLecIds.length)

    // ═══ M4.3 تحقّق saveBankQuestion (كل حالات الخطأ) ═════════════════════
    const base = {
      type: 'mcq' as const, contentMode: 'text' as const, text: '', imageUrl: '',
      options: [] as string[], correctAnswer: null as string | null, modelAnswer: '',
      points: 1, difficulty: 'medium' as const, notes: MARK, topics: [] as string[],
      scopes: [] as { scopeType: any; scopeId: string }[],
    }

    let r = await saveBankQuestion({ ...base, text: '   ' })
    t('M4.3 نص فاضي -> "اكتب نص السؤال"', r.error === 'اكتب نص السؤال', JSON.stringify(r))

    r = await saveBankQuestion({ ...base, contentMode: 'image', imageUrl: '  ' })
    t('M4.3 صورة فاضية -> "ارفع صورة السؤال"', r.error === 'ارفع صورة السؤال', JSON.stringify(r))

    r = await saveBankQuestion({ ...base, text: 'س', options: ['أ'] })
    t('M4.3 خيار واحد -> "لازم خيارين على الأقل"', r.error === 'لازم خيارين على الأقل', JSON.stringify(r))

    r = await saveBankQuestion({ ...base, text: 'س', options: ['أ', 'ب'], correctAnswer: 'ج' })
    t('M4.3 إجابة صحيحة مش من الخيارات -> "حدّد الإجابة الصحيحة"', r.error === 'حدّد الإجابة الصحيحة', JSON.stringify(r))

    r = await saveBankQuestion({ ...base, text: 'س', options: ['أ', 'ب'], correctAnswer: 'أ', points: 0 })
    t('M4.3 درجة 0 -> "الدرجة لازم بين 1 و100"', r.error === 'الدرجة لازم بين 1 و100', JSON.stringify(r))

    r = await saveBankQuestion({ ...base, text: 'س', options: ['أ', 'ب'], correctAnswer: 'أ', points: 101 })
    t('M4.3 درجة 101 -> خطأ', r.error === 'الدرجة لازم بين 1 و100', JSON.stringify(r))

    // ═══ M4.2 autoExpandScopes — أهم فكرة في الخطة ════════════════════════
    const q1 = await saveBankQuestion({
      ...base,
      text: MARK + ' سؤال محاضرة بـ 4 خيارات',
      options: ['  2  ', '4', '6', '', '8'],   // فيه مسافات + عنصر فاضي
      correctAnswer: ' 4 ',
      points: 3, difficulty: 'easy',
      topics: ['جبر', ' جبر ', 'JABR', 'هندسة', '  '],  // تكرار + case + فاضي
      scopes: anyLecture ? [{ scopeType: 'lecture', scopeId: anyLecture.l.id }] : [],
    })
    t('M4.3 حفظ سؤال محاضرة نجح', r = q1, !!q1.success + ' ' + JSON.stringify(q1))
    if (q1.id) createdQ.push(q1.id)

    const fetched1 = await prisma.question_bank_questions.findUnique({
      where: { id: q1.id! },
      include: { scopes: true, topics: { include: { topic: true } } },
    })
    const sTypes = (fetched1?.scopes ?? []).map(s => s.scope_type).sort()
    const expectedScopes = (anyLecture as any)?.c
      ? ['branch', 'lecture', 'monthly_course', 'stage']
      : ['branch', 'lecture', 'stage']
    t('M4.2 autoExpandScopes وسّع لكل المستويات', JSON.stringify(sTypes) === JSON.stringify(expectedScopes),
      'got=' + JSON.stringify(sTypes) + ' want=' + JSON.stringify(expectedScopes))
    t('M4.2 stage الصحيح اتربط',
      (fetched1?.scopes ?? []).some(s => s.scope_type === 'stage' && s.scope_id === anyLecture?.s.id))
    t('M4.2 branch الصحيح اتربط',
      (fetched1?.scopes ?? []).some(s => s.scope_type === 'branch' && s.scope_id === anyLecture?.b.id))

    // تخزين الخيارات — لازم مصفوفة نصوص منقّاة
    t('M2/M4 options = مصفوفة نصوص',
      JSON.stringify(fetched1?.options) === JSON.stringify(['2', '4', '6', '8']),
      JSON.stringify(fetched1?.options))
    t('M4.3 correct_answer = نص الخيار متنظّف', fetched1?.correct_answer === '4', JSON.stringify(fetched1?.correct_answer))
    t('M4.3 model_answer = null للـ mcq', fetched1?.model_answer === null)
    t('M4.3 image_url = null في وضع النص', fetched1?.image_url === null)
    t('M4.3 difficulty اتخزّنت', fetched1?.difficulty === 'easy')
    t('M4.3 points اتخزّنت', fetched1?.points === 3)

    const tTitles = (fetched1?.topics ?? []).map(x => x.topic.title).sort()
    t('M4.3 مواضيع deduped case-insensitive (جبر/هندسة فقط)',
      tTitles.length === 2 && tTitles.includes('هندسة'), JSON.stringify(tTitles))
    for (const x of fetched1?.topics ?? []) createdTopics.push(x.topic_id)

    // نطاق كورس شهري -> 3 مستويات
    if (courseT) {
      const q2 = await saveBankQuestion({
        ...base, text: MARK + ' سؤال كورس', options: ['أ', 'ب'], correctAnswer: 'ب',
        difficulty: 'medium',
        scopes: [{ scopeType: 'monthly_course', scopeId: courseT.id }],
      })
      if (q2.id) createdQ.push(q2.id)
      const f2 = await prisma.question_bank_scopes.findMany({ where: { question_id: q2.id! } })
      t('M4.2 كورس -> branch + stage',
        JSON.stringify(f2.map(s => s.scope_type).sort()) === JSON.stringify(['branch', 'monthly_course', 'stage']),
        JSON.stringify(f2.map(s => s.scope_type).sort()))
    }

    // نطاق فرع -> 2 مستويات
    if (branchT) {
      const q3 = await saveBankQuestion({
        ...base, text: MARK + ' سؤال فرع', type: 'essay', modelAnswer: 'الإجابة النموذجية',
        options: [], correctAnswer: null, difficulty: 'hard',
        scopes: [{ scopeType: 'branch', scopeId: branchT.id }],
      })
      if (q3.id) createdQ.push(q3.id)
      const f3 = await prisma.question_bank_questions.findUnique({
        where: { id: q3.id! }, include: { scopes: true },
      })
      t('M4.2 فرع -> stage',
        JSON.stringify(f3?.scopes.map(s => s.scope_type).sort()) === JSON.stringify(['branch', 'stage']),
        JSON.stringify(f3?.scopes.map(s => s.scope_type)))
      t('M4.3 essay: options = [] و correct_answer = null',
        JSON.stringify(f3?.options) === '[]' && f3?.correct_answer === null, JSON.stringify(f3?.options))
      t('M4.3 essay: model_answer اتخزّن', f3?.model_answer === 'الإجابة النموذجية')
    }

    // نطاق سنة فقط -> مستوى واحد
    if (stageT) {
      const q4 = await saveBankQuestion({
        ...base, text: MARK + ' سؤال ملف', type: 'file', options: [], correctAnswer: null,
        difficulty: 'hard', scopes: [{ scopeType: 'stage', scopeId: stageT.id }],
      })
      if (q4.id) createdQ.push(q4.id)
      const f4 = await prisma.question_bank_scopes.findMany({ where: { question_id: q4.id! } })
      t('M4.2 سنة -> سنة بس', f4.length === 1 && f4[0].scope_type === 'stage', JSON.stringify(f4.map(s => s.scope_type)))
    }

    // ═══ تعديل سؤال موجود — النطاقات/المواضيع تتبدل مش تتكرّر ══════════════
    const upd = await saveBankQuestion({
      ...base, id: q1.id, text: MARK + ' سؤال معدّل', options: ['س1', 'س2', 'س3'],
      correctAnswer: 'س2', points: 5, difficulty: 'hard',
      topics: ['تفاضل'],
      scopes: stageT ? [{ scopeType: 'stage', scopeId: stageT.id }] : [],
    })
    t('M4.3 تعديل سؤال نجح', upd.success === true && upd.id === q1.id, JSON.stringify(upd))
    const f1b = await prisma.question_bank_questions.findUnique({
      where: { id: q1.id! }, include: { scopes: true, topics: { include: { topic: true } } },
    })
    t('M4.3 تعديل: النطاقات اتبدلت (1 بس)', f1b?.scopes.length === 1, 'len=' + f1b?.scopes.length)
    t('M4.3 تعديل: المواضيع اتبدلت (تفاضل بس)',
      f1b?.topics.length === 1 && f1b?.topics[0].topic.title === 'تفاضل',
      JSON.stringify(f1b?.topics.map(x => x.topic.title)))
    t('M4.3 تعديل: updated_at اتحدّث', !!f1b && f1b.updated_at > f1b.created_at)
    for (const x of f1b?.topics ?? []) createdTopics.push(x.topic_id)

    // ارجع q1 لمحاضرته عشان اختبارات الفلترة
    if (anyLecture) {
      await saveBankQuestion({
        ...base, id: q1.id, text: MARK + ' سؤال محاضرة بـ 3 خيارات',
        options: ['س1', 'س2', 'س3'], correctAnswer: 'س2', points: 5, difficulty: 'easy',
        topics: ['تفاضل'], scopes: [{ scopeType: 'lecture', scopeId: anyLecture.l.id }],
      })
    }

    // ═══ M4.4 القائمة والفلترة ═══════════════════════════════════════════
    const listAll = await getBankQuestions({ perPage: 100 })
    const mine = listAll.items.filter(i => i.text.includes(MARK) || i.notes.includes(MARK))
    t('M4.4 getBankQuestions بترجّع أسئلة الاختبار', mine.length >= 4, 'got ' + mine.length)
    t('M4.4 items مرتّبة created_at desc',
      listAll.items.every((it, i) => i === 0 || listAll.items[i - 1].createdAt >= it.createdAt))

    const mq = mine.find(i => i.id === q1.id)
    t('M4.4 options ترجع string[]', Array.isArray(mq?.options) && typeof mq?.options[0] === 'string')
    t('M4.4 scope label اتبنى مش (محذوف)',
      !!mq && mq.scopes.length > 0 && mq.scopes.every(s => s.label && s.label !== '(محذوف)'),
      JSON.stringify(mq?.scopes.map(s => s.label)))
    t('M4.4 successRate = null لما مفيش إجابات', mq?.successRate === null, String(mq?.successRate))
    t('M4.4 topics راجعة', mq?.topics.some(x => x.title === 'تفاضل') === true)

    const byDiff = await getBankQuestions({ difficulty: 'easy', perPage: 100 })
    t('M4.4 فلتر الصعوبة', byDiff.items.every(i => i.difficulty === 'easy') && byDiff.items.some(i => i.id === q1.id))

    const byType = await getBankQuestions({ type: 'essay', perPage: 100 })
    t('M4.4 فلتر النوع', byType.items.every(i => i.type === 'essay'))

    if (anyLecture) {
      const byScope = await getBankQuestions({ scopeType: 'lecture', scopeId: anyLecture.l.id, perPage: 100 })
      t('M4.4 فلتر النطاق (محاضرة)', byScope.items.some(i => i.id === q1.id), 'total=' + byScope.total)
      const byStage = await getBankQuestions({ scopeType: 'stage', scopeId: anyLecture.s.id, perPage: 100 })
      t('M4.4 فلتر النطاق بالسنة يلقط سؤال المحاضرة (بفضل التوسيع)',
        byStage.items.some(i => i.id === q1.id), 'total=' + byStage.total)
    }

    const topicsList = await getBankTopics()
    const tafadol = topicsList.find(x => x.title === 'تفاضل')
    t('M4.4 getBankTopics فيها العدد', !!tafadol && tafadol.count >= 1, JSON.stringify(tafadol))
    if (tafadol) {
      const byTopic = await getBankQuestions({ topicId: tafadol.id, perPage: 100 })
      t('M4.4 فلتر الموضوع', byTopic.items.some(i => i.id === q1.id))
    }

    const bySearch = await getBankQuestions({ search: 'سؤال محاضرة', perPage: 100 })
    t('M4.4 البحث بيشتغل', bySearch.items.some(i => i.id === q1.id), 'total=' + bySearch.total)
    const shortSearch = await getBankQuestions({ search: 'س', perPage: 100 })
    t('M4.4 بحث بحرف واحد يتجاهل (>= 2)', shortSearch.total === listAll.total,
      shortSearch.total + ' vs ' + listAll.total)

    const p1 = await getBankQuestions({ perPage: 2, page: 1 })
    const p2 = await getBankQuestions({ perPage: 2, page: 2 })
    t('M4.4 الترقيم: perPage محترم', p1.items.length <= 2 && p1.perPage === 2)
    t('M4.4 الترقيم: صفحة 2 مختلفة', p1.items[0]?.id !== p2.items[0]?.id)
    t('M4.4 الترقيم: total ثابت', p1.total === p2.total && p1.total === listAll.total)
    const pClamp = await getBankQuestions({ perPage: 999, page: 0 })
    t('M4.4 perPage محدود بـ 100 و page >= 1', pClamp.perPage === 100 && pClamp.page === 1)

    // ═══ M4.4 getBankStats ═══════════════════════════════════════════════
    const stats = await getBankStats()
    t('M4.4 stats.total = total القائمة', stats.total === listAll.total, stats.total + ' vs ' + listAll.total)
    t('M4.4 stats مجموع الصعوبات = total',
      stats.byDifficulty.easy + stats.byDifficulty.medium + stats.byDifficulty.hard === stats.total)
    t('M4.4 stats مجموع الأنواع = total',
      stats.byType.mcq + stats.byType.essay + stats.byType.file === stats.total)
    t('M4.4 stats.unused >= 1', stats.unused >= 1, String(stats.unused))

    // unscoped
    const qNoScope = await saveBankQuestion({
      ...base, text: MARK + ' سؤال بدون نطاق', options: ['أ', 'ب'], correctAnswer: 'أ', scopes: [],
    })
    if (qNoScope.id) createdQ.push(qNoScope.id)
    const stats2 = await getBankStats()
    t('M4.4 stats.unscoped زاد', stats2.unscoped > stats.unscoped, stats.unscoped + ' -> ' + stats2.unscoped)

    // ═══ M4.5 generateExamQuestions ══════════════════════════════════════
    let g = await generateExamQuestions({ counts: { easy: 0, medium: 0, hard: 0 } })
    t('M4.5 مجموع 0 -> خطأ', g.error === 'حدّد عدد أسئلة بين 1 و100', JSON.stringify(g))
    g = await generateExamQuestions({ counts: { easy: 101, medium: 0, hard: 0 } })
    t('M4.5 مجموع > 100 -> خطأ', g.error === 'حدّد عدد أسئلة بين 1 و100')

    g = await generateExamQuestions({ counts: { easy: 1, medium: 1, hard: 1 } })
    t('M4.5 التوليد رجّع أسئلة', g.questions.length >= 1, 'len=' + g.questions.length)
    t('M4.5 الترتيب easy -> medium -> hard', (() => {
      const order = { easy: 0, medium: 1, hard: 2 } as any
      return g.questions.every((q, i) => i === 0 || order[g.questions[i - 1].difficulty] <= order[q.difficulty])
    })(), JSON.stringify(g.questions.map(q => q.difficulty)))
    t('M4.5 مفيش تكرار في نتيجة التوليد',
      new Set(g.questions.map(q => q.id)).size === g.questions.length)

    const gBig = await generateExamQuestions({ counts: { easy: 90, medium: 0, hard: 0 } })
    t('M4.5 shortage بيتحسب لما البنك أقل', (gBig.shortage.easy ?? 0) > 0, JSON.stringify(gBig.shortage))
    t('M4.5 shortage = المطلوب - المرجّع',
      (gBig.shortage.easy ?? 0) === 90 - gBig.questions.length, JSON.stringify(gBig.shortage))

    const gExcl = await generateExamQuestions({ counts: { easy: 20, medium: 0, hard: 0 }, excludeIds: [q1.id!] })
    t('M4.5 excludeIds محترمة', !gExcl.questions.some(q => q.id === q1.id))

    const gType = await generateExamQuestions({ counts: { easy: 0, medium: 20, hard: 0 }, types: ['essay'] })
    t('M4.5 فلتر types محترم', gType.questions.every(q => q.type === 'essay'), JSON.stringify(gType.questions.map(q => q.type)))

    if (anyLecture) {
      const gScope = await generateExamQuestions({
        counts: { easy: 20, medium: 0, hard: 0 },
        scope: { scopeType: 'lecture', scopeId: anyLecture.l.id },
      })
      t('M4.5 فلتر النطاق في التوليد', gScope.questions.every(q =>
        q.scopes.some(s => s.scopeType === 'lecture' && s.scopeId === anyLecture.l.id)),
        'len=' + gScope.questions.length)
      t('M4.5 التوليد بالنطاق لقط سؤالنا', gScope.questions.some(q => q.id === q1.id))
    }
    if (tafadol) {
      const gTopic = await generateExamQuestions({
        counts: { easy: 20, medium: 0, hard: 0 }, topicIds: [tafadol.id],
      })
      t('M4.5 فلتر المواضيع في التوليد',
        gTopic.questions.every(q => q.topics.some(x => x.id === tafadol.id)), 'len=' + gTopic.questions.length)
    }

    // التوليد بيرجّع أسئلة برّه الصفحة الأولى (اختبار fetchBankQuestionsByIds)
    t('M4.5 التوليد بيرجّع البيانات كاملة (options/topics/scopes)', (() => {
      const mcq = gBig.questions.find(q => q.type === 'mcq')
      return !mcq || (Array.isArray(mcq.options) && mcq.options.length >= 2)
    })())

    // ═══ M4.5 pickReplacementQuestion ════════════════════════════════════
    const pr = await pickReplacementQuestion({ difficulty: 'easy', type: 'mcq', excludeIds: [] })
    t('M4.5 استبدال رجّع سؤال', !!pr.question, JSON.stringify(pr.error))
    t('M4.5 استبدال بنفس الصعوبة والنوع',
      pr.question?.difficulty === 'easy' && pr.question?.type === 'mcq')

    const allEasyMcq = (await getBankQuestions({ difficulty: 'easy', type: 'mcq', perPage: 100 })).items.map(i => i.id)
    const prNone = await pickReplacementQuestion({ difficulty: 'easy', type: 'mcq', excludeIds: allEasyMcq })
    t('M4.5 استبدال باستثناء الكل -> null + رسالة',
      prNone.question === null && prNone.error === 'مفيش سؤال بديل بنفس المواصفات في البنك',
      JSON.stringify(prNone.error))

    // ═══ M3 bankQuestionToBuilderQuestion ════════════════════════════════
    const bq = (await getBankQuestions({ perPage: 100 })).items.find(i => i.id === q1.id)!
    const builderQ = bankQuestionToBuilderQuestion(bq)
    t('M3 المحوّل: id جديد مش id البنك', builderQ.id !== bq.id && !!builderQ.id)
    t('M3 المحوّل: bankQuestionId متخزّن', builderQ.bankQuestionId === bq.id)
    t('M3 المحوّل: bankDifficulty متخزّنة', builderQ.bankDifficulty === bq.difficulty)
    t('M3 المحوّل: options -> {id,text}',
      builderQ.options.length === bq.options.length &&
      builderQ.options.every(o => !!o.id && typeof o.text === 'string'),
      JSON.stringify(builderQ.options))
    t('M3 المحوّل: ids الخيارات فريدة',
      new Set(builderQ.options.map(o => o.id)).size === builderQ.options.length)
    t('M3 المحوّل: correctOptionId يشاور على الخيار الصح',
      builderQ.options.find(o => o.id === builderQ.correctOptionId)?.text === bq.correctAnswer,
      builderQ.options.find(o => o.id === builderQ.correctOptionId)?.text + ' vs ' + bq.correctAnswer)
    t('M3 المحوّل: باقي حقول createQuestion موجودة',
      typeof builderQ.required === 'boolean' && Array.isArray(builderQ.allowedTypes) &&
      typeof builderQ.maxFileSizeMb === 'number')
    t('M3 المحوّل: points منقولة', builderQ.points === bq.points)

    // fallback: correctAnswer مش موجود في الخيارات
    const bqBad = { ...bq, correctAnswer: 'مش موجود' }
    const bBad = bankQuestionToBuilderQuestion(bqBad as any)
    t('M3 المحوّل: fallback لأول خيار', bBad.correctOptionId === bBad.options[0].id)

    // essay
    const bqEssay = (await getBankQuestions({ type: 'essay', perPage: 100 })).items[0]
    if (bqEssay) {
      const be = bankQuestionToBuilderQuestion(bqEssay)
      t('M3 المحوّل: essay -> options فاضية و correctOptionId null',
        be.options.length === 0 && be.correctOptionId === null)
      t('M3 المحوّل: modelAnswer منقولة', be.modelAnswer === bqEssay.modelAnswer)
    }

    // ═══ M3 دوال التطبيع ═════════════════════════════════════════════════
    t('M3 normalizeDifficulty', normalizeDifficulty('easy') === 'easy' &&
      normalizeDifficulty('hard') === 'hard' && normalizeDifficulty('xx') === 'medium' &&
      normalizeDifficulty(null) === 'medium')
    t('M3 normalizeScopeType', normalizeScopeType('lecture') === 'lecture' &&
      normalizeScopeType('bad') === null)
    t('M3 computeAutoDifficulty < 10 -> null', computeAutoDifficulty(9, 9) === null)
    t('M3 computeAutoDifficulty 0.75 -> easy', computeAutoDifficulty(100, 75) === 'easy')
    t('M3 computeAutoDifficulty 0.74 -> medium', computeAutoDifficulty(100, 74) === 'medium')
    t('M3 computeAutoDifficulty 0.45 -> medium', computeAutoDifficulty(100, 45) === 'medium')
    t('M3 computeAutoDifficulty 0.44 -> hard', computeAutoDifficulty(100, 44) === 'hard')

    // ═══ M4 bulkUpdateBankQuestions ══════════════════════════════════════
    let bu = await bulkUpdateBankQuestions({ ids: [] })
    t('M4 تحديث مجمّع بـ 0 -> خطأ', !!bu.error, JSON.stringify(bu))
    bu = await bulkUpdateBankQuestions({ ids: new Array(501).fill(q1.id!) })
    t('M4 تحديث مجمّع بـ 501 -> خطأ', !!bu.error)

    const bulkIds = createdQ.slice(0, 3)
    bu = await bulkUpdateBankQuestions({
      ids: bulkIds, difficulty: 'hard', addTopics: ['وسم مجمّع ' + MARK],
      addScopes: anyLecture ? [{ scopeType: 'lecture', scopeId: anyLecture.l.id }] : [],
    })
    t('M4 تحديث مجمّع نجح', bu.success === true && bu.updated === bulkIds.length, JSON.stringify(bu))
    const afterBulk = await prisma.question_bank_questions.findMany({
      where: { id: { in: bulkIds } }, include: { scopes: true, topics: { include: { topic: true } } },
    })
    t('M4 مجمّع: الصعوبة اتغيّرت للكل', afterBulk.every(x => x.difficulty === 'hard'))
    t('M4 مجمّع: الوسم اتضاف للكل',
      afterBulk.every(x => x.topics.some(y => y.topic.title.includes(MARK))))
    if (anyLecture) {
      t('M4 مجمّع: النطاق اتوسّع للكل (محاضرة + أعلى)',
        afterBulk.every(x => x.scopes.some(s => s.scope_type === 'lecture') &&
                             x.scopes.some(s => s.scope_type === 'stage')),
        JSON.stringify(afterBulk.map(x => x.scopes.map(s => s.scope_type))))
    }
    for (const x of afterBulk) for (const y of x.topics) createdTopics.push(y.topic_id)

    // idempotent: تكرار نفس التحديث مايعملش صفوف مكررة
    const scopesBefore = afterBulk[0].scopes.length
    await bulkUpdateBankQuestions({
      ids: bulkIds, addScopes: anyLecture ? [{ scopeType: 'lecture', scopeId: anyLecture.l.id }] : [],
    })
    const again = await prisma.question_bank_scopes.count({ where: { question_id: bulkIds[0] } })
    t('M4 مجمّع: تكرار الربط مايكرّرش الصفوف', again === scopesBefore, again + ' vs ' + scopesBefore)

    // removeScopes
    if (anyLecture) {
      await bulkUpdateBankQuestions({
        ids: [bulkIds[0]], removeScopes: [{ scopeType: 'lecture', scopeId: anyLecture.l.id }],
      })
      const rm = await prisma.question_bank_scopes.findMany({ where: { question_id: bulkIds[0] } })
      t('M4 مجمّع: removeScopes شالت النطاق',
        !rm.some(s => s.scope_type === 'lecture' && s.scope_id === anyLecture.l.id))
    }

    // ═══ M6 bulkCreateBankQuestions ══════════════════════════════════════
    const EXAMPLE = 'س: ' + MARK + ' ما هو ناتج 2 + 2؟ | صعوبة: سهل | درجة: 2\n- 3\n* 4\n- 5\n- 6\n\nس: ' + MARK + ' اشرح قانون نيوتن الأول.\nنوع: مقالي'
    const parsed = parseBulkQuestions(EXAMPLE)
    t('M6 المثال الموثّق يتحلّل لسؤالين', parsed.length === 2)

    const before = await prisma.question_bank_questions.count()
    const bc = await bulkCreateBankQuestions({
      questions: parsed.map(p => ({
        text: p.text, type: p.type, options: p.options,
        correctAnswer: p.correctAnswer, points: p.points, difficulty: p.difficulty,
      })),
      scopes: anyLecture ? [{ scopeType: 'lecture', scopeId: anyLecture.l.id }] : [],
      topics: ['استيراد ' + MARK],
    })
    t('M6 الاستيراد المجمّع نجح', bc.success === true && bc.created === 2, JSON.stringify(bc))
    const newOnes = await prisma.question_bank_questions.findMany({
      where: { question_text: { contains: MARK } },
      include: { scopes: true, topics: { include: { topic: true } } },
      orderBy: { created_at: 'desc' }, take: 2,
    })
    for (const x of newOnes) { createdQ.push(x.id); for (const y of x.topics) createdTopics.push(y.topic_id) }
    const impMcq = newOnes.find(x => x.question_type === 'mcq')
    t('M6 المستورد: mcq بـ 4 خيارات', JSON.stringify(impMcq?.options) === JSON.stringify(['3', '4', '5', '6']),
      JSON.stringify(impMcq?.options))
    t('M6 المستورد: correct_answer = 4', impMcq?.correct_answer === '4')
    t('M6 المستورد: difficulty = easy', impMcq?.difficulty === 'easy')
    t('M6 المستورد: points = 2', impMcq?.points === 2)
    t('M6 المستورد: مقالي موجود', newOnes.some(x => x.question_type === 'essay'))
    if (anyLecture) {
      t('M6 المستورد: النطاق اتوسّع',
        newOnes.every(x => x.scopes.length >= 3), JSON.stringify(newOnes.map(x => x.scopes.length)))
    }
    t('M6 المستورد: الوسم اتضاف',
      newOnes.every(x => x.topics.some(y => y.topic.title.includes('استيراد'))))

    // حدود
    let bcErr = await bulkCreateBankQuestions({ questions: [], scopes: [], topics: [] })
    t('M6 0 أسئلة -> خطأ', !!bcErr.error, JSON.stringify(bcErr))
    bcErr = await bulkCreateBankQuestions({
      questions: new Array(201).fill({ text: 'x', type: 'essay', options: [], correctAnswer: null, points: 1, difficulty: 'medium' }),
      scopes: [], topics: [],
    })
    t('M6 201 سؤال -> خطأ', !!bcErr.error)

    // 🔴 الاختبار الحرج: أسئلة غير صالحة لازم تترفض
    const cntBefore = await prisma.question_bank_questions.count()
    const bcMixed = await bulkCreateBankQuestions({
      questions: [
        { text: MARK + ' سؤال صالح', type: 'essay', options: [], correctAnswer: null, points: 1, difficulty: 'medium' },
        { text: '   ', type: 'essay', options: [], correctAnswer: null, points: 1, difficulty: 'medium' },              // نص فاضي
        { text: MARK + ' درجة غلط', type: 'essay', options: [], correctAnswer: null, points: 999, difficulty: 'medium' }, // درجة > 100
        { text: MARK + ' خيار واحد', type: 'mcq', options: ['أ'], correctAnswer: 'أ', points: 1, difficulty: 'medium' },  // < 2 خيار
        { text: MARK + ' صح مش موجود', type: 'mcq', options: ['أ', 'ب'], correctAnswer: 'ج', points: 1, difficulty: 'medium' },
      ],
      scopes: [], topics: [],
    })
    const cntAfter = await prisma.question_bank_questions.count()
    const reallyCreated = cntAfter - cntBefore
    note('bulkCreate بأسئلة مخلوطة: نتيجة=' + JSON.stringify(bcMixed) + ' اتخلق فعلًا=' + reallyCreated)
    t('M6 التحقق: سؤال واحد صالح بس اللي يتخلق',
      reallyCreated === 1 && bcMixed.created === 1,
      'created=' + bcMixed.created + ' failed=' + bcMixed.failed + ' فعليًا=' + reallyCreated)
    t('M6 التحقق: الأربعة الغلط اتحسبوا failed', bcMixed.failed === 4, 'failed=' + bcMixed.failed)
    const junk = await prisma.question_bank_questions.findMany({
      where: { question_text: { in: ['   ', MARK + ' درجة غلط', MARK + ' خيار واحد', MARK + ' صح مش موجود'] } },
      select: { id: true, question_text: true, points: true },
    })
    for (const j of junk) createdQ.push(j.id)
    t('M6 التحقق: مفيش سؤال غلط اتخزّن في القاعدة', junk.length === 0,
      'اتخزّن: ' + JSON.stringify(junk.map(j => j.question_text)))
    const okOne = await prisma.question_bank_questions.findFirst({ where: { question_text: MARK + ' سؤال صالح' } })
    if (okOne) createdQ.push(okOne.id)

    // ═══ M7 saveExam + usage_count ═══════════════════════════════════════
    const pickForExam = (await getBankQuestions({ perPage: 100 })).items
      .filter(i => i.text.includes(MARK) && i.type === 'mcq').slice(0, 2)
    t('M7 فيه أسئلة بنك للاختبار', pickForExam.length === 2, 'len=' + pickForExam.length)

    const builderQs = pickForExam.map(bankQuestionToBuilderQuestion)
    const usageBefore = await prisma.question_bank_questions.findMany({
      where: { id: { in: pickForExam.map(q => q.id) } }, select: { id: true, usage_count: true },
    })

    const ex = await saveExam({
      meta: { title: MARK + ' اختبار تجريبي', course: 'تست', description: '', duration: 30, passMark: 50, shuffle: false, stageId: null, branchId: null },
      questions: builderQs.map(q => ({
        type: q.type, contentMode: q.contentMode, text: q.text, imageUrl: q.imageUrl,
        points: q.points, options: q.options, correctOptionId: q.correctOptionId,
        modelAnswer: q.modelAnswer, bankQuestionId: q.bankQuestionId,
      })),
      publish: true,
    })
    t('M7 saveExam نجح', ex.success === true, JSON.stringify(ex))
    const examRow = await prisma.exams.findFirst({ where: { code: ex.code! }, select: { id: true, code: true, questions: true } })
    if (examRow) createdExams.push(examRow.id)
    t('M7 عدد أسئلة الاختبار صح', examRow?.questions === 2, String(examRow?.questions))

    const eqs = await prisma.exam_questions.findMany({ where: { exam_id: examRow!.id }, orderBy: { order_index: 'asc' } })
    t('M7 bank_question_id اتخزّن', eqs.every(e => !!e.bank_question_id) &&
      eqs.map(e => e.bank_question_id).sort().join() === pickForExam.map(q => q.id).sort().join(),
      JSON.stringify(eqs.map(e => e.bank_question_id)))
    t('M7 snapshot: options مصفوفة نصوص (توافق التصحيح)',
      eqs.every(e => Array.isArray(e.options) && (e.options as any[]).every(o => typeof o === 'string')),
      JSON.stringify(eqs.map(e => e.options)))
    t('M7 snapshot: correct_answer = نص الخيار الصح',
      eqs.every((e, i) => {
        const src = pickForExam.find(p => p.id === e.bank_question_id)!
        return e.correct_answer === src.correctAnswer
      }), JSON.stringify(eqs.map(e => e.correct_answer)))
    t('M7 snapshot: correct_answer موجود جوّه options',
      eqs.every(e => (e.options as string[]).includes(e.correct_answer!)))

    await new Promise(r => setTimeout(r, 900))  // fire-and-forget increment
    const usageAfter = await prisma.question_bank_questions.findMany({
      where: { id: { in: pickForExam.map(q => q.id) } }, select: { id: true, usage_count: true, last_used_at: true },
    })
    t('M7 usage_count زاد بـ 1', usageAfter.every(a => {
      const b = usageBefore.find(x => x.id === a.id)!
      return a.usage_count === b.usage_count + 1
    }), JSON.stringify(usageAfter.map(a => a.usage_count)) + ' من ' + JSON.stringify(usageBefore.map(b => b.usage_count)))
    t('M7 last_used_at اتحدّث', usageAfter.every(a => !!a.last_used_at))

    // snapshot مستقل: تعديل سؤال البنك مايغيّرش الاختبار
    const srcId = pickForExam[0].id
    const beforeSnap = eqs.find(e => e.bank_question_id === srcId)!
    await saveBankQuestion({
      ...base, id: srcId, text: MARK + ' نص متغيّر بعد النشر',
      options: ['ز1', 'ز2'], correctAnswer: 'ز2', points: 9, difficulty: 'hard', scopes: [],
    })
    const afterSnap = await prisma.exam_questions.findUnique({ where: { id: beforeSnap.id } })
    t('M7 snapshot مستقل: نص الاختبار مااتغيّرش', afterSnap?.question_text === beforeSnap.question_text)
    t('M7 snapshot مستقل: خيارات الاختبار مااتغيّرتش',
      JSON.stringify(afterSnap?.options) === JSON.stringify(beforeSnap.options))

    // ═══ M8 importQuestionsFromExam ══════════════════════════════════════
    const impBad = await importQuestionsFromExam('00000000-0000-0000-0000-000000000000', [])
    t('M8 استيراد من اختبار مش موجود -> خطأ', impBad.error === 'الاختبار مش موجود.', JSON.stringify(impBad))

    // اختبار بأسئلة مش من البنك
    const ex2 = await saveExam({
      meta: { title: MARK + ' اختبار يدوي', course: 'تست', description: '', duration: 20, passMark: 50, shuffle: false, stageId: null, branchId: null },
      questions: [
        { type: 'mcq', contentMode: 'text', text: MARK + ' سؤال يدوي 1', imageUrl: '', points: 2,
          options: [{ id: 'o1', text: 'أ' }, { id: 'o2', text: 'ب' }], correctOptionId: 'o2', modelAnswer: '' },
        { type: 'essay', contentMode: 'text', text: MARK + ' سؤال يدوي 2', imageUrl: '', points: 4,
          options: [], correctOptionId: null, modelAnswer: 'نموذجي' },
      ],
      publish: false,
    })
    const exam2 = await prisma.exams.findFirst({ where: { code: ex2.code! }, select: { id: true } })
    if (exam2) createdExams.push(exam2.id)

    const imp = await importQuestionsFromExam(exam2!.id, anyLecture ? [{ scopeType: 'lecture', scopeId: anyLecture.l.id }] : [])
    t('M8 الاستيراد من اختبار نجح', imp.success === true && imp.imported === 2, JSON.stringify(imp))
    const eq2 = await prisma.exam_questions.findMany({ where: { exam_id: exam2!.id } })
    t('M8 bank_question_id اترجّع على أسئلة الاختبار', eq2.every(e => !!e.bank_question_id))
    const impIds = eq2.map(e => e.bank_question_id!)
    createdQ.push(...impIds)
    const impRows = await prisma.question_bank_questions.findMany({
      where: { id: { in: impIds } }, include: { scopes: true },
    })
    t('M8 المستورد: difficulty = medium', impRows.every(x => x.difficulty === 'medium'))
    t('M8 المستورد: notes فيها كود الاختبار', impRows.every(x => x.notes?.includes(ex2.code!)),
      JSON.stringify(impRows.map(x => x.notes)))
    t('M8 المستورد: options اتنسخت بنفس الشكل',
      JSON.stringify(impRows.find(x => x.question_type === 'mcq')?.options) === JSON.stringify(['أ', 'ب']))
    t('M8 المستورد: correct_answer اتنسخ', impRows.find(x => x.question_type === 'mcq')?.correct_answer === 'ب')
    if (anyLecture) t('M8 المستورد: النطاقات اتوسّعت', impRows.every(x => x.scopes.length >= 3))

    const impAgain = await importQuestionsFromExam(exam2!.id, [])
    t('M8 إعادة الاستيراد بتتجاهل المتكرر',
      impAgain.imported === 0 && impAgain.skipped === 2, JSON.stringify(impAgain))

    // ═══ M8 refreshBankQuestionStats ═════════════════════════════════════
    // نعمل submission + إجابات على سؤال بنك عشان نتحقق من SQL الإحصائيات
    const student = await prisma.students.findFirst({ select: { id: true } })
    let subId: string | null = null
    if (student) {
      const target = eqs[0]
      const sub = await prisma.exam_submissions.create({
        data: { exam_id: examRow!.id, student_id: student.id, score: 1, total: 2, status: 'مصحح' },
        select: { id: true },
      })
      subId = sub.id
      await prisma.exam_answers.createMany({
        data: [
          { submission_id: sub.id, question_id: target.id, awarded_points: 1, is_correct: true,  needs_manual: false },
          { submission_id: sub.id, question_id: eqs[1].id, awarded_points: 0, is_correct: false, needs_manual: false },
        ],
      })

      const rf = await refreshBankQuestionStats()
      t('M8 تحديث الإحصائيات نجح', rf.success === true && rf.updated > 0, JSON.stringify(rf))

      const st1 = await prisma.question_bank_questions.findUnique({
        where: { id: target.bank_question_id! },
        select: { answers_count: true, correct_count: true, usage_count: true, last_used_at: true, auto_difficulty: true },
      })
      t('M8 answers_count = 1', st1?.answers_count === 1, JSON.stringify(st1))
      t('M8 correct_count = 1', st1?.correct_count === 1)
      t('M8 usage_count = 1 بعد التحديث', st1?.usage_count === 1, String(st1?.usage_count))
      t('M8 last_used_at موجود', !!st1?.last_used_at)
      t('M8 auto_difficulty = null لما الإجابات < 10', st1?.auto_difficulty === null, String(st1?.auto_difficulty))

      const st2 = await prisma.question_bank_questions.findUnique({
        where: { id: eqs[1].bank_question_id! }, select: { answers_count: true, correct_count: true },
      })
      t('M8 السؤال الغلط: answers=1 correct=0', st2?.answers_count === 1 && st2?.correct_count === 0, JSON.stringify(st2))

      // سؤال مش مستخدم لازم يترجّع لصفر
      const unusedQ = await prisma.question_bank_questions.findFirst({
        where: { id: qNoScope.id! }, select: { usage_count: true, answers_count: true, last_used_at: true },
      })
      t('M8 السؤال غير المستخدم اتصفّر', unusedQ?.usage_count === 0 && unusedQ?.answers_count === 0 && unusedQ?.last_used_at === null,
        JSON.stringify(unusedQ))

      // successRate بيظهر في القائمة
      const withRate = (await getBankQuestions({ perPage: 100 })).items.find(i => i.id === target.bank_question_id)
      t('M8 successRate = 1 في القائمة', withRate?.successRate === 1, String(withRate?.successRate))

      // 15 إجابة صح -> auto_difficulty = easy
      await prisma.exam_answers.createMany({
        data: Array.from({ length: 14 }, () => ({
          submission_id: sub.id, question_id: target.id, awarded_points: 1, is_correct: true, needs_manual: false,
        })),
      })
      await refreshBankQuestionStats()
      const st3 = await prisma.question_bank_questions.findUnique({
        where: { id: target.bank_question_id! }, select: { answers_count: true, auto_difficulty: true },
      })
      t('M8 auto_difficulty = easy عند 15 إجابة كلها صح',
        st3?.answers_count === 15 && st3?.auto_difficulty === 'easy', JSON.stringify(st3))
    } else {
      note('مفيش students — اتخطّينا اختبار الإحصائيات بالإجابات')
    }

    // ═══ M8 cleanupOrphanScopes ══════════════════════════════════════════
    const orphanQ = createdQ[0]
    await prisma.question_bank_scopes.create({
      data: { question_id: orphanQ, scope_type: 'lecture', scope_id: '11111111-1111-1111-1111-111111111111' },
    })
    const beforeClean = await prisma.question_bank_scopes.count({ where: { question_id: orphanQ } })
    const cl = await cleanupOrphanScopes()
    t('M8 تنظيف الروابط نجح', (cl as any).success === true, JSON.stringify(cl))
    const afterClean = await prisma.question_bank_scopes.count({ where: { question_id: orphanQ } })
    t('M8 النطاق اليتيم اتمسح', afterClean === beforeClean - 1, beforeClean + ' -> ' + afterClean)
    const stillThere = await prisma.question_bank_scopes.count({
      where: { question_id: orphanQ, scope_id: '11111111-1111-1111-1111-111111111111' },
    })
    t('M8 مفيش نطاق يتيم فاضل', stillThere === 0)

    // ═══ M4.3 أرشفة / استرجاع / حذف ══════════════════════════════════════
    const arch = await archiveBankQuestions([qNoScope.id!])
    t('M4.3 أرشفة نجحت', arch.success === true)
    const archRow = await prisma.question_bank_questions.findUnique({ where: { id: qNoScope.id! }, select: { archived_at: true } })
    t('M4.3 archived_at اتحدّد', !!archRow?.archived_at)
    const activeList = await getBankQuestions({ perPage: 100 })
    t('M4.3 المؤرشف مش في القائمة النشطة', !activeList.items.some(i => i.id === qNoScope.id))
    const archList = await getBankQuestions({ archived: true, perPage: 100 })
    t('M4.3 المؤرشف في تبويب المؤرشفة', archList.items.some(i => i.id === qNoScope.id))

    const res = await restoreBankQuestions([qNoScope.id!])
    t('M4.3 استرجاع نجح', res.success === true)
    const resRow = await prisma.question_bank_questions.findUnique({ where: { id: qNoScope.id! }, select: { archived_at: true } })
    t('M4.3 archived_at رجع null', resRow?.archived_at === null)

    t('M4.3 أرشفة بـ ids فاضية -> خطأ', !!(await archiveBankQuestions([])).error)
    t('M4.3 استرجاع بـ ids فاضية -> خطأ', !!(await restoreBankQuestions([])).error)
    t('M4.3 حذف بـ ids فاضية -> خطأ', !!(await deleteBankQuestions([])).error)

    // حذف: المستخدم يتأرشف، غير المستخدم يتحذف
    const usedId = pickForExam[0].id
    const unusedId = qNoScope.id!
    const del = await deleteBankQuestions([usedId, unusedId])
    t('M4.3 حذف: 1 اتحذف و 1 اتأرشف',
      del.deleted === 1 && del.archived === 1, JSON.stringify(del))
    t('M4.3 حذف: الرسالة عربية واضحة', !!del.message && del.message.includes('اتأرشف'), del.message)
    const usedStill = await prisma.question_bank_questions.findUnique({ where: { id: usedId }, select: { archived_at: true } })
    t('M4.3 حذف: السؤال المستخدم لسه موجود ومؤرشف', !!usedStill?.archived_at)
    const unusedGone = await prisma.question_bank_questions.findUnique({ where: { id: unusedId } })
    t('M4.3 حذف: غير المستخدم اتحذف نهائي', unusedGone === null)
    const examStillOk = await prisma.exam_questions.count({ where: { exam_id: examRow!.id } })
    t('M4.3 حذف: الاختبار مااتأثّرش', examStillOk === 2, String(examStillOk))

    // ═══ تنظيف ═══════════════════════════════════════════════════════════
    if (subId) {
      await prisma.exam_answers.deleteMany({ where: { submission_id: subId } })
      await prisma.exam_submissions.delete({ where: { id: subId } })
    }
    for (const id of createdExams) {
      await prisma.exam_questions.deleteMany({ where: { exam_id: id } })
      await prisma.exams.delete({ where: { id } }).catch(() => {})
    }
    await prisma.question_bank_questions.deleteMany({ where: { id: { in: [...new Set(createdQ)] } } })
    await prisma.question_bank_questions.deleteMany({ where: { notes: { contains: MARK } } })
    await prisma.question_bank_questions.deleteMany({ where: { question_text: { contains: MARK } } })
    await prisma.question_bank_topics.deleteMany({ where: { title: { contains: MARK } } })
    await prisma.question_bank_topics.deleteMany({ where: { title: { in: ['جبر', 'JABR', 'هندسة', 'تفاضل'] }, questions: { none: {} } } })

    const leftQ = await prisma.question_bank_questions.count()
    const leftEx = await prisma.exams.count({ where: { title: { contains: MARK } } })
    note('بعد التنظيف: أسئلة البنك=' + leftQ + ' اختبارات تجريبية باقية=' + leftEx)
    t('تنظيف: مفيش اختبارات تجريبية باقية', leftEx === 0)
    t('تنظيف: البنك رجع فاضي', leftQ === 0, 'باقي ' + leftQ)
  } catch (e: any) {
    fail++
    log.push('EXCEPTION :: ' + (e?.message || String(e)))
    log.push((e?.stack || '').split('\n').slice(0, 6).join('\n'))
  }

  return NextResponse.json({ pass, fail, log }, { status: 200 })
}
