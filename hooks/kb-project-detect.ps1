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
            return [System.IO.Path]::GetFullPath($declared, (Split-Path -Parent $file))
        }
        # 同层 override 文件替代普通指令；不从被替代文件提取声明。
        return $null
    }
    return $null
}

function Find-KnowledgeBase {
    param([string]$WorkingDirectory, [string]$HostPlatform)

    if (-not [string]::IsNullOrWhiteSpace($env:KB_ROOT)) { return $env:KB_ROOT }

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
    $registry = Join-Path $kb 'projects/index.md'
    if (-not (Test-Path -LiteralPath $registry -PathType Leaf)) { exit 0 }
    $hit = Find-RegisteredProject -Registry $registry -WorkingDirectory $cwd
    if ($hit) {
        [pscustomobject]@{
            hookSpecificOutput = [pscustomobject]@{
                hookEventName = 'UserPromptSubmit'
                additionalContext = "当前工作目录 [$cwd] 属于知识库项目 [$hit]。开发任务前先按「知识库加载」规范调用 kb-loader 出加载清单（含验证方式）。"
            }
        } | ConvertTo-Json -Compress -Depth 5
    }
} catch {
    # 缺少配置、读取失败或事件无效时不阻断提示词；kb-loader 负责正式加载和报错。
}
exit 0
