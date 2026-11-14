import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { webhook } from '@clerk/nextjs/server';

export const POST = webhook(async (req) => {
  const { data, event } = await req.json();

  switch (event) {
    case 'user.created':
    case 'user.updated': {
      const { id, emailAddress, firstName, lastName, imageUrl, role } = data;
      await prisma.$executeRaw`
        INSERT INTO users (id, email, display_name, avatar_url, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            role = EXCLUDED.role,
            updated_at = now();
      `;
      break;
    }
    case 'user.deleted': {
      await prisma.user.delete({
        where: { id },
      });
      break;
    }
  }

  return NextResponse.json({ status: 'ok' });
});