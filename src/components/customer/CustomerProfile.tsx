import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Address } from '../../types';
import { User, MapPin, Plus, Trash2, Mail, Phone, ShieldCheck, Check } from 'lucide-react';

export const CustomerProfile: React.FC = () => {
  const { currentUser, savedAddresses, addSavedAddress, showToast, openAuthModal } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('Gulberg III');
  const [city, setCity] = useState('Lahore');
  const [instructions, setInstructions] = useState('');

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <User className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Sign in to view your profile</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            Manage your saved delivery coordinates, contact details, and account preferences.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim()) return;

    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      label,
      street: street.trim(),
      area,
      city,
      lat: 31.5204 + (Math.random() - 0.5) * 0.02,
      lng: 74.3587 + (Math.random() - 0.5) * 0.02,
      deliveryInstructions: instructions
    };

    addSavedAddress(newAddr);
    setShowAddModal(false);
    setStreet('');
    setInstructions('');
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Customer Profile</h1>
        <p className="text-xs text-stone-500">Manage personal contact info and delivery coordinates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col items-center text-center">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-stone-100 border-2 border-amber-500 mb-4 shadow-sm">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120'}
              alt={currentUser.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <h2 className="text-base font-bold text-stone-900">{currentUser.name}</h2>
          <span className="text-xs text-amber-600 font-semibold mt-0.5 capitalize">
            Verified {currentUser.role}
          </span>

          <div className="mt-6 w-full space-y-3 pt-6 border-t border-stone-100 text-left text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-stone-400" />
              <span className="truncate">{currentUser.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-stone-400" />
              <span>{currentUser.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Two-Factor Authentication Active</span>
            </div>
          </div>
        </div>

        {/* Saved Addresses Section */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">Saved Delivery Addresses</h3>
              <p className="text-xs text-stone-500">Used for fast 1-click checkout and zone verification</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Address</span>
            </button>
          </div>

          <div className="space-y-3">
            {savedAddresses.map((addr) => (
              <div
                key={addr.id}
                className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-xl text-amber-600 border border-stone-200 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-stone-600 leading-snug">
                      {addr.street}, {addr.area}, {addr.city}
                    </p>
                    {addr.deliveryInstructions && (
                      <p className="mt-1 text-[11px] text-amber-800 italic">
                        "{addr.deliveryInstructions}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">Add Delivery Location</h3>
            <p className="text-xs text-stone-500 mb-4">Enter street details and delivery note</p>

            <form onSubmit={handleSaveAddress} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                  <button
                    type="button"
                    key={lbl}
                    onClick={() => setLabel(lbl)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      label === lbl ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="House / Flat #, Building, Street..."
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area"
                  className="text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Courier instructions (e.g. Ring bell, gate code 2910)"
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl resize-none"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
