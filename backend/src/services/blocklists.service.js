const { db } = require("../config/firebase");
const {
  ACTIVE_LIST_CONFIG_COLLECTION,
  ACTIVE_LIST_CONFIG_DOCUMENT,
  ACTIVE_LOTBA_VERSION_FIELD,
  LIST_VERSION_COLLECTION
} = require("../config/blocklists");
const { HttpError } = require("../errors/HttpError");

async function getCurrentLotbaBlocklist(clientHash) {
  const activeConfig = await db
    .collection(ACTIVE_LIST_CONFIG_COLLECTION)
    .doc(ACTIVE_LIST_CONFIG_DOCUMENT)
    .get();
  const versionId = activeConfig.get(ACTIVE_LOTBA_VERSION_FIELD);

  if (typeof versionId !== "string" || !versionId) {
    throw new HttpError(
      404,
      "blocklist_not_published",
      "Todavía no hay una lista oficial LOTBA publicada."
    );
  }

  const versionRef = db.collection(LIST_VERSION_COLLECTION).doc(versionId);
  const versionSnapshot = await versionRef.get();

  if (!versionSnapshot.exists) {
    throw new HttpError(
      503,
      "blocklist_unavailable",
      "La versión oficial publicada no está disponible."
    );
  }

  const versionData = versionSnapshot.data();
  if (
    versionData.origen !== "lotba" ||
    typeof versionData.huella !== "string" ||
    !Number.isInteger(versionData.cantidadDominios)
  ) {
    throw new HttpError(
      503,
      "blocklist_unavailable",
      "Los metadatos de la versión oficial no son válidos."
    );
  }

  const publishedAt = versionData.fecha &&
      typeof versionData.fecha.toDate === "function"
    ? versionData.fecha.toDate().toISOString()
    : null;
  const version = {
    id: versionId,
    fecha: publishedAt,
    hash: versionData.huella,
    cantidadDominios: versionData.cantidadDominios,
    reglaCoincidencia: versionData.reglaCoincidencia ?? "dominio_y_subdominios"
  };

  if (clientHash === version.hash) {
    return { actualizada: false, version };
  }

  const domainsSnapshot = await versionRef.collection("dominios").get();
  if (domainsSnapshot.size !== version.cantidadDominios) {
    throw new HttpError(
      503,
      "blocklist_unavailable",
      "La versión oficial publicada está incompleta."
    );
  }

  return {
    actualizada: true,
    version,
    dominios: domainsSnapshot.docs.map((domain) => domain.id)
  };
}

module.exports = { getCurrentLotbaBlocklist };
