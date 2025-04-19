import fs from "fs";

const validDepartmentCodes = [
  "ACTG",
  "AERO",
  "AMTH",
  "ANTH",
  "ARAB",
  "ARTH",
  "ARTS",
  "ASCI",
  "ASIA",
  "BIOE",
  "BIOL",
  "BUSN",
  "CENG",
  "CHEM",
  "CHIN",
  "CHST",
  "CLAS",
  "COMM",
  "PSSE",
  "CSCI",
  "CSEN",
  "DANC",
  "ECEN",
  "ECON",
  "ELSJ",
  "ENGL",
  "ENGR",
  "ENVS",
  "ETHN",
  "FNCE",
  "FREN",
  "GERM",
  "GERO",
  "HIST",
  "HNRS",
  "ITAL",
  "INTL",
  "JAPN",
  "LEAD",
  "MATH",
  "MECH",
  "MGMT",
  "MILS",
  "MKTG",
  "MUSC",
  "NEUR",
  "OMIS",
  "PHIL",
  "PHSC",
  "PHYS",
  "POLI",
  "PSYC",
  "RSOC",
  "SCTR",
  "SOCI",
  "SPAN",
  "TESP",
  "THTR",
  "UGST",
  "UNIV",
  "WGST",
];

let totalErrors = 0;

function validateCatalogOutput(catalogFilename) {
  const universityCatalog = JSON.parse(
    fs.readFileSync(catalogFilename, "utf-8").toString()
  );
  for (const school of universityCatalog.schools) {
    if (!school.name) {
      console.error("School name is missing");
      totalErrors++;
    }
    if (!school.description) {
      console.error("School description is missing");
      totalErrors++;
    }
    validateCourseRequirementsExpression(
      school.courseRequirements || school.courseRequirementsExpression
    );
  }
  for (const deptOrProgram of universityCatalog.deptsAndPrograms) {
    if (!deptOrProgram.name) {
      console.error("Department/program name is missing");
      totalErrors++;
    }
    if (!deptOrProgram.description) {
      console.error("Department/program description is missing");
      totalErrors++;
    }
    for (const major of deptOrProgram.majors) {
      validateAcademicProgramDetails(major);
    }
    for (const minor of deptOrProgram.minors) {
      validateAcademicProgramDetails(minor);
    }
    for (const emphasis of deptOrProgram.emphases) {
      validateAcademicProgramDetails(emphasis);
    }
  }
  for (const specialProgram of universityCatalog.specialPrograms) {
    if (!specialProgram.name) {
      console.error("Special program name is missing");
      totalErrors++;
    }
    if (!specialProgram.description) {
      console.error("Special program description is missing");
      totalErrors++;
    }
    validateCourseRequirementsExpression(
      specialProgram.courseRequirements ||
        specialProgram.courseRequirementsExpression
    );
  }
  for (const course of universityCatalog.courses) {
    if (!course.code) {
      console.error("Course code is missing");
      totalErrors++;
    }
    if (!course.name) {
      console.error("Course name is missing");
      totalErrors++;
    }
    if (!course.description) {
      console.error("Course description is missing");
      totalErrors++;
    }
    if (course.numUnits < 0 || course.numUnits > 6) {
      console.error(
        `Course ${course.code} has invalid number of units ${course.numUnits}`
      );
      totalErrors++;
    }
    if (!course.departmentCode) {
      console.error("Course department code is missing");
      totalErrors++;
    } else if (!validDepartmentCodes.includes(course.departmentCode)) {
      console.error(`Invalid course department code ${course.departmentCode}`);
      totalErrors++;
    }
    if (course.prerequisiteCourses) {
      validateCourseRequirementsExpression(course.prerequisitesCourses);
    }
    if (course.corequisiteCourses) {
      validateCourseRequirementsExpression(course.corequisites);
    }
  }
  console.log(`Total errors: ${totalErrors}`);
}

