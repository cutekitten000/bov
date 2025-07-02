// MUDANÇA 1: Importamos o HttpsError diretamente da nova versão das functions.
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Inicializa o Admin SDK para ter acesso aos serviços do Firebase no backend.
admin.initializeApp();
const db = admin.firestore();

/**
 * Função Chamável para resetar a senha de um usuário.
 * Recebe o email do usuário alvo.
 * Verifica se o chamador é um admin antes de prosseguir.
 */
export const sendPasswordResetEmailFromAdmin = onCall(async (request) => {
  // Pega o UID de quem está fazendo a chamada.
  const callerUid = request.auth?.uid;
  // Pega o email do usuário alvo que foi enviado pelo frontend.
  const targetEmail = request.data.email;

  if (!callerUid) {
    // MUDANÇA 2: Usamos HttpsError diretamente, sem o 'functions.'
    throw new HttpsError(
      "unauthenticated",
      "Ação não autorizada. Você precisa estar logado."
    );
  }

  if (!targetEmail) {
    throw new HttpsError(
      "invalid-argument",
      "O email do usuário alvo é necessário."
    );
  }
  
  // Busca o perfil de quem está chamando a função para verificar se é admin
  try {
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerProfile = callerDoc.data();
    
    if (callerProfile?.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Você não tem permissão de administrador para realizar esta ação."
      );
    }

    // Se todas as checagens passaram, envia o email de reset.
    await admin.auth().generatePasswordResetLink(targetEmail);
    console.log(`Link de reset de senha gerado para ${targetEmail} a pedido de ${callerUid}`);
    return { success: true, message: `Email de redefinição de senha enviado para ${targetEmail}.` };

  } catch (error: any) {
    console.error("Erro ao processar a função de reset de senha:", error);
    // Se o erro já for um HttpsError (como o de permissão), apenas o relança.
    if (error instanceof HttpsError) {
      throw error;
    }
    // Para outros erros (ex: falha de rede), lança um erro genérico.
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao processar sua solicitação."
    );
  }
});
