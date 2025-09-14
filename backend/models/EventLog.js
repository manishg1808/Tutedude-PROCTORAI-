const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EventLog = sequelize.define('EventLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  interviewId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'interviews',
      key: 'id'
    }
  },
  eventType: {
    type: DataTypes.ENUM(
      'focus_lost',
      'face_missing',
      'multiple_faces',
      'phone_detected',
      'book_detected',
      'device_detected',
      'drowsiness_detected',
      'audio_anomaly',
      'screen_share',
      'tab_switch'
    ),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: {
      min: 0,
      max: 1
    }
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isResolved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'event_logs',
  timestamps: true
});

module.exports = EventLog;
