import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  ExternalHyperlink, ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import { DRIVE_LINKS } from "./constants";
import { DAY_TYPE_LABELS } from "./constants";
import { fmt24, formatDate } from "./helpers";
import { LOGO_B64 } from "./logo_lufa.js";

// Doc colors matching the original Fête des semences doc
const C = {
  headerGreen: "9BBB59",
  lightGreen:  "D9EAD3",
  lightYellow: "FFF2CC",
  white:       "FFFFFF",
  dark:        "000000",
  linkBlue:    "1155CC",
};

const bd    = { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" };
const bords = { top: bd, bottom: bd, left: bd, right: bd };
const noBd  = { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" };
const noBds = { top: noBd, bottom: noBd, left: noBd, right: noBd };
const cm    = { top: 60,  bottom: 60,  left: 100, right: 100 };
const cmLg  = { top: 100, bottom: 100, left: 160, right: 160 };

const T  = (text, o = {}) => new TextRun({ text: String(text || ""), font: "Calibri", size: 20, color: C.dark, ...o });
const Tb = (text, o = {}) => T(text, { bold: true, ...o });
const P  = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], ...o });
const sp = ()              => P([T(" ", { size: 14 })], { spacing: { before: 40, after: 40 } });

const hdrCell = (text, width) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: { fill: C.headerGreen, type: ShadingType.CLEAR },
  borders: bords, margins: cm, verticalAlign: VerticalAlign.CENTER,
  children: [P([Tb(text, { color: C.white, size: 18 })], { alignment: AlignmentType.CENTER })],
});

const bodyCell = (children, width, fill = C.white) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  borders: bords, margins: cm, verticalAlign: VerticalAlign.CENTER,
  children: Array.isArray(children) ? children : [P(Array.isArray(children) ? children : [children])],
});

const bannerTable = (text, totalWidth = 9360) => new Table({
  width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [totalWidth],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: totalWidth, type: WidthType.DXA },
    shading: { fill: C.headerGreen, type: ShadingType.CLEAR },
    borders: bords, margins: cm,
    children: [P([Tb(text, { color: C.white, size: 20, allCaps: true })], { alignment: AlignmentType.CENTER })],
  })] })],
});

const hyperlink = (text, url) => new ExternalHyperlink({
  link: url,
  children: [new TextRun({ text, style: "Hyperlink", size: 20, font: "Calibri", color: C.linkBlue, underline: {} })],
});

