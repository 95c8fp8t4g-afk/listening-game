
const app = document.querySelector("#app");

const questions = [
  {
    type:"order", round:"Dialogue Order", title:"대화문을 자연스러운 순서로 배열하세요.",
    items:[
      "Sure. What time should we meet?",
      "Do you want to watch a movie?",
      "How about 3 p.m.?",
      "Sounds great!"
    ],
    answer:[
      "Do you want to watch a movie?",
      "Sure. What time should we meet?",
      "How about 3 p.m.?",
      "Sounds great!"
    ]
  },
  {
    type:"choice", round:"Fill in the Blank",
    title:"I'm going to ______ my grandparents this weekend.",
    options:["visit","visited","visiting","visits"], answer:"visit"
  },
  {
    type:"choice", round:"Listening Comprehension",
    title:'A: Did you enjoy the concert?\nB: ______\nA: That’s too bad.',
    options:["Yes, it was amazing.","No, I couldn't go.","I listen to music every day.","Let's buy a ticket."],
    answer:"No, I couldn't go."
  },
  {
    type:"speak", round:"Speaking Challenge",
    title:"문장을 소리 내어 읽어 보세요.",
    target:"I'd like to return this shirt."
  }
];

let state = {
  student:null, q:0, xp:0, combo:0, correct:0, answers:[], selected:null,
  order:[], transcript:"", speakingScore:null
};

