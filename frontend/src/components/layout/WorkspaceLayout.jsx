import React from 'react';
import { RefreshCw } from 'lucide-react';
import NavigationRail from '../NavigationRail';
import StorageHero from '../StorageHero';
import FileExplorer from '../FileExplorer';
import MemberSidebar from '../MemberSidebar';

export default function WorkspaceLayout({
  toastMessage,
  blockingOverlay,
  myRooms,
  activeRoomId,
  setActiveRoomId,
  activeRoom,
  storageData,
  roomMembers,
  loadingDashboard,
  loadingRooms,
  currentUser,
  fileItems,
  breadcrumbs,
  loadingFiles,
  searchQuery,
  setSearchQuery,
  isMobileMembersOpen,
  setIsMobileMembersOpen,
  modalState,
  fileHandlers
}) {
  const {
    setIsCreateJoinModalOpen,
    setIsAllocateModalOpen,
    setIsProfileModalOpen,
    setIsUploadModalOpen,
    setIsNewFolderModalOpen,
    setIsRenameModalOpen,
    setIsMoveModalOpen,
    setIsInfoDrawerOpen,
    setIsPreviewModalOpen,
    setIsConfirmDeleteModalOpen,
    setFileToRename,
    setFileToMove,
    setFileForInfo,
    setFileToPreview,
    setFileToDelete
  } = modalState;

  const {
    handleNavigateBreadcrumb,
    handleNavigateFolder,
    handleDownloadFile
  } = fileHandlers;

  return (
    <div className="app-shell">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="toast-banner">
          {toastMessage.includes('Preparing & downloading') && (
            <RefreshCw className="animate-spin" size={16} color="var(--emerald-primary)" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Navigation Rail */}
      <NavigationRail
        rooms={myRooms}
        loading={loadingRooms}
        activeRoomId={activeRoomId}
        onSelectRoom={(id) => setActiveRoomId(id)}
        onOpenCreateJoinModal={() => setIsCreateJoinModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        currentUser={currentUser}
      />

      {/* Center Main Workspace */}
      <main className="main-workspace">
        <StorageHero
          activeRoom={activeRoom}
          storageData={storageData}
          loading={loadingDashboard}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenAllocateModal={() => setIsAllocateModalOpen(true)}
          onToggleMobileMembers={() => setIsMobileMembersOpen(prev => !prev)}
        />

        <FileExplorer
          activeRoomId={activeRoomId}
          items={fileItems}
          breadcrumbs={breadcrumbs}
          onNavigateBreadcrumb={handleNavigateBreadcrumb}
          onNavigateFolder={handleNavigateFolder}
          onOpenNewFolderModal={() => setIsNewFolderModalOpen(true)}
          onOpenRenameModal={(item) => {
            setFileToRename(item);
            setIsRenameModalOpen(true);
          }}
          onOpenMoveModal={(item) => {
            setFileToMove(item);
            setIsMoveModalOpen(true);
          }}
          onOpenInfoDrawer={(item) => {
            setFileForInfo(item);
            setIsInfoDrawerOpen(true);
          }}
          onOpenPreview={(item) => {
            setFileToPreview(item);
            setIsPreviewModalOpen(true);
          }}
          onDownloadFile={handleDownloadFile}
          onDeleteFile={(item) => {
            setFileToDelete(item);
            setIsConfirmDeleteModalOpen(true);
          }}
          loadingFiles={loadingFiles}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </main>

      {/* Right Member Sidebar */}
      <MemberSidebar
        members={roomMembers}
        loading={loadingDashboard}
        roomOwnerId={activeRoom?.owner_id}
        currentUserId={currentUser?.id}
        isMobileOpen={isMobileMembersOpen}
        onCloseMobile={() => setIsMobileMembersOpen(false)}
      />

      {/* Screen-Wide Blocking Operation Overlay */}
      {blockingOverlay && (
        <div className="blocking-overlay">
          <div className="blocking-overlay-card">
            <RefreshCw className="animate-spin blocking-overlay-icon" size={38} />
            <div className="blocking-overlay-title">{blockingOverlay.title || 'Processing Action'}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '4px 0 8px', fontWeight: 500 }}>
              {blockingOverlay.message}
            </div>
            {blockingOverlay.subtext && (
              <div className="blocking-overlay-subtext">{blockingOverlay.subtext}</div>
            )}
            <div className="blocking-progress-track">
              <div className="blocking-progress-fill" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
