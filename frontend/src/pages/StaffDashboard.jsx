import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bars3Icon, XMarkIcon, ClockIcon, CheckCircleIcon,
  DocumentTextIcon, UserGroupIcon, BellIcon, ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon, ChartBarIcon, InboxIcon, UserIcon,
  CheckBadgeIcon, FireIcon, WifiIcon, AcademicCapIcon,
  HomeIcon, WrenchScrewdriverIcon, PencilSquareIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

const API = import.meta.env.VITE_API_URL;

function getToken() { return localStorage.getItem('staffToken'); }

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  return res.json();
}

const PRIORITY_STYLES = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high:   'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low:    'bg-green-100 text-green-700 border-green-300',
};

const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-gray-100 text-gray-700',
};

const CATEGORY_ICONS = {
  'Technical':    <WifiIcon className="h-4 w-4" />,
  'Academic':     <AcademicCapIcon className="h-4 w-4" />,
  'Hostel/Mess':  <HomeIcon className="h-4 w-4" />,
  'Maintenance':  <WrenchScrewdriverIcon className="h-4 w-4" />,
};

function SLABadge({ deadline, status }) {
  if (!deadline) return null;
  if (status === 'resolved' || status === 'closed') return null;

  const diff = new Date(deadline) - new Date();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);

  if (mins < 0) return (
    <div className="relative group">
      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full cursor-help">⚠ Overdue</span>
      <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-56 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
        The 48-hour resolution deadline has passed. Please resolve this complaint immediately.
        <div className="absolute -top-1.5 right-3 w-3 h-3 bg-gray-900 rotate-45" />
      </div>
    </div>
  );

  if (hrs < 4) return (
    <div className="relative group">
      <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full cursor-help">
        ⏱ {hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`} left
      </span>
      <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-52 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
        Less than 4 hours left on the 48h deadline. Act quickly!
        <div className="absolute -top-1.5 right-3 w-3 h-3 bg-gray-900 rotate-45" />
      </div>
    </div>
  );

  return (
    <div className="relative group">
      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full cursor-help">⏱ {hrs}h left</span>
      <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-52 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl">
        {hrs} hour{hrs !== 1 ? 's' : ''} remaining out of the 48h resolution window.
        <div className="absolute -top-1.5 right-3 w-3 h-3 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

function ComplaintCard({ complaint, onSelfAssign, onComplete, showAssign, showComplete }) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const a = complaint.assignment;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-gray-500">{complaint.ticket_id}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[complaint.priority] || ''}`}>
              {complaint.priority?.toUpperCase()}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[complaint.status] || ''}`}>
              {complaint.status?.replace('_', ' ').toUpperCase()}
            </span>
            {a?.is_auto_assigned && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">⚡ Auto-Assigned</span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{complaint.title}</h3>
          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{complaint.description}</p>
        </div>
        <SLABadge deadline={a?.sla_deadline} status={complaint.status} />
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1">
          {CATEGORY_ICONS[complaint.category]}
          {complaint.category}
        </span>
        <span className="flex items-center gap-1">
          <UserIcon className="h-3.5 w-3.5" />
          {complaint.user_name}
        </span>
        {complaint.estimated_completion_time && (
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            Est. {complaint.estimated_completion_time} min
          </span>
        )}
        <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
      </div>

      {a?.staff_name && (
        <div className="text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
          Assigned to: <span className="font-semibold">{a.staff_name}</span>
        </div>
      )}

      {a?.notes && (
        <div className="text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
          Notes: {a.notes}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        {showAssign && (
          <button onClick={() => onSelfAssign(a.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            <CheckBadgeIcon className="h-4 w-4" /> Self Assign
          </button>
        )}
        {showComplete && (
          <>
            <button onClick={() => setShowNotes(p => !p)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              <PencilSquareIcon className="h-4 w-4" /> {showNotes ? 'Hide Notes' : 'Add Notes'}
            </button>
            <button onClick={() => onComplete(a.id, notes)}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors">
              <CheckCircleSolid className="h-4 w-4" /> Mark Resolved
            </button>
          </>
        )}
      </div>

      {showNotes && showComplete && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add resolution notes..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [stats, setStats] = useState(null);
  const [section, setSection] = useState('dashboard');
  const [complaints, setComplaints] = useState([]);
  const [pool, setPool] = useState([]);
  const [myFilter, setMyFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const user = localStorage.getItem('staffUser');
    if (!token || !user) { navigate('/staff-login'); return; }
    setStaff(JSON.parse(user));
  }, [navigate]);

  const fetchStats = useCallback(async () => {
    const data = await apiFetch('/api/staff/stats');
    if (data.success) setStats(data.data);
  }, []);

  const fetchComplaints = useCallback(async (view = 'team') => {
    setLoading(true);
    const data = await apiFetch(`/api/staff/complaints?view=${view}&per_page=50`);
    if (data.success) setComplaints(data.data.complaints);
    setLoading(false);
  }, []);

  const fetchPool = useCallback(async () => {
    setLoading(true);
    const data = await apiFetch('/api/staff/complaints/pool');
    if (data.success) setPool(data.data.complaints);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!staff) return;
    fetchStats();
    setMyFilter('all');
    if (section === 'dashboard') fetchStats();
    else if (section === 'pool') fetchPool();
    else if (section === 'my-complaints') fetchComplaints('mine');
    else if (section === 'team-complaints') fetchComplaints('team');
  }, [section, staff, fetchStats, fetchPool, fetchComplaints]);

  const handleSelfAssign = async (assignmentId) => {
    const data = await apiFetch(`/api/staff/complaints/${assignmentId}/self-assign`, { method: 'PUT' });
    if (data.success) {
      showToast('✅ Complaint assigned to you!');
      fetchPool(); fetchStats();
    } else showToast(`❌ ${data.message}`);
  };

  const handleComplete = async (assignmentId, notes) => {
    const data = await apiFetch(`/api/staff/complaints/${assignmentId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ notes })
    });
    if (data.success) {
      showToast('✅ Complaint marked as resolved!');
      fetchComplaints('mine'); fetchStats();
    } else showToast(`❌ ${data.message}`);
  };

  const handleToggleAvailability = async () => {
    const data = await apiFetch('/api/staff/availability', { method: 'PUT' });
    if (data.success) {
      setStaff(p => ({ ...p, is_available: data.data.is_available }));
      localStorage.setItem('staffUser', JSON.stringify({ ...staff, is_available: data.data.is_available }));
      showToast(data.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffUser');
    navigate('/staff-login');
  };

  const nav = [
    { id: 'dashboard',       label: 'Dashboard',       icon: <ChartBarIcon className="h-5 w-5" /> },
    { id: 'pool',            label: 'Team Pool',        icon: <InboxIcon className="h-5 w-5" /> },
    { id: 'my-complaints',   label: 'My Complaints',    icon: <DocumentTextIcon className="h-5 w-5" /> },
    { id: 'team-complaints', label: 'Team Complaints',  icon: <UserGroupIcon className="h-5 w-5" /> },
  ];

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-900 to-indigo-900 text-white">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-white">Complaint Care</h1>
        <p className="text-blue-300 text-xs mt-0.5">Staff Portal</p>
      </div>

      {staff && (
        <div className="p-4 mx-3 mt-4 bg-white/10 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center font-bold text-blue-900">
              {staff.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{staff.name}</p>
              <p className="text-blue-300 text-xs">{staff.team} · {staff.category_expertise}</p>
            </div>
          </div>
          <button onClick={handleToggleAvailability}
            className={`mt-3 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              staff.is_available ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}>
            {staff.is_available ? '🟢 Available' : '🔴 Unavailable'}
          </button>
        </div>
      )}

      <nav className="flex-1 p-3 mt-2 space-y-1">
        {nav.map(item => (
          <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              section === item.id ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
            }`}>
            {item.icon} {item.label}
            {item.id === 'pool' && stats?.pool_size > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{stats.pool_size}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all">
          <ArrowRightOnRectangleIcon className="h-5 w-5" /> Logout
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (section === 'dashboard') return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {staff?.name?.split(' ')[0]} 👋</h2>
          <p className="text-gray-500 text-sm mt-1">{staff?.team} · {staff?.category_expertise} Specialist</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<InboxIcon className="h-6 w-6 text-blue-600" />} label="Pool (Unassigned)" value={stats?.pool_size} color="bg-blue-100" />
          <StatCard icon={<FireIcon className="h-6 w-6 text-orange-600" />} label="Active" value={stats?.active} color="bg-orange-100" />
          <StatCard icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />} label="Resolved" value={stats?.total_resolved} color="bg-green-100" />
          <StatCard icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />} label="SLA Breached" value={stats?.sla_breached} color="bg-red-100" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Assigned</span>
                <span className="font-bold text-gray-900">{stats?.total_assigned ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-bold text-green-600">{stats?.completed ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Resolution Time</span>
                <span className="font-bold text-blue-600">{stats?.avg_resolution_time ?? 0} min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Load</span>
                <span className="font-bold text-orange-600">{stats?.current_load ?? 0} active</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <p className="text-blue-100 text-sm mb-4">
              {stats?.pool_size > 0 ? `${stats.pool_size} complaint(s) waiting in your team pool.` : 'No pending complaints in pool.'}
            </p>
            <button onClick={() => setSection('pool')}
              className="w-full py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors">
              View Team Pool →
            </button>
          </div>
        </div>
      </div>
    );

    if (section === 'pool') return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Pool</h2>
            <p className="text-gray-500 text-sm">Unassigned complaints — self-assign to take ownership</p>
          </div>
          <button onClick={fetchPool} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>

        {/* Capacity indicator */}
        {stats && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            stats.active >= 2
              ? 'bg-red-50 border-red-200 text-red-700'
              : stats.active === 1
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <span className="text-lg">{stats.active >= 2 ? '🔴' : stats.active === 1 ? '🟡' : '🟢'}</span>
            <span>
              Your capacity: <strong>{stats.active} / 2</strong> active complaints
              {stats.active >= 2 ? ' — Resolve one before self-assigning more.' : ' — You can take more complaints.'}
            </span>
          </div>
        )}

        {loading ? <LoadingSpinner /> : pool.length === 0 ? <EmptyState msg="No complaints in pool" /> : (
          <div className="space-y-3">
            {pool.map(c => (
              <ComplaintCard key={c.id} complaint={c} onSelfAssign={handleSelfAssign}
                showAssign={c.status !== 'resolved' && c.status !== 'closed' && stats?.active < 2}
                showComplete={false} />
            ))}
          </div>
        )}
      </div>
    );

    if (section === 'my-complaints') {
      const filtered = complaints.filter(c => {
        if (myFilter === 'active') return c.status !== 'resolved' && c.status !== 'closed';
        if (myFilter === 'completed') return c.status === 'resolved' || c.status === 'closed';
        return true;
      });

      const quickTasks = filtered.filter(c => c.assignment?.is_auto_assigned);
      const regularTasks = filtered.filter(c => !c.assignment?.is_auto_assigned);

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Complaints</h2>
              <p className="text-gray-500 text-sm">Complaints assigned to you</p>
            </div>
            <button onClick={() => fetchComplaints('mine')} className="text-sm text-blue-600 hover:underline">Refresh</button>
          </div>

          {/* Filter tabs */}
          {complaints.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {['all', 'active', 'completed'].map(f => (
                <button key={f} onClick={() => setMyFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    myFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-1.5 text-xs opacity-75">
                    ({f === 'all' ? complaints.length
                      : f === 'active' ? complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length
                      : complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length})
                  </span>
                </button>
              ))}
            </div>
          )}

          {loading ? <LoadingSpinner /> : complaints.length === 0 ? <EmptyState msg="No complaints assigned to you" /> : (
            <div className="space-y-6">

              {/* Quick Tasks */}
              {quickTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                      ⚡ Quick Tasks
                      <span className="bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{quickTasks.length}</span>
                    </span>
                    <span className="text-xs text-gray-400">Auto-assigned · estimated ≤ 30 min</span>
                  </div>
                  <div className="space-y-3 border-l-2 border-purple-200 pl-4">
                    {quickTasks.map(c => (
                      <ComplaintCard key={c.id} complaint={c} onComplete={handleComplete}
                        showAssign={false}
                        showComplete={c.status !== 'resolved' && c.status !== 'closed'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Tasks */}
              {regularTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                      📋 Regular Tasks
                      <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{regularTasks.length}</span>
                    </span>
                    <span className="text-xs text-gray-400">Standard assignment</span>
                  </div>
                  <div className="space-y-3 border-l-2 border-blue-200 pl-4">
                    {regularTasks.map(c => (
                      <ComplaintCard key={c.id} complaint={c} onComplete={handleComplete}
                        showAssign={false}
                        showComplete={c.status !== 'resolved' && c.status !== 'closed'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty filtered state */}
              {quickTasks.length === 0 && regularTasks.length === 0 && (
                <EmptyState msg={`No ${myFilter} complaints`} />
              )}
            </div>
          )}
        </div>
      );
    }

    if (section === 'team-complaints') return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Complaints</h2>
            <p className="text-gray-500 text-sm">All complaints for your team</p>
          </div>
          <button onClick={() => fetchComplaints('team')} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {loading ? <LoadingSpinner /> : complaints.length === 0 ? <EmptyState msg="No complaints for your team" /> : (
          <div className="space-y-3">
            {complaints.map(c => (
              <ComplaintCard key={c.id} complaint={c} showAssign={false} showComplete={false} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 z-50"><Sidebar /></div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-72 lg:flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              staff?.is_available ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${staff?.is_available ? 'bg-blue-500' : 'bg-gray-400'}`} />
              {staff?.is_available ? 'Available' : 'Unavailable'}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <InboxIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}
