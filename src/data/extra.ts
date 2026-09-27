/**
 * 扩展词库：四级进阶 + 雅思学术
 *
 * 与 cet4.ts 用同一套「管道分隔 DSL」，但字段更全，额外支持：
 *   词根含义说明 | 后缀说明 | 同族词
 * 用于支撑详情页的「词根与词族」区块与学习卡片的词族展示。
 *
 * 字段顺序（共 11 段，后 3 段可省略）：
 *   0 word | 1 phonetic | 2 pos | 3 translation | 4 forms | 5 exEn | 6 exZh
 *   7 roots | 8 rootNote | 9 suffix | 10 family
 * 注意：family 字段内部不能再用「|」（会与主分隔符冲突），
 *       改用「/」分段：同族词/词性/释义/全家族词（逗号分隔）
 */
import type { Book, Word } from '../types'

const RAW = `
resilient|/rɪˈzɪliənt/|adj.|有韧性的；能迅速恢复的||She stayed resilient through every setback.|经历每次挫折她都依然坚韧。|re-(回)+sil(跳)+-ient|sil 源自拉丁语 salire，意为「跳」|-ient 构成形容词，表示「具有…性质的」|resilience/n./韧性；恢复力/resilience,resiliency,resiliently
serendipity|/ˌserənˈdɪpəti/|n.|意外发现美好事物的能力；偶然发现珍宝的运气|serendipities|Meeting her was pure serendipity.|遇见她纯属意外的美好。|serendip+-ity|源自波斯童话《The Three Princes of Serendip》，三位王子总在无意中有意外收获|-ity 构成抽象名词，表示性质或状态|serendipitous/adj./偶然得到的，意外幸运的/serendipitous,serendipitously
meticulous|/məˈtɪkjələs/|adj.|一丝不苟的，极仔细的||He keeps meticulous records of every experiment.|他为每次实验都保留一丝不苟的记录。|metic(害怕)+-ulous|metic 源自拉丁语 metus「恐惧」，因恐惧出错而格外小心|-ulous 构成形容词，表示「多…的」|meticulously/adv./一丝不苟地/meticulously,meticulousness
wanderlust|/ˈwɑːndərlʌst/|n.|旅行的强烈愿望；漫游癖||Her wanderlust took her to thirty countries.|她的漫游癖带她走遍了三十个国家。|wander(漫游)+lust(渴望)|lust 在古英语中意为「强烈的欲望」||wanderer/n./漫游者，流浪者/wanderer,wander,wandering
vivid|/ˈvɪvɪd/|adj.|生动的，鲜明的；（记忆）清晰的|vivider,vividest|I still have a vivid memory of that day.|我对那天的记忆依然清晰生动。|viv(活)+-id|viv 源自拉丁语 vivere「活着」|-id 构成形容词，表示「处于…状态的」|vividly/adv./生动地/vividly,vividness,vivify
ubiquitous|/juːˈbɪkwɪtəs/|adj.|无处不在的，普遍存在的||Smartphones are ubiquitous in modern life.|智能手机在现代生活中无处不在。|ubique(到处)+-itous|拉丁语 ubique 意为「到处」|-ous 构成形容词|ubiquity/n./普遍存在/ubiquity,ubiquitously
ephemeral|/ɪˈfemərəl/|adj.|短暂的，转瞬即逝的||Fame is often ephemeral.|名声往往转瞬即逝。|ep-(在…上)+hemer(日)+-al|hemer 源自希腊语 hemera「一天」，只活一天|-al 构成形容词|ephemera/n./短暂的事物/ephemera,ephemerally
candid|/ˈkændɪd/|adj.|坦率的，直言的||She gave a candid account of the failure.|她坦率地讲述了这次失败。|cand(发光，白色)+-id|cand 引申为「清白、不加掩饰」|-id 构成形容词|candor/n./坦率，直言/candor,candidly,candidates
lucid|/ˈluːsɪd/|adj.|清晰的，明白易懂的；神志清醒的||He gave a lucid explanation of the theory.|他对这个理论做了清晰的解释。|luc(光)+-id|luc 源自拉丁语 lux「光」|-id 构成形容词|lucidity/n./清晰，明了/lucidity,lucidly
tenacious|/təˈneɪʃəs/|adj.|顽强的，坚持不懈的||She is tenacious in pursuing her goals.|她追求目标时非常顽强。|ten(握住)+-acious|ten 源自拉丁语 tenere「握住」|-acious 构成形容词，表示「倾向于…的」|tenacity/n./顽强，坚持/tenacity,tenaciously
pragmatic|/præɡˈmætɪk/|adj.|务实的，实用主义的||We need a pragmatic approach to the problem.|我们需要务实的方法来解决这个问题。|pragmat(行为)+-ic|希腊语 pragma 意为「做过的事」|-ic 构成形容词|pragmatism/n./实用主义/pragmatism,pragmatist,pragmatically
articulate|/ɑːrˈtɪkjuleɪt/|adj./v.|表达清晰的；清晰地表达|articulated,articulating,articulates|She is an articulate speaker.|她是一位表达清晰的演讲者。|articul(关节)+-ate|把话语像关节一样连接起来，故为「表达清晰」|-ate 构成动词/形容词|articulation/n./表达；发音/articulation,articulately
eloquent|/ˈeləkwənt/|adj.|雄辩的，有说服力的||He gave an eloquent speech at the ceremony.|他在典礼上发表了雄辩的演讲。|e-(出)+loqu(说)+-ent|loqu 源自拉丁语 loqui「说话」|-ent 构成形容词|eloquence/n./雄辩，口才/eloquence,eloquently
nuance|/ˈnuːɑːns/|n.|细微差别|nuances|The translation misses the nuance of the original.|这个翻译忽略了原文的细微差别。|nu(云)+-ance|原指「云影的渐变」，引申为细微差别|-ance 构成名词|nuanced/adj./细致入微的/nuanced
ambiguous|/æmˈbɪɡjuəs/|adj.|模棱两可的，含糊不清的||His reply was deliberately ambiguous.|他的答复故意含糊其辞。|ambi-(两边)+gu(走)+-ous|同时走向两边，所以意思不确定|-ous 构成形容词|ambiguity/n./歧义，含糊/ambiguity,ambiguously
pristine|/ˈprɪstiːn/|adj.|原始纯净的，崭新的||The beach remains pristine.|这片海滩依然纯净如初。|pristin(先前)+-e|拉丁语 pristinus 意为「从前的」||pristinely/adv./纯净地/pristinely
vicarious|/vaɪˈkeriəs/|adj.|间接感受到的，代入式的||He gets vicarious pleasure from his son's success.|他从儿子的成功中获得间接的快乐。|vic(替代)+-arious|拉丁语 vicarius 意为「替代的」|-ous 构成形容词|vicariously/adv./间接地/vicariously
gregarious|/ɡrɪˈɡeriəs/|adj.|爱交际的，群居的||She is a gregarious person who loves parties.|她是个爱交际的人，喜欢聚会。|greg(群)+-arious|拉丁语 grex 意为「群体」|-ous 构成形容词|gregariously/adv./群居地/gregariously
pensive|/ˈpensɪv/|adj.|沉思的，忧郁的||He looked pensive after reading the letter.|读完信后他显得若有所思。|pens(称量，思考)+-ive|pendere「称量」引申为「权衡思考」|-ive 构成形容词|pensively/adv./沉思地/pensively,pensiveness
quintessential|/ˌkwɪntɪˈsenʃl/|adj.|最典型的，精髓的||It is the quintessential Italian dish.|这是最典型的意大利菜。|quint(第五)+essent(本质)+-ial|古代认为第五元素是万物精髓|-ial 构成形容词|quintessence/n./精华，典范/quintessence,quintessentially
serene|/səˈriːn/|adj.|宁静的，安详的||The lake was calm and serene.|湖面平静而宁静。|seren(晴朗)+-e|拉丁语 serenus 意为「晴朗无云」||serenity/n./宁静/serenity,serenely
succinct|/səkˈsɪŋkt/|adj.|简洁的，言简意赅的||Please give a succinct summary.|请给一个简洁的总结。|suc-(在下)+cinct(束紧)|把衣袍束紧，引申为简洁||succinctly/adv./简洁地/succinctly,succinctness
trivial|/ˈtrɪviəl/|adj.|微不足道的，琐碎的||Don't waste time on trivial matters.|别在琐事上浪费时间。|tri-(三)+vi(路)+-al|三岔路口的闲聊，故为琐碎|-al 构成形容词|triviality/n./琐事/triviality,trivialize,trivially
vulnerable|/ˈvʌlnərəbl/|adj.|易受伤害的，脆弱的||Young birds are vulnerable to predators.|幼鸟容易受到捕食者伤害。|vulner(伤口)+-able|拉丁语 vulnus 意为「伤口」|-able 构成形容词|vulnerability/n./脆弱性/vulnerability,vulnerably
zealous|/ˈzeləs/|adj.|热心的，狂热的||He is a zealous defender of free speech.|他是言论自由的狂热捍卫者。|zeal(热情)+-ous|希腊语 zelos 意为「热忱」|-ous 构成形容词|zeal/n./热情/zeal,zealot,zealously
innate|/ɪˈneɪt/|adj.|天生的，固有的||She has an innate sense of rhythm.|她有天生的节奏感。|in-(在内)+nat(出生)+-e|与生俱来||innately/adv./天生地/innately,innateness
obsolete|/ˌɑːbsəˈliːt/|adj.|过时的，废弃的||The technology became obsolete within five years.|这项技术五年内就过时了。|ob-(反)+sol(习惯)+-ete|不再被使用||obsolescence/n./过时，淘汰/obsolescence,obsolescent
paramount|/ˈpærəmaʊnt/|adj.|至高无上的，最重要的||Safety is of paramount importance.|安全至关重要。|par-(通过)+amont(上面)|法语 par amont「在山上」，居高临下||paramountcy/n./最高地位/
reciprocal|/rɪˈsɪprəkl/|adj.|相互的，互惠的||They have a reciprocal arrangement.|他们有一个互惠的安排。|re-(回)+cipro(前)+-cal|来回往复，故为相互的|-al 构成形容词|reciprocate/v./回报，互换/reciprocate,reciprocity,reciprocally
corroborate|/kəˈrɑːbəreɪt/|v.|证实，印证|corroborated,corroborating,corroborates|Two witnesses corroborated his story.|两名证人证实了他的说法。|cor-(加强)+robor(力量)+-ate|robor 源自拉丁语 robur「力量」，加力使可信|-ate 构成动词|corroboration/n./证实/corroboration,corroborative
disseminate|/dɪˈsemɪneɪt/|v.|传播，散播|disseminated,disseminating,disseminates|The internet disseminates information fast.|互联网传播信息很快。|dis-(分开)+semin(种子)+-ate|像撒种子一样散播|-ate 构成动词|dissemination/n./传播/dissemination,disseminator
extol|/ɪkˈstoʊl/|v.|颂扬，赞美|extolled,extolling,extols|Critics extolled the film's originality.|影评人盛赞这部电影的原创性。|ex-(出)+tol(举起)|把某人高举起来赞美||extolment/n./赞美/
facilitate|/fəˈsɪlɪteɪt/|v.|促进，使便利|facilitated,facilitating,facilitates|The new road facilitates trade.|新公路促进了贸易。|facil(容易)+-itate|facilis「容易」，使其变容易|-ate 构成动词|facilitation/n./促进/facilitation,facilitator
impair|/ɪmˈper/|v.|损害，削弱|impaired,impairing,impairs|Loud noise can impair hearing.|巨大的噪音会损害听力。|im-(使)+pair(变坏)|pejorare「使变坏」||impairment/n./损伤/impairment,impaired
juxtapose|/ˈdʒʌkstəpoʊz/|v.|并置，并列|juxtaposed,juxtaposing,juxtaposes|The exhibition juxtaposes old and new art.|展览把新旧艺术并置。|juxta(旁边)+pos(放)|放在旁边 → 并置|-e 构成动词|juxtaposition/n./并置/juxtaposition
mitigate|/ˈmɪtɪɡeɪt/|v.|减轻，缓解|mitigated,mitigating,mitigates|Trees help mitigate air pollution.|树木有助于减轻空气污染。|mit(软)+ig(做)+-ate|使变柔和 → 缓解|-ate 构成动词|mitigation/n./缓解/mitigation,mitigating,unmitigated
perpetuate|/pərˈpetʃueɪt/|v.|使永存，使持续|perpetuated,perpetuating,perpetuates|Such jokes perpetuate stereotypes.|这类玩笑会让刻板印象延续下去。|per-(自始至终)+pet(追求)+-uate|不断追求 → 使其延续|-ate 构成动词|perpetuation/n./永存/perpetuation,perpetual,perpetually
prevalent|/ˈprevələnt/|adj.|盛行的，普遍的||This custom is prevalent in the north.|这个习俗在北方很盛行。|pre-(前)+val(强壮)+-ent|在众人之前很强 → 盛行|-ent 构成形容词|prevalence/n./盛行，流行/prevalence,prevalently
reiterate|/riˈɪtəreɪt/|v.|反复说，重申|reiterated,reiterating,reiterates|He reiterated his commitment to reform.|他重申了改革的承诺。|re-(再)+iter(重复)+-ate|再次重复|-ate 构成动词|reiteration/n./重申/reiteration,reiterative
scrutinize|/ˈskruːtənaɪz/|v.|仔细审查|scrutinized,scrutinizing,scrutinizes|Auditors scrutinize every receipt.|审计员仔细审查每一张收据。|scrutin(翻找废物)+-ize|在垃圾里翻找 → 仔细检查|-ize 构成动词|scrutiny/n./详细审查/scrutiny,scrutinizer
tangible|/ˈtændʒəbl/|adj.|有形的，可感知的；确实的||The project brought tangible benefits.|这个项目带来了实实在在的好处。|tang(触碰)+-ible|tangere「触摸」，能摸到的|-ible 构成形容词|tangibly/adv./确实地/tangibly,intangible
unprecedented|/ʌnˈpresɪdentɪd/|adj.|史无前例的||The city saw unprecedented growth.|这座城市经历了史无前例的增长。|un-(不)+precedent(先例)+-ed|没有先例||unprecedentedly/adv./史无前例地/precedent,precedented
versatile|/ˈvɜːrsətl/|adj.|多才多艺的；多用途的||She is a versatile musician.|她是一位多才多艺的音乐家。|vers(转)+-atile|能自由转向 → 多面手|-ile 构成形容词|versatility/n./多才多艺/versatility
coherent|/koʊˈhɪrənt/|adj.|连贯的，条理清晰的||We need a coherent strategy.|我们需要一个条理清晰的战略。|co-(一起)+her(粘)+-ent|粘在一起 → 连贯|-ent 构成形容词|coherence/n./连贯性/coherence,coherently,incoherent
diligent|/ˈdɪlɪdʒənt/|adj.|勤勉的，用功的||She is a diligent student.|她是个用功的学生。|di-(分开)+lig(选)+-ent|仔细挑选 → 用心|-ent 构成形容词|diligence/n./勤勉/diligence,diligently
frugal|/ˈfruːɡl/|adj.|节俭的；简朴的||They lead a frugal life.|他们过着节俭的生活。|frug(果实，收益)+-al|善于利用收益 → 节俭|-al 构成形容词|frugality/n./节俭/frugality,frugally
hinder|/ˈhɪndər/|v.|阻碍，妨碍|hindered,hindering,hinders|Heavy rain hindered the rescue.|大雨阻碍了救援。|hind(后面)|把…留在后面 → 拖后腿||hindrance/n./障碍/hindrance,hindering
imminent|/ˈɪmɪnənt/|adj.|即将发生的||A storm is imminent.|暴风雨即将来临。|im-(在…上)+min(突出)+-ent|悬在头上 → 迫近|-ent 构成形容词|imminence/n./迫近/imminence,imminently
lucrative|/ˈluːkrətɪv/|adj.|获利丰厚的||Online education is a lucrative business.|在线教育是利润丰厚的生意。|lucr(收益)+-ative|lucrum「利润」|-ive 构成形容词|lucratively/adv./获利丰厚地/
notorious|/noʊˈtɔːriəs/|adj.|臭名昭著的||The street is notorious for traffic jams.|这条街以堵车闻名。|not(知道)+-orious|被人人知晓（贬义）|-ous 构成形容词|notoriety/n./恶名/notoriety,notoriously
plausible|/ˈplɔːzəbl/|adj.|看似合理的，貌似可信的||That sounds like a plausible explanation.|那听起来是个合理的解释。|plaus(鼓掌)+-ible|值得鼓掌 → 可信|-ible 构成形容词|plausibility/n./可信度/plausibility,plausibly,implausible
reluctance|/rɪˈlʌktəns/|n.|不情愿，勉强||She agreed with reluctance.|她勉强同意了。|re-(反)+luct(挣扎)+-ance|内心挣扎 → 不情愿|-ance 构成名词|reluctant/adj./不情愿的/reluctant,reluctantly
skeptical|/ˈskeptɪkl/|adj.|怀疑的，持疑态度的||I am skeptical about that claim.|我对那个说法持怀疑态度。|skept(观察)+-ical|希腊语 skeptesthai「观察」，先观察再相信|-ical 构成形容词|skepticism/n./怀疑态度/skepticism,skeptic,skeptically
substantial|/səbˈstænʃl/|adj.|大量的；实质的||They made a substantial profit.|他们获得了可观的利润。|sub-(下)+stant(站)+-ial|站在下面支撑 → 实质的|-ial 构成形容词|substance/n./物质；实质/substance,substantially
tedious|/ˈtiːdiəs/|adj.|冗长乏味的||The paperwork is tedious.|这些文书工作很乏味。|ted(厌倦)+-ious|拉丁语 taedium「厌倦」|-ous 构成形容词|tedium/n./乏味/tedium,tediously
verify|/ˈverɪfaɪ/|v.|核实，证实|verified,verifying,verifies|Please verify your email address.|请验证你的邮箱地址。|ver(真实)+-ify|verus「真实」，使其为真|-ify 构成动词|verification/n./核实/verification,verifiable
`

