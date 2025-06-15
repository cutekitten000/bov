import { Injectable, inject } from '@angular/core';
import { User } from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Sale } from '../models/sale.model';
import { AppUser } from './auth'; // Vamos criar essa interface no próximo passo

@Injectable({ providedIn: 'root' })
export class DatabaseService {
    private firestore: Firestore = inject(Firestore);
    private salesCollection = collection(this.firestore, 'sales');

    // --- MÉTODOS DE USUÁRIO (Já existentes e aprimorados) ---

    createUserProfile(
        user: User,
        additionalData: { name: string; th: string }
    ): Promise<void> {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        const userData: AppUser = {
            uid: user.uid,
            email: user.email,
            name: additionalData.name,
            th: additionalData.th,
            role: 'agent',
            salesGoal: 26, // Meta padrão
        };
        return setDoc(userDocRef, userData);
    }

    // --- NOVOS MÉTODOS PARA VENDAS ---

    getUserProfile(uid: string): Promise<AppUser | null> {
        const userDocRef = doc(this.firestore, `users/${uid}`);
        return getDoc(userDocRef).then((docSnap) => {
            if (docSnap.exists()) {
                return docSnap.data() as AppUser;
            } else {
                // Documento não encontrado
                return null;
            }
        });
    }

    /**
     * Adiciona uma nova venda ao Firestore.
     */
    addSale(
        saleData: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<any> {
        const now = new Date();
        const dataToSave = {
            ...saleData,
            createdAt: Timestamp.fromDate(now),
            updatedAt: Timestamp.fromDate(now),
        };
        return addDoc(this.salesCollection, dataToSave);
    }

    /**
     * Busca as vendas de um agente específico para um determinado mês e ano.
     */
    async getSalesForAgent(
        agentUid: string,
        year: number,
        month: number
    ): Promise<Sale[]> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const q = query(
            this.salesCollection,
            where('agentUid', '==', agentUid),
            where('saleDate', '>=', Timestamp.fromDate(startDate)),
            where('saleDate', '<=', Timestamp.fromDate(endDate)),
            orderBy('saleDate', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const sales: Sale[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // CORREÇÃO: Converte os Timestamps do Firestore para objetos Date do JS
            const sale: Sale = {
                id: doc.id,
                ...data,
                saleDate: (data['saleDate'] as Timestamp).toDate(),
                installationDate: (
                    data['installationDate'] as Timestamp
                ).toDate(),
                createdAt: (data['createdAt'] as Timestamp).toDate(),
                updatedAt: (data['updatedAt'] as Timestamp).toDate(),
            } as Sale;
            sales.push(sale);
        });

        return sales;
    }

    // Futuramente, adicionaremos os métodos de update e delete aqui
    // updateSale(saleId: string, dataToUpdate: Partial<Sale>): Promise<void> { ... }
    // deleteSale(saleId: string): Promise<void> { ... }
}
