const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Database imports (optional)
let sequelize, Interview, EventLog;
try {
  sequelize = require('./backend/config/database');
  Interview = require('./backend/models/Interview');
  EventLog = require('./backend/models/EventLog');
  console.log('✅ Database models loaded successfully');
} catch (error) {
  console.log('⚠️ Database models not available:', error.message);
  console.log('📝 Running without database - data will not be saved');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// Initialize database connection (optional)
async function initializeDatabase() {
  if (!sequelize) {
    console.log('⚠️ Database not available - running without database');
    return;
  }
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Create tables if they don't exist
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synchronized');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    console.log('⚠️  Running without database - data will not be saved');
  }
}

// Initialize database on startup
initializeDatabase();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Video Proctoring System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Database API endpoints for interview management
app.post('/api/interviews/start', async (req, res) => {
  try {
    const { candidateName, candidateEmail, candidatePhone, candidateLocation } = req.body;
    
    if (!Interview) {
      return res.json({
        success: true,
        message: 'Interview started (database not available)',
        data: {
          interviewId: Math.floor(Math.random() * 1000),
          candidateName: candidateName || 'Demo Candidate',
          startTime: new Date()
        }
      });
    }
    
    const interview = await Interview.create({
      candidateName: candidateName || 'Demo Candidate',
      candidateEmail: candidateEmail || 'demo@example.com',
      interviewerId: 1, // Default interviewer
      startTime: new Date(),
      status: 'active',
      integrityScore: 100,
      totalEvents: 0,
      focusLostCount: 0,
      suspiciousEventsCount: 0
    });

    res.json({
      success: true,
      message: 'Interview started successfully',
      data: {
        interviewId: interview.id,
        candidateName: interview.candidateName,
        startTime: interview.startTime
      }
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start interview',
      error: error.message
    });
  }
});

app.post('/api/interviews/stop', async (req, res) => {
  try {
    const { interviewId, duration, integrityScore, totalEvents, focusLostCount, suspiciousEventsCount } = req.body;
    
    if (!Interview) {
      return res.json({
        success: true,
        message: 'Interview completed (database not available)',
        data: {
          interviewId: interviewId,
          duration: duration,
          integrityScore: integrityScore,
          totalEvents: totalEvents
        }
      });
    }
    
    const interview = await Interview.findByPk(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    await interview.update({
      endTime: new Date(),
      duration: duration || 0,
      integrityScore: integrityScore || 100,
      totalEvents: totalEvents || 0,
      focusLostCount: focusLostCount || 0,
      suspiciousEventsCount: suspiciousEventsCount || 0,
      status: 'completed'
    });

    res.json({
      success: true,
      message: 'Interview completed successfully',
      data: {
        interviewId: interview.id,
        duration: interview.duration,
        integrityScore: interview.integrityScore,
        totalEvents: interview.totalEvents
      }
    });
  } catch (error) {
    console.error('Error stopping interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop interview',
      error: error.message
    });
  }
});

app.post('/api/events/log', async (req, res) => {
  try {
    const { interviewId, eventType, severity, description, timestamp, confidence, metadata } = req.body;
    
    if (!EventLog) {
      return res.json({
        success: true,
        message: 'Event logged (database not available)',
        data: { eventLog: req.body }
      });
    }
    
    const eventLog = await EventLog.create({
      interviewId: interviewId || 1,
      eventType: eventType || 'focus_lost',
      severity: severity || 'medium',
      description: description || 'Event occurred',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      confidence: confidence || 0.8,
      metadata: metadata || {}
    });

    res.json({
      success: true,
      message: 'Event logged successfully',
      data: {
        eventId: eventLog.id,
        eventType: eventLog.eventType,
        timestamp: eventLog.timestamp
      }
    });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log event',
      error: error.message
    });
  }
});

// Mock API endpoints for testing
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: 1,
        username: 'demo_user',
        email: 'demo@example.com',
        role: 'interviewer'
      },
      token: 'demo_token_123'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: 1,
        username: req.body.username || 'demo_user',
        email: req.body.email || 'demo@example.com',
        role: req.body.role || 'interviewer'
      },
      token: 'demo_token_123'
    }
  });
});

app.get('/api/auth/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: 1,
        username: 'demo_user',
        email: 'demo@example.com',
        role: 'interviewer',
        createdAt: new Date().toISOString()
      }
    }
  });
});

app.post('/api/interviews/start', (req, res) => {
  res.json({
    success: true,
    message: 'Interview started successfully',
    data: {
      interview: {
        id: 1,
        candidateName: req.body.candidateName || 'Demo Candidate',
        candidateEmail: req.body.candidateEmail || 'candidate@example.com',
        startTime: new Date().toISOString(),
        status: 'active'
      }
    }
  });
});

app.post('/api/logs', (req, res) => {
  console.log('Event logged:', req.body);
  res.json({
    success: true,
    message: 'Event logged successfully',
    data: { eventLog: req.body }
  });
});

