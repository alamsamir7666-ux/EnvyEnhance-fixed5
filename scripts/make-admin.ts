import { db } from '../lib/db/src/index.ts';
import { usersTable } from '../lib/db/src/schema/users.ts';
const result = await db.insert(usersTable).values({
  clerkId: 'manual_admin',
  email: 'alammahatab717@gmail.com',
  firstName: 'Admin',
  role: 'admin',
}).onConflictDoUpdate({ target: usersTable.clerkId, set: { role: 'admin' } });
console.log('Done:', result);
process.exit(0);
