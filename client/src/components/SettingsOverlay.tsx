import { useState } from "react";
import { effectiveVolume, makeAudioSettings } from "shared";
import { useGameState } from "../hooks/useGameState";
import type { GameBridge } from "../game/bridge";

const ACTION_LABELS: Record<string, string> = {
  moveUp: "上移",
  moveDown: "下移",
  moveLeft: "左移",
  moveRight: "右移",
  chop: "砍树",
  openInventory: "背包",
  interact: "交互",
  openSettings: "设置",
};

export function SettingsOverlay({ bridge }: { bridge: GameBridge }) {
  const state = useGameState(bridge);
  const [capturing, setCapturing] = useState<string | null>(null);

  if (!state.settingsOpen) return null;

  const volume = effectiveVolume(state.audio);

  const setMaster = (v: number) =>
    bridge.send({
      type: "set-audio",
      audio: makeAudioSettings({ ...state.audio, master: v }),
    });
  const setMusic = (v: number) =>
    bridge.send({
      type: "set-audio",
      audio: makeAudioSettings({ ...state.audio, music: v }),
    });
  const setSfx = (v: number) =>
    bridge.send({
      type: "set-audio",
      audio: makeAudioSettings({ ...state.audio, sfx: v }),
    });

  const captureKey = (e: React.KeyboardEvent, action: string) => {
    e.preventDefault();
    if (e.key === "Escape" && capturing === action) {
      setCapturing(null);
      return;
    }
    const key = encodeKey(e);
    if (!key) return;
    bridge.send({ type: "rebind", action, key });
    setCapturing(null);
  };

  const rows = Object.entries(state.bindings);

  return (
    <div className="overlay-backdrop" onClick={() => bridge.send({ type: "toggle-settings" })}>
      <div className="panel panel-lg" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 设置</h2>

        <section>
          <h3>🔊 声音</h3>
          <label className="slider-row">
            主音量 <b>{Math.round(volume * 100)}%</b>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.audio.master}
              onChange={(e) => setMaster(Number(e.target.value))}
            />
          </label>
          <label className="slider-row">
            音乐 <b>{Math.round(state.audio.music * 100)}%</b>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.audio.music}
              onChange={(e) => setMusic(Number(e.target.value))}
            />
          </label>
          <label className="slider-row">
            音效 <b>{Math.round(state.audio.sfx * 100)}%</b>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.audio.sfx}
              onChange={(e) => setSfx(Number(e.target.value))}
            />
          </label>
        </section>

        <section>
          <h3>⌨️ 按键设置</h3>
          {capturing && <p className="capture-hint">按下新按键…（Esc 取消）</p>}
          <ul className="binding-list">
            {rows.map(([action, key]) => (
              <li key={action}>
                <span>{ACTION_LABELS[action] ?? action}</span>
                <button
                  className="key-cap"
                  onClick={() => setCapturing(capturing === action ? null : action)}
                  onKeyDown={(e) => capturing === action && captureKey(e, action)}
                >
                  {capturing === action ? "…" : prettyKey(key)}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <button className="btn" onClick={() => bridge.send({ type: "toggle-settings" })}>
          关闭
        </button>
      </div>
    </div>
  );
}

function encodeKey(e: React.KeyboardEvent): string | null {
  if (e.repeat) return null;
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null;
  if (e.key === " ") return "Space";
  if (e.key.startsWith("Arrow")) {
    return `Key${e.key.replace("Arrow", "")}`;
  }
  if (e.key.length === 1) return `Key${e.key.toUpperCase()}`;
  if (e.key === "Escape") return "Escape";
  return null;
}

function prettyKey(key: string): string {
  return key
    .replace(/^Key/, "")
    .replace(/^Mouse(\d)$/, "鼠标$1")
    .replace("Space", "空格");
}