(() => {
  const KEY = 'wuhanCoachV7';
  const LEGACY_KEYS = ['wuhanRpgV4','wuhanFriendlyV5','wuhanFriendlyV6'];
  const today = new Date().toISOString().slice(0,10);
  const dayNames = ['周日','周一','周二','周三','周四','周五','周六'];
  const planByDow = {1:'力量A',2:'有氧',3:'力量B',4:'恢复',5:'力量C',6:'兴趣运动',0:'休息'};
  const workouts = {
    '力量A':['高脚杯深蹲或腿举','哑铃卧推或器械推胸','坐姿划船','罗马尼亚硬拉','平板支撑'],
    '力量B':['分腿蹲','高位下拉','肩推','臀推','Dead bug'],
    '力量C':['腿举','上斜哑铃卧推','单臂划船','腿弯举','侧平举'],
    '保底力量':['高脚杯深蹲或腿举','哑铃卧推或器械推胸','坐姿划船'],
    '上肢友好':['高位下拉','肩推','坐姿划船','平板支撑'],
    '下肢友好':['哑铃卧推或器械推胸','坐姿划船','高位下拉','Dead bug']
  };
  const targetMap = {
    '平板支撑':{sets:2,reps:'30秒'},'Dead bug':{sets:2,reps:'8/侧'},
    '罗马尼亚硬拉':{sets:2,reps:'8–10'},'肩推':{sets:2,reps:'8–12'},
    '腿弯举':{sets:2,reps:'10–15'},'侧平举':{sets:2,reps:'12–15'}
  };
  const defaultTarget = {sets:3,reps:'8–12'};
  const mealPools = {
    breakfast:['鸡蛋2个＋燕麦/玉米＋牛奶或无糖酸奶','小碗热干面（少酱少油）＋鸡蛋，不配面窝','小碗牛肉粉（粉减至2/3、多青菜、少喝汤）','全麦面包2片＋鸡蛋＋无糖酸奶','三鲜豆皮小份＋无糖饮品'],
    lunch:['米饭一拳＋清蒸鱼一掌＋两拳蔬菜','米饭一拳＋去皮鸡腿一掌＋两份蔬菜','食堂两素一荤＋一拳米饭','瘦牛肉一掌＋菜薹/西兰花＋米饭一拳','虾仁/豆腐＋莲藕或冬瓜＋米饭一拳'],
    dinner:['鱼虾一掌＋两拳蔬菜＋半至一拳主食','鸡胸/瘦肉一掌＋蔬菜＋半拳主食','番茄鸡蛋＋青菜＋半拳米饭','豆腐＋虾仁＋菌菇蔬菜','外卖轻食：双份蔬菜、正常蛋白、酱汁分开']
  };
  const sceneData = {
    home:['蛋白：鱼、鸡、蛋、瘦肉或豆腐任选一掌','主食：米饭、玉米、红薯任选一拳','蔬菜至少两拳，油盐正常但不过量'],
    canteen:['先看蔬菜和蛋白，再拿主食','选一荤两素，米饭约一拳','少选勾芡、油炸和浓汁菜；汤不必喝完'],
    takeout:['搜索“清蒸鱼、鸡胸饭、轻食、砂锅蔬菜、麻辣烫”','麻辣烫：多蔬菜＋豆腐/瘦肉，少丸子，主食半份','备注少油少盐、酱汁分开；含糖饮料换无糖'],
    wuhan:['热干面：小碗、少芝麻酱、加鸡蛋，不配面窝','牛肉粉：粉减到2/3，多青菜，少喝汤','豆皮：小份，配无糖饮品；当天其余餐少油'],
    social:['聚餐前正常吃，不空腹等待','优先鱼虾、瘦肉、豆腐和蔬菜，酒和甜饮尽量少','七八分饱即可；第二天恢复正常，不惩罚性节食']
  };

  let S = loadState();
  let checkin = {time:50,energy:'normal',soreness:'none'};
  let currentPlan = null;
  let workoutState = null;
  let restInterval = null;
  let foodSwapKey = null;

  function loadState(){
    let s;
    try{s=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){s=null}
    if(!s){
      s={xp:0,coins:0,days:{},logs:[],sessions:[],backupAt:null,startDate:today};
      for(const key of LEGACY_KEYS){
        try{const old=JSON.parse(localStorage.getItem(key)||'null');if(old){s.xp=old.xp||s.xp;s.coins=old.coins||s.coins;s.logs=old.logs||s.logs;break}}catch(e){}
      }
    }
    s.days ||= {}; s.logs ||= []; s.sessions ||= []; s.xp ||= 0; s.coins ||= 0; s.startDate ||= today;
    return s;
  }
  const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
  const $=id=>document.getElementById(id);
  const day=()=>S.days[today]||(S.days[today]={meals:{},skin:{},body:false,loot:false});
  const toast=msg=>{const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)};
  const fmtDate=d=>`${d.getMonth()+1}月${d.getDate()}日 ${dayNames[d.getDay()]}`;
  const daysBetween=(a,b)=>Math.floor((new Date(b)-new Date(a))/86400000);
  const weekNo=()=>Math.max(1,Math.min(16,Math.floor(daysBetween(S.startDate,today)/7)+1));
  const phase=()=>weekNo()<=4?'重启期':weekNo()<=8?'减脂增肌基础':weekNo()<=12?'体能提高':'长期巩固';
  const targetFor=n=>targetMap[n]||defaultTarget;

  function init(){
    bindNavigation(); bindChoices(); bindActions();
    renderHeader(); renderToday(); renderWeek(); renderLibrary(); renderScene(); renderProgress(); renderSkinCalendar();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=7').catch(()=>{});
  }
  function bindNavigation(){
    document.querySelectorAll('.bottom-nav button').forEach(btn=>btn.addEventListener('click',()=>switchPanel(btn.dataset.panel)));
  }
  function switchPanel(id){
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
    document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.panel===id));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function bindChoices(){
    document.querySelectorAll('.segmented').forEach(group=>group.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b)return;
      group.querySelectorAll('button').forEach(x=>x.classList.remove('selected')); b.classList.add('selected');
      checkin[group.dataset.choice]=group.dataset.choice==='time'?Number(b.dataset.value):b.dataset.value;
    }));
  }
  function bindActions(){
    $('generatePlan').addEventListener('click',generatePlan);
    $('redoCheckin').addEventListener('click',()=>{currentPlan=null;$('checkinCard').classList.remove('hidden');$('todayHero').classList.add('hidden');$('missionArea').classList.add('hidden')});
    ['startToday','resumeWorkout','planStart'].forEach(id=>$(id).addEventListener('click',startWorkout));
    $('markBodyDone').addEventListener('click',()=>completeBody('manual'));
    $('amSkin').addEventListener('click',()=>toggleSkin('am')); $('pmSkin').addEventListener('click',()=>toggleSkin('pm'));
    $('openLoot').addEventListener('click',openLoot);
    $('foodScene').addEventListener('change',renderScene);
    $('saveDailyLog').addEventListener('click',saveLog);
    $('closeWorkout').addEventListener('click',closeWorkout); $('previousExercise').addEventListener('click',()=>moveExercise(-1)); $('nextExercise').addEventListener('click',()=>moveExercise(1));
    $('skipRest').addEventListener('click',stopRest);
    document.querySelector('.pain-row').addEventListener('click',handlePain);
    $('closeFood').addEventListener('click',closeFoodModal);
    $('exportData').addEventListener('click',exportData); $('importData').addEventListener('change',importData);
  }
  function renderHeader(){
    const h=new Date().getHours(); $('greeting').textContent=`${h<11?'早上':h<14?'中午':h<18?'下午':'晚上'}好，Charlie`;
    $('dateLine').textContent=`${fmtDate(new Date())} · 第${weekNo()}周`;
    $('level').textContent=`Lv.${Math.floor(S.xp/250)+1}`; $('coins').textContent=`${S.coins} ◈`;
  }
  function renderToday(){
    const d=day();
    if(d.checkin && d.plan){checkin=d.checkin;currentPlan=d.plan;showGenerated();}
    else{$('checkinCard').classList.remove('hidden');$('todayHero').classList.add('hidden');$('missionArea').classList.add('hidden')}
    renderMissions();
  }
  function findCarryover(){
    const strength=['力量A','力量B','力量C'];
    for(let i=1;i<=6;i++){
      const dt=new Date();dt.setDate(dt.getDate()-i);const key=dt.toISOString().slice(0,10);const planned=planByDow[dt.getDay()];
      if(strength.includes(planned)&&!(S.days[key]&&S.days[key].body))return planned;
    }
    return null;
  }
  function buildPlan(){
    const scheduled=planByDow[new Date().getDay()]; const carry=findCarryover();
    if(checkin.soreness==='pain')return {name:'恢复日',type:'recovery',duration:15,reason:'你报告了明显疼痛。今天不做负重训练，安排轻松步行和关节活动；疼痛持续或加重应评估。',exercises:[]};
    if(checkin.energy==='low')return {name:'恢复日',type:'recovery',duration:15,reason:'今天精力很差，恢复比硬练更能保证长期进步。',exercises:[]};
    let base=carry||scheduled; let carried=Boolean(carry);
    if(base==='休息'||base==='恢复')return {name:base==='休息'?'完全休息＋轻松散步':'恢复步行',type:'recovery',duration:checkin.time===15?15:25,reason:'今天按恢复日执行，让下一次力量训练质量更高。',exercises:[],carried:false};
    if(base==='有氧'||base==='兴趣运动')return {name:base==='有氧'?'中低强度有氧':'游泳 / 乒乓球 / 轻篮球',type:'cardio',duration:checkin.time===15?15:checkin.time===30?30:40,reason:carried?'原有氧让位给漏掉的力量训练。':'保持能说完整句子的强度，不需要冲刺。',exercises:[],carried:false};
    if(checkin.time===15)return {name:'15分钟保底力量',type:'strength',duration:15,reason:'今天时间有限，只做3个核心动作各2组，保护习惯链。',exercises:workouts['保底力量'],carried};
    let key=base;
    if(checkin.soreness==='upper')key='下肢友好';
    if(checkin.soreness==='lower')key='上肢友好';
    let ex=workouts[key]||workouts[base]||workouts['力量A'];
    if(checkin.time===30)ex=ex.slice(0,4);
    return {name:key,type:'strength',duration:checkin.time===30?30:50,reason:carried?`检测到此前漏掉的${carry}，已优先移到今天；原任务自动顺延或舍弃。`:'根据今天的时间、精力和酸痛生成。',exercises:ex,carried,source:base};
  }
  function generatePlan(){
    currentPlan=buildPlan(); day().checkin={...checkin}; day().plan=currentPlan; save(); showGenerated(); renderWeek();
  }
  function showGenerated(){
    $('checkinCard').classList.add('hidden');$('todayHero').classList.remove('hidden');$('missionArea').classList.remove('hidden');
    $('todayTitle').textContent=currentPlan.name;$('todayReason').textContent=currentPlan.reason;$('durationChip').textContent=`约${currentPlan.duration}分钟`;$('phaseChip').textContent=`第${weekNo()}周 · ${phase()}`;
    $('carryChip').classList.toggle('hidden',!currentPlan.carried);renderMissions();
  }
  function renderMissions(){
    const d=day();
    const bodyDone=!!d.body; const mealCount=Object.values(d.meals||{}).filter(Boolean).length; const skinCount=Object.values(d.skin||{}).filter(Boolean).length;
    const wins=[bodyDone,mealCount>=2,skinCount>=2].filter(Boolean).length;
    $('missionCount').textContent=`${wins} / 3`; $('bodyMissionStatus').textContent=bodyDone?'已完成':'未完成';$('bodyMissionStatus').classList.toggle('done',bodyDone);
    $('mealStatus').textContent=`${mealCount} / 3`;$('mealStatus').classList.toggle('done',mealCount>=2);$('skinStatus').textContent=`${skinCount} / 2`;$('skinStatus').classList.toggle('done',skinCount>=2);
    $('bodyMissionTitle').textContent=currentPlan?currentPlan.name:'身体主任务';$('bodyMissionDesc').textContent=currentPlan?currentPlan.reason:'先完成状态评估。';
    $('resumeWorkout').textContent=bodyDone?'查看 / 补充记录':'开始';
    const skin=skinInstructions();$('skinTodayText').textContent=`早：${skin.am}；晚：${skin.pm}`;
    $('amSkin').textContent=d.skin?.am?'早护肤已完成':'完成早护肤';$('pmSkin').textContent=d.skin?.pm?'晚护肤已完成':'完成晚护肤';
    renderMeals();
    $('openLoot').disabled=!bodyDone||d.loot;$('rewardTitle').textContent=d.loot?'今日宝箱已开启':bodyDone?'主任务完成，宝箱已解锁':'完成身体主任务后解锁宝箱';
  }
  function renderMeals(){
    const d=day(); const keys=['breakfast','lunch','dinner']; const labels={breakfast:'早餐',lunch:'午餐',dinner:'晚餐'};
    keys.forEach((k,i)=>{if(!d.mealChoices)d.mealChoices={};if(!d.mealChoices[k])d.mealChoices[k]=mealPools[k][(new Date().getDay()+i)%mealPools[k].length]});
    $('todayMeals').innerHTML=keys.map(k=>`<div class="meal-row"><span class="meal-label">${labels[k]}</span><div class="meal-copy">${d.mealChoices[k]}</div><div class="meal-actions"><button data-swap="${k}" type="button">换一个</button><button data-meal="${k}" class="${d.meals?.[k]?'done':''}" type="button">${d.meals?.[k]?'已完成':'完成'}</button></div></div>`).join('');
    $('todayMeals').querySelectorAll('[data-meal]').forEach(b=>b.addEventListener('click',()=>{d.meals[b.dataset.meal]=!d.meals[b.dataset.meal];if(d.meals[b.dataset.meal]){S.xp+=5;S.coins+=1}save();renderHeader();renderMissions();renderProgress()}));
    $('todayMeals').querySelectorAll('[data-swap]').forEach(b=>b.addEventListener('click',()=>openFoodModal(b.dataset.swap)));
  }
  function toggleSkin(part){const d=day();d.skin[part]=!d.skin[part];if(d.skin[part]){S.xp+=5;S.coins+=1}save();renderHeader();renderMissions();renderProgress()}
  function skinInstructions(){
    const w=weekNo();const dow=new Date().getDay();
    const bp=w<=2?[1,3,5].includes(dow):[1,3,5,0].includes(dow); const ada=w<=2?[2,5].includes(dow):w<=4?[1,3,5].includes(dow):dow!==0;
    return {am:`温和清洁＋${bp?'过氧化苯甲酰2.5%薄涂＋':''}保湿＋SPF50+`,pm:`温和洁面＋${ada?'阿达帕林0.1%豌豆大小＋':''}保湿`};
  }
  function startWorkout(){
    if(!currentPlan){switchPanel('today');toast('先完成状态评估');return}
    if(currentPlan.type==='recovery'||currentPlan.type==='cardio'){
      workoutState={index:0,sets:{},pain:{}};
      openSimpleSession();return;
    }
    const existing=day().workoutDraft;workoutState=existing||{index:0,sets:{},pain:{},planName:currentPlan.name,exercises:currentPlan.exercises};
    openWorkout();
  }
  function openSimpleSession(){
    if(confirm(`${currentPlan.name}\n\n${currentPlan.reason}\n\n完成后点击“确定”记录。`))completeBody(currentPlan.type);
  }
  function openWorkout(){document.body.style.overflow='hidden';$('workoutModal').classList.add('open');$('workoutModal').setAttribute('aria-hidden','false');renderExercise()}
  function closeWorkout(){document.body.style.overflow='';$('workoutModal').classList.remove('open');$('workoutModal').setAttribute('aria-hidden','true');stopRest();day().workoutDraft=workoutState;save()}
  function renderExercise(){
    const list=workoutState.exercises; const name=list[workoutState.index]; const g=window.EXG[name]; const t=targetFor(name);
    $('exerciseName').textContent=name;$('workoutProgressText').textContent=`动作 ${workoutState.index+1} / ${list.length}`;$('workoutProgressBar').style.width=`${(workoutState.index+1)/list.length*100}%`;
    $('previousExercise').disabled=workoutState.index===0;$('nextExercise').textContent=workoutState.index===list.length-1?'完成训练':'下一个动作';
    const rec=getRecommendation(name,g,t);$('exerciseRecommendation').innerHTML=`<strong>${rec.title}</strong><br>${rec.text}`;
    $('exerciseGuide').innerHTML=guideHTML(name,g);
    const pain=workoutState.pain[name]||'ok';document.querySelectorAll('.pain-row button').forEach(b=>b.classList.toggle('selected',b.dataset.pain===pain));
    if(pain==='uncomfortable')$('exerciseRecommendation').innerHTML=`<strong>改用替代动作</strong><br>${g.alternative}。减轻重量并缩小动作幅度。`;
    if(pain==='pain')$('exerciseRecommendation').innerHTML=`<strong>今天跳过这个动作</strong><br>明显疼痛不是需要硬扛的训练刺激。若持续或加重，停止相关训练并评估。`;
    renderSetEditor(name,g,t,rec.weight,pain);
  }
  function guideHTML(name,g){return `<div class="guide-grid"><div class="guide-box"><b>起始姿势</b>${g.start}</div><div class="guide-box"><b>怎么动</b>${g.move}</div></div><ol class="guide-cues">${g.cues.map(x=>`<li>${x}</li>`).join('')}</ol><div class="guide-box"><b>呼吸</b>${g.breath}</div><div class="error-box"><b>常见错误：</b>${g.mistakes}<br><b>替代：</b>${g.alternative}</div><a class="video-link" target="_blank" rel="noopener" href="https://search.bilibili.com/all?keyword=${encodeURIComponent(g.video)}">打开B站动作视频搜索</a>`}
  function getRecommendation(name,g,t){
    const sessions=S.sessions.filter(s=>s.exercises&&s.exercises[name]).slice(-2);let weight=Number(g.startLoad)||0;
    if(!sessions.length)return {title:'第一次建议',text:`先用约 ${weight||'徒手'}${weight?' kg':''}，目标${t.sets}组×${t.reps}；最后一组仍应感觉还能做2—3次。`,weight};
    const last=sessions.at(-1).exercises[name]; weight=Number(last.sets?.[0]?.weight)||weight;
    const allHit=last.sets?.length>=t.sets&&last.sets.every(s=>(Number(s.reps)>=parseInt(t.reps)||String(t.reps).includes('秒'))&&Number(s.rir)>=2);
    const prev=sessions.length>1?sessions[0].exercises[name]:null;const prevHit=prev&&prev.sets?.length>=t.sets&&prev.sets.every(s=>(Number(s.reps)>=parseInt(t.reps)||String(t.reps).includes('秒'))&&Number(s.rir)>=2);
    if(allHit&&prevHit&&g.increment){weight=+(weight+g.increment).toFixed(1);return {title:'建议加重',text:`最近两次都达到目标且保留足够余力，本次可尝试 ${weight} kg。动作一旦变形就退回原重量。`,weight}}
    return {title:'继续小幅进步',text:`上次使用约 ${weight} kg。本次保持重量，争取总次数比上次多1—2次。`,weight};
  }
  function renderSetEditor(name,g,t,weight,pain){
    if(!workoutState.sets[name])workoutState.sets[name]=Array.from({length:t.sets},()=>({weight,reps:'',rir:3,done:false}));
    const arr=workoutState.sets[name];
    $('setEditor').innerHTML=arr.map((s,i)=>`<div class="set-row"><div class="set-head"><b>第${i+1}组</b><span>目标 ${t.reps}</span></div><div class="set-inputs"><label>重量kg<input data-field="weight" data-set="${i}" type="number" step="0.5" value="${s.weight??''}"></label><label>次数/秒<input data-field="reps" data-set="${i}" type="number" value="${s.reps??''}"></label><label>余力<select data-field="rir" data-set="${i}"><option value="4" ${s.rir==4?'selected':''}>还能4+</option><option value="3" ${s.rir==3?'selected':''}>还能3</option><option value="2" ${s.rir==2?'selected':''}>还能2</option><option value="1" ${s.rir==1?'selected':''}>还能1</option><option value="0" ${s.rir==0?'selected':''}>力竭</option></select></label><button data-setdone="${i}" class="set-done ${s.done?'done':''}" type="button" ${pain==='pain'?'disabled':''}>${s.done?'已完成':'完成本组'}</button></div></div>`).join('');
    $('setEditor').querySelectorAll('[data-field]').forEach(el=>el.addEventListener('change',()=>{const i=Number(el.dataset.set);workoutState.sets[name][i][el.dataset.field]=el.dataset.field==='rir'?Number(el.value):el.value;day().workoutDraft=workoutState;save()}));
    $('setEditor').querySelectorAll('[data-setdone]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.set);const s=workoutState.sets[name][i];s.done=!s.done;if(s.done){startRest();toast('本组完成，休息90秒')}day().workoutDraft=workoutState;save();renderSetEditor(name,g,t,weight,pain)}));
  }
  function handlePain(e){const b=e.target.closest('button');if(!b||!workoutState)return;const name=workoutState.exercises[workoutState.index];workoutState.pain[name]=b.dataset.pain;day().workoutDraft=workoutState;save();renderExercise()}
  function moveExercise(delta){
    const list=workoutState.exercises;
    if(delta>0&&workoutState.index===list.length-1){finishWorkout();return}
    workoutState.index=Math.max(0,Math.min(list.length-1,workoutState.index+delta));stopRest();day().workoutDraft=workoutState;save();renderExercise();
  }
  function startRest(){stopRest();let sec=90;$('restTimer').classList.remove('hidden');const tick=()=>{$('restText').textContent=`休息 ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;if(sec--<=0){stopRest();toast('休息结束，开始下一组')}};tick();restInterval=setInterval(tick,1000)}
  function stopRest(){if(restInterval)clearInterval(restInterval);restInterval=null;$('restTimer').classList.add('hidden')}
  function finishWorkout(){
    const completed={};workoutState.exercises.forEach(n=>{completed[n]={sets:workoutState.sets[n]||[],pain:workoutState.pain[n]||'ok'}});
    S.sessions.push({date:today,plan:currentPlan.name,exercises:completed});delete day().workoutDraft;completeBody('strength');closeWorkout();renderProgress();
  }
  function completeBody(source){const d=day();if(!d.body){d.body=true;d.bodySource=source;S.xp+=currentPlan?.type==='strength'?60:35;S.coins+=currentPlan?.type==='strength'?12:8;save();toast('身体任务完成，宝箱已解锁')}renderHeader();renderMissions();renderWeek();renderProgress()}
  function openLoot(){const d=day();if(!d.body||d.loot)return;const r=Math.random();let reward=r<.03?{name:'传说',coins:80,xp:50}:r<.15?{name:'史诗',coins:30,xp:25}:r<.4?{name:'稀有',coins:15,xp:10}:{name:'普通',coins:5,xp:5};d.loot=true;S.coins+=reward.coins;S.xp+=reward.xp;save();$('rewardText').textContent=`${reward.name}宝箱：+${reward.coins}筹码，+${reward.xp} XP`;renderHeader();renderMissions();toast(`${reward.name}宝箱！`)}
  function openFoodModal(key){foodSwapKey=key;const labels={breakfast:'早餐',lunch:'午餐',dinner:'晚餐'};$('foodModalTitle').textContent=`${labels[key]}换一个`;$('foodOptions').innerHTML=mealPools[key].map(x=>`<button type="button" class="food-option ${day().mealChoices?.[key]===x?'current':''}">${x}</button>`).join('');$('foodOptions').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{day().mealChoices[key]=b.textContent;save();closeFoodModal();renderMeals()}));$('foodModal').classList.add('open')}
  function closeFoodModal(){$('foodModal').classList.remove('open')}
  function renderWeek(){
    const now=new Date();const monday=new Date(now);monday.setDate(now.getDate()-((now.getDay()+6)%7));const rows=[];
    for(let i=0;i<7;i++){const dt=new Date(monday);dt.setDate(monday.getDate()+i);const key=dt.toISOString().slice(0,10);const p=planByDow[dt.getDay()];const rec=S.days[key];const past=dt<new Date(new Date().setHours(0,0,0,0));const missed=p.startsWith('力量')&&past&&!rec?.body;rows.push(`<div class="route-day ${key===today?'today':''} ${rec?.body?'done':''} ${missed?'missed':''}"><div class="route-date">${dayNames[dt.getDay()]}<br>${dt.getMonth()+1}/${dt.getDate()}</div><div class="route-copy"><b>${p}</b><small>${rec?.body?'已完成':missed?'未完成，将自动重排':key===today?'今天':'按计划'}</small></div><span class="route-tag ${missed?'carry':''}">${rec?.body?'完成':missed?'待补':'计划'}</span></div>`)}
    $('weekRoute').innerHTML=rows.join('');$('weekLabel').textContent=`第${weekNo()}周 · ${phase()}`;
    $('planTodayTitle').textContent=currentPlan?.name||'尚未评估';$('planTodayReason').textContent=currentPlan?.reason||'先回到首页完成30秒状态评估。';
  }
  function renderLibrary(){
    $('exerciseLibrary').innerHTML=Object.entries(window.EXG).map(([n,g])=>`<details class="library-item"><summary><div><b>${n}</b><small>${g.equipment}</small></div><span>查看</span></summary><div class="library-body">${guideHTML(n,g)}<div class="guide-box" style="margin-top:8px"><b>第一次建议</b>${g.startLoad==='0'?'徒手':`${g.startLoad} kg左右`}，以动作稳定并保留2—3次余力为准。</div></div></details>`).join('')
  }
  function renderScene(){const arr=sceneData[$('foodScene').value];$('sceneAdvice').innerHTML=arr.map(x=>`<div class="scene-option">✓ ${x}</div>`).join('')}
  function saveLog(){const vals={date:today,weight:Number($('weightInput').value)||null,waist:Number($('waistInput').value)||null,steps:Number($('stepsInput').value)||null,sleep:Number($('sleepInput').value)||null};const idx=S.logs.findIndex(x=>x.date===today);if(idx>=0)S.logs[idx]=vals;else S.logs.push(vals);save();toast('今日记录已保存');renderProgress()}
  function renderProgress(){
    const recent=S.logs.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-14);const last7=recent.slice(-7);const prev7=recent.slice(-14,-7);const avg=a=>{const v=a.map(x=>x.weight).filter(Boolean);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null};const a=avg(last7),b=avg(prev7);let trend='—';if(a&&b)trend=`${a-b>0?'+':''}${(a-b).toFixed(1)}kg`;
    const weekStart=new Date();weekStart.setDate(weekStart.getDate()-6);const keys=Object.keys(S.days).filter(k=>new Date(k)>=weekStart);const body=keys.filter(k=>S.days[k].body).length;let mealDone=0,mealTotal=0,skinDone=0,skinTotal=0;keys.forEach(k=>{mealDone+=Object.values(S.days[k].meals||{}).filter(Boolean).length;mealTotal+=3;skinDone+=Object.values(S.days[k].skin||{}).filter(Boolean).length;skinTotal+=2});
    $('reportWorkouts').textContent=body;$('reportFood').textContent=`${mealTotal?Math.round(mealDone/mealTotal*100):0}%`;$('reportSkin').textContent=`${skinTotal?Math.round(skinDone/skinTotal*100):0}%`;$('reportWeight').textContent=trend;
    let report=body>=3?'本周训练执行很好。继续保持，不要为了满分额外加练。':body>=2?'本周达到最低有效训练量。下一步优先保证第三次训练，而不是增加单次强度。':'本周身体任务偏少。下周先固定两个绝对不会被占用的训练时段。';
    if(a&&b&&a-b<-0.7)report+=' 体重下降较快；若力量或精神状态下降，训练日前后增加约100—150 kcal主食。';else if(a&&b&&Math.abs(a-b)<0.1)report+=' 仅凭一周不调整热量；若连续两周体重和腰围都不变，再减少约150 kcal。';
    $('coachReport').textContent=report;
    const recentSessions=S.sessions.slice(-8);const names=[...new Set(recentSessions.flatMap(s=>Object.keys(s.exercises||{})))];$('strengthProgress').innerHTML=names.length?names.map(n=>{const s=recentSessions.filter(x=>x.exercises?.[n]).at(-1);const sets=s.exercises[n].sets||[];const summary=sets.filter(x=>x.done).map(x=>`${x.weight||0}kg×${x.reps||0}`).join(' / ')||'尚未完成组记录';return `<div class="strength-item"><b>${n}</b><small>${s.date} · ${summary}</small><div class="trend">下次打开训练时会自动给出加重或保持建议。</div></div>`}).join(''):'<div class="card muted">完成第一次逐组训练后，这里会显示力量进步。</div>';
    $('logHistory').innerHTML=recent.slice().reverse().slice(0,8).map(x=>`<p>${x.date}　体重 ${x.weight??'—'} kg　腰围 ${x.waist??'—'} cm　睡眠 ${x.sleep??'—'} h</p>`).join('')||'<p>还没有记录。</p>';
    $('backupStatus').textContent=S.backupAt?`上次：${S.backupAt}`:'尚未备份';
  }
  function renderSkinCalendar(){const names=['周一','周二','周三','周四','周五','周六','周日'];const rows=names.map((n,i)=>{const dow=i===6?0:i+1;const w=weekNo();const bp=w<=2?[1,3,5].includes(dow):[1,3,5,0].includes(dow);const ada=w<=2?[2,5].includes(dow):w<=4?[1,3,5].includes(dow):dow!==0;return `<div class="skin-day"><b>${n}</b><div>早：${bp?'过氧化苯甲酰＋':''}保湿＋防晒<br>晚：${ada?'阿达帕林＋':''}保湿</div></div>`});$('skinCalendar').innerHTML=rows.join('')}
  function exportData(){const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`wuhan-coach-backup-${today}.json`;a.click();URL.revokeObjectURL(a.href);S.backupAt=today;save();renderProgress();toast('备份已导出')}
  function importData(e){const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.days||!x.logs)throw new Error();S=x;save();location.reload()}catch(err){toast('备份文件无效')}};r.readAsText(file)}
  init();
})();