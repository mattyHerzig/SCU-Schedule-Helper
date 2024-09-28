// Use for encrypting secrets to upload to GitHub.
import libsodium from "libsodium-wrappers";
const secret = "secret goes here";
// This is the public key of the repo.
const key = "7oqDBKCm15zky3EQCVqEdX/urNnId+aN4a7uA7Pm9HU=";

//Check if libsodium is ready and then proceed.
libsodium.ready.then(() => {
  // Convert the secret and key to a Uint8Array.
  let binkey = libsodium.from_base64(key, libsodium.base64_variants.ORIGINAL);
  let binsec = libsodium.from_string(secret);

  // Encrypt the secret using libsodium
  let encBytes = libsodium.crypto_box_seal(binsec, binkey);

  // Convert the encrypted Uint8Array to Base64
  let output = libsodium.to_base64(encBytes, libsodium.base64_variants.ORIGINAL);

  // Print the output
  console.log(output);
});
