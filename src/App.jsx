import { useState, useMemo, useCallback, useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════
   THEMES
════════════════════════════════════════════════════════ */
const THEMES = {
  neon: {
    name:"Neon Arcade",
    bg:"#080812", cardBg:"#0d0d1a", border:"#2a2a4a",
    text:"#eee", textDim:"#888", textFaint:"#444",
    gapColor:"#111", cellRadius:0, font:"'Space Mono',monospace",
    accentColor:"#A29BFE", pixelated:false,
    btnBorder:"#333", btnText:"#aaa",
    neutralFilter:"saturate(0.55) brightness(0.85)",
    ownedFilter:"saturate(1.4) brightness(1.1)",

    boardColours:[
      {hex:"#FF3333",name:"Red"},
      {hex:"#FF8800",name:"Orange"},
      {hex:"#FFE600",name:"Yellow"},
      {hex:"#00EE00",name:"Green"},
      {hex:"#00AACC",name:"Teal"},
      {hex:"#1A8CFF",name:"Blue"},
      {hex:"#8833FF",name:"Purple"},
      {hex:"#FF44AA",name:"Pink"},
      {hex:"#EEEEEE",name:"White"},
      {hex:"#FFAA00",name:"Amber"},
      {hex:"#999999",name:"Grey"},
      {hex:"#BBFF00",name:"Lime"},
    ],
    teams:[
      {hex:"#FF3333",name:"Scarlet Fury"},
      {hex:"#1A8CFF",name:"Azure Knights"},
      {hex:"#FFE600",name:"Yellow Thunder"},
      {hex:"#00EE00",name:"Neon Vipers"},
      {hex:"#FF44AA",name:"Pink Panthers"},
      {hex:"#00AACC",name:"Teal Storm"},
      {hex:"#8833FF",name:"Amethyst Power"},
      {hex:"#FF8800",name:"Orange Tigers"},
    ],
  },
  pastel: {
    name:"Pastel Soft",
    bg:"#F5F0FF", cardBg:"#FFFFFF", border:"#DDD0F0",
    text:"#3D2B5E", textDim:"#7060A0", textFaint:"#C8B8E0",
    gapColor:"#EAE0F5", cellRadius:4, font:"'Space Mono',monospace",
    accentColor:"#9B70D0", pixelated:false,
    btnBorder:"#C8B0E8", btnText:"#6B5090",
    neutralFilter:"saturate(0.5) brightness(0.92)",
    ownedFilter:"saturate(1.1) brightness(1.0)",

    boardColours:[
      {hex:"#E87070",name:"Rose"},
      {hex:"#E8A060",name:"Peach"},
      {hex:"#E8D870",name:"Butter"},
      {hex:"#80C880",name:"Sage"},
      {hex:"#70C0D8",name:"Sky"},
      {hex:"#7898E8",name:"Periwinkle"},
      {hex:"#A878D8",name:"Lavender"},
      {hex:"#E878B0",name:"Blush"},
      {hex:"#F0F0F0",name:"Cream"},
      {hex:"#E8B860",name:"Sand"},
      {hex:"#B8B8C8",name:"Pebble"},
      {hex:"#A8D870",name:"Celery"},
    ],
    teams:[
      {hex:"#E87070",name:"Rose"},
      {hex:"#7898E8",name:"Periwinkle"},
      {hex:"#E8D870",name:"Butter"},
      {hex:"#80C880",name:"Sage"},
      {hex:"#E878B0",name:"Blush"},
      {hex:"#70C0D8",name:"Sky"},
      {hex:"#A878D8",name:"Lavender"},
      {hex:"#E8A060",name:"Peach"},
    ],
  },
  retro: {
    name:"Retro 8-Bit",
    bg:"#0A0A0A", cardBg:"#111111", border:"#00AA22",
    text:"#00FF41", textDim:"#00882A", textFaint:"#004412",
    gapColor:"#000000", cellRadius:0, font:"'Space Mono',monospace",
    accentColor:"#00FF41", pixelated:true,
    btnBorder:"#00AA22", btnText:"#00CC33",
    neutralFilter:"saturate(0.4) brightness(0.6)",
    ownedFilter:"saturate(1.0) brightness(1.0)",

    boardColours:[
      {hex:"#FF0000",name:"Red"},
      {hex:"#FF6600",name:"Orange"},
      {hex:"#FFFF00",name:"Yellow"},
      {hex:"#00FF00",name:"Green"},
      {hex:"#00FFFF",name:"Cyan"},
      {hex:"#0088FF",name:"Blue"},
      {hex:"#8800FF",name:"Purple"},
      {hex:"#FF00FF",name:"Magenta"},
      {hex:"#FFFFFF",name:"White"},
      {hex:"#FFAA00",name:"Gold"},
      {hex:"#AAAAAA",name:"Silver"},
      {hex:"#FF0088",name:"Hot Pink"},
    ],
    teams:[
      {hex:"#FF0000",name:"Red Squad"},
      {hex:"#0088FF",name:"Blue Squad"},
      {hex:"#FFFF00",name:"Yellow Squad"},
      {hex:"#00FF00",name:"Green Squad"},
      {hex:"#FF00FF",name:"Magenta Squad"},
      {hex:"#00FFFF",name:"Cyan Squad"},
      {hex:"#8800FF",name:"Purple Squad"},
      {hex:"#FF6600",name:"Orange Squad"},
    ],
  },
};

/* ════════════════════════════════════════════════════════
   DEFAULT CONFIG
════════════════════════════════════════════════════════ */
const DEFAULT_CONFIG = {
  gameName:"PIXEL GO", tagline:"COLOUR TERRITORY BATTLE",
  maxRounds:0, theme:"neon",
  boardColours:[
    {hex:"#FF3333",name:"Red"},
    {hex:"#FF8800",name:"Orange"},
    {hex:"#FFE600",name:"Yellow"},
    {hex:"#00EE00",name:"Green"},
    {hex:"#00AACC",name:"Teal"},
    {hex:"#1A8CFF",name:"Blue"},
    {hex:"#8833FF",name:"Purple"},
    {hex:"#FF44AA",name:"Pink"},
    {hex:"#EEEEEE",name:"White"},
    {hex:"#FFAA00",name:"Amber"},
    {hex:"#999999",name:"Grey"},
    {hex:"#BBFF00",name:"Lime"},
  ],
  teams:[
    {hex:"#FF3333",name:"Scarlet Fury"},
    {hex:"#1A8CFF",name:"Azure Knights"},
    {hex:"#FFE600",name:"Yellow Thunder"},
    {hex:"#00EE00",name:"Neon Vipers"},
    {hex:"#FF44AA",name:"Pink Panthers"},
    {hex:"#00AACC",name:"Teal Storm"},
    {hex:"#8833FF",name:"Amethyst Power"},
    {hex:"#FF8800",name:"Orange Tigers"},
  ],
  difficulties:{
    easy:  {label:"Easy",  color:"#2ED573",board:"grouped",cascade:"full",
            line1:"Groups of 2–6 pixels, no singletons",line2:"All matching colour groups nearby chain together"},
    normal:{label:"Normal",color:"#FFD32A",board:"grouped",cascade:"none",
            line1:"Groups of 2–6 pixels, no singletons",line2:"Only the clicked group joins — no chaining"},
    hard:  {label:"Hard",  color:"#FF4757",board:"random", cascade:"full",
            line1:"Fully random pixels, any group size",line2:"All matching colour groups chain together + Fog of War"},
    veryhard:{label:"Very Hard",color:"#CC00CC",board:"random",cascade:"none",
            line1:"Fully random pixels, any group size",line2:"Only the exact group you click + Fog of War"},
  },
  gridSizes:{
    small: {bs:12,label:"Small", sub:"12 × 12"},
    medium:{bs:17,label:"Medium",sub:"17 × 17"},
    large: {bs:22,label:"Large", sub:"22 × 22"},
    huge:  {bs:30,label:"Huge",  sub:"30 × 30"},
  },
  victoryText:{
    conquest:    {title:"CONQUEST COMPLETE",   sub:"Every cell is yours.",  icon:"🏆"},
    overwhelming:{title:"OVERWHELMING VICTORY",sub:"{pct}% captured.",      icon:"🌟"},
    victory:     {title:"VICTORY",             sub:"{pct}% captured.",      icon:"⚡"},
    close:       {title:"CLOSE BATTLE",        sub:"{pct}% captured.",      icon:"😤"},
    defeat:      {title:"DEFEAT",              sub:"Only {pct}% captured.", icon:"💀"},
  },
  multiWinText:"dominates the board",
  victoryAssuredText:"Victory is now assured — play on or call the game?",
};

function loadConfig(){
  try{const s=localStorage.getItem("pixelgo_config");return s?deepMerge(DEFAULT_CONFIG,JSON.parse(s)):DEFAULT_CONFIG;}
  catch{return DEFAULT_CONFIG;}
}
function saveConfig(cfg){try{localStorage.setItem("pixelgo_config",JSON.stringify(cfg));}catch{}}
function deepMerge(def,over){
  if(!over) return def;
  const r={...def};
  for(const k of Object.keys(over)){
    if(over[k]!==null&&typeof over[k]==="object"&&!Array.isArray(over[k]))
      r[k]=deepMerge(def[k]||{},over[k]);
    else r[k]=over[k];
  }
  return r;
}

/* ════════════════════════════════════════════════════════
   STATS
════════════════════════════════════════════════════════ */
const STATS_KEY="pixelgo_stats";
const DEFAULT_STATS={
  gamesPlayed:0,wins:0,losses:0,
  totalCaptures:0,biggestSingleCapture:0,
  totalCells:0,encloseCount:0,
  vsComputer:{recruit:{wins:0,losses:0},veteran:{wins:0,losses:0},master:{wins:0,losses:0}},
  daily:{streak:0,lastDate:null,bestScore:0,completions:0},
};
function loadStats(){
  try{const s=localStorage.getItem(STATS_KEY);return s?{...DEFAULT_STATS,...JSON.parse(s)}:DEFAULT_STATS;}
  catch{return DEFAULT_STATS;}
}
function saveStats(st){try{localStorage.setItem(STATS_KEY,JSON.stringify(st));}catch{}}

/* ════════════════════════════════════════════════════════
   DAILY CHALLENGE
════════════════════════════════════════════════════════ */
function getTodayStr(){
  const d=new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

function seededRand(seed){
  let s=seed>>>0;
  return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
}
function dateSeed(){
  const str=getTodayStr();
  let h=0;
  for(const c of str){h=(Math.imul(31,h)+c.charCodeAt(0))|0;}
  return Math.abs(h)||12345678;
}

/* ════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════ */
const NUM_COLORS=12;
function hexToRgba(hex,a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ════════════════════════════════════════════════════════
   BOARD GENERATORS
════════════════════════════════════════════════════════ */
function equalizeBoard(board,BS,rand=Math.random){
  const flat=board.flat(),perColor=Math.floor(flat.length/NUM_COLORS);
  const counts=Array(NUM_COLORS).fill(0);flat.forEach(c=>counts[c]++);
  const byColor=Array.from({length:NUM_COLORS},()=>[]);
  flat.forEach((c,i)=>byColor[c].push(i));
  byColor.forEach(arr=>{for(let i=arr.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}});
  for(let c=0;c<NUM_COLORS;c++) while(counts[c]>perColor+1){
    const idx=byColor[c].pop();let minC=0;
    for(let i=1;i<NUM_COLORS;i++) if(counts[i]<counts[minC]) minC=i;
    flat[idx]=minC;counts[c]--;counts[minC]++;byColor[minC].push(idx);
  }
  return Array.from({length:BS},(_,r)=>flat.slice(r*BS,(r+1)*BS));
}
function mkBoardRandom(BS,rand=Math.random){
  return equalizeBoard(Array.from({length:BS},()=>Array.from({length:BS},()=>Math.floor(rand()*NUM_COLORS))),BS,rand);
}
function mkBoardGrouped(BS,rand=Math.random){
  const grid=Array.from({length:BS},()=>Array(BS).fill(-1));
  const placed=Array.from({length:BS},()=>Array(BS).fill(false));
  function nbrs(r,c){return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS);}
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  for(const[sr,sc]of shuffle(Array.from({length:BS*BS},(_,k)=>[Math.floor(k/BS),k%BS]))){
    if(placed[sr][sc]) continue;
    const color=Math.floor(rand()*NUM_COLORS),size=2+Math.floor(rand()*5);
    const region=[[sr,sc]];placed[sr][sc]=true;grid[sr][sc]=color;
    while(region.length<size){
      const frontier=[];
      for(const[r,c]of region) for(const[nr,nc]of nbrs(r,c)) if(!placed[nr][nc]) frontier.push([nr,nc]);
      if(!frontier.length) break;
      const[nr,nc]=frontier[Math.floor(rand()*frontier.length)];
      if(placed[nr][nc]) continue;
      placed[nr][nc]=true;grid[nr][nc]=color;region.push([nr,nc]);
    }
  }
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    const col=grid[r][c],ns=nbrs(r,c);
    if(!ns.some(([nr,nc])=>grid[nr][nc]===col)&&ns.length) grid[r][c]=grid[ns[0][0]][ns[0][1]];
  }
  return equalizeBoard(grid,BS,rand);
}

/* ════════════════════════════════════════════════════════
   GAME LOGIC
════════════════════════════════════════════════════════ */
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
  const own=o.map(row=>[...row]),ac=new Set();let changed=true;
  while(changed){changed=false;
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
  while(changed){changed=false;
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
      const ep=[...bp][0];
      if(!region.every(([r,c])=>{const ci=board[r][c];return pci.every((p,i)=>i===ep||p!==ci);})) continue;
      for(const[r,c]of region){own[r][c]=ep;enc.add(r*BS+c);changed=true;}
    }
  }
  return{newOwnership:own,enclosed:enc};
}
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

/* ════════════════════════════════════════════════════════
   FOG OF WAR
════════════════════════════════════════════════════════ */
function computeFogVisibility(ownership,playerIdx,BS,range){
  const vis=new Set();
  const queue=[];
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    if(ownership[r][c]===playerIdx){queue.push([r,c,0]);vis.add(r*BS+c);}
  }
  const seen=new Set(vis);
  let head=0;
  while(head<queue.length){
    const[r,c,d]=queue[head++];
    if(d>=range) continue;
    for(const[nr,nc]of[[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){
      if(nr<0||nr>=BS||nc<0||nc>=BS) continue;
      const k=nr*BS+nc;if(seen.has(k)) continue;
      seen.add(k);vis.add(k);queue.push([nr,nc,d+1]);
    }
  }
  return vis;
}

/* ════════════════════════════════════════════════════════
   MATHEMATICAL VICTORY CHECK
════════════════════════════════════════════════════════ */
function checkMathematicalVictory(ownership,numPlayers,teamMode,BS){
  const TOTAL=BS*BS;
  const scores=Array(numPlayers).fill(0);let remaining=0;
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    const v=ownership[r][c];if(v>=0) scores[v]++;else remaining++;
  }
  if(teamMode){
    const t0=scores[0]+(scores[2]||0),t1=scores[1]+(scores[3]||0);
    if(t0>t1+remaining) return 0;if(t1>t0+remaining) return 1;return -1;
  }
  for(let i=0;i<numPlayers;i++){
    let maxOther=0;
    for(let j=0;j<numPlayers;j++) if(j!==i) maxOther=Math.max(maxOther,scores[j]);
    if(scores[i]>maxOther+remaining) return i;
  }
  return -1;
}

/* ════════════════════════════════════════════════════════
   AI LOGIC
════════════════════════════════════════════════════════ */
const AI_LEVELS={
  recruit:    {key:"recruit",    label:"Recruit",    color:"#2ED573",desc:"Makes random moves"},
  veteran:    {key:"veteran",    label:"Veteran",    color:"#FFD32A",desc:"Picks the biggest group available"},
  master:     {key:"master",     label:"Master",     color:"#FF4757",desc:"Maximises gain and blocks your best move"},
  grandmaster:{key:"grandmaster",label:"Grandmaster",color:"#CC00CC",desc:"Looks two moves ahead — simulates your best reply and its own counter. Not recommended on Huge grid."},
};
/* ── Territorial evaluation helpers ── */