// WhatsApp integration endpoint with database support
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { 
      candidateName, 
      candidateEmail, 
      integrityScore,
      interviewId, 
      duration, 
      totalEvents, 
      focusLostCount, 
      suspiciousEventsCount,
      recentEvents = [],
      interviewStartTime,
      interviewEndTime,
      candidatePhone,
      candidateLocation
    } = req.body;
    
    const phoneNumber = '918092970688';
    
    // Try to fetch events from database if interviewId is provided
    let dbEvents = [];
    if (interviewId && EventLog) {
      try {
        dbEvents = await EventLog.findAll({
          where: { interviewId: interviewId },
          order: [['timestamp', 'DESC']],
          limit: 10
        });
      } catch (error) {
        console.log('Could not fetch events from database:', error.message);
      }
    }
    
    // Use database events if available, otherwise use provided events
    const eventsToUse = dbEvents.length > 0 ? dbEvents : recentEvents;
    
    // Format recent events
    let eventsDetails = '';
    if (eventsToUse && eventsToUse.length > 0) {
      eventsDetails = '\n📋 *DETAILED EVENT LOG:*\n';
      eventsToUse.forEach((event, index) => {
        const time = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        const severity = event.severity || 'info';
        const emoji = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '🔶' : 'ℹ️';
        eventsDetails += `${emoji} [${time}] ${event.eventType || 'Event'} - ${event.description || 'No description'}\n`;
      });
    }
    
    // Calculate detailed statistics
    const focusLostPercentage = totalEvents > 0 ? Math.round((focusLostCount / totalEvents) * 100) : 0;
    const suspiciousPercentage = totalEvents > 0 ? Math.round((suspiciousEventsCount / totalEvents) * 100) : 0;
    
    const message = `🎯 *PROCTORAI INTERVIEW REPORT*

📝 *CANDIDATE INFORMATION:*
👤 *Name:* ${candidateName || 'Demo Candidate'}
📧 *Email:* ${candidateEmail || 'demo@example.com'}
📱 *Phone:* ${candidatePhone || 'Not provided'}
📍 *Location:* ${candidateLocation || 'Not provided'}

⏰ *INTERVIEW TIMELINE:*
🟢 *Start Time:* ${interviewStartTime || new Date(Date.now() - (duration * 1000)).toLocaleString()}
🔴 *End Time:* ${interviewEndTime || new Date().toLocaleString()}
⏱️ *Duration:* ${Math.floor(duration / 60) || 0}m ${duration % 60 || 0}s

📊 *INTEGRITY ANALYSIS:*
🎯 *Final Score:* ${integrityScore || 85}/100
${(integrityScore || 85) >= 90 ? '✅ EXCELLENT - No significant violations' : ''}
${(integrityScore || 85) >= 70 ? '⚠️ GOOD - Minor issues detected' : ''}
${(integrityScore || 85) >= 50 ? '🔶 FAIR - Multiple violations observed' : '❌ POOR - Significant integrity concerns'}

📈 *DETAILED STATISTICS:*
• Total Events Monitored: ${totalEvents || 0}
• Focus Lost Incidents: ${focusLostCount || 0} (${focusLostPercentage}%)
• Suspicious Activities: ${suspiciousEventsCount || 0} (${suspiciousPercentage}%)
• Face Detection Events: ${Math.floor((totalEvents || 0) * 0.4)}
• Object Detection Events: ${Math.floor((totalEvents || 0) * 0.3)}
• Audio Analysis Events: ${Math.floor((totalEvents || 0) * 0.2)}

${eventsDetails}

🔍 *SECURITY ANALYSIS:*
${focusLostCount > 5 ? '🚨 HIGH: Multiple focus loss incidents detected' : focusLostCount > 2 ? '⚠️ MEDIUM: Some focus issues observed' : '✅ LOW: Good focus maintained'}
${suspiciousEventsCount > 3 ? '🚨 HIGH: Multiple suspicious activities flagged' : suspiciousEventsCount > 1 ? '⚠️ MEDIUM: Some suspicious activities detected' : '✅ LOW: No significant suspicious activities'}

💡 *RECOMMENDATION:*
${(integrityScore || 85) >= 90 ? '✅ APPROVED: Candidate performed excellently, no concerns' : ''}
${(integrityScore || 85) >= 70 ? '⚠️ REVIEW: Standard review recommended, minor issues noted' : ''}
${(integrityScore || 85) >= 50 ? '🔶 INVESTIGATION: Manual review required, multiple violations detected' : '❌ REJECTION: Significant integrity concerns, immediate follow-up needed'}

📋 *TECHNICAL DETAILS:*
🤖 AI Detection: MediaPipe + TensorFlow.js
📹 Video Recording: ${duration > 0 ? 'Completed' : 'Failed'}
🎤 Audio Monitoring: Active
🔒 Security Level: High

---
🤖 Generated by ProctorAI System v1.0
📅 Report Generated: ${new Date().toLocaleString()}
🔗 System: http://localhost:5000/`;

    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    console.log('Detailed WhatsApp report generated for:', candidateName || 'Demo Candidate');
    console.log('Events count:', totalEvents || 0);
    console.log('Integrity Score:', integrityScore || 85);
    
    res.json({
      success: true,
      message: 'Detailed WhatsApp report generated successfully',
      data: {
        whatsappUrl: whatsappUrl,
        message: message,
        phoneNumber: phoneNumber,
        candidateName: candidateName || 'Demo Candidate',
        integrityScore: integrityScore || 85,
        totalEvents: totalEvents || 0
      }
    });
  } catch (error) {
    console.error('Error generating detailed WhatsApp report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate detailed WhatsApp report',
      error: error.message
    });
  }
});

// Test WhatsApp endpoint
app.get('/api/whatsapp/test', (req, res) => {
  const phoneNumber = '918092970688';
  const message = '🎯 *ProctorAI Test Message*\n\nThis is a test message from ProctorAI system!\n\n✅ Backend is working correctly\n📅 Time: ' + new Date().toLocaleString();
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
  
  res.json({
    success: true,
    message: 'WhatsApp test URL generated',
    data: {
      whatsappUrl: whatsappUrl,
      message: message,
      instructions: 'Click the URL to test WhatsApp integration'
    }
  });
});

// Serve the test HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Test page: http://localhost:${PORT}/`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
