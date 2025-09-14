const express = require('express');
const { Interview, EventLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const jsPDF = require('jspdf');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Generate proctoring report
router.get('/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { format = 'json' } = req.query;

    // Get interview details
    const interview = await Interview.findByPk(interviewId, {
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

    if (interview.interviewerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate report data
    const reportData = await generateReportData(interview);

    if (format === 'pdf') {
      const pdfBuffer = await generatePDFReport(reportData);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="proctoring-report-${interviewId}.pdf"`);
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csvPath = await generateCSVReport(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="proctoring-report-${interviewId}.csv"`);
      res.download(csvPath, () => {
        // Clean up temporary file
        fs.unlink(csvPath).catch(console.error);
      });
    } else {
      res.json({
        success: true,
        data: { report: reportData }
      });
    }
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// Get report summary
router.get('/summary/:interviewId', authenticateToken, async (req, res) => {
  try {
    const { interviewId } = req.params;

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

    const events = await EventLog.findAll({
      where: { interviewId },
      order: [['timestamp', 'ASC']]
    });

    const summary = {
      interviewId: interview.id,
      candidateName: interview.candidateName,
      duration: interview.duration || 0,
      integrityScore: interview.integrityScore || 100,
      totalEvents: events.length,
      eventBreakdown: {},
      riskLevel: 'LOW',
      recommendations: []
    };

    // Calculate event breakdown
    events.forEach(event => {
      if (!summary.eventBreakdown[event.eventType]) {
        summary.eventBreakdown[event.eventType] = 0;
      }
      summary.eventBreakdown[event.eventType]++;
    });

    // Determine risk level
    const criticalEvents = summary.eventBreakdown.phone_detected + 
                          summary.eventBreakdown.device_detected + 
                          summary.eventBreakdown.multiple_faces;
    
    if (criticalEvents > 0) {
      summary.riskLevel = 'HIGH';
      summary.recommendations.push('Critical violations detected - manual review required');
    } else if (summary.eventBreakdown.focus_lost > 5) {
      summary.riskLevel = 'MEDIUM';
      summary.recommendations.push('Multiple focus loss incidents - candidate may need additional monitoring');
    }

    if (summary.integrityScore < 70) {
      summary.recommendations.push('Low integrity score - consider additional verification');
    }

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    console.error('Get report summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report summary'
    });
  }
});

// Helper function to generate comprehensive report data
async function generateReportData(interview) {
  const events = interview.EventLogs || [];
  
  // Calculate detailed statistics
  const eventStats = {};
  let totalDeductions = 0;

  events.forEach(event => {
    if (!eventStats[event.eventType]) {
      eventStats[event.eventType] = [];
    }
    eventStats[event.eventType].push(event);

    // Calculate deductions
    switch (event.eventType) {
      case 'focus_lost':
        totalDeductions += 2;
        break;
      case 'phone_detected':
      case 'book_detected':
      case 'device_detected':
      case 'multiple_faces':
        totalDeductions += 5;
        break;
      case 'face_missing':
        totalDeductions += 15;
        break;
    }
  });

  const integrityScore = Math.max(0, 100 - totalDeductions);

  return {
    interview: {
      id: interview.id,
      candidateName: interview.candidateName,
      candidateEmail: interview.candidateEmail,
      startTime: interview.startTime,
      endTime: interview.endTime,
      duration: interview.duration,
      status: interview.status,
      notes: interview.notes
    },
    statistics: {
      totalEvents: events.length,
      integrityScore,
      totalDeductions,
      eventBreakdown: Object.keys(eventStats).reduce((acc, key) => {
        acc[key] = eventStats[key].length;
        return acc;
      }, {})
    },
    events: events.map(event => ({
      id: event.id,
      type: event.eventType,
      description: event.description,
      timestamp: event.timestamp,
      confidence: event.confidence,
      severity: event.severity,
      metadata: event.metadata
    })),
    analysis: {
      riskLevel: integrityScore >= 90 ? 'LOW' : integrityScore >= 70 ? 'MEDIUM' : 'HIGH',
      focusPattern: analyzeFocusPattern(events),
      suspiciousActivity: analyzeSuspiciousActivity(events),
      recommendations: generateRecommendations(eventStats, integrityScore)
    },
    generatedAt: new Date()
  };
}

// Helper function to generate PDF report
async function generatePDFReport(reportData) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Video Proctoring Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Interview ID: ${reportData.interview.id}`, 20, 35);
  doc.text(`Candidate: ${reportData.interview.candidateName}`, 20, 45);
  doc.text(`Date: ${moment(reportData.interview.startTime).format('YYYY-MM-DD HH:mm:ss')}`, 20, 55);
  doc.text(`Duration: ${Math.floor(reportData.interview.duration / 60)} minutes`, 20, 65);
  
  // Statistics
  doc.setFontSize(16);
  doc.text('Interview Statistics', 20, 85);
  
  doc.setFontSize(10);
  doc.text(`Integrity Score: ${reportData.statistics.integrityScore}/100`, 20, 100);
  doc.text(`Total Events: ${reportData.statistics.totalEvents}`, 20, 110);
  doc.text(`Risk Level: ${reportData.analysis.riskLevel}`, 20, 120);
  
  // Event breakdown
  let yPos = 140;
  doc.setFontSize(14);
  doc.text('Event Breakdown', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  Object.entries(reportData.statistics.eventBreakdown).forEach(([eventType, count]) => {
    doc.text(`${eventType.replace('_', ' ').toUpperCase()}: ${count}`, 20, yPos);
    yPos += 8;
  });
  
  // Recommendations
  yPos += 10;
  doc.setFontSize(14);
  doc.text('Recommendations', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  reportData.analysis.recommendations.forEach(recommendation => {
    doc.text(`• ${recommendation}`, 20, yPos);
    yPos += 8;
  });
  
  return doc.output('arraybuffer');
}

// Helper function to generate CSV report
async function generateCSVReport(reportData) {
  const csvPath = path.join(__dirname, '../temp', `report-${reportData.interview.id}-${Date.now()}.csv`);
  
  // Ensure temp directory exists
  await fs.mkdir(path.dirname(csvPath), { recursive: true });
  
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'eventType', title: 'Event Type' },
      { id: 'description', title: 'Description' },
      { id: 'severity', title: 'Severity' },
      { id: 'confidence', title: 'Confidence' }
    ]
  });
  
  const records = reportData.events.map(event => ({
    timestamp: moment(event.timestamp).format('YYYY-MM-DD HH:mm:ss'),
    eventType: event.type,
    description: event.description,
    severity: event.severity,
    confidence: event.confidence
  }));
  
  await csvWriter.writeRecords(records);
  return csvPath;
}

// Helper functions for analysis
function analyzeFocusPattern(events) {
  const focusLostEvents = events.filter(e => e.eventType === 'focus_lost');
  const totalFocusLoss = focusLostEvents.length;
  const avgFocusLoss = totalFocusLoss > 0 ? focusLostEvents.reduce((sum, e) => sum + e.confidence, 0) / totalFocusLoss : 0;
  
  return {
    totalFocusLoss,
    averageConfidence: avgFocusLoss,
    pattern: totalFocusLoss > 10 ? 'FREQUENT' : totalFocusLoss > 5 ? 'MODERATE' : 'MINIMAL'
  };
}

function analyzeSuspiciousActivity(events) {
  const suspiciousEvents = events.filter(e => 
    ['phone_detected', 'book_detected', 'device_detected', 'multiple_faces'].includes(e.eventType)
  );
  
  return {
    totalSuspiciousEvents: suspiciousEvents.length,
    criticalEvents: suspiciousEvents.filter(e => e.severity === 'critical').length,
    riskLevel: suspiciousEvents.length > 3 ? 'HIGH' : suspiciousEvents.length > 1 ? 'MEDIUM' : 'LOW'
  };
}

function generateRecommendations(eventStats, integrityScore) {
  const recommendations = [];
  
  if (integrityScore < 70) {
    recommendations.push('Low integrity score detected - manual review recommended');
  }
  
  if (eventStats.phone_detected?.length > 0) {
    recommendations.push('Mobile phone usage detected - violation of exam rules');
  }
  
  if (eventStats.multiple_faces?.length > 0) {
    recommendations.push('Multiple faces detected - unauthorized person present');
  }
  
  if (eventStats.focus_lost?.length > 10) {
    recommendations.push('Excessive focus loss - candidate attention issues');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('No significant violations detected - interview appears legitimate');
  }
  
  return recommendations;
}

module.exports = router;
