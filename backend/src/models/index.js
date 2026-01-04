import User from './User.js';
import Chat from './Chat.js';
import Message from './Message.js';
import ChatMember from './ChatMember.js';

// User <-> Chat (Many-to-Many through ChatMember)
User.belongsToMany(Chat, {
    through: ChatMember,
    foreignKey: 'userId',
    as: 'chats'
});

Chat.belongsToMany(User, {
    through: ChatMember,
    foreignKey: 'chatId',
    as: 'members'
});

// Chat -> User (creator)
Chat.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

// Message -> User (sender)
Message.belongsTo(User, {
    foreignKey: 'senderId',
    as: 'sender'
});

User.hasMany(Message, {
    foreignKey: 'senderId',
    as: 'messages'
});

// Message -> Chat
Message.belongsTo(Chat, {
    foreignKey: 'chatId',
    as: 'chat'
});

Chat.hasMany(Message, {
    foreignKey: 'chatId',
    as: 'messages'
});

// Message -> Message (reply)
Message.belongsTo(Message, {
    foreignKey: 'replyToId',
    as: 'replyTo'
});

// ChatMember associations
ChatMember.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

ChatMember.belongsTo(Chat, {
    foreignKey: 'chatId',
    as: 'chat'
});

ChatMember.belongsTo(Message, {
    foreignKey: 'lastReadMessageId',
    as: 'lastReadMessage'
});

export { User, Chat, Message, ChatMember };