function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function normalize(s){return s.toLowerCase().replace(/[.,!?']/g,"").replace(/\s+/g," ").trim()}
function similarity(a,b){
  const A=normalize(a).split(" "), B=normalize(b).split(" ");
  if(!A.length||!B.length)return 0;
  let hit=0, used=[];
  A.forEach(w=>{let i=B.findIndex((x,j)=>x===w&&!used.includes(j));if(i>=0){hit++;used.push(i)}});
  return Math.round((2*hit/(A.length+B.length))*100);
}
function layout(content){
  app.innerHTML=`<div class="shell"><div class="topbar"><div class="brand">Listening <span>Quest</span></div></div>${content}</div>`;
}
function startScreen(){
  layout(`<div class="card hero">
    <span class="badge">🎧 ENGLISH GAME</span>
    <h1>Listen. Play.<br>Level Up.</h1>
    <p class="sub">듣기 활동이 끝났다면 게임으로 한 번 더 확인해 보세요.</p>
    <div class="grid">
      <div><label>학년 / 반</label><select id="className">
        <option>2학년 1반</option><option>2학년 2반</option><option>2학년 3반</option><option>2학년 4반</option>
      </select></div>
      <div><label>이름</label><input id="name" placeholder="이름을 입력하세요"></div>
    </div>
    <button class="btn full" id="start">GAME START →</button>
    <button class="mode-link" id="teacher">교사용 데모 대시보드</button>
    <p class="note">MVP 데모 버전 · 현재 결과는 이 브라우저에만 저장됩니다.</p>
  </div>`);
  document.querySelector("#start").onclick=()=>{
    const name=document.querySelector("#name").value.trim();
    if(!name){alert("이름을 입력해 주세요.");return}
    state={...state,student:{name,className:document.querySelector("#className").value},q:0,xp:0,combo:0,correct:0,answers:[],selected:null,transcript:"",speakingScore:null};
    renderQuestion();
  };
  document.querySelector("#teacher").onclick=teacherDashboard;
}
function gameChrome(inner){
  const pct=(state.q/questions.length)*100;
  layout(`<div class="game-head">
    <div><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:6px"><span>${esc(state.student.className)} · ${esc(state.student.name)}</span><span>${state.q+1}/${questions.length}</span></div><div class="progress"><div style="width:${pct}%"></div></div></div>
    <div class="stats"><div class="stat">⭐ ${state.xp} XP</div><div class="stat">🔥 ${state.combo} COMBO</div></div>
  </div><div class="card question-card">${inner}</div>`);
}
function renderQuestion(){
  const q=questions[state.q];
  state.selected=null;
  if(q.type==="order") state.order=[...q.items];
  if(q.type==="choice") renderChoice(q);
  else if(q.type==="order") renderOrder(q);
  else renderSpeak(q);
}
function renderChoice(q,feedback=""){
  gameChrome(`<div class="round">${q.round}</div><div class="prompt">${esc(q.title).replace(/\n/g,"<br>")}</div>
    <div id="options">${q.options.map(o=>`<button class="option ${state.selected===o?"selected":""}" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>
    ${feedback}<div class="footer-actions"><button class="btn" id="check">CHECK</button></div>`);
  document.querySelectorAll(".option").forEach(b=>b.onclick=()=>{state.selected=b.dataset.o;renderChoice(q)});
  document.querySelector("#check").onclick=()=>{
    if(!state.selected){alert("답을 선택해 주세요.");return}
    const ok=state.selected===q.answer; record(ok,state.selected);
    showAnswered(`<div class="feedback ${ok?"ok":"bad"}">${ok?"✓ Correct!":"✕ 정답: "+esc(q.answer)}</div>`);
  };
}
function renderOrder(q){
  gameChrome(`<div class="round">${q.round}</div><div class="prompt">${q.title}</div>
    ${state.order.map((x,i)=>`<div class="order-item"><span>${i+1}. ${esc(x)}</span><span class="order-actions"><button class="iconbtn" data-up="${i}">↑</button><button class="iconbtn" data-down="${i}">↓</button></span></div>`).join("")}
    <div class="footer-actions"><button class="btn" id="check">CHECK</button></div>`);
  document.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>move(+b.dataset.up,-1,q));
  document.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>move(+b.dataset.down,1,q));
  document.querySelector("#check").onclick=()=>{
    const ok=JSON.stringify(state.order)===JSON.stringify(q.answer); record(ok,state.order.join(" | "));
    showAnswered(`<div class="feedback ${ok?"ok":"bad"}">${ok?"✓ Perfect order!":"✕ 순서를 다시 확인해 보세요."}</div>`);
  };
}
function move(i,d,q){const j=i+d;if(j<0||j>=state.order.length)return;[state.order[i],state.order[j]]=[state.order[j],state.order[i]];renderOrder(q)}
function renderSpeak(q){
  const supported=("webkitSpeechRecognition" in window)||("SpeechRecognition" in window);
  gameChrome(`<div class="round">${q.round}</div><div class="prompt">${q.title}</div>
    <div class="speak-box"><div style="font-size:25px;font-weight:900;margin-bottom:22px">“${esc(q.target)}”</div>
      <button class="mic" id="mic">🎤</button>
      <div class="transcript" id="transcript">${state.transcript?`인식 결과: <b>${esc(state.transcript)}</b>`:"마이크를 누르고 문장을 읽어 보세요."}</div>
      ${state.speakingScore!==null?`<div class="score-big">${state.speakingScore}</div><div class="note">현재 MVP의 점수는 발음 자체가 아니라 <b>인식된 단어와 목표 문장의 일치도</b>입니다.</div>`:""}
      ${!supported?`<div class="feedback bad">이 브라우저에서는 음성 인식 기능을 지원하지 않습니다.</div>`:""}
    </div>
    <div class="footer-actions">${state.speakingScore!==null?`<button class="btn" id="next">NEXT →</button>`:""}</div>`);
  if(supported) document.querySelector("#mic").onclick=()=>recognize(q);
  if(state.speakingScore!==null) document.querySelector("#next").onclick=()=>{record(state.speakingScore>=70,state.transcript,state.speakingScore);next()};
}
function recognize(q){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const r=new SR();r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;
  document.querySelector("#transcript").textContent="듣고 있어요…";
  r.onresult=e=>{state.transcript=e.results[0][0].transcript;state.speakingScore=similarity(state.transcript,q.target);renderSpeak(q)};
  r.onerror=e=>{document.querySelector("#transcript").textContent="음성을 인식하지 못했어요. 다시 시도해 주세요."};
  r.start();
}
function record(ok,response,speakingScore=null){
  if(ok){state.correct++;state.combo++;state.xp+=1000+Math.min(state.combo*100,500)}else state.combo=0;
  state.answers.push({question:state.q+1,type:questions[state.q].type,correct:ok,response,speakingScore});
}
function showAnswered(feedback){
  const card=document.querySelector(".question-card");
  card.insertAdjacentHTML("beforeend",`${feedback}<div class="footer-actions"><button class="btn" id="next">NEXT →</button></div>`);
  const old=card.querySelector("#check");if(old)old.remove();
  card.querySelectorAll("button.option,.iconbtn").forEach(b=>b.disabled=true);
  document.querySelector("#next").onclick=next;
}
function next(){state.q++; if(state.q>=questions.length) results(); else renderQuestion()}
function results(){
  saveLocal();
  const accuracy=Math.round(state.correct/questions.length*100);
  layout(`<div class="card hero" style="max-width:760px">
    <span class="badge">MISSION COMPLETE</span><h1 style="font-size:42px">Great work, ${esc(state.student.name)}!</h1>
    <div class="result-grid"><div class="metric"><span>TOTAL XP</span><b>${state.xp}</b></div><div class="metric"><span>ACCURACY</span><b>${accuracy}%</b></div><div class="metric"><span>CORRECT</span><b>${state.correct}/${questions.length}</b></div></div>
    <h2>학습 기록</h2><table><tr><th>문제</th><th>유형</th><th>결과</th></tr>${state.answers.map(a=>`<tr><td>Q${a.question}</td><td>${a.type}</td><td>${a.speakingScore!==null?"🎤 "+a.speakingScore+"점":a.correct?"✓ 정답":"✕ 오답"}</td></tr>`).join("")}</table>
    <div class="footer-actions"><button class="btn secondary" id="home">처음으로</button><button class="btn" id="teacher">교사 리포트 보기</button></div>
  </div>`);
  document.querySelector("#home").onclick=startScreen;document.querySelector("#teacher").onclick=teacherDashboard;
}
function saveLocal(){
  const rows=JSON.parse(localStorage.getItem("listeningQuestResults")||"[]");
  rows.push({date:new Date().toISOString(),student:state.student,xp:state.xp,correct:state.correct,total:questions.length,answers:state.answers});
  localStorage.setItem("listeningQuestResults",JSON.stringify(rows));
}
function teacherDashboard(){
  const rows=JSON.parse(localStorage.getItem("listeningQuestResults")||"[]");
  const demo=rows.length?rows:[
    {student:{name:"김민수",className:"2학년 1반"},correct:4,total:4,xp:4500,answers:[{speakingScore:88}]},
    {student:{name:"이서연",className:"2학년 1반"},correct:3,total:4,xp:3300,answers:[{speakingScore:79}]},
    {student:{name:"박지훈",className:"2학년 1반"},correct:2,total:4,xp:2100,answers:[{speakingScore:68}]}
  ];
  const avg=Math.round(demo.reduce((s,r)=>s+r.correct/r.total*100,0)/demo.length);
  const sp=demo.flatMap(r=>r.answers||[]).map(a=>a.speakingScore).filter(x=>x!=null);
  const spAvg=sp.length?Math.round(sp.reduce((a,b)=>a+b,0)/sp.length):"-";
  layout(`<div class="tabs"><button class="tab active">Overview</button><button class="tab" id="back">학생 화면</button></div>
  <div class="card"><span class="badge">TEACHER DASHBOARD</span><h1 style="font-size:38px">Class Report</h1>
  <p class="sub">${rows.length?"이 브라우저에서 실제로 플레이한 결과입니다.":"아직 저장된 결과가 없어 샘플 데이터를 보여주고 있습니다."}</p>
  <div class="dashboard-grid"><div class="metric"><span>참여 기록</span><b>${demo.length}</b></div><div class="metric"><span>평균 정답률</span><b>${avg}%</b></div><div class="metric"><span>Speaking 평균</span><b>${spAvg}${spAvg==="-"?"":"점"}</b></div></div>
  <h2>학생별 결과</h2><table><tr><th>학급</th><th>이름</th><th>정답률</th><th>XP</th></tr>
  ${demo.map(r=>`<tr><td>${esc(r.student.className)}</td><td>${esc(r.student.name)}</td><td>${Math.round(r.correct/r.total*100)}%</td><td>${r.xp}</td></tr>`).join("")}</table>
  <p class="note" style="margin-top:20px">현재 버전은 localStorage를 사용합니다. 따라서 다른 학생 기기의 결과가 교사 기기로 자동 수집되지는 않습니다. 다음 단계에서 Supabase를 연결하면 여러 기기의 결과를 한곳에 모을 수 있습니다.</p>
  </div>`);
  document.querySelector("#back").onclick=startScreen;
}
startScreen();
