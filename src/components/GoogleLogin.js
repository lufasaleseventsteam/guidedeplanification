import React, { useState, useEffect, useRef } from "react";
import { PALETTE } from "../constants";
import { LOGO_B64 } from "../logo_lufa.js";
import { signInWithGoogle, getSavedSession, CLIENT_ID } from "../googleAuth";

export default function GoogleLogin({ onLogin }) {
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);
  const btnRef = useRef();

  useEffect(() => {
    // Try auto sign-in via One Tap
    setLoading(true);
    signInWithGoogle()
      .then(session => onLogin(session))
      .catch(err => {
        // One Tap dismissed or failed — show manual button
        setLoading(false);
        renderGoogleButton();
      });
  }, []);

  const renderGoogleButton = () => {
    if (!window.google?.accounts?.id || !btnRef.current) {
      setTimeout(renderGoogleButton, 200);
      return;
    }
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "filled_black",
      size:  "large",
      text:  "signin_with",
      shape: "pill",
      logo_alignment: "left",
      width: 280,
    });
  };

  const handleManualRender = () => {
    setLoading(false);
    setTimeout(renderGoogleButton, 100);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #151f17 0%, #1a2b1c 60%, #142018 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#fff",
    }}>
      {/* Logo */}
      <img src={LOGO_B64} alt="Les Fermes Lufa"
        style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 24, filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.5))" }} />

      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
        Guide de Planification
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 40 }}>
        Les Fermes Lufa · Coordination terrain
      </div>

      {/* Sign-in card */}
      <div style={{
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: "32px 36px", textAlign: "center", maxWidth: 340, width: "90%",
      }}>
        {loading ? (
          <>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
              Connexion en cours...
            </div>
            <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: PALETTE.greenLight, borderRadius: "50%", margin: "0 auto", animation: "spin 0.8s linear infinite" }} />
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#e8f0e9" }}>
              Connectez-vous pour accéder
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
              Compte @lufa.com requis
            </div>

            {/* Google Sign-In button rendered here */}
            <div ref={btnRef} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />

            {error && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 8, fontSize: 12, color: "#ef9a9a" }}>
                {error === "WRONG_DOMAIN"
                  ? "⚠️ Seuls les comptes @lufa.com sont autorisés."
                  : `Erreur : ${error}`}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
        Accès réservé à l'équipe Les Fermes Lufa
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
