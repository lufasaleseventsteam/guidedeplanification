import React, { useEffect, useRef, useState } from "react";
import { PALETTE } from "../constants";
import { LOGO_B64 } from "../logo_lufa.js";
import { CLIENT_ID, saveSession } from "../googleAuth";

export default function GoogleLogin({ onLogin }) {
  const btnRef = useRef();
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(init, 200);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          try {
            const payload = JSON.parse(atob(response.credential.split(".")[1]));
            const email = payload.email || "";
            if (!email.endsWith("@lufa.com")) {
              setError("WRONG_DOMAIN");
              return;
            }
            const session = saveSession({
              name: payload.name,
              email: payload.email,
              picture: payload.picture,
            });
            onLogin(session);
          } catch (e) {
            setError(e.message);
          }
        },
        hosted_domain: "lufa.com",
      });
      setReady(true);
    };

    // Load Google GSI script
    if (!document.querySelector('script[src*="accounts.google.com/gsi"]')) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      init();
    }
  }, []);

  useEffect(() => {
    if (ready && btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "filled_black",
        size: "large",
        text: "signin_with",
        shape: "pill",
        logo_alignment: "left",
        width: 280,
      });
    }
  }, [ready]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #151f17 0%, #1a2b1c 60%, #142018 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#fff",
    }}>
      <img src={LOGO_B64} alt="Les Fermes Lufa"
        style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 24, filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.5))" }} />

      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
        Guide de Planification
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 40 }}>
        Les Fermes Lufa · Coordination terrain
      </div>

      <div style={{
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16, padding: "32px 36px", textAlign: "center", maxWidth: 340, width: "90%",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#e8f0e9" }}>
          Connectez-vous pour accéder
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
          Compte @lufa.com requis
        </div>

        {!ready ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: PALETTE.greenLight, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Chargement...</div>
          </div>
        ) : (
          <div ref={btnRef} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />
        )}

        {error && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 8, fontSize: 12, color: "#ef9a9a" }}>
            {error === "WRONG_DOMAIN"
              ? "⚠️ Seuls les comptes @lufa.com sont autorisés."
              : `Erreur : ${error}`}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
        Accès réservé à l'équipe Les Fermes Lufa
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
