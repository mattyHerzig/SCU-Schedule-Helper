export const EXTRACT_DATA_PROMPT = `Extract any data that you can from the page! Some pages will not have any useful data, and that's totally fine. Just a few notes:

For courses: the course code should be a string with four uppercase letters, representing the department, immediately followed by the course number, for example CSCI183. Don't include any leading zeros in the course code. If the page represents a page for a particular department(s), do not include courses from other departments (even if they are referenced on the page). 

Some pages may include course sequences within a singular entry. These should still be listed as separate courses. You may assume that if there is a name and fairly long description of a course on a page, then it is within that department (and should be included).

Some pages might include multiple majors/minors and emphases. Please include all of the ones that you see. Include requirements that apply to majors, minors, emphases, and also general requirements that apply to all students. You can also mark a requirement in the other category, if it doesn't fit into one of the aforementioned categories.

In general, a department must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive). 

If a page says you need to take "any other lower division course" from a department, you can just include that as a CourseRange with startCourseCode being the department code followed by 1 and the endCourseCode being the department code followed by 99.

Furthermore, sometimes the university may require that a student take a number of courses from a pool of given courses. For example “One of the following Methods 1 courses: ANTH 111, 112, 113” is an example of a requirement where at least n=1 course is required from a pool of course codes which is {ANTH111, ANTH112, ANTH113}.

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140-149, 173, 186, 189)
Biological Anthropology (ANTH 130-139)
Cultural Anthropology (ANTH 150-179, 184, 185, 187, 188)”

In this example, the requirement can be described as {
	n: 6
	fromPools: [
[
	{
startCourseCode: “ANTH140”
endCourseCode: “ANTH149”
},
“ANTH173”,
“ANTH186”,
“ANTH189”,
],
[
	{
		startCourseCode: “ANTH130”
		endCourseCode: “ANTH139”
	}
],
[
	{
		startCourseCode: “ANTH150”
		endCourseCode: “ANTH179”
	},
	“ANTH184”,
	“ANTH185”,
	“ANTH187”,
	“ANTH188”,
]

}

Sometimes, there are requirements that don't involve courses, such as attending events or doing community service. For these, you can create a separate requirement entry with just a name and a description and the major which it applies to, and leave the required courses field blank. These types of requirements should definitely be included too.

If there is a requirement, but you can't get the necessary information from the page to figure out which courses are required, you can also leave the required courses field blank in this case. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division” but the page does not include a list of all the undergraduate departments.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_SCHOOL_INFO_PROMPT = `Extract any data about the school/college that you can from the page! Just a few notes:

The page may include detailed information about some courses. IN this case, the course code should be a string with four uppercase letters, representing the department, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

The page may include course sequences within a singular entry. These should still be listed as separate courses. Do not include courses that do not have a detailed description, or are only briefly referenced.

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive).

If a page says you need to take "any lower division course" from a department, you can just include that as a CourseRange with startCourseCode being the department code followed by 1 and the endCourseCode being the department code followed by 99. Or, if they say ANY course can be taken from the department, that would be a range with the startCourseCode being the department code followed by 0, and the endCourseCode being the department code followed by 200.

Furthermore, sometimes the university may require that a student take a number of courses from a pool of given courses. For example “One of the following Methods 1 courses: ANTH 111, 112, 115” is an example of a requirement where at least n=1 course is required from a pool of course codes which is {ANTH111, ANTH112, ANTH115}. There may sometimes be range requirements, where the requirement is something like: “Any three courses between CSCI 10 and 99, excluding 88”, and the requirement can then be described as:
{
startCourseCode: CSCI10,
endCourseCode: CSCI99,
numFromRange: 3,
excludeCourses: [“CSCI88”]
}

Course ranges can only be used for courses in the same department (i.e. you cannot make a range using both CSCI and MATH courses, use a pool instead). 

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140–149, 173, 186, 189)
Biological Anthropology (ANTH 130–139)
Cultural Anthropology (ANTH 150–179, 184, 185, 187, 188)”

