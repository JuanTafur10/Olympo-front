import { obtenerFirestoreChat } from "./chat_firebase.js";

const COLECCION = "tickets_soporte";

export const escucharTicketsSoporte = (onCambio) => {
  if (typeof onCambio !== "function") {
    return () => {};
  }

  try {
    const db = obtenerFirestoreChat();
    return db
      .collection(COLECCION)
      .onSnapshot(
        (snapshot) => {
          const tickets = snapshot.docs.map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }));
          onCambio(tickets);
        },
        (error) => {
          console.error("Error escuchando tickets de soporte:", error);
          onCambio([]);
        }
      );
  } catch (error) {
    console.warn("Firestore de tickets no disponible:", error);
    return () => {};
  }
};