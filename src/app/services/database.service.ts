import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, addDoc, collection, query, where, getDocs, orderBy, Timestamp } from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { AppUser } from './auth'; // Vamos criar essa interface no próximo passo
import { Sale } from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private firestore: Firestore = inject(Firestore);
  private salesCollection = collection(this.firestore, 'sales');

  // --- MÉTODOS DE USUÁRIO (Já existentes e aprimorados) ---
  
  createUserProfile(user: User, additionalData: { name: string; th: string }): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${user.uid}`);
    const userData: AppUser = {
      uid: user.uid,
      email: user.email,
      name: additionalData.name,
      th: additionalData.th,
      role: 'agent',
      salesGoal: 26 // Meta padrão
    };
    return setDoc(userDocRef, userData);
  }

  // --- NOVOS MÉTODOS PARA VENDAS ---

  /**
   * Adiciona uma nova venda ao Firestore.
   */
  addSale(saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>): Promise<any> {
    const now = new Date();
    const dataToSave = {
      ...saleData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };
    return addDoc(this.salesCollection, dataToSave);
  }
  
  /**
   * Busca as vendas de um agente específico para um determinado mês e ano.
   */
  async getSalesForAgent(agentUid: string, year: number, month: number): Promise<Sale[]> {
    // Calcula o primeiro e o último dia do mês/ano solicitado
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const q = query(
      this.salesCollection,
      where('agentUid', '==', agentUid),
      where('saleDate', '>=', Timestamp.fromDate(startDate)),
      where('saleDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('saleDate', 'desc') // Ordena pela data da venda, da mais nova para a mais antiga
    );
    
    const querySnapshot = await getDocs(q);
    const sales: Sale[] = [];
    querySnapshot.forEach((doc) => {
      sales.push({ id: doc.id, ...doc.data() } as Sale);
    });
    
    return sales;
  }
  
  // Futuramente, adicionaremos os métodos de update e delete aqui
  // updateSale(saleId: string, dataToUpdate: Partial<Sale>): Promise<void> { ... }
  // deleteSale(saleId: string): Promise<void> { ... }
}