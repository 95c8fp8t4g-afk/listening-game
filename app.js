
const SUPABASE_URL="https://tlwhknuxlrxxxheqvxin.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_NSCjCmHg2sBJOFqx9B-xBg_W1104UB6";
const supabaseClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

async function sbSafe(fn,fallback=null){
 try{return await fn()}catch(e){console.error("Supabase:",e);return fallback}
}

const $=s=>document.querySelector(s), app=$("#app");
const PETS={
 chicken:{name:"닭",stages:[["🥚","알"],["🐣","병아리"],["🐔","닭"]]},
 cat:{name:"고양이",stages:[["🐾","아기 고양이"],["🐱","꼬마 고양이"],["😺","어른 고양이"]]},
 dog:{name:"강아지",stages:[["🐾","아기 강아지"],["🐶","꼬마 강아지"],["🐕","어른 강아지"]]},
 frog:{name:"개구리",stages:[["🫧","개구리알"],["〰️","올챙이"],["🐸","개구리"]]},
 butterfly:{name:"나비",stages:[["🥚","알"],["🐛","애벌레"],["🦋","나비"]]},
 penguin:{name:"펭귄",stages:[["🥚","알"],["🐧","아기 펭귄"],["🐧","어른 펭귄"]]},
 rabbit:{name:"토끼",stages:[["🐾","아기 토끼"],["🐰","꼬마 토끼"],["🐇","어른 토끼"]]}
};
const DEFAULT=[
 {type:"order",round:"Dialogue Order",title:"대화문을 자연스러운 순서로 배열하세요.",items:["Sure. What time should we meet?","Do you want to watch a movie?","How about 3 p.m.?","Sounds great!"],answer:["Do you want to watch a movie?","Sure. What time should we meet?","How about 3 p.m.?","Sounds great!"],enabled:true},
 {type:"choice",round:"Fill in the Blank",title:"I'm going to ______ my grandparents this weekend.",options:["visit","visited","visiting","visits"],answer:"visit",enabled:true},
 {type:"choice",round:"Missing Line",title:"A: Did you enjoy the concert?\nB: ______\nA: That's too bad.",options:["Yes, it was amazing.","No, I couldn't go.","I listen to music every day.","Let's buy a ticket."],answer:"No, I couldn't go.",enabled:true},
 {type:"speak",round:"Speaking Challenge",title:"문장을 소리 내어 읽어 보세요.",target:"I'd like to return this shirt.",enabled:true},
 ...Array.from({length:11},()=>({type:"choice",round:"Question",title:"",options:[],answer:"",enabled:false}))
]

