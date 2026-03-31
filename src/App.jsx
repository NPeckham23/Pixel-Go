import { useState, useMemo, useCallback } from "react";

/* ─── Grid sizes ─────────────────────────────────────── */
const GRID_SIZES = {
  small:  { bs:12, label:"Small",  sub:"12 × 12" },
  medium: { bs:17, label:"Medium", sub:"17 × 17" },
  large:  { bs:22, label:"Large",  sub:"22 × 22" },
};

const MAX_ROUNDS = 30;
const NUM_COLORS = 12;

/* ─── Difficulty ─────────────────────────────────────── */
const DIFFICULTIES = {
  easy:   { label:"Easy",   color:"#2ED573", board:"grouped", cascade:"full",
            desc:["Groups of 2–6 pixels, no singletons","All matching colour groups nearby chain together"] },
  normal: { label:"Normal", color:"#FFD32A", board:"grouped", cascade:"none",
            desc:["Groups of 2–6 pixels, no singletons","Only the clicked group joins — no chaining"] },
  hard:   { label:"Hard",   color:"#FF4757", board:"random",  cascade:"full",
            desc:["Fully random pixels, any group size","All matching colour groups nearby chain together"] },
};

/* ─── Palettes ───────────────────────────────────────── */
const BOARD_PALETTE = [
  "#E8192C","#FF7500","#F5D000","#41C900",
  "#00A86B","#00C8C8","#0078FF","#7B2FFF",
  "#CC00CC","#FF2B8A","#A0522D","#9E9E9E",
];
const COLOR_NAMES = [
  "Red","Orange","Yellow","Lime","Jade","Teal",
  "Blue","Violet","Magenta","Pink","Sienna","Grey",
];
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

/* ─── Board generators ───────────────────────────────── */
function equalizeBoard(board, BS) {
  const flat=board.flat();
  const perColor=Math.floor(flat.length/NUM_COLORS);
  const counts=Array(NUM_COLORS).fill(0);
  flat.forEach(c=>counts[c]++);
  const byColor=Array.from({length:NUM_COLORS},()=>[]);
  flat.forEach((c,i)=>byColor[c].push(i));
  byColor.forEach(arr=>{
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];
    }
  });
  for(let c=0;c<NUM_COLORS;c++){
    while(counts[c]>perColor+1){
      const idx=byColor[c].pop();
      let minC=0;
      for(let i=1;i<NUM_COLORS;i++) if(counts[i]<counts[minC]) minC=i;
      flat[idx]=minC;counts[c]--;counts[minC]++;byColor[minC].push(idx);
    }
  }
  return Array.from({length:BS},(_,r)=>flat.slice(r*BS,(r+1)*BS));
}

function mkBoardRandom(BS) {
  return equalizeBoard(
    Array.from({length:BS},()=>Array.from({length:BS},()=>Math.floor(Math.random()*NUM_COLORS))),
    BS
  );
}

function mkBoardGrouped(BS) {
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

/* ─── Game logic ─────────────────────────────────────── */
function floodFillGroup(board,ownership,r0,c0,BS){
  if(r0<0||r0>=BS||c0<0||c0>=BS||ownership[r0][c0]!==-1) return [];
  const color=board[r0][c0],seen=new Set(),q=[[r0,c0]],cells=[];
  while(q.length){
    const[r,c]=q.pop(),k=r*BS+c;
    if(seen.has(k)) continue;
    if(r<0||r>=BS||c<0||c>=BS) continue;
    if(board[r][c]!==color||ownership[r][c]!==-1) continue;
    seen.add(k);cells.push([r,c]);
    q.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);
  }
  return cells;
}

