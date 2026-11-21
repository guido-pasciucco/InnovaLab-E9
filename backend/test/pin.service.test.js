const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const documents = new Map();
let transactionQueue = Promise.resolve();
const users = {
  "responsible-token": {
    uid: "adult-1",
    firebase: { sign_in_provider: "password" }
  },
  "device-token": {
    uid: "device-1",
    firebase: { sign_in_provider: "anonymous" }
  },
  "other-device-token": {
    uid: "other-device",
    firebase: { sign_in_provider: "anonymous" }
  }
};

function snapshot(path) {
  const value = documents.get(path);
  return {
    exists: value !== undefined,
    data: () => value === undefined ? undefined : { ...value },
    get: (field) => value?.[field]
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
  return { doc: (id) => documentRef(`${path}/${id}`) };
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
        set: (ref, data, options) => writes.push({
          kind: "set",
          path: ref.path,
          data,
          merge: options?.merge === true
        }),
        update: (ref, data) => writes.push({
          kind: "update",
          path: ref.path,
          data
        })
      });

      for (const write of writes) {
        const existing = documents.get(write.path);
        if (write.kind === "update" && existing === undefined) {
          throw new Error(`Cannot update missing document ${write.path}`);
        }
        documents.set(
          write.path,
          write.merge || write.kind === "update"
            ? { ...(existing || {}), ...write.data }
            : { ...write.data }
        );
      }

      return result;
    } finally {
      release();
    }
  }
};

const auth = {
  verifyIdToken: async (token) => {
    if (!users[token]) {
      throw Object.assign(new Error("Invalid token"), {
        code: "auth/invalid-id-token"
      });
    }
    return users[token];
  }
};

const firebaseConfigPath = require.resolve("../src/config/firebase");
require.cache[firebaseConfigPath] = {
  id: firebaseConfigPath,
  filename: firebaseConfigPath,
  loaded: true,
  exports: { auth, db }
};

const {
  setResponsiblePin,
  verifyDevicePin,
  verifyResponsiblePin
} = require("../src/services/pin.service");
const app = require("../src/app");

beforeEach(() => {
  documents.clear();
  transactionQueue = Promise.resolve();
  process.env.PIN_PEPPER = "test-only-pin-pepper-with-at-least-32-bytes";
});

test("stores a salted hash and verifies the responsible PIN", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });

  await setResponsiblePin("adult-1", "2580");

  const profile = documents.get("responsables/adult-1");
  assert.match(profile.pinHash, /^pin-v1\$16384\$8\$1\$/);
  assert.notEqual(profile.pinHash, "2580");
  assert.equal(await verifyResponsiblePin("adult-1", "2580"), true);
  assert.equal(await verifyResponsiblePin("adult-1", "2581"), false);
});

test("rejects weak PINs on creation", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });

  await assert.rejects(
    setResponsiblePin("adult-1", "1111"),
    (error) => error.code === "weak_pin"
  );
  await assert.rejects(
    setResponsiblePin("adult-1", "1234"),
    (error) => error.code === "weak_pin"
  );
});

test("persists an escalating lockout after three failed attempts", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });
  await setResponsiblePin("adult-1", "2580");

  assert.equal(await verifyResponsiblePin("adult-1", "0000"), false);
  assert.equal(await verifyResponsiblePin("adult-1", "0000"), false);
  assert.equal(await verifyResponsiblePin("adult-1", "0000"), false);

  const lockState = documents.get("responsables/adult-1/seguridad/pin");
  assert.ok(lockState.lockedUntil > Date.now());
  assert.equal(lockState.lockLevel, 1);
  await assert.rejects(
    verifyResponsiblePin("adult-1", "2580"),
    (error) => error.status === 429 && error.code === "pin_locked"
  );
});

test("serializes concurrent failed attempts so they cannot bypass the lockout", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });
  await setResponsiblePin("adult-1", "2580");

  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => verifyResponsiblePin("adult-1", "0000"))
  );
  assert.equal(results.filter((result) =>
    result.status === "fulfilled" && result.value === false
  ).length, 3);
  assert.equal(results.filter((result) =>
    result.status === "rejected" && result.reason.code === "pin_locked"
  ).length, 2);
});

test("requires a recent successful verification before changing an existing PIN", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });
  await setResponsiblePin("adult-1", "2580");

  await assert.rejects(
    setResponsiblePin("adult-1", "3691"),
    (error) => error.code === "pin_reauthentication_required"
  );

  assert.equal(await verifyResponsiblePin("adult-1", "2580"), true);
  await setResponsiblePin("adult-1", "3691");
  assert.equal(await verifyResponsiblePin("adult-1", "3691"), true);
});

test("a protected device can verify a linked responsible PIN", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });
  documents.set("dispositivos/device-1", { responsablesIds: ["adult-1"] });
  await setResponsiblePin("adult-1", "2580");

  assert.equal(await verifyDevicePin("device-1", "2580"), true);
  assert.equal(await verifyDevicePin("device-1", "0000"), false);
});

test("fails closed when the server pepper is missing", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });
  delete process.env.PIN_PEPPER;

  await assert.rejects(
    setResponsiblePin("adult-1", "2580"),
    (error) => error.status === 503 && error.code === "pin_service_unavailable"
  );
});

test("HTTP PIN routes enforce Firebase providers and return the client contract", async () => {
  documents.set("responsables/adult-1", { nombre: "Tutor" });
  documents.set("dispositivos/device-1", { responsablesIds: ["adult-1"] });
  process.env.PIN_PEPPER = "test-only-pin-pepper-with-at-least-32-bytes";

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    let response = await fetch(`${baseUrl}/api/responsible-profile/pin`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer responsible-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pin: "2580" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { pinConfigurado: true });

    response = await fetch(`${baseUrl}/api/responsible-profile/pin/verify`, {
      method: "POST",
      headers: {
        Authorization: "Bearer responsible-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pin: "2580" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { valido: true });

    response = await fetch(`${baseUrl}/api/devices/device-1/verify-pin`, {
      method: "POST",
      headers: {
        Authorization: "Bearer device-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pin: "2580" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { valido: true });

    response = await fetch(`${baseUrl}/api/devices/device-1/verify-pin`, {
      method: "POST",
      headers: {
        Authorization: "Bearer other-device-token",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pin: "2580" })
    });
    assert.equal(response.status, 403);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
