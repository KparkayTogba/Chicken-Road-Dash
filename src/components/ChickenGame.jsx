import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Trophy, Heart, Keyboard } from "lucide-react";
let _audioCtx = null;
function getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === "suspended") _audioCtx.resume();
  return _audioCtx;
}
function tone(freq, dur, vol = 0.3, type = "sine", delay = 0) {
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

const Button = ({ children, className = "", ...props }) => (
  <button
    className={`bg-black text-white px-4 py-2 rounded-xl ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl shadow ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const GRID_COLS = 11;
const GRID_ROWS = 13;
const CELL = 44;
const BOARD_W = GRID_COLS * CELL;
const BOARD_H = GRID_ROWS * CELL;

const LANES = [
  { row: 2, speed: 1.4,  dir:  1, cars: [0, 4, 8],    colors: ["#ef4444","#991b1b"], make: "Chevy",  body: "suv"   },
  { row: 3, speed: 1.05, dir: -1, cars: [1, 6, 10],   colors: ["#475569","#0f172a"], make: "Benz",   body: "sedan" },
  { row: 5, speed: 1.6,  dir:  1, cars: [2, 7],        colors: ["#3b82f6","#1e3a8a"], make: "BMW",    body: "coupe" },
  { row: 6, speed: 1.2,  dir: -1, cars: [0, 5, 9],    colors: ["#f97316","#9a3412"], make: "Toyota", body: "hatch" },
  { row: 8, speed: 1.75, dir:  1, cars: [1, 6],        colors: ["#cbd5e1","#475569"], make: "Lexus",  body: "suv"   },
  { row: 9, speed: 1.35, dir: -1, cars: [3, 8],        colors: ["#ec4899","#86198f"], make: "Nissan", body: "sedan" },
];

const CAR_SHAPES = {
  sedan: {
    body: "M 22,8 C 8,8 5,16 5,22 L 5,48 C 5,54 8,62 22,62 L 138,62 C 152,62 155,54 155,48 L 155,22 C 155,16 152,8 138,8 Z",
    ws:  { x1: 98,  x2: 114 },
    cab: { x: 57,  w: 41 },
    rw:  { x1: 44,  x2: 57  },
    ti:  { fX: 116, rX: 16, w: 27, h: 13 },
    li:  { hX: 148, tX: 3, y1: 12, y2: 48, lH: 10 },
    mi:  { x: 95 },
  },
  suv: {
    body: "M 18,5 C 5,5 4,13 4,20 L 4,50 C 4,57 5,65 18,65 L 142,65 C 155,65 156,57 156,50 L 156,20 C 156,13 155,5 142,5 Z",
    ws:  { x1: 102, x2: 122 },
    cab: { x: 58,  w: 44 },
    rw:  { x1: 42,  x2: 58  },
    ti:  { fX: 118, rX: 14, w: 30, h: 15 },
    li:  { hX: 148, tX: 2, y1: 10, y2: 50, lH: 11 },
    mi:  { x: 100 },
  },
  coupe: {
    body: "M 26,10 C 12,10 8,18 8,24 L 8,46 C 8,52 12,60 26,60 L 134,60 C 148,58 152,50 152,46 L 152,24 C 152,20 148,12 134,10 Z",
    ws:  { x1: 106, x2: 124 },
    cab: { x: 66,  w: 40 },
    rw:  { x1: 50,  x2: 66  },
    ti:  { fX: 118, rX: 18, w: 24, h: 12 },
    li:  { hX: 145, tX: 4, y1: 13, y2: 47, lH: 9  },
    mi:  { x: 104 },
  },
  hatch: {
    body: "M 20,8 C 8,8 6,15 6,22 L 6,48 C 6,55 8,62 20,62 L 130,62 C 142,60 148,52 148,48 L 148,22 C 148,18 142,10 130,8 Z",
    ws:  { x1: 94,  x2: 110 },
    cab: { x: 50,  w: 44 },
    rw:  { x1: 36,  x2: 50  },
    ti:  { fX: 108, rX: 14, w: 26, h: 13 },
    li:  { hX: 141, tX: 3, y1: 12, y2: 48, lH: 10 },
    mi:  { x: 92 },
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cellToPx(position) {
  return {
    left: position.x * CELL,
    top: position.y * CELL,
  };
}

function isRoad(row) {
  return LANES.some((lane) => lane.row === row);
}

function isSafeGrass(row) {
  return [0, 1, 4, 7, 10, 11, 12].includes(row);
}

function Chicken({ position, hitFlash }) {
  const px = cellToPx(position);

  return (
    <motion.div
      className="absolute z-20 flex items-center justify-center text-3xl"
      animate={{ left: px.left, top: px.top, scale: hitFlash ? 1.2 : 1 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      style={{ width: CELL, height: CELL }}
      aria-label="Chicken player"
    >
      <div className="drop-shadow-md">🐔</div>
    </motion.div>
  );
}

function Car({ lane, x }) {
  const W = { suv: CELL * 1.65, coupe: CELL * 1.5, sedan: CELL * 1.42, hatch: CELL * 1.42 }[lane.body] ?? CELL * 1.42;
  const H = { suv: CELL * 0.82, coupe: CELL * 0.72, sedan: CELL * 0.72, hatch: CELL * 0.74 }[lane.body] ?? CELL * 0.72;
  const top = lane.row * CELL + (CELL - H) / 2;
  const flip = lane.dir === -1;
  const [c1, c2] = lane.colors;
  const s = CAR_SHAPES[lane.body] ?? CAR_SHAPES.sedan;
  const { ws, cab, rw, ti, li, mi } = s;

  return (
    <div className="absolute z-10" style={{ left: x, top, width: W, height: H }} aria-label={`${lane.make}`}>
      <svg
        viewBox="0 0 160 70"
        width={W}
        height={H}
        style={{ overflow: "visible", transform: flip ? "scaleX(-1)" : undefined }}
      >
        {/* Tires — drawn first so body sits on top */}
        <rect x={ti.fX} y={-2}           width={ti.w} height={ti.h} rx="3" fill="#0f172a" />
        <rect x={ti.fX} y={72 - ti.h}    width={ti.w} height={ti.h} rx="3" fill="#0f172a" />
        <rect x={ti.rX} y={-2}           width={ti.w} height={ti.h} rx="3" fill="#0f172a" />
        <rect x={ti.rX} y={72 - ti.h}    width={ti.w} height={ti.h} rx="3" fill="#0f172a" />
        {/* Rims */}
        <rect x={ti.fX + 4} y={0}          width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b" />
        <rect x={ti.fX + 4} y={74 - ti.h}  width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b" />
        <rect x={ti.rX + 4} y={0}          width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b" />
        <rect x={ti.rX + 4} y={74 - ti.h}  width={ti.w - 8} height={ti.h - 4} rx="2" fill="#1e293b" />
        {/* Hub dots */}
        <circle cx={ti.fX + ti.w / 2} cy={ti.h / 2 - 2}  r="2.5" fill="#334155" />
        <circle cx={ti.fX + ti.w / 2} cy={70 - ti.h / 2 + 2} r="2.5" fill="#334155" />
        <circle cx={ti.rX + ti.w / 2} cy={ti.h / 2 - 2}  r="2.5" fill="#334155" />
        <circle cx={ti.rX + ti.w / 2} cy={70 - ti.h / 2 + 2} r="2.5" fill="#334155" />

        {/* Body */}
        <path d={s.body} fill={c1} />
        {/* Darker paint on lower half */}
        <path d={s.body} fill={c2} opacity="0.30" />
        {/* Top-edge gloss */}
        <path d={s.body} fill="white" opacity="0.08" />

        {/* Hood panel (front) */}
        <rect x={ws.x2} y="7" width="50" height="56" rx="4" fill={c2} opacity="0.18" />
        {/* Trunk panel (rear) */}
        <rect x="5" y="9" width={rw.x1 - 3} height="52" rx="4" fill={c2} opacity="0.14" />

        {/* Windshield */}
        <path d={`M ${ws.x1},13 L ${ws.x2},10 L ${ws.x2},60 L ${ws.x1},57 Z`} fill="#bfdbfe" opacity="0.88" />
        {/* Windshield glare streak */}
        <path d={`M ${ws.x1 + 2},14 L ${ws.x2 - 2},11 L ${ws.x2 - 2},24 L ${ws.x1 + 2},27 Z`} fill="white" opacity="0.22" />

        {/* Cabin roof */}
        <rect x={cab.x} y="11" width={cab.w} height="48" rx="3" fill="#0f172a" opacity="0.92" />
        {/* Roof gloss bar */}
        <rect x={cab.x + 4} y="13" width={cab.w - 8} height="8" rx="2" fill="white" opacity="0.10" />

        {/* Rear window */}
        <path d={`M ${rw.x1},13 L ${rw.x2},10 L ${rw.x2},60 L ${rw.x1},57 Z`} fill="#bfdbfe" opacity="0.76" />

        {/* Side windows (top + bottom strips) */}
        <rect x={cab.x + 2} y="7"  width={cab.w - 4} height="8" rx="2" fill="#bfdbfe" opacity="0.65" />
        <rect x={cab.x + 2} y="55" width={cab.w - 4} height="8" rx="2" fill="#bfdbfe" opacity="0.65" />

        {/* Headlights (front = right) */}
        <rect x={li.hX} y={li.y1} width="10" height={li.lH} rx="2" fill="#fef9c3" />
        <rect x={li.hX} y={li.y2} width="10" height={li.lH} rx="2" fill="#fef9c3" />
        <rect x={li.hX + 2} y={li.y1 + 2} width="6" height={li.lH - 4} rx="1" fill="white" opacity="0.8" />
        <rect x={li.hX + 2} y={li.y2 + 2} width="6" height={li.lH - 4} rx="1" fill="white" opacity="0.8" />

        {/* Tail lights (rear = left) */}
        <rect x={li.tX} y={li.y1} width="10" height={li.lH} rx="2" fill="#f87171" />
        <rect x={li.tX} y={li.y2} width="10" height={li.lH} rx="2" fill="#f87171" />
        <rect x={li.tX + 2} y={li.y1 + 2} width="6" height={li.lH - 4} rx="1" fill="#fca5a5" opacity="0.85" />
        <rect x={li.tX + 2} y={li.y2 + 2} width="6" height={li.lH - 4} rx="1" fill="#fca5a5" opacity="0.85" />

        {/* Side mirrors */}
        <rect x={mi.x} y="3"  width="12" height="6" rx="2" fill={c1} stroke={c2} strokeWidth="0.8" />
        <rect x={mi.x} y="61" width="12" height="6" rx="2" fill={c1} stroke={c2} strokeWidth="0.8" />

        {/* Body outline */}
        <path d={s.body} fill="none" stroke={c2} strokeWidth="1.5" opacity="0.35" />
      </svg>
    </div>
  );
}

function RowBackground({ row }) {
  let className = "bg-green-400";
  let label = "grass";

  if (row === 0) {
    className = "bg-yellow-300";
    label = "finish line";
  } else if (isRoad(row)) {
    className = "bg-zinc-700";
    label = "road";
  } else if (isSafeGrass(row)) {
    className = "bg-green-400";
  }

  return (
    <div
      className={`absolute left-0 w-full ${className}`}
      style={{ top: row * CELL, height: CELL }}
      aria-label={label}
    >
      {isRoad(row) && (
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 bg-yellow-200/70 bg-[length:44px_4px]" />
      )}
      {row === 0 && (
        <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.35em] text-yellow-900">
          Finish
        </div>
      )}
    </div>
  );
}

export default function ChickenCrossTheRoadGame() {
  const startPosition = useMemo(() => ({ x: 5, y: 12 }), []);
  const [chicken, setChicken] = useState(startPosition);
  const [cars, setCars] = useState(() =>
    LANES.flatMap((lane, laneIndex) =>
      lane.cars.map((cellX, carIndex) => ({
        id: `${laneIndex}-${carIndex}`,
        laneIndex,
        x: cellX * CELL,
      }))
    )
  );
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState("playing");
  const [message, setMessage] = useState("Use arrow keys or WASD to cross safely.");
  const [hitFlash, setHitFlash] = useState(false);
  const chickenRef = useRef(chicken);
  const statusRef = useRef(status);
  const livesRef = useRef(lives);
  const levelRef = useRef(level);

  useEffect(() => { chickenRef.current = chicken; }, [chicken]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { levelRef.current = level; }, [level]);

  const resetRound = () => setChicken(startPosition);

  const resetGame = () => {
    setChicken(startPosition);
    setScore(0);
    setLevel(1);
    setLives(3);
    setStatus("playing");
    setMessage("Use arrow keys or WASD to cross safely.");
    setCars(
      LANES.flatMap((lane, laneIndex) =>
        lane.cars.map((cellX, carIndex) => ({
          id: `${laneIndex}-${carIndex}`,
          laneIndex,
          x: cellX * CELL,
        }))
      )
    );
  };

  const moveChicken = (dx, dy) => {
    if (statusRef.current !== "playing") return;

    const current = chickenRef.current;
    const next = {
      x: clamp(current.x + dx, 0, GRID_COLS - 1),
      y: clamp(current.y + dy, 0, GRID_ROWS - 1),
    };

    if (next.y === 0) {
      playLevel();
      setScore((old) => {
        const updated = old + 100 * levelRef.current;
        setBest((prev) => Math.max(prev, updated));
        return updated;
      });
      setLevel((old) => old + 1);
      setMessage("Nice crossing! Traffic is getting faster.");
      setTimeout(resetRound, 120);
    } else {
      playMove();
      if (next.y < current.y) {
        setScore((old) => {
          const updated = old + 5;
          setBest((prev) => Math.max(prev, updated));
          return updated;
        });
      }
    }

    setChicken(next);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "w"].includes(key)) moveChicken(0, -1);
      if (["arrowdown", "s"].includes(key)) moveChicken(0, 1);
      if (["arrowleft", "a"].includes(key)) moveChicken(-1, 0);
      if (["arrowright", "d"].includes(key)) moveChicken(1, 0);
      if (key === "r") resetGame();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let animationFrame;
    let lastTime = performance.now();

    const tick = (now) => {
      const delta = Math.min(32, now - lastTime);
      lastTime = now;

      if (statusRef.current === "playing") {
        setCars((currentCars) =>
          currentCars.map((car) => {
            const lane = LANES[car.laneIndex];
            const speedBoost = 1 + (levelRef.current - 1) * 0.12;
            let nextX = car.x + lane.speed * lane.dir * speedBoost * (delta / 16.67);
            const carWidth = CELL * 1.65;

            if (lane.dir === 1 && nextX > BOARD_W + carWidth) nextX = -carWidth;
            if (lane.dir === -1 && nextX < -carWidth) nextX = BOARD_W + carWidth;

            return { ...car, x: nextX };
          })
        );
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;

    const chickenBox = {
      left: chicken.x * CELL + 8,
      right: chicken.x * CELL + CELL - 8,
      top: chicken.y * CELL + 8,
      bottom: chicken.y * CELL + CELL - 8,
    };

    const hit = cars.some((car) => {
      const lane = LANES[car.laneIndex];
      if (lane.row !== chicken.y) return false;

      const carWidth  = { suv: CELL * 1.65, coupe: CELL * 1.5, sedan: CELL * 1.42, hatch: CELL * 1.42 }[lane.body] ?? CELL * 1.42;
      const carHeight = { suv: CELL * 0.82, coupe: CELL * 0.72, sedan: CELL * 0.72, hatch: CELL * 0.74 }[lane.body] ?? CELL * 0.72;

      const carBox = {
        left: car.x,
        right: car.x + carWidth,
        top: lane.row * CELL + (CELL - carHeight) / 2,
        bottom: lane.row * CELL + (CELL - carHeight) / 2 + carHeight,
      };

      return (
        chickenBox.left < carBox.right &&
        chickenBox.right > carBox.left &&
        chickenBox.top < carBox.bottom &&
        chickenBox.bottom > carBox.top
      );
    });

    if (hit) {
      playHit();
      setHitFlash(true);
      setTimeout(() => setHitFlash(false), 180);

      if (livesRef.current <= 1) {
        setLives(0);
        setStatus("gameover");
        setMessage("Game over. Press R or tap Restart to try again.");
      } else {
        setLives((old) => old - 1);
        setMessage("Careful! You lost a life.");
        resetRound();
      }
    }
  }, [cars, chicken, status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-green-100 to-yellow-100 p-4 text-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-center">
        <Card className="w-full border-white/70 bg-white/75 shadow-xl backdrop-blur lg:max-w-xs">
          <CardContent className="space-y-5 p-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-700">Arcade Game</p>
              <h1 className="mt-2 text-3xl font-black leading-tight">Chicken Cross the Road</h1>
              <p className="mt-2 text-sm text-zinc-600">Dodge traffic, reach the finish line, and survive as each level speeds up.</p>
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
                <div className="flex items-center justify-center gap-1 text-xs font-bold uppercase text-red-700"><Heart size={14} /> Lives</div>
                <div className="text-xl font-black">{lives}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 font-bold"><Trophy size={18} /> Best Score</div>
              <div className="mt-1 text-2xl font-black">{best}</div>
            </div>

            <div className="rounded-2xl bg-zinc-900 p-4 text-white">
              <div className="mb-2 flex items-center gap-2 font-bold"><Keyboard size={18} /> Controls</div>
              <p className="text-sm text-zinc-200">Arrow keys or WASD to move. Press R to restart.</p>
            </div>

            <p className="rounded-2xl bg-white p-4 text-sm font-semibold shadow-sm">{message}</p>

            <Button onClick={resetGame} className="w-full rounded-2xl py-6 text-base font-black">
              <RotateCcw className="mr-2" size={18} /> Restart Game
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-3">
          <div
            className="relative overflow-hidden rounded-3xl border-8 border-white bg-green-400 shadow-2xl"
            style={{ width: BOARD_W, height: BOARD_H }}
          >
            {Array.from({ length: GRID_ROWS }, (_, row) => (
              <RowBackground key={row} row={row} />
            ))}

            {Array.from({ length: GRID_COLS }, (_, col) => (
              <div
                key={col}
                className="absolute top-0 h-full border-l border-white/10"
                style={{ left: col * CELL }}
              />
            ))}

            {cars.map((car) => (
              <Car key={car.id} lane={LANES[car.laneIndex]} x={car.x} />
            ))}

            <Chicken position={chicken} hitFlash={hitFlash} />

            {status === "gameover" && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6 text-center text-white backdrop-blur-sm">
                <div className="rounded-3xl bg-white p-6 text-zinc-900 shadow-2xl">
                  <div className="text-5xl">💥</div>
                  <h2 className="mt-3 text-3xl font-black">Game Over</h2>
                  <p className="mt-2 text-sm text-zinc-600">Final score: {score}</p>
                  <Button onClick={resetGame} className="mt-5 rounded-2xl px-6 py-5 font-black">
                    Play Again
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:hidden">
            <Button onClick={() => moveChicken(-1, 0)} className="rounded-2xl">←</Button>
            <Button onClick={() => moveChicken(0, -1)} className="rounded-2xl">↑</Button>
            <Button onClick={() => moveChicken(1, 0)} className="rounded-2xl">→</Button>
            <div />
            <Button onClick={() => moveChicken(0, 1)} className="rounded-2xl">↓</Button>
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
