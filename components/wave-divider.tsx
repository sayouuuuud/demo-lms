'use client'

/**
 * WaveDivider — الخط الذهبي المموج هو حد الفصل الفعلي بين الهيرو وقسم المنهج
 * الجزء فوق الخط شفاف تمامًا (يظهر خلفية الهيرو خلفه عبر الهامش السالب)
 * والجزء تحت الخط بلون خلفية القسم التالي بالضبط — بلا أي تظليل إضافي
 */
export function WaveDivider() {
  return (
    <div
      className="relative z-30 -mt-14 w-full overflow-hidden leading-[0] sm:-mt-[4.5rem]"
      style={{ marginBottom: -1 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 72"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block h-14 w-full sm:h-[4.5rem]"
      >
        <defs>
          <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="oklch(0.78 0.12 80)"  stopOpacity="0.2" />
            <stop offset="25%"  stopColor="oklch(0.82 0.15 85)"  stopOpacity="1"   />
            <stop offset="50%"  stopColor="oklch(0.88 0.18 88)"  stopOpacity="1"   />
            <stop offset="75%"  stopColor="oklch(0.82 0.15 85)"  stopOpacity="1"   />
            <stop offset="100%" stopColor="oklch(0.78 0.12 80)"  stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="gold-glow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="oklch(0.92 0.22 90)"  stopOpacity="0" />
            <stop offset="50%"  stopColor="oklch(0.92 0.22 90)"  stopOpacity="0.5" />
            <stop offset="100%" stopColor="oklch(0.92 0.22 90)"  stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* المنطقة تحت الموجة — نفس لون خلفية القسم التالي بالضبط، بلا تظليل */}
        <path
          d="M0,36 C180,64 360,8 540,36 C720,64 900,8 1080,36 C1260,64 1380,22 1440,36 L1440,72 L0,72 Z"
          className="fill-background"
        />

        {/* الخط الذهبي الرئيسي */}
        <path
          d="M0,36 C180,64 360,8 540,36 C720,64 900,8 1080,36 C1260,64 1380,22 1440,36"
          fill="none"
          stroke="url(#gold-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* وهج الخط */}
        <path
          d="M0,36 C180,64 360,8 540,36 C720,64 900,8 1080,36 C1260,64 1380,22 1440,36"
          fill="none"
          stroke="url(#gold-glow)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    </div>
  )
}
