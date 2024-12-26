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

export const EXTRACT_SECTIONS_PROMPT = `A university publishes pages a bulletin each year, containing all of the courses, majors, minors, and requirements for each major/minor, etc. The bulletin is formatted as a bunch of different pages. Each department (e.g. Department of Computer Science within College of Arts and Sciences) has its own page, and there are also overall pages for each school/college (e.g. School of Business, College of Arts and Sciences). 

The department page typically lists the majors, minors, and occasionally emphases within a major or minor. Each page for each department can be large, and therefore it needs to be broken up into smaller, logical sections. Break it up into two types of sections: sections that are relevant to all students, and the section that is only relevant to a specific major (and related minors/emphases/groups). Usually, the page might start with some preliminary statements that are relevant to all the majors for that department. After that, it will typically contain the majors/minors/emphases for that department, and finally, a list of all the courses offered by the department, broken up by major.

The overall pages for each school/college are always relevant for everyone. They don’t need to be broken up.

To break them up, you can use this schema:
{
sections: 
{
	type: enum [“RelevantToAll”, “RelevantToGroup”]
	sectionBeginsWith: string
	sectionEndsWith: string
	groupName: string
}[]

}, where the sectionBeginsWith is the text beginning of the section—it can be a section header, or a sentence, or really any part of the text that can be used to identify it (but no more than roughly a sentence). If there are newlines in the beginning of the section (and those must be included in order to identify the section), then those should be included as well. sectionEndsWith is the same, but at the end of the section instead of the beginning (and if the section ends at the end of the page, just use an empty string). If the type is RelevantToGroup, then a short groupName should be provided to identify the group that it is relevant to.

For example, if the page looks like this:

begin example\`\`\`\`\`
Department of Mathematics and Computer Science

Professors Emeritus: José Barría, Leonard Klosinski, Edward F. Schaefer

Professors: Frank A. Farris, Tamsen McGinley (Department Chair), Daniel Ostrov, Dennis C. Smolarski, S.J., Venkatesh Srinivasan

Associate Professors: Glenn D. Appleby, Robert A. Bekes, Evan Gawlik, Michael Hartglass, Sara Krehbiel,  Nicolette Meshkat, Nicholas Q. Tran, Byron L. Walden

Assistant Professors: Shamil Asgarli, Tiantian Chen, Smita Ghosh, Shiva Houshmand, Chi-Yun Hsu, Ray Li

Senior Lecturers: Natalie Linnell, Mona Musa, Laurie Poe

Lecturers: Linda Burks, Katelyn Byington, Will Dana, Joshua Grice, Corey Irving, Phillip Jedlovec, Mary Long, Norman Paris, Luvreet Sangha, George Schaeffer


The Department of Mathematics and Computer Science offers major programs leading to the bachelor of science in mathematics or the bachelor of science in computer science, as well as required and elective courses for students majoring in other fields. Either major may be pursued with any of three principal goals: preparation for graduate studies leading to advanced degrees in pure mathematics, applied mathematics, computer science, statistics, operations research, or other fields; preparation for secondary school teaching of mathematics or computer science; or preparation for a research career in business, industry, or government. The major in mathematics may be taken with an emphasis in applied mathematics, data science, financial mathematics, mathematical economics, or mathematics education. The emphasis in mathematics education is designed to prepare majors to take the California Subject Examination for Teachers (CSET). The major in computer science offers emphases specializing in algorithms and complexity, data science, security, software, or one of the student’s choosing. Minors in mathematics or computer science are also available.

The Department of Mathematics and Computer Science maintains a program for the discovery, encouragement, and development of talent in mathematics or computer science among undergraduates. This program includes special sections, seminars, individual conferences, and directed study guided by selected faculty members. Students are also encouraged to participate actively in research projects directed by faculty.


Requirements for the Major

In addition to fulfilling undergraduate Core Curriculum requirements for the bachelor of science degree, students majoring in mathematics or computer science must complete the following departmental requirements for the respective degree:

Major in Mathematics

- CSCI 10 (or demonstrated equivalent proficiency in computer programming)

- MATH 11, 12, 13, 14, 23, 51, 52, and 53

- PHYS 31 and 32. Students with a special interest in the application of mathematics in the social sciences or economics may substitute ECON 170 or 173 for PHYS 32. Students planning to teach in secondary schools may substitute, with approval of the department chair, PHYS 11 and 12 for PHYS 31 and 32.

- Seven approved 5-unit upper-division courses in mathematics (CSCI 162 also permitted), which must include at least one course in analysis (MATH 102, 105, or 153), at least one course in algebra (MATH 103 or 111), and at least one course selected from geometry (MATH 101, 113, or 174), or from discrete mathematics (MATH 176 or 177), or from applied mathematics (MATH 122, 125, 141, 144, 146, 155, or 166).  MATH 100, and courses 190 and above do not count toward the seven courses.


It is not required to select an emphasis for the major in mathematics. Students planning to undertake graduate studies in pure mathematics should plan to take MATH 105, 111, 112, 113, 153, and 154. Students planning to undertake graduate studies in applied mathematics should complete the emphasis in applied mathematics and take MATH 105, 144, 153, 154, and 155. 

Emphasis in Applied Mathematics

Complete the requirements for a bachelor of science in mathematics with the following specifications and additions:

- MATH 102, 122, and 123

- Two courses from MATH 125, 141, 144, 146, 147, 155, 166, 178, or an approved alternative 5-unit upper-division mathematics course

- One course from MATH 166, 147


Emphasis in Data Science

Complete the requirements for a bachelor of science degree in mathematics with the following specifications and additions:

- MATH 122, 123

- CSCI 10, 60, 61, 62, 183

- CSCI 184 or CSEN/COEN 178

- Two courses from CSCI 127, 163; MATH 146, 147, 166; CSEN/COEN 166, 169; ECON 174


Emphasis in Financial Mathematics

Complete the requirements for a bachelor of science degree in mathematics with the following specifications and additions:

- MATH 102, 122, 123, 125

- Either MATH 146 and 147 or MATH 144 and 166

- BUSN 70

- ACTG 11, 12

- FNCE 121, 124


Emphasis in Mathematical Economics

Complete the requirements for a bachelor of science degree in mathematics with the following specifications and additions:

- MATH 102, 122, 123, 146, 147

- ECON 113

- Two courses from MATH 125, MATH 166, ECON 170–174


Emphasis in Mathematics Education

Complete the requirements for a bachelor of science degree in mathematics with the following specifications and additions:

- MATH 101, 102, 122, 123 (or 8), 170, 175 (or 178)

- CHST 191


Students are strongly advised to complete the College’s Urban Education minor. Students will need to learn the definitions, and some examples, of rings and fields for the CSET.

Major in Computer Science 

- MATH 11, 12, 13, 14, 51, 53

- CSCI 10, 60, 61, 62

- One of PHYS 31, CHEM 11, ENVS 21, or ENVS 23

- CSEN/COEN 20 and 20L, CSEN/COEN (or ELEN) 21 and 21L

- MATH 122, CSCI 161, and 163, and CSEN/COEN 177 and 177L

- Five additional 4- or 5-unit upper-division courses in one of the following emphases:


Algorithms and Complexity emphasis:

- CSCI 162, CSCI 164 

- Two more courses from CSCI 146, 147, 165, 181, MATH 101, 175, 176, 177, 178  

- One more course from the list above or any other additional 4-5 unit upper-division CSCI course below 190 or CSEN/COEN course below 188


Data Science emphasis: 

- CSCI 183, 184, 185

- Two more courses from CSCI 127, 146, 147, 164, 166, MATH 123, CSEN/COEN 166, or any other additional 4-5 unit upper-division CSCI course below 190 or CSEN/COEN course below 188


Security emphasis:

- MATH 178, CSCI 180, CSCI 181

- Two more courses from MATH 175, CSEN/COEN 152 and 152L, CSEN/COEN 161 and 161L, CSEN/COEN 146 and 146L, or any other additional 4-5 unit upper-division CSCI course below 190 or CSEN/COEN course below 188


Software emphasis:

- CSCI 169, CSCI 187, CSEN/COEN 146 and 146L

- One more course from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190

- One other course from CSCI 183, 180, 168, CSEN/COEN 161, 178 or any other additional 4-5 unit upper-division CSCI course below 190 or CSEN/COEN course below 188





Individual emphasis of the student’s choosing: 

In order to pursue this emphasis, a student must get their courses approved along with their advisor’s signature at least three quarters before they graduate. Three of the five upper-division courses must be CSCI or MATH. The following are two examples:

- Example: Computer Science and Art emphasis:


- CSCI 168, CSEN/COEN 165/ARTS 173, and ARTS 174 (Note that these ARTS classes have limited availability.)

- Two more courses from CSCI 127, MATH 101, 141, or any other additional 4-5 unit upper-division CSCI course below 190


- Example: Computational Biology emphasis:


- CSCI 127, BIOL 175, BIOL 178

- Two more courses from CSCI 183, 168; Math 141, or any other additional 4-5 unit upper-division CSCI course below 190

- Although CSEN/COEN 178 is recommended, it does not count toward the five courses.


It is highly recommended that students (especially students in the Software emphasis) take additional upper-division courses beyond the minimum required for the degree, such as CSEN/COEN 178.

For the major in either mathematics or computer science, at least four of the required upper-division courses in the major must be taken at Santa Clara. A single upper-division course in the Department of Mathematics and Computer Science may not be used to satisfy requirements for two majors or minors. (Exceptions may be approved by the Chair.)

Students should decide their emphasis by the end of junior year. Only one emphasis is allowed. Data Science may not be used as an emphasis for both majors. 


Requirements for the Minors

Minor in Mathematics

Students must fulfill the following requirements for a minor in mathematics:

- MATH 11, 12, 13, 14, and either 52 or 53

- Three approved 5-unit upper-division mathematics courses. MATH 100, 192, 195, and CSCI 192 do not count toward the minor. (Substitutions may be approved by the Chair.) 


Minor in Computer Science

Students must fulfill the following requirements for a minor in computer science:

- CSCI 10, 60, 61, and 62

- MATH 51

- CSEN/COEN 20 and 20L

- A total of three 4 or 5-unit upper-division courses, as follows: Two upper-division CSCI courses and one upper-division CSCI or CSEN/COEN course. CSCI 192 does not count toward the minor.



Preparation in Mathematics for Admission to Teacher Training Credential Programs

The State of California requires that students seeking a credential to teach mathematics or computer science in California secondary schools must pass the California Subject Examination for Teachers (CSET), a subject area competency examination. The secondary teaching credential additionally requires the completion of an approved credential program, which can be completed as a fifth year of study and student teaching, or through an undergraduate summer program internship. Students who are contemplating secondary school teaching in mathematics or computer science should consult with the coordinator in the Department of Mathematics and Computer Science as early as possible.


Lower-Division Courses: Mathematics

4. The Nature of Mathematics

For students majoring in arts and humanities. Topics chosen from set theory, logic, counting techniques, number systems, graph theory, financial management, voting methods, and other suitable areas. Material will generally be presented in a setting that allows students to participate in the discovery and development of important mathematical ideas. Emphasis on problem solving and doing mathematics. (4 units)


6. Finite Mathematics for Social Science

Introduction to finite mathematics with applications to the social sciences. Sets and set operations, Venn diagrams, trees, permutations, combinations, probability (including conditional probability and Bernoulli processes), discrete random variables, probability distributions, and expected value. (4 units)


8. Introduction to Statistics

Elementary topics in statistics, including descriptive statistics, regression, probability, random variables and distributions, the central limit theorem, confidence intervals and hypothesis testing for one population and for two populations, goodness of fit, and contingency tables. (4 units)

Upper-Division Courses: Mathematics

Note: Although CSCI 10 is not explicitly listed as a formal prerequisite, some upper-division courses suggested for computer science majors may presuppose the ability to write computer programs in some language. A number of upper-division courses do not have specific prerequisites. Students planning to enroll should be aware, however, that all upper-division courses in mathematics require some level of maturity in mathematics. Those without a reasonable background in lower-division courses are advised to check with instructors before enrolling.


100. Writing in the Mathematical Sciences

An introduction to writing and research in mathematics. Techniques in formulating research problems, standard proof methods, and proof writing. Practice in mathematical exposition for a variety of audiences. Strongly recommended for mathematics and computer science majors beginning their upper-division coursework. MATH 100 may not be taken to fulfill any mathematics or computer science upper-division requirements for students majoring or minoring in mathematics or computer science. Offered only on demand. Prerequisites: CTW 1, CTW 2. (5 units)


101. A Survey of Geometry

Topics from advanced Euclidean, projective, and non-Euclidean geometries. Symmetry. Offered in alternate years. Prerequisite: MATH 13. (5 units)


102. Advanced Calculus

Topics to be chosen from the following:  Open and closed subsets of , the definition of limits and continuity for functions on , the least upper bound property on R, the intermediate and extreme value theorems for functions on , the derivative of a function on  in terms of a matrix, the matrix interpretation of the chain rule, Taylor's theorem in multiple variables with applications to critical points, the inverse and implicit function theorems, multiple integrals, line and surface integrals, Green’s theorem,  Stokes’ theorem, the divergence theorem, and differential forms. Prerequisites: MATH 14, 51, and 53. (5 units)

Lower-Division Courses: Computer Science


3. Introduction to Computing and Applications

An overview course providing multiple perspectives on computing. Students will learn the structures of computer programming without writing code, gain high-level understanding of important computing systems such as the Internet and databases, and discuss the impact of technology on society. Offered on demand. (4 units)

60. Introduction to C++ and Object-Oriented Programming

Basic object-oriented programming techniques using C++: abstract data types and objects; encapsulation. The five phases of software development (specification, design, implementation, analysis, and testing). Memory management and pointers. Includes weekly lab. Prerequisite: A grade of C− or better in CSCI 10 or equivalent. (5 units)


61. Data Structures

Specification, implementations, and analysis of basic data structures (stacks, queues, hash tables, binary trees) and their applications in sorting and searching algorithms. Using the Standard Template Library. Runtime Analysis. Prerequisite: A grade of C− or better in CSCI 60 or equivalent. CSCI 61 and CSEN 12 cannot both be taken for credit. (4 units)


62. Advanced Programming 

Advanced object-oriented programming and applications of object-oriented programming and data structures. Topics include GUI design, testing and debugging skills, graphs, file processing, inheritance, polymorphism, and design and implementation of large software projects. Topics will be applied primarily in the context of a social network, developed iteratively throughout the quarter. Software development projects will include topics in data science, security, and algorithms. Prerequisite: A grade of C− or better in CSCI 61, CSEN/COEN 79, or equivalent (4 units)

Upper-Division Courses: Computer Science

Note: Although CSCI 10 is not explicitly listed as a formal prerequisite, some upper-division courses suggested for computer science majors may presuppose the ability to write computer programs in some language. A number of upper-division courses do not have specific prerequisites. Students planning to enroll should be aware, however, that all upper-division courses in computer science require some level of maturity in computer science and mathematics. Those without a reasonable background in lower-division courses are advised to check with instructors before enrolling.


127. Computer Simulation

Techniques for generation of probability distributions. Monte Carlo methods for physical systems. Applications of computer models, for example, queuing, scheduling, simulation of physical or human systems. Offered on demand. Prerequisite: A grade of C− or better in CSCI 10 or equivalent (MATH 122 recommended). (5 units)


146. Optimization I

Methods for finding local maxima and minima of functions of multiple variables in either unconstrained or constrained domains: the Hessian matrix, Newton’s method, Lagrangians, Karush-Kuhn-Tucker conditions. Convex sets, convex functions, and convex programming. Methods for determining functions that optimize an objective like maximizing profit or minimizing task completion time: calculus of variations, optimal control, and both deterministic and stochastic dynamic programming. Also listed as MATH 146. Prerequisites: A grade of C− or better in CSCI 10 (or prior programming experience), a grade of C− or better in MATH 14 and MATH 53. (5 units)
\`\`\`\`\`end example

Then the output should look like this:

begin output json\`\`\`\`\`
{
sections : [
	{

		type: “RelevantToAll”
		sectionBeginsWith: “Department of Mathematics and Computer Science”,
		sectionEndsWith: “In addition to fulfilling undergraduate Core Curriculum requirements for the bachelor of science degree, students majoring in mathematics or computer science must complete the following departmental requirements for the respective degree”,
		groupName: “”,
},
{
	type: “RelevantToGroup”
	sectionBeginsWith: “Major in Mathematics”
	sectionEndsWith: “Students will need to learn the definitions, and some examples, of rings and fields for the CSET”
	groupName: “Mathematics”
},
{
	type: “RelevantToGroup”
	sectionBeginsWith: “Major in Computer Science ”
	sectionEndsWith: “CSCI 192 does not count toward the minor”
	groupName: “Computer Science”
},
{
	type: “RelevantToAll”
	sectionBeginsWith: “Preparation in Mathematics for Admission to Teacher Training Credential Programs”
	sectionEndsWith: “Students who are contemplating secondary school teaching in mathematics or computer science should consult with the coordinator in the Department of Mathematics and Computer Science as early as possible”
		groupName: “”,
},
{
	type: “RelevantToGroup”,
	sectionBeginsWith: “Lower-Division Courses: Mathematics”,
	sectionEndsWith: “Prerequisites: MATH 14, 51, and 53. (5 units)”,
	groupName: “Mathematics”
},
{
	type: “RelevantToGroup”,
	sectionBeginsWith: “Lower-Division Courses: Computer Science”,
sectionEndsWith: “”,
	groupName: “Computer Science”
},
]
}
\`\`\`\`\`end output json

Thanks for doing this!`;

export const EXTRACT_DEPT_INFO_PROMPT = `Extract any data about the department that you can from the page! Just a few notes:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department).

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive). 

The page might include multiple majors/minors and emphases. Please include all of the ones that you see. Also include all requirements on the page: those that apply to majors, minors, emphases, and also general requirements that apply to all students. You can also mark a requirement in the other category, if it doesn’t fit into one of the aforementioned categories.

If a page says you need to take "any other lower division course" from a department, you can just include that as a CourseRange with startCourseCode being the department code followed by 1 and the endCourseCode being the department code followed by 99.

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

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create a separate requirement entry with just a name and a description and the major which it applies to, and leave the required courses field blank. These types of requirements should definitely be included too.

If there is a requirement, but you can’t get the necessary information from the page to figure out which courses are required, you can also leave the required courses field blank in this case. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division” but the page does not include a list of all the undergraduate departments.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_COURSES_PROMPT = `Extract all of the courses that you can from the page! Just a few notes:

The course code should be a string with four uppercase letters, representing the department, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

The page may include course sequences within a singular entry. These should still be listed as separate courses.

Thanks for your help!`;
