const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcryptjs'); // Import bcrypt

const prisma = new PrismaClient();

async function main() {

    console.log(`Deleting existing messages...`);
    await prisma.message.deleteMany({});
    console.log('Existing messages deleted.');
  
    console.log(`Deleting existing users...`);
    await prisma.user.deleteMany({});
    console.log('Existing users deleted.');
  
  
    console.log(`Start seeding new users...`);
  

    const saltRounds = 10;
    const users = {}; 

    const usersToCreate = [
    { username: 'aaa', passwordPlain: '123', bio: 'Loves cryptography.' },
    { username: 'Bob', passwordPlain: 'passwordBob', bio: 'Enjoys secure messaging.' },
    { username: 'Charlie', passwordPlain: 'passwordCharlie', bio: null },
    { username: 'Dave', passwordPlain: 'passwordDave', bio: null },
  ];
  
  for (const userData of usersToCreate) {
    const hashedPassword = await bcrypt.hash(userData.passwordPlain, saltRounds);
    const user = await prisma.user.upsert({
      where: { username: userData.username }, 
      update: { password: hashedPassword, bio: userData.bio }, 
      create: { 
        username: userData.username,
        password: hashedPassword,
        bio: userData.bio,
      },
    });
    users[user.username] = user; // Store the created user object (with ID)
    console.log(`Upserted user: ${user.username} (ID: ${user.id})`);
  }

  console.log(`Seeding messages...`);
  if (!users.aaa || !users.Bob || !users.Charlie || !users.Dave) {
      console.error("One or more users were not created successfully. Skipping message seeding.");
      return; // Exit if users aren't available
  }

  const baseMessagesData = [
    // --- Original Messages ---
    { senderId: users.aaa.id, receiverId: users.Bob.id, content: 'Hi Bob!' }, // aaa -> Bob (1)
    { senderId: users.Bob.id, receiverId: users.aaa.id, content: 'Hey aaa, how are you?' }, // Bob -> aaa (1)
    { senderId: users.aaa.id, receiverId: users.Bob.id, content: 'Doing great! Ready for testing?' }, // aaa -> Bob (2)
    { senderId: users.Bob.id, receiverId: users.aaa.id, content: 'Absolutely!' }, // Bob -> aaa (2)
    { senderId: users.Charlie.id, receiverId: users.Dave.id, content: 'Hey Dave, got the latest code?' }, // Charlie -> Dave (1)
    { senderId: users.Dave.id, receiverId: users.Charlie.id, content: 'Yep, pulling now.' }, // Dave -> Charlie (1)
    { senderId: users.Bob.id, receiverId: users.Charlie.id, content: 'Morning Charlie!' }, // Bob -> Charlie (1)

    // --- Additional Messages (Approx 20 more) ---

    // More between aaa and Bob
    { senderId: users.aaa.id, receiverId: users.Bob.id, content: 'Found a small bug in the login flow.' }, // aaa -> Bob (3)
    { senderId: users.Bob.id, receiverId: users.aaa.id, content: 'Oh? Which part?' }, // Bob -> aaa (3)
    { senderId: users.aaa.id, receiverId: users.Bob.id, content: 'When using special characters in the password.' }, // aaa -> Bob (4)
    { senderId: users.Bob.id, receiverId: users.aaa.id, content: 'Okay, I\'ll take a look. Thanks!' }, // Bob -> aaa (4)

    // More between Charlie and Dave
    { senderId: users.Charlie.id, receiverId: users.Dave.id, content: 'Build passed!' }, // Charlie -> Dave (2)
    { senderId: users.Dave.id, receiverId: users.Charlie.id, content: 'Great! Deploying to staging.' }, // Dave -> Charlie (2)
    { senderId: users.Charlie.id, receiverId: users.Dave.id, content: 'Let me know when it\'s up.' }, // Charlie -> Dave (3)
    { senderId: users.Dave.id, receiverId: users.Charlie.id, content: 'Done. Check staging URL.' }, // Dave -> Charlie (3)

    // Messages involving aaa and Charlie
    { senderId: users.aaa.id, receiverId: users.Charlie.id, content: 'Hey Charlie, need your input on the UI.' }, // aaa -> Charlie (1)
    { senderId: users.Charlie.id, receiverId: users.aaa.id, content: 'Sure, what\'s up?' }, // Charlie -> aaa (1)
    { senderId: users.aaa.id, receiverId: users.Charlie.id, content: 'The color scheme for the buttons.' }, // aaa -> Charlie (2)
    { senderId: users.Charlie.id, receiverId: users.aaa.id, content: 'Let\'s stick to the primary blue for now.' }, // Charlie -> aaa (2)

    // Messages involving Bob and Dave
    { senderId: users.Bob.id, receiverId: users.Dave.id, content: 'Dave, did you update the Prisma schema?' }, // Bob -> Dave (1)
    { senderId: users.Dave.id, receiverId: users.Bob.id, content: 'Not yet, was planning to do it this afternoon.' }, // Dave -> Bob (1)
    { senderId: users.Bob.id, receiverId: users.Dave.id, content: 'Okay, make sure to run migrations after.' }, // Bob -> Dave (2)
    { senderId: users.Dave.id, receiverId: users.Bob.id, content: 'Will do.' }, // Dave -> Bob (2)

    // Messages involving aaa and Dave
    { senderId: users.Dave.id, receiverId: users.aaa.id, content: 'Quick question about the auth context.' }, // Dave -> aaa (1)
    { senderId: users.aaa.id, receiverId: users.Dave.id, content: 'Shoot.' }, // aaa -> Dave (1)
    { senderId: users.Dave.id, receiverId: users.aaa.id, content: 'How are we handling token refresh?' }, // Dave -> aaa (2)
    { senderId: users.aaa.id, receiverId: users.Dave.id, content: 'We are using sessions, so no token refresh needed.' }, // aaa -> Dave (2)

     // Messages involving Charlie and Bob (adding to existing Bob -> Charlie)
    { senderId: users.Charlie.id, receiverId: users.Bob.id, content: 'Morning Bob! Coffee?' }, // Charlie -> Bob (1)
    { senderId: users.Bob.id, receiverId: users.Charlie.id, content: 'Already got mine, but thanks!' }, // Bob -> Charlie (2)
    { senderId: users.Charlie.id, receiverId: users.Bob.id, content: 'Alright, see you at standup.' }, // Charlie -> Bob (2)

    // Some rapid fire messages for testing ordering
    { senderId: users.aaa.id, receiverId: users.Bob.id, content: 'Test 1' }, // aaa -> Bob (5)
    { senderId: users.aaa.id, receiverId: users.Bob.id, content: 'Test 2' }, // aaa -> Bob (6)
    { senderId: users.Bob.id, receiverId: users.aaa.id, content: 'Reply 1' }, // Bob -> aaa (5)
    { senderId: users.aaa.id, receiverId: users.Bob.id, content: 'Test 3' }, // aaa -> Bob (7) - This should be the latest from aaa to Bob

    { senderId: users.Dave.id, receiverId: users.aaa.id, content: 'Okay, sessions make sense.' }, // Dave -> aaa (3) - This should be the latest from Dave to aaa
  ];

  const now = new Date(); // Base time
  const messagesDataWithTimestamps = baseMessagesData.map((message, index) => {
    const secondsAgo = (baseMessagesData.length - 1 - index) * 5; // Stagger by 5 seconds each

    // Create a new Date object for the past timestamp
    const messageTimestamp = new Date(now.getTime() - secondsAgo * 1000);

    // Return a new object combining original data and the calculated timestamp
    return {
      ...message,
      createdAt: messageTimestamp,
    };
  });

  // --- 5. Seed Messages with explicit timestamps ---
  console.log(`Seeding ${messagesDataWithTimestamps.length} messages...`);
  const createdMessages = await prisma.message.createMany({
    data: messagesDataWithTimestamps, // Use the array with calculated timestamps
  });
  console.log(`Created ${createdMessages.count} messages.`);

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  });