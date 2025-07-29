import { Injectable, inject } from '@angular/core';
import { User } from '@angular/fire/auth';
import {
    DocumentReference,
    Firestore,
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from '@angular/fire/firestore';

import { Functions, httpsCallable } from '@angular/fire/functions'; // Importe
import { Sale } from '../models/sale.model';
import { Script } from '../models/script.model';
import { AppUser } from './auth'; // Vamos criar essa interface no próximo passo

@Injectable({ providedIn: 'root' })
export class DatabaseService {
    private firestore: Firestore = inject(Firestore);
    private usersCollection = collection(this.firestore, 'users');
    private salesCollection = collection(this.firestore, 'sales');
    private functions: Functions = inject(Functions);

    // --- MÉTODOS DE USUÁRIO (Já existentes e aprimorados) ---

    createUserProfile(
        user: User,
        additionalData: { name: string; th: string }
    ): Promise<void> {
        const userDocRef = doc(this.firestore, `users/${user.uid}`);
        // Este objeto userData é a "fonte da verdade" para um novo usuário
        const userData: AppUser = {
            uid: user.uid,
            email: user.email,
            name: additionalData.name,
            th: additionalData.th,
            role: 'agent',
            salesGoal: 26,
            status: 'pending' // <-- Garante que todo novo usuário seja criado como pendente
        };
        console.log("Criando perfil para novo usuário com os seguintes dados:", userData); // Log para depuração
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

    // ****** ADICIONE ESTE NOVO MÉTODO ******
    /**
     * Busca todos os usuários que têm a permissão de 'agent'.
     */
    async getAgents(): Promise<AppUser[]> {
        const q = query(this.usersCollection, where('role', '==', 'agent'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as unknown as AppUser));
    }

    // ****** ADICIONE ESTE NOVO MÉTODO ******
    /**
     * Atualiza os dados de um perfil de usuário existente.
     * @param uid O ID do usuário a ser atualizado.
     * @param data Um objeto com os campos a serem modificados.
     */
    updateUserProfile(uid: string, data: Partial<AppUser>): Promise<void> {
        const userDocRef = doc(this.firestore, `users/${uid}`);
        return updateDoc(userDocRef, data);
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

    // --- MÉTODOS PARA SCRIPTS ---

    /**
     * Busca todos os scripts de um usuário específico, ordenados pela propriedade 'order'.
     */
    async getScriptsForUser(userId: string): Promise<Script[]> {
        const scriptsColRef = collection(
            this.firestore,
            `users/${userId}/scripts`
        );
        const q = query(scriptsColRef, orderBy('order'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Script)
        );
    }

    /**
     * Verifica se o usuário já tem scripts e, se não tiver, cria o conjunto padrão.
     */
    async checkAndCreateDefaultScripts(user: AppUser): Promise<void> {
        const scriptsColRef = collection(
            this.firestore,
            `users/${user.uid}/scripts`
        );
        const snapshot = await getDocs(query(scriptsColRef)); // Apenas checa se existe algo

        if (snapshot.size > 0) {
            // O usuário já tem scripts, não faz nada.
            return;
        }

        // O usuário não tem scripts, vamos criar os padrões.
        const batch = writeBatch(this.firestore);
        const defaultScripts = this.getDefaultScripts();


        defaultScripts.forEach(async (script) => {
            console.log("script: " + script);
            const scriptDocRef = doc(scriptsColRef); // Cria uma nova referência de documento
            console.log("scriptsColRef: " + scriptsColRef);
            await batch.set(scriptDocRef, script);
        });

        console.log(`Criando scripts padrão para o usuário ${user.name}...`);
        return batch.commit();
    }

    /**
     * Retorna a lista COMPLETA de scripts padrão para um novo agente.
     */
    private getDefaultScripts(): Omit<Script, 'id'>[] {
        return [
            // Fraseologia
            {
                category: 'Fraseologia',
                title: 'Fraseologia Inicial',
                content:
                    'Oi, tudo bem com você?\nSou <Agente>, consultor especialista da NIO e estou à sua disposição.\n\n1 - Já possuo\n2 - Aguardando instalação\n3 - Desejo contratar\n\nCaso deseje contratar, vou precisar que me informe os seguintes dados para verificar viabilidade:\n\n*CEP:*\n*Número de fachada: (quadra e lote se houver)*\n*Nome da rua:*',
                order: 1,
            },

            // Ofertas
            {
                category: 'Ofertas',
                title: 'Ofertas Básicas',
                content:
                    'Viabilidade técnica 100% confirmada\n\nNIO Fibra 500 Megas - R$ 90,00 cartão de crédito\n\nNIO Fibra 700 Megas - R$ 120,00 cartão de crédito (Globo Play por 12 meses sem custo adicional)\n\nNIO Fibra 1 Giga + 1 ponto - R$ 150,00 cartão de crédito (Globo Play por 12 meses sem custo adicional)\n\nQual das ofertas você gostaria?',
                order: 10,
            },
            {
                category: 'Ofertas',
                title: 'Valor Fixo',
                content:
                    'O valor é fixo até 2028, ou seja, você não sofrerá com nenhum reajuste até essa data.\n\nTambém vale ressaltar que a instalação é gratuita.',
                order: 11,
            },
            {
                category: 'Ofertas',
                title: 'Formas de Pagamento',
                content:
                    'Qual será a forma de pagamento?\n\n1. Cartão de Crédito 💳\n2. Débito em conta 🧾\n3. Boleto 📄',
                order: 12,
            },

            // Cartão de Crédito
            {
                category: 'Cartão de Crédito',
                title: 'Informações importantes',
                content:
                    'Olá. Como você optou pelo pagamento via cartão de crédito, gostaria de compartilhar algumas informações importantes:\n\n1. Assim que for realizado o cadastro do cartão de crédito, será feita uma pré-reserva do valor da primeira mensalidade. No dia da instalação da Fibra, essa pré-reserva é lançada como cobrança na fatura do cartão. Nos meses seguintes, o dia do lançamento da cobrança será o dia da instalação. A data de pagamento dependerá da data de vencimento do cartão.\n\n2. Após o agendamento, você receberá um link em seu e-mail e WhatsApp para cadastrar seu cartão de crédito. Para sua segurança e conveniência, o cadastro do cartão é realizado no conforto de sua casa. A NIO nunca solicitará dados do seu cartão por meio desse processo.\n\n3. É crucial que você cadastre o cartão o mais rápido possível, pois o link possui um prazo de expiração. Além disso, sua compra só será liberada após o cadastro. Qualquer dúvida ou assistência adicional, estou à disposição para ajudar.',
                order: 20,
            },
            {
                category: 'Cartão de Crédito',
                title: 'Avisar ao cliente que o link foi enviado',
                content:
                    '*O link para cadastrar o cartão foi enviado com sucesso. Assim que finalizar o cadastro ou, caso encontre alguma dificuldade, por favor, me avise.*',
                order: 21,
            },
            // Análise de Crédito
            {
                category: 'Análise de Crédito',
                title: 'Boleto / Cartão de Crédito',
                content:
                    'Me informa por gentileza os seguintes dados para realizar a análise de crédito:\n\n- CPF ou CNPJ:\n- E-mail:\n- Telefone de contato sendo ele WhatsApp:\n- Ponto de referência:',
                order: 30,
            },
            {
                category: 'Análise de Crédito',
                title: 'Débito em Conta',
                content:
                    'Me informa por gentileza os seguintes dados para realizar a análise de crédito:\n\n- CPF ou CNPJ:\n- E-mail:\n- Telefone de contato sendo ele WhatsApp:\n- Ponto de referência:\n- Banco:\n- Agência:\n- Conta:',
                order: 31,
            },
            {
                category: 'Análise de Crédito',
                title: 'Bancos disponíveis',
                content:
                    '*Esses são os bancos disponíveis.*\n\n- Itaú\n- Bradesco\n- Banco do Brasil\n- Bansul\n- Santander\n- Next\n- Nubank\n- Inter\n- C6\n- PagSeguro',
                order: 32,
            },
            {
                category: 'Análise de Crédito',
                title: 'Biometria',
                content:
                    'Agora vamos seguir com o cadastro de sua biometria. Você receberá um link da NIO, nossa assistente virtual, através do WhatsApp, número (21)3905-1000.\n\nCaso o link não tenha chegado eu peço por gentileza que adicione ela pelo número (21)3905-1000 e mande um Olá.\n\nA biometria deve ser feita pelo responsável do CPF informado.\n\nSe tiver qualquer dúvida ou precisar de ajuda, nossa equipe está aqui para te apoiar! 🤝',
                order: 33,
            },
            {
                category: 'Análise de Crédito',
                title: 'CPF Aprovado somente cartão de crédito',
                content:
                    '➡ Olá! Tudo certo?\n\nVocê foi aprovado pro nosso plano de internet fibra ótica - é o melhor, com *desconto de R$10 por mês* pagando no cartão de crédito 🔥\n\nFunciona assim:\nA mensalidade vem direto na fatura do cartão, todo mês, sem precisar se preocupar com boletos ou atrasos. Mais praticidade no seu dia a dia e *economia garantindo todo mês*.\n\nAlém disso, *não ocupa limite total*, só o valor da mensalidade. Fácil, seguro e mais vantajoso.\n\nTopa aproveitar esse benefício agora mesmo? ✓',
                order: 34,
            },

            // Agendamento
            {
                category: 'Agendamento',
                title: 'Informar horários',
                content:
                    'Tenho disponibilidade para realizar a instalação às <...> Seguem os horários disponíveis:\n\n*Manhã: 8h às 12h*\n*Tarde: 13h às 18h*\n\nQual período seria mais conveniente para você? 🤔',
                order: 40,
            },
            {
                category: 'Agendamento',
                title: 'Extra info',
                content:
                    'Feito! ✅\n\n⚠ Só quero te lembrar que é muito importante que tenha um adulto (acima de 18 anos)\ncom documento com foto ( para receber nosso) técnico.\n\nEle irá no dia (data), no turno (matutino ou vespertino), das (período em horas).\n\nNo dia do agendamento você receberá uma mensagem da NIO, nossa assistente virtual, para confirmar a instalação, e é necessário confirmá-la!',
                order: 41,
            },

            // Checklist
            {
                category: 'Checklist',
                title: 'Débito em Conta',
                content:
                    'Vamos revisar a proposta juntos? Assim você pode tirar qualquer dúvida que tenha restado e alinhar qualquer detalhe necessário:\n\n📋 CPF:\n📋 Nome Completo:\n📋 Nome Completo Mãe:\n📅 Data nascimento:\n📍 Endereço:\n📋 Plano:\n💲 Valor:\n➖ Forma de pagamento:\n🏦 Banco: Agência: Conta:\n🗓 Data agendada de instalação:\n⏰ Período: | Horas:\n✅ E-mail:\n\n*Está tudo certo?*',
                order: 50,
            },
            {
                category: 'Checklist',
                title: 'Boleto / Cartão de Crédito',
                content:
                    'Vamos revisar a proposta juntos? Assim você pode tirar qualquer dúvida que tenha restado e alinhar qualquer detalhe necessário:\n\n📋 CPF:\n📋 Nome Completo:\n📋 Nome Completo Mãe:\n📅 Data nascimento:\n📍 Endereço:\n📋 Plano:\n💲 Valor:\n➖ Forma de pagamento:\n🗓 Data agendada de instalação:\n⏰ Período: | Horas:\n✅ E-mail:\n\n*Está tudo certo?*',
                order: 51,
            },

            // Avisos Finais
            {
                category: 'Avisos Finais',
                title: 'Multa de cancelamento',
                content:
                    'A oferta inclui uma taxa de fidelidade no valor de R$540,00. Essa taxa será aplicada somente se o serviço de banda larga for cancelado antes de completar 12 meses. Ela será cobrada de forma proporcional aos meses restantes, em uma única parcela. Durante os 12 meses, será aplicado um desconto automático de R$45,00 na taxa de fidelidade a cada mês de uso.\n\nNão se preocupe, esse desconto não afetará o valor contratado da sua futura mensal. Aqui está como funcionará a redução ao longo dos meses:\n\n1. mês de uso: R$540,00\n2. mês de uso: R$495,00\n3. mês de uso: R$450,00\n4. mês de uso: R$405,00\n5. mês de uso: R$360,00\n... e assim por diante até ser zerada ao fim dos 12 meses.',
                order: 60,
            },
            {
                category: 'Avisos Finais',
                title: 'Mais algumas informações',
                content:
                    '1 - A NIO, nossa assistente virtual, enviou para você em seu WhatsApp todo o resumo da venda. Peço por gentileza que confirme para ela com um SIM ou 1, conforme solicitado.\n\n2 - Caso alguém entre em contato com você dizendo que sua venda teve algum erro, ou foi cancelada eu peço que você ignore pois pode ser alguma tentativa de fraude. A única pessoa que pode entrar em contato com você sou eu (Danilo, BC788068) e a auditoria da NIO para confirmar os dados da venda. Em momento algum será solicitado novos dados. Se houver qualquer erro que seja eu mesmo te ligo da nossa central e te informo.',
                order: 61,
            },
            {
                category: 'Avisos Finais',
                title: 'Aviso sobre DACC',
                content:
                    'O valor cobrado na sua primeira fatura será proporcional aos dias instalados. Assim, você pagará um valor abaixo do contratado inicialmente. A partir da segunda fatura, será cobrado o valor contratado integralmente.\n\nÉ importante destacar que apenas a primeira fatura será enviada através de boleto para o seu e-mail e WhatsApp cadastrados. As demais faturas serão automaticamente debitadas.',
                order: 62,
            },

            // Infos Úteis
            {
                category: 'Infos Úteis',
                title: 'Recuperar Cliente',
                content:
                    '✔ Se não tiver interesse em contratar o plano da NIO Fibra, por favor, informe o motivo selecionando o número correspondente:\n\n1. Já sou cliente NIO Fibra.\n2. Não tenho interesse no momento.\n3. Estou com contrato de fidelidade com outra operadora.\n4. Achei o preço elevado.\n0. Para prosseguir.',
                order: 70,
            },
            {
                category: 'Infos Úteis',
                title: 'Inviabilidade',
                content:
                    'Olha só... verifiquei que a NIO Fibra ainda não chegou no seu endereço 😢 A notícia boa é que como a NIO está em expansão na sua região, vou continuar acompanhando e assim que for disponibilizada vou lembrar de você e entrarei em contato.',
                order: 71,
            },
            {
                category: 'Infos Úteis',
                title: 'Outros serviços',
                content:
                    '*Oi* Sou especialista em *venda da NIO Fibra*, então não consigo tratar seu pedido por aqui. Você pode resolver tudo pelas nossas redes sociais, ou por telefone. Vou te passar nossos canais de atendimento:\n\n*Nio Whatsapp:* wa.me/552139051000\n*Atendimento Internet:* Ligue 08000311000',
                order: 72,
            },
        ];
    }

    /**
     * Adiciona um novo script para um usuário.
     */
    addScript(
        userId: string,
        scriptData: Omit<Script, 'id'>
    ): Promise<DocumentReference> {
        const scriptsColRef = collection(
            this.firestore,
            `users/${userId}/scripts`
        );
        return addDoc(scriptsColRef, scriptData);
    }

    /**
     * Atualiza um script existente de um usuário.
     */
    updateScript(
        userId: string,
        scriptId: string,
        dataToUpdate: Partial<Omit<Script, 'id'>>
    ): Promise<void> {
        const scriptDocRef = doc(
            this.firestore,
            `users/${userId}/scripts/${scriptId}`
        );
        return updateDoc(scriptDocRef, dataToUpdate);
    }

    /**
     * Exclui um script de um usuário.
     */
    deleteScript(userId: string, scriptId: string): Promise<void> {
        const scriptDocRef = doc(
            this.firestore,
            `users/${userId}/scripts/${scriptId}`
        );
        return deleteDoc(scriptDocRef);
    }

    // ****** ADICIONE ESTE NOVO MÉTODO NO FINAL DA CLASSE ******
    /**
   * Chama a Cloud Function para realizar a exclusão completa de um agente e seus dados.
   * @param uid O ID do usuário a ser excluído.
   */
    fullyDeleteAgent(uid: string): Promise<any> {
        const deleteFunction = httpsCallable(this.functions, 'deleteUserAndData');
        return deleteFunction({ uid: uid });
    }

    // ****** ADICIONE ESTE NOVO MÉTODO NO FINAL DA CLASSE ******
    /**
     * Exclui todas as mensagens da coleção 'group-chat'.
     * Esta é uma operação destrutiva e deve ser usada com cuidado.
     */
    clearGroupChat(): Promise<any> {
    const clearChatFunction = httpsCallable(this.functions, 'clearGroupChat');
    return clearChatFunction();
}

    // ****** ADICIONE ESTE NOVO MÉTODO ******
    /**
     * Busca todas as vendas de todos os agentes, ordenadas pela data mais recente.
     */
    async getAllSales(): Promise<Sale[]> {
        const q = query(this.salesCollection, orderBy('saleDate', 'desc'));
        const querySnapshot = await getDocs(q);

        const sales: Sale[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Converte os Timestamps do Firestore para objetos Date do JS
            sales.push({
                id: doc.id,
                ...data,
                saleDate: (data['saleDate'] as Timestamp).toDate(),
                installationDate: (data['installationDate'] as Timestamp).toDate(),
            } as Sale);
        });
        return sales;
    }


    // ****** ADICIONE ESTE NOVO MÉTODO ******
    /**
     * Busca todos os usuários que têm o status de 'pending'.
     */
    async getPendingUsers(): Promise<AppUser[]> {
        const q = query(this.usersCollection, where('status', '==', 'pending'));
        const querySnapshot = await getDocs(q);
        // Usamos o doc.id para garantir que o uid está presente, mesmo que não esteja no documento
        return querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as AppUser));
    }

    /**
     * Busca as últimas N vendas registradas, para um feed de atividades.
     * @param count O número de vendas recentes a serem buscadas.
     */
    async getRecentSales(count: number): Promise<Sale[]> {
        const q = query(this.salesCollection, orderBy('createdAt', 'desc'), limit(count));
        const querySnapshot = await getDocs(q);

        const sales: Sale[] = [];
        querySnapshot.forEach(doc => {
            sales.push({ id: doc.id, ...doc.data() } as Sale);
        });
        return sales;
    }
}
