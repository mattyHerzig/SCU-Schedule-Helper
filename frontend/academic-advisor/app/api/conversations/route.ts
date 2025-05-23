import { type NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, QueryCommand, PutItemCommand } from "@aws-sdk/client-dynamodb"
import jwt from "jsonwebtoken"

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_DDB_REGION || "us-west-2",
})

// Helper function to get user ID from request
function getUserIdFromRequest(request: NextRequest): string | null {
  // Try to get from header first (set by middleware)
  const userId = request.headers.get("X-User-ID")
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

// GET handler for fetching conversations
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    // Query DynamoDB for all conversations for this user
    const queryCommand = new QueryCommand({
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": { S: `u#${userId}` },
        ":sk": { S: "conversation#" },
      },
      ProjectionExpression: "sk, title, createdAt",
    })

    const response = await ddbClient.send(queryCommand)

    // Transform the DynamoDB response to a more friendly format
    const conversations =
      response.Items?.map((item) => {
        const conversationId = item.sk.S?.replace("conversation#", "")
        return {
          id: conversationId,
          title: item.title?.S || "Untitled Conversation",
          createdAt: item.createdAt?.S || new Date().toISOString(),
        }
      }) || []
    return NextResponse.json(conversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ message: "Failed to fetch conversations" }, { status: 500 })
  }
}

// POST handler for creating a new conversation
export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title = "New Conversation" } = body

    // Generate a unique ID for the conversation
    const conversationId = Date.now().toString()
    const createdAt = new Date().toISOString()

    // Store the conversation in DynamoDB
    const putCommand = new PutItemCommand({
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Item: {
        pk: { S: `u#${userId}` },
        sk: { S: `conversation#${conversationId}` },
        title: { S: title },
        createdAt: { S: createdAt },
        messages: { L: [] }, // Empty list of messages initially
      },
    })

    await ddbClient.send(putCommand)

    return NextResponse.json({
      id: conversationId,
      title,
      createdAt,
    })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ message: "Failed to create conversation" }, { status: 500 })
  }
}
