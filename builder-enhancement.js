function normalizePiece(s){return s.replace(/^-|-$/g,"")}
function pieceClass(part){
  const x=data.find(d=>d.part===part);
  const type=x?x.type:(part.endsWith("-")?"Prefix":part.startsWith("-")?"Suffix":"Root");
  return type==="Prefix"?"prefix-piece":type==="Suffix"?"suffix-piece":"root-piece";
}
function pieceType(part){
  const x=data.find(d=>d.part===part);
  return x?x.type:(part.endsWith("-")?"Prefix":part.startsWith("-")?"Suffix":"Root");
}
function pieceLabel(part){
  const x=data.find(d=>d.part===part);
  return x?`${part} — ${x.meaning}`:part;
}
function makePiece(part, source="builder"){
  const el=document.createElement("div");
  el.className=`puzzle-piece ${pieceClass(part)}`;
  el.draggable=true;
  el.dataset.part=part;
  el.title=pieceLabel(part);
  el.innerHTML=`<span>${part}</span>`;
  el.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",part);e.dataTransfer.effectAllowed="copy";el.classList.add("dragging")});
  el.addEventListener("dragend",()=>el.classList.remove("dragging"));
  if(source==="builder") el.addEventListener("click",()=>addBuilderPiece(part));
  return el;
}

const termMap=Object.fromEntries(terms.map(t=>[t[0],{parts:t[1],definition:t[2]}]));
const allTermParts=[...new Set(terms.flatMap(t=>t[1]))];
const builderParts=[...new Set([...data.filter(x=>["Prefix","Root","Combining form","Suffix"].includes(x.type)).map(x=>x.part),...allTermParts])];

function renderPiecePalette(id,parts){
  const box=document.getElementById(id); box.innerHTML="";
  parts.forEach(part=>box.appendChild(makePiece(part)));
}

function installBuilderUI(){
  const old=document.getElementById("builder");
  if(!old)return;
  old.innerHTML=`<div class="card"><h2>🧩 Medical Term Builder</h2><p class="muted builder-intro">Drag puzzle pieces into the build area, or tap a piece to add it. Put the word parts in order and the site will assemble the medical term using the Chapter 1 combining-vowel rules.</p><div class="builder-layout"><div class="card"><h3>1. Choose puzzle pieces</h3><div class="piece-group"><h3 class="prefix">Prefixes</h3><div id="prefixPieces" class="piece-palette"></div></div><div class="piece-group"><h3 class="root">Roots / Combining Forms</h3><div id="rootPieces" class="piece-palette"></div></div><div class="piece-group"><h3 class="suffix">Suffixes</h3><div id="suffixPieces" class="piece-palette"></div></div></div><div class="card"><h3>2. Build the word</h3><p class="muted small">Drop pieces here in the order you want them. Click a piece in the build area to remove it.</p><div id="builderAssembly" class="assembly empty">Drop or tap puzzle pieces here</div><div class="piece-count" id="builderPieceCount">0 pieces</div><div class="builder-actions"><button class="secondary" onclick="clearBuilder()">Clear</button></div><div class="card builder-result"><div class="muted">Finished word</div><div id="buildResult" class="stat term">—</div><div id="buildMeaning" class="definition-box">Build a term to see its definition.</div></div></div></div></div><div class="card builder-quiz"><h2>🧩 Builder Quiz</h2><p class="muted">Build the medical term that matches the prompt. Use the puzzle pieces and then check your answer.</p><div id="builderQuizBox"></div></div>`;
  renderPiecePalette("prefixPieces",builderParts.filter(p=>pieceType(p)==="Prefix"));
  renderPiecePalette("rootPieces",builderParts.filter(p=>pieceType(p)!=="Prefix"&&pieceType(p)!=="Suffix"));
  renderPiecePalette("suffixPieces",builderParts.filter(p=>pieceType(p)==="Suffix"));
  builderAssembly=[];
  renderBuilderAssembly();
  pickBuilderQuiz();
}

let builderAssembly=[];
function addBuilderPiece(part){builderAssembly.push(part);renderBuilderAssembly();}
function removeBuilderPiece(index){builderAssembly.splice(index,1);renderBuilderAssembly();}
function clearBuilder(){builderAssembly=[];renderBuilderAssembly();}
function renderBuilderAssembly(){
  const box=document.getElementById("builderAssembly");
  if(!box)return;
  box.innerHTML="";
  box.classList.toggle("empty",builderAssembly.length===0);
  if(!builderAssembly.length)box.textContent="Drop or tap puzzle pieces here";
  builderAssembly.forEach((part,i)=>{
    const el=makePiece(part,"assembly");
    el.draggable=true;
    el.title="Click to remove this piece";
    el.addEventListener("click",()=>removeBuilderPiece(i));
    el.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",`MOVE:${i}`);e.dataTransfer.effectAllowed="move"});
    box.appendChild(el);
  });
  document.getElementById("builderPieceCount").textContent=`${builderAssembly.length} piece${builderAssembly.length===1?"":"s"}`;
  updateBuildResult();
}
function setupDropZone(box,onDrop){
  box.addEventListener("dragover",e=>{e.preventDefault();box.style.borderColor="var(--accent)"});
  box.addEventListener("dragleave",()=>box.style.borderColor="");
  box.addEventListener("drop",e=>{e.preventDefault();box.style.borderColor="";onDrop(e.dataTransfer.getData("text/plain"))});
}
function setupBuilderDrop(){
  const box=document.getElementById("builderAssembly");
  if(!box)return;
  setupDropZone(box,payload=>{
    if(payload.startsWith("MOVE:")){
      const i=Number(payload.slice(5));
      if(Number.isInteger(i)&&i>=0&&i<builderAssembly.length){const [item]=builderAssembly.splice(i,1);builderAssembly.push(item);renderBuilderAssembly();}
    }else if(payload){addBuilderPiece(payload)}
  });
}

