import React from 'react';
import { BACKEND_URL } from '../../utils/constants';

import CreateJoinRoomModal from './CreateJoinRoomModal';
import AllocateStorageModal from './AllocateStorageModal';
import UploadFileModal from './UploadFileModal';
import MoveFileModal from './MoveFileModal';
import RenameItemModal from './RenameItemModal';
import FilePreviewModal from './FilePreviewModal';
import FileInfoDrawer from './FileInfoDrawer';
import UserProfileModal from './UserProfileModal';
import DeleteAccountModal from './DeleteAccountModal';
import NewFolderModal from './NewFolderModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function AppModals({
  modalState,
  activeRoom,
  activeRoomId,
  currentUser,
  currentFolderId,
  appJwt,
  error,
  handleCreateRoom,
  handleJoinRoom,
  handleAllocateStorage,
  fetchDirectoryFiles,
  fetchRoomDashboard,
  showToast,
  handleDownloadFile,
  handleCreateFolder,
  handleDeleteFile,
  handleLogout
}) {
  const {
    isCreateJoinModalOpen, setIsCreateJoinModalOpen,
    isAllocateModalOpen, setIsAllocateModalOpen,
    isProfileModalOpen, setIsProfileModalOpen,
    isDeleteAccountModalOpen, setIsDeleteAccountModalOpen,
    isUploadModalOpen, setIsUploadModalOpen,
    isNewFolderModalOpen, setIsNewFolderModalOpen,
    isMoveModalOpen, setIsMoveModalOpen,
    isRenameModalOpen, setIsRenameModalOpen,
    isPreviewModalOpen, setIsPreviewModalOpen,
    isInfoDrawerOpen, setIsInfoDrawerOpen,
    isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen,
    fileToMove, setFileToMove,
    fileToRename, setFileToRename,
    fileToPreview, setFileToPreview,
    fileForInfo, setFileForInfo,
    fileToDelete, setFileToDelete
  } = modalState;

  const handleOpenDeleteAccount = () => {
    setIsProfileModalOpen(false);
    setIsDeleteAccountModalOpen(true);
  };

  const handleAccountDeleted = (result) => {
    setIsDeleteAccountModalOpen(false);
    handleLogout();
    if (showToast) {
      showToast(`Account successfully deleted (${result.migrated_files_count || 0} files migrated, ${result.cascaded_files_count || 0} files removed)`);
    }
  };

  return (
    <>
      <CreateJoinRoomModal
        isOpen={isCreateJoinModalOpen}
        onClose={() => setIsCreateJoinModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        error={error}
      />

      <AllocateStorageModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        activeRoom={activeRoom}
        currentUser={currentUser}
        onAllocateStorage={handleAllocateStorage}
      />

      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        activeRoomId={activeRoomId}
        currentFolderId={currentFolderId}
        appJwt={appJwt}
        onUploadSuccess={() => {
          fetchDirectoryFiles();
          if (activeRoomId) fetchRoomDashboard(activeRoomId);
          if (showToast) showToast('File uploaded successfully');
        }}
        BACKEND_URL={BACKEND_URL}
      />

      <MoveFileModal
        isOpen={isMoveModalOpen}
        onClose={() => {
          setIsMoveModalOpen(false);
          setFileToMove(null);
        }}
        fileToMove={fileToMove}
        activeRoomId={activeRoomId}
        appJwt={appJwt}
        onMoveSuccess={() => {
          fetchDirectoryFiles();
          if (showToast) showToast('Item moved successfully');
        }}
        BACKEND_URL={BACKEND_URL}
      />

      <RenameItemModal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
          setFileToRename(null);
        }}
        fileItem={fileToRename}
        appJwt={appJwt}
        onRenameSuccess={(updatedItem) => {
          fetchDirectoryFiles();
          if (showToast) showToast(`Renamed to "${updatedItem.name}"`);
        }}
        BACKEND_URL={BACKEND_URL}
      />

      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setFileToPreview(null);
        }}
        file={fileToPreview}
        appJwt={appJwt}
        BACKEND_URL={BACKEND_URL}
        onDownloadFile={handleDownloadFile}
        showToast={showToast}
        onRefreshFiles={() => {
          if (activeRoomId) {
            fetchDirectoryFiles(activeRoomId, currentFolderId);
            fetchRoomDashboard(activeRoomId);
          }
        }}
      />

      <FileInfoDrawer
        isOpen={isInfoDrawerOpen}
        onClose={() => {
          setIsInfoDrawerOpen(false);
          setFileForInfo(null);
        }}
        file={fileForInfo}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onLogout={handleLogout}
        onDeleteAccount={handleOpenDeleteAccount}
      />

      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        appJwt={appJwt}
        BACKEND_URL={BACKEND_URL}
        onAccountDeleted={handleAccountDeleted}
      />

      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => {
          setIsConfirmDeleteModalOpen(false);
          setFileToDelete(null);
        }}
        item={fileToDelete}
        onConfirmDelete={handleDeleteFile}
      />
    </>
  );
}
