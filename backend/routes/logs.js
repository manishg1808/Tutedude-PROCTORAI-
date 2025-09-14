const express = require('express');
const { EventLog, Interview } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validateEventLog } = require('../middleware/validation');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

// Log new event
router.post('/', authenticateToken, validateEventLog, async (req, res) => {
  try {
    const { interviewId, eventType, description, timestamp, confidence, metadata } = req.body;

    // Verify interview exists and user has access
    const interview = await Interview.findByPk(interviewId);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    if (interview.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Determine severity based on event type
    let severity = 'medium';
    if (['multiple_faces', 'face_missing'].includes(eventType)) {
      severity = 'high';
    } else if (['focus_lost', 'drowsiness_detected'].includes(eventType)) {
      severity = 'low';
    } else if (['phone_detected', 'book_detected', 'device_detected'].includes(eventType)) {
      severity = 'critical';
    }

    const eventLog = await EventLog.create({
      interviewId,
      eventType,
      description,
      timestamp: new Date(timestamp),
      confidence: confidence || 0.8,
      severity,
      metadata: metadata || {}
    });

    // Update interview statistics
    await updateInterviewStats(interviewId);

    // Send WhatsApp alert for critical events
    if (eventLog.severity === 'critical' || eventLog.severity === 'high') {
      try {
        const alertData = {
          eventType: eventLog.eventType,
          description: eventLog.description,
          severity: eventLog.severity,
          timestamp: eventLog.timestamp
        };

        const alertResult = await whatsappService.sendAlert(alertData);
        
        if (alertResult.success) {
          console.log('WhatsApp alert sent for critical event');
        }
      } catch (error) {
        console.error('Error sending WhatsApp alert:', error);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Event logged successfully',
      data: { eventLog }
    });
  } catch (error) {
    console.error('Log event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log event'
    });
  }
});

// Get events for an interview
router.get('/interview/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { page = 1, limit = 50, eventType } = req.query;
    const offset = (page - 1) * limit;

    // Verify interview exists and user has access
    const interview = await Interview.findByPk(interviewId);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    if (interview.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const whereClause = { interviewId };
    if (eventType) {
      whereClause.eventType = eventType;
    }

    const { count, rows: events } = await EventLog.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

// Get real-time events (last 5 minutes)
router.get('/realtime/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;

    // Verify interview exists and user has access
    const interview = await Interview.findByPk(interviewId);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    if (interview.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const events = await EventLog.findAll({
      where: {
        interviewId,
        timestamp: {
          [require('sequelize').Op.gte]: fiveMinutesAgo
        }
      },
      order: [['timestamp', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    console.error('Get real-time events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time events'
    });
  }
});

// Get event statistics for an interview
router.get('/stats/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;

    // Verify interview exists and user has access
    const interview = await Interview.findByPk(interviewId);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    if (interview.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await EventLog.findAll({
      where: { interviewId },
      attributes: [
        'eventType',
        [require('sequelize').fn('COUNT', require('sequelize').col('eventType')), 'count'],
        [require('sequelize').fn('AVG', require('sequelize').col('confidence')), 'avgConfidence']
      ],
      group: ['eventType'],
      raw: true
    });

    const eventCounts = {};
    let totalEvents = 0;

    stats.forEach(stat => {
      eventCounts[stat.eventType] = {
        count: parseInt(stat.count),
        avgConfidence: parseFloat(stat.avgConfidence)
      };
      totalEvents += parseInt(stat.count);
    });

    res.json({
      success: true,
      data: {
        eventCounts,
        totalEvents,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Get event stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event statistics'
    });
  }
});

// Helper function to update interview statistics
async function updateInterviewStats(interviewId) {
  try {
    const events = await EventLog.findAll({
      where: { interviewId }
    });

    let focusLostCount = 0;
    let suspiciousEventsCount = 0;

    events.forEach(event => {
      if (event.eventType === 'focus_lost') {
        focusLostCount++;
      } else if (['phone_detected', 'book_detected', 'device_detected', 'multiple_faces'].includes(event.eventType)) {
        suspiciousEventsCount++;
      }
    });

    await Interview.update(
      {
        totalEvents: events.length,
        focusLostCount,
        suspiciousEventsCount
      },
      { where: { id: interviewId } }
    );
  } catch (error) {
    console.error('Update interview stats error:', error);
  }
}

module.exports = router;
