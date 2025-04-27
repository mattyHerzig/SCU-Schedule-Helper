const edgecases = {
  not_mismatches: new Set([
    "dongsoo shin",
    "gaby greenlee",
    "tom blackburn",
    "alexander field",
    "sean okeefe",
    "william stevens",
    "margaret hunter",
    "charles gabbe",
    "jacquelyn hendricks",
    "wenxin xie",
    ". sunwolf",
  ]),
  name_transformations: new Map([
    ["hsin-i" + "cheng", "hsin cheng"],
    ["alexander" + "field", "alexandar field"],
    ["gaby" + "greenlee", "gabrielle greenlee"],
  ]),
  actual_mismatches: new Set(["eun park"]),
};

function findClosingBrace(str, openingBraceIndex) {
  let closingBraceIndex = openingBraceIndex + 1;
  let braceCount = 1;
  while (braceCount > 0 && closingBraceIndex < str.length) {
    closingBraceIndex++;
    if (str[closingBraceIndex] == "{") braceCount++;
    if (str[closingBraceIndex] == "}") braceCount--;
  }
  return closingBraceIndex;
}

async function getHtml(url) {
  const response = await fetch(url);
  return await response.text();
}

async function scrapeProfessorPage(profId, debuggingEnabled = false) {
  if (typeof profId === "number") profId = profId.toString();
  const url = `https://www.ratemyprofessors.com/professor/${profId}`;
  if (debuggingEnabled) console.log("Querying " + url + "...");
  const cache = (await chrome.storage.local.get(profId))[profId];
  if (cache?.teacherData && cache?.exp > Date.now()) {
    return cache.teacherData;
  }

  const html = await getHtml(url);
  let indexOfTeacher = html.indexOf('"__typename":"Teacher"');
  let openingBraceIndex = html.lastIndexOf("{", indexOfTeacher);
  // Find closing brace that matches the opening brace
  let closingBraceIndex = findClosingBrace(html, openingBraceIndex);
  let teacherInfoString = html.substring(
    openingBraceIndex,
    closingBraceIndex + 1
  );
  let teacherData = JSON.parse(teacherInfoString);
  if (teacherData.firstName)
    teacherData.firstName = teacherData.firstName.toLowerCase().trim();
  if (teacherData.lastName)
    teacherData.lastName = teacherData.lastName.toLowerCase().trim();
  if (debuggingEnabled) console.log(teacherData);
  chrome.storage.local.set({
    [profId]: { teacherData, exp: Date.now() + 86400000 },
  });
  return teacherData;
}

async function scrapeRmpRatings(profName, debuggingEnabled = false) {
  profName = profName.replace(" ", "%20");
  const url = `https://www.ratemyprofessors.com/search/professors/882?q=${profName}`;
  let teachers = [];
  if (debuggingEnabled) console.log("Querying " + url + "...");

  const html = await getHtml(url);
  let indexOfTeacher = html.indexOf('"__typename":"Teacher"');
  let indexOfSchool = html.indexOf('"__typename":"School"');
  // Find SCU school id.
  let schoolId = -1;
  while (indexOfSchool != -1) {
    let openingBraceIndex = html.lastIndexOf("{", indexOfSchool);
    let closingBraceIndex = findClosingBrace(html, openingBraceIndex);
    let schoolInfoString = html.substring(
      openingBraceIndex,
      closingBraceIndex + 1
    );
    let schoolData = JSON.parse(schoolInfoString);
    if (schoolData.name == "Santa Clara University") {
      schoolId = schoolData.id;
      break;
    }
    indexOfSchool = html.indexOf('"__typename":"School"', indexOfSchool + 1);
  }
  // If the schoolId is not found, then it means there are no SCU teachers in the query results.
  if (schoolId == -1) {
    return teachers;
  }
  while (indexOfTeacher != -1) {
    // Extract teacher info into JSON object.
    let openingBraceIndex = html.lastIndexOf("{", indexOfTeacher);
    let indexOfSaved = html.indexOf("isSaved", indexOfTeacher);
    let closingBraceIndex = html.indexOf("}", indexOfSaved);
    let teacherInfoString = html.substring(
      openingBraceIndex,
      closingBraceIndex + 1
    );
    let teacherData = JSON.parse(teacherInfoString);
    if (debuggingEnabled) console.log(teacherData);
    // Check if teacher is from SCU.
    if (teacherData.school.__ref == schoolId) {
      // Get the most updated data for the teacher.
      teacherData = await scrapeProfessorPage(
        teacherData.legacyId,
        debuggingEnabled
      );
    }
    if (teacherData.numRatings > 0) teachers.push(teacherData);
    // Find next teacher.
    indexOfTeacher = html.indexOf('"__typename":"Teacher"', indexOfTeacher + 1);
  }
  return teachers;
}

