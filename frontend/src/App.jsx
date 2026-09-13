import React, { useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import AppModals from './components/modals/AppModals';

import { useToast } from './hooks/useToast';
import { useModalState } from './hooks/useModalState';
import { useAuth } from './hooks/useAuth';
import { useRoomData } from './hooks/useRoomData';
import { useFileSystem } from './hooks/useFileSystem';

export default function App() {
  const { toastMessage, showToast, clearToast } = useToast();
  const modalState = useModalState();
  const { resetAllModals, setIsCreateJoinModalOpen } = modalState;

  const {
    appJwt,
    currentUser,
    userNameInput,
    setUserNameInput,
    error,
    setError,
    isAuthenticating,
    handleGoogleAuth,
    handleLogout
  } = useAuth(showToast, clearToast, resetAllModals);

  const {
    myRooms,
    activeRoomId,
    setActiveRoomId,
    activeRoom,
    storageData,
    roomMembers,
    loadingDashboard,
    loadingRooms,
    fetchRoomDashboard,
    handleCreateRoom,
    handleJoinRoom,
    handleAllocateStorage
  } = useRoomData(appJwt, showToast, handleLogout, setError, setIsCreateJoinModalOpen);

  const {
    currentFolderId,
    breadcrumbs,
    fileItems,
    searchQuery,
    setSearchQuery,
    loadingFiles,
    blockingOverlay,
    fetchDirectoryFiles,
    handleDownloadFile,
    handleNavigateFolder,
    handleNavigateBreadcrumb,
    handleCreateFolder,
    handleDeleteFile
  } = useFileSystem(appJwt, activeRoomId, activeRoom, showToast, fetchRoomDashboard);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        resetAllModals();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetAllModals]);

  // If unauthenticated, render AuthScreen
  if (!appJwt) {
    return (
      <AuthScreen
        onGoogleAuth={handleGoogleAuth}
        userNameInput={userNameInput}
        setUserNameInput={setUserNameInput}
        error={error}
        isAuthenticating={isAuthenticating}
      />
    );
  }

  return (
    <>
      <WorkspaceLayout
        toastMessage={toastMessage}
        clearToast={clearToast}
        blockingOverlay={blockingOverlay}
        myRooms={myRooms}
        activeRoomId={activeRoomId}
        setActiveRoomId={setActiveRoomId}
        activeRoom={activeRoom}
        storageData={storageData}
        roomMembers={roomMembers}
        loadingDashboard={loadingDashboard}
        loadingRooms={loadingRooms}
        currentUser={currentUser}
        fileItems={fileItems}
        breadcrumbs={breadcrumbs}
        loadingFiles={loadingFiles}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isMobileMembersOpen={modalState.isMobileMembersOpen}
        setIsMobileMembersOpen={modalState.setIsMobileMembersOpen}
        modalState={modalState}
        fileHandlers={{
          handleNavigateBreadcrumb,
          handleNavigateFolder,
          handleDownloadFile
        }}
      />

      <AppModals
        modalState={modalState}
        activeRoom={activeRoom}
        activeRoomId={activeRoomId}
        currentUser={currentUser}
        currentFolderId={currentFolderId}
        appJwt={appJwt}
        error={error}
        handleCreateRoom={handleCreateRoom}
        handleJoinRoom={handleJoinRoom}
        handleAllocateStorage={handleAllocateStorage}
        fetchDirectoryFiles={fetchDirectoryFiles}
        fetchRoomDashboard={fetchRoomDashboard}
        showToast={showToast}
        handleDownloadFile={handleDownloadFile}
        handleCreateFolder={handleCreateFolder}
        handleDeleteFile={handleDeleteFile}
        handleLogout={handleLogout}
      />
    </>
  );
}
