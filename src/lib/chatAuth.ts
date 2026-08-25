import { PrismaClient } from "@prisma/client";

import { prisma } from "../lib/prisma.js";



export class ChatAuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = "ChatAuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Validates whether the user is authorized to perform actions on a chat thread for a given task.
 * Enforces IDOR protection by ensuring the user is explicitly either the requester or tasker for the task.
 * 
 * @param taskId Task ID associated with the thread.
 * @param userId Current user ID making the request.
 * @returns The task, thread, and the role of the user ("requester" or "tasker").
 * @throws ChatAuthError if validation fails.
 */
export async function authorizeChatAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    throw new ChatAuthError("Task not found", 404);
  }

  // Task MUST have a selected helper to allow chat
  if (!task.taskerId) {
    throw new ChatAuthError("Task must have a selected helper to communicate", 400);
  }

  // Determine user's role in the task
  const isRequester = task.requesterId === userId;
  const isTasker = task.taskerId === userId;

  if (!isRequester && !isTasker) {
    throw new ChatAuthError("Unauthorized. You are not a participant in this task.", 403);
  }

  // Ensure thread exists or create one if it doesn't 
  // (Alternatively, this could just check for thread if we create it upon helper selection)
  let thread = await prisma.messageThread.findUnique({
    where: { taskId }
  });

  if (thread) {
    // Extra sanity check in case threaded IDs desync'd 
    if (thread.requesterId !== task.requesterId || thread.taskerId !== task.taskerId) {
      throw new ChatAuthError("Thread participant mismatch", 403);
    }
  }

  return {
    task,
    thread,
    role: isRequester ? "requester" : "tasker"
  };
}