const TEACHER_PASSWORD_KEY="LQ_teacher_password";
function activeQuestions(){return questions.filter(q=>q.enabled && q.title && (q.type!=="speak" || q.target));}
function teacherGate(){
 const saved=localStorage.getItem(TEACHER_PASSWORD_KEY);
 const pass=prompt(saved?"교사 비밀번호를 입력하세요.":"교사용 비밀번호를 처음 설정하세요. (이 기기에 저장됩니다.)");
 if(pass===null)return;
 if(!saved){if(pass.length<4)return alert("비밀번호는 4자 이상으로 설정해 주세요.");localStorage.setItem(TEACHER_PASSWORD_KEY,pass);alert("교사 비밀번호가 설정되었습니다.");teacher();}
 else if(pass===saved)teacher(); else alert("비밀번호가 올바르지 않습니다.");
}
const MINI_DEFAULT=[
 {en:"borrow",ko:"빌리다"},
 {en:"return",ko:"돌려주다"},
 {en:"together",ko:"함께"},
 {en:"concert",ko:"콘서트, 음악회"},
 {en:"visit",ko:"방문하다"}
]
let miniWords=JSON.parse(localStorage.getItem("LQ_mini_words")||"null")||MINI_DEFAULT;
let questions=JSON.parse(localStorage.getItem("LQ_questions")||"null")||DEFAULT;
let S={student:null,q:0,score:0,combo:0,correct:0,answers:[],selected:null,order:[],transcript:"",speechScore:null,recognizing:false,rec:null,questionStartedAt:null,sessionId:null,sessionEndsAt:null,timerId:null,activityStatus:"lobby",miniStreak:0,currentQuestion:0,resultWaiting:false};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function layout(x){app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Listening <b>Quest</b> <small>v2</small></div></div>${x}</div>`}
function stage(score){return score>=1200?2:score>=600?1:0}
function petInfo(){
 let p=PETS[S.student.pet],i=stage(S.score),next=i===0?600:i===1?1200:1200,base=i===0?0:i===1?600:1200;
 return {p,i,emoji:p.stages[i][0],name:p.stages[i][1],pct:i===2?100:Math.min(100,(S.score-base)/(next-base)*100),next};
}


function remainingMs(){
 return S.sessionEndsAt?Math.max(0,S.sessionEndsAt-Date.now()):0;
}
function formatTime(ms){
 const total=Math.ceil(ms/1000),m=Math.floor(total/60),s=total%60;
 return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function timerHTML(){
 const ms=remainingMs(), urgent=ms<=60000;
 return `<div class="game-timer ${urgent?"urgent":""}">⏱ <span id="countdown">${formatTime(ms)}</span></div>`;
}
function startCountdown(){
 clearInterval(S.timerId);
 const tick=()=>{
   const el=document.querySelector("#countdown");
   const ms=remainingMs();
   if(el){el.textContent=formatTime(ms);const box=el.closest(".game-timer");if(box)box.classList.toggle("urgent",ms<=60000);}
   if(ms<=0){clearInterval(S.timerId);S.timerId=null;handleTimeUp();}
 };
 tick();S.timerId=setInterval(tick,500);
}
function handleTimeUp(){
 if(S.timeExpired||S.resultWaiting)return;
 S.timeExpired=true;finishSessionRemote();
 const ov=document.createElement("div");ov.className="timeup-overlay";
 ov.innerHTML=`<div class="timeup-card"><div class="timeup-icon">⏰</div><h2>시간 종료!</h2><p>순위 발표 대기 화면으로 이동합니다.</p></div>`;
 document.body.appendChild(ov);setTimeout(()=>{ov.remove();waitForRankingScreen();},500);
}
function rankingRows(){
 return allSessionRankingRows().slice(0,5);
}
function updateLiveSession(){
 if(!S.student||!S.sessionId)return;
 let rows=JSON.parse(localStorage.getItem("LQ_live_session")||"[]");
 rows=rows.filter(x=>!(x.sessionId===S.sessionId && x.name===S.student.name && x.className===S.student.className));
 rows.push({sessionId:S.sessionId,name:S.student.name,className:S.student.className,score:S.score,updatedAt:Date.now()});
 localStorage.setItem("LQ_live_session",JSON.stringify(rows));
}

function rankingHTML(){
 let rows=rankingRows();
 return `<div class="ranking"><div class="ranktitle">🏆 LIVE RANKING</div>${rows.length?rows.map((r,i)=>`<div class="rankrow ${r.current?"me":""}"><b>${i+1}</b><span>${esc(r.name)}</span><strong>${r.score}</strong></div>`).join(""):`<div class="note">첫 번째 플레이어예요!</div>`}</div>`;
}
function evolutionToast(emoji,name){
 const el=document.createElement("div");el.className="evo-toast";el.innerHTML=`<div class="evo-pop"><div class="evo-big">${emoji}</div><b>${esc(name)}로 진화!</b><span>LEVEL UP ✨</span></div>`;
 document.body.appendChild(el);setTimeout(()=>el.classList.add("show"),10);setTimeout(()=>{el.classList.remove("show");setTimeout(()=>el.remove(),180)},1000);
}

async function loadRemoteQuestions(){
 if(!supabaseClient)return;
 const {data,error}=await supabaseClient.from("game_questions").select("*").order("question_no",{ascending:true});
 if(error){console.error(error);return}
 if(data?.length){
   questions=data.map(r=>({
     type:r.type,round:r.round_name||"Question",title:r.title||"",target:r.target||"",
     options:Array.isArray(r.options)?r.options:[],
     answer:Array.isArray(r.answer)?r.answer:(r.answer?.value??r.answer??""),
     items:Array.isArray(r.answer)?r.answer:[],
     enabled:r.enabled
   }));
 }
}
async function saveQuestionsRemote(){
 if(!supabaseClient)return;
 const rows=questions.map((q,i)=>({
   question_no:i+1,type:q.type,round_name:q.round||"Question",title:q.title||"",target:q.target||null,
   options:q.type==="choice"?(q.options||[]):[],
   answer:q.type==="order"?(q.answer||[]):q.type==="choice"?{value:q.answer||""}:null,
   enabled:!!q.enabled,updated_at:new Date().toISOString()
 }));
 const {error}=await supabaseClient.from("game_questions").upsert(rows,{onConflict:"question_no"});
 if(error)console.error(error);
}
async function loadRemoteVocab(){
 if(!supabaseClient)return;
 const {data,error}=await supabaseClient.from("vocabulary").select("english,korean").order("id",{ascending:true});
 if(!error && data?.length)miniWords=data.map(x=>({en:x.english,ko:x.korean}));
}
async function replaceRemoteVocab(){
 if(!supabaseClient)return;
 await supabaseClient.from("vocabulary").delete().neq("id",0);
 if(miniWords.length){
   const {error}=await supabaseClient.from("vocabulary").insert(miniWords.map(w=>({english:w.en,korean:w.ko})));
   if(error)console.error(error);
 }
}
async function getActiveSession(className){
 if(!supabaseClient)return null;
 const {data,error}=await supabaseClient.from("game_sessions")
   .select("*").eq("class_name",className).eq("is_active",true)
   .order("started_at",{ascending:false}).limit(1).maybeSingle();
 if(error){console.error(error);return null}
 return data;
}
async function createRemoteSession(className,minutes){
 if(!supabaseClient)return null;
 await supabaseClient.from("game_sessions").update({is_active:false}).eq("class_name",className).eq("is_active",true);
 const started=new Date(), ends=new Date(started.getTime()+minutes*60000);
 const {data,error}=await supabaseClient.from("game_sessions").insert({
   class_name:className,duration_minutes:minutes,started_at:started.toISOString(),
   ends_at:ends.toISOString(),ranking_published:false,is_active:true
 }).select().single();
 if(error){console.error(error);return null}
 return data;
}
async function upsertRemoteScore(finished=false){
 if(!supabaseClient||!S.student||!S.sessionId)return;
 const row={
   session_id:S.sessionId,class_name:S.student.className,student_name:S.student.name,
   character_key:S.student.pet,score:S.score,correct_count:S.correct,
   total_count:(S.playQuestions||[]).length,finished,
   activity_status:S.activityStatus||"main_game",
   current_question:S.currentQuestion||0,
   mini_streak:S.miniStreak||0,updated_at:new Date().toISOString()
 };
 const {error}=await supabaseClient.from("student_scores").upsert(row,{onConflict:"session_id,class_name,student_name"});
 if(error)console.error(error);
}
async function finishSessionRemote(){
 if(!supabaseClient||!S.sessionId)return false;
 const {error}=await supabaseClient.from("game_sessions").update({status:"finished",is_active:false}).eq("id",S.sessionId);
 if(error){console.error(error);return false}
 return true;
}
async function fetchRemoteRanking(){
 if(!supabaseClient||!S.sessionId)return [];
 const {data,error}=await supabaseClient.from("student_scores")
   .select("class_name,student_name,score,correct_count,total_count,activity_status,current_question,mini_streak,finished,updated_at")
   .eq("session_id",S.sessionId).order("score",{ascending:false}).order("updated_at",{ascending:true});
 if(error){console.error(error);return []}
 return data||[];
}
async function publishRemoteRanking(){
 if(!supabaseClient||!S.sessionId)return false;
 const {error}=await supabaseClient.from("game_sessions").update({ranking_published:true}).eq("id",S.sessionId);
 if(error){console.error(error);return false}
 return true;
}
async function resetRemoteRankingPublish(){
 if(!supabaseClient||!S.sessionId)return false;
 const {error}=await supabaseClient.from("game_sessions").update({ranking_published:false}).eq("id",S.sessionId);
 if(error){console.error(error);return false}
 return true;
}
async function checkRemotePublished(){
 if(!supabaseClient||!S.sessionId)return false;
 const {data,error}=await supabaseClient.from("game_sessions").select("ranking_published").eq("id",S.sessionId).maybeSingle();
 if(error){console.error(error);return false}
 return !!data?.ranking_published;
}
function subscribeSession(){
 if(!supabaseClient||!S.sessionId)return;
 try{if(S.scoreChannel)supabaseClient.removeChannel(S.scoreChannel)}catch(e){}
 S.scoreChannel=supabaseClient.channel(`scores-${S.sessionId}`)
   .on("postgres_changes",{event:"*",schema:"public",table:"student_scores",filter:`session_id=eq.${S.sessionId}`},()=>refreshStudentRanking())
   .subscribe();
 try{if(S.sessionChannel)supabaseClient.removeChannel(S.sessionChannel)}catch(e){}
 S.sessionChannel=supabaseClient.channel(`session-${S.sessionId}`)
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"game_sessions",filter:`id=eq.${S.sessionId}`},payload=>{
      if(payload.new?.ranking_published)showFinalRankingRemote();
      else if(payload.new?.status==="finished"&&!S.resultWaiting)waitForRankingScreen();
   }).subscribe();
}
async function refreshStudentRanking(){
 const rows=await fetchRemoteRanking();
 S.remoteRanking=rows;
 const holder=document.querySelector("#studentRankingHolder");
 if(holder)holder.innerHTML=studentRankingHTMLRemote(rows);
}
function studentRankingHTMLRemote(rows){
 const settingsVisible=true;
 if(!settingsVisible||!rows?.length)return "";
 const top3=rows.slice(0,3);
 const myIndex=rows.findIndex(r=>r.student_name===S.student?.name&&r.class_name===S.student?.className);
 const myRank=myIndex>=0?myIndex+1:null;
 return `<div class="ranking student-rank"><div class="ranktitle">🏆 LIVE RANKING</div>
   ${top3.map((r,i)=>`<div class="rankrow ${r.student_name===S.student?.name?"me":""}"><b>${i+1}</b><span>${esc(r.student_name)}</span><strong>${r.score}</strong></div>`).join("")}
   ${myRank && myRank>3?`<div class="my-rank-divider"></div><div class="rankrow me"><b>${myRank}</b><span>${esc(S.student.name)} (나)</span><strong>${S.score}</strong></div>`:""}
 </div>`;
}
function waitForRankingScreen(){
 if(S.resultWaiting)return;
 S.resultWaiting=true;S.timeExpired=true;S.activityStatus="waiting";
 clearInterval(S.timerId);S.timerId=null;
 try{if(S.recognizing&&S.rec)S.rec.stop()}catch(e){}
 upsertRemoteScore(true);
 layout(`<div class="card hero waiting-screen"><div class="waiting-icon">🏆</div><span class="badge">WAITING FOR RESULTS</span><h1>순위 발표를 기다려 주세요!</h1><p class="sub">게임이 종료됐어요. 선생님이 랭킹을 발표하면 이 화면이 자동으로 결과 화면으로 바뀝니다.</p><div class="waiting-dots"><span></span><span></span><span></span></div><div class="note">결과 대기 중…</div></div>`);
 clearInterval(S.publishPoll);
 S.publishPoll=setInterval(async()=>{const ses=await getSessionById(S.sessionId);if(ses?.ranking_published){clearInterval(S.publishPoll);S.publishPoll=null;showFinalRankingRemote();}},800);
}
async function showFinalRankingRemote(){
 const rows=await fetchRemoteRanking();
 const top3=rows.slice(0,3);
 const me=rows.find(r=>r.student_name===S.student?.name&&r.class_name===S.student?.className);
 const myIndex=rows.findIndex(r=>r===me),myRank=myIndex>=0?myIndex+1:"-";
 const correct=me?.correct_count??S.correct??0,total=me?.total_count??(S.playQuestions||[]).length??0;
 const accuracy=total?Math.round(correct/total*100):0;
 layout(`<div class="card hero"><div class="final-result-card"><span class="badge">FINAL RANKING</span><h1>🏆 순위 발표</h1>
 <div class="podium">${top3.map((r,i)=>`<div class="podium-row rank-${i+1}"><b>${i+1}위</b><span>${esc(r.student_name)}</span><strong>${r.score}점</strong></div>`).join("")}</div>
 <div class="my-final"><div><span>내 순위</span><b>${myRank}위</b></div><div><span>맞힌 개수</span><b>${correct}개</b></div><div><span>정답률</span><b>${accuracy}%</b></div></div>
 </div></div>`);
}

async function createWaitingSession(className,minutes){
 await supabaseClient.from("game_sessions").update({is_active:false,status:"finished"}).eq("class_name",className).eq("is_active",true);
 const {data,error}=await supabaseClient.from("game_sessions").insert({class_name:className,duration_minutes:minutes,started_at:null,ends_at:null,ranking_published:false,is_active:true,status:"waiting"}).select().single();
 if(error){console.error(error);return null} return data;
}
async function joinLobby(ses,name,cls,pet){
 const {error}=await supabaseClient.from("session_players").upsert({session_id:ses.id,class_name:cls,student_name:name,character_key:pet},{onConflict:"session_id,class_name,student_name"});
 return !error;
}
async function fetchLobbyPlayers(id){
 const {data}=await supabaseClient.from("session_players").select("*").eq("session_id",id).order("joined_at",{ascending:true}); return data||[];
}
async function startRemoteSession(id,minutes){
 const now=new Date(),ends=new Date(now.getTime()+minutes*60000);
 const {data,error}=await supabaseClient.from("game_sessions").update({status:"playing",started_at:now.toISOString(),ends_at:ends.toISOString(),ranking_published:false}).eq("id",id).select().single();
 if(error){console.error(error);return null} return data;
}
async function getSessionById(id){const {data}=await supabaseClient.from("game_sessions").select("*").eq("id",id).maybeSingle();return data}
function lobbyScreen(ses){
 S.sessionId=ses.id;
 layout(`<div class="card hero waiting-screen"><div class="waiting-icon">🎮</div><span class="badge">GAME LOBBY</span><h1>게임 대기실</h1><p class="sub"><b>${esc(S.student.name)}</b> 입장 완료!<br>선생님이 게임을 시작할 때까지 기다려 주세요.</p><div class="waiting-dots"><span></span><span></span><span></span></div><div class="note">시작 신호 대기 중…</div></div>`);
 try{if(S.lobbyChannel)supabaseClient.removeChannel(S.lobbyChannel)}catch(e){}
 S.lobbyChannel=supabaseClient.channel(`lobby-${ses.id}`).on("postgres_changes",{event:"UPDATE",schema:"public",table:"game_sessions",filter:`id=eq.${ses.id}`},p=>{if(p.new?.status==="playing")beginSharedGame(p.new)}).subscribe();
 clearInterval(S.lobbyPoll);S.lobbyPoll=setInterval(async()=>{const x=await getSessionById(ses.id);if(x?.status==="playing"){clearInterval(S.lobbyPoll);beginSharedGame(x)}},1000);
}
async function beginSharedGame(ses){
 clearInterval(S.lobbyPoll);S.sessionId=ses.id;S.sessionEndsAt=new Date(ses.ends_at).getTime();S.timeExpired=false;S.resultWaiting=false;S.activityStatus="main_game";S.currentQuestion=1;S.miniStreak=0;
 await upsertRemoteScore(false);subscribeSession();question();
}

async function ensureTeacherResultBar(){
 if(!S.sessionId||!supabaseClient)return;
 const ses=await getSessionById(S.sessionId);
 let bar=document.querySelector("#teacherResultBar");
 if(!bar){bar=document.createElement("div");bar.id="teacherResultBar";bar.className="teacher-result-bar";document.body.appendChild(bar);}
 if(ses?.status==="finished"&&!ses?.ranking_published){
   bar.style.display="flex";
   bar.innerHTML=`<div><b>🏁 게임 종료</b><span>학생들이 순위 발표를 기다리고 있습니다.</span></div><button class="btn" id="teacherPublishNow">🏆 랭킹 발표</button>`;
   $("#teacherPublishNow").onclick=async()=>{if(await publishRemoteRanking()){bar.style.display="none";alert("랭킹을 발표했습니다.");}};
 }else bar.style.display="none";
}
function watchTeacherSessionForResults(){clearInterval(S.teacherResultPoll);S.teacherResultPoll=setInterval(ensureTeacherResultBar,1000);ensureTeacherResultBar();}
async function home(){
 await Promise.all([loadRemoteQuestions(),loadRemoteVocab()]);
 layout(`<div class="card hero"><span class="badge">🎧 LISTENING QUEST</span><h1>Choose. Play.<br>Grow!</h1><p class="sub">영어 문제를 풀고 점수를 모아 내 캐릭터를 진화시키세요.</p>
 <div class="grid2"><div><label>학급</label><select id="cls">${[...Array(11)].map((_,i)=>`<option>2학년 ${i+1}반</option>`).join("")}</select></div><div><label>이름</label><input id="nm" placeholder="이름"></div></div>
 <label>캐릭터 선택</label><div class="chars">${Object.entries(PETS).map(([k,p],i)=>`<button class="char ${i===0?"sel":""}" data-p="${k}"><div class="emoji">${p.stages[0][0]}</div><b>${p.name}</b><span class="note">${p.stages.map(x=>x[1]).join(" → ")}</span></button>`).join("")}</div>
 <button class="btn full" id="go">GAME START →</button><button class="teacher-icon" id="teacher" title="교사용">⚙️</button>
 <p class="note">진화 기준: 400점 / 800점 · 정답 점수: 최대 60점 · 10초마다 10점 감소</p></div>`);
 let pet="chicken";document.querySelectorAll(".char").forEach(b=>b.onclick=()=>{pet=b.dataset.p;document.querySelectorAll(".char").forEach(x=>x.classList.remove("sel"));b.classList.add("sel")});
 $("#go").onclick=async()=>{let name=$("#nm").value.trim();if(!name)return alert("이름을 입력해 주세요.");
 let aq=activeQuestions();if(!aq.length)return alert("교사가 아직 문제를 등록하지 않았습니다.");
 let cls=$("#cls").value,ses=await getActiveSession(cls);if(!ses)return alert("선생님이 아직 이 반의 게임을 만들지 않았습니다.");
 S={...S,student:{name,className:cls,pet},q:0,score:0,combo:0,correct:0,answers:[],transcript:"",speechScore:null,playQuestions:aq,sessionId:ses.id,timeExpired:false};
 if(ses.status==="waiting"){if(!await joinLobby(ses,name,cls,pet))return alert("대기실 입장에 실패했습니다.");return lobbyScreen(ses)}
 if(ses.status==="playing"){if(new Date(ses.ends_at).getTime()<=Date.now())return alert("게임 시간이 종료되었습니다.");await joinLobby(ses,name,cls,pet);return beginSharedGame(ses)}
 return alert("이 반의 게임이 이미 종료되었습니다.");
};
$("#teacher").onclick=teacherGate;
}
function chrome(inner){
 let pi=petInfo(), pct=S.q/S.playQuestions.length*100;
 layout(`<div class="petbar"><div class="petemoji">${pi.emoji}</div><div class="evo"><b>${pi.name}</b> · ${S.score}점<div class="evoline"><div style="width:${pi.pct}%"></div></div><span class="note">${pi.i<2?`다음 진화까지 ${Math.max(0,pi.next-S.score)}점`:"최종 진화 완료!"}</span></div></div>
 <div class="gamehead"><div><div class="note">${esc(S.student.className)} · ${esc(S.student.name)} · ${S.q+1}/${S.playQuestions.length}</div><div class="progress"><div style="width:${pct}%"></div></div></div><div class="stats">${timerHTML()}<div class="pill">⭐ ${S.score}점</div><div class="pill">🔥 ${S.combo} COMBO</div></div></div>
 <div class="playgrid"><div class="card">${inner}</div><div id="studentRankingHolder"></div></div>`);startCountdown();refreshStudentRanking();
}
function question(){if(S.timeExpired||remainingMs()<=0){S.timeExpired=true;return waitForRankingScreen();}S.activityStatus="main_game";S.currentQuestion=S.q+1;S.miniStreak=0;upsertRemoteScore(false);S.selected=null;S.transcript="";S.speechScore=null;S.questionStartedAt=Date.now();let q=S.playQuestions[S.q];if(q.type==="order"){S.order=[...q.items];order(q)}else if(q.type==="choice")choice(q);else speak(q)}
function choice(q){chrome(`<div class="round">${q.round}</div><div class="prompt">${esc(q.title).replace(/\n/g,"<br>")}</div>${q.options.map(o=>`<button class="option ${S.selected===o?"sel":""}" data-o="${esc(o)}">${esc(o)}</button>`).join("")}<div class="actions"><button class="btn" id="check">CHECK</button></div>`);
 document.querySelectorAll(".option").forEach(b=>b.onclick=()=>{S.selected=b.dataset.o;choice(q)});$("#check").onclick=()=>{if(!S.selected)return alert("답을 골라 주세요.");finish(S.selected===q.answer,S.selected)}
}
function order(q){chrome(`<div class="round">${q.round}</div><div class="prompt">${esc(q.title)}</div>${S.order.map((x,i)=>`<div class="order"><span>${i+1}. ${esc(x)}</span><div><button class="icon" data-u="${i}">↑</button> <button class="icon" data-d="${i}">↓</button></div></div>`).join("")}<div class="actions"><button class="btn" id="check">CHECK</button></div>`);
 document.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>mv(+b.dataset.u,-1,q));document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>mv(+b.dataset.d,1,q));$("#check").onclick=()=>finish(JSON.stringify(S.order)===JSON.stringify(q.answer),S.order.join(" | "))}
function mv(i,d,q){let j=i+d;if(j<0||j>=S.order.length)return;[S.order[i],S.order[j]]=[S.order[j],S.order[i]];order(q)}
function speedBonus(){
 const sec=Math.max(0,(Date.now()-(S.questionStartedAt||Date.now()))/1000);
 if(sec<=5)return {points:20,label:"⚡ 번개 보너스 +20"};
 if(sec<=10)return {points:15,label:"⚡ 스피드 보너스 +15"};
 if(sec<=15)return {points:10,label:"⏱ 빠른 정답 +10"};
 if(sec<=20)return {points:5,label:"⏱ 시간 보너스 +5"};
 return {points:0,label:""};
}
function finish(ok,response){
 let before=stage(S.score),gain=0,bonus={points:0,label:""};if(ok){S.correct++;S.combo++;bonus=speedBonus();gain=60+bonus.points+Math.min(S.combo*5,20);S.score+=gain}else S.combo=0;
 S.answers.push({q:S.q+1,type:S.playQuestions[S.q].type,correct:ok,response,points:gain,speedBonus:bonus.points});updateLiveSession();upsertRemoteScore(false);
 let after=stage(S.score),msg=ok?`✓ 정답! +${gain}점${bonus.label?`<br>${bonus.label}`:""}`:"✕ 아쉬워요. 다음 문제에 도전!";
 $(".card").insertAdjacentHTML("beforeend",`<div class="feedback ${ok?"ok":"bad"}">${msg}</div><div class="actions"><button class="btn" id="next">NEXT →</button></div>`);
 $("#check")?.remove();document.querySelectorAll(".option,.icon").forEach(x=>x.disabled=true);$("#next").onclick=next;if(after>before){let p=petInfo();evolutionToast(p.emoji,p.name);}
}
function norm(s){return String(s).toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim()}
function sim(a,b){let A=norm(a).split(" ").filter(Boolean),B=norm(b).split(" ").filter(Boolean);if(!A.length)return 0;let used=new Set(),hit=0;A.forEach(w=>{let j=B.findIndex((x,i)=>x===w&&!used.has(i));if(j>=0){used.add(j);hit++}});return Math.round(200*hit/(A.length+B.length))}
function speak(q){
 let support=("SpeechRecognition"in window)||("webkitSpeechRecognition"in window);
 chrome(`<div class="round">${q.round}</div><div class="prompt">${esc(q.title)}</div><div class="speak"><div style="font-size:24px;font-weight:900;margin-bottom:18px">“${esc(q.target)}”</div>
 <button class="mic ${S.recognizing?"on":""}" id="mic">${S.recognizing?"■":"🎤"}</button><p><b>${S.recognizing?"인식 중 · 버튼을 다시 누르면 종료":"마이크 버튼을 눌러 시작"}</b></p>
 <div class="sub">${S.transcript?`인식된 문장: <b>${esc(S.transcript)}</b>`:""}</div>${S.speechScore!=null?`<div class="speechScore">${S.speechScore}점</div><div class="note">목표 문장과 브라우저가 인식한 단어의 일치도를 기반으로 한 연습용 점수입니다.</div>`:""}
 ${!support?`<div class="feedback bad">현재 브라우저에서 음성 인식을 지원하지 않습니다.</div>`:""}</div>${S.speechScore!=null?`<div class="actions"><button class="btn" id="speechNext">점수 받기 →</button></div>`:""}`);
 if(support)$("#mic").onclick=()=>S.recognizing?stopRec(q):startRec(q);if(S.speechScore!=null)$("#speechNext").onclick=()=>finishSpeech();
}
function startRec(q){
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;S.rec=new R();S.rec.lang="en-US";S.rec.continuous=true;S.rec.interimResults=true;S.recognizing=true;let final="";
 S.rec.onresult=e=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){let t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t+" ";else interim+=t}S.transcript=(final+interim).trim();let el=document.querySelector(".sub");if(el)el.innerHTML=`인식된 문장: <b>${esc(S.transcript)}</b>`};
 S.rec.onerror=()=>{S.recognizing=false;speak(q)};S.rec.onend=()=>{if(S.recognizing){S.recognizing=false;S.speechScore=sim(S.transcript,q.target);speak(q)}};S.rec.start();speak(q)
}
function stopRec(q){S.recognizing=false;try{S.rec.stop()}catch(e){};S.speechScore=sim(S.transcript,q.target);setTimeout(()=>speak(q),100)}
function finishSpeech(){
 let raw=S.speechScore, sb=speedBonus(), before=stage(S.score);
 let gain=Math.round(raw*0.6)+(raw>=70?Math.round(sb.points*0.5):0); // 발음 정확도가 중심, 빠른 성공은 최대 +50
 S.score+=gain;if(raw>=70){S.correct++;S.combo++}else S.combo=0;S.answers.push({q:S.q+1,type:"speak",correct:raw>=70,response:S.transcript,speechScore:raw,points:gain});updateLiveSession();upsertRemoteScore(false);
 let after=stage(S.score);if(after>before){let p=petInfo();evolutionToast(p.emoji,p.name);setTimeout(next,1050);}else next();
}
function next(){S.q++;S.recognizing=false;if(S.timeExpired||remainingMs()<=0)waitForRankingScreen();else if(S.q>=S.playQuestions.length)results();else question()}
function results(){if(!S.mainFinishedAt){S.mainFinishedAt=Date.now();S.activityStatus='mini_game';upsertRemoteScore(true);}
 clearInterval(S.timerId);S.timerId=null;S.activityStatus="mini_game";S.currentQuestion=S.playQuestions.length;S.miniStreak=0;upsertRemoteScore(false);saveLocalOnly();let pi=petInfo(),acc=Math.round(S.correct/S.playQuestions.length*100);
 layout(`<div class="card hero"><span class="badge">MISSION COMPLETE</span><h1>${pi.emoji} ${esc(S.student.name)} 완료!</h1>
 <div class="metrics"><div class="metric"><span>FINAL SCORE</span><b>${S.score}</b></div><div class="metric"><span>ACCURACY</span><b>${acc}%</b></div><div class="metric"><span>CHARACTER</span><b>${pi.name}</b></div></div>
 <p class="sub">본 게임은 끝났어요. 남은 시간 동안 미니게임을 즐겨보세요! 미니게임 점수는 LIVE RANKING에 영향을 주지 않습니다.</p>
 ${miniTimerHTML()}
 <button class="btn full" id="miniStart" ${remainingMs()<=0?"disabled":""}>🎮 단어 뜻 맞추기 시작</button>
 </div>`);
 if(remainingMs()<=0){setTimeout(waitForRankingScreen,300);return}
 startMiniCountdown();$("#miniStart").onclick=()=>startMiniGame();
}
let miniState={index:0,score:0,streak:0,order:[],direction:"en-ko"};

function miniTimerHTML(){
 const ms=remainingMs();
 return `<div class="mini-timebar"><span>⏱ 남은 시간</span><b id="miniCountdown">${formatTime(ms)}</b></div>`;
}
function startMiniCountdown(){
 clearInterval(S.timerId);
 const tick=()=>{
   const ms=remainingMs(), el=document.querySelector("#miniCountdown");
   if(el){el.textContent=formatTime(ms);el.closest(".mini-timebar")?.classList.toggle("urgent",ms<=60000);}
   if(ms<=0){clearInterval(S.timerId);S.timerId=null;miniTimeUp();}
 };
 tick();S.timerId=setInterval(tick,500);
}
function miniTimeUp(){
 if(S.timeExpired||S.resultWaiting)return;
 S.timeExpired=true;finishSessionRemote();waitForRankingScreen();
}
function startMiniGame(){
 if(remainingMs()<=0)return miniTimeUp();
 if(!miniWords.length){layout(`<div class="card hero"><h2>순위 발표를 기다려 주세요 🏆</h2>${miniTimerHTML()}<p class="sub">교사가 아직 단어장을 등록하지 않았습니다.</p></div>`);startMiniCountdown();return}
 miniState={index:0,score:0,streak:0,order:shuffle([...miniWords]),direction:"en-ko"};S.activityStatus="mini_game";S.miniStreak=0;upsertRemoteScore(false);renderMini();
}
function makeDistractors(correct,key){
 let pool=miniWords.map(w=>w[key]).filter(x=>x&&x!==correct);
 return shuffle([...new Set(pool)]).slice(0,3);
}
function renderMini(){
 if(remainingMs()<=0)return miniTimeUp();
 S.activityStatus="mini_game";S.miniStreak=miniState.streak;upsertRemoteScore(false);
 if(miniState.index>0 && miniState.index%miniState.order.length===0)miniState.order=shuffle([...miniWords]);
 let w=miniState.order[miniState.index%miniState.order.length];
 let enToKo=miniState.index%2===0, prompt=enToKo?w.en:w.ko, correct=enToKo?w.ko:w.en, key=enToKo?"ko":"en";
 let wrong=makeDistractors(correct,key), opts=shuffle([correct,...wrong]);
 layout(`<div><div class="card"><span class="badge">WAITING MINI GAME</span>${miniTimerHTML()}<div class="round">${enToKo?"ENGLISH → KOREAN":"KOREAN → ENGLISH"}</div>
 <div class="prompt" style="font-size:38px;text-align:center">${esc(prompt)}</div><p class="sub" style="text-align:center">${enToKo?"알맞은 한국어 뜻을 고르세요.":"알맞은 영어 단어를 고르세요."}</p>
 ${opts.map(o=>`<button class="option" data-mini="${esc(o)}">${esc(o)}</button>`).join("")}
 <div class="stats" style="margin-top:15px"><div class="pill">🎮 MINI ${miniState.score}</div><div class="pill">🔥 ${miniState.streak}</div><div class="pill">📚 ${miniWords.length} words</div></div>
 <p class="note">영→한 / 한→영이 번갈아 계속 출제됩니다. 미니게임 점수는 본 게임 랭킹에 반영되지 않습니다.</p></div></div>`);
 startMiniCountdown();
 document.querySelectorAll("[data-mini]").forEach(b=>b.onclick=()=>{if(remainingMs()<=0)return miniTimeUp();let ok=b.dataset.mini===correct;if(ok){miniState.score+=10;miniState.streak++}else miniState.streak=0;S.miniStreak=miniState.streak;upsertRemoteScore(false);b.classList.add(ok?"mini-ok":"mini-bad");document.querySelectorAll("[data-mini]").forEach(x=>x.disabled=true);
   if(ok && miniState.streak>=20){setTimeout(()=>miniStampWin(),500);}
   else setTimeout(()=>{miniState.index++;renderMini()},650);
 });
}
function miniStampWin(){
 clearInterval(S.timerId);S.timerId=null;S.activityStatus="stamp_done";S.miniStreak=20;upsertRemoteScore(true);layout(`<div class="card hero stamp-win"><div class="stamp-emoji">🏅</div><span class="badge">MISSION COMPLETE</span><h1>도장 하나 획득!</h1>
 <p class="sub"><b>20개 연속 정답</b>을 달성했어요.</p>
 <div class="stamp-box">선생님께 화면을 보여드리고<br><b>도장판에 도장 1개를 받으세요!</b></div>
 <p class="note">이 화면은 선생님께 확인받기 전까지 닫지 마세요.</p></div>`);
}
function saveLocalOnly(){updateLiveSession();let r=JSON.parse(localStorage.getItem("LQ_results")||"[]");r.push({student:S.student,score:S.score,correct:S.correct,total:S.playQuestions.length,answers:S.answers,date:new Date().toISOString(),sessionId:S.sessionId});localStorage.setItem("LQ_results",JSON.stringify(r))}
function teacher(){
 let results=JSON.parse(localStorage.getItem("LQ_results")||"[]");
 layout(`<div class="tabs"><button class="tab active" id="editTab">✏️ 문제 편집</button><button class="tab" id="reportTab">📊 리포트</button><button class="tab" id="sessionTab">🏁 게임 설정</button><button class="tab" id="miniTab">🎮 미니게임 편집</button><button class="tab" id="rankingTab">🏆 랭킹 관리</button><button class="tab" id="studentTab">학생 화면</button></div><div id="panel"></div>`);
 $("#editTab").onclick=()=>editor();$("#reportTab").onclick=()=>report(results);$("#sessionTab").onclick=()=>sessionManager();$("#miniTab").onclick=()=>miniEditor();$("#rankingTab").onclick=()=>rankingManager();$("#studentTab").onclick=home;editor();
}

function statusLabel(r){
 if(r.activity_status==="main_game")return `🎧 본게임 ${Math.min(r.current_question||1,r.total_count||15)}/${r.total_count||15}`;
 if(r.activity_status==="mini_game")return `🎮 미니게임 · 연속 ${r.mini_streak||0}개`;
 if(r.activity_status==="stamp_done")return `🏅 도장 획득 · 20개 성공`;
 if(r.activity_status==="waiting")return `🏆 결과 대기`;
 return `⏳ 대기실`;
}
async function fetchSessionProgress(sessionId){
 const {data,error}=await supabaseClient.from("student_scores").select("student_name,class_name,score,correct_count,total_count,activity_status,current_question,mini_streak,finished,updated_at").eq("session_id",sessionId).order("student_name",{ascending:true});
 if(error){console.error(error);return []}return data||[];
}
async function renderTeacherProgress(ses,minutes){
 const h=$("#lobbyControl");if(!h)return;
 const players=await fetchLobbyPlayers(ses.id),rows=await fetchSessionProgress(ses.id),latest=await getSessionById(ses.id);
 const status=latest?.status||ses.status,playing=status==="playing",finished=status==="finished";
 const allMainDone=rows.length>0&&rows.every(r=>["mini_game","stamp_done","waiting"].includes(r.activity_status));
 const remaining=latest?.ends_at?Math.max(0,new Date(latest.ends_at).getTime()-Date.now()):0;
 h.innerHTML=`<div class="teacher-lobby"><div class="lobby-head"><div><span>${playing?"현재 참가":"현재 접속"}</span><b>${players.length}명</b></div><div class="teacher-session-actions">${status==="waiting"?`<button class="btn" id="startAll" ${players.length?"":"disabled"}>▶ 게임 시작</button>`:playing?`<button class="btn danger" id="forceEnd">⏹ 게임 즉시 종료</button>`:`<span class="badge">게임 종료</span>`}</div></div>${playing?`<div class="teacher-session-summary"><span>⏱ 남은 시간 <b>${formatTime(remaining)}</b></span>${allMainDone?`<strong>✅ 모두 본게임 완료 — 지금 종료 가능</strong>`:""}<div id="teacherPostGameControls"></div></div>`:""}<div class="progress-table-wrap"><table><tr><th>학생</th><th>현재 상태</th><th>점수</th><th>정답</th></tr>${rows.length?rows.map(r=>`<tr><td>${esc(r.student_name)}</td><td>${statusLabel(r)}</td><td>${r.score}</td><td>${r.correct_count}/${r.total_count}</td></tr>`).join(""):players.map(p=>`<tr><td>${esc(p.student_name)}</td><td>⏳ 대기실</td><td>-</td><td>-</td></tr>`).join("")}</table></div><p class="note">${esc(ses.class_name)} · ${minutes}분</p></div>`;
 if(status==="waiting"&&$("#startAll"))$("#startAll").onclick=async()=>{if(!confirm(`${players.length}명이 입장했습니다. 지금 동시에 시작할까요?`))return;const x=await startRemoteSession(ses.id,minutes);if(!x)return alert("게임 시작 실패");S.sessionEndsAt=new Date(x.ends_at).getTime();renderTeacherProgress(x,minutes);subscribeTeacherProgress(x,minutes)};
 if(playing&&$("#forceEnd"))$("#forceEnd").onclick=async()=>{if(!confirm("남은 시간과 관계없이 지금 전 학생의 게임을 종료할까요?"))return;const {error}=await supabaseClient.from("game_sessions").update({status:"finished",is_active:false}).eq("id",ses.id);if(error)return alert("즉시 종료 실패");alert("게임을 종료했습니다. 학생들은 순위 발표 대기 화면으로 이동합니다.");renderTeacherProgress({...ses,status:"finished"},minutes)};
}
function subscribeTeacherProgress(ses,minutes){
 try{if(S.teacherProgressChannel)supabaseClient.removeChannel(S.teacherProgressChannel)}catch(e){}
 S.teacherProgressChannel=supabaseClient.channel(`teacher-progress-${ses.id}`).on("postgres_changes",{event:"*",schema:"public",table:"student_scores",filter:`session_id=eq.${ses.id}`},()=>renderTeacherProgress(ses,minutes)).on("postgres_changes",{event:"UPDATE",schema:"public",table:"game_sessions",filter:`id=eq.${ses.id}`},()=>renderTeacherProgress(ses,minutes)).on("postgres_changes",{event:"*",schema:"public",table:"session_players",filter:`session_id=eq.${ses.id}`},()=>renderTeacherProgress(ses,minutes)).subscribe();
 clearInterval(S.teacherProgressPoll);S.teacherProgressPoll=setInterval(()=>renderTeacherProgress(ses,minutes),1000);
}
function sessionManager(){
 $("#panel").innerHTML=`<div class="card"><span class="badge">GAME LOBBY</span><h2>수업 게임 설정</h2><p class="sub">대기실을 만든 뒤 학생 입장을 확인하고 ▶ 게임 시작을 누르세요. 시작 후에는 학생별 진행 상태를 실시간으로 확인하고 필요하면 즉시 종료할 수 있습니다.</p><div class="grid2"><div><label>학급</label><select id="sessionClass">${[...Array(11)].map((_,i)=>`<option>2학년 ${i+1}반</option>`).join("")}</select></div><div><label>플레이 시간</label><select id="playMinutes">${[5,10,15,20,25,30,40,45].map(m=>`<option value="${m}">${m}분</option>`).join("")}</select></div></div><div class="actions"><button class="btn" id="createLobby">① 대기실 만들기</button></div><div id="lobbyControl"></div></div>`;
 $("#createLobby").onclick=async()=>{const cls=$("#sessionClass").value,minutes=+$("#playMinutes").value,ses=await createWaitingSession(cls,minutes);if(!ses)return alert("대기실 생성 실패");S.sessionId=ses.id;S.teacherSessionMinutes=minutes;subscribeTeacherSessionStatus(ses.id);renderTeacherProgress(ses,minutes);subscribeTeacherProgress(ses,minutes)};
}


function subscribeTeacherSessionStatus(sessionId){
 try{if(S.teacherSessionChannel)supabaseClient.removeChannel(S.teacherSessionChannel)}catch(e){}
 S.teacherSessionChannel=supabaseClient.channel(`teacher-session-${sessionId}`)
 .on("postgres_changes",{event:"UPDATE",schema:"public",table:"game_sessions",filter:`id=eq.${sessionId}`},payload=>{
   if(payload.new?.status==="finished")renderTeacherPostGameControls();
 }).subscribe();
}

async function renderTeacherPostGameControls(){
 const panel=document.querySelector("#teacherPostGameControls");
 if(!panel||!S.sessionId)return;
 const ses=await getSessionById(S.sessionId);
 if(!ses)return;
 if(ses.status==="finished"){
   panel.innerHTML=`<div class="postgame-controls">
     <div><span class="badge">GAME FINISHED</span><h3>게임 종료</h3><p class="sub">학생들은 순위 발표 대기 화면에 있습니다.</p></div>
     <button class="btn" id="publishFinalRanking">🏆 랭킹 발표</button>
   </div>`;
   document.querySelector("#publishFinalRanking").onclick=async()=>{
     if(await publishRemoteRanking()){
       alert("학생들에게 최종 랭킹을 발표했습니다.");
       renderTeacherPostGameControls();
     }else alert("랭킹 발표에 실패했습니다.");
   };
 }else{
   panel.innerHTML="";
 }
}
function miniEditor(){
 $("#panel").innerHTML=`<div class="card"><span class="badge">VOCABULARY SHEET</span><h2>엑셀 단어장 업로드</h2>
 <p class="sub">엑셀의 첫 번째 열은 <b>영어</b>, 두 번째 열은 <b>한국어 뜻</b>으로 읽습니다. 헤더가 있어도 자동으로 제외합니다.</p>
 <div class="editor"><label>단어장 Excel 파일 (.xlsx / .xls)</label><input type="file" id="vocabFile" accept=".xlsx,.xls">
 <div class="actions"><button class="btn" id="importVocab">엑셀 단어장 불러오기</button></div></div>
 <div class="metrics"><div class="metric"><span>현재 등록 단어</span><b>${miniWords.length}</b></div><div class="metric"><span>문제 방식</span><b>영↔한</b></div><div class="metric"><span>출제</span><b>계속</b></div></div>
 <div id="vocabPreview">${vocabPreviewHTML()}</div>
 <div class="actions"><button class="btn secondary" id="clearVocab">단어장 초기화</button></div>
 <p class="note">학생 미니게임에서는 영→한, 한→영이 번갈아 출제됩니다. 한 바퀴가 끝나면 단어 순서를 다시 섞어 계속 출제합니다. 미니게임 점수는 본 게임 랭킹에 반영되지 않습니다.</p></div>`;
 $("#importVocab").onclick=importVocabExcel;
 $("#clearVocab").onclick=()=>{if(confirm("등록된 단어장을 기본 단어장으로 되돌릴까요?")){miniWords=JSON.parse(JSON.stringify(MINI_DEFAULT));localStorage.setItem("LQ_mini_words",JSON.stringify(miniWords));miniEditor()}};
}
function vocabPreviewHTML(){
 if(!miniWords.length)return `<div class="empty-report">등록된 단어가 없습니다.</div>`;
 return `<h3>단어 미리보기</h3><table><tr><th>#</th><th>English</th><th>한국어 뜻</th></tr>${miniWords.slice(0,50).map((w,i)=>`<tr><td>${i+1}</td><td>${esc(w.en)}</td><td>${esc(w.ko)}</td></tr>`).join("")}</table>${miniWords.length>50?`<p class="note">처음 50개만 미리 표시합니다. 총 ${miniWords.length}개가 저장되어 있습니다.</p>`:""}`;
}
async function importVocabExcel(){
 const file=$("#vocabFile").files[0];if(!file)return alert("엑셀 파일을 선택해 주세요.");
 if(typeof XLSX==="undefined")return alert("엑셀 읽기 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
 try{
   const buf=await file.arrayBuffer(), wb=XLSX.read(buf,{type:"array"}), ws=wb.Sheets[wb.SheetNames[0]];
   const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
   let pairs=rows.map(r=>({en:String(r[0]||"").trim(),ko:String(r[1]||"").trim()})).filter(x=>x.en&&x.ko);
   if(pairs.length && /english|영어|word|단어/i.test(pairs[0].en) && /korean|뜻|의미|한국어/i.test(pairs[0].ko))pairs.shift();
   if(!pairs.length)return alert("첫 번째 열과 두 번째 열에서 단어를 찾지 못했습니다.");
   miniWords=pairs;localStorage.setItem("LQ_mini_words",JSON.stringify(miniWords));await replaceRemoteVocab();alert(`${pairs.length}개의 단어를 불러왔습니다.`);miniEditor();
 }catch(e){console.error(e);alert("엑셀 파일을 읽지 못했습니다. 첫 시트의 A열=영어, B열=한국어 뜻인지 확인해 주세요.");}
}
function editor(){
 $("#panel").innerHTML=`<div class="card"><span class="badge">TEACHER EDITOR</span><h2>게임 문제 편집</h2><p class="sub">최대 15문항까지 만들 수 있습니다. 작성하지 않은 문항은 학생에게 표시되지 않습니다.</p>
 ${questions.map((q,i)=>`<div class="editor"><div style="display:flex;justify-content:space-between;align-items:center"><b>Q${i+1}</b><label style="margin:0"><input style="width:auto" type="checkbox" data-enabled="${i}" ${q.enabled?"checked":""}> 학생에게 출제</label></div><div class="row"><div><label>유형</label><select data-type="${i}"><option value="order" ${q.type==="order"?"selected":""}>대화 순서</option><option value="choice" ${q.type==="choice"?"selected":""}>객관식/빈칸</option><option value="speak" ${q.type==="speak"?"selected":""}>음성 인식</option></select></div><div><label>문제 지시문</label><input data-title="${i}" value="${esc(q.title)}"></div></div>
 ${q.type==="order"?`<label>대화 대본 (한 줄에 한 문장 · 입력 순서가 정답)</label><textarea data-lines="${i}">${esc(q.answer.join("\n"))}</textarea>`:""}
 ${q.type==="choice"?`<label>선택지 (한 줄에 하나)</label><textarea data-options="${i}">${esc(q.options.join("\n"))}</textarea><label>정답</label><input data-answer="${i}" value="${esc(q.answer)}">`:""}
 ${q.type==="speak"?`<label>학생이 읽을 목표 문장</label><input data-target="${i}" value="${esc(q.target)}">`:""}</div>`).join("")}
 <div class="actions"><button class="btn secondary" id="reset">기본 문제 복원</button><button class="btn" id="saveQ">변경사항 저장</button></div><p class="note">대화 순서 문제는 입력한 줄 순서가 정답입니다. '학생에게 출제'가 체크되어 있어도 지시문이 비어 있으면 출제되지 않습니다.</p></div>`;
 document.querySelectorAll("[data-type]").forEach(s=>s.onchange=()=>{questions[+s.dataset.type].type=s.value;localStorage.setItem("LQ_questions",JSON.stringify(questions));editor()});
 $("#saveQ").onclick=()=>{
  questions.forEach((q,i)=>{q.title=document.querySelector(`[data-title="${i}"]`).value.trim();q.enabled=document.querySelector(`[data-enabled="${i}"]`).checked && !!q.title;if(q.type==="order"){let a=document.querySelector(`[data-lines="${i}"]`).value.split("\n").map(x=>x.trim()).filter(Boolean);q.answer=a;q.items=shuffle([...a])}if(q.type==="choice"){q.options=document.querySelector(`[data-options="${i}"]`).value.split("\n").map(x=>x.trim()).filter(Boolean);q.answer=document.querySelector(`[data-answer="${i}"]`).value.trim()}if(q.type==="speak")q.target=document.querySelector(`[data-target="${i}"]`).value.trim()});
  localStorage.setItem("LQ_questions",JSON.stringify(questions));saveQuestionsRemote();alert("저장되었습니다. 학생 게임에 바로 반영됩니다.");
 };
 $("#reset").onclick=()=>{if(confirm("기본 문제로 되돌릴까요?")){questions=JSON.parse(JSON.stringify(DEFAULT));localStorage.setItem("LQ_questions",JSON.stringify(questions));editor()}};
}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function report(r){
 const classes=[...Array(11)].map((_,i)=>`2학년 ${i+1}반`);
 const classCounts=classes.map(c=>({c,n:r.filter(x=>x.student.className===c).length}));
 const tabs=`<div class="class-tabs"><button class="class-filter active" data-class="all">전체</button>${classes.map(c=>`<button class="class-filter" data-class="${c}">${c.replace("2학년 ","")}</button>`).join("")}</div>`;
 $("#panel").innerHTML=`<div class="card"><span class="badge">TEACHER REPORT</span><h2>학습 리포트</h2>
 <p class="sub">전체 현황 또는 반별 현황을 선택해서 확인할 수 있습니다.</p>${tabs}<div id="classReport"></div></div>`;
 function draw(cls){
   const data=cls==="all"?r:r.filter(x=>x.student.className===cls);
   const avg=data.length?Math.round(data.reduce((s,x)=>s+x.correct/x.total*100,0)/data.length):0;
   const avgScore=data.length?Math.round(data.reduce((s,x)=>s+x.score,0)/data.length):0;
   const speak=data.flatMap(x=>x.answers||[]).map(a=>a.speechScore).filter(v=>v!=null);
   const speakAvg=speak.length?Math.round(speak.reduce((a,b)=>a+b,0)/speak.length):"-";
   const latest={};
   data.forEach(x=>{const k=x.student.className+"|"+x.student.name;if(!latest[k]||new Date(x.date)>new Date(latest[k].date))latest[k]=x});
   const students=Object.values(latest).sort((a,b)=>b.score-a.score);
   $("#classReport").innerHTML=`<div class="metrics">
     <div class="metric"><span>${cls==="all"?"전체 참여 기록":"참여 기록"}</span><b>${data.length}</b></div>
     <div class="metric"><span>평균 정답률</span><b>${avg}%</b></div>
     <div class="metric"><span>평균 점수</span><b>${avgScore}</b></div>
   </div>
   ${cls==="all"?`<h3>반별 현황</h3><div class="class-summary">${classCounts.map(x=>{let cr=r.filter(y=>y.student.className===x.c);let ca=cr.length?Math.round(cr.reduce((s,y)=>s+y.correct/y.total*100,0)/cr.length):0;return `<div class="class-card"><b>${x.c}</b><span>${x.n}회 참여</span><strong>${ca}%</strong><small>평균 정답률</small></div>`}).join("")}</div>`:""}
   <h3>${cls==="all"?"학생별 최근 기록":cls+" 학생 현황"}</h3>
   ${students.length?`<table><tr><th>학급</th><th>이름</th><th>캐릭터</th><th>점수</th><th>정답률</th><th>Speaking</th></tr>${students.map(x=>{let ss=(x.answers||[]).map(a=>a.speechScore).filter(v=>v!=null);return `<tr><td>${esc(x.student.className)}</td><td>${esc(x.student.name)}</td><td>${PETS[x.student.pet]?.name||"-"}</td><td>${x.score}</td><td>${Math.round(x.correct/x.total*100)}%</td><td>${ss.length?Math.round(ss.reduce((a,b)=>a+b,0)/ss.length)+"점":"-"}</td></tr>`}).join("")}</table>`:`<div class="empty-report">아직 이 반의 플레이 기록이 없습니다.</div>`}
   <p class="note">Speaking 평균: ${speakAvg}${speakAvg==="-"?"":"점"} · 현재 데이터는 이 브라우저에 저장된 기록 기준입니다.</p>`;
 }
 document.querySelectorAll(".class-filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".class-filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");draw(b.dataset.class)});
 draw("all");
}
home();


// v18 override: final ranking control is always available in teacher Ranking tab,
// but publish button is enabled only after the game is finished.
async function rankingManager(){
 let sid=S.sessionId;
 if(!sid && supabaseClient){
   const {data}=await supabaseClient.from("game_sessions").select("id,status,class_name,started_at")
     .order("created_at",{ascending:false}).limit(1).maybeSingle().catch?.(()=>({data:null})) || {};
   sid=data?.id||null;
   if(sid)S.sessionId=sid;
 }
 let ses=sid?await getSessionById(sid):null;
 let rows=sid?await fetchRemoteRanking():[];
 const finished=ses?.status==="finished";
 $("#panel").innerHTML=`<div class="card"><span class="badge">RANKING CONTROL</span><h2>랭킹 관리</h2>
 <p class="sub">${finished?"게임이 종료되었습니다. 교사가 전체 순위를 확인한 뒤 학생들에게 발표할 수 있습니다.":"게임 진행 중에는 최종 랭킹 발표 버튼이 잠겨 있습니다."}</p>
 <div class="actions">
   <button class="btn" id="publishRankingV18" ${finished?"":"disabled"}>🏆 랭킹 발표</button>
 </div>
 <div class="card" style="margin-top:16px"><span class="badge">FULL RANKING</span><h2>전체 학생 랭킹</h2>
 ${rows.length?`<table><tr><th>등수</th><th>학급</th><th>이름</th><th>점수</th><th>정답</th><th>정답률</th></tr>
 ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.class_name)}</td><td>${esc(r.student_name)}</td><td>${r.score}</td><td>${r.correct_count}</td><td>${r.total_count?Math.round(r.correct_count/r.total_count*100):0}%</td></tr>`).join("")}</table>`:`<p class="sub">현재 학생 기록이 없습니다.</p>`}
 </div></div>`;
 const btn=$("#publishRankingV18");
 if(btn)btn.onclick=async()=>{
   if(!finished)return;
   if(await publishRemoteRanking())alert("학생들에게 최종 랭킹을 발표했습니다.");
   else alert("랭킹 발표에 실패했습니다.");
 };
}


// ===== v19 teacher navigation + ranking fixes =====
function setTeacherActiveTab(tabKey){
 document.querySelectorAll("[data-tab]").forEach(el=>{
   el.classList.toggle("active", el.dataset.tab===tabKey);
 });
}
async function rankingManager(){
 setTeacherActiveTab("ranking");
 if(typeof watchTeacherSessionForResults==="function") watchTeacherSessionForResults();

 let sid=S.sessionId;
 if(!sid && supabaseClient){
   const {data,error}=await supabaseClient.from("game_sessions")
     .select("id,status,class_name,started_at,ranking_published,is_active")
     .order("started_at",{ascending:false,nullsFirst:false})
     .limit(10);
   if(!error && data?.length){
     const pick=data.find(x=>x.is_active) || data[0];
     sid=pick.id; S.sessionId=sid;
   }
 }
 const ses=sid?await getSessionById(sid):null;
 const rows=sid?await fetchRemoteRanking():[];
 const canPublish=ses?.status==="finished";

 $("#panel").innerHTML=`<div class="card">
   <span class="badge">RANKING CONTROL</span><h2>랭킹 관리</h2>
   <p class="sub">${canPublish?"게임이 종료되었습니다. 전체 결과를 확인한 뒤 학생들에게 발표하세요.":"게임 진행 중입니다. 게임 종료 후 랭킹 발표 버튼이 활성화됩니다."}</p>
   <button class="btn full" id="publishRankingV19" ${canPublish?"":"disabled"}>🏆 랭킹 발표</button>
   <div class="card" style="margin-top:16px">
     <h2>전체 학생 랭킹</h2>
     ${rows.length?`<table><tr><th>등수</th><th>학급</th><th>이름</th><th>점수</th><th>정답</th><th>정답률</th></tr>
       ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.class_name)}</td><td>${esc(r.student_name)}</td><td>${r.score}</td><td>${r.correct_count}</td><td>${r.total_count?Math.round(r.correct_count/r.total_count*100):0}%</td></tr>`).join("")}
       </table>`:`<p class="sub">현재 학생 기록이 없습니다.</p>`}
   </div>
 </div>`;
 const b=$("#publishRankingV19");
 if(b)b.onclick=async()=>{
   if(!canPublish)return;
   if(await publishRemoteRanking()) alert("학생들에게 최종 랭킹을 발표했습니다.");
   else alert("랭킹 발표에 실패했습니다.");
 };
}
function bindTeacherTabsV19(){
 const tabs=document.querySelectorAll("[data-tab]");
 tabs.forEach(tab=>{
   tab.onclick=()=>{
     const key=tab.dataset.tab;
     setTeacherActiveTab(key);
     if(key==="ranking") return rankingManager();
     if(key==="session" && typeof sessionManager==="function") return sessionManager();
     if(key==="questions" && typeof editor==="function") return editor();
     if(key==="mini" && typeof miniEditor==="function") return miniEditor();
     if(key==="reports" && typeof reports==="function") return reports();
   };
 });
}

