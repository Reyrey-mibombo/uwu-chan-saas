$files = Get-ChildItem -Path "src\commands" -Recurse -Filter "*.js"
$count = 0
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        $folder = $file.Directory.Name
        
        $factory = "createCoolEmbed"
        if ("v3","v4","v5" -contains $folder) { $factory = "createPremiumEmbed" }
        elseif ("v6","v7","v8" -contains $folder) { $factory = "createEnterpriseEmbed" }

        # The regex to match the standard EmbedBuilder block
        $regex = 'const\s+embed\s*=\s*new\s+EmbedBuilder\(\)(?s).*?\.setTimestamp\(\)'
        
        if ($content -match $regex) {
            $content = $content -replace $regex, "const embed = ${factory}()"
            
            # Inject the require statement if it's not already there
            if (-not ($content -match $factory)) {
                $content = $content -replace '(async\s+execute\s*\([^)]*\)\s*\{)', "    const { $factory } = require('../../utils/embeds');`n`$1"
            }
            
            # Remove EmbedBuilder from top import
            $content = $content -replace 'const\s*\{\s*SlashCommandBuilder\s*,\s*EmbedBuilder\s*\}', 'const { SlashCommandBuilder }'

            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            $count++
        }
    } catch {
        Write-Host "Failed to process $($file.Name)"
    }
}
Write-Host "Successfully updated $count files."
