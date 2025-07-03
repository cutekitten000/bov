import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-admin-links',
  standalone: true,
  imports: [ CommonModule, MatDialogModule, MatIconModule, MatButtonModule ],
  templateUrl: './admin-links.html',
  styleUrl: './admin-links.scss'
})
export class AdminLinks {
  // LISTA COMPLETA E CORRIGIDA
  usefulLinks = [
    { name: 'NEO WFM', url: 'https://wfmtahto.neosyx.com/relatorios/8/', icon: 'query_stats' },
    { name: 'Gente Oi', url: 'https://gente.oi.net.br/', icon: 'groups' },
    { name: 'DWP', url: 'https://dwp.local.srv.br/dwp/app/#/catalog', icon: 'dvr' },
    { name: 'SISWEB ADM', url: 'http://siwpw01b/SiswebAdministrativo/ManterUsuario/Login', icon: 'admin_panel_settings' },
    { name: 'GEOSITE', url: 'https://geosite.interno.srv.br/cobertura-ftth/', icon: 'public' },
    { name: 'QUAL OPERADORA', url: 'https://qualoperadora.info/', icon: 'sim_card' },
    { name: 'GESTOR VIRTUAL', url: 'http://siwpw01a/GestorVirtual/', icon: 'support_agent' },
    { name: 'GENTE EM ACAO', url: 'https://intranettahto.local.srv.br/genteemacao/usuario/atendimento/MenuAtendimento.jsf', icon: 'campaign' },
    { name: 'PORTAL CGC', url: 'http://siwpw01b/SiswebCgc/', icon: 'badge' },
    { name: 'SOL', url: 'http://siwpw01b/Sol/login.aspx?ReturnUrl=%2fsol', icon: 'solar_power' },
    { name: 'Micro monitorias', url: 'https://app.powerbi.com/groups/me/reports/e0de3217-87b0-42a9-906e-b7050db4d711/ReportSection?ctid=2b787135-ca3a-486c-bd0a-f6015fbf39b8&experience=power-bi', icon: 'monitoring' },
    { name: 'GENTE ATENDE', url: 'https://intranettahto.local.srv.br/genteemacao/usuario/atendimento/MenuAtendimento.jsf', icon: 'hearing' },
    { name: 'BR PRONTO', url: 'https://ged360.oi.net.br/brprontopdv/autenticacao/index', icon: 'storefront' },
    { name: 'ITSM (ABRIR CHAMADOS)', url: 'https://tahto.sysaidit.com/', icon: 'support' },
    { name: 'Ahtlas', url: 'https://ahtlas.tahto.net.br', icon: 'hub' },
    { name: 'Blip supervisor', url: 'https://oinetbr2.blip.ai/application/detail/oitahtodeskprd/attendance/desk/monitoring', icon: 'chat' },
    { name: 'Nice', url: 'http://nicpw24/NiceApplications/Desktop/XbapApplications/NiceDesktop.xbap', icon: 'headset_mic' },
    { name: 'Outlook', url: 'https://outlook.office.com/mail', icon: 'mail' },
    { name: 'Alterar Senha BC', url: 'https://identidadeoi.oi.net.br/home', icon: 'password' },
    { name: 'Alterar Senha TH', url: 'https://id.tahto.net.br/', icon: 'key' },
    { name: 'Vtal', url: 'https://portaloperacional.vtal.com.br', icon: 'lan' },
    { name: 'Passaporte', url: 'https://passaporte.oi.intranet/', icon: 'luggage' },
    { name: 'GIP', url: 'http://gip.brasiltelecom.com.br/gip/index.xhtml', icon: 'receipt_long' },
    { name: 'Conecta Oi', url: 'https://oiatende.local.srv.br/nova-oi-atende/operacoes/rii-unico/', icon: 'settings_ethernet' },
    { name: 'Vehtor', url: 'http://operacao-sisweb/Unificado/tlv', icon: 'directions_car' },
    { name: 'Guilda', url: 'https://guilda.tahto.net.br/login', icon: 'school' },
    { name: 'Luhmus', url: 'https://luhmus.beedoo.io/', icon: 'psychology' },
    { name: 'Notion', url: 'https://www.notion.com/', icon: 'edit_document' },
    { name: 'POI', url: 'https://intranet.tahto.net.br/genteemacao/', icon: 'flag' },
    { name: 'Firefox', url: 'https://download.mozilla.org/?product=firefox-stub&os=win&lang=pt-BR', icon: 'public' }
  ];
}