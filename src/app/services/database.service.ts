import { Injectable, inject } from '@angular/core';
import { User } from '@angular/fire/auth';
import {
    Firestore,
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from '@angular/fire/firestore';

import { Sale } from '../models/sale.model';
import { Script } from '../models/script.model';
import { AppUser } from './auth'; // Vamos criar essa interface no próximo passo

@Injectable({ providedIn: 'root' })
export class DatabaseService {
    private firestore: Firestore = inject(Firestore);
    private usersCollection = collection(this.firestore, 'users');
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
     * Busca TODAS as vendas da equipe para um dia específico.
     * @param date O dia para o qual as vendas serão buscadas.
     */
    async getSalesForDate(date: Date): Promise<Sale[]> {
        // Define o início do dia (00:00:00)
        const startOfDay = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0,
            0,
            0
        );
        // Define o fim do dia (23:59:59)
        const endOfDay = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23,
            59,
            59
        );

        const q = query(
            this.salesCollection,
            where('saleDate', '>=', Timestamp.fromDate(startOfDay)),
            where('saleDate', '<=', Timestamp.fromDate(endOfDay)),
            orderBy('saleDate', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const sales: Sale[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Converte Timestamps para objetos Date do JS
            sales.push({
                id: doc.id,
                ...data,
                saleDate: (data['saleDate'] as Timestamp).toDate(),
                installationDate: (
                    data['installationDate'] as Timestamp
                ).toDate(),
            } as Sale);
        });

        return sales;
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

    /**
     * NOVO MÉTODO: Busca todos os usuários (agentes) da coleção 'users'.
     */
    async getAllUsers(): Promise<AppUser[]> {
        const querySnapshot = await getDocs(this.usersCollection);
        return querySnapshot.docs.map((doc) => doc.data() as AppUser);
    }

    /**
     * NOVO MÉTODO: Busca TODAS as vendas de um determinado mês e ano.
     */
    async getAllSalesForMonth(year: number, month: number): Promise<Sale[]> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const q = query(
            this.salesCollection,
            where('saleDate', '>=', Timestamp.fromDate(startDate)),
            where('saleDate', '<=', Timestamp.fromDate(endDate))
        );

        const querySnapshot = await getDocs(q);
        const sales: Sale[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
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

    /**
     * Atualiza os dados de uma venda existente no Firestore.
     */
    updateSale(saleId: string, dataToUpdate: Partial<Sale>): Promise<void> {
        const saleDocRef = doc(this.firestore, `sales/${saleId}`);
        const data = {
            ...dataToUpdate,
            updatedAt: Timestamp.fromDate(new Date()), // Atualiza a data de modificação
        };
        return updateDoc(saleDocRef, data);
    }

    /**
     * Atualiza a meta de vendas de um usuário específico.
     * @param uid O ID do usuário a ser atualizado.
     * @param newGoal A nova meta de vendas.
     */
    updateUserSalesGoal(uid: string, newGoal: number): Promise<void> {
        const userDocRef = doc(this.firestore, `users/${uid}`);
        return updateDoc(userDocRef, {
            salesGoal: newGoal,
        });
    }

    /**
     * Exclui uma venda do Firestore.
     */
    deleteSale(saleId: string): Promise<void> {
        const saleDocRef = doc(this.firestore, `sales/${saleId}`);
        return deleteDoc(saleDocRef);
    }

    /**
   * Busca todos os scripts de um usuário específico, ordenados pela propriedade 'order'.
   */
  async getScriptsForUser(userId: string): Promise<Script[]> {
    const scriptsColRef = collection(this.firestore, `users/${userId}/scripts`);
    const q = query(scriptsColRef, orderBy('order'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Script));
  }

  /**
   * Verifica se o usuário já tem scripts e, se não tiver, cria o conjunto padrão.
   */
  async checkAndCreateDefaultScripts(user: AppUser): Promise<void> {
    const currentScripts = await this.getScriptsForUser(user.uid);
    if (currentScripts.length > 0) {
      // O usuário já tem scripts, não faz nada.
      return;
    }

    // O usuário não tem scripts, vamos criar os padrões.
    const batch = writeBatch(this.firestore);
    const defaultScripts = this.getDefaultScripts();

    defaultScripts.forEach(script => {
      const scriptDocRef = doc(collection(this.firestore, `users/${user.uid}/scripts`));
      batch.set(scriptDocRef, script);
    });

    console.log(`Criando scripts padrão para o usuário ${user.name}...`);
    return batch.commit();
  }

  /**
   * Retorna a lista de scripts padrão para um novo agente.
   */
  private getDefaultScripts(): Omit<Script, 'id'>[] {
    return [
      { category: 'Fraseologia', title: 'Fraseologia Inicial', content: 'Oi, tudo bem com você?\nSou <Seu Nome>, consultor especialista da NIO e estou à sua disposição.\n\nPara verificar viabilidade e te passar as ofertas eu preciso dos seguintes dados:\n\n*CEP:*\n*Número de fachada: (quadra e lote se houver)*\n*Nome da rua:*', order: 1 },
      { category: 'Ofertas', title: 'Ofertas Básicas', content: 'Viabilidade técnica 100% confirmada\n\nNIO Fibra 500 Megas - R$ 90,00 cartão de crédito\n\nNIO Fibra 700 Megas - R$ 120,00 cartão de crédito\n(Globo Play por 12 meses sem custo adicional)', order: 2 },
      { category: 'Ofertas', title: 'Valor Fixo', content: 'O valor é fixo até 2029, ou seja, você não sofrerá com nenhum reajuste até essa data.\n\nTambém vale ressaltar que a instalação é gratuita.', order: 3 },
      { category: 'Ofertas', title: 'Formas de Pagamento', content: 'Qual será a forma de pagamento?\n\n1. Cartão de Crédito 💳\n2. Débito em conta 🧾\n3. Boleto 📄', order: 4 },
      { category: 'Cartão de Crédito', title: 'Informações importantes', content: 'Olá. Como você optou pelo pagamento via cartão de crédito, gostaria de compartilhar algumas informações importantes:\n\n1. Assim que for realizado o cadastro do cartão de crédito, será feita uma pré-reserva do valor da primeira mensalidade. No dia da instalação da Fibra, essa pré-reserva é lançada como cobrança na fatura do cartão. Nos meses seguintes, o dia do lançamento da cobrança será o dia da instalação. A data de pagamento dependerá da data de vencimento do cartão.', order: 5 },
      // Adicione outros scripts padrão aqui...
    ];
  }
}
