/**
 * 测试运行器
 *
 * 目的：让「项目源码」在 Node 里以原生 ESM 方式运行，npm 包完全交给 Node 解析。
 * 为什么必须这样做：Dexie 会在模块加载那一刻读取 globalThis.indexedDB。一旦
 * dexie 与 dexie-react-hooks 被打包成两份副本，liveQuery 会静默失效
 * （UI 测试里表现为所有列表永远为空）。
 *
 * 做法：
 *  1. esbuild 以 bundle:false 转译每个源文件 → .tmp/ 下同名 .mjs（保留模块结构）
 *  2. 产物里的相对导入统一补上/改写为 .mjs 后缀，满足 Node ESM 的显式扩展名要求
 *  3. 裸包名（react / dexie / jsdom …）保持原样，交给 Node 原生解析
 *
 * 用法：node scripts/test-runner.mjs [all|db|ui|<测试文件路径>]
 */
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as esbuild from 'esbuild'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, '.tmp')

/**
 * 把产物里的相对导入改成 Node ESM 能识别的路径：
 *   './x'        → './x.mjs'
 *   './x.ts'     → './x.mjs'
 *   '../y/z.tsx' → '../y/z.mjs'
 * 只处理相对路径（以 ./ 或 ../ 开头），裸包名一律不动。
 */
function rewriteImports(code) {
  return code.replace(
    /(["'])(\.{1,2}\/[^"'\n]+?)(\.tsx?|\.mjs)?\1/g,
    (_m, quote, path) => `${quote}${path}.mjs${quote}`,
  )
}

/** 递归收集 .tmp 下所有 .mjs 产物 */
async function collect(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collect(full)))
    else if (entry.name.endsWith('.mjs')) out.push(full)
  }
  return out
}

async function build(entry) {
  await mkdir(OUT, { recursive: true })
  const outFile = resolve(OUT, entry.replace(/\.tsx?$/, '.mjs'))

  await esbuild.build({
    entryPoints: [resolve(ROOT, entry)],
    outdir: OUT,
    outbase: ROOT,
    // bundle:true + packages:'external' 时，esbuild 会为每个源模块产出独立 chunk，
    // 同时把 dexie/react 等依赖完整外置，保证整个测试过程只有一份 Dexie 实例。
    bundle: true,
    splitting: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    jsx: 'automatic',
    packages: 'external', // 关键：依赖不打包，由 Node 原生解析，保证单实例
    outExtension: { '.js': '.mjs' },
    loader: { '.css': 'empty' },
    logLevel: 'warning',
  })

  // 逐个产物改写相对导入（只改本次构建产生的文件）
  for (const file of await collect(OUT)) {
    const original = await readFile(file, 'utf8')
    const rewritten = rewriteImports(original)
    if (rewritten !== original) await writeFile(file, rewritten)
  }

  if (!existsSync(outFile)) throw new Error(`构建产物缺失：${outFile}`)
  return outFile
}

const NAMED = {
  all: ['tests/logic.test.ts', 'tests/db.test.ts', 'tests/ui.test.tsx'],
  logic: ['tests/logic.test.ts'],
  db: ['tests/db.test.ts'],
  ui: ['tests/ui.test.tsx'],
}

const which = process.argv[2] ?? 'all'
const targets = NAMED[which] ?? [which]

// 每个套件在独立子进程里执行：测试文件会用 process.exit 汇报结果，
// 同一进程内多次 import 会被后续 exit 打断，隔离后互不影响。
const { spawn } = await import('node:child_process')

function runInChild(outFile) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [outFile], { stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 1))
  })
}

let failed = false
for (const entry of targets) {
  const outFile = await build(entry)
  console.log(`\n▶ ${entry}`)
  const code = await runInChild(outFile)
  if (code !== 0) failed = true
}

if (failed) process.exit(1)
