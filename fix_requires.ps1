$files = Get-ChildItem -Path "src\commands" -Recurse -Filter "*.js"
$count = 0
foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        $folder = $file.Directory.Name
        
        $factory = "createCoolEmbed"
        if ("v3","v4","v5" -contains $folder) { $factory = "createPremiumEmbed" }
        elseif ("v6","v7","v8" -contains $folder) { $factory = "createEnterpriseEmbed" }

        # Check if the file uses the factory but is missing the require
        if (($content -match "const embed = ${factory}\(\)") -and (-not ($content -match "require\('\.\./\.\./utils/embeds'\)"))) {
            
            # Inject it right after module.exports = {
            $content = $content -replace '(module\.exports\s*=\s*\{)', "`$1`n  const { $factory } = require('../../utils/embeds');"
            
            # Wait, `const { createCoolEmbed } = require(...)` inside `module.exports = {` is invalid syntax! 
            # I must inject it at the top of the file, after the discord.js require.
            
            $content = $content -replace "(const .*require\('discord\.js'\);)", "`$1`nconst { $factory } = require('../../utils/embeds');"

            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            $count++
        }
    } catch {
        Write-Host "Failed to process $($file.Name)"
    }
}
Write-Host "Successfully fixed $count files."
