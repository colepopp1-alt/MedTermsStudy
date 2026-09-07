/* Clean Builder: roots and combining vowels are separate puzzle-piece banks. */
function normalizePiece(s){return String(s||'').replace(/^-|-$/g,'')}
function sourcePart(part){return data.find(d=>d.part===part)}
function partType(part){const x=sourcePart(part);if(x)return x.type;return part.startsWith('-')?'Suffix':part.endsWith('-')?'Root':'Root'}
function partMeaning(part){const x=sourcePart(part);return x?x.meaning:''}
function uniqueParts(parts){return [...new Set(parts)]}

function makePuzzlePiece(part,type,source='builder'){
  const el=document.createElement('div');
  el.className=`puzzle-piece ${type}-piece`;
  el.draggable=true;
  el.dataset.part=part;
  el.dataset.type=type;
  el.title=partMeaning(part)||part;
  el.innerHTML=`<span>${part}</span>`;
  el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',JSON.stringify({part,type}));e.dataTransfer.effectAllowed='copy'});
  if(source==='builder')el.addEventListener('click',()=>addBuilderPiece(part,type));
  return el;
}

function getBuilderVowels(){
  const found=[];
  data.filter(d=>d.type==='Combining form').forEach(d=>{
    const m=d.part.match(/\/([a-z])-?$/i);
    if(m&&!found.includes(m[1]))found.push(m[1]);
  });
  return found;
}

function getBuilderParts(){
  const roots=uniqueParts(data.filter(d=>d.type==='Root').map(d=>d.part));
  const prefixes=uniqueParts(data.filter(d=>d.type==='Prefix').map(d=>d.part));
  const suffixes=uniqueParts(data.filter(d=>d.type==='Suffix').map(d=>d.part));
  const vowels=getBuilderVowels();
  return {roots,prefixes,suffixes,vowels};
}

function termTargetParts(parts){
  const out=[];
  parts.forEach(part=>{
    const item=sourcePart(part);
    if(item&&item.type==='Combining form'&&part.includes('/')){
      const m=part.match(/^(.+)\/([a-z])-?$/i);
      if(m){out.push({part:m[1]+'-',type:'root'});out.push({part:m[2],type:'vowel'});return;}
    }
    const type=item?.type;
    if(type==='Root')out.push({part,type:'root'});
    else if(type==='Prefix')out.push({part,type:'prefix'});
    else if(type==='Suffix')out.push({part,type:'suffix'});
  });
  return out;
}

function installBuilderUI(){
  const old=document.getElementById('builder');if(!old)return;
  const {roots,prefixes,suffixes,vowels}=getBuilderParts();
  old.innerHTML=`<div class="card"><h2>🧩 Medical Term Builder</h2><p class="muted builder-intro">Build a term from separate puzzle pieces. Roots appear only once in the root bank; combining vowels are in their own section.</p><div class="builder-layout">
    <div class="card"><h3>1. Choose puzzle pieces</h3>
      <div class="piece-group"><h3 class="prefix">Prefixes</h3><div id="prefixPieces" class="piece-palette"></div></div>
      <div class="piece-group"><h3 class="root">Roots</h3><div id="rootPieces" class="piece-palette"></div></div>
      <div class="piece-group"><h3 class="combining-vowel-title">Combining Vowels</h3><div id="vowelPieces" class="piece-palette"></div><p class="muted small">These are separate pieces. They are not repeated on every root.</p></div>
      <div class="piece-group"><h3 class="suffix">Suffixes</h3><div id="suffixPieces" class="piece-palette"></div></div>
    </div>
    <div class="card"><h3>2. Build the word</h3><p class="muted small">Tap a piece or drag it into the build area. Tap a piece in your build to remove it.</p><div id="builderAssembly" class="assembly empty">Drop or tap puzzle pieces here</div><div class="piece-count" id="builderPieceCount">0 pieces</div><div class="builder-actions"><button class="secondary" onclick="clearBuilder()">Clear</button></div><div class="card builder-result"><div class="muted">Finished word</div><div id="buildResult" class="stat term">—</div><div id="buildMeaning" class="definition-box">Build a term to see its definition.</div></div></div>
  </div></div><div class="card builder-quiz"><h2>🧩 Builder Quiz</h2><p class="muted">Build the medical term that matches the prompt using the separate root and combining-vowel pieces.</p><div id="builderQuizBox"></div></div>`;

  renderBuilderPalette('prefixPieces',prefixes,'prefix');
  renderBuilderPalette('rootPieces',roots,'root');
  renderBuilderPalette('vowelPieces',vowels,'vowel');
  renderBuilderPalette('suffixPieces',suffixes,'suffix');
  builderAssembly=[];renderBuilderAssembly();setupBuilderDrop();pickBuilderQuiz();
}

