export interface Sale {
  id: string; // O ID do documento no Firestore
  agentUid: string; // O UID do agente que fez a venda
  agentName?: string;

  saleDate: Date;
  customerCpfCnpj: string;
  installationDate: Date;
  period: 'Manhã' | 'Tarde';
  status: 'Em Aprovisionamento' | 'Instalada' | 'Pendência' | 'Cancelada' | 'Draft';
  customerPhone: string;
  saleType: 'Legado' | 'Nova Fibra';
  paymentMethod: 'Boleto' | 'Cartão de Crédito' | 'Débito em Conta';
  ticket: string;
  speed: '500MB' | '700MB' | '1 GB';
  uf: string;
  os: string;
  notes?: string; // O '?' torna o campo opcional

  // Campos de controle
  createdAt: Date;
  updatedAt: Date;
}