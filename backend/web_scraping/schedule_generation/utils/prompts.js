export const EXTRACT_SCHOOL_INFO_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each school or college (e.g. College of Arts and Sciences) has its own page.

When you are given a school/college page, please collect any data about the school or college that you can from the page. Here's a few things to be aware of:

A department code must always be a four-letter, all-caps string, such as CSCI, MATH, or RSOC. It is the string that precedes all course codes within that department. Sometimes, the department code is not explicitly listed on the page. For this reason, here is a list of all department codes and their corresponding subjects:

ACTG -> Accounting
AERO -> Aerospace Studies
AMTH -> Applied Mathematics
ANTH -> Anthropology
ARAB -> Arabic
ARTH -> Art History
ARTS -> Studio Art
ASCI -> Arts and Sciences
BIOE -> Bioengineering
BIOL -> Biology
BUSN -> Business
CENG -> Civil, Envr & Sust Engineering
CHEM -> Chemistry
CHIN -> Chinese
CHST -> Child Studies
CLAS -> Classics
COMM -> Communication
PSSE -> Posse Scholar
CSCI -> Computer Science
CSEN -> Computer Science and Engineering
DANC -> Dance
ECEN -> Electrical and Computer Engineering
ECON -> Economics
ELSJ -> Experiential Learning for Social Justice
ENGL -> English
ENGR -> Engineering
ENVS -> Environ Studies & Sciences
ETHN -> Ethnic Studies
FNCE -> Finance
FREN -> French & Francophone Studies
GERM -> German Studies
HIST -> History
HNRS -> Honors Program
ITAL -> Italian Studies
JAPN -> Japanese Studies
LEAD -> Lead Scholars Program
MATH -> Mathematics
MECH -> Mechanical Engineering
MGMT -> Management
MILS -> Military Science
MKTG -> Marketing
MUSC -> Music
NEUR -> Neuroscience
OMIS -> Information Systems & Analytics
PHIL -> Philosophy
PHSC -> Public Health Science
PHYS -> Physics
POLI -> Political Science
PSYC -> Psychology
RSOC -> Religion & Society
SCTR -> Scripture & Tradition
SOCI -> Sociology
SPAN -> Spanish Studies
TESP -> Theology Ethics & Spirituality
THTR -> Theatre
UGST -> Undergraduate Studies
UNIV -> University Programs
WGST -> Women's and Gender Studies

A course code should always be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

A lower division course always has a number between 1 and 99 (inclusive), while upper division courses always have a number between 100 and 199 (inclusive).

The page might include requirements regarding specific course requirements. These requirements are represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. Each set can be prefixed with a number (the lower bound) or number range (lower bound and upper bound). The lower bound represents the minimum number of courses that must be matched in the set to fulfill the requirement. An upper bound can also be given, which represents the maximum number of courses that can be matched in the set (anything past the bound will not count towards the total number of courses matched in the set). If no bounds are provided, then a lower bound is calculated automatically, and there is no upper bound. When only one number is provided, it is assumed to be the lower bound (and with no upper bound). If a number range is provided, it is assumed to be in the form <lowerBound-upperBound>. 

NEVER INCLUDE ANYTHING in the course requirements expression that is not a formal course code (i.e. department code + course number) or a course range, just list it as an “other” requirement. The course requirements expression MUST contain only sets of course codes, course code ranges, optional lower and upper bounds for each set, and optional department diversity constraints with the @ operator. DO NOT INCLUDE ANY NATURAL LANGUAGE in the expression. 

Here's an example: if the page says students are required to take “one of the following courses: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Or, if it said two of the following courses instead of one, that would be 2(ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required, it would be (ANTH111 & ANTH112 & ANTH115). 

As a more complex example:

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

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements. Here’s another example:


“Critical Thinking & Writing

One two-course sequence in composition: CTW 1 and 2

Advanced Writing

ENGL 181”

Here, the ENGL 181 requirement could be included as the course requirements, but CTW1 and 2 could not, as they are not actual course codes, rather, they would be marked as an “other” requirement.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output.

