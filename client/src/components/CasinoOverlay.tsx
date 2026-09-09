import { useEffect, useRef, useState } from "react";
import { CASINO_BET_OPTIONS, DICE_PAYOUT_MULTIPLIER } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

const SPIN_MS = 900;

export function CasinoOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  const [tab, setTab] = useState<"slots" | "dice">("slots");
  const [bet, setBet] = useState<number>(CASINO_BET_OPTIONS[0]);
  const [choice, setChoice] = useState<"big" | "small">("big");
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
  const dice = state.diceResult;

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

  const diceFace = (n: number) => ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][n - 1] ?? "🎲";

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "close-casino" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>🎰 赌场</h2>
        <p className="panel-balance">💰 余额 {state.money} 元</p>

        <div className="casino-tabs">
          <button
            className={`key-cap ${tab === "slots" ? "bet-selected" : ""}`}
            onClick={() => setTab("slots")}
          >
            🎰 老虎机
          </button>
          <button
            className={`key-cap ${tab === "dice" ? "bet-selected" : ""}`}
            onClick={() => setTab("dice")}
          >
            🎲 骰子大小
          </button>
        </div>

        {tab === "slots" && (
          <>
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
          </>
        )}

        {tab === "dice" && (
          <>
            <div className="slot-window">
              {(dice?.dice ?? [5, 3]).map((n, i) => (
                <span key={i} className="slot-reel dice-face">
                  {diceFace(n)}
                  <small>{n} 点</small>
                </span>
              ))}
            </div>
            {dice && (
              <p className={dice.payout > 0 ? "slot-win" : "slot-lose"}>
                {dice.payout > 0
                  ? `🎉 开出 ${dice.sum} 点，赢了 ${dice.payout} 元！`
                  : `😭 开出 ${dice.sum} 点，押错了…`}
              </p>
            )}
            <p className="panel-hint">
              押大（8-12）或小（2-6），猜中 ×{DICE_PAYOUT_MULTIPLIER}；开出 7 点通杀！
            </p>
            <div className="bet-row">
              <button
                className={`key-cap ${choice === "big" ? "bet-selected" : ""}`}
                onClick={() => setChoice("big")}
              >
                押大 🔴
              </button>
              <button
                className={`key-cap ${choice === "small" ? "bet-selected" : ""}`}
                onClick={() => setChoice("small")}
              >
                押小 🔵
              </button>
              {CASINO_BET_OPTIONS.map((option) => (
                <button
                  key={option}
                  className={`key-cap ${bet === option ? "bet-selected" : ""}`}
                  onClick={() => setBet(option)}
                >
                  {option} 元
                </button>
              ))}
            </div>
            <button
              className="btn"
              disabled={state.money < bet}
              onClick={() => bridge.send({ type: "dice-bet", choice, bet })}
            >
              🎲 掷骰子 (押 {bet})
            </button>
          </>
        )}

        <button className="btn btn-ghost" onClick={() => bridge.send({ type: "close-casino" })}>
          🚪 离开
        </button>
      </div>
    </div>
  );
}