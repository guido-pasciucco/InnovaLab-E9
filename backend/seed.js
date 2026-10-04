// seed.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
console.log("Conexión inicializada correctamente ✅");

async function seed() {
  // Responsables
  await db.collection('responsables').doc('resp1').set({
    nombre: "Florencia Bertolini",
    email: "flor.bertolini@test.com",
    pinHash: "hash_prueba_0001",
    fechaCreacion: new Date("2026-09-01T10:00:00Z")
  });

  await db.collection('responsables').doc('resp2').set({
    nombre: "Matías Scaglione",
    email: "matias.scaglione@test.com",
    pinHash: "hash_prueba_0002",
    fechaCreacion: new Date("2026-09-02T14:30:00Z")
  });

  // Dispositivos
  await db.collection('dispositivos').doc('disp1').set({
    uid: "anon_uid_aaa111",
    nombre: "Celular de Bautista",
    estado: "activo",
    responsablesIds: ["resp1"],
    fcmToken: "fcm_token_prueba_aaa",
    fechaVinculacion: new Date("2026-09-03T09:00:00Z"),
    ultimaConexion: new Date("2026-09-28T18:45:00Z")
  });

  await db.collection('dispositivos').doc('disp2').set({
    uid: "anon_uid_bbb222",
    nombre: "Celular de Delfina",
    estado: "advertencia",
    responsablesIds: ["resp1", "resp2"],
    fcmToken: "fcm_token_prueba_bbb",
    fechaVinculacion: new Date("2026-09-05T11:20:00Z"),
    ultimaConexion: new Date("2026-09-28T20:10:00Z")
  });

  await db.collection('dispositivos').doc('disp3').set({
    uid: "anon_uid_ccc333",
    nombre: "Celular de Thiago",
    estado: "caido",
    responsablesIds: ["resp2"],
    fcmToken: "fcm_token_prueba_ccc",
    fechaVinculacion: new Date("2026-09-06T16:00:00Z"),
    ultimaConexion: new Date("2026-09-27T08:30:00Z")
  });

  // Eventos (subcolección de disp2)
  await db.collection('dispositivos').doc('disp2')
    .collection('eventos').doc('evt1').set({
      tipo: "bloqueo",
      sitio: "apuestasclandestinas.net",
      fecha: new Date("2026-09-27T19:15:00Z"),
      resuelto: false
    });

  await db.collection('dispositivos').doc('disp2')
    .collection('eventos').doc('evt2').set({
      tipo: "proteccion_inactiva",
      sitio: null,
      fecha: new Date("2026-09-28T07:40:00Z"),
      resuelto: true
    });

  // Código de vinculación
  await db.collection('codigosVinculacion').doc('cod1').set({
    codigo: "483920",
    responsableId: "resp1",
    creadoEn: new Date("2026-09-28T12:00:00Z"),
    expiraEn: new Date("2026-09-28T12:15:00Z"),
    usado: true
  });

  console.log("¡Listo! Datos de prueba cargados.");
}

seed().catch(console.error);