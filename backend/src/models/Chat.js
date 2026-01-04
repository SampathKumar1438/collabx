import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Chat = sequelize.define('Chat', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    isGroup: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    avatar: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'chats',
    timestamps: true
});

export default Chat;
