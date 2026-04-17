import { PrismaClient } from '@prisma/client';

// 싱글톤 패턴으로 DB 연결 하나만 유지
const prisma = new PrismaClient();

export default prisma;
