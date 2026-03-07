import React, { useState, useEffect, useRef } from "react";
import { PALETTE } from "../constants";

const CORRECT_PIN = "5832";
const SESSION_KEY = "lufa-pin-unlocked";

export default function PinLock({ onUnlock }) {
  const [digits, setDigits]   = useState(["", "", "", ""]);
  const [shake,  setShake]    = useState(false);
  const [error,  setError]    = useState(false);
  const inputRefs             = [useRef(), useRef(), useRef(), useRef()];

  // Auto-focus first input on mount
  useEffect(() => { inputRefs[0].current?.focus(); }, []);

  const handleKey = (index, val) => {
    // Only allow single digit
    const digit = val.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(false);

    // Move to next field
    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 filled
    if (digit && index === 3) {
      const pin = [...next].join("");
      setTimeout(() => checkPin(pin, next), 80);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === "Enter") {
      const pin = digits.join("");
      if (pin.length === 4) checkPin(pin, digits);
    }
  };

  const checkPin = (pin, currentDigits) => {
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setShake(true);
      setError(true);
      setDigits(["", "", "", ""]);
      setTimeout(() => {
        setShake(false);
        inputRefs[0].current?.focus();
      }, 600);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${PALETTE.bg} 0%, #121e14 60%, #0d1820 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#fff",
      userSelect: "none",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: `linear-gradient(135deg, ${PALETTE.greenLight}, ${PALETTE.green})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, margin: "0 auto 16px",
          boxShadow: `0 8px 32px ${PALETTE.green}44`,
        }}>🌱</div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Fiches Événements</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Lufa Farms · Coordination terrain</div>
      </div>

      {/* PIN prompt */}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 24, letterSpacing: "0.05em" }}>
        Entrez votre NIP pour accéder
      </div>

      {/* PIN dots */}
      <div style={{
        display: "flex", gap: 14,
        animation: shake ? "shake 0.5s ease" : "none",
      }}>
        {digits.map((d, i) => (
          <div key={i} style={{ position: "relative" }}>
            <input
              ref={inputRefs[i]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleKey(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 56, height: 64,
                background: d
                  ? `linear-gradient(135deg, ${PALETTE.green}88, ${PALETTE.greenDark}88)`
                  : "rgba(255,255,255,0.06)",
                border: error
                  ? "2px solid rgba(239,83,80,0.6)"
                  : d
                    ? `2px solid ${PALETTE.greenLight}88`
                    : "2px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                color: "transparent",
                caretColor: "transparent",
                fontSize: 28,
                textAlign: "center",
                fontFamily: "inherit",
                fontWeight: 800,
                outline: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                WebkitTextSecurity: "disc",
              }}
            />
            {/* Filled dot indicator */}
            {d && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: 10, height: 10, borderRadius: "50%",
                background: PALETTE.greenLight,
                pointerEvents: "none",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      <div style={{
        marginTop: 20, height: 20, fontSize: 13,
        color: "rgba(239,83,80,0.8)",
        transition: "opacity 0.2s",
        opacity: error ? 1 : 0,
      }}>
        NIP incorrect — réessayez
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
