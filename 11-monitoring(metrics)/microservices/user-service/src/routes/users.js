import express from "express";
import { z } from "zod";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser
} from "../services/userService.js";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email()
});

const updateSchema = createSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided"
);

export const usersRouter = express.Router();

usersRouter.get("/", async (_req, res) => {
  const users = await listUsers();
  res.json({ data: users });
});

usersRouter.get("/:id", async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({
      error: { message: "User not found", correlationId: req.correlationId }
    });
  }

  res.json({ data: user });
});

usersRouter.post("/", async (req, res) => {
  const payload = createSchema.parse(req.body);

  try {
    const user = await createUser(payload);
    res.status(201).json({ data: user });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: {
          message: "User email already exists",
          correlationId: req.correlationId
        }
      });
    }
    throw error;
  }
});

usersRouter.put("/:id", async (req, res) => {
  const payload = updateSchema.parse(req.body);

  try {
    const user = await updateUser(req.params.id, payload);
    if (!user) {
      return res.status(404).json({
        error: { message: "User not found", correlationId: req.correlationId }
      });
    }
    res.json({ data: user });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: {
          message: "User email already exists",
          correlationId: req.correlationId
        }
      });
    }
    throw error;
  }
});

usersRouter.delete("/:id", async (req, res) => {
  const deleted = await deleteUser(req.params.id);
  if (!deleted) {
    return res.status(404).json({
      error: { message: "User not found", correlationId: req.correlationId }
    });
  }

  res.status(204).send();
});
