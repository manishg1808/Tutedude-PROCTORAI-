const sequelize = require('../config/database');
const User = require('./User');
const Interview = require('./Interview');
const EventLog = require('./EventLog');

// Define associations
User.hasMany(Interview, { foreignKey: 'interviewerId' });
Interview.belongsTo(User, { foreignKey: 'interviewerId' });

Interview.hasMany(EventLog, { foreignKey: 'interviewId' });
EventLog.belongsTo(Interview, { foreignKey: 'interviewId' });

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully');
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Interview,
  EventLog,
  syncDatabase
};
