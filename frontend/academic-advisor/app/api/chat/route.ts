import { type NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"
import { v4 as uuidv4 } from 'uuid';
import { Pool } from "pg"
import { z } from "zod"
import { zodFunction } from "openai/helpers/zod.mjs"
import OpenAI from "openai"
import jwt from "jsonwebtoken"
import { getCourseSequencesGeneral } from "@/app/utils/sequences"
import { checkPlanMeetsRequirements } from "@/app/utils/grad-validation";

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AMZ_DDB_REGION || "us-west-1",
  credentials: {
    accessKeyId: process.env.AMZ_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AMZ_SECRET_ACCESS_KEY || "",
  }
})

let singletonController: ReadableStreamDefaultController | null = null
let singletonUserId: string | null = null
let singletonDDBMessages: any[] = []

// Initialize PostgreSQL connection pool
let pgPool: Pool | null = null;

async function initializeDatabase() {
  if (!pgPool) {
    try {
      pgPool = new Pool({
        connectionString: process.env.PG_CONNECTION_STRING,
      });
    } catch (error) {
      console.error("Error initializing PostgreSQL database pool:", error);
      throw error;
    }
  }
  return pgPool;
}
// Department mappings
const DEPT_MAPPINGS: Record<string, string> = {
  COEN: "CSEN",
}

// Helper function to get user ID from request
function getUserIdFromRequest(request: NextRequest): string | null {
  // Get access token from cookies
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return null

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || "default_secret") as jwt.JwtPayload
    if (decoded.type !== "access") return null
    return decoded.sub as string
  } catch (error) {
    console.error("Error decoding access token:", error)
    return null
  }
}

// Helper function to get user context information
async function getUserContextTool(args: { explanation: string }) {
  console.log("Called getUserContext function for user:", singletonUserId)
  singletonDDBMessages.push({
    id: uuidv4(),
    role: "tool",
    content: args.explanation,
  });

  if (singletonController) {
    singletonController.enqueue("event: statusUpdate\n");
    singletonController.enqueue(`data: ${args.explanation}\n\n`);
  }

  return await getUserContext()
}

async function getUserContext() {
  try {
    // Get user personal info
    const userInfoQuery = {
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${singletonUserId}` },
        sk: { S: "info#academicPrograms" },
      },
    }

    // Get user courses taken
    const userCoursesTakenQuery = {
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${singletonUserId}` },
        sk: { S: "info#coursesTaken" },
      },
    }

    const [userInfoResponse, userCoursesTakenResponse] = await Promise.all([
      ddbClient.send(new GetItemCommand(userInfoQuery)),
      ddbClient.send(new GetItemCommand(userCoursesTakenQuery)),
    ])

    // Extract majors, emphases, and minors from user info
    const userMajors = userInfoResponse.Item?.majors?.SS || []
    const userEmphases = userInfoResponse.Item?.emphases?.SS || []
    const userMinors = userInfoResponse.Item?.minors?.SS || []

    // Extract courses taken
    const coursesTaken = userCoursesTakenResponse.Item?.courses?.SS || []

    // Map course codes if needed
    const mappedCoursesTaken = coursesTaken.map((course) => {
      const match = course.match(/P{.*}C{([A-Z]{4}) (\d{1,4}[A-Z]{0,2}).*}T{.*}/)
      if (match) {
        const [_, courseDept, courseCode] = match
        return (DEPT_MAPPINGS[courseDept] || courseDept) + courseCode
      }
      return course
    })

    return {
      userMajors,
      userEmphases,
      userMinors,
      userCoursesTaken: mappedCoursesTaken,
    }
  } catch (error) {
    console.error("Error fetching user context:", error)
    return {
      userMajors: [],
      userEmphases: [],
      userMinors: [],
      userCoursesTaken: [],
    }
  }
}

async function getCourseSequencesTool(args: {
  explanation: string;
  majors: string[];
  minors: string[];
  emphases: string[];
  courseExpression?: string;
}) {
  singletonDDBMessages.push({
    id: uuidv4(),
    role: "tool",
    content: args.explanation,
  });
  if (singletonController) {
    singletonController.enqueue("event: statusUpdate\n");
    singletonController.enqueue(`data: ${args.explanation}\n\n`);
  }
  return getCourseSequencesGeneral(args)
}

