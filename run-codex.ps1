$prompt = Get-Content "C:\Users\mebab\.openclaw\workspace\projects\flowsign\codex-task.txt" -Raw
codex exec --full-auto $prompt
