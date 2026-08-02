import React from 'react';
import { UserProfile } from '../../types';
import { Check, X, UserCheck, ShieldAlert, Phone, Mail, MapPin } from 'lucide-react';

interface PendingRegistrationsViewProps {
  pendingUsers: UserProfile[];
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}

export const PendingRegistrationsView: React.FC<PendingRegistrationsViewProps> = ({
  pendingUsers,
  onApprove,
  onReject
}) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-serif">Pending registrations</h1>
        <p className="text-xs text-gray-500">
          Approve real customers before they can sign in and order. This blocks fake orders.
        </p>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <UserCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <p className="text-gray-800 font-bold">No registrations waiting for approval.</p>
          <p className="text-xs text-gray-400 mt-1">All new user accounts are currently up to date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-2xl p-5 border border-orange-200 shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-gray-900 text-base capitalize">{user.full_name}</h3>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded uppercase">
                    Pending
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                    <Mail className="w-3.5 h-3.5 text-orange-600" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-gray-800">
                    <Phone className="w-3.5 h-3.5 text-orange-600" />
                    <span>{user.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                    <span>{user.hostel_address}</span>
                  </div>
                  {user.created_at && (
                    <p className="text-[10px] text-gray-400 pt-1">Registered: {user.created_at}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons matching video frame 0:31 */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => onApprove(user.id)}
                  className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => onReject(user.id)}
                  className="py-2.5 bg-pink-900 hover:bg-pink-950 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
