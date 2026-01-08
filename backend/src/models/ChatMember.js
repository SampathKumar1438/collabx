import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChatMember = sequelize.define('ChatMember', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    chatId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'chats',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member',
        allowNull: false
    },
    joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    lastReadMessageId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'messages',
            key: 'id'
        }
    },
    unreadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    isMuted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'chat_members',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['chat_id', 'user_id']
        }
    ]
});

export default ChatMember;
