import { Router } from "express";
import { db, skillsTable } from "@workspace/db";

const router = Router();

router.get("/skills", async (_req, res): Promise<void> => {
  const skills = await db.select().from(skillsTable).orderBy(skillsTable.category, skillsTable.name);
  res.json(skills);
});

export default router;
