export function exportTableToXLSX(tableElement, filename = 'planilla.xlsx') {
  if (!window.XLSX) { alert('Librería XLSX no cargada'); return; }
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.table_to_sheet(tableElement);
  window.XLSX.utils.book_append_sheet(wb, ws, 'Planilla');
  window.XLSX.writeFile(wb, filename);
}

export function exportPayrollToPDF(rows, meta = {}, filename = 'planilla.pdf') {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { alert('Librería jsPDF no cargada'); return; }
  const doc = new jsPDF();
  let y = 14;
  doc.setFontSize(14);
  doc.text(meta.title || 'Planilla', 14, y); y += 8;
  doc.setFontSize(10);
  doc.text(`Periodo: ${meta.period || ''}`, 14, y); y += 6;

  doc.text('Empleado', 14, y);
  doc.text('Bruto', 80, y);
  doc.text('CCSS', 110, y);
  doc.text('Neto', 140, y);
  y += 4;
  doc.line(14, y, 190, y); y += 6;

  rows.forEach(r => {
    doc.text(String(r.nombre), 14, y);
    doc.text(String(r.bruto), 80, y);
    doc.text(String(r.ccss), 110, y);
    doc.text(String(r.neto), 140, y);
    y += 6;
    if (y > 280) { doc.addPage(); y = 14; }
  });

  doc.save(filename);
}