export async function getRmpRatings(rawProfName, debuggingEnabled = false) {
  let profName = rawProfName.trim();
  // Empirical testing showed that including middle names in the query does not improve accuracy.
  // Therefore, we only query by the first first name and the last last name.
  let nameMappings = (await chrome.storage.local.get("professorNameMappings"))
    .professorNameMappings;
  if (nameMappings?.[profName]) {
    profName = nameMappings[profName];
  }
  let realFirstName = profName
    .substring(0, profName.indexOf(" "))
    .trim()
    .toLowerCase();
  let lastName = profName
    .substring(profName.lastIndexOf(" "))
    .trim()
    .toLowerCase();
  if (debuggingEnabled)
    console.log("Querying RMP for " + realFirstName + " " + lastName);
  // If realFirst + lastName is a key in cached_ids, return the cached data.
  let key = realFirstName + lastName;
  let cachedId = (await chrome.storage.local.get(key))[key];
  if (cachedId) {
    return scrapeProfessorPage(cachedId, debuggingEnabled);
  }
  // Find preferred first name, if it exists.
  let preferredFirstName = "";
  let barIndex = profName.indexOf("|");
  if (barIndex != -1) {
    preferredFirstName = profName
      .substring(barIndex + 1, profName.indexOf(" ", barIndex + 2))
      .trim()
      .toLowerCase();
  }
  let data = null;

  // If this is a special case, query instead by the special name in the edge cases file.
  if (edgecases.name_transformations.has(realFirstName + lastName)) {
    const transformedName = edgecases.name_transformations.get(
      realFirstName + lastName
    );
    data = await scrapeRmpRatings(transformedName, debuggingEnabled);
    realFirstName = transformedName
      .substring(0, transformedName.indexOf(" "))
      .trim();
    lastName = transformedName
      .substring(transformedName.lastIndexOf(" "))
      .trim();
  }

  // Otherwise, query first by last name.
  data =
    data == null ? await scrapeRmpRatings(lastName, debuggingEnabled) : data;
  let entry = null;
  if (debuggingEnabled) console.log("Received " + JSON.stringify(data));
  if (data.length == 1) entry = data[0];
  if (data.length > 1) {
    if (debuggingEnabled) console.log("Error: too much data!");
    for (let j = 0; j < data.length; j++) {
      if (
        (data[j].firstName == realFirstName ||
          data[j].firstName == preferredFirstName) &&
        data[j].lastName == lastName
      ) {
        entry = data[j];
        break;
      }
    }
  }
  // Query again using preferred first name if no data found.
  if (entry == null && preferredFirstName != "") {
    data = await scrapeRmpRatings(
      preferredFirstName + " " + lastName,
      debuggingEnabled
    );
    if (data.length == 1) {
      entry = data[0];
      if (debuggingEnabled) console.log("Fixed by using preferred first name!");
    } else if (data.length > 1) {
      if (debuggingEnabled)
        console.log("Multiple data after using preferred first name!");
      for (let j = 0; j < data.length; j++) {
        if (
          data[j].firstName == preferredFirstName &&
          data[j].lastName == lastName
        ) {
          if (debuggingEnabled)
            console.log("Fixed by using preferred first name!");
          entry = data[j];
          break;
        }
      }
    }
  }
  // Query again using real first name if no data found.
  if (entry == null) {
    data = await scrapeRmpRatings(
      realFirstName + " " + lastName,
      debuggingEnabled
    );
    if (data.length == 1) {
      entry = data[0];
      if (debuggingEnabled) console.log("Fixed by using real first name!");
    } else if (data.length > 1) {
      if (debuggingEnabled)
        console.log("Multiple data after using real first name!");
      for (let j = 0; j < data.length; j++) {
        if (
          data[j].firstName == realFirstName &&
          data[j].lastName == lastName
        ) {
          if (debuggingEnabled) console.log("Fixed by using real first name!");
          entry = data[j];
          break;
        }
      }
    }
  }
  if (debuggingEnabled && entry == null) {
    console.log("Error: still no data for " + profName);
  }

  // Check for first name or last name mismatches, and do not return if there is a mismatch.
  if (entry != null) {
    const firstNameReceived = entry.firstName;
    const lastNameReceived = entry.lastName;
    if (
      !firstNameReceived.includes(realFirstName) &&
      !realFirstName.includes(firstNameReceived) &&
      (preferredFirstName == "" ||
        (preferredFirstName != "" &&
          !firstNameReceived.includes(preferredFirstName) &&
          !preferredFirstName.includes(firstNameReceived))) &&
      !edgecases.not_mismatches.has(realFirstName + " " + lastName)
    ) {
      if (debuggingEnabled)
        console.log(
          "Error: first name mismatch\nOurs:",
          realFirstName,
          preferredFirstName,
          lastName,
          "\nRMP:",
          firstNameReceived,
          lastNameReceived
        );
      entry = null;
    }
    if (
      !lastNameReceived.includes(lastName) &&
      !lastName.includes(lastNameReceived) &&
      !edgecases.not_mismatches.has(realFirstName + " " + lastName)
    ) {
      if (debuggingEnabled)
        console.log(
          "Error: last name mismatch\nOurs:",
          realFirstName,
          preferredFirstName,
          lastName,
          "\nRMP:",
          firstNameReceived,
          lastNameReceived
        );
      entry = null;
    }
    if (edgecases.actual_mismatches.has(realFirstName + " " + lastName)) {
      entry = null;
    }
  }
  if (entry != null) {
    chrome.storage.local.set({ [key]: entry.legacyId });
  }
  return entry;
}
