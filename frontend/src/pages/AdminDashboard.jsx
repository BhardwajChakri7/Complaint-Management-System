import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import {
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  PaperClipIcon,
  DocumentTextIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowRightOnRectangleIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  CogIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  BellIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filteredComplaints, setFilteredComplaints] = useState([]);

  useEffect(() => {
    if (complaints.length > 0) {
      const filtered = complaints.filter(complaint => {
        const complaintDate = parseISO(complaint.created_at);
        return format(complaintDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
      });
      setFilteredComplaints(filtered);
    }
  }, [selectedDate, complaints]);
  const [adminUser, setAdminUser] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentAttachments, setCurrentAttachments] = useState([]);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = useState(0);
  
  const handleAttachmentClick = (attachments, index) => {
    if (attachments[index].file_type.startsWith('image/')) {
      setCurrentAttachments(attachments.filter(att => att.file_type.startsWith('image/')));
      setCurrentAttachmentIndex(index);
      setPreviewImage(attachments[index].file_url);
      setIsPreviewOpen(true);
    } else {
      window.open(attachments[index].file_url, '_blank');
    }
  };
  
  const handlePrevImage = useCallback(() => {
    const newIndex = (currentAttachmentIndex - 1 + currentAttachments.length) % currentAttachments.length;
    setCurrentAttachmentIndex(newIndex);
    setPreviewImage(currentAttachments[newIndex].file_url);
  }, [currentAttachmentIndex, currentAttachments]);
  
  const handleNextImage = useCallback(() => {
    const newIndex = (currentAttachmentIndex + 1) % currentAttachments.length;
    setCurrentAttachmentIndex(newIndex);
    setPreviewImage(currentAttachments[newIndex].file_url);
  }, [currentAttachmentIndex, currentAttachments]);
  
  const handleKeyPress = useCallback((e) => {
    if (!isPreviewOpen) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        handlePrevImage();
        break;
      case 'ArrowRight':
        handleNextImage();
        break;
      case 'Escape':
        setIsPreviewOpen(false);
        break;
      default:
        break;
    }
  }, [isPreviewOpen, handlePrevImage, handleNextImage]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const fetchStats = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        navigate('/admin-login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/stats`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (response.status === 401) {
        // Token is invalid or expired
        console.error('Admin token expired or invalid');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin-login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Failed to fetch stats:', data.message);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchComplaints = async (status = null) => {
    setLoadingData(true);
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        navigate('/admin-login');
        return;
      }

      let url = `${import.meta.env.VITE_API_URL}/api/complaints/all?per_page=500`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (response.status === 401) {
        // Token is invalid or expired
        console.error('Admin token expired or invalid');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin-login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setComplaints(data.data.complaints);
      } else {
        setError(data.message || 'Failed to fetch complaints');
      }
    } catch (error) {
      setError('Failed to fetch complaints');
      console.error('Error fetching complaints:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // First useEffect - always called
  useEffect(() => {
    // Check for admin authentication
    const adminToken = localStorage.getItem('adminToken');
    const adminUserData = localStorage.getItem('adminUser');
    
    if (!adminToken || !adminUserData) {
      navigate('/admin-login');
      return;
    }

    try {
      const userData = JSON.parse(adminUserData);
      setAdminUser(userData);
    } catch (error) {
      console.error('Error parsing admin user data:', error);
      navigate('/admin-login');
    }
  }, [navigate]);

  // Second useEffect - always called
  useEffect(() => {
    if (adminUser) {
      fetchStats();
      if (activeSection === 'all-complaints' || activeSection === 'dashboard') {
        fetchComplaints();
      } else if (activeSection === 'staff') {
        fetchStaffData();
        fetchComplaints();
      } else if (activeSection === 'feedback') {
        fetchFeedbacks();
      }
    }
  }, [activeSection, adminUser]);

  const [staffData, setStaffData] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);

  const fetchStaffData = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/staff/all`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await response.json();
      if (data.success) setStaffData(data.data.staff);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/feedbacks`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setFeedbacks(data.data.feedbacks);
        setFeedbackStats({ total: data.data.total, avg_rating: data.data.avg_rating });
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin-login');
  };

  const navigation = [
    { name: 'Dashboard',      icon: ChartBarIcon,    href: 'dashboard',      current: activeSection === 'dashboard' },
    { name: 'All Complaints', icon: DocumentTextIcon, href: 'all-complaints', current: activeSection === 'all-complaints' },
    { name: 'Staff',          icon: UserGroupIcon,   href: 'staff',          current: activeSection === 'staff' },
    { name: 'Feedback',       icon: ChatBubbleLeftRightIcon, href: 'feedback', current: activeSection === 'feedback' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'resolved': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const updateComplaintStatus = async (complaintId, newStatus, adminResponse = '') => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        navigate('/admin-login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/complaints/${complaintId}/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          status: newStatus,
          admin_response: adminResponse
        })
      });

      if (response.status === 401) {
        // Token is invalid or expired
        console.error('Admin token expired or invalid');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin-login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Refresh complaints list
        fetchComplaints();
        fetchStats();
        return true;
      } else {
        setError(data.message || 'Failed to update status');
        return false;
      }
    } catch (error) {
      setError('Failed to update complaint status');
      return false;
    }
  };

  // Show loading state while checking auth
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Calendar Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Complaint Calendar</h2>
                  <p className="text-gray-600">View complaints by date</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="rounded-xl overflow-hidden shadow-sm border border-purple-100">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 border-b border-purple-100">
                    <h4 className="text-sm font-medium text-white">Select Date</h4>
                  </div>
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                    className="w-full p-4 border-none focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white/90"
                  />
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl overflow-hidden shadow-sm border border-purple-100">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-3 border-b border-purple-100">
                    <h4 className="text-sm font-medium text-white">{format(selectedDate, 'MMMM d, yyyy')}</h4>
                  </div>
                  {filteredComplaints.length === 0 ? (
                    <div className="flex items-center justify-center h-20 bg-white/90 p-4">
                      <p className="text-gray-500">No complaints for this date</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-20 bg-white/90 p-4">
                      <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-3 rounded-full border border-red-200">
                        <p className="text-red-600 font-semibold text-lg">{filteredComplaints.length} complaints found</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Welcome Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Welcome, {adminUser?.name}!</h2>
                  <p className="text-gray-600">Admin Dashboard - Manage complaints and users</p>
                </div>
              </div>

              {/* Admin Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">{adminUser?.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{adminUser?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <ShieldCheckIcon className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium text-gray-900 capitalize">admin</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Complaint Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                      <div>
                        <p className="text-sm text-gray-600">Total Complaints</p>
                        <p className="text-xl font-bold text-gray-900">{stats.total_complaints}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(255, 196, 0)' }}></div>
                      <div>
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-xl font-bold text-gray-900">{stats.status_stats.pending}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(79, 70, 229)' }}></div>
                      <div>
                        <p className="text-sm text-gray-600">In Progress</p>
                        <p className="text-xl font-bold text-gray-900">{stats.status_stats.in_progress}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'rgb(16, 185, 129)' }}></div>
                      <div>
                        <p className="text-sm text-gray-600">Resolved</p>
                        <p className="text-xl font-bold text-gray-900">{stats.status_stats.resolved}</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-64">
                    <Pie 
                      data={{
                        labels: ['Pending', 'In Progress', 'Resolved'],
                        datasets: [
                          {
                            label: 'Complaints',
                            data: [
                              stats.status_stats.pending,
                              stats.status_stats.in_progress,
                              stats.status_stats.resolved
                            ],
                            backgroundColor: [
                               'rgba(255, 196, 0, 0.8)',    // brighter yellow for pending
                               'rgba(79, 70, 229, 0.8)',    // brighter indigo for in progress
                               'rgba(16, 185, 129, 0.8)',   // brighter green for resolved
                             ],
                             borderColor: [
                               'rgba(255, 196, 0, 1)',
                               'rgba(79, 70, 229, 1)',
                               'rgba(16, 185, 129, 1)',
                             ],
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                       maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                          },
                          title: {
                            display: true,
                            text: 'Complaint Status Distribution'
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recent Complaints */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Recent Complaints</h3>
                <button
                  onClick={() => setActiveSection('all-complaints')}
                  className="text-purple-600 hover:text-purple-700 text-sm font-medium cursor-pointer"
                >
                  View all
                </button>
              </div>
              
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Loading complaints...</span>
                </div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No complaints found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints.slice(0, 5).map((complaint) => (
                    <div key={complaint.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{complaint.title}</h4>
                            <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {complaint.ticket_id}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{complaint.description.substring(0, 100)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(complaint.status)}`}>
                          {complaint.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => setActiveSection('all-complaints')}
                          className="text-purple-600 hover:text-purple-700 cursor-pointer"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'all-complaints':
      case 'pending':
      case 'in-progress':
      case 'resolved':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">All Complaints</h2>
                <p className="text-gray-500 text-sm mt-1">{complaints.length} complaints found</p>
              </div>

              {/* Bulk Start Progress button - only when pending complaints exist */}
              {complaints.some(c => c.status === 'pending') && (
                <button
                  onClick={async () => {
                    const pending = complaints.filter(c => c.status === 'pending');
                    for (const c of pending) {
                      await updateComplaintStatus(c.id, 'in_progress');
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md whitespace-nowrap"
                >
                  <CogIcon className="h-4 w-4" />
                  Start All Pending ({complaints.filter(c => c.status === 'pending').length})
                </button>
              )}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All',         value: 'all',        color: 'bg-gray-700 text-white',       inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                { label: 'Pending',     value: 'pending',    color: 'bg-yellow-500 text-white',     inactive: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
                { label: 'In Progress', value: 'in_progress',color: 'bg-indigo-600 text-white',     inactive: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                { label: 'Resolved',    value: 'resolved',   color: 'bg-emerald-600 text-white',    inactive: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
              ].map(tab => {
                const count = tab.value === 'all'
                  ? complaints.length
                  : complaints.filter(c => c.status === tab.value).length;
                const isActive = adminStatusFilter === tab.value;
                return (
                  <button key={tab.value}
                    onClick={() => setAdminStatusFilter(tab.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? tab.color : tab.inactive}`}>
                    {tab.label}
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/30' : 'bg-black/10'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Complaints List - Horizontal Layout */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Loading complaints...</span>
                </div>
              ) : complaints.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No complaints found</h3>
                  <p className="text-gray-600">No complaints match the current filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {complaints.filter(c => adminStatusFilter === 'all' || c.status === adminStatusFilter).map((complaint) => (
                    <div key={complaint.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col h-full">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-base font-semibold text-gray-900 truncate">{complaint.title}</h4>
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {complaint.ticket_id}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{complaint.description}</p>
                        
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(complaint.status)}`}>
                            {complaint.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(complaint.priority)}`}>
                            {complaint.priority}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 mb-3">
                          <div>Created: {formatDate(complaint.created_at)}</div>
                          {complaint.resolved_at && (
                            <div>Resolved: {formatDate(complaint.resolved_at)}</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto">
                        {complaint.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              // Add loading state to the button
                              const button = e.target;
                              const originalText = button.innerHTML;
                              button.innerHTML = '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Processing...</div>';
                              button.disabled = true;
                              
                              // Call the update function
                              updateComplaintStatus(complaint.id, 'in_progress')
                                .finally(() => {
                                  // Reset button state if needed (though the component will likely re-render)
                                  button.innerHTML = originalText;
                                  button.disabled = false;
                                });
                            }}
                            className="w-full px-3 py-2 text-sm text-white rounded-lg transition-colors cursor-pointer hover:opacity-90" style={{ backgroundColor: 'rgb(79, 70, 229)' }}
                          >
                            Start Progress
                          </button>
                        )}
                        {complaint.status === 'in_progress' && (
                          <button
                            onClick={(e) => {
                              // Add loading state to the button
                              const button = e.target;
                              const originalText = button.innerHTML;
                              button.innerHTML = '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Processing...</div>';
                              button.disabled = true;
                              
                              // Call the update function
                              updateComplaintStatus(complaint.id, 'resolved')
                                .finally(() => {
                                  // Reset button state if needed (though the component will likely re-render)
                                  button.innerHTML = originalText;
                                  button.disabled = false;
                                });
                            }}
                            className="w-full px-3 py-2 text-sm text-white rounded-lg transition-colors cursor-pointer hover:opacity-90" style={{ backgroundColor: 'rgb(16, 185, 129)' }}
                          >
                            Mark Resolved
                          </button>
                        )}
                      </div>
                      

                      {/* Admin Response - Compact */}
                      {complaint.admin_response && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                          <h5 className="font-medium text-blue-900 mb-1">Admin Response:</h5>
                          <p className="text-blue-800 line-clamp-2">{complaint.admin_response}</p>
                        </div>
                      )}

                      {/* Attachments - Compact */}
                      {complaint.attachments && complaint.attachments.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center text-xs font-medium text-gray-700 mb-1">
                            <PaperClipIcon className="h-3 w-3 mr-1" />
                            <span>Attachments: {complaint.attachments.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {complaint.attachments.map((attachment, index) => (
                              <div 
                                key={index} 
                                className={`relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-purple-400 transition-colors ${attachment.file_type.startsWith('image/') ? 'cursor-pointer' : ''}`}
                                onClick={() => handleAttachmentClick(complaint.attachments, index)}
                              >
                                {attachment.file_type.startsWith('image/') ? (
                                  <>
                                    <img
                                      src={attachment.file_url}
                                      alt={attachment.original_filename}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = `
                                          <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                            <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                          </div>
                                        `;
                                      }}
                                    />
                                    <div 
                                      className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center group"
                                    >
                                      <EyeIcon className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full bg-gray-50 hover:bg-gray-100 transition-colors flex flex-col items-center justify-center p-1 cursor-pointer">
                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mb-0.5" />
                                    <span className="text-[8px] text-gray-500 text-center truncate w-full">
                                      {attachment.original_filename.split('.').pop().toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );



      case 'staff': {
        const CATEGORIES = [
          { name: 'Technical',    gradient: 'from-blue-500 to-cyan-500',    bg: 'bg-blue-50',    border: 'border-blue-200',    icon: <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
          { name: 'Academic',     gradient: 'from-purple-500 to-indigo-500', bg: 'bg-purple-50',  border: 'border-purple-200',  icon: <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg> },
          { name: 'Hostel/Mess',  gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50',  border: 'border-orange-200',  icon: <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
          { name: 'Maintenance',  gradient: 'from-green-500 to-teal-500',   bg: 'bg-green-50',   border: 'border-green-200',   icon: <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        ];
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
              <p className="text-gray-500 text-sm mt-1">Staff members grouped by category expertise</p>
            </div>

            {CATEGORIES.map(cat => {
              const catStaff = staffData.filter(s => s.category_expertise === cat.name);
              const catStaffIds = catStaff.map(s => s.id);
              const totalResolved = complaints.filter(c =>
                catStaffIds.includes(c.assignment?.staff_id) &&
                (c.status === 'resolved' || c.status === 'closed')
              ).length;
              const totalActive = complaints.filter(c =>
                catStaffIds.includes(c.assignment?.staff_id) &&
                c.status !== 'resolved' &&
                c.status !== 'closed'
              ).length;
              const available = catStaff.filter(s => s.is_available).length;

              return (
                <div key={cat.name} className={`bg-white rounded-2xl border ${cat.border} shadow-sm p-5`}>
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${cat.gradient} rounded-xl flex items-center justify-center`}>
                        {cat.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{cat.name}</h3>
                        <p className="text-xs text-gray-500">{catStaff.length} staff member{catStaff.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-green-600">{totalResolved}</p>
                        <p className="text-xs text-gray-500">Resolved</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-orange-600">{totalActive}</p>
                        <p className="text-xs text-gray-500">Active</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">{available}/{catStaff.length}</p>
                        <p className="text-xs text-gray-500">Available</p>
                      </div>
                    </div>
                  </div>

                  {catStaff.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No staff assigned to this category</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {catStaff.map(s => {
                        const activeCount = complaints.filter(c =>
                          c.assignment?.staff_id === s.id &&
                          c.status !== 'resolved' && c.status !== 'closed'
                        ).length;
                        const doneCount = complaints.filter(c =>
                          c.assignment?.staff_id === s.id &&
                          (c.status === 'resolved' || c.status === 'closed')
                        ).length;
                        return (
                          <div key={s.id} className={`${cat.bg} rounded-xl p-4 border ${cat.border}`}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-9 h-9 bg-gradient-to-br ${cat.gradient} rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                                {s.name[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm text-gray-900 truncate">{s.name}</p>
                                <p className="text-xs text-gray-500 truncate">{s.team}</p>
                              </div>
                              <span
                                className={`ml-auto w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.is_available ? 'bg-green-500' : 'bg-gray-400'}`}
                                title={s.is_available ? 'Available' : 'Unavailable'}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-center">
                              <div className="bg-white rounded-lg py-1.5">
                                <p className="text-sm font-bold text-orange-600">{activeCount}</p>
                                <p className="text-xs text-gray-400">Active</p>
                              </div>
                              <div className="bg-white rounded-lg py-1.5">
                                <p className="text-sm font-bold text-green-600">{doneCount}</p>
                                <p className="text-xs text-gray-400">Done</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 truncate">{s.email}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {staffData.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <UserGroupIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No staff members found</p>
              </div>
            )}
          </div>
        );
      }

      case 'feedback':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">User Feedback</h2>
                <p className="text-gray-500 text-sm mt-1">Ratings and reviews submitted by users after complaint resolution</p>
              </div>
              <button onClick={fetchFeedbacks} className="text-sm text-purple-600 hover:underline">Refresh</button>
            </div>

            {feedbackStats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">⭐</div>
                  <div>
                    <p className="text-sm text-gray-500">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{feedbackStats.avg_rating} <span className="text-sm font-normal text-gray-400">/ 5</span></p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Feedbacks</p>
                    <p className="text-2xl font-bold text-gray-900">{feedbackStats.total}</p>
                  </div>
                </div>
              </div>
            )}

            {feedbacks.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No feedback submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map(fb => (
                  <div key={fb.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1,2,3,4,5].map(s => (
                              <span key={s} className={`text-lg ${s <= fb.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{fb.rating}/5</span>
                          <span className="text-xs text-gray-400">{new Date(fb.submitted_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {fb.feedback_text && (
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 mb-3">
                            "{fb.feedback_text}"
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{fb.complaint.ticket_id}</span>
                          <span className="text-gray-600 truncate max-w-xs">{fb.complaint.title}</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(fb.complaint.priority)}`}>{fb.complaint.priority}</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{fb.complaint.category}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 flex-shrink-0 space-y-1 min-w-[120px]">
                        <div className="font-semibold text-gray-800">{fb.user?.name}</div>
                        <div className="text-gray-400 capitalize">{fb.user?.role}</div>
                        {fb.staff?.name && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <div className="text-gray-400">Handled by</div>
                            <div className="font-medium text-gray-700">{fb.staff.name}</div>
                            <div className="text-gray-400">{fb.staff.team}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex flex-col">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header - Fixed at top */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 cursor-default"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent ml-4 lg:ml-0">
                Complaint Care Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-gray-700">{adminUser?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar - Fixed position */}
        <div className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-white/90 backdrop-blur-sm transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition duration-300 ease-in-out shadow-xl overflow-y-auto`}>
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 cursor-default"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <nav className="mt-8 px-4 pb-8">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <button
                    onClick={() => { setActiveSection(item.href); setAdminStatusFilter('all'); }}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
                      item.current
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                </li>
              ))}
              
              {/* Logout Button */}
              <li className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 lg:ml-64 overflow-y-auto">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {renderContent()}
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Image Preview Popup */}
        {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setIsPreviewOpen(false)}>
            <div className="absolute inset-0 bg-black opacity-80" />
            <div className="relative z-10 w-full max-w-5xl bg-white rounded-2xl shadow-2xl p-6"
              onClick={e => e.stopPropagation()}>
              <button
                className="absolute top-3 right-3 bg-white rounded-full p-1.5 text-gray-400 hover:text-gray-700 shadow"
                onClick={() => setIsPreviewOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              {previewImage && (
                <div className="mt-2">
                  <div className="relative group">
                    {currentAttachments.length > 1 && (
                      <>
                        <button onClick={handlePrevImage}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg z-10 transition-all opacity-0 group-hover:opacity-100">
                          <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
                        </button>
                        <button onClick={handleNextImage}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg z-10 transition-all opacity-0 group-hover:opacity-100">
                          <ChevronRightIcon className="h-6 w-6 text-gray-600" />
                        </button>
                      </>
                    )}
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="max-w-full max-h-[75vh] object-contain mx-auto rounded-lg shadow-lg"
                      onLoad={() => console.log('Image loaded:', previewImage)}
                    />
                  </div>
                  <div className="mt-4 text-center space-y-1">
                    {currentAttachments.length > 1 && (
                      <p className="text-sm font-medium text-gray-600">
                        Image {currentAttachmentIndex + 1} of {currentAttachments.length}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">Click outside or press ESC to close</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
