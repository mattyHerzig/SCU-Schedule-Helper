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
            notCheckedRequirements.push({
                type: 'emphasis',
                name: emphasis,
                requirements: emphasisData.courseRequirements.thingsNotEncoded.join("\n"),
            });
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
        notSatisfiedRequirements,
        notChecked: notCheckedRequirements,
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
    const e = parseCourseCode(end);
    return (
        c.dept === s.dept &&
        c.dept === e.dept &&
        c.num >= s.num &&
        c.num <= e.num
    );
}

function hasUserFulfilledCourseRequirements(
    userCoursesTaken: Set<string>,
    courseRequirementsTree: TreeNode
): { fulfilled: boolean; partsNotFulfilled?: string } {
    function helper(node: TreeNode): Result {
        switch (node.type) {
            case "empty": {
                return {
                    fulfilled: true,
                    coursesUsed: new Set(),
                };
            }
            case "courseCode": {
                if (userCoursesTaken.has(node.courseCode)) {
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
                for (const child of node.children) {
                    const result = helper(child);
                    if (!result.fulfilled) {
                        return {
                            fulfilled: false,
                            partsNotFulfilled: treeNodeToString(child),
                            coursesUsed: new Set(),
                        };
                    }
                    result.coursesUsed.forEach((c) => allUsed.add(c));
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
