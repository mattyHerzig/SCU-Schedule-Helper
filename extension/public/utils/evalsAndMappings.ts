import { fetchWithAuth } from "./authorization.ts";
import { PROD_EVALS_ENDPOINT, PROD_NAME_MAPPINGS_ENDPOINT } from "./constants.ts";

/**
 * Fetches the evals object from the server, then decodes, decompresses, and stores it in local storage.
 * @returns {Promise<void>}
 */
export async function downloadEvals() {
  const currentExpirationDate = (
    await chrome.storage.local.get("evalsExpirationDate")
  ).evalsExpirationDate;
  if (currentExpirationDate && new Date() < new Date(currentExpirationDate)) {
    await chrome.storage.local.set({
      isDownloadingEvals: false,
    });
    return;
  }
  const evalsResponse = await fetchWithAuth(PROD_EVALS_ENDPOINT);
  if (!evalsResponse || !evalsResponse.ok) {
    await chrome.storage.local.set({
      isDownloadingEvals: false,
    });
    return;
  }
  const evalsObject = await evalsResponse.json();
  const evalsExpirationDate = evalsObject.dataExpirationDate;
  const evals = await decodeAndDecompress(evalsObject.data);
  await chrome.storage.local.set({
    evals,
    evalsExpirationDate,
    isDownloadingEvals: false,
  });
}

export async function downloadProfessorNameMappings() {
  const currentExpirationDate = (
    await chrome.storage.local.get("mappingsExpirationDate")
  ).mappingsExpirationDate;
  if (currentExpirationDate && new Date() < new Date(currentExpirationDate)) {
    return;
  }
  const response = await fetchWithAuth(PROD_NAME_MAPPINGS_ENDPOINT);
  if (!response || !response.ok) {
    return;
  }
  const mappingsResponse = await response.json();
  await chrome.storage.local.set({
    professorNameMappings: mappingsResponse.data,
    mappingsExpirationDate: mappingsResponse.dataExpirationDate,
  });
}

async function decodeAndDecompress(base64EncodedGzippedData) {
  const binaryString = atob(base64EncodedGzippedData);
  const binaryData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }

  const decompressedStream = new Response(binaryData).body.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const decompressedText = await new Response(decompressedStream).text();
  const jsonData = JSON.parse(decompressedText);
  return jsonData;
}
