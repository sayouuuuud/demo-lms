import { QuestionBankBrowser } from '@/components/question-bank/question-bank-browser'
import { getContentTree, getBankTopics, getBankStats, getBankQuestions } from './actions'

export const metadata = {
  title: 'بنك الأسئلة',
  description: 'إدارة وتنظيم الأسئلة وتوليدها للاختبارات',
}

export default async function QuestionBankPage() {
  const [tree, topics, stats, initialData] = await Promise.all([
    getContentTree(),
    getBankTopics(),
    getBankStats(),
    getBankQuestions({ page: 1, perPage: 20, archived: false }),
  ])

  return (
    <div className="space-y-6">
      <QuestionBankBrowser
        tree={tree}
        topics={topics}
        stats={stats}
        initialData={initialData}
      />
    </div>
  )
}