function countReachableNeutrals(board,ownership,pid,BS){
  const visited=new Set();
  const q=[];

  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    if(ownership[r][c]!==pid) continue;
    for(const[nr,nc]of[[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){
      if(nr<0||nr>=BS||nc<0||nc>=BS) continue;
      const k=nr*BS+nc;
      if(ownership[nr][nc]===-1&&!visited.has(k)){visited.add(k);q.push([nr,nc]);}
    }
  }

  let head=0;
  while(head<q.length){
    const[r,c]=q[head++];
    for(const[nr,nc]of[[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){
      if(nr<0||nr>=BS||nc<0||nc>=BS) continue;
      const k=nr*BS+nc;
      if(ownership[nr][nc]===-1&&!visited.has(k)){visited.add(k);q.push([nr,nc]);}
    }
  }
  return visited.size;
}



function countNearlyEnclosed(ownership,pid,BS){
  let count=0;
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    if(ownership[r][c]!==-1) continue;
    let friendlyOrWall=0;
    for(const[nr,nc]of[[r-1,c],[r+1,c],[r,c-1],[r,c+1]]){
      if(nr<0||nr>=BS||nc<0||nc>=BS) friendlyOrWall++;
      else if(ownership[nr][nc]===pid) friendlyOrWall++;
    }
    if(friendlyOrWall>=3) count++;
  }
  return count;
}



function scoreMove(board,ownership,pid,r,c,cascade,playerDefs,palette,numPlayers,BS,deep=false){
  const doC=cascade==="full"?cascadeCapture:captureGroup;
  const{newOwnership:after}=doC(board,ownership,pid,r,c,BS);
  const{newOwnership:afterEnc}=applyEnclosures(board,after,playerDefs,numPlayers,palette,BS);


  let gained=0;
  for(let r2=0;r2<BS;r2++) for(let c2=0;c2<BS;c2++)
    if(afterEnc[r2][c2]===pid&&ownership[r2][c2]===-1) gained++;



  let territorial=0;
  if(deep){

    const myReach=countReachableNeutrals(board,afterEnc,pid,BS);


    let opponentReachBefore=0,opponentReachAfter=0;
    for(let i=0;i<numPlayers;i++){
      if(i===pid) continue;
      opponentReachBefore+=countReachableNeutrals(board,ownership,i,BS);
      opponentReachAfter +=countReachableNeutrals(board,afterEnc,i,BS);
    }
    const denied=opponentReachBefore-opponentReachAfter;


    const nearEnc=countNearlyEnclosed(afterEnc,pid,BS);


    territorial=denied*0.4+nearEnc*0.5;
  }

  return{gained,territorial,afterEnc};
}
function getAIMove(board,ownership,pid,playerDefs,palette,BS,cascadeMode,aiLevel,numPlayers){
  const cells=getClickableCellsForPlayer(board,ownership,pid,playerDefs,palette,BS);
  const candidates=[...cells].map(k=>[Math.floor(k/BS),k%BS]);
  if(!candidates.length) return null;
  if(aiLevel==="recruit") return candidates[Math.floor(Math.random()*candidates.length)];


  const useDeep=aiLevel==="master"||aiLevel==="grandmaster";
  const scored=candidates.map(([r,c])=>{
    const{gained,territorial,afterEnc}=scoreMove(board,ownership,pid,r,c,cascadeMode,playerDefs,palette,numPlayers,BS,useDeep);

    const total=gained+territorial;
    return{r,c,gained,territorial,total,afterEnc};
  }).sort((a,b)=>b.total-a.total);
  if(aiLevel==="veteran") return[scored[0].r,scored[0].c];
  const topN=aiLevel==="grandmaster"?Math.min(10,scored.length):Math.min(5,scored.length);
  const top=scored.slice(0,topN);
  const humanIdx=playerDefs.findIndex((d,i)=>i!==pid&&!d.isAI);
  if(humanIdx<0) return[top[0].r,top[0].c];
  let bestMove=top[0],bestNet=-Infinity;
  for(const move of top){

    const hc=getClickableCellsForPlayer(board,move.afterEnc,humanIdx,playerDefs,palette,BS);
    let maxHScore=0,humanBestBoard=move.afterEnc;
    for(const hk of hc){
      const hr=Math.floor(hk/BS),hcc=hk%BS;
      const{gained,territorial,afterEnc:hAfter}=scoreMove(board,move.afterEnc,humanIdx,hr,hcc,cascadeMode,playerDefs,palette,numPlayers,BS,aiLevel==="grandmaster");
      const hTotal=gained+(aiLevel==="grandmaster"?territorial:0);
      if(hTotal>maxHScore){maxHScore=hTotal;humanBestBoard=hAfter;}
      if(maxHScore>50) break;
    }

    let net=move.total*1.5-maxHScore*1.2;


    if(aiLevel==="grandmaster"&&humanBestBoard!==move.afterEnc){
      const ac2=getClickableCellsForPlayer(board,humanBestBoard,pid,playerDefs,palette,BS);
      let bestCounterScore=0;
      for(const ak of ac2){
        const ar=Math.floor(ak/BS),acc=ak%BS;
        const{gained:ag,territorial:at}=scoreMove(board,humanBestBoard,pid,ar,acc,cascadeMode,playerDefs,palette,numPlayers,BS,true);
        const cs=ag+at;
        if(cs>bestCounterScore) bestCounterScore=cs;
        if(bestCounterScore>60) break;
      }

      net=move.total*1.5+bestCounterScore*0.55-maxHScore*1.3;
    }

    if(net>bestNet){bestNet=net;bestMove=move;}
  }
  return[bestMove.r,bestMove.c];
}

/* ════════════════════════════════════════════════════════
   MUSIC
════════════════════════════════════════════════════════ */
function useMusicSystem(){
  const ctxRef=useRef(null),masterRef=useRef(null),loopRef=useRef(null);
  const stepRef=useRef(0),nextRef=useRef(0);
  const[musicOn,setMusicOn]=useState(false);
  const BPM=128,BEAT=60/BPM,S16=BEAT/4;
  const ROOTS=[110.00,87.31,65.41,98.00];
  const STABS=[[110.00,164.81,220.00],[87.31,130.81,174.61],[65.41,98.00,130.81],[98.00,146.83,196.00]];
  const ARP=[0,2,1,2,0,2,1,2,0,2,1,2,0,1,2,1];
  function getCtx(){
    if(!ctxRef.current){
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const m=ctx.createGain();m.gain.value=0.13;m.connect(ctx.destination);
      ctxRef.current=ctx;masterRef.current=m;
    }
    return{ctx:ctxRef.current,master:masterRef.current};
  }
  function playOsc(freq,start,dur,vol,type="sawtooth",filterFreq=null){
    try{
      const{ctx,master}=getCtx();
      const osc=ctx.createOscillator(),g=ctx.createGain();
      if(filterFreq){const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=filterFreq;osc.connect(f);f.connect(g);}
      else osc.connect(g);
      g.connect(master);osc.type=type;osc.frequency.value=freq;
      g.gain.setValueAtTime(0.001,start);g.gain.linearRampToValueAtTime(vol,start+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,start+dur*0.9);osc.start(start);osc.stop(start+dur);
    }catch{}
  }
  function playKick(t){
    try{const{ctx,master}=getCtx();const osc=ctx.createOscillator(),g=ctx.createGain();
      osc.connect(g);g.connect(master);osc.type="sine";
      osc.frequency.setValueAtTime(160,t);osc.frequency.exponentialRampToValueAtTime(40,t+0.08);
      g.gain.setValueAtTime(0.8,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
      osc.start(t);osc.stop(t+0.3);}catch{}
  }
  function playSnare(t){
    try{const{ctx,master}=getCtx();
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.15,ctx.sampleRate);
      const d=buf.getChannelData(0);for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
      const src=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      f.type="highpass";f.frequency.value=2000;src.buffer=buf;
      src.connect(f);f.connect(g);g.connect(master);
      g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
      src.start(t);src.stop(t+0.15);}catch{}
  }
  function playHat(t,vol=0.07){
    try{const{ctx,master}=getCtx();
      const buf=ctx.createBuffer(1,ctx.sampleRate*0.04,ctx.sampleRate);
      const d=buf.getChannelData(0);for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
      const src=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      f.type="highpass";f.frequency.value=8000;src.buffer=buf;
      src.connect(f);f.connect(g);g.connect(master);
      g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.04);
      src.start(t);src.stop(t+0.05);}catch{}
  }
  function scheduleLoop(){
    if(!ctxRef.current) return;
    const{ctx}=getCtx(),now=ctx.currentTime;
    while(nextRef.current<now+0.3){
      const t=nextRef.current,step=stepRef.current;
      const beat=Math.floor(step/4),sixth=step%4,ci=Math.floor(step/4)%4;
      if(step===0||step===4||step===8||step===12) playKick(t);
      if(step===4||step===12) playSnare(t);
      playHat(t,sixth===0?0.11:0.05);
      if(sixth===0){playOsc(ROOTS[ci],t,BEAT*0.9,0.5,"sawtooth",600);playOsc(ROOTS[ci]/2,t,BEAT*0.95,0.3,"sine");}
      const ch=STABS[ci],note=ch[ARP[step]%ch.length];
      playOsc(note*2,t,S16*0.7,0.18,"sawtooth",1200+Math.sin(step/16*Math.PI*2)*600);
      if(step===0||step===8) STABS[ci].forEach((f,i)=>playOsc(f,t+i*0.005,BEAT*0.35,0.1,"square",800));
      stepRef.current=(step+1)%16;nextRef.current+=S16;
    }
    loopRef.current=setTimeout(scheduleLoop,100);
  }
  function startMusic(){const{ctx}=getCtx();if(ctx.state==="suspended")ctx.resume();nextRef.current=ctx.currentTime+0.1;stepRef.current=0;scheduleLoop();}
  function stopMusic(){if(loopRef.current)clearTimeout(loopRef.current);loopRef.current=null;}
  const toggleMusic=useCallback(()=>{setMusicOn(on=>{if(!on)startMusic();else stopMusic();return!on;});},[]);
  useEffect(()=>()=>stopMusic(),[]);
  function sfxCapture(){try{const{ctx}=getCtx();const now=ctx.currentTime;[440,554,659].forEach((f,i)=>playOsc(f,now+i*0.05,0.1,0.5,"square",2000));}catch{}}
  function sfxAutoGrab(){try{const{ctx}=getCtx();const now=ctx.currentTime;playOsc(330,now,0.08,0.3,"sine");playOsc(440,now+0.04,0.08,0.3,"sine");}catch{}}
  function sfxEndTurn(){try{const{ctx}=getCtx();playOsc(220,ctx.currentTime,0.06,0.2,"square");}catch{}}
  function sfxVictory(){try{const{ctx}=getCtx();const now=ctx.currentTime;[261.63,329.63,392,523.25,659.25,783.99].forEach((f,i)=>playOsc(f,now+i*0.12,0.3,0.6,"sawtooth",3000));}catch{}}
  function sfxCombo(){try{const{ctx}=getCtx();const now=ctx.currentTime;[523,659,784,1047].forEach((f,i)=>playOsc(f,now+i*0.07,0.1,0.5,"square",3000));}catch{}}
  function sfxTimer(){try{const{ctx}=getCtx();playOsc(880,ctx.currentTime,0.05,0.3,"square");}catch{}}
  return{musicOn,toggleMusic,sfxCapture,sfxAutoGrab,sfxEndTurn,sfxVictory,sfxCombo,sfxTimer};
}

/* ════════════════════════════════════════════════════════
   INSTRUCTIONS
════════════════════════════════════════════════════════ */
const INSTRUCTIONS={
  general:{title:"HOW TO PLAY",icon:"🎮",sections:[
    {heading:"GOAL",body:"Capture more cells than your opponents. The player or team with the most cells wins when no one can be beaten, or when rounds run out."},
    {heading:"YOUR TURN",body:"Tap any neutral (muted) cell bordering your territory. The whole connected colour group joins you in one move. Hover to preview what you'd capture."},
    {heading:"YOUR COLOUR ANYWHERE",body:"Any neutral cell matching your team's colour is clickable from anywhere on the board — use this to establish outposts on the other side."},
    {heading:"AUTO-JOINS",body:"At the start of your turn, neutral cells of your own colour touching your territory are claimed automatically for free."},
    {heading:"ENCLOSURES",body:"Fully surround neutral cells with your territory or walls and they are claimed automatically — unless another player's colour is inside (they can still reach in)."},
    {heading:"RE-CLICK",body:"Tap a different group before hitting End Turn to replace your capture with a different choice."},
  ]},
  easy:{title:"EASY MODE",icon:"🟢",sections:[
    {heading:"BOARD",body:"Pixels come in blobs of 2–6 cells. No isolated singletons. Groups are large and easy to read."},
    {heading:"CASCADE",body:"Capturing a colour sweeps in ALL other patches of that colour touching any of your territory at once."},
    {heading:"LEGEND",body:"Tap a colour swatch in the legend row to highlight all cells of that colour and dim everything else — great for planning."},
    {heading:"SCORES",body:"Full live scores always visible."},
  ]},
  normal:{title:"NORMAL MODE",icon:"🟡",sections:[
    {heading:"BOARD",body:"Pixels in blobs of 2–6 cells. No singletons."},
    {heading:"NO CASCADE",body:"Only the exact connected group you click joins you. Disconnected patches of the same colour elsewhere are NOT swept in."},
    {heading:"HIDDEN SCORES",body:"Scores hidden during play. Use 👁 to peek at exact numbers."},
  ]},
  hard:{title:"HARD MODE",icon:"🔴",sections:[
    {heading:"BOARD",body:"Fully random pixel placement. Any group size including singletons."},
    {heading:"CASCADE",body:"Same as Easy — capturing sweeps in all same-colour patches touching your territory."},
    {heading:"FOG OF WAR",body:"You can only see cells within 4 steps of your territory. Everything else is hidden until you expand into it."},
    {heading:"HIDDEN SCORES",body:"Scores hidden. Use 👁 to peek."},
  ]},
  veryhard:{title:"VERY HARD MODE",icon:"🟣",sections:[
    {heading:"BOARD",body:"Fully random. Any group size."},
    {heading:"NO CASCADE",body:"Only the exact group you click joins you. No chaining whatsoever."},
    {heading:"FOG OF WAR",body:"Tighter fog — only 3 cells of visibility from your territory. Very limited information."},
    {heading:"HIDDEN SCORES",body:"Scores hidden."},
  ]},
  vscomputer:{title:"VS COMPUTER",icon:"🤖",sections:[
    {heading:"RECRUIT",body:"Picks random legal moves. Good for learning."},
    {heading:"VETERAN",body:"Always picks whichever cell captures the most cells that turn. Consistent but predictable."},
    {heading:"MASTER",body:"Scores its top 5 moves then simulates your best possible reply, picking what maximises its gain while minimising yours. Hard to beat."},
    {heading:"GRANDMASTER",body:"Looks two moves ahead — simulates your best reply to each of its top 10 moves, then simulates its own best counter-reply to your move, and picks the line that comes out best overall. Very hard to beat."},
    {heading:"START POSITION",body:"Veteran, Master and Grandmaster start inside their colour's biggest group on the board — giving them a strong opening automatically."},
  ]},
  teammode:{title:"TEAM MODE (2v2)",icon:"⚔️",sections:[
    {heading:"TEAMS",body:"Players 1 & 3 form Team Gold (▲). Players 2 & 4 form Team Violet (▼). Each plays their own turn individually."},
    {heading:"WINNING",body:"Your team wins when the two of you combined hold more territory than the opposing pair."},
    {heading:"STRATEGY",body:"Expand towards your teammate to create walls that trap opponents. Your teammate's territory counts for enclosures too."},
  ]},
};

function InstructionsModal({topic,onClose}){
  const data=INSTRUCTIONS[topic]||INSTRUCTIONS.general;
  const[sec,setSec]=useState(0);
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.88)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",
      fontFamily:"'Space Mono',monospace"}} onClick={onClose}>
      <div style={{background:"#0d0d1a",border:"1px solid #2a2a4a",borderRadius:16,
        width:"100%",maxWidth:340,maxHeight:"80vh",display:"flex",flexDirection:"column",
        boxShadow:"0 0 60px rgba(0,0,0,0.9)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",
          borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
          <span style={{fontSize:24}}>{data.icon}</span>
          <span style={{flex:1,fontSize:11,fontWeight:"bold",letterSpacing:3,color:"#eee"}}>{data.title}</span>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:"50%",cursor:"pointer",
            border:"1px solid #333",background:"transparent",color:"#aaa",fontSize:14,
            fontFamily:"'Space Mono',monospace",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {data.sections.length>1&&(
          <div style={{display:"flex",gap:4,padding:"10px 12px",overflowX:"auto",
            borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
            {data.sections.map((s,i)=>(
              <button key={i} onClick={()=>setSec(i)} style={{flexShrink:0,padding:"4px 10px",
                borderRadius:20,cursor:"pointer",fontFamily:"'Space Mono',monospace",fontSize:7,letterSpacing:1,
                border:`1px solid ${i===sec?"#A29BFE":"#2a2a4a"}`,transition:"all 0.15s",
                background:i===sec?"rgba(162,155,254,0.2)":"transparent",
                color:i===sec?"#A29BFE":"#666"}}>{s.heading}</button>
            ))}
          </div>
        )}
        <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
          <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,color:"#A29BFE",marginBottom:10}}>
            {data.sections[sec].heading}
          </div>
          <div style={{fontSize:11,color:"#ccc",lineHeight:1.9,letterSpacing:0.5}}>{data.sections[sec].body}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"10px 16px",borderTop:"1px solid #1a1a2e",flexShrink:0}}>
          <button onClick={()=>setSec(s=>Math.max(0,s-1))} disabled={sec===0} style={{
            padding:"6px 14px",borderRadius:8,cursor:sec===0?"default":"pointer",
            border:"1px solid #2a2a4a",background:"transparent",
            color:sec===0?"#2a2a4a":"#aaa",fontFamily:"'Space Mono',monospace",fontSize:10}}>← PREV</button>
          <span style={{color:"#444",fontSize:9}}>{sec+1} / {data.sections.length}</span>
          <button onClick={()=>setSec(s=>Math.min(data.sections.length-1,s+1))}
            disabled={sec===data.sections.length-1} style={{
            padding:"6px 14px",borderRadius:8,cursor:sec===data.sections.length-1?"default":"pointer",
            border:"1px solid #2a2a4a",background:"transparent",
            color:sec===data.sections.length-1?"#2a2a4a":"#aaa",fontFamily:"'Space Mono',monospace",fontSize:10}}>NEXT →</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   STATS SCREEN
