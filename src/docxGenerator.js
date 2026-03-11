import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  ExternalHyperlink, ImageRun,
} from "docx";
import { DRIVE_LINKS, DAY_TYPE_LABELS } from "./constants";
import { fmt24, formatDate } from "./helpers";
import { LOGO_B64_DOC } from "./logo_lufa.js";

// Colors extracted from the reference Lufa doc
const C = {
  headerGreen: "b6d7a8",   // #b6d7a8 — light green section headers
  darkGreen:   "38761d",   // #38761d — dark green text on headers
  lightGreen:  "d9ead3",   // lighter green
  lightYellow: "fff2cc",   // yellow banner
  pink:        "f4cccc",   // #f4cccc — pink accent (travel rows)
  white:       "FFFFFF",
  dark:        "000000",
  gray:        "434343",   // #434343 body text
  linkBlue:    "1155cc",   // #1155cc hyperlinks
};

const bd      = { style: BorderStyle.SINGLE, size: 1, color: "bbbbbb" };
const bords   = { top: bd, bottom: bd, left: bd, right: bd };
const bdThick = { style: BorderStyle.SINGLE, size: 12, color: "555555" };
const bordsTop = { top: bdThick, bottom: bd, left: bd, right: bd };
const noBd  = { style: BorderStyle.NONE,   size: 0, color: "FFFFFF" };
const noBds = { top: noBd, bottom: noBd, left: noBd, right: noBd };
const cm    = { top: 60,  bottom: 60,  left: 100, right: 100 };
const cmLg  = { top: 100, bottom: 100, left: 160, right: 160 };

const T  = (text, o = {}) => new TextRun({ text: String(text || ""), font: "Garamond", size: 22, color: C.gray, ...o });
const Tb = (text, o = {}) => T(text, { bold: true, ...o });
const P  = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], ...o });
const sp = ()              => P([T(" ", { size: 14 })], { spacing: { before: 40, after: 40 } });

const hdrCell = (text, width) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: { fill: C.headerGreen, type: ShadingType.CLEAR },
  borders: bords, margins: cm, verticalAlign: VerticalAlign.CENTER,
  children: [P([Tb(text, { color: "000000", size: 20 })], { alignment: AlignmentType.CENTER })],
});

const bodyCell = (children, width, fill = C.white) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: { fill, type: ShadingType.CLEAR },
  borders: bords, margins: cm, verticalAlign: VerticalAlign.CENTER,
  children: Array.isArray(children) ? children : [P(Array.isArray(children) ? children : [children])],
});

const bannerTable = (text, totalWidth = 11760) => new Table({
  width: { size: totalWidth, type: WidthType.DXA }, columnWidths: [totalWidth],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: totalWidth, type: WidthType.DXA },
    shading: { fill: C.headerGreen, type: ShadingType.CLEAR },
    borders: bords, margins: cm,
    children: [P([Tb(text, { color: "000000", size: 20 })], { alignment: AlignmentType.LEFT })],
  })] })],
});

const hyperlink = (text, url) => new ExternalHyperlink({
  link: url,
  children: [new TextRun({ text, style: "Hyperlink", size: 22, font: "Garamond", color: C.linkBlue, underline: {} })],
});