function playerAdjacent(o,r,c,p,BS){
  return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(
    ([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS&&o[nr][nc]===p
  );
}

function captureGroup(board,ownership,playerIdx,r0,c0,BS){
  const o=ownership.map(row=>[...row]),capturedKeys=new Set();
  for(const[r,c]of floodFillGroup(board,o,r0,c0,BS)){o[r][c]=playerIdx;capturedKeys.add(r*BS+c);}
  return{newOwnership:o,captured:capturedKeys};
}

function cascadeCapture(board,ownership,playerIdx,r0,c0,BS){
  const clickedColor=board[r0][c0];
  const o=ownership.map(row=>[...row]),capturedKeys=new Set();
  for(const[r,c]of floodFillGroup(board,o,r0,c0,BS)){o[r][c]=playerIdx;capturedKeys.add(r*BS+c);}
  function sweep(){
    let found=false;const seeded=new Set();
    for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
      if(o[r][c]!==-1||board[r][c]!==clickedColor) continue;
      const k=r*BS+c;if(seeded.has(k)) continue;
      if(!playerAdjacent(o,r,c,playerIdx,BS)) continue;
      for(const[r2,c2]of floodFillGroup(board,o,r,c,BS)){
        o[r2][c2]=playerIdx;capturedKeys.add(r2*BS+c2);seeded.add(r2*BS+c2);found=true;
      }
    }
    return found;
  }
  while(sweep()){}
  return{newOwnership:o,captured:capturedKeys};
}

function previewCapture(board,ownership,playerIdx,r0,c0,cascadeMode,BS){
  if(ownership[r0][c0]!==-1) return new Set();
  const clickedColor=board[r0][c0];
  const o=ownership.map(row=>[...row]),keys=new Set();
  for(const[r,c]of floodFillGroup(board,o,r0,c0,BS)){o[r][c]=playerIdx;keys.add(r*BS+c);}
  if(cascadeMode==="full"){
    function sweep(){
      let found=false;const seeded=new Set();
      for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
        if(o[r][c]!==-1||board[r][c]!==clickedColor) continue;
        const k=r*BS+c;if(seeded.has(k)) continue;
        if(!playerAdjacent(o,r,c,playerIdx,BS)) continue;
        for(const[r2,c2]of floodFillGroup(board,o,r,c,BS)){
          o[r2][c2]=playerIdx;keys.add(r2*BS+c2);seeded.add(r2*BS+c2);found=true;
        }
      }
      return found;
    }
    while(sweep()){}
  }
  return keys;
}

function isAdjacentToPlayer(ownership,r,c,p,BS){
  return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(
    ([nr,nc])=>nr>=0&&nr<BS&&nc>=0&&nc<BS&&ownership[nr][nc]===p
  );
}

/*
  Enclosure detection:
  Scan all connected regions of unclaimed cells.
  A region is "enclosed" by player P if:
    - Every neighbouring owned cell (or board edge) belongs to P — no other player borders it
    - The region contains NO cell whose board colour matches another player's chosen colour
      (because other players can teleport to their own colour from anywhere on the board)
  If enclosed, auto-capture it for P.
  Runs in a loop until stable (capturing one region can enclose another).
*/
function applyEnclosures(board, ownership, playerDefs, numPlayers, BS) {
  // Build set of colour indices each player "owns" by colour identity
  const playerColorIdx = playerDefs.slice(0, numPlayers).map(def => BOARD_PALETTE.indexOf(def.hex));

  let o = ownership.map(row => [...row]);
  const enclosedKeys = new Set();

  let changed = true;
  while (changed) {
    changed = false;
    const visited = Array.from({length:BS}, () => Array(BS).fill(false));

    for (let r0 = 0; r0 < BS; r0++) {
      for (let c0 = 0; c0 < BS; c0++) {
        if (o[r0][c0] !== -1 || visited[r0][c0]) continue;

        // BFS: find connected unclaimed region
        const region = [];
        const borderPlayers = new Set();
        const q = [[r0, c0]];
        visited[r0][c0] = true;

        while (q.length) {
          const [r, c] = q.shift();
          region.push([r, c]);
          for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
            if (nr < 0 || nr >= BS || nc < 0 || nc >= BS) {
              // Wall — counts as neutral boundary, doesn't block enclosure
              continue;
            }
            if (o[nr][nc] === -1) {
              if (!visited[nr][nc]) { visited[nr][nc] = true; q.push([nr, nc]); }
            } else {
              borderPlayers.add(o[nr][nc]);
            }
          }
        }

        // Must be bordered by exactly one player (walls are fine, open space is not)
        if (borderPlayers.size !== 1) continue;
        const encloser = [...borderPlayers][0];

        // Check if any cell in this region has a board colour matching ANOTHER player's colour
        // — if so, that player can reach in, so we cannot auto-capture
        const safeToCapture = region.every(([r, c]) => {
          const cellColorIdx = board[r][c];
          return playerColorIdx.every((pci, pi) => pi === encloser || pci !== cellColorIdx);
        });

        if (!safeToCapture) continue;

        // Auto-capture for encloser
        for (const [r, c] of region) {
          o[r][c] = encloser;
          enclosedKeys.add(r * BS + c);
          changed = true;
        }
      }
    }
  }

  return { newOwnership: o, enclosed: enclosedKeys };
}

