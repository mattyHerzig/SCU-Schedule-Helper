import catalog from '../../data/full_university_catalog_v2.json';

export function checkPlanMeetsRequirements(args: {
    majors: string[];
    minors: string[];
    emphases: string[];
    checkGenEdRequirements: boolean;
    pathways: string[];
    userCoursesTaken: Set<string>;
    userInfo: {
        majors: string[];
        minors: string[];
        emphases: string[];
    }
}) {
    const {
        majors,
        minors,
        emphases,
        checkGenEdRequirements,
        pathways,
        userCoursesTaken,
    } = args;

    const userSchools = getUserSchools(args.userInfo);
    const errors = [];
    const satisfiedRequirements = [];
    const notSatisfiedRequirements = [];
    const notCheckedRequirements = [];
    try {
        for (const major of majors) {
            const majorData = catalog.deptsAndPrograms.find((m) => m.majors?.some((maj) => maj.name === major))?.majors?.find((maj) => maj.name === major);
            if (!majorData) {
                errors.push(`Major "${major}" not found in catalog.`);
                continue;
            }
            const result = hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                majorData.courseRequirements.tree as TreeNode
            );
            if (!result.fulfilled) {
                notSatisfiedRequirements.push({
                    type: 'major',
                    name: major,
                    doesNotSatisfy: result.partsNotFulfilled || "Unknown",
                });
            }
            else {
                satisfiedRequirements.push({
                    type: 'major',
                    name: major,
                    requirements: treeNodeToString(majorData.courseRequirements.tree as TreeNode),
                    coursesUsed: Array.from(result.coursesUsed),
                });
            }
            if (majorData.courseRequirements.thingsNotEncoded.length > 0)
                notCheckedRequirements.push({
                    type: 'major',
                    name: major,
                    requirements: majorData.courseRequirements.thingsNotEncoded.join("\n"),
                });
        }
        for (const minor of minors) {
            const minorData = catalog.deptsAndPrograms.find((m) => m.minors?.some((min) => min.name === minor))?.minors?.find((min) => min.name === minor);
            if (!minorData) {
                errors.push(`Minor "${minor}" not found in catalog.`);
                continue;
            }
            const result = hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                minorData.courseRequirements.tree as TreeNode
            );
            if (!result.fulfilled) {
                notSatisfiedRequirements.push({
                    type: 'minor',
                    name: minor,
                    doesNotSatisfy: result.partsNotFulfilled || "Unknown",
                });
            }
            else {
                satisfiedRequirements.push({
                    type: 'minor',
                    name: minor,
                    requirements: treeNodeToString(minorData.courseRequirements.tree as TreeNode),
                    coursesUsed: Array.from(result.coursesUsed),
                });
            }
            if (minorData.courseRequirements.thingsNotEncoded.length > 0)
                notCheckedRequirements.push({
                    type: 'minor',
                    name: minor,
                    requirements: minorData.courseRequirements.thingsNotEncoded.join("\n"),
                });
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
            const result = hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                emphasisData.courseRequirements.tree as TreeNode
            );
            if (!result.fulfilled) {
                notSatisfiedRequirements.push({
                    type: 'emphasis',
                    name: emphasis,
                    doesNotSatisfy: result.partsNotFulfilled || "Unknown",
                });
            }
            else {
                satisfiedRequirements.push({
                    type: 'emphasis',
                    name: emphasis,
                    requirements: treeNodeToString(emphasisData.courseRequirements.tree as TreeNode),
                    coursesUsed: Array.from(result.coursesUsed),
                });
            }
            if (emphasisData.courseRequirements.thingsNotEncoded.length > 0)
                notCheckedRequirements.push({
                    type: 'emphasis',
                    name: emphasis,
                    requirements: emphasisData.courseRequirements.thingsNotEncoded.join("\n"),
                });
        }
        if (checkGenEdRequirements) {
            const genEds = catalog.coreCurriculum.requirements;
            for (const genEd of genEds) {
                let applicable = false;
                for (const school of userSchools) {
                    if (genEd.appliesTo && (genEd.appliesTo.toLowerCase().includes(school.toLowerCase())
                        || genEd.appliesTo.toLowerCase().trim() === "all")) {
                        applicable = true;
                        break;
                    }
                }
                if (!applicable) {
                    continue;
                }
                console.log(`Checking Gen Ed: ${genEd.requirementName}`);
                if (!genEd.fulfilledBy || genEd.fulfilledBy.length === 0) {
                    notCheckedRequirements.push({
                        type: 'genEd',
                        name: genEd.requirementName,
                        description: genEd.requirementDescription,
                        appliesTo: genEd.appliesTo,
                    });
                    continue;
                }
                const requirementTree: OrNode = {
                    type: 'or',
                    children: genEd.fulfilledBy.map((req) => {
                        return { type: 'courseCode', courseCode: req };
                    }),
                }
                const result = hasUserFulfilledCourseRequirements(
                    userCoursesTaken,
                    requirementTree
                );
                if (!result.fulfilled) {
                    notSatisfiedRequirements.push({
                        type: 'genEd',
                        name: genEd.requirementName,
                        doesNotSatisfy: result.partsNotFulfilled || "Unknown",
                        description: genEd.requirementDescription,
                        appliesTo: genEd.appliesTo,
                    });
                }
                else {
                    console.log(`Gen Ed "${genEd.requirementName}" fulfilled by courses: ${Array.from(result.coursesUsed).join(", ")}`);
                    satisfiedRequirements.push({
                        type: 'genEd',
                        name: genEd.requirementName,
                        description: genEd.requirementDescription,
                        appliesTo: genEd.appliesTo,
                        requirements: treeNodeToString(requirementTree),
                        coursesUsed: Array.from(result.coursesUsed),
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
            const requirementsExpression: OrNode = {
                type: 'or',
                children: pathwayData.associatedCourses.map((course) => {
                    return { type: 'courseCode', courseCode: course };
                }),
                minTotalCoursesMatched: 4
            };

            const result = hasUserFulfilledCourseRequirements(
                userCoursesTaken,
                requirementsExpression
            );
            if (!result.fulfilled) {
                notSatisfiedRequirements.push({
                    type: 'pathway',
                    name: pathway,
                    doesNotSatisfy: result.partsNotFulfilled || "Unknown",
                });
            }
            else {
                satisfiedRequirements.push({
                    type: 'pathway',
                    name: pathway,
                    description: pathwayData.description,
                    requirements: treeNodeToString(requirementsExpression),
                    coursesUsed: Array.from(result.coursesUsed),
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
        satisfiedRequirements,
        notSatisfiedRequirements,
        notChecked: notCheckedRequirements,
        note: "PLEASE make sure to check the SQL database to verify this data is correct. This is a best effort check and may not be 100% accurate.",
    };
}


type TreeNode =
    | OrNode
    | AndNode
    | CourseCodeNode
    | CourseCodeRangeNode
    | EmptyNode;

type OrNode = {
    type: "or";
    children: TreeNode[];
    minBranchesMatched?: number;
    minTotalCoursesMatched?: number;
};

type AndNode = {
    type: "and";
    children: TreeNode[];
};

type CourseCodeNode = {
    type: "courseCode";
    courseCode: string;
};

type CourseCodeRangeNode = {
    type: "courseCodeRange";
    courseCodeRange: string;
    doNotCount: string[];
    minimumRequired?: number;
};

type EmptyNode = {
    type: "empty";
};

type Result = {
    fulfilled: boolean;
    partsNotFulfilled?: string;
    coursesUsed: Set<string>;
};

function getUserSchools(userInfo: {
    majors: string[];
    minors: string[];
    emphases: string[];
}): string[] {
    const schools = new Set<string>();
    userInfo.majors.forEach((major) => {
        const majorData = catalog.deptsAndPrograms.find((m) => m.majors?.some((maj) => maj.name === major));
        if (majorData) {
            schools.add(majorData.school);
        }
    });
    userInfo.minors.forEach((minor) => {
        const minorData = catalog.deptsAndPrograms.find((m) => m.minors?.some((min) => min.name === minor));
        if (minorData) {
            schools.add(minorData.school);
        }
    });
    userInfo.emphases.forEach((emphasis) => {
        const [, majorName, emphasisName] = emphasis.match(/M{(.*)}E{(.*)}/) || [];
        const emphasisData = catalog.deptsAndPrograms.find((m) => m.emphases?.some((emp) => emp.name === emphasisName && emp.nameOfWhichItAppliesTo === majorName));
        if (emphasisData) {
            schools.add(emphasisData.school);
        }
    });
    return Array.from(schools);
}

function parseCourseCode(courseCode: string) {
    const match = courseCode.match(/^([A-Z]{4})(\d+)([A-Z]*)$/);
    if (!match) throw new Error(`Invalid course code: ${courseCode}`);
    const [, dept, num, suffix] = match;
    return { dept, num: parseInt(num), suffix };
}

function courseInRange(course: string, range: string): boolean {
    const [start, end] = range.split("-");
    const c = parseCourseCode(course);
    const s = parseCourseCode(start);
    const e = { num: parseInt(end) };
    return (
        c.dept === s.dept &&
        c.num >= s.num &&
        c.num <= e.num
    );
}

function hasUserFulfilledCourseRequirements(
    userCoursesTaken: Set<string>,
    courseRequirementsTree: TreeNode
): { fulfilled: boolean; partsNotFulfilled?: string, coursesUsed: Set<string> } {
    function helper(node: TreeNode): Result {
        switch (node.type) {
            case "empty": {
                return {
                    fulfilled: true,
                    coursesUsed: new Set(),
                };
            }
            case "courseCode": {
                const { dept, num, suffix } = parseCourseCode(node.courseCode);
                const transferCredit = suffix === "" ? `${dept}${num}T` : node.courseCode;
                const honorsCourse = suffix === "" ? `${dept}${num}H` : node.courseCode;
                if (userCoursesTaken.has(node.courseCode) || userCoursesTaken.has(honorsCourse) || userCoursesTaken.has(transferCredit)) {
                    return {
                        fulfilled: true,
                        coursesUsed: new Set([node.courseCode]),
                    };
                } else {
                    return {
                        fulfilled: false,
                        partsNotFulfilled: treeNodeToString(node),
                        coursesUsed: new Set(),
                    };

                }
            }

            case "courseCodeRange": {
                const minRequired = node.minimumRequired ?? 1;
                const matched = [...userCoursesTaken].filter(
                    (c) =>
                        courseInRange(c, node.courseCodeRange) &&
                        !node.doNotCount.includes(c)
                );
                const used = matched.slice(0, minRequired);
                if (used.length >= minRequired) {
                    return {
                        fulfilled: true,
                        coursesUsed: new Set(used),
                    };
                } else {
                    return {
                        fulfilled: false,
                        partsNotFulfilled: treeNodeToString(node),
                        coursesUsed: new Set(used),
                    };

                }
            }

            case "and": {
                const allUsed = new Set<string>();
                const partsNotFulfilled: AndNode = {
                    type: "and",
                    children: [],
                }
                for (const child of node.children) {
                    const result = helper(child);
                    if (!result.fulfilled) {
                        partsNotFulfilled.children.push(child);
                        continue;
                    }
                    result.coursesUsed.forEach((c) => allUsed.add(c));
                }
                if (partsNotFulfilled.children.length > 0) {
                    return {
                        fulfilled: false,
                        partsNotFulfilled: treeNodeToString(partsNotFulfilled),
                        coursesUsed: allUsed,
                    };
                }
                return {
                    fulfilled: true,
                    coursesUsed: allUsed,
                };
            }

            case "or": {
                const minBranchesMatched = node.minBranchesMatched ?? 1;
                const minTotalCoursesMatched = node.minTotalCoursesMatched ?? 0;

                let branchesMatched = 0;
                let totalCoursesMatched = 0;
                const usedCourses = new Set<string>();
                const failedCauses: string[] = [];

                for (const child of node.children) {
                    const result = helper(child);
                    if (result.fulfilled) {
                        branchesMatched += 1;
                        result.coursesUsed.forEach((c) => usedCourses.add(c));
                        totalCoursesMatched += result.coursesUsed.size;
                    } else {
                        failedCauses.push(result.partsNotFulfilled || "unknown");
                    }
                }

                if (
                    branchesMatched >= minBranchesMatched &&
                    totalCoursesMatched >= minTotalCoursesMatched
                ) {
                    return {
                        fulfilled: true,
                        coursesUsed: usedCourses,
                    };
                } else {
                    return {
                        fulfilled: false,
                        partsNotFulfilled: treeNodeToString(node),
                        coursesUsed: usedCourses,
                    };
                }
            }

            default:
                return {
                    fulfilled: false,
                    partsNotFulfilled: "Unknown node type",
                    coursesUsed: new Set(),
                };
        }
    }

    const result = helper(courseRequirementsTree);
    return {
        fulfilled: result.fulfilled,
        partsNotFulfilled: result.fulfilled ? undefined : result.partsNotFulfilled,
        coursesUsed: result.coursesUsed,
    };
}

function treeNodeToString(node: TreeNode): string {
    switch (node.type) {
        case "courseCode":
            return node.courseCode;

        case "courseCodeRange":
            const min = node.minimumRequired ?? 1;
            const exclusions = node.doNotCount.length > 0
                ? ` excluding [${node.doNotCount.join(", ")}]`
                : "";
            return `${node.courseCodeRange} (min ${min}${exclusions})`;

        case "and":
            return `(${node.children.map(treeNodeToString).join(" AND ")})`;

        case "or":
            const branches = node.children.map(treeNodeToString).join(" OR ");
            const branchReq = node.minBranchesMatched ?? 1;
            const courseReq = node.minTotalCoursesMatched ?? 0;
            return `(${branches}) [minBranchesMatched: ${branchReq}, minTotalCoursesMatched: ${courseReq}]`;

        default:
            return "[Unknown Node]";
    }
}