export async function generateDocx(form) {
  // ── Title ──────────────────────────────────────────────────────────────────
  const titleTable = new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords,
      margins: { top: 180, bottom: 180, left: 160, right: 160 },
      children: [
        P([Tb(`EVENT : ${form.eventName || "—"}`, { color: C.white, size: 28 })], { alignment: AlignmentType.CENTER }),
        ...(form.createdBy || form.bookedBy ? [P([
          T(form.createdBy ? `Guide : ${form.createdBy}` : "", { color: C.white, size: 16 }),
          T(form.createdBy && form.bookedBy ? "   |   " : "", { color: C.white, size: 16 }),
          T(form.bookedBy  ? `Réservé par : ${form.bookedBy}` : "", { color: C.white, size: 16 }),
        ], { alignment: AlignmentType.CENTER })] : []),
      ],
    })] })],
  });

  // ── Signup objective banner (if set) ───────────────────────────────────────
  const signupBanner = form.signupObjectiveTotal ? new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: C.lightYellow, type: ShadingType.CLEAR }, borders: bords,
      margins: cm,
      children: [P([Tb("🎯 OBJECTIF INSCRIPTIONS : "), T(form.signupObjectiveTotal)], { alignment: AlignmentType.CENTER })],
    })] })],
  }) : null;

  // ── Schedule ───────────────────────────────────────────────────────────────
  const schedRows = [
    new TableRow({ children: [
      hdrCell("HORAIRE\n(montage, livraisons,\nanimation, démontage)", 2000),
      hdrCell("Quand?", 1600),
      hdrCell("Horaire", 2200),
      hdrCell("Où?", 1560),
      hdrCell("Quoi?", 2000),
    ]}),
  ];

  const filledDays = (form.days || []).filter(day => {
    const isTrav = day.type === "travel_depart" || day.type === "travel_return";
    if (isTrav) return day.departureTime || day.arrivalTime || day.date;
    return day.date || (day.rows || []).some(r => r.timeStart || r.activity);
  });

  for (const day of filledDays) {
    const dateStr  = formatDate(day.date);
    const isTravel = day.type === "travel_depart" || day.type === "travel_return";
    const isAnim   = day.type === "animation";
    const dayLabel = day.type === "custom"
      ? (day.customLabel || "Journée")
      : (DAY_TYPE_LABELS[day.type] || day.type);

    if (isTravel) {
      const details = [
        day.departureTime ? `Départ : ${fmt24(day.departureTime)}` : "",
        day.arrivalTime   ? `Arrivée : ${fmt24(day.arrivalTime)}`  : "",
        day.transportNote || "",
      ].filter(Boolean).join("   |   ");

      schedRows.push(new TableRow({ children: [
        bodyCell([P([Tb(dayLabel)])], 2000, "CFE2F3"),
        bodyCell([P([Tb(dateStr || "—")])], 1600, "CFE2F3"),
        bodyCell([P([T(details || "—")])], 2200 + 1560 + 2000, "CFE2F3"),
      ]}));

    } else {
      const rows = day.rows || [];
      // Add signup objective row for animation days
      const extraRows = [];
      if (isAnim && day.signupObjective) {
        extraRows.push(new TableRow({ children: [
          bodyCell([P([Tb("🎯 Objectif", { size: 18 })])], 2000, C.lightYellow),
          bodyCell([P([T(dateStr || "—")])], 1600, C.lightYellow),
          bodyCell([P([Tb(day.signupObjective)])], 2200 + 1560 + 2000, C.lightYellow),
        ]}));
      }

      rows.forEach((row, i) => {
        schedRows.push(new TableRow({ children: [
          i === 0
            ? bodyCell([P([Tb(dayLabel)])], 2000, C.lightGreen)
            : new TableCell({ width: { size: 2000, type: WidthType.DXA }, shading: { fill: C.lightGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([T("")])] }),
          i === 0
            ? bodyCell([P([Tb(dateStr || "—")])], 1600, C.lightGreen)
            : new TableCell({ width: { size: 1600, type: WidthType.DXA }, shading: { fill: C.lightGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([T("")])] }),
          bodyCell([P([T(row.timeStart && row.timeEnd ? `${fmt24(row.timeStart)} – ${fmt24(row.timeEnd)}` : fmt24(row.timeStart) || "")])], 2200),
          bodyCell([P([T(row.location || "")])], 1560),
          bodyCell([P([Tb(row.activity || "")])], 2000),
        ]}));
      });

      schedRows.push(...extraRows);
    }
  }

  const scheduleTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2000, 1600, 2200, 1560, 2000],
    rows: schedRows,
  });

  // ── Access ─────────────────────────────────────────────────────────────────
  const firstEventDay = (form.days || []).find(d => d.type === "setup" || d.type === "animation");
  const firstDateStr  = firstEventDay ? formatDate(firstEventDay.date) : "";

  const accessTable = new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [
      new TableRow({ children: [new TableCell({
        width: { size: 9360, type: WidthType.DXA },
        shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm,
        children: [P([Tb("ACCÈS AU SITE (MONTAGE) ET STATIONNEMENT", { color: C.white })])],
      })]}),
      new TableRow({ children: [new TableCell({
        width: { size: 9360, type: WidthType.DXA }, borders: bords, margins: cmLg,
        children: [
          P([Tb("• Accès : "), T("Voir le plan d'accès ci-bas.")]),
          firstDateStr ? P([T(`📆 ${firstDateStr}`)]) : sp(),
          P([T(`📍 ${form.adresse || "—"}`)]),
          P([Tb("• Stationnement : "), T("En rouge sur la carte ci-bas.")]),
        ],
      })]}),
    ],
  });

  // ── Contact + Docs ─────────────────────────────────────────────────────────
  const contactTable = new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680],
    rows: [
      new TableRow({ children: [
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("CONTACT SUR PLACE", { color: C.white })])] }),
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("DOCUMENTS DE RÉFÉRENCE", { color: C.white })])] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [
          P([Tb("• Contact : "), T(form.contactNom || "—")]),
          form.contactTel ? P([T(`  ${form.contactTel}`)]) : sp(),
          form.wifi    ? P([Tb("• WIFI : "),  T(form.wifi)])    : P([T("")]),
          form.wifiMdp ? P([Tb("• MDP : "),   T(form.wifiMdp)]) : P([T("")]),
        ]}),
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [
          P([T("• "), hyperlink("MAPAQ",      DRIVE_LINKS.mapaq)]),
          P([T("• "), hyperlink("Assurances", DRIVE_LINKS.assurances)]),
          P([T("• "), hyperlink("CFIA",       DRIVE_LINKS.cfia)]),
          P([T("• "), hyperlink("Certificat ignifuge chapiteau", DRIVE_LINKS.chapiteau)]),
        ]}),
      ]}),
    ],
  });

  // ── Inventory link ───────────────────────────────────────────────────────────
  const invUrl = "https://lufasaleseventsteam.github.io/inventaire/";
  const inventorySection = new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 9360, type: WidthType.DXA },
      shading: { fill: C.lightGreen, type: ShadingType.CLEAR },
      borders: bords, margins: cmLg,
      children: [P([
        Tb("📋 Checklist matériel : ", { color: C.dark }),
        new ExternalHyperlink({ link: invUrl, children: [T("Ouvrir l'inventaire de matériel", { color: C.linkBlue, underline: {} })] }),
      ])],
    })]})],
  });

  // ── Logistics ──────────────────────────────────────────────────────────────
  const matNec  = (form.materielNecessaire || "").split("\n").filter(Boolean);
  const matFou  = (form.materielFourni     || "").split("\n").filter(Boolean);
  const col1    = matNec.filter((_, i) => i % 2 === 0);
  const col2    = matNec.filter((_, i) => i % 2 === 1);

  const logTable = new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680],
    rows: [
      new TableRow({ children: [
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("LOGISTIQUE POUR MONTAGE",        { color: C.white })])] }),
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("LOGISTIQUE SURVEILLANCE DE NUIT", { color: C.white })])] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [
          P([Tb("• Matériel nécessaire :")]),
          new Table({
            width: { size: 4200, type: WidthType.DXA }, columnWidths: [2100, 2100],
            rows: [new TableRow({ children: [
              new TableCell({ width: { size: 2100, type: WidthType.DXA }, borders: noBds, margins: { top: 30, bottom: 30, left: 50, right: 50 }, children: col1.map(l => P([T(`• ${l}`)], { spacing: { before: 20, after: 20 } })) }),
              new TableCell({ width: { size: 2100, type: WidthType.DXA }, borders: noBds, margins: { top: 30, bottom: 30, left: 50, right: 50 }, children: col2.length ? col2.map(l => P([T(`• ${l}`)], { spacing: { before: 20, after: 20 } })) : [P([T("")])] }),
            ]})]
          }),
          ...(matFou.length ? [P([Tb("• Matériel fourni :")]), ...matFou.map(l => P([T(`  – ${l}`)]))] : []),
        ]}),
        new TableCell({ width: { size: 4680, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [P([T("")])] }),
      ]}),
    ],
  });

  // ── Notes internes ─────────────────────────────────────────────────────────
  const notesSec = form.notesInternes ? [
    sp(),
    bannerTable("NOTES INTERNES"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 9360, type: WidthType.DXA }, borders: bords,
        shading: { fill: C.lightYellow, type: ShadingType.CLEAR }, margins: cmLg,
        children: (form.notesInternes || "").split("\n").map(l => P([T(l || " ")])),
      })] })],
    }),
  ] : [];

  // ── Map ────────────────────────────────────────────────────────────────────
  const mapChildren = [
    sp(),
    bannerTable("PLAN D'ACCÈS POUR LE MONTAGE"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 9360, type: WidthType.DXA }, borders: bords, margins: cmLg,
        children: [
          P([Tb("Accès montage : "), T(form.instructions || "")]),
          sp(),
          P([Tb("EMPLACEMENT DU KIOSQUE")]),
          P([Tb("STATIONNEMENT")]),
        ],
      })] })],
    }),
  ];

  for (const img of (form.mapImages || [])) {
    try {
      const base64 = img.data.split(",")[1];
      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const ext = (img.name || "map.png").split(".").pop().toLowerCase();
      const maxW = 9360; // content width in DXA (1440 per inch, 6.5in = 9360)
      const pxW  = Math.round((img.width / 100) * 460);
      mapChildren.push(P([new ImageRun({
        data: bytes,
        type: { png: "png", jpg: "jpg", jpeg: "jpg", gif: "gif", webp: "webp" }[ext] || "png",
        transformation: { width: pxW, height: Math.round(pxW * 1.3) },
      })], { spacing: { before: 100, after: 60 } }));
    } catch(e) { /* skip */ }
  }

  // ── Assemble ───────────────────────────────────────────────────────────────
  const docChildren = [
    titleTable,
    ...(signupBanner ? [sp(), signupBanner] : []),
    sp(),
    bannerTable("HORAIRE (montage, livraisons, animation, démontage)"),
    scheduleTable,
    sp(),
    accessTable,
    sp(),
    contactTable,
    sp(),
    logTable,
    ...notesSec,
    ...mapChildren,
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20, color: C.dark } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: docChildren,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const safe   = (form.eventName || "evenement").replace(/[^a-zA-Z0-9\-_àâéèêëîïôùûüç ]/g, "_").trim().replace(/ /g, "_");
  const first  = (form.days || []).find(d => d.date);
  saveAs(blob, `${safe}_${first ? first.date : "date"}.docx`);
}
