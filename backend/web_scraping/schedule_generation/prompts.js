export const EXTRACT_SCHOOL_INFO_PROMPT = `Extract any data about the school/college that you can from the page! Just a few notes:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A course code should always be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive).

The page might include requirements regarding specific course requirements. These requirements are represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. Each set can be prefixed with a number (the lower bound) or number range (lower bound and upper bound), which represents the min/max bounds on how many courses must be matched in the set to fulfill the requirement, or if no bounds are provided, one is calculated automatically. For example, if the page says students are required to take “one of the following courses: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Also note in this case the calculated lower bound is 1. Or, if it said two of the following courses instead of one, that would be 2(ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required, it would be (ANTH111 & ANTH112 & ANTH115). An upper bound can also be given, which represents the maximum number of courses that can be matched in the set. If only one number is provided, it is assumed to be the lower bound (and with no upper bound). If a number range is provided, it is assumed to be in the form <lowerBound-upperBound>. As a more complex example:

The requirement: “Six (6) courses from the following lists, but no more than two (2) from List II.

List I—Production Courses:

COMM 103
COMM 130 or 130A (or COMM 130B prior toFall 2022)
COMM 131D (or COMM 132B prior to Fall 2022)
COMM 131E (or COMM 133B prior to Fall 2022)
COMM 131F (or COMM 131B prior to Fall 2022)
COMM 132
COMM 132D
COMM 133
COMM 133W (or 188B prior to Fall 2022)
COMM 134 (or COMM 134B prior to Fall 2022)
COMM 135 (or COMM 135B prior to Fall 2022)
COMM 146
List II—History/Theory Courses:

COMM 104
COMM 136S (or COMM 136A prior to Fall 2022)
COMM 136F
COMM 137 (or COMM 137A prior to Fall 2022)
COMM 137S
COMM 138 (or COMM 138A prior to Fall 2022)
COMM 139 (or Comm 139A prior to Fall 2022)
COMM 140
COMM 140B
COMM 140W
COMM 140C
COMM 140Q
COMM 141
COMM 143 (or Comm prior to Fall 2022)
COMM 145 (or Comm prior to Fall 2022)
COMM 188A if completed before Fall 2022”

Could be described as 
6(COMM103 || 
0-1(COM130 || COM130A || COMM130B) || 
0-1(COMM131D || COMM132B) ||
0-1(COMM131E || COMM133B) || 
0-1(COMM131F || COMM131B) || 
COMM132 || 
COMM132D || 
COMM133 || 
0-1(COMM133W || COM188B) || 
0-1(COMM134 || COMM134B) || 
COMM146 || 
0-2(
COMM104 || 
0-1(COMM136S || COMM136A) || 
COMM136F || 
0-1(COMM137 || COMM137A) || 
COMM137S || 
0-1(COMM138 || COMM138A) || 
0-1(COMM139 || COMM139A) || 
COMM140 || 
COMM140B || 
COMM140W || 
COMM140C || 
COMM140Q || 
COMM141 || 
COMM143 || 
COMM145 || 
COMM188A)
)

A course range can be represented with two course codes separated by a dash. For example, ANTH100-199. The lower and upper bounds on a range are always inclusive, so ANTH100-199 represents all upper division courses. If a requirement said something like “One course from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190” this could be represented as (CSCI183 | CSCI180 | CSCI168 | CSCI100-189). 

Sometimes, courses need to be excluded from a set (i.e. not count towards the lower bound), in this case, we can use an exclusionary list at the end of the set to indicate this. If the previous example had said “Two courses from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190, except CSCI 172 and CSCI170, and any course between CSCI 130-135” we could do 2((CSCI183 | CSCI180 | CSCI168 | CSCI100-189) - (CSCI172, CSCI170, CSCI130-135)). Each element in the exclusionary list is separated by a comma. Notice that the lower bound goes on the outer set.

Furthermore, sets can be combined using the same boolean logic.

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140–149, 173, 186, 189)
Biological Anthropology (ANTH 130–139)
Cultural Anthropology (ANTH 150–179, 184, 185, 187, 188)”

In this example, the requirement can be described as 6((ANTH140-149 | ANTH173 | ANTH186 | ANTH189) & (ANTH130-139) & (ANTH150-179 | ANTH184 | ANTH185 | ANTH187 | ANTH188)). The outer most set requires 6 courses, and at least one of them has to be from ANTH140-149, ANTH173, ANTH186 or ANTH189, and at least one of them must be from ANTH130-139 and at least one of them must be from ANTH150-179, ANTH184, ANTH185, ANTH187, or ANTH188.

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create an “other requirement” with just a name and a description. These types of requirements should definitely be included too. 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_DEPT_INFO_PROMPT = `Extract any data about the department that you can from the page! Just a few notes:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A course code should always be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive).

The page might include multiple majors/minors and emphases. Please include all of the ones that have detailed descriptions and the requirements. Do not include one if it is merely referenced. 

