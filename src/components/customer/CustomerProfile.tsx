import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { customerApi } from '../../services/api/customerApi';
import { User, MapPin, Plus, Trash2, Mail, Phone, ShieldCheck, Check, KeyRound, Edit3 } from 'lucide-react';

export const CustomerProfile: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    savedAddresses,
    addSavedAddress,
    deleteSavedAddress,
    setDefaultSavedAddress,
    showToast,
    openAuthModal,
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('Gulberg III');
  const [city, setCity] = useState('Lahore');
  const [instructions, setInstructions] = useState('');
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Profile Edit State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim()) return;

    setIsSubmittingAddress(true);
    try {
      await addSavedAddress({
        label,
        recipient_name: recipientName.trim() || currentUser.name,
        phone: phone.trim() || currentUser.phone,
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        delivery_instructions: instructions.trim() || undefined,
      });
      setShowAddModal(false);
      setStreet('');
      setRecipientName('');
      setPhone('');
      setInstructions('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save address', 'error');
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setIsSavingProfile(true);
    try {
      const res = await customerApi.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      if (res.success && res.data) {
        if (currentUser) {
          setCurrentUser({ ...currentUser, name: res.data.name, phone: res.data.phone || '' });
        }
        setShowEditProfile(false);
        showToast('Profile details updated successfully', 'success');
      } else {
        showToast(res.message || 'Failed to update profile', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await customerApi.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      if (res.success) {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password updated successfully', 'success');
      } else {
        showToast(res.message || 'Failed to update password', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update password', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Customer Profile</h1>
          <p className="text-xs text-stone-500">Manage personal contact info and delivery coordinates</p>
        </div>
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
            Verified {currentUser.role.replace('_', ' ')}
          </span>

          <div className="mt-6 w-full space-y-3 pt-6 border-t border-stone-100 text-left text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="truncate">{currentUser.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-stone-400 shrink-0" />
              <span>{currentUser.phone || 'No phone set'}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Verified Account</span>
            </div>
          </div>

          <div className="mt-6 w-full flex flex-col gap-2 pt-4 border-t border-stone-100">
            <button
              onClick={() => {
                setEditName(currentUser.name);
                setEditPhone(currentUser.phone || '');
                setShowEditProfile(true);
              }}
              className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full py-2 px-3 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
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
              onClick={() => {
                setRecipientName(currentUser.name);
                setPhone(currentUser.phone || '');
                setShowAddModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Address</span>
            </button>
          </div>

          {savedAddresses.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-stone-200 rounded-2xl">
              <MapPin className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500">No delivery addresses saved yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-colors ${
                    addr.isDefault
                      ? 'border-amber-400 bg-amber-50/40'
                      : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-xl text-amber-600 border border-stone-200 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                        {addr.recipient_name && addr.recipient_name !== currentUser.name && (
                          <span className="text-[10px] text-stone-500">({addr.recipient_name})</span>
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => setDefaultSavedAddress(addr.id)}
                        className="text-[11px] font-semibold text-stone-600 hover:text-amber-700 px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                        title="Set as Default Address"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => deleteSavedAddress(addr.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      label === lbl ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient Name"
                  className="text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contact Phone"
                  className="text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
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
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area"
                  className="text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Courier instructions (e.g. Ring bell, gate code 2910)"
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddress}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmittingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">Edit Account Profile</h3>
            <p className="text-xs text-stone-500 mb-4">Update your display name and contact phone number</p>

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">Change Password</h3>
            <p className="text-xs text-stone-500 mb-4">Enter current password and choose a secure new password</p>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