document.addEventListener("click",e=>{
 const el=e.target.closest("button,.tab,.teacher-tab,[data-tab]");
 if(!el)return;
 const txt=(el.textContent||"").trim();
 if(/랭킹\s*관리/.test(txt)){
   e.preventDefault();e.stopPropagation();
   setTeacherActiveTab("ranking");
   rankingManager();
 }
 // active visual state for teacher navigation
 const parent=el.parentElement;
 if(parent && (parent.querySelectorAll(".tab,.teacher-tab,[data-tab]").length>1)){
   parent.querySelectorAll(".tab,.teacher-tab,[data-tab]").forEach(x=>x.classList.remove("active"));
   el.classList.add("active");
 }
},true);
setTimeout(()=>{try{bindTeacherTabsV19()}catch(e){}},300);

// ===== v20 persistent reports + class rankings =====
async function upsertRemoteScore(finished=false){
 if(!supabaseClient||!S.student||!S.sessionId)return;
 const total=(S.playQuestions||[]).length||0;
 const correct=S.correct||0;
 const accuracy=total?Math.round(correct/total*100):0;
 let playSeconds=null, mainFinished=null;
 if(finished || S.mainFinishedAt){
   const endMs=S.mainFinishedAt||Date.now();
   const startMs=S.gameStartedAt || (S.sessionEndsAt && S.sessionDurationMinutes ? S.sessionEndsAt-S.sessionDurationMinutes*60000 : null);
   if(startMs) playSeconds=Math.max(0,Math.round((endMs-startMs)/1000));
   mainFinished=new Date(endMs).toISOString();
 }
 const row={
   session_id:S.sessionId,class_name:S.student.className,student_name:S.student.name,
   character_key:S.student.pet,score:S.score||0,correct_count:correct,total_count:total,
   finished:!!finished,activity_status:S.activityStatus||"main_game",
   current_question:Math.min((S.q||0)+1,total),mini_streak:S.miniStreak||0,
   accuracy,main_finished_at:mainFinished,play_time_seconds:playSeconds,
   last_activity_at:new Date().toISOString(),updated_at:new Date().toISOString()
 };
 const {error}=await supabaseClient.from("student_scores").upsert(row,{onConflict:"session_id,class_name,student_name"});
 if(error)console.error(error);
}
function formatPlayTime(sec){
 if(sec===null||sec===undefined)return "-";
 sec=Math.max(0,Number(sec)||0);
 const m=Math.floor(sec/60),s=Math.floor(sec%60);
 return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
async function latestSessionForClass(className){
 const {data,error}=await supabaseClient.from("game_sessions")
   .select("*").eq("class_name",className)
   .order("started_at",{ascending:false,nullsFirst:false}).limit(1).maybeSingle();
 if(error){console.error(error);return null} return data;
}
async function classRankingRows(className){
 const ses=await latestSessionForClass(className);
 if(!ses)return {session:null,rows:[]};
 const {data,error}=await supabaseClient.from("student_scores")
   .select("*").eq("session_id",ses.id)
   .order("score",{ascending:false}).order("play_time_seconds",{ascending:true,nullsFirst:false});
 if(error){console.error(error);return {session:ses,rows:[]}}
 return {session:ses,rows:data||[]};
}
async function rankingManager(){
 setTeacherActiveTab("ranking");
 if(typeof watchTeacherSessionForResults==="function")watchTeacherSessionForResults();
 $("#panel").innerHTML=`<div class="card"><span class="badge">RANKING BY CLASS</span><h2>랭킹 관리</h2>
 <div class="class-tabs" id="rankClassTabs">${[...Array(11)].map((_,i)=>`<button class="class-tab ${i===0?"active":""}" data-class="2학년 ${i+1}반">${i+1}반</button>`).join("")}</div>
 <div id="classRankingBody"><p class="sub">랭킹을 불러오는 중…</p></div></div>`;
 async function show(cls){
   document.querySelectorAll("#rankClassTabs .class-tab").forEach(x=>x.classList.toggle("active",x.dataset.class===cls));
   const {session,rows}=await classRankingRows(cls);
   const body=$("#classRankingBody");
   if(!session){body.innerHTML=`<div class="empty-report">아직 ${esc(cls)} 게임 기록이 없습니다.</div>`;return;}
   const canPublish=session.status==="finished"&&!session.ranking_published;
   S.sessionId=session.id;
   body.innerHTML=`<div class="rank-session-head"><div><b>${esc(cls)}</b><span>${session.status==="finished"?"게임 종료":"게임 진행/대기 중"}</span></div>
   <button class="btn" id="publishClassRank" ${canPublish?"":"disabled"}>🏆 랭킹 발표</button></div>
   ${rows.length?`<div class="table-wrap"><table><tr><th>등수</th><th>이름</th><th>점수</th><th>플레이 타임</th><th>정답</th><th>정답률</th></tr>
   ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.student_name)}</td><td>${r.score}</td><td>${formatPlayTime(r.play_time_seconds)}</td><td>${r.correct_count}/${r.total_count}</td><td>${r.accuracy??(r.total_count?Math.round(r.correct_count/r.total_count*100):0)}%</td></tr>`).join("")}</table></div>`:`<p class="sub">이 세션에 학생 기록이 없습니다.</p>`}`;
   const pb=$("#publishClassRank");if(pb)pb.onclick=async()=>{S.sessionId=session.id;if(await publishRemoteRanking()){alert(`${cls} 랭킹을 발표했습니다.`);show(cls);}};
 }
 document.querySelectorAll("#rankClassTabs .class-tab").forEach(b=>b.onclick=()=>show(b.dataset.class));
 show("2학년 1반");
}
async function reports(){
 setTeacherActiveTab("reports");
 $("#panel").innerHTML=`<div class="card"><span class="badge">PERSISTENT REPORTS</span><h2>학생 플레이 리포트</h2>
 <p class="sub">Supabase에 저장된 실제 플레이 기록입니다. 브라우저를 닫아도 기록이 유지됩니다.</p>
 <div class="class-tabs" id="reportClassTabs">${[...Array(11)].map((_,i)=>`<button class="class-tab ${i===0?"active":""}" data-class="2학년 ${i+1}반">${i+1}반</button>`).join("")}</div>
 <div id="reportBody"><p class="sub">리포트를 불러오는 중…</p></div></div>`;
 async function show(cls){
   document.querySelectorAll("#reportClassTabs .class-tab").forEach(x=>x.classList.toggle("active",x.dataset.class===cls));
   const {data,error}=await supabaseClient.from("student_scores")
     .select("*,game_sessions!inner(started_at,status)")
     .eq("class_name",cls).order("updated_at",{ascending:false});
   const body=$("#reportBody");
   if(error){console.error(error);body.innerHTML=`<div class="empty-report">리포트를 불러오지 못했습니다.</div>`;return;}
   if(!data?.length){body.innerHTML=`<div class="empty-report">아직 ${esc(cls)} 플레이 기록이 없습니다.</div>`;return;}
   body.innerHTML=`<div class="table-wrap"><table><tr><th>학생</th><th>점수</th><th>플레이 타임</th><th>정답</th><th>정답률</th><th>상태</th><th>플레이 날짜</th></tr>
   ${data.map(r=>`<tr><td>${esc(r.student_name)}</td><td>${r.score}</td><td>${formatPlayTime(r.play_time_seconds)}</td><td>${r.correct_count}/${r.total_count}</td><td>${r.accuracy??(r.total_count?Math.round(r.correct_count/r.total_count*100):0)}%</td><td>${r.finished?"완료":esc(r.activity_status||"진행 중")}</td><td>${r.game_sessions?.started_at?new Date(r.game_sessions.started_at).toLocaleString("ko-KR"):"-"}</td></tr>`).join("")}</table></div>`;
 }
 document.querySelectorAll("#reportClassTabs .class-tab").forEach(b=>b.onclick=()=>show(b.dataset.class));
 show("2학년 1반");
}


// ===== v21: reliable persistence, play time, class reset =====

// Preserve the shared server start time as the source of truth.
async function beginSharedGame(ses){
 clearInterval(S.lobbyPoll);S.lobbyPoll=null;
 S.sessionId=ses.id;
 S.sessionEndsAt=new Date(ses.ends_at).getTime();
 S.sessionDurationMinutes=Number(ses.duration_minutes)||null;
 S.gameStartedAt=ses.started_at ? new Date(ses.started_at).getTime() : Date.now();
 S.timeExpired=false;
 S.activityStatus="main_game";
 S.mainFinishedAt=null;
 await upsertRemoteScore(false);
 subscribeSession();
 question();
}

// Always read server session start when calculating play time.
async function calculateMainPlaySeconds(){
 if(!S.sessionId)return null;
 let startMs=S.gameStartedAt||null;
 if(!startMs){
   const ses=await getSessionById(S.sessionId);
   if(ses?.started_at)startMs=new Date(ses.started_at).getTime();
 }
 if(!startMs)return null;
 const endMs=S.mainFinishedAt||Date.now();
 return Math.max(0,Math.round((endMs-startMs)/1000));
}

async function upsertRemoteScore(finished=false){
 if(!supabaseClient||!S.student||!S.sessionId)return;
 const total=(S.playQuestions||[]).length||0;
 const correct=Number(S.correct)||0;
 const accuracy=total?Math.round(correct/total*100):0;

 let playSeconds=null;
 let mainFinishedAt=null;
 if(S.mainFinishedAt){
   playSeconds=await calculateMainPlaySeconds();
   mainFinishedAt=new Date(S.mainFinishedAt).toISOString();
 }

 const row={
   session_id:S.sessionId,
   class_name:S.student.className,
   student_name:S.student.name,
   character_key:S.student.pet,
   score:Number(S.score)||0,
   correct_count:correct,
   total_count:total,
   finished:!!finished,
   activity_status:S.activityStatus||"main_game",
   current_question:Math.min((Number(S.q)||0)+1,total),
   mini_streak:Number(S.miniStreak)||0,
   accuracy,
   main_finished_at:mainFinishedAt,
   play_time_seconds:playSeconds,
   last_activity_at:new Date().toISOString(),
   updated_at:new Date().toISOString()
 };
 const {error}=await supabaseClient.from("student_scores")
   .upsert(row,{onConflict:"session_id,class_name,student_name"});
 if(error)console.error("student_scores save failed:",error);
}

// Call exactly when the main game is completed, before mini-game time begins.
async function markMainGameFinished(){
 if(!S.mainFinishedAt)S.mainFinishedAt=Date.now();
 S.activityStatus="mini_game";
 await upsertRemoteScore(true);
}

// If the original results() exists, wrap it instead of relying on brittle source replacement.
if(typeof results==="function"){
 const _v21Results=results;
 results=function(){
   if(!S.mainFinishedAt){
     S.mainFinishedAt=Date.now();
     S.activityStatus="mini_game";
     upsertRemoteScore(true);
   }
   return _v21Results.apply(this,arguments);
 };
}

function formatPlayTime(sec){
 if(sec===null||sec===undefined||sec==="")return "-";
 const n=Math.max(0,Number(sec)||0);
 const m=Math.floor(n/60),s=Math.floor(n%60);
 return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

async function latestSessionForClass(className){
 const {data,error}=await supabaseClient.from("game_sessions")
   .select("*").eq("class_name",className)
   .order("started_at",{ascending:false,nullsFirst:false}).limit(1);
 if(error){console.error(error);return null}
 return data?.[0]||null;
}

async function classRankingRows(className){
 const ses=await latestSessionForClass(className);
 if(!ses)return {session:null,rows:[]};
 const {data,error}=await supabaseClient.from("student_scores")
   .select("*").eq("session_id",ses.id)
   .order("score",{ascending:false})
   .order("play_time_seconds",{ascending:true,nullsFirst:false});
 if(error){console.error(error);return {session:ses,rows:[]}}
 return {session:ses,rows:data||[]};
}

// Completely delete one class's scores, lobby records, and sessions.
// This intentionally also removes that class's historical reports.
async function resetClassRecords(className){
 const {data:sessions,error:e1}=await supabaseClient.from("game_sessions")
   .select("id").eq("class_name",className);
 if(e1){console.error(e1);return {ok:false,message:"세션 조회 실패"}}
 const ids=(sessions||[]).map(x=>x.id);

 if(ids.length){
   const {error:e2}=await supabaseClient.from("student_scores").delete().in("session_id",ids);
   if(e2){console.error(e2);return {ok:false,message:"학생 점수 삭제 실패"}}

   const {error:e3}=await supabaseClient.from("session_players").delete().in("session_id",ids);
   if(e3){console.error(e3);return {ok:false,message:"대기실 기록 삭제 실패"}}

   const {error:e4}=await supabaseClient.from("game_sessions").delete().in("id",ids);
   if(e4){console.error(e4);return {ok:false,message:"게임 세션 삭제 실패"}}
 }
 return {ok:true};
}

async function rankingManager(){
 setTeacherActiveTab("ranking");
 if(typeof watchTeacherSessionForResults==="function")watchTeacherSessionForResults();

 $("#panel").innerHTML=`<div class="card"><span class="badge">RANKING BY CLASS</span><h2>랭킹 관리</h2>
 <p class="sub">각 반의 최근 게임 결과만 표시합니다. 기록 초기화는 해당 반의 랭킹과 리포트를 모두 삭제합니다.</p>
 <div class="class-tabs" id="rankClassTabs">${[...Array(11)].map((_,i)=>`<button class="class-tab ${i===0?"active":""}" data-class="2학년 ${i+1}반">${i+1}반</button>`).join("")}</div>
 <div id="classRankingBody"><p class="sub">랭킹을 불러오는 중…</p></div></div>`;

 async function show(cls){
   document.querySelectorAll("#rankClassTabs .class-tab").forEach(x=>x.classList.toggle("active",x.dataset.class===cls));
   const {session,rows}=await classRankingRows(cls);
   const body=$("#classRankingBody");

   body.innerHTML=`<div class="rank-tools">
     <div><b>${esc(cls)}</b><span>${session?(session.status==="finished"?"게임 종료":"게임 진행/대기 중"):"기록 없음"}</span></div>
     <div class="rank-tool-buttons">
       ${session?`<button class="btn" id="publishClassRank" ${session.status==="finished"&&!session.ranking_published?"":"disabled"}>🏆 랭킹 발표</button>`:""}
       <button class="btn danger" id="resetClassRank">🗑️ ${esc(cls.replace("2학년 ",""))} 기록 전체 초기화</button>
     </div>
   </div>
   ${rows.length?`<div class="table-wrap"><table><tr><th>등수</th><th>이름</th><th>점수</th><th>플레이 타임</th><th>정답</th><th>정답률</th></tr>
   ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.student_name)}</td><td>${r.score}</td><td>${formatPlayTime(r.play_time_seconds)}</td><td>${r.correct_count}/${r.total_count}</td><td>${r.accuracy??(r.total_count?Math.round(r.correct_count/r.total_count*100):0)}%</td></tr>`).join("")}</table></div>`:`<div class="empty-report">${esc(cls)}에 저장된 랭킹 기록이 없습니다.</div>`}`;

   const pb=$("#publishClassRank");
   if(pb)pb.onclick=async()=>{S.sessionId=session.id;if(await publishRemoteRanking()){alert(`${cls} 랭킹을 발표했습니다.`);show(cls);}};

   $("#resetClassRank").onclick=async()=>{
     const ok=confirm(`${cls}의 랭킹과 모든 플레이 리포트를 삭제할까요?\n\n삭제한 기록은 복구할 수 없습니다.`);
     if(!ok)return;
     const typed=confirm(`정말 ${cls} 기록을 전체 초기화할까요?`);
     if(!typed)return;
     const result=await resetClassRecords(cls);
     if(result.ok){if(S.sessionId===session?.id)S.sessionId=null;alert(`${cls} 기록을 모두 초기화했습니다.`);show(cls);}
     else alert(`초기화하지 못했습니다: ${result.message}`);
   };
 }
 document.querySelectorAll("#rankClassTabs .class-tab").forEach(b=>b.onclick=()=>show(b.dataset.class));
 show("2학년 1반");
}

