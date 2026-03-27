import { formatCurrency, formatDate, formatDateTime } from '../models/pagamentoModel.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateForExport(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function formatDateTimeForExport(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function normalizeRows(rows) {
  return (rows || []).map((item) => ({
    numero: item.codVld || item.id || '',
    colaborador: item.colaborador || item.criadoPor || '',
    sede: item.sede || '',
    dtRegistro: formatDateTimeForExport(item.dtSistema) || '',
    dtPagamento: formatDateForExport(item.dtPagamento) || '',
    dtVencimento: formatDateForExport(item.dtVencimento) || '',
    setor: item.setor || '',
    despesa: item.despesa || '',
    quem: item.setorPagamento || '',
    dotacao: item.dotacao || '',
    empresaFornecedor: item.empresaFornecedor || '',
    valor: Number.isFinite(Number(item.valorTotal)) ? Number(item.valorTotal) : 0,
    descricao: item.descricao || '',
  }))
}

function buildRowsHtml(rows) {
  return normalizeRows(rows)
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.numero || '-')}</td>
          <td>${escapeHtml(item.colaborador || '-')}</td>
          <td>${escapeHtml(item.sede || '-')}</td>
          <td>${escapeHtml(item.dtRegistro || '-')}</td>
          <td>${escapeHtml(item.dtPagamento || '-')}</td>
          <td>${escapeHtml(item.dtVencimento || '-')}</td>
          <td>${escapeHtml(item.setor || '-')}</td>
          <td>${escapeHtml(item.despesa || '-')}</td>
          <td>${escapeHtml(item.quem || '-')}</td>
          <td>${escapeHtml(item.dotacao || '-')}</td>
          <td>${escapeHtml(item.empresaFornecedor || '-')}</td>
          <td style="text-align:right;">${escapeHtml(formatCurrency(item.valor) || '-')}</td>
          <td>${escapeHtml(item.descricao || '-')}</td>
        </tr>
      `,
    )
    .join('')
}

export function buildPaymentsDocumentHtml(rows, meta = {}) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(meta.titulo || 'Lancamentos')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #102133; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          .meta { margin: 0 0 18px; font-size: 13px; color: #4b5d70; display: grid; gap: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #d7e1ea; padding: 7px 8px; vertical-align: top; }
          th { background: #eef4fb; text-align: left; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(meta.titulo || 'Lancamentos')}</h1>
        <div class="meta">
          ${meta.visualizacao ? `<div><strong>Visualizacao:</strong> ${escapeHtml(meta.visualizacao)}</div>` : ''}
          ${meta.periodo ? `<div><strong>Periodo:</strong> ${escapeHtml(meta.periodo)}</div>` : ''}
          ${meta.sede ? `<div><strong>Sede:</strong> ${escapeHtml(meta.sede)}</div>` : ''}
          ${meta.setor ? `<div><strong>Setor:</strong> ${escapeHtml(meta.setor)}</div>` : ''}
          ${meta.despesa ? `<div><strong>Despesa:</strong> ${escapeHtml(meta.despesa)}</div>` : ''}
          ${meta.usuario ? `<div><strong>Usuario:</strong> ${escapeHtml(meta.usuario)}</div>` : ''}
          <div><strong>Quantidade:</strong> ${escapeHtml(String(rows.length || 0))}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Num. Lanc.</th>
              <th>Colaborador</th>
              <th>Sede</th>
              <th>Dt Registro</th>
              <th>Dt Pagamento</th>
              <th>Dt Vencimento</th>
              <th>Setor</th>
              <th>Despesa</th>
              <th>Quem?</th>
              <th>Dotacao</th>
              <th>Empresa/Fornecedor</th>
              <th>Valor</th>
              <th>Descricao</th>
            </tr>
          </thead>
          <tbody>
            ${buildRowsHtml(rows) || '<tr><td colspan="13">Nenhum lancamento encontrado.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `
}

