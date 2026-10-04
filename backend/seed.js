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
    plataforma: "android",
    versionApp: "1.0.0",
    ultimoReporte: new Date("2026-09-28T18:45:00Z"),
    fcmToken: "fcm_token_prueba_aaa",
    fechaVinculacion: new Date("2026-09-03T09:00:00Z")
  });

  await db.collection('dispositivos').doc('disp2').set({
    uid: "anon_uid_bbb222",
    nombre: "Celular de Delfina",
    estado: "advertencia",
    responsablesIds: ["resp1", "resp2"],
    plataforma: "android",
    versionApp: "1.0.0",
    ultimoReporte: new Date("2026-09-28T20:10:00Z"),
    fcmToken: "fcm_token_prueba_bbb",
    fechaVinculacion: new Date("2026-09-05T11:20:00Z")
  });

  await db.collection('dispositivos').doc('disp3').set({
    uid: "anon_uid_ccc333",
    nombre: "Celular de Thiago",
    estado: "caido",
    responsablesIds: ["resp2"],
    plataforma: "android",
    versionApp: "0.9.5",
    ultimoReporte: new Date("2026-09-27T08:30:00Z"),
    fcmToken: "fcm_token_prueba_ccc",
    fechaVinculacion: new Date("2026-09-06T16:00:00Z")
  });

  // Lista de versión (LOTBA)
  await db.collection('listaVersiones').doc('ver_lotba_1').set({
    origen: "lotba",
    fecha: new Date("2026-09-01T00:00:00Z"),
    cantidadDominios: 2,
    huella: "hash_lotba_v1"
  });

  await db.collection('listaVersiones').doc('ver_lotba_1')
    .collection('dominios').doc('dom1').set({
      dominio: "apuestasclandestinas.net",
      origen: "lotba"
    });

  await db.collection('listaVersiones').doc('ver_lotba_1')
    .collection('dominios').doc('dom2').set({
      dominio: "casinoilegal.bet",
      origen: "lotba"
    });

  // Lista de versión (personalizada de resp1)
  await db.collection('listaVersiones').doc('ver_personal_resp1').set({
    origen: "personalizada",
    responsableId: "resp1",
    fecha: new Date("2026-09-10T00:00:00Z"),
    cantidadDominios: 1,
    huella: "hash_personal_resp1_v1"
  });

  await db.collection('listaVersiones').doc('ver_personal_resp1')
    .collection('dominios').doc('dom1').set({
      dominio: "sitiosospechoso.com",
      origen: "personalizada"
    });

  // Eventos (subcolección de disp2) — eventoId generado en el dispositivo = ID del doc
  await db.collection('dispositivos').doc('disp2')
    .collection('eventos').doc('evt_uuid_001').set({
      dispositivoId: "disp2",
      timestampDispositivo: new Date("2026-09-27T19:15:00Z"),
      timestampServidor: new Date("2026-09-27T19:15:03Z"),
      secuencia: 1,
      tipoEvento: "acceso_bloqueado",
      resultado: "bloqueado",
      versionApp: "1.0.0",
      versionLista: "ver_lotba_1",
      dominio: "apuestasclandestinas.net",
      origenLista: "lotba",
      cantidad: 1
    });

  await db.collection('dispositivos').doc('disp2')
    .collection('eventos').doc('evt_uuid_002').set({
      dispositivoId: "disp2",
      timestampDispositivo: new Date("2026-09-28T07:40:00Z"),
      timestampServidor: new Date("2026-09-28T07:40:02Z"),
      secuencia: 2,
      tipoEvento: "proteccion_desactivada",
      resultado: "detectado",
      versionApp: "1.0.0",
      motivo: "permiso_revocado"
    });

  // Alertas — denormalizan responsablesIds para listar "todas las alertas de un responsable"
  await db.collection('alertas').doc('alerta_001').set({
    eventoOrigenId: "evt_uuid_002",
    responsablesIds: ["resp1", "resp2"],
    mensaje: "La protección en el dispositivo de Delfina está inactiva",
    fecha: new Date("2026-09-28T07:40:05Z"),
    estado: "generada"
  });

  // Código de vinculación
  await db.collection('codigosVinculacion').doc('cod1').set({
    codigo: "483920",
    responsableId: "resp1",
    creadoEn: new Date("2026-09-28T12:00:00Z"),
    expiraEn: new Date("2026-09-28T12:15:00Z"),
    usado: true
  });

  console.log("¡Listo! Datos de prueba cargados con la estructura actualizada.");
}

seed().catch(console.error);