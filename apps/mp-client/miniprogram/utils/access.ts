export function hasStaffAccess(): boolean {
  const user = wx.getStorageSync('user') as { userType?: string; permissions?: string[] } | undefined;
  return Boolean(
    user?.userType === 'staff'
      || user?.userType === 'assistant'
      || user?.permissions?.includes('staff:brief:read')
      || user?.permissions?.includes('staff:task:update')
  );
}

export function guardStaffAccess(): boolean {
  if (hasStaffAccess()) return true;
  wx.showToast({ title: '员工端需内部账号访问', icon: 'none' });
  setTimeout(() => wx.switchTab({ url: '/pages/profile/index' }), 650);
  return false;
}
