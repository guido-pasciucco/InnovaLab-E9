const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const documents = new Map();
let transactionQueue = Promise.resolve();
const users = {
  "responsible-token": {
    uid: "adult-1",
    firebase: { sign_in_provider: "password" }
  },
  "second-responsible-token": {
    uid: "adult-2",
    firebase: { sign_in_provider: "password" }
  },
  "device-token": {
    uid: "device-1",
    firebase: { sign_in_provider: "anonymous" }
  }
};

function snapshot(path) {
  const value = documents.get(path);
  return {
    id: path.split("/").pop(),
    exists: value !== undefined,
    data: () => value === undefined ? undefined : { ...value }
  };
}

function documentRef(path) {
  return {
    path,
    get: async () => snapshot(path),
    collection: (name) => collectionRef(`${path}/${name}`)
  };
}

function collectionRef(path) {
  return {
    doc: (id) => documentRef(`${path}/${id}`),
    where(field, operator, value) {
      return queryRef(path, { field, operator, value });
    }
  };
}

function queryRef(path, filter, order, maxResults) {
  return {
    where: (field, operator, value) =>
      queryRef(path, { field, operator, value }, order, maxResults),
    orderBy: (field, direction) =>
      queryRef(path, filter, { field, direction }, maxResults),
    limit: (limit) => queryRef(path, filter, order, limit),
    async get() {
      const prefix = `${path}/`;
      let docs = [...documents.entries()]
        .filter(([documentPath]) =>
          documentPath.startsWith(prefix) &&
          !documentPath.slice(prefix.length).includes("/")
        )
        .map(([documentPath, data]) => ({
          id: documentPath.slice(prefix.length),
          data: () => ({ ...data })
        }));

      if (filter?.operator === "array-contains") {
        docs = docs.filter((document) =>
          document.data()[filter.field]?.includes(filter.value)
        );
      }

      if (order) {
        docs.sort((left, right) => {
          const a = left.data()[order.field]?.getTime() || 0;
          const b = right.data()[order.field]?.getTime() || 0;
          return order.direction === "desc" ? b - a : a - b;
        });
      }

      return { docs: docs.slice(0, maxResults) };
    }
  };
}

const db = {
  collection: collectionRef,
  async runTransaction(work) {
    const previous = transactionQueue;
    let release;
    transactionQueue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      const writes = [];
      const result = await work({
        get: async (ref) => snapshot(ref.path),
        create: (ref, data) => writes.push({
          kind: "create",
          path: ref.path,
          data
        }),
        update: (ref, data) => writes.push({
          kind: "update",
          path: ref.path,
          data
        })
      });

      for (const write of writes) {
        const existing = documents.get(write.path);
        if (write.kind === "create" && existing !== undefined) {
          throw new Error(`Cannot create existing document ${write.path}`);
        }
        if (write.kind === "update" && existing === undefined) {
          throw new Error(`Cannot update missing document ${write.path}`);
        }
        documents.set(
          write.path,
          write.kind === "update"
            ? { ...existing, ...write.data }
            : { ...write.data }
        );
      }

      return result;
    } finally {
      release();
    }
  }
};

const firebaseConfigPath = require.resolve("../src/config/firebase");
require.cache[firebaseConfigPath] = {
  id: firebaseConfigPath,
  filename: firebaseConfigPath,
  loaded: true,
  exports: {
    auth: {
      verifyIdToken: async (token) => {
        if (!users[token]) {
          throw Object.assign(new Error("Invalid token"), {
            code: "auth/invalid-id-token"
          });
        }
        return users[token];
      }
    },
    db
  }
};

const firestorePath = require.resolve("firebase-admin/firestore");
require.cache[firestorePath] = {
  id: firestorePath,
  filename: firestorePath,
  loaded: true,
  exports: {
    FieldValue: {
      serverTimestamp: () => new Date()
    }
  }
};

const {
  getAlertsForResponsible,
  markAlertRead,
  parseAlertLimit
} = require("../src/services/alerts.service");
const { recordDeviceEvent } = require("../src/services/deviceEvents.service");
const app = require("../src/app");

const ALERTABLE_EVENT_ID = "c0839b8a-0e91-44b5-bbc3-ad974667fb11";
const NOT_ALERTABLE_EVENT_ID = "a41e5b7a-72d2-479d-8be3-10a546f6b2e2";

function event(eventId, fields = {}) {
  return {
    eventoId: eventId,
    tipoEvento: "proteccion_desactivada",
    resultado: "exitoso",
    timestampDispositivo: "2026-03-15T12:00:00.000Z",
    secuencia: 1,
    versionApp: "1.0.0",
    ...fields
  };
}

async function listen() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  };
}

beforeEach(() => {
  documents.clear();
  transactionQueue = Promise.resolve();
});

