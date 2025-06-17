import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

// Imports do Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-useful-links-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './useful-links-dialog.html',
  styleUrl: './useful-links-dialog.scss'
})
export class UsefulLinksDialog {
  // A lista de links que você forneceu
  links = [
    { label: 'Alterar Senha BC', icon: 'manage_accounts', url: 'https://identidadeoi.oi.net.br/home', class: 'senhaBc' },
    { label: 'Alterar Senha TH', icon: 'manage_accounts', url: 'https://id.tahto.net.br/', class: 'senhaTh' },
    { label: 'Vtal', icon: 'map', url: 'https://portaloperacional.vtal.com.br', class: 'vtal' },
    { label: 'BrPronto', icon: 'contacts', url: 'https://ged360.oi.net.br/brprontopdv/#', class: 'brPronto' },
    { label: 'Passaporte', icon: 'description', url: 'https://passaporte.oi.intranet/', class: 'passaporte' },
    { label: 'WFM', icon: 'alarm', url: 'https://wfmtahto.neosyx.com/login/', class: 'wfm' },
    { label: 'GIP', icon: 'person', url: 'http://gip.brasiltelecom.com.br/gip/index.xhtml', class: 'gip' },
    { label: 'Gente Oi', icon: 'paid', url: 'https://gente.oi.net.br/', class: 'genteOi' },
    { label: 'Conecta Oi', icon: 'auto_stories', url: 'https://oiatende.local.srv.br/nova-oi-atende/operacoes/rii-unico/', class: 'conectaOi' },
    { label: 'Vehtor', icon: 'task_alt', url: 'http://operacao-sisweb/Unificado/tlv', class: 'vehtor' },
    { label: 'Guilda', icon: 'groups_3', url: 'https://guilda.tahto.net.br/login', class: 'guilda' },
    { label: 'Ahtlas', icon: 'credit_card_clock', url: 'https://ahtlas.tahto.net.br/', class: 'ahtlas' },
    { label: 'Blip', icon: 'forum', url: 'https://tahto.desk.blip.ai/chat', class: 'blip' },
    { label: 'Outlook', icon: 'mail', url: 'https://outlook.office.com/mail', class: 'outlook' },
    { label: 'Luhmus', icon: 'category', url: 'https://luhmus.beedoo.io/', class: 'luhmus' },
    { label: 'Notion', icon: 'note_alt', url: 'https://www.notion.com/', class: 'notion' },
    { label: 'POI', icon: 'format_align_right', url: 'https://intranet.tahto.net.br/genteemacao/', class: 'poi' }
  ];

  /**
   * Abre a URL fornecida em uma nova aba do navegador.
   * @param url A URL a ser aberta.
   */
  openLink(url: string): void {
    window.open(url, '_blank');
  }
}