Thanks for your help!`;

export const EXTRACT_DEPT_INFO_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each department or program (e.g. Department of Computer Science) has its own page.

The department page or program typically lists the majors, minors, and occasionally emphases within a major. 

When you are given a department or program page, please collect any data about the department or program that you can from the page. Here's a few things to be aware of:

A department code must always be a four-letter, all-caps string, such as CSCI, MATH, or RSOC. It is the string that precedes all course codes within that department. Sometimes, the department code is not explicitly listed on the page. For this reason, here is a list of all department codes and their corresponding subjects:

ACTG -> Accounting
AERO -> Aerospace Studies
AMTH -> Applied Mathematics
ANTH -> Anthropology
ARAB -> Arabic
ARTH -> Art History
ARTS -> Studio Art
ASCI -> Arts and Sciences
BIOE -> Bioengineering
BIOL -> Biology
BUSN -> Business
CENG -> Civil, Envr & Sust Engineering
CHEM -> Chemistry
CHIN -> Chinese
CHST -> Child Studies
CLAS -> Classics
COMM -> Communication
PSSE -> Posse Scholar
CSCI -> Computer Science
CSEN -> Computer Science and Engineering
DANC -> Dance
ECEN -> Electrical and Computer Engineering
ECON -> Economics
ELSJ -> Experiential Learning for Social Justice
ENGL -> English
ENGR -> Engineering
ENVS -> Environ Studies & Sciences
ETHN -> Ethnic Studies
FNCE -> Finance
FREN -> French & Francophone Studies
GERM -> German Studies
HIST -> History
HNRS -> Honors Program
ITAL -> Italian Studies
JAPN -> Japanese Studies
LEAD -> Lead Scholars Program
MATH -> Mathematics
MECH -> Mechanical Engineering
MGMT -> Management
MILS -> Military Science
MKTG -> Marketing
MUSC -> Music
NEUR -> Neuroscience
OMIS -> Information Systems & Analytics
PHIL -> Philosophy
PHSC -> Public Health Science
PHYS -> Physics
POLI -> Political Science
PSYC -> Psychology
RSOC -> Religion & Society
SCTR -> Scripture & Tradition
SOCI -> Sociology
SPAN -> Spanish Studies
TESP -> Theology Ethics & Spirituality
THTR -> Theatre
UGST -> Undergraduate Studies
UNIV -> University Programs
WGST -> Women's and Gender Studies

Note that some minors do not have a department, and the department code should be left blank. These types of minors only exist if the page is a non-department page (i.e., the header of the page doesn’t say 'Department of ...'). Instead, these minors come from smaller programs that have one or more directors/advisors, but not an entire department with professors.

A course code should always be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

A lower division (sometimes called lower-level) course always has a number between 1 and 99 (inclusive), while upper division (sometimes called upper-level) courses always have a number between 100 and 199 (inclusive).

The page might include multiple majors/minors and emphases. Please include all of the ones that have detailed descriptions and the requirements. However, DO NOT include one if it is merely being referenced (e.g., mentioned without listing specific requirements). For example, if the page says something like “The departments of neuroscience and chemical engineering offer pre-medicine emphases within their respective majors”, but the page itself is not the department page for either the neuroscience department or the chemical engineering department (i.e. it does not say Department of Neuroscience at the top of the page), then this is merely a reference, and it should not be included unless it actually contains detailed requirements about the emphasis.

In terms of the requirements for majors/minors/emphases, course requirements are represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. Each set can be prefixed with a number (the lower bound) or number range (lower bound and upper bound). The lower bound represents the minimum number of courses that must be matched in the set to fulfill the requirement. An upper bound can also be given, which represents the maximum number of courses that can be matched in the set (anything past the bound will not count towards the total number of courses matched in the set). If no bounds are provided, then a lower bound is calculated automatically, and there is no upper bound. When only one number is provided, it is assumed to be the lower bound (and with no upper bound). If a number range is provided, it is assumed to be in the form <lowerBound-upperBound>. 

NEVER include anything in the course requirements expression that is not a formal course code (i.e. department code + course number) or a course range, just list it as an “other” requirement. The course requirements expression MUST contain only sets of course codes, course code ranges, optional lower and upper bounds for each set, and optional department diversity constraints with the @ operator. DO NOT include any natural language in the expression. 

Heres an example: if the page says students are required to take “one of the following courses: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Or, if it said two of the following courses instead of one, that would be 2(ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required, it would be (ANTH111 & ANTH112 & ANTH115). 

As a more complex example:

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

Here’s one more difficult example: 
“Arabic, Islamic, and Middle Eastern Studies
Director: Farid Senzai, Ph.D.

The interdisciplinary minor in Arabic, Islamic, and Middle Eastern Studies (AIMES) provides an introduction to the people, cultures, politics,  religions and societies of the broader Middle East and North Africa. It will also include examination of peoples from the region living elsewhere and the diverse forms of Islamic practice and local religious customs observed in Muslim societies and throughout the world. This program also encourages the study of diaspora and immigrant communities where Islamic and Middle Eastern populations constitute a religious or ethnic minority.

Students enrolled in this minor have the opportunity to sample a variety of methodologies and academic disciplines—including anthropology, art history, literary criticism, history, political science, and religious studies—that address the Middle East in particular and the Islamic world at large.

The AIMES interdisciplinary minor is ideal for students who want to develop the intellectual resources for thoughtful and informed engagement with current issues in the Middle East and the Islamic world. AIMES is also well suited for students considering work with overseas aid organizations, government and military service, international business, or graduate programs in international studies.

Requirements for the Minor
Students must complete a total of nine courses—six culture courses and three Arabic language courses—for a minor in AIMES. Details concerning these requirements are as follows:

Culture Courses
Students must take a total of six culture courses relating to AIMES (two lower-level and four upper-level) from at least three different departments. No more than two courses may be counted for AIMES credit from the department in which a student majors. A maximum of three courses for AIMES credit may be taken from any one department.
Arabic Language
Three quarters of Arabic are required. Students with prior knowledge of a relevant language may take a test that certifies that they have fulfilled this requirement.

Senior Project
In lieu of one of the six required courses in Middle Eastern and Islamic cultures, students may elect to do an independent study/reading course on a project in consultation with a member of the AIMES Faculty Advisory Council. This project may entail fieldwork with local Muslim and diaspora Arab or Middle Eastern communities in the Bay Area.

Students enrolled in the AIMES minor are strongly encouraged to participate in SCU-approved study abroad programs that pertain to Arabic, Islamic, and Middle Eastern studies. Before enrolling in any such program, students should check with the director and faculty members of the AIMES minor as well as the Global Engagement Office.

Anthropology Courses
ANTH 156. Anthropology of Muslim Peoples and Practices

ANTH 187. Middle East: Gender and Sexuality

ANTH 188. Middle East: Culture and Change

Art History Courses
ARTH 24. From Damascus to Dubai: A Survey of the Visual Culture of the Middle East

ARTH 121. Venice and the Other in the Renaissance

ARTH 164. Islamic Art, 600–1350 CE

Ethnic Studies Courses
ETHN 80. Introduction to the Study of Muslim and Arab Americans in the United States

History Courses
HIST 120. The Crusades: Christian and Muslim Perspectives  

HIST 144S. Islam in Africa

Modern Languages and Literatures Courses
ARAB 1. Elementary Arabic I

ARAB 2. Elementary Arabic II

ARAB 3. Elementary Arabic III

ARAB 21. Intermediate Arabic I

ARAB 22. Intermediate Arabic II

ARAB 23. Intermediate Arabic III

ARAB 50. Intermediate Arabic Conversation

ARAB 137. Arabic Language, Culture and Identity

ARAB 171. Reading the Quran

ARAB 185: Arab American Experience

ARAB 199. Directed Reading

FREN 114. Literatures and Cultures of the Maghreb

FREN 173. Immigration, Race, and Identity in Contemporary France

Political Science Courses
POLI 139. Religion and Politics in the Developing World

POLI 142. Politics in the Middle East

POLI 192. Senior Seminar: Contemporary Politics of the Middle East

POLI 196. Senior Seminar: US Foreign Policy Towards the Middle East

Religious Studies Courses
RSOC 7. South and Southeast Asian Religious Traditions

RSOC 67. Film and Judaism

RSOC 81. Islam

RSOC 126. Sufi Islam and Christian Mysticism

RSOC 174. Jewish Philosophy: Athens and Jerusalem

RSOC 182. Shia Islam in the Contemporary World

RSOC 190. Islam: Reformation and Modernity

SCTR 19. Religions of the Book

SCTR 48.  Racializing Jesus

TESP 88. Hope and Prophetic Politics”

In this example, there is one minor, which is the minor in Arabic, Islamic, and Middle Eastern Studies. 

The course requirements are encoded as follows 
6@{min_unique_depts: 3, max_courses_from_one_dept: 3}(
4(ANTH156 | ANTH187 | ANTH188 | ARTH121 | ARTH164 | HIST120 | HIST144S | ARAB137 | ARAB171 | ARAB185 | ARAB199 | FREN114 | FREN173 | POLI139 | POLI142 | POLI192 | POLI196 | RSOC126 | RSOC174 | RSOC182 | RSOC190) & 
2(ARTH24 | ETHN180 | ARAB1 | ARAB2 | ARAB3 | ARAB21 | ARAB22 | ARAB23 | ARAB50 | RSOC7 | RSOC67 | RSOC81 | SCTR19 | SCTR48 | TESP88)).

In this case, we’re also using the department diversity operator (the @ symbol). The department diversity operator is an optional JSON string that comes after the bounds of the set, and has two (both optional) parameters: min_unique_depts, which is the minimum number of unique departments from which courses must be taken from the set; and max_courses_from_one_dept, which is the maximum number of courses that will count towards the requirement from one department. The requirement “No more than two courses may be counted for AIMES credit from the department in which a student majors” cannot be encoded with the department diversity operator, so it would be listed as an other requirement in this case. The requirement of 3 quarters of Arabic courses also goes under other requirements. The senior project substitution would be marked under other notes (not under other requirements).

A course range can be represented with two course codes separated by a dash. For example, ANTH100-199. The lower and upper bounds on a range are always inclusive, so ANTH100-199 represents all upper division courses. If a requirement said something like “One course from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190” this could be represented as (CSCI183 | CSCI180 | CSCI168 | CSCI100-189). 

Sometimes, courses need to be excluded from a set (i.e. not count towards the lower bound), in this case, we can use the exclusion operator (!) at the end of the set to indicate this. If the previous example had said “Two courses from CSCI 183, 180, 168, or any other additional 4-5 unit upper-division CSCI course below 190, except CSCI 172 and CSCI170, and any course between CSCI 130-135” we could do 2((CSCI183 | CSCI180 | CSCI168 | CSCI100-189) && !(CSCI172 || CSCI170 || CSCI130-135)). Each element in the exclusionary list is separated by a comma. Notice that the lower bound goes on the outer set.

Sometimes, a major might also require an emphasis. In this case, do not include the requirements for the emphasis within the major requirements. Instead, just mark the “requiresEmphasis” field as true, and then declare the requirements in the separate entry for the emphasis.

Sometimes, there are requirements that don’t involve courses, such as attending events or doing community service. For these, you can create an “other requirement” with just a name and a description. These types of requirements should definitely be included too. 

Or, if there are requirements where the course codes cannot be feasibly determined, such as “From among the student’s lower- and upper-division courses (excluding HIST 100 and 101S), at least one course from four of the following six  fields: Global History, the United States and Canada, Latin America,  Europe, East/South Asia, Africa/West Asia,” these should also be listed under other requirements. Another example:


“Critical Thinking & Writing

One two-course sequence in composition: CTW 1 and 2

Advanced Writing

ENGL 181”

Here, the ENGL 181 requirement could be included as the course requirements, but CTW1 and 2 could not, as they are not actual course codes, rather, they would be marked as an “other” requirement.

Sometimes, there are requirements about the number of units a student must take. An example of this would be a requirement like “Students must complete a minimum of 175 quarter units of credit, at least 60 of which must be upper-division.” These types of requirements can be listed under unit requirements.

If you encounter any errors or strange information on the page, you can just describe the error and mark it in the output. Please also note any requirements that are unable to be encoded using the formats described.

Thanks for your help!`;