test("creates one alert atomically for a new alertable event and captures recipients", async () => {
  documents.set("dispositivos/device-1", {
    nombre: "Celular de Ana",
    responsablesIds: ["adult-1", "adult-2", "adult-1"]
  });

  const first = await recordDeviceEvent({
    deviceId: "device-1",
    authenticatedDeviceId: "device-1",
    rawEvent: event(ALERTABLE_EVENT_ID)
  });
  const duplicate = await recordDeviceEvent({
    deviceId: "device-1",
    authenticatedDeviceId: "device-1",
    rawEvent: event(ALERTABLE_EVENT_ID)
  });

  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);

  const alerts = [...documents.entries()]
    .filter(([path]) => path.startsWith("alertas/"));
  assert.equal(alerts.length, 1);
  const alert = alerts[0][1];
  assert.equal(alert.eventoOrigenId, ALERTABLE_EVENT_ID);
  assert.equal(alert.dispositivoId, "device-1");
  assert.match(alert.mensaje, /^El dispositivo reportó: Protección desactivada/);
  assert.deepEqual(alert.responsablesIds, ["adult-1", "adult-2"]);
  assert.deepEqual(alert.responsablesLeidosIds, []);
});

test("creates alerts only for the existing mobile rules", async () => {
  documents.set("dispositivos/device-1", {
    nombre: "Celular de Ana",
    responsablesIds: ["adult-1"]
  });

  await recordDeviceEvent({
    deviceId: "device-1",
    authenticatedDeviceId: "device-1",
    rawEvent: event(NOT_ALERTABLE_EVENT_ID, {
      tipoEvento: "intento_modificacion_config",
      resultado: "exitoso",
      configuracion: "desactivar_proteccion"
    })
  });
  await recordDeviceEvent({
    deviceId: "device-1",
    authenticatedDeviceId: "device-1",
    rawEvent: event("c118b6a2-5d1d-4476-94bd-5fc0bff8b449", {
      tipoEvento: "intento_modificacion_config",
      resultado: "fallido",
      configuracion: "desactivar_proteccion",
      secuencia: 2
    })
  });
  await recordDeviceEvent({
    deviceId: "device-1",
    authenticatedDeviceId: "device-1",
    rawEvent: event("11cf830a-1148-4ed1-aa3e-01ba42d5a5f2", {
      tipoEvento: "acceso_bloqueado",
      resultado: "bloqueado",
      versionLista: "lotba-v1",
      dominio: "ejemplo.com",
      origenLista: "lotba",
      secuencia: 3
    })
  });

  const alerts = await getAlertsForResponsible({
    responsibleId: "adult-1",
    limit: 50
  });
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].mensaje, /Intento de desactivar la protección sin autorización/);
});

test("keeps read state independent per responsible and hides alerts from others", async () => {
  documents.set("dispositivos/device-1", {
    nombre: "Celular de Ana",
    responsablesIds: ["adult-1", "adult-2"]
  });
  await recordDeviceEvent({
    deviceId: "device-1",
    authenticatedDeviceId: "device-1",
    rawEvent: event(ALERTABLE_EVENT_ID)
  });
  const alertId = [...documents.keys()].find((path) => path.startsWith("alertas/"))
    .split("/")[1];

  assert.equal(await markAlertRead({ responsibleId: "adult-1", alertaId: alertId }), true);
  assert.equal(await markAlertRead({ responsibleId: "adult-1", alertaId: alertId }), false);
  assert.equal(
    (await getAlertsForResponsible({ responsibleId: "adult-1", limit: 50 }))[0].leida,
    true
  );
  assert.equal(
    (await getAlertsForResponsible({ responsibleId: "adult-2", limit: 50 }))[0].leida,
    false
  );
  await assert.rejects(
    markAlertRead({ responsibleId: "other-adult", alertaId: alertId }),
    (error) => error.status === 404 && error.code === "alert_not_found"
  );
});

test("HTTP alert routes require a responsible account and return the mobile contract", async () => {
  documents.set("dispositivos/device-1", {
    nombre: "Celular de Ana",
    responsablesIds: ["adult-1"]
  });
  await recordDeviceEvent({
    deviceId: "device-1",
    authenticatedDeviceId: "device-1",
    rawEvent: event(ALERTABLE_EVENT_ID)
  });

  const { server, baseUrl } = await listen();
  try {
    let response = await fetch(`${baseUrl}/api/alerts`, {
      headers: { Authorization: "Bearer responsible-token" }
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.alertas.length, 1);
    assert.equal(payload.alertas[0].leida, false);

    response = await fetch(
      `${baseUrl}/api/alerts/${encodeURIComponent(payload.alertas[0].alertaId)}/read`,
      {
        method: "POST",
        headers: { Authorization: "Bearer responsible-token" }
      }
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { leida: true });

    response = await fetch(`${baseUrl}/api/alerts`, {
      headers: { Authorization: "Bearer device-token" }
    });
    assert.equal(response.status, 403);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("validates alert list limits", () => {
  assert.equal(parseAlertLimit(undefined), 50);
  assert.equal(parseAlertLimit("100"), 100);
  assert.throws(() => parseAlertLimit("0"), { code: "invalid_alert_limit" });
  assert.throws(() => parseAlertLimit("101"), { code: "invalid_alert_limit" });
});
