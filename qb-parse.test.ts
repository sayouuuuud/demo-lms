import { parseBulkQuestions } from '@/lib/question-bank'

let pass = 0, fail = 0
const t = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('PASS  ' + name) }
  else { fail++; console.log('FAIL  ' + name + (detail ? ' :: ' + detail : '')) }
}

// ── 1. الصيغة الموثّقة في المودال (EXAMPLE) ──
const EXAMPLE = `س: ما هو ناتج 2 + 2؟ | صعوبة: سهل | درجة: 2
- 3
* 4
- 5
- 6

س: اشرح قانون نيوتن الأول.
نوع: مقالي`

const ex = parseBulkQuestions(EXAMPLE)
t('EXAMPLE -> 2 بلوك', ex.length === 2, 'got ' + ex.length)
t('EXAMPLE q1 نص متنظّف', ex[0]?.text === 'ما هو ناتج 2 + 2؟', JSON.stringify(ex[0]?.text))
t('EXAMPLE q1 type=mcq', ex[0]?.type === 'mcq')
t('EXAMPLE q1 صعوبة=easy', ex[0]?.difficulty === 'easy', ex[0]?.difficulty)
t('EXAMPLE q1 درجة=2', ex[0]?.points === 2, String(ex[0]?.points))
t('EXAMPLE q1 4 خيارات', ex[0]?.options.length === 4, JSON.stringify(ex[0]?.options))
t('EXAMPLE q1 صح=4', ex[0]?.correctAnswer === '4', JSON.stringify(ex[0]?.correctAnswer))
t('EXAMPLE q1 بدون أخطاء', ex[0]?.errors.length === 0, JSON.stringify(ex[0]?.errors))
t('EXAMPLE q2 type=essay', ex[1]?.type === 'essay', ex[1]?.type)
t('EXAMPLE q2 options فاضية', ex[1]?.options.length === 0)
t('EXAMPLE q2 بدون أخطاء', ex[1]?.errors.length === 0, JSON.stringify(ex[1]?.errors))
t('EXAMPLE q2 default صعوبة=medium', ex[1]?.difficulty === 'medium')
t('EXAMPLE q2 default درجة=1', ex[1]?.points === 1)

// ── 2. البادئات الموثّقة الثلاثة ──
const pre = parseBulkQuestions('س: أ\n- x\n* y\n\nس. ب\n- x\n* y\n\nسؤال: ج\n- x\n* y')
t('بادئة "س:" تتشال', pre[0]?.text === 'أ', JSON.stringify(pre[0]?.text))
t('بادئة "س." تتشال', pre[1]?.text === 'ب', JSON.stringify(pre[1]?.text))
t('بادئة "سؤال:" تتشال', pre[2]?.text === 'ج', JSON.stringify(pre[2]?.text))

// ── 3. كل قيم الصعوبة ──
const diffs = parseBulkQuestions('س: أ | صعوبة: سهل\n- x\n* y\n\nس: ب | صعوبة: متوسط\n- x\n* y\n\nس: ج | صعوبة: صعب\n- x\n* y')
t('سهل -> easy', diffs[0]?.difficulty === 'easy')
t('متوسط -> medium', diffs[1]?.difficulty === 'medium')
t('صعب -> hard', diffs[2]?.difficulty === 'hard')

// ── 4. مفاتيح على سطر منفصل (مش inline) ──
const sep = parseBulkQuestions('س: أ\nصعوبة: صعب\nدرجة: 5\n- x\n* y')
t('صعوبة على سطر منفصل', sep[0]?.difficulty === 'hard', sep[0]?.difficulty)
t('درجة على سطر منفصل', sep[0]?.points === 5, String(sep[0]?.points))

// ── 5. أخطاء الـ validation ──
const e1 = parseBulkQuestions('س: أ\n- خيار واحد بس')
t('خيار واحد -> خطأ "خيارين"', e1[0]?.errors.some(e => e.includes('خيارين')), JSON.stringify(e1[0]?.errors))

const e2 = parseBulkQuestions('س: أ\n- x\n- y\n- z')
t('مفيش * -> خطأ "إجابة صحيحة"', e2[0]?.errors.some(e => e.includes('إجابة صحيحة')), JSON.stringify(e2[0]?.errors))

