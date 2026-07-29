$files = Get-ChildItem -Path "d:\LMS\app\student" -Filter "page.tsx" -Recurse
foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw
    $content = $content -replace "import { StudentLayout } from '@\/components\/student\/student-layout'\r?\n", ""
    $content = $content -replace "<StudentLayout>\s*([\s\S]*?)\s*<\/StudentLayout>", "`$1"
    Set-Content -Path $f.FullName -Value $content -NoNewline
}