function validateAcademicProgramDetails(programDetails) {
  if (!programDetails.name) {
    console.error("Major/minor name is missing");
    totalErrors++;
  }
  if (!programDetails.description) {
    console.error("Major/minor description is missing");
    totalErrors++;
  }
  if (
    programDetails.departmentCode &&
    !validDepartmentCodes.includes(programDetails.departmentCode)
  ) {
    console.error(`Invalid department code ${programDetails.departmentCode}`);
    totalErrors++;
  }
  validateCourseRequirementsExpression(
    programDetails.courseRequirements ||
      programDetails.courseRequirementsExpression
  );
}

function validateCourseRequirementsExpression(courseRequirements) {
  if (!courseRequirements) {
    return;
  }
  if (!balancedParentheses(courseRequirements)) {
    console.error("Unbalanced parentheses in course requirements expression");
    totalErrors++;
  }
  try {
    courseRequirements = courseRequirements
      .replaceAll("||", "|")
      .replaceAll("&&", "&");
    const test = hasUserFulfilledCourseRequirements("test", courseRequirements);
    if (!test) {
      console.error("Test user should fulfill course requirements");
      totalErrors++;
    }
  } catch (e) {
    totalErrors++;
    console.error(
      `Error parsing course requirements: ${e.message}\nThe original expression: ${courseRequirements}\n\n`
    );
  }
}

