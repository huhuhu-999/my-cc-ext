# UserPromptSubmit hook：共用项目识别逻辑，配置来源由平台入口显式选择。
# 只提供加载规范的提醒，不执行知识库中的命令，也不修改用户配置。
param(
    [ValidateSet('claude', 'codex')]
    [string]$Platform = 'claude'
)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ErrorActionPreference = 'Stop'

function Read-KbDeclaration {
    param([string[]]$Candidates)

    $tick = [char]96
    $pattern = '知识库根[：:]\s*' + $tick + '([^' + $tick + ']+)' + $tick
    foreach ($file in $Candidates) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { continue }
        $content = Get-Content -LiteralPath $file -Raw -Encoding UTF8
        if ([string]::IsNullOrWhiteSpace($content)) { continue }
        if ($content -match $pattern) {
            $declared = $Matches[1].Trim()
            return [pscustomobject]@{
                Root = [System.IO.Path]::GetFullPath($declared, (Split-Path -Parent $file))
                Source = $file
            }
        }
        # 同层 override 文件替代普通指令；不从被替代文件提取声明。
        return $null
    }
    return $null
}

function Find-KnowledgeBase {
    param([string]$WorkingDirectory, [string]$HostPlatform)

    # Hook 不从自然语言 prompt 猜任务路径；kb-loader 会按任务路径优先重新解析。
    if (-not [string]::IsNullOrWhiteSpace($env:KB_ROOT)) {
        return [pscustomobject]@{
            Root = if ([System.IO.Path]::IsPathFullyQualified($env:KB_ROOT)) {
                [System.IO.Path]::GetFullPath($env:KB_ROOT)
            } else {
                [System.IO.Path]::GetFullPath($env:KB_ROOT, $WorkingDirectory)
            }
            Source = 'KB_ROOT'
        }
    }

    # 从当前目录向上查找，Git 根目录（含 worktree 的 .git 文件）为边界。
    $directory = [System.IO.Path]::GetFullPath($WorkingDirectory)
    while ($directory) {
        $candidates = if ($HostPlatform -eq 'codex') {
            @((Join-Path $directory 'AGENTS.override.md'), (Join-Path $directory 'AGENTS.md'))
        } else {
            @((Join-Path $directory 'CLAUDE.md'), (Join-Path $directory '.claude/CLAUDE.md'))
        }
        $declared = Read-KbDeclaration -Candidates $candidates
        if ($declared) { return $declared }
        if (Test-Path -LiteralPath (Join-Path $directory '.git')) { break }
        $directory = Split-Path -Parent $directory
    }

    $profileRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::UserProfile)
    if ($HostPlatform -eq 'codex') {
        $configRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $profileRoot '.codex' }
        return Read-KbDeclaration -Candidates @(
            (Join-Path $configRoot 'AGENTS.override.md'), (Join-Path $configRoot 'AGENTS.md')
        )
    }
    $configRoot = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $profileRoot '.claude' }
    return Read-KbDeclaration -Candidates @((Join-Path $configRoot 'CLAUDE.md'))
}

function ConvertTo-MatchPath {
    param([string]$Value)

    $normalized = $Value.Trim().Trim([char]96).Replace([char]92, '/')
    if ($normalized -notmatch '^(?:[A-Za-z]:/|/)') { return $null }
    $unc = $normalized.StartsWith('//')
    $normalized = $normalized -replace '/+', '/'
    if ($unc) { $normalized = '/' + $normalized }
    if ($normalized -eq '/' -or $normalized -match '^[A-Za-z]:/$') { return $normalized }
    return $normalized.TrimEnd('/')
}

function Find-RegisteredProject {
    param([string]$Registry, [string]$WorkingDirectory)

    $cwdPath = ConvertTo-MatchPath $WorkingDirectory
    if (-not $cwdPath) { return $null }
    $hit = $null
    $best = -1
    foreach ($line in Get-Content -LiteralPath $Registry -Encoding UTF8) {
        if (-not $line.TrimStart().StartsWith('|')) { continue }
        $cells = $line.Trim().Split([char]124)
        if ($cells.Count -lt 5) { continue }
        $id = $cells[1].Trim().Trim([char]96)
        if (-not $id) { continue }
        foreach ($candidate in ($cells[3] -split '[;；]')) {
            $registered = ConvertTo-MatchPath $candidate
            if (-not $registered) { continue }
            $comparison = if ($registered -match '^[A-Za-z]:/' -or $registered.StartsWith('//')) {
                [System.StringComparison]::OrdinalIgnoreCase
            } else {
                [System.StringComparison]::Ordinal
            }
            $prefix = $registered.TrimEnd('/') + '/'
            if (($cwdPath.Equals($registered, $comparison) -or $cwdPath.StartsWith($prefix, $comparison)) -and $registered.Length -gt $best) {
                $hit = $id
                $best = $registered.Length
            }
        }
    }
    return $hit
}

try {
    $eventData = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if ($eventData.cwd -isnot [string] -or [string]::IsNullOrWhiteSpace($eventData.cwd)) { exit 0 }
    $cwd = $eventData.cwd
    $kb = Find-KnowledgeBase -WorkingDirectory $cwd -HostPlatform $Platform
    if (-not $kb) { exit 0 }
    $registry = Join-Path $kb.Root 'projects/index.md'
    $context = "知识库根 [$($kb.Root)]，来源 [$($kb.Source)]。"
    if (-not (Test-Path -LiteralPath $registry -PathType Leaf)) {
        $context += "注册表不可访问 [$registry]；不回退其他根，请由 kb-loader 报告并处理。"
    } else {
        $hit = Find-RegisteredProject -Registry $registry -WorkingDirectory $cwd
        if (-not $hit) { exit 0 }
        $context += "当前工作目录 [$cwd] 属于知识库项目 [$hit]。"
    }
    $context += 'Hook 未解析任务显式路径；开发前由 kb-loader 按任务路径 > KB_ROOT > 当前平台指令重新解析根、匹配项目并出加载清单（含验证方式）。'
    [pscustomobject]@{
        hookSpecificOutput = [pscustomobject]@{
            hookEventName = 'UserPromptSubmit'
            additionalContext = $context
        }
    } | ConvertTo-Json -Compress -Depth 5
} catch {
    # 事件无效时静默；已选配置的读取失败应可见，不回退、不绕过访问权限。
    if ($cwd -and $kb) {
        [pscustomobject]@{
            hookSpecificOutput = [pscustomobject]@{
                hookEventName = 'UserPromptSubmit'
                additionalContext = "知识库根 [$($kb.Root)]，来源 [$($kb.Source)] 不可访问：$($_.Exception.Message)。未回退其他根；请由 kb-loader 重新解析任务路径并处理。"
            }
        } | ConvertTo-Json -Compress -Depth 5
    }
}
exit 0
