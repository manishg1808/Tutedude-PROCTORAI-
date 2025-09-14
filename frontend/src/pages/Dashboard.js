import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus,
  Video,
  FileText,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Smartphone,
  Book,
  UserX
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalInterviews: 0,
    activeInterviews: 0,
    completedInterviews: 0,
    avgIntegrityScore: 0
  });
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [interviewsResponse] = await Promise.all([
        axios.get('/api/interviews?limit=5')
      ]);

      if (interviewsResponse.data.success) {
        const interviews = interviewsResponse.data.data.interviews;
        setRecentInterviews(interviews);

        // Calculate stats
        const totalInterviews = interviews.length;
        const activeInterviews = interviews.filter(i => i.status === 'active').length;
        const completedInterviews = interviews.filter(i => i.status === 'completed').length;
        const avgIntegrityScore = completedInterviews > 0 
          ? interviews.filter(i => i.integrityScore).reduce((sum, i) => sum + i.integrityScore, 0) / completedInterviews
          : 0;

        setStats({
          totalInterviews,
          activeInterviews,
          completedInterviews,
          avgIntegrityScore: Math.round(avgIntegrityScore)
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewInterview = () => {
    navigate('/interview');
  };

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
    if (score >= 90) return 'text-success-600 bg-success-50';
    if (score >= 70) return 'text-warning-600 bg-warning-50';
    return 'text-danger-600 bg-danger-50';
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
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
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

  const QuickActionCard = ({ title, description, icon: Icon, onClick, color }) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card p-6 text-left hover:shadow-medium transition-all duration-200 group"
    >
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </motion.button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your interviews and proctoring activities</p>
        </div>
        <button
          onClick={startNewInterview}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Start Interview</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Interviews"
          value={stats.totalInterviews}
          icon={Video}
          color="bg-primary-100 text-primary-600"
          trend="All time"
        />
        <StatCard
          title="Active Interviews"
          value={stats.activeInterviews}
          icon={Clock}
          color="bg-warning-100 text-warning-600"
          trend="Currently running"
        />
        <StatCard
          title="Completed"
          value={stats.completedInterviews}
          icon={CheckCircle}
          color="bg-success-100 text-success-600"
          trend="Successfully finished"
        />
        <StatCard
          title="Avg Integrity Score"
          value={stats.avgIntegrityScore}
          icon={TrendingUp}
          color="bg-secondary-100 text-secondary-600"
          trend="Quality metric"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickActionCard
            title="Start New Interview"
            description="Begin a new proctored interview session"
            icon={Video}
            onClick={startNewInterview}
            color="bg-primary-600"
          />
          <QuickActionCard
            title="View Reports"
            description="Access detailed proctoring reports"
            icon={FileText}
            onClick={() => navigate('/reports')}
            color="bg-secondary-600"
          />
          <QuickActionCard
            title="Manage Interviews"
            description="View and manage all interview sessions"
            icon={Users}
            onClick={() => navigate('/interviews')}
            color="bg-success-600"
          />
        </div>
      </div>

      {/* Recent Interviews */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Interviews</h2>
          <button
            onClick={() => navigate('/reports')}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View all
          </button>
        </div>

        <div className="card overflow-hidden">
          {recentInterviews.length === 0 ? (
            <div className="p-8 text-center">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews yet</h3>
              <p className="text-gray-600 mb-4">Start your first proctored interview to see it here.</p>
              <button
                onClick={startNewInterview}
                className="btn-primary"
              >
                Start Interview
              </button>
            </div>
          ) : (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentInterviews.map((interview) => (
                    <motion.tr
                      key={interview.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/interview/${interview.id}`)}
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detection Features */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">AI Detection Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6 text-center">
            <Eye className="w-8 h-8 text-primary-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Focus Detection</h3>
            <p className="text-sm text-gray-600">Eye tracking and attention monitoring</p>
          </div>
          <div className="card p-6 text-center">
            <Smartphone className="w-8 h-8 text-danger-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Phone Detection</h3>
            <p className="text-sm text-gray-600">Real-time mobile device detection</p>
          </div>
          <div className="card p-6 text-center">
            <Book className="w-8 h-8 text-warning-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Notes Detection</h3>
            <p className="text-sm text-gray-600">Books and paper notes identification</p>
          </div>
          <div className="card p-6 text-center">
            <UserX className="w-8 h-8 text-secondary-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Multiple Faces</h3>
            <p className="text-sm text-gray-600">Unauthorized person detection</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
