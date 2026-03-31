import { useState, useMemo, useCallback } from "react";

/* ─── Grid size options ──────────────────────────────── */
const GRID_SIZES = {
  small:  { bs: 12, label: "Small",  sub: "12 × 12" },
  medium: { bs: 17, label: "Medium", sub: "17 × 17" },
  large:  { bs: 22, label: "Large",  sub: "22 × 22" },
};

const MAX_ROUNDS = 30;
const NUM_COLORS = 12;

/* ─── Difficulty definitions ─────────────────────────── */
// cascade: "full"  → all same-colour groups touching any player territory join
//          "none"  → only the clicked connected group joins
const DIFFICULTIES = {
  easy:   { label:"Easy",   color:"#2ED573", board:"grouped", cascade:"full",
            desc:["Groups of 2–6 pixels, no singletons","All matching colour groups nearby chain together"] },
  normal: { label:"Normal", color:"#FFD32A", board:"grouped", cascade:"none",
            desc:["Groups of 2–6 pixels, no singletons","Only the clicked group joins — no chaining"] },
  hard:   { label:"Hard",   color:"#FF4757", board:"random",  cascade:"full",
            desc:["Fully random pixels, any group size","All matching colour groups nearby chain together"] },
};

/* ─── Board palette — 12 perceptually distinct colours ── */
const BOARD_PALETTE = [
  "#E8192C", // 0  Red
  "#FF7500", // 1  Orange
  "#F5D000", // 2  Yellow
  "#41C900", // 3  Lime
  "#00A86B", // 4  Jade
  "#00C8C8", // 5  Teal
  "#0078FF", // 6  Blue
  "#7B2FFF", // 7  Violet
  "#CC00CC", // 8  Magenta
  "#FF2B8A", // 9  Pink
  "#A0522D", // 10 Sienna
  "#9E9E9E", // 11 Grey
];

const COLOR_NAMES = [
  "Red","Orange","Yellow","Lime","Jade","Teal",
  "Blue","Violet","Magenta","Pink","Sienna","Grey",
];

// Player colours use the exact same hex values as BOARD_PALETTE entries
// so the chosen colour always matches neutral cells of that colour precisely
const PLAYER_COLORS = [
  { hex:"#E8192C", name:"Scarlet Fury"   },
  { hex:"#FF7500", name:"Orange Tigers"  },
  { hex:"#F5D000", name:"Yellow Thunder" },
  { hex:"#41C900", name:"Neon Vipers"    },
  { hex:"#00A86B", name:"Jade Dragons"   },
  { hex:"#00C8C8", name:"Cyan Storm"     },
  { hex:"#0078FF", name:"Azure Knights"  },
  { hex:"#7B2FFF", name:"Amethyst Power" },
];

