$files = Get-ChildItem -Path "src\commands" -Recurse -Filter "*.js"
$count = 0
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        
        $regex = "(module\.exports\s*=\s*\{)\r?\n\s*const\s*\{\s*create[A-Za-z]+Embed\s*\}\s*=\s*require\('\.\./\.\./utils/embeds'\);"
        
        if ($content -match $regex) {
            $content = $content -replace $regex, '$1'
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            $count++
        }
    } catch {
        Write-Host "Failed to process $($file.Name)"
    }
}
Write-Host "Successfully cleaned $count files."
