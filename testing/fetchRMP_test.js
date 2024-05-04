const { getRmpRatings } = require("../scripts/fetchRMP.js");
const fs = require("fs");

(async () => {
  const profs_list = fs.openSync("fetchRMP_test_data.txt", "r");
  const text_file = fs.readFileSync(profs_list).toString().split("\n");
  const debuggingEnabled = false;
  fs.closeSync(profs_list);
  let profs = new Set();
  for (line of text_file) {
    if (profs.has(line) || line == "") {
      continue;
    }
    profs.add(line);
  }
  console.log("Total profs:", profs.size);

  let totalQueries = 0;
  let successfullQueries = 0;
  for (const prof of profs) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const ratings = await getRmpRatings(prof, debuggingEnabled);
    totalQueries++;
    if (ratings != null) successfullQueries++;
  }
  console.log("Total queries: ", totalQueries);
  console.log("Total successfull queries: ", successfullQueries);
})();
