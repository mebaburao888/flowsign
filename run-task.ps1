$prompt = Get-Content "$PSScriptRoot\CODEX_TASK.md" -Raw
codex exec --full-auto $prompt
