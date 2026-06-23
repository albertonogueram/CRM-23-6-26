import jsPDF from "jspdf";

const COMPANY = {
  name: "FABIÁN ARENAS (Santa Fe)",
  cif: "B18301499",
  address: "Carretera de Málaga km 442",
  privacy_url: "https://www.fabianarenas.es/politica-de-privacidad/",
  brand: "FIDELITY FABIAN ARENAS",
};

/**
 * Generates a PDF with the customer fidelity card terms & data.
 * Returns the jsPDF instance.
 */
export function generateFidelityPdf(client) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 16;
  const lineH = 4.6;
  let y = margin;

  // ---- Header band
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(250, 204, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(COMPANY.brand, margin, 14);
  doc.setTextColor(245, 245, 245);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Tarjeta de fidelización · Condiciones generales y consentimiento", margin, 22);

  y = 38;
  doc.setTextColor(0, 0, 0);

  // ---- Cliente data card
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DATOS DEL CLIENTE", margin, y);
  y += 1.5;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, W - margin, y);
  y += 5;

  doc.setFontSize(9);
  const fields = [
    ["Nº Fidelización", client.fidelizacion_num],
    ["DNI / NIF", client.dni],
    ["Nombre y Apellidos", client.nombre_apellidos],
    ["Email", client.email || "—"],
    ["Teléfono", client.telefono || "—"],
    [
      "Dirección",
      [client.calle, client.numero].filter(Boolean).join(" ") || "—",
    ],
    [
      "Población",
      [client.codigo_postal, client.localidad].filter(Boolean).join(" — ") || "—",
    ],
  ];
  fields.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(String(v || ""), W - margin - 50);
    doc.text(wrapped, margin + 48, y);
    y += lineH * Math.max(1, wrapped.length);
  });
  y += 1;

  // ---- Vehicles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("VEHÍCULOS ASOCIADOS", margin, y);
  y += 1.5;
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setFontSize(9);

  const mats = (client.matriculas || []).map((m) =>
    typeof m === "string" ? { matricula: m, modelo: "" } : m
  );
  if (mats.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text("Sin vehículos registrados.", margin, y);
    y += lineH;
  } else {
    doc.setFont("helvetica", "bold");
    doc.text("Matrícula", margin, y);
    doc.text("Modelo", margin + 50, y);
    y += 1.2;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, W - margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    mats.forEach((v) => {
      doc.text(v.matricula || "—", margin, y);
      doc.text(v.modelo || "—", margin + 50, y);
      y += lineH;
    });
  }
  y += 3;

  // ---- Conditions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CONDICIONES DE USO — PROGRAMA FIDELITY FABIAN ARENAS", margin, y);
  y += 1.5;
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const points = [
    "El descuento Plus Taller es acumulable al descuento de Recambios y aplicable sobre el PVP de las piezas montadas sobre su vehículo en las siguientes operaciones de taller: cambios de correa de distribución, embragues y mantenimientos en taller.",
    "En caso de que el cliente incluya más vehículos al programa se le aplicarán las mismas condiciones detalladas en el presente acuerdo.",
    "No serán compatibles más de una promoción o campaña simultáneamente. Cuando sean comunicadas desde diferentes medios, se aplicará la más favorable para el cliente.",
    "La bonificación de la tarjeta Fidelity no será aplicable a acciones puntuales que se promocionen, las cuales serán comunicadas debidamente en dichas acciones.",
    "El programa de Fidelización de Fabián Arenas se establece con carácter indefinido y sin fecha de finalización, si bien FABIÁN ARENAS (Santa Fe) se reserva el derecho a concluir el funcionamiento del programa y a modificar sus condiciones generales y operativas.",
    "La tarjeta es personal e intransferible y vinculada al titular y vehículos declarados. El uso fraudulento conllevará la baja inmediata del programa y la pérdida del saldo acumulado.",
    "El saldo acumulado en el monedero virtual del programa no es canjeable por dinero en efectivo y únicamente podrá utilizarse como medio de pago en facturas emitidas por FABIÁN ARENAS dentro del propio programa.",
    "La acumulación de saldo (2% o 4% según condiciones) se calcula sobre el importe sin IVA de la factura. El uso del saldo (Gastar Saldo) se descuenta sobre el importe total con IVA, hasta agotar el crédito disponible.",
    "FABIÁN ARENAS podrá suspender temporalmente el saldo del cliente en caso de devolución, anulación o impago de una factura asociada hasta su regularización.",
  ];

  const drawBullet = (text) => {
    const wrap = doc.splitTextToSize(text, W - margin - margin - 5);
    if (y + wrap.length * lineH > 280) {
      doc.addPage();
      y = margin;
    }
    doc.text("•", margin, y);
    doc.text(wrap, margin + 4, y);
    y += wrap.length * lineH + 1.2;
  };
  points.forEach(drawBullet);

  // ---- Data protection block
  if (y > 230) {
    doc.addPage();
    y = margin;
  }
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PROTECCIÓN DE DATOS Y CONSENTIMIENTO", margin, y);
  y += 1.5;
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const dp = [
    `Responsable del tratamiento: ${COMPANY.name}, CIF ${COMPANY.cif}, con domicilio en ${COMPANY.address}.`,
    "Finalidad: gestión de la relación comercial con el cliente, mantenimiento del programa de fidelización, emisión de facturas y comunicación de novedades, ofertas y campañas comerciales propias del taller.",
    "Legitimación: ejecución del contrato de adhesión al programa de fidelización, cumplimiento de obligaciones legales (fiscales y contables) y consentimiento expreso del titular para las comunicaciones comerciales.",
    "Destinatarios: no se cederán datos a terceros salvo obligación legal o a proveedores estrictamente necesarios para la prestación del servicio (encargados del tratamiento) con las debidas garantías contractuales.",
    "Plazo de conservación: los datos se conservarán mientras se mantenga la relación comercial y, posteriormente, durante los plazos legalmente exigidos.",
    "Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad, así como la retirada del consentimiento, dirigiéndose por escrito al domicilio del responsable o a través del formulario de la web.",
    `Política completa: ${COMPANY.privacy_url}`,
  ];
  dp.forEach((t) => {
    const wrap = doc.splitTextToSize(t, W - margin * 2);
    if (y + wrap.length * lineH > 280) {
      doc.addPage();
      y = margin;
    }
    doc.text(wrap, margin, y);
    y += wrap.length * lineH + 0.8;
  });

  // ---- Consent checkbox & signature
  if (y > 235) {
    doc.addPage();
    y = margin;
  }
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONSENTIMIENTOS EXPRESOS", margin, y);
  y += 1.5;
  doc.line(margin, y, W - margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const consents = [
    "Acepto las condiciones generales del programa Fidelity Fabian Arenas detalladas en este documento.",
    "Consiento que mis datos (nombre, email, teléfono, dirección y datos del vehículo) sean tratados por FABIÁN ARENAS para la gestión del programa y emisión de facturas.",
    "Autorizo el envío de comunicaciones comerciales (novedades, ofertas, campañas y promociones) por email y/o SMS por parte de FABIÁN ARENAS, pudiendo darme de baja en cualquier momento.",
  ];
  consents.forEach((t) => {
    const wrap = doc.splitTextToSize(t, W - margin * 2 - 8);
    if (y + wrap.length * lineH > 270) {
      doc.addPage();
      y = margin;
    }
    // checkbox
    doc.rect(margin, y - 3.2, 3.2, 3.2);
    doc.text(wrap, margin + 5, y);
    y += wrap.length * lineH + 1.8;
  });

  // signature area
  y += 6;
  if (y > 260) {
    doc.addPage();
    y = margin;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Firma del cliente", margin, y);
  doc.text("Fecha", W - margin - 50, y);
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y + 18, margin + 80, y + 18);
  doc.line(W - margin - 50, y + 18, W - margin, y + 18);

  // footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${COMPANY.name} · CIF ${COMPANY.cif} · ${COMPANY.address} · ${COMPANY.privacy_url}`,
    margin,
    290
  );
  doc.text(
    `Documento generado el ${new Date().toLocaleString("es-ES")}`,
    margin,
    293.5
  );

  return doc;
}

export function downloadFidelityPdf(client) {
  const doc = generateFidelityPdf(client);
  const safe = (client.nombre_apellidos || "cliente").replace(/[^a-z0-9]+/gi, "_");
  doc.save(`fidelity_${safe}_${client.fidelizacion_num || ""}.pdf`);
}

export function printFidelityPdf(client) {
  const doc = generateFidelityPdf(client);
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}
