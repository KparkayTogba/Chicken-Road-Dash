import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Trophy, Heart, Volume2, VolumeX,
         ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Audio ────────────────────────────────────────────────────────────────────
let _muted = false;
let _audioCtx = null;

function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window["webkitAudioContext"])();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}
function tone(freq, dur, vol = 0.3, type = "sine", delay = 0) {
  if (_muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur);
}
function playMove()  { tone(520, 0.07, 0.18); }
function playHit()   { tone(180, 0.25, 0.45, "sawtooth"); tone(90, 0.3, 0.3, "square"); }
function playLevel() { tone(523, 0.12, 0.4); tone(659, 0.12, 0.4, "sine", 0.13); tone(784, 0.22, 0.4, "sine", 0.27); }

// navigator.vibrate works on Android; iOS needs @capacitor/haptics (install separately)
function vibrate(ms = 80) { navigator.vibrate?.(ms); }

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID_COLS = 11;
const GRID_ROWS = 13;
const CELL = 44;
const BOARD_W = GRID_COLS * CELL;
const BOARD_H = GRID_ROWS * CELL;

const LANES = [
  { row: 2, speed: 1.4,  dir:  1, cars: [0, 4, 8],  colors: ["#ef4444","#991b1b"], make: "Chevy",  body: "suv"   },
  { row: 3, speed: 1.05, dir: -1, cars: [1, 6, 10], colors: ["#475569","#0f172a"], make: "Benz",   body: "sedan" },
  { row: 5, speed: 1.6,  dir:  1, cars: [2, 7],     colors: ["#3b82f6","#1e3a8a"], make: "BMW",    body: "coupe" },
  { row: 6, speed: 1.2,  dir: -1, cars: [0, 5, 9],  colors: ["#f97316","#9a3412"], make: "Toyota", body: "hatch" },
  { row: 8, speed: 1.75, dir:  1, cars: [1, 6],     colors: ["#cbd5e1","#475569"], make: "Lexus",  body: "suv"   },
  { row: 9, speed: 1.35, dir: -1, cars: [3, 8],     colors: ["#ec4899","#86198f"], make: "Nissan", body: "sedan" },
];

