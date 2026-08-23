
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
let questions=JSON.parse(localStorage.getItem("LQ_questions")||"null")||DEFAULT;
let S={student:null,q:0,score:0,combo:0,correct:0,answers:[],selected:null,order:[],transcript:"",speechScore:null,recognizing:false,rec:null,questionStartedAt:null,sessionId:null};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function layout(x){app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Listening <b>Quest</b> <small>v2</small></div></div>${x}</div>`}
function stage(score){return score>=1200?2:score>=600?1:0}
function petInfo(){
 let p=PETS[S.student.pet],i=stage(S.score),next=i===0?600:i===1?1200:1200,base=i===0?0:i===1?600:1200;
 return {p,i,emoji:p.stages[i][0],name:p.stages[i][1],pct:i===2?100:Math.min(100,(S.score-base)/(next-base)*100),next};
}

function rankingRows(){
 const sid=S.sessionId;
 let rows=JSON.parse(localStorage.getItem("LQ_live_session")||"[]")
   .filter(x=>x.sessionId===sid)
   .map(x=>({name:x.name,className:x.className,score:x.score,updatedAt:x.updatedAt}));
 if(S.student){
   rows=rows.filter(x=>!(x.name===S.student.name && x.className===S.student.className));
   rows.push({name:S.student.name,className:S.student.className,score:S.score,current:true,updatedAt:Date.now()});
 }
 rows.sort((a,b)=>b.score-a.score || a.updatedAt-b.updatedAt);
 return rows.slice(0,5);
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
function home(){
 layout(`<div class="card hero"><span class="badge">🎧 LISTENING QUEST</span><h1>Choose. Play.<br>Grow!</h1><p class="sub">영어 문제를 풀고 점수를 모아 내 캐릭터를 진화시키세요.</p>
 <div class="grid2"><div><label>학급</label><select id="cls">${[...Array(11)].map((_,i)=>`<option>2학년 ${i+1}반</option>`).join("")}</select></div><div><label>이름</label><input id="nm" placeholder="이름"></div></div>
 <label>캐릭터 선택</label><div class="chars">${Object.entries(PETS).map(([k,p],i)=>`<button class="char ${i===0?"sel":""}" data-p="${k}"><div class="emoji">${p.stages[0][0]}</div><b>${p.name}</b><span class="note">${p.stages.map(x=>x[1]).join(" → ")}</span></button>`).join("")}</div>
 <button class="btn full" id="go">GAME START →</button><button class="teacher-icon" id="teacher" title="교사용">⚙️</button>
 <p class="note">진화 기준: 600점 / 1,200점 · 정답 기본 점수: 100점 · 콤보 보너스: 최대 50점</p></div>`);
 let pet="chicken";document.querySelectorAll(".char").forEach(b=>b.onclick=()=>{pet=b.dataset.p;document.querySelectorAll(".char").forEach(x=>x.classList.remove("sel"));b.classList.add("sel")});
 $("#go").onclick=()=>{let name=$("#nm").value.trim();if(!name)return alert("이름을 입력해 주세요.");let aq=activeQuestions();if(!aq.length)return alert("교사가 아직 문제를 등록하지 않았습니다.");
 let cls=$("#cls").value;
 let active=JSON.parse(localStorage.getItem("LQ_active_sessions")||"{}");
 let sid=active[cls]||(`${cls}-${Date.now()}`);
 if(!active[cls]){active[cls]=sid;localStorage.setItem("LQ_active_sessions",JSON.stringify(active));}
 questions=questions;S={...S,student:{name,className:cls,pet},q:0,score:0,combo:0,correct:0,answers:[],transcript:"",speechScore:null,playQuestions:aq,sessionId:sid};updateLiveSession();question()};
 $("#teacher").onclick=teacherGate;
}
function chrome(inner){
 let pi=petInfo(), pct=S.q/S.playQuestions.length*100;
 layout(`<div class="petbar"><div class="petemoji">${pi.emoji}</div><div class="evo"><b>${pi.name}</b> · ${S.score}점<div class="evoline"><div style="width:${pi.pct}%"></div></div><span class="note">${pi.i<2?`다음 진화까지 ${Math.max(0,pi.next-S.score)}점`:"최종 진화 완료!"}</span></div></div>
 <div class="gamehead"><div><div class="note">${esc(S.student.className)} · ${esc(S.student.name)} · ${S.q+1}/${S.playQuestions.length}</div><div class="progress"><div style="width:${pct}%"></div></div></div><div class="stats"><div class="pill">⭐ ${S.score}점</div><div class="pill">🔥 ${S.combo} COMBO</div></div></div>
 <div class="playgrid"><div class="card">${inner}</div>${rankingHTML()}</div>`);
}
function question(){S.selected=null;S.transcript="";S.speechScore=null;S.questionStartedAt=Date.now();let q=S.playQuestions[S.q];if(q.type==="order"){S.order=[...q.items];order(q)}else if(q.type==="choice")choice(q);else speak(q)}
function choice(q){chrome(`<div class="round">${q.round}</div><div class="prompt">${esc(q.title).replace(/\n/g,"<br>")}</div>${q.options.map(o=>`<button class="option ${S.selected===o?"sel":""}" data-o="${esc(o)}">${esc(o)}</button>`).join("")}<div class="actions"><button class="btn" id="check">CHECK</button></div>`);
 document.querySelectorAll(".option").forEach(b=>b.onclick=()=>{S.selected=b.dataset.o;choice(q)});$("#check").onclick=()=>{if(!S.selected)return alert("답을 골라 주세요.");finish(S.selected===q.answer,S.selected)}
}
function order(q){chrome(`<div class="round">${q.round}</div><div class="prompt">${esc(q.title)}</div>${S.order.map((x,i)=>`<div class="order"><span>${i+1}. ${esc(x)}</span><div><button class="icon" data-u="${i}">↑</button> <button class="icon" data-d="${i}">↓</button></div></div>`).join("")}<div class="actions"><button class="btn" id="check">CHECK</button></div>`);
 document.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>mv(+b.dataset.u,-1,q));document.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>mv(+b.dataset.d,1,q));$("#check").onclick=()=>finish(JSON.stringify(S.order)===JSON.stringify(q.answer),S.order.join(" | "))}
function mv(i,d,q){let j=i+d;if(j<0||j>=S.order.length)return;[S.order[i],S.order[j]]=[S.order[j],S.order[i]];order(q)}
function speedBonus(){
 const sec=Math.max(0,(Date.now()-(S.questionStartedAt||Date.now()))/1000);
 if(sec<=5)return {points:100,label:"⚡ 번개 보너스 +100"};
 if(sec<=10)return {points:70,label:"⚡ 스피드 보너스 +70"};
 if(sec<=15)return {points:40,label:"⏱ 빠른 정답 +40"};
 if(sec<=20)return {points:20,label:"⏱ 시간 보너스 +20"};
 return {points:0,label:""};
}
function finish(ok,response){
 let before=stage(S.score),gain=0,bonus={points:0,label:""};if(ok){S.correct++;S.combo++;bonus=speedBonus();gain=100+bonus.points+Math.min(S.combo*10,50);S.score+=gain}else S.combo=0;
 S.answers.push({q:S.q+1,type:S.playQuestions[S.q].type,correct:ok,response,points:gain,speedBonus:bonus.points});updateLiveSession();
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
 let gain=Math.round(raw)+(raw>=70?Math.round(sb.points*0.5):0); // 발음 정확도가 중심, 빠른 성공은 최대 +50
 S.score+=gain;if(raw>=70){S.correct++;S.combo++}else S.combo=0;S.answers.push({q:S.q+1,type:"speak",correct:raw>=70,response:S.transcript,speechScore:raw,points:gain});updateLiveSession();
 let after=stage(S.score);if(after>before){let p=petInfo();evolutionToast(p.emoji,p.name);setTimeout(next,1050);}else next();
}
function next(){S.q++;S.recognizing=false;if(S.q>=S.playQuestions.length)results();else question()}
function results(){save();let pi=petInfo(),acc=Math.round(S.correct/S.playQuestions.length*100);layout(`<div class="card hero"><span class="badge">MISSION COMPLETE</span><h1>${pi.emoji} ${esc(S.student.name)}의 결과</h1><div class="metrics"><div class="metric"><span>SCORE</span><b>${S.score}</b></div><div class="metric"><span>ACCURACY</span><b>${acc}%</b></div><div class="metric"><span>CHARACTER</span><b>${pi.name}</b></div></div><table><tr><th>문제</th><th>유형</th><th>점수</th></tr>${S.answers.map(a=>`<tr><td>Q${a.q}</td><td>${a.type}</td><td>+${a.points}${a.speechScore!=null?` (발음 ${a.speechScore})`:""}</td></tr>`).join("")}</table><div class="actions"><button class="btn" id="home">처음으로</button></div></div>`);$("#home").onclick=home}
function save(){let r=JSON.parse(localStorage.getItem("LQ_results")||"[]");r.push({student:S.student,score:S.score,correct:S.correct,total:S.playQuestions.length,answers:S.answers,date:new Date().toISOString(),sessionId:S.sessionId});localStorage.setItem("LQ_results",JSON.stringify(r))}
function teacher(){
 let results=JSON.parse(localStorage.getItem("LQ_results")||"[]");
 layout(`<div class="tabs"><button class="tab active" id="editTab">✏️ 문제 편집</button><button class="tab" id="reportTab">📊 리포트</button><button class="tab" id="sessionTab">🏁 새 게임 세션</button><button class="tab" id="studentTab">학생 화면</button></div><div id="panel"></div>`);
 $("#editTab").onclick=()=>editor();$("#reportTab").onclick=()=>report(results);$("#sessionTab").onclick=()=>sessionManager();$("#studentTab").onclick=home;editor();
}

function sessionManager(){
 $("#panel").innerHTML=`<div class="card"><span class="badge">GAME SESSION</span><h2>새 게임 세션 시작</h2>
 <p class="sub">새 수업을 시작할 때 해당 반의 세션을 초기화하세요. 그러면 이전 게임 점수는 LIVE RANKING에서 제외되고 모두 0점부터 새로 경쟁합니다. 과거 기록은 리포트에 그대로 남습니다.</p>
 <div class="grid2"><div><label>학급</label><select id="sessionClass">${[...Array(11)].map((_,i)=>`<option>2학년 ${i+1}반</option>`).join("")}</select></div>
 <div style="display:flex;align-items:end"><button class="btn full" id="newSession">🏁 이 반 새 게임 시작</button></div></div>
 <div id="sessionMsg" class="note" style="margin-top:15px"></div></div>`;
 $("#newSession").onclick=()=>{
   const cls=$("#sessionClass").value;
   let active=JSON.parse(localStorage.getItem("LQ_active_sessions")||"{}");
   active[cls]=`${cls}-${Date.now()}`;
   localStorage.setItem("LQ_active_sessions",JSON.stringify(active));
   $("#sessionMsg").innerHTML=`✓ <b>${esc(cls)}</b>의 새 게임 세션을 만들었습니다. 이전 플레이 점수는 새 랭킹에 포함되지 않습니다.`;
 };
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
  localStorage.setItem("LQ_questions",JSON.stringify(questions));alert("저장되었습니다. 학생 게임에 바로 반영됩니다.");
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
