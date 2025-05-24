
// // Helper function to parse course requirements expression
// function parseRequirementsExpression(expression: string) {
//   // This is a simplified version - in a real implementation, you would need
//   // a proper parser for the boolean-like expressions
//   const courses = expression.match(/[A-Z]{4}\d{1,4}[A-Z]*/g) || []
//   return [...new Set(courses)] // Remove duplicates
// }

// // Get prerequisites for a course
// async function getPrerequisitesForCourse(courseCode: string) {
//   const result = await runSQLQuery("SELECT prerequisiteCourses FROM Courses WHERE courseCode = ?", [courseCode]) || [] as any[];

//   if (result.length === 0 || !result[0].prerequisiteCourses) {
//     return null
//   }

//   return result[0].prerequisiteCourses
// }

// // Build prerequisite chain for a course
// async function buildPrerequisiteChain(courseCode: string, visited = new Set()) {
//   // Prevent infinite recursion
//   if (visited.has(courseCode)) {
//     return courseCode
//   }

//   visited.add(courseCode)

//   const prerequisites = await getPrerequisitesForCourse(courseCode)
//   if (!prerequisites) {
//     return courseCode
//   }

//   // Parse the prerequisites expression
//   const prereqExpression = prerequisites

//   // Replace course codes with their prerequisite chains
//   let chainExpression = prereqExpression
//   const courseCodes = parseRequirementsExpression(prereqExpression)

//   for (const code of courseCodes) {
//     const chain = await buildPrerequisiteChain(code, new Set([...visited]))
//     // Replace the course code with its chain, but only if it's different
//     if (chain !== code) {
//       chainExpression = chainExpression.replace(new RegExp(`\\b${code}\\b`, "g"), `(${chain} -> ${code})`)
//     }
//   }

//   return chainExpression
// }

// // Main function to get course sequences
// export async function getCourseSequencesGeneral(options: {
//   majors: string[]
//   minors: string[]
//   emphases: string[]
//   courseExpression: string
// }) {
//   const { majors, minors, emphases, courseExpression } = options

//   // Get course requirements for each program
//   const requirements = []

//   // Add major requirements
//   for (const major of majors) {
//     const result = await runSQLQuery("SELECT courseRequirementsExpression FROM Majors WHERE name = ?", [major]) || [] as any[];
//     if (result.length > 0 && result[0].courseRequirementsExpression) {
//       requirements.push(result[0].courseRequirementsExpression)
//     }
//   }

//   // Add minor requirements
//   for (const minor of minors) {
//     const result = await runSQLQuery("SELECT courseRequirementsExpression FROM Minors WHERE name = ?", [minor]) || [] as any[];
//     if (result.length > 0 && result[0].courseRequirementsExpression) {
//       requirements.push(result[0].courseRequirementsExpression)
//     }
//   }

//   // Add emphasis requirements
//   for (const emphasis of emphases) {
//     const result = await runSQLQuery("SELECT courseRequirementsExpression FROM Emphases WHERE name = ?", [emphasis]) || [] as any[];
//     if (result.length > 0 && result[0].courseRequirementsExpression) {
//       requirements.push(result[0].courseRequirementsExpression)
//     }
//   }

//   // Add custom course expression if provided
//   if (courseExpression) {
//     requirements.push(courseExpression)
//   }

//   // Combine all requirements
//   const combinedRequirements = requirements.join(" & ")

//   // Extract all course codes from the combined requirements
//   const courseCodes = parseRequirementsExpression(combinedRequirements)

//   // Build prerequisite chains for each course
//   const sequences = []
//   for (const courseCode of courseCodes) {
//     const chain = await buildPrerequisiteChain(courseCode)
//     if (chain !== courseCode) {
//       sequences.push({
//         course: courseCode,
//         prerequisiteExpression: chain,
//       })
//     }
//   }

//   return sequences
// }