function hexToRgba(hex, a) {
  const r=parseInt(hex.slice(1,3),16);
  const g=parseInt(hex.slice(3,5),16);
  const b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─── Board generators (BS passed as arg) ─────────────── */
function mkBoardRandom(BS) {
  return Array.from({length:BS},()=>
    Array.from({length:BS},()=>Math.floor(Math.random()*NUM_COLORS))
  );
}

function mkBoardGrouped(BS) {
  const grid   = Array.from({length:BS},()=>Array(BS).fill(-1));
  const placed = Array.from({length:BS},()=>Array(BS).fill(false));

  function nbrs(r,c){
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
      .filter(([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS);
  }
  function shuffle(a){
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  for(const [sr,sc] of shuffle(Array.from({length:BS*BS},(_,k)=>[Math.floor(k/BS),k%BS]))){
    if(placed[sr][sc]) continue;
    const color=Math.floor(Math.random()*NUM_COLORS);
    const size=2+Math.floor(Math.random()*5);
    const region=[[sr,sc]];
    placed[sr][sc]=true; grid[sr][sc]=color;
    while(region.length<size){
      const frontier=[];
      for(const [r,c] of region)
        for(const [nr,nc] of nbrs(r,c))
          if(!placed[nr][nc]) frontier.push([nr,nc]);
      if(!frontier.length) break;
      const [nr,nc]=frontier[Math.floor(Math.random()*frontier.length)];
      if(placed[nr][nc]) continue;
      placed[nr][nc]=true; grid[nr][nc]=color; region.push([nr,nc]);
    }
  }
  // Eliminate singletons
  for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
    const col=grid[r][c];
    const ns=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS);
    if(!ns.some(([nr,nc])=>grid[nr][nc]===col) && ns.length)
      grid[r][c]=grid[ns[0][0]][ns[0][1]];
  }
  return grid;
}

/* ─── Game logic helpers ─────────────────────────────── */

function floodFillGroup(board, ownership, r0, c0, BS) {
  if(r0<0||r0>=BS||c0<0||c0>=BS||ownership[r0][c0]!==-1) return [];
  const color=board[r0][c0];
  const seen=new Set(), q=[[r0,c0]], cells=[];
  while(q.length){
    const[r,c]=q.pop(), k=r*BS+c;
    if(seen.has(k)) continue;
    if(r<0||r>=BS||c<0||c>=BS) continue;
    if(board[r][c]!==color||ownership[r][c]!==-1) continue;
    seen.add(k); cells.push([r,c]);
    q.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);
  }
  return cells;
}

function playerAdjacent(o, r, c, p, BS){
  return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(
    ([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS&&o[nr][nc]===p
  );
}

/*
  captureGroup: captures the clicked group only (Normal mode).
*/
function captureGroup(board, ownership, playerIdx, r0, c0, BS) {
  const o=ownership.map(row=>[...row]);
  const capturedKeys=new Set();
  const cells=floodFillGroup(board,o,r0,c0,BS);
  for(const [r,c] of cells){ o[r][c]=playerIdx; capturedKeys.add(r*BS+c); }
  return { newOwnership:o, captured:capturedKeys };
}

/*
  cascadeCapture: captures clicked group then repeatedly sweeps the board for any
  unclaimed same-colour cell touching any of the player's territory, absorbing those
  groups too. Repeats until stable. (Easy + Hard mode.)
*/
function cascadeCapture(board, ownership, playerIdx, r0, c0, BS) {
  const clickedColor=board[r0][c0];
  const o=ownership.map(row=>[...row]);
  const capturedKeys=new Set();

  // Seed
  for(const [r,c] of floodFillGroup(board,o,r0,c0,BS)){ o[r][c]=playerIdx; capturedKeys.add(r*BS+c); }

  // Sweep until stable
  function sweep(){
    let found=false;
    const seeded=new Set();
    for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
      if(o[r][c]!==-1||board[r][c]!==clickedColor) continue;
      const k=r*BS+c;
      if(seeded.has(k)) continue;
      if(!playerAdjacent(o,r,c,playerIdx,BS)) continue;
      for(const [r2,c2] of floodFillGroup(board,o,r,c,BS)){
        o[r2][c2]=playerIdx; capturedKeys.add(r2*BS+c2); seeded.add(r2*BS+c2); found=true;
      }
    }
    return found;
  }
  while(sweep()){}
  return { newOwnership:o, captured:capturedKeys };
}

// Preview — mirrors capture logic without mutating state
function previewCapture(board, ownership, playerIdx, r0, c0, cascadeMode, BS){
  if(ownership[r0][c0]!==-1) return new Set();
  const clickedColor=board[r0][c0];
  const o=ownership.map(row=>[...row]);
  const keys=new Set();

  for(const [r,c] of floodFillGroup(board,o,r0,c0,BS)){ o[r][c]=playerIdx; keys.add(r*BS+c); }

  if(cascadeMode==="full"){
    function sweep(){
      let found=false;
      const seeded=new Set();
      for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
        if(o[r][c]!==-1||board[r][c]!==clickedColor) continue;
        const k=r*BS+c;
        if(seeded.has(k)||!playerAdjacent(o,r,c,playerIdx,BS)) continue;
        for(const [r2,c2] of floodFillGroup(board,o,r,c,BS)){
          o[r2][c2]=playerIdx; keys.add(r2*BS+c2); seeded.add(r2*BS+c2); found=true;
        }
      }
      return found;
    }
    while(sweep()){}
  }
  return keys;
}

function isAdjacentToPlayer(ownership,r,c,p,BS){
  return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(
    ([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS&&ownership[nr][nc]===p
  );
}

/* ─── Main component ────────────────────────────────── */
export default function PixelWars(){
  const[phase,setPhase]               =useState("numSelect");
  const[numPlayers,setNumPlayers]     =useState(2);
  const[difficulty,setDifficulty]     =useState(null);
  const[gridSize,setGridSize]         =useState(null);   // "small"|"medium"|"large"
  const[playerDefs,setPlayerDefs]     =useState([]);
  const[setupIdx,setSetupIdx]         =useState(0);
  const[pendingColor,setPendingColor] =useState(null);
  const[sharedBoard,setSharedBoard]   =useState(null);

  const[board,setBoard]           =useState(null);
  const[ownership,setOwnership]   =useState(null);
  const[cp,setCp]                 =useState(0);
  const[round,setRound]           =useState(1);
  const[captureCount,setCaptureCount]=useState(0);
  const[hovered,setHovered]       =useState(null);
  const[flash,setFlash]           =useState(null);

  // Derived constants from current game settings
  const BS   = gridSize ? GRID_SIZES[gridSize].bs : 22;
  const diff = difficulty ? DIFFICULTIES[difficulty] : null;

  const takenColors=playerDefs.map(p=>p.hex);
  const takenCells=new Set(playerDefs.map(p=>p.row*BS+p.col));

  const scores=useMemo(()=>{
    if(!ownership) return Array(4).fill(0);
    const c=Array(4).fill(0);
    for(let r=0;r<BS;r++) for(let col=0;col<BS;col++){
      const v=ownership[r][col]; if(v>=0) c[v]++;
    }
    return c;
  },[ownership,BS]);

  const TOTAL=BS*BS;
  const claimed=scores.slice(0,numPlayers).reduce((a,b)=>a+b,0);

  // Clickable cells — either adjacent to territory OR matching player's own colour (anywhere)
  const clickableCells=useMemo(()=>{
    if(phase!=="playing"||captureCount>0||!ownership||!board||!playerDefs.length) return new Set();
    const myColorIdx=BOARD_PALETTE.indexOf(playerDefs[cp].hex);
    const s=new Set();
    for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
      if(ownership[r][c]!==-1) continue;
      if(isAdjacentToPlayer(ownership,r,c,cp,BS)){ s.add(r*BS+c); continue; }
      if(myColorIdx>=0&&board[r][c]===myColorIdx) s.add(r*BS+c);
    }
    return s;
  },[phase,ownership,cp,board,playerDefs,captureCount,BS]);

  const previewCells=useMemo(()=>{
    if(!hovered||!board||!ownership||phase!=="playing"||!diff) return new Set();
    const[r,c]=hovered;
    if(!clickableCells.has(r*BS+c)) return new Set();
    return previewCapture(board,ownership,cp,r,c,diff.cascade,BS);
  },[hovered,board,ownership,clickableCells,cp,phase,diff,BS]);

  const topPlayer=useMemo(()=>{
    let max=-1,top=0;
    for(let i=0;i<numPlayers;i++) if(scores[i]>max){max=scores[i];top=i;}
    return top;
  },[scores,numPlayers]);

  /* ── Setup transitions ── */
  const goToDifficulty=useCallback((n)=>{setNumPlayers(n);setPhase("difficulty");},[]);
  const goToGridSize=useCallback((d)=>{setDifficulty(d);setPhase("gridSize");},[]);

  const goToColorPick=useCallback((gs)=>{
    setGridSize(gs);
    const bs=GRID_SIZES[gs].bs;
    const d=difficulty;
    setPlayerDefs([]);setSetupIdx(0);setPendingColor(null);
    setSharedBoard(DIFFICULTIES[d].board==="grouped"?mkBoardGrouped(bs):mkBoardRandom(bs));
    setPhase("playerSetup");
  },[difficulty]);

  const pickColor=useCallback((colorObj)=>{
    if(takenColors.includes(colorObj.hex)) return;
    setPendingColor(colorObj);
  },[takenColors]);

  const pickPosition=useCallback((r,c)=>{
    if(!pendingColor||takenCells.has(r*BS+c)) return;
    const newDefs=[...playerDefs,{...pendingColor,row:r,col:c}];
    setPlayerDefs(newDefs);setPendingColor(null);
    if(newDefs.length===numPlayers){
      const o=Array.from({length:BS},()=>Array(BS).fill(-1));
      newDefs.forEach((def,i)=>{o[def.row][def.col]=i;});
      setBoard(sharedBoard);setOwnership(o);
      setCp(0);setRound(1);setCaptureCount(0);setHovered(null);setFlash(null);
      setPhase("playing");
    } else setSetupIdx(newDefs.length);
  },[pendingColor,playerDefs,numPlayers,sharedBoard,takenCells,BS]);

  const handleBoardClick=useCallback((r,c)=>{
    if(phase==="playerSetup"){pickPosition(r,c);return;}
    if(phase!=="playing") return;
    if(!clickableCells.has(r*BS+c)) return;

    const doCapture = diff.cascade==="full" ? cascadeCapture : captureGroup;
    const{newOwnership,captured}=doCapture(board,ownership,cp,r,c,BS);
    setOwnership(newOwnership);
    setCaptureCount(n=>n+1);
    setFlash(captured);
    setTimeout(()=>setFlash(null),600);
    if(newOwnership.flat().every(v=>v>=0)) setPhase("gameover");
  },[phase,clickableCells,board,ownership,cp,diff,BS,pickPosition]);

  const endTurn=useCallback(()=>{
    if(phase!=="playing") return;
    const next=(cp+1)%numPlayers;
    let newRound=round;
    if(next===0){
      newRound++;
      if(newRound>MAX_ROUNDS){setPhase("gameover");return;}
      setRound(newRound);
    }
    setCp(next);setCaptureCount(0);setHovered(null);
  },[phase,cp,numPlayers,round]);

  const resetToMenu=()=>{
    setPhase("numSelect");setPlayerDefs([]);setSetupIdx(0);
    setPendingColor(null);setSharedBoard(null);setBoard(null);setOwnership(null);
    setDifficulty(null);setGridSize(null);setCaptureCount(0);
  };

  /* ════ NUM SELECT ════ */
  if(phase==="numSelect") return(
    <Shell>
      <Logo/>
      <Dim>COLOUR TERRITORY BATTLE</Dim>
      <SLabel>HOW MANY PLAYERS?</SLabel>
      <div style={{display:"flex",gap:12,marginBottom:32}}>
        {[1,2,4].map(n=><NumBtn key={n} onClick={()=>goToDifficulty(n)}>{n}</NumBtn>)}
      </div>
      <div style={{color:"#1e1e3a",fontSize:9,letterSpacing:1,textAlign:"center",lineHeight:2.4}}>
        CLICK NEUTRAL CELLS TO CLAIM TERRITORY<br/>
        YOUR COLOUR IS CLICKABLE ANYWHERE<br/>
        {MAX_ROUNDS} ROUNDS · MOST CELLS WINS
      </div>
    </Shell>
  );

  /* ════ DIFFICULTY ════ */
  if(phase==="difficulty") return(
    <Shell>
      <Logo/>
      <SLabel>{numPlayers} PLAYER{numPlayers>1?"S":""} · CHOOSE DIFFICULTY</SLabel>
      {Object.entries(DIFFICULTIES).map(([key,d])=>(
        <DiffBtn key={key} color={d.color} label={d.label} onClick={()=>goToGridSize(key)}>
          {d.desc[0]}<br/>{d.desc[1]}
        </DiffBtn>
      ))}
      <GhostButton onClick={()=>setPhase("numSelect")}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ GRID SIZE ════ */
  if(phase==="gridSize") return(
    <Shell>
      <Logo/>
      <SLabel>CHOOSE GRID SIZE</SLabel>
      {Object.entries(GRID_SIZES).map(([key,gs])=>(
        <button key={key} onClick={()=>goToColorPick(key)}
          style={{
            width:"100%",padding:"16px 20px",borderRadius:10,cursor:"pointer",
            marginBottom:10,textAlign:"left",border:`2px solid ${DIFFICULTIES[difficulty].color}`,
            background:hexToRgba(DIFFICULTIES[difficulty].color,0.07),
            transition:"all 0.2s",fontFamily:"'Space Mono',monospace",
          }}
          onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(DIFFICULTIES[difficulty].color,0.18);e.currentTarget.style.boxShadow=`0 0 20px ${hexToRgba(DIFFICULTIES[difficulty].color,0.3)}`;}}
          onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(DIFFICULTIES[difficulty].color,0.07);e.currentTarget.style.boxShadow="none";}}
        >
          <div style={{fontSize:13,fontWeight:"bold",letterSpacing:3,
            color:DIFFICULTIES[difficulty].color,marginBottom:4}}>{gs.label.toUpperCase()}</div>
          <div style={{fontSize:9,color:DIFFICULTIES[difficulty].color,opacity:0.55,letterSpacing:1}}>
            {gs.sub} · {gs.bs*gs.bs} cells
          </div>
        </button>
      ))}
      <GhostButton onClick={()=>setPhase("difficulty")}>← BACK</GhostButton>
    </Shell>
  );

  /* ════ PLAYER SETUP ════ */
  if(phase==="playerSetup"){
    const pickingPos=!!pendingColor;
    const diffColor=diff.color;
    return(
      <Shell wide={pickingPos}>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {Array.from({length:numPlayers},(_,i)=>(
            <div key={i} style={{
              width:32,height:5,borderRadius:3,
              background:i<setupIdx?(playerDefs[i]?.hex||"#333"):i===setupIdx?"#eee":"#1a1a2e",
              transition:"background 0.3s"
            }}/>
          ))}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <Badge color={diffColor}>{difficulty.toUpperCase()}</Badge>
          <Badge color={diffColor}>{GRID_SIZES[gridSize].label.toUpperCase()}</Badge>
        </div>
        <div style={{fontSize:9,letterSpacing:3,color:"#555",marginBottom:4}}>
          PLAYER {setupIdx+1} OF {numPlayers}
        </div>
        <div style={{
          fontSize:17,fontWeight:"bold",letterSpacing:2,marginBottom:20,
          color:pendingColor?pendingColor.hex:"#eee",
          textShadow:pendingColor?`0 0 20px ${hexToRgba(pendingColor.hex,0.6)}`:"none",
          transition:"all 0.3s",minHeight:26,textAlign:"center"
        }}>
          {pickingPos?`${pendingColor.name.toUpperCase()} — PICK YOUR START`:"CHOOSE YOUR COLOUR"}
        </div>
        {!pickingPos&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20,width:"100%",maxWidth:272}}>
            {PLAYER_COLORS.map(pc=>(
              <ColorBtn key={pc.hex} pc={pc} taken={takenColors.includes(pc.hex)} onClick={()=>pickColor(pc)}/>
            ))}
          </div>
        )}
        {pickingPos&&(
          <>
            <MiniBoard board={sharedBoard} playerDefs={playerDefs} takenCells={takenCells}
              curColor={pendingColor} onPick={pickPosition} BS={BS}/>
            <div style={{marginTop:8,fontSize:9,color:"#2a2a4a",letterSpacing:1,textAlign:"center"}}>
              CLICK ANY CELL TO PLACE YOUR START
            </div>
          </>
        )}
        {playerDefs.length>0&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:16}}>
            {playerDefs.map((def,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,
                padding:"4px 10px",borderRadius:20,
                background:hexToRgba(def.hex,0.12),border:`1px solid ${hexToRgba(def.hex,0.35)}`}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:def.hex,boxShadow:`0 0 5px ${def.hex}`}}/>
                <span style={{fontSize:9,color:def.hex,letterSpacing:1}}>{def.name}</span>
              </div>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  /* ════ GAME OVER ════ */
  if(phase==="gameover"){
    const winner=playerDefs[topPlayer];
    return(
      <Shell>
        <div style={{fontSize:9,letterSpacing:4,color:"#333",marginBottom:12}}>GAME OVER</div>
        {numPlayers===1?(
          <>
            <div style={{fontSize:48,marginBottom:8}}>
              {scores[0]===TOTAL?"🏆":scores[0]>TOTAL*0.7?"⭐":"😤"}
            </div>
            <div style={{color:playerDefs[0].hex,fontSize:24,fontWeight:"bold",marginBottom:4}}>
              {scores[0]}/{TOTAL}
            </div>
            <div style={{color:"#333",fontSize:11,marginBottom:28}}>
              {Math.round(scores[0]/TOTAL*100)}% captured
            </div>
          </>
        ):(
          <>
            <div style={{fontSize:9,letterSpacing:4,color:"#444",marginBottom:6}}>WINNER</div>
            <div style={{fontSize:28,fontWeight:"bold",marginBottom:6,
              color:winner.hex,textShadow:`0 0 28px ${hexToRgba(winner.hex,0.7)}`}}>{winner.name}</div>
            <div style={{color:"#333",fontSize:10,marginBottom:24}}>P{topPlayer+1} · {scores[topPlayer]} CELLS</div>
          </>
        )}
        <div style={{width:"100%",maxWidth:260,marginBottom:24}}>
          {Array.from({length:numPlayers},(_,i)=>{
            const def=playerDefs[i];
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:def.hex,
                  boxShadow:`0 0 6px ${def.hex}`,flexShrink:0}}/>
                <span style={{flex:1,color:"#666",fontSize:11}}>{def.name}</span>
                <span style={{fontWeight:"bold",fontSize:15,
                  color:i===topPlayer&&numPlayers>1?def.hex:"#ccc"}}>{scores[i]}</span>
                <div style={{width:64,height:3,background:"#111",borderRadius:2}}>
                  <div style={{height:"100%",borderRadius:2,background:def.hex,
                    width:`${(scores[i]/TOTAL)*100}%`,boxShadow:`0 0 5px ${def.hex}`,transition:"width 0.4s"}}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:10}}>
          <GlowButton hex={playerDefs[0].hex} onClick={()=>goToColorPick(gridSize)}>PLAY AGAIN</GlowButton>
          <GhostButton onClick={resetToMenu}>MENU</GhostButton>
        </div>
      </Shell>
    );
  }

  /* ════ PLAYING ════ */
  const curDef=playerDefs[cp];
  const curHex=curDef.hex;
  const curGlow=hexToRgba(curHex,0.5);
  const curDim=hexToRgba(curHex,0.15);
  const hasCaptured=captureCount>0;
  const hoverColourName=hovered&&previewCells.size>0?COLOR_NAMES[board[hovered[0]][hovered[1]]]:null;

  return(
    <div style={{
      minHeight:"100vh",background:"#080812",
      display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",
      padding:"12px 10px",fontFamily:"'Space Mono',monospace",
      color:"white",boxSizing:"border-box",
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Turn banner ── */}
      <div style={{
        width:"100%",maxWidth:380,marginBottom:10,borderRadius:10,
        background:curDim,border:`2px solid ${hexToRgba(curHex,0.55)}`,
        boxShadow:`0 0 32px ${hexToRgba(curHex,0.35)}, inset 0 0 24px ${hexToRgba(curHex,0.07)}`,
        padding:"12px 16px",display:"flex",alignItems:"center",gap:12,
        transition:"all 0.35s ease",
      }}>
        <div style={{flexShrink:0,position:"relative",width:20,height:20}}>
          <div className="ring-pulse" style={{position:"absolute",inset:-5,borderRadius:"50%",border:`2px solid ${curHex}`}}/>
          <div style={{width:20,height:20,borderRadius:"50%",background:curHex,boxShadow:`0 0 14px ${curGlow}`}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{color:curHex,fontWeight:"bold",fontSize:16,letterSpacing:2,
            textShadow:`0 0 14px ${curGlow}`,lineHeight:1.1}}>{curDef.name.toUpperCase()}</div>
          <div style={{color:hexToRgba(curHex,0.45),fontSize:9,letterSpacing:1,marginTop:3}}>
            {hoverColourName
              ? `CAPTURE ${hoverColourName.toUpperCase()} → ${previewCells.size} CELLS`
              : hasCaptured
                ? "CAPTURED — PRESS END TURN"
                : difficulty==="easy"?`PLAYER ${cp+1} · ${scores[cp]} CELLS`:`PLAYER ${cp+1}`}
          </div>
        </div>
        <div style={{textAlign:"right",minWidth:60}}>
          {previewCells.size>0?(
            <>
              <div style={{color:curHex,fontWeight:"bold",fontSize:22,lineHeight:1,
                textShadow:`0 0 12px ${curGlow}`}}>{previewCells.size}</div>
              <div style={{color:hexToRgba(curHex,0.5),fontSize:9,letterSpacing:1}}>CELLS</div>
            </>
          ):hasCaptured?(
            <div style={{color:hexToRgba(curHex,0.5),fontSize:9,letterSpacing:1,lineHeight:1.8}}>
              {scores[cp]}<br/>CELLS
            </div>
          ):(
            <div style={{color:"#2a2a4a",fontSize:9,letterSpacing:1,lineHeight:1.8}}>
              CLICK A<br/>BORDER<br/>CELL
            </div>
          )}
        </div>
      </div>

      {/* ── Round / info bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:6,width:"100%",maxWidth:380,marginBottom:8}}>
        <Badge color={diff.color}>{difficulty.toUpperCase()}</Badge>
        <Badge color={diff.color}>{GRID_SIZES[gridSize].label.toUpperCase()}</Badge>
        <span style={{color:"#1e1e3a",fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>RND {round}/{MAX_ROUNDS}</span>
        <div style={{flex:1,height:2,background:"#0d0d1a",borderRadius:1}}>
          <div style={{height:"100%",borderRadius:1,
            background:`linear-gradient(90deg,${playerDefs[0].hex},${playerDefs[numPlayers-1].hex})`,
            width:`${(round/MAX_ROUNDS)*100}%`,transition:"width 0.4s"}}/>
        </div>
        {difficulty==="easy"&&<span style={{color:"#1e1e3a",fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>{Math.round(claimed/TOTAL*100)}%</span>}
      </div>

      {/* ── Board ── */}
      <div
        onMouseLeave={()=>setHovered(null)}
        style={{
          display:"grid",
          gridTemplateColumns:`repeat(${BS},1fr)`,
          gridTemplateRows:`repeat(${BS},1fr)`,
          gap:2,
          background:"#111",
          padding:3,
          borderRadius:8,
          border:`3px solid ${hexToRgba(curHex,0.55)}`,
          boxShadow:`0 0 40px ${hexToRgba(curHex,0.35)}, 0 0 80px rgba(0,0,0,0.8)`,
          width:"min(92vw,368px)",height:"min(92vw,368px)",
          marginBottom:10,boxSizing:"border-box",
          transition:"border-color 0.35s, box-shadow 0.35s",
        }}
      >
        {Array.from({length:BS*BS},(_,k)=>{
          const r=Math.floor(k/BS),c=k%BS;
          const owner=ownership[r][c];
          const isOwned=owner>=0;
          const isClickable=clickableCells.has(k);
          const isPrev=previewCells.has(k);
          const isFlash=flash&&flash.has(k);

          const bgColor=isOwned?playerDefs[owner].hex:BOARD_PALETTE[board[r][c]];
          const cellFilter=isOwned?"none":"saturate(0.28) brightness(0.72)";

          return(
            <div key={k}
              onClick={()=>handleBoardClick(r,c)}
              onMouseEnter={()=>setHovered([r,c])}
              style={{background:bgColor,position:"relative",
                cursor:isClickable?"pointer":"default",filter:cellFilter}}
            >
              {isPrev&&(
                <div style={{position:"absolute",inset:0,
                  background:hexToRgba(curHex,0.68),
                  border:`2px solid ${curHex}`,
                  boxSizing:"border-box",pointerEvents:"none"}}/>
              )}
              {isClickable&&!isPrev&&(
                <div className="cell-pulse" style={{position:"absolute",inset:0,
                  border:`2px solid ${curHex}`,
                  boxSizing:"border-box",pointerEvents:"none"}}/>
              )}
              {isFlash&&(
                <div className="flash-burst" style={{position:"absolute",inset:0,
                  background:"white",pointerEvents:"none"}}/>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Score cards ── */}
      {/* Easy shows full scores + bars; Normal/Hard hide numbers to keep tension */}
      <div style={{display:"flex",gap:6,width:"100%",maxWidth:380,marginBottom:10}}>
        {Array.from({length:numPlayers},(_,i)=>{
          const def=playerDefs[i],isCur=i===cp;
          const showScore=difficulty==="easy";
          return(
            <div key={i} style={{
              flex:1,background:isCur?hexToRgba(def.hex,0.15):"#0d0d1a",
              border:`1px solid ${isCur?hexToRgba(def.hex,0.6):"#0d0d1a"}`,
              borderRadius:8,padding:"7px 5px",textAlign:"center",
              boxShadow:isCur?`0 0 18px ${hexToRgba(def.hex,0.35)}`:"none",
              transition:"all 0.3s",
            }}>
              <div style={{width:10,height:10,borderRadius:"50%",background:def.hex,
                margin:"0 auto 4px",boxShadow:`0 0 ${isCur?12:4}px ${def.hex}`}}/>
              {showScore
                ? <div style={{fontSize:18,fontWeight:"bold",color:isCur?def.hex:"#888",lineHeight:1}}>{scores[i]}</div>
                : <div style={{fontSize:9,color:isCur?def.hex:"#333",lineHeight:1}}>{"▓".repeat(Math.min(5,Math.ceil(scores[i]/TOTAL*5)))}</div>
              }
              <div style={{fontSize:6,color:isCur?hexToRgba(def.hex,0.7):"#2a2a4a",letterSpacing:0.5,margin:"3px 0 4px"}}>
                {def.name.toUpperCase()}
              </div>
              {showScore&&(
                <div style={{height:2,background:"#111",borderRadius:1,margin:"0 4px"}}>
                  <div style={{height:"100%",borderRadius:2,background:def.hex,
                    width:`${(scores[i]/TOTAL)*100}%`,boxShadow:`0 0 4px ${def.hex}`,transition:"width 0.4s"}}/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── End turn ── */}
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <button onClick={endTurn} style={{
          padding:"11px 24px",borderRadius:8,cursor:"pointer",
          border:`2px solid ${hasCaptured?curHex:hexToRgba(curHex,0.2)}`,
          background:hasCaptured?curDim:"transparent",
          color:hasCaptured?curHex:"#2a2a4a",
          fontFamily:"'Space Mono',monospace",
          fontSize:11,fontWeight:"bold",letterSpacing:2,
          boxShadow:hasCaptured?`0 0 22px ${curGlow}`:"none",
          transition:"all 0.2s"
        }}>END TURN →</button>
        <GhostButton onClick={resetToMenu} style={{padding:"11px 14px"}}>☰</GhostButton>
      </div>

      {clickableCells.size===0&&(
        <div style={{marginTop:8,color:"#333",fontSize:9,letterSpacing:1}}>
          NO MOVES AVAILABLE — END TURN
        </div>
      )}
    </div>
  );
}

/* ─── Mini board ─────────────────────────────────────── */
function MiniBoard({board,playerDefs,takenCells,curColor,onPick,BS}){
  const[hov,setHov]=useState(null);
  const SIZE=Math.min(typeof window!=="undefined"?window.innerWidth*0.82:280,300);
  return(
    <div onMouseLeave={()=>setHov(null)} style={{
      display:"grid",gridTemplateColumns:`repeat(${BS},1fr)`,
      gridTemplateRows:`repeat(${BS},1fr)`,
      gap:2,background:"#111",padding:2,borderRadius:8,
      border:`2px solid ${hexToRgba(curColor.hex,0.6)}`,
      boxShadow:`0 0 24px ${hexToRgba(curColor.hex,0.4)}`,
      width:SIZE,height:SIZE,cursor:"crosshair",
    }}>
      {Array.from({length:BS*BS},(_,k)=>{
        const r=Math.floor(k/BS),c=k%BS;
        const taken=takenCells.has(k);
        const isHov=hov===k;
        const existingDef=playerDefs.findIndex(d=>d.row===r&&d.col===c);
        return(
          <div key={k} onClick={()=>{if(!taken) onPick(r,c);}} onMouseEnter={()=>setHov(k)}
            style={{background:existingDef>=0?playerDefs[existingDef].hex:BOARD_PALETTE[board[r][c]],
              position:"relative",cursor:taken?"not-allowed":"crosshair",
              filter:existingDef>=0?"none":"saturate(0.28) brightness(0.72)"}}>
            {existingDef>=0&&(
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:"white",boxShadow:"0 0 3px black"}}/>
              </div>
            )}
            {!taken&&isHov&&(
              <div style={{position:"absolute",inset:0,filter:"none",
                background:hexToRgba(curColor.hex,0.7),
                border:`2px solid ${curColor.hex}`,boxSizing:"border-box"}}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── UI atoms ───────────────────────────────────────── */
function Shell({children,wide=false}){
  return(
    <div style={{minHeight:"100vh",background:"#080812",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"24px 16px",
      fontFamily:"'Space Mono',monospace",color:"white",boxSizing:"border-box"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",
        background:"#0d0d1a",border:"1px solid #1a1a2e",borderRadius:16,
        padding:"28px 20px",width:"100%",maxWidth:wide?340:320,
        boxShadow:"0 0 60px rgba(0,0,0,0.8)"}}>
        {children}
      </div>
    </div>
  );
}
function Logo(){
  return(
    <div style={{fontSize:34,fontWeight:"bold",letterSpacing:6,lineHeight:1.1,
      textAlign:"center",marginBottom:6,
      background:"linear-gradient(135deg,#FF4757,#5352ED,#2ED573,#FFD32A)",
      WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
      PIXEL<br/>WARS
    </div>
  );
}
function Dim({children}){return <div style={{fontSize:8,letterSpacing:4,color:"#2a2a4a",marginBottom:32}}>{children}</div>;}
function SLabel({children}){return <div style={{fontSize:9,letterSpacing:3,color:"#444",marginBottom:16}}>{children}</div>;}
function Badge({color,children}){
  return(
    <span style={{fontSize:7,letterSpacing:2,color,padding:"2px 7px",borderRadius:10,
      border:`1px solid ${hexToRgba(color,0.35)}`,background:hexToRgba(color,0.08),whiteSpace:"nowrap"}}>
      {children}
    </span>
  );
}
function NumBtn({onClick,children}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:80,height:80,borderRadius:12,cursor:"pointer",
        border:`2px solid ${h?"#A29BFE":"#1a1a2e"}`,background:"transparent",
        color:h?"#A29BFE":"#444",fontSize:32,fontWeight:"bold",
        fontFamily:"'Space Mono',monospace",
        boxShadow:h?"0 0 20px rgba(162,155,254,0.45)":"none",transition:"all 0.2s"}}>{children}</button>
  );
}
function DiffBtn({color,label,onClick,children}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:"100%",padding:"16px 16px",borderRadius:10,cursor:"pointer",
        marginBottom:10,textAlign:"left",border:`2px solid ${color}`,
        background:h?hexToRgba(color,0.18):hexToRgba(color,0.08),
        boxShadow:h?`0 0 24px ${hexToRgba(color,0.35)}`:"none",
        transition:"all 0.2s",fontFamily:"'Space Mono',monospace"}}>
      <div style={{fontSize:13,fontWeight:"bold",letterSpacing:3,color,marginBottom:5,
        textShadow:`0 0 12px ${hexToRgba(color,0.5)}`}}>{label}</div>
      <div style={{fontSize:9,color,opacity:0.6,letterSpacing:1,lineHeight:1.8}}>{children}</div>
    </button>
  );
}
function ColorBtn({pc,taken,onClick}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} disabled={taken} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{height:56,borderRadius:10,cursor:taken?"not-allowed":"pointer",
        border:`2px solid ${taken?"#111":h?pc.hex:hexToRgba(pc.hex,0.4)}`,
        background:taken?"#0a0a16":h?hexToRgba(pc.hex,0.25):hexToRgba(pc.hex,0.12),
        opacity:taken?0.2:1,transition:"all 0.15s",
        boxShadow:h&&!taken?`0 0 18px ${hexToRgba(pc.hex,0.55)}`:"none"}}>
      <div style={{width:22,height:22,borderRadius:"50%",background:taken?"#1a1a2e":pc.hex,
        margin:"0 auto 4px",boxShadow:taken?"none":`0 0 10px ${hexToRgba(pc.hex,0.7)}`}}/>
      <div style={{fontSize:7,color:taken?"#1a1a2e":pc.hex,letterSpacing:1}}>{pc.name.toUpperCase()}</div>
    </button>
  );
}
function GlowButton({hex,onClick,children}){
  return(
    <button onClick={onClick} style={{padding:"11px 20px",borderRadius:8,border:"none",cursor:"pointer",
      background:`linear-gradient(135deg,${hex},${hexToRgba(hex,0.6)})`,
      color:"white",fontSize:11,fontWeight:"bold",letterSpacing:2,
      fontFamily:"'Space Mono',monospace",boxShadow:`0 0 20px ${hexToRgba(hex,0.4)}`}}>
      {children}
    </button>
  );
}
function GhostButton({onClick,children,style={}}){
  return(
    <button onClick={onClick} style={{padding:"11px 14px",borderRadius:8,cursor:"pointer",
      border:"1px solid #1a1a2e",background:"transparent",
      color:"#2a2a4a",fontFamily:"'Space Mono',monospace",fontSize:12,...style}}>
      {children}
    </button>
  );
}

const GLOBAL_CSS=`
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes ring-pulse {
    0%   { transform:scale(1);   opacity:0.7; }
    70%  { transform:scale(2.2); opacity:0;   }
    100% { transform:scale(2.2); opacity:0;   }
  }
  @keyframes cell-flicker {
    0%,100% { opacity:1;   }
    50%      { opacity:0.2; }
  }
  @keyframes flash-burst {
    0%   { opacity:0.85; }
    100% { opacity:0;    }
  }
  .ring-pulse  { animation:ring-pulse  1.5s ease-out infinite; }
  .cell-pulse  { animation:cell-flicker 0.9s ease-in-out infinite; }
  .flash-burst { animation:flash-burst 0.7s ease forwards; }
`;
