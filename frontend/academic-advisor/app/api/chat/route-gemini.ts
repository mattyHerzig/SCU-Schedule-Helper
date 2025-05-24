import { type NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Schema, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai"
import jwt from "jsonwebtoken"
import { initializeDatabase, runSQLQuery } from "@/app/utils/sql-queries"
import { getCourseSequencesGeneral } from "@/app/utils/sequences"
import { AuthClient, OAuth2Client } from "google-auth-library"

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AMZ_DDB_REGION || "us-west-1",
})

// Helper function to get user ID from request
function getUserIdFromRequest(request: NextRequest): string | null {
  // Try to get from header first (set by middleware)
  const userId = request.headers.get("User-ID")
  if (userId) return userId

  // Fallback to extracting from access token
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return null

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || "default_secret") as jwt.JwtPayload
    return decoded.sub as string
  } catch (error) {
    console.error("Error decoding access token:", error)
    return null
  }
}

// Helper function to get Google OAuth token for the user
async function getGoogleOAuthToken(userId: string): Promise<string | null> {
  try {
    const getCommand = new GetItemCommand({
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${userId}` },
        sk: { S: "oauth#google#tokens" },
      },
    })

    const response = await ddbClient.send(getCommand)

    if (!response.Item) {
      console.error("OAuth tokens not found for user:", userId)
      return null
    }

    return response.Item.accessToken?.S || null
  } catch (error) {
    console.error("Error fetching OAuth token:", error)
    return null
  }
}

// Helper function to get user context information
async function getUserContext(userId: string) {
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

    // Map course codes if needed (similar to the original file)
    const DEPT_MAPPINGS: Record<string, string> = {
      COEN: "CSEN",
    }

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
const getUserContextFunction: FunctionDeclaration = {
  name: "get_user_context",
  description: "Get user context information, such as their major, minors, and courses taken.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      userId: {
        type: Type.STRING,
        description: "User ID to get context for.",
      },
    },
    required: ["userId"],
  },
};
// Define the tools for the model
const TOOLS = [
  {
    functionDeclarations: [
      getUserContextFunction,
      {
        name: "get_course_sequences",
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
        parameters: {
          type: Type.OBJECT,
          properties: {
            majors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of majors to find course ordering for",
            },
            minors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of minors to find course ordering for",
            },
            emphases: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of emphases to find course ordering for",
            },
            courseExpression: {
              type: Type.STRING,
              description:
                "(For advanced use) Logical boolean-like expression of required courses and/or course ranges, to find sequences for. For example, if a use asks something like 'If I want to take CSCI 101 and then either CSCI 102 and CSCI 103, what order would I need to take these in?', you could use this expression : 'CS101 & (CS102 | CS103)'",
            },
          },
          required: ["majors", "minors", "emphases", "courseExpression"],
        },
      },
      {
        name: "run_sql_query",
        description:
          "Run a SQL query on the university catalog database. Returns the results of the query, or an error message if the query failed.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            explanation: {
              type: Type.STRING,
              description:
                "Plain english explanation of the SQL query, that the user can understand. For example: 'Getting all the courses that are offered in the next quarter...'",
            },
            query: {
              type: Type.STRING,
              description:
                "SQL query to run on the university catalog SQLite database, for example: \"SELECT * FROM Courses WHERE courseCode = 'CS101'\"",
            },
          },
          required: ["explanation", "query"],
        },
      },
    ],
  },
]

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

    // Get Google OAuth token
    const googleToken = await getGoogleOAuthToken(userId)
    if (!googleToken) {
      return NextResponse.json({ message: "Failed to authenticate with Google" }, { status: 401 })
    }

    // Initialize SQLite database
    await initializeDatabase()

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

    // Initialize Google Generative AI with the user's OAuth token
    console.log("Initializing Google Generative AI with token:", googleToken)
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({ access_token: googleToken })
    const genAI = new GoogleGenAI({
      vertexai: true,
      project: "scu-schedule-helper",
      googleAuthOptions: {
        authClient: oauth2Client,
      }
    })

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send status update
          controller.enqueue(encoder.encode("\xf9Processing your request...\xf8"))

          // Get user context
          const userContext = await getUserContext(userId)

          // Prepare the chat history
          const chatHistory = [
            {
              role: "user",
              parts: [
                {
                  text: `You are a helpful assistant that helps students at Santa Clara University navigate their course catalog. You can answer questions about courses, majors, minors, and other academic requirements. You can also help students generate long-term course plans and suggest courses they should take next.
                  
Here is the user's context information:
- Majors: ${userContext.userMajors.join(", ") || "None"}
- Emphases: ${userContext.userEmphases.join(", ") || "None"}
- Minors: ${userContext.userMinors.join(", ") || "None"}
- Courses Taken: ${userContext.userCoursesTaken.join(", ") || "None"}

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
We also recommend mixing in some electives or other courses that are not required for their major/minor/emphasis, as students often like to take a variety of courses and not just the ones that are required for their major/minor/emphasis, e.g. core requirements or pathways courses.`,
                },
              ],
            },
            {
              role: "model",
              parts: [{ text: "I understand. I'll help the student navigate their academic journey at SCU." }],
            },
          ]

          // Add existing messages to chat history
          for (const msg of existingMessages) {
            chatHistory.push({
              role: msg.role === "user" ? "user" : "model",
              parts: [{ text: msg.content }],
            })
          }

          // Start the chat

          const chat = genAI.chats.create({
            model: "gemini-2.5-flash-preview",
            history: chatHistory,
            config: {
              temperature: 0.7,
              tools: TOOLS,
            }
          });

          // Send status update
          controller.enqueue(encoder.encode("\xf9Generating response...\xf8"))

          // Function to handle tool calls
          async function handleToolCall(toolCall: any, userId: string) {
            const { name, args } = toolCall.functionCall

            controller.enqueue(encoder.encode(`\xf9Using tool: ${name}...\xf8`))

            try {
              let result
              if (name === "get_user_context") {
                result = await getUserContext(userId)
              } else if (name === "get_course_sequences") {
                result = await getCourseSequencesGeneral(args)
              } else if (name === "run_sql_query") {
                result = await runSQLQuery(args.query)
              } else {
                throw new Error(`Unknown tool: ${name}`)
              }

              return {
                name,
                content: { text: JSON.stringify(result) },
              }
            } catch (error) {
              console.error(`Error executing tool ${name}:`, error)
              return {
                name,
                content: { text: `Error: ${error as string || "none"}` },
              }
            }
          }

          // Generate response with tool calling
          const result = await chat.sendMessageStream({ message });

          let fullResponse = ""
          let hasToolCalls = false

          for await (const chunk of result) {
            // Check for tool calls
            if (chunk.candidates?.[0]?.content?.parts?.[0]?.functionCall) {
              hasToolCalls = true
              const toolCall = chunk.candidates[0].content.parts[0]
              const toolResponse = await handleToolCall(toolCall, userId)

              // Send the tool response back to the model
              const toolResponseResult = await chat.sendMessageStream({
                message: {
                  functionResponse: toolResponse,
                }
              })

              // Stream the tool response result
              for await (const toolChunk of toolResponseResult) {
                if (toolChunk.text) {
                  fullResponse += toolChunk.text
                  controller.enqueue(encoder.encode(toolChunk.text))
                }
              }
            } else if (chunk.text) {
              fullResponse += chunk.text
              controller.enqueue(encoder.encode(chunk.text))
            }
          }

          // Store the conversation and messages in DynamoDB
          const userMessage = {
            id: { S: Date.now().toString() },
            role: { S: "user" },
            content: { S: message },
          }

          const assistantMessage = {
            id: { S: (Date.now() + 1).toString() },
            role: { S: "assistant" },
            content: { S: fullResponse },
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
                  L: [{ M: userMessage }, { M: assistantMessage }],
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
                  L: [{ M: userMessage }, { M: assistantMessage }],
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
