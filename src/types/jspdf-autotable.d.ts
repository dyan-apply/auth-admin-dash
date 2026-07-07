declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'

  interface AutoTableOptions {
    startY?: number
    head?: any[][]
    body?: any[][]
    foot?: any[][]
    margin?: { left?: number; right?: number; top?: number; bottom?: number }
    styles?: any
    headStyles?: any
    bodyStyles?: any
    footStyles?: any
    theme?: 'striped' | 'grid' | 'plain'
    [key: string]: any
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void

  export default autoTable
}