In this example, the requirement can be described as {
	n: 6
	fromPools: [
[
	{
startCourseCode: “ANTH140”
endCourseCode: “ANTH149”
},
“ANTH173”,
“ANTH186”,
“ANTH189”,
],
[
	{
		startCourseCode: “ANTH130”
		endCourseCode: “ANTH139”
	}
],
[
	{
		startCourseCode: “ANTH150”
		endCourseCode: “ANTH179”
	},
	“ANTH184”,
	“ANTH185”,
	“ANTH187”,
	“ANTH188”,
]

}

Note from the above example that pools can include ranges. For example, the requirement “Two more courses from CSCI 127, 146, 147, 164, 166, MATH 123, CSEN/COEN 166, or any other additional 4-5 unit upper-division CSCI course below 190 or CSEN/COEN course below 188” would be described as 
{
n: 2,
fromPools: [[
  "CSCI127”,
              “CSCI146”,
              “CSCI147”,
              “CSCI164”,
              “CSCI166”,
              “MATH123”,
              “CSEN166”,
	{
	startCourseCode: CSCI100
	endCourseCode: CSCI189
	excludeCourses: []
},
	{
	startCourseCode: CSCI100
	endCourseCode: CSEN187
	excludeCourses: []
}
]]
}

Note that the start and end course codes are always inclusive. Because the verbage said below CSEN 188, that means the range only goes up to CSEN187 inclusively.

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create an “other requirement” with just a name and a description. These types of requirements should definitely be included too. 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_DEPT_INFO_PROMPT = `Extract any data about the department that you can from the page! Just a few notes:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive).

The page might include multiple majors/minors and emphases. Please include all of the ones that you see. Also include all requirements on the page: those that apply to majors, minors, emphases, and also general requirements that apply to all students. You can also mark a requirement in the other category, if it doesn’t fit into one of the aforementioned categories.

If a page says you need to take "any lower division course" from a department, you can just include that as a CourseRange with startCourseCode being the department code followed by 1 and the endCourseCode being the department code followed by 99. Or, if they say ANY course can be taken from the department, that would be a range with the startCourseCode being the department code followed by 0, and the endCourseCode being the department code followed by 200.

Furthermore, sometimes the university may require that a student take a number of courses from a pool of given courses. For example “One of the following Methods 1 courses: ANTH 111, 112, 115” is an example of a requirement where at least n=1 course is required from a pool of course codes which is {ANTH111, ANTH112, ANTH115}. There may sometimes be range requirements, where the requirement is something like: “Any three courses between CSCI 10 and 99, excluding 88”, and the requirement can then be described as:
{
startCourseCode: CSCI10,
endCourseCode: CSCI99,
numFromRange: 3,
excludeCourses: [“CSCI88”]
}

Course ranges can only be used for courses in the same department (i.e. you cannot make a range using both CSCI and MATH courses, use a pool instead). 

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140–149, 173, 186, 189)
Biological Anthropology (ANTH 130–139)
Cultural Anthropology (ANTH 150–179, 184, 185, 187, 188)”

In this example, the requirement can be described as {
	n: 6
	fromPools: [
[
	{
startCourseCode: “ANTH140”
endCourseCode: “ANTH149”
},
“ANTH173”,
“ANTH186”,
“ANTH189”,
],
[
	{
		startCourseCode: “ANTH130”
		endCourseCode: “ANTH139”
	}
],
[
	{
		startCourseCode: “ANTH150”
		endCourseCode: “ANTH179”
	},
	“ANTH184”,
	“ANTH185”,
	“ANTH187”,
	“ANTH188”,
]

}

Note from the above example that pools can include ranges. For example, the requirement “Two more courses from CSCI 127, 146, 147, 164, 166, MATH 123, CSEN/COEN 166, or any other additional 4-5 unit upper-division CSCI course below 190 or CSEN/COEN course below 188” would be described as 
{
n: 2,
fromPools: [[
  "CSCI127”,
              “CSCI146”,
              “CSCI147”,
              “CSCI164”,
              “CSCI166”,
              “MATH123”,
              “CSEN166”,
	{
	startCourseCode: CSCI100
	endCourseCode: CSCI189
	excludeCourses: []
},
	{
	startCourseCode: CSCI100
	endCourseCode: CSEN187
	excludeCourses: []
}
]]
}

Note that the start and end course codes are always inclusive. Because the verbage said below CSEN 188, that means the range only goes up to CSEN187 inclusively.

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create an “other requirement” with just a name and a description. These types of requirements should definitely be included too. 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT = `Extract any data about the special program offered by the university that you can from the page! Just a few notes:

The page may include detailed information about some courses. In this case, the course code should be a string with four uppercase letters, representing the department, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

The page may include course sequences within a singular entry. These should still be listed as separate courses. Do not include courses that do not have a detailed description, or are only briefly referenced.

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive).

