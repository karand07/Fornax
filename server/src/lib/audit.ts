import { prisma } from './prisma.js';

export interface WriteAuditParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
}

export async function writeAudit(
  tx: any,
  params: WriteAuditParams
) {
  const client = tx || prisma;
  return client.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before !== undefined ? params.before : undefined,
      after: params.after !== undefined ? params.after : undefined,
    },
  });
}