════════════════════════════════════════════════════════ */
function StatsScreen({onClose,T}){
  const stats=loadStats();
  const winRate=stats.gamesPlayed>0?Math.round(stats.wins/stats.gamesPlayed*100):0;
  function resetStats(){if(window.confirm("Reset all stats?"))saveStats(DEFAULT_STATS);}
  const row=(label,value)=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
      padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
      <span style={{fontSize:9,color:T.textDim,letterSpacing:1}}>{label}</span>
      <span style={{fontSize:13,fontWeight:"bold",color:T.text}}>{value}</span>
    </div>
  );
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",
      fontFamily:T.font,color:T.text,boxSizing:"border-box"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",
        borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        <button onClick={onClose} style={{padding:"6px 12px",borderRadius:6,cursor:"pointer",
          border:`1px solid ${T.btnBorder}`,background:"transparent",color:T.btnText,
          fontFamily:T.font,fontSize:10}}>← BACK</button>
        <div style={{flex:1,fontSize:12,fontWeight:"bold",letterSpacing:3,color:T.text}}>YOUR STATS</div>
        <button onClick={resetStats} style={{padding:"6px 10px",borderRadius:6,cursor:"pointer",
          border:"1px solid #FF4757",background:"transparent",color:"#FF4757",
          fontFamily:T.font,fontSize:9}}>RESET</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px 16px",maxWidth:400,margin:"0 auto",width:"100%"}}>
        <div style={{fontSize:9,letterSpacing:3,color:T.textDim,marginBottom:12}}>OVERALL</div>
        {row("Games Played",stats.gamesPlayed)}
        {row("Wins",stats.wins)}
        {row("Losses",stats.losses)}
        {row("Win Rate",`${winRate}%`)}
        {row("Total Cells Captured",stats.totalCaptures?.toLocaleString()||0)}
        {row("Biggest Single Capture",stats.biggestSingleCapture||0)}
        {row("Total Enclosures",stats.encloseCount||0)}

        <div style={{fontSize:9,letterSpacing:3,color:T.textDim,marginTop:20,marginBottom:12}}>VS COMPUTER</div>
        {["recruit","veteran","master"].map(lvl=>{
          const d=stats.vsComputer?.[lvl]||{wins:0,losses:0};
          const total=d.wins+d.losses;
          return row(`${AI_LEVELS[lvl].label}`,total?`${d.wins}W ${d.losses}L (${Math.round(d.wins/total*100)}%)`:"-");
        })}

        <div style={{fontSize:9,letterSpacing:3,color:T.textDim,marginTop:20,marginBottom:12}}>DAILY CHALLENGE</div>
        {row("Current Streak",`${stats.daily?.streak||0} 🔥`)}
        {row("Total Completions",stats.daily?.completions||0)}
        {row("Best Score",stats.daily?.bestScore||0)}

        <div style={{marginTop:24,fontSize:9,color:T.textFaint,textAlign:"center",lineHeight:1.8}}>
          Stats are stored on this device.<br/>
          Cross-device sync requires an account (coming soon).
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   EDITOR SCREEN
════════════════════════════════════════════════════════ */
function EditorScreen({config,onSave,onClose,T}){
  const[draft,setDraft]=useState(JSON.parse(JSON.stringify(config)));
  const[tab,setTab]=useState("general");
  const[saved,setSaved]=useState(false);
  function update(path,value){setDraft(prev=>{const next=JSON.parse(JSON.stringify(prev));const keys=path.split(".");let obj=next;for(let i=0;i<keys.length-1;i++) obj=obj[keys[i]];obj[keys[keys.length-1]]=value;return next;});setSaved(false);}
  function updateArr(ap,idx,field,value){setDraft(prev=>{const next=JSON.parse(JSON.stringify(prev));const keys=ap.split(".");let obj=next;for(const k of keys) obj=obj[k];obj[idx][field]=value;return next;});setSaved(false);}
  function handleSave(){saveConfig(draft);onSave(draft);setSaved(true);setTimeout(()=>setSaved(false),2000);}
  function handleReset(){if(window.confirm("Reset all settings to defaults?")){saveConfig(DEFAULT_CONFIG);onSave(DEFAULT_CONFIG);setDraft(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));}}
  const inp={background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,
    fontFamily:T.font,fontSize:11,padding:"6px 8px",width:"100%",outline:"none"};
  const lbl={fontSize:8,letterSpacing:2,color:T.textDim,marginBottom:4,display:"block"};
  const TABS=[{key:"general",label:"General"},{key:"teams",label:"Teams"},{key:"boardcols",label:"Colours"},
    {key:"difficulty",label:"Difficulty"},{key:"text",label:"Text"},{key:"theme",label:"Theme"}];
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",
      fontFamily:T.font,color:T.text,boxSizing:"border-box"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",
        borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        <button onClick={onClose} style={{padding:"6px 12px",borderRadius:6,cursor:"pointer",
          border:`1px solid ${T.btnBorder}`,background:"transparent",color:T.btnText,fontFamily:T.font,fontSize:10}}>← BACK</button>
        <div style={{flex:1,fontSize:12,fontWeight:"bold",letterSpacing:3,color:T.text}}>EDIT CONTENT</div>
        <button onClick={handleReset} style={{padding:"6px 10px",borderRadius:6,cursor:"pointer",
          border:"1px solid #FF4757",background:"transparent",color:"#FF4757",fontFamily:T.font,fontSize:9}}>RESET</button>
        <button onClick={handleSave} style={{padding:"6px 14px",borderRadius:6,cursor:"pointer",border:"none",
          background:saved?"#2ED573":"#5352ED",color:"white",fontFamily:T.font,fontSize:10,fontWeight:"bold",transition:"background 0.3s"}}>
          {saved?"SAVED ✓":"SAVE"}
        </button>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,padding:"8px 4px",cursor:"pointer",
            border:"none",background:tab===t.key?T.cardBg:"transparent",
            color:tab===t.key?T.accentColor:T.textDim,fontFamily:T.font,fontSize:7,letterSpacing:1,
            borderBottom:tab===t.key?`2px solid ${T.accentColor}`:"2px solid transparent"}}>{t.label}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
        {tab==="general"&&<div>
          {[["GAME NAME","gameName"],["TAGLINE","tagline"]].map(([l,k])=>(
            <div key={k} style={{marginBottom:16}}><label style={lbl}>{l}</label><input style={inp} value={draft[k]} onChange={e=>update(k,e.target.value)}/></div>
          ))}
          <div style={{marginBottom:16}}><label style={lbl}>MAX ROUNDS (0 = unlimited)</label>
            <input style={{...inp,width:80}} type="number" min={0} max={100} value={draft.maxRounds} onChange={e=>update("maxRounds",parseInt(e.target.value)||0)}/>
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>MULTIPLAYER WIN TEXT</label>
            <input style={inp} value={draft.multiWinText} onChange={e=>update("multiWinText",e.target.value)}/>
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>VICTORY ASSURED TEXT</label>
            <input style={inp} value={draft.victoryAssuredText} onChange={e=>update("victoryAssuredText",e.target.value)}/>
          </div>
          <div><label style={lbl}>GRID SIZE LABELS</label>
            {Object.entries(draft.gridSizes).map(([k,gs])=>(
              <div key={k} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <span style={{fontSize:8,color:T.textDim,width:60}}>{k.toUpperCase()}</span>
                <input style={{...inp}} value={gs.label} onChange={e=>{const d=JSON.parse(JSON.stringify(draft));d.gridSizes[k].label=e.target.value;setDraft(d);setSaved(false);}}/>
                <input style={{...inp}} value={gs.sub} onChange={e=>{const d=JSON.parse(JSON.stringify(draft));d.gridSizes[k].sub=e.target.value;setDraft(d);setSaved(false);}}/>
              </div>
            ))}
          </div>
        </div>}
        {tab==="teams"&&<div>
          <div style={{fontSize:9,color:T.textDim,marginBottom:12,lineHeight:1.8}}>Team names shown in-game. Hex values are fixed.</div>
          {draft.teams.map((t,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:8,background:t.hex,boxShadow:`0 0 8px ${t.hex}`,flexShrink:0}}/>
              <div style={{flex:1}}><label style={lbl}>TEAM {i+1}</label>
                <input style={inp} value={t.name} onChange={e=>updateArr("teams",i,"name",e.target.value)}/>
              </div>
            </div>
          ))}
        </div>}
        {tab==="boardcols"&&<div>
          <div style={{fontSize:9,color:T.textDim,marginBottom:12,lineHeight:1.8}}>Names shown on hover. Hex changes the board colour.</div>
          {draft.boardColours.map((bc,i)=>(
            <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
              <div style={{width:28,height:28,borderRadius:6,background:bc.hex,flexShrink:0}}/>
              <input value={bc.hex} onChange={e=>updateArr("boardColours",i,"hex",e.target.value)} style={{...inp,width:90,fontFamily:"monospace"}}/>
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
                <div key={f} style={{marginBottom:8}}><label style={lbl}>{l}</label>
                  <input style={inp} value={d[f]} onChange={e=>{const dd=JSON.parse(JSON.stringify(draft));dd.difficulties[k][f]=e.target.value;setDraft(dd);setSaved(false);}}/>
                </div>
              ))}
            </div>
          ))}
        </div>}
        {tab==="text"&&<div>
          <div style={{fontSize:9,color:T.textDim,marginBottom:12}}>Use {"{pct}"} for the percentage.</div>
          {Object.entries(draft.victoryText).map(([k,vt])=>(
            <div key={k} style={{marginBottom:14,padding:10,borderRadius:8,background:T.cardBg,border:`1px solid ${T.border}`}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:18}}>{vt.icon}</span>
                <span style={{fontSize:8,color:T.textDim,letterSpacing:2,flex:1}}>{k.toUpperCase()}</span>
                <input value={vt.icon} onChange={e=>{const dd=JSON.parse(JSON.stringify(draft));dd.victoryText[k].icon=e.target.value;setDraft(dd);setSaved(false);}}
                  style={{...inp,width:50,textAlign:"center",fontSize:16,padding:"2px 4px"}}/>
              </div>
              {[["TITLE","title"],["SUBTITLE","sub"]].map(([l,f])=>(
                <div key={f} style={{marginBottom:6}}><label style={lbl}>{l}</label>
                  <input style={inp} value={vt[f]} onChange={e=>{const dd=JSON.parse(JSON.stringify(draft));dd.victoryText[k][f]=e.target.value;setDraft(dd);setSaved(false);}}/>
                </div>
              ))}
            </div>
          ))}
        </div>}
        {tab==="theme"&&<div>
          <div style={{fontSize:9,color:T.textDim,marginBottom:16,lineHeight:1.8}}>Choose a visual theme for the game.</div>
          {Object.entries(THEMES).map(([key,th])=>(
            <button key={key} onClick={()=>{const d=JSON.parse(JSON.stringify(draft));d.theme=key;setDraft(d);setSaved(false);}}
              style={{width:"100%",padding:"16px",borderRadius:10,cursor:"pointer",marginBottom:10,textAlign:"left",
                border:`2px solid ${draft.theme===key?th.accentColor:T.border}`,
                background:draft.theme===key?hexToRgba(th.accentColor,0.15):T.cardBg,
                fontFamily:T.font,transition:"all 0.2s"}}>
              <div style={{fontSize:13,fontWeight:"bold",color:draft.theme===key?th.accentColor:T.text,marginBottom:4,letterSpacing:2}}>
                {draft.theme===key?"✓ ":""}{th.name.toUpperCase()}
              </div>
              <div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
                {(th.boardColours||[]).slice(0,8).map((bc,i)=>(
                  <div key={i} style={{width:14,height:14,borderRadius:2,background:bc.hex,
                    border:"1px solid rgba(0,0,0,0.2)",flexShrink:0}}/>
                ))}
              </div>
              <div style={{display:"flex",gap:4,marginTop:4}}>
                {[th.bg,th.cardBg,th.border,th.accentColor].map((c,i)=>(
                  <div key={i} style={{width:14,height:14,borderRadius:2,background:c,border:"1px solid rgba(128,128,128,0.3)"}}/>
                ))}
              </div>
            </button>
          ))}
        </div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
export default function PixelGo(){
  const[config,setConfig]              =useState(loadConfig);
  const[phase,setPhase]                =useState("numSelect");
  const[editing,setEditing]            =useState(false);
  const[showStats,setShowStats]        =useState(false);
  const[showWelcome,setShowWelcome]    =useState(false);
  const[numPlayers,setNumPlayers]      =useState(2);
  const[vsComputer,setVsComputer]      =useState(false);
  const[teamMode,setTeamMode]          =useState(false);
  const[aiLevel,setAiLevel]            =useState(null);
  const[difficulty,setDifficulty]      =useState(null);
  const[gridSize,setGridSize]          =useState(null);
  const[playerDefs,setPlayerDefs]      =useState([]);
  const[setupIdx,setSetupIdx]          =useState(0);
  const[pendingColor,setPendingColor]  =useState(null);
  const[sharedBoard,setSharedBoard]    =useState(null);
  const[isDailyChallenge,setIsDaily]   =useState(false);

  const[timedTurnSecs,setTimedTurnSecs]=useState(0);
  const[autoPass,setAutoPass]          =useState(true);
  const[funMode,setFunMode]            =useState(false);

  const[board,setBoard]                =useState(null);
  const[ownership,setOwnership]        =useState(null);
  const[prevOwnership,setPrevOwnership]=useState(null);
  const[cp,setCp]                      =useState(0);
  const[round,setRound]                =useState(1);
  const[turnNum,setTurnNum]            =useState(1);
  const[captureCount,setCaptureCount]  =useState(0);
  const[hovered,setHovered]            =useState(null);
  const[flash,setFlash]                =useState(null);
  const[rippleOrigin,setRippleOrigin]  =useState(null);
  const[enclosedFlash,setEnclosedFlash]=useState(null);
  const[autoFlash,setAutoFlash]        =useState(null);
  const[legendFocus,setLegendFocus]    =useState(null);
  const[victoryAssured,setVictoryAssured]=useState(null);
  const[showScores,setShowScores]      =useState(false);
  const[confirmEnd,setConfirmEnd]      =useState(false);
  const[finalOwnership,setFinalOwnership]=useState(null);
  const[reviewing,setReviewing]        =useState(false);
  const[aiThinking,setAiThinking]      =useState(false);
  const[showInstructions,setShowInstructions]=useState(false);
  const[timeLeft,setTimeLeft]          =useState(null);
  const[comboCount,setComboCount]      =useState(0);
  const[comboStreak,setComboStreak]    =useState(0);
  const[showCombo,setShowCombo]        =useState(false);
  const[autoPassActive,setAutoPassActive]=useState(false);

  const music=useMusicSystem();


  const ownershipRef=useRef(null),prevOwnershipRef=useRef(null);
  const captureCountRef=useRef(0),cpRef=useRef(0),roundRef=useRef(1);
  const boardRef=useRef(null),phaseRef=useRef("numSelect");
  const playerDefsRef=useRef([]),numPlayersRef=useRef(2);
  const diffRef=useRef(null),victoryAssuredRef=useRef(null);
  const timerRef=useRef(null);

  const T=THEMES[config.theme||"neon"];

  const PALETTE=T.boardColours||config.boardColours;

  const ACTIVE_TEAMS=T.teams||config.teams;
  const diff=difficulty?config.difficulties[difficulty]:null;
  const BS=gridSize?config.gridSizes[gridSize].bs:22;
  const MAX_ROUNDS=config.maxRounds;
  const UNLIMITED=MAX_ROUNDS===0;
  const FOG_RANGE=difficulty==="veryhard"?3:4;
  const USE_FOG=difficulty==="hard"||difficulty==="veryhard";


  useEffect(()=>{ownershipRef.current=ownership;},[ownership]);
  useEffect(()=>{prevOwnershipRef.current=prevOwnership;},[prevOwnership]);
  useEffect(()=>{captureCountRef.current=captureCount;},[captureCount]);
  useEffect(()=>{cpRef.current=cp;},[cp]);
  useEffect(()=>{roundRef.current=round;},[round]);
  useEffect(()=>{boardRef.current=board;},[board]);
  useEffect(()=>{phaseRef.current=phase;},[phase]);
  useEffect(()=>{playerDefsRef.current=playerDefs;},[playerDefs]);
  useEffect(()=>{numPlayersRef.current=numPlayers;},[numPlayers]);
  useEffect(()=>{diffRef.current=diff;},[diff]);
  useEffect(()=>{victoryAssuredRef.current=victoryAssured;},[victoryAssured]);

  const takenColors=playerDefs.map(p=>p.hex);
  const takenCells=new Set(playerDefs.map(p=>p.row*BS+p.col));

  const scores=useMemo(()=>{
    if(!ownership) return Array(4).fill(0);
    const c=Array(4).fill(0);
    for(let r=0;r<BS;r++) for(let col=0;col<BS;col++){const v=ownership[r][col];if(v>=0) c[v]++;}
    return c;
  },[ownership,BS]);
  const teamScores=useMemo(()=>teamMode?[scores[0]+(scores[2]||0),scores[1]+(scores[3]||0)]:[0,0],[scores,teamMode]);

  const TOTAL=BS*BS;
  const claimed=scores.slice(0,numPlayers).reduce((a,b)=>a+b,0);


  const visibleCells=useMemo(()=>{
    if(!USE_FOG||!ownership||phase!=="playing") return null;

    const humanIdx=playerDefs.findIndex(d=>!d.isAI);
    if(humanIdx<0) return null;
    return computeFogVisibility(ownership,humanIdx,BS,FOG_RANGE);
  },[ownership,phase,BS,USE_FOG,FOG_RANGE,playerDefs]);

  const clickableCells=useMemo(()=>{
    if(phase!=="playing"||!board||!playerDefs.length) return new Set();
    const isHumanTurn=!playerDefs[cp]?.isAI;
    const base=(isHumanTurn&&captureCount>0&&prevOwnership)?prevOwnership:ownership;
    if(!base) return new Set();
    return getClickableCellsForPlayer(board,base,cp,playerDefs,PALETTE,BS);
  },[phase,ownership,prevOwnership,captureCount,cp,board,playerDefs,BS,PALETTE]);

  const previewCells=useMemo(()=>{
    if(!hovered||!board||!ownership||phase!=="playing"||!diff) return new Set();
    const[r,c]=hovered;
    if(!clickableCells.has(r*BS+c)) return new Set();
    const isHumanTurn=!playerDefs[cp]?.isAI;
    const base=(isHumanTurn&&captureCount>0&&prevOwnership)?prevOwnership:ownership;
    return previewCapture(board,base,cp,r,c,diff.cascade,BS);
  },[hovered,board,ownership,prevOwnership,captureCount,clickableCells,cp,phase,diff,BS,playerDefs]);

  const topPlayer=useMemo(()=>{
    if(teamMode){return teamScores[0]>=teamScores[1]?0:1;}
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


  useEffect(()=>{
    if(phase!=="playing"||!timedTurnSecs||playerDefs[cp]?.isAI) return;
    setTimeLeft(timedTurnSecs);
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){clearInterval(timerRef.current);music.sfxEndTurn();doEndTurn();return null;}
        if(t<=6) music.sfxTimer();
        return t-1;
      });
    },1000);
    return()=>{clearInterval(timerRef.current);setTimeLeft(null);};
  },[cp,phase,timedTurnSecs]);


  useEffect(()=>{
    if(phase!=="playing"||!autoPass||playerDefs[cp]?.isAI) return;
    if(clickableCells.size===0&&captureCount===0){
      setAutoPassActive(true);
      const t=setTimeout(()=>{setAutoPassActive(false);doEndTurn();},1800);
      return()=>{clearTimeout(t);setAutoPassActive(false);};
    }
  },[clickableCells.size,cp,phase,autoPass,captureCount]);


  useEffect(()=>{
    if(phase!=="playing") return;
    const cur=playerDefs[cp];
    if(!cur?.isAI) return;
    setAiThinking(true);
    const timer=setTimeout(()=>{
      setAiThinking(false);
      const curO=ownershipRef.current,curB=boardRef.current;
      const curCp=cpRef.current,curDefs=playerDefsRef.current;
      const curNP=numPlayersRef.current,curDiff=diffRef.current;
      if(!curO||!curB||!curDiff) return;
      const move=getAIMove(curB,curO,curCp,curDefs,PALETTE,BS,curDiff.cascade,cur.aiLevel,curNP);
      doAITurn(move,curB,curO,curCp,curDefs,curNP,curDiff);
    },900+Math.random()*400);
    return()=>clearTimeout(timer);
  },[cp,phase]);

  function doAITurn(move,curBoard,curOwnership,curCp,curDefs,curNumPlayers,curDiff){
    let afterOwnership=curOwnership;
    if(move){
      const[r,c]=move;
      const doCapture=curDiff.cascade==="full"?cascadeCapture:captureGroup;
      const{newOwnership:after,captured}=doCapture(curBoard,curOwnership,curCp,r,c,BS);
      const{newOwnership:afterEnc,enclosed}=applyEnclosures(curBoard,after,curDefs,curNumPlayers,PALETTE,BS);
      afterOwnership=afterEnc;
      setOwnership(afterEnc);
      setFlash(captured);setRippleOrigin({r,c});music.sfxCapture();
      if(enclosed.size>0){setEnclosedFlash(enclosed);setTimeout(()=>setEnclosedFlash(null),1000);}
      setTimeout(()=>{setFlash(null);setRippleOrigin(null);},700);
      const ts=Array(4).fill(0);
      afterEnc.forEach(row=>row.forEach(v=>{if(v>=0) ts[v]++;}));
      const TOTAL_C=BS*BS;
      for(let i=0;i<curNumPlayers;i++){
        if(ts[i]>TOTAL_C/2&&!victoryAssuredRef.current){
          setVictoryAssured({playerIdx:i,name:curDefs[i].name,hex:curDefs[i].hex});break;
        }
      }
      if(afterEnc.flat().every(v=>v>=0)){setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");return;}
      if(UNLIMITED){const mw=checkMathematicalVictory(afterEnc,curNumPlayers,teamMode,BS);if(mw>=0){setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");return;}}
    }
    setTimeout(()=>{
      music.sfxEndTurn();
      const curRound=roundRef.current,next=(curCp+1)%curNumPlayers;
      let newRound=curRound;
      if(next===0){newRound++;if(!UNLIMITED&&newRound>MAX_ROUNDS){setFinalOwnership(afterOwnership);music.sfxVictory();setPhase("gameover");return;}setRound(newRound);}
      const{newOwnership:o2,autoClaimed}=autoClaimAdjacent(curBoard,afterOwnership,next,curDefs,PALETTE,BS);
      if(autoClaimed.size>0){setOwnership(o2);setAutoFlash(autoClaimed);music.sfxAutoGrab();setTimeout(()=>setAutoFlash(null),800);
        if(o2.flat().every(v=>v>=0)){setFinalOwnership(o2);music.sfxVictory();setPhase("gameover");return;}}
      setCaptureCount(0);setPrevOwnership(null);setHovered(null);setLegendFocus(null);
      setConfirmEnd(false);setAiThinking(false);setTimeLeft(null);
      setComboCount(0);setTurnNum(n=>n+1);setCp(next);
    },500);
  }


  function executeCapture(r,c){
    clearInterval(timerRef.current);setTimeLeft(null);
    const base=(captureCount>0&&prevOwnership)?prevOwnership:ownership;
    if(captureCount===0) setPrevOwnership(ownership.map(row=>[...row]));
    const doCapture=diff.cascade==="full"?cascadeCapture:captureGroup;
    const{newOwnership:after,captured}=doCapture(board,base,cp,r,c,BS);
    const{newOwnership:afterEnc,enclosed}=applyEnclosures(board,after,playerDefs,numPlayers,PALETTE,BS);
    setOwnership(afterEnc);setCaptureCount(1);
    setFlash(captured);setRippleOrigin({r,c});music.sfxCapture();
    const newCombo=enclosed.size>0?comboCount+1:0;
    setComboCount(newCombo);
    if(enclosed.size>0){
      setEnclosedFlash(enclosed);
      setTimeout(()=>setEnclosedFlash(null),1000);
      if(funMode&&newCombo>=2){
        const newStreak=comboStreak+1;setComboStreak(newStreak);
        setShowCombo(true);setTimeout(()=>setShowCombo(false),1800);
        music.sfxCombo();
      }
    }
    setTimeout(()=>{setFlash(null);setRippleOrigin(null);},700);
    if(!victoryAssured){
      const ts=Array(4).fill(0);
      afterEnc.forEach(row=>row.forEach(v=>{if(v>=0) ts[v]++;}));
      for(let i=0;i<numPlayers;i++) if(ts[i]>TOTAL/2){setVictoryAssured({playerIdx:i,name:playerDefs[i].name,hex:playerDefs[i].hex});break;}
    }
    if(afterEnc.flat().every(v=>v>=0)){
      updateStatsOnGameEnd(afterEnc,captured.size);
      setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");
    }
    if(UNLIMITED){const mw=checkMathematicalVictory(afterEnc,numPlayers,teamMode,BS);if(mw>=0){updateStatsOnGameEnd(afterEnc,captured.size);setFinalOwnership(afterEnc);music.sfxVictory();setPhase("gameover");}}
  }

  function doEndTurn(){
    if(phase!=="playing") return;
    clearInterval(timerRef.current);setTimeLeft(null);
    music.sfxEndTurn();setConfirmEnd(false);

    if(funMode){if(comboCount===0) setComboStreak(0);}
    setComboCount(0);
    const next=(cp+1)%numPlayers;let newRound=round;
    if(next===0){newRound++;if(!UNLIMITED&&newRound>MAX_ROUNDS){updateStatsOnGameEnd(ownership,0);setFinalOwnership(ownership);music.sfxVictory();setPhase("gameover");return;}setRound(newRound);}
    const{newOwnership:o2,autoClaimed}=autoClaimAdjacent(board,ownership,next,playerDefs,PALETTE,BS);
    if(autoClaimed.size>0){setOwnership(o2);setAutoFlash(autoClaimed);music.sfxAutoGrab();setTimeout(()=>setAutoFlash(null),800);
      if(o2.flat().every(v=>v>=0)){updateStatsOnGameEnd(o2,0);setFinalOwnership(o2);music.sfxVictory();setPhase("gameover");return;}}
    setCp(next);setTurnNum(n=>n+1);setCaptureCount(0);setPrevOwnership(null);setHovered(null);setLegendFocus(null);
  }

  function updateStatsOnGameEnd(finalO,lastCapSize){
    try{
      const st=loadStats();
      const fs=Array(numPlayers).fill(0);
      for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){const v=finalO[r][c];if(v>=0) fs[v]++;}
      const humanIdx=playerDefs.findIndex(d=>!d.isAI);
      const isWin=humanIdx>=0&&fs[humanIdx]===Math.max(...fs.slice(0,numPlayers));
      st.gamesPlayed++;
      if(isWin) st.wins++;else st.losses++;
      st.totalCaptures=(st.totalCaptures||0)+fs[humanIdx>=0?humanIdx:0];
      st.biggestSingleCapture=Math.max(st.biggestSingleCapture||0,lastCapSize);
      st.encloseCount=(st.encloseCount||0)+comboCount;
      if(vsComputer&&aiLevel&&humanIdx>=0){
        if(!st.vsComputer) st.vsComputer={recruit:{wins:0,losses:0},veteran:{wins:0,losses:0},master:{wins:0,losses:0}};
        if(isWin) st.vsComputer[aiLevel].wins++;else st.vsComputer[aiLevel].losses++;
      }
      if(isDailyChallenge){
        const today=getTodayStr();
        if(!st.daily) st.daily={streak:0,lastDate:null,bestScore:0,completions:0};
        st.daily.completions++;
        st.daily.bestScore=Math.max(st.daily.bestScore,fs[humanIdx>=0?humanIdx:0]);
        if(st.daily.lastDate===getTodayStr()){/* already counted */}
        else{
          const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
          const yStr=`${yesterday.getFullYear()}${String(yesterday.getMonth()+1).padStart(2,"0")}${String(yesterday.getDate()).padStart(2,"0")}`;
          st.daily.streak=(st.daily.lastDate===yStr)?(st.daily.streak||0)+1:1;
          st.daily.lastDate=today;
        }
      }
      saveStats(st);
    }catch{}
  }

  const triggerEndGame=useCallback(()=>{
    if(!confirmEnd){setConfirmEnd(true);return;}
    updateStatsOnGameEnd(ownership,0);setFinalOwnership(ownership);music.sfxVictory();setPhase("gameover");
  },[confirmEnd,ownership]);

  /* ── Setup ── */
  const goToDifficulty=useCallback((n,vc=false,tm=false)=>{
    setNumPlayers(vc?2:n);setVsComputer(vc);setTeamMode(tm);
    if(vc) setPhase("aiLevel");else setPhase("difficulty");
  },[]);
  const goToGridSize=useCallback((d)=>{setDifficulty(d);setPhase("gridSize");},[]);
  const goToOptions=useCallback((gs)=>{setGridSize(gs);setPhase("options");},[]);
  const goToColorPick=useCallback(()=>{
    const bs=config.gridSizes[gridSize].bs,d=difficulty;
    setPlayerDefs([]);setSetupIdx(0);setPendingColor(null);
    const rand=isDailyChallenge?seededRand(dateSeed()):undefined;
    setSharedBoard(config.difficulties[d].board==="grouped"?mkBoardGrouped(bs,rand):mkBoardRandom(bs,rand));
    setPhase("playerSetup");
  },[difficulty,gridSize,config,isDailyChallenge]);


  const restartGame=useCallback(()=>{
    const bs=config.gridSizes[gridSize].bs,d=difficulty;

    setBoard(null);setOwnership(null);setPrevOwnership(null);
    setCp(0);setRound(1);setTurnNum(1);setCaptureCount(0);
    setHovered(null);setFlash(null);setRippleOrigin(null);
    setEnclosedFlash(null);setAutoFlash(null);setLegendFocus(null);
    setVictoryAssured(null);setShowScores(false);setConfirmEnd(false);
    setFinalOwnership(null);setReviewing(false);setAiThinking(false);
    setComboCount(0);setComboStreak(0);setShowCombo(false);setAutoPassActive(false);
    setTimeLeft(null);

    setPlayerDefs([]);setSetupIdx(0);setPendingColor(null);
    const rand=isDailyChallenge?seededRand(dateSeed()):undefined;
    setSharedBoard(config.difficulties[d].board==="grouped"?mkBoardGrouped(bs,rand):mkBoardRandom(bs,rand));
    setPhase("playerSetup");
  },[difficulty,gridSize,config,isDailyChallenge]);

  const startDailyChallenge=useCallback(()=>{
    const todayStats=loadStats();
    if(todayStats.daily?.lastDate===getTodayStr()){
      alert("You've already completed today's challenge! Come back tomorrow.");
      return;
    }
    setIsDaily(true);setVsComputer(true);setAiLevel("master");setTeamMode(false);
    setNumPlayers(2);setDifficulty("normal");setGridSize("medium");
    setTimedTurnSecs(0);setAutoPass(true);setFunMode(false);
    const bs=17,rand=seededRand(dateSeed());
    setPlayerDefs([]);setSetupIdx(0);setPendingColor(null);
    setSharedBoard(mkBoardGrouped(bs,rand));
    setPhase("playerSetup");
  },[]);

  const pickColor=useCallback((colorObj)=>{
    if(takenColors.includes(colorObj.hex)) return;
    setPendingColor(colorObj);
  },[takenColors]);

  const pickPosition=useCallback((r,c)=>{
    if(!pendingColor||takenCells.has(r*BS+c)) return;
    let newDefs=[...playerDefs,{...pendingColor,row:r,col:c,isAI:false}];
    if(vsComputer&&newDefs.length===1){
      const usedHexes=newDefs.map(d=>d.hex);
      const available=ACTIVE_TEAMS.filter(t=>!usedHexes.includes(t.hex));
      const aiTeam=available[Math.floor(Math.random()*available.length)]||ACTIVE_TEAMS[1];
      let bestPos=[0,BS-1];
      if(aiLevel==="recruit"){
        const corners=[[0,0],[0,BS-1],[BS-1,0],[BS-1,BS-1]];
        let bestDist=-1;
        for(const[cr,cc]of corners){if(cr===r&&cc===c) continue;const d=Math.abs(cr-r)+Math.abs(cc-c);if(d>bestDist){bestDist=d;bestPos=[cr,cc];}}
      } else {
        const aiColorIdx=PALETTE.findIndex(bc=>bc.hex===aiTeam.hex);
        const visited=Array.from({length:BS},()=>Array(BS).fill(false));
        let biggestGroup=[],biggestSize=0;
        for(let gr=0;gr<BS;gr++) for(let gc=0;gc<BS;gc++){
          if(visited[gr][gc]||sharedBoard[gr][gc]!==aiColorIdx) continue;
          const group=[],q=[[gr,gc]];visited[gr][gc]=true;
          while(q.length){
            const[qr,qc]=q.shift();group.push([qr,qc]);
            for(const[nr,nc]of[[qr-1,qc],[qr+1,qc],[qr,qc-1],[qr,qc+1]]){
              if(nr>=0&&nr<BS&&nc>=0&&nc<BS&&!visited[nr][nc]&&sharedBoard[nr][nc]===aiColorIdx){visited[nr][nc]=true;q.push([nr,nc]);}
            }
          }
          if(group.length>biggestSize){biggestSize=group.length;biggestGroup=group;}
        }
        if(biggestGroup.length>0){
          let bestDist=-1;
          for(const[gr,gc]of biggestGroup){if(gr===r&&gc===c) continue;const d=Math.abs(gr-r)+Math.abs(gc-c);if(d>bestDist){bestDist=d;bestPos=[gr,gc];}}
        } else {
          const corners=[[0,0],[0,BS-1],[BS-1,0],[BS-1,BS-1]];let bestDist=-1;
          for(const[cr,cc]of corners){if(cr===r&&cc===c) continue;const d=Math.abs(cr-r)+Math.abs(cc-c);if(d>bestDist){bestDist=d;bestPos=[cr,cc];}}
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
      setCp(0);setRound(1);setTurnNum(1);setCaptureCount(0);setHovered(null);
      setFlash(null);setRippleOrigin(null);setEnclosedFlash(null);setAutoFlash(null);
      setLegendFocus(null);setConfirmEnd(false);setFinalOwnership(null);
      setReviewing(false);setVictoryAssured(null);setShowScores(false);
      setComboCount(0);setComboStreak(0);setShowCombo(false);setAutoPassActive(false);
      setNumPlayers(realNum);setPhase("playing");
    } else setSetupIdx(newDefs.length);
  },[pendingColor,playerDefs,numPlayers,vsComputer,sharedBoard,takenCells,BS,PALETTE,config.teams,aiLevel]);

  const handleBoardClick=useCallback((r,c)=>{
    if(phase==="playerSetup"){pickPosition(r,c);return;}
    if(phase!=="playing"||aiThinking) return;
    if(playerDefs[cp]?.isAI) return;
    if(!clickableCells.has(r*BS+c)) return;
    setConfirmEnd(false);setAutoPassActive(false);
    executeCapture(r,c);
  },[phase,clickableCells,aiThinking,playerDefs,cp,BS]);

  const endTurn=useCallback(()=>{
    if(phase!=="playing"||playerDefs[cp]?.isAI) return;
    doEndTurn();
  },[phase,cp,playerDefs,round,ownership]);

  const resetToMenu=()=>{
    clearInterval(timerRef.current);
    setPhase("numSelect");setPlayerDefs([]);setSetupIdx(0);
    setPendingColor(null);setSharedBoard(null);setBoard(null);setOwnership(null);
    setPrevOwnership(null);setDifficulty(null);setGridSize(null);setCaptureCount(0);
    setLegendFocus(null);setFlash(null);setRippleOrigin(null);setEnclosedFlash(null);setAutoFlash(null);
    setConfirmEnd(false);setFinalOwnership(null);setReviewing(false);
    setTurnNum(1);setVictoryAssured(null);setShowScores(false);
    setVsComputer(false);setAiLevel(null);setAiThinking(false);setTeamMode(false);
    setIsDaily(false);setTimeLeft(null);setComboCount(0);setComboStreak(0);
    setShowCombo(false);setAutoPassActive(false);
  };

  if(editing) return<EditorScreen config={config} onSave={cfg=>{setConfig(cfg);}} onClose={()=>setEditing(false)} T={T}/>;
  if(showStats) return<StatsScreen onClose={()=>setShowStats(false)} T={T}/>;

  /* ════ NUM SELECT ════ */
  if(phase==="numSelect") return(
    <Shell T={T}>
      <Logo name={config.gameName} T={T}/>
      <Dim T={T}>{config.tagline}</Dim>
      <SLabel T={T}>HOW MANY PLAYERS?</SLabel>
      <div style={{display:"flex",gap:10,marginBottom:8,flexWrap:"wrap",justifyContent:"center"}}>
        {[1,2,4].map(n=><NumBtn key={n} onClick={()=>goToDifficulty(n)} T={T}>{n}</NumBtn>)}
      </div>
      <button onClick={()=>goToDifficulty(4,false,true)} style={{
        width:"100%",padding:"10px",borderRadius:10,cursor:"pointer",marginBottom:8,
        border:`2px solid #FFD32A`,background:"rgba(255,211,42,0.08)",
        color:"#FFD32A",fontFamily:T.font,fontSize:10,fontWeight:"bold",letterSpacing:2,transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,211,42,0.18)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,211,42,0.08)";}}>
        ⚔️ 2 VS 2 (TEAM MODE)
      </button>
      <button onClick={()=>goToDifficulty(2,true)} style={{
        width:"100%",padding:"10px",borderRadius:10,cursor:"pointer",marginBottom:16,
        border:`2px solid ${T.accentColor}`,background:hexToRgba(T.accentColor,0.08),
        color:T.accentColor,fontFamily:T.font,fontSize:10,fontWeight:"bold",letterSpacing:2,transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(T.accentColor,0.18);}}
        onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(T.accentColor,0.08);}}>
        🤖 VS COMPUTER
      </button>
      {/* Daily challenge */}
      <button onClick={startDailyChallenge} style={{
        width:"100%",padding:"10px",borderRadius:10,cursor:"pointer",marginBottom:16,
        border:"2px solid #FF9F43",background:"rgba(255,159,67,0.08)",
        color:"#FF9F43",fontFamily:T.font,fontSize:10,fontWeight:"bold",letterSpacing:2,transition:"all 0.2s"}}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,159,67,0.18)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,159,67,0.08)";}}>
        ☀️ DAILY CHALLENGE
        <div style={{fontSize:8,opacity:0.7,fontWeight:"normal",marginTop:2,letterSpacing:1}}>
          vs Master · New board every day · {getTodayStr()}
        </div>
      </button>
      <div style={{color:T.textDim,fontSize:9,letterSpacing:1,textAlign:"center",lineHeight:2.2,marginBottom:16}}>
        YOUR COLOUR AUTO-JOINS ADJACENT CELLS<br/>
        SURROUND NEUTRALS TO CLAIM THEM<br/>
        {UNLIMITED?"UNLIMITED ROUNDS":"MAX "+MAX_ROUNDS+" ROUNDS"} · MOST CELLS WINS
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setShowWelcome(true)} style={{
          flex:1,padding:"8px",borderRadius:8,cursor:"pointer",border:`1px solid ${T.btnBorder}`,
          background:"transparent",color:T.btnText,fontFamily:T.font,fontSize:9,letterSpacing:2,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accentColor;e.currentTarget.style.color=T.accentColor;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.btnBorder;e.currentTarget.style.color=T.btnText;}}>
          ? GUIDE
        </button>
        <button onClick={()=>setShowStats(true)} style={{
          flex:1,padding:"8px",borderRadius:8,cursor:"pointer",border:`1px solid ${T.btnBorder}`,
          background:"transparent",color:T.btnText,fontFamily:T.font,fontSize:9,letterSpacing:2,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accentColor;e.currentTarget.style.color=T.accentColor;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.btnBorder;e.currentTarget.style.color=T.btnText;}}>
          📊 STATS
        </button>
        <button onClick={()=>setEditing(true)} style={{
          flex:1,padding:"8px",borderRadius:8,cursor:"pointer",border:`1px solid ${T.btnBorder}`,
          background:"transparent",color:T.btnText,fontFamily:T.font,fontSize:9,letterSpacing:2,transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accentColor;e.currentTarget.style.color=T.accentColor;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.btnBorder;e.currentTarget.style.color=T.btnText;}}>
          ✎ EDIT
        </button>
      </div>
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
      {showWelcome&&<WelcomeScreen onClose={()=>setShowWelcome(false)} T={T}/>}
    </Shell>
  );

  /* ════ AI LEVEL ════ */
  if(phase==="aiLevel") return(
    <Shell T={T}>
      <Logo name={config.gameName} T={T}/>
      <SLabel T={T}>CHOOSE COMPUTER DIFFICULTY</SLabel>
      {Object.values(AI_LEVELS).map(lv=>(
        <button key={lv.key} onClick={()=>{setAiLevel(lv.key);setPhase("difficulty");}}
          style={{width:"100%",padding:"16px",borderRadius:10,cursor:"pointer",marginBottom:10,textAlign:"left",
            border:`2px solid ${lv.color}`,background:hexToRgba(lv.color,0.08),transition:"all 0.2s",fontFamily:T.font}}
          onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(lv.color,0.18);}}
          onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(lv.color,0.08);}}>
          <div style={{fontSize:13,fontWeight:"bold",letterSpacing:3,color:lv.color,marginBottom:4}}>🤖 {lv.label.toUpperCase()}</div>
          <div style={{fontSize:9,color:lv.color,opacity:0.85,letterSpacing:1}}>{lv.desc}</div>
        </button>
      ))}
      <button onClick={()=>setShowInstructions("vscomputer")} style={{width:"100%",padding:"10px",borderRadius:8,
        cursor:"pointer",marginBottom:10,border:`1px solid ${T.accentColor}`,background:hexToRgba(T.accentColor,0.08),
        color:T.accentColor,fontFamily:T.font,fontSize:9,letterSpacing:2}}>? HOW DOES THE COMPUTER PLAY</button>
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
      <GhostButton onClick={()=>setPhase("numSelect")} T={T}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ DIFFICULTY ════ */
  if(phase==="difficulty") return(
    <Shell T={T}>
      <Logo name={config.gameName} T={T}/>
      <SLabel T={T}>{vsComputer?`VS COMPUTER (${AI_LEVELS[aiLevel]?.label})`:teamMode?"2 VS 2":`${numPlayers} PLAYER${numPlayers>1?"S":""}`} · CHOOSE DIFFICULTY</SLabel>
      {Object.entries(config.difficulties).map(([key,d])=>(
        <div key={key} style={{width:"100%",display:"flex",gap:6,alignItems:"stretch",marginBottom:10}}>
          <div style={{flex:1}}>
            <DiffBtn color={d.color} label={d.label} onClick={()=>goToGridSize(key)} noMargin T={T}>
              {d.line1}<br/>{d.line2}
            </DiffBtn>
          </div>
          <button onClick={()=>setShowInstructions(key)} style={{flexShrink:0,width:36,borderRadius:10,
            cursor:"pointer",border:`2px solid ${d.color}`,background:hexToRgba(d.color,0.08),
            color:d.color,fontFamily:T.font,fontSize:14,fontWeight:"bold",transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(d.color,0.25);}}
            onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(d.color,0.08);}}>?</button>
        </div>
      ))}
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
      <GhostButton onClick={()=>setPhase(vsComputer?"aiLevel":"numSelect")} T={T}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ GRID SIZE ════ */
  if(phase==="gridSize") return(
    <Shell T={T}>
      <Logo name={config.gameName} T={T}/>
      <SLabel T={T}>CHOOSE GRID SIZE</SLabel>
      {Object.entries(config.gridSizes).map(([key,gs])=>(
        <button key={key} onClick={()=>goToOptions(key)}
          style={{width:"100%",padding:"16px 20px",borderRadius:10,cursor:"pointer",marginBottom:10,
            textAlign:"left",border:`2px solid ${config.difficulties[difficulty].color}`,
            background:hexToRgba(config.difficulties[difficulty].color,0.07),transition:"all 0.2s",fontFamily:T.font}}
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
      <GhostButton onClick={()=>setPhase("difficulty")} T={T}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ GAME OPTIONS ════ */
  if(phase==="options"){
    const diffColor=config.difficulties[difficulty].color;
    function Toggle({label,value,options,onChange}){
      return(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
          <span style={{fontSize:9,color:T.textDim,letterSpacing:1}}>{label}</span>
          <div style={{display:"flex",gap:4}}>
            {options.map(o=>(
              <button key={o.v} onClick={()=>onChange(o.v)} style={{
                padding:"4px 8px",borderRadius:6,cursor:"pointer",fontFamily:T.font,fontSize:8,letterSpacing:1,
                border:`1px solid ${value===o.v?diffColor:T.btnBorder}`,
                background:value===o.v?hexToRgba(diffColor,0.25):"transparent",
                color:value===o.v?diffColor:T.textDim,transition:"all 0.15s"}}>{o.label}</button>
            ))}
          </div>
        </div>
      );
    }
    return(
      <Shell T={T}>
        <Logo name={config.gameName} T={T}/>
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",justifyContent:"center"}}>
          <Badge color={diffColor} T={T}>{difficulty.toUpperCase()}</Badge>
          <Badge color={diffColor} T={T}>{config.gridSizes[gridSize].label.toUpperCase()}</Badge>
        </div>
        <SLabel T={T}>GAME OPTIONS</SLabel>
        <div style={{width:"100%",marginBottom:20}}>
          <Toggle label="TIMED TURNS" value={timedTurnSecs}
            options={[{v:0,label:"OFF"},{v:15,label:"15s"},{v:30,label:"30s"},{v:60,label:"60s"}]}
            onChange={setTimedTurnSecs}/>
          <Toggle label="AUTO PASS" value={autoPass}
            options={[{v:true,label:"ON"},{v:false,label:"OFF"}]}
            onChange={setAutoPass}/>
          <Toggle label="FUN MODE" value={funMode}
            options={[{v:false,label:"OFF"},{v:true,label:"ON"}]}
            onChange={setFunMode}/>
          {USE_FOG&&(
            <div style={{padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:9,color:"#FF4757",letterSpacing:1}}>👁 FOG OF WAR ENABLED</span>
              <div style={{fontSize:8,color:T.textDim,marginTop:4}}>
                Visibility range: {FOG_RANGE} cells from your territory
              </div>
            </div>
          )}
        </div>
        <button onClick={goToColorPick} style={{
          width:"100%",padding:"13px",borderRadius:8,border:"none",cursor:"pointer",
          background:`linear-gradient(135deg,${diffColor},${hexToRgba(diffColor,0.6)})`,
          color:"white",fontFamily:T.font,fontSize:12,fontWeight:"bold",letterSpacing:3,
          boxShadow:`0 0 24px ${hexToRgba(diffColor,0.4)}`,marginBottom:10}}>
          CONTINUE →
        </button>
        <GhostButton onClick={()=>setPhase("gridSize")} T={T}>← BACK</GhostButton>
      </Shell>
    );
  }

  /* ════ PLAYER SETUP ════ */
  if(phase==="playerSetup"){
    const pickingPos=!!pendingColor,diffColor=diff.color;
    return(
      <Shell wide={pickingPos} T={T}>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {Array.from({length:vsComputer?1:numPlayers},(_,i)=>(
            <div key={i} style={{width:32,height:5,borderRadius:3,
              background:i<setupIdx?(playerDefs[i]?.hex||"#333"):i===setupIdx?T.text:T.border,transition:"background 0.3s"}}/>
          ))}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",justifyContent:"center"}}>
          <Badge color={diffColor} T={T}>{difficulty.toUpperCase()}</Badge>
          <Badge color={diffColor} T={T}>{config.gridSizes[gridSize].label.toUpperCase()}</Badge>
          {vsComputer&&<Badge color={T.accentColor} T={T}>VS 🤖 {AI_LEVELS[aiLevel]?.label.toUpperCase()}</Badge>}
          {isDailyChallenge&&<Badge color="#FF9F43" T={T}>☀️ DAILY</Badge>}
          {timedTurnSecs>0&&<Badge color="#FFD32A" T={T}>⏱ {timedTurnSecs}s</Badge>}
          {funMode&&<Badge color="#2ED573" T={T}>🎮 FUN</Badge>}
        </div>
        <div style={{fontSize:9,letterSpacing:3,color:T.textDim,marginBottom:4}}>
          {vsComputer||isDailyChallenge?"YOUR COLOUR":`PLAYER ${setupIdx+1} OF ${numPlayers}`}
        </div>
        <div style={{fontSize:17,fontWeight:"bold",letterSpacing:2,marginBottom:20,
          color:pendingColor?pendingColor.hex:T.text,
          textShadow:pendingColor?`0 0 20px ${hexToRgba(pendingColor.hex,0.6)}`:"none",
          transition:"all 0.3s",minHeight:26,textAlign:"center"}}>
          {pickingPos?`${pendingColor.name.toUpperCase()} — PICK YOUR START`:"CHOOSE YOUR COLOUR"}
        </div>
        {!pickingPos&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20,width:"100%",maxWidth:272}}>
            {ACTIVE_TEAMS.map(pc=>(
              <ColorBtn key={pc.hex} pc={pc} taken={takenColors.includes(pc.hex)} onClick={()=>pickColor(pc)} T={T}/>
            ))}
          </div>
        )}
        {pickingPos&&(
          <>
            <MiniBoard board={sharedBoard} playerDefs={playerDefs} takenCells={takenCells}
              curColor={pendingColor} onPick={pickPosition} BS={BS} palette={PALETTE} T={T}/>
            <div style={{marginTop:8,fontSize:9,color:T.textDim,letterSpacing:1,textAlign:"center"}}>
              {vsComputer||isDailyChallenge?"CLICK TO PLACE YOUR START — COMPUTER PICKS OPPOSITE":"CLICK ANY CELL TO PLACE YOUR START"}
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
    const winHex=teamMode?(topPlayer===0?"#FFD32A":"#A29BFE"):winner?.hex||"#A29BFE";
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
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:"16px 10px",fontFamily:T.font,color:T.text,boxSizing:"border-box",gap:10}}>
        <style>{GLOBAL_CSS}</style>
        <div style={{fontSize:9,letterSpacing:3,color:T.textDim,marginBottom:4}}>FINAL BOARD</div>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${BS},1fr)`,gridTemplateRows:`repeat(${BS},1fr)`,
          gap:2,background:T.gapColor,padding:3,borderRadius:T.pixelated?0:8,border:`3px solid ${T.border}`,
          width:"min(92vw,368px)",height:"min(92vw,368px)",boxSizing:"border-box",flexShrink:0}}>
          {Array.from({length:BS*BS},(_,k)=>{
            const r=Math.floor(k/BS),c=k%BS,owner=usedO[r][c],isOwned=owner>=0;
            return<div key={k} style={{background:isOwned?playerDefs[owner].hex:PALETTE[board[r][c]].hex,
              filter:isOwned?(T.ownedFilter||"saturate(1.4) brightness(1.1)"):(T.neutralFilter||"saturate(0.45) brightness(0.75)"),
              borderRadius:T.pixelated?0:T.cellRadius}}/>;
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
        <button onClick={()=>setReviewing(false)} style={{padding:"10px 22px",borderRadius:T.pixelated?0:8,cursor:"pointer",
          border:`2px solid ${T.border}`,background:"transparent",color:T.btnText,fontFamily:T.font,fontSize:11,letterSpacing:2}}>
          ← BACK TO RESULTS
        </button>
      </div>
    );

    return(
      <div style={{
        minHeight:"100vh",
        background:solo1p&&!grade?.victory
          ?`radial-gradient(circle at 50% 40%, rgba(40,0,0,0.6) 0%, ${T.bg} 70%)`
          :`radial-gradient(circle at 50% 40%, ${hexToRgba(winHex,0.2)} 0%, ${T.bg} 70%)`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        padding:"24px 16px",fontFamily:T.font,color:T.text,boxSizing:"border-box",gap:8}}>
        <style>{GLOBAL_CSS}</style>
        {isDailyChallenge&&<div style={{fontSize:10,color:"#FF9F43",letterSpacing:2,marginBottom:4}}>
          ☀️ DAILY CHALLENGE COMPLETE — {getTodayStr()}
        </div>}
        <div style={{fontSize:64,lineHeight:1}}>{solo1p?grade?.icon:teamMode?"⚔️":winner?.isAI?"🤖":"🏆"}</div>
        <div style={{fontSize:solo1p?20:15,fontWeight:"bold",letterSpacing:4,
          color:solo1p&&!grade?.victory?"#FF4757":winHex,
          textShadow:`0 0 32px ${solo1p&&!grade?.victory?"rgba(255,71,87,0.7)":hexToRgba(winHex,0.8)}`,
          textAlign:"center",animation:!solo1p||grade?.victory?"glow-pulse 2s ease-in-out infinite":"none"}}>
          {solo1p?grade?.title:teamMode?"TEAM VICTORY":winner?.isAI?"COMPUTER WINS":"VICTORY"}
        </div>
        {!solo1p&&teamMode&&(
          <div style={{fontSize:22,fontWeight:"bold",color:winHex,textAlign:"center",textShadow:`0 0 20px ${hexToRgba(winHex,0.6)}`}}>
            {winTeamName}
            <div style={{fontSize:11,color:hexToRgba(winHex,0.7),marginTop:4}}>
              {playerDefs.filter((_,i)=>i%2===topPlayer%2).map(d=>d?.name||"").join(" + ")}
            </div>
          </div>
        )}
        {!solo1p&&!teamMode&&winner&&(
          <div style={{fontSize:22,fontWeight:"bold",color:winHex,textAlign:"center",textShadow:`0 0 20px ${hexToRgba(winHex,0.6)}`}}>
            {winner.name}{winner.isAI?" 🤖":""}
          </div>
        )}
        <div style={{color:solo1p&&!grade?.victory?"#FF474788":hexToRgba(winHex,0.6),fontSize:10,letterSpacing:1,textAlign:"center"}}>
          {solo1p?grade?.sub:teamMode?`${teamScores[topPlayer]||0} vs ${teamScores[1-topPlayer]||0} cells · ${turnNum-1} turns`:`P${topPlayer+1} ${config.multiWinText} · ${turnNum-1} turns`}
        </div>
        <div style={{width:"100%",maxWidth:280}}>
          {Array.from({length:numPlayers},(_,i)=>{
            const def=playerDefs[i];
            const teamColor=teamMode?(i%2===0?"#FFD32A":"#A29BFE"):null;
            const isWinner=(!teamMode&&i===topPlayer&&numPlayers>1)||(teamMode&&i%2===topPlayer%2);
            const rank=numPlayers>1&&!teamMode?[...Array(numPlayers).keys()].sort((a,b)=>fs[b]-fs[a]).indexOf(i)+1:null;
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                padding:"8px 12px",borderRadius:T.pixelated?0:8,
                background:isWinner?hexToRgba(teamColor||def.hex,0.15):"transparent",
                border:isWinner?`1px solid ${hexToRgba(teamColor||def.hex,0.4)}`:"1px solid transparent"}}>
                {teamMode&&<div style={{width:18,height:18,borderRadius:"50%",background:teamColor,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:8,fontWeight:"bold",color:"black",flexShrink:0}}>{i%2===0?"▲":"▼"}</div>}
                {!teamMode&&numPlayers>1&&<div style={{width:18,height:18,borderRadius:"50%",
                  background:isWinner?def.hex:"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:8,fontWeight:"bold",color:isWinner?"white":"#555",flexShrink:0}}>{rank}</div>}
                <div style={{width:9,height:9,borderRadius:"50%",background:def.hex,boxShadow:`0 0 6px ${def.hex}`,flexShrink:0}}/>
                <span style={{flex:1,color:isWinner?def.hex:T.textDim,fontSize:10}}>{def.name}{def.isAI?" 🤖":""}</span>
                <span style={{fontWeight:"bold",fontSize:14,color:isWinner?def.hex:T.textDim}}>{fs[i]}</span>
                <div style={{width:48,height:3,background:T.border,borderRadius:2,flexShrink:0}}>
                  <div style={{height:"100%",borderRadius:2,background:def.hex,width:`${(fs[i]/TOTAL)*100}%`,boxShadow:`0 0 4px ${def.hex}`}}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
          <GlowButton hex={winHex} onClick={()=>setReviewing(true)}>VIEW BOARD</GlowButton>
          <GlowButton hex={winHex} onClick={restartGame}>PLAY AGAIN</GlowButton>
          <GhostButton onClick={resetToMenu} T={T}>MENU</GhostButton>
        </div>
      </div>
    );
  }

  /* ════ PLAYING ════ */
  const curDef=playerDefs[cp],curHex=curDef?.hex||"#A29BFE";
  const curGlow=hexToRgba(curHex,0.5),curDim=hexToRgba(curHex,0.15);
  const hasCaptured=captureCount>0;
  const isAITurn=curDef?.isAI;
  const diffColor=diff?.color||"#888";
  const timerPct=timedTurnSecs>0&&timeLeft!=null?timeLeft/timedTurnSecs:1;
  const timerColor=timerPct>0.5?"#2ED573":timerPct>0.25?"#FFD32A":"#FF4757";

  return(
    <div style={{height:"100dvh",maxHeight:"100dvh",overflow:"hidden",background:T.bg,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      padding:"8px 10px",fontFamily:T.font,color:T.text,boxSizing:"border-box",gap:4}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Combo banner ── */}
      {funMode&&showCombo&&(
        <div className="combo-pop" style={{
          position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          zIndex:100,fontSize:32,fontWeight:"bold",letterSpacing:4,
          color:"#FFD32A",textShadow:"0 0 30px rgba(255,211,42,0.8)",
          pointerEvents:"none",fontFamily:T.font}}>
          COMBO ×{comboStreak+1}!
        </div>
      )}

      {/* ── Auto pass notification ── */}
      {autoPassActive&&(
        <div style={{
          position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          zIndex:100,background:hexToRgba(curHex,0.9),borderRadius:10,padding:"12px 20px",
          fontSize:11,fontWeight:"bold",letterSpacing:2,color:"white",fontFamily:T.font,
          pointerEvents:"none",textAlign:"center"}}>
          NO MOVES<br/>AUTO-PASSING...
        </div>
      )}

      {/* ── Turn banner ── */}
      <div style={{width:"100%",maxWidth:380,flexShrink:0,borderRadius:T.pixelated?0:10,
        background:curDim,border:`2px solid ${hexToRgba(curHex,0.55)}`,
        boxShadow:`0 0 32px ${hexToRgba(curHex,0.35)}`,
        padding:"10px 16px",display:"flex",alignItems:"center",gap:12,
        transition:"border-color 0.35s, box-shadow 0.35s, background 0.35s",minHeight:60,overflow:"hidden"}}>
        <div style={{flexShrink:0,position:"relative",width:20,height:20}}>
          <div className="ring-pulse" style={{position:"absolute",inset:-5,borderRadius:"50%",
            border:`2px solid ${curHex}`,pointerEvents:"none"}}/>
          <div style={{width:20,height:20,borderRadius:"50%",background:curHex,boxShadow:`0 0 14px ${curGlow}`}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:curHex,fontWeight:"bold",fontSize:14,letterSpacing:2,
            textShadow:`0 0 14px ${curGlow}`,lineHeight:1.2}}>
            {curDef?.name?.toUpperCase()}{isAITurn?" 🤖":""}
            {funMode&&comboStreak>1&&!isAITurn&&(
              <span style={{fontSize:9,color:"#FFD32A",marginLeft:8}}>🔥×{comboStreak}</span>
            )}
          </div>
          <div style={{color:hexToRgba(curHex,0.7),fontSize:9,letterSpacing:1,marginTop:2}}>
            {isAITurn&&aiThinking?"THINKING..."
              :isAITurn?"COMPUTER IS DECIDING..."
              :autoPassActive?"NO MOVES — AUTO PASSING..."
              :hoverColourName
                ?hoverIsClickable
                  ?`CAPTURE ${hoverColourName.toUpperCase()} → ${previewCells.size} CELLS`
                  :`${hoverColourName.toUpperCase()} — NOT REACHABLE`
                :hasCaptured
                  ?"CAPTURED — TAP ANOTHER GROUP TO CHANGE OR END TURN"
                  :`TURN ${turnNum} · P${cp+1}${difficulty==="easy"?` · ${scores[cp]} CELLS`:""}`}
          </div>
        </div>
        <div style={{textAlign:"right",minWidth:52,flexShrink:0}}>
          {isAITurn?(<div className="ai-thinking" style={{color:curHex,fontSize:18}}>⚙</div>)
            :previewCells.size>0?(
              <><div style={{color:curHex,fontWeight:"bold",fontSize:20,lineHeight:1,textShadow:`0 0 12px ${curGlow}`}}>{previewCells.size}</div>
              <div style={{color:hexToRgba(curHex,0.7),fontSize:8,letterSpacing:1}}>CELLS</div></>
            ):hasCaptured?(
              <div style={{color:hexToRgba(curHex,0.7),fontSize:8,letterSpacing:1,lineHeight:1.8}}>
                {difficulty==="easy"?scores[cp]:"·"}<br/>CELLS
              </div>
            ):(
              <div style={{color:T.textFaint,fontSize:8,letterSpacing:1,lineHeight:1.8}}>CLICK A<br/>BORDER<br/>CELL</div>
            )}
        </div>
      </div>

      {/* ── Timer bar ── */}
      {timedTurnSecs>0&&timeLeft!=null&&!isAITurn&&(
        <div style={{width:"100%",maxWidth:380,flexShrink:0}}>
          <div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:2,background:timerColor,
              width:`${timerPct*100}%`,transition:"width 1s linear, background 0.5s"}}/>
          </div>
          <div style={{textAlign:"right",fontSize:8,color:timerColor,marginTop:2,letterSpacing:1}}>⏱ {timeLeft}s</div>
        </div>
      )}

      {/* ── Round / info bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:5,width:"100%",maxWidth:380,flexShrink:0}}>
        <Badge color={diffColor} T={T}>{difficulty.toUpperCase()}</Badge>
        {isDailyChallenge&&<Badge color="#FF9F43" T={T}>☀️</Badge>}
        {USE_FOG&&<Badge color="#FF4757" T={T}>👁 FOG</Badge>}
        {funMode&&<Badge color="#2ED573" T={T}>🎮</Badge>}
        <span style={{color:T.textDim,fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>
          {UNLIMITED?`T${turnNum}`:`R${round}/${MAX_ROUNDS}`}
        </span>
        <div style={{flex:1,height:2,background:T.border,borderRadius:1}}>
          {!UNLIMITED&&<div style={{height:"100%",borderRadius:1,
            background:`linear-gradient(90deg,${playerDefs[0]?.hex},${playerDefs[numPlayers-1]?.hex})`,
            width:`${(round/MAX_ROUNDS)*100}%`,transition:"width 0.4s"}}/>}
        </div>
        {difficulty==="easy"&&<span style={{color:T.textDim,fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>{Math.round(claimed/TOTAL*100)}%</span>}
      </div>

      {/* ── Board ── */}
      <div onMouseLeave={()=>setHovered(null)} style={{
        display:"grid",gridTemplateColumns:`repeat(${BS},1fr)`,gridTemplateRows:`repeat(${BS},1fr)`,
        gap:T.pixelated?1:2,background:T.gapColor,padding:T.pixelated?1:3,
        borderRadius:T.pixelated?0:8,
        border:`${T.pixelated?2:3}px solid ${hexToRgba(curHex,0.55)}`,
        boxShadow:T.pixelated?`2px 2px 0 ${curHex}`:(`0 0 40px ${hexToRgba(curHex,0.35)}`),
        width:"min(90vw,360px)",height:"min(90vw,360px)",
        flexShrink:0,boxSizing:"border-box",
        transition:"border-color 0.35s, box-shadow 0.35s",touchAction:"none",
        opacity:isAITurn?0.88:1,
        imageRendering:T.pixelated?"pixelated":"auto",
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


          const isFogged=visibleCells&&!visibleCells.has(k)&&!isOwned;


          let rippleDelay=null;
          if(rippleOrigin&&isFlash){
            const dist=Math.sqrt((r-rippleOrigin.r)**2+(c-rippleOrigin.c)**2);
            rippleDelay=`${Math.round(dist*55)}ms`;
          }


          const isTerrBorder=isOwned&&owner===cp&&!isAITurn&&
            [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([nr,nc])=>
              nr>=0&&nr<BS&&nc>=0&&nc<BS&&ownership[nr][nc]!==cp
            );

          const bgColor=isFogged?"#050508":isOwned?playerDefs[owner].hex:PALETTE[board[r][c]].hex;

          const nF=T.neutralFilter||"saturate(0.55) brightness(0.85)";
          const oF=T.ownedFilter||"saturate(1.4) brightness(1.1)";
          const cellFilter=isFogged?"none"
            :isOwned?oF
            :isLegendHighlight?`saturate(0.9) brightness(1.0)`
            :legendFocus!==null?`saturate(0.12) brightness(0.45)`
            :nF;

          return(
            <div key={k} onClick={()=>handleBoardClick(r,c)} onMouseEnter={()=>{if(!isAITurn) setHovered([r,c]);}}
              title={!isOwned&&!isFogged?PALETTE[board[r][c]]?.name:""}
              style={{background:bgColor,position:"relative",cursor:isClickable?"pointer":"default",
                filter:cellFilter,willChange:"filter",
                borderRadius:T.pixelated?0:T.cellRadius}}>
              {/* Territory border glow */}
              {isTerrBorder&&!isPrev&&(
                <div className="terr-border" style={{position:"absolute",inset:0,
                  boxShadow:`inset 0 0 0 2px ${hexToRgba(curHex,0.85)}`,
                  borderRadius:T.pixelated?0:T.cellRadius,pointerEvents:"none"}}/>
              )}
              {/* Preview */}
              {isPrev&&<div style={{position:"absolute",inset:0,background:hexToRgba(curHex,0.68),
                border:`2px solid ${curHex}`,boxSizing:"border-box",pointerEvents:"none",
                borderRadius:T.pixelated?0:T.cellRadius}}/>}
              {/* Clickable shimmer */}
              {isClickable&&!isPrev&&<div className="cell-pulse" style={{position:"absolute",inset:0,
                border:`2px solid ${curHex}`,boxSizing:"border-box",pointerEvents:"none",
                borderRadius:T.pixelated?0:T.cellRadius}}/>}
              {/* Legend highlight */}
              {isLegendHighlight&&!isPrev&&!isClickable&&<div style={{position:"absolute",inset:0,
                border:`2px solid ${PALETTE[legendFocus]?.hex}`,boxSizing:"border-box",pointerEvents:"none",
                borderRadius:T.pixelated?0:T.cellRadius,opacity:0.9}}/>}
              {/* Ripple capture */}
              {isFlash&&<div style={{position:"absolute",inset:0,background:"white",pointerEvents:"none",
                borderRadius:T.pixelated?0:T.cellRadius,
                animation:`flash-ripple 0.5s ease ${rippleDelay||"0ms"} forwards`}}/>}
              {/* Enclosure flash */}
              {isEnclosedFlash&&!isFlash&&<div className="enclosed-burst" style={{position:"absolute",inset:0,
                background:"#FFD32A",pointerEvents:"none",borderRadius:T.pixelated?0:T.cellRadius}}/>}
              {/* Auto-claim flash */}
              {isAutoFlash&&!isFlash&&!isEnclosedFlash&&<div className="auto-burst" style={{position:"absolute",inset:0,
                background:playerDefs[cp]?.hex||"#fff",pointerEvents:"none",borderRadius:T.pixelated?0:T.cellRadius}}/>}
              {/* Fog of war */}
              {isFogged&&<div style={{position:"absolute",inset:0,
                background:"rgba(0,0,0,0.85)",pointerEvents:"none",
                borderRadius:T.pixelated?0:T.cellRadius,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:Math.max(4,Math.floor(360/BS/3)),opacity:0.3,color:"#fff"}}>▪</span>
              </div>}
            </div>
          );
        })}
      </div>

      {/* ── Colour legend (easy) ── */}
      {difficulty==="easy"&&(
        <div style={{display:"flex",gap:4,width:"100%",maxWidth:380,flexShrink:0,overflowX:"auto",paddingBottom:2}}>
          {PALETTE.map((bc,idx)=>{const f=legendFocus===idx;return(
            <button key={idx} onClick={()=>setLegendFocus(f?null:idx)} title={bc.name}
              style={{flexShrink:0,width:24,height:24,borderRadius:T.pixelated?0:6,cursor:"pointer",
                background:bc.hex,border:f?"2px solid white":"2px solid transparent",
                boxShadow:f?`0 0 10px ${bc.hex}`:"none",transition:"all 0.15s",
                transform:f?"scale(1.25)":"scale(1)",padding:0}}/>
          );})}
          {legendFocus!==null&&<div style={{display:"flex",alignItems:"center",
            color:PALETTE[legendFocus]?.hex,fontSize:9,letterSpacing:1,paddingLeft:4,whiteSpace:"nowrap"}}>
            {PALETTE[legendFocus]?.name?.toUpperCase()}
          </div>}
        </div>
      )}

      {/* ── Victory assured banner ── */}
      {victoryAssured&&(
        <div style={{width:"100%",maxWidth:380,flexShrink:0,borderRadius:T.pixelated?0:10,padding:"8px 14px",
          background:hexToRgba(victoryAssured.hex,0.18),
          border:`2px solid ${hexToRgba(victoryAssured.hex,0.7)}`,
          boxShadow:`0 0 20px ${hexToRgba(victoryAssured.hex,0.35)}`,
          display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:victoryAssured.hex,fontWeight:"bold",fontSize:10,letterSpacing:2,marginBottom:2}}>
              {victoryAssured.name.toUpperCase()}
            </div>
            <div style={{color:hexToRgba(victoryAssured.hex,0.8),fontSize:8,letterSpacing:1}}>
              {config.victoryAssuredText}
            </div>
          </div>
          <button onClick={()=>{updateStatsOnGameEnd(ownership,0);setFinalOwnership(ownership);music.sfxVictory();setPhase("gameover");}} style={{
            flexShrink:0,padding:"6px 10px",borderRadius:T.pixelated?0:6,cursor:"pointer",
            border:`1px solid ${victoryAssured.hex}`,background:hexToRgba(victoryAssured.hex,0.25),
            color:victoryAssured.hex,fontFamily:T.font,fontSize:8,letterSpacing:1}}>END NOW</button>
          <button onClick={()=>setVictoryAssured(null)} style={{
            flexShrink:0,padding:"6px 10px",borderRadius:T.pixelated?0:6,cursor:"pointer",
            border:`1px solid ${T.btnBorder}`,background:"transparent",
            color:T.btnText,fontFamily:T.font,fontSize:8,letterSpacing:1}}>PLAY ON</button>
        </div>
      )}

      {/* ── Score cards ── */}
      <div style={{display:"flex",gap:5,width:"100%",maxWidth:380,flexShrink:0}}>
        {Array.from({length:numPlayers},(_,i)=>{
          const def=playerDefs[i],isCur=i===cp,showScore=difficulty==="easy"||showScores;
          const teamColor=teamMode?(i%2===0?"#FFD32A":"#A29BFE"):null;
          return(
            <div key={i} style={{flex:1,background:isCur?hexToRgba(def.hex,0.15):T.cardBg,
              border:`1px solid ${isCur?hexToRgba(def.hex,0.6):T.border}`,
              borderRadius:T.pixelated?0:8,padding:"5px 4px",textAlign:"center",
              boxShadow:isCur?`0 0 18px ${hexToRgba(def.hex,0.35)}`:"none",transition:"all 0.3s"}}>
              {def.isAI&&<div style={{fontSize:8,lineHeight:1}}>🤖</div>}
              {teamMode&&<div style={{fontSize:7,color:teamColor,lineHeight:1}}>{i%2===0?"▲":"▼"}</div>}
              <div style={{width:9,height:9,borderRadius:"50%",background:def.hex,
                margin:"1px auto 3px",boxShadow:`0 0 ${isCur?12:4}px ${def.hex}`}}/>
              {showScore
                ?<div style={{fontSize:15,fontWeight:"bold",color:isCur?def.hex:T.textDim,lineHeight:1,
                  animation:showScores&&difficulty!=="easy"?"glow-pulse 1.5s ease-in-out 3":"none"}}>{scores[i]}</div>
                :<div style={{fontSize:8,color:isCur?def.hex:T.textFaint,lineHeight:1}}>
                  {"▓".repeat(Math.min(5,Math.ceil(scores[i]/TOTAL*5)))||"·"}
                </div>
              }
              <div style={{fontSize:5,color:isCur?hexToRgba(def.hex,0.85):T.textFaint,
                letterSpacing:0.3,margin:"2px 0 3px",lineHeight:1.2,overflow:"hidden",
                whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                {def.name.toUpperCase()}
              </div>
              {showScore&&<div style={{height:2,background:T.border,borderRadius:1,margin:"0 3px"}}>
                <div style={{height:"100%",borderRadius:2,background:def.hex,
                  width:`${(scores[i]/TOTAL)*100}%`,boxShadow:`0 0 4px ${def.hex}`,transition:"width 0.4s"}}/>
              </div>}
            </div>
          );
        })}
      </div>

      {/* ── Actions ── */}
      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
        <button onClick={endTurn} disabled={isAITurn} style={{
          padding:"9px 18px",borderRadius:T.pixelated?0:8,cursor:isAITurn?"default":"pointer",
          border:`2px solid ${hasCaptured&&!isAITurn?curHex:hexToRgba(curHex,0.2)}`,
          background:hasCaptured&&!isAITurn?curDim:"transparent",
          color:hasCaptured&&!isAITurn?curHex:T.textFaint,
          fontFamily:T.font,fontSize:10,fontWeight:"bold",letterSpacing:2,
          boxShadow:hasCaptured&&!isAITurn?`0 0 22px ${curGlow}`:"none",transition:"all 0.2s",
          opacity:isAITurn?0.4:1}}>END TURN →</button>
        <button onClick={triggerEndGame} style={{
          padding:"9px 10px",borderRadius:T.pixelated?0:8,cursor:"pointer",
          border:`2px solid ${confirmEnd?"#FF4757":T.btnBorder}`,
          background:confirmEnd?"rgba(255,71,87,0.15)":"transparent",
          color:confirmEnd?"#FF4757":T.btnText,fontFamily:T.font,fontSize:9,letterSpacing:1,
          transition:"all 0.2s",whiteSpace:"nowrap"}}>
          {confirmEnd?"CONFIRM ✕":"END"}
        </button>
        {difficulty!=="easy"&&<button onClick={()=>setShowScores(s=>!s)} style={{
          padding:"9px 10px",borderRadius:T.pixelated?0:8,cursor:"pointer",
          border:`2px solid ${showScores?T.accentColor:T.btnBorder}`,
          background:showScores?hexToRgba(T.accentColor,0.15):"transparent",
          color:showScores?T.accentColor:T.btnText,fontFamily:T.font,fontSize:11,
          transition:"all 0.2s",boxShadow:showScores?`0 0 14px ${hexToRgba(T.accentColor,0.4)}`:"none"}} title="Peek at scores">👁</button>}
        <button onClick={music.toggleMusic} style={{
          padding:"9px 10px",borderRadius:T.pixelated?0:8,cursor:"pointer",
          border:`2px solid ${music.musicOn?"#FFD32A":T.btnBorder}`,
          background:music.musicOn?"rgba(255,211,42,0.15)":"transparent",
          color:music.musicOn?"#FFD32A":T.btnText,fontFamily:T.font,fontSize:11,
          transition:"all 0.2s",boxShadow:music.musicOn?"0 0 14px rgba(255,211,42,0.4)":"none"}} title="Music">♪</button>
        <button onClick={()=>setShowInstructions(difficulty||"general")} style={{
          padding:"9px 10px",borderRadius:T.pixelated?0:8,cursor:"pointer",
          border:`1px solid ${T.btnBorder}`,background:"transparent",
          color:T.btnText,fontFamily:T.font,fontSize:13,transition:"all 0.2s"}} title="How to play">?</button>
        <GhostButton onClick={resetToMenu} T={T} style={{padding:"9px 10px"}}>☰</GhostButton>
      </div>

      {confirmEnd&&<div style={{color:"#FF4757",fontSize:8,letterSpacing:1,flexShrink:0}}>TAP CONFIRM TO END THE GAME EARLY</div>}
      {clickableCells.size===0&&!confirmEnd&&!isAITurn&&!autoPassActive&&captureCount===0&&(
        <div style={{color:T.textFaint,fontSize:9,letterSpacing:1,flexShrink:0}}>NO MOVES — END TURN</div>
      )}
      {showInstructions&&<InstructionsModal topic={showInstructions} onClose={()=>setShowInstructions(false)}/>}
    </div>
  );
}

/* ─── Mini board ──────────────────────────────────── */
function MiniBoard({board,playerDefs,takenCells,curColor,onPick,BS,palette,T}){
  const[hov,setHov]=useState(null);
  const SIZE=Math.min(typeof window!=="undefined"?window.innerWidth*0.82:280,300);
  return(
    <div onMouseLeave={()=>setHov(null)} style={{
      display:"grid",gridTemplateColumns:`repeat(${BS},1fr)`,gridTemplateRows:`repeat(${BS},1fr)`,
      gap:2,background:T.gapColor,padding:2,borderRadius:T.pixelated?0:8,
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
              filter:existingDef>=0?(T?.ownedFilter||"saturate(1.3) brightness(1.05)"):(T?.neutralFilter||"saturate(0.55) brightness(0.85)"),
              borderRadius:T.pixelated?0:T.cellRadius}}>
            {existingDef>=0&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:"white",boxShadow:"0 0 3px black"}}/>
            </div>}
            {!taken&&isHov&&<div style={{position:"absolute",inset:0,background:hexToRgba(curColor.hex,0.7),
              border:`2px solid ${curColor.hex}`,boxSizing:"border-box",borderRadius:T.pixelated?0:T.cellRadius}}/>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Welcome / How-to-play screen ─────────────────── */
function WelcomeScreen({onClose,T}){
  const[page,setPage]=useState(0);

  const PAGES=[
    {
      icon:"🎮",
      title:"WELCOME TO PIXEL GO",
      subtitle:"A colour territory battle game",
      body:[
        "Pixel Go is a strategy game for 1–4 players (or vs computer) where you compete to control as much of a grid as possible.",
        "The player or team that holds the most cells when no one can be beaten — or when rounds run out — wins.",
        "Each turn you capture one group of neutral cells. Plan ahead, box in your opponents, and claim the board.",
      ],
    },
    {
      icon:"👆",
      title:"HOW TO TAKE A TURN",
      subtitle:"Claiming neutral territory",
      body:[
        "Tap any muted (neutral) cell that borders your territory. The whole connected block of the same colour joins you instantly.",
        "Hover over a cell first to see a preview — it shows exactly which cells you'd capture and how many.",
        "You can only make ONE capture per turn. But you can tap a different group before pressing End Turn to change your mind.",
      ],
    },
    {
      icon:"🎨",
      title:"YOUR COLOUR IS SPECIAL",
      subtitle:"Reach anywhere on the board",
      body:[
        "At the start of your turn, any neutral cell matching your team's colour that touches your territory is claimed for free automatically.",
        "Even better — any neutral cell of your colour, anywhere on the board, is clickable. Use this to establish territory on the other side of the grid before your opponent blocks you.",
      ],
    },
    {
      icon:"🔲",
      title:"ENCLOSURES",
      subtitle:"Box in neutral cells to claim them",
      body:[
        "If you fully surround a group of neutral cells — using your territory and the board walls — they are automatically claimed.",
        "This is the most powerful move in the game. A single capture that seals off 20 neutral cells is worth far more than just the group you clicked.",
        "Exception: if an enclosed region contains another player's colour, they can still reach it from anywhere, so it stays neutral.",
      ],
    },
    {
      icon:"🌫️",
      title:"GAME MODES",
      subtitle:"Easy to Very Hard",
      body:[
        "EASY — Grouped pixels, cascading captures. All cells of a colour touching you chain together. Full score display.",
        "NORMAL — Grouped pixels, no cascade. Only the group you click joins you. Scores hidden.",
        "HARD — Random pixels, cascade. Plus Fog of War — you can only see 4 cells from your territory.",
        "VERY HARD — Random pixels, no cascade, tighter fog (3 cells). The hardest challenge.",
      ],
    },
    {
      icon:"🤖",
      title:"VS COMPUTER",
      subtitle:"Four difficulty levels",
      body:[
        "RECRUIT — Random moves. Good for learning.",
        "VETERAN — Always picks the biggest group available.",
        "MASTER — Evaluates space control and blocks your best move.",
        "GRANDMASTER — Thinks 3 moves ahead, plans enclosures, denies your access to territory. Very hard to beat.",
      ],
    },
    {
      icon:"💡",
      title:"TIPS FOR NEW PLAYERS",
      subtitle:"How to win",
      body:[
        "Think about space, not just cells. A move that cuts off 15 neutral cells from your opponent is better than directly claiming 5.",
        "Push along walls — the board edge makes enclosure much easier.",
        "Your own colour spawns for free — spot it on the board at the start and plan around those locations.",
        "In fog of war modes, expand in multiple directions to reveal more of the board before your opponent does.",
      ],
    },
  ];

  const page_data=PAGES[page];
  const isLast=page===PAGES.length-1;

  return(
    <div style={{
      position:"fixed",inset:0,zIndex:2000,
      background:"rgba(0,0,0,0.95)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"16px",fontFamily:T.font,overflowY:"auto",
    }}>
      <div style={{
        background:T.cardBg,border:`1px solid ${T.border}`,
        borderRadius:T.pixelated?0:16,
        width:"100%",maxWidth:380,
        display:"flex",flexDirection:"column",
        boxShadow:"0 0 60px rgba(0,0,0,0.9)",
      }}>
        {/* Progress dots */}
        <div style={{display:"flex",gap:4,justifyContent:"center",padding:"16px 16px 0"}}>
          {PAGES.map((_,i)=>(
            <div key={i} onClick={()=>setPage(i)} style={{
              width:i===page?20:6,height:6,borderRadius:3,cursor:"pointer",
              background:i===page?T.accentColor:i<page?"#444":T.border,
              transition:"all 0.3s",
            }}/>
          ))}
        </div>

        {/* Content */}
        <div style={{padding:"20px 24px 16px",flex:1}}>
          <div style={{fontSize:44,textAlign:"center",marginBottom:10,lineHeight:1}}>{page_data.icon}</div>
          <div style={{fontSize:14,fontWeight:"bold",letterSpacing:3,color:T.accentColor,
            textAlign:"center",marginBottom:4}}>{page_data.title}</div>
          <div style={{fontSize:9,color:T.textDim,letterSpacing:2,textAlign:"center",marginBottom:16}}>
            {page_data.subtitle.toUpperCase()}
          </div>
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            {page_data.body.map((line,i)=>(
              <div key={i} style={{
                display:"flex",gap:10,marginBottom:12,alignItems:"flex-start",
              }}>
                <div style={{
                  width:18,height:18,borderRadius:"50%",background:hexToRgba(T.accentColor,0.2),
                  border:`1px solid ${T.accentColor}`,flexShrink:0,marginTop:1,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:8,color:T.accentColor,fontWeight:"bold",
                }}>{i+1}</div>
                <div style={{fontSize:11,color:T.text,lineHeight:1.7,flex:1}}>{line}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          display:"flex",gap:8,padding:"12px 20px 20px",
          borderTop:`1px solid ${T.border}`,
        }}>
          {page>0?(
            <button onClick={()=>setPage(p=>p-1)} style={{
              flex:1,padding:"10px",borderRadius:T.pixelated?0:8,cursor:"pointer",
              border:`1px solid ${T.btnBorder}`,background:"transparent",
              color:T.btnText,fontFamily:T.font,fontSize:10,letterSpacing:1,
            }}>← BACK</button>
          ):(
            <button onClick={onClose} style={{
              flex:1,padding:"10px",borderRadius:T.pixelated?0:8,cursor:"pointer",
              border:`1px solid ${T.btnBorder}`,background:"transparent",
              color:T.btnText,fontFamily:T.font,fontSize:10,letterSpacing:1,
            }}>SKIP →</button>
          )}
          <button onClick={()=>{if(isLast)onClose();else setPage(p=>p+1);}} style={{
            flex:2,padding:"10px",borderRadius:T.pixelated?0:8,cursor:"pointer",border:"none",
            background:isLast?`linear-gradient(135deg,${T.accentColor},${hexToRgba(T.accentColor,0.6)})`:`linear-gradient(135deg,${T.accentColor},${hexToRgba(T.accentColor,0.6)})`,
            color:"white",fontFamily:T.font,fontSize:10,fontWeight:"bold",letterSpacing:2,
            boxShadow:`0 0 20px ${hexToRgba(T.accentColor,0.4)}`,
          }}>{isLast?"LET'S PLAY! →":"NEXT →"}</button>
        </div>

        {/* Page count */}
        <div style={{textAlign:"center",fontSize:8,color:T.textFaint,paddingBottom:12,letterSpacing:1}}>
          {page+1} / {PAGES.length}
        </div>
      </div>
    </div>
  );
}

/* ─── UI atoms ─────────────────────────────────────── */
function Shell({children,wide=false,T}){
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"24px 16px",
      fontFamily:T.font,color:T.text,boxSizing:"border-box",overflow:"hidden"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        background:T.cardBg,border:`1px solid ${T.border}`,
        borderRadius:T.pixelated?0:16,padding:"28px 20px",width:"100%",maxWidth:wide?340:320,
        boxShadow:T.pixelated?`4px 4px 0 ${T.border}`:"0 0 60px rgba(0,0,0,0.8)"}}>
        {children}
      </div>
    </div>
  );
}
function Logo({name,T}){
  const parts=name.split(" ");
  return(
    <div style={{fontSize:T.pixelated?28:34,fontWeight:"bold",letterSpacing:6,lineHeight:1.1,
      textAlign:"center",marginBottom:6,
      background:T.pixelated?T.text:"linear-gradient(135deg,#FF4757,#5352ED,#2ED573,#FFD32A)",
      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
      {parts[0]}<br/>{parts.slice(1).join(" ")||""}
    </div>
  );
}
function Dim({children,T}){return <div style={{fontSize:8,letterSpacing:4,color:T.textDim,marginBottom:24}}>{children}</div>;}
function SLabel({children,T}){return <div style={{fontSize:9,letterSpacing:3,color:T.text,marginBottom:14}}>{children}</div>;}
function Badge({color,children,T}){
  return(
    <span style={{fontSize:7,letterSpacing:2,color,padding:"2px 7px",
      borderRadius:T?.pixelated?0:10,
      border:`1px solid ${hexToRgba(color,0.5)}`,background:hexToRgba(color,0.12),whiteSpace:"nowrap"}}>
      {children}
    </span>
  );
}
function NumBtn({onClick,children,T}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:80,height:80,borderRadius:T.pixelated?0:12,cursor:"pointer",
        border:`2px solid ${h?T.accentColor:T.border}`,background:"transparent",
        color:h?T.accentColor:T.textDim,fontSize:32,fontWeight:"bold",fontFamily:T.font,
        boxShadow:h?`0 0 20px ${hexToRgba(T.accentColor,0.45)}`:"none",transition:"all 0.2s"}}>{children}</button>
  );
}
function DiffBtn({color,label,onClick,children,noMargin=false,T}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:"100%",padding:"14px 16px",borderRadius:T?.pixelated?0:10,cursor:"pointer",
        marginBottom:noMargin?0:10,textAlign:"left",border:`2px solid ${color}`,
        background:h?hexToRgba(color,0.18):hexToRgba(color,0.08),
        boxShadow:h?`0 0 24px ${hexToRgba(color,0.35)}`:"none",
        transition:"all 0.2s",fontFamily:T?.font||"monospace"}}>
      <div style={{fontSize:12,fontWeight:"bold",letterSpacing:3,color,marginBottom:4,textShadow:`0 0 12px ${hexToRgba(color,0.5)}`}}>{label}</div>
      <div style={{fontSize:9,color,opacity:0.9,letterSpacing:1,lineHeight:1.8}}>{children}</div>
    </button>
  );
}
function ColorBtn({pc,taken,onClick,T}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} disabled={taken} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{height:56,borderRadius:T?.pixelated?0:10,cursor:taken?"not-allowed":"pointer",
        border:`2px solid ${taken?"#111":h?pc.hex:hexToRgba(pc.hex,0.4)}`,
        background:taken?"transparent":h?hexToRgba(pc.hex,0.25):hexToRgba(pc.hex,0.12),
        opacity:taken?0.2:1,transition:"all 0.15s",
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
function GhostButton({onClick,children,style={},T}){
  return(
    <button onClick={onClick} style={{padding:"9px 12px",borderRadius:T?.pixelated?0:8,cursor:"pointer",
      border:`1px solid ${T?.btnBorder||"#333"}`,background:"transparent",
      color:T?.btnText||"#aaa",fontFamily:T?.font||"monospace",fontSize:11,...style}}>
      {children}
    </button>
  );
}

const GLOBAL_CSS=`
  @import url('https:
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes ring-pulse    { 0% { transform:scale(1); opacity:0.7; } 70% { transform:scale(2.2); opacity:0; } 100% { transform:scale(2.2); opacity:0; } }
  @keyframes cell-flicker  { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
  @keyframes flash-ripple  { 0% { opacity:0.9; } 100% { opacity:0; } }
  @keyframes enclosed-burst{ 0% { opacity:0; } 20% { opacity:0.9; } 100% { opacity:0; } }
  @keyframes auto-burst    { 0% { opacity:0; } 15% { opacity:0.8; } 100% { opacity:0; } }
  @keyframes glow-pulse    { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
  @keyframes ai-spin       { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes terr-pulse    { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
  @keyframes combo-pop     { 0% { transform:translate(-50%,-50%) scale(0.5); opacity:0; } 30% { transform:translate(-50%,-50%) scale(1.2); opacity:1; } 70% { transform:translate(-50%,-50%) scale(1); opacity:1; } 100% { transform:translate(-50%,-50%) scale(1.1); opacity:0; } }
  .ring-pulse     { animation:ring-pulse     1.5s ease-out    infinite; }
  .cell-pulse     { animation:cell-flicker   0.9s ease-in-out infinite; }
  .enclosed-burst { animation:enclosed-burst 1.0s ease        forwards; }
  .auto-burst     { animation:auto-burst     0.8s ease        forwards; }
  .ai-thinking    { animation:ai-spin        1s   linear      infinite; display:inline-block; }
  .terr-border    { animation:terr-pulse     2s   ease-in-out infinite; }
  .combo-pop      { animation:combo-pop      1.8s ease        forwards; }
`;
