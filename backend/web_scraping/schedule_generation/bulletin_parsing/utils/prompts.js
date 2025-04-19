export const EXTRACT_SCHOOL_INFO_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each school or college (e.g. College of Arts and Sciences) has its own page.

When you are given a school/college page, please collect any data about the school or college that you can from the page. `;

export const EXTRACT_DEPT_INFO_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each department or program (e.g. Department of Computer Science) has its own page.

The department page or program typically lists the majors, minors, and occasionally emphases within a major. 

When you are given a department or program page, please collect any data about the department or program that you can from the page.`;

export const EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each special program offered by the university (e.g. the LEAD scholars program) has its own page.

When you are given a special program page, please collect any data about the program that you can from the page. 
`;

export const EXTRACT_COURSES_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each set of courses offered by the different university departments (e.g. the courses offered by the computer science department) has its own page.

When you are given a page of courses for a department, please collect any data about the courses that you can from the page. Here's a few things to be aware of:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department). 

The course code should be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

Lower division courses are always numbered 0-99, while upper division courses will always be numbered 100-200.

The page may include course sequences within a singular entry. These should still be listed as separate courses.

If there are prerequisites and/or corequisites, these can be represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. For example, if the course says students are required to take “one of the following courses as a prerequisite: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required as prerequisites, it would be (ANTH111 & ANTH112 & ANTH115). Or if it said one could take either ANTH 110 and 111, or ANTH 112 and 115, this could be (ANTH110 & ANTH111) | (ANTH112 & ANTH115). 

IMPORTANT: the prerequisites and corequisite fields can ONLY contain a valid boolean expression of course codes! If there are other types of requirements, such as a minimum number of units taken prior to taking the course, or a required supplement to the course, those should go in the other requirements section.

If there are any courses that are merely referenced, but not fully described, please do not include these. For example, if page for the computer science department mentions a sociology course as part of the major requirements, do not include it.`;
