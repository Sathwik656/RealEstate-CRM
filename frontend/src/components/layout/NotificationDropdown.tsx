import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Building2, 
  Users, 
  Handshake, 
  ClipboardCheck, 
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';

interface NotificationDropdownProps {
  triggerClassName?: string;
  iconSize?: number;
}

export function NotificationDropdown({ 
  triggerClassName, 
  iconSize = 18 
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=30');
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15s
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-notifications'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationRoute = (notif: any) => {
    switch (notif.type) {
      case 'PROPERTY_CREATED':
        return '/properties';
      case 'AGENT_INTERESTED':
        return '/allotments';
      case 'PROPERTY_ASSIGNED':
        return '/deals';
      case 'DEAL_COMPLETED':
        return '/deal-approvals';
      case 'DEAL_APPROVED':
        return '/deals';
      default:
        return '/dashboard';
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markAsRead.mutate(notif._id);
    }
    setIsOpen(false);
    
    const targetUrl = notif.url && notif.url !== '/' ? notif.url : getNotificationRoute(notif);
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const renderIcon = (notif: any) => {
    switch (notif.type) {
      case 'PROPERTY_CREATED':
        return (
          <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} />
          </div>
        );
      case 'AGENT_INTERESTED':
        return (
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users size={18} />
          </div>
        );
      case 'PROPERTY_ASSIGNED':
        return (
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck size={18} />
          </div>
        );
      case 'DEAL_COMPLETED':
        return (
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Handshake size={18} />
          </div>
        );
      case 'DEAL_APPROVED':
        return (
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
            <Bell size={18} />
          </div>
        );
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 45) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName || "btn-icon hover:bg-slate-100 hover:text-slate-900 relative p-2.5 rounded-xl border border-transparent transition-all flex items-center justify-center"}
        aria-label="Notifications"
      >
        <Bell size={iconSize} className="text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-bold text-[10px] rounded-full border-2 border-white flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[75vh] font-sans animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <h3 className="font-display font-bold text-sm text-slate-900 truncate">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                  className="text-[10px] sm:text-[11px] font-semibold text-[#B5923E] hover:text-[#96772E] transition-colors flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 active:scale-95 whitespace-nowrap flex-shrink-0"
                >
                  <CheckCheck size={13} className="flex-shrink-0" />
                  <span>Mark all read</span>
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Notification List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 bg-slate-50/50">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-14 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
                  <Sparkles size={24} className="text-[#B5923E]" />
                </div>
                <p className="text-sm font-bold text-slate-800">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                  You're all caught up! New updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif: any) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={clsx(
                    'p-3.5 transition-all duration-150 cursor-pointer flex gap-3 items-start relative',
                    notif.isRead
                      ? 'bg-white hover:bg-slate-50/80 text-slate-600'
                      : 'bg-[#FFFDF9] hover:bg-[#FFF9EE] border-l-4 border-l-[#B5923E]'
                  )}
                >
                  {/* Icon */}
                  {renderIcon(notif)}

                  {/* Notification Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p className={clsx("text-xs font-bold truncate", notif.isRead ? "text-slate-700" : "text-slate-900")}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className={clsx("text-xs leading-relaxed whitespace-pre-line break-words", notif.isRead ? "text-slate-500" : "text-slate-700 font-medium")}>
                      {notif.body}
                    </p>
                  </div>

                  {/* Unread Dot Indicator */}
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-[#B5923E] flex-shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-white flex-shrink-0 flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-medium">Recent Activity</span>
            <span className="text-[10px] text-slate-400 font-medium">{notifications.length} item{notifications.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
