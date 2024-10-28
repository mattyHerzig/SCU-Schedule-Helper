import { handler } from "./index.js";

handler({
  headers: {
    authorization: "Bearer ",
  },
}).then((response) => {
  console.log(JSON.stringify(response, null, 3).substring(0, 1000));
});
