import { dynamoClient, tableName } from "../index.js";
import { getSetItems } from "./getSetOrMapItems.js";
import {
    PutItemCommand,
} from "@aws-sdk/client-dynamodb";

export async function updateAcademicPrograms(
    userId,
    academicPrograms,
) {
    const { majors, minors, emphases } = academicPrograms;
    const updates = [];
    if (majors) {
        updates.push(updateMajors(userId, majors));
    }
    if (minors && Array.isArray(minors)) {
        updates.push(updateMinors(userId, minors));
    }
    if (emphases && Array.isArray(emphases)) {
        updates.push(updateEmphases(userId, emphases));
    }
    await Promise.all(updates);
}

async function updateMajors(userId, majors) {
    if (!majors.add && !majors.remove) {
        console.error(
            `Error updating majors for user ${userId}: No majors to add or remove.`,
        );
        throw new Error(`No majors to add or remove.`, {
            cause: 400,
        });
    }

    const currentSetItems = await getSetItems(userId, "info#academicPrograms", "majors");
    const currentSet = new Set(currentSetItems);

    for (const major of majors.add)
        currentSet.add(major);
    for (const major of majors.remove)
        currentSet.delete(major);

    const updateObject = currentSet.size > 0 ?
        { SS: Array.from(currentSet) } :
        { NULL: true };

    const command = new PutItemCommand({
        TableName: tableName,
        Item: {
            pk: { S: `u#${userId}` },
            sk: { S: `info#academicPrograms` },
            majors: updateObject,
        },
    });

    try {
        await dynamoClient.send(command);
    } catch (error) {
        console.error(
            `Error updating majors for user ${userId}: ${error.message}`,
        );
        throw new Error(`Error updating majors for user ${userId}`, {
            cause: 500,
        });
    }
}

async function updateMinors(userId, minors) {
    if (!minors.add && !minors.remove) {
        console.error(
            `Error updating minors for user ${userId}: No minors to add or remove.`,
        );
        throw new Error(`No minors to add or remove.`, {
            cause: 400,
        });
    }

    const currentSetItems = await getSetItems(userId, "info#academicPrograms", "minors");
    const currentSet = new Set(currentSetItems);

    for (const minor of minors.add)
        currentSet.add(minor);
    for (const minor of minors.remove)
        currentSet.delete(minor);

    const updateObject = currentSet.size > 0 ?
        { SS: Array.from(currentSet) } :
        { NULL: true };

    const command = new PutItemCommand({
        TableName: tableName,
        Item: {
            pk: { S: `u#${userId}` },
            sk: { S: `info#academicPrograms` },
            minors: updateObject,
        },
    });

    try {
        await dynamoClient.send(command);
    } catch (error) {
        console.error(
            `Error updating minors for user ${userId}: ${error.message}`,
        );
        throw new Error(`Error updating minors for user ${userId}`, {
            cause: 500,
        });
    }
}

async function updateEmphases(userId, emphases) {
    if (!emphases.add && !emphases.remove) {
        console.error(
            `Error updating emphases for user ${userId}: No emphases to add or remove.`,
        );
        throw new Error(`No emphases to add or remove.`, {
            cause: 400,
        });
    }

    // Validate regex match M{}E{} for emphases
    const regex = /M\{.*?\}E\{.*?\}/g;
    if (emphases.add && !emphases.add.every((emphasis) => regex.test(emphasis))) {
        console.error(
            `Error updating emphases for user ${userId}: Invalid emphasis format.`,
        );
        throw new Error(`Invalid emphasis format.`, {
            cause: 400,
        });
    }

    const currentSetItems = await getSetItems(userId, "info#academicPrograms", "emphases");
    const currentSet = new Set(currentSetItems);
    for (const emphasis of emphases.add)
        currentSet.add(emphasis);
    for (const emphasis of emphases.remove)
        currentSet.delete(emphasis);

    const updateObject = currentSet.size > 0 ?
        { SS: Array.from(currentSet) } :
        { NULL: true };
        
    const command = new PutItemCommand({
        TableName: tableName,
        Item: {
            pk: { S: `u#${userId}` },
            sk: { S: `info#academicPrograms` },
            emphases: updateObject,
        },
    });

    try {
        await dynamoClient.send(command);
    } catch (error) {
        console.error(
            `Error updating emphases for user ${userId}: ${error.message}`,
        );
        throw new Error(`Error updating emphases for user ${userId}`, {
            cause: 500,
        });
    }
}