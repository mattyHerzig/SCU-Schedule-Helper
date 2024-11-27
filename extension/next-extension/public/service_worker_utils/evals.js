import { fetchWithAuth } from "./authorization.js";
import { prodEvalsEndpoint } from "./constants.js";

/**
 * Fetches the evals object from the server, then decodes, decompresses, and stores it in local storage.
 * @returns {Promise<void>}
 */
export async function downloadEvals() {
  const currentExpirationDate = await chrome.storage.local.get(
    "evalsExpirationDate",
  )?.evalsExpirationDate;
  if (
    currentExpirationDate !== undefined &&
    new Date() < new Date(currentExpirationDate)
  ) {
    return;
  }
  const evalsResponse = await fetchWithAuth(prodEvalsEndpoint);
  if (!evalsResponse || !evalsResponse.ok) {
    return;
  }
  const evalsObject = await evalsResponse.json();
  const evalsExpirationDate = evalsObject.dataExpirationDate;
  const evals = await decodeAndDecompress(evalsObject.data);
  await chrome.storage.local.set({ evals, evalsExpirationDate });
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