/** 解析一行 DSL → Word */
function parseLine(line: string, index: number, bookId: string): Word | null {
  const f = line.split('|').map((s) => s.trim())
  const word = f[0]
  if (!word) return null

  const formsList = f[4] ? f[4].split(',').map((s) => s.trim()).filter(Boolean) : []
  const forms: Word['forms'] = {}
  if (formsList[0]) forms.past = formsList[0]
  if (formsList[1]) {
    if (formsList[1].endsWith('ing')) forms.ing = formsList[1]
    else forms.pastParticiple = formsList[1]
  }
  if (formsList[2]) forms.third = formsList[2]
  if (formsList[3]) forms.ing = formsList[3]

  const examples: Word['examples'] = f[5] ? [{ en: f[5], zh: f[6] || undefined }] : undefined

  const etymology: Word['etymology'] = f[7]
    ? { roots: f[7].split('+').map((s) => s.trim()), rootNote: f[8] || undefined, suffix: f[9] || undefined }
    : undefined

  // 同族词：同族词/词性/释义/全家族词（用「/」分段，避免与主分隔符「|」冲突）
  let family: Word['family']
  const famRaw = f[10]
  if (famRaw) {
    const seg = famRaw.split('/').map((t) => t.trim())
    family = {
      key: seg[0] ?? '',
      pos: seg[1] ?? '',
      meaning: seg[2] ?? '',
      words: (seg[3] ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
  }

  return {
    id: word.toLowerCase(),
    word,
    phonetic: f[1] ? { us: f[1], uk: f[1] } : undefined,
    pos: f[2] || '',
    translation: f[3] || '',
    senses: f[3] ? [{ pos: f[2] || '', zh: f[3], examples }] : undefined,
    examples,
    forms: Object.keys(forms).length ? forms : undefined,
    etymology,
    family,
    tags: [bookId],
    rank: 5000 + index,
  }
}

export const EXTRA_WORDS: Word[] = RAW.trim()
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith('#'))
  .map((l, i) => parseLine(l, i, 'cet4'))
  .filter((w): w is Word => w !== null)

/** 雅思学术词书（取扩展词库中偏学术/高阶的部分） */
export const IELTS_BOOK: Book = {
  id: 'ielts',
  name: '雅思学术词',
  description: '雅思阅读与写作高频学术词汇，侧重抽象概念与论证表达。',
  wordCount: 0,
  group: '考试',
  tagline: '学术写作与阅读高频词',
  custom: false,
  builtin: true,
  createdAt: 0,
  color: 'cyan',
}

/** 雅思词书收录范围：扩展词库中偏学术的后半部分 */
const IELTS_IDS = new Set([
  'ubiquitous', 'ephemeral', 'ambiguous', 'pragmatic', 'tenacious', 'articulate',
  'eloquent', 'reciprocal', 'corroborate', 'disseminate', 'facilitate', 'impair',
  'juxtapose', 'mitigate', 'perpetuate', 'prevalent', 'reiterate', 'scrutinize',
  'tangible', 'unprecedented', 'versatile', 'coherent', 'plausible', 'substantial',
  'tedious', 'verify', 'obsolete', 'paramount', 'quintessential', 'vicarious',
])

export const IELTS_WORDS: Word[] = EXTRA_WORDS.filter((w) => IELTS_IDS.has(w.id)).map((w) => ({
  ...w,
  tags: ['ielts'],
  rank: w.rank,
}))

export const IELTS_BOOK_WITH_COUNT: Book = { ...IELTS_BOOK, wordCount: IELTS_WORDS.length }
