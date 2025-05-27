import catalog from '../../data/full_university_catalog_v2.json';

export function checkPlanMeetsRequirements(args: {
    majors: string[];
    minors: string[];
    emphases: string[];
    checkGenEdRequirements: boolean;
    pathways: string[];
    userCoursesTaken: Set<string>;
}) {
    const {
        majors,
        minors,
        emphases,
        checkGenEdRequirements,
        pathways,
        userCoursesTaken,
    } = args;

    const errors = [];
    const notSatisfiedRequirements = [];
    const notCheckedRequirements = [];
    try {
        for (const major of majors) {
            const majorData = catalog.deptsAndPrograms.find((m) => m.majors?.some((maj) => maj.name === major))?.majors?.find((maj) => maj.name === major);
            if (!majorData) {
                errors.push(`Major "${major}" not found in catalog.`);
                continue;
            }
            if (!hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                majorData.courseRequirementsExpression
            )) {
                notSatisfiedRequirements.push({
                    type: 'major',
                    name: major,
                    requirements: majorData.courseRequirementsExpression,
                });
            }
        }
        for (const minor of minors) {
            const minorData = catalog.deptsAndPrograms.find((m) => m.minors?.some((min) => min.name === minor))?.minors?.find((min) => min.name === minor);
            if (!minorData) {
                errors.push(`Minor "${minor}" not found in catalog.`);
                continue;
            }
            if (!hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                minorData.courseRequirementsExpression
            )) {
                notSatisfiedRequirements.push({
                    type: 'minor',
                    name: minor,
                    requirements: minorData.courseRequirementsExpression,
                });
            }
        }
        for (const emphasis of emphases) {
            const [, majorName, emphasisName] = emphasis.match(/M{(.*)}E{(.*)}/) || [];
            if (!majorName || !emphasisName) {
                errors.push(`Invalid emphasis format "${emphasis}". Expected format: M{majorName}E{emphasisName}`);
                continue;
            }
            const emphasisData = catalog.deptsAndPrograms.find((m) => m.emphases?.some((emp) => emp.name === emphasisName && emp.nameOfWhichItAppliesTo === majorName))?.emphases?.find((emp) => emp.name === emphasisName && emp.nameOfWhichItAppliesTo === majorName);
            if (!emphasisData) {
                errors.push(`Emphasis "${emphasis}" not found in catalog.`);
                continue;
            }
            if (!hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                emphasisData.courseRequirementsExpression
            )) {
                notSatisfiedRequirements.push({
                    type: 'emphasis',
                    name: emphasis,
                    requirements: emphasisData.courseRequirementsExpression,
                });
            }
        }
        if (checkGenEdRequirements) {
            const genEds = catalog.coreCurriculum.requirements;
            for (const genEd of genEds) {
                if (!genEd.fulfilledBy || genEd.fulfilledBy.length === 0) {
                    notCheckedRequirements.push({
                        type: 'genEd',
                        name: genEd.requirementName,
                        description: genEd.requirementDescription,
                        appliesTo: genEd.appliesTo,
                    });
                    continue;
                }
                const requirementExpression = genEd.fulfilledBy.join(" | ");
                if (!hasUserFulfilledCourseRequirements(
                    userCoursesTaken,
                    requirementExpression,
                )) {
                    notSatisfiedRequirements.push({
                        type: 'genEd',
                        name: genEd.requirementName,
                        requirements: requirementExpression,
                    });
                }
            }
        }
        for (const pathway of pathways) {
            const pathwayData = catalog.coreCurriculum.pathways.find((p) => p.name === pathway);
            if (!pathwayData) {
                errors.push(`Pathway "${pathway}" not found in catalog.`);
                continue;
            }
            if (!pathwayData.associatedCourses || pathwayData.associatedCourses.length === 0) {
                notCheckedRequirements.push({
                    type: 'pathway',
                    name: pathway,
                    description: pathwayData.description,
                });
                continue;
            }
            const requirementsExpression = pathwayData.associatedCourses.join(" | ");
            if (!hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                requirementsExpression,
                { auto: false, lower: 4, upper: 4 },
                { min_unique_depts: null, max_courses_from_one_dept: null }
            )) {
                notSatisfiedRequirements.push({
                    type: 'pathway',
                    name: pathway,
                    requirements: requirementsExpression,
                });
            }
        }
    } catch (error) {
        if (error instanceof Error) errors.push(`Error processing requirements: ${error.message}`);
        else errors.push(`Error processing requirements: ${error}`);
    }
    console.log(JSON.stringify({
        errors,
        notSatisfiedRequirements,
        notCheckedRequirements,
        userCoursesTaken: Array.from(userCoursesTaken),
        majors,
        minors,
        emphases,
        pathways,
        checkGenEdRequirements,
    }, null, 2));

    return {
        errors,
        doesNotSatisfy: notSatisfiedRequirements,
        notChecked: notCheckedRequirements,
    };
}

