import { DRIVE_LINKS, DAY_TYPE_LABELS } from "./constants";
import { fmt24, formatDate, formatDateShort } from "./helpers";

// Colors matching the original doc
const C = {
  headerGreen: [155, 187, 89],   // #9BBB59
  lightGreen:  [217, 234, 211],  // #D9EAD3
  lightYellow: [255, 242, 204],  // #FFF2CC
  lightBlue:   [207, 226, 243],  // #CFE2F3
  white:       [255, 255, 255],
  dark:        [0,   0,   0],
  gray:        [100, 100, 100],
  border:      [170, 170, 170],
};

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf;
  // Load jsPDF + autotable
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
  return window.jspdf;
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

export async function generatePdf(form) {
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const PW   = 215.9; // letter width mm
  const PH   = 279.4; // letter height mm
  const ML   = 12;    // margin left
  const MR   = 12;    // margin right
  const MT   = 12;    // margin top
  const CW   = PW - ML - MR; // content width
  let   y    = MT;

  const safe = (form.eventName || "evenement")
    .replace(/[^a-zA-Z0-9\-_àâéèêëîïôùûüç ]/g, "_")
    .trim().replace(/ /g, "_");
  const firstDay = (form.days || []).find(d => d.date);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const checkPage = (needed = 10) => {
    if (y + needed > PH - 10) { doc.addPage(); y = MT; }
  };

  const banner = (text, fillColor = C.headerGreen, textColor = C.white, fontSize = 10) => {
    checkPage(9);
    doc.setFillColor(...fillColor);
    doc.rect(ML, y, CW, 8, "F");
    doc.setTextColor(...textColor);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "bold");
    doc.text(text.toUpperCase(), ML + CW / 2, y + 5.2, { align: "center" });
    y += 8;
  };

  const spacer = (h = 3) => { y += h; };

  // ── Logo ──────────────────────────────────────────────────────────────────
  try {
    const { LOGO_B64 } = await import("../logo_lufa.js");
    const logoSize = 22;
    const logoX = ML + CW / 2 - logoSize / 2;
    doc.addImage(LOGO_B64, "PNG", logoX, y, logoSize, logoSize);
    y += logoSize + 4;
  } catch(e) { /* skip */ }

  // ── Title ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.headerGreen);
  doc.rect(ML, y, CW, 12, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`EVENT : ${form.eventName || "—"}`, ML + CW / 2, y + 8, { align: "center" });
  y += 12;
  if (form.createdBy || form.bookedBy) {
    doc.setFillColor(40, 80, 50);
    doc.rect(ML, y, CW, 6, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    const sub = [form.createdBy ? `Guide : ${form.createdBy}` : "", form.bookedBy ? `Réservé par : ${form.bookedBy}` : ""].filter(Boolean).join("   |   ");
    doc.text(sub, ML + CW / 2, y + 4, { align: "center" });
    y += 6;
  }

  // ── Signup objective banner ────────────────────────────────────────────────
  if (form.signupObjectiveTotal) {
    spacer(2);
    doc.setFillColor(...C.lightYellow);
    doc.rect(ML, y, CW, 7, "F");
    doc.setTextColor(...C.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`🎯 OBJECTIF INSCRIPTIONS : ${form.signupObjectiveTotal}`, ML + CW / 2, y + 4.5, { align: "center" });
    y += 7;
  }

  // ── Schedule ───────────────────────────────────────────────────────────────
  spacer(3);
  banner("HORAIRE (montage, livraisons, animation, démontage)");

  const filledDays = (form.days || []).filter(day =>
    day.date || (day.activities || []).some(a => a.timeStart || a.departureTime || a.type)
  );

  const schedBody = [];
  for (const day of filledDays) {
    const dateStr = formatDate(day.date);
    const acts = day.activities || [];

    acts.forEach((act, i) => {
      const isTravel = act.type === "travel_depart" || act.type === "travel_return";
      const isAnim   = act.type === "animation";
      const actLabel = act.type === "custom"
        ? (act.customLabel || "Autre")
        : (DAY_TYPE_LABELS[act.type] || act.type);
      const fill = isTravel ? C.lightBlue : C.lightGreen;

      if (isAnim && act.signupObjective) {
        schedBody.push({
          cells: ["Objectif", i === 0 ? (dateStr || "—") : "", act.signupObjective, "", ""],
          fills: [C.lightYellow, C.lightYellow, C.lightYellow, C.lightYellow, C.lightYellow],
          span: true,
        });
      }

      if (isTravel) {
        const details = [
          act.departureTime ? `Depart : ${fmt24(act.departureTime)}` : "",
          act.arrivalTime   ? `Arrivee : ${fmt24(act.arrivalTime)}`  : "",
          act.transportNote || "",
        ].filter(Boolean).join("  |  ");
        schedBody.push({
          cells: [actLabel, i === 0 ? (dateStr || "—") : "", details, "", ""],
          fills: [fill, fill, fill, fill, fill],
          span: true,
        });
      } else {
        const timeStr = act.timeStart && act.timeEnd
          ? `${fmt24(act.timeStart)} - ${fmt24(act.timeEnd)}`
          : fmt24(act.timeStart) || "";
        schedBody.push({
          cells: [actLabel, i === 0 ? (dateStr || "—") : "", timeStr, act.location || "", act.activityLabel || ""],
          fills: [fill, fill, C.white, C.white, C.white],
          span: false,
        });
      }
    });
  }

  // Draw schedule table manually
  const cols = [38, 30, 38, 30, 36]; // mm widths, sum = CW (172)
  const rowH = 7;
  const hdrH = 8;

  // Header
  doc.setFillColor(...C.headerGreen);
  doc.rect(ML, y, CW, hdrH, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const hdrLabels = ["HORAIRE", "QUAND?", "HORAIRE", "OÙ?", "QUOI?"];
  let cx = ML;
  hdrLabels.forEach((lbl, i) => {
    doc.text(lbl, cx + cols[i] / 2, y + 5.2, { align: "center" });
    cx += cols[i];
  });
  // border lines
  cx = ML;
  cols.forEach((w, i) => {
    if (i > 0) { doc.setDrawColor(...C.border); doc.line(cx, y, cx, y + hdrH); }
    cx += w;
  });
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, hdrH, "S");
  y += hdrH;

  // Body rows
  for (const row of schedBody) {
    checkPage(rowH + 2);
    cx = ML;
    if (row.span) {
      // Col 0
      doc.setFillColor(...row.fills[0]);
      doc.rect(cx, y, cols[0], rowH, "F");
      doc.setTextColor(...C.dark);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(String(row.cells[0] || ""), cx + 2, y + 4.5);
      cx += cols[0];
      // Col 1
      doc.setFillColor(...row.fills[1]);
      doc.rect(cx, y, cols[1], rowH, "F");
      doc.setFont("helvetica", "normal");
      doc.text(String(row.cells[1] || ""), cx + 2, y + 4.5);
      cx += cols[1];
      // Cols 2-4 merged
      const remW = cols[2] + cols[3] + cols[4];
      doc.setFillColor(...row.fills[2]);
      doc.rect(cx, y, remW, rowH, "F");
      doc.text(String(row.cells[2] || ""), cx + 2, y + 4.5);
      cx += remW;
    } else {
      row.cells.forEach((cell, i) => {
        doc.setFillColor(...row.fills[i]);
        doc.rect(cx, y, cols[i], rowH, "F");
        doc.setTextColor(...C.dark);
        doc.setFontSize(8);
        doc.setFont("helvetica", i === 4 ? "bold" : "normal");
        const txt = String(cell || "");
        doc.text(txt, cx + 2, y + 4.5, { maxWidth: cols[i] - 4 });
        cx += cols[i];
      });
    }
    // Row border
    doc.setDrawColor(...C.border);
    doc.rect(ML, y, CW, rowH, "S");
    // Inner vertical lines
    cx = ML;
    cols.forEach((w, i) => {
      if (i > 0) doc.line(cx, y, cx, y + rowH);
      cx += w;
    });
    y += rowH;
  }

  // ── Access ─────────────────────────────────────────────────────────────────
  spacer(4);
  checkPage(30);
  banner("ACCÈS AU SITE (MONTAGE) ET STATIONNEMENT");
  const firstEventDay = filledDays.find(d => (d.activities || []).some(a => a.type === "setup" || a.type === "animation"));
  const firstDateStr  = firstEventDay ? formatDate(firstEventDay.date) : "";

  doc.setFillColor(...C.white);
  doc.rect(ML, y, CW, 22, "F");
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, 22, "S");
  doc.setTextColor(...C.dark);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const accessLines = [
    `• Accès : Voir le plan d'accès ci-bas.`,
    `📆 ${firstDateStr || "—"}`,
    `📍 ${form.adresse || "—"}`,
    `• Stationnement : En rouge sur la carte ci-bas.`,
  ];
  accessLines.forEach((line, i) => {
    doc.text(line, ML + 3, y + 5 + i * 4.5);
  });
  y += 22;

  // ── Contact + Docs ─────────────────────────────────────────────────────────
  spacer(4);
  checkPage(36);
  const halfW = CW / 2;

  // Headers
  doc.setFillColor(...C.headerGreen);
  doc.rect(ML,          y, halfW, 7, "F");
  doc.rect(ML + halfW,  y, halfW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACT SUR PLACE",       ML + halfW / 2,        y + 4.5, { align: "center" });
  doc.text("DOCUMENTS DE RÉFÉRENCE",  ML + halfW + halfW / 2, y + 4.5, { align: "center" });
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, 7, "S");
  doc.line(ML + halfW, y, ML + halfW, y + 7);
  y += 7;

  // Body
  const contactLines = [
    `• Contact : ${form.contactNom || "—"}`,
    form.contactTel ? `  ${form.contactTel}` : "",
    form.wifi    ? `• WIFI : ${form.wifi}`    : "",
    form.wifiMdp ? `• MDP : ${form.wifiMdp}`  : "",
  ].filter(l => l !== "");

  const docLines = ["• MAPAQ", "• Assurances", "• CFIA", "• Certificat ignifuge chapiteau"];
  const docUrls  = [DRIVE_LINKS.mapaq, DRIVE_LINKS.assurances, DRIVE_LINKS.cfia, DRIVE_LINKS.chapiteau];

  const bodyH = Math.max(contactLines.length, docLines.length) * 5 + 6;
  doc.setFillColor(...C.white);
  doc.rect(ML,         y, halfW, bodyH, "F");
  doc.rect(ML + halfW, y, halfW, bodyH, "F");
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, bodyH, "S");
  doc.line(ML + halfW, y, ML + halfW, y + bodyH);

  doc.setTextColor(...C.dark);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  contactLines.forEach((line, i) => doc.text(line, ML + 3, y + 5 + i * 5));

  // Doc links in blue
  doc.setTextColor(17, 85, 204);
  docLines.forEach((line, i) => {
    doc.textWithLink(line, ML + halfW + 3, y + 5 + i * 5, { url: docUrls[i] });
  });
  doc.setTextColor(...C.dark);
  y += bodyH;

  // ── Logistics ──────────────────────────────────────────────────────────────
  spacer(4);
  checkPage(40);
  doc.setFillColor(...C.headerGreen);
  doc.rect(ML,         y, halfW, 7, "F");
  doc.rect(ML + halfW, y, halfW, 7, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LOGISTIQUE POUR MONTAGE",        ML + halfW / 2,         y + 4.5, { align: "center" });
  doc.text("LOGISTIQUE SURVEILLANCE DE NUIT", ML + halfW + halfW / 2, y + 4.5, { align: "center" });
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, 7, "S");
  doc.line(ML + halfW, y, ML + halfW, y + 7);
  y += 7;

  const matNec = (form.materielNecessaire || "").split("\n").filter(Boolean);
  const matFou = (form.materielFourni     || "").split("\n").filter(Boolean);
  const matLines = [
    "• Matériel nécessaire :",
    ...matNec.map(l => `  – ${l}`),
    ...(matFou.length ? ["• Matériel fourni :", ...matFou.map(l => `  – ${l}`)] : []),
  ];
  const logH = matLines.length * 4.5 + 6;
  doc.setFillColor(...C.white);
  doc.rect(ML,         y, halfW, logH, "F");
  doc.rect(ML + halfW, y, halfW, logH, "F");
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, logH, "S");
  doc.line(ML + halfW, y, ML + halfW, y + logH);

  doc.setTextColor(...C.dark);
  doc.setFontSize(8);
  matLines.forEach((line, i) => {
    doc.setFont("helvetica", line.startsWith("•") ? "bold" : "normal");
    doc.text(line, ML + 3, y + 5 + i * 4.5);
  });
  y += logH;

  // ── Notes internes ─────────────────────────────────────────────────────────
  if (form.notesInternes) {
    spacer(4);
    checkPage(20);
    banner("NOTES INTERNES", C.lightYellow, C.dark);
    const noteLines = form.notesInternes.split("\n");
    const noteH = noteLines.length * 4.5 + 6;
    checkPage(noteH);
    doc.setFillColor(...C.lightYellow);
    doc.rect(ML, y, CW, noteH, "F");
    doc.setDrawColor(...C.border);
    doc.rect(ML, y, CW, noteH, "S");
    doc.setTextColor(...C.dark);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    noteLines.forEach((line, i) => doc.text(line || " ", ML + 3, y + 5 + i * 4.5));
    y += noteH;
  }

  // ── Map / Instructions ─────────────────────────────────────────────────────
  spacer(4);
  checkPage(30);
  banner("PLAN D'ACCÈS POUR LE MONTAGE");

  const instrLines = doc.splitTextToSize(form.instructions || "", CW - 6);
  const instrH = instrLines.length * 4.5 + 16;
  doc.setFillColor(...C.white);
  doc.rect(ML, y, CW, instrH, "F");
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, instrH, "S");
  doc.setTextColor(...C.dark);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(instrLines, ML + 3, y + 5);
  y += instrLines.length * 4.5 + 6;
  doc.setFont("helvetica", "bold");
  doc.text("EMPLACEMENT DU KIOSQUE", ML + 3, y + 5);
  doc.text("STATIONNEMENT", ML + 3, y + 10);
  y += 14;

  // Map images (multiple)
  for (const img of (form.mapImages || [])) {
    try {
      const imgExt = (img.name || "map.png").split(".").pop().toUpperCase();
      const fmt = ["JPG","JPEG"].includes(imgExt) ? "JPEG" : "PNG";
      const imgW = CW * (img.width / 100);
      // Estimate height proportionally (assume ~4:3 ratio max)
      const imgH = Math.min(imgW * 1.3, 120);
      checkPage(imgH + 6);
      doc.addImage(img.data, fmt, ML, y, imgW, imgH, undefined, "FAST");
      y += imgH + 6;
    } catch(e) { /* skip */ }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  doc.save(`${safe}_${firstDay ? firstDay.date : "date"}.pdf`);
}
