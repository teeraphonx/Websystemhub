import { useState } from 'react';
import { initialAdminBookings } from '../data/adminBookings';
import type { AppState } from '../types';

export const useAppState = (): AppState => {
  const [view, setView] = useState<AppState['view']>('login');
  const [activeUserTab, setActiveUserTab] =
    useState<AppState['activeUserTab']>('home');
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<AppState['selectedCategoryId']>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    desc: '',
  } as AppState['modalState']);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalReservations, setTotalReservations] = useState(0);
  const [userReservations, setUserReservations] = useState(0);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [adminDateFilter, setAdminDateFilter] = useState('');
  const [adminCalendarView, setAdminCalendarView] = useState(new Date());
  const [adminBookings, setAdminBookings] = useState(initialAdminBookings);

  return {
    view,
    setView,
    activeUserTab,
    setActiveUserTab,
    selectedCategoryId,
    setSelectedCategoryId,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    rememberMe,
    setRememberMe,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    modalState,
    setModalState,
    activeUsers,
    setActiveUsers,
    totalReservations,
    setTotalReservations,
    userReservations,
    setUserReservations,
    historyDateFilter,
    setHistoryDateFilter,
    adminDateFilter,
    setAdminDateFilter,
    adminCalendarView,
    setAdminCalendarView,
    adminBookings,
    setAdminBookings,
  };
};