function renderBuilderPalette(id,parts,type){
  const box=document.getElementById(id);if(!box)return;box.innerHTML='';
  parts.forEach(part=>{
    const label=type==='vowel'?part:part;
    const el=makePuzzlePiece(label,type);box.appendChild(el);
  });
}

let builderAssembly=[];
function addBuilderPiece(part,type){
  if(type==='root'&&builderAssembly.some(x=>x.type==='root'))return;
  if(type==='vowel'&&builderAssembly.some(x=>x.type==='vowel'))return;
  if(type==='prefix'&&builderAssembly.some(x=>x.type==='prefix'))return;
  if(type==='suffix'&&builderAssembly.some(x=>x.type==='suffix'))return;
  builderAssembly.push({part,type});renderBuilderAssembly();
}
function removeBuilderPiece(index){builderAssembly.splice(index,1);renderBuilderAssembly()}
function clearBuilder(){builderAssembly=[];renderBuilderAssembly()}
function renderBuilderAssembly(){
  const box=document.getElementById('builderAssembly');if(!box)return;box.innerHTML='';box.classList.toggle('empty',builderAssembly.length===0);
  if(!builderAssembly.length)box.textContent='Drop or tap puzzle pieces here';
  builderAssembly.forEach((item,i)=>{const el=makePuzzlePiece(item.part,item.type,'assembly');el.draggable=true;el.title='Click to remove';el.addEventListener('click',()=>removeBuilderPiece(i));el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',JSON.stringify({move:i}));e.dataTransfer.effectAllowed='move'});box.appendChild(el)});
  document.getElementById('builderPieceCount').textContent=`${builderAssembly.length} piece${builderAssembly.length===1?'':'s'}`;updateBuildResult();
}
function setupDropZone(box,callback){if(!box||box.dataset.dropReady)return;box.dataset.dropReady='1';box.addEventListener('dragover',e=>{e.preventDefault();box.style.borderColor='var(--accent)'});box.addEventListener('dragleave',()=>box.style.borderColor='');box.addEventListener('drop',e=>{e.preventDefault();box.style.borderColor='';callback(e.dataTransfer.getData('text/plain'))})}
function setupBuilderDrop(){
  setupDropZone(document.getElementById('builderAssembly'),payload=>{
    try{const x=JSON.parse(payload);if(Number.isInteger(x.move)){const [item]=builderAssembly.splice(x.move,1);if(item)builderAssembly.push(item);renderBuilderAssembly();}else if(x.part)addBuilderPiece(x.part,x.type)}catch(_){}}
  );
}
function assembledWord(items){return items.map(x=>normalizePiece(x.part)).join('')}
function updateBuildResult(){
  const result=assembledWord(builderAssembly),resultEl=document.getElementById('buildResult'),meaningEl=document.getElementById('buildMeaning');if(!resultEl||!meaningEl)return;
  resultEl.textContent=result||'—';if(!result){meaningEl.textContent='Build a term to see its definition.';return;}
  const exact=terms.find(t=>t[0]===result);if(exact){meaningEl.innerHTML=`<b>Definition:</b> ${exact[2]}`;return;}
  const meanings=builderAssembly.map(x=>x.type==='vowel'?'combining vowel':partMeaning(x.part)).filter(Boolean);meaningEl.innerHTML=`<b>Word-part meaning:</b> ${meanings.join(' + ')}<br><span class="muted small">No exact Chapter 1 term matches this combination yet.</span>`;
}

let builderQuizTarget=null,builderQuizAssembly=[];
function pickBuilderQuiz(){
  builderQuizTarget=terms[Math.floor(Math.random()*terms.length)];builderQuizAssembly=[];renderBuilderQuiz();
}
function renderBuilderQuiz(){
  const target=termTargetParts(builderQuizTarget[1]);
  const distractorPool=getBuilderParts();
  const all=[...distractorPool.prefixes.map(part=>({part,type:'prefix'})),...distractorPool.roots.map(part=>({part,type:'root'})),...distractorPool.vowels.map(part=>({part,type:'vowel'})),...distractorPool.suffixes.map(part=>({part,type:'suffix'}))];
  const key=new Set(target.map(x=>x.part+'|'+x.type));
  const distractors=all.filter(x=>!key.has(x.part+'|'+x.type)).sort(()=>Math.random()-.5).slice(0,Math.max(5,9-target.length));
  const bank=[...target,...distractors].sort(()=>Math.random()-.5);
  document.getElementById('builderQuizBox').innerHTML=`<div class="prompt-box"><div class="muted">Build the term from this definition</div><div class="definition">${builderQuizTarget[2]}</div><div class="piece-count">${target.length} puzzle pieces are needed.</div></div><h3 style="margin-top:16px">Puzzle pieces</h3><div id="quizPieceBank" class="piece-palette quiz-piece-bank"></div><h3 style="margin-top:16px">Your build</h3><div id="quizAssembly" class="assembly empty">Drop or tap pieces here</div><div class="builder-actions"><button class="primary" onclick="checkBuilderQuiz()">Check my build</button><button class="secondary" onclick="clearBuilderQuiz()">Clear</button><button class="secondary" onclick="pickBuilderQuiz()">New prompt</button></div><div id="builderQuizFeedback"></div>`;
  const bankBox=document.getElementById('quizPieceBank');bank.forEach(item=>{const el=makePuzzlePiece(item.part,item.type,'quiz');el.addEventListener('click',()=>addBuilderQuizPiece(item.part,item.type));bankBox.appendChild(el)});setupDropZone(document.getElementById('quizAssembly'),payload=>{try{const x=JSON.parse(payload);if(x.part)addBuilderQuizPiece(x.part,x.type)}catch(_){}});
}
function addBuilderQuizPiece(part,type){builderQuizAssembly.push({part,type});renderQuizAssembly()}
function clearBuilderQuiz(){builderQuizAssembly=[];renderQuizAssembly()}
function renderQuizAssembly(){const box=document.getElementById('quizAssembly');if(!box)return;box.innerHTML='';box.classList.toggle('empty',builderQuizAssembly.length===0);if(!builderQuizAssembly.length)box.textContent='Drop or tap pieces here';builderQuizAssembly.forEach((item,i)=>{const el=makePuzzlePiece(item.part,item.type,'quizAssembly');el.title='Click to remove';el.addEventListener('click',()=>{builderQuizAssembly.splice(i,1);renderQuizAssembly()});box.appendChild(el)});}
function checkBuilderQuiz(){
  const feedback=document.getElementById('builderQuizFeedback'),target=termTargetParts(builderQuizTarget[1]);const ok=builderQuizAssembly.length===target.length&&builderQuizAssembly.every((x,i)=>x.part===target[i].part&&x.type===target[i].type);
  if(ok)feedback.innerHTML=`<div class="quiz-feedback good"><b>Correct!</b> You built <span class="term">${builderQuizTarget[0]}</span>.<br><b>Definition:</b> ${builderQuizTarget[2]}<br><button class="primary" style="margin-top:9px" onclick="pickBuilderQuiz()">Next builder challenge</button></div>`;
  else feedback.innerHTML=`<div class="quiz-feedback bad"><b>Not quite yet.</b> Check the pieces and their order, especially whether a combining vowel is needed.</div>`;
}

installBuilderUI();
