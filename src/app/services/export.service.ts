import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx'; // Importa a biblioteca xlsx

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Exporta um array de dados para um arquivo Excel (.xlsx).
   * @param data O array de objetos a ser exportado.
   * @param fileName O nome do arquivo a ser gerado (sem a extensão).
   */
  exportToExcel(data: any[], fileName: string): void {
    // 1. Cria uma nova planilha (worksheet) a partir dos seus dados JSON.
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // 2. Cria um novo livro de trabalho (workbook).
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    // 3. Adiciona a planilha ao livro de trabalho, dando um nome para a aba (ex: "Vendas").
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');

    // 4. Gera o arquivo .xlsx e dispara o download no navegador.
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }
}