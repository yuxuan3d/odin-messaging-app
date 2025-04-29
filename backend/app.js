const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./generated/prisma'); 
const prisma = new PrismaClient();


require('dotenv').config();

const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true
  }));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: username },
      });

      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      const { password: _, ...userWithoutPassword } = user; // 
      return done(null, userWithoutPassword);

    } catch (err) {
      return done(err); 
    }
  }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        // Fetch user by ID from the database using Prisma
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id, 10) }, // Ensure id is an integer if needed
        });

        if (user) {
            // Remove password before attaching to req.user
            const { password: _, ...userWithoutPassword } = user;
            done(null, userWithoutPassword); // Attach user object (without password) to req.user
        } else {
            done(null, false); // User not found
        }
    } catch (err) {
        done(err);
    }
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { // Provided by Passport
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
}

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'API is working' });
});

app.post('/register', async (req, res,next) => {
    const { username, password, bio } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                bio,
            },
        });

        const { password: _, ...newUser } = user
        res.status(201).json(newUser)
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).json({ message: 'Error creating user' });
    }
})

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) { return res.status(401).json({ message: info.message || 'Login failed' }); }

    req.logIn(user, (err) => { // Establish session
      if (err) { return next(err); }
      return res.json({ message: 'Login successful', user: user });
    });

  })(req, res, next);
});

app.post('/logout', (req, res, next) => {
    req.logout(function(err) { // req.logout requires a callback function
        if (err) { return next(err); }
        req.session.destroy((err) => { // Optional: explicitly destroy session data
            if (err) {
               console.error("Session destruction error:", err);
            }
            res.clearCookie('connect.sid'); // Optional: clear session cookie
            res.json({ message: 'Logout successful' });
        });
    });
});

app.get('/profile', isAuthenticated, (req, res) => {
    res.json({ message: 'This is a protected profile route', user: req.user });
});

app.get('/recent', isAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const userId = req.user.id;

    try {
        const latestReceived = await prisma.message.groupBy({
            by: ['senderId'], // Group by who sent it
            where: { receiverId: userId }, // Where current user received
            _max: { createdAt: true },
        });

        // 2. Latest time user SENT a message to each receiver
        const latestSent = await prisma.message.groupBy({
            by: ['receiverId'], // Group by who received it
            where: { senderId: userId }, // Where current user sent
            _max: { createdAt: true },
        });

        const latestInteractionTimes = new Map(); // Map<partnerId, latestTimestamp>

        latestReceived.forEach(group => {
            latestInteractionTimes.set(group.senderId, group._max.createdAt);
        });

        latestSent.forEach(group => {
            const partnerId = group.receiverId;
            const currentLatest = latestInteractionTimes.get(partnerId);
            if (!currentLatest || group._max.createdAt > currentLatest) {
                // Update if this sent message is later than the latest received from them
                latestInteractionTimes.set(partnerId, group._max.createdAt);
            }
        });

        if (latestInteractionTimes.size === 0) {
            return res.json([]); // No interactions found
        }

        const finalWhereConditions = Array.from(latestInteractionTimes.entries())
            .map(([partnerId, timestamp]) => ({
                // Match the exact latest timestamp for this interaction pair
                createdAt: timestamp,
                // Ensure the message is between the correct pair of users
                OR: [
                    { senderId: userId, receiverId: partnerId },
                    { senderId: partnerId, receiverId: userId },
                ],
            }));

            const messages = await prisma.message.findMany({
            where: {
                OR: finalWhereConditions,
            },
            include: {
                sender: { select: { id: true, username: true, bio: true } },
                receiver: { select: { id: true, username: true, bio: true } },
            },
            orderBy: {
                createdAt: 'desc', // Order the final list of conversations by latest message
            },
        });

        res.json(messages);
    
    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ message: 'Error fetching messages' });
    }
})

