// This SQL database schema should go in the prompt for the assistant, once setup

// Basic idea for the assistant
// High level goal: help students navigate course catalog, be an academic advisor as to
// what courses to take, what majors/minors to pursue, etc.
// Help them figure out what requirements they still need to meet.
// Generate long-term course plans for them.
// Tools: 1) Get user context/profile information
// 2) Get algorithmic suggested courses for the user (i.e. courses they have not taken yet)
// 3) Query the SQL database
// 4) (maybe) allow to query aggregate course evaluations database
// If the assistant does not have enough information, it should ask the user for more information

import fs from "fs";
import OpenAI from "openai";
import sqlite from "node:sqlite";
import readline from "node:readline/promises";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { zodFunction } from "openai/helpers/zod.mjs";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { getCourseSequencesGeneral } from "./utils/sequences.js";

const sqliteDB = new sqlite.DatabaseSync("./local_data/university_catalog.db", {
  verbose: console.log,
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const userId = "u#swdean"; // in the future this will be passed in via JWT payload

const ddbClient = new DynamoDBClient({
  region: "us-west-1",
});

const DEPT_MAPPINGS = {
  COEN: "CSEN",
};

async function getUserContext() {
  console.log("Called getUserContext function");
  // get user context information from DynamoDB
  const userInfoQuery = {
    TableName: "SCU-Schedule-Helper",
    Key: {
      pk: { S: userId },
      sk: { S: "info#personal" },
    },
  };

  const userCoursesTakenQuery = {
    TableName: "SCU-Schedule-Helper",
    Key: {
      pk: { S: userId },
      sk: { S: "info#coursesTaken" },
    },
  };

  const userInfoItem = await ddbClient.send(new GetItemCommand(userInfoQuery));
  const userCoursesTakenItem = await ddbClient.send(
    new GetItemCommand(userCoursesTakenQuery)
  );

  const mappedCoursesTaken = userCoursesTakenItem.Item.courses.SS.map(
    (course) => {
      const [_, courseDept, courseCode] = course.match(
        /P{.*}C{([A-Z]{4}) (\d{1,4}[A-Z]{0,2}).*}T{.*}/
      );
      return (DEPT_MAPPINGS[courseDept] || courseDept) + courseCode;
    }
  );

  // TODO: add key points from conversational history to the user context.
  return JSON.stringify({
    userMajors: ["Computer Science"],
    userEmphases: ["Software Engineering"],
    userMinors: [],
    userCoursesTaken: mappedCoursesTaken,
  });
}

function getPotentialCourseSequences(options) {}

function checkIfSatisfiesGraduationRequirements(options) {
  // check if the given course list satisfies the graduation requirements for the given majors, minors, and emphases
  const {
    majors,
    minors,
    emphases,
    courseList,
    includeAlreadyTaken,
    checkGenEdRequirements,
  } = options;
  console.log("Checking graduation requirements for: ", {
    majors,
    minors,
    emphases,
    courseList,
  });
}

function runSQLQuery(query) {
  // run SQL query on the university catalog database
  const sqlQuery = query.query;
  const explanation = query.explanation;
  console.log(`Running SQL query: ${sqlQuery}`);
  console.log(`Explanation: ${explanation}`);
  try {
    const result = sqliteDB.prepare(sqlQuery).all();
    console.log(result.length + " rows returned");
    return JSON.stringify(result);
  } catch (error) {
    console.error(error);
    return "Error occurred: " + error.message;
  }
}

const TOOLS = [
  zodFunction({
    name: "get_user_context",
    parameters: z.object({}),
    function: getUserContext,
    description:
      "Get user context information, such as their major, minors, and courses taken.",
  }),
  zodFunction({
    name: "get_course_sequences",
    parameters: z.object({
      majors: z
        .array(z.string())
        .describe("List of majors to find course ordering for"),
      minors: z
        .array(z.string())
        .describe("List of minors to find course ordering for"),
      emphases: z
        .array(z.string())
        .describe("List of emphases to find course ordering for"),
      courseExpression: z
        .string()
        .describe(
          "(For advanced use) Logical boolean-like expression of required courses and/or course ranges, to find sequences for. For example, if a use asks something like 'If I want to take CSCI 101 and then either CSCI 102 and CSCI 103, what order would I need to take these in?', you could use this expression : 'CS101 & (CS102 | CS103)'"
        ),
    }),
    function: getCourseSequencesGeneral,
    description: `Purpose
        Given one or more academic programs (majors, minors, emphases) and/or an extra course‐requirement expression, produce the complete prerequisite chains for every course you might end up taking.
        For each program in majors/minors/emphases, we look up its course requirements expression.  We then AND‑together all of those expressions plus the optional courseExpression into one combined requirement tree.

        Next, we parse that combined tree and pull out every course code (ignoring negations like !RSOC111 and any course ranges like RSOC100-199).
        For each course found, we get its prerequisites from the database, and recursively expand each of those prereq formulas into a single “chain expression” showing every possible path you might take to get into the course. – Use & to require courses together. – Use | to show alternatives. – Use X -> Y to indicate “you must complete X before Y.”
        Output
        An array of objects, one per course in the combined requirement tree, each of the form:
        {
          course: "<COURSE_CODE>",
          prerequisiteExpression: "<FULL_CHAIN_EXPRESSION>"
        }

        Note that courses that have no prerequisites are not included in the output (likewise for course ranges and courses that are negated in the course requirements expression/tree).

        Why it’s useful
        Unlike a one‐level database lookup, this gives you the entire, recursive sequence of courses (and alternatives) needed to satisfy every prerequisite in a long‑range plan.
         Heres an example input and output:
         Input: {
            majors: ["Economics"],
            minors: [],
            emphases: [],
            courseExpression: "",

         }

         Output: [
                  {
                    "course": "ECON2",
                    "prerequisiteExpression": "ECON1"
                  },
                  {
                    "course": "ECON3",
                    "prerequisiteExpression": "(ECON1 -> ECON2)"
                  },
                  {
                    "course": "MATH11",
                    "prerequisiteExpression": "MATH9"
                  },
                  {
                    "course": "MATH12",
                    "prerequisiteExpression": "(MATH9 -> MATH11)"
                  },
                  {
                    "course": "MATH30",
                    "prerequisiteExpression": "MATH9"
                  },
                  {
                    "course": "MATH31",
                    "prerequisiteExpression": "(MATH9 -> MATH30)"
                  },
                  {
                    "course": "OMIS40",
                    "prerequisiteExpression": "((MATH9 -> MATH11) | (MATH9 -> MATH30)) & (OMIS15 | OMIS17)"
                  },
                  {
                    "course": "AMTH108",
                    "prerequisiteExpression": "((((MATH9 -> MATH11) -> MATH12) -> MATH13) -> MATH14)"
                  },
                  {
                    "course": "ECON41",
                    "prerequisiteExpression": "(ECON1 -> ECON2) & ((MATH9 -> MATH11) | (MATH9 -> MATH30)) & (MATH8 | MATH122 | (((MATH9 -> MATH11) | (MATH9 -> MATH30)) & (OMIS15 | OMIS17) -> OMIS40) | (((((MATH9 -> MATH11) -> MATH12) -> MATH13) -> MATH14) -> AMTH108))"
                  },
                  {
                    "course": "ECON42",
                    "prerequisiteExpression": "(ECON1 -> ECON2) & ((MATH9 -> MATH11) | (MATH9 -> MATH30)) & (MATH8 | MATH122 | (((MATH9 -> MATH11) | (MATH9 -> MATH30)) & (OMIS15 | OMIS17) -> OMIS40) | (((((MATH9 -> MATH11) -> MATH12) -> MATH13) -> MATH14) -> AMTH108))"
                  },
                  {
                    "course": "ECON113",
                    "prerequisiteExpression": "((MATH9 -> MATH11) | (MATH9 -> MATH30))"
                  },
                  {
                    "course": "ECON114",
                    "prerequisiteExpression": "(((MATH9 -> MATH11) | (MATH9 -> MATH30)) -> ECON113) & ((MATH9 -> MATH11) | (MATH9 -> MATH30))"
                  },
                  {
                    "course": "ECON115",
                    "prerequisiteExpression": "((MATH9 -> MATH11) | (MATH9 -> MATH30))"
                  },
                  {
                    "course": "ECON181",
                    "prerequisiteExpression": "(((MATH9 -> MATH11) | (MATH9 -> MATH30)) -> ECON113)"
                  },
                  {
                    "course": "ECON182",
                    "prerequisiteExpression": "(((MATH9 -> MATH11) | (MATH9 -> MATH30)) -> ECON115)"
                  }
                ]
          
          Or as another example, lets say a student just wants to know what classes they should take if they want to take AMTH 108.

          Input: {
            majors: [],
            minors: [],
            emphases: [],
            courseExpression: "AMTH108",
          }

          Output: [
            {
              course: "AMTH108",
              prerequisiteExpression: "((((MATH9 -> MATH11) -> MATH12) -> MATH13) -> MATH14)"
            },
          ]
         `,
  }),
  // zodFunction({
  //   name: "satisfies_graduation_requirements",
  //   parameters: z.object({
  //     majors: z
  //       .array(z.string())
  //       .describe("List of majors to check graduation requirements for"),
  //     minors: z
  //       .array(z.string())
  //       .describe("List of minors to check graduation requirements for"),
  //     emphases: z
  //       .array(z.string())
  //       .describe("List of emphases to check graduation requirements for"),
  //     pathways: z
  //       .array(z.string())
  //       .describe(
  //         "List of pathways to check graduation requirements for (this is technically part of general education requirements, but we keep it separate since it is a little bit different)"
  //       ),
  //     courseList: z
  //       .array(z.string())
  //       .describe(
  //         "List of course codes that the user will take/ has already taken."
  //       ),
  //     includeAlreadyTaken: z
  //       .boolean()
  //       .describe(
  //         "Whether to include courses that the user has already taken in the graduation requirements check. (Functionally, this just means that courseList = Union(courseList, coursesAlreadyTaken)). Should be true in most cases, unless, for example, the user has asked for a course plan for a friend, and they want to see what courses their friend should take."
  //       ),
  //     checkGenEdRequirements: z
  //       .boolean()
  //       .describe(
  //         "Whether to check general education requirements. If true, will check if the course list satisfies all the general education requirements/core requirements."
  //       ),
  //   }),
  //   function: checkIfSatisfiesGraduationRequirements,
  //   description: `Check if the given course list satisfies the graduation requirements for the given majors, minors, and emphases. Returns a list of any requirements that were not satisfied, and any errors that occured.
  //     For example:
  //     {
  //       notSatisfiedRequirements: [
  //         {
  //           type: "major",
  //           name: "Computer Science",
  //           doesNotSatisfy: ["CSCI60 | CSCI62"]
  //         }
  //         {
  //           type: "general_education",
  //           name: "Critical Thinking and Writing 1",
  //           doesNotSatisfy: ["ENGL1A"]
  //         }
  //       ],
  //       errors: []
  //     }`,
  // }),
  zodFunction({
    name: "run_sql_query",
    parameters: z.object({
      explanation: z
        .string()
        .describe(
          "Plain english explanation of the SQL query, that the user can understand. For example: 'Getting all the courses that are offered in the next quarter...'"
        ),
      query: z
        .string()
        .describe(
          `SQL query to run on the university catalog SQLite database, for example: "SELECT * FROM Courses WHERE courseCode = 'CS101'"`
        ),
    }),
    function: runSQLQuery,
    description:
      "Run a SQL query on the university catalog database. Returns the results of the query, or an error message if the query failed.",
  }),
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages = [
  {
    role: "system",
    content: `You are a helpful assistant that helps students at Santa Clara University navigate their course catalog. You can answer questions about courses, majors, minors, and other academic requirements. You can also help students generate long-term course plans and suggest courses they should take next.
          You are encouraged to make SQL queries to the university catalog database to get information about courses, majors, minors, and other academic requirements. You can also call functions to get user context information and suggested course ordering.
          The SQL database schema is as follows:
              Schools
              - name - Name of the school
              - description - Brief overview of the school
              - courseRequirementsExpression - Logical expression of required courses
              - unitRequirements - Number of required units
              - otherRequirements - Any additional academic requirements
              - src - Source of the data

              DeptsAndPrograms
              - name - Department or program name
              - description - Overview of the department or program
              - majors - Comma-separated list of related majors
              - minors - Comma-separated list of related minors
              - emphases - Comma-separated list of emphases under the department/program
              - school - Name of the school the department/program belongs to
              - src - Source of the data

              Majors
              - name - Name of the major
              - description - Description of the major
              - deptCode - Department code offering the major
              - requiresEmphasis - Whether an emphasis is required (1 for yes, 0 for no)
              - courseRequirementsExpression - Logical (similar to boolean) expression of required courses
              - unitRequirements - Number of required units
              - otherRequirements - Any additional academic requirements
              - otherNotes - Miscellaneous notes about the major
              - src - Source of the data

              Minors
              - name - Name of the minor
              - description - Description of the minor
              - deptCode - Department code offering the minor
              - requiresEmphasis - Whether an emphasis is required (1 for yes, 0 for no)
              - courseRequirementsExpression - Logical expression of required courses
              - unitRequirements - Number of required units
              - otherRequirements - Any additional academic requirements
              - otherNotes - Miscellaneous notes about the minor
              - src - Source of the data

              Emphases
              - name - Name of the emphasis
              - description - Description of the emphasis
              - appliesTo - Indicates if the emphasis is for a major, minor, or other. Allows for "Major", "Minor", or "Other"
              - nameOfWhichItAppliesTo - Name of the major/minor it applies to
              - deptCode - Department code offering the emphasis
              - courseRequirementsExpression - Logical expression of required courses
              - unitRequirements - Number of required units
              - otherRequirements - Any additional academic requirements
              - otherNotes - Miscellaneous notes about the emphasis
              - src - Source of the data

              SpecialPrograms
              - name - Name of the special program
              - description - Description of the program
              - courseRequirementsExpression - Logical expression of required courses
              - unitRequirements - Number of required units
              - otherRequirements - Any additional academic requirements
              - src - Source of the data

              Courses
              - courseCode - Unique code identifying the course
              - name - Course name
              - description - Overview of course content
              - numUnits - Number of units the course is worth
              - prerequisiteCourses - List of prerequisite course codes
              - corequisiteCourses - List of corequisite course codes
              - otherRequirements - Additional enrollment requirements
              - otherNotes - Miscellaneous notes about the course
              - offeringSchedule - The generally offering schedule for the course, based on historical data.
              - nextQuarterOfferings - The offerings for the course in the next quarter, including full section names and professors/locations, etc.
              - historicalBestProfessors - Past professors rated highly for the course
              - fulfillsCoreRequirements - Comma-separated list of core curriculum requirements that this class fulfills, note that sometimes the requirements themselves contain commas, so each requirement is put inside quotes
              - src - Source of the data
              
              CoreCurriculumRequirements
              - name - Name of the requirement
              - description - Description of the requirement
              - appliesTo - Indicates who the requirement applies to (usually "All", or "College of Arts and Sciences", "Leavey School of Business", "School of Engineering", or a combination)
              - fulfilledBy - List of course codes that fulfill the requirement, or "N/A" if the requirement is not fulfilled by a course (e.g. just a general requirement)
              - src - Source of the data
              
              CoreCurriculumPathways
              - name - Name of the pathway
              - description - Description of the pathway
              - associatedCourses - List of course codes that can be taken to fulfill the pathway
              - src - Source of the data

              Note that the requirements for the pathways in general are in the CoreCurriculumRequirements table, but the specific courses that can be taken to fulfill the pathway are in the CoreCurriculumPathways table.

              Note that you are encouraged to use lots of SQL queries, and don't be afraid to list lots of rows if you can't seem to find what you're looking for.
              Also, we recommend using Select * because there's a lot of information in the database that you might not be aware of, and it can help you find what you're looking for.
              We recommend using the get_course_sequences function to help plan courses / schedules for the user (especially if there are courses involving recursive prerequisites), and the get_user_context function to get general information on the user--this is almost always helpful just in general to answer most queries).
              Although the SQL database and some of the functions provide information in a very syntactic way, you should try to respond to the user in plain english, assuming they will not understand anything that looks too syntactic. 
              You should also feel free to ask the user clarifying questions if you need more information.
              Note that most students cannot take more than 19 units per quarter, so if you are generating a schedule for them, you should try to keep the number of units per quarter under 19, unless they have explicitly said they are planning on overloading
              We also recommend mixing in some electives or other courses that are not required for their major/minor/emphasis, as students often like to take a variety of courses and not just the ones that are required for their major/minor/emphasis, e.g. core requirements or pathways courses.
              `,
  },
];

async function main() {
  // console based application for user queries
  console.log("Welcome to the Course Assistant!");
  let userQuery = await rl.question("How can I assist you today?\n\n");

  // process user query and call appropriate function using openai API
  while (userQuery !== "exit") {
    messages.push({
      role: "user",
      content: userQuery,
    });
    let response = await openai.beta.chat.completions.parse({
      messages,
      model: "o4-mini",
      reasoning_effort: "high",
      tools: TOOLS,
    });
    // Loop while assistant calls tools
    if (response.choices[0].message.content) {
      console.log(response.choices[0].message.content);
    }
    messages.push(response.choices[0].message);
    while (
      response.choices[0].message.tool_calls &&
      response.choices[0].message.tool_calls.length > 0
    ) {
      for (const toolCall of response.choices[0].message.tool_calls) {
        const tool = TOOLS.find(
          (t) => t.function.name === toolCall.function.name
        );
        if (!tool) {
          console.error(`Tool ${toolCall.function.name} not found`);
          continue;
        }
        const result = await tool.$callback(toolCall.function.parsed_arguments);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });

        response = await openai.beta.chat.completions.parse({
          messages,
          model: "o4-mini",
          reasoning_effort: "medium",
          tools: TOOLS,
        });
        // console.log(response.choices[0].message);
        if (response.choices[0].message.content) {
          console.log(response.choices[0].message.content);
        }
        messages.push(response.choices[0].message);
      }
    }

    userQuery = await rl.question("\n\n");
  }
}

main();
