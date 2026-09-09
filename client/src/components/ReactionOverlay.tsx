import { useEffect, useRef, useState } from "react";
import { REACTION_ENTRY_FEE } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

type Phase = "idle" | "waiting" | "go" | "done";

/** Reaction minigame: wait for the green light, click ASAP. */
export function ReactionOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  const [phase, setPhase] = useState<Phase>("idle");
  const [ms, setMs] = useState<number | null>(null);
  const goAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!state.reactionOpen) return null;

  const start = () => {
    bridge.send({ type: "reaction-start" });
    setPhase("waiting");
    setMs(null);
    timerRef.current = setTimeout(() => {
      goAtRef.current = performance.now();
      setPhase("go");
    }, 1500 + Math.random() * 3000);
  };

  const click = () => {
    if (phase === "waiting") {
      // Too early!
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("idle");
      bridge.send({ type: "reaction-finish", ms: -1 });
      return;
    }
    if (phase === "go") {
      const delta = performance.now() - goAtRef.current;
      setMs(delta);
      setPhase("done");
      bridge.send({ type: "reaction-finish", ms: delta });
    }
  };

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-reaction" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>⚡ 极速反应</h2>
        {phase === "idle" && (
          <>
            <p>入场费 {REACTION_ENTRY_FEE} 元。信号灯变绿后立刻点击，越快奖励越高！</p>
            <p className="panel-hint">🟢 ≤200ms 奖 100 元；抢跑没有奖励哦。</p>
            <p className="panel-balance">💰 余额 {state.money} 元</p>
            <button
              className="btn"
              disabled={state.money < REACTION_ENTRY_FEE}
              onClick={start}
            >
              {state.money >= REACTION_ENTRY_FEE ? "开始挑战 ⚡" : "钱不够哦"}
            </button>
          </>
        )}
        {phase === "waiting" && (
          <button className="reaction-pad waiting" onClick={click}>
            ⏳ 等待信号…变绿就点！
          </button>
        )}
        {phase === "go" && (
          <button className="reaction-pad go" onClick={click}>
            🟢 就是现在！点！
          </button>
        )}
        {phase === "done" && ms !== null && (
          <>
            <p className="panel-balance">⚡ 反应 {Math.round(ms)} ms</p>
            <button className="btn" onClick={() => setPhase("idle")}>
              再来一次
            </button>
          </>
        )}
        {phase !== "waiting" && phase !== "go" && (
          <button
            className="btn btn-ghost"
            onClick={() => bridge.send({ type: "close-reaction" })}
          >
            离开
          </button>
        )}
      </div>
    </div>
  );
}