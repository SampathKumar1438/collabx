import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
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
    senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    messageType: {
        type: DataTypes.ENUM('text', 'image', 'video', 'file', 'audio', 'giphy'),
        defaultValue: 'text',
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fileName: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    replyToId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'messages',
            key: 'id'
        }
    },
    isEdited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    editedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'messages',
    timestamps: true
});

export default Message;
