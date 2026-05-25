import { BookingDraft, BookingOrder, PaymentResultState, ServicePackage } from '../services/types';

interface AppState {
  pendingBooking?: BookingDraft;
  selectedPackage?: ServicePackage;
  latestOrder?: BookingOrder;
  paymentResult?: PaymentResultState;
}

const STORAGE_KEY = 'business_concierge_state';
let state: AppState = wx.getStorageSync(STORAGE_KEY) || {};
const listeners: Array<(state: AppState) => void> = [];

function commit(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  wx.setStorageSync(STORAGE_KEY, state);
  listeners.forEach(listener => listener(state));
}

export const appStore = {
  getState(): AppState {
    return state;
  },

  subscribe(listener: (state: AppState) => void) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  },

  setPendingBooking(input: BookingDraft) {
    commit({ pendingBooking: input });
  },

  setSelectedPackage(input?: ServicePackage) {
    commit({ selectedPackage: input });
  },

  setLatestOrder(input?: BookingOrder) {
    commit({ latestOrder: input });
  },

  setPaymentResult(input?: PaymentResultState) {
    commit({ paymentResult: input });
  },

  clearDraft() {
    commit({ pendingBooking: undefined, selectedPackage: undefined });
  }
};