app.get('/chats/:otherUserId', isAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const userId = req.user.id;

    const otherUserIdParam = req.params.otherUserId;
    const otherUserId = parseInt(otherUserIdParam, 10);
    if (isNaN(otherUserId)) {
        return res.status(400).json({ message: 'Invalid user ID parameter.' });
    }
    if (otherUserId === userId) {
        return res.status(400).json({ message: 'Cannot fetch chat with yourself.' });
    }

    const limitParam = req.query.limit || '30'; // Default limit
    const limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit <= 0 || limit > 100) { // Set a max limit
        return res.status(400).json({ message: 'Invalid limit parameter (must be 1-100).' });
    }

    const cursorParam = req.query.cursor; // Cursor is optional (for the first page)
    const cursor = cursorParam ? parseInt(cursorParam, 10) : undefined;
    if (cursorParam && isNaN(cursor)) {
        return res.status(400).json({ message: 'Invalid cursor parameter.' });
    }

    try {
        const messages = await prisma.message.findMany({
            where: {
                // Messages between the logged-in user and the other user
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId },
                ],
            },
            include: {
                sender: { select: { id: true, username: true } },
                receiver: { select: { id: true, username: true } },
            },
            orderBy: {
                createdAt: 'desc', // Get newest messages first
                // id: 'desc' // Secondary sort for stable cursor pagination if timestamps aren't unique
            },
            take: limit + 1, // Fetch one extra to check for more pages
            cursor: cursor ? { id: cursor } : undefined, // Use message ID as cursor
            skip: cursor ? 1 : 0, // Skip the cursor item itself if provided
        });
    
        let nextCursor = null;
        if (messages.length > limit) {
            // Remove the extra message used for checking
            const nextMessage = messages.pop();
            nextCursor = nextMessage.id;
        }
        res.json({
            messages, // The actual page of messages
            nextCursor, // ID to use for the next request, null if no more pages
        });
    } catch (err) {
        console.error(`Error fetching chat for user ${userId} with ${otherUserId}:`, err);
        res.status(500).json({ message: 'Error fetching chat messages' });
    }
});

app.post('/messages', isAuthenticated, async (req, res) => {
    if (!req.body.content || !req.body.receiverId) {
        return res.status(400).json({ message: 'Content and receiver ID are required.' });
    }

    const { content, receiverId } = req.body;
    const receiverUserId = parseInt(receiverId, 10);
    try {
        const message = await prisma.message.create({
            data: {
                content,
                senderId: req.user.id,
                receiverId: receiverUserId,
            },
            include: {
                sender: { select: { id: true, username: true } },
                receiver: { select: { id: true, username: true } },
            },
        });
        res.status(201).json(message);
    } catch (err) {
        console.error("Error creating message:", err);
        res.status(500).json({ message: 'Error creating message' });
    }
})

app.put('/bio', isAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const userId = req.user.id;
    const { bio } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { bio },
        });
        res.json(updatedUser);
    } catch (err) {
        console.error("Error updating user bio:", err);
        res.status(500).json({ message: 'Error updating user bio' });
    }
})

app.get('/users/search', isAuthenticated, async (req, res) => {
    const loggedinUserId = req.user.id;
    const usernameToSearch = req.query.username;

    if (!usernameToSearch || typeof usernameToSearch !== 'string' || usernameToSearch.trim() === '') {
        return res.status(400).json({ message: 'Invalid username parameter.' });
    }

    try {
        const foundUser = await prisma.user.findUnique({
            where: { username: usernameToSearch },
            select: {
                id: true,
                username: true,
                bio: true,
            },
        });

       if (!foundUser) {
           return res.status(404).json({ message: 'User not found.' });
       }

       if (foundUser.id === loggedinUserId) {
            return res.status(404).json({ message: 'Cannot add yourself' });
        }

        res.json(foundUser);
    } catch (err) {
        console.error("Error searching for user:", err);
        res.status(500).json({ message: 'Error searching for user' });
    }
})

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;