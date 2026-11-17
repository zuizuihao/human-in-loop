// ===========================================================================
// Template 2 · 二手车买卖合同 GF-2015-0120（国家工商总局 2015）
// 使用说明四：空格处应以文字形式填写完整；如果没有内容，请填写“无”。
// ===========================================================================
defineTpl({
  id: 'car', name: '二手车买卖合同', short: '二手车买卖', year: '2015', na: '无', addendum: '第九条 其他约定', upperStrip: true,
  url: 'https://htsfwb.samr.gov.cn/View?id=f6868a15-9a55-47c4-a221-29cc6e49fca7',
  cover: { code: 'GF-2015-0120', title: '二手车买卖合同' },
  sign: '<p>甲方：<br>（签章）</p><p>乙方：<br>（签章）</p>',
  attNote: '附件一《二手车技术状况表》由鉴定评估师检测后出具，附件二为车辆相关凭证清单，均不由 Agent 生成。',
  defs: `contractNo|合同编号|text||opt
    a_name|甲方（出卖人）
    a_addr|甲方住所
    a_rep|甲方法定代表人|text||opt
    a_id|甲方身份证号码|id||opt
    a_uscc|甲方统一社会信用代码|uscc||opt
    a_phone|甲方电话
    b_name|乙方（买受人）
    b_addr|乙方住所
    b_rep|乙方法定代表人|text||opt
    b_uscc|乙方统一社会信用代码|uscc||opt
    b_id|乙方身份证号码|id||opt
    b_phone|乙方电话
    owner|车主名称或姓名
    model|厂牌型号
    vin|车架号/VIN码|vin
    repaired|是否因质量问题更换、退货或维修|choice|是,否
    repairWhy|更换或维修原因
    price|车辆价款（元）|money
    priceUp|车辆价款大写|upper|price
    fee|过户手续费（元）|money
    feeUp|过户手续费大写|upper|fee
    payMode|支付方式|choice|合同签订之日，一次性付清车款,合同签订之日，交付订金，余款按期付清,其它支付方式，如使用汽车消费贷款等支付方式以补充合同形式另行约定
    dep|订金（元）|money
    depUp|订金大写|upper|dep
    balDays|余款付清期限（工作日）|int
    bal|余款（元）|money
    balUp|余款大写|upper|bal
    feeBy|过户手续费承担|choice|过户手续费由乙方承担,过户手续费由甲方承担,过户手续费按比例分担
    pctB|乙方承担比例（%）|num
    feeB|乙方承担金额|calc
    feeBUp|乙方承担金额大写|upper|feeB
    pctA|甲方承担比例（%）|num
    feeA|甲方承担金额|calc
    feeAUp|甲方承担金额大写|upper|feeA
    transferDays|过户办理期限（工作日）|int
    deliverDays|交车期限（工作日）|int
    deliverPlace|交车地点
    warrantyMonths|质保月数|int
    warrantyScope|质保范围
    lateDeliverDays|甲方逾期交车可解约天数|int
    lateDeliverRate|甲方逾期每日违约金（‰）|num
    lateDeliverCap|甲方违约金上限（%）|num
    latePayDays|乙方逾期付款可解约天数|int
    latePayRate|乙方逾期每日违约金（‰）|num
    latePayCap|乙方违约金上限（%）|num
    otherBreach|其他违约责任|text||opt
    dispute|争议解决方式（1 仲裁 / 2 诉讼）|int
    arb|仲裁委员会
    court|管辖法院
    copies|合同份数|int
    other|其他约定|text||opt
    a_bank|甲方开户银行|text||opt
    a_acc|甲方帐号|text||opt
    a_accName|甲方户名|text||opt
    signPlace|签订地点`,
  WHEN: {
    repairWhy: [() => g('repaired') === '是', '车辆未因质量问题更换或维修'],
    dep: [() => g('payMode').includes('交付订金'), '未选择“交付订金”'], balDays: [() => g('payMode').includes('交付订金'), '未选择“交付订金”'],
    bal: [() => g('payMode').includes('交付订金'), '未选择“交付订金”'],
    pctA: [() => g('feeBy').includes('按比例'), '未选择按比例分担'], pctB: [() => g('feeBy').includes('按比例'), '未选择按比例分担'],
    feeA: [() => g('feeBy').includes('按比例'), '未选择按比例分担'], feeB: [() => g('feeBy').includes('按比例'), '未选择按比例分担'],
    arb: [() => g('dispute') === '1', '未选择仲裁'], court: [() => g('dispute') === '2', '未选择诉讼'],
  },
  CALC: {
    feeA: () => (g('fee') !== '' && g('pctA') !== '' ? String(round2(g('fee') * g('pctA') / 100)) : ''),
    feeB: () => (g('fee') !== '' && g('pctB') !== '' ? String(round2(g('fee') * g('pctB') / 100)) : ''),
  },
  checks(add) {
    [['a', '甲方'], ['b', '乙方']].forEach(([p, n]) => {
      if (!g(`${p}_id`) && !g(`${p}_uscc`)) add('err', `${n}身份`, '身份证号码与统一社会信用代码至少填一项', `${p}_id`);
    });
    if (g('payMode').includes('交付订金') && g('dep') && g('bal') && g('price')) {
      const sum = +g('dep') + +g('bal'), ok = sum === +g('price');
      add(ok ? 'ok' : 'err', '价款拆分', ok ? '订金 + 余款 = 车辆价款' : `订金 ${g('dep')} + 余款 ${g('bal')} = ${sum}，与价款 ${g('price')} 不符`, 'bal');
    }
    if (g('feeBy').includes('按比例') && g('pctA') && g('pctB')) {
      const ok = +g('pctA') + +g('pctB') === 100;
      add(ok ? 'ok' : 'err', '过户费分担', ok ? '甲乙比例合计 100%，金额由代码按比例算出' : `甲乙比例合计 ${+g('pctA') + +g('pctB')}%，应为 100%`, 'pctA');
    }
    [['lateDeliverCap', '甲方'], ['latePayCap', '乙方']].forEach(([k, n]) => {
      if (g(k) && +g(k) > 30) add('warn', `${n}违约金上限`, `上限 ${g(k)}%，过分高于损失的，对方可请求法院适当减少`, k);
    });
    if (g('dispute') && !['1', '2'].includes(String(g('dispute')))) add('err', '争议解决', '只能填 1（仲裁）或 2（诉讼）', 'dispute');
  },
  tips: [
    { arts: ['第一条'], t: '使用说明 · 车况披露', d: '甲方应向乙方提供车辆的使用、修理、事故、检验以及是否办理抵押登记、缴纳税费、报废期等真实情况和信息；乙方应了解、查验车辆的状况。' },
    { arts: ['第二条'], t: '价格包括哪些费用', d: '合同约定的价格包括哪些价格和费用，最好以专门条款明确，例如过户手续费、税费由谁承担。' },
    { arts: ['第六条'], t: '违约救济措施', d: '针对主要违约情形，首先考虑违约金或约定损失赔偿的计算标准：逾期付款为逾期付款违约金，逾期交付为逾期履行违约金。' },
    { arts: ['首部', '当事人'], t: '注意《民法典》更新', d: '本文本发布于 2015 年，“根据《中华人民共和国合同法》”等表述需适当修订为“根据《中华人民共和国民法典》”，不影响权利义务。' },
  ],
  DOC: [
    { no: '当事人', party: ['合同编号：{contractNo}', '甲方（出卖人）：{a_name}', '住所：{a_addr}', '法定代表人：{a_rep}', '身份证号码：{a_id}', '社会信用统一代码或工商登记注册号：{a_uscc}', '电话号码：{a_phone}'] },
    { no: '当事人', party: ['乙方（买受人）：{b_name}', '住所：{b_addr}', '法定代表人：{b_rep}', '社会信用统一代码或工商登记注册号：{b_uscc}', '身份证号码：{b_id}', '电话号码：{b_phone}'] },
    { no: '', p: ['根据《中华人民共和国合同法》、《二手车流通管理办法》等有关法律、法规、规章的规定，就二手车的买卖事宜，买卖双方在平等、自愿、协商一致的基础上签订本合同。'] },
    { no: '第一条', t: '车辆基本情况', p: [
      '1.车主名称或姓名：{owner}；厂牌型号：{model}；车架号/VIN码：{vin}。',
      '2.车辆[repaired]（是或否）因为质量问题而进行过更换、退货或主要零部件的维修、更换，原因是{repairWhy}。',
      '3.二手车技术状况表见附件一。', '4.车辆相关凭证见附件二。'] },
    { no: '第二条', t: '车辆价款、过户手续费及支付时间、方式', p: [
      '1.车辆价款及过户手续费', '本车价款（不含税费或其它费用）为人民币：{price}元（大写：{priceUp}元）。', '过户手续费为人民币：{fee}元（大写：{feeUp}元）。',
      '2.支付时间、方式', '[payMode]',
      '交付订金的：合同签订之日，交付订金{dep}元（大写：{depUp}元），{balDays}个工作日内付清余款{bal}元（大写：{balUp}元）；',
      '[feeBy]',
      '按比例分担的：过户手续费由乙方承担{pctB}%，即{feeB}元（大写：{feeBUp}元）；甲方承担{pctA}%，即{feeA}元（大写：{feeAUp}元）。',
      '车辆过户时将过户手续费支付给双方约定的过户手续办理方。'] },
    { no: '第三条', t: '车辆的过户、交付及风险承担', p: [
      '过户手续办理方应于本合同签订之日起{transferDays}个工作日内，办理完成过户、转籍手续。',
      '甲方应于本车过户、转籍手续办理完成后{deliverDays}个工作日内在{deliverPlace}（地点）向乙方交付车辆及相关凭证（见附件二）。',
      '在车辆交付乙方之前所发生的所有风险由甲方承担；在车辆交付乙方之后所发生的所有风险由乙方承担。'] },
    { no: '第四条', t: '双方的权利和义务', p: [
      '1.甲方应按照合同约定的时间、地点向乙方交付车辆及相关凭证。', '2.甲方应保证合法享有车辆的所有权或处置权。', '3.甲方保证所出示及提供的与车辆有关的一切证件、证明及信息合法、真实、有效。',
      '4.乙方应按照合同约定支付价款。', '5.对转出属地的车辆，乙方确认已经了解注册地对于迁入机动车限制性规定，确认该车辆符合当地注册登记标准。如果因非甲方原因导致乙方无法在当地注册登记的，乙方自行承担责任。'] },
    { no: '第五条', t: '车辆质量与质量保证', p: [
      '1.甲方为法人的或通过法人机构委托销售、拍卖的，应按照附件一提供二手车技术状况表，作为合同的一部分。',
      '2.车辆完成交易后，甲方向乙方提供{warrantyMonths}个月的质保，质保范围为{warrantyScope}。'] },
    { no: '第六条', t: '违约责任', p: [
      '1.甲方向乙方提供的有关车辆信息不真实或甲方故意隐瞒相关车辆信息，包括三包记录、维修记录、改装记录等，乙方有权解除合同，并要求甲方赔偿因此造成的损失。',
      '2.甲方未按合同的约定期限将本车及其相关凭证交付乙方超过{lateDeliverDays}日的，乙方有权解除本合同，并由甲方逾期每日按本车价款总额的{lateDeliverRate}‰（最高不超过合同总价款的{lateDeliverCap}%）向乙方支付违约金。',
      '3.乙方未按照合同约定期限支付本车价款的超过{latePayDays}日的，甲方有权解除本合同，乙方逾期每日按本车价款总额{latePayRate}‰（最高不超过合同总价款的{latePayCap}%）向甲方支付违约金。',
      '4.因甲方原因致使车辆不能办理过户、转籍手续的，乙方有权解除本合同，要求甲方返还车辆价款并承担相应损失；因乙方原因致使车辆不能办理过户、转籍手续的，甲方有权解除本合同，并要求乙方返还车辆并承担相应损失。',
      '5.其他违约责任：{otherBreach}。'] },
    { no: '第七条', t: '合同争议的解决方式', p: [
      '因本合同发生的争议，由当事人协商或委托第三方调解解决；协商或调解不成的，按下列第{dispute}种方式解决：',
      '1.提交{arb}仲裁委员会仲裁。', '2.依法向{court}人民法院起诉。'] },
    { no: '第八条', t: '合同的生效', p: ['本合同一式{copies}份，经双方当事人签字或盖章之日起生效。'] },
    { no: '第九条', t: '其他约定', p: ['{other}。', '附件一：二手车技术状况表', '附件二：车辆相关凭证'] },
    { no: '签署', t: '签署信息', p: ['甲方开户银行：{a_bank}；帐号：{a_acc}；户名：{a_accName}', '签订地点：{signPlace}'] },
  ],
  // --- Extraction (mock of the LLM step) -----------------------------------
  roles: {
    a: { w: '卖家|卖方|出卖人|甲方', name: 'a_name', id: 'a_id', uscc: 'a_uscc', phone: 'a_phone', addr: 'a_addr', rep: 'a_rep' },
    b: { w: '买家|买方|买受人|乙方', name: 'b_name', id: 'b_id', uscc: 'b_uscc', phone: 'b_phone', addr: 'b_addr', rep: 'b_rep' },
  },
  rules: [
    [R(String.raw`车主(?:是|为|：|:)?\s*([一-龥]{2,4}?)(?=[，,。；;\s]|$)`), (m) => ({ owner: m[1] })],
    [R(String.raw`(?:车型|厂牌型号|品牌型号)(?:是|为|：|:)?\s*([^，,。；;]+)`), (m) => ({ model: m[1] })],
    [/(?<![A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?![A-Z0-9])/g, (m) => /[A-Z]/.test(m[1]) && { vin: m[1] }],
    [R(String.raw`(?:没有|没|未)(?:因为?)?(?:质量问题)?(?:修过|维修|更换)`), () => ({ repaired: '否' })],
    [R(String.raw`(?:质量问题|保修|故障|异响)[^，,。；;]*?(?:换过|修过|更换|维修)`), (m, c) => ({ repaired: '是', repairWhy: c.seg })],
    [R(String.raw`(?:成交价|车价|车款|价款|价格)(?:改成|改为|是|为|：|:)?\s*{M}`), (m) => +toMoney(m[1]) >= 1000 && { price: toMoney(m[1]) }],
    [R(String.raw`订金\s*{M}`), (m) => ({ dep: toMoney(m[1]), payMode: '合同签订之日，交付订金，余款按期付清' })],
    [R(String.raw`余款\s*{M}`), (m) => +toMoney(m[1]) >= 100 && { bal: toMoney(m[1]) }],
    [R(String.raw`{N}\s*个?工作日内付(?:清)?余款`), (m) => ({ balDays: cn(m[1]) })],
    [R('一次性付清'), () => ({ payMode: '合同签订之日，一次性付清车款' })],
    [R(String.raw`过户(?:手续)?费\s*{M}`), (m) => ({ fee: toMoney(m[1]) })],
    [R(String.raw`过户(?:手续)?费[^，,。；;]*?(一人一半|各一半|平摊|平分|各付一半)`), () => ({ feeBy: '过户手续费按比例分担', pctA: '50', pctB: '50' })],
    [R(String.raw`过户(?:手续)?费[^，,。；;]*?(买家|买方|乙方|卖家|卖方|甲方)(?:出|承担|付)`), (m) => ({ feeBy: /买|乙/.test(m[1]) ? '过户手续费由乙方承担' : '过户手续费由甲方承担' })],
    [R(String.raw`{N}\s*个?工作日内[^，,。；;]*?过户`), (m) => ({ transferDays: cn(m[1]) })],
    [R(String.raw`(?:办完|过户后)\s*{N}\s*个?工作日内[^，,。；;]*?交车`), (m) => ({ deliverDays: cn(m[1]) })],
    [R(String.raw`在([^，,。；;\s]{2,12}?)交车`), (m) => ({ deliverPlace: m[1] })],
    [R(String.raw`([一-龥、和]{2,12}?)(?:我给你)?保(?:修)?\s*{N}\s*个?月`), (m) => ({ warrantyMonths: cn(m[2]), warrantyScope: m[1].replace(/和/g, '、') })],
    [R(String.raw`逾期(交车或付款|付款或交车|交车|付款)[^，,。；;]*?(?:超过)?{N}\s*[天日]`), (m) => {
      const d = cn(m[2]); return /或/.test(m[1]) ? { lateDeliverDays: d, latePayDays: d } : { [m[1] === '交车' ? 'lateDeliverDays' : 'latePayDays']: d };
    }],
    [R(String.raw`千分之{N}|(\d+(?:\.\d+)?)\s*‰`), (m, c) => {
      const v = cn(m[1] || m[2]), both = /交车/.test(c.seg) && /付款/.test(c.seg);
      return both ? { lateDeliverRate: v, latePayRate: v } : { [/交车/.test(c.seg) ? 'lateDeliverRate' : 'latePayRate']: v };
    }],
    [R(String.raw`(?:最高|最多)(?:不超过)?\s*(\d+(?:\.\d+)?)\s*%`), (m, c) => {
      const both = /交车/.test(c.seg) && /付款/.test(c.seg);
      return both ? { lateDeliverCap: m[1], latePayCap: m[1] } : { [/交车/.test(c.seg) ? 'lateDeliverCap' : 'latePayCap']: m[1] };
    }],
    [R(String.raw`(?:找|向|去|到|由|在)([一-龥]{2,8}?[区县市])(?:人民)?法院`), (m) => ({ dispute: '2', court: m[1] })],
    [R('法院'), () => ({ dispute: '2' })],
    [R(String.raw`(?:提交|向|由|到|去)([一-龥]{2,8}?)仲裁委员会`), (m) => ({ dispute: '1', arb: m[1] })],
    [R('仲裁'), () => ({ dispute: '1' })],
    [R(String.raw`一式\s*{N}\s*份`), (m) => ({ copies: cn(m[1]) })],
    [R(BANK_RE), (m) => ({ a_bank: BANK[m[1]] || m[1], _accSelf: 1 })],
    [R(String.raw`(?:卡号|账号|帐号)(?:是|：|:)?\s*(\d[\d ]{10,24}\d)`), (m) => ({ a_acc: m[1].replace(/\s/g, '') })],
    [R(String.raw`在([一-龥]{2,10}?)签(?:约|合同|订)`), (m) => ({ signPlace: m[1] })],
  ],
  post(out, get, put) {
    if (out._accSelf && get('a_name')) put('a_accName', get('a_name'), out._accSelf.q);
  },
  files: [
    { id: 'lic', name: 'IMG_5520.jpg', label: '机动车行驶证', kind: 'license',
      data: { title: '中华人民共和国机动车行驶证', rows: [['号牌号码', '沪A·7K3E2'], ['车辆类型', '小型轿车'], ['所有人', '赵磊'], ['品牌型号', '大众牌FV7151FADBG'], ['车辆识别代号', 'LFV2A21K3K3051827'], ['注册日期', '2019-06-18']] },
      text: '车主赵磊，车型大众牌FV7151FADBG，车架号LFV2A21K3K3051827' },
    { id: 'idA', name: 'IMG_5521.jpg', label: '卖家身份证', kind: 'id',
      data: { name: '赵磊', sex: '男', birth: '1988年4月14日', addr: '上海市浦东新区锦绣路1000弄12号', no: '310115198804143015' },
      text: '卖家赵磊，身份证310115198804143015，住上海市浦东新区锦绣路1000弄12号' },
    { id: 'idB', name: 'IMG_5522.jpg', label: '买家身份证', kind: 'id',
      data: { name: '孙悦', sex: '男', birth: '1990年8月23日', addr: '江苏省苏州市姑苏区人民路88号', no: '320503199008231519' },
      text: '买家孙悦，身份证320503199008231519，住江苏省苏州市姑苏区人民路88号' },
    { id: 'chat', name: 'Screenshot_1110.png', label: '微信聊天截图', kind: 'chat',
      data: { title: '孙悦', msgs: [['孙悦', '车昨天试过了，86000能成交吗？', 'l'], ['我', '行，86000。你先付订金5000，过户后3个工作日内付余款80000', 'r'], ['孙悦', '好。过户费800一人一半吧', 'l'],
        ['我', '可以。签完合同5个工作日内去办过户，办完2个工作日内在浦东车管所交车', 'r'], ['孙悦', '车有没有因为质量问题修过？', 'l'], ['我', '2023年变速箱异响，4S店保修换过阀体，别的没有', 'r']] },
      text: '成交价8.6万，签合同当天付订金5000，过户后3个工作日内付余款80000。过户费800一人一半。签合同后5个工作日内办过户，办完2个工作日内在浦东车管所交车。2023年变速箱异响，4S店保修换过阀体。' },
  ],
  script: [
    { text: '我要把车卖给孙悦，帮我出一份二手车买卖合同。行驶证和我们俩的身份证都在这。卖家（我）电话13601735582，买家电话13771826540。', files: ['lic', 'idA', 'idB'] },
    { text: '价格和付款就按截图里谈的。发动机和变速箱保3个月，有纠纷去浦东新区人民法院。', files: ['chat'] },
  ],
  replies: [
    { label: '违约与收款', text: '逾期交车或付款超过7天可解约，每天按车价千分之一，最高不超过10%。一式两份。余款打卖家招行卡，卡号6214 8301 2345 6789。在上海浦东签约。' },
    { label: '改口', text: '价款改成85000。' },
  ],
});