const e3 = parseBulkQuestions('س: أ\n* x\n* y\n- z')
t('أكتر من * -> خطأ', e3[0]?.errors.length > 0, JSON.stringify(e3[0]?.errors))
t('أكتر من * -> ياخد الأول', e3[0]?.correctAnswer === 'x', JSON.stringify(e3[0]?.correctAnswer))

// ── 6. فواصل الأسطر الفاضية المتعددة ──
const multi = parseBulkQuestions('س: أ\n- x\n* y\n\n\n\nس: ب\n- x\n* y')
t('أسطر فاضية متعددة = فاصل واحد', multi.length === 2, 'got ' + multi.length)

// ── 7. مسافات + \r\n (Windows / لصق من Word) ──
const crlf = parseBulkQuestions('س: أ\r\n- x\r\n* y\r\n\r\nس: ب\r\n- x\r\n* y')
t('CRLF -> 2 بلوك', crlf.length === 2, 'got ' + crlf.length)
t('CRLF: نص نظيف من \\r', crlf[0]?.text === 'أ', JSON.stringify(crlf[0]?.text))
t('CRLF: خيار نظيف من \\r', crlf[0]?.options[0] === 'x', JSON.stringify(crlf[0]?.options))
t('CRLF: correctAnswer نظيف', crlf[0]?.correctAnswer === 'y', JSON.stringify(crlf[0]?.correctAnswer))

// ── 8. إدخال فاضي ──
t('نص فاضي -> []', parseBulkQuestions('').length === 0)
t('مسافات بس -> []', parseBulkQuestions('   \n\n  \n').length === 0)

// ── 9. سؤال بدون نص (خيارات بس) — بيولّد صف بنص فاضي؟ ──
const noText = parseBulkQuestions('- x\n* y')
t('بلوك بدون نص سؤال يترصد', noText.length === 0 || noText[0].errors.length > 0 || noText[0].text !== '',
  'text=' + JSON.stringify(noText[0]?.text) + ' errors=' + JSON.stringify(noText[0]?.errors))

// ── 10. سؤال نصه فاضي بعد البادئة ──
const emptyText = parseBulkQuestions('س:\n- x\n* y')
t('نص فاضي بعد البادئة يترصد', emptyText[0]?.errors.length > 0 || emptyText[0]?.text !== '',
  'text=' + JSON.stringify(emptyText[0]?.text) + ' errors=' + JSON.stringify(emptyText[0]?.errors))

// ── 11. درجة سالبة / صفر ──
const zeroPts = parseBulkQuestions('س: أ | درجة: 0\n- x\n* y')
t('درجة 0 -> تتصحّح لـ >=1', (zeroPts[0]?.points ?? 0) >= 1, String(zeroPts[0]?.points))

// ── 12. "نوع: مقالي" مع خيارات موجودة (تعارض) ──
const conflict = parseBulkQuestions('س: أ\nنوع: مقالي\n- x\n* y')
t('نوع مقالي يتغلّب على الخيارات', conflict[0]?.type === 'essay', conflict[0]?.type)
t('essay -> options تتفرّغ', conflict[0]?.options.length === 0, JSON.stringify(conflict[0]?.options))

// ── 13. مسافات زيادة حول الخيارات والمفاتيح ──
const spaces = parseBulkQuestions('س:   أ   |   صعوبة:  سهل   |  درجة:  3  \n-    x   \n*    y   ')
t('مسافات: نص متنظّف', spaces[0]?.text === 'أ', JSON.stringify(spaces[0]?.text))
t('مسافات: صعوبة اتقرأت', spaces[0]?.difficulty === 'easy', spaces[0]?.difficulty)
t('مسافات: درجة اتقرأت', spaces[0]?.points === 3, String(spaces[0]?.points))
t('مسافات: خيار متنظّف', spaces[0]?.options[0] === 'x', JSON.stringify(spaces[0]?.options))

// ── 14. سؤال طويل واقعي بـ 50 بلوك ──
const many = Array.from({ length: 50 }, (_, i) => `س: سؤال رقم ${i + 1}؟\n- أ\n* ب\n- ج`).join('\n\n')
const manyP = parseBulkQuestions(many)
t('50 بلوك تتحلّل كلها', manyP.length === 50, 'got ' + manyP.length)
t('50 بلوك كلها صالحة', manyP.every(q => q.errors.length === 0), 'invalid: ' + manyP.filter(q => q.errors.length).length)

console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===')
process.exit(fail ? 1 : 0)
