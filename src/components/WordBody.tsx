/**
 * 词条正文区块
 *
 * 单词本详情页与学习流程详情页共用同一份内容渲染
 * （两个页面底部按钮不同，内容完全相同 —— 重复实现必然会改一处漏一处）。
 */
import { BookMarked, GitBranch, Layers, Link2, Quote, Repeat } from 'lucide-react'
import type { Word } from '../types'

const FORM_LABELS: { key: keyof NonNullable<Word['forms']>; label: string }[] = [
  { key: 'third', label: '第三人称单数' },
  { key: 'past', label: '过去式' },
  { key: 'pastParticiple', label: '过去分词' },
  { key: 'ing', label: '现在分词' },
  { key: 'plural', label: '复数' },
  { key: 'comparative', label: '比较级' },
  { key: 'superlative', label: '最高级' },
]

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="block">
      <h2 className="block__title">
        {icon}
        {title}
      </h2>
      <div className="block__body">{children}</div>
    </section>
  )
}

export default function WordBody({ word }: { word: Word }) {
  const forms = FORM_LABELS.filter((f) => word.forms?.[f.key])
  const senses = word.senses?.length ? word.senses : null
  const examples = word.examples?.length ? word.examples : null
  const roots = word.etymology?.roots?.filter(Boolean) ?? []

  return (
    <>
      {senses ? (
        <Block icon={<BookMarked size={15} aria-hidden />} title="释义">
          {senses.map((s, i) => (
            <div className="sense" key={`${s.pos}-${i}`}>
              <span className="sense__pos">{s.pos}</span>
              <span className="sense__zh">
                {s.zh}
                {s.en ? (
                  <span className="dim" style={{ display: 'block', fontSize: 13 }}>
                    {s.en}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </Block>
      ) : null}

      {examples ? (
        <Block icon={<Quote size={15} aria-hidden />} title="例句">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {examples.map((ex, i) => (
              <div className="example" key={i}>
                <div className="example__en display">{ex.en}</div>
                {ex.zh ? <div className="example__zh">{ex.zh}</div> : null}
              </div>
            ))}
          </div>
        </Block>
      ) : null}

      {forms.length ? (
        <Block icon={<Repeat size={15} aria-hidden />} title="词形变化">
          <div className="forms-grid">
            {forms.map((f) => (
              <div className="form-item" key={f.key}>
                <div className="form-item__k">{f.label}</div>
                <div className="form-item__v">{word.forms?.[f.key]}</div>
              </div>
            ))}
          </div>
        </Block>
      ) : null}

      {roots.length || word.etymology?.rootNote || word.etymology?.suffix ? (
        <Block icon={<GitBranch size={15} aria-hidden />} title="词根词缀">
          {roots.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {roots.map((r, i) => (
                <span className="chip chip--amber" key={i}>
                  {r}
                </span>
              ))}
            </div>
          ) : null}
          {word.etymology?.rootNote ? (
            <p className="muted" style={{ fontSize: 14 }}>
              {word.etymology.rootNote}
            </p>
          ) : null}
          {word.etymology?.suffix ? (
            <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
              {word.etymology.suffix}
            </p>
          ) : null}
        </Block>
      ) : null}

      {word.family ? (
        <Block icon={<Layers size={15} aria-hidden />} title="同族词">
          <div style={{ marginBottom: 8 }}>
            <span className="display" style={{ fontSize: 16, fontWeight: 600 }}>
              {word.family.key}
            </span>
            {word.family.pos ? <span className="dim" style={{ marginLeft: 8, fontSize: 13 }}>{word.family.pos}</span> : null}
            {word.family.meaning ? (
              <span className="muted" style={{ marginLeft: 8, fontSize: 14 }}>
                {word.family.meaning}
              </span>
            ) : null}
          </div>
          {word.family.words?.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {word.family.words.map((w) => (
                <span className="chip" key={w}>
                  {w}
                </span>
              ))}
            </div>
          ) : null}
        </Block>
      ) : null}

      {word.collocations?.length ? (
        <Block icon={<Link2 size={15} aria-hidden />} title="常见搭配">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {word.collocations.map((c) => (
              <span className="chip chip--cyan" key={c}>
                {c}
              </span>
            ))}
          </div>
        </Block>
      ) : null}
    </>
  )
}