In terms of the requirements for majors/minors/emphases, course requirements are represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. Each set can be prefixed with a number (the lower bound) or number range (lower bound and upper bound), which represents the min/max bounds on how many courses must be matched in the set to fulfill the requirement, or if no bounds are provided, one is calculated automatically. For example, if the page says students are required to take “one of the following courses: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Also note in this case the calculated lower bound is 1. Or, if it said two of the following courses instead of one, that would be 2(ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required, it would be (ANTH111 & ANTH112 & ANTH115). An upper bound can also be given, which represents the maximum number of courses that can be matched in the set. If only one number is provided, it is assumed to be the lower bound (and with no upper bound). If a number range is provided, it is assumed to be in the form <lowerBound-upperBound>. As a more complex example:

The requirement: “Six (6) courses from the following lists, but no more than two (2) from List II.

List I—Production Courses:

COMM 103
COMM 130 or 130A (or COMM 130B prior toFall 2022)
COMM 131D (or COMM 132B prior to Fall 2022)
COMM 131E (or COMM 133B prior to Fall 2022)
COMM 131F (or COMM 131B prior to Fall 2022)
COMM 132
COMM 132D
COMM 133
COMM 133W (or 188B prior to Fall 2022)
COMM 134 (or COMM 134B prior to Fall 2022)
COMM 135 (or COMM 135B prior to Fall 2022)
COMM 146
List II—History/Theory Courses:

COMM 104
COMM 136S (or COMM 136A prior to Fall 2022)
COMM 136F
COMM 137 (or COMM 137A prior to Fall 2022)
COMM 137S
COMM 138 (or COMM 138A prior to Fall 2022)
COMM 139 (or Comm 139A prior to Fall 2022)
COMM 140
COMM 140B
COMM 140W
COMM 140C
COMM 140Q
COMM 141
COMM 143 (or Comm prior to Fall 2022)
COMM 145 (or Comm prior to Fall 2022)
COMM 188A if completed before Fall 2022”

Could be described as 
6(COMM103 || 
0-1(COM130 || COM130A || COMM130B) || 
0-1(COMM131D || COMM132B) ||
0-1(COMM131E || COMM133B) || 
0-1(COMM131F || COMM131B) || 
COMM132 || 
COMM132D || 
COMM133 || 
0-1(COMM133W || COM188B) || 
0-1(COMM134 || COMM134B) || 
COMM146 || 
0-2(
COMM104 || 
0-1(COMM136S || COMM136A) || 
COMM136F || 
0-1(COMM137 || COMM137A) || 
COMM137S || 
0-1(COMM138 || COMM138A) || 
0-1(COMM139 || COMM139A) || 
COMM140 || 
COMM140B || 
COMM140W || 
COMM140C || 
COMM140Q || 
COMM141 || 
COMM143 || 
COMM145 || 
COMM188A)
)


A course range can be represented with two course codes separated by a dash. For example, ANTH100-199. The lower and upper bounds on a range are always inclusive, so ANTH100-199 represents all upper division courses. If a requirement said something like “One course from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190” this could be represented as (CSCI183 | CSCI180 | CSCI168 | CSCI100-189). 

Sometimes, courses need to be excluded from a set (i.e. not count towards the lower bound), in this case, we can use the exclusion operator (!) at the end of the set to indicate this. If the previous example had said “Two courses from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190, except CSCI 172 and CSCI170, and any course between CSCI 130-135” we could do 2((CSCI183 | CSCI180 | CSCI168 | CSCI100-189) && !(CSCI172 || CSCI170 || CSCI130-135)). Each element in the exclusionary list is separated by a comma. Notice that the lower bound goes on the outer set.

Furthermore, sets can be combined using the same boolean logic.

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140–149, 173, 186, 189)
Biological Anthropology (ANTH 130–139)
Cultural Anthropology (ANTH 150–179, 184, 185, 187, 188)”

