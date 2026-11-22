import { useState } from "react";
import NeonGame from "./game/NeonGame";

type Panel = "settings" | "leaderboard" | "about" | null;

function App() {
  const [panel, setPanel] = useState<Panel>(null);

  const [screen, setScreen] = useState<"menu" | "game">("menu");

  if (screen === "game") {
    return <NeonGame onExit={() => setScreen("menu")} />;
  }

  return (
    <main className="main-menu">
      <div className="sky" />
      <div className="moon" />
      <div className="stars" />

      <div className="city city-back" />
      <div className="city city-front" />

      <div className="neon-line neon-line-one" />
      <div className="neon-line neon-line-two" />

      <div className="menu-content">
        <div className="brand">
          <span className="brand-top">THE FUTURE IS</span>
          <h1>
            NEON
            <span>RUSH</span>
          </h1>
          <p>RUN • DODGE • SURVIVE</p>
        </div>

        <div className="menu-buttons">
          <button
            className="menu-btn play-btn"
            onClick={() => setScreen("game")}
          >
            <span>▶</span>
            PLAY NOW
          </button>

          <button className="menu-btn" onClick={() => setPanel("settings")}>
            <span>⚙</span>
            SETTINGS
          </button>

          <button className="menu-btn" onClick={() => setPanel("leaderboard")}>
            <span>🏆</span>
            LEADERBOARD
          </button>

          <button className="menu-btn" onClick={() => setPanel("about")}>
            <span>ⓘ</span>
            ABOUT
          </button>
        </div>
      </div>

      <div className="hero-character">
        <div className="character-aura" />
        <div className="character-body">
          <div className="character-head" />
          <div className="character-torso" />
          <div className="character-leg leg-one" />
          <div className="character-leg leg-two" />
        </div>
        <span className="character-label">PLAYER_01</span>
      </div>

      <div className="ground">
        <div className="ground-glow" />
        <div className="ground-grid" />
      </div>

      <div className="menu-footer">
        <span>NEON RUSH © 2026</span>
        <span>VERSION 1.0.0</span>
      </div>

      {panel && (
        <div className="modal-backdrop" onClick={() => setPanel(null)}>
          <section className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPanel(null)}>
              ×
            </button>

            {panel === "settings" && (
              <>
                <h2>SETTINGS</h2>
                <p>Configure your experience.</p>
                <div className="setting-row">
                  <span>Music</span>
                  <span className="setting-value">ON</span>
                </div>
                <div className="setting-row">
                  <span>Sound Effects</span>
                  <span className="setting-value">ON</span>
                </div>
                <div className="setting-row">
                  <span>Controls</span>
                  <span className="setting-value">KEYBOARD / TOUCH</span>
                </div>
              </>
            )}

            {panel === "leaderboard" && (
              <>
                <h2>LEADERBOARD</h2>
                <p>TOP RUNNERS</p>
                <div className="setting-row">
                  <span>01 — Shadow</span>
                  <strong>12500</strong>
                </div>
                <div className="setting-row">
                  <span>02 — NeonX</span>
                  <strong>9800</strong>
                </div>
                <div className="setting-row">
                  <span>03 — Cyber</span>
                  <strong>7500</strong>
                </div>
                <p className="modal-note">
                  Demo scores — local leaderboard coming soon.
                </p>
              </>
            )}

            {panel === "about" && (
              <>
                <h2>ABOUT THE GAME</h2>
                <p>
                  The city never sleeps. Run through the neon streets, dodge
                  obstacles and beat your record.
                </p>
                <p className="modal-note">NEON RUSH — RUN. DODGE. SURVIVE.</p>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