async function checkMeetsRequirements(args: {
  explanation: string;
  majors: string[];
  minors: string[];
  emphases: string[];
  checkGenEdRequirements: boolean;
  pathways: string[];
  plannedCourseList: string[];
  includeUserCoursesAlreadyTaken: boolean;
}) {
  singletonDDBMessages.push({
    id: uuidv4(),
    role: "tool",
    content: args.explanation,
  });
  singletonController?.enqueue("event: statusUpdate\n");
  singletonController?.enqueue(`data: ${args.explanation}\n\n`);
  const userCoursesTaken = new Set(args.plannedCourseList);
  if (args.includeUserCoursesAlreadyTaken) {
    try {
      const userContext = await getUserContext();
      userContext.userCoursesTaken.forEach((course) => {
        userCoursesTaken.add(course);
      });
    } catch (error) {
      console.error("Error fetching user context:", error);
      return {
        notSatisfiedRequirements: [],
        errors: ["Failed to fetch user context, no requirements checked."],
      };
    }
  }

  return checkPlanMeetsRequirements({
    majors: args.majors,
    minors: args.minors,
    emphases: args.emphases,
    checkGenEdRequirements: args.checkGenEdRequirements,
    pathways: args.pathways,
    userCoursesTaken: userCoursesTaken,
  })
}

// Function to run SQL queries
async function runSQLQuery(args: { explanation: string; query: string }) {
  const { explanation, query: sqlQuery } = args;
  if (singletonController) {
    singletonDDBMessages.push({
      id: uuidv4(),
      role: "tool",
      content: explanation,
    });
    singletonController.enqueue("event: statusUpdate\n");
    singletonController.enqueue(`data: ${explanation}\n\n`);
  }

  let client;
  try {
    const pool = await initializeDatabase();
    client = await pool.connect(); // Get a client from the pool
    const result = await client.query(sqlQuery); // Execute the raw query
    console.log(`SQL query executed: ${sqlQuery}, returning ${result.rowCount} rows`);
    console.log(`Explanation: ${explanation}`);
    return result.rows; // pg returns rows in result.rows
  } catch (error) {
    console.error("SQL Error:", error);
    // You might want to return a more specific error or re-throw
    return error;
  } finally {
    if (client) {
      client.release(); // Release the client back to the pool
    }
  }
}

// Define the tools for OpenAI
const TOOLS = [
  zodFunction({
    name: "get_user_context",
    parameters: z.object({
      explanation: z
        .string()
        .describe("Short, present-tense, second-person plain english explanation of why you're using this function, e.g. 'Checking your major', to be displayed to the user."),
    }),
    function: getUserContextTool,
    description: "Get user context information, such as their major, minors, and courses taken.",
  }),
  zodFunction({
    name: "get_course_sequences",
    parameters: z.object({
      explanation: z
        .string()
        .describe(
          "Short, present-tense, second-person  explanation of why you're using this function, e.g. 'Finding course sequences for my major', to be displayed to the user.",
        ),
      majors: z.array(z.string()).describe("List of majors to find course ordering for"),
      minors: z.array(z.string()).describe("List of minors to find course ordering for"),
      emphases: z.array(z.string()).describe("List of emphases to find course ordering for, in the format 'M{Major Name}E{Emphasis Name}'"),
      courseExpression: z
        .string()
        .describe(
          "(For advanced use) Logical boolean-like expression of required courses and/or course ranges, to find sequences for. For example, if a use asks something like 'If I want to take CSCI 101 and then either CSCI 102 and CSCI 103, what order would I need to take these in?', you could use this expression : 'CS101 & (CS102 | CS103)'",
        ),
    }),
    function: getCourseSequencesTool,
    description: `Purpose: Generate Complete Prerequisite Chains

1. Input:
- One or more academic programs (majors, minors, emphases)
- Optionally, an extra course-requirement expression

2. What It Does:
- Combines all course requirement expressions from the input programs and the optional expression into one unified requirement tree.
- Extracts all individual course codes from this tree (ignores negated courses like !RSOC111 and ranges like RSOC100-199).
- For each course, retrieves its prerequisites and recursively expands them into full prerequisite chains.

3. Requirement Chain Expression Format:
- '&' means all listed courses are required together.
- '|' means any one of the listed courses can be taken.
- 'X -> Y' means you must complete X before Y.

4. Output:
- A list of objects, each showing a course and its full chain of prerequisites:
  {
    course: "<COURSE_CODE>",
    prerequisiteExpression: "<FULL_CHAIN_EXPRESSION>"
  }
- Courses with no prerequisites, course ranges, or negated courses are not included.

5. Why It’s Useful:
- Provides a complete, long-range view of all possible prerequisite paths for planning purposes—much more comprehensive than a one-step lookup.
`,
  }),
  zodFunction({
    name: "check_plan_meets_requirements",
    parameters: z.object({
      explanation: z
        .string()
        .describe(
          "Short, present-tense, second-person plain english explanation of why you're using this function, e.g. 'Checking if the course plan meets graduation requirements', to be displayed to the user.",
        ),
      majors: z
        .array(z.string())
        .describe("List of majors to check requirements for, can be empty"),
      minors: z
        .array(z.string())
        .describe("List of minors to check requirements for, can be empty"),
      emphases: z
        .array(z.string())
        .describe("List of emphases to check requirements for, can be empty. Must be in the format 'M{Major Name}E{Emphasis Name}'"),
      checkGenEdRequirements: z
        .boolean()
        .describe(
          "Whether to check general education requirements. If true, will check if the course list satisfies all the general education requirements/core requirements."
        ),
      pathways: z
        .array(z.string())
        .describe(
          "List of pathways to check requirements for. Can be empty"
        ),
      plannedCourseList: z
        .array(z.string())
        .describe(
          "List of course codes that the user will take/has already taken, can be empty"
        ),
      includeUserCoursesAlreadyTaken: z
        .boolean()
        .describe(
          "Whether to include courses that the user has already taken in the requirements check. Should be true in most cases, unless, for example, the user has asked for a course plan for a friend, and they want to see what courses their friend should take."
        ),
    }),
    function: checkMeetsRequirements,
    description: `Check if the given course list plan and/or user courses already taken satisfy the graduation requirements for the given majors, minors, emphases, pathways, and potentially gen ed requirements. Returns a list of any requirements that were not satisfied, and any errors that occured.
        For example:
        {
          notSatisfiedRequirements: [
            {
              type: "major",
              name: "Computer Science",
              doesNotSatisfy: ["CSCI60 | CSCI62"]
            }
            {
              type: "general_education",
              name: "Critical Thinking and Writing 1",
              doesNotSatisfy: ["ENGL1A"]
            }
          ],
          errors: []
        }`,
  }),
  zodFunction({
    name: "run_sql_query",
    parameters: z.object({
      explanation: z
        .string()
        .describe(
          "Short, present-tense, second-person plain english explanation of why you're using this function, e.g. 'Getting all courses in the Computer Science department', to be displayed to the user.",
        ),
      query: z
        .string()
        .describe(
          `The SQL query to run on the database, for example: "SELECT * FROM courses WHERE coursecode = 'CS101'"`,
        ),
    }),
    function: runSQLQuery,
    description:
      "Run a PostgreSQL query on the university catalog database (read only). Returns the results of the query, or an error message if the query failed.",
  }),
]

