const request = require("request");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

module.exports = { getRmpRatings };

async function getRmpRatings(profName) {
  profName = profName.replace(" ", "%20");
  let url = `https://www.ratemyprofessors.com/search/professors/882?q=${profName}`;
  let teachers = [];
  console.log("Querying " + url + "...");

  request(url, (error, response, html) => {
    if (!error && response.statusCode == 200) {
      indexOfTeacher = html.indexOf('"__typename":"Teacher"');
      while (indexOfTeacher != -1) {
        // Extract teacher info into JSON object.
        openingBraceIndex = html.lastIndexOf("{", indexOfTeacher);
        indexOfSaved = html.indexOf("isSaved", indexOfTeacher);
        closingBraceIndex = html.indexOf("}", indexOfSaved);
        teacherInfoString = html.substring(
          openingBraceIndex,
          closingBraceIndex + 1
        );
        // Log teacher data.
        teacherData = JSON.parse(teacherInfoString);
        console.log(
          "Data extracted: " + teacherData.firstName,
          teacherData.lastName +
            "\n" +
            teacherData.department +
            "\n" +
            "Rating: " +
            teacherData.avgRating +
            "\n" +
            "Difficulty: " +
            teacherData.avgDifficulty +
            "\n" +
            "Would take again: " +
            teacherData.wouldTakeAgainPercent +
            "%\n"
        );
        teachers.push(teacherData);
        // Find next teacher.
        indexOfTeacher = html.indexOf(
          '"__typename":"Teacher"',
          indexOfTeacher + 1
        );
      }
    }
  });
  return teachers;
}

readline.question("Enter a professor name: \n", (name) => {
  getRmpRatings(name);
  readline.close();
});
