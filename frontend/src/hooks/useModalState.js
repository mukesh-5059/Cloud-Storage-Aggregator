import { useState, useCallback } from 'react';

/**
 * Custom Hook for managing all modal visibilities and target items in GatherAround.
 */
export function useModalState() {
  const [isCreateJoinModalOpen, setIsCreateJoinModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isMobileMembersOpen, setIsMobileMembersOpen] = useState(false);

  // Selected target items for modals
  const [fileToMove, setFileToMove] = useState(null);
  const [fileToRename, setFileToRename] = useState(null);
  const [fileToPreview, setFileToPreview] = useState(null);
  const [fileForInfo, setFileForInfo] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);

  const resetAllModals = useCallback(() => {
    setIsCreateJoinModalOpen(false);
    setIsAllocateModalOpen(false);
    setIsProfileModalOpen(false);
    setIsDeleteAccountModalOpen(false);
    setIsUploadModalOpen(false);
    setIsNewFolderModalOpen(false);
    setIsMoveModalOpen(false);
    setIsRenameModalOpen(false);
    setIsPreviewModalOpen(false);
    setIsInfoDrawerOpen(false);
    setIsConfirmDeleteModalOpen(false);
    setIsMobileMembersOpen(false);
    setFileToMove(null);
    setFileToRename(null);
    setFileToPreview(null);
    setFileForInfo(null);
    setFileToDelete(null);
  }, []);

  return {
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
    isMobileMembersOpen, setIsMobileMembersOpen,
    fileToMove, setFileToMove,
    fileToRename, setFileToRename,
    fileToPreview, setFileToPreview,
    fileForInfo, setFileForInfo,
    fileToDelete, setFileToDelete,
    resetAllModals
  };
}
