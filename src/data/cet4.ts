/**
 * CET4 核心词库种子数据
 *
 * 用「管道分隔 DSL」书写词条，运行时解析成完整 Word 结构：
 *   word | 音标 | 词性 | 中文释义 | 词形变化 | 英文例句 | 中文例句 | 词根词缀 | 搭配
 *
 * 后 3 段可省略。这样写的好处：数据密度高、易校对、易扩充，
 * 后续换成 ECDICT 全量词库时，只要产出同样形状的 Word[] 即可，上层代码零改动。
 *
 * 覆盖范围：四级高频核心词（含全部超高频动词 / 形容词 / 名词），按词频降序排列。
 * 释义以《大学英语四级考试大纲》为准，例句为原创简短句，突出该词的典型用法。
 */
import type { Book, Word } from '../types'

/** DSL 原始数据：word|phonetic|pos|translation|forms|exEn|exZh|roots|collocations */
const RAW = `
abandon|/əˈbændən/|v.|放弃；抛弃；遗弃|abandoned,abandoning,abandons|They had to abandon the plan because of the storm.|因为暴风雨，他们不得不放弃这个计划。|ab-(离开)+band(禁令)|abandon hope;abandon ship
ability|/əˈbɪləti/|n.|能力；才能|abilities|She has the ability to solve hard problems.|她有解决难题的能力。|abil(能够)+-ity(名词后缀)|to the best of one's ability
able|/ˈeɪbl/|adj.|能够的；有能力的|abler,ablest|He is able to speak three languages.|他能说三种语言。||be able to do
absolute|/ˈæbsəluːt/|adj.|绝对的；完全的||There is no absolute answer to this question.|这个问题没有绝对的答案。|ab-(离开)+solu(松开)|absolute power
absorb|/əbˈzɔːrb/|v.|吸收；使专心|absorbed,absorbing,absorbs|Plants absorb water through their roots.|植物通过根吸收水分。|ab-(去)+sorb(吸)|be absorbed in
abstract|/ˈæbstrækt/|adj./n.|抽象的；摘要||Beauty is an abstract concept.|美是一个抽象的概念。|abs-(离开)+tract(拉)|abstract idea
abundant|/əˈbʌndənt/|adj.|丰富的；充裕的||The region has abundant natural resources.|这个地区有丰富的自然资源。|ab-(加强)+und(波涌)+-ant|abundant in
academic|/ˌækəˈdemɪk/|adj.|学术的；学院的||Her academic record is excellent.|她的学业成绩非常优秀。||academic year
accelerate|/əkˈseləreɪt/|v.|加速；促进|accelerated,accelerating,accelerates|The car accelerated around the corner.|汽车在拐角处加速了。|ac-(加强)+celer(快)+-ate|accelerate growth
accent|/ˈæksent/|n.|口音；重音||She speaks English with a slight accent.|她说英语带一点口音。|ac-(加强)+cent(唱)|foreign accent
accept|/əkˈsept/|v.|接受；承认|accepted,accepting,accepts|I accept your apology.|我接受你的道歉。|ac-(去)+cept(拿)|accept responsibility
access|/ˈækses/|n./v.|接近；进入；通道||Students have free access to the library.|学生可以免费使用图书馆。|ac-(去)+cess(走)|access to
accident|/ˈæksɪdənt/|n.|事故；意外|accidents|The accident was caused by heavy fog.|这起事故是大雾造成的。|ac-(去)+cid(落)+-ent|by accident
accompany|/əˈkʌmpəni/|v.|陪伴；伴随|accompanied,accompanying,accompanies|She accompanied her mother to the hospital.|她陪母亲去了医院。|ac-(去)+company(同伴)|accompanied by
accomplish|/əˈkɑːmplɪʃ/|v.|完成；实现|accomplished,accomplishing,accomplishes|We accomplished the task ahead of time.|我们提前完成了任务。|ac-(加强)+compl(填满)+-ish|accomplish a goal
account|/əˈkaʊnt/|n./v.|账户；解释；认为||Please check your bank account.|请查看你的银行账户。|ac-(去)+count(计算)|take into account;account for
accurate|/ˈækjərət/|adj.|准确的；精确的||The map is not very accurate.|这张地图不太准确。|ac-(加强)+cur(关心)+-ate|accurate data
accuse|/əˈkjuːz/|v.|指控；控告|accused,accusing,accuses|They accused him of stealing the file.|他们指控他偷了文件。|ac-(去)+cus(原因)|accuse sb of
achieve|/əˈtʃiːv/|v.|实现；达到；取得|achieved,achieving,achieves|He achieved his goal after years of effort.|经过多年努力他实现了目标。|a-(去)+chieve(头，顶点)|achieve success
acknowledge|/əkˈnɑːlɪdʒ/|v.|承认；致谢|acknowledged,acknowledging,acknowledges|She acknowledged that she had made a mistake.|她承认自己犯了个错误。|ac-(加强)+knowledge(知道)|acknowledge a fact
acquire|/əˈkwaɪər/|v.|获得；学到|acquired,acquiring,acquires|Children acquire language very quickly.|儿童学习语言非常快。|ac-(去)+quir(寻求)|acquire knowledge
adapt|/əˈdæpt/|v.|适应；改编|adapted,adapting,adapts|It took him a month to adapt to the new job.|他花了一个月适应新工作。|ad-(去)+apt(适合)|adapt to
addition|/əˈdɪʃn/|n.|增加；加法||In addition, we need more time.|此外，我们还需要更多时间。|ad-(去)+dit(给)+-ion|in addition to
adequate|/ˈædɪkwət/|adj.|足够的；适当的||The room is adequate for two people.|这个房间够两个人住。|ad-(去)+equ(相等)+-ate|adequate for
adjust|/əˈdʒʌst/|v.|调整；适应|adjusted,adjusting,adjusts|You can adjust the volume with this button.|你可以用这个按钮调节音量。|ad-(去)+just(正确)|adjust to
admire|/ədˈmaɪər/|v.|钦佩；欣赏|admired,admiring,admires|I admire her courage.|我钦佩她的勇气。|ad-(去)+mir(惊奇)|admire sb for
admit|/ədˈmɪt/|v.|承认；准许进入|admitted,admitting,admits|He admitted that he was wrong.|他承认自己错了。|ad-(去)+mit(送)|admit to
adopt|/əˈdɑːpt/|v.|采用；收养|adopted,adopting,adopts|The company adopted a new strategy.|公司采用了新策略。|ad-(去)+opt(选择)|adopt a policy
advance|/ədˈvæns/|v./n.|前进；进步；预先的|advanced,advancing,advances|Technology advances year by year.|技术年年在进步。|ad-(去)+vanc(前)|in advance
advantage|/ədˈvæntɪdʒ/|n.|优势；有利条件|advantages|Speaking two languages is a great advantage.|会说两种语言是很大的优势。|advant(前面)+-age|take advantage of
advertise|/ˈædvərtaɪz/|v.|做广告；宣传|advertised,advertising,advertises|They advertise their products online.|他们在网上做产品广告。|ad-(去)+vert(转)+-ise|advertise for
advocate|/ˈædvəkeɪt/|v./n.|提倡；拥护者|advocated,advocating,advocates|Many experts advocate a low-sugar diet.|许多专家提倡低糖饮食。|ad-(去)+voc(喊)+-ate|advocate for
affect|/əˈfekt/|v.|影响；感动|affected,affecting,affects|The weather affects my mood.|天气影响我的心情。|af-(去)+fect(做)|be affected by
afford|/əˈfɔːrd/|v.|负担得起；提供|afforded,affording,affords|We cannot afford a new car right now.|我们现在买不起新车。|af-(去)+ford(向前)|afford to do
agency|/ˈeɪdʒənsi/|n.|代理机构；作用|agencies|She works for a travel agency.|她在一家旅行社工作。|ag(做)+-ency|news agency
aggressive|/əˈɡresɪv/|adj.|好斗的；有进取心的||He is too aggressive in meetings.|他在会议上太咄咄逼人。|ag-(去)+gress(走)+-ive|aggressive behavior
agreement|/əˈɡriːmənt/|n.|协议；同意|agreements|They finally reached an agreement.|他们最终达成了协议。|agree(同意)+-ment|reach an agreement
aid|/eɪd/|n./v.|帮助；援助||The government sent aid to the flood area.|政府向洪灾区送去了援助。||first aid
alarm|/əˈlɑːrm/|n./v.|警报；使惊恐||The fire alarm woke everyone up.|火警警报把所有人都吵醒了。|al-(去)+arm(武器)|set an alarm
alcohol|/ˈælkəhɔːl/|n.|酒精；酒||This drink contains no alcohol.|这种饮料不含酒精。||alcohol abuse
alter|/ˈɔːltər/|v.|改变；修改|altered,altering,alters|We had to alter our travel plans.|我们不得不改变旅行计划。|alter(其他的)|alter a plan
alternative|/ɔːlˈtɜːrnətɪv/|n./adj.|替代品；可供选择的||Is there an alternative to this plan?|这个计划有替代方案吗？|altern(交替)+-ative|alternative energy
amaze|/əˈmeɪz/|v.|使惊奇|amazed,amazing,amazes|Her progress amazed the teacher.|她的进步让老师吃惊。|a-(加强)+maze(迷惑)|be amazed at
ambition|/æmˈbɪʃn/|n.|雄心；抱负||His ambition is to become a doctor.|他的抱负是成为一名医生。|ambit(走)+-ion|achieve one's ambition
amount|/əˈmaʊnt/|n./v.|数量；总计||A large amount of money was spent.|花掉了大量的钱。|a-(去)+mount(山，上升)|a large amount of
analyze|/ˈænəlaɪz/|v.|分析|analyzed,analyzing,analyzes|Let's analyze the data first.|我们先分析一下数据。|ana-(分开)+lyz(松开)|analyze data
ancient|/ˈeɪnʃənt/|adj.|古代的；古老的||We visited an ancient temple.|我们参观了一座古庙。|anc(古老)+-ient|ancient history
announce|/əˈnaʊns/|v.|宣布；通告|announced,announcing,announces|The company announced a new product.|公司宣布了一款新产品。|an-(去)+nounc(报告)|announce a decision
annual|/ˈænjuəl/|adj.|每年的；年度的||The annual meeting is in May.|年会在五月举行。|ann(年)+-ual|annual report
anxiety|/æŋˈzaɪəti/|n.|焦虑；渴望|anxieties|She felt great anxiety before the exam.|考试前她感到非常焦虑。|anxi(焦急)+-ety|suffer from anxiety
apart|/əˈpɑːrt/|adv.|分开；相隔||The two towns are ten miles apart.|两个镇相隔十英里。|a-(去)+part(部分)|apart from
apologize|/əˈpɑːlədʒaɪz/|v.|道歉|apologized,apologizing,apologizes|He apologized for being late.|他为迟到道歉。|apo-(离开)+log(说)+-ize|apologize to sb for
apparent|/əˈpærənt/|adj.|明显的；表面上的||It was apparent that she was tired.|很明显她累了。|ap-(去)+par(出现)+-ent|for no apparent reason
appeal|/əˈpiːl/|v./n.|呼吁；上诉；吸引力|appealed,appealing,appeals|The charity appealed for donations.|慈善机构呼吁捐款。|ap-(去)+peal(驱动)|appeal to
appetite|/ˈæpɪtaɪt/|n.|食欲；欲望||Exercise gave me a good appetite.|运动让我食欲很好。|ap-(去)+pet(寻求)+-ite|lose one's appetite
apply|/əˈplaɪ/|v.|申请；应用；适用|applied,applying,applies|She applied for a scholarship.|她申请了奖学金。|ap-(去)+ply(折)|apply for;apply to
appoint|/əˈpɔɪnt/|v.|任命；约定|appointed,appointing,appoints|He was appointed manager last year.|他去年被任命为经理。|ap-(去)+point(点)|appoint sb as
appreciate|/əˈpriːʃieɪt/|v.|感激；欣赏；升值|appreciated,appreciating,appreciates|I really appreciate your help.|我非常感谢你的帮助。|ap-(加强)+preci(价值)+-ate|appreciate it
approach|/əˈproʊtʃ/|v./n.|接近；方法|approached,approaching,approaches|We need a new approach to the problem.|我们需要新方法来解决这个问题。|ap-(去)+proach(近)|approach to
appropriate|/əˈproʊpriət/|adj.|适当的；恰当的||Jeans are not appropriate for the interview.|面试穿牛仔裤不合适。|ap-(去)+propri(自己的)+-ate|appropriate for
approve|/əˈpruːv/|v.|批准；赞成|approved,approving,approves|The committee approved the budget.|委员会批准了预算。|ap-(去)+prov(证明)|approve of
approximate|/əˈprɑːksɪmət/|adj.|大概的；近似的||Give me an approximate number.|给我一个大概的数字。|ap-(去)+proxim(最近)+-ate|approximate value
argue|/ˈɑːrɡjuː/|v.|争论；主张|argued,arguing,argues|They argued about money again.|他们又为钱争吵了。|argu(使清楚)|argue with sb about
arise|/əˈraɪz/|v.|出现；产生|arose,arisen,arises|New problems arise every day.|新问题每天都在出现。|a-(去)+rise(升起)|arise from
arrange|/əˈreɪndʒ/|v.|安排；整理|arranged,arranging,arranges|She arranged a meeting for Friday.|她安排了周五的会议。|ar-(去)+range(排列)|arrange for
arrest|/əˈrest/|v./n.|逮捕；阻止|arrested,arresting,arrests|The police arrested two suspects.|警方逮捕了两名嫌疑人。|ar-(加强)+rest(停留)|under arrest
artificial|/ˌɑːrtɪˈfɪʃl/|adj.|人造的；虚假的||This is artificial leather.|这是人造革。|art(技艺)+fic(做)+-ial|artificial intelligence
aspect|/ˈæspekt/|n.|方面；外观||Consider every aspect of the plan.|考虑计划的每个方面。|a-(去)+spect(看)|in all aspects
assess|/əˈses/|v.|评估；评定|assessed,assessing,assesses|Teachers assess students' progress.|老师评估学生的进步。|as-(去)+sess(坐)|assess the risk
assign|/əˈsaɪn/|v.|分配；指派|assigned,assigning,assigns|The teacher assigned us a project.|老师给我们布置了一个项目。|as-(去)+sign(标记)|assign sth to sb
assist|/əˈsɪst/|v.|帮助；协助|assisted,assisting,assists|A nurse assisted the doctor.|一名护士协助医生。|as-(去)+sist(站)|assist sb in
associate|/əˈsoʊsieɪt/|v./n.|联想；伙伴|associated,associating,associates|We associate red with danger.|我们把红色和危险联系起来。|as-(去)+soci(同伴)+-ate|associate with
assume|/əˈsuːm/|v.|假定；承担|assumed,assuming,assumes|I assume you have read the report.|我假设你已读过报告。|as-(去)+sum(拿)|assume responsibility
assure|/əˈʃʊr/|v.|保证；使确信|assured,assuring,assures|I assure you the work will be done.|我向你保证工作会完成。|as-(加强)+sure(确定)|assure sb of
attach|/əˈtætʃ/|v.|系上；附加|attached,attaching,attaches|Please attach the file to the email.|请把文件附在邮件里。|at-(去)+tach(钉)|attach importance to
attempt|/əˈtempt/|v./n.|尝试；企图|attempted,attempting,attempts|He attempted to fix the machine.|他尝试修好这台机器。|at-(去)+tempt(试)|make an attempt
attend|/əˈtend/|v.|出席；照料|attended,attending,attends|She attends class every morning.|她每天早上都去上课。|at-(去)+tend(伸)|attend a meeting
attitude|/ˈætɪtuːd/|n.|态度；看法||His attitude toward work has changed.|他对工作的态度变了。|apt(适合)+-itude|attitude towards
attract|/əˈtrækt/|v.|吸引；引起|attracted,attracting,attracts|The show attracted a big crowd.|演出吸引了一大群人。|at-(去)+tract(拉)|attract attention
authority|/əˈθɔːrəti/|n.|权威；当局|authorities|The local authorities closed the road.|当地政府关闭了这条路。|author(作者，权威)+-ity|in authority
available|/əˈveɪləbl/|adj.|可用的；可获得的||Tickets are still available online.|网上还有票。|avail(有用)+-able|available for
average|/ˈævərɪdʒ/|adj./n.|平均的；平均数||The average temperature is 20 degrees.|平均气温是 20 度。||on average
avoid|/əˈvɔɪd/|v.|避免；躲开|avoided,avoiding,avoids|Try to avoid making the same mistake.|尽量避免犯同样的错误。|a-(去)+void(空)|avoid doing sth
aware|/əˈwer/|adj.|意识到的；知道的||She was not aware of the danger.|她没有意识到危险。|a-(加强)+ware(小心)|be aware of
balance|/ˈbæləns/|n./v.|平衡；余额||He lost his balance and fell.|他失去平衡摔倒了。|bi-(二)+lanx(盘)|keep a balance
barrier|/ˈbæriər/|n.|障碍；屏障||Language is often a barrier.|语言常常是障碍。|bar(栏)+-ier|language barrier
basis|/ˈbeɪsɪs/|n.|基础；根据|bases|Trust is the basis of friendship.|信任是友谊的基础。|bas(基础)+-is|on the basis of
behave|/bɪˈheɪv/|v.|表现；举止|behaved,behaving,behaves|The children behaved very well today.|孩子们今天表现很好。|be-(加强)+have(持有)|behave oneself
belief|/bɪˈliːf/|n.|信念；相信|beliefs|She has a strong belief in herself.|她对自己有很强的信心。|be-(加强)+lief(爱)|beyond belief
benefit|/ˈbenɪfɪt/|n./v.|利益；受益||Regular exercise benefits your health.|经常锻炼有益健康。|bene-(好)+fit(做)|benefit from
bother|/ˈbɑːðər/|v.|打扰；烦恼|bothered,bothering,bothers|Don't bother him while he is working.|他工作时别打扰他。||sorry to bother you
brief|/briːf/|adj./v.|简短的；简要介绍||Please give a brief summary.|请给一个简短的总结。|brev(短)|in brief
broad|/brɔːd/|adj.|宽的；广泛的|broader,broadest|The river is very broad here.|这条河在这里很宽。||broad range
budget|/ˈbʌdʒɪt/|n./v.|预算||We have a tight budget this year.|我们今年预算紧张。||on a budget
campaign|/kæmˈpeɪn/|n./v.|运动；战役||They started a campaign against smoking.|他们发起了反吸烟运动。|camp(田野)+-aign|launch a campaign
cancel|/ˈkænsl/|v.|取消；撤销|canceled,canceling,cancels|The flight was canceled due to snow.|航班因大雪取消。|cancel(格子，划掉)|cancel an order
candidate|/ˈkændɪdət/|n.|候选人；考生||Three candidates applied for the job.|三名候选人申请了这份工作。|cand(白，白衣)+-idate|candidate for
capacity|/kəˈpæsəti/|n.|容量；能力|capacities|The hall has a capacity of 500.|大厅可容纳 500 人。|cap(拿)+-acity|at full capacity
capital|/ˈkæpɪtl/|n./adj.|首都；资本；大写的||Beijing is the capital of China.|北京是中国的首都。|capit(头)+-al|capital city
career|/kəˈrɪr/|n.|职业；生涯||She built a career in medicine.|她在医学界建立了事业。|car(车，道路)+-eer|career development
category|/ˈkætəɡɔːri/|n.|类别；种类|categories|This book falls into the history category.|这本书属于历史类。|categor(断言)+-y|fall into a category
cease|/siːs/|v.|停止；终止|ceased,ceasing,ceases|The rain finally ceased.|雨终于停了。|ced(走)|cease fire
challenge|/ˈtʃælɪndʒ/|n./v.|挑战；质疑||Learning Chinese is a real challenge.|学中文真是个挑战。|chal(责难)+-enge|face a challenge
character|/ˈkærəktər/|n.|性格；角色；字符||He has a strong character.|他性格坚强。|charact(刻)+-er|main character
charge|/tʃɑːrdʒ/|v./n.|收费；指控；充电|charged,charging,charges|They charge ten dollars for delivery.|他们收十美元配送费。|carr(车，装载)|in charge of
chemical|/ˈkemɪkl/|adj./n.|化学的；化学品||The factory produces chemical products.|这家工厂生产化学制品。|chem(化学)+-ical|chemical reaction
circumstance|/ˈsɜːrkəmstæns/|n.|情况；环境|circumstances|Under no circumstances should you give up.|任何情况下你都不该放弃。|circum-(周围)+st(站)+-ance|under the circumstances
cite|/saɪt/|v.|引用；举例|cited,citing,cites|She cited three studies in her paper.|她在论文中引用了三项研究。|cit(召唤)|cite an example
civil|/ˈsɪvl/|adj.|公民的；文明的||Civil rights are protected by law.|公民权利受法律保护。|civ(公民)+-il|civil war
claim|/kleɪm/|v./n.|声称；要求；索赔|claimed,claiming,claims|He claimed that he saw the accident.|他声称他看到了那场事故。|clam(喊)|make a claim
classify|/ˈklæsɪfaɪ/|v.|分类；归类|classified,classifying,classifies|Scientists classify animals by species.|科学家按物种给动物分类。|class(类别)+-ify|classify into
client|/ˈklaɪənt/|n.|客户；委托人||The client is satisfied with our service.|客户对我们的服务很满意。|cli(倾斜)+-ent|client base
climate|/ˈklaɪmət/|n.|气候；风气||The climate here is mild.|这里气候温和。|clim(倾斜)+-ate|climate change
collapse|/kəˈlæps/|v./n.|倒塌；崩溃|collapsed,collapsing,collapses|The old bridge collapsed suddenly.|那座旧桥突然倒塌了。|col-(一起)+laps(滑落)|economic collapse
colleague|/ˈkɑːliːɡ/|n.|同事||My colleagues are very friendly.|我的同事们非常友好。|col-(一起)+league(联盟)|close colleague
combine|/kəmˈbaɪn/|v.|结合；联合|combined,combining,combines|The two companies combined last year.|两家公司去年合并了。|com-(一起)+bin(二)|combine with
comment|/ˈkɑːment/|n./v.|评论；意见||He made no comment on the plan.|他对这个计划没有发表评论。|com-(加强)+ment(思考)|comment on
commercial|/kəˈmɜːrʃl/|adj./n.|商业的；广告||The film was a commercial success.|这部电影在商业上很成功。|com-(一起)+merc(交易)+-ial|commercial value
commit|/kəˈmɪt/|v.|犯（罪）；承诺；投入|committed,committing,commits|She committed herself to the project.|她全力投入到这个项目中。|com-(加强)+mit(送)|commit a crime
committee|/kəˈmɪti/|n.|委员会||The committee meets every Monday.|委员会每周一开会。|com-(一起)+mitt(送)+-ee|organizing committee
communicate|/kəˈmjuːnɪkeɪt/|v.|交流；传达|communicated,communicating,communicates|We communicate mainly by email.|我们主要通过邮件交流。|commun(共同)+-icate|communicate with
community|/kəˈmjuːnəti/|n.|社区；群体|communities|The whole community helped rebuild the school.|整个社区都帮忙重建学校。|commun(共同)+-ity|local community
compare|/kəmˈper/|v.|比较；比作|compared,comparing,compares|Compare these two pictures carefully.|仔细比较这两张图。|com-(一起)+par(相等)|compare with
compete|/kəmˈpiːt/|v.|竞争；比赛|competed,competing,competes|Ten teams competed for the prize.|十支队伍争夺这个奖项。|com-(一起)+pet(寻求)|compete with
complain|/kəmˈpleɪn/|v.|抱怨；投诉|complained,complaining,complains|Customers complained about the delay.|顾客抱怨延误。|com-(加强)+plain(悲叹)|complain about
complex|/kəmˈpleks/|adj./n.|复杂的；综合体||This is a complex social problem.|这是一个复杂的社会问题。|com-(一起)+plex(折叠)|complex system
component|/kəmˈpoʊnənt/|n.|组成部分；零件||Each component is tested separately.|每个部件都是单独测试的。|com-(一起)+pon(放)+-ent|key component
compose|/kəmˈpoʊz/|v.|组成；创作|composed,composing,composes|The team is composed of six members.|这个团队由六名成员组成。|com-(一起)+pos(放)|be composed of
comprehensive|/ˌkɑːmprɪˈhensɪv/|adj.|全面的；综合的||We need a comprehensive plan.|我们需要一个全面的计划。|com-(加强)+prehens(抓)+-ive|comprehensive study
concentrate|/ˈkɑːnsntreɪt/|v.|集中；专心|concentrated,concentrating,concentrates|I can't concentrate in a noisy room.|在吵闹的房间里我无法集中注意力。|con-(一起)+centr(中心)+-ate|concentrate on
concept|/ˈkɑːnsept/|n.|概念；观念||The concept is easy to understand.|这个概念很容易理解。|con-(一起)+cept(拿)|basic concept
concern|/kənˈsɜːrn/|v./n.|关心；涉及；担忧|concerned,concerning,concerns|The results concern us all.|结果关系到我们所有人。|con-(一起)+cern(筛选)|be concerned about
conclude|/kənˈkluːd/|v.|得出结论；结束|concluded,concluding,concludes|We concluded that the plan would work.|我们得出结论这个计划可行。|con-(一起)+clud(关闭)|conclude that
condition|/kənˈdɪʃn/|n.|条件；状况|conditions|The car is in good condition.|这辆车状况良好。|con-(一起)+dit(说)+-ion|on condition that
conduct|/kənˈdʌkt/|v./n.|进行；指挥；行为|conducted,conducting,conducts|They conducted a survey among students.|他们在学生中进行了一项调查。|con-(一起)+duct(引导)|conduct research
confidence|/ˈkɑːnfɪdəns/|n.|信心；信任||She spoke with great confidence.|她非常自信地发言。|con-(加强)+fid(信任)+-ence|have confidence in
confirm|/kənˈfɜːrm/|v.|确认；证实|confirmed,confirming,confirms|Please confirm your booking by email.|请通过邮件确认预订。|con-(加强)+firm(坚固)|confirm a booking
conflict|/ˈkɑːnflɪkt/|n./v.|冲突；矛盾||There is a conflict between the two rules.|两条规则之间存在矛盾。|con-(一起)+flict(打击)|conflict with
confuse|/kənˈfjuːz/|v.|使困惑；混淆|confused,confusing,confuses|The instructions confused everyone.|这些说明把大家都弄糊涂了。|con-(一起)+fus(倒)|confuse A with B
connect|/kəˈnekt/|v.|连接；联系|connected,connecting,connects|This road connects the two cities.|这条路连接两座城市。|con-(一起)+nect(绑)|connect to
conscious|/ˈkɑːnʃəs/|adj.|有意识的；察觉到的||He was conscious of his mistake.|他意识到自己的错误。|con-(加强)+sci(知道)+-ous|be conscious of
consequence|/ˈkɑːnsəkwens/|n.|结果；后果||Every choice has consequences.|每个选择都有后果。|con-(一起)+sequ(跟随)+-ence|as a consequence
conservative|/kənˈsɜːrvətɪv/|adj./n.|保守的；保守派||He holds conservative views.|他持保守观点。|con-(加强)+serv(保持)+-ative|conservative estimate
consider|/kənˈsɪdər/|v.|考虑；认为|considered,considering,considers|We are considering moving abroad.|我们正在考虑移居国外。|con-(加强)+sider(星星，观察)|consider doing sth
consist|/kənˈsɪst/|v.|组成；在于|consisted,consisting,consists|The course consists of ten lessons.|这门课由十节课组成。|con-(一起)+sist(站)|consist of
constant|/ˈkɑːnstənt/|adj.|不断的；恒定的||She lives in constant fear.|她一直生活在恐惧中。|con-(加强)+stant(站)|constant change
constitute|/ˈkɑːnstɪtuːt/|v.|构成；组成|constituted,constituting,constitutes|Women constitute half of the workforce.|女性占劳动力的一半。|con-(一起)+stitut(建立)|constitute a threat
construct|/kənˈstrʌkt/|v.|建造；构建|constructed,constructing,constructs|They constructed a new bridge.|他们建了一座新桥。|con-(一起)+struct(建)|construct a model
consult|/kənˈsʌlt/|v.|咨询；商议|consulted,consulting,consults|You should consult a doctor.|你应该去看医生。|con-(一起)+sult(召集)|consult with
consume|/kənˈsuːm/|v.|消耗；消费|consumed,consuming,consumes|This machine consumes a lot of power.|这台机器耗电很多。|con-(加强)+sum(拿)|consume energy
contact|/ˈkɑːntækt/|n./v.|接触；联系||Please contact me by phone.|请打电话联系我。|con-(一起)+tact(触)|keep in contact
contain|/kənˈteɪn/|v.|包含；容纳|contained,containing,contains|This box contains old photos.|这个盒子里装着旧照片。|con-(一起)+tain(拿)|contain information
contemporary|/kənˈtempəreri/|adj.|当代的；同时代的||She studies contemporary art.|她研究当代艺术。|con-(一起)+tempor(时间)+-ary|contemporary society
content|/ˈkɑːntent/|n./adj.|内容；满足的||The content of the report is clear.|报告的内容很清楚。|con-(一起)+tent(拿)|be content with
context|/ˈkɑːntekst/|n.|上下文；背景||Guess the meaning from the context.|根据上下文猜意思。|con-(一起)+text(编织)|in context
continue|/kənˈtɪnjuː/|v.|继续；持续|continued,continuing,continues|The rain continued all night.|雨下了一整夜。|con-(一起)+tin(拿)+-ue|continue to do
contract|/ˈkɑːntrækt/|n./v.|合同；收缩||They signed a two-year contract.|他们签了两年合同。|con-(一起)+tract(拉)|sign a contract
contrast|/ˈkɑːntræst/|n./v.|对比；反差||The contrast between the two is clear.|两者的对比很明显。|contra-(相反)+st(站)|in contrast to
contribute|/kənˈtrɪbjuːt/|v.|贡献；捐助；促成|contributed,contributing,contributes|Everyone contributed ideas.|每个人都贡献了想法。|con-(一起)+tribut(给)|contribute to
convenient|/kənˈviːniənt/|adj.|方便的；便利的||Is Monday convenient for you?|周一你方便吗？|con-(一起)+veni(来)+-ent|convenient for
convey|/kənˈveɪ/|v.|传达；运送|conveyed,conveying,conveys|Words cannot convey my thanks.|言语无法表达我的谢意。|con-(一起)+vey(路)|convey a message
convince|/kənˈvɪns/|v.|说服；使确信|convinced,convincing,convinces|She convinced me to try again.|她说服我再试一次。|con-(加强)+vinc(征服)|convince sb of
cooperate|/koʊˈɑːpəreɪt/|v.|合作；配合|cooperated,cooperating,cooperates|The two teams cooperated closely.|两个团队密切合作。|co-(一起)+oper(工作)+-ate|cooperate with
crisis|/ˈkraɪsɪs/|n.|危机|dangers,crises|The company survived the financial crisis.|公司挺过了金融危机。|cris(判断)+-is|financial crisis
critical|/ˈkrɪtɪkl/|adj.|批评的；关键的；危急的||This is a critical moment for us.|这对我们是关键时刻。|crit(判断)+-ical|critical thinking
crucial|/ˈkruːʃl/|adj.|至关重要的||Sleep is crucial to health.|睡眠对健康至关重要。|cruc(十字)+-ial|crucial role
cultural|/ˈkʌltʃərəl/|adj.|文化的||There are many cultural differences.|有很多文化差异。|cult(耕作)+-ural|cultural difference
culture|/ˈkʌltʃər/|n.|文化；培养||I enjoy learning about other cultures.|我喜欢了解其他文化。|cult(耕作)+-ure|popular culture
current|/ˈkɜːrənt/|adj./n.|当前的；水流；电流||The current situation is stable.|目前形势稳定。|cur(跑)+-ent|current situation
damage|/ˈdæmɪdʒ/|n./v.|损害；破坏||The storm caused serious damage.|暴风雨造成了严重破坏。|damn(损失)+-age|do damage to
decline|/dɪˈklaɪn/|v./n.|下降；拒绝||Sales declined sharply last year.|去年销售额急剧下降。|de-(向下)+clin(倾斜)|decline an offer
decrease|/dɪˈkriːs/|v./n.|减少；降低|decreased,decreasing,decreases|The number of errors decreased.|错误数量减少了。|de-(向下)+creas(生长)|decrease in
define|/dɪˈfaɪn/|v.|定义；界定|defined,defining,defines|Can you define this word?|你能定义这个词吗？|de-(加强)+fin(界限)|define as
definite|/ˈdefɪnət/|adj.|明确的；肯定的||We need a definite answer.|我们需要明确的答复。|de-(加强)+fin(界限)+-ite|definite answer
delight|/dɪˈlaɪt/|n./v.|高兴；使高兴||To my delight, she agreed.|令我高兴的是她同意了。|de-(加强)+light(诱人)|take delight in
deliver|/dɪˈlɪvər/|v.|递送；发表|delivered,delivering,delivers|The package will be delivered tomorrow.|包裹明天送到。|de-(去)+liver(自由)|deliver a speech
demand|/dɪˈmænd/|n./v.|要求；需求||There is a growing demand for clean energy.|清洁能源需求不断增长。|de-(加强)+mand(命令)|in demand
demonstrate|/ˈdemənstreɪt/|v.|证明；演示|demonstrated,demonstrating,demonstrates|The experiment demonstrated the theory.|实验证明了这一理论。|de-(加强)+monstr(展示)+-ate|demonstrate how
deny|/dɪˈnaɪ/|v.|否认；拒绝|denied,denying,denies|He denied taking the money.|他否认拿了钱。|de-(加强)+ny(否)|deny doing sth
depend|/dɪˈpend/|v.|依靠；取决于|depended,depending,depends|Success depends on hard work.|成功取决于努力。|de-(向下)+pend(挂)|depend on
describe|/dɪˈskraɪb/|v.|描述；形容|described,describing,describes|Describe what you saw.|描述一下你看到的。|de-(向下)+scrib(写)|describe as
deserve|/dɪˈzɜːrv/|v.|值得；应得|deserved,deserving,deserves|You deserve a break.|你该休息一下了。|de-(加强)+serv(服务)|deserve to do
desire|/dɪˈzaɪər/|n./v.|渴望；欲望||She has a strong desire to travel.|她非常渴望旅行。|de-(加强)+sir(星星，渴望)|desire for
despite|/dɪˈspaɪt/|prep.|尽管；不管||Despite the rain, we went out.|尽管下雨，我们还是出门了。|de-(向下)+spit(看)|despite the fact that
destroy|/dɪˈstrɔɪ/|v.|破坏；毁灭|destroyed,destroying,destroys|The fire destroyed the whole building.|大火摧毁了整栋楼。|de-(向下)+stroy(建造)|destroy evidence
detail|/ˈdiːteɪl/|n./v.|细节；详述||Please explain in detail.|请详细说明。|de-(加强)+tail(切)|in detail
detect|/dɪˈtekt/|v.|察觉；探测|detected,detecting,detects|The device can detect smoke.|这个装置能探测烟雾。|de-(去掉)+tect(覆盖)|detect a change
determine|/dɪˈtɜːrmɪn/|v.|决定；确定|determined,determining,determines|The weather will determine our plan.|天气将决定我们的计划。|de-(加强)+termin(界限)|determine to do
develop|/dɪˈveləp/|v.|发展；开发|developed,developing,develops|They developed a new app.|他们开发了一款新应用。|de-(去掉)+velop(包裹)|develop skills
device|/dɪˈvaɪs/|n.|装置；设备||This device saves a lot of time.|这个设备省了很多时间。|de-(分开)+vis(看)|electronic device
devote|/dɪˈvoʊt/|v.|奉献；致力于|devoted,devoting,devotes|She devoted her life to teaching.|她把一生献给教育。|de-(加强)+vot(发誓)|devote to
differ|/ˈdɪfər/|v.|不同；相异|differed,differing,differs|Opinions differ on this issue.|在这个问题上意见不一。|dif-(分开)+fer(带)|differ from
digital|/ˈdɪdʒɪtl/|adj.|数字的；数码的||We live in a digital age.|我们生活在数字时代。|digit(手指，数字)+-al|digital age
discipline|/ˈdɪsəplɪn/|n./v.|纪律；学科；训练||Good discipline is important in class.|课堂上良好的纪律很重要。|disc(学习)+-ipline|self discipline
discount|/ˈdɪskaʊnt/|n./v.|折扣；打折||Students get a ten percent discount.|学生享受九折。|dis-(去掉)+count(计算)|at a discount
discover|/dɪˈskʌvər/|v.|发现；发觉|discovered,discovering,discovers|Scientists discovered a new species.|科学家发现了一个新物种。|dis-(去掉)+cover(覆盖)|discover the truth
discuss|/dɪˈskʌs/|v.|讨论；商议|discussed,discussing,discusses|We discussed the plan for two hours.|我们讨论了这个计划两小时。|dis-(分开)+cuss(摇)|discuss with
display|/dɪˈspleɪ/|v./n.|展示；显示|displayed,displaying,displays|The results are displayed on the screen.|结果显示在屏幕上。|dis-(分开)+play(折)|on display
distinguish|/dɪˈstɪŋɡwɪʃ/|v.|区分；辨别|distinguished,distinguishing,distinguishes|Can you distinguish the two sounds?|你能区分这两个音吗？|di-(分开)+stingu(刺)+-ish|distinguish between
distribute|/dɪˈstrɪbjuːt/|v.|分发；分配|distributed,distributing,distributes|They distributed food to the victims.|他们向灾民分发食物。|dis-(分开)+tribut(给)|distribute among
district|/ˈdɪstrɪkt/|n.|地区；区域||She lives in the business district.|她住在商业区。|dis-(分开)+strict(拉紧)|rural district
disturb|/dɪˈstɜːrb/|v.|打扰；扰乱|disturbed,disturbing,disturbs|Please do not disturb the patient.|请勿打扰病人。|dis-(加强)+turb(搅动)|disturb the peace
divide|/dɪˈvaɪd/|v.|分开；除以|divided,dividing,divides|Divide the class into four groups.|把班级分成四组。|di-(分开)+vid(分开)|divide into
domestic|/dəˈmestɪk/|adj.|家庭的；国内的||Domestic tourism is growing fast.|国内旅游增长很快。|dom(家)+-estic|domestic market
dominate|/ˈdɑːmɪneɪt/|v.|支配；主导|dominated,dominating,dominates|One company dominates the market.|一家公司主导着市场。|domin(主人)+-ate|dominate the market
doubt|/daʊt/|n./v.|怀疑；疑问||I doubt whether he will come.|我怀疑他是否会来。|du(二)+bit(走，犹豫)|no doubt
dramatic|/drəˈmætɪk/|adj.|戏剧性的；巨大的||There was a dramatic change in the weather.|天气发生了急剧变化。|drama(戏剧)+-tic|dramatic increase
economy|/ɪˈkɑːnəmi/|n.|经济；节约|economies|The economy is recovering slowly.|经济正在缓慢复苏。|eco(家)+nom(管理)+-y|market economy
edition|/ɪˈdɪʃn/|n.|版本；版次||This is the second edition of the book.|这是这本书的第二版。|e-(出)+dit(给)+-ion|first edition
educate|/ˈedʒukeɪt/|v.|教育；培养|educated,educating,educates|Schools educate children for the future.|学校为未来教育孩子。|e-(出)+duc(引导)+-ate|educate sb about
effective|/ɪˈfektɪv/|adj.|有效的；生效的||This is an effective method.|这是一个有效的方法。|ef-(出)+fect(做)+-ive|effective way
efficient|/ɪˈfɪʃnt/|adj.|高效的；效率高的||The new system is more efficient.|新系统效率更高。|ef-(出)+fic(做)+-ient|efficient use
effort|/ˈefərt/|n.|努力；尝试||Your effort will pay off.|你的努力会有回报。|ef-(出)+fort(力量)|make an effort
elect|/ɪˈlekt/|v.|选举；选择|elected,electing,elects|They elected her as chairman.|他们选她当主席。|e-(出)+lect(选)|elect sb as
element|/ˈelɪmənt/|n.|元素；要素||Trust is a key element of teamwork.|信任是团队合作的关键要素。|element(基础)|key element
eliminate|/ɪˈlɪmɪneɪt/|v.|消除；淘汰|eliminated,eliminating,eliminates|We must eliminate all errors.|我们必须消除所有错误。|e-(出)+limin(门槛)+-ate|eliminate the risk
emerge|/ɪˈmɜːrdʒ/|v.|出现；浮现|emerged,emerging,emerges|New evidence emerged yesterday.|昨天出现了新证据。|e-(出)+merg(沉)|emerge from
emergency|/ɪˈmɜːrdʒənsi/|n.|紧急情况|emergencies|Call this number in an emergency.|紧急情况请拨这个号码。|e-(出)+merg(沉)+-ency|emergency room
emotion|/ɪˈmoʊʃn/|n.|情绪；情感||He could not control his emotions.|他控制不住自己的情绪。|e-(出)+mot(动)+-ion|mixed emotions
emphasize|/ˈemfəsaɪz/|v.|强调；着重|emphasized,emphasizing,emphasizes|The teacher emphasized the key points.|老师强调了要点。|em-(在内)+phas(显示)+-ize|emphasize the need
employ|/ɪmˈplɔɪ/|v.|雇用；使用|employed,employing,employs|The factory employs 200 workers.|这家工厂雇用了 200 名工人。|em-(在内)+ploy(折)|be employed in
enable|/ɪˈneɪbl/|v.|使能够；使可行|enabled,enabling,enables|This tool enables us to work faster.|这个工具让我们工作更快。|en-(使)+able(能够)|enable sb to do
encounter|/ɪnˈkaʊntər/|v./n.|遭遇；偶遇|encountered,encountering,encounters|We encountered several problems.|我们遇到了几个问题。|en-(在内)+counter(相对)|encounter difficulties
encourage|/ɪnˈkɜːrɪdʒ/|v.|鼓励；促进|encouraged,encouraging,encourages|My teacher encouraged me to try.|老师鼓励我试一试。|en-(使)+courage(勇气)|encourage sb to do
endure|/ɪnˈdʊr/|v.|忍受；持续|endured,enduring,endures|She endured great pain.|她忍受了巨大的痛苦。|en-(使)+dur(持久)|endure hardship
enforce|/ɪnˈfɔːrs/|v.|执行；强制|enforced,enforcing,enforces|The police enforce the traffic rules.|警察执行交通规则。|en-(使)+force(力量)|enforce the law
engage|/ɪnˈɡeɪdʒ/|v.|从事；吸引；订婚|engaged,engaging,engages|He engaged in a long discussion.|他参与了一场长时间的讨论。|en-(使)+gage(保证)|engage in
enhance|/ɪnˈhæns/|v.|提高；增强|enhanced,enhancing,enhances|Music can enhance your mood.|音乐能改善你的心情。|en-(使)+hance(高)|enhance quality
enormous|/ɪˈnɔːrməs/|adj.|巨大的；庞大的||The cost was enormous.|成本非常巨大。|e-(出)+norm(标准)+-ous|enormous pressure
ensure|/ɪnˈʃʊr/|v.|确保；保证|ensured,ensuring,ensures|Please ensure the door is locked.|请确保门已锁好。|en-(使)+sure(确定)|ensure safety
enterprise|/ˈentərpraɪz/|n.|企业；事业||He runs a small enterprise.|他经营一家小企业。|enter-(在内)+prise(抓)|private enterprise
enthusiasm|/ɪnˈθuːziæzəm/|n.|热情；热心||She showed great enthusiasm for the work.|她对这份工作表现出极大热情。|en-(在内)+thus(神)+-iasm|with enthusiasm
entire|/ɪnˈtaɪər/|adj.|整个的；全部的||He read the entire book in one day.|他一天读完了整本书。|en-(加强)+tire(完整)|the entire world
environment|/ɪnˈvaɪrənmənt/|n.|环境；周围状况||We must protect the environment.|我们必须保护环境。|en-(在内)+viron(转)+-ment|natural environment
equip|/ɪˈkwɪp/|v.|装备；配备|equipped,equipping,equips|The lab is equipped with new computers.|实验室配备了新电脑。|equip(装备)|equip with
equivalent|/ɪˈkwɪvələnt/|adj./n.|相等的；等价物||One mile is equivalent to 1.6 kilometers.|一英里等于 1.6 公里。|equi-(相等)+val(价值)+-ent|equivalent to
essential|/ɪˈsenʃl/|adj.|必要的；本质的||Water is essential to life.|水对生命必不可少。|ess(存在)+-ential|essential for
establish|/ɪˈstæblɪʃ/|v.|建立；确立|established,establishing,establishes|The school was established in 1950.|这所学校建于 1950 年。|e-(出)+stabl(稳固)+-ish|establish a system
estimate|/ˈestɪmeɪt/|v./n.|估计；评估|estimated,estimating,estimates|Experts estimate the cost at one million.|专家估计成本为一百万。|estim(价值)+-ate|rough estimate
evaluate|/ɪˈvæljueɪt/|v.|评价；评估|evaluated,evaluating,evaluates|We need to evaluate the results.|我们需要评估结果。|e-(出)+valu(价值)+-ate|evaluate performance
eventually|/ɪˈventʃuəli/|adv.|最终；终于||He eventually found the answer.|他最终找到了答案。|event(事件)+-ually|eventually succeed
evidence|/ˈevɪdəns/|n.|证据；迹象||There is no evidence for this claim.|这个说法没有证据。|e-(出)+vid(看)+-ence|provide evidence
evident|/ˈevɪdənt/|adj.|明显的；显然的||It is evident that he lied.|很明显他撒谎了。|e-(出)+vid(看)+-ent|self evident
evolve|/ɪˈvɑːlv/|v.|进化；演变|evolved,evolving,evolves|Language evolves over time.|语言随时间演变。|e-(出)+volv(滚)|evolve into
exaggerate|/ɪɡˈzædʒəreɪt/|v.|夸大；夸张|exaggerated,exaggerating,exaggerates|Don't exaggerate the problem.|别夸大问题。|ex-(出)+agger(堆积)+-ate|exaggerate the facts
examine|/ɪɡˈzæmɪn/|v.|检查；审查|examined,examining,examines|The doctor examined the patient carefully.|医生仔细检查了病人。|exam(检查)|examine closely
exceed|/ɪkˈsiːd/|v.|超过；胜过|exceeded,exceeding,exceeds|The cost exceeded our budget.|成本超出了我们的预算。|ex-(出)+ceed(走)|exceed expectations
excellent|/ˈeksələnt/|adj.|优秀的；极好的||She did an excellent job.|她做得非常出色。|ex-(出)+cell(升高)+-ent|excellent quality
exchange|/ɪksˈtʃeɪndʒ/|v./n.|交换；兑换|exchanged,exchanging,exchanges|We exchanged phone numbers.|我们交换了电话号码。|ex-(出)+change(改变)|exchange rate
exclude|/ɪkˈskluːd/|v.|排除；不包括|excluded,excluding,excludes|The price excludes tax.|这个价格不含税。|ex-(出)+clud(关闭)|exclude from
execute|/ˈeksɪkjuːt/|v.|执行；实施|executed,executing,executes|The plan was executed perfectly.|计划执行得很完美。|ex-(出)+secut(跟随)|execute a plan
exhibit|/ɪɡˈzɪbɪt/|v./n.|展示；展出；展品|exhibited,exhibiting,exhibits|The museum exhibits ancient coins.|博物馆展出古钱币。|ex-(出)+hibit(拿)|exhibit a tendency
exist|/ɪɡˈzɪst/|v.|存在；生存|existed,existing,exists|Does life exist on other planets?|其他星球上存在生命吗？|ex-(出)+sist(站)|exist in
expand|/ɪkˈspænd/|v.|扩张；膨胀|expanded,expanding,expands|The company plans to expand overseas.|公司计划向海外扩张。|ex-(出)+pand(展开)|expand into
expect|/ɪkˈspekt/|v.|期望；预料|expected,expecting,expects|I expect him to arrive at six.|我料想他六点到。|ex-(出)+spect(看)|expect to do
expense|/ɪkˈspens/|n.|费用；开支||Travel expenses will be paid.|差旅费会报销。|ex-(出)+pens(支付)|at the expense of
experiment|/ɪkˈsperɪmənt/|n./v.|实验；尝试||The experiment proved successful.|实验证明是成功的。|ex-(出)+peri(试)+-ment|do an experiment
expert|/ˈekspɜːrt/|n./adj.|专家；熟练的||She is an expert in physics.|她是物理学专家。|ex-(出)+pert(试)|expert in
explain|/ɪkˈspleɪn/|v.|解释；说明|explained,explaining,explains|Can you explain this rule?|你能解释这条规则吗？|ex-(出)+plain(清楚)|explain to sb
explore|/ɪkˈsplɔːr/|v.|探索；勘探|explored,exploring,explores|We explored the old town on foot.|我们步行探索了老城。|ex-(出)+plor(喊)|explore the possibility
export|/ˈekspɔːrt/|v./n.|出口；输出|exported,exporting,exports|They export coffee to Europe.|他们向欧洲出口咖啡。|ex-(出)+port(运)|export goods
expose|/ɪkˈspoʊz/|v.|暴露；揭露|exposed,exposing,exposes|The report exposed the truth.|报道揭露了真相。|ex-(出)+pos(放)|expose to
express|/ɪkˈspres/|v./adj.|表达；快速的|expressed,expressing,expresses|She expressed her thanks warmly.|她热情地表达了感谢。|ex-(出)+press(压)|express an opinion
extend|/ɪkˈstend/|v.|延伸；扩展|extended,extending,extends|They extended the deadline by a week.|他们把截止日期延后了一周。|ex-(出)+tend(伸)|extend the deadline
extent|/ɪkˈstent/|n.|程度；范围||To some extent, you are right.|在某种程度上你是对的。|ex-(出)+tent(伸)|to some extent
external|/ɪkˈstɜːrnl/|adj.|外部的；外来的||External pressure changed the decision.|外部压力改变了决定。|exter(外面)+-nal|external factors
extreme|/ɪkˈstriːm/|adj./n.|极端的；极端||The heat was extreme this summer.|今年夏天热得极端。|extr(超出)+-eme|extreme weather
facility|/fəˈsɪləti/|n.|设施；便利|facilities|The hotel has excellent facilities.|这家酒店设施一流。|facil(容易)+-ity|public facilities
factor|/ˈfæktər/|n.|因素；要素||Cost is an important factor.|成本是一个重要因素。|fact(做)+-or|key factor
familiar|/fəˈmɪliər/|adj.|熟悉的；常见的||The name sounds familiar.|这个名字听起来很熟悉。|famil(家庭)+-iar|familiar with
fascinating|/ˈfæsɪneɪtɪŋ/|adj.|迷人的；极有趣的||The story is fascinating.|这个故事非常吸引人。|fascin(迷住)+-ating|fascinating story
fashion|/ˈfæʃn/|n.|时尚；方式||Short hair is in fashion now.|现在短发很流行。|fashion(制作)|in fashion
feature|/ˈfiːtʃər/|n./v.|特征；以…为特色||The main feature is its low price.|主要特点是价格低。|fact(做)+-ure|key feature
federal|/ˈfedərəl/|adj.|联邦的；联邦制的||This is a federal law.|这是一项联邦法律。|feder(盟约)+-al|federal government
fee|/fiː/|n.|费用；酬金||The entrance fee is ten dollars.|入场费是十美元。|feo(牛，财产)|entrance fee
figure|/ˈfɪɡjər/|n./v.|数字；人物；认为||The figures are not accurate.|这些数字不准确。|fig(塑造)+-ure|figure out
finance|/ˈfaɪnæns/|n./v.|财政；金融；资助||He works in finance.|他在金融业工作。|fin(结束)+-ance|personal finance
flexible|/ˈfleksəbl/|adj.|灵活的；柔韧的||Our schedule is quite flexible.|我们的日程相当灵活。|flex(弯折)+-ible|flexible working hours
focus|/ˈfoʊkəs/|v./n.|集中；焦点|focused,focusing,focuses|Focus on your studies.|专注于你的学业。|focus(炉火)|focus on
forbid|/fərˈbɪd/|v.|禁止；不许|forbade,forbidden,forbids|Smoking is forbidden here.|这里禁止吸烟。|for-(禁止)+bid(命令)|forbid sb to do
forecast|/ˈfɔːrkæst/|n./v.|预报；预测||The weather forecast says rain.|天气预报说有雨。|fore-(预先)+cast(投)|weather forecast
formal|/ˈfɔːrml/|adj.|正式的；正规的||This is a formal occasion.|这是一个正式场合。|form(形式)+-al|formal education
former|/ˈfɔːrmər/|adj.|以前的；前者的||Her former teacher called her.|她以前的老师给她打了电话。|form(前面)+-er|the former
fortune|/ˈfɔːrtʃən/|n.|财富；运气||He made a fortune in trade.|他靠贸易发了财。|fort(运气)+-une|make a fortune
foundation|/faʊnˈdeɪʃn/|n.|基础；基金会||Practice is the foundation of skill.|练习是技能的基础。|found(基础)+-ation|lay the foundation
frequent|/ˈfriːkwənt/|adj.|频繁的；经常的||He is a frequent visitor here.|他是这里的常客。|frequ(拥挤)+-ent|frequent visits
function|/ˈfʌŋkʃn/|n./v.|功能；运转||The main function is to save time.|主要功能是节省时间。|funct(执行)+-ion|basic function
fundamental|/ˌfʌndəˈmentl/|adj.|基本的；根本的||This is a fundamental question.|这是一个根本问题。|fund(基础)+-amental|fundamental change
furthermore|/ˌfɜːrðərˈmɔːr/|adv.|此外；而且||Furthermore, the plan is cheap.|此外，这个计划还很便宜。|further(更远)+more(更多)|furthermore
gain|/ɡeɪn/|v./n.|获得；增加||He gained a lot of experience.|他获得了许多经验。|gain(获得)|gain weight
gather|/ˈɡæðər/|v.|聚集；收集|gathered,gathering,gathers|A crowd gathered in the square.|人群聚集在广场上。|gather(集合)|gather information
generate|/ˈdʒenəreɪt/|v.|产生；发生|generated,generating,generates|The plan generated new jobs.|这个计划创造了新的就业机会。|gener(种类)+-ate|generate income
generous|/ˈdʒenərəs/|adj.|慷慨的；大方的||She is generous with her time.|她乐于付出时间。|gener(出身)+-ous|generous with
genuine|/ˈdʒenjuɪn/|adj.|真正的；真诚的||He showed genuine interest.|他表现出真正的兴趣。|genu(出生)+-ine|genuine concern
gradual|/ˈɡrædʒuəl/|adj.|逐渐的；逐步的||There was a gradual improvement.|有了逐渐的改善。|grad(步)+-ual|gradual change
grant|/ɡrænt/|v./n.|授予；拨款|granted,granting,grants|The university granted him a scholarship.|大学授予他奖学金。|grant(相信)|take for granted
guarantee|/ˌɡærənˈtiː/|v./n.|保证；担保|guaranteed,guaranteeing,guarantees|We guarantee the quality of our products.|我们保证产品质量。|guarant(保证)+-ee|guarantee quality
guilty|/ˈɡɪlti/|adj.|有罪的；内疚的||He felt guilty about lying.|他因撒谎感到内疚。|guilt(罪)+-y|feel guilty
handle|/ˈhændl/|v./n.|处理；把手|handled,handling,handles|She handled the problem calmly.|她冷静地处理了这个问题。|hand(手)+-le|handle a problem
harm|/hɑːrm/|n./v.|伤害；损害||Smoking does harm to your health.|吸烟有害健康。|harm(伤害)|do harm to
hesitate|/ˈhezɪteɪt/|v.|犹豫；踌躇|hesitated,hesitating,hesitates|Don't hesitate to ask me.|别犹豫，尽管问我。|haes(粘住)+-itate|hesitate to do
highlight|/ˈhaɪlaɪt/|v./n.|强调；亮点|highlighted,highlighting,highlights|The report highlights three problems.|报告强调了三个问题。|high(高)+light(光)|highlight the issue
honest|/ˈɑːnɪst/|adj.|诚实的；正直的||To be honest, I don't like it.|说实话，我不喜欢它。|hon(荣誉)+-est|to be honest
identify|/aɪˈdentɪfaɪ/|v.|识别；确认|identified,identifying,identifies|Can you identify the man in the photo?|你能认出照片里的人吗？|ident(相同)+-ify|identify with
ignore|/ɪɡˈnɔːr/|v.|忽视；不理会|ignored,ignoring,ignores|He ignored my advice.|他无视了我的建议。|i-(不)+gnor(知道)|ignore the warning
illustrate|/ˈɪləstreɪt/|v.|说明；举例|illustrated,illustrating,illustrates|The chart illustrates the trend.|图表说明了趋势。|il-(加强)+lustr(光)+-ate|illustrate a point
imagine|/ɪˈmædʒɪn/|v.|想象；设想|imagined,imagining,imagines|Imagine living on the moon.|想象一下住在月球上。|imag(图像)+-ine|imagine doing
immediate|/ɪˈmiːdiət/|adj.|立即的；直接的||We need an immediate answer.|我们需要立即答复。|im-(不)+medi(中间)+-ate|immediate action
impact|/ˈɪmpækt/|n./v.|影响；冲击||The policy had a big impact.|这项政策影响很大。|im-(内)+pact(压紧)|impact on
implement|/ˈɪmplɪment/|v.|实施；执行|implemented,implementing,implements|They implemented the new rules.|他们实施了新规则。|im-(内)+ple(填满)+-ment|implement a policy
imply|/ɪmˈplaɪ/|v.|暗示；意味着|implied,implying,implies|Silence does not imply agreement.|沉默不意味着同意。|im-(内)+ply(折)|imply that
impose|/ɪmˈpoʊz/|v.|强加；征收|imposed,imposing,imposes|They imposed a new tax.|他们征收了一项新税。|im-(内)+pos(放)|impose on
impress|/ɪmˈpres/|v.|使印象深刻|impressed,impressing,impresses|Her speech impressed everyone.|她的演讲让所有人印象深刻。|im-(内)+press(压)|be impressed by
improve|/ɪmˈpruːv/|v.|改善；提高|improved,improving,improves|Reading improves your vocabulary.|阅读能提高你的词汇量。|im-(内)+prov(好)|improve on
include|/ɪnˈkluːd/|v.|包括；包含|included,including,includes|The price includes breakfast.|价格含早餐。|in-(内)+clud(关闭)|include in
income|/ˈɪnkʌm/|n.|收入；收益||His income doubled in two years.|他的收入两年翻了一倍。|in(进)+come(来)|income tax
increase|/ɪnˈkriːs/|v./n.|增加；增长|increased,increasing,increases|Prices increased by ten percent.|价格上涨了百分之十。|in-(内)+creas(生长)|increase in
independent|/ˌɪndɪˈpendənt/|adj.|独立的；自主的||She became financially independent.|她在经济上独立了。|in-(不)+depend(依靠)+-ent|independent of
indicate|/ˈɪndɪkeɪt/|v.|表明；指示|indicated,indicating,indicates|The data indicate a clear trend.|数据表明有明确的趋势。|in-(加强)+dic(说)+-ate|indicate that
individual|/ˌɪndɪˈvɪdʒuəl/|adj./n.|个人的；个体||Each individual has different needs.|每个个体都有不同的需求。|in-(不)+divid(分开)+-ual|individual needs
industry|/ˈɪndəstri/|n.|工业；行业|industries|The tourist industry is growing.|旅游业正在增长。|indu(在内)+stry(建造)|heavy industry
inevitable|/ɪnˈevɪtəbl/|adj.|不可避免的||Change is inevitable.|变化不可避免。|in-(不)+evit(避免)+-able|inevitable result
influence|/ˈɪnfluəns/|n./v.|影响||Parents have a great influence on children.|父母对孩子影响很大。|in-(内)+flu(流)+-ence|influence on
inform|/ɪnˈfɔːrm/|v.|通知；告知|informed,informing,informs|Please inform me of any change.|如有变动请通知我。|in-(内)+form(形式)|inform sb of
initial|/ɪˈnɪʃl/|adj./n.|最初的；首字母||The initial results are good.|最初的结果不错。|in-(内)+it(走)+-ial|initial stage
injure|/ˈɪndʒər/|v.|伤害；使受伤|injured,injuring,injures|He injured his knee in the game.|他在比赛中伤了膝盖。|in-(不)+jur(法)|be injured in
innocent|/ˈɪnəsnt/|adj.|无罪的；天真的||The court found him innocent.|法庭判他无罪。|in-(不)+noc(伤害)+-ent|innocent victim
innovation|/ˌɪnəˈveɪʃn/|n.|创新；革新||Innovation drives growth.|创新推动增长。|in-(内)+nov(新)+-ation|technical innovation
inquire|/ɪnˈkwaɪər/|v.|询问；打听|inquired,inquiring,inquires|She inquired about the timetable.|她询问了时间表。|in-(内)+quir(寻求)|inquire about
insist|/ɪnˈsɪst/|v.|坚持；坚决要求|insisted,insisting,insists|He insisted on paying the bill.|他坚持要付账。|in-(加强)+sist(站)|insist on
inspire|/ɪnˈspaɪər/|v.|激励；启发|inspired,inspiring,inspires|Her story inspired many people.|她的故事激励了很多人。|in-(内)+spir(呼吸)|inspire sb to do
install|/ɪnˈstɔːl/|v.|安装；任命|installed,installing,installs|We installed a new system.|我们安装了新系统。|in-(内)+stall(位置)|install software
instance|/ˈɪnstəns/|n.|例子；实例||This is a typical instance.|这是一个典型的例子。|in-(内)+stant(站)+-ce|for instance
instant|/ˈɪnstənt/|adj./n.|立即的；瞬间||The reply was instant.|回复是即时的。|in-(内)+stant(站)|in an instant
institute|/ˈɪnstɪtuːt/|n./v.|学院；机构；建立||She studies at a technical institute.|她在一所技术学院学习。|in-(内)+stitut(建立)|research institute
instruct|/ɪnˈstrʌkt/|v.|指导；命令|instructed,instructing,instructs|The teacher instructed us clearly.|老师清楚地指导了我们。|in-(内)+struct(建)|instruct sb to do
insurance|/ɪnˈʃʊrəns/|n.|保险；保险费||He bought health insurance.|他买了健康保险。|in-(使)+sur(确定)+-ance|health insurance
intelligent|/ɪnˈtelɪdʒənt/|adj.|聪明的；智能的||She is an intelligent student.|她是个聪明的学生。|intel-(之间)+lig(选)+-ent|intelligent system
intend|/ɪnˈtend/|v.|打算；意图|intended,intending,intends|I intend to finish it today.|我打算今天完成。|in-(向)+tend(伸)|intend to do
intense|/ɪnˈtens/|adj.|强烈的；紧张的||The competition is intense.|竞争很激烈。|in-(加强)+tens(拉紧)|intense pressure
interpret|/ɪnˈtɜːrprət/|v.|解释；口译|interpreted,interpreting,interprets|How do you interpret this poem?|你如何解读这首诗？|inter-(之间)+pret(价格)|interpret as
interrupt|/ˌɪntəˈrʌpt/|v.|打断；中断|interrupted,interrupting,interrupts|Sorry to interrupt your meeting.|抱歉打断你的会议。|inter-(之间)+rupt(断)|interrupt a meeting
introduce|/ˌɪntrəˈduːs/|v.|介绍；引进|introduced,introducing,introduces|Let me introduce my colleague.|让我介绍一下我的同事。|intro-(向内)+duc(引导)|introduce to
invest|/ɪnˈvest/|v.|投资；投入|invested,investing,invests|They invested heavily in research.|他们在研究上投入很大。|in-(内)+vest(衣服)|invest in
investigate|/ɪnˈvestɪɡeɪt/|v.|调查；研究|investigated,investigating,investigates|Police are investigating the case.|警方正在调查此案。|in-(内)+vestig(足迹)+-ate|investigate a case
involve|/ɪnˈvɑːlv/|v.|涉及；使参与|involved,involving,involves|The job involves a lot of travel.|这份工作需要经常出差。|in-(内)+volv(滚)|be involved in
isolate|/ˈaɪsəleɪt/|v.|隔离；孤立|isolated,isolating,isolates|The village was isolated by snow.|村庄被大雪隔绝了。|isol(岛)+-ate|isolate from
issue|/ˈɪʃuː/|n./v.|问题；发行||This is a serious issue.|这是个严重的问题。|ex-(出)+ire(走)|raise an issue
joint|/dʒɔɪnt/|adj./n.|共同的；关节||They made a joint effort.|他们共同努力。|join(连接)+-t|joint effort
judge|/dʒʌdʒ/|n./v.|法官；判断||Don't judge a book by its cover.|不要以貌取人。|jud(判断)+-ge|judge by
justice|/ˈdʒʌstɪs/|n.|正义；公正||They fought for social justice.|他们为社会正义而战。|just(公正)+-ice|social justice
justify|/ˈdʒʌstɪfaɪ/|v.|证明…正当；辩护|justified,justifying,justifies|Nothing can justify such behavior.|没有什么能为这种行为辩护。|just(公正)+-ify|justify the decision
label|/ˈleɪbl/|n./v.|标签；标注||Read the label before taking the medicine.|服药前请阅读标签。|label(布条)|price label
labor|/ˈleɪbər/|n./v.|劳动；劳工||The work requires much labor.|这项工作需要大量劳动。|labor(劳累)|labor force
launch|/lɔːntʃ/|v./n.|发射；发起；推出||They launched a new product.|他们推出了一款新产品。|launch(投掷)|launch a campaign
legal|/ˈliːɡl/|adj.|法律的；合法的||Is this contract legal?|这份合同合法吗？|leg(法律)+-al|legal advice
leisure|/ˈliːʒər/|n.|闲暇；休闲||He reads in his leisure time.|他闲暇时读书。|leis(允许)+-ure|leisure time
limit|/ˈlɪmɪt/|n./v.|限制；限度||There is a limit to my patience.|我的耐心是有限度的。|limit(边界)|speed limit
locate|/loʊˈkeɪt/|v.|定位；位于|located,locating,locates|The hotel is located near the station.|酒店位于车站附近。|loc(地方)+-ate|be located in
logic|/ˈlɑːdʒɪk/|n.|逻辑；道理||Your argument lacks logic.|你的论证缺乏逻辑。|log(言语)+-ic|logical thinking
maintain|/meɪnˈteɪn/|v.|维持；维修；主张|maintained,maintaining,maintains|It is hard to maintain such speed.|很难维持这样的速度。|main(手)+tain(拿)|maintain order
major|/ˈmeɪdʒər/|adj./n.|主要的；专业||This is a major problem.|这是一个主要问题。|maj(大)+-or|major role
manage|/ˈmænɪdʒ/|v.|管理；设法做到|managed,managing,manages|She manages a team of ten.|她管理一个十人团队。|man(手)+-age|manage to do
manufacture|/ˌmænjuˈfæktʃər/|v./n.|制造；生产|manufactured,manufacturing,manufactures|The factory manufactures phones.|这家工厂生产手机。|manu(手)+fact(做)+-ure|manufacturing industry
margin|/ˈmɑːrdʒɪn/|n.|边缘；利润||He won by a small margin.|他以微弱优势获胜。|marg(边)+-in|profit margin
mature|/məˈtʃʊr/|adj./v.|成熟的；成熟||She is very mature for her age.|就年龄而言她很成熟。|matur(成熟)|mature attitude
maximum|/ˈmæksɪməm/|adj./n.|最大的；最大值||The maximum speed is 120 km/h.|最高时速是 120 公里。|maxim(最大)+-um|maximum limit
means|/miːnz/|n.|方法；手段||The end justifies the means.|为达目的不择手段。|mean(手段)|by means of
measure|/ˈmeʒər/|v./n.|测量；措施|measured,measuring,measures|We measured the room carefully.|我们仔细测量了房间。|mens(测量)|take measures
mechanical|/məˈkænɪkl/|adj.|机械的；呆板的||There was a mechanical failure.|发生了机械故障。|mechan(机器)+-ical|mechanical problem
media|/ˈmiːdiə/|n.|媒体；媒介||The media reported the story widely.|媒体广泛报道了此事。|medi(中间)+-a|social media
mental|/ˈmentl/|adj.|精神的；心理的||Mental health matters.|心理健康很重要。|ment(思想)+-al|mental health
mention|/ˈmenʃn/|v./n.|提到；提及|mentioned,mentioning,mentions|He mentioned your name.|他提到了你的名字。|ment(思想)+-ion|not to mention
method|/ˈmeθəd/|n.|方法；办法||This method works well.|这个方法很有效。|meta-(之后)+hod(路)|teaching method
military|/ˈmɪləteri/|adj./n.|军事的；军队||He served in the military.|他在军队服役。|milit(士兵)+-ary|military service
minimum|/ˈmɪnɪməm/|adj./n.|最小的；最小值||We need a minimum of ten people.|我们最少需要十个人。|minim(最小)+-um|minimum wage
minor|/ˈmaɪnər/|adj./n.|较小的；未成年人||It was only a minor mistake.|这只是个小错误。|min(小)+-or|minor change
modest|/ˈmɑːdɪst/|adj.|谦虚的；适度的||He is modest about his success.|他对自己的成功很谦虚。|mod(限度)+-est|modest income
moral|/ˈmɔːrəl/|adj./n.|道德的；道德||He has strong moral values.|他有很强的道德观。|mor(风俗)+-al|moral standard
motivate|/ˈmoʊtɪveɪt/|v.|激励；成为…的动机|motivated,motivating,motivates|Good teachers motivate students.|好老师能激励学生。|mot(动)+-ivate|motivate sb to do
mutual|/ˈmjuːtʃuəl/|adj.|相互的；共同的||We have mutual respect.|我们相互尊重。|mut(改变)+-ual|mutual respect
narrow|/ˈnæroʊ/|adj./v.|狭窄的；缩小||The road is too narrow for trucks.|这条路对卡车来说太窄了。|narrow(窄)|narrow down
negative|/ˈneɡətɪv/|adj./n.|消极的；否定的||Don't be so negative.|别这么消极。|neg(否)+-ative|negative effect
neglect|/nɪˈɡlekt/|v./n.|忽视；疏忽|neglected,neglecting,neglects|He neglected his health.|他忽视了自己的健康。|neg-(不)+lect(选)|neglect one's duty
nevertheless|/ˌnevərðəˈles/|adv.|尽管如此；然而||It was hard; nevertheless, we tried.|这很难，但我们还是试了。|never(不)+the+less(少)|nevertheless
normal|/ˈnɔːrml/|adj.|正常的；标准的||This is a normal reaction.|这是正常的反应。|norm(标准)+-al|normal life
notice|/ˈnoʊtɪs/|v./n.|注意到；通知|noticed,noticing,notices|I noticed a change in his voice.|我注意到他的声音变了。|not(知道)+-ice|take notice of
obey|/əˈbeɪ/|v.|服从；遵守|obeyed,obeying,obeys|Everyone must obey the rules.|人人都必须遵守规则。|ob-(向)+ey(听)|obey the rules
object|/ˈɑːbdʒekt/|n./v.|物体；目标；反对||What is the object of the game?|这个游戏的目的是什么？|ob-(向)+ject(扔)|object to
observe|/əbˈzɜːrv/|v.|观察；遵守|observed,observing,observes|Scientists observe the stars.|科学家观察星星。|ob-(向)+serv(保持)|observe the rules
obtain|/əbˈteɪn/|v.|获得；得到|obtained,obtaining,obtains|He obtained a driving license.|他拿到了驾照。|ob-(加强)+tain(拿)|obtain permission
obvious|/ˈɑːbviəs/|adj.|明显的；显然的||The answer is obvious.|答案很明显。|ob-(向)+vi(路)+-ous|for obvious reasons
occasion|/əˈkeɪʒn/|n.|场合；时机||It is a special occasion.|这是一个特殊场合。|oc-(向)+cas(落)+-ion|on occasion
occupy|/ˈɑːkjupaɪ/|v.|占据；占用|occupied,occupying,occupies|The bed occupies half the room.|这张床占了半个房间。|oc-(加强)+cup(拿)|be occupied with
occur|/əˈkɜːr/|v.|发生；出现|occurred,occurring,occurs|The accident occurred at midnight.|事故发生在午夜。|oc-(向)+cur(跑)|occur to sb
offer|/ˈɔːfər/|v./n.|提供；提议|offered,offering,offers|They offered me a job.|他们给了我一份工作。|of-(向)+fer(带)|offer to do
operate|/ˈɑːpəreɪt/|v.|操作；运转；动手术|operated,operating,operates|He knows how to operate the machine.|他知道如何操作这台机器。|oper(工作)+-ate|operate on
opportunity|/ˌɑːpərˈtuːnəti/|n.|机会；时机|opportunities|Don't miss this opportunity.|别错过这个机会。|op-(向)+port(港口)+-unity|seize an opportunity
oppose|/əˈpoʊz/|v.|反对；抵制|opposed,opposing,opposes|Many people opposed the plan.|许多人反对这个计划。|op-(相反)+pos(放)|oppose to
optimistic|/ˌɑːptɪˈmɪstɪk/|adj.|乐观的||She is optimistic about the future.|她对未来很乐观。|optim(最好)+-istic|optimistic about
organize|/ˈɔːrɡənaɪz/|v.|组织；安排|organized,organizing,organizes|They organized a charity event.|他们组织了一场慈善活动。|organ(器官，工具)+-ize|organize a meeting
origin|/ˈɔːrɪdʒɪn/|n.|起源；出身||The origin of the word is Latin.|这个词源自拉丁语。|ori(升起)+-gin|country of origin
otherwise|/ˈʌðərwaɪz/|adv.|否则；另外||Hurry up, otherwise we'll be late.|快点，否则我们就要迟到了。|other(其他)+wise(方式)|or otherwise
outcome|/ˈaʊtkʌm/|n.|结果；成果||The outcome was better than expected.|结果比预期更好。|out(出)+come(来)|final outcome
overall|/ˌoʊvərˈɔːl/|adj./adv.|总体的；总的来说||The overall result is positive.|总体结果是积极的。|over(遍及)+all(全部)|overall impression
overcome|/ˌoʊvərˈkʌm/|v.|克服；战胜|overcame,overcome,overcomes|She overcame many difficulties.|她克服了许多困难。|over(越过)+come(来)|overcome difficulties
owe|/oʊ/|v.|欠；归功于|owed,owing,owes|I owe you an apology.|我欠你一个道歉。|owe(拥有)|owe to
participate|/pɑːrˈtɪsɪpeɪt/|v.|参加；参与|participated,participating,participates|Everyone participated in the discussion.|每个人都参加了讨论。|part(部分)+cip(拿)+-ate|participate in
particular|/pərˈtɪkjələr/|adj.|特别的；特定的||Is there a particular reason?|有什么特别的原因吗？|part(部分)+-icular|in particular
passion|/ˈpæʃn/|n.|激情；热情||She has a passion for music.|她热爱音乐。|pass(受苦)+-ion|passion for
patient|/ˈpeɪʃnt/|adj./n.|耐心的；病人||Please be patient with children.|对孩子要有耐心。|pati(忍受)+-ent|be patient with
perceive|/pərˈsiːv/|v.|察觉；理解|perceived,perceiving,perceives|I perceived a change in her tone.|我察觉到她语气的变化。|per-(完全)+ceiv(拿)|perceive as
perform|/pərˈfɔːrm/|v.|表演；执行|performed,performing,performs|The band performed brilliantly.|乐队表演得很出色。|per-(完全)+form(形式)|perform a task
permanent|/ˈpɜːrmənənt/|adj.|永久的；长期的||He found a permanent job.|他找到了一份固定工作。|per-(自始至终)+man(停留)+-ent|permanent damage
permit|/pərˈmɪt/|v./n.|允许；许可证|permitted,permitting,permits|Smoking is not permitted here.|此处禁止吸烟。|per-(通过)+mit(送)|permit sb to do
persist|/pərˈsɪst/|v.|坚持；持续|persisted,persisting,persists|The problem persists.|问题依然存在。|per-(自始至终)+sist(站)|persist in
persuade|/pərˈsweɪd/|v.|说服；劝服|persuaded,persuading,persuades|He persuaded me to join.|他说服我加入。|per-(完全)+suad(劝)|persuade sb to do
phenomenon|/fəˈnɑːmɪnən/|n.|现象|phenomena|This is a common social phenomenon.|这是一个常见的社会现象。|phen(显现)+-omenon|natural phenomenon
physical|/ˈfɪzɪkl/|adj.|身体的；物理的||Physical exercise is important.|体育锻炼很重要。|phys(自然)+-ical|physical health
policy|/ˈpɑːləsi/|n.|政策；方针|policies|The government changed its policy.|政府改变了政策。|polic(城邦)+-y|foreign policy
pollution|/pəˈluːʃn/|n.|污染||Air pollution is a serious problem.|空气污染是个严重问题。|pol(弄脏)+-lution|environmental pollution
popular|/ˈpɑːpjələr/|adj.|受欢迎的；流行的||This song is very popular now.|这首歌现在很流行。|popul(人民)+-ar|popular with
portion|/ˈpɔːrʃn/|n.|部分；一份||A portion of the profit goes to charity.|一部分利润捐给慈善。|port(部分)+-ion|a portion of
positive|/ˈpɑːzətɪv/|adj.|积极的；肯定的||Keep a positive attitude.|保持积极的态度。|pos(放)+-itive|positive attitude
possess|/pəˈzes/|v.|拥有；具有|possessed,possessing,possesses|He possesses great talent.|他很有天赋。|pos-(能力)+sess(坐)|possess a skill
potential|/pəˈtenʃl/|adj./n.|潜在的；潜力||She has great potential.|她很有潜力。|potent(有力)+-ial|potential customer
practical|/ˈpræktɪkl/|adj.|实际的；实用的||We need a practical solution.|我们需要一个实用的解决方案。|pract(做)+-ical|practical experience
precise|/prɪˈsaɪs/|adj.|精确的；准确的||Give me the precise time.|告诉我准确时间。|pre-(预先)+cis(切)|to be precise
predict|/prɪˈdɪkt/|v.|预测；预言|predicted,predicting,predicts|It is hard to predict the weather.|天气很难预测。|pre-(预先)+dict(说)|predict the future
prefer|/prɪˈfɜːr/|v.|更喜欢；宁愿|preferred,preferring,prefers|I prefer tea to coffee.|比起咖啡我更喜欢茶。|pre-(前)+fer(带)|prefer A to B
prejudice|/ˈpredʒudɪs/|n./v.|偏见；使有偏见||We should fight against prejudice.|我们应该反对偏见。|pre-(预先)+judic(判断)|racial prejudice
prepare|/prɪˈper/|v.|准备；预备|prepared,preparing,prepares|She prepared dinner for us.|她为我们准备了晚餐。|pre-(预先)+par(准备)|prepare for
present|/ˈpreznt/|adj./n./v.|现在的；礼物；呈现||All the students were present.|所有学生都到了。|pre-(前)+sent(存在)|at present
preserve|/prɪˈzɜːrv/|v.|保护；保存|preserved,preserving,preserves|We must preserve the old buildings.|我们必须保护古建筑。|pre-(预先)+serv(保持)|preserve the environment
pressure|/ˈpreʃər/|n./v.|压力；施加压力||He works well under pressure.|他在压力下工作得很好。|press(压)+-ure|under pressure
prevent|/prɪˈvent/|v.|阻止；预防|prevented,preventing,prevents|Exercise can prevent many diseases.|运动能预防许多疾病。|pre-(前)+vent(来)|prevent from
previous|/ˈpriːviəs/|adj.|以前的；先前的||He mentioned it in a previous email.|他在之前的邮件里提到过。|pre-(前)+vi(路)+-ous|previous experience
primary|/ˈpraɪmeri/|adj.|主要的；初级的||Our primary goal is safety.|我们的首要目标是安全。|prim(第一)+-ary|primary school
principle|/ˈprɪnsəpl/|n.|原则；原理||He never breaks his principles.|他从不违背自己的原则。|prin(第一)+cip(拿)+-le|in principle
priority|/praɪˈɔːrəti/|n.|优先；优先事项|priorities|Safety is our top priority.|安全是我们的首要任务。|prior(更早)+-ity|top priority
private|/ˈpraɪvət/|adj.|私人的；私营的||This is a private conversation.|这是私人谈话。|priv(个人)+-ate|private life
probable|/ˈprɑːbəbl/|adj.|很可能发生的||It is probable that he will win.|他很可能会赢。|prob(证明)+-able|probable cause
proceed|/proʊˈsiːd/|v.|继续进行；前进|proceeded,proceeding,proceeds|Please proceed with the plan.|请继续执行计划。|pro-(向前)+ceed(走)|proceed with
process|/ˈprɑːses/|n./v.|过程；处理||Learning is a slow process.|学习是一个缓慢的过程。|pro-(向前)+cess(走)|in the process of
produce|/prəˈduːs/|v./n.|生产；produce；农产品|produced,producing,produces|The factory produces cars.|这家工厂生产汽车。|pro-(向前)+duc(引导)|produce results
profit|/ˈprɑːfɪt/|n./v.|利润；获益||The company made a big profit.|公司赚了一大笔利润。|pro-(向前)+fit(做)|make a profit
progress|/ˈprɑːɡres/|n./v.|进步；进展||You have made great progress.|你进步很大。|pro-(向前)+gress(走)|make progress
prohibit|/prəˈhɪbɪt/|v.|禁止；阻止|prohibited,prohibiting,prohibits|The law prohibits smoking indoors.|法律禁止室内吸烟。|pro-(向前)+hibit(拿)|prohibit from
project|/ˈprɑːdʒekt/|n./v.|项目；投射||The project will take a year.|这个项目需要一年。|pro-(向前)+ject(扔)|research project
promote|/prəˈmoʊt/|v.|促进；提升|promoted,promoting,promotes|Exercise promotes good health.|运动促进健康。|pro-(向前)+mot(动)|promote growth
proportion|/prəˈpɔːrʃn/|n.|比例；部分||A large proportion of students agree.|很大比例的学生同意。|pro-(向前)+portion(部分)|in proportion to
propose|/prəˈpoʊz/|v.|提议；打算|proposed,proposing,proposes|I propose a different plan.|我提议一个不同的方案。|pro-(向前)+pos(放)|propose to do
protect|/prəˈtekt/|v.|保护；防护|protected,protecting,protects|We must protect wild animals.|我们必须保护野生动物。|pro-(前)+tect(覆盖)|protect from
prove|/pruːv/|v.|证明；结果是|proved,proven,proves|The facts prove he is right.|事实证明他是对的。|prov(证明)|prove to be
provide|/prəˈvaɪd/|v.|提供；供给|provided,providing,provides|The hotel provides free breakfast.|酒店提供免费早餐。|pro-(向前)+vid(看)|provide with
public|/ˈpʌblɪk/|adj./n.|公众的；公共的||This is a public library.|这是一家公共图书馆。|publ(人民)+-ic|public transport
publish|/ˈpʌblɪʃ/|v.|出版；发表|published,publishing,publishes|Her book was published last year.|她的书去年出版了。|publ(人民)+-ish|publish a paper
pursue|/pərˈsuː/|v.|追求；从事|pursued,pursuing,pursues|She decided to pursue a career in law.|她决定从事法律职业。|pur-(向前)+su(跟随)|pursue a goal
quality|/ˈkwɑːləti/|n.|质量；品质|qualities|We care about quality.|我们注重质量。|qual(性质)+-ity|high quality
quantity|/ˈkwɑːntəti/|n.|数量|quantities|A large quantity of water was wasted.|大量水被浪费了。|quant(多少)+-ity|a large quantity of
range|/reɪndʒ/|n./v.|范围；山脉；变化||The price range is wide.|价格区间很大。|rang(排列)|a range of
rapid|/ˈræpɪd/|adj.|快速的；迅速的||The city saw rapid growth.|这座城市发展迅速。|rap(抢)+-id|rapid growth
rarely|/ˈrerli/|adv.|很少；难得||He rarely eats out.|他很少在外面吃饭。|rare(稀有)+-ly|rarely ever
rate|/reɪt/|n./v.|比率；速度；评价||The unemployment rate fell.|失业率下降了。|rat(计算)|at any rate
react|/riˈækt/|v.|反应；回应|reacted,reacting,reacts|How did she react to the news?|她对这个消息反应如何？|re-(回)+act(做)|react to
realize|/ˈriːəlaɪz/|v.|意识到；实现|realized,realizing,realizes|I realized my mistake at once.|我立刻意识到了自己的错误。|real(真实)+-ize|realize the importance
reasonable|/ˈriːznəbl/|adj.|合理的；通情达理的||That is a reasonable price.|这个价格很合理。|reason(理由)+-able|reasonable price
recall|/rɪˈkɔːl/|v./n.|回忆；召回|recalled,recalling,recalls|I can't recall his name.|我想不起他的名字了。|re-(回)+call(叫)|recall doing sth
receive|/rɪˈsiːv/|v.|收到；接待|received,receiving,receives|I received your letter yesterday.|我昨天收到了你的信。|re-(回)+ceiv(拿)|receive a letter
recognize|/ˈrekəɡnaɪz/|v.|认出；承认|recognized,recognizing,recognizes|I recognized her at once.|我立刻认出了她。|re-(再)+cogn(知道)+-ize|recognize as
recommend|/ˌrekəˈmend/|v.|推荐；建议|recommended,recommending,recommends|I recommend this restaurant.|我推荐这家餐厅。|re-(加强)+commend(委托)|recommend doing
recover|/rɪˈkʌvər/|v.|恢复；痊愈|recovered,recovering,recovers|He is recovering from illness.|他正在康复中。|re-(再)+cover(覆盖)|recover from
reduce|/rɪˈduːs/|v.|减少；降低|reduced,reducing,reduces|We must reduce costs.|我们必须降低成本。|re-(回)+duc(引导)|reduce to
refer|/rɪˈfɜːr/|v.|提到；参考|referred,referring,refers|He referred to the report twice.|他两次提到了那份报告。|re-(回)+fer(带)|refer to
reflect|/rɪˈflekt/|v.|反映；反射；思考|reflected,reflecting,reflects|The results reflect our effort.|结果反映了我们的努力。|re-(回)+flect(弯)|reflect on
reform|/rɪˈfɔːrm/|n./v.|改革；改造||The education reform is urgent.|教育改革迫在眉睫。|re-(再)+form(形式)|economic reform
refuse|/rɪˈfjuːz/|v.|拒绝|refused,refusing,refuses|She refused to answer.|她拒绝回答。|re-(回)+fus(倒)|refuse to do
regard|/rɪˈɡɑːrd/|v./n.|认为；关于；尊重||I regard him as a friend.|我把他当作朋友。|re-(再)+gard(看)|with regard to
region|/ˈriːdʒən/|n.|地区；区域||This region is famous for tea.|这个地区以茶闻名。|reg(统治)+-ion|mountain region
register|/ˈredʒɪstər/|v./n.|注册；登记|registered,registering,registers|You must register before the course.|上课前你必须注册。|re-(再)+gister(带来)|register for
regret|/rɪˈɡret/|v./n.|后悔；遗憾|regretted,regretting,regrets|I regret not studying harder.|我后悔没有更努力学习。|re-(再)+gret(哭)|regret doing sth
regular|/ˈreɡjələr/|adj.|定期的；规律的||He keeps a regular schedule.|他作息规律。|regul(规则)+-ar|regular exercise
reject|/rɪˈdʒekt/|v.|拒绝；排斥|rejected,rejecting,rejects|They rejected our offer.|他们拒绝了我们的提议。|re-(回)+ject(扔)|reject an offer
relate|/rɪˈleɪt/|v.|有关；叙述|related,relating,relates|These two events are closely related.|这两个事件密切相关。|re-(回)+lat(带)|relate to
relative|/ˈrelətɪv/|adj./n.|相对的；亲戚||Everything is relative.|一切都是相对的。|relat(关系)+-ive|relative to
release|/rɪˈliːs/|v./n.|释放；发布|released,releasing,releases|They released the new version.|他们发布了新版本。|re-(回)+lease(松)|release a report
relevant|/ˈreləvənt/|adj.|相关的；切题的||Please provide relevant documents.|请提供相关文件。|re-(再)+lev(举起)+-ant|relevant to
reliable|/rɪˈlaɪəbl/|adj.|可靠的；可信赖的||He is a reliable partner.|他是个可靠的伙伴。|rely(依靠)+-able|reliable source
relieve|/rɪˈliːv/|v.|减轻；缓解|relieved,relieving,relieves|The medicine relieved the pain.|药减轻了疼痛。|re-(再)+liev(轻)|relieve pressure
religion|/rɪˈlɪdʒən/|n.|宗教；信仰||Religion plays a role in culture.|宗教在文化中起作用。|re-(再)+lig(绑)+-ion|freedom of religion
reluctant|/rɪˈlʌktənt/|adj.|不情愿的；勉强的||She was reluctant to leave.|她不愿离开。|re-(反)+luct(挣扎)+-ant|reluctant to do
rely|/rɪˈlaɪ/|v.|依靠；信赖|relied,relying,relies|You can rely on her.|你可以信赖她。|re-(加强)+ly(绑)|rely on
remain|/rɪˈmeɪn/|v.|保持；剩下|remained,remaining,remains|The problem remains unsolved.|问题仍未解决。|re-(再)+main(停留)|remain silent
remark|/rɪˈmɑːrk/|n./v.|评论；言辞|remarked,remarking,remarks|His remark surprised us.|他的话让我们吃惊。|re-(再)+mark(标记)|make a remark
remind|/rɪˈmaɪnd/|v.|提醒；使想起|reminded,reminding,reminds|Please remind me to call him.|请提醒我给他打电话。|re-(再)+mind(心)|remind sb of
remote|/rɪˈmoʊt/|adj.|遥远的；偏僻的||They live in a remote village.|他们住在一个偏远的村庄。|re-(回)+mot(动)|remote area
remove|/rɪˈmuːv/|v.|移开；去除|removed,removing,removes|Please remove your shoes.|请脱鞋。|re-(回)+mov(动)|remove from
repair|/rɪˈper/|v./n.|修理；修复|repaired,repairing,repairs|He repaired the bike himself.|他自己修好了自行车。|re-(再)+pair(准备)|under repair
replace|/rɪˈpleɪs/|v.|取代；替换|replaced,replacing,replaces|We need to replace the old machine.|我们需要更换旧机器。|re-(再)+place(放)|replace with
represent|/ˌreprɪˈzent/|v.|代表；表示|represented,representing,represents|She represents our school.|她代表我们学校。|re-(再)+present(呈现)|represent a change
reputation|/ˌrepjuˈteɪʃn/|n.|名声；声誉||The hotel has a good reputation.|这家酒店声誉很好。|re-(再)+put(想)+-ation|build a reputation
request|/rɪˈkwest/|n./v.|请求；要求||They refused our request.|他们拒绝了我们的请求。|re-(再)+quest(寻求)|at the request of
require|/rɪˈkwaɪər/|v.|需要；要求|required,requiring,requires|The job requires patience.|这份工作需要耐心。|re-(再)+quir(寻求)|require sb to do
rescue|/ˈreskjuː/|v./n.|营救；救援|rescued,rescuing,rescues|They rescued the child from the fire.|他们把孩子从火中救出。|re-(再)+scue(摇)|rescue team
research|/rɪˈsɜːrtʃ/|n./v.|研究；调查||His research focuses on climate.|他的研究聚焦气候。|re-(再)+search(寻找)|do research on
reserve|/rɪˈzɜːrv/|v./n.|预订；保留；储备|reserved,reserving,reserves|I reserved a table for two.|我订了一张两人桌。|re-(再)+serv(保持)|in reserve
resident|/ˈrezɪdənt/|n./adj.|居民；居住的||Local residents complained about noise.|当地居民抱怨噪音。|re-(再)+sid(坐)+-ent|local resident
resist|/rɪˈzɪst/|v.|抵抗；抵制|resisted,resisting,resists|He could not resist the temptation.|他无法抗拒诱惑。|re-(反)+sist(站)|resist temptation
resource|/ˈriːsɔːrs/|n.|资源；财力||Water is a precious resource.|水是宝贵的资源。|re-(再)+sourc(升起)|natural resources
respect|/rɪˈspekt/|n./v.|尊重；方面||We should respect each other.|我们应该互相尊重。|re-(再)+spect(看)|in this respect
respond|/rɪˈspɑːnd/|v.|回答；反应|responded,responding,responds|She responded quickly to my email.|她很快回复了我的邮件。|re-(回)+spond(承诺)|respond to
responsible|/rɪˈspɑːnsəbl/|adj.|负责的；有责任的||He is responsible for the project.|他负责这个项目。|re-(回)+spons(承诺)+-ible|responsible for
restrict|/rɪˈstrɪkt/|v.|限制；约束|restricted,restricting,restricts|The rules restrict our choices.|这些规则限制了我们的选择。|re-(回)+strict(拉紧)|restrict to
result|/rɪˈzʌlt/|n./v.|结果；导致||The result was surprising.|结果令人惊讶。|re-(回)+sult(跳)|as a result
retain|/rɪˈteɪn/|v.|保持；保留|retained,retaining,retains|The company retained its best staff.|公司留住了最好的员工。|re-(回)+tain(拿)|retain control
retire|/rɪˈtaɪər/|v.|退休；退出|retired,retiring,retires|He retired at sixty.|他六十岁退休。|re-(回)+tire(拉)|retire from
reveal|/rɪˈviːl/|v.|揭示；透露|revealed,revealing,reveals|The study revealed a surprising fact.|研究揭示了一个惊人的事实。|re-(反)+veal(面纱)|reveal the truth
reverse|/rɪˈvɜːrs/|v./adj.|颠倒；相反的|reversed,reversing,reverses|The decision was reversed.|决定被撤销了。|re-(回)+vers(转)|in reverse
review|/rɪˈvjuː/|n./v.|复习；评论||Let's review the lesson.|我们复习一下这一课。|re-(再)+view(看)|book review
revise|/rɪˈvaɪz/|v.|修改；复习|revised,revising,revises|He revised his essay twice.|他把文章修改了两次。|re-(再)+vis(看)|revise a plan
reward|/rɪˈwɔːrd/|n./v.|奖励；报答||Hard work brings its own reward.|努力自有回报。|re-(回)+ward(看守)|as a reward
rigid|/ˈrɪdʒɪd/|adj.|严格的；僵硬的||The rules are too rigid.|这些规定太死板。|rig(僵硬)+-id|rigid rules
routine|/ruːˈtiːn/|n./adj.|例行公事；日常的||Exercise is part of my routine.|锻炼是我日常的一部分。|rout(路)+-ine|daily routine
rural|/ˈrʊrəl/|adj.|农村的；乡村的||Rural life is quiet.|乡村生活很安静。|rur(乡村)+-al|rural area
satisfy|/ˈsætɪsfaɪ/|v.|使满意；满足|satisfied,satisfying,satisfies|The result satisfied everyone.|结果让每个人都很满意。|satis(足够)+-fy|be satisfied with
scarce|/skers/|adj.|稀少的；缺乏的||Fresh water is scarce here.|这里淡水稀缺。|scarc(缺乏)|scarce resources
scatter|/ˈskætər/|v.|散开；撒|scattered,scattering,scatters|The crowd scattered quickly.|人群很快散开了。|scatter(散布)|scatter around
schedule|/ˈskedʒuːl/|n./v.|日程；安排||My schedule is full this week.|我这周日程排满了。|sched(纸片)+-ule|on schedule
scheme|/skiːm/|n./v.|方案；计划||They designed a new scheme.|他们设计了一个新方案。|schem(形状)|a training scheme
scope|/skoʊp/|n.|范围；机会||This is beyond the scope of the study.|这超出了研究范围。|scop(看)|within the scope of
secure|/sɪˈkjʊr/|adj./v.|安全的；获得||The building is secure.|这栋楼很安全。|se-(分离)+cur(关心)|secure a job
seek|/siːk/|v.|寻找；谋求|sought,seeking,seeks|He is seeking a new job.|他正在找新工作。|seek(寻找)|seek for
seldom|/ˈseldəm/|adv.|很少；不常||He seldom goes to the cinema.|他很少去看电影。|seld(少)+-om|seldom seen
select|/sɪˈlekt/|v.|选择；挑选|selected,selecting,selects|Please select one option.|请选择一个选项。|se-(分开)+lect(选)|select from
sensitive|/ˈsensətɪv/|adj.|敏感的；灵敏的||She is sensitive to criticism.|她对批评很敏感。|sens(感觉)+-itive|sensitive to
separate|/ˈsepəreɪt/|v./adj.|分开；单独的|separated,separating,separates|Separate the eggs from the whites.|把蛋黄和蛋白分开。|se-(分开)+par(准备)+-ate|separate from
sequence|/ˈsiːkwəns/|n.|顺序；序列||Follow the correct sequence.|按正确的顺序操作。|sequ(跟随)+-ence|in sequence
series|/ˈsɪriːz/|n.|系列；丛书||The book is part of a series.|这本书是丛书之一。|ser(连接)+-ies|a series of
settle|/ˈsetl/|v.|解决；定居|settled,settling,settles|They settled the dispute peacefully.|他们和平解决了争端。|settle(坐定)|settle down
severe|/sɪˈvɪr/|adj.|严重的；严厉的||He suffered severe injuries.|他受了重伤。|sever(严厉)|severe weather
shortage|/ˈʃɔːrtɪdʒ/|n.|短缺；不足||There is a shortage of nurses.|护士短缺。|short(短)+-age|water shortage
significant|/sɪɡˈnɪfɪkənt/|adj.|重要的；显著的||There was a significant improvement.|有了显著的改善。|sign(标记)+fic(做)+-ant|significant change
similar|/ˈsɪmələr/|adj.|相似的；类似的||Our views are similar.|我们的观点相似。|simil(相同)+-ar|similar to
simplify|/ˈsɪmplɪfaɪ/|v.|简化|simplified,simplifying,simplifies|We should simplify the process.|我们应该简化流程。|simpl(简单)+-ify|simplify the process
situation|/ˌsɪtʃuˈeɪʃn/|n.|情况；处境||The situation is getting better.|情况正在好转。|situ(位置)+-ation|current situation
solve|/sɑːlv/|v.|解决；解答|solved,solving,solves|He solved the problem quickly.|他很快解决了问题。|solv(松开)|solve a problem
source|/sɔːrs/|n.|来源；源头||The source of the river is in the mountains.|这条河的源头在群山中。|sourc(升起)|source of information
specific|/spəˈsɪfɪk/|adj.|具体的；特定的||Give me a specific example.|给我一个具体的例子。|spec(看)+-ific|specific purpose
stable|/ˈsteɪbl/|adj.|稳定的；稳固的||Prices remained stable.|价格保持稳定。|st(站)+-able|stable condition
standard|/ˈstændərd/|n./adj.|标准；标准的||The standard of living rose.|生活水平提高了。|stand(站)+-ard|standard of living
statistics|/stəˈtɪstɪks/|n.|统计数字；统计学||The statistics show a clear trend.|统计数据显示出明确趋势。|stat(站)+-istics|official statistics
status|/ˈsteɪtəs/|n.|地位；状态||His status in the company rose.|他在公司的地位上升了。|stat(站)+-us|social status
strategy|/ˈstrætədʒi/|n.|策略；战略|strategies|We need a new strategy.|我们需要新策略。|strat(军队)+-egy|marketing strategy
strengthen|/ˈstreŋθn/|v.|加强；增强|strengthened,strengthening,strengthens|Exercise strengthens the heart.|运动增强心脏功能。|strength(力量)+-en|strengthen ties
stress|/stres/|n./v.|压力；强调||He is under great stress.|他压力很大。|stress(拉紧)|stress on
strict|/strɪkt/|adj.|严格的；严厉的||My father is strict with me.|我父亲对我很严格。|strict(拉紧)|strict with
structure|/ˈstrʌktʃər/|n./v.|结构；构造||The structure of the essay is clear.|文章结构清晰。|struct(建)+-ure|social structure
struggle|/ˈstrʌɡl/|v./n.|奋斗；挣扎|struggled,struggling,struggles|They struggled to survive.|他们为生存而挣扎。|struggle(争斗)|struggle with
submit|/səbˈmɪt/|v.|提交；屈服|submitted,submitting,submits|Please submit your report by Friday.|请在周五前提交报告。|sub-(下)+mit(送)|submit an application
subsequent|/ˈsʌbsɪkwənt/|adj.|随后的；后来的||Subsequent events proved him right.|随后的事件证明他是对的。|sub-(下)+sequ(跟随)+-ent|subsequent years
substance|/ˈsʌbstəns/|n.|物质；实质||The substance is harmful.|这种物质有害。|sub-(下)+st(站)+-ance|chemical substance
substitute|/ˈsʌbstɪtuːt/|n./v.|代替品；代替||You can substitute honey for sugar.|你可以用蜂蜜代替糖。|sub-(下)+stitut(建立)|substitute for
succeed|/səkˈsiːd/|v.|成功；继承|succeeded,succeeding,succeeds|She succeeded in passing the exam.|她成功通过了考试。|suc-(下)+ceed(走)|succeed in
sufficient|/səˈfɪʃnt/|adj.|充足的；足够的||We have sufficient time.|我们有足够的时间。|suf-(下)+fic(做)+-ient|sufficient evidence
suggest|/səˈdʒest/|v.|建议；暗示|suggested,suggesting,suggests|I suggest taking a break.|我建议休息一下。|sug-(下)+gest(带)|suggest doing sth
summary|/ˈsʌməri/|n.|摘要；总结|summaries|Write a summary of the article.|写一篇文章摘要。|summ(总)+-ary|in summary
supply|/səˈplaɪ/|v./n.|供应；供给|supplied,supplying,supplies|They supply water to the village.|他们向村庄供水。|sup-(下)+ply(填满)|supply and demand
support|/səˈpɔːrt/|v./n.|支持；支撑|supported,supporting,supports|Thank you for your support.|谢谢你的支持。|sup-(下)+port(运)|support for
suppose|/səˈpoʊz/|v.|假设；认为|supposed,supposing,supposes|I suppose you are right.|我想你是对的。|sup-(下)+pos(放)|be supposed to
surface|/ˈsɜːrfɪs/|n./adj.|表面；表面的||The surface is very smooth.|表面非常光滑。|sur-(上)+face(面)|on the surface
surround|/səˈraʊnd/|v.|包围；环绕|surrounded,surrounding,surrounds|Tall trees surround the lake.|高树环绕着湖。|sur-(上)+round(圆)|be surrounded by
survey|/ˈsɜːrveɪ/|n./v.|调查；勘测||We conducted a survey of 500 people.|我们调查了 500 人。|sur-(上)+vey(看)|conduct a survey
survive|/sərˈvaɪv/|v.|幸存；比…活得长|survived,surviving,survives|Only one passenger survived.|只有一名乘客幸存。|sur-(超过)+viv(活)|survive from
suspect|/səˈspekt/|v./n.|怀疑；嫌疑人|suspected,suspecting,suspects|I suspect he is lying.|我怀疑他在撒谎。|su-(下)+spect(看)|suspect sb of
sustain|/səˈsteɪn/|v.|维持；支撑|sustained,sustaining,sustains|The economy cannot sustain such growth.|经济无法维持这样的增长。|sus-(下)+tain(拿)|sustain growth
switch|/swɪtʃ/|n./v.|开关；转换||Switch off the light, please.|请关灯。|switch(开关)|switch to
sympathy|/ˈsɪmpəθi/|n.|同情；共鸣||I have great sympathy for them.|我非常同情他们。|sym-(共同)+path(感受)+-y|sympathy for
technique|/tekˈniːk/|n.|技术；技巧||This technique saves time.|这个技巧省时间。|techn(技艺)+-ique|teaching technique
temporary|/ˈtempəreri/|adj.|暂时的；临时的||This is a temporary solution.|这是临时的解决方案。|tempor(时间)+-ary|temporary job
tend|/tend/|v.|倾向于；照料|tended,tending,tends|Prices tend to rise in winter.|冬天价格往往上涨。|tend(伸)|tend to do
tension|/ˈtenʃn/|n.|紧张；张力||The tension between them grew.|他们之间的紧张加剧了。|tens(拉紧)+-ion|political tension
terrible|/ˈterəbl/|adj.|可怕的；糟糕的||The weather was terrible.|天气很糟糕。|terr(使害怕)+-ible|terrible mistake
theory|/ˈθiːəri/|n.|理论；学说|theories|The theory was proved correct.|这个理论被证明是正确的。|theor(看)+-y|in theory
threaten|/ˈθretn/|v.|威胁；恐吓|threatened,threatening,threatens|The flood threatened the village.|洪水威胁着村庄。|threat(威胁)+-en|threaten to do
tolerate|/ˈtɑːləreɪt/|v.|容忍；忍受|tolerated,tolerating,tolerates|I cannot tolerate such rudeness.|我无法容忍这种无礼。|toler(忍受)+-ate|tolerate behavior
tough|/tʌf/|adj.|艰难的；坚韧的|tougher,toughest|It was a tough decision.|这是个艰难的决定。|tough(坚韧)|tough time
trace|/treɪs/|v./n.|追踪；痕迹|traced,tracing,traces|They traced the call to this area.|他们追踪到电话来自这个区域。|traced(拉)|trace back to
tradition|/trəˈdɪʃn/|n.|传统；惯例||It is a family tradition.|这是家庭传统。|tra-(越过)+dit(给)+-ion|by tradition
transfer|/trænsˈfɜːr/|v./n.|转移；调动|transferred,transferring,transfers|He transferred to another school.|他转到了另一所学校。|trans-(越过)+fer(带)|transfer to
transform|/trænsˈfɔːrm/|v.|转变；改造|transformed,transforming,transforms|The city was transformed in ten years.|这座城市十年间变了样。|trans-(越过)+form(形式)|transform into
translate|/trænsˈleɪt/|v.|翻译；转化|translated,translating,translates|Can you translate this sentence?|你能翻译这个句子吗？|trans-(越过)+lat(带)|translate into
transport|/ˈtrænspɔːrt/|n./v.|运输；交通||Public transport is convenient here.|这里公共交通很方便。|trans-(越过)+port(运)|public transport
treat|/triːt/|v./n.|对待；治疗；款待|treated,treating,treats|She treats everyone equally.|她平等对待每个人。|treat(处理)|treat as
tremendous|/trəˈmendəs/|adj.|巨大的；极好的||She made tremendous progress.|她取得了巨大进步。|trem(颤抖)+-endous|tremendous effort
trend|/trend/|n.|趋势；潮流||The trend is clear.|趋势很明显。|trend(转向)|current trend
typical|/ˈtɪpɪkl/|adj.|典型的；有代表性的||This is a typical example.|这是一个典型的例子。|typ(类型)+-ical|typical of
ultimate|/ˈʌltɪmət/|adj.|最终的；根本的||Our ultimate goal is peace.|我们的最终目标是和平。|ultim(最后)+-ate|ultimate goal
unique|/juˈniːk/|adj.|独特的；唯一的||Every person is unique.|每个人都是独特的。|uni(一)+-que|unique feature
urban|/ˈɜːrbən/|adj.|城市的；都市的||Urban life is busy.|城市生活很忙碌。|urb(城市)+-an|urban area
urge|/ɜːrdʒ/|v./n.|催促；冲动|urged,urging,urges|They urged him to stay.|他们劝他留下。|urg(推)|urge sb to do
usual|/ˈjuːʒuəl/|adj.|通常的；平常的||He arrived later than usual.|他比平时来得晚。|us(用)+-ual|as usual
vague|/veɪɡ/|adj.|模糊的；含糊的||He gave a vague answer.|他给了个含糊的回答。|vag(漫游)|vague idea
valid|/ˈvælɪd/|adj.|有效的；正当的||The ticket is valid for one month.|这张票一个月内有效。|val(强壮)+-id|valid reason
value|/ˈvæljuː/|n./v.|价值；重视||The value of the house rose.|房子的价值上涨了。|val(价值)|of great value
vanish|/ˈvænɪʃ/|v.|消失；不见|vanished,vanishing,vanishes|The fog vanished at noon.|中午雾散了。|van(空)+-ish|vanish into
variety|/vəˈraɪəti/|n.|多样性；种类|varieties|The shop offers a variety of goods.|这家店提供多种商品。|vari(变化)+-ety|a variety of
various|/ˈveriəs/|adj.|各种各样的||We discussed various topics.|我们讨论了各种话题。|vari(变化)+-ous|various reasons
vary|/ˈveri/|v.|变化；不同|varied,varying,varies|Prices vary from shop to shop.|各家店价格不同。|vari(变化)|vary from
vast|/væst/|adj.|巨大的；广阔的||The desert is vast.|沙漠非常广阔。|vast(空阔)|vast majority
vehicle|/ˈviːəkl/|n.|车辆；工具||The vehicle broke down.|车抛锚了。|veh(运送)+-icle|motor vehicle
venture|/ˈventʃər/|n./v.|冒险；风险企业||It was a risky venture.|这是一次冒险。|vent(来)+-ure|joint venture
victim|/ˈvɪktɪm/|n.|受害者；牺牲品||The victims received help.|受害者得到了帮助。|vict(征服)+-im|victim of
violate|/ˈvaɪəleɪt/|v.|违反；侵犯|violated,violating,violates|He violated the traffic rules.|他违反了交通规则。|viol(暴力)+-ate|violate the law
virtue|/ˈvɜːrtʃuː/|n.|美德；优点||Patience is a virtue.|耐心是一种美德。|virt(男子气概)+-ue|by virtue of
visible|/ˈvɪzəbl/|adj.|可见的；明显的||The mountain is visible from here.|从这里能看见那座山。|vis(看)+-ible|visible change
vital|/ˈvaɪtl/|adj.|至关重要的；生命的||Water is vital to life.|水对生命至关重要。|vit(生命)+-al|vital role
volume|/ˈvɑːljuːm/|n.|体积；音量；卷||Please turn up the volume.|请把音量调大。|volv(滚)+-ume|sales volume
voluntary|/ˈvɑːlənteri/|adj.|自愿的；志愿的||He does voluntary work.|他做志愿工作。|volunt(意愿)+-ary|voluntary work
wander|/ˈwɑːndər/|v.|漫游；走神|wandered,wandering,wanders|We wandered through the streets.|我们在街上闲逛。|wand(漫游)|wander around
warn|/wɔːrn/|v.|警告；提醒|warned,warning,warns|They warned us about the storm.|他们警告我们有暴风雨。|warn(警告)|warn sb of
waste|/weɪst/|v./n./adj.|浪费；废物|wasted,wasting,wastes|Don't waste your time.|别浪费时间。|wast(空)|waste of time
weaken|/ˈwiːkən/|v.|削弱；变弱|weakened,weakening,weakens|The illness weakened him.|疾病使他虚弱。|weak(弱)+-en|weaken the effect
wealth|/welθ/|n.|财富；丰富||He gained great wealth.|他获得了巨大的财富。|weal(幸福)+-th|a wealth of
welfare|/ˈwelfer/|n.|福利；幸福||The welfare system needs reform.|福利制度需要改革。|well(好)+fare(走)|social welfare
whereas|/ˌwerˈæz/|conj.|然而；鉴于||He likes coffee, whereas she prefers tea.|他喜欢咖啡，而她更喜欢茶。|where(哪里)+as(如同)|whereas
willing|/ˈwɪlɪŋ/|adj.|愿意的；乐意的||She is willing to help.|她愿意帮忙。|will(意愿)+-ing|be willing to do
witness|/ˈwɪtnəs/|n./v.|目击者；见证||He was the only witness.|他是唯一的目击者。|wit(知道)+-ness|witness to
`

