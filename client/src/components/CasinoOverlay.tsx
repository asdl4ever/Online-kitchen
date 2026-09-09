import { useEffect, useRef, useState } from "react";
import { CASINO_BET_OPTIONS } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

const SPIN_MS = 900;

export function CasinoOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  const [bet, setBet] = useState<number>(CASINO_BET_OPTIONS[0]);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState<string[]>(["🍒", "🍋", "🍇"]);
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (spinTimer.current) clearInterval(spinTimer.current);
      if (stopTimer.current) clearTimeout(stopTimer.current);
    },
    [],
  );

  if (!state.casinoOpen) return null;

  const result = state.casinoResult;

  const spin = () => {
    if (spinning) return;
    if (state.money < bet) return;
    bridge.send({ type: "casino-spin", bet });
    setSpinning(true);
    spinTimer.current = setInterval(() => {
      setDisplay([
        ["🍒", "🍋", "🍇", "🔔", "⭐", "7️⃣"][Math.floor(Math.random() * 6)],
        ["🍒", "🍋", "🍇", "🔔", "⭐", "7️⃣"][Math.floor(Math.random() * 6)],
        ["🍒", "🍋", "🍇", "🔔", "⭐", "7️⃣"][Math.floor(Math.random() * 6)],
      ]);
    }, 90);
    stopTimer.current = setTimeout(() => {
      if (spinTimer.current) clearInterval(spinTimer.current);
      setSpinning(false);
      if (result) setDisplay(result.reels);
    }, SPIN_MS);
  };

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-casino" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🎰 幸运老虎机</h2>
        <p className="panel-balance">💰 余额 {state.money} 元</p>

        <div className={`slot-window ${spinning ? "spinning" : ""}`}>
          {display.map((symbol, i) => (
            <span key={i} className="slot-reel">
              {symbol}
            </span>
          ))}
        </div>

        {result && !spinning && (
          <p className={result.payout > 0 ? "slot-win" : "slot-lose"}>
            {result.payout > 0
              ? `🎉 中了 ${result.payout} 元！(押注 ${result.bet})`
              : `😭 没中，${result.bet} 元打了水漂…`}
          </p>
        )}
        <p className="panel-hint">
          🍒🍋🍇 三个相同 = 大奖；三个 7️⃣ = 头奖 ×15；两个相同 = ×1.5
        </p>

        <div className="bet-row">
          {CASINO_BET_OPTIONS.map((option) => (
            <button
              key={option}
              className={`key-cap ${bet === option ? "bet-selected" : ""}`}
              onClick={() => setBet(option)}
            >
              押 {option} 元
            </button>
          ))}
        </div>

        <button
          className="btn"
          disabled={spinning || state.money < bet}
          onClick={spin}
        >
          {spinning ? "转动中…" : `🎰 开转 (押 ${bet})`}
        </button>
        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-casino" })}>
          🚪 离开
        </button>
      </div>
    </div>
  );
}