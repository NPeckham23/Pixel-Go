import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════
   DEFAULT CONFIG
════════════════════════════════════════════════════════ */
const DEFAULT_CONFIG = {
  gameName: "PIXEL GO",
  tagline: "COLOUR TERRITORY BATTLE",
  maxRounds: 0,  // 0 = no turn limit — ends when victory is mathematically assured
  boardColours: [
    { hex:"#E8192C", name:"Red"     },
    { hex:"#FF7500", name:"Orange"  },
    { hex:"#F5D000", name:"Yellow"  },
    { hex:"#41C900", name:"Lime"    },
    { hex:"#00A86B", name:"Jade"    },
    { hex:"#00C8C8", name:"Teal"    },
    { hex:"#0078FF", name:"Blue"    },
    { hex:"#7B2FFF", name:"Violet"  },
    { hex:"#CC00CC", name:"Magenta" },
    { hex:"#FF2B8A", name:"Pink"    },
    { hex:"#A0522D", name:"Sienna"  },
    { hex:"#9E9E9E", name:"Grey"    },
  ],
  teams: [
    { hex:"#E8192C", name:"Scarlet Fury"   },
    { hex:"#FF7500", name:"Orange Tigers"  },
    { hex:"#F5D000", name:"Yellow Thunder" },
    { hex:"#41C900", name:"Neon Vipers"    },
    { hex:"#00A86B", name:"Jade Dragons"   },
    { hex:"#00C8C8", name:"Cyan Storm"     },
    { hex:"#0078FF", name:"Azure Knights"  },
    { hex:"#7B2FFF", name:"Amethyst Power" },
  ],
  difficulties: {
    easy:   { label:"Easy",   color:"#2ED573", board:"grouped", cascade:"full",
              line1:"Groups of 2–6 pixels, no singletons",
              line2:"All matching colour groups nearby chain together" },
    normal: { label:"Normal", color:"#FFD32A", board:"grouped", cascade:"none",
              line1:"Groups of 2–6 pixels, no singletons",
              line2:"Only the clicked group joins — no chaining" },
    hard:   { label:"Hard",      color:"#FF4757", board:"random",  cascade:"full",
              line1:"Fully random pixels, any group size",
              line2:"All matching colour groups nearby chain together" },
    veryhard:{ label:"Very Hard", color:"#CC00CC", board:"random",  cascade:"none",
              line1:"Fully random pixels, any group size",
              line2:"Only the exact group you click joins — no chaining at all" },
  },
  gridSizes: {
    small:  { bs:12, label:"Small",  sub:"12 × 12" },
    medium: { bs:17, label:"Medium", sub:"17 × 17" },
    large:  { bs:22, label:"Large",  sub:"22 × 22" },
  },
  victoryText: {
    conquest:    { title:"CONQUEST COMPLETE",    sub:"Every cell is yours.",   icon:"🏆" },
    overwhelming:{ title:"OVERWHELMING VICTORY", sub:"{pct}% captured.",       icon:"🌟" },
    victory:     { title:"VICTORY",              sub:"{pct}% captured.",       icon:"⚡" },
    close:       { title:"CLOSE BATTLE",         sub:"{pct}% captured.",       icon:"😤" },
    defeat:      { title:"DEFEAT",               sub:"Only {pct}% captured.", icon:"💀" },
  },
  multiWinText: "dominates the board",
  victoryAssuredText: "Victory is now assured — play on or call the game?",
};

/* ── Config persistence ── */
function loadConfig() {
  try {
    const s = localStorage.getItem("pixelgo_config");
    return s ? deepMerge(DEFAULT_CONFIG, JSON.parse(s)) : DEFAULT_CONFIG;
  } catch { return DEFAULT_CONFIG; }
}
function saveConfig(cfg) {
  try { localStorage.setItem("pixelgo_config", JSON.stringify(cfg)); } catch {}
}
function deepMerge(def, over) {
  if (!over) return def;
  const r = { ...def };
  for (const k of Object.keys(over)) {
    if (over[k]!==null && typeof over[k]==="object" && !Array.isArray(over[k]))
      r[k] = deepMerge(def[k]||{}, over[k]);
    else r[k] = over[k];
  }
  return r;
}

/* ── AI level definitions ── */
const AI_LEVELS = {
  recruit: { key:"recruit", label:"Recruit",  color:"#2ED573", desc:"Makes random moves" },
  veteran: { key:"veteran", label:"Veteran",  color:"#FFD32A", desc:"Picks the biggest group available" },
  master:  { key:"master",  label:"Master",   color:"#FF4757", desc:"Maximises gain and blocks your best move" },
};

/* ════════════════════════════════════════════════════════
   MUSIC SYSTEM
════════════════════════════════════════════════════════ */
function useMusicSystem() {
  const ctxRef   = useRef(null);
  const masterRef= useRef(null);
  const loopRef  = useRef(null);
  const stepRef  = useRef(0);        // current 16th-note step index
  const nextRef  = useRef(0);        // next scheduled time in AudioContext time
  const [musicOn,setMusicOn] = useState(false);

  // ── Daft Punk style: 128 BPM house / electronic ──
  // Tempo
  const BPM = 128;
  const BEAT  = 60 / BPM;           // one beat in seconds
  const S16   = BEAT / 4;           // one 16th note

  // Chord progression (Robot Rock / Around The World feel): Am - F - C - G
  // Root notes in Hz (played as bass)
  const ROOTS = [110.00, 87.31, 65.41, 98.00]; // A2, F2, C2, G2
  // Chord tones (5th + octave) for stabs
  const STABS = [
    [110.00,164.81,220.00],  // Am
    [87.31, 130.81,174.61],  // F
    [65.41, 98.00, 130.81],  // C
    [98.00, 146.83,196.00],  // G
  ];
  // Lead arpeggio pattern over 16 steps (index into chord tones)
  const ARP = [0,2,1,2, 0,2,1,2, 0,2,1,2, 0,1,2,1];

  function getCtx(){
    if(!ctxRef.current){
      const ctx=new (window.AudioContext||window.webkitAudioContext)();
      const master=ctx.createGain();
      master.gain.value=0.15;
      master.connect(ctx.destination);
      ctxRef.current=ctx; masterRef.current=master;
    }
    return{ctx:ctxRef.current,master:masterRef.current};
  }

  function playOsc(freq,start,dur,vol,type="sawtooth",filterFreq=null){
    try{
      const{ctx,master}=getCtx();
      const osc=ctx.createOscillator();
      const g=ctx.createGain();
      if(filterFreq){
        const f=ctx.createBiquadFilter();
        f.type="lowpass"; f.frequency.value=filterFreq;
        osc.connect(f); f.connect(g);
      } else { osc.connect(g); }
      g.connect(master);
      osc.type=type; osc.frequency.value=freq;
      g.gain.setValueAtTime(0.001,start);
      g.gain.linearRampToValueAtTime(vol,start+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,start+dur*0.9);
      osc.start(start); osc.stop(start+dur);
    }catch{}
  }

  function playKick(t){
    try{
      const{ctx,master}=getCtx();
      const osc=ctx.createOscillator();
      const g=ctx.createGain();
      osc.connect(g); g.connect(master);
      osc.type="sine";
      osc.frequency.setValueAtTime(160,t);
      osc.frequency.exponentialRampToValueAtTime(40,t+0.08);
      g.gain.setValueAtTime(0.8,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
      osc.start(t); osc.stop(t+0.3);
    }catch{}
  }

  function playSnare(t){
    try{
      const{ctx,master}=getCtx();
      // Noise burst
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.15,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
      const src=ctx.createBufferSource();
      src.buffer=buf;
      const g=ctx.createGain();
      const f=ctx.createBiquadFilter();
      f.type="highpass"; f.frequency.value=2000;
      src.connect(f); f.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.35,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
      src.start(t); src.stop(t+0.15);
    }catch{}
  }

  function playHihat(t,vol=0.08){
    try{
      const{ctx,master}=getCtx();
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
      const src=ctx.createBufferSource();
      src.buffer=buf;
      const g=ctx.createGain();
      const f=ctx.createBiquadFilter();
      f.type="highpass"; f.frequency.value=8000;
      src.connect(f); f.connect(g); g.connect(master);
      g.gain.setValueAtTime(vol,t);
      g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
      src.start(t); src.stop(t+0.05);
    }catch{}
  }

  function scheduleLoop(){
    if(!ctxRef.current) return;
    const{ctx}=getCtx();
    const now=ctx.currentTime;
    const lookahead=0.3;

    while(nextRef.current < now+lookahead){
      const t=nextRef.current;
      const step=stepRef.current;
      const beat=Math.floor(step/4);        // 0-3 (one bar = 4 beats)
      const sixteenth=step%4;               // 0-3 within each beat
      const chordIdx=Math.floor(step/4)%4;  // chord changes every beat

      // ── Drums ──
      if(step===0||step===4||step===8||step===12) playKick(t);   // 4-on-floor kick
      if(step===4||step===12) playSnare(t);                       // snare on 2 & 4
      playHihat(t, sixteenth===0?0.12:0.06);                     // 16th hi-hats

      // ── Filtered bass (slides between root notes) ──
      if(sixteenth===0){
        const bassFreq=ROOTS[chordIdx];
        playOsc(bassFreq,t,BEAT*0.9,0.55,"sawtooth",600);
        // Sub bass an octave down
        playOsc(bassFreq/2,t,BEAT*0.95,0.35,"sine");
      }

      // ── Lead arp (filtered sawtooth — classic Daft Punk synth) ──
      const chord=STABS[chordIdx];
      const note=chord[ARP[step]%chord.length];
      playOsc(note*2,t,S16*0.7,0.2,"sawtooth",
        1200+Math.sin(step/16*Math.PI*2)*600);  // filter sweeps with pattern

      // ── Chord stab on beat 1 only ──
      if(step===0||step===8){
        STABS[chordIdx].forEach((f,i)=>
          playOsc(f,t+i*0.005,BEAT*0.35,0.12,"square",800)
        );
      }

      stepRef.current=(step+1)%16;
      nextRef.current+=S16;
    }
    loopRef.current=setTimeout(scheduleLoop,100);
  }

  function startMusic(){
    const{ctx}=getCtx();
    if(ctx.state==="suspended") ctx.resume();
    nextRef.current=ctx.currentTime+0.1;
    stepRef.current=0;
    scheduleLoop();
  }
  function stopMusic(){
    if(loopRef.current) clearTimeout(loopRef.current);
    loopRef.current=null;
  }

  const toggleMusic=useCallback(()=>{
    setMusicOn(on=>{
      if(!on) startMusic(); else stopMusic();
      return !on;
    });
  },[]);

  useEffect(()=>()=>stopMusic(),[]);

  // ── SFX ──
  function sfxCapture(){
    try{
      const{ctx}=getCtx();
      const now=ctx.currentTime;
      // Rising synth blip
      [440,554,659].forEach((f,i)=>playOsc(f,now+i*0.05,0.1,0.5,"square",2000));
    }catch{}
  }
  function sfxAutoGrab(){
    try{
      const{ctx}=getCtx();
      const now=ctx.currentTime;
      playOsc(330,now,0.08,0.3,"sine");
      playOsc(440,now+0.04,0.08,0.3,"sine");
    }catch{}
  }
  function sfxEndTurn(){
    try{
      const{ctx}=getCtx();
      playOsc(220,ctx.currentTime,0.06,0.2,"square");
    }catch{}
  }
  function sfxVictory(){
    try{
      const{ctx}=getCtx();
      const now=ctx.currentTime;
      // Daft Punk style rising fanfare
      [261.63,329.63,392,523.25,659.25,783.99].forEach((f,i)=>
        playOsc(f,now+i*0.12,0.3,0.6,"sawtooth",3000)
      );
    }catch{}
  }

  return{musicOn,toggleMusic,sfxCapture,sfxAutoGrab,sfxEndTurn,sfxVictory};
}

/* ════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════ */
const NUM_COLORS = 12;

function hexToRgba(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─── Board generators ─────────────────────────────── */
function equalizeBoard(board, BS) {
  const flat=board.flat(), perColor=Math.floor(flat.length/NUM_COLORS);
  const counts=Array(NUM_COLORS).fill(0); flat.forEach(c=>counts[c]++);
  const byColor=Array.from({length:NUM_COLORS},()=>[]);
  flat.forEach((c,i)=>byColor[c].push(i));
  byColor.forEach(arr=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}});
  for(let c=0;c<NUM_COLORS;c++) while(counts[c]>perColor+1){
    const idx=byColor[c].pop(); let minC=0;
    for(let i=1;i<NUM_COLORS;i++) if(counts[i]<counts[minC]) minC=i;
    flat[idx]=minC;counts[c]--;counts[minC]++;byColor[minC].push(idx);
  }
  return Array.from({length:BS},(_,r)=>flat.slice(r*BS,(r+1)*BS));
}
function mkBoardRandom(BS){return equalizeBoard(Array.from({length:BS},()=>Array.from({length:BS},()=>Math.floor(Math.random()*NUM_COLORS))),BS);}
function mkBoardGrouped(BS){
  const grid=Array.from({length:BS},()=>Array(BS).fill(-1));
  const placed=Array.from({length:BS},()=>Array(BS).fill(false));
  function nbrs(r,c){return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS);}
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  for(const[sr,sc]of shuffle(Array.from({length:BS*BS},(_,k)=>[Math.floor(k/BS),k%BS]))){
    if(placed[sr][sc]) continue;
    const color=Math.floor(Math.random()*NUM_COLORS),size=2+Math.floor(Math.random()*5);
    const region=[[sr,sc]];placed[sr][sc]=true;grid[sr][sc]=color;
    while(region.length<size){
      const frontier=[];
      for(const[r,c]of region) for(const[nr,nc]of nbrs(r,c)) if(!placed[nr][nc]) frontier.push([nr,nc]);
      if(!frontier.length) break;
      const[nr,nc]=frontier[Math.floor(Math.random()*frontier.length)];
      if(placed[nr][nc]) continue;
      placed[nr][nc]=true;grid[nr][nc]=color;region.push([nr,nc]);
    }
  }
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    const col=grid[r][c],ns=nbrs(r,c);
    if(!ns.some(([nr,nc])=>grid[nr][nc]===col)&&ns.length) grid[r][c]=grid[ns[0][0]][ns[0][1]];
  }
  return equalizeBoard(grid,BS);
}