export async function generateDocx(form) {
  // ── Logo ───────────────────────────────────────────────────────────────────
  const logoBase64 = LOGO_B64_DOC.replace(/^data:image\/[a-z]+;base64,/, "");
  const logoBytes  = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0));
  const logoPara   = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 160 },
    children: [new ImageRun({
      data: logoBytes,
      transformation: { width: 80, height: 80 },
      type: "png",
    })],
  });

  // ── Title ──────────────────────────────────────────────────────────────────
  const titleTable = new Table({
    width: { size: 11760, type: WidthType.DXA }, columnWidths: [11760],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 11760, type: WidthType.DXA },
      shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords,
      margins: { top: 180, bottom: 180, left: 160, right: 160 },
      children: [
        P([Tb(`EVENT: ${form.eventName || "—"}`, { color: "000000", size: 28 })], { alignment: AlignmentType.CENTER }),
        ...(form.createdBy || form.bookedBy ? [P([
          T(form.createdBy ? `Guide : ${form.createdBy}` : "", { color: "000000", size: 18 }),
          T(form.createdBy && form.bookedBy ? "   |   " : "", { color: "000000", size: 18 }),
          T(form.bookedBy  ? `Réservé par : ${form.bookedBy}` : "", { color: "000000", size: 18 }),
        ], { alignment: AlignmentType.CENTER })] : []),
      ],
    })] })],
  });

  // ── Signup objective banner (if set) ───────────────────────────────────────
  const signupBanner = form.signupObjectiveTotal ? new Table({
    width: { size: 11760, type: WidthType.DXA }, columnWidths: [11760],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 11760, type: WidthType.DXA },
      shading: { fill: C.lightYellow, type: ShadingType.CLEAR }, borders: bords,
      margins: cm,
      children: [P([Tb("🎯 OBJECTIF INSCRIPTIONS : "), T(form.signupObjectiveTotal)], { alignment: AlignmentType.CENTER })],
    })] })],
  }) : null;

  // ── Schedule ───────────────────────────────────────────────────────────────
  const schedRows = [
    new TableRow({ children: [
      hdrCell("Date", 2400),
      hdrCell("Type", 2400),
      hdrCell("Horaire", 2160),
      hdrCell("Où?", 2400),
      hdrCell("Quoi?", 2400),
    ]}),
  ];

  const hasContent = a => {
    const isTravel = a.type === "travel_depart" || a.type === "travel_return";
    return isTravel
      ? (a.departureTime || a.arrivalTime || a.transportNote)
      : (a.timeStart || a.timeEnd); // must have at least one time to appear
  };

  const filledDays = (form.days || []).filter(day =>
    (day.date || day.dayOfWeek) && (day.activities || []).some(hasContent)
  );

  for (const day of filledDays) {
    const dateStr = form.isRecurring
      ? (["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"][parseInt(day.dayOfWeek)] || day.dayOfWeek || "—")
      : formatDate(day.date);

    const activities = (day.activities || []).filter(hasContent);
    // Alternate day background: even days white, odd days light grey
    const dayIndex = filledDays.indexOf(day);
    const dayBg = dayIndex % 2 === 0 ? C.white : "f0f0f0";
    const isFirstDay = dayIndex === 0;

    activities.forEach((act, i) => {
      const isTravel = act.type === "travel_depart" || act.type === "travel_return";
      const actLabel = act.type === "custom"
        ? (act.customLabel || "Activité")
        : (DAY_TYPE_LABELS[act.type] || act.type || "");

      let horaire = "";
      let quoi = "";
      let ou = act.location || "";
      let rowBg = C.white;

      if (isTravel) {
        horaire = [
          act.departureTime ? `Départ : ${fmt24(act.departureTime)}` : "",
          act.arrivalTime   ? `Arrivée : ${fmt24(act.arrivalTime)}` : "",
        ].filter(Boolean).join("  |  ");
        quoi = act.transportNote || "";
        rowBg = "dce8f8";
      } else {
        horaire = act.timeStart && act.timeEnd
          ? `${fmt24(act.timeStart)} – ${fmt24(act.timeEnd)}`
          : fmt24(act.timeStart) || "";
        quoi = (act.activityLabel || "").trim();
        rowBg = act.type === "animation" ? C.lightGreen : C.white;
      }

      // Date cell: show text on first row only, day background, thick top border between days
      const rowBorders = (i === 0 && !isFirstDay) ? bordsTop : bords;
      const effectiveRowBg = rowBg === C.white ? dayBg : rowBg; // keep travel/animation colour, else use day bg
      const dateCell = new TableCell({
        width: { size: 2400, type: WidthType.DXA },
        shading: { fill: dayBg, type: ShadingType.CLEAR },
        borders: rowBorders, margins: cm,
        children: [P([Tb(i === 0 ? (dateStr || "—") : "")])],
      });
      const makeCell = (children, width, bg) => new TableCell({
        width: { size: width, type: WidthType.DXA },
        shading: { fill: bg, type: ShadingType.CLEAR },
        borders: rowBorders, margins: cm, verticalAlign: VerticalAlign.CENTER,
        children,
      });

      schedRows.push(new TableRow({ children: [
        dateCell,
        makeCell([P([T(actLabel)])], 2400, effectiveRowBg),
        makeCell([P([T(horaire)])], 2160, effectiveRowBg),
        makeCell([P([T(ou)])], 2400, effectiveRowBg),
        makeCell([P([Tb(quoi)])], 2400, effectiveRowBg),
      ]}));
    });
  }

  const scheduleTable = new Table({
    width: { size: 11760, type: WidthType.DXA },
    columnWidths: [2400, 2400, 2160, 2400, 2400],
    rows: schedRows,
  });

  // ── Access ─────────────────────────────────────────────────────────────────
  const firstEventDay = (form.days || []).find(d => d.type === "setup" || d.type === "animation");
  const firstDateStr  = firstEventDay ? formatDate(firstEventDay.date) : "";

  const accessTable = new Table({
    width: { size: 11760, type: WidthType.DXA }, columnWidths: [11760],
    rows: [
      new TableRow({ children: [new TableCell({
        width: { size: 11760, type: WidthType.DXA },
        shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm,
        children: [P([Tb("ACCÈS AU SITE (MONTAGE) ET STATIONNEMENT", { color: "000000" })])],
      })]}),
      new TableRow({ children: [new TableCell({
        width: { size: 11760, type: WidthType.DXA }, borders: bords, margins: cmLg,
        children: [
          P([Tb("• Accès : "), T("Voir le plan d'accès ci-bas.")]),
          firstDateStr ? P([T(`📆 ${firstDateStr}`)]) : sp(),
          P([T(`📍 ${form.adresse || "—"}`)]),
          ...(form.adresse ? [
            P([
              new ExternalHyperlink({
                link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.adresse)}`,
                children: [T(form.adresse, { color: C.linkBlue, underline: {} })],
              }),
            ]),
            P([T("⚠️ SVP valider que l'adresse dans Google Maps est la bonne.", { color: "cc0000", size: 18 })]),
          ] : []),
          ...(form.camionElectrique ? [P([Tb("⚡🚚 Camion électrique : "), T("Prévoir le camion électrique pour cet événement.")])] : []),
          ...(form.boothNumber ? [P([Tb("• Kiosque : "), T(form.boothNumber)])] : []),
          P([Tb("• Stationnement : "), T(form.stationnement || "Voir info et/ou photo plus bas, le cas échéant.")]),
        ],
      })]}),
    ],
  });

  // ── Contact + Docs ─────────────────────────────────────────────────────────
  const contactTable = new Table({
    width: { size: 11760, type: WidthType.DXA }, columnWidths: [5880, 5880],
    rows: [
      new TableRow({ children: [
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("CONTACT SUR PLACE", { color: "000000" })])] }),
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("DOCUMENTS DE RÉFÉRENCE", { color: "000000" })])] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [
          P([Tb("• Contact : "), T(form.contactNom || "—")]),
          form.contactTel ? P([T(`  ${form.contactTel}`)]) : sp(),
          form.wifi    ? P([Tb("• WIFI : "),  T(form.wifi)])    : P([T("")]),
          form.wifiMdp ? P([Tb("• MDP : "),   T(form.wifiMdp)]) : P([T("")]),
        ]}),
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [
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
    width: { size: 11760, type: WidthType.DXA }, columnWidths: [11760],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 11760, type: WidthType.DXA },
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
    width: { size: 11760, type: WidthType.DXA }, columnWidths: [5880, 5880],
    rows: [
      new TableRow({ children: [
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("LOGISTIQUE POUR MONTAGE",        { color: "000000" })])] }),
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, shading: { fill: C.headerGreen, type: ShadingType.CLEAR }, borders: bords, margins: cm, children: [P([Tb("LOGISTIQUE SURVEILLANCE DE NUIT", { color: "000000" })])] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [
          P([Tb("• Matériel nécessaire : "), new ExternalHyperlink({ link: "https://lufasaleseventsteam.github.io/inventaire/", children: [T("→ Ouvrir l'inventaire", { color: C.linkBlue, underline: {} })] })]),
          new Table({
            width: { size: 4200, type: WidthType.DXA }, columnWidths: [2100, 2100],
            rows: [new TableRow({ children: [
              new TableCell({ width: { size: 2100, type: WidthType.DXA }, borders: noBds, margins: { top: 30, bottom: 30, left: 50, right: 50 }, children: col1.map(l => P([T(`• ${l}`)], { spacing: { before: 20, after: 20 } })) }),
              new TableCell({ width: { size: 2100, type: WidthType.DXA }, borders: noBds, margins: { top: 30, bottom: 30, left: 50, right: 50 }, children: col2.length ? col2.map(l => P([T(`• ${l}`)], { spacing: { before: 20, after: 20 } })) : [P([T("")])] }),
            ]})]
          }),
          ...(matFou.length ? [P([Tb("• Matériel fourni :")]), ...matFou.map(l => P([T(`  – ${l}`)]))] : []),
        ]}),
        new TableCell({ width: { size: 5880, type: WidthType.DXA }, borders: bords, margins: cmLg, children: [P([T("")])] }),
      ]}),
    ],
  });

  // ── Notes internes ─────────────────────────────────────────────────────────
  const notesSec = form.notesInternes ? [
    sp(),
    bannerTable("NOTES INTERNES"),
    new Table({
      width: { size: 11760, type: WidthType.DXA }, columnWidths: [11760],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 11760, type: WidthType.DXA }, borders: bords,
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
      width: { size: 11760, type: WidthType.DXA }, columnWidths: [11760],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 11760, type: WidthType.DXA }, borders: bords, margins: cmLg,
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

  // ── Documents joints ───────────────────────────────────────────────────────
  const attachments = (form.attachments || []).filter(a => a.driveLink);
  const attachSec = attachments.length > 0 ? [
    sp(),
    bannerTable("DOCUMENTS JOINTS"),
    new Table({
      width: { size: 11760, type: WidthType.DXA }, columnWidths: [11760],
      rows: [new TableRow({ children: [new TableCell({
        width: { size: 11760, type: WidthType.DXA }, borders: bords, margins: cmLg,
        children: attachments.map(att =>
          P([
            T(`${att.type === "application/pdf" ? "📄" : "📝"} `),
            new ExternalHyperlink({
              link: att.driveLink,
              children: [T(att.name, { color: C.linkBlue, underline: {} })],
            }),
          ])
        ),
      })] })],
    }),
  ] : [];

  // ── Assemble ───────────────────────────────────────────────────────────────
  const docChildren = [
    logoPara,
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
    ...attachSec,
    ...notesSec,
    ...mapChildren,
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: "Garamond", size: 22, color: C.gray } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 240, right: 240, bottom: 240, left: 240 },
        },
      },
      children: docChildren,
    }],
  });

  const blob     = await Packer.toBlob(doc);
  const safe     = (form.eventName || "evenement").replace(/[^a-zA-Z0-9\-_àâéèêëîïôùûüç ]/g, "_").trim().replace(/ /g, "_");
  const first    = (form.days || []).find(d => d.date);
  const fileName = `${safe}_${first ? first.date : "date"}.docx`;
  const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return { blob, fileName, mimeType };
}
