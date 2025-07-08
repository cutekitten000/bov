import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

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

    // 1. Encontra e marca para exclusão todas as vendas do usuário
    const salesQuery = db.collection("sales").where("agentUid", "==", uidToDelete);
    const salesSnapshot = await salesQuery.get();
    salesSnapshot.docs.forEach((doc) => {
      console.log(`Marcando venda para exclusão: ${doc.id}`);
      batch.delete(doc.ref);
    });

    // 2. Marcar o perfil do usuário no Firestore para exclusão
    const userProfileRef = db.collection("users").doc(uidToDelete);
    batch.delete(userProfileRef);

    // 3. Executa todas as exclusões no banco de dados Firestore
    await batch.commit();
    console.log(`Dados do Firestore para o usuário ${uidToDelete} excluídos.`);

    // 4. Por último, exclui o usuário do Firebase Authentication (impede o login)
    await admin.auth().deleteUser(uidToDelete);
    console.log(`Usuário ${uidToDelete} excluído do Authentication com sucesso.`);

    return { success: true, message: "Usuário e todos os seus dados foram excluídos com sucesso." };
    
  } catch (error) {
    console.error("Erro na exclusão completa do usuário:", error);
    throw new HttpsError("internal", "Ocorreu um erro ao tentar excluir o usuário e seus dados.");
  }
});


/**
 * Limpa completamente o chat em grupo.
 * Apaga todos os arquivos associados no Storage e todas as mensagens no Firestore.
 * Requer que o chamador seja um administrador.
 */
export const clearGroupChat = onCall(async (request) => {
  const callerUid = request.auth?.uid;

  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Ação não autorizada.");
  }

  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (callerDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Você não tem permissão para realizar esta ação.");
  }

  console.log(`Iniciando limpeza completa do chat em grupo a pedido de ${callerUid}`);

  const messagesRef = db.collection('group-chat');
  const messagesSnapshot = await messagesRef.get();

  if (messagesSnapshot.empty) {
    console.log("Nenhuma mensagem encontrada para limpar.");
    return { success: true, message: "O chat em grupo já estava vazio." };
  }

  const storage = admin.storage();
  const bucket = storage.bucket();

  for (const doc of messagesSnapshot.docs) {
    const data = doc.data();
    // A MUDANÇA ESTÁ AQUI: Usamos o campo 'filePath' que salvamos
    if (data.filePath) {
      try {
        await bucket.file(data.filePath).delete();
        console.log(`Arquivo deletado do Storage: ${data.filePath}`);
      } catch (error: any) {
        if (error.code === 404) {
          console.warn(`Arquivo não encontrado no Storage, mas a mensagem será deletada: ${data.filePath}`);
        } else {
          console.error(`Erro ao deletar o arquivo ${data.filePath} do Storage:`, error);
        }
      }
    }
  }

  const batch = db.batch();
  messagesSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  console.log(`${messagesSnapshot.size} mensagens foram deletadas do Firestore.`);
  return { success: true, message: "Chat em grupo e todos os arquivos associados foram limpos com sucesso." };
});