function assembleParts(parts){
  let out="";
  parts.forEach((part,i)=>{
    const raw=normalizePiece(part);
    const hasSlash=part.includes("/");
    const isSuffix=part.startsWith("-");
    if(i===0){out+=hasSlash?raw.replace("/",""):raw;return;}
    if(isSuffix){
      const first=raw.charAt(0).toLowerCase();
      const prev=parts[i-1]||"";
      const prevHasCombiningVowel=prev.includes("/")||/[aeiou]$/.test(normalizePiece(prev));
      out+=(!prevHasCombiningVowel&&!"aeiou".includes(first))?"o":"";
      out+=raw;
    }else out+=hasSlash?raw.replace("/",""):raw;
  });
  return out;
}
function updateBuildResult(){
  const result=assembleParts(builderAssembly);
  document.getElementById("buildResult").textContent=result||"—";
  if(!result){document.getElementById("buildMeaning").textContent="Build a term to see its definition.";return;}
  const exact=termMap[result];
  if(exact){document.getElementById("buildMeaning").innerHTML=`<b>Definition:</b> ${exact.definition}`;return;}
  const meanings=builderAssembly.map(p=>{const d=data.find(x=>x.part===p);return d?d.meaning:null}).filter(Boolean);
  document.getElementById("buildMeaning").innerHTML=`<b>Word-part meaning:</b> ${meanings.join(" + ")}<br><span class="muted small">No exact Chapter 1 term matches this combination yet.</span>`;
}

let builderQuizTarget=null,builderQuizAssembly=[];
function pickBuilderQuiz(){
  builderQuizTarget=terms[Math.floor(Math.random()*terms.length)];
  builderQuizAssembly=[];
  renderBuilderQuiz();
}
function renderBuilderQuiz(){
  const q=builderQuizTarget, correct=q[1];
  const distractors=builderParts.filter(p=>!correct.includes(p)).sort(()=>Math.random()-.5).slice(0,Math.min(7,Math.max(3,8-correct.length)));
  const bank=[...correct,...distractors].sort(()=>Math.random()-.5);
  document.getElementById("builderQuizBox").innerHTML=`<div class="prompt-box"><div class="muted">Build the term from this definition</div><div class="definition">${q[2]}</div><div class="piece-count">${correct.length} puzzle pieces are needed.</div></div><h3 style="margin-top:16px">Puzzle pieces</h3><div id="quizPieceBank" class="piece-palette quiz-piece-bank"></div><h3 style="margin-top:16px">Your build</h3><div id="quizAssembly" class="assembly empty">Drop or tap pieces here</div><div class="builder-actions"><button class="primary" onclick="checkBuilderQuiz()">Check my build</button><button class="secondary" onclick="clearBuilderQuiz()">Clear</button><button class="secondary" onclick="pickBuilderQuiz()">New prompt</button></div><div id="builderQuizFeedback"></div>`;
  const bankBox=document.getElementById("quizPieceBank");
  bank.forEach(part=>{const el=makePiece(part,"quiz");el.addEventListener("click",()=>addBuilderQuizPiece(part));bankBox.appendChild(el)});
  setupDropZone(document.getElementById("quizAssembly"),payload=>{if(payload) addBuilderQuizPiece(payload)});
}
function addBuilderQuizPiece(part){builderQuizAssembly.push(part);renderQuizAssembly()}
function clearBuilderQuiz(){builderQuizAssembly=[];renderQuizAssembly()}
function renderQuizAssembly(){
  const box=document.getElementById("quizAssembly");if(!box)return;
  box.innerHTML="";box.classList.toggle("empty",builderQuizAssembly.length===0);
  if(!builderQuizAssembly.length)box.textContent="Drop or tap pieces here";
  builderQuizAssembly.forEach((part,i)=>{const el=makePiece(part,"quizAssembly");el.title="Click to remove";el.addEventListener("click",()=>{builderQuizAssembly.splice(i,1);renderQuizAssembly()});box.appendChild(el)});
}
function checkBuilderQuiz(){
  const feedback=document.getElementById("builderQuizFeedback"),target=builderQuizTarget[1];
  const ok=builderQuizAssembly.length===target.length&&builderQuizAssembly.every((p,i)=>p===target[i]);
  if(ok)feedback.innerHTML=`<div class="quiz-feedback good"><b>Correct!</b> You built <span class="term">${builderQuizTarget[0]}</span>.<br><b>Definition:</b> ${builderQuizTarget[2]}<br><button class="primary" style="margin-top:9px" onclick="pickBuilderQuiz()">Next builder challenge</button></div>`;
  else{const samePrefix=builderQuizAssembly.length>0&&builderQuizAssembly[0]===target[0];feedback.innerHTML=`<div class="quiz-feedback bad"><b>Not quite yet.</b> Check the order and make sure you have the right pieces.${samePrefix?" Your first piece is correct.":""}</div>`;}
}

installBuilderUI();
setupBuilderDrop();