function hasUserFulfilledCourseRequirements(
    userCoursesTaken: Set<string>,
    courseRequirementsExpression: string,
    bounds: { auto: boolean; lower: number | null; upper: number | null } = {
        auto: true,
        lower: null,
        upper: null,
    },
    deptParams: { min_unique_depts: number | null; max_courses_from_one_dept: number | null } = {
        min_unique_depts: null,
        max_courses_from_one_dept: null,
    }
): { fulfilled: boolean; coursesFulfilled: Set<string> } {
    console.log("Checking course requirements expression:", courseRequirementsExpression);
    let lowerBound: number | null = null;
    let upperBound: number | null = null;
    let departmentDiversityParams: { min_unique_depts: number | null; max_courses_from_one_dept: number | null; end?: number } = {
        min_unique_depts: null,
        max_courses_from_one_dept: null,
    };
    let coursesFulfilled: Set<string> = new Set();
    let coursesExcluded: Set<string> = new Set();
    let overallExpression: boolean = true;
    let operator: string | null = null;
    let reachedFirstOperator: boolean = false;
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
                i = departmentDiversityParams.end ?? i; // fallback to current i if end is undefined
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
            ((lowerBound !== null && lowerBound !== undefined) ||
                (upperBound !== null && upperBound !== undefined) ||
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
                userCoursesTaken,
                courseRequirementsExpression.substring(i + 1, endBracket),
                { auto: !(lowerBound ?? null), lower: lowerBound ?? null, upper: upperBound ?? null }
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
            const fulfilled = coursesTakenFromRange(userCoursesTaken, token);
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
            const fulfilled = hasUserTakenCourse(userCoursesTaken, token);
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

    if (upperBound !== null && upperBound !== undefined && upperBound !== Infinity) {
        while (coursesFulfilled.size > upperBound) {
            const nextVal = coursesFulfilled.values().next().value;
            if (typeof nextVal === 'string') {
                coursesFulfilled.delete(nextVal);
            } else {
                break;
            }
        }
    }

    return {
        fulfilled:
            (bounds.auto
                ? overallExpression
                : coursesFulfilled.size >= (bounds.lower ?? 0)) &&
            meetsDepartmentDiversity(coursesFulfilled, deptParams.min_unique_depts),
        coursesFulfilled,
    };
}

function isDigit(char: string): boolean {
    return char >= "0" && char <= "9";
}

function meetsDepartmentDiversity(coursesFulfilled: Set<string>, minUniqueDepts: number | null): boolean {
    if (!minUniqueDepts) {
        return true;
    }
    const departments = new Set<string>();
    for (const course of coursesFulfilled) {
        departments.add(course.substring(0, 4));
    }
    return departments.size >= minUniqueDepts;
}

function parseExclusionExpression(expression: string): Set<string> {
    let excludedCourses: Set<string> = new Set();
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
            ) as any;
            for (let i = parseInt(start); i <= parseInt(end); i++) {
                excludedCourses.add(department + i);
            }
        }
    }
    return excludedCourses;
}

function filterExcludedCourses(coursesFulfilled: Set<string>, coursesExcluded: Set<string>): void {
    for (const course of coursesExcluded) {
        coursesFulfilled.delete(course);
    }
}

function filterCoursesFromSameDepartment(coursesFulfilled: Set<string>, maxCourses: number | null): void {
    if (!maxCourses) {
        return;
    }
    const departmentCounts: { [department: string]: number } = {};
    for (const course of coursesFulfilled) {
        const department = course.substring(0, 4);
        departmentCounts[department] = departmentCounts[department] + 1 || 1;
    }
    for (const course of coursesFulfilled) {
        const department = course.substring(0, 4);
        if (
            departmentCounts[department] > maxCourses
        ) {
            coursesFulfilled.delete(course);
            departmentCounts[department]--;
        }
    }
}

function parseDepartmentDiversityParams(expression: string, start: number): { min_unique_depts: number | null; max_courses_from_one_dept: number | null; end: number } {
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
    const { min_unique_depts, max_courses_from_one_dept } = JSON.parse(
        surroundPropertiesWithQuotes(expression.substring(start, end + 1))
    );
    return { min_unique_depts, max_courses_from_one_dept, end };
}

function surroundPropertiesWithQuotes(expression: string): string {
    return expression.replace(/([a-zA-Z0-9_]+):/g, '"$1":');
}

function findEndBracket(expression: string, start: number): number {
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

function hasUserTakenCourse(userCoursesTaken: Set<string>, courseCode: string): boolean {
    if (!courseCode.match(/^[A-Z]{4}[0-9]{1,3}[A-Z]{0,2}$/)) {
        throw new Error(`Invalid course code "${courseCode}"`);
    }
    return userCoursesTaken.has(courseCode);
}

function coursesTakenFromRange(userCoursesTaken: Set<string>, courseCodeRange: string): string[] {
    if (!courseCodeRange.match(/^[A-Z]{4}[0-9]{1,3}[A-Z]{0,2}-[0-9]{1,3}[A-Z]{0,2}$/)) {
        throw new Error(`Invalid course code range "${courseCodeRange}"`);
    }
    let [, department, start, end] = courseCodeRange.match(
        /^([A-Z]{4})([0-9]{1,3}[A-Z]{0,2})-([0-9]{1,3}[A-Z]{0,2})$/
    ) as any;
    if (start[0] === "0" || end[0] === "0") {
        throw new Error(
            `Invalid course code range "${courseCodeRange}", course number cannot start with 0`
        );
    }
    const startNum = parseInt(start.replace(/[A-Z]/g, ""));
    const startLetter = start.replace(/[0-9]/g, "");
    const endNum = parseInt(end.replace(/[A-Z]/g, ""));
    const endLetter = end.replace(/[0-9]/g, "");
    if (startLetter !== endLetter) {
        throw new Error(
            `Invalid course code range "${courseCodeRange}", start and end letters must match`
        );
    }
    if (startNum > endNum) {
        throw new Error(
            `Invalid course code range "${courseCodeRange}", start number cannot be greater than end number`
        );
    }
    const coursesTaken: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
        const courseCode = department + i + startLetter;
        if (userCoursesTaken.has(courseCode)) {
            coursesTaken.push(courseCode);
        }
    }
    return coursesTaken;
}