const SYSTEM_PROMPT = `You are a helpful assistant that helps students at Santa Clara University navigate their course catalog. You can answer questions about courses, majors, minors, and other academic requirements. You can also help students generate long-term course plans and suggest courses they should take next.
You are encouraged to make SQL queries to the university catalog database to get information about courses, majors, minors, and other academic requirements. You can also call functions to get user context information and suggested course ordering.
The PostgreSQL database schema is as follows (note: table/column names  are not case-sensitive):
    Schools
    - name - Name of the school
    - description - Brief overview of the school
    - courseRequirementsExpression - Logical expression of required courses
    - unitRequirements - Number of required units
    - otherRequirements - Any additional academic requirements
    - otherNotes - Miscellaneous notes about the school
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
    - otherNotes - Miscellaneous notes about the school
    - src - Source of the data

    Courses
    - courseCode - Unique code identifying the course (e.g. "CSCI101" -- will always be four letters followed by 1-3 digits, NO SPACE IN BETWEEN)
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
    Every student must have a pathway.

    A few other tips:
    1. Use SQL Queries Generously
    - Use lots of SQL queries to explore the data and answer user questions.  
    - Don’t be afraid to list many rows if you’re unsure what to look for.  
    - Don't be afraid to use SELECT * to access all available columns—you might discover useful information you didn’t expect.

    2. Use Helper Functions for Context and Planning
    - Use get_user_context to retrieve general information about the user—this is helpful for most queries.  
    - Use get_course_sequences to help plan course schedules, especially for courses with recursive prerequisites, or for building long-term plans.

    3. Communicate Clearly with the User
    - Respond in plain English, not in syntactic or overly technical terms.  
    - Do not expose any database internals or SQL details to the user.
    - Ask clarifying questions if user input is incomplete or unclear.

    4. Follow Course Load Guidelines
    - Most students should not take more than 19 units per quarter.  
    - Only exceed this if the student has explicitly said they are planning to overload.
    - The absolute max is generally 25 units, but this is very rare and should only be done with caution.

    5. Understand Course Levels
    - Lower-division courses are typically numbered 0–99.  
    - Upper-division courses are typically numbered 100–199.  
    - Graduate-level courses are typically numbered 200 and above.

    6. Encourage a Balanced Course Schedule
    - Recommend including electives or other non-major courses (e.g., core or pathway requirements).  
    - Students often enjoy taking a mix of required and interest-based courses.`;

