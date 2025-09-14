const express = require('express');
const { Interview, EventLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateInterviewStart } = require('../middleware/validation');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

// Start new interview
router.post('/start', authenticateToken, validateInterviewStart, async (req, res) => {
  try {
    const { candidateName, candidateEmail, notes } = req.body;

    const interview = await Interview.create({
      candidateName,
      candidateEmail,
      interviewerId: req.user.id,
      startTime: new Date(),
      status: 'active',
      notes: notes || null
    });

    res.status(201).json({
      success: true,
      message: 'Interview started successfully',
      data: { interview }
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start interview'
    });
  }
});

// End interview
router.post('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const interview = await Interview.findByPk(id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Check if user owns this interview
    if (interview.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - interview.startTime) / 1000);

    // Calculate integrity score
    const events = await EventLog.findAll({
      where: { interviewId: id }
    });

    let focusLostCount = 0;
    let suspiciousEventsCount = 0;
    let totalDeductions = 0;

    events.forEach(event => {
      if (event.eventType === 'focus_lost') {
        focusLostCount++;
        totalDeductions += 2;
      } else if (['phone_detected', 'book_detected', 'device_detected', 'multiple_faces'].includes(event.eventType)) {
        suspiciousEventsCount++;
        totalDeductions += 5;
      } else if (event.eventType === 'face_missing') {
        totalDeductions += 15;
      }
    });

    const integrityScore = Math.max(0, 100 - totalDeductions);

    await interview.update({
      endTime,
      duration,
      status: 'completed',
      integrityScore,
      totalEvents: events.length,
      focusLostCount,
      suspiciousEventsCount,
      notes: notes || interview.notes
    });

    // Send WhatsApp notification with interview report
    try {
      const interviewData = {
        candidateName: interview.candidateName,
        candidateEmail: interview.candidateEmail,
        integrityScore,
        duration,
        totalEvents: events.length,
        focusLostCount,
        suspiciousEventsCount,
        endTime
      };

      const whatsappResult = await whatsappService.sendInterviewReport(interviewData);
      
      if (whatsappResult.success) {
        console.log('WhatsApp notification sent successfully');
        console.log('WhatsApp URL:', whatsappResult.whatsappUrl);
      } else {
        console.error('Failed to send WhatsApp notification:', whatsappResult.error);
      }
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }

    res.json({
      success: true,
      message: 'Interview ended successfully',
      data: { 
        interview,
        whatsappSent: true
      }
    });
  } catch (error) {
    console.error('End interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end interview'
    });
  }
});

// Get interview details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findByPk(id, {
      include: [
        {
          model: EventLog,
          order: [['timestamp', 'ASC']]
        }
      ]
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Check if user owns this interview
    if (interview.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { interview }
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview details'
    });
  }
});

// Get all interviews for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { interviewerId: req.user.id };
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: interviews } = await Interview.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        interviews,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews'
    });
  }
});

// Get active interviews
router.get('/active/current', authenticateToken, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      where: {
        interviewerId: req.user.id,
        status: 'active'
      },
      order: [['startTime', 'DESC']]
    });

    res.json({
      success: true,
      data: { interview }
    });
  } catch (error) {
    console.error('Get active interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active interview'
    });
  }
});

module.exports = router;
