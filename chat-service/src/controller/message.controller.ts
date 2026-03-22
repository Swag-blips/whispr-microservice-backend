import { Request, Response } from "express";
import logger from "../utils/logger";
import {
  sendMessageService,
  getMessagesService,
  createGroupService,
  addMemberToGroupService,
  removeMemberFromGroupService,
  updateGroupDetailsService,
  getUserChatsService,
  sendGroupMessageService,
  getChatFilesService,
  starMessageService,
  getStarredMessagesService,
} from "../services/message.service";
import { Types } from "mongoose";

const getErrorStatus = (message: string): number => {
  if (
    message.includes("Chat Id is required") ||
    message.includes("ChatId is required") ||
    message.includes("invalid ID") ||
    message.includes("No receivers") ||
    message.includes("User is not a member") ||
    message.includes("You already starred this message")
  ) {
    return 400;
  }
  if (
    message.includes("Not permitted") ||
    message.includes("not authorized") ||
    message.includes("Unauthorized") ||
    message.includes("not permitted")
  ) {
    return 401;
  }
  if (
    message.includes("Chat not found") ||
    message.includes("chat not found") ||
    message.includes("message not found") ||
    message.includes("Chat does not exist")
  ) {
    return 404;
  }
  return 500;
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content, file, tempId, fileType, fileName, fileSize } = req.body;
    const userId = req.userId as Types.ObjectId;

    await sendMessageService({
      chatId,
      content,
      file,
      tempId,
      fileType,
      fileName,
      fileSize,
      userId,
    });

    res
      .status(201)
      .json({ success: true, message: "Message successfully sent" });
  } catch (error: any) {
    logger.error(`An error occurred while sending message ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const messages = await getMessagesService({ chatId });

    res.status(200).json({ success: true, messages });
    return;
  } catch (error: any) {
    logger.error(`Error getting messages: ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const createGroup = async (req: Request, res: Response) => {
  try {
    const { participants, groupName, bio } = req.body;
    const userId = req.userId;

    const chat = await createGroupService({
      participants,
      groupName,
      bio,
      userId,
    });

    res.status(201).json({ success: true, chat });
    logger.info("Group successfully created");
    return;
  } catch (error: any) {
    logger.error(`error creating group ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const addMemberToGroup = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { participants } = req.body;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "ChatId is required" });
      return;
    }

    await addMemberToGroupService({ chatId, participants, userId });

    res.status(201).json({ success: true, message: "Users added to chat" });
    return;
  } catch (error: any) {
    logger.error(`error adding member ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const removeMemberFromGroup = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { memberId } = req.body;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "ChatId is required" });
      return;
    }

    await removeMemberFromGroupService({ chatId, memberId, userId });

    res.status(201).json({ success: true, message: "User removed from chat" });
    return;
  } catch (error: any) {
    logger.error(`error removing member from group ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const updateGroupDetails = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { bio, groupName } = req.body;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "ChatId is required" });
      return;
    }

    await updateGroupDetailsService({ chatId, bio, groupName, userId });

    res
      .status(201)
      .json({ success: true, message: "group successfully updated" });
    return;
  } catch (error: any) {
    logger.error(`error updating group details ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const getUserChats = async (req: Request, res: Response) => {
  logger.info("USER CHATS ENDPOINT HIT");
  try {
    const userId = req.userId;

    const chats = await getUserChatsService(userId);

    res.status(200).json({ success: true, chats });
    return;
  } catch (error: any) {
    logger.error(error);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const sendGroupMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content, file, tempId, fileType, fileName, fileSize } = req.body;
    const userId = req.userId;

    await sendGroupMessageService({
      chatId,
      content,
      file,
      tempId,
      fileType,
      fileName,
      fileSize,
      userId,
    });

    res
      .status(201)
      .json({ success: true, message: "Message successfully sent" });
    return;
  } catch (error: any) {
    logger.error(`An error occurred while sending group message ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const getChatFiles = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const files = await getChatFilesService({ chatId, userId });

    res.status(200).json({
      success: true,
      message: "Files fetched successfully",
      data: files,
    });
    return;
  } catch (error: any) {
    logger.error(`error getting chat files ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const starMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { messageId } = req.body;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    await starMessageService({ chatId, messageId, userId });

    res.status(200).json({
      success: true,
      message: "Message starred successfully",
    });
    return;
  } catch (error: any) {
    logger.error(`error starring message ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};

export const getStarredMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    if (!chatId) {
      res.status(400).json({ success: false, message: "Chat Id is required" });
      return;
    }

    const messages = await getStarredMessagesService({ chatId, userId });

    res.status(200).json({
      success: true,
      message: "starred messages fetched successfully",
      data: messages,
    });
  } catch (error: any) {
    logger.error(`error getting starred messages ${error}`);
    const status = getErrorStatus(error?.message ?? "");
    if (status !== 500) {
      res.status(status).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ error: error });
    }
  }
};
