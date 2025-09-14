import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Download,
  FileText,
  Eye,
  Calendar,
  Clock,
  User,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Book,
  Monitor,
  UserX,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Reports = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const response = await axios.get('/api/interviews?limit=50');
      if (response.data.success) {
        setInterviews(response.data.data.interviews);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewDetails = async (interviewId) => {
    try {
      const response = await axios.get(`/api/interviews/${interviewId}`);
      if (response.data.success) {
        setSelectedInterview(response.data.data.interview);
      }
    } catch (error) {
      console.error('Error fetching interview details:', error);
      toast.error('Failed to load interview details');
    }
  };

  const downloadReport = async (interviewId, format = 'pdf') => {
    try {
      const response = await axios.get(`/api/reports/${interviewId}?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `interview-report-${interviewId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Report downloaded successfully`);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         interview.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || interview.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedInterviews = [...filteredInterviews].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'createdAt' || sortBy === 'startTime') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-warning-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'terminated':
        return <AlertTriangle className="w-4 h-4 text-danger-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getIntegrityScoreColor = (score) => {
    if (!score) return 'text-gray-500 bg-gray-100';
    if (score >= 90) return 'text-success-600 bg-success-50';
    if (score >= 70) return 'text-warning-600 bg-warning-50';
    return 'text-danger-600 bg-danger-50';
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'focus_lost':
        return <Eye className="w-4 h-4 text-warning-500" />;
      case 'phone_detected':
        return <Smartphone className="w-4 h-4 text-danger-500" />;
      case 'book_detected':
        return <Book className="w-4 h-4 text-warning-500" />;
      case 'device_detected':
        return <Monitor className="w-4 h-4 text-warning-500" />;
      case 'multiple_faces':
        return <UserX className="w-4 h-4 text-danger-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Reports</h1>
          <p className="text-gray-600 mt-1">View and analyze proctoring reports</p>
        </div>
        <button
          onClick={() => navigate('/interview')}
          className="btn-primary"
        >
          Start New Interview
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Interviews"
          value={interviews.length}
          icon={FileText}
          color="bg-primary-100 text-primary-600"
          subtitle="All time"
        />
        <StatCard
          title="Completed"
          value={interviews.filter(i => i.status === 'completed').length}
          icon={CheckCircle}
          color="bg-success-100 text-success-600"
          subtitle="Successfully finished"
        />
        <StatCard
          title="Active"
          value={interviews.filter(i => i.status === 'active').length}
          icon={Clock}
          color="bg-warning-100 text-warning-600"
          subtitle="Currently running"
        />
        <StatCard
          title="Avg Score"
          value={Math.round(
            interviews
              .filter(i => i.integrityScore)
              .reduce((sum, i) => sum + i.integrityScore, 0) / 
            interviews.filter(i => i.integrityScore).length || 0
          )}
          icon={TrendingUp}
          color="bg-secondary-100 text-secondary-600"
          subtitle="Integrity score"
        />
      </div>

      {/* Filters and Search */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-full sm:w-64"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="terminated">Terminated</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field"
              >
                <option value="createdAt">Sort by Date</option>
                <option value="candidateName">Sort by Name</option>
                <option value="integrityScore">Sort by Score</option>
                <option value="duration">Sort by Duration</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="btn-secondary"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Interviews Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Integrity Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedInterviews.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
                    <p className="text-gray-600 mb-4">No interviews match your search criteria.</p>
                    <button
                      onClick={() => navigate('/interview')}
                      className="btn-primary"
                    >
                      Start Interview
                    </button>
                  </td>
                </tr>
              ) : (
                sortedInterviews.map((interview) => (
                  <motion.tr
                    key={interview.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {interview.candidateName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interview.candidateEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(interview.status)}
                        <span className="text-sm text-gray-900 capitalize">
                          {interview.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {interview.duration ? `${Math.floor(interview.duration / 60)}m ${interview.duration % 60}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.integrityScore ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIntegrityScoreColor(interview.integrityScore)}`}>
                          {interview.integrityScore}/100
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {interview.totalEvents || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => fetchInterviewDetails(interview.id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View
                      </button>
                      {interview.status === 'completed' && (
                        <>
                          <button
                            onClick={() => downloadReport(interview.id, 'pdf')}
                            className="text-secondary-600 hover:text-secondary-900"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => downloadReport(interview.id, 'csv')}
                            className="text-secondary-600 hover:text-secondary-900"
                          >
                            CSV
                          </button>
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interview Details Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Interview Details - {selectedInterview.candidateName}
              </h3>
              <button
                onClick={() => setSelectedInterview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Candidate</label>
                  <p className="text-sm text-gray-900">{selectedInterview.candidateName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-sm text-gray-900">{selectedInterview.candidateEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Start Time</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedInterview.startTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="text-sm text-gray-900">
                    {selectedInterview.duration ? `${Math.floor(selectedInterview.duration / 60)}m ${selectedInterview.duration % 60}s` : 'N/A'}
                  </p>
                </div>
              </div>
              
              {selectedInterview.EventLogs && selectedInterview.EventLogs.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Event Log</label>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {selectedInterview.EventLogs.slice(0, 10).map((event, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                        {getEventIcon(event.eventType)}
                        <span className="text-sm text-gray-900">{event.description}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setSelectedInterview(null)}
                className="btn-secondary"
              >
                Close
              </button>
              {selectedInterview.status === 'completed' && (
                <button
                  onClick={() => downloadReport(selectedInterview.id, 'pdf')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
