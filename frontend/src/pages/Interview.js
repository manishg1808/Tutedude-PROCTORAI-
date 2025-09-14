import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import VideoProctor from '../components/VideoProctor';
import {
  User,
  Mail,
  Clock,
  Calendar,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Interview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewInterview, setIsNewInterview] = useState(!id);
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: ''
  });

  useEffect(() => {
    if (id) {
      fetchInterviewDetails();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchInterviewDetails = async () => {
    try {
      const response = await axios.get(`/api/interviews/${id}`);
      if (response.data.success) {
        setInterview(response.data.data.interview);
        setIsNewInterview(false);
      }
    } catch (error) {
      console.error('Error fetching interview:', error);
      toast.error('Failed to load interview details');
    } finally {
      setLoading(false);
    }
  };

  const startNewInterview = async () => {
    if (!formData.candidateName || !formData.candidateEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await axios.post('/api/interviews/start', formData);
      if (response.data.success) {
        setInterview(response.data.data.interview);
        setIsNewInterview(false);
        toast.success('Interview started successfully');
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      toast.error('Failed to start interview');
    }
  };

  const endInterview = async () => {
    if (!interview) return;

    try {
      const response = await axios.post(`/api/interviews/${interview.id}/end`);
      if (response.data.success) {
        setInterview(response.data.data.interview);
        toast.success('Interview ended successfully');
        
        // Navigate to reports after ending
        setTimeout(() => {
          navigate('/reports');
        }, 2000);
      }
    } catch (error) {
      console.error('Error ending interview:', error);
      toast.error('Failed to end interview');
    }
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNewInterview ? 'Start New Interview' : 'Interview Session'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isNewInterview 
              ? 'Set up and begin a new proctored interview' 
              : 'Monitor candidate and track proctoring events'
            }
          </p>
        </div>
        
        {interview && interview.status === 'active' && (
          <button
            onClick={endInterview}
            className="btn-danger flex items-center space-x-2"
          >
            <Clock className="w-4 h-4" />
            <span>End Interview</span>
          </button>
        )}
      </div>

      {/* New Interview Form */}
      {isNewInterview && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interview Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Name *
              </label>
              <input
                type="text"
                id="candidateName"
                name="candidateName"
                value={formData.candidateName}
                onChange={handleFormChange}
                className="input-field"
                placeholder="Enter candidate name"
                required
              />
            </div>
            <div>
              <label htmlFor="candidateEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Email *
              </label>
              <input
                type="email"
                id="candidateEmail"
                name="candidateEmail"
                value={formData.candidateEmail}
                onChange={handleFormChange}
                className="input-field"
                placeholder="Enter candidate email"
                required
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={startNewInterview}
              className="btn-primary"
            >
              Start Interview
            </button>
          </div>
        </div>
      )}

      {/* Interview Details */}
      {interview && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Interview Info */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Details</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Candidate</p>
                    <p className="font-medium text-gray-900">{interview.candidateName}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{interview.candidateEmail}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Start Time</p>
                    <p className="font-medium text-gray-900">
                      {new Date(interview.startTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {interview.endTime && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">
                        {interview.duration ? `${Math.floor(interview.duration / 60)}m ${interview.duration % 60}s` : 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  {interview.status === 'active' ? (
                    <AlertTriangle className="w-5 h-5 text-warning-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-success-500" />
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`font-medium capitalize ${
                      interview.status === 'active' ? 'text-warning-600' : 'text-success-600'
                    }`}>
                      {interview.status}
                    </p>
                  </div>
                </div>

                {interview.integrityScore && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Integrity Score</span>
                      <span className={`font-bold ${
                        interview.integrityScore >= 90 ? 'text-success-600' :
                        interview.integrityScore >= 70 ? 'text-warning-600' :
                        'text-danger-600'
                      }`}>
                        {interview.integrityScore}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          interview.integrityScore >= 90 ? 'bg-success-500' :
                          interview.integrityScore >= 70 ? 'bg-warning-500' :
                          'bg-danger-500'
                        }`}
                        style={{ width: `${interview.integrityScore}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/reports')}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Reports</span>
                </button>
                
                {interview.status === 'completed' && (
                  <button
                    onClick={() => window.open(`/api/reports/${interview.id}?format=pdf`, '_blank')}
                    className="w-full btn-secondary flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Report</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Video Proctor */}
          <div className="lg:col-span-3">
            <VideoProctor
              interviewId={interview.id}
              onInterviewEnd={endInterview}
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      {isNewInterview && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interview Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">For Candidates:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Ensure good lighting and clear camera view</li>
                <li>• Keep your face visible throughout the interview</li>
                <li>• Avoid looking away from the screen for extended periods</li>
                <li>• Remove phones, books, and unauthorized devices</li>
                <li>• Stay alert and focused during the session</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">AI Detection Features:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Real-time focus and attention monitoring</li>
                <li>• Mobile phone and device detection</li>
                <li>• Book and note detection</li>
                <li>• Multiple face detection</li>
                <li>• Drowsiness and eye closure detection</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