async function reports(){
 setTeacherActiveTab("reports");
 $("#panel").innerHTML=`<div class="card"><span class="badge">SUPABASE REPORTS</span><h2>학생 플레이 리포트</h2>
 <p class="sub">학생이 실제 플레이하면서 Supabase에 저장한 기록을 반별로 표시합니다.</p>
 <div class="class-tabs" id="reportClassTabs">${[...Array(11)].map((_,i)=>`<button class="class-tab ${i===0?"active":""}" data-class="2학년 ${i+1}반">${i+1}반</button>`).join("")}</div>
 <div id="reportBody"><p class="sub">리포트를 불러오는 중…</p></div></div>`;

 async function show(cls){
   document.querySelectorAll("#reportClassTabs .class-tab").forEach(x=>x.classList.toggle("active",x.dataset.class===cls));
   const {data,error}=await supabaseClient.from("student_scores")
     .select("student_name,score,play_time_seconds,correct_count,total_count,accuracy,finished,activity_status,updated_at,session_id")
     .eq("class_name",cls).order("updated_at",{ascending:false});
   const body=$("#reportBody");
   if(error){console.error(error);body.innerHTML=`<div class="empty-report">리포트를 불러오지 못했습니다.</div>`;return;}
   if(!data?.length){body.innerHTML=`<div class="empty-report">아직 ${esc(cls)} 플레이 기록이 없습니다.</div>`;return;}

   body.innerHTML=`<div class="report-summary">
     <div><span>플레이 기록</span><b>${data.length}</b></div>
     <div><span>평균 정답률</span><b>${Math.round(data.reduce((a,r)=>a+(r.accuracy??(r.total_count?Math.round(r.correct_count/r.total_count*100):0)),0)/data.length)}%</b></div>
     <div><span>평균 점수</span><b>${Math.round(data.reduce((a,r)=>a+(Number(r.score)||0),0)/data.length)}</b></div>
   </div>
   <div class="table-wrap"><table><tr><th>학생</th><th>점수</th><th>플레이 타임</th><th>정답</th><th>정답률</th><th>상태</th><th>최근 저장</th></tr>
   ${data.map(r=>`<tr><td>${esc(r.student_name)}</td><td>${r.score}</td><td>${formatPlayTime(r.play_time_seconds)}</td><td>${r.correct_count}/${r.total_count}</td><td>${r.accuracy??(r.total_count?Math.round(r.correct_count/r.total_count*100):0)}%</td><td>${r.finished?"완료":esc(r.activity_status||"진행 중")}</td><td>${new Date(r.updated_at).toLocaleString("ko-KR")}</td></tr>`).join("")}</table></div>`;
 }
 document.querySelectorAll("#reportClassTabs .class-tab").forEach(b=>b.onclick=()=>show(b.dataset.class));
 show("2학년 1반");
}


// ===== v22: verified Supabase reports + reset =====
async function getAllClassScores(className){
 const {data,error}=await supabaseClient.from("student_scores")
   .select("*").eq("class_name",className).order("updated_at",{ascending:false});
 if(error){console.error("REPORT SELECT ERROR",error);throw error}
 return data||[];
}

async function resetClassRecordsV22(className){
 try{
   // Delete scores directly by class first. This avoids depending on session lookup.
   let q1=await supabaseClient.from("student_scores").delete().eq("class_name",className).select("id");
   if(q1.error)throw q1.error;

   // Find all sessions for this class and remove lobby/session rows.
   const q2=await supabaseClient.from("game_sessions").select("id").eq("class_name",className);
   if(q2.error)throw q2.error;
   const ids=(q2.data||[]).map(x=>x.id);
   if(ids.length){
     const q3=await supabaseClient.from("session_players").delete().in("session_id",ids).select("id");
     if(q3.error)throw q3.error;
     const q4=await supabaseClient.from("game_sessions").delete().in("id",ids).select("id");
     if(q4.error)throw q4.error;
   }

   // Verify deletion instead of assuming success.
   const verify=await supabaseClient.from("student_scores").select("id").eq("class_name",className);
   if(verify.error)throw verify.error;
   if((verify.data||[]).length)throw new Error("삭제 후에도 학생 기록이 남아 있습니다.");
   return {ok:true,deletedScores:(q1.data||[]).length};
 }catch(err){
   console.error("RESET ERROR",err);
   return {ok:false,message:err?.message||String(err)};
 }
}

async function reports(){
 setTeacherActiveTab("reports");
 $("#panel").innerHTML=`<div class="card"><span class="badge">SUPABASE REPORTS</span><h2>학생 플레이 리포트</h2>
 <p class="sub">Supabase에 실제 저장된 학생 기록을 반별로 분석합니다.</p>
 <div class="class-tabs" id="reportClassTabs">${[...Array(11)].map((_,i)=>`<button class="class-tab ${i===0?"active":""}" data-class="2학년 ${i+1}반">${i+1}반</button>`).join("")}</div>
 <div id="reportBody"><p class="sub">리포트를 불러오는 중…</p></div></div>`;

 async function show(cls){
   document.querySelectorAll("#reportClassTabs .class-tab").forEach(x=>x.classList.toggle("active",x.dataset.class===cls));
   const body=$("#reportBody");
   body.innerHTML=`<p class="sub">Supabase에서 ${esc(cls)} 기록을 불러오는 중…</p>`;
   try{
     const data=await getAllClassScores(cls);
     if(!data.length){body.innerHTML=`<div class="empty-report">아직 ${esc(cls)}에 저장된 플레이 기록이 없습니다.</div>`;return;}
     const avgAcc=Math.round(data.reduce((a,r)=>a+(Number(r.accuracy) || (r.total_count?Math.round(Number(r.correct_count||0)/Number(r.total_count)*100):0)),0)/data.length);
     const avgScore=Math.round(data.reduce((a,r)=>a+Number(r.score||0),0)/data.length);
     const timed=data.filter(r=>r.play_time_seconds!==null&&r.play_time_seconds!==undefined);
     const avgTime=timed.length?Math.round(timed.reduce((a,r)=>a+Number(r.play_time_seconds||0),0)/timed.length):null;

     body.innerHTML=`<div class="report-summary">
       <div><span>저장 기록</span><b>${data.length}</b></div>
       <div><span>평균 점수</span><b>${avgScore}</b></div>
       <div><span>평균 정답률</span><b>${avgAcc}%</b></div>
       <div><span>평균 플레이 타임</span><b>${formatPlayTime(avgTime)}</b></div>
     </div>
     <div class="table-wrap"><table><tr><th>학생</th><th>점수</th><th>플레이 타임</th><th>정답</th><th>정답률</th><th>현재 상태</th><th>최근 저장</th></tr>
     ${data.map(r=>`<tr><td>${esc(r.student_name||"-")}</td><td>${Number(r.score||0)}</td><td>${formatPlayTime(r.play_time_seconds)}</td><td>${Number(r.correct_count||0)}/${Number(r.total_count||0)}</td><td>${Number(r.accuracy) || (r.total_count?Math.round(Number(r.correct_count||0)/Number(r.total_count)*100):0)}%</td><td>${r.finished?"완료":esc(r.activity_status||"진행 중")}</td><td>${r.updated_at?new Date(r.updated_at).toLocaleString("ko-KR"):"-"}</td></tr>`).join("")}</table></div>`;
   }catch(err){
     body.innerHTML=`<div class="report-error"><b>⚠️ 리포트를 불러오지 못했습니다.</b><span>${esc(err?.message||String(err))}</span></div>`;
   }
 }
 document.querySelectorAll("#reportClassTabs .class-tab").forEach(b=>b.onclick=()=>show(b.dataset.class));
 show("2학년 1반");
}