/* ─── Component ──────────────────────────────────────── */
export default function PixelWars(){
  const[phase,setPhase]               =useState("numSelect");
  const[numPlayers,setNumPlayers]     =useState(2);
  const[difficulty,setDifficulty]     =useState(null);
  const[gridSize,setGridSize]         =useState(null);
  const[playerDefs,setPlayerDefs]     =useState([]);
  const[setupIdx,setSetupIdx]         =useState(0);
  const[pendingColor,setPendingColor] =useState(null);
  const[sharedBoard,setSharedBoard]   =useState(null);

  const[board,setBoard]               =useState(null);
  const[ownership,setOwnership]       =useState(null);
  const[prevOwnership,setPrevOwnership]=useState(null);
  const[cp,setCp]                     =useState(0);
  const[round,setRound]               =useState(1);
  const[captureCount,setCaptureCount] =useState(0);
  const[hovered,setHovered]           =useState(null);
  const[flash,setFlash]               =useState(null);
  // enclosedFlash: cells just auto-captured by enclosure (shown with different colour burst)
  const[enclosedFlash,setEnclosedFlash]=useState(null);
  const[legendFocus,setLegendFocus]   =useState(null);

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

  const clickableCells=useMemo(()=>{
    if(phase!=="playing"||!board||!playerDefs.length) return new Set();
    const ownerToCheck=captureCount>0&&prevOwnership?prevOwnership:ownership;
    if(!ownerToCheck) return new Set();
    const myColorIdx=BOARD_PALETTE.indexOf(playerDefs[cp].hex);
    const s=new Set();
    for(let r=0;r<BS;r++) for(let c=0;c<BS;c++){
      if(ownerToCheck[r][c]!==-1) continue;
      if(isAdjacentToPlayer(ownerToCheck,r,c,cp,BS)){s.add(r*BS+c);continue;}
      if(myColorIdx>=0&&board[r][c]===myColorIdx) s.add(r*BS+c);
    }
    return s;
  },[phase,ownership,prevOwnership,captureCount,cp,board,playerDefs,BS]);

  const previewCells=useMemo(()=>{
    if(!hovered||!board||!ownership||phase!=="playing"||!diff) return new Set();
    const[r,c]=hovered;
    if(!clickableCells.has(r*BS+c)) return new Set();
    const baseOwner=captureCount>0&&prevOwnership?prevOwnership:ownership;
    return previewCapture(board,baseOwner,cp,r,c,diff.cascade,BS);
  },[hovered,board,ownership,prevOwnership,captureCount,clickableCells,cp,phase,diff,BS]);

  const topPlayer=useMemo(()=>{
    let max=-1,top=0;
    for(let i=0;i<numPlayers;i++) if(scores[i]>max){max=scores[i];top=i;}
    return top;
  },[scores,numPlayers]);

  /* ── Setup ── */
  const goToDifficulty=useCallback((n)=>{setNumPlayers(n);setPhase("difficulty");},[]);
  const goToGridSize=useCallback((d)=>{setDifficulty(d);setPhase("gridSize");},[]);
  const goToColorPick=useCallback((gs)=>{
    setGridSize(gs);
    const bs=GRID_SIZES[gs].bs,d=difficulty;
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
      setBoard(sharedBoard);setOwnership(o);setPrevOwnership(null);
      setCp(0);setRound(1);setCaptureCount(0);setHovered(null);
      setFlash(null);setEnclosedFlash(null);setLegendFocus(null);
      setPhase("playing");
    } else setSetupIdx(newDefs.length);
  },[pendingColor,playerDefs,numPlayers,sharedBoard,takenCells,BS]);

  /* ── Board click ── */
  const handleBoardClick=useCallback((r,c)=>{
    if(phase==="playerSetup"){pickPosition(r,c);return;}
    if(phase!=="playing") return;
    if(!clickableCells.has(r*BS+c)) return;

    const baseOwnership=captureCount>0&&prevOwnership?prevOwnership:ownership;
    if(captureCount===0) setPrevOwnership(ownership.map(row=>[...row]));

    const doCapture=diff.cascade==="full"?cascadeCapture:captureGroup;
    const{newOwnership:afterCapture,captured}=doCapture(board,baseOwnership,cp,r,c,BS);

    // Apply enclosure detection after the capture
    const{newOwnership:afterEnclosure,enclosed}=applyEnclosures(
      board,afterCapture,playerDefs,numPlayers,BS
    );

    setOwnership(afterEnclosure);
    setCaptureCount(1);
    setFlash(captured);
    if(enclosed.size>0) setEnclosedFlash(enclosed);
    setTimeout(()=>setFlash(null),600);
    setTimeout(()=>setEnclosedFlash(null),1000);

    if(afterEnclosure.flat().every(v=>v>=0)) setPhase("gameover");
  },[phase,clickableCells,board,ownership,prevOwnership,captureCount,cp,diff,BS,playerDefs,numPlayers,pickPosition]);

  const endTurn=useCallback(()=>{
    if(phase!=="playing") return;
    const next=(cp+1)%numPlayers;
    let newRound=round;
    if(next===0){
      newRound++;
      if(newRound>MAX_ROUNDS){setPhase("gameover");return;}
      setRound(newRound);
    }
    setCp(next);setCaptureCount(0);setPrevOwnership(null);setHovered(null);setLegendFocus(null);
  },[phase,cp,numPlayers,round]);

  const resetToMenu=()=>{
    setPhase("numSelect");setPlayerDefs([]);setSetupIdx(0);
    setPendingColor(null);setSharedBoard(null);setBoard(null);setOwnership(null);
    setPrevOwnership(null);setDifficulty(null);setGridSize(null);
    setCaptureCount(0);setLegendFocus(null);setFlash(null);setEnclosedFlash(null);
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
        YOUR COLOUR IS CLICKABLE ANYWHERE ON THE BOARD<br/>
        SURROUND NEUTRAL CELLS TO CLAIM THEM AUTOMATICALLY<br/>
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
          onMouseEnter={e=>{e.currentTarget.style.background=hexToRgba(DIFFICULTIES[difficulty].color,0.18);}}
          onMouseLeave={e=>{e.currentTarget.style.background=hexToRgba(DIFFICULTIES[difficulty].color,0.07);}}
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
    const pickingPos=!!pendingColor,diffColor=diff.color;
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
    const winner=playerDefs[topPlayer],winHex=winner.hex;
    const solo1p=numPlayers===1,pct=Math.round(scores[0]/TOTAL*100);
    const grade=solo1p
      ? scores[0]===TOTAL?{title:"CONQUEST COMPLETE",sub:"Every cell is yours.",icon:"🏆",victory:true}
      : scores[0]>TOTAL*0.75?{title:"OVERWHELMING VICTORY",sub:`${pct}% captured.`,icon:"🌟",victory:true}
      : scores[0]>TOTAL*0.5?{title:"VICTORY",sub:`${pct}% captured.`,icon:"⚡",victory:true}
      : scores[0]>TOTAL*0.35?{title:"CLOSE BATTLE",sub:`${pct}% captured.`,icon:"😤",victory:false}
      :{title:"DEFEAT",sub:`Only ${pct}% captured.`,icon:"💀",victory:false}
      :null;
    return(
      <div style={{
        minHeight:"100vh",
        background:solo1p&&!grade.victory
          ?"radial-gradient(circle at 50% 40%, rgba(40,0,0,0.6) 0%, #080812 70%)"
          :`radial-gradient(circle at 50% 40%, ${hexToRgba(winHex,0.2)} 0%, #080812 70%)`,
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",
        padding:"24px 16px",fontFamily:"'Space Mono',monospace",color:"white",
        boxSizing:"border-box",
      }}>
        <style>{GLOBAL_CSS}</style>
        <div style={{fontSize:64,marginBottom:12,lineHeight:1}}>{solo1p?grade.icon:"🏆"}</div>
        <div style={{
          fontSize:solo1p?20:14,fontWeight:"bold",letterSpacing:4,
          color:solo1p&&!grade.victory?"#FF4757":winHex,
          textShadow:`0 0 32px ${solo1p&&!grade.victory?"rgba(255,71,87,0.7)":hexToRgba(winHex,0.8)}`,
          marginBottom:6,textAlign:"center",
          animation:solo1p&&grade.victory||!solo1p?"glow-pulse 2s ease-in-out infinite":"none"
        }}>
          {solo1p?grade.title:"VICTORY"}
        </div>
        {!solo1p&&(
          <div style={{fontSize:28,fontWeight:"bold",color:winHex,marginBottom:4,textAlign:"center",
            textShadow:`0 0 20px ${hexToRgba(winHex,0.6)}`}}>{winner.name}</div>
        )}
        <div style={{
          color:solo1p&&!grade.victory?"#FF474788":hexToRgba(winHex,0.5),
          fontSize:10,letterSpacing:1,marginBottom:28,textAlign:"center"
        }}>
          {solo1p?grade.sub:`P${topPlayer+1} dominates the board`}
        </div>
        <div style={{width:"100%",maxWidth:280,marginBottom:28}}>
          {Array.from({length:numPlayers},(_,i)=>{
            const def=playerDefs[i],isWinner=i===topPlayer&&numPlayers>1;
            const rank=numPlayers>1?[...Array(numPlayers).keys()].sort((a,b)=>scores[b]-scores[a]).indexOf(i)+1:null;
            return(
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:8,marginBottom:10,
                padding:"8px 12px",borderRadius:8,
                background:isWinner?hexToRgba(def.hex,0.15):"transparent",
                border:isWinner?`1px solid ${hexToRgba(def.hex,0.4)}`:"1px solid transparent",
              }}>
                {numPlayers>1&&(
                  <div style={{width:18,height:18,borderRadius:"50%",
                    background:isWinner?def.hex:"#1a1a2e",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:8,fontWeight:"bold",color:isWinner?"white":"#333",flexShrink:0}}>{rank}</div>
                )}
                <div style={{width:9,height:9,borderRadius:"50%",background:def.hex,
                  boxShadow:`0 0 6px ${def.hex}`,flexShrink:0}}/>
                <span style={{flex:1,color:isWinner?def.hex:"#666",fontSize:11}}>{def.name}</span>
                <span style={{fontWeight:"bold",fontSize:difficulty==="easy"?15:12,color:isWinner?def.hex:"#555"}}>
                  {difficulty==="easy"?scores[i]:"▓".repeat(Math.min(8,Math.round(scores[i]/TOTAL*8)))}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:10}}>
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
  const hoverColourName=hovered&&previewCells.size>0?COLOR_NAMES[board[hovered[0]][hovered[1]]]:null;

  return(
    <div style={{
      height:"100dvh",maxHeight:"100dvh",overflow:"hidden",
      background:"#080812",
      display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",
      padding:"8px 10px",fontFamily:"'Space Mono',monospace",
      color:"white",boxSizing:"border-box",gap:6,
    }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Turn banner ── */}
      <div style={{
        width:"100%",maxWidth:380,flexShrink:0,borderRadius:10,
        background:curDim,border:`2px solid ${hexToRgba(curHex,0.55)}`,
        boxShadow:`0 0 32px ${hexToRgba(curHex,0.35)}`,
        padding:"10px 16px",display:"flex",alignItems:"center",gap:12,
        transition:"border-color 0.35s, box-shadow 0.35s, background 0.35s",
        minHeight:64,overflow:"hidden",
      }}>
        <div style={{flexShrink:0,position:"relative",width:20,height:20}}>
          <div className="ring-pulse" style={{position:"absolute",inset:-5,borderRadius:"50%",
            border:`2px solid ${curHex}`,pointerEvents:"none"}}/>
          <div style={{width:20,height:20,borderRadius:"50%",background:curHex,boxShadow:`0 0 14px ${curGlow}`}}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:curHex,fontWeight:"bold",fontSize:15,letterSpacing:2,
            textShadow:`0 0 14px ${curGlow}`,lineHeight:1.2}}>{curDef.name.toUpperCase()}</div>
          <div style={{color:hexToRgba(curHex,0.5),fontSize:9,letterSpacing:1,marginTop:2}}>
            {hoverColourName
              ?`CAPTURE ${hoverColourName.toUpperCase()} → ${previewCells.size} CELLS`
              :hasCaptured
                ?"CAPTURED — TAP ANOTHER GROUP TO CHANGE OR END TURN"
                :`PLAYER ${cp+1}${difficulty==="easy"?` · ${scores[cp]} CELLS`:""}`}
          </div>
        </div>
        <div style={{textAlign:"right",minWidth:52,flexShrink:0}}>
          {previewCells.size>0?(
            <>
              <div style={{color:curHex,fontWeight:"bold",fontSize:20,lineHeight:1,
                textShadow:`0 0 12px ${curGlow}`}}>{previewCells.size}</div>
              <div style={{color:hexToRgba(curHex,0.5),fontSize:8,letterSpacing:1}}>CELLS</div>
            </>
          ):hasCaptured?(
            <div style={{color:hexToRgba(curHex,0.5),fontSize:8,letterSpacing:1,lineHeight:1.8}}>
              {difficulty==="easy"?scores[cp]:"·"}<br/>CELLS
            </div>
          ):(
            <div style={{color:"#2a2a4a",fontSize:8,letterSpacing:1,lineHeight:1.8}}>
              CLICK A<br/>BORDER<br/>CELL
            </div>
          )}
        </div>
      </div>

      {/* ── Round bar ── */}
      <div style={{display:"flex",alignItems:"center",gap:6,width:"100%",maxWidth:380,flexShrink:0}}>
        <Badge color={diffColor}>{difficulty.toUpperCase()}</Badge>
        <Badge color={diffColor}>{GRID_SIZES[gridSize].label.toUpperCase()}</Badge>
        <span style={{color:"#1e1e3a",fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>RND {round}/{MAX_ROUNDS}</span>
        <div style={{flex:1,height:2,background:"#0d0d1a",borderRadius:1}}>
          <div style={{height:"100%",borderRadius:1,
            background:`linear-gradient(90deg,${playerDefs[0].hex},${playerDefs[numPlayers-1].hex})`,
            width:`${(round/MAX_ROUNDS)*100}%`,transition:"width 0.4s"}}/>
        </div>
        {difficulty==="easy"&&(
          <span style={{color:"#1e1e3a",fontSize:9,letterSpacing:1,whiteSpace:"nowrap"}}>
            {Math.round(claimed/TOTAL*100)}%
          </span>
        )}
      </div>

      {/* ── Board ── */}
      <div
        onMouseLeave={()=>setHovered(null)}
        style={{
          display:"grid",
          gridTemplateColumns:`repeat(${BS},1fr)`,
          gridTemplateRows:`repeat(${BS},1fr)`,
          gap:2,background:"#111",padding:3,borderRadius:8,
          border:`3px solid ${hexToRgba(curHex,0.55)}`,
          boxShadow:`0 0 40px ${hexToRgba(curHex,0.35)}`,
          width:"min(90vw,360px)",height:"min(90vw,360px)",
          flexShrink:0,boxSizing:"border-box",
          transition:"border-color 0.35s, box-shadow 0.35s",
          touchAction:"none",
        }}
      >
        {Array.from({length:BS*BS},(_,k)=>{
          const r=Math.floor(k/BS),c=k%BS;
          const owner=ownership[r][c],isOwned=owner>=0;
          const isClickable=clickableCells.has(k);
          const isPrev=previewCells.has(k);
          const isFlash=flash&&flash.has(k);
          const isEnclosedFlash=enclosedFlash&&enclosedFlash.has(k);
          const isLegendHighlight=legendFocus!==null&&!isOwned&&board[r][c]===legendFocus;

          const bgColor=isOwned?playerDefs[owner].hex:BOARD_PALETTE[board[r][c]];
          const cellFilter=isOwned?"none"
            :isLegendHighlight?"none"
            :legendFocus!==null?"saturate(0.15) brightness(0.5)"
            :"saturate(0.28) brightness(0.72)";

          return(
            <div key={k}
              onClick={()=>handleBoardClick(r,c)}
              onMouseEnter={()=>setHovered([r,c])}
              style={{background:bgColor,position:"relative",
                cursor:isClickable?"pointer":"default",
                filter:cellFilter,willChange:"filter"}}
            >
              {isPrev&&(
                <div style={{position:"absolute",inset:0,
                  background:hexToRgba(curHex,0.68),border:`2px solid ${curHex}`,
                  boxSizing:"border-box",pointerEvents:"none"}}/>
              )}
              {isClickable&&!isPrev&&(
                <div className="cell-pulse" style={{position:"absolute",inset:0,
                  border:`2px solid ${curHex}`,boxSizing:"border-box",pointerEvents:"none"}}/>
              )}
              {isLegendHighlight&&!isPrev&&!isClickable&&(
                <div style={{position:"absolute",inset:0,
                  border:`2px solid ${BOARD_PALETTE[legendFocus]}`,
                  boxSizing:"border-box",pointerEvents:"none",opacity:0.9}}/>
              )}
              {/* Regular capture flash — white */}
              {isFlash&&(
                <div className="flash-burst" style={{position:"absolute",inset:0,
                  background:"white",pointerEvents:"none"}}/>
              )}
              {/* Enclosure auto-capture flash — gold sweep, slightly delayed */}
              {isEnclosedFlash&&!isFlash&&(
                <div className="enclosed-burst" style={{position:"absolute",inset:0,
                  background:"#FFD32A",pointerEvents:"none"}}/>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Colour legend (easy mode only) ── */}
      {difficulty==="easy"&&(
        <div style={{display:"flex",gap:4,width:"100%",maxWidth:380,flexShrink:0,overflowX:"auto",paddingBottom:2}}>
          {BOARD_PALETTE.map((col,idx)=>{
            const isFocused=legendFocus===idx;
            return(
              <button key={idx} onClick={()=>setLegendFocus(isFocused?null:idx)} title={COLOR_NAMES[idx]}
                style={{
                  flexShrink:0,width:24,height:24,borderRadius:6,cursor:"pointer",
                  background:col,
                  border:isFocused?`2px solid white`:`2px solid transparent`,
                  boxShadow:isFocused?`0 0 10px ${col}`:"none",
                  transition:"all 0.15s",
                  transform:isFocused?"scale(1.25)":"scale(1)",padding:0,
                }}
              />
            );
          })}
          {legendFocus!==null&&(
            <div style={{display:"flex",alignItems:"center",color:BOARD_PALETTE[legendFocus],
              fontSize:9,letterSpacing:1,paddingLeft:4,whiteSpace:"nowrap"}}>
              {COLOR_NAMES[legendFocus].toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* ── Score cards ── */}
      <div style={{display:"flex",gap:6,width:"100%",maxWidth:380,flexShrink:0}}>
        {Array.from({length:numPlayers},(_,i)=>{
          const def=playerDefs[i],isCur=i===cp,showScore=difficulty==="easy";
          return(
            <div key={i} style={{
              flex:1,background:isCur?hexToRgba(def.hex,0.15):"#0d0d1a",
              border:`1px solid ${isCur?hexToRgba(def.hex,0.6):"#0d0d1a"}`,
              borderRadius:8,padding:"6px 4px",textAlign:"center",
              boxShadow:isCur?`0 0 18px ${hexToRgba(def.hex,0.35)}`:"none",
              transition:"all 0.3s",
            }}>
              <div style={{width:9,height:9,borderRadius:"50%",background:def.hex,
                margin:"0 auto 3px",boxShadow:`0 0 ${isCur?12:4}px ${def.hex}`}}/>
              {showScore
                ?<div style={{fontSize:16,fontWeight:"bold",color:isCur?def.hex:"#888",lineHeight:1}}>{scores[i]}</div>
                :<div style={{fontSize:8,color:isCur?def.hex:"#333",lineHeight:1}}>
                  {"▓".repeat(Math.min(5,Math.ceil(scores[i]/TOTAL*5)))}
                </div>
              }
              <div style={{fontSize:6,color:isCur?hexToRgba(def.hex,0.7):"#2a2a4a",letterSpacing:0.5,margin:"3px 0 4px",lineHeight:1.2}}>
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
      <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
        <button onClick={endTurn} style={{
          padding:"10px 22px",borderRadius:8,cursor:"pointer",
          border:`2px solid ${hasCaptured?curHex:hexToRgba(curHex,0.2)}`,
          background:hasCaptured?curDim:"transparent",
          color:hasCaptured?curHex:"#2a2a4a",
          fontFamily:"'Space Mono',monospace",
          fontSize:11,fontWeight:"bold",letterSpacing:2,
          boxShadow:hasCaptured?`0 0 22px ${curGlow}`:"none",
          transition:"all 0.2s"
        }}>END TURN →</button>
        <GhostButton onClick={resetToMenu} style={{padding:"10px 14px"}}>☰</GhostButton>
      </div>

      {clickableCells.size===0&&(
        <div style={{color:"#333",fontSize:9,letterSpacing:1,flexShrink:0}}>
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
      width:SIZE,height:SIZE,cursor:"crosshair",flexShrink:0,
    }}>
      {Array.from({length:BS*BS},(_,k)=>{
        const r=Math.floor(k/BS),c=k%BS;
        const taken=takenCells.has(k),isHov=hov===k;
        const existingDef=playerDefs.findIndex(d=>d.row===r&&d.col===c);
        return(
          <div key={k} onClick={()=>{if(!taken) onPick(r,c);}} onMouseEnter={()=>setHov(k)}
            style={{
              background:existingDef>=0?playerDefs[existingDef].hex:BOARD_PALETTE[board[r][c]],
              position:"relative",cursor:taken?"not-allowed":"crosshair",
              filter:existingDef>=0?"none":"saturate(0.28) brightness(0.72)",
            }}>
            {existingDef>=0&&(
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{width:4,height:4,borderRadius:"50%",background:"white",boxShadow:"0 0 3px black"}}/>
              </div>
            )}
            {!taken&&isHov&&(
              <div style={{position:"absolute",inset:0,
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
      fontFamily:"'Space Mono',monospace",color:"white",boxSizing:"border-box",overflow:"hidden"}}>
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
  @keyframes enclosed-burst {
    0%   { opacity:0; }
    20%  { opacity:0.9; }
    100% { opacity:0; }
  }
  @keyframes glow-pulse {
    0%,100% { opacity:1; }
    50%      { opacity:0.6; }
  }
  .ring-pulse    { animation:ring-pulse    1.5s ease-out   infinite; }
  .cell-pulse    { animation:cell-flicker  0.9s ease-in-out infinite; }
  .flash-burst   { animation:flash-burst   0.7s ease       forwards; }
  .enclosed-burst{ animation:enclosed-burst 1.0s ease      forwards; }
`;