/** 内置词书定义 */
export const CET4_BOOK: Book = {
  id: 'cet4',
  name: 'CET4 四级核心',
  description: '大学英语四级高频核心词汇，覆盖听力、阅读、写作中最常出现的词。',
  wordCount: 0,
  custom: false,
  builtin: true,
  createdAt: 0,
  color: 'indigo',
}

/**
 * 解析 DSL 行 → Word 对象。
 * 字段：0 word / 1 phonetic / 2 pos / 3 translation / 4 forms / 5 exEn / 6 exZh / 7 roots / 8 collocations
 */
function parseLine(line: string, index: number): Word | null {
  const f = line.split('|').map((s) => s.trim())
  const word = f[0]
  if (!word) return null

  /**
   * 词形变化字段顺序（按词库实际书写习惯）：过去式, 现在分词, 第三人称单数
   * 例：abandoned,abandoning,abandons
   *     arose,arisen,arises  ← 这种不规则动词前三段是「过去式,过去分词,三单」，
   *     因此当第 2 段不以 -ing 结尾时，把它识别为过去分词。
   */
  const formsRaw = f[4] ?? ''
  const formsList = formsRaw ? formsRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
  const forms: Word['forms'] = {}
  if (formsList[0]) forms.past = formsList[0]
  if (formsList[1]) {
    if (formsList[1].endsWith('ing')) forms.ing = formsList[1]
    else forms.pastParticiple = formsList[1]
  }
  if (formsList[2]) forms.third = formsList[2]
  if (formsList[3]) forms.ing = formsList[3]

  const examples =
    f[5] && f[5].length > 0
      ? [{ en: f[5], zh: f[6] && f[6].length > 0 ? f[6] : undefined }]
      : undefined

  const rootsRaw = f[7] ?? ''
  const etymology: Word['etymology'] = rootsRaw
    ? {
        roots: rootsRaw.split('+').map((s) => s.trim()),
        // 无独立字段时，把括号里的含义作为词根说明展示
        rootNote: rootsRaw.includes('(') ? rootsRaw : undefined,
      }
    : undefined

  const collocations = f[8] ? f[8].split(';').map((s) => s.trim()).filter(Boolean) : undefined

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
    collocations,
    tags: ['cet4'],
    rank: index + 1,
  }
}

/** 解析后的完整词表（模块加载时执行一次） */
export const CET4_WORDS: Word[] = RAW.trim()
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith('#'))
  .map((l, i) => parseLine(l, i))
  .filter((w): w is Word => w !== null)

export const CET4_BOOK_WITH_COUNT: Book = {
  ...CET4_BOOK,
  group: '考试',
  tagline: '四级核心词汇',
  wordCount: CET4_WORDS.length,
}
