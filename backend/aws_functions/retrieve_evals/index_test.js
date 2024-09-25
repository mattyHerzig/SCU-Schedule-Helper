import { handler } from "./index.js";

handler({
  headers: {
    authorization:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN3ZGVhbkBzY3UuZWR1IiwiaWF0IjoxNzIzMzAzMDMyLCJleHAiOjE3NTQ4NjA2MzJ9.NwYa_xirJAO9njxYt_CWWvxfcQmXHimP0Rw8KCzxj64",
  },
}).then((response) => {
  console.log(JSON.stringify(response, null, 3).substring(0, 1000));
});
