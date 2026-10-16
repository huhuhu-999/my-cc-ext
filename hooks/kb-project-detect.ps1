# kb-project-detect.ps1 — UserPromptSubmit hook（随 my-ext 插件分发）
# 作用：按当前工作目录匹配知识库项目注册表，命中则把项目标识注入上下文，提醒先加载规范。
# KB 根解析顺序：环境变量 KB_ROOT → 用户级指令文件里的「知识库根：」声明；解析不到则静默退出。
# 注：脚本内一律用正斜杠与 [char] 码点，避免反斜杠字面量在多层转义中失真。
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding            = [System.Text.UTF8Encoding]::new($false)

$BS = [char]92      # 反斜杠
$BT = [char]96      # 反引号
$PIPE = [char]124   # 竖线

# ---- 1. 解析 KB 根 ----
$kb = $env:KB_ROOT
if (-not $kb) {
    $md = Join-Path $env:USERPROFILE '.claude/CLAUDE.md'
    if (Test-Path -LiteralPath $md) {
        $pattern = '知识库根：' + $BT + '([^' + $BT + ']+)' + $BT
        foreach ($line in Get-Content -LiteralPath $md -Encoding UTF8) {
            if ($line -match $pattern) { $kb = $Matches[1]; break }
        }
    }
}
if (-not $kb) { exit 0 }
$kb  = $kb.TrimEnd('/', $BS)
$reg = Join-Path $kb 'projects/index.md'
if (-not (Test-Path -LiteralPath $reg)) { exit 0 }

# ---- 2. 按 cwd 匹配注册表「代码目录」列 ----
$raw = [Console]::In.ReadToEnd()
$cwd = $null
if ($raw) { try { $cwd = ($raw | ConvertFrom-Json).cwd } catch { } }
if (-not $cwd) { $cwd = (Get-Location).Path }
$cwdN = $cwd.Replace($BS, '/')

$hit = $null; $best = -1
foreach ($line in Get-Content -LiteralPath $reg -Encoding UTF8) {
    if (-not $line.StartsWith('|')) { continue }
    $cells = $line.Split($PIPE)
    if ($cells.Count -lt 5) { continue }
    $id  = $cells[1].Trim().Trim($BT)
    $dir = $cells[3].Trim().Trim($BT)
    if ($dir -notmatch '^[A-Za-z]:') { continue }          # 跳过“不适用/未登记”等非路径
    $dirN = $dir.Replace($BS, '/')
    if ($cwdN.StartsWith($dirN, [System.StringComparison]::OrdinalIgnoreCase) -and $dirN.Length -gt $best) {
        $hit = $id; $best = $dirN.Length
    }
}

# ---- 3. 命中则注入提醒 ----
if ($hit) {
    $ctx = "当前工作目录 [$cwd] 属于知识库项目 [$hit]。开发任务前先按「知识库加载」规范调用 kb-loader 出加载清单（含验证方式）。"
    [pscustomobject]@{
        hookSpecificOutput = [pscustomobject]@{
            hookEventName     = 'UserPromptSubmit'
            additionalContext = $ctx
        }
    } | ConvertTo-Json -Compress -Depth 5
}
exit 0