async function rankingManager(){
 setTeacherActiveTab("ranking");
 if(typeof watchTeacherSessionForResults==="function")watchTeacherSessionForResults();
 $("#panel").innerHTML=`<div class="card"><span class="badge">RANKING BY CLASS</span><h2>랭킹 관리</h2>
 <p class="sub">반별 랭킹을 확인하거나 해당 반의 모든 기록을 초기화할 수 있습니다.</p>
 <div class="class-tabs" id="rankClassTabs">${[...Array(11)].map((_,i)=>`<button class="class-tab ${i===0?"active":""}" data-class="2학년 ${i+1}반">${i+1}반</button>`).join("")}</div>
 <div id="classRankingBody"></div></div>`;

 async function show(cls){
   document.querySelectorAll("#rankClassTabs .class-tab").forEach(x=>x.classList.toggle("active",x.dataset.class===cls));
   const body=$("#classRankingBody");
   try{
     const data=await getAllClassScores(cls);
     // Rank the most recent session only, preventing old games from mixing into current rank.
     let rows=[];
     let session=null;
     const latest=await latestSessionForClass(cls);
     if(latest){
       session=latest;
       rows=data.filter(r=>r.session_id===latest.id).sort((a,b)=>(Number(b.score||0)-Number(a.score||0))||((a.play_time_seconds??Infinity)-(b.play_time_seconds??Infinity)));
     }
     body.innerHTML=`<div class="rank-tools"><div><b>${esc(cls)}</b><span>${rows.length}명 기록</span></div>
       <div class="rank-tool-buttons">${session?`<button class="btn" id="publishClassRank" ${session.status==="finished"&&!session.ranking_published?"":"disabled"}>🏆 랭킹 발표</button>`:""}
       <button class="btn danger" id="resetClassRank">🗑️ ${esc(cls.replace("2학년 ",""))} 기록 전체 초기화</button></div></div>
       ${rows.length?`<div class="table-wrap"><table><tr><th>등수</th><th>이름</th><th>점수</th><th>플레이 타임</th><th>정답</th><th>정답률</th></tr>
       ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.student_name)}</td><td>${Number(r.score||0)}</td><td>${formatPlayTime(r.play_time_seconds)}</td><td>${Number(r.correct_count||0)}/${Number(r.total_count||0)}</td><td>${Number(r.accuracy)||(r.total_count?Math.round(Number(r.correct_count||0)/Number(r.total_count)*100):0)}%</td></tr>`).join("")}</table></div>`:`<div class="empty-report">${esc(cls)}의 현재 랭킹 기록이 없습니다.</div>`}`;
     const pb=$("#publishClassRank");if(pb)pb.onclick=async()=>{S.sessionId=session.id;if(await publishRemoteRanking()){alert(`${cls} 랭킹을 발표했습니다.`);show(cls);}};
     $("#resetClassRank").onclick=async()=>{
       if(!confirm(`${cls}의 랭킹과 리포트를 모두 삭제할까요?\n삭제 후 복구할 수 없습니다.`))return;
       const btn=$("#resetClassRank");btn.disabled=true;btn.textContent="삭제 중…";
       const result=await resetClassRecordsV22(cls);
       if(result.ok){if(session&&S.sessionId===session.id)S.sessionId=null;alert(`${cls} 기록 ${result.deletedScores}건을 삭제했습니다.`);show(cls);}
       else{btn.disabled=false;btn.textContent=`🗑️ ${cls.replace("2학년 ","")} 기록 전체 초기화`;alert(`초기화 실패: ${result.message}`);}
     };
   }catch(err){
     body.innerHTML=`<div class="report-error"><b>⚠️ 랭킹을 불러오지 못했습니다.</b><span>${esc(err?.message||String(err))}</span></div>`;
   }
 }
 document.querySelectorAll("#rankClassTabs .class-tab").forEach(b=>b.onclick=()=>show(b.dataset.class));
 show("2학년 1반");
}


// ===== v24: fixed lobby transition + working multi-select kick =====
async function kickSelectedPlayersV24(sessionId,ids){
 const {error}=await supabaseClient.from("session_players").delete().eq("session_id",sessionId).in("id",ids);
 if(error){console.error("KICK ERROR",error);return {ok:false,message:error.message}}
 return {ok:true};
}
function subscribeStudentKickV24(sessionId){
 clearInterval(S.kickPoll);
 S.kickPoll=setInterval(async()=>{
   if(!S.student?.name||!sessionId)return;
   const {data,error}=await supabaseClient.from("session_players")
     .select("id").eq("session_id",sessionId)
     .eq("class_name",S.student.className).eq("student_name",S.student.name).maybeSingle();
   if(error)return;
   if(!data){
     clearInterval(S.kickPoll);clearInterval(S.lobbyPoll);
     try{if(S.lobbyChannel)supabaseClient.removeChannel(S.lobbyChannel)}catch(e){}
     alert("선생님이 대기실에서 퇴장시켰습니다. 학급과 이름을 다시 설정해 주세요.");
     S.sessionId=null;S.student=null;home();
   }
 },800);
}
// Keep the known-working v22 start listener and add kick monitoring without calling missing functions.
function lobbyScreen(ses){
 S.sessionId=ses.id;
 layout(`<div class="card hero waiting-screen"><div class="waiting-icon">🎮</div><span class="badge">GAME LOBBY</span><h1>게임 대기실</h1><p class="sub"><b>${esc(S.student.name)}</b> 입장 완료!<br>선생님이 게임을 시작할 때까지 기다려 주세요.</p><div class="waiting-dots"><span></span><span></span><span></span></div><div class="note">시작 신호 대기 중…</div></div>`);
 try{if(S.lobbyChannel)supabaseClient.removeChannel(S.lobbyChannel)}catch(e){}
 S.lobbyChannel=supabaseClient.channel(`lobby-${ses.id}`)
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"game_sessions",filter:`id=eq.${ses.id}`},p=>{
     if(p.new?.status==="playing"){clearInterval(S.kickPoll);beginSharedGame(p.new)}
   }).subscribe();
 clearInterval(S.lobbyPoll);
 S.lobbyPoll=setInterval(async()=>{
   const x=await getSessionById(ses.id);
   if(x?.status==="playing"){clearInterval(S.lobbyPoll);clearInterval(S.kickPoll);beginSharedGame(x)}
 },1000);
 subscribeStudentKickV24(ses.id);
}

async function renderTeacherProgress(ses,minutes){
 const h=$("#lobbyControl");if(!h)return;
 const players=await fetchLobbyPlayers(ses.id),rows=await fetchSessionProgress(ses.id),latest=await getSessionById(ses.id);
 const status=latest?.status||ses.status,playing=status==="playing",finished=status==="finished";
 const allMainDone=rows.length>0&&rows.every(r=>["mini_game","stamp_done","waiting"].includes(r.activity_status));
 const remaining=latest?.ends_at?Math.max(0,new Date(latest.ends_at).getTime()-Date.now()):0;

 const kickBlock=status==="waiting"?`
 <div class="kick-box">
   <div class="kick-toolbar">
     <label><input type="checkbox" id="selectAllPlayersV24"> 전체 선택</label>
     <span id="kickCountV24">0명 선택</span>
     <button class="btn danger" id="kickSelectedV24" disabled>🚪 선택 학생 강퇴</button>
   </div>
   <div class="kick-list">${players.length?players.map(p=>`
     <label class="kick-row">
       <input type="checkbox" class="kick-player-v24" value="${p.id}">
       <span>${PETS[p.character_key]?.emoji||"🙂"}</span>
       <b>${esc(p.student_name)}</b>
       <small>${esc(p.class_name)}</small>
     </label>`).join(""):`<p class="note">학생 입장을 기다리는 중…</p>`}</div>
 </div>`:"";

 h.innerHTML=`<div class="teacher-lobby">
 <div class="lobby-head"><div><span>${playing?"현재 참가":"현재 접속"}</span><b>${players.length}명</b></div>
 <div class="teacher-session-actions">${status==="waiting"?`<button class="btn" id="startAll" ${players.length?"":"disabled"}>▶ 게임 시작</button>`:playing?`<button class="btn danger" id="forceEnd">⏹ 게임 즉시 종료</button>`:`<span class="badge">게임 종료</span>`}</div></div>
 ${kickBlock}
 ${playing?`<div class="teacher-session-summary"><span>⏱ 남은 시간 <b>${formatTime(remaining)}</b></span>${allMainDone?`<strong>✅ 모두 본게임 완료 — 지금 종료 가능</strong>`:""}<div id="teacherPostGameControls"></div></div>`:""}
 <div class="progress-table-wrap"><table><tr><th>학생</th><th>현재 상태</th><th>점수</th><th>정답</th></tr>
 ${rows.length?rows.map(r=>`<tr><td>${esc(r.student_name)}</td><td>${statusLabel(r)}</td><td>${r.score}</td><td>${r.correct_count}/${r.total_count}</td></tr>`).join(""):players.map(p=>`<tr><td>${esc(p.student_name)}</td><td>⏳ 대기실</td><td>-</td><td>-</td></tr>`).join("")}
 </table></div><p class="note">${esc(ses.class_name)} · ${minutes}분</p></div>`;

 if(status==="waiting"){
   const checks=[...document.querySelectorAll(".kick-player-v24")];
   const all=$("#selectAllPlayersV24"),btn=$("#kickSelectedV24"),count=$("#kickCountV24");
   const sync=()=>{const picked=checks.filter(x=>x.checked);count.textContent=`${picked.length}명 선택`;btn.disabled=!picked.length;if(all)all.checked=checks.length>0&&picked.length===checks.length;};
   checks.forEach(x=>x.onchange=sync);
   if(all)all.onchange=()=>{checks.forEach(x=>x.checked=all.checked);sync();};
   if(btn)btn.onclick=async()=>{
     const picked=checks.filter(x=>x.checked);
     const ids=picked.map(x=>Number(x.value));
     const names=picked.map(x=>x.closest(".kick-row").querySelector("b").textContent);
     if(!ids.length)return;
     if(!confirm(`${names.join(", ")} 학생을 대기실에서 강퇴할까요?`))return;
     btn.disabled=true;btn.textContent="강퇴 중…";
     const result=await kickSelectedPlayersV24(ses.id,ids);
     if(!result.ok){alert(`강퇴 실패: ${result.message}`);return renderTeacherProgress(ses,minutes);}
     await renderTeacherProgress(ses,minutes);
   };
   if($("#startAll"))$("#startAll").onclick=async()=>{
     if(!confirm(`${players.length}명이 입장했습니다. 지금 동시에 시작할까요?`))return;
     const x=await startRemoteSession(ses.id,minutes);if(!x)return alert("게임 시작 실패");
     S.sessionEndsAt=new Date(x.ends_at).getTime();renderTeacherProgress(x,minutes);subscribeTeacherProgress(x,minutes);
   };
 }
 if(playing&&$("#forceEnd"))$("#forceEnd").onclick=async()=>{
   if(!confirm("남은 시간과 관계없이 지금 전 학생의 게임을 종료할까요?"))return;
   const {error}=await supabaseClient.from("game_sessions").update({status:"finished",is_active:false}).eq("id",ses.id);
   if(error)return alert("즉시 종료 실패");
   alert("게임을 종료했습니다. 학생들은 순위 발표 대기 화면으로 이동합니다.");
   renderTeacherProgress({...ses,status:"finished"},minutes);
 };
}


// ===== v25: immediate realtime kick detection =====
function stopKickWatchV25(){
 clearInterval(S.kickPoll);S.kickPoll=null;
 try{if(S.kickChannel)supabaseClient.removeChannel(S.kickChannel)}catch(e){}
 S.kickChannel=null;
}
function handleKickedV25(){
 if(S._kickHandled)return;
 S._kickHandled=true;
 stopKickWatchV25();
 clearInterval(S.lobbyPoll);
 try{if(S.lobbyChannel)supabaseClient.removeChannel(S.lobbyChannel)}catch(e){}
 alert("선생님이 대기실에서 퇴장시켰습니다. 학급과 이름을 다시 설정해 주세요.");
 S.sessionId=null;S.student=null;
 home();
 setTimeout(()=>{S._kickHandled=false},500);
}
async function verifyStillInLobbyV25(sessionId){
 if(!S.student?.name||!sessionId)return;
 const {data,error}=await supabaseClient.from("session_players")
   .select("id").eq("session_id",sessionId)
   .eq("class_name",S.student.className)
   .eq("student_name",S.student.name).maybeSingle();
 if(!error&&!data)handleKickedV25();
}
function subscribeStudentKickV25(sessionId){
 stopKickWatchV25();
 S._kickHandled=false;

 // Primary path: Supabase Realtime DELETE event, filtered by session.
 S.kickChannel=supabaseClient.channel(`kick-v25-${sessionId}-${Date.now()}`)
   .on("postgres_changes",
     {event:"DELETE",schema:"public",table:"session_players",filter:`session_id=eq.${sessionId}`},
     ()=>verifyStillInLobbyV25(sessionId)
   ).subscribe();

 // Backup path: poll every 350ms so a missed realtime event still kicks quickly.
 S.kickPoll=setInterval(()=>verifyStillInLobbyV25(sessionId),350);
}

function lobbyScreen(ses){
 S.sessionId=ses.id;
 layout(`<div class="card hero waiting-screen"><div class="waiting-icon">🎮</div><span class="badge">GAME LOBBY</span><h1>게임 대기실</h1><p class="sub"><b>${esc(S.student.name)}</b> 입장 완료!<br>선생님이 게임을 시작할 때까지 기다려 주세요.</p><div class="waiting-dots"><span></span><span></span><span></span></div><div class="note">시작 신호 대기 중…</div></div>`);

 try{if(S.lobbyChannel)supabaseClient.removeChannel(S.lobbyChannel)}catch(e){}
 S.lobbyChannel=supabaseClient.channel(`lobby-v25-${ses.id}-${Date.now()}`)
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"game_sessions",filter:`id=eq.${ses.id}`},p=>{
     if(p.new?.status==="playing"){
       stopKickWatchV25();
       clearInterval(S.lobbyPoll);
       beginSharedGame(p.new);
     }
   }).subscribe();

 clearInterval(S.lobbyPoll);
 S.lobbyPoll=setInterval(async()=>{
   const x=await getSessionById(ses.id);
   if(x?.status==="playing"){
     stopKickWatchV25();
     clearInterval(S.lobbyPoll);
     beginSharedGame(x);
   }
 },700);

 subscribeStudentKickV25(ses.id);
}

// After teacher deletes players, wait for DB confirmation before repainting.
async function kickSelectedPlayersV25(sessionId,ids){
 const {data,error}=await supabaseClient.from("session_players")
   .delete().eq("session_id",sessionId).in("id",ids).select("id");
 if(error){console.error("KICK ERROR",error);return {ok:false,message:error.message}}
 const deleted=(data||[]).map(x=>Number(x.id));
 if(!deleted.length)return {ok:false,message:"Supabase에서 삭제된 학생을 확인하지 못했습니다."};
 return {ok:true,deleted};
}

// Patch the v24 teacher kick button handler by delegation, taking priority.
document.addEventListener("click",async e=>{
 const btn=e.target.closest("#kickSelectedV24");
 if(!btn)return;
 e.preventDefault();e.stopImmediatePropagation();
 const checks=[...document.querySelectorAll(".kick-player-v24:checked")];
 const ids=checks.map(x=>Number(x.value));
 const names=checks.map(x=>x.closest(".kick-row")?.querySelector("b")?.textContent).filter(Boolean);
 if(!ids.length)return;
 if(!confirm(`${names.join(", ")} 학생을 대기실에서 강퇴할까요?`))return;
 btn.disabled=true;btn.textContent="강퇴 확인 중…";
 const sid=S.sessionId;
 const result=await kickSelectedPlayersV25(sid,ids);
 if(!result.ok){btn.disabled=false;btn.textContent="🚪 선택 학생 강퇴";return alert(`강퇴 실패: ${result.message}`);}
 // Teacher UI gets a quick local removal, then authoritative refresh.
 checks.forEach(x=>x.closest(".kick-row")?.remove());
 setTimeout(async()=>{
   const ses=await getSessionById(sid);
   if(ses)renderTeacherProgress(ses,S.teacherSessionMinutes||ses.duration_minutes);
 },250);
},true);


// ===== v29: minimal checkbox-state fix only =====
// Keep the ORIGINAL single kick sector. No extra panel is created.
S.kickSelectionV29 = S.kickSelectionV29 || new Set();

function captureKickSelectionV29(){
 document.querySelectorAll(".kick-player-v24").forEach(box=>{
   const id=String(box.value);
   if(box.checked)S.kickSelectionV29.add(id);
   else S.kickSelectionV29.delete(id);
 });
}
function restoreKickSelectionV29(){
 const boxes=[...document.querySelectorAll(".kick-player-v24")];
 boxes.forEach(box=>{
   box.checked=S.kickSelectionV29.has(String(box.value));
   box.closest(".kick-row")?.classList.toggle("selected",box.checked);
 });
 const picked=boxes.filter(x=>x.checked);
 const count=$("#kickCountV24"),btn=$("#kickSelectedV24"),all=$("#selectAllPlayersV24");
 if(count)count.textContent=`${picked.length}명 선택`;
 if(btn)btn.disabled=picked.length===0;
 if(all)all.checked=boxes.length>0&&picked.length===boxes.length;
}

// Existing teacher progress polling rebuilds the same original kick sector.
// Save checked IDs immediately before that repaint and restore immediately after.
if(typeof renderTeacherProgress==="function"){
 const _renderTeacherProgressV29=renderTeacherProgress;
 renderTeacherProgress=async function(){
   captureKickSelectionV29();
   const result=await _renderTeacherProgressV29.apply(this,arguments);
   restoreKickSelectionV29();
   return result;
 };
}

// Update stored selection at the moment the teacher clicks a checkbox.
document.addEventListener("change",e=>{
 if(e.target.matches(".kick-player-v24")){
   const id=String(e.target.value);
   if(e.target.checked)S.kickSelectionV29.add(id);
   else S.kickSelectionV29.delete(id);
   e.target.closest(".kick-row")?.classList.toggle("selected",e.target.checked);
 }
 if(e.target.matches("#selectAllPlayersV24")){
   document.querySelectorAll(".kick-player-v24").forEach(box=>{
     box.checked=e.target.checked;
     const id=String(box.value);
     if(box.checked)S.kickSelectionV29.add(id);
     else S.kickSelectionV29.delete(id);
     box.closest(".kick-row")?.classList.toggle("selected",box.checked);
   });
 }
 // Let the original v25 handler update count/button too, then restore once.
 setTimeout(restoreKickSelectionV29,0);
},true);

// After a successful deletion/repaint, IDs that no longer exist are removed.
// This does not create or move any UI.
function pruneKickSelectionV29(){
 const existing=new Set([...document.querySelectorAll(".kick-player-v24")].map(x=>String(x.value)));
 [...S.kickSelectionV29].forEach(id=>{if(!existing.has(id))S.kickSelectionV29.delete(id)});
}


// ===== v30: long dialogue order questions with fixed context =====

// Normalize old order questions so existing 4-line questions still work.
function normalizeOrderQuestionV30(q){
 if(q.type!=="order")return q;
 if(!Array.isArray(q.fixed))q.fixed=[];
 if(!Array.isArray(q.answer))q.answer=[];
 if(!Array.isArray(q.items)||!q.items.length)q.items=shuffle([...q.answer]);
 return q;
}
questions.forEach(normalizeOrderQuestionV30);

// Override remote loader: order answer may now be either the old array
// or {fixed:[...], order:[...]}.
loadRemoteQuestions=async function(){
 if(!supabaseClient)return;
 const {data,error}=await supabaseClient.from("game_questions").select("*").order("question_no",{ascending:true});
 if(error){console.error(error);return}
 if(data?.length){
   questions=data.map(r=>{
     let fixed=[],answer="";
     if(r.type==="order"){
       if(Array.isArray(r.answer)){answer=r.answer;fixed=[]}
       else if(r.answer && typeof r.answer==="object"){
         fixed=Array.isArray(r.answer.fixed)?r.answer.fixed:[];
         answer=Array.isArray(r.answer.order)?r.answer.order:[];
       }else answer=[];
     }else if(r.type==="choice"){
       answer=r.answer?.value??r.answer??"";
     }
     return normalizeOrderQuestionV30({
       type:r.type,round:r.round_name||"Question",title:r.title||"",target:r.target||"",
       options:Array.isArray(r.options)?r.options:[],
       fixed,
       answer,
       items:r.type==="order"?shuffle([...(answer||[])]):[],
       enabled:r.enabled
     });
   });
   localStorage.setItem("LQ_questions",JSON.stringify(questions));
 }
};

// Override remote save without requiring any new Supabase columns.
// fixed lines and sortable lines are stored together in the existing JSONB answer field.
saveQuestionsRemote=async function(){
 if(!supabaseClient)return;
 const rows=questions.map((q,i)=>({
   question_no:i+1,type:q.type,round_name:q.round||"Question",title:q.title||"",target:q.target||null,
   options:q.type==="choice"?(q.options||[]):[],
   answer:q.type==="order"
     ? {fixed:Array.isArray(q.fixed)?q.fixed:[],order:Array.isArray(q.answer)?q.answer:[]}
     : q.type==="choice"?{value:q.answer||""}:null,
   enabled:!!q.enabled,updated_at:new Date().toISOString()
 }));
 const {error}=await supabaseClient.from("game_questions").upsert(rows,{onConflict:"question_no"});
 if(error){console.error(error);alert("문제 저장 중 오류가 발생했습니다: "+error.message)}
};

// Student order screen: fixed dialogue stays visible at the top;
// only the teacher-selected continuation lines are shuffled and movable.
order=function(q){
 q=normalizeOrderQuestionV30(q);
 const fixedHTML=q.fixed.length?`
   <div class="dialogue-context">
     <div class="dialogue-context-label">📌 먼저 제시되는 대화</div>
     ${q.fixed.map((x,i)=>`<div class="fixed-dialogue-line"><span>${i+1}</span><p>${esc(x)}</p></div>`).join("")}
   </div>
   <div class="order-guide">👇 이어질 대화의 순서를 맞춰 보세요.</div>`:"";

 chrome(`<div class="round">${q.round}</div><div class="prompt">${esc(q.title)}</div>
 ${fixedHTML}
 <div class="sortable-dialogue">
 ${S.order.map((x,i)=>`<div class="order"><span>${q.fixed.length+i+1}. ${esc(x)}</span><div><button class="icon" data-u="${i}">↑</button> <button class="icon" data-d="${i}">↓</button></div></div>`).join("")}
 </div>
 <div class="actions"><button class="btn" id="check">CHECK</button></div>`);

 document.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>mv(+b.dataset.u,-1,q));
 document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>mv(+b.dataset.d,1,q));
 $("#check").onclick=()=>finish(JSON.stringify(S.order)===JSON.stringify(q.answer),[...q.fixed,...S.order].join(" | "));
};

// Teacher editor override. Other question types are unchanged.
editor=function(){
 questions.forEach(normalizeOrderQuestionV30);
 $("#panel").innerHTML=`<div class="card"><span class="badge">TEACHER EDITOR</span><h2>게임 문제 편집</h2>
 <p class="sub">최대 15문항까지 만들 수 있습니다. 대화 순서 문제는 긴 대화의 앞부분을 먼저 보여주고, 뒷부분 몇 문장만 순서 맞추기로 만들 수 있습니다.</p>
 ${questions.map((q,i)=>`<div class="editor">
 <div style="display:flex;justify-content:space-between;align-items:center"><b>Q${i+1}</b><label style="margin:0"><input style="width:auto" type="checkbox" data-enabled="${i}" ${q.enabled?"checked":""}> 학생에게 출제</label></div>
 <div class="row"><div><label>유형</label><select data-type="${i}">
 <option value="order" ${q.type==="order"?"selected":""}>대화 순서</option>
 <option value="choice" ${q.type==="choice"?"selected":""}>객관식/빈칸</option>
 <option value="speak" ${q.type==="speak"?"selected":""}>음성 인식</option></select></div>
 <div><label>문제 지시문</label><input data-title="${i}" value="${esc(q.title)}"></div></div>
 ${q.type==="order"?`
   <div class="order-editor-v30">
     <label>① 학생에게 먼저 보여줄 대화 <small>(순서 고정 · 한 줄에 한 문장)</small></label>
     <textarea data-fixed-lines="${i}" placeholder="예) A: What are you doing this weekend?&#10;B: I'm not sure yet.">${esc((q.fixed||[]).join("\n"))}</textarea>
     <label>② 학생이 순서를 맞출 대화 <small>(한 줄에 한 문장 · 입력 순서가 정답)</small></label>
     <textarea data-lines="${i}" placeholder="예) A: How about going to the movies?&#10;B: That sounds great!&#10;A: What time should we meet?&#10;B: How about 3 p.m.?">${esc((q.answer||[]).join("\n"))}</textarea>
     <p class="order-editor-help">예: 전체 8문장 대화라면 ①에 3~4문장, ②에 나머지 4~5문장을 넣을 수 있습니다. ①은 그대로 제시되고 ②만 섞여서 출제됩니다.</p>
   </div>`:""}
 ${q.type==="choice"?`<label>선택지 (한 줄에 하나)</label><textarea data-options="${i}">${esc(q.options.join("\n"))}</textarea><label>정답</label><input data-answer="${i}" value="${esc(q.answer)}">`:""}
 ${q.type==="speak"?`<label>학생이 읽을 목표 문장</label><input data-target="${i}" value="${esc(q.target)}">`:""}
 </div>`).join("")}
 <div class="actions"><button class="btn secondary" id="reset">기본 문제 복원</button><button class="btn" id="saveQ">변경사항 저장</button></div>
 <p class="note">대화 순서 문제는 ①의 문장은 고정해서 보여주고, ②에 입력한 문장만 무작위로 섞습니다. 6~8문장 이상의 대화도 사용할 수 있습니다.</p></div>`;

 document.querySelectorAll("[data-type]").forEach(s=>s.onchange=()=>{
   questions[+s.dataset.type].type=s.value;
   normalizeOrderQuestionV30(questions[+s.dataset.type]);
   localStorage.setItem("LQ_questions",JSON.stringify(questions));
   editor();
 });

 $("#saveQ").onclick=async()=>{
   questions.forEach((q,i)=>{
     q.title=document.querySelector(`[data-title="${i}"]`).value.trim();
     q.enabled=document.querySelector(`[data-enabled="${i}"]`).checked && !!q.title;
     if(q.type==="order"){
       q.fixed=document.querySelector(`[data-fixed-lines="${i}"]`).value.split("\n").map(x=>x.trim()).filter(Boolean);
       q.answer=document.querySelector(`[data-lines="${i}"]`).value.split("\n").map(x=>x.trim()).filter(Boolean);
       q.items=shuffle([...q.answer]);
     }
     if(q.type==="choice"){
       q.options=document.querySelector(`[data-options="${i}"]`).value.split("\n").map(x=>x.trim()).filter(Boolean);
       q.answer=document.querySelector(`[data-answer="${i}"]`).value.trim();
     }
     if(q.type==="speak")q.target=document.querySelector(`[data-target="${i}"]`).value.trim();
   });
   localStorage.setItem("LQ_questions",JSON.stringify(questions));
   await saveQuestionsRemote();
   alert("저장되었습니다. 학생 게임에 바로 반영됩니다.");
 };

 $("#reset").onclick=()=>{if(confirm("기본 문제로 되돌릴까요?")){
   questions=JSON.parse(JSON.stringify(DEFAULT)).map(normalizeOrderQuestionV30);
   localStorage.setItem("LQ_questions",JSON.stringify(questions));editor();
 }};
};

// ===== v31: stable isolated question editor =====
function q31clone(q){return JSON.parse(JSON.stringify(q||{}))}
function q31shape(q){q=q31clone(q);q.type=q.type||'order';q.round=q.round||'Question';q.title=q.title||'';q.enabled=!!q.enabled;q.fixed=Array.isArray(q.fixed)?q.fixed:[];q.options=Array.isArray(q.options)?q.options:[];if(q.type==='order'){q.answer=Array.isArray(q.answer)?q.answer:[];q.items=[...q.answer]}else if(q.type==='choice'){if(typeof q.answer!=='string')q.answer=q.answer?.value||''}else q.target=q.target||'';return q}
questions=questions.map(q31shape);
function q31fields(q,i){if(q.type==='order')return `<div class="order-editor-v30"><label>① 학생에게 먼저 보여줄 대화 <small>(순서 고정 · 한 줄에 한 문장)</small></label><textarea data-fixed-lines="${i}">${esc((q.fixed||[]).join('\n'))}</textarea><label>② 학생이 순서를 맞출 대화 <small>(한 줄에 한 문장 · 입력 순서가 정답)</small></label><textarea data-lines="${i}">${esc((q.answer||[]).join('\n'))}</textarea><p class="order-editor-help">①은 그대로 제시되고 ②만 섞여서 출제됩니다.</p></div>`;if(q.type==='choice')return `<label>선택지 (한 줄에 하나)</label><textarea data-options="${i}">${esc((q.options||[]).join('\n'))}</textarea><label>정답</label><input data-answer="${i}" value="${esc(q.answer||'')}">`;return `<label>학생이 읽을 목표 문장</label><input data-target="${i}" value="${esc(q.target||'')}">`}
function q31collect(i){let q=q31shape(questions[i]);const t=document.querySelector(`[data-type="${i}"]`),title=document.querySelector(`[data-title="${i}"]`),en=document.querySelector(`[data-enabled="${i}"]`);if(t)q.type=t.value;if(title)q.title=title.value.trim();if(en)q.enabled=en.checked;if(q.type==='order'){q.fixed=(document.querySelector(`[data-fixed-lines="${i}"]`)?.value||'').split('\n').map(x=>x.trim()).filter(Boolean);q.answer=(document.querySelector(`[data-lines="${i}"]`)?.value||'').split('\n').map(x=>x.trim()).filter(Boolean);q.items=[...q.answer]}else if(q.type==='choice'){q.options=(document.querySelector(`[data-options="${i}"]`)?.value||'').split('\n').map(x=>x.trim()).filter(Boolean);q.answer=(document.querySelector(`[data-answer="${i}"]`)?.value||'').trim()}else q.target=(document.querySelector(`[data-target="${i}"]`)?.value||'').trim();return q31shape(q)}
async function q31save(i,q){if(!supabaseClient)return {ok:true};const row={question_no:i+1,type:q.type,round_name:q.round||'Question',title:q.title||'',target:q.type==='speak'?(q.target||null):null,options:q.type==='choice'?(q.options||[]):[],answer:q.type==='order'?{fixed:q.fixed||[],order:q.answer||[]}:q.type==='choice'?{value:q.answer||''}:null,enabled:!!q.enabled,updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('game_questions').upsert(row,{onConflict:'question_no'});return error?{ok:false,message:error.message}:{ok:true}}
editor=function(){questions=questions.map(q31shape);$('#panel').innerHTML=`<div class="card"><span class="badge">TEACHER EDITOR</span><h2>게임 문제 편집</h2><p class="sub">문제 유형을 바꾸면 해당 문제의 입력 폼만 즉시 변경됩니다. 각 문제는 독립적으로 저장할 수 있습니다.</p>${questions.map((q,i)=>`<div class="editor question-editor-v31" data-card="${i}"><div class="q31head"><b>Q${i+1}</b><span id="q31state${i}" class="q31state"></span><label><input style="width:auto" type="checkbox" data-enabled="${i}" ${q.enabled?'checked':''}> 학생에게 출제</label></div><div class="row"><div><label>유형</label><select data-type="${i}"><option value="order" ${q.type==='order'?'selected':''}>대화 순서</option><option value="choice" ${q.type==='choice'?'selected':''}>객관식/빈칸</option><option value="speak" ${q.type==='speak'?'selected':''}>음성 인식</option></select></div><div><label>문제 지시문</label><input data-title="${i}" value="${esc(q.title)}"></div></div><div id="q31fields${i}">${q31fields(q,i)}</div><div class="q31save"><button class="btn secondary" data-save-one="${i}">💾 Q${i+1} 저장</button></div></div>`).join('')}<div class="actions"><button class="btn secondary" id="reset">기본 문제 복원</button><button class="btn" id="q31saveAll">💾 전체 문제 저장</button></div></div>`;
document.querySelectorAll('[data-type]').forEach(sel=>sel.onchange=()=>{const i=+sel.dataset.type;let q=q31collect(i);q.type=sel.value;questions[i]=q31shape(q);document.querySelector(`#q31fields${i}`).innerHTML=q31fields(questions[i],i);const s=$(`#q31state${i}`);if(s){s.textContent='저장 필요';s.className='q31state dirty'}});
document.querySelectorAll('[data-card]').forEach(card=>card.addEventListener('input',()=>{const i=+card.dataset.card,s=$(`#q31state${i}`);if(s){s.textContent='저장 필요';s.className='q31state dirty'}}));
document.querySelectorAll('[data-save-one]').forEach(btn=>btn.onclick=async()=>{const i=+btn.dataset.saveOne,q=q31collect(i),old=btn.textContent;btn.disabled=true;btn.textContent='저장 중…';const r=await q31save(i,q);if(r.ok){questions[i]=q31clone(q);localStorage.setItem('LQ_questions',JSON.stringify(questions));const s=$(`#q31state${i}`);if(s){s.textContent='✓ 저장됨';s.className='q31state saved'}}else alert(`Q${i+1} 저장 실패: ${r.message}`);btn.disabled=false;btn.textContent=old});
$('#q31saveAll').onclick=async()=>{const draft=questions.map((_,i)=>q31collect(i)),b=$('#q31saveAll');b.disabled=true;b.textContent='전체 저장 중…';for(let i=0;i<draft.length;i++){const r=await q31save(i,draft[i]);if(!r.ok){b.disabled=false;b.textContent='💾 전체 문제 저장';return alert(`Q${i+1} 저장 실패: ${r.message}`)}}questions=draft.map(q31clone);localStorage.setItem('LQ_questions',JSON.stringify(questions));document.querySelectorAll('.q31state').forEach(s=>{s.textContent='✓ 저장됨';s.className='q31state saved'});b.disabled=false;b.textContent='💾 전체 문제 저장';alert('전체 문제가 저장되었습니다.')};
$('#reset').onclick=()=>{if(confirm('기본 문제로 되돌릴까요?')){questions=JSON.parse(JSON.stringify(DEFAULT)).map(q31shape);localStorage.setItem('LQ_questions',JSON.stringify(questions));editor()}};
};