export function printPaymentsDocument(rows, meta) {
  const popup = window.open('', '_blank', 'width=1200,height=800')
  if (!popup) return
  popup.document.write(buildPaymentsDocumentHtml(rows, meta))
  popup.document.close()
  popup.focus()
  popup.print()
}

export async function downloadPaymentsExcel(rows, meta = {}) {
  const XLSX = await import('xlsx')
  const normalizedRows = normalizeRows(rows)
  const aoa = [
    [meta.titulo || 'Exportacao de lancamentos'],
    ['Periodo', meta.periodo || ''],
    ['Sede', meta.sede || ''],
    ['Setor', meta.setor || ''],
    ['Despesa', meta.despesa || ''],
    ['Usuario', meta.usuario || ''],
    ['Quantidade', rows.length || 0],
    [],
    [
      'Num. Lanc.',
      'Colaborador',
      'Sede',
      'Dt Registro',
      'Dt Pagamento',
      'Dt Vencimento',
      'Setor',
      'Despesa',
      'Quem?',
      'Dotacao',
      'Empresa/Fornecedor',
      'Valor',
      'Descricao',
    ],
    ...normalizedRows.map((item) => [
      item.numero,
      item.colaborador,
      item.sede,
      item.dtRegistro,
      item.dtPagamento,
      item.dtVencimento,
      item.setor,
      item.despesa,
      item.quem,
      item.dotacao,
      item.empresaFornecedor,
      item.valor,
      item.descricao,
    ]),
  ]

  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 42 },
  ]

  const headerRowIndex = 9
  const firstDataRowIndex = headerRowIndex + 1
  const lastDataRowIndex = firstDataRowIndex + Math.max(normalizedRows.length - 1, 0)
  for (let rowIndex = firstDataRowIndex; rowIndex <= lastDataRowIndex; rowIndex += 1) {
    const valueCellRef = XLSX.utils.encode_cell({ r: rowIndex - 1, c: 11 })
    const valueCell = sheet[valueCellRef]
    if (valueCell) {
      valueCell.t = 'n'
      valueCell.z = '#,##0.00'
    }
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Lancamentos')
  XLSX.writeFile(workbook, `lancamentos_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function downloadPaymentsPdf(rows, meta = {}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const normalizedRows = normalizeRows(rows)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(meta.titulo || 'Exportacao de lancamentos', 40, 40)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const metaLines = [
    meta.periodo ? `Periodo: ${meta.periodo}` : '',
    meta.sede ? `Sede: ${meta.sede}` : '',
    meta.setor ? `Setor: ${meta.setor}` : '',
    meta.despesa ? `Despesa: ${meta.despesa}` : '',
    meta.usuario ? `Usuario: ${meta.usuario}` : '',
    `Quantidade: ${rows.length || 0}`,
  ].filter(Boolean)
  metaLines.forEach((line, index) => {
    doc.text(line, 40, 62 + index * 14)
  })

  autoTable(doc, {
    startY: 62 + metaLines.length * 14 + 10,
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [236, 243, 251], textColor: [16, 33, 51] },
    head: [[
      'Num. Lanc.',
      'Colaborador',
      'Sede',
      'Dt Registro',
      'Dt Pagamento',
      'Dt Vencimento',
      'Setor',
      'Despesa',
      'Quem?',
      'Dotacao',
      'Empresa/Fornecedor',
      'Valor',
      'Descricao',
    ]],
    body: normalizedRows.map((item) => [
      item.numero,
      item.colaborador,
      item.sede,
      item.dtRegistro,
      item.dtPagamento,
      item.dtVencimento,
      item.setor,
      item.despesa,
      item.quem,
      item.dotacao,
      item.empresaFornecedor,
      formatCurrency(item.valor),
      item.descricao,
    ]),
    columnStyles: {
      11: { halign: 'right' },
    },
  })

  doc.save(`lancamentos_${new Date().toISOString().slice(0, 10)}.pdf`)
}
