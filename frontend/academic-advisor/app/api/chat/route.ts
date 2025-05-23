import { type NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"
import OpenAI from "openai"
import sqlite3 from "sqlite3"
import { Database, open } from "sqlite"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { zodFunction } from "openai/helpers/zod.mjs"
import { getCourseSequencesGeneral } from "@/app/utils/sequences"

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION || "us-west-2",
})

let singletonController: ReadableStreamDefaultController | null = null

// Initialize SQLite database
let sqliteDB: any = null


async function initializeDatabase() {
  if (!sqliteDB) {
    try {
      // sqliteDB = new sqlite3.Database("./data/university_catalog.db", (err) => {
      //   if (err) {
      //     console.error("Error opening SQLite database:", err)
      //     throw err
      //   }
      // })
      sqliteDB = await open({
        filename: "./data/university_catalog.db",
        driver: sqlite3.Database,
      });
      console.log("SQLite database initialized successfully")
    } catch (error) {
      console.error("Error initializing SQLite database:", error)
      throw error
    }
  }
  return sqliteDB as Database
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
async function getUserContext(userId: string) {
  console.log("Called getUserContext function for user:", userId)
  if (singletonController) {
    singletonController.enqueue(new TextEncoder().encode("\xf9Fetching user context...\xf8"))
  }

  try {
    // Get user personal info
    const userInfoQuery = {
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${userId}` },
        sk: { S: "info#personal" },
      },
    }

    // Get user courses taken
    const userCoursesTakenQuery = {
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${userId}` },
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

// Function to run SQL queries
async function runSQLQuery(args: { explanation: string; query: string }) {
  if (singletonController) {
    singletonController.enqueue(new TextEncoder().encode("\xf9Running SQL query...\xf8"))
  }
  const sqlQuery = args.query
  const explanation = args.explanation
  console.log(`Running SQL query: ${sqlQuery}`)
  console.log(`Explanation: ${explanation}`)
  try {
    const db = await initializeDatabase();
    const rows = await db.all(sqlQuery);
    console.log(`SQL query executed: ${sqlQuery}`)
    return rows;
  } catch (error) {
    console.error("SQL Error:", error)
    return [];
  }
}

// Define the tools for OpenAI
const TOOLS = [
  zodFunction({
    name: "get_user_context",
    parameters: z.object({}),
    function: () => getUserContext("swdean"),
    description: "Get user context information, such as their major, minors, and courses taken.",
  }),
  zodFunction({
    name: "get_course_sequences",
    parameters: z.object({
      majors: z.array(z.string()).describe("List of majors to find course ordering for"),
      minors: z.array(z.string()).describe("List of minors to find course ordering for"),
      emphases: z.array(z.string()).describe("List of emphases to find course ordering for"),
      courseExpression: z
        .string()
        .describe(
          "(For advanced use) Logical boolean-like expression of required courses and/or course ranges, to find sequences for. For example, if a use asks something like 'If I want to take CSCI 101 and then either CSCI 102 and CSCI 103, what order would I need to take these in?', you could use this expression : 'CS101 & (CS102 | CS103)'",
        ),
    }),
    function: (args) => {
      if (singletonController) {
        singletonController.enqueue(new TextEncoder().encode("\xf9Generating course sequences...\xf8"))
      }
      return getCourseSequencesGeneral(args)
    },
    description: `Purpose
        Given one or more academic programs (majors, minors, emphases) and/or an extra course‐requirement expression, produce the complete prerequisite chains for every course you might end up taking.
        For each program in majors/minors/emphases, we look up its course requirements expression.  We then AND‑together all of those expressions plus the optional courseExpression into one combined requirement tree.

        Next, we parse that combined tree and pull out every course code (ignoring negations like !RSOC111 and any course ranges like RSOC100-199).
        For each course found, we get its prerequisites from the database, and recursively expand each of those prereq formulas into a single "chain expression" showing every possible path you might take to get into the course. – Use & to require courses together. – Use | to show alternatives. – Use X -> Y to indicate "you must complete X before Y."
        Output
        An array of objects, one per course in the combined requirement tree, each of the form:
        {
          course: "<COURSE_CODE>",
          prerequisiteExpression: "<FULL_CHAIN_EXPRESSION>"
        }

        Note that courses that have no prerequisites are not included in the output (likewise for course ranges and courses that are negated in the course requirements expression/tree).

        Why it's useful
        Unlike a one‐level database lookup, this gives you the entire, recursive sequence of courses (and alternatives) needed to satisfy every prerequisite in a long‑range plan.`,
  }),
  zodFunction({
    name: "run_sql_query",
    parameters: z.object({
      explanation: z
        .string()
        .describe(
          "Plain english explanation of the SQL query, that the user can understand. For example: 'Getting all the courses that are offered in the next quarter...'",
        ),
      query: z
        .string()
        .describe(
          `SQL query to run on the university catalog SQLite database, for example: "SELECT * FROM Courses WHERE courseCode = 'CS101'"`,
        ),
    }),
    function: runSQLQuery,
    description:
      "Run a SQL query on the university catalog database. Returns the results of the query, or an error message if the query failed.",
  }),
]

// System prompt for the assistant
const SYSTEM_PROMPT = `You are a helpful assistant that helps students at Santa Clara University navigate their course catalog. You can answer questions about courses, majors, minors, and other academic requirements. You can also help students generate long-term course plans and suggest courses they should take next.
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
    We also recommend mixing in some electives or other courses that are not required for their major/minor/emphasis, as students often like to take a variety of courses and not just the ones that are required for their major/minor/emphasis, e.g. core requirements or pathways courses.`

// POST handler for chat
export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
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

    // Initialize OpenAI client
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
          pk: { S: `u#${userId}` },
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
      }
    }

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send status update
          controller.enqueue(encoder.encode("\xf9Processing your request...\xf8"))

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

          // Send status update
          controller.enqueue(encoder.encode("\xf9Generating response...\xf8"))

          // Create a copy of the tools with actual implementations
          const toolsWithImplementations = TOOLS.map((tool) => {
            if (tool.function.name === "get_user_context") {
              return {
                ...tool,
                function: async () => {
                  controller.enqueue(encoder.encode("\xf9Fetching user context...\xf8"))
                  return JSON.stringify(await getUserContext(userId))
                },
              }
            } else if (tool.function.name === "get_course_sequences") {
              return {
                ...tool,
                function: async (args: any) => {
                  controller.enqueue(encoder.encode("\xf9Generating course sequences...\xf8"))
                  return JSON.stringify(await getCourseSequencesGeneral(args))
                },
              }
            } else if (tool.function.name === "run_sql_query") {
              return {
                ...tool,
                function: async (args: any) => {
                  controller.enqueue(encoder.encode(`\xf9Running SQL query: ${args.query}...\xf8`))
                  return JSON.stringify(await runSQLQuery(args))
                },
              }
            }
            return tool
          })

          // Start the chat completion
          let response = await openai.beta.chat.completions.parse({
            messages,
            model: "o4-mini",
            reasoning_effort: "medium",
            tools: TOOLS,
          })

          let assistantMessage = ""

          // Add the assistant's message to the chat history
          messages.push(response.choices[0].message)

          // Process the response and handle tool calls
          while (response.choices[0].message.tool_calls && response.choices[0].message.tool_calls.length > 0) {
            // Process each tool call
            for (const toolCall of response.choices[0].message.tool_calls) {
              const tool = TOOLS.find((t) => t.function.name === toolCall.function.name)

              if (!tool) {
                console.error(`Tool ${toolCall.function.name} not found`)
                continue
              }

              // Execute the tool
              const result = await tool.$callback!(toolCall.function.parsed_arguments);
              console.log(`Tool ${toolCall.function.name} executed with result:`, JSON.stringify(result, null, 2))

              // Add the tool response to the messages
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result, null, 2),
              })
            }

            // Get the next response
            response = await openai.beta.chat.completions.parse({
              messages,
              model: "o4-mini",
              reasoning_effort: "medium",
              tools: TOOLS,
            });
            if (response.choices[0].message.content) {
              controller.enqueue(encoder.encode(assistantMessage))
            }
            messages.push(response.choices[0].message);
          }

          // Get the final response content
          if (response.choices[0].message.content) {
            assistantMessage = response.choices[0].message.content
          }

          // Store the conversation and messages in DynamoDB
          const userMessageItem = {
            id: { S: Date.now().toString() },
            role: { S: "user" },
            content: { S: message },
          }

          const assistantMessageItem = {
            id: { S: (Date.now() + 1).toString() },
            role: { S: "assistant" },
            content: { S: assistantMessage },
          }

          // If conversation exists, update it; otherwise, create a new one
          if (conversationId) {
            const updateCommand = new UpdateItemCommand({
              TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
              Key: {
                pk: { S: `u#${userId}` },
                sk: { S: `conversation#${conversationId}` },
              },
              UpdateExpression: "SET messages = list_append(if_not_exists(messages, :empty_list), :new_messages)",
              ExpressionAttributeValues: {
                ":empty_list": { L: [] },
                ":new_messages": {
                  L: [{ M: userMessageItem }, { M: assistantMessageItem }],
                },
              },
            })

            await ddbClient.send(updateCommand)
          } else {
            // Create a new conversation
            const putCommand = new UpdateItemCommand({
              TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
              Key: {
                pk: { S: `u#${userId}` },
                sk: { S: `conversation#${newConversationId}` },
              },
              UpdateExpression: "SET title = :title, createdAt = :createdAt, messages = :messages",
              ExpressionAttributeValues: {
                ":title": { S: message.slice(0, 30) + (message.length > 30 ? "..." : "") },
                ":createdAt": { S: new Date().toISOString() },
                ":messages": {
                  L: [{ M: userMessageItem }, { M: assistantMessageItem }],
                },
              },
            })

            await ddbClient.send(putCommand)
          }

          controller.close()
        } catch (error) {
          console.error("Error in chat stream:", error)
          controller.enqueue(encoder.encode("\xf9Error generating response. Please try again.\xf8"))
          controller.close()
        }
      },
    })

    // Return the streaming response with the conversation ID
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Conversation-Id": newConversationId,
      },
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ message: "Failed to process chat request" }, { status: 500 })
  }
}
