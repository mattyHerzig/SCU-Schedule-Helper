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
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { zodFunction } from "openai/helpers/zod.mjs";

const sqliteDB = new sqlite.DatabaseSync("./local_data/university_catalog.db", {
  verbose: console.log,
});
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const userId = "swdean"; // in the future this will be passed in via JWT payload

function getUserContext() {}

function getSuggestedCourseOrdering() {}

function runSQLQuery(query) {}

const TOOLS = [
  zodFunction({
    name: "get_user_context",
    // no parameters needed
    parameters: z.null(),
    function: getUserContext,
    description:
      "Get user context information, such as their major, minors, and courses taken.",
  }),
  zodFunction({
    name: "get_suggested_course_ordering",
    // no parameters needed
    parameters: z.null(),
    function: getSuggestedCourseOrdering,
    description:
      "Get suggested course ordering, based on what the user has taken and what they need to take. Returns a string with the suggested course ordering.",
  }),
  zodFunction({
    name: "run_sql_query",
    parameters: z.object({
      query: z
        .string()
        .describe(
          `SQL query to run on the university catalog SQLite database, for example: "SELECT * FROM courses WHERE courseCode = 'CS101'"`
        ),
    }),
    function: runSQLQuery,
    description:
      "Run a SQL query on the university catalog database. Returns the results of the query, or an error message if the query failed.",
  }),
];

async function main() {
  // console based application for user queries
  console.log("Welcome to the Course Assistant!");
  const userQuery = prompt("How can I assist you today? ");
  // process user query and call appropriate function using openai API
  const response = await openai.beta.chat.completions.parse({
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that helps students navigate their course catalog. You can answer questions about courses, majors, minors, and other academic requirements. You can also help students generate long-term course plans and suggest courses they should take next.
            You are encouraged to make SQL queries to the university catalog database to get information about courses, majors, minors, and other academic requirements. You can also call functions to get user context information and suggested course ordering.
            The SQL database schema is as follows:
                schools
                - name - Name of the school
                - description - Brief overview of the school
                - courseRequirementsExpression - Logical expression of required courses
                - unitRequirements - Number of required units
                - otherRequirements - Any additional academic requirements

                deptsAndPrograms
                - name - Department or program name
                - description - Overview of the department or program
                - majors - Comma-separated list of related majors
                - minors - Comma-separated list of related minors
                - emphases - Comma-separated list of emphases under the department/program

                majors
                - name - Name of the major
                - description - Description of the major
                - deptCode - Department code offering the major
                - requiresEmphasis - Whether an emphasis is required (1 for yes, 0 for no)
                - courseRequirementsExpression - Logical (similar to boolean) expression of required courses
                - unitRequirements - Number of required units
                - otherRequirements - Any additional academic requirements
                - otherNotes - Miscellaneous notes about the major

                minors
                - name - Name of the minor
                - description - Description of the minor
                - deptCode - Department code offering the minor
                - requiresEmphasis - Whether an emphasis is required (1 for yes, 0 for no)
                - courseRequirementsExpression - Logical expression of required courses
                - unitRequirements - Number of required units
                - otherRequirements - Any additional academic requirements
                - otherNotes - Miscellaneous notes about the minor

                emphases
                - name - Name of the emphasis
                - description - Description of the emphasis
                - appliesTo - Indicates if the emphasis is for a major or minor
                - nameOfWhichItAppliesTo - Name of the major/minor it applies to
                - deptCode - Department code offering the emphasis
                - courseRequirementsExpression - Logical expression of required courses
                - unitRequirements - Number of required units
                - otherRequirements - Any additional academic requirements
                - otherNotes - Miscellaneous notes about the emphasis

                specialPrograms
                - name - Name of the special program
                - description - Description of the program
                - courseRequirementsExpression - Logical expression of required courses
                - unitRequirements - Number of required units
                - otherRequirements - Any additional academic requirements

                courses
                - courseCode - Unique code identifying the course
                - name - Course name
                - description - Overview of course content
                - numUnits - Number of units the course is worth
                - prerequisiteCourses - List of prerequisite course codes
                - corequisiteCourses - List of corequisite course codes
                - otherRequirements - Additional enrollment requirements
                - otherNotes - Miscellaneous notes about the course
                - offeringSchedule - Standard schedule of when the course is offered
                - otherOfferingSchedule - Alternate or special schedules
                - historicalBestProfessors - Past professors rated highly
                - historicalOfferingSeasons - Seasons in which the course was historically offered
            `,
      },
      {
        role: "user",
        content: userQuery,
      },
    ],
    model: "o4-mini",
    reasoning_effort: "high",
    functions: TOOLS,
    function_call: "auto",
  });
  
}