const CAR_SHAPES = {
  sedan: {
    body: "M 22,8 C 8,8 5,16 5,22 L 5,48 C 5,54 8,62 22,62 L 138,62 C 152,62 155,54 155,48 L 155,22 C 155,16 152,8 138,8 Z",
    ws: { x1: 98,  x2: 114 }, cab: { x: 57,  w: 41 }, rw: { x1: 44, x2: 57  },
    ti: { fX: 116, rX: 16, w: 27, h: 13 }, li: { hX: 148, tX: 3,  y1: 12, y2: 48, lH: 10 }, mi: { x: 95  },
  },
  suv: {
    body: "M 18,5 C 5,5 4,13 4,20 L 4,50 C 4,57 5,65 18,65 L 142,65 C 155,65 156,57 156,50 L 156,20 C 156,13 155,5 142,5 Z",
    ws: { x1: 102, x2: 122 }, cab: { x: 58,  w: 44 }, rw: { x1: 42, x2: 58  },
    ti: { fX: 118, rX: 14, w: 30, h: 15 }, li: { hX: 148, tX: 2,  y1: 10, y2: 50, lH: 11 }, mi: { x: 100 },
  },
  coupe: {
    body: "M 26,10 C 12,10 8,18 8,24 L 8,46 C 8,52 12,60 26,60 L 134,60 C 148,58 152,50 152,46 L 152,24 C 152,20 148,12 134,10 Z",
    ws: { x1: 106, x2: 124 }, cab: { x: 66,  w: 40 }, rw: { x1: 50, x2: 66  },
    ti: { fX: 118, rX: 18, w: 24, h: 12 }, li: { hX: 145, tX: 4,  y1: 13, y2: 47, lH:  9 }, mi: { x: 104 },
  },
  hatch: {
    body: "M 20,8 C 8,8 6,15 6,22 L 6,48 C 6,55 8,62 20,62 L 130,62 C 142,60 148,52 148,48 L 148,22 C 148,18 142,10 130,8 Z",
    ws: { x1: 94,  x2: 110 }, cab: { x: 50,  w: 44 }, rw: { x1: 36, x2: 50  },
    ti: { fX: 108, rX: 14, w: 26, h: 13 }, li: { hX: 141, tX: 3,  y1: 12, y2: 48, lH: 10 }, mi: { x: 92  },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function cellToPx(pos) { return { left: pos.x * CELL, top: pos.y * CELL }; }
function isRoad(row) { return LANES.some((l) => l.row === row); }
function isSafeGrass(row) { return [0, 1, 4, 7, 10, 11, 12].includes(row); }
function makeCars() {
  return LANES.flatMap((lane, li) =>
    lane.cars.map((cellX, ci) => ({ id: `${li}-${ci}`, laneIndex: li, x: cellX * CELL }))
  );
}

// ─── Chicken ──────────────────────────────────────────────────────────────────
function Chicken({ position, hitFlash }) {
  const px = cellToPx(position);
  return (
    <motion.div
      className="absolute z-20"
      animate={{ left: px.left, top: px.top, scale: hitFlash ? 1.22 : 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      style={{ width: CELL, height: CELL }}
      aria-label="Chicken player"
    >
      <svg viewBox="0 0 44 44" width={CELL} height={CELL} style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.35))" }}>
        <path d="M 9,23 C 1,15 1,8 5,6 C 7,13 8,19 9,23Z"  fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
        <path d="M 8,28 C 0,23 0,15 4,13 C 6,19 7,25 8,28Z" fill="#FEF3C7" stroke="#92400E" strokeWidth="0.7"/>
        <path d="M 10,32 C 2,30 0,23 4,20 C 7,25 9,29 10,32Z" fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
        <ellipse cx="20" cy="28" rx="12" ry="9" fill="#FFFBEB" stroke="#92400E" strokeWidth="1"/>
        <ellipse cx="19" cy="28" rx="7.5" ry="5" fill="#FEF3C7" stroke="#A16207" strokeWidth="0.6"/>
        <path d="M 13,27 C 16,25 20,25 22,27" fill="none" stroke="#A16207" strokeWidth="0.5" opacity="0.7"/>
        <path d="M 12,29 C 15,27 20,27 23,29" fill="none" stroke="#A16207" strokeWidth="0.5" opacity="0.6"/>
        <path d="M 27,22 C 29,18 31,16 32,17 C 31,20 29,22 28,24Z" fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
        <circle cx="33" cy="14" r="8" fill="#FFFBEB" stroke="#92400E" strokeWidth="1"/>
        <path d="M 28,6 C 28,2 30.5,0 31,5 C 32,1 33.5,0 34,5 C 35,1 37,2 36,6"
              fill="#EF4444" stroke="#DC2626" strokeWidth="0.6" strokeLinejoin="round"/>
        <ellipse cx="39" cy="21" rx="2.2" ry="3" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5"/>
        <path d="M 40,12 L 44,14 L 40,17Z" fill="#F97316" stroke="#EA580C" strokeWidth="0.5"/>
        <circle cx="36" cy="12" r="3" fill="white" stroke="#92400E" strokeWidth="0.5"/>
        <circle cx="36.8" cy="12" r="1.8" fill="#1C1917"/>
        <circle cx="36.2" cy="11.2" r="0.7" fill="white"/>
        <line x1="20" y1="37" x2="18" y2="43" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
        <line x1="25" y1="37" x2="23" y2="43" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
        <path d="M 15,43 L 18,43 L 21,41" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        <path d="M 20,43 L 23,43 L 26,41" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      </svg>
    </motion.div>
  );
}

// ─── Car ──────────────────────────────────────────────────────────────────────
function Car({ lane, x }) {
  const W = { suv: CELL * 1.65, coupe: CELL * 1.5, sedan: CELL * 1.42, hatch: CELL * 1.42 }[lane.body] ?? CELL * 1.42;
  const H = { suv: CELL * 0.82, coupe: CELL * 0.72, sedan: CELL * 0.72, hatch: CELL * 0.74 }[lane.body] ?? CELL * 0.72;
  const top = lane.row * CELL + (CELL - H) / 2;
  const flip = lane.dir === -1;
  const [c1, c2] = lane.colors;
  const s = CAR_SHAPES[lane.body] ?? CAR_SHAPES.sedan;
  const { ws, cab, rw, ti, li, mi } = s;

  return (
    <div className="absolute z-10" style={{ left: x, top, width: W, height: H }}>
      <svg viewBox="0 0 160 70" width={W} height={H}
           style={{ overflow: "visible", transform: flip ? "scaleX(-1)" : undefined }}>
        <rect x={ti.fX}     y={-2}         width={ti.w}     height={ti.h}     rx="3" fill="#0f172a"/>
        <rect x={ti.fX}     y={72 - ti.h}  width={ti.w}     height={ti.h}     rx="3" fill="#0f172a"/>
        <rect x={ti.rX}     y={-2}         width={ti.w}     height={ti.h}     rx="3" fill="#0f172a"/>
        <rect x={ti.rX}     y={72 - ti.h}  width={ti.w}     height={ti.h}     rx="3" fill="#0f172a"/>
        <rect x={ti.fX + 4} y={0}          width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b"/>
        <rect x={ti.fX + 4} y={74 - ti.h} width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b"/>
        <rect x={ti.rX + 4} y={0}          width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b"/>
        <rect x={ti.rX + 4} y={74 - ti.h} width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b"/>
        <circle cx={ti.fX + ti.w/2} cy={ti.h/2 - 2}      r="2.5" fill="#334155"/>
        <circle cx={ti.fX + ti.w/2} cy={70 - ti.h/2 + 2} r="2.5" fill="#334155"/>
        <circle cx={ti.rX + ti.w/2} cy={ti.h/2 - 2}      r="2.5" fill="#334155"/>
        <circle cx={ti.rX + ti.w/2} cy={70 - ti.h/2 + 2} r="2.5" fill="#334155"/>
        <path d={s.body} fill={c1}/>
        <path d={s.body} fill={c2} opacity="0.30"/>
        <path d={s.body} fill="white" opacity="0.08"/>
        <rect x={ws.x2} y="7" width="50"        height="56" rx="4" fill={c2} opacity="0.18"/>
        <rect x="5"     y="9" width={rw.x1 - 3} height="52" rx="4" fill={c2} opacity="0.14"/>
        <path d={`M ${ws.x1},13 L ${ws.x2},10 L ${ws.x2},60 L ${ws.x1},57 Z`} fill="#bfdbfe" opacity="0.88"/>
        <path d={`M ${ws.x1+2},14 L ${ws.x2-2},11 L ${ws.x2-2},24 L ${ws.x1+2},27 Z`} fill="white" opacity="0.22"/>
        <rect x={cab.x}     y="11" width={cab.w}     height="48" rx="3" fill="#0f172a" opacity="0.92"/>
        <rect x={cab.x + 4} y="13" width={cab.w - 8} height="8"  rx="2" fill="white"  opacity="0.10"/>
        <path d={`M ${rw.x1},13 L ${rw.x2},10 L ${rw.x2},60 L ${rw.x1},57 Z`} fill="#bfdbfe" opacity="0.76"/>
        <rect x={cab.x + 2} y="7"  width={cab.w - 4} height="8" rx="2" fill="#bfdbfe" opacity="0.65"/>
        <rect x={cab.x + 2} y="55" width={cab.w - 4} height="8" rx="2" fill="#bfdbfe" opacity="0.65"/>
        <rect x={li.hX}     y={li.y1}     width="10" height={li.lH}     rx="2" fill="#fef9c3"/>
        <rect x={li.hX}     y={li.y2}     width="10" height={li.lH}     rx="2" fill="#fef9c3"/>
        <rect x={li.hX + 2} y={li.y1 + 2} width="6" height={li.lH - 4} rx="1" fill="white" opacity="0.8"/>
        <rect x={li.hX + 2} y={li.y2 + 2} width="6" height={li.lH - 4} rx="1" fill="white" opacity="0.8"/>
        <rect x={li.tX}     y={li.y1}     width="10" height={li.lH}     rx="2" fill="#f87171"/>
        <rect x={li.tX}     y={li.y2}     width="10" height={li.lH}     rx="2" fill="#f87171"/>
        <rect x={li.tX + 2} y={li.y1 + 2} width="6" height={li.lH - 4} rx="1" fill="#fca5a5" opacity="0.85"/>
        <rect x={li.tX + 2} y={li.y2 + 2} width="6" height={li.lH - 4} rx="1" fill="#fca5a5" opacity="0.85"/>
        <rect x={mi.x} y="3"  width="12" height="6" rx="2" fill={c1} stroke={c2} strokeWidth="0.8"/>
        <rect x={mi.x} y="61" width="12" height="6" rx="2" fill={c1} stroke={c2} strokeWidth="0.8"/>
        <path d={s.body} fill="none" stroke={c2} strokeWidth="1.5" opacity="0.35"/>
      </svg>
    </div>
  );
}

// ─── Row background ───────────────────────────────────────────────────────────
function RowBackground({ row }) {
  let bg = "bg-green-400", label = "grass";
  if (row === 0)          { bg = "bg-yellow-300"; label = "finish line"; }
  else if (isRoad(row))   { bg = "bg-zinc-700";   label = "road"; }
  else if (isSafeGrass(row)) { bg = "bg-green-400"; }
  return (
    <div className={`absolute left-0 w-full ${bg}`} style={{ top: row * CELL, height: CELL }} aria-label={label}>
      {isRoad(row) && <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 bg-yellow-200/70 bg-[length:44px_4px]"/>}
      {row === 0 && (
        <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.35em] text-yellow-900">
          Finish
        </div>
      )}
    </div>
  );
}

// ─── Game ─────────────────────────────────────────────────────────────────────
export default function ChickenCrossTheRoadGame() {
  const startPos = useMemo(() => ({ x: 5, y: 12 }), []);

  const [chicken, setChicken] = useState(startPos);
  const [cars,    setCars]    = useState(makeCars);
  const [score,   setScore]   = useState(0);
  const [level,   setLevel]   = useState(1);
  const [lives,   setLives]   = useState(3);
  const [best,    setBest]    = useState(0);
  // "start" | "playing" | "gameover"
  const [status,  setStatus]  = useState("start");
  const [message, setMessage] = useState("");
  const [hitFlash, setHitFlash] = useState(false);
  const [muted,   setMuted]   = useState(() => localStorage.getItem("muted") === "1");

  const chickenRef = useRef(chicken);
  const statusRef  = useRef(status);
  const livesRef   = useRef(lives);
  const levelRef   = useRef(level);
  const swipeStart = useRef(null);
  const swipeFired = useRef(false);
  const boardRef   = useRef(null);

  useEffect(() => { chickenRef.current = chicken; }, [chicken]);
  useEffect(() => { statusRef.current  = status;  }, [status]);
  useEffect(() => { livesRef.current   = lives;   }, [lives]);
  useEffect(() => { levelRef.current   = level;   }, [level]);

  // Keep module-level mute flag in sync and persist preference
  useEffect(() => {
    _muted = muted;
    localStorage.setItem("muted", muted ? "1" : "0");
  }, [muted]);

  // Unlock AudioContext on first gesture (iOS requirement)
  useEffect(() => {
    const unlock = () => getCtx();
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown",    unlock, { once: true });
    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown",    unlock);
    };
  }, []);

  const resetRound = useCallback(() => setChicken(startPos), [startPos]);

  const resetGame = useCallback(() => {
    setChicken(startPos);
    setScore(0);
    setLevel(1);
    setLives(3);
    setStatus("playing");
    setMessage("Swipe or use arrow keys to cross safely.");
    setCars(makeCars());
  }, [startPos]);

  const startGame = useCallback(() => {
    setChicken(startPos);
    setScore(0);
    setLevel(1);
    setLives(3);
    setStatus("playing");
    setMessage("Swipe or use arrow keys to cross safely.");
    setCars(makeCars());
  }, [startPos]);

  const moveChicken = useCallback((dx, dy) => {
    if (statusRef.current !== "playing") return;
    const cur = chickenRef.current;
    const next = {
      x: clamp(cur.x + dx, 0, GRID_COLS - 1),
      y: clamp(cur.y + dy, 0, GRID_ROWS - 1),
    };
    if (next.y === 0) {
      playLevel();
      setScore((o) => { const u = o + 100 * levelRef.current; setBest((p) => Math.max(p, u)); return u; });
      setLevel((o) => o + 1);
      setMessage("Nice crossing! Traffic is getting faster.");
      setTimeout(resetRound, 120);
    } else {
      playMove();
      if (next.y < cur.y) {
        setScore((o) => { const u = o + 5; setBest((p) => Math.max(p, u)); return u; });
      }
    }
    setChicken(next);
  }, [resetRound]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (["arrowup",    "w"].includes(k)) { e.preventDefault(); moveChicken(0, -1); }
      if (["arrowdown",  "s"].includes(k)) { e.preventDefault(); moveChicken(0,  1); }
      if (["arrowleft",  "a"].includes(k)) { e.preventDefault(); moveChicken(-1, 0); }
      if (["arrowright", "d"].includes(k)) { e.preventDefault(); moveChicken(1,  0); }
      if (k === "r") resetGame();
      if (k === " " && statusRef.current === "start") startGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveChicken, resetGame, startGame]);

  // Subway-Surfers-style swipe: fires on touchmove as soon as threshold is crossed.
  // Must be a non-passive listener to call preventDefault() and block page scroll.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onMove = (e) => {
      e.preventDefault();
      if (!swipeStart.current || swipeFired.current) return;
      const t = e.touches[0];
      const dx = t.clientX - swipeStart.current.x;
      const dy = t.clientY - swipeStart.current.y;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      swipeFired.current = true;
      if (Math.abs(dx) > Math.abs(dy)) moveChicken(dx > 0 ? 1 : -1, 0);
      else                              moveChicken(0, dy > 0 ? 1 : -1);
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, [moveChicken]);

  // Car animation — runs even during start/gameover so background stays lively
  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const delta = Math.min(32, now - last);
      last = now;
      setCars((prev) =>
        prev.map((car) => {
          const lane = LANES[car.laneIndex];
          const boost = 1 + (levelRef.current - 1) * 0.12;
          let nx = car.x + lane.speed * lane.dir * boost * (delta / 16.67);
          const cw = CELL * 1.65;
          if (lane.dir ===  1 && nx >  BOARD_W + cw) nx = -cw;
          if (lane.dir === -1 && nx < -cw)            nx =  BOARD_W + cw;
          return { ...car, x: nx };
        })
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Collision detection
  useEffect(() => {
    if (status !== "playing") return;
    const cb = {
      left:   chicken.x * CELL + 8,
      right:  chicken.x * CELL + CELL - 8,
      top:    chicken.y * CELL + 8,
      bottom: chicken.y * CELL + CELL - 8,
    };
    const hit = cars.some((car) => {
      const lane = LANES[car.laneIndex];
      if (lane.row !== chicken.y) return false;
      const cW = { suv: CELL*1.65, coupe: CELL*1.5, sedan: CELL*1.42, hatch: CELL*1.42 }[lane.body] ?? CELL*1.42;
      const cH = { suv: CELL*0.82, coupe: CELL*0.72, sedan: CELL*0.72, hatch: CELL*0.74 }[lane.body] ?? CELL*0.72;
      const carBox = {
        left: car.x, right: car.x + cW,
        top: lane.row * CELL + (CELL - cH) / 2,
        bottom: lane.row * CELL + (CELL - cH) / 2 + cH,
      };
      return cb.left < carBox.right && cb.right > carBox.left &&
             cb.top  < carBox.bottom && cb.bottom > carBox.top;
    });
    if (hit) {
      playHit();
      vibrate([60, 30, 90]); // short-pause-long pattern
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 200);
      if (livesRef.current <= 1) {
        setLives(0);
        setStatus("gameover");
      } else {
        setLives((o) => o - 1);
        setMessage("Careful! You lost a life.");
        resetRound();
      }
    }
  }, [cars, chicken, status, resetRound]);


  return (
    <div
      className="min-h-screen bg-gradient-to-br from-sky-100 via-green-100 to-yellow-100 text-zinc-900"
      style={{
        paddingTop:    "max(env(safe-area-inset-top),    16px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        paddingLeft:   "max(env(safe-area-inset-left),   16px)",
        paddingRight:  "max(env(safe-area-inset-right),  16px)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">

        {/* Sidebar */}
        <Card className="w-full border-white/70 bg-white/75 shadow-xl backdrop-blur lg:max-w-xs">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-700">Arcade Game</p>
                <h1 className="mt-1 text-2xl font-black leading-tight">Chicken Road Dash</h1>
              </div>
              {/* Mute toggle */}
              <button
                onClick={() => setMuted((m) => !m)}
                className="mt-1 rounded-xl bg-zinc-100 p-2 text-zinc-600 transition hover:bg-zinc-200"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-green-100 p-3">
                <div className="text-xs font-bold uppercase text-green-700">Score</div>
                <div className="text-xl font-black">{score}</div>
              </div>
              <div className="rounded-2xl bg-yellow-100 p-3">
                <div className="text-xs font-bold uppercase text-yellow-700">Level</div>
                <div className="text-xl font-black">{level}</div>
              </div>
              <div className="rounded-2xl bg-red-100 p-3">
                <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase text-red-700">
                  <Heart size={13}/> Lives
                </div>
                <div className="text-xl font-black">{lives}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 font-bold"><Trophy size={18}/> Best Score</div>
              <div className="mt-1 text-2xl font-black">{best}</div>
            </div>

            {message && (
              <p className="rounded-2xl bg-white p-3 text-sm font-semibold shadow-sm">{message}</p>
            )}

            <Button onClick={resetGame} className="w-full rounded-2xl py-5 text-base font-black">
              <RotateCcw className="mr-2" size={18}/> Restart
            </Button>
          </CardContent>
        </Card>

        {/* Board */}
        <div className="flex flex-col items-center gap-3">
          <div
            ref={boardRef}
            className="relative overflow-hidden rounded-3xl border-8 border-white bg-green-400 shadow-2xl"
            style={{ width: BOARD_W, height: BOARD_H, touchAction: "none" }}
            onTouchStart={(e) => {
              swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              swipeFired.current = false;
            }}
            onTouchEnd={() => {
              swipeStart.current = null;
              swipeFired.current = false;
            }}
          >
            {Array.from({ length: GRID_ROWS }, (_, r) => <RowBackground key={r} row={r}/>)}
            {Array.from({ length: GRID_COLS }, (_, c) => (
              <div key={c} className="absolute top-0 h-full border-l border-white/10" style={{ left: c * CELL }}/>
            ))}
            {cars.map((car) => <Car key={car.id} lane={LANES[car.laneIndex]} x={car.x}/>)}

            {status !== "start" && <Chicken position={chicken} hitFlash={hitFlash}/>}

            {/* Start screen */}
            <AnimatePresence>
              {status === "start" && (
                <motion.div
                  key="start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
                >
                  <motion.div
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0,  opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 22 }}
                    className="mx-4 rounded-3xl bg-white pb-8 pt-6 text-center shadow-2xl"
                  >
                    <div className="flex justify-center">
                      <svg viewBox="0 0 44 44" width="72" height="72" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}>
                        <path d="M 9,23 C 1,15 1,8 5,6 C 7,13 8,19 9,23Z"  fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
                        <path d="M 8,28 C 0,23 0,15 4,13 C 6,19 7,25 8,28Z" fill="#FEF3C7" stroke="#92400E" strokeWidth="0.7"/>
                        <path d="M 10,32 C 2,30 0,23 4,20 C 7,25 9,29 10,32Z" fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
                        <ellipse cx="20" cy="28" rx="12" ry="9" fill="#FFFBEB" stroke="#92400E" strokeWidth="1"/>
                        <ellipse cx="19" cy="28" rx="7.5" ry="5" fill="#FEF3C7" stroke="#A16207" strokeWidth="0.6"/>
                        <path d="M 13,27 C 16,25 20,25 22,27" fill="none" stroke="#A16207" strokeWidth="0.5" opacity="0.7"/>
                        <path d="M 12,29 C 15,27 20,27 23,29" fill="none" stroke="#A16207" strokeWidth="0.5" opacity="0.6"/>
                        <path d="M 27,22 C 29,18 31,16 32,17 C 31,20 29,22 28,24Z" fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
                        <circle cx="33" cy="14" r="8" fill="#FFFBEB" stroke="#92400E" strokeWidth="1"/>
                        <path d="M 28,6 C 28,2 30.5,0 31,5 C 32,1 33.5,0 34,5 C 35,1 37,2 36,6" fill="#EF4444" stroke="#DC2626" strokeWidth="0.6" strokeLinejoin="round"/>
                        <ellipse cx="39" cy="21" rx="2.2" ry="3" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5"/>
                        <path d="M 40,12 L 44,14 L 40,17Z" fill="#F97316" stroke="#EA580C" strokeWidth="0.5"/>
                        <circle cx="36" cy="12" r="3" fill="white" stroke="#92400E" strokeWidth="0.5"/>
                        <circle cx="36.8" cy="12" r="1.8" fill="#1C1917"/>
                        <circle cx="36.2" cy="11.2" r="0.7" fill="white"/>
                        <line x1="20" y1="37" x2="18" y2="43" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="25" y1="37" x2="23" y2="43" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M 15,43 L 18,43 L 21,41" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                        <path d="M 20,43 L 23,43 L 26,41" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                      </svg>
                    </div>
                    <p className="mt-3 text-sm text-zinc-500">Dodge traffic. Reach the finish.</p>
                    {best > 0 && (
                      <p className="mt-1 flex items-center justify-center gap-1 text-sm font-bold text-green-700">
                        <Trophy size={14}/> Best: {best}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-400">Swipe · D-pad · Arrow keys</p>
                    <Button
                      onClick={startGame}
                      className="mx-6 mt-5 w-[calc(100%-3rem)] rounded-2xl py-5 text-lg font-black"
                    >
                      Tap to Play
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Game Over screen */}
            <AnimatePresence>
              {status === "gameover" && (
                <motion.div
                  key="gameover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                >
                  <motion.div
                    initial={{ scale: 0.75, opacity: 0 }}
                    animate={{ scale: 1,    opacity: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    className="mx-4 rounded-3xl bg-white p-8 text-center shadow-2xl"
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -8, 8, 0] }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                      className="flex justify-center"
                    >
                      <svg viewBox="0 0 44 44" width="72" height="72" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}>
                        <path d="M 9,23 C 1,15 1,8 5,6 C 7,13 8,19 9,23Z"  fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
                        <path d="M 8,28 C 0,23 0,15 4,13 C 6,19 7,25 8,28Z" fill="#FEF3C7" stroke="#92400E" strokeWidth="0.7"/>
                        <path d="M 10,32 C 2,30 0,23 4,20 C 7,25 9,29 10,32Z" fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
                        <ellipse cx="20" cy="28" rx="12" ry="9" fill="#FFFBEB" stroke="#92400E" strokeWidth="1"/>
                        <ellipse cx="19" cy="28" rx="7.5" ry="5" fill="#FEF3C7" stroke="#A16207" strokeWidth="0.6"/>
                        <path d="M 13,27 C 16,25 20,25 22,27" fill="none" stroke="#A16207" strokeWidth="0.5" opacity="0.7"/>
                        <path d="M 12,29 C 15,27 20,27 23,29" fill="none" stroke="#A16207" strokeWidth="0.5" opacity="0.6"/>
                        <path d="M 27,22 C 29,18 31,16 32,17 C 31,20 29,22 28,24Z" fill="#FFFBEB" stroke="#92400E" strokeWidth="0.7"/>
                        <circle cx="33" cy="14" r="8" fill="#FFFBEB" stroke="#92400E" strokeWidth="1"/>
                        <path d="M 28,6 C 28,2 30.5,0 31,5 C 32,1 33.5,0 34,5 C 35,1 37,2 36,6" fill="#EF4444" stroke="#DC2626" strokeWidth="0.6" strokeLinejoin="round"/>
                        <ellipse cx="39" cy="21" rx="2.2" ry="3" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5"/>
                        <path d="M 40,12 L 44,14 L 40,17Z" fill="#F97316" stroke="#EA580C" strokeWidth="0.5"/>
                        <circle cx="36" cy="12" r="3" fill="white" stroke="#92400E" strokeWidth="0.5"/>
                        <circle cx="36.8" cy="12" r="1.8" fill="#1C1917"/>
                        <circle cx="36.2" cy="11.2" r="0.7" fill="white"/>
                        <line x1="20" y1="37" x2="18" y2="43" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="25" y1="37" x2="23" y2="43" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M 15,43 L 18,43 L 21,41" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                        <path d="M 20,43 L 23,43 L 26,41" stroke="#F97316" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                      </svg>
                    </motion.div>
                    <h2 className="mt-3 text-3xl font-black">Game Over!</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-green-50 p-3">
                        <div className="text-xs font-bold uppercase text-green-700">Score</div>
                        <div className="text-2xl font-black">{score}</div>
                      </div>
                      <div className="rounded-2xl bg-yellow-50 p-3">
                        <div className="text-xs font-bold uppercase text-yellow-700">Best</div>
                        <div className="text-2xl font-black">{best}</div>
                      </div>
                    </div>
                    <Button
                      onClick={resetGame}
                      className="mt-5 w-full rounded-2xl py-5 text-lg font-black"
                    >
                      Play Again
                    </Button>
                    <button
                      onClick={() => setStatus("start")}
                      className="mt-2 w-full rounded-2xl py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-600"
                    >
                      Back to menu
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* D-pad — always visible */}
          <div
            className="grid grid-cols-3 gap-2"
            style={{ width: BOARD_W, paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
          >
            <div/>
            <Button onClick={() => moveChicken(0, -1)} className="rounded-2xl py-5"><ChevronUp size={28}/></Button>
            <div/>
            <Button onClick={() => moveChicken(-1, 0)} className="rounded-2xl py-5"><ChevronLeft size={28}/></Button>
            <div className="rounded-2xl bg-white/40"/>
            <Button onClick={() => moveChicken(1,  0)} className="rounded-2xl py-5"><ChevronRight size={28}/></Button>
            <div/>
            <Button onClick={() => moveChicken(0,  1)} className="rounded-2xl py-5"><ChevronDown size={28}/></Button>
            <div/>
          </div>
        </div>
      </div>
    </div>
  );
}