If the page says you need to take "any lower division course" from a department, you can just include that as a CourseRange with startCourseCode being the department code followed by 1 and the endCourseCode being the department code followed by 99. Or, if they say ANY course can be taken from the department, that would be a range with the startCourseCode being the department code followed by 0, and the endCourseCode being the department code followed by 200.

Furthermore, sometimes the university may require that a student take a number of courses from a pool of given courses. For example “One of the following Methods 1 courses: ANTH 111, 112, 115” is an example of a requirement where at least n=1 course is required from a pool of course codes which is {ANTH111, ANTH112, ANTH115}. There may sometimes be range requirements, where the requirement is something like: “Any three courses between CSCI 10 and 99, excluding 88”, and the requirement can then be described as:
{
startCourseCode: CSCI10,
endCourseCode: CSCI99,
numFromRange: 3,
excludeCourses: [“CSCI88”]
}

Course ranges can only be used for courses in the same department (i.e. you cannot make a range using both CSCI and MATH courses, use a pool instead). 

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140–149, 173, 186, 189)
Biological Anthropology (ANTH 130–139)
Cultural Anthropology (ANTH 150–179, 184, 185, 187, 188)”

In this example, the requirement can be described as {
	n: 6
	fromPools: [
[
	{
startCourseCode: “ANTH140”
endCourseCode: “ANTH149”
},
“ANTH173”,
“ANTH186”,
“ANTH189”,
],
[
	{
		startCourseCode: “ANTH130”
		endCourseCode: “ANTH139”
	}
],
[
	{
		startCourseCode: “ANTH150”
		endCourseCode: “ANTH179”
	},
	“ANTH184”,
	“ANTH185”,
	“ANTH187”,
	“ANTH188”,
]

}

Note from the above example that pools can include ranges. For example, the requirement “Two more courses from CSCI 127, 146, 147, 164, 166, MATH 123, CSEN/COEN 166, or any other additional 4-5 unit upper-division CSCI course below 190 or CSEN/COEN course below 188” would be described as 
{
n: 2,
fromPools: [[
  "CSCI127”,
              “CSCI146”,
              “CSCI147”,
              “CSCI164”,
              “CSCI166”,
              “MATH123”,
              “CSEN166”,
	{
	startCourseCode: CSCI100
	endCourseCode: CSCI189
	excludeCourses: []
},
	{
	startCourseCode: CSCI100
	endCourseCode: CSEN187
	excludeCourses: []
}
]]
}

Note that the start and end course codes are always inclusive. Because the verbage said below CSEN 188, that means the range only goes up to CSEN187 inclusively.

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create an “other requirement” with just a name and a description. These types of requirements should definitely be included too. 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_COURSES_PROMPT = `Extract all of the courses that you can from the page! Just a few notes:

The course code should be a string with four uppercase letters, representing the department, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

The page may include course sequences within a singular entry. These should still be listed as separate courses.

Thanks for your help!`;
