-- DropIndex
DROP INDEX "WorkspaceMember_userId_idx";

-- CreateIndex
CREATE INDEX "Attachment_commentId_idx" ON "Attachment"("commentId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "TaskAssignee_userId_idx" ON "TaskAssignee"("userId");

-- CreateIndex
CREATE INDEX "TaskLabel_labelId_idx" ON "TaskLabel"("labelId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_workspaceId_idx" ON "WorkspaceMember"("userId", "workspaceId");
