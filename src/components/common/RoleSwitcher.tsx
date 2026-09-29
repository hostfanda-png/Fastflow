import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  ChevronUp, 
  ChevronDown, 
  ShieldCheck, 
  Store, 
  ChefHat, 
  Bike, 
  UserCheck, 
  ExternalLink 
} from 'lucide-react';
import { UserRole } from '../../types';

interface RoleSwitcherProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ activeView, setActiveView }) => {
  const { currentUser, switchRole, demoUsers } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const roleMeta: Record<UserRole, { label: string; icon: React.ReactNode; defaultView: string; badge: string }> = {
    customer: {
      label: 'Customer Storefront',
      icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
      defaultView: 'storefront',
      badge: 'Diner'
    },
    restaurant_owner: {
      label: 'Restaurant Owner',
      icon: <Store className="w-4 h-4 text-amber-600" />,
      defaultView: 'restaurant_portal',
      badge: 'Merchant'
    },
    restaurant_staff: {
      label: 'Kitchen Staff',
      icon: <ChefHat className="w-4 h-4 text-orange-600" />,
      defaultView: 'restaurant_portal',
      badge: 'Kitchen'
    },
    delivery_rider: {
      label: 'Delivery Courier',
      icon: <Bike className="w-4 h-4 text-sky-600" />,
      defaultView: 'rider_portal',
      badge: 'Dispatch'
    },
    super_admin: {
      label: 'Super Admin Console',
      icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
      defaultView: 'admin_portal',
      badge: 'Admin'
    },
    support_agent: {
      label: 'Support Agent',
      icon: <Users className="w-4 h-4 text-stone-600" />,
      defaultView: 'admin_portal',
      badge: 'Support'
    }
  };

  const handleSelectRole = (role: UserRole) => {
    switchRole(role);
    const targetView = roleMeta[role]?.defaultView || 'storefront';
    setActiveView(targetView);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Expanded Menu */}
      {isOpen && (
        <div className="mb-2 bg-stone-900 text-white rounded-2xl shadow-2xl border border-stone-800 p-3 w-80 backdrop-blur-lg">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-800">
            <div>
              <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                RBAC Simulator
              </span>
              <p className="text-[11px] text-stone-400">Experience marketplace as any role</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-white p-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            {demoUsers.map((user) => {
              const meta = roleMeta[user.role];
              const isCurrent = currentUser.role === user.role;

              return (
                <button
                  key={user.id}
                  onClick={() => handleSelectRole(user.role)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isCurrent
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200'
                      : 'hover:bg-stone-800 text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-1.5 bg-stone-800 rounded-lg">
                      {meta?.icon}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span>{user.name}</span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 truncate">{meta?.label}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-800 text-stone-300 shrink-0">
                    {meta?.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
            <span>Role: <strong className="text-amber-300 capitalize">{currentUser.role.replace('_', ' ')}</strong></span>
            <button 
              onClick={() => {
                if (currentUser.role === 'customer') setActiveView('storefront');
                else if (currentUser.role === 'restaurant_owner' || currentUser.role === 'restaurant_staff') setActiveView('restaurant_portal');
                else if (currentUser.role === 'delivery_rider') setActiveView('rider_portal');
                else if (currentUser.role === 'super_admin') setActiveView('admin_portal');
                setIsOpen(false);
              }}
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Go to View</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Collapsed Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xl border border-stone-700/80 text-xs font-medium transition-all group"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-stone-200">Role:</span>
          <span className="text-amber-400 font-bold capitalize">
            {currentUser.role.replace('_', ' ')}
          </span>
        </span>
        <span className="text-stone-400 group-hover:text-white transition-colors">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </span>
      </button>
    </div>
  );
};
