import prisma from '../config/prisma.js';
import { activeUsers } from '../socket/socket.js';

export const createPoll = async (req, res) => {
    try {
        const { question, options, expiry, anonymous, audience } = req.body;
        const creatorId = req.user.userId;

        // Validation
        if (!question || !options || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({ error: 'Question and at least 2 options are required' });
        }

        const poll = await prisma.poll.create({
            data: {
                question,
                creatorId,
                expiry: expiry ? new Date(expiry) : null,
                anonymous: !!anonymous,
                audience: audience || [], // Store audience as JSON array
                options: {
                    create: options.map(opt => ({ text: opt.text }))
                }
            },
            include: {
                options: true,
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        profilePictureUrl: true
                    }
                }
            }
        });

        // Broadcast to relevant users via Socket.IO
        const io = req.app.get('io');

        // If audience is restricted, only emit to those users
        if (poll.audience && Array.isArray(poll.audience) && poll.audience.length > 0) {
            // Also include creator
            const targetUsers = [...new Set([...poll.audience, creatorId])];

            targetUsers.forEach(userId => {
                // Find all sockets for this user
                // We need to import activeUsers map or use a helper
                // For simplicity, we can emit to a room if we had per-user rooms, 
                // In socket.js we set: socket.join(`user:${socket.userId}`);
                io.to(`user:${userId}`).emit('poll:new', poll);
            });
        } else {
            // Public poll - broadcast to everyone
            io.emit('poll:new', poll);
        }

        res.status(201).json(poll);

    } catch (error) {
        console.error('Create poll error:', error);
        res.status(500).json({ error: 'Failed to create poll' });
    }
};

export const getPolls = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Fetch polls where:
        // 1. Audience is empty/null (Public) OR
        // 2. Audience contains userId OR
        // 3. Current user is the creator
        // Prisma JSON filtering can be tricky, doing raw or application-level filter might be safer for complex JSON arrays
        // For now, let's fetch all active polls and filters, or use raw query if needed.
        // Let's try explicit Prisma many-to-many filtering logic or simple application filtering if dataset is small.
        // Or better: Use Prisma's JSON array containment if DB supports it (Postgres does with @>)

        const polls = await prisma.poll.findMany({
            where: {
                OR: [
                    { audience: { equals: [] } }, // Public
                    { audience: { array_contains: userId } }, // Targeted
                    { creatorId: userId } // Creator always sees
                ]
            },
            include: {
                options: {
                    include: {
                        votes: {
                            include: {
                                user: {
                                    select: {
                                        userId: true,
                                        username: true,
                                        profilePictureUrl: true
                                    }
                                }
                            }
                        }
                    }
                },
                creator: {
                    select: {
                        userId: true,
                        username: true,
                        profilePictureUrl: true
                    }
                },
                votes: true // To check if user voted easily
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform for frontend if needed (e.g. calculate vote counts/percentages)
        const formattedPolls = polls.map(poll => {
            const totalVotes = poll.votes.length;

            return {
                ...poll,
                options: poll.options.map(opt => ({
                    ...opt,
                    votes: opt.votes.length,
                    voters: poll.anonymous ? [] : opt.votes.map(v => v.user.username) // Send voters only if not anonymous
                })),
                userVotedOptionId: poll.votes.find(v => v.userId === userId)?.optionId || null
            };
        });

        res.json(formattedPolls);

    } catch (error) {
        console.error('Get polls error:', error);
        res.status(500).json({ error: 'Failed to fetch polls' });
    }
};

export const votePoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { optionId } = req.body;
        const userId = req.user.userId;

        // Check if poll exists and is open
        const poll = await prisma.poll.findUnique({ where: { pollId } });
        if (!poll) return res.status(404).json({ error: 'Poll not found' });

        if (poll.status !== 'open') return res.status(400).json({ error: 'Poll is closed' });
        if (poll.expiry && new Date() > new Date(poll.expiry)) {
            return res.status(400).json({ error: 'Poll has expired' });
        }

        // Check if user already voted
        const existingVote = await prisma.pollVote.findUnique({
            where: {
                userId_optionId: { userId, optionId } // This specific combo
            }
        });

        // Actually we need to check if user voted ANY option in this poll
        const userVote = await prisma.pollVote.findFirst({
            where: { pollId, userId }
        });

        if (userVote) {
            return res.status(400).json({ error: 'You have already voted in this poll' });
        }

        // Create vote
        const newVote = await prisma.pollVote.create({
            data: {
                pollId,
                optionId,
                userId
            },
            include: {
                user: { select: { username: true } }
            }
        });

        // Emit update
        const io = req.app.get('io');

        // Broadcast update to poll audience
        // For simplicity, broadcasting to everyone or use same logic as create
        const updatePayload = {
            pollId,
            optionId,
            userId,
            username: poll.anonymous ? 'Anonymous' : newVote.user.username
        };

        if (poll.audience && Array.isArray(poll.audience) && poll.audience.length > 0) {
            const targetUsers = [...new Set([...poll.audience, poll.creatorId])];
            targetUsers.forEach(uid => {
                io.to(`user:${uid}`).emit('poll:vote', updatePayload);
            });
        } else {
            io.emit('poll:vote', updatePayload);
        }

        res.json({ success: true, vote: newVote });

    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: 'Failed to vote' });
    }
};