function hasUserFulfilledCourseRequirements(
  userId,
  courseRequirementsExpression,
  bounds = {
    auto: true,
    lower: null,
    upper: null,
  },
  deptParams = {
    min_unique_depts: null,
    max_courses_from_one_dept: null,
  }
) {
  let lowerBound;
  let upperBound;
  let departmentDiversityParams = {
    min_unique_depts: null,
    max_courses_from_one_dept: null,
  };
  let coursesFulfilled = new Set();
  let coursesExcluded = new Set();
  let overallExpression = true;
  let operator = null;
  let reachedFirstOperator = false;
  for (let i = 0; i < courseRequirementsExpression.length; i++) {
    if (courseRequirementsExpression[i] === " ") {
      continue;
    }
    let curChar = courseRequirementsExpression[i];
    let token = "";

    while (isDigit(curChar) || curChar === "-" || curChar === "@") {
      if (curChar === "@") {
        departmentDiversityParams = parseDepartmentDiversityParams(
          courseRequirementsExpression,
          i
        );
        i = departmentDiversityParams.end;
      } else {
        token += curChar;
      }
      i++;
      curChar = courseRequirementsExpression[i];
    }

    if (token) {
      if (token.includes("-")) {
        const [lower, upper] = token.split("-");
        lowerBound = parseInt(lower);
        upperBound = parseInt(upper);
      } else {
        lowerBound = parseInt(token);
        upperBound = Infinity;
      }
      if (isNaN(lowerBound) || (isNaN(upperBound) && upperBound !== Infinity)) {
        console.log(token);
        console.log(lowerBound);
        throw new Error(
          `Expression "${courseRequirementsExpression}" has invalid (NaN) bounds`
        );
      }
      i--;
      continue;
    }

    if (
      (lowerBound ||
        upperBound ||
        departmentDiversityParams.min_unique_depts ||
        departmentDiversityParams.max_courses_from_one_dept) &&
      courseRequirementsExpression[i] !== "("
    ) {
      throw new Error(
        `Expression "${courseRequirementsExpression}" has invalid subexpression (does not start with '(')`
      );
    }

    if (courseRequirementsExpression[i] === "(") {
      const endBracket = findEndBracket(courseRequirementsExpression, i);
      if (endBracket === -1) {
        throw new Error(
          `Expression "${courseRequirementsExpression}" has unbalanced parentheses`
        );
      }
      if (operator === "!") {
        const coursesToExclude = parseExclusionExpression(
          courseRequirementsExpression.substring(i + 1, endBracket)
        );
        coursesExcluded = new Set([...coursesExcluded, ...coursesToExclude]);
        i = endBracket;
        operator = null;
        continue;
      }
      const subexpression = hasUserFulfilledCourseRequirements(
        userId,
        courseRequirementsExpression.substring(i + 1, endBracket),
        { auto: !lowerBound, lower: lowerBound, upper: upperBound }
      );
      coursesFulfilled = new Set([
        ...coursesFulfilled,
        ...subexpression.coursesFulfilled,
      ]);
      if (operator === "&") {
        overallExpression = overallExpression && subexpression.fulfilled;
      } else if (operator === "|") {
        overallExpression = overallExpression || subexpression.fulfilled;
      } else {
        if (reachedFirstOperator) {
          throw new Error(
            `Expression "${courseRequirementsExpression}" is missing an operator`
          );
        }
        overallExpression = subexpression.fulfilled;
      }
      i = endBracket;
      lowerBound = null;
      upperBound = null;
      departmentDiversityParams = {
        min_unique_depts: null,
        max_courses_from_one_dept: null,
      };
      operator = null;
      continue;
    }

    while (
      i < courseRequirementsExpression.length &&
      courseRequirementsExpression[i].match(/[0-9A-Z-]/)
    ) {
      token += courseRequirementsExpression[i];
      i++;
    }
    if (
      i < courseRequirementsExpression.length &&
      !courseRequirementsExpression[i].match(/[&|!\s]/)
    ) {
      throw new Error(
        `Expression "${courseRequirementsExpression}" contains an invalid character or operator at position ${i}`
      );
    }

    if (token.includes("-")) {
      const fulfilled = coursesTakenFromRange(userId, token);
      coursesFulfilled = new Set([...coursesFulfilled, ...fulfilled]);
      if (operator === "&") {
        overallExpression = overallExpression && fulfilled.length > 0;
      } else if (operator === "|") {
        overallExpression = overallExpression || fulfilled.length > 0;
      } else {
        overallExpression = fulfilled.length > 0;
      }
      operator = null;
      i--;
      continue;
    } else if (token) {
      const fulfilled = hasUserTakenCourse(userId, token);
      if (fulfilled) {
        coursesFulfilled.add(token);
      }
      if (operator === "&") {
        overallExpression = overallExpression && fulfilled;
      } else if (operator === "|") {
        overallExpression = overallExpression || fulfilled;
      } else if (operator === "!") {
        const coursesToExclude = parseExclusionExpression(token);
        coursesExcluded = new Set([...coursesExcluded, ...coursesToExclude]);
      } else {
        if (reachedFirstOperator) {
          throw new Error(
            `Expression "${courseRequirementsExpression}" is missing an operator`
          );
        }
        overallExpression = fulfilled;
      }
      operator = null;
      i--;
      continue;
    }

    if (
      ((courseRequirementsExpression[i] === "&" ||
        courseRequirementsExpression[i] === "|") &&
        !operator) ||
      (courseRequirementsExpression[i] === "!" && operator !== "!")
    ) {
      reachedFirstOperator = true;
      operator = courseRequirementsExpression[i];
    } else {
      throw new Error(
        `Expression "${courseRequirementsExpression}" has operator after an operator, or has an invalid character`
      );
    }
  }

  filterExcludedCourses(coursesFulfilled, coursesExcluded);

  filterCoursesFromSameDepartment(
    coursesFulfilled,
    deptParams.max_courses_from_one_dept
  );

  while (coursesFulfilled.size > upperBound) {
    coursesFulfilled.delete(coursesFulfilled.values().next().value);
  }

  return {
    fulfilled:
      (bounds.auto
        ? overallExpression
        : coursesFulfilled.size >= bounds.lower) &&
      meetsDepartmentDiversity(coursesFulfilled, deptParams.min_unique_depts),
    coursesFulfilled,
  };
}

function isDigit(char) {
  return char >= "0" && char <= "9";
}

function meetsDepartmentDiversity(coursesFulfilled, minUniqueDepts) {
  if (!minUniqueDepts) {
    return true;
  }
  const departments = new Set();
  for (const course of coursesFulfilled) {
    departments.add(course.substring(0, 4));
  }
  return departments.size >= minUniqueDepts;
}

