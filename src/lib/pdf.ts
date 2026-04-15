import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Session, Cafe } from '../types'

export const generateReportPDF = (cafe: Cafe, sessions: Session[], period: string) => {
  const doc = new jsPDF()
  const now = format(new Date(), 'dd/MM/yyyy HH:mm')
  
  // Header
  doc.setFontSize(22)
  doc.setTextColor(249, 115, 22) // Accent color
  doc.text('Nook OS - Rapport d\'activité', 14, 22)
  
  doc.setFontSize(12)
  doc.setTextColor(100)
  doc.text(`${cafe.name}`, 14, 32)
  doc.text(`${cafe.address || ''}, ${cafe.city || ''}`, 14, 38)
  doc.text(`Période: ${period}`, 14, 44)
  doc.text(`Généré le: ${now}`, 14, 50)

  // Stats Summary
  const totalRevenue = sessions.reduce((acc, s) => acc + s.total_amount, 0)
  const totalSessions = sessions.length
  const avgSession = totalSessions > 0 ? totalRevenue / totalSessions : 0

  doc.setDrawColor(200)
  doc.line(14, 55, 196, 55)
  
  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.text('Résumé', 14, 65)
  
  doc.setFontSize(10)
  doc.text(`Chiffre d'affaires total: ${totalRevenue.toFixed(2)} DH`, 14, 75)
  doc.text(`Nombre de sessions: ${totalSessions}`, 14, 82)
  doc.text(`Moyenne par session: ${avgSession.toFixed(2)} DH`, 14, 89)

  // Table
  const tableData = sessions.map(s => [
    format(new Date(s.ended_at!), 'dd/MM HH:mm'),
    s.customer_name,
    `Place ${s.seat_number}`,
    `${s.duration_minutes} min`,
    s.payment_method || '-',
    `${s.total_amount.toFixed(2)} DH`
  ])

  autoTable(doc, {
    startY: 100,
    head: [['Date', 'Client', 'Place', 'Durée', 'Paiement', 'Montant']],
    body: tableData,
    headStyles: { fillColor: [249, 115, 22] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Page ${i} sur ${pageCount} - Nook OS`, 105, 285, { align: 'center' })
  }

  doc.save(`Rapport_${cafe.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}
