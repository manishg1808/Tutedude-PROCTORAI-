const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  candidateName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  candidateEmail: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  interviewerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'terminated'),
    defaultValue: 'active'
  },
  videoPath: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  integrityScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  totalEvents: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  focusLostCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  suspiciousEventsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'interviews',
  timestamps: true
});

module.exports = Interview;
