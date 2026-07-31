import { StreamingTab } from '@/components/settings/streaming-tab'

export default function TmpPreview() {
  return (
    <div dir="rtl" className="min-h-screen bg-background p-6">
      <StreamingTab
        settings={{
          enabled: true,
          r2Configured: true,
          workerCpuThreads: 2,
          workerRamMb: 2560,
          workerConcurrency: 1,
          segmentDurationSec: 10,
        }}
        jobs={[]}
        videos={[]}
      />
    </div>
  )
}