export const EXTRACT_SPECIAL_PROGRAM_INFO_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each special program offered by the university (e.g. the LEAD scholars program) has its own page.

When you are given a special program page, please collect any data about the program that you can from the page. Here's a few things to be aware of:

A department code must always be a four-letter, all-caps string, such as CSCI, MATH, or RSOC. It is the string that precedes all course codes within that department. Sometimes, the department code is not explicitly listed on the page. For this reason, here is a list of all department codes and their corresponding subjects:

ACTG -> Accounting
AERO -> Aerospace Studies
AMTH -> Applied Mathematics
ANTH -> Anthropology
ARAB -> Arabic
ARTH -> Art History
ARTS -> Studio Art
ASCI -> Arts and Sciences
BIOE -> Bioengineering
BIOL -> Biology
BUSN -> Business
CENG -> Civil, Envr & Sust Engineering
CHEM -> Chemistry
CHIN -> Chinese
CHST -> Child Studies
CLAS -> Classics
COMM -> Communication
PSSE -> Posse Scholar
CSCI -> Computer Science
CSEN -> Computer Science and Engineering
DANC -> Dance
ECEN -> Electrical and Computer Engineering
ECON -> Economics
ELSJ -> Experiential Learning for Social Justice
ENGL -> English
ENGR -> Engineering
ENVS -> Environ Studies & Sciences
ETHN -> Ethnic Studies
FNCE -> Finance
FREN -> French & Francophone Studies
GERM -> German Studies
HIST -> History
HNRS -> Honors Program
ITAL -> Italian Studies
JAPN -> Japanese Studies
LEAD -> Lead Scholars Program
MATH -> Mathematics
MECH -> Mechanical Engineering
MGMT -> Management
MILS -> Military Science
MKTG -> Marketing
MUSC -> Music
NEUR -> Neuroscience
OMIS -> Information Systems & Analytics
PHIL -> Philosophy
PHSC -> Public Health Science
PHYS -> Physics
POLI -> Political Science
PSYC -> Psychology
RSOC -> Religion & Society
SCTR -> Scripture & Tradition
SOCI -> Sociology
SPAN -> Spanish Studies
TESP -> Theology Ethics & Spirituality
THTR -> Theatre
UGST -> Undergraduate Studies
UNIV -> University Programs
WGST -> Women's and Gender Studies

