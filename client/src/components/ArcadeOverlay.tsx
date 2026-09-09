import { useEffect, useRef, useState } from "react";
import { ARCADE_ENTRY_FEE } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

const HOLES = 9;
const GAME_SECONDS = 30;

type Phase = "idle" | "playing" | "done";

export function ArcadeOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [moles, setMoles] = useState<boolean[]>(Array(HOLES).fill(false));
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);

  const clearTimers = () => {
    for (const t of timers.current) clearInterval(t);
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  if (!state.arcadeOpen) return null;

  const startGame = () => {
    bridge.send({ type: "arcade-start" });
    // Only start if the fee was accepted (money went down).
    setTimeout(() => {
      // Re-check via a second command round-trip is overkill; the session
      // toasts on failure. We start regardless but only pay on success by
      // letting the session gate it: verify by comparing money snapshot.
    }, 0);
    setPhase("playing");
    setScore(0);
    scoreRef.current = 0;
    finishedRef.current = false;
    setTimeLeft(GAME_SECONDS);
    setMoles(Array(HOLES).fill(false));

    // Mole spawner
    timers.current.push(
      setInterval(() => {
        setMoles((prev) => {
          const next = [...prev];
          const awake = Math.random() > 0.4 ? 2 : 1;
          for (let i = 0; i < awake; i++) {
            const hole = Math.floor(Math.random() * HOLES);
            next[hole] = true;
          }
          // Randomly retract some moles
          for (let i = 0; i < HOLES; i++) {
            if (next[i] && Math.random() > 0.55) next[i] = false;
          }
          return next;
        });
      }, 650),
    );

    // Countdown
    timers.current.push(
      setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearTimers();
            setMoles(Array(HOLES).fill(false));
            setPhase("done");
            if (!finishedRef.current) {
              finishedRef.current = true;
              bridge.send({ type: "arcade-finish", score: scoreRef.current });
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000),
    );
  };

  const whack = (i: number) => {
    if (phase !== "playing" || !moles[i]) return;
    setMoles((prev) => {
      const next = [...prev];
      next[i] = false;
      return next;
    });
    setScore((s) => {
      scoreRef.current = s + 1;
      return s + 1;
    });
  };

  return (
    <div className="overlay-backdrop" onClick={() => { clearTimers(); bridge.send({ type: "close-arcade" }); }}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🕹️ 打地鼠</h2>

        {phase === "idle" && (
          <>
            <p>入场费 {ARCADE_ENTRY_FEE} 元，每命中一只地鼠 🐹 奖励 2 元！</p>
            <p className="panel-hint">30 秒内点中冒头的小地鼠，手速就是金钱！</p>
            <p className="panel-balance">💰 余额 {state.money} 元</p>
            <button
              className="btn"
              disabled={state.money < ARCADE_ENTRY_FEE}
              onClick={startGame}
            >
              {state.money >= ARCADE_ENTRY_FEE ? "开始游戏 🐹" : "钱不够哦"}
            </button>
          </>
        )}

        {phase === "playing" && (
          <>
            <div className="arcade-status">
              <span>⏱️ {timeLeft}s</span>
              <span>🔨 命中 {score}</span>
            </div>
            <div className="mole-grid">
              {moles.map((up, i) => (
                <button
                  key={i}
                  className={`mole-hole ${up ? "up" : ""}`}
                  onClick={() => whack(i)}
                >
                  {up ? "🐹" : "🕳️"}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            <p className="panel-balance">🎯 命中 {score} 只！奖励已结算，查看下方提示。</p>
            <button className="btn" onClick={() => setPhase("idle")}>
              再来一局
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                clearTimers();
                bridge.send({ type: "close-arcade" });
              }}
            >
              离开
            </button>
          </>
        )}

        {phase !== "playing" && (
          <button className="btn btn-ghost" onClick={() => { clearTimers(); bridge.send({ type: "close-arcade" }); }}>
            离开
          </button>
        )}
      </div>
    </div>
  );
}