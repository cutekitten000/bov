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
  
  try {
    // Busca o perfil de quem está chamando a função para verificar se é admin
    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerProfile = callerDoc.data();
    
    if (callerProfile?.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Você não tem permissão de administrador para realizar esta ação."
      );
    }

    // Se todas as checagens passaram, gera o link e o Firebase se encarrega de enviar o email.
    await admin.auth().generatePasswordResetLink(targetEmail);
    console.log(`Link de reset de senha gerado para ${targetEmail} a pedido de ${callerUid}`);
    return { success: true, message: `Email de redefinição de senha enviado para ${targetEmail}.` };

  } catch (error: any) {
    console.error("Erro ao processar a função de reset de senha:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao processar sua solicitação."
    );
  }
});


/**
 * Exclui um usuário do Authentication, seu perfil no Firestore
 * e todos os seus dados associados (vendas, scripts, etc).
 */
export const deleteUserAndData = onCall(async (request) => {
    const callerUid = request.auth?.uid;
    const uidToDelete = request.data.uid;
  
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "Ação não autorizada.");
    }
    if (!uidToDelete) {
      throw new HttpsError("invalid-argument", "O UID do usuário a ser deletado é necessário.");
    }
  
    // Verifica se quem está chamando é admin
    const callerDoc = await db.collection("users").doc(callerUid).get();
    if (callerDoc.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Você não tem permissão para realizar esta ação.");
    }
  
    try {
      console.log(`Iniciando exclusão completa para o usuário: ${uidToDelete}`);
  
      const batch = db.batch();
  
      // 1. Encontrar e marcar para exclusão todas as vendas do usuário
      const salesQuery = db.collection("sales").where("agentUid", "==", uidToDelete);
      const salesSnapshot = await salesQuery.get();
      salesSnapshot.docs.forEach((doc) => {
        console.log(`Marcando venda para exclusão: ${doc.id}`);
        batch.delete(doc.ref);
      });
  
      // 2. Encontrar e marcar para exclusão todos os scripts do usuário
      const scriptsQuery = db.collection("users").doc(uidToDelete).collection("scripts");
      const scriptsSnapshot = await scriptsQuery.get();
      scriptsSnapshot.docs.forEach((doc) => {
        console.log(`Marcando script para exclusão: ${doc.id}`);
        batch.delete(doc.ref);
      });
  
      // 3. Marcar o perfil do usuário no Firestore para exclusão
      const userProfileRef = db.collection("users").doc(uidToDelete);
      batch.delete(userProfileRef);
  
      // 4. Executa todas as exclusões no banco de dados
      await batch.commit();
      console.log(`Dados do Firestore para o usuário ${uidToDelete} excluídos.`);
  
      // 5. Por último, exclui o usuário do Firebase Authentication
      await admin.auth().deleteUser(uidToDelete);
      console.log(`Usuário ${uidToDelete} excluído do Authentication com sucesso.`);
  
      return { success: true, message: "Usuário e todos os seus dados foram excluídos com sucesso." };
      
    } catch (error) {
      console.error("Erro na exclusão completa do usuário:", error);
      throw new HttpsError("internal", "Ocorreu um erro ao tentar excluir o usuário e seus dados.");
    }
  });
  