// ===== v34: working problem editor, single save button =====
function q34ReadVisibleCard(i){
 let q=q31shape(questions[i]);
 const title=document.querySelector(`[data-title="${i}"]`);
 const enabled=document.querySelector(`[data-enabled="${i}"]`);
 const type=document.querySelector(`[data-type="${i}"]`);
 if(title)q.title=title.value.trim();
 if(enabled)q.enabled=enabled.checked;

 // Read only the currently visible form.
 if(q.type==="order"){
   q.fixed=(document.querySelector(`[data-fixed-lines="${i}"]`)?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
   q.answer=(document.querySelector(`[data-lines="${i}"]`)?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
   q.items=[...q.answer];
 }else if(q.type==="choice"){
   q.options=(document.querySelector(`[data-options="${i}"]`)?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
   q.answer=(document.querySelector(`[data-answer="${i}"]`)?.value||"").trim();
 }else if(q.type==="speak"){
   q.target=(document.querySelector(`[data-target="${i}"]`)?.value||"").trim();
 }
 if(type)q.type=type.value;
 return q;
}

function q34SwitchType(i,newType){
 // Save the old visible form into this question only.
 let q=q34ReadVisibleCard(i);
 q.type=newType;

 // Initialize fields for the newly selected type without touching other questions.
 if(newType==="order"){
   q.fixed=Array.isArray(q.fixed)?q.fixed:[];
   q.answer=Array.isArray(q.answer)?q.answer:[];
   q.items=[...q.answer];
 }else if(newType==="choice"){
   q.options=Array.isArray(q.options)?q.options:[];
   q.answer=typeof q.answer==="string"?q.answer:"";
 }else{
   q.target=typeof q.target==="string"?q.target:"";
 }
 questions[i]=q;
 const holder=document.querySelector(`#q34fields${i}`);
 if(holder)holder.innerHTML=q31fields(q,i);
}

editor=function(){
 questions=questions.map(q31shape);
 const panel=$("#panel");
 if(!panel)return;
 panel.innerHTML=`<div class="card">
   <span class="badge">TEACHER EDITOR</span>
   <h2>게임 문제 편집</h2>
   <p class="sub">문제를 모두 수정한 뒤 맨 아래의 전체 문제 저장 버튼을 한 번 누르면 현재 상태 그대로 저장됩니다.</p>
   ${questions.map((q,i)=>`<div class="editor" data-q34-card="${i}">
     <div class="q31head">
       <b>Q${i+1}</b>
       <label><input style="width:auto" type="checkbox" data-enabled="${i}" ${q.enabled?"checked":""}> 학생에게 출제</label>
     </div>
     <div class="row">
       <div>
         <label>유형</label>
         <select data-q34-type="${i}" data-type="${i}">
           <option value="order" ${q.type==="order"?"selected":""}>대화 순서</option>
           <option value="choice" ${q.type==="choice"?"selected":""}>객관식/빈칸</option>
           <option value="speak" ${q.type==="speak"?"selected":""}>음성 인식</option>
         </select>
       </div>
       <div><label>문제 지시문</label><input data-title="${i}" value="${esc(q.title)}"></div>
     </div>
     <div id="q34fields${i}">${q31fields(q,i)}</div>
   </div>`).join("")}
   <div class="actions">
     <button class="btn secondary" id="q34reset">기본 문제 복원</button>
     <button class="btn" id="q34save">💾 전체 문제 저장</button>
   </div>
 </div>`;

 document.querySelectorAll("[data-q34-type]").forEach(sel=>{
   sel.onchange=()=>q34SwitchType(Number(sel.dataset.q34Type),sel.value);
 });

 $("#q34save").onclick=async()=>{
   // First capture every card while each card still owns its own DOM fields.
   const draft=questions.map((q,i)=>{
     // q34ReadVisibleCard expects questions[i].type to be the visible form type,
     // which q34SwitchType keeps synchronized.
     return q34ReadVisibleCard(i);
   });
   const btn=$("#q34save");
   btn.disabled=true;btn.textContent="저장 중…";
   try{
     for(let i=0;i<draft.length;i++){
       const r=await q31save(i,draft[i]);
       if(!r.ok)throw new Error(`Q${i+1}: ${r.message}`);
     }
     questions=draft.map(q31clone);
     localStorage.setItem("LQ_questions",JSON.stringify(questions));
     alert("전체 문제가 저장되었습니다.");
   }catch(err){
     console.error("QUESTION SAVE ERROR",err);
     alert("저장 실패: "+(err?.message||String(err)));
   }finally{
     btn.disabled=false;btn.textContent="💾 전체 문제 저장";
   }
 };

 $("#q34reset").onclick=()=>{
   if(!confirm("기본 문제로 되돌릴까요?"))return;
   questions=JSON.parse(JSON.stringify(DEFAULT)).map(q31shape);
   localStorage.setItem("LQ_questions",JSON.stringify(questions));
   editor();
 };
};


// ===== v35: fix invisible order questions / prevent free points =====
function prepareOrderV35(q){
 q=q||{};
 q.fixed=Array.isArray(q.fixed)?q.fixed:[];
 q.answer=Array.isArray(q.answer)?q.answer:[];
 // Always build the student's sortable list from the saved correct-order array.
 // Never trust an old/empty q.items value.
 q.items=shuffle([...q.answer]);
 return q;
}

question=function(){
 if(S.timeExpired||remainingMs()<=0){S.timeExpired=true;return waitForRankingScreen();}
 S.activityStatus="main_game";S.currentQuestion=S.q+1;S.miniStreak=0;upsertRemoteScore(false);
 S.selected=null;S.transcript="";S.speechScore=null;S.questionStartedAt=Date.now();
 let q=S.playQuestions[S.q];

 if(q.type==="order"){
   q=prepareOrderV35(q);
   S.playQuestions[S.q]=q;
   S.order=[...q.items];
   order(q);
 }else if(q.type==="choice")choice(q);
 else speak(q);
};

order=function(q){
 q=prepareOrderV35(q);

 // A malformed/empty order question can never award points.
 if(!q.answer.length){
   chrome(`<div class="round">${esc(q.round||"Question")}</div>
     <div class="prompt">${esc(q.title||"대화 순서 맞추기")}</div>
     <div class="feedback bad">이 문제의 순서 맞추기 문장이 저장되지 않았습니다.<br>선생님에게 알려 주세요.</div>
     <div class="actions"><button class="btn" id="skipBrokenOrderV35">다음 문제 →</button></div>`);
   $("#skipBrokenOrderV35").onclick=()=>{
     S.answers.push({q:S.q+1,type:"order",correct:false,response:"EMPTY_ORDER_DATA",points:0});
     S.combo=0;updateLiveSession();upsertRemoteScore(false);next();
   };
   return;
 }

 // If an old call to order() occurs after moving a line, keep the current student order.
 if(!Array.isArray(S.order)||S.order.length!==q.answer.length)S.order=shuffle([...q.answer]);

 const fixedHTML=q.fixed.length?`
   <div class="dialogue-context">
     <div class="dialogue-context-label">📌 먼저 제시되는 대화</div>
     ${q.fixed.map((x,i)=>`<div class="fixed-dialogue-line"><span>${i+1}</span><p>${esc(x)}</p></div>`).join("")}
   </div>
   <div class="order-guide">👇 이어질 대화의 순서를 맞춰 보세요.</div>`:"";

 chrome(`<div class="round">${esc(q.round||"Question")}</div>
   <div class="prompt">${esc(q.title||"대화 순서를 맞춰 보세요.")}</div>
   ${fixedHTML}
   <div class="sortable-dialogue">
     ${S.order.map((x,i)=>`<div class="order"><span>${q.fixed.length+i+1}. ${esc(x)}</span><div><button class="icon" data-u="${i}">↑</button> <button class="icon" data-d="${i}">↓</button></div></div>`).join("")}
   </div>
   <div class="actions"><button class="btn" id="check">CHECK</button></div>`);

 document.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>mv(+b.dataset.u,-1,q));
 document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>mv(+b.dataset.d,1,q));
 $("#check").onclick=()=>{
   if(!S.order.length)return alert("순서를 맞출 문장이 없습니다.");
   finish(JSON.stringify(S.order)===JSON.stringify(q.answer),[...q.fixed,...S.order].join(" | "));
 };
};


// ===== v36: evolution 400/800 + time-based points =====
function stage(score){return score>=800?2:score>=400?1:0}
function petInfo(){
 let p=PETS[S.student.pet],i=stage(S.score),next=i===0?400:i===1?800:800,base=i===0?0:i===1?400:800;
 return {p,i,emoji:p.stages[i][0],name:p.stages[i][1],pct:i===2?100:Math.min(100,(S.score-base)/(next-base)*100),next};
}

// Correct-answer score starts at 60 and drops by 10 for every completed 10 seconds.
// 0–9.999s:60, 10–19.999s:50, 20–29.999s:40, 30–39.999s:30,
// 40–49.999s:20, 50s+:10 minimum.
function speedBonus(){
 const sec=Math.max(0,(Date.now()-(S.questionStartedAt||Date.now()))/1000);
 const points=Math.max(10,60-Math.floor(sec/10)*10);
 return {points,label:`⏱ 속도 점수 +${points}`};
}

function finish(ok,response){
 let before=stage(S.score),gain=0,bonus={points:0,label:""};
 if(ok){
   S.correct++;S.combo++;
   bonus=speedBonus();
   gain=bonus.points;
   S.score+=gain;
 }else S.combo=0;
 S.answers.push({q:S.q+1,type:S.playQuestions[S.q].type,correct:ok,response,points:gain,speedBonus:bonus.points});
 updateLiveSession();upsertRemoteScore(false);
 let after=stage(S.score),msg=ok?`✓ 정답! +${gain}점<br>${bonus.label}`:"✕ 아쉬워요. 다음 문제에 도전!";
 $(".card").insertAdjacentHTML("beforeend",`<div class="feedback ${ok?"ok":"bad"}">${msg}</div><div class="actions"><button class="btn" id="next">NEXT →</button></div>`);
 $("#check")?.remove();document.querySelectorAll(".option,.icon").forEach(x=>x.disabled=true);$("#next").onclick=next;
 if(after>before)setTimeout(()=>evolutionPopup(after),120);
}

// Keep speech scoring accuracy-based; use the new time score only as a small component.
function finishSpeech(){
 let raw=S.speechScore, sb=speedBonus(), before=stage(S.score);
 let gain=Math.round(raw*0.6)+(raw>=70?Math.round(sb.points*0.5):0);
 S.score+=gain;if(raw>=70){S.correct++;S.combo++}else S.combo=0;
 S.answers.push({q:S.q+1,type:"speak",correct:raw>=70,response:S.transcript,speechScore:raw,points:gain,speedBonus:raw>=70?Math.round(sb.points*0.5):0});
 updateLiveSession();upsertRemoteScore(false);
 let after=stage(S.score);
 $(".card").insertAdjacentHTML("beforeend",`<div class="feedback ${raw>=70?"ok":"bad"}">발음 점수 ${raw}점 · +${gain}점</div><div class="actions"><button class="btn" id="next">NEXT →</button></div>`);
 $("#next").onclick=next;
 if(after>before)setTimeout(()=>evolutionPopup(after),120);
}


// ===== v37: unify order-question save/load format =====
function decodeOrderV37(raw){
 if(Array.isArray(raw)) return {fixed:[],order:raw};
 if(raw && typeof raw==="object"){
   return {
     fixed:Array.isArray(raw.fixed)?raw.fixed:[],
     order:Array.isArray(raw.order)?raw.order:(Array.isArray(raw.answer)?raw.answer:[])
   };
 }
 return {fixed:[],order:[]};
}

loadRemoteQuestions=async function(){
 if(!supabaseClient)return;
 const {data,error}=await supabaseClient.from("game_questions").select("*").order("question_no",{ascending:true});
 if(error){console.error("QUESTION LOAD ERROR",error);return}
 if(!data?.length)return;

 questions=data.map(r=>{
   if(r.type==="order"){
     const d=decodeOrderV37(r.answer);
     return {
       type:"order",round:r.round_name||"Question",title:r.title||"",
       fixed:d.fixed,answer:d.order,items:shuffle([...d.order]),
       options:[],target:"",enabled:!!r.enabled
     };
   }
   if(r.type==="choice"){
     return {
       type:"choice",round:r.round_name||"Question",title:r.title||"",
       options:Array.isArray(r.options)?r.options:[],
       answer:(r.answer && typeof r.answer==="object")?(r.answer.value||""):(r.answer||""),
       fixed:[],target:"",enabled:!!r.enabled
     };
   }
   return {
     type:"speak",round:r.round_name||"Question",title:r.title||"",
     target:r.target||"",options:[],answer:"",fixed:[],enabled:!!r.enabled
   };
 });
 localStorage.setItem("LQ_questions",JSON.stringify(questions));
};

async function q31save(i,q){
 if(!supabaseClient)return {ok:true};
 const row={
   question_no:i+1,
   type:q.type,
   round_name:q.round||"Question",
   title:q.title||"",
   target:q.type==="speak"?(q.target||null):null,
   options:q.type==="choice"?(q.options||[]):[],
   answer:q.type==="order"
     ? {fixed:Array.isArray(q.fixed)?q.fixed:[],order:Array.isArray(q.answer)?q.answer:[]}
     : q.type==="choice"?{value:q.answer||""}:null,
   enabled:!!q.enabled,
   updated_at:new Date().toISOString()
 };
 const {data,error}=await supabaseClient.from("game_questions")
   .upsert(row,{onConflict:"question_no"}).select("question_no,type,answer").single();
 if(error)return {ok:false,message:error.message};

 // Verify that order lines really reached Supabase before reporting success.
 if(q.type==="order"){
   const d=decodeOrderV37(data?.answer);
   if(d.order.length!==(q.answer||[]).length)
     return {ok:false,message:"순서 맞추기 문장이 Supabase에 정상 저장되지 않았습니다."};
 }
 return {ok:true};
}

// Reload authoritative saved questions before every new student game.
// This prevents stale localStorage data from producing an empty order question.
const _startGameV37 = typeof startGame==="function" ? startGame : null;
if(_startGameV37){
 startGame=async function(){
   await loadRemoteQuestions();
   return _startGameV37.apply(this,arguments);
 };
}


// ===== v38: refresh questions at the ACTUAL game-start moment =====
// Students may sit in the lobby for several minutes.
// Never use the question snapshot captured when they entered the lobby.
beginSharedGame=async function(ses){
 clearInterval(S.lobbyPoll);S.lobbyPoll=null;

 // 1) Pull the teacher's latest saved questions from Supabase NOW.
 await loadRemoteQuestions();

 // 2) Rebuild this student's play list from the fresh data.
 const fresh=activeQuestions().map(q=>{
   if(q.type==="order"){
     const d=decodeOrderV37(q.answer);
     // loadRemoteQuestions already decodes it, but this also handles any legacy object safely.
     const orderLines=Array.isArray(q.answer)?q.answer:d.order;
     return {
       ...q,
       fixed:Array.isArray(q.fixed)?q.fixed:d.fixed,
       answer:Array.isArray(orderLines)?orderLines:[],
       items:shuffle([...(Array.isArray(orderLines)?orderLines:[])])
     };
   }
   return {...q};
 });

 if(!fresh.length){
   alert("선생님이 아직 출제할 문제를 저장하지 않았습니다.");
   return home();
 }

 // Do not start a game containing an enabled order question with no sortable lines.
 const broken=fresh.findIndex(q=>q.type==="order" && (!Array.isArray(q.answer)||q.answer.length===0));
 if(broken>=0){
   alert(`Q${broken+1} 순서 맞추기 문장이 비어 있습니다. 선생님에게 알려 주세요.`);
   return home();
 }

 S.playQuestions=fresh;
 S.q=0;
 S.sessionId=ses.id;
 S.sessionEndsAt=new Date(ses.ends_at).getTime();
 S.sessionDurationMinutes=Number(ses.duration_minutes)||null;
 S.gameStartedAt=ses.started_at?new Date(ses.started_at).getTime():Date.now();
 S.timeExpired=false;
 S.activityStatus="main_game";

 await upsertRemoteScore(false);
 subscribeSession();
 question();
};

// Also refresh immediately before a late student joins an already-playing session.
const _homeV38=home;
home=async function(){
 await loadRemoteQuestions();
 return _homeV38.apply(this,arguments);
};


// ===== v39: robust order-question storage + no whole-game blocking =====

// Accept every format used by previous versions.
// For order questions, `options` is also used as a redundant backup of sortable lines.
function extractOrderV39(rowOrQuestion){
 const x=rowOrQuestion||{};
 const raw=x.answer;
 let fixed=[],order=[];

 if(Array.isArray(raw)){
   order=raw;
 }else if(raw && typeof raw==="object"){
   if(Array.isArray(raw.fixed))fixed=raw.fixed;
   if(Array.isArray(raw.order))order=raw.order;
   else if(Array.isArray(raw.answer))order=raw.answer;
   else if(Array.isArray(raw.items))order=raw.items;
   else if(Array.isArray(raw.lines))order=raw.lines;
 }

 if(!fixed.length && Array.isArray(x.fixed))fixed=x.fixed;
 if(!order.length && Array.isArray(x.items))order=x.items;

 // v39 redundant Supabase backup
 if(!order.length && Array.isArray(x.options))order=x.options;

 return {
   fixed:fixed.map(v=>String(v).trim()).filter(Boolean),
   order:order.map(v=>String(v).trim()).filter(Boolean)
 };
}

loadRemoteQuestions=async function(){
 if(!supabaseClient)return;
 const {data,error}=await supabaseClient.from("game_questions").select("*").order("question_no",{ascending:true});
 if(error){console.error("QUESTION LOAD ERROR",error);return}
 if(!data?.length)return;

 questions=data.map(r=>{
   if(r.type==="order"){
     const d=extractOrderV39(r);
     return {
       type:"order",round:r.round_name||"Question",title:r.title||"",
       fixed:d.fixed,answer:d.order,items:shuffle([...d.order]),
       // retain the backup too
       options:[...d.order],target:"",enabled:!!r.enabled
     };
   }
   if(r.type==="choice"){
     return {
       type:"choice",round:r.round_name||"Question",title:r.title||"",
       options:Array.isArray(r.options)?r.options:[],
       answer:(r.answer && typeof r.answer==="object")?(r.answer.value||""):(r.answer||""),
       fixed:[],target:"",enabled:!!r.enabled
     };
   }
   return {
     type:"speak",round:r.round_name||"Question",title:r.title||"",
     target:r.target||"",options:[],answer:"",fixed:[],enabled:!!r.enabled
   };
 });
 localStorage.setItem("LQ_questions",JSON.stringify(questions));
};

// Save sortable order lines redundantly into both answer JSON and options.
// This uses existing DB columns; no SQL change is needed.
async function q31save(i,q){
 if(!supabaseClient)return {ok:true};
 const sortable=q.type==="order"
   ? (Array.isArray(q.answer)?q.answer.map(v=>String(v).trim()).filter(Boolean):[])
   : [];
 const row={
   question_no:i+1,
   type:q.type,
   round_name:q.round||"Question",
   title:q.title||"",
   target:q.type==="speak"?(q.target||null):null,
   options:q.type==="order" ? sortable : q.type==="choice"?(q.options||[]):[],
   answer:q.type==="order"
     ? {fixed:Array.isArray(q.fixed)?q.fixed.map(v=>String(v).trim()).filter(Boolean):[],order:sortable}
     : q.type==="choice"?{value:q.answer||""}:null,
   enabled:!!q.enabled,
   updated_at:new Date().toISOString()
 };
 const {data,error}=await supabaseClient.from("game_questions")
   .upsert(row,{onConflict:"question_no"})
   .select("question_no,type,answer,options").single();
 if(error)return {ok:false,message:error.message};

 if(q.type==="order"){
   const check=extractOrderV39(data);
   if(!check.order.length && sortable.length)
     return {ok:false,message:"순서 맞추기 문장을 서버에서 다시 확인하지 못했습니다."};
 }
 return {ok:true};
}

// At actual game start, rebuild from the newest server rows.
// A single malformed question must NEVER block the whole class game.
beginSharedGame=async function(ses){
 clearInterval(S.lobbyPoll);S.lobbyPoll=null;
 await loadRemoteQuestions();

 const fresh=activeQuestions().map(q=>{
   if(q.type!=="order")return {...q};
   const d=extractOrderV39(q);
   return {...q,fixed:d.fixed,answer:d.order,items:shuffle([...d.order])};
 });

 const playable=fresh.filter(q=>{
   if(q.type!=="order")return true;
   return Array.isArray(q.answer)&&q.answer.length>0;
 });

 const removed=fresh.length-playable.length;
 if(!playable.length){
   alert("출제 가능한 문제가 없습니다. 선생님에게 알려 주세요.");
   return home();
 }
 if(removed>0){
   console.warn(`${removed}개의 비정상 순서 문제를 자동 제외했습니다.`);
 }

 S.playQuestions=playable;
 S.q=0;S.score=0;S.combo=0;S.correct=0;S.answers=[];
 S.sessionId=ses.id;
 S.sessionEndsAt=new Date(ses.ends_at).getTime();
 S.sessionDurationMinutes=Number(ses.duration_minutes)||null;
 S.gameStartedAt=ses.started_at?new Date(ses.started_at).getTime():Date.now();
 S.timeExpired=false;S.activityStatus="main_game";

 await upsertRemoteScore(false);
 subscribeSession();
 question();
};

// Final student-side order renderer also uses every available backup.
function prepareOrderV39(q){
 const d=extractOrderV39(q);
 q={...q,fixed:d.fixed,answer:d.order};
 q.items=shuffle([...d.order]);
 return q;
}

question=function(){
 if(S.timeExpired||remainingMs()<=0){S.timeExpired=true;return waitForRankingScreen();}
 S.activityStatus="main_game";S.currentQuestion=S.q+1;S.miniStreak=0;upsertRemoteScore(false);
 S.selected=null;S.transcript="";S.speechScore=null;S.questionStartedAt=Date.now();
 let q=S.playQuestions[S.q];

 if(q.type==="order"){
   q=prepareOrderV39(q);
   S.playQuestions[S.q]=q;
   // If corruption somehow occurs after start, skip only this question with 0 points.
   if(!q.answer.length){
     S.answers.push({q:S.q+1,type:"order",correct:false,response:"ORDER_DATA_MISSING",points:0});
     return next();
   }
   S.order=shuffle([...q.answer]);
   order(q);
 }else if(q.type==="choice")choice(q);
 else speak(q);
};


// ===== v41: speech = record -> automatic score preview -> Retry or NEXT =====
// No separate "점수 받기" button.

function speech(q){
 S.transcript="";
 S.speechScore=null;
 S.finalSpeechAttemptV41=null;
 chrome(`<div class="round">${esc(q.round||"Question")}</div>
   <div class="prompt">${esc(q.title||"문장을 읽어 보세요.")}</div>
   <div class="speak-target">${esc(q.target||"")}</div>
   <div id="speechResultV41" class="speech-result"><p class="note">마이크 버튼을 눌러 문장을 읽어 보세요.</p></div>
   <div class="actions" id="speechActionsV41">
     <button class="btn" id="recordSpeechV41">🎙️ 녹음하기</button>
   </div>`);
 $("#recordSpeechV41").onclick=()=>startSpeechAttemptV41(q);
}

function startSpeechAttemptV41(q){
 S.transcript="";
 S.speechScore=null;
 S.finalSpeechAttemptV41=null;
 const actions=$("#speechActionsV41");
 if(actions)actions.innerHTML=`<button class="btn" disabled>🎙️ 듣는 중…</button>`;
 const result=$("#speechResultV41");
 if(result)result.innerHTML=`<p class="note">문장을 읽어 주세요…</p>`;

 // Use the existing recognition implementation.
 listen(q);

 // Recognition code writes the recognized text into S.transcript.
 // As soon as a transcript arrives, calculate the score automatically.
 let waited=0;
 const watch=setInterval(()=>{
   waited+=100;
   if(S.transcript){
     clearInterval(watch);
     showSpeechResultV41(q);
   }else if(waited>=12000){
     clearInterval(watch);
     if(result)result.innerHTML=`<div class="feedback bad">음성을 인식하지 못했습니다. 다시 녹음해 주세요.</div>`;
     if(actions)actions.innerHTML=`<button class="btn" id="retrySpeechV41">🎙️ 다시 녹음</button>`;
     $("#retrySpeechV41").onclick=()=>startSpeechAttemptV41(q);
   }
 },100);
}

function showSpeechResultV41(q){
 const raw=similarity(S.transcript,q.target);
 const sb=speedBonus();
 const gain=Math.round(raw*0.6)+(raw>=70?Math.round(sb.points*0.5):0);
 S.speechScore=raw;
 S.finalSpeechAttemptV41={
   raw,gain,transcript:S.transcript,
   speedBonus:raw>=70?Math.round(sb.points*0.5):0
 };

 const result=$("#speechResultV41");
 if(result)result.innerHTML=`<div class="feedback ${raw>=70?"ok":"bad"}">
   발음 점수 <b>${raw}점</b> · 획득 예정 <b>+${gain}점</b>
 </div>`;

 const actions=$("#speechActionsV41");
 if(actions)actions.innerHTML=`
   <button class="btn secondary" id="retrySpeechV41">🎙️ 다시 녹음</button>
   <button class="btn" id="nextSpeechV41">NEXT →</button>`;

 $("#retrySpeechV41").onclick=()=>startSpeechAttemptV41(q);
 $("#nextSpeechV41").onclick=()=>commitSpeechV41();
}

function commitSpeechV41(){
 const a=S.finalSpeechAttemptV41;
 if(!a)return;
 const btn=$("#nextSpeechV41");
 if(btn){btn.disabled=true;btn.textContent="NEXT…";}

 const before=stage(S.score);
 S.score+=a.gain;
 if(a.raw>=70){S.correct++;S.combo++;}else S.combo=0;
 S.answers.push({
   q:S.q+1,type:"speak",correct:a.raw>=70,response:a.transcript,
   speechScore:a.raw,points:a.gain,speedBonus:a.speedBonus
 });
 S.finalSpeechAttemptV41=null;
 updateLiveSession();
 upsertRemoteScore(false);
 const after=stage(S.score);
 if(after>before)setTimeout(()=>evolutionPopup(after),120);
 next();
}

// Neutralize old speech scoring entry points: they may be called by the legacy
// recognition callback, but they must never award points or replace the v41 UI.
function finishSpeech(){
 const q=S.playQuestions?.[S.q];
 if(q?.type==="speak" && S.transcript && !S.finalSpeechAttemptV41){
   showSpeechResultV41(q);
 }
}
function previewSpeechScoreV40(q){
 if(S.transcript)showSpeechResultV41(q);
}


// ===== v42 FINAL SPEECH FIX =====
// Use the app's original startRec()/stopRec() functions directly.
// No polling, no legacy "score" button, no separate listen() wrapper.

S.speechCommittedV42=false;

function speechV42Gain(raw){
 const sb=speedBonus();
 return {
   gain:Math.round(raw*0.6)+(raw>=70?Math.round(sb.points*0.5):0),
   speed:raw>=70?Math.round(sb.points*0.5):0
 };
}

function speak(q){
 const support=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
 const hasResult=!S.recognizing && S.speechScore!=null && String(S.transcript||"").trim().length>0;
 const calc=hasResult?speechV42Gain(Number(S.speechScore)||0):null;

 chrome(`<div class="round">${esc(q.round||"Question")}</div>
   <div class="prompt">${esc(q.title||"문장을 읽어 보세요.")}</div>
   <div class="speak-target">${esc(q.target||"")}</div>
   <div class="sub">
     ${S.transcript?`인식된 문장: <b>${esc(S.transcript)}</b>`:
       S.recognizing?"영어 문장을 읽고, 다 읽으면 녹음 종료를 누르세요.":"마이크 버튼을 눌러 문장을 읽어 보세요."}
   </div>
   ${hasResult?`<div class="feedback ${Number(S.speechScore)>=70?"ok":"bad"}">
      발음 점수 <b>${Number(S.speechScore)}점</b> · 획득 예정 <b>+${calc.gain}점</b>
   </div>`:""}
   ${!support?`<div class="feedback bad">현재 브라우저에서 음성 인식을 지원하지 않습니다.</div>`:""}
   <div class="actions" id="speechActionsV42">
     ${!support?"":
       S.recognizing?`<button class="btn" id="stopSpeechV42">⏹ 녹음 종료</button>`:
       hasResult?`<button class="btn secondary" id="retrySpeechV42">🎙️ 다시 녹음</button>
                  <button class="btn" id="nextSpeechV42">NEXT →</button>`:
                 `<button class="btn" id="startSpeechV42">🎙️ 녹음하기</button>`}
   </div>`);

 if(!support)return;

 const start=$("#startSpeechV42");
 if(start)start.onclick=()=>{
   S.speechCommittedV42=false;
   S.transcript="";
   S.speechScore=null;
   startRec(q);
 };

 const stop=$("#stopSpeechV42");
 if(stop)stop.onclick=()=>stopRec(q);

 const retry=$("#retrySpeechV42");
 if(retry)retry.onclick=()=>{
   S.speechCommittedV42=false;
   S.transcript="";
   S.speechScore=null;
   startRec(q);
 };

 const nextBtn=$("#nextSpeechV42");
 if(nextBtn)nextBtn.onclick=()=>{
   if(S.speechCommittedV42)return;
   S.speechCommittedV42=true;
   nextBtn.disabled=true;

   const raw=Number(S.speechScore)||0;
   const {gain,speed}=speechV42Gain(raw);
   const before=stage(S.score);

   S.score+=gain;
   if(raw>=70){S.correct++;S.combo++;}else S.combo=0;
   S.answers.push({
     q:S.q+1,type:"speak",correct:raw>=70,response:S.transcript,
     speechScore:raw,points:gain,speedBonus:speed
   });
   updateLiveSession();
   upsertRemoteScore(false);

   const after=stage(S.score);
   if(after>before)setTimeout(()=>evolutionPopup(after),120);
   next();
 };
}

// Any old speech scoring callback must only redraw the v42 result.
// It must NEVER add score.
function finishSpeech(){
 const q=S.playQuestions?.[S.q];
 if(q?.type==="speak")speak(q);
}
function previewSpeechScoreV40(q){speak(q);}
function showSpeechResultV41(q){speak(q);}


// ===== v43: Supabase is the single source of truth for questions =====

async function loadQuestionsAuthoritativeV43(){
 if(!supabaseClient)return questions;
 const {data,error}=await supabaseClient
   .from("game_questions")
   .select("*")
   .order("question_no",{ascending:true});
 if(error){
   console.error("QUESTION LOAD ERROR",error);
   throw error;
 }
 if(!data?.length)return questions;

 questions=data.map(r=>{
   if(r.type==="order"){
     const d=extractOrderV39(r);
     return {
       type:"order",round:r.round_name||"Question",title:r.title||"",
       fixed:d.fixed,answer:d.order,items:shuffle([...d.order]),
       options:[...d.order],target:"",enabled:!!r.enabled
     };
   }
   if(r.type==="choice"){
     return {
       type:"choice",round:r.round_name||"Question",title:r.title||"",
       options:Array.isArray(r.options)?r.options:[],
       answer:(r.answer&&typeof r.answer==="object")?(r.answer.value||""):(r.answer||""),
       fixed:[],target:"",enabled:!!r.enabled
     };
   }
   return {
     type:"speak",round:r.round_name||"Question",title:r.title||"",
     target:r.target||"",options:[],answer:"",fixed:[],enabled:!!r.enabled
   };
 });
 localStorage.setItem("LQ_questions",JSON.stringify(questions));
 return questions;
}

loadRemoteQuestions=loadQuestionsAuthoritativeV43;

async function saveAllQuestionsV43(draft){
 const rows=draft.map((q,i)=>{
   const sortable=q.type==="order"
     ? (Array.isArray(q.answer)?q.answer.map(v=>String(v).trim()).filter(Boolean):[])
     : [];
   return {
     question_no:i+1,
     type:q.type,
     round_name:q.round||"Question",
     title:q.title||"",
     target:q.type==="speak"?(q.target||null):null,
     options:q.type==="order" ? sortable : q.type==="choice"?(q.options||[]):[],
     answer:q.type==="order"
       ? {fixed:Array.isArray(q.fixed)?q.fixed.map(v=>String(v).trim()).filter(Boolean):[],order:sortable}
       : q.type==="choice"?{value:q.answer||""}:null,
     enabled:!!q.enabled,
     updated_at:new Date().toISOString()
   };
 });

 const {error}=await supabaseClient.from("game_questions")
   .upsert(rows,{onConflict:"question_no"});
 if(error)throw error;

 const {data,error:verifyError}=await supabaseClient
   .from("game_questions")
   .select("*")
   .order("question_no",{ascending:true});
 if(verifyError)throw verifyError;

 for(let i=0;i<draft.length;i++){
   const saved=(data||[]).find(r=>Number(r.question_no)===i+1);
   if(!saved)throw new Error(`Q${i+1} 저장 확인 실패`);
   if(draft[i].type==="order"){
     const d=extractOrderV39(saved);
     const expected=Array.isArray(draft[i].answer)?draft[i].answer.map(v=>String(v).trim()).filter(Boolean):[];
     if(JSON.stringify(d.order)!==JSON.stringify(expected)){
       throw new Error(`Q${i+1} 대화 순서 문장 저장 확인 실패`);
     }
   }
 }
 return true;
}

editor=async function(){
 const panel=$("#panel");
 if(!panel)return;
 panel.innerHTML=`<div class="card"><p class="sub">저장된 문제를 불러오는 중…</p></div>`;

 try{
   await loadQuestionsAuthoritativeV43();
 }catch(err){
   panel.innerHTML=`<div class="card"><div class="feedback bad">문제를 불러오지 못했습니다.<br>${esc(err?.message||String(err))}</div></div>`;
   return;
 }

 questions=questions.map(q31shape);

 panel.innerHTML=`<div class="card">
   <span class="badge">TEACHER EDITOR</span>
   <h2>게임 문제 편집</h2>
   <p class="sub">이 화면은 Supabase에 저장된 최신 문제입니다. 컴퓨터나 브라우저를 껐다 켜도 같은 문제가 다시 불러와집니다.</p>
   ${questions.map((q,i)=>`<div class="editor" data-v43-card="${i}">
     <div class="q31head">
       <b>Q${i+1}</b>
       <label><input style="width:auto" type="checkbox" data-enabled="${i}" ${q.enabled?"checked":""}> 학생에게 출제</label>
     </div>
     <div class="row">
       <div><label>유형</label><select data-v43-type="${i}" data-type="${i}">
         <option value="order" ${q.type==="order"?"selected":""}>대화 순서</option>
         <option value="choice" ${q.type==="choice"?"selected":""}>객관식/빈칸</option>
         <option value="speak" ${q.type==="speak"?"selected":""}>음성 인식</option>
       </select></div>
       <div><label>문제 지시문</label><input data-title="${i}" value="${esc(q.title)}"></div>
     </div>
     <div id="v43fields${i}">${q31fields(q,i)}</div>
   </div>`).join("")}
   <div class="actions">
     <button class="btn secondary" id="v43Reload">↻ 저장된 문제 다시 불러오기</button>
     <button class="btn" id="v43Save">💾 전체 문제 저장</button>
   </div>
 </div>`;

 function readCard(i){
   let q=q31shape(questions[i]);
   q.title=(document.querySelector(`[data-title="${i}"]`)?.value||"").trim();
   q.enabled=!!document.querySelector(`[data-enabled="${i}"]`)?.checked;

   if(q.type==="order"){
     q.fixed=(document.querySelector(`[data-fixed-lines="${i}"]`)?.value||"")
       .split("\n").map(x=>x.trim()).filter(Boolean);
     q.answer=(document.querySelector(`[data-lines="${i}"]`)?.value||"")
       .split("\n").map(x=>x.trim()).filter(Boolean);
     q.items=[...q.answer];
   }else if(q.type==="choice"){
     q.options=(document.querySelector(`[data-options="${i}"]`)?.value||"")
       .split("\n").map(x=>x.trim()).filter(Boolean);
     q.answer=(document.querySelector(`[data-answer="${i}"]`)?.value||"").trim();
   }else{
     q.target=(document.querySelector(`[data-target="${i}"]`)?.value||"").trim();
   }
   return q;
 }

 document.querySelectorAll("[data-v43-type]").forEach(sel=>{
   sel.onchange=()=>{
     const i=Number(sel.dataset.v43Type);
     let q=readCard(i);
     q.type=sel.value;
     if(q.type==="order"){
       if(!Array.isArray(q.fixed))q.fixed=[];
       if(!Array.isArray(q.answer))q.answer=[];
       q.items=[...q.answer];
     }else if(q.type==="choice"){
       if(!Array.isArray(q.options))q.options=[];
       if(typeof q.answer!=="string")q.answer="";
     }else{
       if(typeof q.target!=="string")q.target="";
     }
     questions[i]=q;
     const holder=document.querySelector(`#v43fields${i}`);
     if(holder)holder.innerHTML=q31fields(q,i);
   };
 });

 $("#v43Save").onclick=async()=>{
   const draft=questions.map((_,i)=>readCard(i));
   const btn=$("#v43Save");
   btn.disabled=true;btn.textContent="저장 중…";
   try{
     await saveAllQuestionsV43(draft);
     await loadQuestionsAuthoritativeV43();
     alert("Supabase에 전체 문제가 저장되었습니다. 브라우저를 껐다 켜도 그대로 유지됩니다.");
     await editor();
   }catch(err){
     console.error("QUESTION SAVE ERROR",err);
     alert("저장 실패: "+(err?.message||String(err)));
   }finally{
     if($("#v43Save")){
       $("#v43Save").disabled=false;
       $("#v43Save").textContent="💾 전체 문제 저장";
     }
   }
 };

 $("#v43Reload").onclick=async()=>{
   if(!confirm("아직 저장하지 않은 현재 수정 내용은 버리고 Supabase에 저장된 문제를 다시 불러올까요?"))return;
   await editor();
 };
};

const _beginSharedGameV43 = beginSharedGame;
beginSharedGame=async function(ses){
 await loadQuestionsAuthoritativeV43();
 return _beginSharedGameV43.apply(this,arguments);
};


// ===== v44: direct Supabase question restore/editor =====
// This editor renders DIRECTLY from game_questions rows.
// It does not depend on old cached/default question objects.

function v44DecodeRow(r){
 if(r.type==="order"){
   const d=extractOrderV39(r);
   return {
     question_no:Number(r.question_no),
     type:"order",
     round:r.round_name||"Question",
     title:r.title||"",
     fixed:d.fixed,
     answer:d.order,
     options:[...d.order],
     target:"",
     enabled:!!r.enabled
   };
 }
 if(r.type==="choice"){
   return {
     question_no:Number(r.question_no),
     type:"choice",
     round:r.round_name||"Question",
     title:r.title||"",
     fixed:[],
     options:Array.isArray(r.options)?r.options:[],
     answer:(r.answer&&typeof r.answer==="object")?(r.answer.value||""):(r.answer||""),
     target:"",
     enabled:!!r.enabled
   };
 }
 return {
   question_no:Number(r.question_no),
   type:"speak",
   round:r.round_name||"Question",
   title:r.title||"",
   fixed:[],options:[],answer:"",
   target:r.target||"",
   enabled:!!r.enabled
 };
}

async function v44FetchQuestions(){
 const {data,error}=await supabaseClient
   .from("game_questions")
   .select("question_no,type,round_name,title,target,options,answer,enabled,updated_at")
   .order("question_no",{ascending:true});
 if(error)throw error;
 return (data||[]).map(v44DecodeRow);
}

function v44Fields(q,i){
 if(q.type==="order"){
   return `<div class="order-editor-v30">
     <label>① 학생에게 먼저 보여줄 대화 <small>(한 줄에 한 문장)</small></label>
     <textarea data-v44-fixed="${i}">${esc((q.fixed||[]).join("\n"))}</textarea>
     <label>② 학생이 순서를 맞출 대화 <small>(한 줄에 한 문장 · 입력 순서가 정답)</small></label>
     <textarea data-v44-order="${i}">${esc((q.answer||[]).join("\n"))}</textarea>
   </div>`;
 }
 if(q.type==="choice"){
   return `<label>선택지 <small>(한 줄에 하나)</small></label>
     <textarea data-v44-options="${i}">${esc((q.options||[]).join("\n"))}</textarea>
     <label>정답</label>
     <input data-v44-answer="${i}" value="${esc(q.answer||"")}">`;
 }
 return `<label>학생이 읽을 목표 문장</label>
   <input data-v44-target="${i}" value="${esc(q.target||"")}">`;
}

editor=async function(){
 const panel=$("#panel");
 if(!panel)return;
 panel.innerHTML=`<div class="card"><p class="sub">Supabase에서 저장된 문제를 불러오는 중…</p></div>`;

 let dbQuestions;
 try{
   dbQuestions=await v44FetchQuestions();
 }catch(err){
   console.error(err);
   panel.innerHTML=`<div class="card"><div class="feedback bad">저장된 문제를 불러오지 못했습니다.<br>${esc(err?.message||String(err))}</div></div>`;
   return;
 }

 // Put the DB copy into the game state too.
 questions=dbQuestions.map(q=>({
   ...q,
   items:q.type==="order"?shuffle([...(q.answer||[])]):[]
 }));
 localStorage.setItem("LQ_questions",JSON.stringify(questions));

 panel.innerHTML=`<div class="card">
   <span class="badge">TEACHER EDITOR</span>
   <h2>게임 문제 편집</h2>
   <p class="sub">아래 내용은 지금 Supabase에 실제 저장되어 있는 문제입니다.</p>
   ${dbQuestions.map((q,i)=>`<div class="editor" data-v44-card="${i}">
     <div class="q31head">
       <b>Q${q.question_no}</b>
       <label><input style="width:auto" type="checkbox" data-v44-enabled="${i}" ${q.enabled?"checked":""}> 학생에게 출제</label>
     </div>
     <div class="row">
       <div><label>유형</label><select data-v44-type="${i}">
         <option value="order" ${q.type==="order"?"selected":""}>대화 순서</option>
         <option value="choice" ${q.type==="choice"?"selected":""}>객관식/빈칸</option>
         <option value="speak" ${q.type==="speak"?"selected":""}>음성 인식</option>
       </select></div>
       <div><label>문제 지시문</label><input data-v44-title="${i}" value="${esc(q.title)}"></div>
     </div>
     <div id="v44Fields${i}">${v44Fields(q,i)}</div>
   </div>`).join("")}
   <div class="actions">
     <button class="btn secondary" id="v44Reload">↻ Supabase에서 다시 불러오기</button>
     <button class="btn" id="v44Save">💾 전체 문제 저장</button>
   </div>
 </div>`;

 document.querySelectorAll("[data-v44-type]").forEach(sel=>{
   sel.onchange=()=>{
     const i=Number(sel.dataset.v44Type);
     const q=dbQuestions[i];
     // save common values from current card
     q.title=(document.querySelector(`[data-v44-title="${i}"]`)?.value||"").trim();
     q.enabled=!!document.querySelector(`[data-v44-enabled="${i}"]`)?.checked;
     // save OLD type fields before switching
     if(q.type==="order"){
       q.fixed=(document.querySelector(`[data-v44-fixed="${i}"]`)?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
       q.answer=(document.querySelector(`[data-v44-order="${i}"]`)?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
     }else if(q.type==="choice"){
       q.options=(document.querySelector(`[data-v44-options="${i}"]`)?.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
       q.answer=(document.querySelector(`[data-v44-answer="${i}"]`)?.value||"").trim();
     }else{
       q.target=(document.querySelector(`[data-v44-target="${i}"]`)?.value||"").trim();
     }
     q.type=sel.value;
     if(q.type==="order"){
       q.fixed=Array.isArray(q.fixed)?q.fixed:[];
       q.answer=Array.isArray(q.answer)?q.answer:[];
     }else if(q.type==="choice"){
       q.options=Array.isArray(q.options)?q.options:[];
       if(typeof q.answer!=="string")q.answer="";
     }else{
       if(typeof q.target!=="string")q.target="";
     }
     document.querySelector(`#v44Fields${i}`).innerHTML=v44Fields(q,i);
   };
 });

 $("#v44Save").onclick=async()=>{
   const draft=dbQuestions.map((q,i)=>{
     const x={...q};
     x.title=(document.querySelector(`[data-v44-title="${i}"]`)?.value||"").trim();
     x.enabled=!!document.querySelector(`[data-v44-enabled="${i}"]`)?.checked;
     x.type=document.querySelector(`[data-v44-type="${i}"]`)?.value||x.type;
     if(x.type==="order"){
       x.fixed=(document.querySelector(`[data-v44-fixed="${i}"]`)?.value||"").split("\n").map(v=>v.trim()).filter(Boolean);
       x.answer=(document.querySelector(`[data-v44-order="${i}"]`)?.value||"").split("\n").map(v=>v.trim()).filter(Boolean);
     }else if(x.type==="choice"){
       x.options=(document.querySelector(`[data-v44-options="${i}"]`)?.value||"").split("\n").map(v=>v.trim()).filter(Boolean);
       x.answer=(document.querySelector(`[data-v44-answer="${i}"]`)?.value||"").trim();
     }else{
       x.target=(document.querySelector(`[data-v44-target="${i}"]`)?.value||"").trim();
     }
     return x;
   });

   const rows=draft.map(q=>({
     question_no:q.question_no,
     type:q.type,
     round_name:q.round||"Question",
     title:q.title||"",
     target:q.type==="speak"?(q.target||null):null,
     options:q.type==="order"?(q.answer||[]):q.type==="choice"?(q.options||[]):[],
     answer:q.type==="order"?{fixed:q.fixed||[],order:q.answer||[]}:
            q.type==="choice"?{value:q.answer||""}:null,
     enabled:!!q.enabled,
     updated_at:new Date().toISOString()
   }));

   const btn=$("#v44Save");
   btn.disabled=true;btn.textContent="저장 중…";
   const {error}=await supabaseClient.from("game_questions").upsert(rows,{onConflict:"question_no"});
   if(error){
     console.error(error);
     alert("저장 실패: "+error.message);
     btn.disabled=false;btn.textContent="💾 전체 문제 저장";
     return;
   }
   alert("문제가 Supabase에 저장되었습니다.");
   await editor();
 };

 $("#v44Reload").onclick=()=>editor();
};

// On page load, refresh cached questions from Supabase too.
(async()=>{
 try{
   const fresh=await v44FetchQuestions();
   if(fresh.length){
     questions=fresh.map(q=>({...q,items:q.type==="order"?shuffle([...(q.answer||[])]):[]}));
     localStorage.setItem("LQ_questions",JSON.stringify(questions));
   }
 }catch(e){console.error("V44 initial question restore failed",e)}
})();


// ===== v46: minimal speech-recognition stability fix only =====
// Keep the existing UI/game flow. Fix repeated transcripts and improve start reliability.

function cleanSpeechTranscriptV46(text){
 const words=String(text||"").trim().replace(/\s+/g," ").split(" ").filter(Boolean);
 if(!words.length)return "";

 // Collapse accidental repeated phrases such as:
 // "don't forget don't forget don't forget ..." -> "don't forget"
 for(let size=1;size<=Math.min(8,Math.floor(words.length/2));size++){
   const phrase=words.slice(0,size).join(" ").toLowerCase();
   let repeated=true;
   for(let i=0;i<words.length;i+=size){
     const chunk=words.slice(i,i+size).join(" ").toLowerCase();
     if(chunk!==phrase){repeated=false;break;}
   }
   if(repeated)return words.slice(0,size).join(" ");
 }

 // Also cap an identical word repeated by recognition glitches.
 const out=[];
 for(const w of words){
   if(out.length>=2 &&
      out[out.length-1].toLowerCase()===w.toLowerCase() &&
      out[out.length-2].toLowerCase()===w.toLowerCase())continue;
   out.push(w);
 }
 return out.join(" ");
}

function startRec(q){
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!R){S.recognizing=false;return speak(q);}

 // Stop any stale recognizer before creating a new one.
 try{if(S.rec)S.rec.abort()}catch(e){}
 S.rec=null;
 S.transcript="";
 S.speechScore=null;

 const rec=new R();
 S.rec=rec;
 rec.lang="en-US";
 rec.continuous=false;       // one student utterance per recording
 rec.interimResults=true;
 rec.maxAlternatives=1;
 S.recognizing=true;

 let finalText="";
 let latestInterim="";

 rec.onstart=()=>{
   S.recognizing=true;
   speak(q);
 };

 rec.onresult=e=>{
   latestInterim="";
   for(let i=e.resultIndex;i<e.results.length;i++){
     const t=(e.results[i][0]?.transcript||"").trim();
     if(!t)continue;
     if(e.results[i].isFinal){
       // Replace with the final utterance instead of repeatedly appending it.
       finalText=t;
     }else{
       latestInterim=t;
     }
   }
   S.transcript=cleanSpeechTranscriptV46(finalText||latestInterim);
   const el=document.querySelector(".sub");
   if(el)el.innerHTML=`인식된 문장: <b>${esc(S.transcript)}</b>`;
 };

 rec.onerror=e=>{
   console.warn("speech recognition error",e?.error);
   S.recognizing=false;
   try{rec.abort()}catch(_){}
   speak(q);
 };

 rec.onend=()=>{
   S.recognizing=false;
   S.transcript=cleanSpeechTranscriptV46(finalText||latestInterim||S.transcript);
   S.speechScore=sim(S.transcript,q.target);
   speak(q);
 };

 try{
   rec.start();
 }catch(e){
   console.warn("speech start failed; retrying once",e);
   S.recognizing=false;
   try{rec.abort()}catch(_){}
   setTimeout(()=>{
     if(S.playQuestions?.[S.q]===q && !S.recognizing){
       try{
         const retry=new R();
         S.rec=retry;
         retry.lang="en-US";
         retry.continuous=false;
         retry.interimResults=true;
         retry.maxAlternatives=1;
         S.recognizing=true;
         let f="",inter="";
         retry.onstart=()=>speak(q);
         retry.onresult=ev=>{
           inter="";
           for(let i=ev.resultIndex;i<ev.results.length;i++){
             const t=(ev.results[i][0]?.transcript||"").trim();
             if(ev.results[i].isFinal)f=t; else inter=t;
           }
           S.transcript=cleanSpeechTranscriptV46(f||inter);
           const el=document.querySelector(".sub");
           if(el)el.innerHTML=`인식된 문장: <b>${esc(S.transcript)}</b>`;
         };
         retry.onerror=()=>{S.recognizing=false;speak(q)};
         retry.onend=()=>{S.recognizing=false;S.transcript=cleanSpeechTranscriptV46(f||inter||S.transcript);S.speechScore=sim(S.transcript,q.target);speak(q)};
         retry.start();
       }catch(_){S.recognizing=false;speak(q)}
     }
   },250);
 }
}

function stopRec(q){
 S.recognizing=false;
 try{if(S.rec)S.rec.stop()}catch(e){}
 S.transcript=cleanSpeechTranscriptV46(S.transcript);
 S.speechScore=sim(S.transcript,q.target);
 setTimeout(()=>speak(q),100);
}