function parseExclusionExpression(expression) {
  let excludedCourses = new Set();
  const courseStrings = expression.split("|");
  for (const courseString of courseStrings) {
    const course = courseString.trim();
    if (
      !course.match(/^[A-Z]{4}[0-9]{1,3}[A-Z]{0,2}$/) &&
      !course.match(/^[A-Z]{4}[0-9]{1,3}-[0-9]{1,3}$/)
    ) {
      throw new Error(`Invalid course code or range "${course}"`);
    }
    if (course.match(/^[A-Z]{4}[0-9]{1,3}[A-Z]{0,2}$/)) {
      excludedCourses.add(course);
    } else {
      const [, department, start, end] = course.match(
        /^([A-Z]{4})([0-9]{1,3})-([0-9]{1,3})$/
      );
      for (let i = parseInt(start); i <= parseInt(end); i++) {
        excludedCourses.add(department + i);
      }
    }
  }
  return excludedCourses;
}

function filterExcludedCourses(coursesFulfilled, coursesExcluded) {
  for (const course of coursesExcluded) {
    coursesFulfilled.delete(course);
  }
}

function filterCoursesFromSameDepartment(coursesFulfilled, maxCourses) {
  if (!maxCourses) {
    return;
  }
  const departmentCounts = {};
  for (const course of coursesFulfilled) {
    const department = course.substring(0, 4);
    departmentCounts[department] = departmentCounts[department] + 1 || 1;
  }
  for (const course of coursesFulfilled) {
    if (
      course.substring(0, 4) === department &&
      departmentCounts[department] > maxCourses
    ) {
      coursesFulfilled.delete(course);
      departmentCounts[department]--;
    }
  }
}

function parseDepartmentDiversityParams(expression, start) {
  while (
    start < expression.length &&
    expression[start] !== "{" &&
    (expression[start] === " " || expression[start] === "@")
  ) {
    start++;
  }
  if (expression[start] !== "{") {
    throw new Error(
      `Expression "${expression}" has invalid department diversity parameters`
    );
  }
  let end = start;
  while (end < expression.length && expression[end] !== "}") {
    end++;
  }
  if (expression[end] !== "}") {
    throw new Error(
      `Expression "${expression}" has invalid department diversity parameters`
    );
  }
  //   console.log(
  //     surroundPropertiesWithQuotes(expression.substring(start, end + 1)),
  //   );
  const { min_unique_depts, max_courses_from_one_dept } = JSON.parse(
    surroundPropertiesWithQuotes(expression.substring(start, end + 1))
  );
  return { min_unique_depts, max_courses_from_one_dept, end };
}

function surroundPropertiesWithQuotes(expression) {
  return expression.replace(/([a-zA-Z0-9_]+):/g, '"$1":');
}

function findEndBracket(expression, start) {
  let numUnclosed = 0;
  for (let i = start; i < expression.length; i++) {
    if (expression[i] === "(") {
      numUnclosed++;
    } else if (expression[i] === ")") {
      numUnclosed--;
    }
    if (numUnclosed === 0) {
      return i;
    }
  }
  return -1;
}

function hasUserTakenCourse(userId, courseCode) {
  if (!courseCode.match(/^[A-Z]{4}[0-9]{1,3}[A-Z]{0,2}$/)) {
    throw new Error(`Invalid course code "${courseCode}"`);
  }
  if (userId === "test") {
    return true;
  } else {
    return true;
    // TODO: Implement this function
  }
}

function coursesTakenFromRange(userId, courseCodeRange) {
  if (!courseCodeRange.match(/^[A-Z]{4}[0-9]{1,3}-[0-9]{1,3}$/)) {
    throw new Error(`Invalid course code range "${courseCodeRange}"`);
  }
  let [, department, start, end] = courseCodeRange.match(
    /^([A-Z]{4})([0-9]{1,3})-([0-9]{1,3})$/
  );
  if (start[0] === "0" || end[0] === "0") {
    throw new Error(
      `Invalid course code range "${courseCodeRange}", course number cannot start with 0`
    );
  }
  if (userId === "test") {
    return [department + start, department + end];
  } else {
    return [department + start, department + end];
    // TODO: Implement this function
  }
}

function balancedParentheses(expression) {
  let numUnclosed = 0;
  if (!expression) {
    return true;
  }
  for (const char of expression) {
    if (char === "(") {
      numUnclosed++;
    } else if (char === ")") {
      numUnclosed--;
    }
    if (numUnclosed < 0) {
      return false;
    }
  }
  return numUnclosed === 0;
}

validateCatalogOutput("./local_data/full_university_catalog.json");