A course code should always be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code. The course code should exactly match what you see on the page.

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

export const EXTRACT_COURSES_PROMPT = `You are a helpful assistant that helps to extract information from a university's bulletin, which is a huge document that they publish each year. The bulletin is formatted as a collection of pages. Each set of courses offered by the different university departments (e.g. the courses offered by the computer science department) has its own page.

When you are given a page of courses for a department, please collect any data about the courses that you can from the page. Here's a few things to be aware of:

A department code must always be a four letter all-caps string like CSCI, MATH, RSOC (it is simply the string that precedes all course codes within that department). Sometimes, the department code is not explicitly listed on the page. For this reason, here is a list of all department codes and their corresponding subjects:

ACTG -> Accounting
AERO -> Aerospace Studies
AMTH -> Applied Mathematics
ANTH -> Anthropology
ARAB -> Arabic
ARTH -> Art History
ARTS -> Studio Art
ASCI -> Arts and Sciences
BIOE -> Bioengineering
BIOL -> Biology
BUSN -> Business
CENG -> Civil, Envr & Sust Engineering
CHEM -> Chemistry
CHIN -> Chinese
CHST -> Child Studies
CLAS -> Classics
COMM -> Communication
PSSE -> Posse Scholar
CSCI -> Computer Science
CSEN -> Computer Science and Engineering
DANC -> Dance
ECEN -> Electrical and Computer Engineering
ECON -> Economics
ELSJ -> Experiential Learning for Social Justice
ENGL -> English
ENGR -> Engineering
ENVS -> Environ Studies & Sciences
ETHN -> Ethnic Studies
FNCE -> Finance
FREN -> French & Francophone Studies
GERM -> German Studies
HIST -> History
HNRS -> Honors Program
ITAL -> Italian Studies
JAPN -> Japanese Studies
LEAD -> Lead Scholars Program
MATH -> Mathematics
MECH -> Mechanical Engineering
MGMT -> Management
MILS -> Military Science
MKTG -> Marketing
MUSC -> Music
NEUR -> Neuroscience
OMIS -> Information Systems & Analytics
PHIL -> Philosophy
PHSC -> Public Health Science
PHYS -> Physics
POLI -> Political Science
PSYC -> Psychology
RSOC -> Religion & Society
SCTR -> Scripture & Tradition
SOCI -> Sociology
SPAN -> Spanish Studies
TESP -> Theology Ethics & Spirituality
THTR -> Theatre
UGST -> Undergraduate Studies
UNIV -> University Programs
WGST -> Women's and Gender Studies

The course code should be a string containing the department code, immediately followed by the course number, for example CSCI183. Don’t include any leading zeros in the course code.

Lower division courses are always numbered 0-99, while upper division courses will always be numbered 100-200.

The page may include course sequences within a singular entry. These should still be listed as separate courses.

If there are prerequisites and/or corequisites, these can be represented through expressions that combine sets of courses and/or course ranges, which are similar to boolean expressions. For example, if the course says students are required to take “one of the following courses as a prerequisite: ANTH 111, 112, 115”, this can be represented by the expression (ANTH111 | ANTH112 | ANTH115). Or, if all of the courses were required as prerequisites, it would be (ANTH111 & ANTH112 & ANTH115). Or if it said one could take either ANTH 110 and 111, or ANTH 112 and 115, this could be (ANTH110 & ANTH111) | (ANTH112 & ANTH115). 

Important: the prerequisites and corequisite fields can only contain a valid boolean expression of course codes! If there are other types of requirements, such as a minimum number of units taken prior to taking the course, or a required supplement to the course, those should go in the other requirements section.
`;
