export interface Script {
  id: string; // ID do documento no Firestore
  category: string; // Ex: 'Fraseologia', 'Ofertas'
  title: string;
  content: string;
  order: number; // Para ordenar os cards na tela
}