In this example, the requirement can be described as 6((ANTH140-149 | ANTH173 | ANTH186 | ANTH189) & (ANTH130-139) & (ANTH150-179 | ANTH184 | ANTH185 | ANTH187 | ANTH188)). The outer most set requires 6 courses, and at least one of them has to be from ANTH140-149, ANTH173, ANTH186 or ANTH189, and at least one of them must be from ANTH130-139 and at least one of them must be from ANTH150-179, ANTH184, ANTH185, ANTH187, or ANTH188.

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create an “other requirement” with just a name and a description. These types of requirements should definitely be included too. 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT = `Extract any data about the special program offered by the university that you can from the page! Just a few notes:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A course code should always be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive).

The page may include course requirements for the special program. Course requirements are represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. Each set can be prefixed with a number (the lower bound) or number range (lower bound and upper bound), which represents the min/max bounds on how many courses must be matched in the set to fulfill the requirement, or if no bounds are provided, one is calculated automatically. For example, if the page says students are required to take “one of the following courses: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Also note in this case the calculated lower bound is 1. Or, if it said two of the following courses instead of one, that would be 2(ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required, it would be (ANTH111 & ANTH112 & ANTH115). An upper bound can also be given, which represents the maximum number of courses that can be matched in the set. If only one number is provided, it is assumed to be the lower bound (and with no upper bound). If a number range is provided, it is assumed to be in the form <lowerBound-upperBound>. As a more complex example:

The requirement: “Six (6) courses from the following lists, but no more than two (2) from List II.

List I—Production Courses:

COMM 103
COMM 130 or 130A (or COMM 130B prior toFall 2022)
COMM 131D (or COMM 132B prior to Fall 2022)
COMM 131E (or COMM 133B prior to Fall 2022)
COMM 131F (or COMM 131B prior to Fall 2022)
COMM 132
COMM 132D
COMM 133
COMM 133W (or 188B prior to Fall 2022)
COMM 134 (or COMM 134B prior to Fall 2022)
COMM 135 (or COMM 135B prior to Fall 2022)
COMM 146
List II—History/Theory Courses:

COMM 104
COMM 136S (or COMM 136A prior to Fall 2022)
COMM 136F
COMM 137 (or COMM 137A prior to Fall 2022)
COMM 137S
COMM 138 (or COMM 138A prior to Fall 2022)
COMM 139 (or Comm 139A prior to Fall 2022)
COMM 140
COMM 140B
COMM 140W
COMM 140C
COMM 140Q
COMM 141
COMM 143 (or Comm prior to Fall 2022)
COMM 145 (or Comm prior to Fall 2022)
COMM 188A if completed before Fall 2022”

Could be described as 
6(COMM103 || 
0-1(COM130 || COM130A || COMM130B) || 
0-1(COMM131D || COMM132B) ||
0-1(COMM131E || COMM133B) || 
0-1(COMM131F || COMM131B) || 
COMM132 || 
COMM132D || 
COMM133 || 
0-1(COMM133W || COM188B) || 
0-1(COMM134 || COMM134B) || 
COMM146 || 
0-2(
COMM104 || 
0-1(COMM136S || COMM136A) || 
COMM136F || 
0-1(COMM137 || COMM137A) || 
COMM137S || 
0-1(COMM138 || COMM138A) || 
0-1(COMM139 || COMM139A) || 
COMM140 || 
COMM140B || 
COMM140W || 
COMM140C || 
COMM140Q || 
COMM141 || 
COMM143 || 
COMM145 || 
COMM188A)
)

A course range can be represented with two course codes separated by a dash. For example, ANTH100-199. The lower and upper bounds on a range are always inclusive, so ANTH100-199 represents all upper division courses. If a requirement said something like “One course from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190” this could be represented as (CSCI183 | CSCI180 | CSCI168 | CSCI100-189). 

Sometimes, courses need to be excluded from a set (i.e. not count towards the lower bound), in this case, we can use an exclusionary list at the end of the set to indicate this. If the previous example had said “Two courses from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190, except CSCI 172 and CSCI170, and any course between CSCI 130-135” we could do 2((CSCI183 | CSCI180 | CSCI168 | CSCI100-189) - (CSCI172, CSCI170, CSCI130-135)). Each element in the exclusionary list is separated by a comma. Notice that the lower bound goes on the outer set.

Furthermore, sets can be combined using the same boolean logic.

Here is a more complex example:

“Six upper-division courses selected from the following three categories (all three categories must be represented):
Archaeology (ANTH 140–149, 173, 186, 189)
Biological Anthropology (ANTH 130–139)
Cultural Anthropology (ANTH 150–179, 184, 185, 187, 188)”

In this example, the requirement can be described as 6((ANTH140-149 | ANTH173 | ANTH186 | ANTH189) & (ANTH130-139) & (ANTH150-179 | ANTH184 | ANTH185 | ANTH187 | ANTH188)). The outer most set requires 6 courses, and at least one of them has to be from ANTH140-149, ANTH173, ANTH186 or ANTH189, and at least one of them must be from ANTH130-139 and at least one of them must be from ANTH150-179, ANTH184, ANTH185, ANTH187, or ANTH188.

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create an “other requirement” with just a name and a description. These types of requirements should definitely be included too. 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_COURSES_PROMPT = `Extract all of the courses that you can from the page! Just a few notes:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

The course code should be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

Lower division courses are always numbered 0-99, while upper division courses will always be numbered 100-200.

The page may include course sequences within a singular entry. These should still be listed as separate courses.

If there are prerequisites and/or corequisites, these can be represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. For example, if the course says students are required to take “one of the following courses as a prerequisite: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required as prerequisites, it would be (ANTH111 & ANTH112 & ANTH115). Or if it said one could take either ANTH 110 and 111, or ANTH 112 and 115, this could be (ANTH110 & ANTH111) | (ANTH112 & ANTH115). 

Important: the prerequisites and corequisite fields can only contain a valid boolean expression of course codes! If there are other types of requirements, such as a minimum number of units taken prior to taking the course, or a required supplement to the course, those should go in the other requirements section.
`;
