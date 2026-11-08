const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDr6kNQmQ1VJr0O6hbB_DSKSYjZCKFovl4",
  authDomain: "ambrosia-aa242.firebaseapp.com",
  projectId: "ambrosia-aa242",
  storageBucket: "ambrosia-aa242.firebasestorage.app",
  messagingSenderId: "49487690180",
  appId: "1:49487690180:web:902a4d0ee57e63bb0e4c91",
  measurementId: "G-EZQT9NWGFX",
};

const obtenerFirebase = () => {
  if (typeof window === "undefined" || !window.firebase) {
    throw new Error("Firebase no está cargado en el navegador");
  }

  const tiene_app_default = Array.isArray(window.firebase.apps)
    && window.firebase.apps.some((app) => app?.name === "[DEFAULT]");

  if (!tiene_app_default) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }

  return window.firebase;
};

const obtenerAuth = () => obtenerFirebase().auth();

export const obtenerFirestoreChat = () => obtenerFirebase().firestore();

export const iniciarSesionFirebaseCliente = async (email, password) => {
  const firebase = obtenerFirebase();
  const auth = obtenerAuth();

  if (firebase.auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  }

  const credenciales = await auth.signInWithEmailAndPassword(email, password);
  return credenciales.user;
};

export const cerrarSesionFirebaseCliente = async () => {
  const auth = obtenerAuth();
  if (auth.currentUser) {
    await auth.signOut();
  }
};

export const obtenerUsuarioFirebaseCliente = () => {
  const auth = obtenerAuth();
  return auth.currentUser || null;
};

export const suscribirseAuthFirebaseCliente = (onCambio) => {
  const auth = obtenerAuth();
  return auth.onAuthStateChanged((usuario) => onCambio(usuario || null));
};

export const construirChatId = (participanteA, participanteB) => {
  return [String(participanteA || "desconocido").trim(), String(participanteB || "desconocido").trim()]
    .sort()
    .join("__");
};

export const refrescarMensajesChat = async ({ chatId }) => {
  const db = obtenerFirestoreChat();
  
  const snapshot = await db
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();
  
  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const refrescarHistorialChatbot = async (limit = 100) => {
  const db = obtenerFirestoreChat();

  const snapshot = await db
    .collection("chatbot_history")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
};

export const escucharMensajesChat = ({ chatId }, onCambio) => {
  const db = obtenerFirestoreChat();

  return db
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .onSnapshot(
      (snapshot) => {
        const mensajes = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        onCambio(mensajes);
      },
      (error) => {
        console.error("Error escuchando mensajes:", error);
        onCambio([]);
      }
    );
};


export const escucharContadorMensajesNoLeidos = ({ chatId, receiverId }, onCambio) => {
  const db = obtenerFirestoreChat();

  return db
    .collection("chats")
    .doc(chatId)
    .collection("messages")
    .where("receiverId", "==", String(receiverId))
    .onSnapshot(
      (snapshot) => {
        const marcas_no_leidos = snapshot.docs
          .map((docSnapshot) => docSnapshot.data())
          .filter((data) => !data.read)
          .map((data) => {
            if (data.createdAt && typeof data.createdAt.toDate === "function") {
              return data.createdAt.toDate().getTime();
            }
            const parsed = new Date(data.createdAt || 0).getTime();
            return Number.isFinite(parsed) ? parsed : 0;
          });

        onCambio({ marcas_no_leidos });
      },
      (error) => {
        console.error("Error contando mensajes no leídos:", error);
        onCambio({ marcas_no_leidos: [] });
      }
    );
};

export const marcarMensajesChatComoLeidos = async ({ chatId, receiverId }) => {
  // El backend es el único camino seguro para esta escritura; el cliente no tiene permisos
  try {
    const { marcar_mensajes_leidos_api } = await import("./auth_api");
    const respuesta = await marcar_mensajes_leidos_api({
      chat_id: chatId,
      receiver_id: String(receiverId),
    });
    console.log(`[Chat] Marcados ${respuesta.actualizados || 0} mensajes como leídos (backend)`);
    return respuesta.actualizados || 0;
  } catch (errorBackend) {
    console.warn("No se pudieron marcar los mensajes como leídos desde el backend:", errorBackend);
    return 0;
  }
};
export const escucharChatsUsuario = ({ userId }, onCambio) => {
  const db = obtenerFirestoreChat();
  return db
    .collection("chats")
    .where("participants", "array-contains", String(userId))
    .onSnapshot(
      (snapshot) => {
        const chats = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        onCambio(chats);
      },
      (error) => {
        console.error("Error escuchando chats del usuario:", error);
        onCambio([]);
      }
    );
};

export const enviarMensajeChat = async ({
  chatId,
  senderId,
  senderName,
  senderPhoto,
  receiverId,
  receiverName,
  receiverPhoto,
  texto,
  tipoMensaje,
  meetingUrl,
  meetingTitle,
  meetingStart,
  meetingEnd,
  meetingDetails,
}) => {
  const { enviar_mensaje_chat_api } = await import("./auth_api");

  const respuesta = await enviar_mensaje_chat_api({
    chat_id: chatId,
    sender_id: String(senderId),
    sender_name: senderName,
    sender_photo: senderPhoto,
    receiver_id: String(receiverId),
    receiver_name: receiverName,
    receiver_photo: receiverPhoto,
    texto,
    tipo_mensaje: tipoMensaje,
    meeting_url: meetingUrl,
    meeting_title: meetingTitle,
    meeting_start: meetingStart,
    meeting_end: meetingEnd,
    meeting_details: meetingDetails,
  });

  return respuesta.message_id || null;
};