export async function POST(request: NextRequest) {
  singletonUserId = getUserIdFromRequest(request)
  if (!singletonUserId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Get conversation ID from header if it exists
  const conversationId = request.headers.get("Conversation-Id")

  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Create a new conversation ID if one doesn't exist
    const newConversationId = conversationId || Date.now().toString()

    // Get existing conversation if it exists
    let existingMessages: any[] = []
    if (conversationId) {
      const getCommand = new GetItemCommand({
        TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
        Key: {
          pk: { S: `u#${singletonUserId}` },
          sk: { S: `conversation#${conversationId}` },
        },
      })

      const response = await ddbClient.send(getCommand)

      if (response.Item) {
        existingMessages =
          response.Item.messages?.L?.map((message) => {
            const messageObj = message.M || {}
            return {
              role: messageObj.role?.S || "",
              content: messageObj.content?.S || "",
            }
          }) || []
        existingMessages = existingMessages.filter((msg) => msg.role !== "tool") // Filter out tool messages
      }
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        singletonController = controller
        try {
          // Prepare the chat history
          const messages = [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            ...existingMessages,
            {
              role: "user",
              content: message,
            },
          ]

          let assistantMessage = ""
          singletonDDBMessages = []
          // Start the chat completion
          openai.beta.chat.completions.runTools({
            messages,
            model: "o4-mini",
            reasoning_effort: "medium",
            tools: TOOLS,
            stream: true
          }).on("finalFunctionCall", (finalFunctionCall) => {
            console.log("Final function call:", finalFunctionCall);
          }).on("content.delta", (delta) => {
            if (delta.delta) {
              const content = delta.delta
              if (assistantMessage.length === 0) {
                singletonController?.enqueue("event: assistantMessageStart\n");
                singletonController?.enqueue("data: Assistant message started\n\n");
              }
              assistantMessage += content
              singletonController?.enqueue("event: assistantMessageDelta\n");
              singletonController?.enqueue(`data: ${JSON.stringify(content)}\n\n`);
            }
          }).on("end", async () => {
            console.log("Stream ended");
            singletonController?.enqueue("event: assistantMessageEnd\n");
            singletonController?.enqueue("data: Assistant message ended\n\n");
            singletonController?.close();
            singletonDDBMessages.push({
              id: uuidv4(),
              role: "assistant",
              content: assistantMessage
            })
            const userMessageItem = {
              id: { S: Date.now().toString() },
              role: { S: "user" },
              content: { S: message },
            }

            const assistantMessageItems = singletonDDBMessages.map((msg) => ({
              M: {
                id: { S: msg.id },
                role: { S: msg.role },
                content: { S: msg.content },
              }
            }));

            // If conversation exists, update it; otherwise, create a new one
            if (conversationId) {
              const updateCommand = new UpdateItemCommand({
                TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
                Key: {
                  pk: { S: `u#${singletonUserId}` },
                  sk: { S: `conversation#${conversationId}` },
                },
                UpdateExpression: "SET messages = list_append(if_not_exists(messages, :empty_list), :new_messages)",
                ExpressionAttributeValues: {
                  ":empty_list": { L: [] },
                  ":new_messages": {
                    L: [{ M: userMessageItem }, ...assistantMessageItems],
                  },
                },
              })
              await ddbClient.send(updateCommand)
            } else {
              // Create a new conversation
              const putCommand = new UpdateItemCommand({
                TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
                Key: {
                  pk: { S: `u#${singletonUserId}` },
                  sk: { S: `conversation#${newConversationId}` },
                },
                UpdateExpression: "SET title = :title, createdAt = :createdAt, messages = :messages",
                ExpressionAttributeValues: {
                  ":title": { S: message.slice(0, 30) + (message.length > 30 ? "..." : "") },
                  ":createdAt": { S: new Date().toISOString() },
                  ":messages": {
                    L: [{ M: userMessageItem }, ...assistantMessageItems],
                  },
                },
              })
              await ddbClient.send(putCommand)
            }
          }
          );
        } catch (error) {
          console.error("Error in chat stream:", error)
          if (singletonController) {
            singletonController.enqueue("event: error\n");
            singletonController.enqueue("data: Error generating response. Please try again.\n\n");
          }
          singletonController.close()
        }
      },
    })

    // Return the streaming response with the conversation ID
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Conversation-Id": newConversationId,
      },
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ message: "Failed to process chat request" }, { status: 500 })
  }
}
