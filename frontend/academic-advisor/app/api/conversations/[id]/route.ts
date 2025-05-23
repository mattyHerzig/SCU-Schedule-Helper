import { type NextRequest, NextResponse } from "next/server"
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb"
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

// GET handler for fetching a specific conversation
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  console.log("Fetching conversation for user:", userId)
  console.log("Request URL:", request.nextUrl.pathname)
  const conversationId = request.nextUrl.pathname.split("/").pop() // Extract conversation ID from URL
  console.log("Conversation ID:", conversationId)

  try {
    // Get the conversation from DynamoDB
    const getCommand = new GetItemCommand({
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${userId}` },
        sk: { S: `conversation#${conversationId}` },
      },
    })

    const response = await ddbClient.send(getCommand)

    if (!response.Item) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 })
    }

    // Transform the DynamoDB response to a more friendly format
    const conversation = {
      id: conversationId,
      title: response.Item.title?.S || "Untitled Conversation",
      createdAt: response.Item.createdAt?.S || new Date().toISOString(),
      messages:
        response.Item.messages?.L?.map((message) => {
          const messageObj = message.M || {}
          return {
            id: messageObj.id?.S || "",
            role: messageObj.role?.S || "",
            content: messageObj.content?.S || "",
          }
        }) || [],
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error("Error fetching conversation:", error)
    return NextResponse.json({ message: "Failed to fetch conversation" }, { status: 500 })
  }
}

// PUT handler for updating a conversation
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const conversationId = params.id

  try {
    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 })
    }

    // Update the conversation in DynamoDB
    const updateCommand = new UpdateItemCommand({
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${userId}` },
        sk: { S: `conversation#${conversationId}` },
      },
      UpdateExpression: "SET title = :title",
      ExpressionAttributeValues: {
        ":title": { S: title },
      },
      ReturnValues: "ALL_NEW",
    })

    const response = await ddbClient.send(updateCommand)

    if (!response.Attributes) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: conversationId,
      title: response.Attributes.title?.S || title,
      createdAt: response.Attributes.createdAt?.S || new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating conversation:", error)
    return NextResponse.json({ message: "Failed to update conversation" }, { status: 500 })
  }
}

// DELETE handler for deleting a conversation
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const conversationId = params.id

  try {
    // Delete the conversation from DynamoDB
    const deleteCommand = new UpdateItemCommand({
      TableName: process.env.SCU_SCHEDULE_HELPER_TABLE_NAME,
      Key: {
        pk: { S: `u#${userId}` },
        sk: { S: `conversation#${conversationId}` },
      },
      UpdateExpression: "SET deleted = :deleted",
      ExpressionAttributeValues: {
        ":deleted": { BOOL: true },
      },
    })

    await ddbClient.send(deleteCommand)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting conversation:", error)
    return NextResponse.json({ message: "Failed to delete conversation" }, { status: 500 })
  }
}