/* ─── Core game logic ──────────────────────────────── */
function floodFillGroup(board,ownership,r0,c0,BS){
  if(r0<0||r0>=BS||c0<0||c0>=BS||ownership[r0][c0]!==-1) return [];
  const color=board[r0][c0],seen=new Set(),q=[[r0,c0]],cells=[];
  while(q.length){
    const[r,c]=q.pop(),k=r*BS+c;
    if(seen.has(k)) continue;
    if(r<0||r>=BS||c<0||c>=BS||board[r][c]!==color||ownership[r][c]!==-1) continue;
    seen.add(k);cells.push([r,c]);q.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);
  }
  return cells;
}
function playerAdjacent(o,r,c,p,BS){
  return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS&&o[nr][nc]===p);
}
function isAdjacentToPlayer(o,r,c,p,BS){return playerAdjacent(o,r,c,p,BS);}
function captureGroup(board,o,pid,r0,c0,BS){
  const own=o.map(row=>[...row]),cap=new Set();
  for(const[r,c]of floodFillGroup(board,own,r0,c0,BS)){own[r][c]=pid;cap.add(r*BS+c);}
  return{newOwnership:own,captured:cap};
}
function cascadeCapture(board,o,pid,r0,c0,BS){
  const cc=board[r0][c0],own=o.map(row=>[...row]),cap=new Set();
  for(const[r,c]of floodFillGroup(board,own,r0,c0,BS)){own[r][c]=pid;cap.add(r*BS+c);}
  function sweep(){
    let f=false;const s=new Set();
    for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
      if(own[r][c]!==-1||board[r][c]!==cc) continue;
      const k=r*BS+c;if(s.has(k)||!playerAdjacent(own,r,c,pid,BS)) continue;
      for(const[r2,c2]of floodFillGroup(board,own,r,c,BS)){own[r2][c2]=pid;cap.add(r2*BS+c2);s.add(r2*BS+c2);f=true;}
    }
    return f;
  }
  while(sweep()){}
  return{newOwnership:own,captured:cap};
}
function previewCapture(board,o,pid,r0,c0,mode,BS){
  if(o[r0][c0]!==-1) return new Set();
  const cc=board[r0][c0],own=o.map(row=>[...row]),keys=new Set();
  for(const[r,c]of floodFillGroup(board,own,r0,c0,BS)){own[r][c]=pid;keys.add(r*BS+c);}
  if(mode==="full"){
    function sweep(){
      let f=false;const s=new Set();
      for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
        if(own[r][c]!==-1||board[r][c]!==cc) continue;
        const k=r*BS+c;if(s.has(k)||!playerAdjacent(own,r,c,pid,BS)) continue;
        for(const[r2,c2]of floodFillGroup(board,own,r,c,BS)){own[r2][c2]=pid;keys.add(r2*BS+c2);s.add(r2*BS+c2);f=true;}
      }
      return f;
    }
    while(sweep()){}
  }
  return keys;
}
function autoClaimAdjacent(board,o,pid,playerDefs,palette,BS){
  const myCI=palette.findIndex(bc=>bc.hex===playerDefs[pid].hex);
  if(myCI<0) return{newOwnership:o,autoClaimed:new Set()};
  const own=o.map(row=>[...row]),ac=new Set();
  let changed=true;
  while(changed){
    changed=false;
    for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
      if(own[r][c]!==-1||board[r][c]!==myCI||!playerAdjacent(own,r,c,pid,BS)) continue;
      for(const[r2,c2]of floodFillGroup(board,own,r,c,BS)){own[r2][c2]=pid;ac.add(r2*BS+c2);changed=true;}
    }
  }
  return{newOwnership:own,autoClaimed:ac};
}
function applyEnclosures(board,o,playerDefs,numPlayers,palette,BS){
  const pci=playerDefs.slice(0,numPlayers).map(d=>palette.findIndex(bc=>bc.hex===d.hex));
  let own=o.map(row=>[...row]);const enc=new Set();let changed=true;
  while(changed){
    changed=false;
    const vis=Array.from({length:BS},()=>Array(BS).fill(false));
    for(let r0=0;r0<BS;r0++) for(let c0=0;c0<BS;c0++){
      if(own[r0][c0]!==-1||vis[r0][c0]) continue;
      const region=[],bp=new Set(),q=[[r0,c0]];vis[r0][c0]=true;
      while(q.length){
        const[r,c]=q.shift();region.push([r,c]);
        for(const[nr,nc]of[[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){
          if(nr<0||nr>=BS||nc<0||nc>=BS) continue;
          if(own[nr][nc]===-1){if(!vis[nr][nc]){vis[nr][nc]=true;q.push([nr,nc]);}}
          else bp.add(own[nr][nc]);
        }
      }
      if(bp.size!==1) continue;
      const enc_player=[...bp][0];
      if(!region.every(([r,c])=>{const ci=board[r][c];return pci.every((p,i)=>i===enc_player||p!==ci);})) continue;
      for(const[r,c]of region){own[r][c]=enc_player;enc.add(r*BS+c);changed=true;}
    }
  }
  return{newOwnership:own,enclosed:enc};
}

/* ─── AI logic ──────────────────────────────────────── */
function getClickableCellsForPlayer(board,ownership,pid,playerDefs,palette,BS){
  const myCI=palette.findIndex(bc=>bc.hex===playerDefs[pid].hex);
  const s=new Set();
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    if(ownership[r][c]!==-1) continue;
    if(isAdjacentToPlayer(ownership,r,c,pid,BS)){s.add(r*BS+c);continue;}
    if(myCI>=0&&board[r][c]===myCI) s.add(r*BS+c);
  }
  return s;
}

function scoreMove(board,ownership,pid,r,c,cascade,playerDefs,palette,numPlayers,BS){
  const doC=cascade==="full"?cascadeCapture:captureGroup;
  const{newOwnership:after}=doC(board,ownership,pid,r,c,BS);
  const{newOwnership:afterEnc}=applyEnclosures(board,after,playerDefs,numPlayers,palette,BS);
  let gained=0;
  for(let r2=0;r2<BS;r2++) for(let c2=0;c2<BS;c2++)
    if(afterEnc[r2][c2]===pid&&ownership[r2][c2]===-1) gained++;
  return{gained,afterEnc};
}

function getAIMove(board,ownership,pid,playerDefs,palette,BS,cascadeMode,aiLevel,numPlayers){
  const cells=getClickableCellsForPlayer(board,ownership,pid,playerDefs,palette,BS);
  const candidates=[...cells].map(k=>[Math.floor(k/BS),k%BS]);
  if(!candidates.length) return null;

  if(aiLevel==="recruit"){
    return candidates[Math.floor(Math.random()*candidates.length)];
  }

  // Score every candidate
  const scored=candidates.map(([r,c])=>{
    const{gained,afterEnc}=scoreMove(board,ownership,pid,r,c,cascadeMode,playerDefs,palette,numPlayers,BS);
    return{r,c,gained,afterEnc};
  }).sort((a,b)=>b.gained-a.gained);

  if(aiLevel==="veteran") return[scored[0].r,scored[0].c];

  // Master: among top 5 moves, pick the one that minimises opponent's best reply
  const top=scored.slice(0,Math.min(5,scored.length));
  const humanIdx=playerDefs.findIndex((d,i)=>i!==pid&&!d.isAI);
  if(humanIdx<0) return[top[0].r,top[0].c];

  let bestMove=top[0],bestNetScore=-Infinity;
  for(const move of top){
    // Find human's best reply on this board
    const humanCells=getClickableCellsForPlayer(board,move.afterEnc,humanIdx,playerDefs,palette,BS);
    let maxHumanGain=0;
    for(const hk of humanCells){
      const hr=Math.floor(hk/BS),hc=hk%BS;
      const{gained}=scoreMove(board,move.afterEnc,humanIdx,hr,hc,cascadeMode,playerDefs,palette,numPlayers,BS);
      if(gained>maxHumanGain) maxHumanGain=gained;
      if(maxHumanGain>30) break; // early exit if already large
    }
    const net=move.gained*1.5-maxHumanGain;
    if(net>bestNetScore){bestNetScore=net;bestMove=move;}
  }
  return[bestMove.r,bestMove.c];
}

/* ════════════════════════════════════════════════════════
   EDITOR SCREEN
════════════════════════════════════════════════════════ */
function EditorScreen({config,onSave,onClose}){
  const[draft,setDraft]=useState(JSON.parse(JSON.stringify(config)));
  const[tab,setTab]=useState("general");
  const[saved,setSaved]=useState(false);

  function update(path,value){
    setDraft(prev=>{
      const next=JSON.parse(JSON.stringify(prev));
      const keys=path.split(".");let obj=next;
      for(let i=0;i<keys.length-1;i++) obj=obj[keys[i]];
      obj[keys[keys.length-1]]=value;
      return next;
    });setSaved(false);
  }
  function updateArr(ap,idx,field,value){
    setDraft(prev=>{
      const next=JSON.parse(JSON.stringify(prev));
      const keys=ap.split(".");let obj=next;
      for(const k of keys) obj=obj[k];
      obj[idx][field]=value;
      return next;
    });setSaved(false);
  }
  function handleSave(){saveConfig(draft);onSave(draft);setSaved(true);setTimeout(()=>setSaved(false),2000);}
  function handleReset(){if(window.confirm("Reset all settings to defaults?")){saveConfig(DEFAULT_CONFIG);onSave(DEFAULT_CONFIG);setDraft(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));}}

  const inp={background:"#0d0d1a",border:"1px solid #333",borderRadius:6,color:"#eee",
    fontFamily:"'Space Mono',monospace",fontSize:11,padding:"6px 8px",width:"100%",outline:"none"};
  const lbl={fontSize:8,letterSpacing:2,color:"#888",marginBottom:4,display:"block"};

  const TABS=[{key:"general",label:"General"},{key:"teams",label:"Teams"},
    {key:"boardcols",label:"Colours"},{key:"difficulty",label:"Difficulty"},{key:"text",label:"Text"}];

  return(
    <div style={{minHeight:"100vh",background:"#080812",display:"flex",flexDirection:"column",
      fontFamily:"'Space Mono',monospace",color:"white",boxSizing:"border-box"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",
        borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
        <button onClick={onClose} style={{padding:"6px 12px",borderRadius:6,cursor:"pointer",
          border:"1px solid #444",background:"transparent",color:"#ccc",
          fontFamily:"'Space Mono',monospace",fontSize:10}}>← BACK</button>
        <div style={{flex:1,fontSize:12,fontWeight:"bold",letterSpacing:3,color:"#eee"}}>EDIT CONTENT</div>
        <button onClick={handleReset} style={{padding:"6px 10px",borderRadius:6,cursor:"pointer",
          border:"1px solid #FF4757",background:"transparent",color:"#FF4757",
          fontFamily:"'Space Mono',monospace",fontSize:9}}>RESET</button>
        <button onClick={handleSave} style={{padding:"6px 14px",borderRadius:6,cursor:"pointer",border:"none",
          background:saved?"#2ED573":"#5352ED",color:"white",
          fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:"bold",transition:"background 0.3s"}}>
          {saved?"SAVED ✓":"SAVE"}
        </button>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,padding:"8px 4px",cursor:"pointer",
            border:"none",background:tab===t.key?"#0d0d1a":"transparent",
            color:tab===t.key?"#A29BFE":"#777",fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:1,
            borderBottom:tab===t.key?"2px solid #A29BFE":"2px solid transparent"}}>{t.label}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
        {tab==="general"&&<div>
          {[["GAME NAME","gameName"],["TAGLINE","tagline"]].map(([l,k])=>(
            <div key={k} style={{marginBottom:16}}>
              <label style={lbl}>{l}</label>
              <input style={inp} value={draft[k]} onChange={e=>update(k,e.target.value)}/>
            </div>
          ))}
          <div style={{marginBottom:16}}>
            <label style={lbl}>MAX ROUNDS</label>
            <input style={{...inp,width:80}} type="number" min={5} max={100} value={draft.maxRounds}
              onChange={e=>update("maxRounds",parseInt(e.target.value)||30)}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={lbl}>MULTIPLAYER WIN TEXT</label>
            <input style={inp} value={draft.multiWinText} onChange={e=>update("multiWinText",e.target.value)}/>
            <div style={{fontSize:8,color:"#666",marginTop:4}}>e.g. "Cyan Storm {draft.multiWinText}"</div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={lbl}>VICTORY ASSURED TEXT</label>
            <input style={inp} value={draft.victoryAssuredText} onChange={e=>update("victoryAssuredText",e.target.value)}/>
          </div>
          <div>
            <label style={lbl}>GRID SIZE LABELS</label>
            {Object.entries(draft.gridSizes).map(([k,gs])=>(
              <div key={k} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <span style={{fontSize:8,color:"#777",width:50}}>{k.toUpperCase()}</span>
                <input style={{...inp}} value={gs.label} placeholder="Label"
                  onChange={e=>{const d=JSON.parse(JSON.stringify(draft));d.gridSizes[k].label=e.target.value;setDraft(d);setSaved(false);}}/>
                <input style={{...inp}} value={gs.sub} placeholder="12 × 12"
                  onChange={e=>{const d=JSON.parse(JSON.stringify(draft));d.gridSizes[k].sub=e.target.value;setDraft(d);setSaved(false);}}/>
              </div>
            ))}
          </div>
        </div>}

        {tab==="teams"&&<div>
          <div style={{fontSize:9,color:"#888",marginBottom:12,lineHeight:1.8}}>Team names shown in-game. Hex values are fixed.</div>
          {draft.teams.map((t,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:t.hex,
                boxShadow:`0 0 8px ${t.hex}`,flexShrink:0}}/>
              <div style={{flex:1}}>
                <label style={lbl}>TEAM {i+1}</label>
                <input style={inp} value={t.name} onChange={e=>updateArr("teams",i,"name",e.target.value)}/>
              </div>
            </div>
          ))}
        </div>}

        {tab==="boardcols"&&<div>
          <div style={{fontSize:9,color:"#888",marginBottom:12,lineHeight:1.8}}>Names shown on hover. Hex changes the actual board colour.</div>
          {draft.boardColours.map((bc,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
              <div style={{width:28,height:28,borderRadius:6,background:bc.hex,flexShrink:0}}/>
              <input value={bc.hex} onChange={e=>updateArr("boardColours",i,"hex",e.target.value)}
                style={{...inp,width:90,fontFamily:"monospace"}}/>
              <input style={inp} value={bc.name} onChange={e=>updateArr("boardColours",i,"name",e.target.value)}/>
            </div>
          ))}
        </div>}

        {tab==="difficulty"&&<div>
          {Object.entries(draft.difficulties).map(([k,d])=>(
            <div key={k} style={{marginBottom:16,padding:12,borderRadius:8,
              border:`1px solid ${hexToRgba(d.color,0.4)}`,background:hexToRgba(d.color,0.05)}}>
              <div style={{fontSize:11,fontWeight:"bold",color:d.color,letterSpacing:2,marginBottom:10}}>{d.label}</div>
              {[["LABEL","label"],["LINE 1","line1"],["LINE 2","line2"]].map(([l,f])=>(
                <div key={f} style={{marginBottom:8}}>
                  <label style={lbl}>{l}</label>
                  <input style={inp} value={d[f]}
                    onChange={e=>{const dd=JSON.parse(JSON.stringify(draft));dd.difficulties[k][f]=e.target.value;setDraft(dd);setSaved(false);}}/>
                </div>
              ))}
            </div>
          ))}
        </div>}

        {tab==="text"&&<div>
          <div style={{fontSize:9,color:"#888",marginBottom:12}}>Use {"{pct}"} for the percentage.</div>
          {Object.entries(draft.victoryText).map(([k,vt])=>(
            <div key={k} style={{marginBottom:14,padding:10,borderRadius:8,background:"#0d0d1a",border:"1px solid #1a1a2e"}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:18}}>{vt.icon}</span>
                <span style={{fontSize:8,color:"#777",letterSpacing:2,flex:1}}>{k.toUpperCase()}</span>
                <input value={vt.icon}
                  onChange={e=>{const dd=JSON.parse(JSON.stringify(draft));dd.victoryText[k].icon=e.target.value;setDraft(dd);setSaved(false);}}
                  style={{...inp,width:50,textAlign:"center",fontSize:16,padding:"2px 4px"}}/>
              </div>
              {[["TITLE","title"],["SUBTITLE","sub"]].map(([l,f])=>(
                <div key={f} style={{marginBottom:6}}>
                  <label style={lbl}>{l}</label>
                  <input style={inp} value={vt[f]}
                    onChange={e=>{const dd=JSON.parse(JSON.stringify(draft));dd.victoryText[k][f]=e.target.value;setDraft(dd);setSaved(false);}}/>
                </div>
              ))}
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
// Returns player index if they mathematically cannot be beaten, else -1
// A player has assured victory when their score > opponent's score + remaining cells
function checkMathematicalVictory(ownership, numPlayers, teamMode, BS){
  const TOTAL=BS*BS;
  const scores=Array(numPlayers).fill(0);
  let remaining=0;
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    const v=ownership[r][c];
    if(v>=0) scores[v]++; else remaining++;
  }
  if(teamMode){
    // Team 0: players 0,2 — Team 1: players 1,3
    const t0=scores[0]+(scores[2]||0);
    const t1=scores[1]+(scores[3]||0);
    if(t0 > t1+remaining) return 0; // team 0 wins
    if(t1 > t0+remaining) return 1; // team 1 wins
    return -1;
  }
  for(let i=0;i<numPlayers;i++){
    let maxOther=0;
    for(let j=0;j<numPlayers;j++) if(j!==i) maxOther=Math.max(maxOther,scores[j]);
    if(scores[i] > maxOther+remaining) return i;
  }
  return -1;
}

export default function PixelGo(){
  const[config,setConfig]              =useState(loadConfig);
  const[phase,setPhase]                =useState("numSelect");
  const[editing,setEditing]            =useState(false);
  const[numPlayers,setNumPlayers]      =useState(2);
  const[vsComputer,setVsComputer]      =useState(false);
  const[aiLevel,setAiLevel]            =useState(null);
  const[difficulty,setDifficulty]      =useState(null);
  const[gridSize,setGridSize]          =useState(null);
  const[playerDefs,setPlayerDefs]      =useState([]);
  const[setupIdx,setSetupIdx]          =useState(0);
  const[pendingColor,setPendingColor]  =useState(null);
  const[sharedBoard,setSharedBoard]    =useState(null);
  const[board,setBoard]                =useState(null);
  const[ownership,setOwnership]        =useState(null);
  const[prevOwnership,setPrevOwnership]=useState(null);
  const[cp,setCp]                      =useState(0);
  const[round,setRound]                =useState(1);
  const[turnNum,setTurnNum]            =useState(1);
  const[captureCount,setCaptureCount]  =useState(0);
  const[hovered,setHovered]            =useState(null);
  const[flash,setFlash]                =useState(null);
  const[enclosedFlash,setEnclosedFlash]=useState(null);
  const[autoFlash,setAutoFlash]        =useState(null);
  const[legendFocus,setLegendFocus]    =useState(null);
  const[victoryAssured,setVictoryAssured]=useState(null);
  const[showScores,setShowScores]      =useState(false);
  const[confirmEnd,setConfirmEnd]      =useState(false);
  const[finalOwnership,setFinalOwnership]=useState(null);
  const[reviewing,setReviewing]        =useState(false);
  const[teamMode,setTeamMode]          =useState(false);  // 2v2 for 4-player games
  const[aiThinking,setAiThinking]      =useState(false);
  const[showInstructions,setShowInstructions]=useState(false);

  const music=useMusicSystem();

  // Refs so setTimeout callbacks always read CURRENT state, not stale closures
  const ownershipRef    = useRef(null);
  const prevOwnershipRef= useRef(null);
  const captureCountRef = useRef(0);
  const cpRef           = useRef(0);
  const roundRef        = useRef(1);
  const boardRef        = useRef(null);
  const phaseRef        = useRef("numSelect");
  const playerDefsRef   = useRef([]);
  const numPlayersRef   = useRef(2);
  const diffRef         = useRef(null);
  const victoryAssuredRef=useRef(null);

  const PALETTE   =config.boardColours;
  const diff      =difficulty?config.difficulties[difficulty]:null;
  const BS        =gridSize?config.gridSizes[gridSize].bs:22;
  const MAX_ROUNDS=config.maxRounds;  // 0 = unlimited
  const UNLIMITED = MAX_ROUNDS === 0;

  // Keep refs in sync so AI setTimeout callbacks always read current state
  useEffect(()=>{ ownershipRef.current    =ownership;     },[ownership]);
  useEffect(()=>{ prevOwnershipRef.current=prevOwnership; },[prevOwnership]);
  useEffect(()=>{ captureCountRef.current =captureCount;  },[captureCount]);
  useEffect(()=>{ cpRef.current           =cp;            },[cp]);
  useEffect(()=>{ roundRef.current        =round;         },[round]);
  useEffect(()=>{ boardRef.current        =board;         },[board]);
  useEffect(()=>{ phaseRef.current        =phase;         },[phase]);
  useEffect(()=>{ playerDefsRef.current   =playerDefs;    },[playerDefs]);
  useEffect(()=>{ numPlayersRef.current   =numPlayers;    },[numPlayers]);
  useEffect(()=>{ diffRef.current         =diff;          },[diff]);
  useEffect(()=>{ victoryAssuredRef.current=victoryAssured;},[victoryAssured]);

  const takenColors=playerDefs.map(p=>p.hex);
  const takenCells=new Set(playerDefs.map(p=>p.row*BS+p.col));

  const scores=useMemo(()=>{
    if(!ownership) return Array(4).fill(0);
    const c=Array(4).fill(0);
    for(let r=0;r<BS;r++) for(let col=0;col<BS;col++){const v=ownership[r][col];if(v>=0) c[v]++;}
    return c;
  },[ownership,BS]);
  // Team scores: team 0 = players 0+2, team 1 = players 1+3
  const teamScores=useMemo(()=>teamMode?[scores[0]+(scores[2]||0),scores[1]+(scores[3]||0)]:[0,0],[scores,teamMode]);

  const TOTAL=BS*BS;
  const claimed=scores.slice(0,numPlayers).reduce((a,b)=>a+b,0);

  const clickableCells=useMemo(()=>{
    if(phase!=="playing"||!board||!playerDefs.length) return new Set();
    // Use prevOwnership only when human has already captured this turn AND prevOwnership exists
    // Never use prevOwnership on AI turns or at the start of a turn
    const isHumanTurn = !playerDefs[cp]?.isAI;
    const base = (isHumanTurn && captureCount>0 && prevOwnership) ? prevOwnership : ownership;
    if(!base) return new Set();
    return getClickableCellsForPlayer(board,base,cp,playerDefs,PALETTE,BS);
  },[phase,ownership,prevOwnership,captureCount,cp,board,playerDefs,BS,PALETTE]);

  const previewCells=useMemo(()=>{
    if(!hovered||!board||!ownership||phase!=="playing"||!diff) return new Set();
    const[r,c]=hovered;
    if(!clickableCells.has(r*BS+c)) return new Set();
    const isHumanTurn = !playerDefs[cp]?.isAI;
    const base = (isHumanTurn && captureCount>0 && prevOwnership) ? prevOwnership : ownership;
    return previewCapture(board,base,cp,r,c,diff.cascade,BS);
  },[hovered,board,ownership,prevOwnership,captureCount,clickableCells,cp,phase,diff,BS,playerDefs]);

  const topPlayer=useMemo(()=>{
    if(teamMode){
      // Return index 0 or 1 for winning team
      return teamScores[0]>=teamScores[1]?0:1;
    }
    let max=-1,top=0;
    for(let i=0;i<numPlayers;i++) if(scores[i]>max){max=scores[i];top=i;}
    return top;
  },[scores,numPlayers,teamMode,teamScores]);

  const hoverColourName=useMemo(()=>{
    if(!hovered||!board||!ownership) return null;
    if(ownership[hovered[0]][hovered[1]]>=0) return null;
    return PALETTE[board[hovered[0]][hovered[1]]]?.name||null;
  },[hovered,board,ownership,PALETTE]);
  const hoverIsClickable=hovered&&clickableCells.has(hovered[0]*BS+hovered[1]);

  /* ── AI auto-play ── reads from refs so never stale ── */
  useEffect(()=>{
    if(phase!=="playing") return;
    const cur=playerDefs[cp];
    if(!cur?.isAI) return;
    setAiThinking(true);
    const timer=setTimeout(()=>{
      setAiThinking(false);
      // Read ALL state from refs so we get current values even inside setTimeout
      const curOwnership  = ownershipRef.current;
      const curBoard      = boardRef.current;
      const curCp         = cpRef.current;
      const curDefs       = playerDefsRef.current;
      const curNumPlayers = numPlayersRef.current;
      const curDiff       = diffRef.current;
      if(!curOwnership||!curBoard||!curDiff) return;
      const move=getAIMove(curBoard,curOwnership,curCp,curDefs,PALETTE,BS,curDiff.cascade,cur.aiLevel,curNumPlayers);
      doAITurn(move, curBoard, curOwnership, curCp, curDefs, curNumPlayers, curDiff);
    },900+Math.random()*400);
    return()=>clearTimeout(timer);
  },[cp,phase]); // deliberately exclude ownership — only retrigger on new turn

  /* ── AI turn: self-contained, ref-free, takes everything as arguments ── */
  function doAITurn(move, curBoard, curOwnership, curCp, curDefs, curNumPlayers, curDiff){
    // Step 1: capture
    let afterOwnership = curOwnership;
    if(move){
      const[r,c]=move;
      const doCapture=curDiff.cascade==="full"?cascadeCapture:captureGroup;
      const{newOwnership:after,captured}=doCapture(curBoard,curOwnership,curCp,r,c,BS);
      const{newOwnership:afterEnc,enclosed}=applyEnclosures(curBoard,after,curDefs,curNumPlayers,PALETTE,BS);
      afterOwnership=afterEnc;
      setOwnership(afterEnc);
      setFlash(captured); music.sfxCapture();
      if(enclosed.size>0){ setEnclosedFlash(enclosed); setTimeout(()=>setEnclosedFlash(null),1000); }
      setTimeout(()=>setFlash(null),600);
      // Check victory assured
      const ts=Array(4).fill(0);
      afterEnc.forEach(row=>row.forEach(v=>{if(v>=0) ts[v]++;}));
      const TOTAL_C=BS*BS;
      for(let i=0;i<curNumPlayers;i++){
        if(ts[i]>TOTAL_C/2&&!victoryAssuredRef.current){
          setVictoryAssured({playerIdx:i,name:curDefs[i].name,hex:curDefs[i].hex});break;
        }
      }
      if(afterEnc.flat().every(v=>v>=0)){setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");return;}
      if(UNLIMITED){
        const mathWinner=checkMathematicalVictory(afterEnc,curNumPlayers,teamMode,BS);
        if(mathWinner>=0){setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");return;}
      }
    }

    // Step 2: end turn (delayed so capture animation plays first)
    setTimeout(()=>{
      music.sfxEndTurn();
      const curRound=roundRef.current;
      const next=(curCp+1)%curNumPlayers;
      let newRound=curRound;
      if(next===0){
        newRound++;
        if(!UNLIMITED&&newRound>MAX_ROUNDS){setFinalOwnership(afterOwnership);music.sfxVictory();setPhase("gameover");return;}
        setRound(newRound);
      }
      const{newOwnership:o2,autoClaimed}=autoClaimAdjacent(curBoard,afterOwnership,next,curDefs,PALETTE,BS);
      if(autoClaimed.size>0){
        setOwnership(o2);setAutoFlash(autoClaimed);music.sfxAutoGrab();
        setTimeout(()=>setAutoFlash(null),800);
        if(o2.flat().every(v=>v>=0)){setFinalOwnership(o2);music.sfxVictory();setPhase("gameover");return;}
      }
      // Reset ALL turn state atomically before switching player
      // captureCount MUST be 0 before setCp so human's clickableCells uses fresh ownership
      setCaptureCount(0);
      setPrevOwnership(null);
      setHovered(null);
      setLegendFocus(null);
      setConfirmEnd(false);
      setAiThinking(false);
      setTurnNum(n=>n+1);
      setCp(next);  // this goes last — triggers human's turn
    },500);
  }

  /* ── Core capture (human clicks only) ── */
  function executeCapture(r,c){
    // For undo: save current ownership before first capture, then use prevOwnership as base for re-clicks
    const base = (captureCount>0 && prevOwnership) ? prevOwnership : ownership;
    if(captureCount===0) setPrevOwnership(ownership.map(row=>[...row]));
    const doCapture=diff.cascade==="full"?cascadeCapture:captureGroup;
    const{newOwnership:after,captured}=doCapture(board,base,cp,r,c,BS);
    const{newOwnership:afterEnc,enclosed}=applyEnclosures(board,after,playerDefs,numPlayers,PALETTE,BS);
    setOwnership(afterEnc);setCaptureCount(1);
    setFlash(captured);music.sfxCapture();
    if(enclosed.size>0){setEnclosedFlash(enclosed);}
    setTimeout(()=>setFlash(null),600);
    setTimeout(()=>setEnclosedFlash(null),1000);
    if(!victoryAssured){
      const ts=Array(4).fill(0);
      afterEnc.forEach(row=>row.forEach(v=>{if(v>=0) ts[v]++;}));
      for(let i=0;i<numPlayers;i++) if(ts[i]>TOTAL/2){setVictoryAssured({playerIdx:i,name:playerDefs[i].name,hex:playerDefs[i].hex});break;}
    }
    if(afterEnc.flat().every(v=>v>=0)){setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");return;}
    // In unlimited mode, end when someone mathematically cannot lose
    if(UNLIMITED){
      const mathWinner=checkMathematicalVictory(afterEnc,numPlayers,teamMode,BS);
      if(mathWinner>=0){setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");return;}
    }
  }

  function doEndTurn(){
    if(phase!=="playing") return;
    music.sfxEndTurn();
    setConfirmEnd(false);
    const next=(cp+1)%numPlayers;
    let newRound=round;
    if(next===0){newRound++;if(!UNLIMITED&&newRound>MAX_ROUNDS){setFinalOwnership(ownership);music.sfxVictory();setPhase("gameover");return;}setRound(newRound);}
    const{newOwnership:o2,autoClaimed}=autoClaimAdjacent(board,ownership,next,playerDefs,PALETTE,BS);
    if(autoClaimed.size>0){setOwnership(o2);setAutoFlash(autoClaimed);music.sfxAutoGrab();setTimeout(()=>setAutoFlash(null),800);
      if(o2.flat().every(v=>v>=0)){setFinalOwnership(o2);music.sfxVictory();setPhase("gameover");return;}}
    setCp(next);setTurnNum(n=>n+1);setCaptureCount(0);setPrevOwnership(null);setHovered(null);setLegendFocus(null);
  }

  /* ── Setup ── */
  const goToDifficulty=useCallback((n,vc=false)=>{setNumPlayers(vc?2:n);setVsComputer(vc);if(vc)setPhase("aiLevel");else setPhase("difficulty");},[]);
  const goToGridSize  =useCallback((d)=>{setDifficulty(d);setPhase("gridSize");},[]);
  const goToColorPick =useCallback((gs)=>{
    setGridSize(gs);
    const bs=config.gridSizes[gs].bs,d=difficulty;
    setPlayerDefs([]);setSetupIdx(0);setPendingColor(null);
    setSharedBoard(config.difficulties[d].board==="grouped"?mkBoardGrouped(bs):mkBoardRandom(bs));
    setPhase("playerSetup");
  },[difficulty,config]);

  const pickColor=useCallback((colorObj)=>{
    if(takenColors.includes(colorObj.hex)) return;
    setPendingColor(colorObj);
  },[takenColors]);

  const pickPosition=useCallback((r,c)=>{
    if(!pendingColor||takenCells.has(r*BS+c)) return;
    let newDefs=[...playerDefs,{...pendingColor,row:r,col:c,isAI:false}];

    // If vs computer, auto-assign AI player after human picks
    if(vsComputer&&newDefs.length===1){
      // ── 1. Pick a RANDOM colour the human hasn't chosen ──
      const usedHexes=newDefs.map(d=>d.hex);
      const available=config.teams.filter(t=>!usedHexes.includes(t.hex));
      const aiTeam=available[Math.floor(Math.random()*available.length)]||config.teams[1];

      // ── 2. Pick start position based on AI level ──
      let bestPos=[0,BS-1]; // fallback

      if(aiLevel==="recruit"){
        // Recruit: just pick the corner furthest from human
        const corners=[[0,0],[0,BS-1],[BS-1,0],[BS-1,BS-1]];
        let bestDist=-1;
        for(const[cr,cc]of corners){
          if(cr===r&&cc===c) continue;
          const d=Math.abs(cr-r)+Math.abs(cc-c);
          if(d>bestDist){bestDist=d;bestPos=[cr,cc];}
        }
      } else {
        // Veteran / Master: find the cell in the largest connected group
        // of the AI's assigned board colour, then start there
        const aiColorIdx=PALETTE.findIndex(bc=>bc.hex===aiTeam.hex);

        // Flood-fill all groups of that colour and find the biggest
        const visited=Array.from({length:BS},()=>Array(BS).fill(false));
        let biggestGroup=[], biggestSize=0;

        // Scratch ownership (all unclaimed) for the flood fill
        const scratch=Array.from({length:BS},()=>Array(BS).fill(-1));

        for(let gr=0;gr<BS;gr++) for(let gc=0;gc<BS;gc++){
          if(visited[gr][gc]||sharedBoard[gr][gc]!==aiColorIdx) continue;
          // BFS this group
          const group=[];
          const q=[[gr,gc]];
          visited[gr][gc]=true;
          while(q.length){
            const[qr,qc]=q.shift();
            group.push([qr,qc]);
            for(const[nr,nc]of[[qr-1,qc],[qr+1,qc],[qr,qc-1],[qr,qc+1]]){
              if(nr>=0&&nr<BS&&nc>=0&&nc<BS&&!visited[nr][nc]&&sharedBoard[nr][nc]===aiColorIdx){
                visited[nr][nc]=true;
                q.push([nr,nc]);
              }
            }
          }
          if(group.length>biggestSize){biggestSize=group.length;biggestGroup=group;}
        }

        if(biggestGroup.length>0){
          // Pick the cell in the biggest group that is furthest from the human's start
          let bestDist=-1;
          for(const[gr,gc]of biggestGroup){
            if(gr===r&&gc===c) continue; // don't land on human
            const d=Math.abs(gr-r)+Math.abs(gc-c);
            if(d>bestDist){bestDist=d;bestPos=[gr,gc];}
          }
        } else {
          // Fallback: furthest corner
          const corners=[[0,0],[0,BS-1],[BS-1,0],[BS-1,BS-1]];
          let bestDist=-1;
          for(const[cr,cc]of corners){
            if(cr===r&&cc===c) continue;
            const d=Math.abs(cr-r)+Math.abs(cc-c);
            if(d>bestDist){bestDist=d;bestPos=[cr,cc];}
          }
        }
      }

      newDefs=[...newDefs,{...aiTeam,row:bestPos[0],col:bestPos[1],isAI:true,aiLevel}];
    }

    setPlayerDefs(newDefs);setPendingColor(null);
    if(newDefs.length===numPlayers||(vsComputer&&newDefs.length===2)){
      const realNum=newDefs.length;
      let o=Array.from({length:BS},()=>Array(BS).fill(-1));
      newDefs.forEach((def,i)=>{o[def.row][def.col]=i;});
      const{newOwnership:o2}=autoClaimAdjacent(sharedBoard,o,0,newDefs,PALETTE,BS);
      setBoard(sharedBoard);setOwnership(o2);setPrevOwnership(null);
      setCp(0);setRound(1);setTurnNum(1);setCaptureCount(0);
      setHovered(null);setFlash(null);setEnclosedFlash(null);setAutoFlash(null);
      setLegendFocus(null);setConfirmEnd(false);setFinalOwnership(null);
      setReviewing(false);setVictoryAssured(null);setShowScores(false);
      setNumPlayers(realNum);
      setPhase("playing");
    } else setSetupIdx(newDefs.length);
  },[pendingColor,playerDefs,numPlayers,vsComputer,sharedBoard,takenCells,BS,PALETTE,config.teams,aiLevel]);

  const handleBoardClick=useCallback((r,c)=>{
    if(phase==="playerSetup"){pickPosition(r,c);return;}
    if(phase!=="playing"||aiThinking) return;
    if(playerDefs[cp]?.isAI) return; // don't allow click during AI turn
    if(!clickableCells.has(r*BS+c)) return;
    setConfirmEnd(false);
    executeCapture(r,c);
  },[phase,clickableCells,board,ownership,prevOwnership,captureCount,cp,diff,BS,playerDefs,numPlayers,PALETTE,victoryAssured,TOTAL,pickPosition,aiThinking]);

  const endTurn=useCallback(()=>{
    if(phase!=="playing"||playerDefs[cp]?.isAI) return;
    doEndTurn();
  },[phase,cp,playerDefs,round,board,ownership,numPlayers,MAX_ROUNDS]);

  const triggerEndGame=useCallback(()=>{
    if(!confirmEnd){setConfirmEnd(true);return;}
    setFinalOwnership(ownership);music.sfxVictory();setPhase("gameover");
  },[confirmEnd,ownership]);

  const resetToMenu=()=>{
    setPhase("numSelect");setPlayerDefs([]);setSetupIdx(0);
    setPendingColor(null);setSharedBoard(null);setBoard(null);setOwnership(null);
    setPrevOwnership(null);setDifficulty(null);setGridSize(null);setCaptureCount(0);
    setLegendFocus(null);setFlash(null);setEnclosedFlash(null);setAutoFlash(null);
    setConfirmEnd(false);setFinalOwnership(null);setReviewing(false);
    setTurnNum(1);setVictoryAssured(null);setShowScores(false);
    setVsComputer(false);setAiLevel(null);setAiThinking(false);setShowInstructions(false);setTeamMode(false);
  };

  if(editing) return<EditorScreen config={config} onSave={cfg=>{setConfig(cfg);}} onClose={()=>setEditing(false)}/>;

  /* ════ NUM SELECT ════ */
  if(phase==="numSelect") return(
    <Shell>
      <Logo name={config.gameName}/>
      <Dim>{config.tagline}</Dim>
      <SLabel>HOW MANY PLAYERS?</SLabel>
      <div style={{display:"flex",gap:10,marginBottom:8,flexWrap:"wrap",justifyContent:"center"}}>
        {[1,2,4].map(n=><NumBtn key={n} onClick={()=>{setTeamMode(false);goToDifficulty(n);}}>{n}</NumBtn>)}
      </div>
      <button onClick={()=>{setTeamMode(true);goToDifficulty(4);}} style={{
        width:"100%",padding:"10px 16px",borderRadius:10,cursor:"pointer",marginBottom:10,
        border:"2px solid #FFD32A",background:"rgba(255,211,42,0.08)",
        color:"#FFD32A",fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:"bold",letterSpacing:2,
        transition:"all 0.2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,211,42,0.18)";e.currentTarget.style.boxShadow="0 0 20px rgba(255,211,42,0.35)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,211,42,0.08)";e.currentTarget.style.boxShadow="none";}}>
        ⚔️ 2 VS 2 (TEAM MODE)
      </button>
      {/* VS Computer button */}
      <button onClick={()=>goToDifficulty(2,true)} style={{
        width:"100%",padding:"12px 16px",borderRadius:10,cursor:"pointer",marginBottom:24,
        border:"2px solid #A29BFE",background:"rgba(162,155,254,0.08)",
        color:"#A29BFE",fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:"bold",letterSpacing:2,
        transition:"all 0.2s",
      }}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(162,155,254,0.18)";e.currentTarget.style.boxShadow="0 0 20px rgba(162,155,254,0.4)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="rgba(162,155,254,0.08)";e.currentTarget.style.boxShadow="none";}}>
        🤖 VS COMPUTER
      </button>
      <div style={{color:"#888",fontSize:9,letterSpacing:1,textAlign:"center",lineHeight:2.2,marginBottom:20}}>
        CLICK NEUTRAL CELLS TO CLAIM TERRITORY<br/>
        YOUR COLOUR AUTO-JOINS ADJACENT CELLS<br/>
        {MAX_ROUNDS} ROUNDS · MOST CELLS WINS
      </div>
      <div style={{display:"flex",gap:8,marginTop:4}}>
        <button onClick={()=>setShowInstructions("general")} style={{
          padding:"8px 14px",borderRadius:8,cursor:"pointer",
          border:"1px solid #444",background:"transparent",color:"#aaa",
          fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,transition:"all 0.2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#A29BFE";e.currentTarget.style.color="#A29BFE";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#aaa";}}>
          ? HOW TO PLAY
        </button>
        <button onClick={()=>setEditing(true)} style={{
          padding:"8px 14px",borderRadius:8,cursor:"pointer",
          border:"1px solid #444",background:"transparent",color:"#aaa",
          fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,transition:"all 0.2s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#A29BFE";e.currentTarget.style.color="#A29BFE";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#aaa";}}>
          ✎ EDIT
        </button>
      </div>
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
    </Shell>
  );

  /* ════ AI LEVEL SELECT ════ */
  if(phase==="aiLevel") return(
    <Shell>
      <Logo name={config.gameName}/>
      <SLabel>CHOOSE COMPUTER DIFFICULTY</SLabel>
      {Object.values(AI_LEVELS).map(lv=>(
        <button key={lv.key} onClick={()=>{setAiLevel(lv.key);setPhase("difficulty");}}
          style={{width:"100%",padding:"16px",borderRadius:10,cursor:"pointer",marginBottom:10,
            textAlign:"left",border:`2px solid ${lv.color}`,
            background:hexToRgba(lv.color,0.08),
            transition:"all 0.2s",fontFamily:"'Space Mono',monospace"}}
          onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(lv.color,0.18);e.currentTarget.style.boxShadow=`0 0 20px ${hexToRgba(lv.color,0.35)}`;}}
          onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(lv.color,0.08);e.currentTarget.style.boxShadow="none";}}>
          <div style={{fontSize:14,fontWeight:"bold",letterSpacing:3,color:lv.color,marginBottom:5,
            textShadow:`0 0 12px ${hexToRgba(lv.color,0.5)}`}}>🤖 {lv.label.toUpperCase()}</div>
          <div style={{fontSize:9,color:lv.color,opacity:0.85,letterSpacing:1}}>{lv.desc}</div>
        </button>
      ))}
      <button onClick={()=>setShowInstructions("vscomputer")} style={{
        width:"100%",padding:"10px",borderRadius:8,cursor:"pointer",marginBottom:10,
        border:"1px solid #A29BFE",background:"rgba(162,155,254,0.08)",
        color:"#A29BFE",fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:2,
      }}>? HOW DOES THE COMPUTER PLAY</button>
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
      <GhostButton onClick={()=>setPhase("numSelect")}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ DIFFICULTY ════ */
  if(phase==="difficulty") return(
    <Shell>
      <Logo name={config.gameName}/>
      <SLabel>{vsComputer?`VS COMPUTER (${AI_LEVELS[aiLevel]?.label})`:`${numPlayers} PLAYER${numPlayers>1?"S":""}`} · CHOOSE DIFFICULTY</SLabel>
      {Object.entries(config.difficulties).map(([key,d])=>(
        <div key={key} style={{width:"100%",display:"flex",gap:6,alignItems:"stretch",marginBottom:10}}>
          <div style={{flex:1}}>
            <DiffBtn color={d.color} label={d.label} onClick={()=>goToGridSize(key)} noMargin>
              {d.line1}<br/>{d.line2}
            </DiffBtn>
          </div>
          <button onClick={()=>setShowInstructions(key)} style={{
            flexShrink:0,width:36,borderRadius:10,cursor:"pointer",
            border:`2px solid ${d.color}`,background:hexToRgba(d.color,0.08),
            color:d.color,fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:"bold",
            transition:"all 0.2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(d.color,0.25);}}
            onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(d.color,0.08);}}>?</button>
        </div>
      ))}
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
      <GhostButton onClick={()=>setPhase(vsComputer?"aiLevel":"numSelect")}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ GRID SIZE ════ */
  if(phase==="gridSize") return(
    <Shell>
      <Logo name={config.gameName}/>
      <SLabel>CHOOSE GRID SIZE</SLabel>
      {Object.entries(config.gridSizes).map(([key,gs])=>(
        <button key={key} onClick={()=>goToColorPick(key)}
          style={{width:"100%",padding:"16px 20px",borderRadius:10,cursor:"pointer",marginBottom:10,
            textAlign:"left",border:`2px solid ${config.difficulties[difficulty].color}`,
            background:hexToRgba(config.difficulties[difficulty].color,0.07),
            transition:"all 0.2s",fontFamily:"'Space Mono',monospace"}}
          onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(config.difficulties[difficulty].color,0.18);}}
          onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(config.difficulties[difficulty].color,0.07);}}>
          <div style={{fontSize:13,fontWeight:"bold",letterSpacing:3,color:config.difficulties[difficulty].color,marginBottom:4}}>
            {gs.label.toUpperCase()}
          </div>
          <div style={{fontSize:9,color:config.difficulties[difficulty].color,opacity:0.85,letterSpacing:1}}>
            {gs.sub} · {gs.bs*gs.bs} cells
          </div>
        </button>
      ))}
      <GhostButton onClick={()=>setPhase("difficulty")}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ PLAYER SETUP ════ */
  if(phase==="playerSetup"){
    const pickingPos=!!pendingColor,diffColor=diff.color;
    return(
      <Shell wide={pickingPos}>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {Array.from({length:vsComputer?1:numPlayers},(_,i)=>(
            <div key={i} style={{width:32,height:5,borderRadius:3,
              background:i<setupIdx?(playerDefs[i]?.hex||"#333"):i===setupIdx?"#eee":"#1a1a2e",
              transition:"background 0.3s"}}/>
          ))}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",justifyContent:"center"}}>
          <Badge color={diffColor}>{difficulty.toUpperCase()}</Badge>
          <Badge color={diffColor}>{config.gridSizes[gridSize].label.toUpperCase()}</Badge>
          {vsComputer&&<Badge color="#A29BFE">VS 🤖 {AI_LEVELS[aiLevel]?.label.toUpperCase()}</Badge>}
        </div>
        <div style={{fontSize:9,letterSpacing:3,color:"#bbb",marginBottom:4}}>
          {vsComputer?"YOUR COLOUR":`PLAYER ${setupIdx+1} OF ${numPlayers}`}
        </div>
        <div style={{fontSize:17,fontWeight:"bold",letterSpacing:2,marginBottom:20,
          color:pendingColor?pendingColor.hex:"#eee",
          textShadow:pendingColor?`0 0 20px ${hexToRgba(pendingColor.hex,0.6)}`:"none",
          transition:"all 0.3s",minHeight:26,textAlign:"center"}}>
          {pickingPos?`${pendingColor.name.toUpperCase()} — PICK YOUR START`:"CHOOSE YOUR COLOUR"}
        </div>
        {!pickingPos&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20,width:"100%",maxWidth:272}}>
            {config.teams.map(pc=>(
              <ColorBtn key={pc.hex} pc={pc} taken={takenColors.includes(pc.hex)} onClick={()=>pickColor(pc)}/>
            ))}
          </div>
        )}
        {pickingPos&&(
          <>
            <MiniBoard board={sharedBoard} playerDefs={playerDefs} takenCells={takenCells}
              curColor={pendingColor} onPick={pickPosition} BS={BS} palette={PALETTE}/>
            <div style={{marginTop:8,fontSize:9,color:"#aaa",letterSpacing:1,textAlign:"center"}}>
              {vsComputer?"CLICK TO PLACE YOUR START — COMPUTER PICKS OPPOSITE":"CLICK ANY CELL TO PLACE YOUR START"}
            </div>
          </>
        )}
        {playerDefs.length>0&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:16}}>
            {playerDefs.map((def,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,
                background:hexToRgba(def.hex,0.12),border:`1px solid ${hexToRgba(def.hex,0.35)}`}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:def.hex,boxShadow:`0 0 5px ${def.hex}`}}/>
                <span style={{fontSize:9,color:def.hex,letterSpacing:1}}>{def.name}{def.isAI?" 🤖":""}</span>
              </div>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  /* ════ GAME OVER ════ */
  if(phase==="gameover"){
    const usedO=finalOwnership||ownership;
    const fs=Array(4).fill(0);
    if(usedO) for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){const v=usedO[r][c];if(v>=0) fs[v]++;}
    const winner=teamMode?null:playerDefs[topPlayer];
    const winHex=teamMode?(topPlayer===0?"#FFD32A":"#A29BFE"):winner.hex;
    const winTeamName=topPlayer===0?"TEAM GOLD":"TEAM VIOLET";
    const solo1p=numPlayers===1,pct=Math.round(fs[0]/TOTAL*100);
    const vt=config.victoryText;
    const grade=solo1p
      ? fs[0]===TOTAL?{...vt.conquest,victory:true}
      : fs[0]>TOTAL*0.75?{...vt.overwhelming,victory:true,sub:vt.overwhelming.sub.replace("{pct}",pct)}
      : fs[0]>TOTAL*0.5?{...vt.victory,victory:true,sub:vt.victory.sub.replace("{pct}",pct)}
      : fs[0]>TOTAL*0.35?{...vt.close,victory:false,sub:vt.close.sub.replace("{pct}",pct)}
      :{...vt.defeat,victory:false,sub:vt.defeat.sub.replace("{pct}",pct)}
      :null;

    if(reviewing&&usedO&&board) return(
      <div style={{minHeight:"100vh",background:"#080812",display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"16px 10px",
        fontFamily:"'Space Mono',monospace",color:"white",boxSizing:"border-box",gap:10}}>
        <style>{GLOBAL_CSS}</style>
        <div style={{fontSize:9,letterSpacing:3,color:"#bbb",marginBottom:4}}>FINAL BOARD</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${BS},1fr)`,gridTemplateRows:`repeat(${BS},1fr)`,
          gap:2,background:"#111",padding:3,borderRadius:8,border:"3px solid #333",
          width:"min(92vw,368px)",height:"min(92vw,368px)",boxSizing:"border-box",flexShrink:0}}>
          {Array.from({length:BS*BS},(_,k)=>{
            const r=Math.floor(k/BS),c=k%BS,owner=usedO[r][c],isOwned=owner>=0;
            return<div key={k} style={{background:isOwned?playerDefs[owner].hex:PALETTE[board[r][c]].hex,
              filter:isOwned?"none":"saturate(0.2) brightness(0.5)"}}/>;
          })}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",maxWidth:368}}>
          {Array.from({length:numPlayers},(_,i)=>{const def=playerDefs[i];return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,
              background:hexToRgba(def.hex,0.15),border:`1px solid ${hexToRgba(def.hex,0.4)}`}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:def.hex,boxShadow:`0 0 6px ${def.hex}`}}/>
              <span style={{fontSize:9,color:def.hex,letterSpacing:1}}>{def.name}{def.isAI?" 🤖":""}</span>
              <span style={{fontSize:10,fontWeight:"bold",color:def.hex}}>{fs[i]}</span>
            </div>
          );})}
        </div>
        <button onClick={()=>setReviewing(false)} style={{padding:"10px 22px",borderRadius:8,cursor:"pointer",
          border:"2px solid #444",background:"transparent",color:"#ccc",
          fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:2}}>← BACK TO RESULTS</button>
      </div>
    );

    return(
      <div style={{
        minHeight:"100vh",
        background:solo1p&&!grade.victory
          ?"radial-gradient(circle at 50% 40%, rgba(40,0,0,0.6) 0%, #080812 70%)"
          :`radial-gradient(circle at 50% 40%, ${hexToRgba(winHex,0.2)} 0%, #080812 70%)`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        padding:"24px 16px",fontFamily:"'Space Mono',monospace",color:"white",boxSizing:"border-box",gap:8,
      }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{fontSize:64,lineHeight:1}}>{solo1p?grade.icon:winner.isAI?"🤖":"🏆"}</div>
        <div style={{fontSize:solo1p?20:15,fontWeight:"bold",letterSpacing:4,
          color:solo1p&&!grade.victory?"#FF4757":winHex,
          textShadow:`0 0 32px ${solo1p&&!grade.victory?"rgba(255,71,87,0.7)":hexToRgba(winHex,0.8)}`,
          textAlign:"center",animation:!solo1p||grade.victory?"glow-pulse 2s ease-in-out infinite":"none"}}>
          {solo1p?grade.title:teamMode?"TEAM VICTORY":winner.isAI?"COMPUTER WINS":"VICTORY"}
        </div>
        {!solo1p&&teamMode&&(
          <div style={{fontSize:24,fontWeight:"bold",color:winHex,textAlign:"center",
            textShadow:`0 0 20px ${hexToRgba(winHex,0.6)}`}}>
            {winTeamName}
            <div style={{fontSize:11,color:hexToRgba(winHex,0.7),marginTop:4}}>
              {playerDefs.filter((_,i)=>i%2===topPlayer%2).map(d=>d.name).join(" + ")}
            </div>
          </div>
        )}
        {!solo1p&&!teamMode&&<div style={{fontSize:24,fontWeight:"bold",color:winHex,textAlign:"center",
          textShadow:`0 0 20px ${hexToRgba(winHex,0.6)}`}}>{winner.name}{winner.isAI?" 🤖":""}</div>}
        <div style={{color:solo1p&&!grade.victory?"#FF474788":hexToRgba(winHex,0.6),
          fontSize:10,letterSpacing:1,textAlign:"center"}}>
          {solo1p?grade.sub:teamMode?`${teamScores[topPlayer]} vs ${teamScores[1-topPlayer]} cells · ${turnNum-1} turns`:`P${topPlayer+1} ${config.multiWinText} · ${turnNum-1} turns played`}
        </div>
        <div style={{width:"100%",maxWidth:280}}>
          {Array.from({length:numPlayers},(_,i)=>{
            const def=playerDefs[i],isWinner=i===topPlayer&&numPlayers>1;
            const rank=numPlayers>1?[...Array(numPlayers).keys()].sort((a,b)=>fs[b]-fs[a]).indexOf(i)+1:null;
            const teamColor=teamMode?(i%2===0?"#FFD32A":"#A29BFE"):null;
            const isWinningTeam=teamMode&&(i%2===topPlayer%2);
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                padding:"8px 12px",borderRadius:8,
                background:(isWinner||isWinningTeam)?hexToRgba(teamColor||def.hex,0.15):"transparent",
                border:(isWinner||isWinningTeam)?`1px solid ${hexToRgba(teamColor||def.hex,0.4)}`:"1px solid transparent"}}>
                {teamMode&&<div style={{width:18,height:18,borderRadius:"50%",
                  background:teamColor,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:8,fontWeight:"bold",color:"black",flexShrink:0}}>{i%2===0?"▲":"▼"}</div>}
                {numPlayers>1&&!teamMode&&<div style={{width:18,height:18,borderRadius:"50%",background:isWinner?def.hex:"#1a1a2e",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:8,fontWeight:"bold",color:isWinner?"white":"#555",flexShrink:0}}>{rank}</div>}
                <div style={{width:9,height:9,borderRadius:"50%",background:def.hex,boxShadow:`0 0 6px ${def.hex}`,flexShrink:0}}/>
                <span style={{flex:1,color:isWinner?def.hex:"#aaa",fontSize:10}}>{def.name}{def.isAI?" 🤖":""}</span>
                <span style={{fontWeight:"bold",fontSize:14,color:isWinner?def.hex:"#aaa"}}>{fs[i]}</span>
                <div style={{width:48,height:3,background:"#222",borderRadius:2,flexShrink:0}}>
                  <div style={{height:"100%",borderRadius:2,background:def.hex,
                    width:`${(fs[i]/TOTAL)*100}%`,boxShadow:`0 0 4px ${def.hex}`}}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          <GlowButton hex={winHex} onClick={()=>setReviewing(true)}>VIEW BOARD</GlowButton>
          <GlowButton hex={winHex} onClick={()=>goToColorPick(gridSize)}>PLAY AGAIN</GlowButton>
          <GhostButton onClick={resetToMenu}>MENU</GhostButton>
        </div>
      </div>
    );
  }

  /* ════ PLAYING ════ */
  const curDef=playerDefs[cp],curHex=curDef.hex;
  const curGlow=hexToRgba(curHex,0.5),curDim=hexToRgba(curHex,0.15);
  const hasCaptured=captureCount>0,diffColor=diff.color;
  const isAITurn=curDef?.isAI;

  return(
    <div style={{height:"100dvh",maxHeight:"100dvh",overflow:"hidden",background:"#080812",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:"8px 10px",fontFamily:"'Space Mono',monospace",color:"white",boxSizing:"border-box",gap:5}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Turn banner ── */}
      <div style={{width:"100%",maxWidth:380,flexShrink:0,borderRadius:10,background:curDim,
        border:`2px solid ${hexToRgba(curHex,0.55)}`,boxShadow:`0 0 32px ${hexToRgba(curHex,0.35)}`,
        padding:"10px 16px",display:"flex",alignItems:"center",gap:12,
        transition:"border-color 0.35s, box-shadow 0.35s, background 0.35s",minHeight:64,overflow:"hidden"}}>
        <div style={{flexShrink:0,position:"relative",width:20,height:20}}>
          <div className="ring-pulse" style={{position:"absolute",inset:-5,borderRadius:"50%",
            border:`2px solid ${curHex}`,pointerEvents:"none"}}/>
          <div style={{width:20,height:20,borderRadius:"50%",background:curHex,boxShadow:`0 0 14px ${curGlow}`}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:curHex,fontWeight:"bold",fontSize:15,letterSpacing:2,
            textShadow:`0 0 14px ${curGlow}`,lineHeight:1.2}}>
            {curDef.name.toUpperCase()}{isAITurn?" 🤖":""}
          </div>
          <div style={{color:hexToRgba(curHex,0.7),fontSize:9,letterSpacing:1,marginTop:2}}>
            {isAITurn&&aiThinking ? "THINKING..."
              : isAITurn ? "COMPUTER IS DECIDING..."
              : hoverColourName
                ? hoverIsClickable
                  ? `CAPTURE ${hoverColourName.toUpperCase()} → ${previewCells.size} CELLS`
                  : `${hoverColourName.toUpperCase()} — NOT REACHABLE`
                : hasCaptured
                  ? "CAPTURED — TAP ANOTHER GROUP TO CHANGE OR END TURN"
                  : `TURN ${turnNum} · PLAYER ${cp+1}${difficulty==="easy"?` · ${scores[cp]} CELLS`:""}`}
          </div>
        </div>
        <div style={{textAlign:"right",minWidth:52,flexShrink:0}}>
          {isAITurn?(
            <div className="ai-thinking" style={{color:curHex,fontSize:18}}>⚙</div>
          ):previewCells.size>0?(
            <>
              <div style={{color:curHex,fontWeight:"bold",fontSize:20,lineHeight:1,
                textShadow:`0 0 12px ${curGlow}`}}>{previewCells.size}</div>
              <div style={{color:hexToRgba(curHex,0.7),fontSize:8,letterSpacing:1}}>CELLS</div>
            </>
          ):hasCaptured?(
            <div style={{color:hexToRgba(curHex,0.7),fontSize:8,letterSpacing:1,lineHeight:1.8}}>
              {difficulty==="easy"?scores[cp]:"·"}<br/>CELLS
            </div>
          ):(
            <div style={{color:"#666",fontSize:8,letterSpacing:1,lineHeight:1.8}}>
              CLICK A<br/>BORDER<br/>CELL
            </div>
          )}
        </div>
      </div>

      {/* ── Round bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:6,width:"100%",maxWidth:380,flexShrink:0}}>
        <Badge color={diffColor}>{difficulty.toUpperCase()}</Badge>
        <Badge color={diffColor}>{config.gridSizes[gridSize].label.toUpperCase()}</Badge>
        <span style={{color:"#888",fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>{UNLIMITED?`TURN ${turnNum}`:`RND ${round}/${MAX_ROUNDS}`}</span>
        <div style={{flex:1,height:2,background:"#1a1a2e",borderRadius:1}}>
          <div style={{height:"100%",borderRadius:1,
            background:`linear-gradient(90deg,${playerDefs[0].hex},${playerDefs[numPlayers-1].hex})`,
            width:`${(round/MAX_ROUNDS)*100}%`,transition:"width 0.4s"}}/>
        </div>
        {difficulty==="easy"&&<span style={{color:"#888",fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>{Math.round(claimed/TOTAL*100)}%</span>}
      </div>

      {/* ── Board ── */}
      <div onMouseLeave={()=>setHovered(null)} style={{
        display:"grid",gridTemplateColumns:`repeat(${BS},1fr)`,gridTemplateRows:`repeat(${BS},1fr)`,
        gap:2,background:"#111",padding:3,borderRadius:8,
        border:`3px solid ${hexToRgba(curHex,0.55)}`,
        boxShadow:`0 0 40px ${hexToRgba(curHex,0.35)}`,
        width:"min(90vw,360px)",height:"min(90vw,360px)",
        flexShrink:0,boxSizing:"border-box",
        transition:"border-color 0.35s, box-shadow 0.35s",touchAction:"none",
        opacity:isAITurn?0.85:1,
      }}>
        {Array.from({length:BS*BS},(_,k)=>{
          const r=Math.floor(k/BS),c=k%BS;
          const owner=ownership[r][c],isOwned=owner>=0;
          const isClickable=!isAITurn&&clickableCells.has(k);
          const isPrev=previewCells.has(k);
          const isFlash=flash&&flash.has(k);
          const isEnclosedFlash=enclosedFlash&&enclosedFlash.has(k);
          const isAutoFlash=autoFlash&&autoFlash.has(k);
          const isLegendHighlight=legendFocus!==null&&!isOwned&&board[r][c]===legendFocus;
          const bgColor=isOwned?playerDefs[owner].hex:PALETTE[board[r][c]].hex;
          const cellFilter=isOwned?"none"
            :isLegendHighlight?"none"
            :legendFocus!==null?"saturate(0.15) brightness(0.5)"
            :"saturate(0.28) brightness(0.72)";
          return(
            <div key={k} onClick={()=>handleBoardClick(r,c)} onMouseEnter={()=>{if(!isAITurn) setHovered([r,c]);}}
              title={!isOwned?PALETTE[board[r][c]]?.name:""}
              style={{background:bgColor,position:"relative",cursor:isClickable?"pointer":"default",
                filter:cellFilter,willChange:"filter"}}>
              {isPrev&&<div style={{position:"absolute",inset:0,background:hexToRgba(curHex,0.68),
                border:`2px solid ${curHex}`,boxSizing:"border-box",pointerEvents:"none"}}/>}
              {isClickable&&!isPrev&&<div className="cell-pulse" style={{position:"absolute",inset:0,
                border:`2px solid ${curHex}`,boxSizing:"border-box",pointerEvents:"none"}}/>}
              {isLegendHighlight&&!isPrev&&!isClickable&&<div style={{position:"absolute",inset:0,
                border:`2px solid ${PALETTE[legendFocus]?.hex}`,boxSizing:"border-box",pointerEvents:"none",opacity:0.9}}/>}
              {isFlash&&<div className="flash-burst" style={{position:"absolute",inset:0,background:"white",pointerEvents:"none"}}/>}
              {isEnclosedFlash&&!isFlash&&<div className="enclosed-burst" style={{position:"absolute",inset:0,background:"#FFD32A",pointerEvents:"none"}}/>}
              {isAutoFlash&&!isFlash&&!isEnclosedFlash&&<div className="auto-burst" style={{position:"absolute",inset:0,background:playerDefs[cp].hex,pointerEvents:"none"}}/>}
            </div>
          );
        })}
      </div>

      {/* ── Legend (easy) ── */}
      {difficulty==="easy"&&(
        <div style={{display:"flex",gap:4,width:"100%",maxWidth:380,flexShrink:0,overflowX:"auto",paddingBottom:2}}>
          {PALETTE.map((bc,idx)=>{
            const f=legendFocus===idx;
            return(
              <button key={idx} onClick={()=>setLegendFocus(f?null:idx)} title={bc.name}
                style={{flexShrink:0,width:24,height:24,borderRadius:6,cursor:"pointer",background:bc.hex,
                  border:f?"2px solid white":"2px solid transparent",boxShadow:f?`0 0 10px ${bc.hex}`:"none",
                  transition:"all 0.15s",transform:f?"scale(1.25)":"scale(1)",padding:0}}/>
            );
          })}
          {legendFocus!==null&&(
            <div style={{display:"flex",alignItems:"center",color:PALETTE[legendFocus]?.hex,
              fontSize:9,letterSpacing:1,paddingLeft:4,whiteSpace:"nowrap"}}>
              {PALETTE[legendFocus]?.name?.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* ── Victory assured banner ── */}
      {victoryAssured&&(
        <div style={{width:"100%",maxWidth:380,flexShrink:0,borderRadius:10,padding:"10px 14px",
          background:hexToRgba(victoryAssured.hex,0.18),
          border:`2px solid ${hexToRgba(victoryAssured.hex,0.7)}`,
          boxShadow:`0 0 20px ${hexToRgba(victoryAssured.hex,0.35)}`,
          display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:victoryAssured.hex,fontWeight:"bold",fontSize:10,letterSpacing:2,marginBottom:3}}>
              {victoryAssured.name.toUpperCase()}
            </div>
            <div style={{color:hexToRgba(victoryAssured.hex,0.8),fontSize:8,letterSpacing:1}}>
              {config.victoryAssuredText}
            </div>
          </div>
          <button onClick={()=>{setFinalOwnership(ownership);music.sfxVictory();setPhase("gameover");}} style={{
            flexShrink:0,padding:"6px 10px",borderRadius:6,cursor:"pointer",
            border:`1px solid ${victoryAssured.hex}`,background:hexToRgba(victoryAssured.hex,0.25),
            color:victoryAssured.hex,fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:1}}>END NOW</button>
          <button onClick={()=>setVictoryAssured(null)} style={{
            flexShrink:0,padding:"6px 10px",borderRadius:6,cursor:"pointer",
            border:"1px solid #444",background:"transparent",
            color:"#aaa",fontFamily:"'Space Mono',monospace",fontSize:8,letterSpacing:1}}>PLAY ON</button>
        </div>
      )}

      {/* ── Score cards ── */}
      <div style={{display:"flex",gap:6,width:"100%",maxWidth:380,flexShrink:0}}>
        {Array.from({length:numPlayers},(_,i)=>{
          const def=playerDefs[i],isCur=i===cp,showScore=difficulty==="easy"||showScores;
          return(
            <div key={i} style={{flex:1,background:isCur?hexToRgba(def.hex,0.15):"#0d0d1a",
              border:`1px solid ${isCur?hexToRgba(def.hex,0.6):"#111"}`,
              borderRadius:8,padding:"6px 4px",textAlign:"center",
              boxShadow:isCur?`0 0 18px ${hexToRgba(def.hex,0.35)}`:"none",transition:"all 0.3s"}}>
              <div style={{fontSize:9,marginBottom:1}}>{def.isAI?"🤖":""}</div>
              <div style={{width:9,height:9,borderRadius:"50%",background:def.hex,
                margin:"0 auto 3px",boxShadow:`0 0 ${isCur?12:4}px ${def.hex}`}}/>
              {showScore
                ?<div style={{fontSize:16,fontWeight:"bold",color:isCur?def.hex:"#ccc",lineHeight:1,
                  animation:showScores&&difficulty!=="easy"?"glow-pulse 1.5s ease-in-out 3":"none"}}>{scores[i]}</div>
                :<div style={{fontSize:8,color:isCur?def.hex:"#555",lineHeight:1}}>
                  {"▓".repeat(Math.min(5,Math.ceil(scores[i]/TOTAL*5)))}
                </div>
              }
              <div style={{fontSize:6,color:isCur?hexToRgba(def.hex,0.85):"#666",letterSpacing:0.5,margin:"3px 0 4px",lineHeight:1.2}}>
                {def.name.toUpperCase()}
                {teamMode&&<span style={{color:i%2===0?"#FFD32A":"#A29BFE",fontSize:6,marginLeft:3}}>{i%2===0?"▲":"▼"}</span>}
              </div>
              {showScore&&(
                <div style={{height:2,background:"#1a1a2e",borderRadius:1,margin:"0 4px"}}>
                  <div style={{height:"100%",borderRadius:2,background:def.hex,
                    width:`${(scores[i]/TOTAL)*100}%`,boxShadow:`0 0 4px ${def.hex}`,transition:"width 0.4s"}}/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Actions ── */}
      <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
        <button onClick={endTurn} disabled={isAITurn} style={{
          padding:"10px 20px",borderRadius:8,cursor:isAITurn?"default":"pointer",
          border:`2px solid ${hasCaptured&&!isAITurn?curHex:hexToRgba(curHex,0.2)}`,
          background:hasCaptured&&!isAITurn?curDim:"transparent",
          color:hasCaptured&&!isAITurn?curHex:"#555",
          fontFamily:"'Space Mono',monospace",fontSize:11,fontWeight:"bold",letterSpacing:2,
          boxShadow:hasCaptured&&!isAITurn?`0 0 22px ${curGlow}`:"none",transition:"all 0.2s",
          opacity:isAITurn?0.4:1}}>
          END TURN →
        </button>
        <button onClick={triggerEndGame} style={{
          padding:"10px 12px",borderRadius:8,cursor:"pointer",
          border:`2px solid ${confirmEnd?"#FF4757":"#333"}`,
          background:confirmEnd?"rgba(255,71,87,0.15)":"transparent",
          color:confirmEnd?"#FF4757":"#888",
          fontFamily:"'Space Mono',monospace",fontSize:9,letterSpacing:1,
          transition:"all 0.2s",whiteSpace:"nowrap"}}>
          {confirmEnd?"CONFIRM ✕":"END GAME"}
        </button>
        {difficulty!=="easy"&&(
          <button onClick={()=>setShowScores(s=>!s)} style={{
            padding:"10px 12px",borderRadius:8,cursor:"pointer",
            border:`2px solid ${showScores?"#A29BFE":"#333"}`,
            background:showScores?"rgba(162,155,254,0.15)":"transparent",
            color:showScores?"#A29BFE":"#888",
            fontFamily:"'Space Mono',monospace",fontSize:11,
            transition:"all 0.2s",
            boxShadow:showScores?"0 0 14px rgba(162,155,254,0.4)":"none"}} title="Peek at scores">👁</button>
        )}
        {/* Instructions */}
        <button onClick={()=>setShowInstructions(difficulty||"general")} style={{
          padding:"10px 12px",borderRadius:8,cursor:"pointer",
          border:"1px solid #333",background:"transparent",
          color:"#888",fontFamily:"'Space Mono',monospace",fontSize:13,
          transition:"all 0.2s",
        }} title="How to play">?</button>
        {/* Music toggle */}
        <button onClick={music.toggleMusic} style={{
          padding:"10px 12px",borderRadius:8,cursor:"pointer",
          border:`2px solid ${music.musicOn?"#FFD32A":"#333"}`,
          background:music.musicOn?"rgba(255,211,42,0.15)":"transparent",
          color:music.musicOn?"#FFD32A":"#888",
          fontFamily:"'Space Mono',monospace",fontSize:11,
          transition:"all 0.2s",
          boxShadow:music.musicOn?"0 0 14px rgba(255,211,42,0.4)":"none"}} title="Toggle music">♪</button>
        <GhostButton onClick={resetToMenu} style={{padding:"10px 12px"}}>☰</GhostButton>
      </div>

      {confirmEnd&&<div style={{color:"#FF4757",fontSize:8,letterSpacing:1,flexShrink:0}}>TAP CONFIRM TO END THE GAME EARLY</div>}
      {clickableCells.size===0&&!confirmEnd&&!isAITurn&&<div style={{color:"#777",fontSize:9,letterSpacing:1,flexShrink:0}}>NO MOVES — END TURN</div>}
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
    </div>
  );
}

/* ─── Mini board ──────────────────────────────────── */
function MiniBoard({board,playerDefs,takenCells,curColor,onPick,BS,palette}){
  const[hov,setHov]=useState(null);
  const SIZE=Math.min(typeof window!=="undefined"?window.innerWidth*0.82:280,300);
  return(
    <div onMouseLeave={()=>setHov(null)} style={{
      display:"grid",gridTemplateColumns:`repeat(${BS},1fr)`,gridTemplateRows:`repeat(${BS},1fr)`,
      gap:2,background:"#111",padding:2,borderRadius:8,
      border:`2px solid ${hexToRgba(curColor.hex,0.6)}`,
      boxShadow:`0 0 24px ${hexToRgba(curColor.hex,0.4)}`,
      width:SIZE,height:SIZE,cursor:"crosshair",flexShrink:0}}>
      {Array.from({length:BS*BS},(_,k)=>{
        const r=Math.floor(k/BS),c=k%BS;
        const taken=takenCells.has(k),isHov=hov===k;
        const existingDef=playerDefs.findIndex(d=>d.row===r&&d.col===c);
        return(
          <div key={k} onClick={()=>{if(!taken) onPick(r,c);}} onMouseEnter={()=>setHov(k)}
            style={{background:existingDef>=0?playerDefs[existingDef].hex:palette[board[r][c]].hex,
              position:"relative",cursor:taken?"not-allowed":"crosshair",
              filter:existingDef>=0?"none":"saturate(0.28) brightness(0.72)"}}>
            {existingDef>=0&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:"white",boxShadow:"0 0 3px black"}}/>
            </div>}
            {!taken&&isHov&&<div style={{position:"absolute",inset:0,background:hexToRgba(curColor.hex,0.7),
              border:`2px solid ${curColor.hex}`,boxSizing:"border-box"}}/>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Instructions modal ────────────────────────────── */
const INSTRUCTIONS = {
  general: {
    title: "HOW TO PLAY",
    icon: "🎮",
    sections: [
      {
        heading: "GOAL",
        body: "Capture more cells than your opponent by the end of the game. The player with the most cells wins when rounds run out — or you can call the game early."
      },
      {
        heading: "TAKING A TURN",
        body: "Tap any neutral (muted) cell that borders your territory. The whole connected group of the same colour joins you in one move. Hover first to preview exactly what you'd capture and how many cells."
      },
      {
        heading: "YOUR COLOUR ANYWHERE",
        body: "Any neutral cell that matches your team colour is clickable from anywhere on the board — not just next to your territory. Use this to grab a foothold on the other side of the grid."
      },
      {
        heading: "AUTO-JOINS",
        body: "At the start of your turn, any neutral cells of your own colour that directly touch your territory are claimed automatically for free."
      },
      {
        heading: "ENCLOSURES",
        body: "If you fully surround a group of neutral cells against a wall or your own territory, they are automatically claimed — as long as they contain no other player's colour (they could still reach in)."
      },
      {
        heading: "RE-CLICK TO CHANGE",
        body: "Made a bad move? Before hitting End Turn, tap any other group to replace your capture with a different one."
      },
      {
        heading: "END TURN",
        body: "When you're happy with your capture, tap End Turn. You can also pass without capturing if you want to skip."
      },
    ]
  },
  easy: {
    title: "EASY MODE",
    icon: "🟢",
    sections: [
      { heading: "BOARD", body: "Pixels come in blobs of 2–6 cells. No isolated single pixels. Groups are easier to see and plan around." },
      { heading: "CASCADE", body: "When you capture a colour group, ALL other patches of that same colour touching any of your territory also join automatically. One click can grab a lot." },
      { heading: "COLOUR LEGEND", body: "A row of colour swatches appears below the board. Tap one to highlight all cells of that colour and dim everything else — great for planning your next move." },
      { heading: "SCORES", body: "Full scores and progress bars are always visible." },
    ]
  },
  normal: {
    title: "NORMAL MODE",
    icon: "🟡",
    sections: [
      { heading: "BOARD", body: "Pixels come in blobs of 2–6 cells. No isolated single pixels." },
      { heading: "NO CASCADE", body: "Only the connected group you click joins you. Disconnected patches of the same colour elsewhere on the board are NOT swept in. Plan each click carefully." },
      { heading: "HIDDEN SCORES", body: "Scores are hidden during play — you can only see rough block bars. Use the 👁 button to peek at exact numbers when you want to check." },
    ]
  },
  hard: {
    title: "HARD MODE",
    icon: "🔴",
    sections: [
      { heading: "BOARD", body: "Fully random pixel placement. Cells can be any size group including single isolated pixels. Much harder to predict what you'll capture." },
      { heading: "CASCADE", body: "Same as Easy — capturing a colour sweeps in all same-colour patches touching your territory." },
      { heading: "HIDDEN SCORES", body: "Scores hidden. Use 👁 to peek." },
    ]
  },
  teammode: {
    title: "TEAM MODE (2v2)",
    icon: "⚔️",
    sections: [
      { heading: "TEAMS", body: "Players 1 & 3 form one team (▲ Gold), Players 2 & 4 form the other (▼ Violet). You each still play individually on your own turn." },
      { heading: "WINNING", body: "Your team wins when the two of you combined hold more territory than the opposing pair. Coordinate your expansion to fill areas your teammate can't reach." },
      { heading: "STRATEGY", body: "Try to expand towards your teammate to create a connected wall that traps the opponents. Your teammate's territory counts as friendly for enclosure purposes." },
    ]
  },
  vscomputer: {
    title: "VS COMPUTER",
    icon: "🤖",
    sections: [
      { heading: "RECRUIT", body: "The computer picks a random legal move each turn. Good for learning the game." },
      { heading: "VETERAN", body: "The computer always picks whichever cell captures the most cells that turn. Consistent but predictable — try to block its best move." },
      { heading: "MASTER", body: "The computer scores its top 5 moves, then simulates your best possible reply to each, and picks the move that maximises its gain while minimising yours. Much harder to beat." },
      { heading: "COMPUTER TURN", body: "When it's the computer's turn the board dims and a ⚙ spins in the banner. It thinks for about a second then plays automatically." },
    ]
  },
};

function InstructionsModal({topic, onClose}){
  const data = INSTRUCTIONS[topic] || INSTRUCTIONS.general;
  const[section,setSection] = useState(0);

  return(
    <div style={{
      position:"fixed",inset:0,zIndex:1000,
      background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"16px",
      fontFamily:"'Space Mono',monospace",
    }} onClick={onClose}>
      <div style={{
        background:"#0d0d1a",border:"1px solid #2a2a4a",borderRadius:16,
        width:"100%",maxWidth:340,maxHeight:"80vh",
        display:"flex",flexDirection:"column",
        boxShadow:"0 0 60px rgba(0,0,0,0.9)",
        overflow:"hidden",
      }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"14px 16px",borderBottom:"1px solid #1a1a2e",flexShrink:0,
        }}>
          <span style={{fontSize:24}}>{data.icon}</span>
          <span style={{flex:1,fontSize:11,fontWeight:"bold",letterSpacing:3,color:"#eee"}}>{data.title}</span>
          <button onClick={onClose} style={{
            width:28,height:28,borderRadius:"50%",cursor:"pointer",border:"1px solid #333",
            background:"transparent",color:"#aaa",fontSize:14,fontFamily:"'Space Mono',monospace",
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>✕</button>
        </div>

        {/* Section pills */}
        {data.sections.length > 1 && (
          <div style={{
            display:"flex",gap:4,padding:"10px 12px",overflowX:"auto",
            borderBottom:"1px solid #1a1a2e",flexShrink:0,
          }}>
            {data.sections.map((s,i)=>(
              <button key={i} onClick={()=>setSection(i)} style={{
                flexShrink:0,padding:"4px 10px",borderRadius:20,cursor:"pointer",
                border:`1px solid ${i===section?"#A29BFE":"#2a2a4a"}`,
                background:i===section?"rgba(162,155,254,0.2)":"transparent",
                color:i===section?"#A29BFE":"#666",
                fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:1,
                transition:"all 0.15s",
              }}>{s.heading}</button>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
          <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,color:"#A29BFE",marginBottom:10}}>
            {data.sections[section].heading}
          </div>
          <div style={{fontSize:11,color:"#ccc",lineHeight:1.9,letterSpacing:0.5}}>
            {data.sections[section].body}
          </div>
        </div>

        {/* Nav arrows */}
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"10px 16px",borderTop:"1px solid #1a1a2e",flexShrink:0,
        }}>
          <button onClick={()=>setSection(s=>Math.max(0,s-1))} disabled={section===0} style={{
            padding:"6px 14px",borderRadius:8,cursor:section===0?"default":"pointer",
            border:"1px solid #2a2a4a",background:"transparent",
            color:section===0?"#2a2a4a":"#aaa",fontFamily:"'Space Mono',monospace",fontSize:10,
          }}>← PREV</button>
          <span style={{color:"#444",fontSize:9}}>{section+1} / {data.sections.length}</span>
          <button onClick={()=>setSection(s=>Math.min(data.sections.length-1,s+1))}
            disabled={section===data.sections.length-1} style={{
            padding:"6px 14px",borderRadius:8,
            cursor:section===data.sections.length-1?"default":"pointer",
            border:"1px solid #2a2a4a",background:"transparent",
            color:section===data.sections.length-1?"#2a2a4a":"#aaa",
            fontFamily:"'Space Mono',monospace",fontSize:10,
          }}>NEXT →</button>
        </div>
      </div>
    </div>
  );
}

/* ─── UI atoms ─────────────────────────────────────── */
function Shell({children,wide=false}){
  return(
    <div style={{minHeight:"100vh",background:"#080812",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"24px 16px",
      fontFamily:"'Space Mono',monospace",color:"white",boxSizing:"border-box",overflow:"hidden"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        background:"#0d0d1a",border:"1px solid #2a2a4a",borderRadius:16,
        padding:"28px 20px",width:"100%",maxWidth:wide?340:320,
        boxShadow:"0 0 60px rgba(0,0,0,0.8)"}}>
        {children}
      </div>
    </div>
  );
}
function Logo({name}){
  const parts=name.split(" ");
  return(
    <div style={{fontSize:34,fontWeight:"bold",letterSpacing:6,lineHeight:1.1,
      textAlign:"center",marginBottom:6,
      background:"linear-gradient(135deg,#FF4757,#5352ED,#2ED573,#FFD32A)",
      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
      {parts[0]}<br/>{parts.slice(1).join(" ")||""}
    </div>
  );
}
function Dim({children}){return <div style={{fontSize:8,letterSpacing:4,color:"#aaa",marginBottom:28}}>{children}</div>;}
function SLabel({children}){return <div style={{fontSize:9,letterSpacing:3,color:"#ddd",marginBottom:16}}>{children}</div>;}
function Badge({color,children}){
  return(
    <span style={{fontSize:7,letterSpacing:2,color,padding:"2px 7px",borderRadius:10,
      border:`1px solid ${hexToRgba(color,0.5)}`,background:hexToRgba(color,0.12),whiteSpace:"nowrap"}}>
      {children}
    </span>
  );
}
function NumBtn({onClick,children}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:80,height:80,borderRadius:12,cursor:"pointer",
        border:`2px solid ${h?"#A29BFE":"#2a2a4a"}`,background:"transparent",
        color:h?"#A29BFE":"#ddd",fontSize:32,fontWeight:"bold",
        fontFamily:"'Space Mono',monospace",
        boxShadow:h?"0 0 20px rgba(162,155,254,0.45)":"none",transition:"all 0.2s"}}>{children}</button>
  );
}
function DiffBtn({color,label,onClick,children,noMargin=false}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:"100%",padding:"16px 16px",borderRadius:10,cursor:"pointer",
        marginBottom:noMargin?0:10,textAlign:"left",border:`2px solid ${color}`,
        background:h?hexToRgba(color,0.18):hexToRgba(color,0.08),
        boxShadow:h?`0 0 24px ${hexToRgba(color,0.35)}`:"none",
        transition:"all 0.2s",fontFamily:"'Space Mono',monospace"}}>
      <div style={{fontSize:13,fontWeight:"bold",letterSpacing:3,color,marginBottom:5,
        textShadow:`0 0 12px ${hexToRgba(color,0.5)}`}}>{label}</div>
      <div style={{fontSize:9,color,opacity:0.9,letterSpacing:1,lineHeight:1.8}}>{children}</div>
    </button>
  );
}
function ColorBtn({pc,taken,onClick}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} disabled={taken} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{height:56,borderRadius:10,cursor:taken?"not-allowed":"pointer",
        border:`2px solid ${taken?"#222":h?pc.hex:hexToRgba(pc.hex,0.5)}`,
        background:taken?"#0a0a16":h?hexToRgba(pc.hex,0.25):hexToRgba(pc.hex,0.12),
        opacity:taken?0.25:1,transition:"all 0.15s",
        boxShadow:h&&!taken?`0 0 18px ${hexToRgba(pc.hex,0.55)}`:"none"}}>
      <div style={{width:22,height:22,borderRadius:"50%",background:taken?"#1a1a2e":pc.hex,
        margin:"0 auto 4px",boxShadow:taken?"none":`0 0 10px ${hexToRgba(pc.hex,0.7)}`}}/>
      <div style={{fontSize:7,color:taken?"#333":pc.hex,letterSpacing:1}}>{pc.name.toUpperCase()}</div>
    </button>
  );
}
function GlowButton({hex,onClick,children}){
  return(
    <button onClick={onClick} style={{padding:"10px 16px",borderRadius:8,border:"none",cursor:"pointer",
      background:`linear-gradient(135deg,${hex},${hexToRgba(hex,0.6)})`,
      color:"white",fontSize:10,fontWeight:"bold",letterSpacing:2,
      fontFamily:"'Space Mono',monospace",boxShadow:`0 0 20px ${hexToRgba(hex,0.4)}`}}>
      {children}
    </button>
  );
}
function GhostButton({onClick,children,style={}}){
  return(
    <button onClick={onClick} style={{padding:"11px 14px",borderRadius:8,cursor:"pointer",
      border:"1px solid #333",background:"transparent",
      color:"#aaa",fontFamily:"'Space Mono',monospace",fontSize:12,...style}}>
      {children}
    </button>
  );
}

const GLOBAL_CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes ring-pulse    { 0% { transform:scale(1);   opacity:0.7; } 70% { transform:scale(2.2); opacity:0; } 100% { transform:scale(2.2); opacity:0; } }
  @keyframes cell-flicker  { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
  @keyframes flash-burst   { 0% { opacity:0.85; } 100% { opacity:0; } }
  @keyframes enclosed-burst{ 0% { opacity:0; } 20% { opacity:0.9; } 100% { opacity:0; } }
  @keyframes auto-burst    { 0% { opacity:0; } 15% { opacity:0.8; } 100% { opacity:0; } }
  @keyframes glow-pulse    { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
  @keyframes ai-spin       { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  .ring-pulse     { animation:ring-pulse     1.5s ease-out    infinite; }
  .cell-pulse     { animation:cell-flicker   0.9s ease-in-out infinite; }
  .flash-burst    { animation:flash-burst    0.7s ease        forwards; }
  .enclosed-burst { animation:enclosed-burst 1.0s ease        forwards; }
  .auto-burst     { animation:auto-burst     0.8s ease        forwards; }
  .ai-thinking    { animation:ai-spin        1s   linear      infinite; display:inline-block; }
`;
