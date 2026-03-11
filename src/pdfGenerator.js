import { LOGO_B64 } from "./logo_lufa.js";
import { DRIVE_LINKS, DAY_TYPE_LABELS } from "./constants";
import { fmt24, formatDate } from "./helpers";

// Colors extracted from the reference Lufa doc
const C = {
  headerGreen: [182, 215, 168],  // #b6d7a8 — light green section headers
  darkGreen:   [56,  118, 29],   // #38761d — dark green text on headers
  pink:        [244, 204, 204],  // #f4cccc — pink accent rows
  yellow:      [255, 242, 204],  // #FFF2CC
  blue:        [17,  85,  204],  // #1155cc — hyperlinks
  white:       [255, 255, 255],
  black:       [0,   0,   0],
  gray:        [67,  67,  67],   // #434343
  border:      [0,   0,   0],    // black borders like the reference
};

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf;
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

  const PW  = 215.9;
  const PH  = 279.4;
  const ML  = 14;
  const MR  = 14;
  const MT  = 14;
  const CW  = PW - ML - MR;
  let   y   = MT;

  const safe = (form.eventName || "evenement")
    .replace(/[^a-zA-Z0-9\-_àâéèêëîïôùûüç ]/g, "_")
    .trim().replace(/ /g, "_");
  const firstDay = (form.days || []).find(d => d.date);

  // jsPDF doesn't embed Garamond — use "times" (Times New Roman serif) as closest match
  // This gives the same serif feel as the reference doc
  const FONT = "times";

  const checkPage = (needed = 10) => {
    if (y + needed > PH - 14) { doc.addPage(); y = MT; }
  };

  const spacer = (h = 4) => { checkPage(h); y += h; };

  // Section header with light green bg, bold dark green text, black border
  const sectionHeader = (text) => {
    checkPage(9);
    doc.setFillColor(...C.headerGreen);
    doc.rect(ML, y, CW, 8, "F");
    doc.setDrawColor(...C.border);
    doc.rect(ML, y, CW, 8, "S");
    doc.setTextColor(...C.darkGreen);
    doc.setFontSize(10);
    doc.setFont(FONT, "bold");
    doc.text(text, ML + 3, y + 5.8);
    y += 8;
  };

  // Two-column section header
  const twoColHeader = (left, right) => {
    checkPage(9);
    const half = CW / 2;
    doc.setFillColor(...C.headerGreen);
    doc.rect(ML, y, CW, 8, "F");
    doc.setDrawColor(...C.border);
    doc.rect(ML, y, CW, 8, "S");
    doc.line(ML + half, y, ML + half, y + 8);
    doc.setTextColor(...C.darkGreen);
    doc.setFontSize(10);
    doc.setFont(FONT, "bold");
    doc.text(left,  ML + 3, y + 5.8);
    doc.text(right, ML + half + 3, y + 5.8);
    y += 8;
  };

  const drawBorderedBox = (bx, by, bw, bh, fillColor = C.white) => {
    doc.setFillColor(...fillColor);
    doc.rect(bx, by, bw, bh, "F");
    doc.setDrawColor(...C.border);
    doc.rect(bx, by, bw, bh, "S");
  };

  const textLine = (text, tx, ty, bold = false, color = C.black, size = 9) => {
    doc.setFont(FONT, bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.setFontSize(size);
    doc.text(text || "", tx, ty);
  };

  // ── Logo ──────────────────────────────────────────────────────────────────
  try {
    const lw = 22;
    doc.addImage(LOGO_B64, "PNG", ML + CW / 2 - lw / 2, y, lw, lw);
    y += lw + 3;
  } catch(e) {}

  // ── Title — EVENT: name ────────────────────────────────────────────────────
  doc.setFillColor(...C.headerGreen);
  doc.rect(ML, y, CW, 11, "F");
  doc.setDrawColor(...C.border);
  doc.rect(ML, y, CW, 11, "S");
  doc.setTextColor(...C.darkGreen);
  doc.setFontSize(14);
  doc.setFont(FONT, "bold");
  doc.text(`EVENT: ${form.eventName || "—"}`, ML + CW / 2, y + 8, { align: "center" });
  y += 11;

  if (form.createdBy || form.bookedBy) {
    drawBorderedBox(ML, y, CW, 6, [240, 248, 240]);
    const sub = [
      form.createdBy ? `Guide : ${form.createdBy}` : "",
      form.bookedBy  ? `Réservé par : ${form.bookedBy}` : "",
    ].filter(Boolean).join("   |   ");
    textLine(sub, ML + CW / 2, y + 4.3, false, C.gray, 8.5);
    doc.setTextColor(...C.gray);
    doc.setFont(FONT, "normal");
    doc.setFontSize(8.5);
    doc.text(sub, ML + CW / 2, y + 4.3, { align: "center" });
    y += 6;
  }

  // Metrics
  const obj  = parseFloat(form.signupObjectiveTotal);
  const cost = parseFloat(form.eventCost);
  const cpa  = obj && cost ? (cost / obj).toFixed(2) : null;
  if (obj || cost) {
    drawBorderedBox(ML, y, CW, 7, C.yellow);
    const parts = [
      obj  ? `🎯 Objectif : ${obj} adhésions` : null,
      cost ? `💰 Coût : ${cost.toLocaleString("fr-CA")} $` : null,
      cpa  ? `📊 CPA cible : ${cpa} $` : null,
    ].filter(Boolean);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...C.black);
    doc.setFontSize(9);
    doc.text(parts.join("     |     "), ML + CW / 2, y + 4.8, { align: "center" });
    y += 7;
  }

  if (form.isRecurring) {
    drawBorderedBox(ML, y, CW, 6.5, [182, 215, 168]);
    doc.setFont(FONT, "bold");
    doc.setTextColor(...C.darkGreen);
    doc.setFontSize(9);
    const rt = form.recurringNote ? `🔄 Activation récurrente — ${form.recurringNote}` : "🔄 Activation récurrente";
    doc.text(rt, ML + CW / 2, y + 4.5, { align: "center" });
    y += 6.5;
  }

  // ── HORAIRE ────────────────────────────────────────────────────────────────
  spacer(4);
  sectionHeader("HORAIRE (montage, livraisons, animation, démontage)");

  // Table header row: Quand? | Où? | Quoi?
  const schedCols = [34, 28, 50, 60]; // date | time | location | activity  (sum=172=CW)
  const hdrLabels = ["Quand?", "", "Où?", "Quoi?"];

  drawBorderedBox(ML, y, CW, 7, C.headerGreen);
  doc.setTextColor(...C.darkGreen);
  doc.setFontSize(9);
  doc.setFont(FONT, "bold");
  let cx = ML;
  schedCols.forEach((w, i) => {
    if (i > 0) { doc.setDrawColor(...C.border); doc.line(cx, y, cx, y + 7); }
    doc.text(hdrLabels[i], cx + 2, y + 5);
    cx += w;
  });
  y += 7;

  const DOW_FR = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const filledDays = (form.days || []).filter(day =>
    day.date || day.dayOfWeek || (day.activities || []).some(a => a.timeStart || a.departureTime || a.type)
  );

  let rowIdx = 0;
  for (const day of filledDays) {
    const dateLabel = form.isRecurring
      ? (DOW_FR[parseInt(day.dayOfWeek)] || "—")
      : formatDate(day.date);

    for (let ai = 0; ai < (day.activities || []).length; ai++) {
      const act = day.activities[ai];
      const isTravel = act.type === "travel_depart" || act.type === "travel_return";
      const actLabel = act.type === "custom"
        ? (act.customLabel || "Autre")
        : (DAY_TYPE_LABELS[act.type] || act.type || "");
      const timeStr = isTravel
        ? [act.departureTime ? `Dép: ${fmt24(act.departureTime)}` : "", act.arrivalTime ? `Arr: ${fmt24(act.arrivalTime)}` : ""].filter(Boolean).join(" ")
        : (act.timeStart && act.timeEnd ? `${fmt24(act.timeStart)}-${fmt24(act.timeEnd)}` : fmt24(act.timeStart) || "");
      const location = act.location || (isTravel ? (act.transportNote || "") : "");

      const rowBg = isTravel ? C.pink : (rowIdx % 2 === 0 ? C.white : [240, 247, 240]);
      const rowH = 6.5;
      checkPage(rowH + 2);

      cx = ML;
      const cells = [
        { w: schedCols[0], text: ai === 0 ? (dateLabel || "—") : "", bold: true },
        { w: schedCols[1], text: timeStr, bold: false },
        { w: schedCols[2], text: location, bold: false },
        { w: schedCols[3], text: actLabel, bold: isTravel },
      ];

      cells.forEach((cell, ci) => {
        doc.setFillColor(...rowBg);
        doc.rect(cx, y, cell.w, rowH, "F");
        if (ci > 0) { doc.setDrawColor(...C.border); doc.line(cx, y, cx, y + rowH); }
        doc.setTextColor(...C.black);
        doc.setFontSize(8.5);
        doc.setFont(FONT, cell.bold ? "bold" : "normal");
        const wrapped = doc.splitTextToSize(cell.text || "", cell.w - 4);
        doc.text(wrapped[0] || "", cx + 2, y + 4.5);
        cx += cell.w;
      });
      doc.setDrawColor(...C.border);
      doc.rect(ML, y, CW, rowH, "S");
      y += rowH;
      rowIdx++;
    }
  }

  // ── ACCÈS AU SITE ──────────────────────────────────────────────────────────
  spacer(5);
  checkPage(50);
  sectionHeader("ACCÈS AU SITE (MONTAGE) ET STATIONNEMENT");

  const firstEventDay = filledDays.find(d =>
    (d.activities || []).some(a => a.type === "setup" || a.type === "animation")
  );

  const accessItems = [
    ...(firstEventDay && !form.isRecurring ? [`📆 ${formatDate(firstEventDay.date)}`] : []),
    `📍 ${form.adresse || "—"}`,
    ...(form.boothNumber      ? [`■ Kiosque: #${form.boothNumber}`] : []),
    ...(form.camionElectrique ? [`⚡ Véhicule: Camion électrique requis`] : []),
    `■ Type: ${form.isOutdoor ? "🌤️ Extérieur" : "Intérieur"}`,
    "■ Stationnement: Voir carte ci-bas.",
  ];

  const accH = accessItems.length * 5.5 + 10;
  drawBorderedBox(ML, y, CW, accH, C.white);
  doc.setFontSize(9);
  accessItems.forEach((line, i) => {
    doc.setFont(FONT, line.startsWith("■") ? "bold" : "normal");
    doc.setTextColor(...C.black);
    doc.text(line, ML + 3, y + 5.5 + i * 5.5);
  });
  if (form.adresse) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.adresse)}`;
    const ly = y + 5.5 + accessItems.length * 5.5;
    doc.setFont(FONT, "bold"); doc.setTextColor(...C.black);
    doc.text("■ Itinéraire : ", ML + 3, ly);
    const lx = ML + 3 + doc.getTextWidth("■ Itinéraire : ");
    doc.setFont(FONT, "normal"); doc.setTextColor(...C.blue);
    doc.textWithLink("Ouvrir dans Google Maps →", lx, ly, { url: mapsUrl });
    doc.setTextColor(...C.black);
  }
  y += accH;

  // ── CONTACT + DOCS DE RÉFÉRENCE ────────────────────────────────────────────
  spacer(5);
  checkPage(44);
  twoColHeader("CONTACT SUR PLACE", "DOCUMENTS DE RÉFÉRENCE");

  const half = CW / 2;
  const contactLines = [
    "■ Contact sur place:",
    `  ${form.contactNom || "—"}`,
    ...(form.contactTel ? [`  📞 ${form.contactTel}`] : []),
    ...(form.wifi    ? [`■ WiFi : ${form.wifi}`]    : []),
    ...(form.wifiMdp ? [`  🔑 Mdp : ${form.wifiMdp}`] : []),
  ];
  const docLinks = [
    { label: "MAPAQ",                         url: DRIVE_LINKS.mapaq },
    { label: "Assurances",                    url: DRIVE_LINKS.assurances },
    { label: "CFIA",                          url: DRIVE_LINKS.cfia },
    { label: "Certificat ignifuge chapiteau", url: DRIVE_LINKS.chapiteau },
  ];
  const docLines = ["■ Docs de référence:", ...docLinks.map(d => `  ${d.label}`)];

  const ctH = Math.max(contactLines.length, docLines.length) * 5.5 + 8;
  drawBorderedBox(ML,        y, half, ctH, C.white);
  drawBorderedBox(ML + half, y, half, ctH, C.white);
  doc.setDrawColor(...C.border);
  doc.line(ML + half, y, ML + half, y + ctH);

  doc.setFontSize(9);
  contactLines.forEach((line, i) => {
    doc.setFont(FONT, line.startsWith("■") ? "bold" : "normal");
    doc.setTextColor(...C.black);
    doc.text(line, ML + 3, y + 5.5 + i * 5.5);
  });
  docLines.forEach((line, i) => {
    const lx2 = ML + half + 3;
    const ly2 = y + 5.5 + i * 5.5;
    if (i === 0) {
      doc.setFont(FONT, "bold"); doc.setTextColor(...C.black); doc.text(line, lx2, ly2);
    } else {
      doc.setFont(FONT, "normal"); doc.setTextColor(...C.blue);
      doc.textWithLink(line, lx2, ly2, { url: docLinks[i - 1].url });
    }
  });
  doc.setTextColor(...C.black);
  y += ctH;

  // ── LOGISTIQUE (two columns) ───────────────────────────────────────────────
  spacer(5);
  checkPage(50);
  twoColHeader("LOGISTIQUE POUR MONTAGE", "LOGISTIQUE SURVEILLANCE DE NUIT");

  const matNec = (form.materielNecessaire || "").split("\n").filter(Boolean);
  const matFou = (form.materielFourni     || "").split("\n").filter(Boolean);
  const matLines = [
    "■ Matériel nécessaire:",
    ...matNec,
    ...(matFou.length ? ["■ Matériel fourni:", ...matFou] : []),
  ];

  const instrLines = (form.instructions || "").split("\n").filter(Boolean);
  const nightLines = instrLines.length > 0 ? instrLines : ["—"];

  const logH = Math.max(matLines.length, nightLines.length) * 5.5 + 12;
  drawBorderedBox(ML,        y, half, logH, C.white);
  drawBorderedBox(ML + half, y, half, logH, C.white);
  doc.setDrawColor(...C.border);
  doc.line(ML + half, y, ML + half, y + logH);

  // Checklist link top of left col
  doc.setFontSize(8.5);
  doc.setFont(FONT, "bold"); doc.setTextColor(...C.black);
  doc.text("Checklist matériel : ", ML + 3, y + 5);
  const clx = ML + 3 + doc.getTextWidth("Checklist matériel : ");
  doc.setFont(FONT, "normal"); doc.setTextColor(...C.blue);
  doc.textWithLink("Ouvrir l'inventaire →", clx, y + 5, { url: "https://lufasaleseventsteam.github.io/inventaire/" });
  doc.setTextColor(...C.black);

  doc.setFontSize(9);
  matLines.forEach((line, i) => {
    doc.setFont(FONT, line.startsWith("■") ? "bold" : "normal");
    doc.setTextColor(...C.black);
    doc.text(line, ML + 3, y + 10 + i * 5.5);
  });

  nightLines.forEach((line, i) => {
    doc.setFont(FONT, "normal"); doc.setTextColor(...C.black);
    const wrapped = doc.splitTextToSize(line, half - 6);
    wrapped.forEach((wl, wi) => {
      doc.text(wl, ML + half + 3, y + 5.5 + (i + wi) * 5.5);
    });
  });

  y += logH;

  // ── AUTRES INFOS / NOTES ───────────────────────────────────────────────────
  if (form.notesInternes) {
    spacer(5);
    sectionHeader("AUTRES INFOS");
    const nLines = form.notesInternes.split("\n").filter(Boolean);
    const nH = nLines.length * 5.5 + 8;
    checkPage(nH);
    drawBorderedBox(ML, y, CW, nH, C.white);
    doc.setFontSize(9);
    nLines.forEach((line, i) => {
      doc.setFont(FONT, "normal"); doc.setTextColor(...C.black);
      doc.text(line, ML + 3, y + 5.5 + i * 5.5);
    });
    y += nH;
  }

  // ── MAP IMAGES ─────────────────────────────────────────────────────────────
  if ((form.mapImages || []).length > 0) {
    spacer(5);
    sectionHeader("PLAN D'ACCÈS POUR LE MONTAGE + STATIONNEMENT");

    for (const img of form.mapImages) {
      try {
        const imgExt = (img.name || "map.png").split(".").pop().toUpperCase();
        const fmt = ["JPG","JPEG"].includes(imgExt) ? "JPEG" : "PNG";
        const imgW = CW * (img.width / 100);
        const imgH = Math.min(imgW * 0.75, 110);
        checkPage(imgH + 6);
        doc.addImage(img.data, fmt, ML, y, imgW, imgH, undefined, "FAST");
        y += imgH + 6;
      } catch(e) {}
    }

    spacer(2);
    checkPage(8);
    drawBorderedBox(ML, y, CW, 7, [230, 224, 236]);
    doc.setFont(FONT, "bold"); doc.setTextColor(...C.black); doc.setFontSize(9);
    doc.text("EMPLACEMENT DU KIOSQUE", ML + 3, y + 5);
    y += 7;
  }

  const fileName = `${safe}_${firstDay ? firstDay.date : "date"}.pdf`;
  const blob = doc.output("blob");
  return { blob, fileName, mimeType: "application/pdf" };
}
