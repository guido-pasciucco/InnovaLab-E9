const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const {
  ACTIVE_LIST_CONFIG_COLLECTION,
  ACTIVE_LIST_CONFIG_DOCUMENT,
  ACTIVE_LOTBA_VERSION_FIELD,
  LIST_VERSION_COLLECTION
} = require("../src/config/blocklists");

const DEFAULT_FILE = path.join(
  __dirname,
  "..",
  "..",
  "docs",
  "Sitios bloqueados - Agosto(Hoja1).csv"
);
const BATCH_SIZE = 450;
const MAX_INVALID_EXAMPLES = 20;

function parseArguments(args) {
  const options = {
    apply: false,
    file: DEFAULT_FILE,
    projectId: null
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--apply") {
      options.apply = true;
    } else if (argument === "--file" || argument === "--project-id") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Falta un valor para ${argument}.`);
      }

      if (argument === "--file") {
        options.file = path.resolve(value);
      } else {
        options.projectId = value;
      }

      index += 1;
    } else if (argument === "--help") {
      options.help = true;
    } else {
      throw new Error(`Opción desconocida: ${argument}`);
    }
  }

  return options;
}

function parseCsvCell(line, lineNumber) {
  if (line.startsWith('"')) {
    const match = line.match(/^"((?:[^"]|"")*)"\s*$/);
    if (!match) {
      throw new Error(`La fila ${lineNumber} no contiene una celda CSV válida.`);
    }

    return match[1].replace(/""/g, '"').trim();
  }

  if (line.includes(",") || line.includes('"')) {
    throw new Error(
      `La fila ${lineNumber} tiene columnas inesperadas; se esperaba una sola columna LINK.`
    );
  }

  return line.trim();
}

function normalizeDomain(value) {
  const input = value.trim();
  if (!input) {
    throw new Error("La entrada está vacía.");
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) && !/^https?:\/\//i.test(input)) {
    throw new Error("El protocolo debe ser HTTP o HTTPS.");
  }

  const urlInput = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let parsedUrl;

  try {
    parsedUrl = new URL(urlInput);
  } catch {
    throw new Error("No se pudo interpretar como URL o dominio.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Solo se aceptan URLs HTTP o HTTPS.");
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("No se aceptan URLs con credenciales.");
  }

  let hostname = parsedUrl.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }

  const labels = hostname.split(".");
  if (
    net.isIP(hostname) ||
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some((label) =>
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    )
  ) {
    throw new Error("El host no tiene un formato de dominio válido.");
  }

  return hostname;
}

function readList(filePath) {
  const sourceBuffer = fs.readFileSync(filePath);
  const source = sourceBuffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = source.split(/\r?\n/);
  const header = parseCsvCell(lines[0] || "", 1);

  if (header.toLowerCase() !== "link") {
    throw new Error('El CSV debe tener una única columna llamada "LINK".');
  }

  const latestByDomain = new Map();
  const invalidRows = [];
  let sourceRowCount = 0;
  let blankRowCount = 0;

  for (let index = 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) {
      blankRowCount += 1;
      continue;
    }

    sourceRowCount += 1;

    try {
      const value = parseCsvCell(lines[index], index + 1);
      const domain = normalizeDomain(value);
      latestByDomain.set(domain, {
        dominio: domain,
        origen: "lotba",
        filaFuente: index + 1
      });
    } catch (error) {
      invalidRows.push({
        fila: index + 1,
        valor: lines[index],
        motivo: error.message
      });
    }
  }

  const domains = [...latestByDomain.values()].sort((left, right) =>
    left.dominio < right.dominio ? -1 : left.dominio > right.dominio ? 1 : 0
  );
  const canonicalContent = domains.map(({ dominio }) => dominio).join("\n");
  const contentHash = crypto
    .createHash("sha256")
    .update(canonicalContent)
    .digest("hex");
  const sourceHash = crypto
    .createHash("sha256")
    .update(sourceBuffer)
    .digest("hex");

  return {
    blankRowCount,
    contentHash,
    domains,
    duplicateCount: sourceRowCount - invalidRows.length - domains.length,
    invalidRows,
    sourceHash,
    sourceRowCount
  };
}

function printUsage() {
  console.log(`Uso:
  npm run import:lotba
  npm run import:lotba -- --file "ruta\\a\\lista.csv"
  npm run import:lotba -- --apply --project-id <project_id>

Sin --apply, el comando solo muestra una vista previa.
La escritura requiere --apply y un project-id que coincida con las credenciales locales.`);
}

function printPreview(filePath, result) {
  console.log(`Archivo: ${filePath}`);
  console.log(`Filas de datos: ${result.sourceRowCount}`);
  console.log(`Filas vacías ignoradas: ${result.blankRowCount}`);
  console.log(`Dominios únicos normalizados: ${result.domains.length}`);
  console.log(`Duplicados eliminados: ${result.duplicateCount}`);
  console.log(`Filas inválidas: ${result.invalidRows.length}`);
  console.log(`Huella del contenido normalizado: ${result.contentHash}`);
  console.log(`Huella del archivo: ${result.sourceHash}`);
  console.log("Muestra de dominios:");
  result.domains.slice(0, 10).forEach(({ dominio, filaFuente }) => {
    console.log(`  ${dominio} (última aparición: fila ${filaFuente})`);
  });

  if (result.invalidRows.length > 0) {
    console.log("Filas inválidas (muestra):");
    result.invalidRows.slice(0, MAX_INVALID_EXAMPLES).forEach((row) => {
      console.log(`  Fila ${row.fila}: ${row.motivo} [${row.valor}]`);
    });
  }
}

async function importVersion(options, result) {
  if (!options.projectId) {
    throw new Error(
      "Para escribir en Firestore indica también --project-id <project_id>."
    );
  }

  const serviceAccountPath = path.join(
    __dirname,
    "..",
    "serviceAccountKey.json"
  );
  const serviceAccount = require(serviceAccountPath);

  if (options.projectId !== serviceAccount.project_id) {
    throw new Error(
      `El project-id indicado no coincide con las credenciales locales (proyecto: ${serviceAccount.project_id}).`
    );
  }

  const { cert, getApps, initializeApp } = require("firebase-admin/app");
  const { FieldValue, getFirestore } = require("firebase-admin/firestore");
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);
  const versionId = `lotba_${result.contentHash.slice(0, 20)}`;
  const versionRef = db.collection(LIST_VERSION_COLLECTION).doc(versionId);
  const existingVersion = await versionRef.get();

  if (!existingVersion.exists) {
    for (let offset = 0; offset < result.domains.length; offset += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = result.domains.slice(offset, offset + BATCH_SIZE);

      for (const domain of chunk) {
        const domainRef = versionRef
          .collection("dominios")
          .doc(domain.dominio);
        batch.set(domainRef, domain);
      }

      await batch.commit();
      console.log(
        `Cargados ${Math.min(offset + chunk.length, result.domains.length)} / ${result.domains.length} dominios.`
      );
    }

    await versionRef.create({
      origen: "lotba",
      fecha: FieldValue.serverTimestamp(),
      cantidadDominios: result.domains.length,
      huella: result.contentHash,
      archivoNombre: path.basename(options.file),
      archivoHuella: result.sourceHash,
      cantidadFilasFuente: result.sourceRowCount,
      cantidadDuplicados: result.duplicateCount,
      reglaCoincidencia: "dominio_y_subdominios"
    });
  } else {
    const existingData = existingVersion.data();
    if (
      existingData.origen !== "lotba" ||
      existingData.huella !== result.contentHash ||
      existingData.cantidadDominios !== result.domains.length
    ) {
      throw new Error(
        `La versión ${versionId} ya existe con metadatos incompatibles.`
      );
    }

    const domainCount = await versionRef.collection("dominios").count().get();
    if (domainCount.data().count !== result.domains.length) {
      throw new Error(
        `La versión ${versionId} existe, pero su subcolección de dominios está incompleta.`
      );
    }

    console.log(`La versión ${versionId} ya existe y está completa.`);
  }

  const activeConfigRef = db
    .collection(ACTIVE_LIST_CONFIG_COLLECTION)
    .doc(ACTIVE_LIST_CONFIG_DOCUMENT);
  await db.runTransaction(async (transaction) => {
    const [versionSnapshot, activeConfigSnapshot] = await Promise.all([
      transaction.get(versionRef),
      transaction.get(activeConfigRef)
    ]);

    if (
      !versionSnapshot.exists ||
      versionSnapshot.get("huella") !== result.contentHash ||
      versionSnapshot.get("cantidadDominios") !== result.domains.length
    ) {
      throw new Error(
        `La versión ${versionId} no está completa; no se publicará como activa.`
      );
    }

    transaction.set(
      activeConfigRef,
      {
        [ACTIVE_LOTBA_VERSION_FIELD]: versionId,
        actualizadaEn: FieldValue.serverTimestamp()
      },
      { merge: activeConfigSnapshot.exists }
    );
  });

  console.log(
    `Versión ${versionId} publicada como activa en el proyecto ${options.projectId}.`
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  if (!fs.existsSync(options.file)) {
    throw new Error(`No se encontró el archivo: ${options.file}`);
  }

  const result = readList(options.file);
  printPreview(options.file, result);

  if (result.invalidRows.length > 0) {
    throw new Error("Corrige las filas inválidas antes de importar la lista.");
  }

  if (result.domains.length === 0) {
    throw new Error("El archivo no contiene dominios para importar.");
  }

  if (!options.apply) {
    console.log("Vista previa solamente; no se escribió nada en Firestore.");
    printUsage();
    return;
  }

  await importVersion(options, result);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
